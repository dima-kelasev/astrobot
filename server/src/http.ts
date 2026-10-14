import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { SIGNS, daySky } from './astro.js';
import { validateInitData } from './auth.js';
import { HOUSES, PLANETS, figures, type Chart } from './chart.js';
import {
  addUsage,
  completePayment,
  createPartner,
  createPayment,
  createQuestion,
  createSpread,
  deletePartner,
  deleteUserData,
  getPartner,
  getPayment,
  getQuestion,
  getReading,
  getSpread,
  getUser,
  grantRefs,
  isDayOpened,
  listPartners,
  listReadings,
  markPaymentCanceled,
  pendingPayments,
  openDay,
  saveReading,
  setBirth,
  setConsent,
  setEmail,
  setNotifications,
  setPicks,
  subscriptionUntil,
  totalUsage,
  upsertUser,
  usageOf,
  type Partner,
  type ReadingKind,
  type User
} from './db.js';
import { env, fastModel, llmReady, privacyUrl, siteDist, webDist, yookassaReady } from './env.js';
import { placeById, searchCities, type Place } from './geo.js';
import { METHODS, PRODUCTS, PRODUCT_KEYS, PaymentError, createRemotePayment, fetchRemotePayment, type ProductKey } from './payments.js';
import { LlmError, completeText, streamCompletion } from './llm.js';
import {
  ascInfo,
  aspectLine,
  birthKey,
  chartOf,
  chartSummary,
  dayTransits,
  elementsLine,
  extraAspectLines,
  extraLine,
  figureLines,
  figureView,
  houseItems,
  houseText,
  keyAspects,
  moonHouse,
  natalAspectViews,
  natalItems,
  partFacts,
  pointLine,
  retroNames,
  rulerLines,
  signIn,
  sunSignIndex,
  synastryLine,
  synastryOf,
  transitLine,
  whyNow,
  yearKey,
  yearLines,
  type Birth
} from './natal.js';
import {
  ascPrompt,
  compatPrompt,
  dayPrompt,
  natalPartPrompt,
  natalPrompt,
  questionPrompt,
  routerPrompt,
  skyPrompt,
  spreadPrompt,
  whyPrompt
} from './prompts.js';
import { THEMES, dayCardFor, dayFallback, drawCards, faceOf, fanSizeFor, spreadFallback, themeOf } from './tarot.js';
import { dateFull, dateLong, dayKey, noonOf } from './time.js';

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string
  ) {
    super(code);
  }
}

const statusOf = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;

const partParams = z.object({
  part: z
    .string()
    .regex(/^[a-z]+\d{0,2}$/)
    .max(12)
});

const LLM_CALLS_PER_HOUR = 40;
const llmCalls = new Map<number, number[]>();

const allowLlmCall = (userId: number) => {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = (llmCalls.get(userId) ?? []).filter((time) => time > hourAgo);
  if (recent.length >= LLM_CALLS_PER_HOUR) {
    llmCalls.set(userId, recent);
    return false;
  }
  recent.push(Date.now());
  llmCalls.set(userId, recent);
  return true;
};

const HASHED = ['/_next/static/', '/app/assets/', '/assets/'];

const cacheHeaders = (reply: FastifyReply, path: string) => {
  if (HASHED.some((part) => path.includes(part))) reply.header('Cache-Control', 'public, max-age=31536000, immutable');
};

const today = () => dayKey(env.APP_TZ);
const noonToday = () => noonOf(today(), env.APP_TZ);

const authUser = (request: FastifyRequest): User => {
  const header = request.headers['x-telegram-init-data'];
  const tg = validateInitData(typeof header === 'string' ? header : '', env.BOT_TOKEN);
  const id = tg?.id ?? env.DEV_USER_ID;
  if (!id) throw new HttpError(401, 'unauthorized');
  const firstName = tg?.firstName ?? 'Разработчик';
  const existing = getUser(id);
  return existing && existing.firstName === firstName ? existing : upsertUser(id, firstName);
};

const FEATURES = ['spread', 'question', 'partner'] as const;
type Feature = (typeof FEATURES)[number];

const LIMITS: Record<Feature, number> = { spread: env.LIMIT_SPREADS, question: env.LIMIT_QUESTIONS, partner: env.LIMIT_PARTNERS };

const paymentsOn = () => env.PAYMENTS_ENABLED && yookassaReady;

const subUntil = (user: User) => subscriptionUntil(user.id);

const isSubscribed = (user: User) => {
  const until = subUntil(user);
  return Boolean(until && until > new Date().toISOString());
};

const hasNatal = (user: User) => !paymentsOn() || isSubscribed(user) || grantRefs(user.id, 'natal').length > 0;

const hasCompat = (user: User, partnerId: string) => !paymentsOn() || isSubscribed(user) || grantRefs(user.id, 'compat').includes(partnerId);

const hasWhy = (user: User) => !paymentsOn() || isSubscribed(user);

const freeQuestionsLeft = (user: User) => Math.max(0, env.FREE_QUESTIONS - totalUsage(user.id, 'question'));

const FREE: Record<Feature, number> = { spread: env.FREE_SPREADS, question: env.FREE_QUESTIONS, partner: env.FREE_PARTNERS };

const PAYWALL_CODE: Record<Feature, string> = { spread: 'limit', question: 'premium', partner: 'partner' };

const consume = (user: User, feature: Feature) => {
  const day = today();
  if (paymentsOn()) {
    if (isSubscribed(user)) return;
    if (totalUsage(user.id, feature) >= FREE[feature]) throw new HttpError(402, PAYWALL_CODE[feature]);
  } else if (usageOf(user.id, day, feature) >= LIMITS[feature]) {
    throw new HttpError(402, 'limit');
  }
  addUsage(user.id, day, feature);
};

const limitsOf = (user: User) => {
  const day = today();
  if (paymentsOn()) return Object.fromEntries(FEATURES.map((feature) => [feature, { used: totalUsage(user.id, feature), max: FREE[feature] }]));
  return Object.fromEntries(FEATURES.map((feature) => [feature, { used: usageOf(user.id, day, feature), max: LIMITS[feature] }]));
};

const accessOf = (user: User) => ({
  payments: paymentsOn(),
  subscribed: paymentsOn() ? isSubscribed(user) : false,
  until: subUntil(user),
  natal: hasNatal(user),
  why: hasWhy(user),
  compat: grantRefs(user.id, 'compat'),
  freeQuestions: paymentsOn() && !isSubscribed(user) ? freeQuestionsLeft(user) : null
});

const birthOf = (user: User): Birth | null => (user.birthDate ? { date: user.birthDate, time: user.birthTime, place: user.place } : null);

const requireBirth = (user: User) => {
  const birth = birthOf(user);
  if (!birth) throw new HttpError(409, 'no_birth');
  return birth;
};

const placeView = (place: Place | null) => (place ? { name: place.name, label: place.label } : null);

const meView = (user: User) => {
  const day = today();
  const birth = birthOf(user);
  const chart = birth ? chartOf(birth) : null;
  return {
    id: user.id,
    firstName: user.firstName,
    birth: birth ? { date: birth.date, time: birth.time, place: placeView(birth.place) } : null,
    consent: user.consentAt !== null,
    notifyMorning: user.notifyMorning,
    notifyEvening: user.notifyEvening,
    sign: chart ? SIGNS[sunSignIndex(chart)].name : null,
    ascSign: chart && chart.asc !== null ? SIGNS[Math.floor(chart.asc / 30)].name : null,
    limits: limitsOf(user),
    subscribed: paymentsOn() && isSubscribed(user),
    payments: paymentsOn(),
    access: accessOf(user),
    email: user.email,
    privacyUrl,
    today: { day, dateLabel: dateLong(day, env.APP_TZ), moonLine: daySky(day, env.APP_TZ).moonLine }
  };
};

const validDate = (value: string) => {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return value >= '1900-01-01' && value <= today();
};

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const birthBody = z.object({
  date: dateField,
  time: timeField.nullable(),
  placeId: z.number().int().min(0).nullable(),
  placeName: z.string().max(80).optional(),
  keepPlace: z.literal(true).optional()
});

const meBody = z.object({
  consent: z.literal(true).optional(),
  birth: birthBody.optional(),
  notifyMorning: z.boolean().optional(),
  notifyEvening: z.boolean().optional(),
  email: z.email().max(120).optional()
});

const resolveBirth = (body: z.infer<typeof birthBody>, current: Place | null = null): Birth => {
  if (!validDate(body.date)) throw new HttpError(400, 'bad_birth');
  const place = body.placeId === null ? (body.keepPlace ? current : null) : placeById(body.placeId, body.placeName);
  if (body.placeId !== null && !place) throw new HttpError(400, 'bad_place');
  if (body.time !== null && !place) throw new HttpError(400, 'need_place');
  return { date: body.date, time: body.time, place };
};

const spreadBody = z.object({ theme: z.string().max(20).default('general'), question: z.string().trim().max(300).default('') });
const pickBody = z.object({ index: z.number().int().min(0).max(30) });
const idParams = z.object({ id: z.string().min(1).max(64) });
const readingQuery = z.object({ refresh: z.string().optional() });
const citiesQuery = z.object({ q: z.string().max(60).default('') });
const questionBody = z.object({ text: z.string().trim().min(3).max(500) });
const partnerBody = birthBody.extend({ name: z.string().trim().min(1).max(40) });
const historyQuery = z.object({ kind: z.string().max(20), key: z.string().max(120) });

type ReadingJob = {
  user: User;
  kind: ReadingKind;
  key: string;
  prompt: string;
  fallback: string;
  refresh: boolean;
  maxTokens: number;
  model?: string;
  lock?: Lock | null;
};

type Lock = { headings: string[]; maxChars: number };

const NATAL_LOCK: Lock = { headings: ['Где будет трудно', 'Отношения', 'Работа и деньги', 'Ближайший год', 'Советы'], maxChars: 1800 };
const COMPAT_LOCK: Lock = { headings: ['Где трения', 'Как договариваться', 'На что обратить внимание'], maxChars: 900 };

const cutLocked = (text: string, lock: Lock, final: boolean) => {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === lines.length - 1 && !final) break;
    const head = line.replace(/^[\s*#_«"]+/, '').toLowerCase();
    if (offset > 0 && (lock.headings.some((heading) => head.startsWith(heading.toLowerCase())) || offset + line.length > lock.maxChars)) {
      return { visible: text.slice(0, offset).trimEnd(), hit: true };
    }
    offset += line.length + 1;
  }
  return { visible: final ? text : text.slice(0, offset), hit: false };
};

const sendReading = async (reply: FastifyReply, job: ReadingJob) => {
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  const send = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  let closed = false;
  const finish = (source: 'ai' | 'template', note: string | null, locked = false) => {
    if (closed) return;
    closed = true;
    send({ done: true, source, note, locked });
    res.end();
  };
  const sendWhole = (text: string, source: 'ai' | 'template', note: string | null) => {
    if (!job.lock) {
      send({ delta: text });
      return finish(source, note);
    }
    const cut = cutLocked(text, job.lock, true);
    send({ delta: cut.visible });
    finish(source, note, cut.hit);
  };

  const cached = job.refresh ? null : getReading(job.user.id, job.kind, job.key);
  if (cached) return sendWhole(cached, 'ai', null);
  const blocked = !llmReady ? 'no_key' : !allowLlmCall(job.user.id) ? 'rate_limited' : null;
  if (blocked) return sendWhole(job.fallback, 'template', blocked);

  const ctl = new AbortController();
  res.on('close', () => {
    if (!closed) ctl.abort();
  });
  let sentLength = 0;
  let full = '';
  try {
    const text = await streamCompletion(
      job.prompt,
      (delta) => {
        if (closed) return;
        full += delta;
        if (!job.lock) {
          sentLength += delta.length;
          send({ delta });
          return;
        }
        const cut = cutLocked(full, job.lock, false);
        if (cut.visible.length > sentLength) {
          send({ delta: cut.visible.slice(sentLength) });
          sentLength = cut.visible.length;
        }
        if (cut.hit) finish('ai', null, true);
      },
      ctl.signal,
      { maxTokens: job.maxTokens, model: job.model }
    );
    saveReading(job.user.id, job.kind, job.key, text);
    if (closed) return;
    if (job.lock) {
      const cut = cutLocked(text, job.lock, true);
      if (cut.visible.length > sentLength) send({ delta: cut.visible.slice(sentLength) });
      return finish('ai', null, cut.hit);
    }
    finish('ai', null);
  } catch (error) {
    if (closed) return;
    if (ctl.signal.aborted) return res.end();
    const code = error instanceof LlmError ? error.code : 'upstream_error';
    if (sentLength > 0) return finish('ai', 'interrupted');
    sendWhole(job.fallback, 'template', code);
  }
};

export type PaidEvent = { userId: number; product: ProductKey; title: string; until: string | null };

let paidListener: (event: PaidEvent) => void = () => {};

export const onPaid = (listener: (event: PaidEvent) => void) => {
  paidListener = listener;
};

const productOf = (key: string): ProductKey | null => PRODUCT_KEYS.find((item) => item === key) ?? null;

const settlePayment = async (id: string) => {
  const local = getPayment(id);
  if (!local) return null;
  if (local.status !== 'pending') return local;
  const remote = await fetchRemotePayment(id);
  if (remote.status === 'canceled') markPaymentCanceled(id);
  if (remote.status === 'succeeded') {
    const key = productOf(local.product);
    if (!key) return local;
    const product = PRODUCTS[key];
    const applied = completePayment(id, { kind: product.kind, ref: local.ref, days: product.days });
    if (applied) paidListener({ userId: local.userId, product: key, title: product.title, until: product.days ? subscriptionUntil(local.userId) : null });
  }
  return getPayment(id);
};

const SWEEP_MS = 60 * 1000;
const SWEEP_WINDOW_MS = 24 * 60 * 60 * 1000;

export const startPaymentSweeper = () => {
  let running = false;
  const sweep = async () => {
    if (running || !paymentsOn()) return;
    running = true;
    try {
      for (const payment of pendingPayments(new Date(Date.now() - SWEEP_WINDOW_MS).toISOString())) {
        await settlePayment(payment.id).catch((error: unknown) => {
          if (!(error instanceof PaymentError)) console.error('Не удалось проверить платёж:', error);
        });
      }
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void sweep(), SWEEP_MS);
  return () => clearInterval(timer);
};

const paymentBody = z.object({ product: z.enum(PRODUCT_KEYS), method: z.enum(METHODS), partnerId: z.string().max(64).optional() });
const webhookBody = z.object({ event: z.string(), object: z.object({ id: z.string().max(64) }) });

const pointView = (chart: Chart) =>
  chart.points.map((point) => ({
    key: point.key,
    name: point.name,
    glyph: point.glyph,
    lon: point.lon,
    signIndex: point.sign,
    sign: SIGNS[point.sign].name,
    degree: point.degree,
    minute: point.minute,
    retro: point.retro && point.key !== 'node',
    house: point.house
  }));

const partnerBirth = (partner: Partner): Birth => ({ date: partner.birthDate, time: partner.birthTime, place: partner.place });

const partnerView = (partner: Partner) => ({
  id: partner.id,
  name: partner.name,
  birthDate: partner.birthDate,
  birthTime: partner.birthTime,
  place: placeView(partner.place),
  sign: SIGNS[sunSignIndex(chartOf(partnerBirth(partner)))].name
});

const ownedPartner = (user: User, id: string) => {
  const partner = getPartner(id);
  if (!partner || partner.userId !== user.id) throw new HttpError(404, 'not_found');
  return partner;
};

const TOOLS = ['tarot', 'chart', 'both'] as const;
type Tool = (typeof TOOLS)[number];

const guessTool = (text: string): Tool => {
  const lower = text.toLowerCase();
  if (/(почему|со мной|сценари|период|характер|предназнач|в моей жизни|всё меняется|все меняется)/.test(lower)) return 'chart';
  return 'tarot';
};

const classify = async (text: string): Promise<Tool> => {
  if (!llmReady) return guessTool(text);
  try {
    const answer = (await completeText(routerPrompt(text), { maxTokens: 8, temperature: 0 }, 15000)).toLowerCase();
    return TOOLS.find((tool) => answer.includes(tool)) ?? guessTool(text);
  } catch {
    return guessTool(text);
  }
};

const KIND_TITLES: Record<string, string> = {
  sky: 'Гороскоп на день',
  day: 'Карта дня',
  natal: 'Натальная карта',
  asc: 'Асцендент',
  why: 'Почему сейчас так?',
  compat: 'Совместимость',
  question: 'Ваш вопрос',
  spread: 'Расклад'
};

const dayFromKey = (key: string) => {
  const day = key.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? dateFull(day, env.APP_TZ) : '';
};

const historyMeta = (userId: number, kind: string, key: string) => {
  if (kind === 'spread') {
    const spread = getSpread(key);
    const theme = themeOf(spread?.theme ?? 'general');
    const faces = spread ? spread.picks.map((index) => faceOf(spread.deck[index])) : [];
    return { title: theme.title, subtitle: spread?.question ?? '', cards: faces, positions: [...theme.positions] };
  }
  if (kind === 'question') {
    const question = getQuestion(key);
    return {
      title: KIND_TITLES.question,
      subtitle: question?.text ?? '',
      cards: question ? question.cards.map(faceOf) : [],
      positions: ['Суть ситуации', 'Что мешает', 'Что поможет']
    };
  }
  if (kind === 'compat') {
    const partner = getPartner(key.split(':')[0]);
    return { title: KIND_TITLES.compat, subtitle: partner?.name ?? '', cards: [], positions: [] };
  }
  if (kind === 'day') {
    const day = key.slice(0, 10);
    return { title: KIND_TITLES.day, subtitle: dayFromKey(key), cards: [faceOf(dayCardFor(userId, day))], positions: ['Карта дня'] };
  }
  return { title: KIND_TITLES[kind] ?? 'Толкование', subtitle: kind === 'sky' || kind === 'why' ? dayFromKey(key) : '', cards: [], positions: [] };
};

export const createApp = async () => {
  const app = Fastify({ logger: false, bodyLimit: 16 * 1024 });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) return reply.status(error.status).send({ code: error.code });
    const status = statusOf(error);
    if (status >= 400 && status < 500) return reply.status(status).send({ code: 'bad_request' });
    console.error('Ошибка сервера:', error);
    return reply.status(500).send({ code: 'server_error' });
  });

  app.get('/api/me', async (request) => meView(authUser(request)));

  app.put('/api/me', async (request) => {
    const user = authUser(request);
    const body = meBody.safeParse(request.body);
    if (!body.success) throw new HttpError(400, 'bad_request');
    if (body.data.consent) setConsent(user.id);
    if (body.data.birth) {
      if (!body.data.consent && user.consentAt === null) throw new HttpError(409, 'no_consent');
      const birth = resolveBirth(body.data.birth, user.place);
      setBirth(user.id, birth.date, birth.time, birth.place);
    }
    setNotifications(user.id, { morning: body.data.notifyMorning, evening: body.data.notifyEvening });
    if (body.data.email) setEmail(user.id, body.data.email.trim().toLowerCase());
    const fresh = getUser(user.id);
    if (!fresh) throw new HttpError(404, 'not_found');
    return meView(fresh);
  });

  app.delete('/api/me', async (request) => {
    const user = authUser(request);
    deleteUserData(user.id);
    return { deleted: true };
  });

  app.get('/api/cities', async (request) => {
    authUser(request);
    const query = citiesQuery.safeParse(request.query);
    if (!query.success) throw new HttpError(400, 'bad_request');
    return { cities: searchCities(query.data.q) };
  });

  app.get('/api/sky', async (request) => {
    const user = authUser(request);
    const birth = requireBirth(user);
    const chart = chartOf(birth);
    const day = today();
    const sky = daySky(day, env.APP_TZ);
    const sun = chart.points.find((point) => point.key === 'sun');
    const moon = chart.points.find((point) => point.key === 'moon');
    const transits = dayTransits(chart, noonToday()).map(transitLine);
    const house = moonHouse(chart, noonToday());
    const sunIndex = sunSignIndex(chart);
    return {
      day,
      dateLabel: dateLong(day, env.APP_TZ),
      signName: SIGNS[sunIndex].name,
      sunLon: sky.sunLon,
      moonLon: sky.moonLon,
      natalLon: sun?.lon ?? 0,
      natalSignIndex: sunIndex,
      moonSign: sky.moonSign.prepositional,
      facts: [
        { label: 'Луна сегодня', value: `в ${sky.moonSign.prepositional}`, wide: false },
        { label: 'Фаза', value: `${sky.phase}, ${sky.lit}%`, wide: false },
        { label: 'Лунный день', value: `≈ ${sky.lunarDay}`, wide: false },
        { label: 'Ваше Солнце', value: sun ? `в ${signIn(sun.sign)}` : '', wide: false },
        { label: 'Ваша Луна', value: moon ? `в ${signIn(moon.sign)}` : '', wide: false },
        { label: 'Асцендент', value: chart.asc !== null ? `в ${signIn(Math.floor(chart.asc / 30))}` : 'нужно время рождения', wide: false },
        ...(house ? [{ label: 'Луна проходит', value: houseText(house), wide: true }] : []),
        { label: 'Транзиты дня', value: transits.length ? transits.join('; ') : 'точных транзитов сегодня нет', wide: true }
      ]
    };
  });

  app.get('/api/sky/reading', async (request, reply) => {
    const user = authUser(request);
    const birth = requireBirth(user);
    const chart = chartOf(birth);
    const query = readingQuery.safeParse(request.query);
    const day = today();
    const sky = daySky(day, env.APP_TZ);
    const sunIndex = sunSignIndex(chart);
    const house = moonHouse(chart, noonToday());
    return sendReading(reply, {
      user,
      kind: 'sky',
      key: `${day}:${birthKey(birth)}`,
      prompt: skyPrompt({
        date: dateFull(day, env.APP_TZ),
        signName: SIGNS[sunIndex].name,
        element: SIGNS[sunIndex].element,
        moonSign: sky.moonSign.prepositional,
        phase: sky.phase,
        lunarDay: sky.lunarDay,
        sunAspects: [],
        transits: dayTransits(chart, noonToday()).map(transitLine),
        moonHouse: house ? houseText(house) : null
      }),
      fallback: `Луна в ${sky.moonSign.prepositional}: на первом плане ${sky.moonSign.theme}.\n\n${sky.phaseTip}`,
      refresh: query.success && query.data.refresh === '1',
      maxTokens: 700,
      model: fastModel
    });
  });

  app.get('/api/day', async (request) => {
    const user = authUser(request);
    const day = today();
    const opened = isDayOpened(user.id, day);
    return { day, opened, card: opened ? faceOf(dayCardFor(user.id, day)) : null };
  });

  app.post('/api/day/open', async (request) => {
    const user = authUser(request);
    const day = today();
    openDay(user.id, day);
    return { day, opened: true, card: faceOf(dayCardFor(user.id, day)) };
  });

  app.get('/api/day/reading', async (request, reply) => {
    const user = authUser(request);
    const day = today();
    if (!isDayOpened(user.id, day)) throw new HttpError(409, 'not_ready');
    const face = faceOf(dayCardFor(user.id, day));
    return sendReading(reply, {
      user,
      kind: 'day',
      key: day,
      prompt: dayPrompt(face, dateFull(day, env.APP_TZ)),
      fallback: dayFallback(face),
      refresh: false,
      maxTokens: 600
    });
  });

  app.get('/api/themes', async (request) => {
    authUser(request);
    return {
      themes: THEMES.map((theme) => ({
        key: theme.key,
        title: theme.title,
        description: theme.description,
        positions: [...theme.positions],
        questionRequired: theme.questionRequired,
        hint: theme.hint
      }))
    };
  });

  app.post('/api/spreads', async (request) => {
    const user = authUser(request);
    const body = spreadBody.safeParse(request.body ?? {});
    if (!body.success) throw new HttpError(400, 'bad_question');
    const theme = themeOf(body.data.theme);
    if (theme.questionRequired && !body.data.question) throw new HttpError(400, 'bad_question');
    consume(user, 'spread');
    const id = randomUUID();
    const size = fanSizeFor(theme.positions.length);
    createSpread({
      id,
      userId: user.id,
      day: today(),
      theme: theme.key,
      question: body.data.question,
      size,
      deck: drawCards(size),
      picks: [],
      createdAt: new Date().toISOString()
    });
    return { id, theme: theme.key, title: theme.title, positions: [...theme.positions], size, limits: limitsOf(user) };
  });

  app.post('/api/spreads/:id/pick', async (request) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    const body = pickBody.safeParse(request.body);
    if (!params.success || !body.success) throw new HttpError(400, 'bad_request');
    const spread = getSpread(params.data.id);
    if (!spread || spread.userId !== user.id) throw new HttpError(404, 'not_found');
    const positions = themeOf(spread.theme).positions;
    if (body.data.index >= spread.size) throw new HttpError(400, 'bad_request');
    if (spread.picks.length >= positions.length) throw new HttpError(409, 'spread_full');
    if (spread.picks.includes(body.data.index)) throw new HttpError(409, 'already_picked');
    const picks = [...spread.picks, body.data.index];
    setPicks(spread.id, picks);
    return { slot: picks.length - 1, card: faceOf(spread.deck[body.data.index]), done: picks.length === positions.length };
  });

  app.get('/api/spreads/:id/reading', async (request, reply) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    const spread = getSpread(params.data.id);
    if (!spread || spread.userId !== user.id) throw new HttpError(404, 'not_found');
    const theme = themeOf(spread.theme);
    if (spread.picks.length < theme.positions.length) throw new HttpError(409, 'not_ready');
    const faces = spread.picks.map((index) => faceOf(spread.deck[index]));
    return sendReading(reply, {
      user,
      kind: 'spread',
      key: spread.id,
      prompt: spreadPrompt(theme, faces, spread.question),
      fallback: spreadFallback(faces, theme.positions),
      refresh: false,
      maxTokens: 1200
    });
  });

  app.get('/api/natal', async (request) => {
    const user = authUser(request);
    const birth = requireBirth(user);
    const chart = chartOf(birth);
    return {
      hasTime: chart.hasTime,
      hasPlace: birth.place !== null,
      houseSystem: chart.houseSystem,
      points: pointView(chart),
      cusps: chart.cusps,
      asc: chart.asc,
      mc: chart.mc,
      aspects: natalAspectViews(chart),
      extras: chart.extras.map((extra) => ({
        key: extra.key,
        name: extra.name,
        glyph: extra.glyph,
        meaning: extra.meaning,
        sign: SIGNS[extra.sign].name,
        degree: extra.degree,
        minute: extra.minute,
        house: extra.house
      })),
      figures: figures(chart).map(figureView),
      items: natalItems(chart),
      houseItems: houseItems(chart),
      houses: [...HOUSES],
      planets: PLANETS.map((planet) => ({ key: planet.key, meaning: planet.meaning }))
    };
  });

  app.get('/api/natal/reading', async (request, reply) => {
    const user = authUser(request);
    const birth = requireBirth(user);
    const chart = chartOf(birth);
    const summary = chartSummary(chart);
    const now = new Date();
    const year = yearLines(chart, now);
    return sendReading(reply, {
      user,
      kind: 'natal',
      key: `v3|${yearKey(now)}|${birthKey(birth)}`,
      prompt: natalPrompt({
        hasTime: chart.hasTime,
        points: summary,
        aspects: keyAspects(chart, 8).map(aspectLine),
        elements: elementsLine(chart),
        extras: chart.extras.map(extraLine),
        extraAspects: extraAspectLines(chart),
        figures: figureLines(chart),
        rulers: rulerLines(chart),
        retro: retroNames(chart),
        year: year.transits,
        yearHouses: year.houses,
        today: dateFull(dayKey(env.APP_TZ, now), env.APP_TZ)
      }),
      fallback: summary.slice(0, 3).join('.\n\n'),
      refresh: false,
      maxTokens: 2600,
      lock: hasNatal(user) ? null : NATAL_LOCK
    });
  });

  app.get('/api/natal/part/:part/reading', async (request, reply) => {
    const user = authUser(request);
    if (!hasNatal(user)) throw new HttpError(402, 'natal');
    const birth = requireBirth(user);
    const params = partParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    const chart = chartOf(birth);
    const facts = partFacts(chart, params.data.part);
    if (!facts) throw new HttpError(404, 'not_found');
    return sendReading(reply, {
      user,
      kind: 'natalPart',
      key: `${birthKey(birth)}|${params.data.part}`,
      prompt: natalPartPrompt({ ...facts, house: params.data.part.startsWith('house'), hasTime: chart.hasTime }),
      fallback: `${facts.subject}.\n\n${facts.facts.join('.\n')}.`,
      refresh: false,
      maxTokens: 500
    });
  });

  app.get('/api/asc', async (request) => {
    const user = authUser(request);
    const birth = requireBirth(user);
    const chart = chartOf(birth);
    const info = ascInfo(chart);
    if (!info) return { available: false, reason: birth.place ? 'no_time' : 'no_place', sign: null, degree: null, signIndex: null };
    return { available: true, reason: null, sign: SIGNS[info.sign].name, degree: info.degree, signIndex: info.sign };
  });

  app.get('/api/asc/reading', async (request, reply) => {
    const user = authUser(request);
    const birth = requireBirth(user);
    const info = ascInfo(chartOf(birth));
    if (!info) throw new HttpError(409, 'no_time');
    return sendReading(reply, {
      user,
      kind: 'asc',
      key: birthKey(birth),
      prompt: ascPrompt({
        sign: SIGNS[info.sign].prepositional,
        degree: info.degree,
        inFirst: info.inFirst.map(pointLine),
        aspects: info.aspects.map(aspectLine)
      }),
      fallback: `Асцендент в ${SIGNS[info.sign].prepositional}. По традиции это знак первого впечатления: так вас видят люди при знакомстве, тема знака: ${SIGNS[info.sign].theme}.`,
      refresh: false,
      maxTokens: 700
    });
  });

  app.get('/api/why', async (request) => {
    const user = authUser(request);
    const birth = requireBirth(user);
    const chart = chartOf(birth);
    const why = whyNow(chart, noonToday());
    return {
      hasTime: chart.hasTime,
      transits: why.transits.map(transitLine),
      houses: why.houses.map((item) => `${item.name}${item.retro ? ' (ретроградный)' : ''}: ${houseText(item.house)}`),
      retro: why.retro.map((point) => point.name)
    };
  });

  app.get('/api/why/reading', async (request, reply) => {
    const user = authUser(request);
    if (!hasWhy(user)) throw new HttpError(402, 'premium');
    const birth = requireBirth(user);
    const chart = chartOf(birth);
    const day = today();
    const why = whyNow(chart, noonToday());
    const transits = why.transits.map(transitLine);
    return sendReading(reply, {
      user,
      kind: 'why',
      key: `${day}:${birthKey(birth)}`,
      prompt: whyPrompt({
        date: dateFull(day, env.APP_TZ),
        hasTime: chart.hasTime,
        transits,
        houses: why.houses.map((item) => `${item.name}: ${houseText(item.house)}`),
        retro: why.retro.map((point) => point.name),
        question: ''
      }),
      fallback: transits.length
        ? `Сейчас действуют медленные транзиты: ${transits.join('; ')}.`
        : 'Сейчас нет точных медленных транзитов к вашей карте: по традиции это ровный период.',
      refresh: false,
      maxTokens: 1300
    });
  });

  app.get('/api/partners', async (request) => {
    const user = authUser(request);
    return { partners: listPartners(user.id).map(partnerView) };
  });

  app.post('/api/partners', async (request) => {
    const user = authUser(request);
    const body = partnerBody.safeParse(request.body);
    if (!body.success) throw new HttpError(400, 'bad_request');
    const birth = resolveBirth(body.data);
    consume(user, 'partner');
    const partner: Partner = {
      id: randomUUID(),
      userId: user.id,
      name: body.data.name,
      birthDate: birth.date,
      birthTime: birth.time,
      place: birth.place,
      createdAt: new Date().toISOString()
    };
    createPartner(partner);
    return { partner: partnerView(partner), limits: limitsOf(user) };
  });

  app.delete('/api/partners/:id', async (request) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    deletePartner(user.id, params.data.id);
    return { deleted: true };
  });

  app.get('/api/partners/:id', async (request) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    const partner = ownedPartner(user, params.data.id);
    const mine = chartOf(requireBirth(user));
    const theirs = chartOf(partnerBirth(partner));
    return { partner: partnerView(partner), userSign: SIGNS[sunSignIndex(mine)].name, aspects: synastryOf(mine, theirs, 10).map(synastryLine) };
  });

  app.get('/api/partners/:id/reading', async (request, reply) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    const partner = ownedPartner(user, params.data.id);
    const birth = requireBirth(user);
    const mine = chartOf(birth);
    const theirs = chartOf(partnerBirth(partner));
    const pick = (chart: Chart) =>
      chart.points
        .filter((point) => ['sun', 'moon', 'mercury', 'venus', 'mars', 'asc'].includes(point.key))
        .map((point) => pointLine({ ...point, house: null }));
    const aspects = synastryOf(mine, theirs, 10).map(synastryLine);
    return sendReading(reply, {
      user,
      kind: 'compat',
      key: `${partner.id}:${birthKey(birth)}`,
      prompt: compatPrompt({ user: pick(mine), partner: pick(theirs), aspects, hasTimes: mine.hasTime && theirs.hasTime }),
      fallback: aspects.length ? `Главные связи между картами: ${aspects.slice(0, 4).join('; ')}.` : 'Точных аспектов между картами нет.',
      refresh: false,
      maxTokens: 1200,
      lock: hasCompat(user, partner.id) ? null : COMPAT_LOCK
    });
  });

  app.post('/api/questions', async (request) => {
    const user = authUser(request);
    const body = questionBody.safeParse(request.body);
    if (!body.success) throw new HttpError(400, 'bad_question');
    consume(user, 'question');
    const classified = await classify(body.data.text);
    const hasBirth = user.birthDate !== null;
    const tool: Tool = hasBirth ? classified : 'tarot';
    const cards = tool === 'chart' ? [] : drawCards(3);
    const id = randomUUID();
    createQuestion({ id, userId: user.id, day: today(), text: body.data.text, tool, cards, createdAt: new Date().toISOString() });
    return { id, tool, cards: cards.map(faceOf), needBirth: !hasBirth && classified !== 'tarot', limits: limitsOf(user) };
  });

  app.get('/api/questions/:id/reading', async (request, reply) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    const question = getQuestion(params.data.id);
    if (!question || question.userId !== user.id) throw new HttpError(404, 'not_found');
    const tool = TOOLS.find((item) => item === question.tool) ?? 'tarot';
    const birth = birthOf(user);
    const chart = birth && tool !== 'tarot' ? chartOf(birth) : null;
    const faces = question.cards.map(faceOf);
    return sendReading(reply, {
      user,
      kind: 'question',
      key: question.id,
      prompt: questionPrompt({
        question: question.text,
        tool,
        cards: faces,
        chart: chart ? chartSummary(chart) : [],
        transits: chart ? whyNow(chart, noonToday()).transits.map(transitLine) : []
      }),
      fallback: faces.length
        ? spreadFallback(faces, ['Суть ситуации', 'Что мешает', 'Что поможет'])
        : 'Сейчас не получается ответить. Попробуйте задать вопрос чуть позже.',
      refresh: false,
      maxTokens: 1100
    });
  });

  app.get('/api/plans', async (request) => {
    const user = authUser(request);
    return {
      payments: paymentsOn(),
      email: user.email,
      access: accessOf(user),
      products: PRODUCT_KEYS.map((key) => ({
        key,
        title: PRODUCTS[key].title,
        short: PRODUCTS[key].short,
        price: PRODUCTS[key].price,
        days: PRODUCTS[key].days
      }))
    };
  });

  app.post('/api/payments', async (request) => {
    const user = authUser(request);
    if (!paymentsOn()) throw new HttpError(409, 'payments_off');
    const body = paymentBody.safeParse(request.body);
    if (!body.success) throw new HttpError(400, 'bad_request');
    if (!user.email) throw new HttpError(409, 'no_email');
    const product = PRODUCTS[body.data.product];
    let ref = '';
    let description: string = product.title;
    if (body.data.product === 'compat') {
      const partner = ownedPartner(user, body.data.partnerId ?? '');
      ref = partner.id;
      description = `${product.title}: ${partner.name}`;
    }
    try {
      const remote = await createRemotePayment({ userId: user.id, product: body.data.product, ref, email: user.email, method: body.data.method, description });
      createPayment({ id: remote.id, userId: user.id, product: body.data.product, ref, amount: product.price });
      return { id: remote.id, url: remote.url };
    } catch (error) {
      if (error instanceof PaymentError) throw new HttpError(502, 'payment_failed');
      throw error;
    }
  });

  app.get('/api/payments/:id', async (request) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    const local = getPayment(params.data.id);
    if (!local || local.userId !== user.id) throw new HttpError(404, 'not_found');
    let payment = local;
    try {
      payment = (await settlePayment(local.id)) ?? local;
    } catch (error) {
      if (!(error instanceof PaymentError)) throw error;
    }
    const fresh = getUser(user.id) ?? user;
    return { status: payment.status, me: meView(fresh) };
  });

  app.post('/api/yookassa/webhook', async (request, reply) => {
    const body = webhookBody.safeParse(request.body);
    if (!body.success) return reply.status(200).send({ ok: true });
    try {
      await settlePayment(body.data.object.id);
    } catch (error) {
      console.error('Не удалось обработать уведомление ЮKassa:', error);
      return reply.status(500).send({ ok: false });
    }
    return reply.status(200).send({ ok: true });
  });

  app.get('/api/history', async (request) => {
    const user = authUser(request);
    return {
      items: listReadings(user.id, 60).map((row) => {
        const meta = historyMeta(user.id, row.kind, row.key);
        return { kind: row.kind, key: row.key, title: meta.title, subtitle: meta.subtitle, date: row.created_at };
      })
    };
  });

  app.get('/api/history/item', async (request) => {
    const user = authUser(request);
    const query = historyQuery.safeParse(request.query);
    if (!query.success) throw new HttpError(400, 'bad_request');
    const row = listReadings(user.id, 500).find((item) => item.kind === query.data.kind && item.key === query.data.key);
    if (!row) throw new HttpError(404, 'not_found');
    const meta = historyMeta(user.id, row.kind, row.key);
    return {
      kind: row.kind,
      key: row.key,
      date: row.created_at,
      title: meta.title,
      subtitle: meta.subtitle,
      cards: meta.cards,
      positions: meta.positions,
      text: row.text
    };
  });

  const hasWeb = existsSync(webDist);
  const hasSite = existsSync(siteDist);

  if (hasWeb) await app.register(fastifyStatic, { root: webDist, prefix: '/app/', redirect: true, setHeaders: cacheHeaders });
  if (hasSite) await app.register(fastifyStatic, { root: siteDist, prefix: '/', decorateReply: !hasWeb, setHeaders: cacheHeaders });
  if (hasWeb && !hasSite) app.get('/', (_request, reply) => reply.redirect('/app/'));

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api')) return reply.status(404).send({ code: 'not_found' });
    if (hasWeb && request.url.startsWith('/app')) return reply.sendFile('index.html', webDist);
    if (hasSite) return reply.status(404).sendFile('404.html', siteDist);
    return reply.status(404).send({ code: 'not_found' });
  });

  return app;
};
