import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { daySky, personalSky, signOfBirth, skyFallback } from './astro.js';
import { validateInitData } from './auth.js';
import {
  countFreeSpreads,
  createSpread,
  getReading,
  getSpread,
  getUser,
  isDayOpened,
  openDay,
  saveReading,
  setBirthDate,
  setNotify,
  setPicks,
  takeCredit,
  upsertUser,
  type ReadingKind,
  type User
} from './db.js';
import { env, llmReady, siteDist, webDist } from './env.js';
import { LlmError, streamCompletion } from './llm.js';
import { dayPrompt, skyPrompt, spreadPrompt } from './prompts.js';
import { FAN_SIZE, PICKS, dayCardFor, dayFallback, drawFan, faceOf, spreadFallback } from './tarot.js';
import { dateFull, dateLong, dayKey } from './time.js';

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

const LLM_CALLS_PER_HOUR = 20;
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

const authUser = (request: FastifyRequest): User => {
  const header = request.headers['x-telegram-init-data'];
  const tg = validateInitData(typeof header === 'string' ? header : '', env.BOT_TOKEN);
  const id = tg?.id ?? env.DEV_USER_ID;
  if (!id) throw new HttpError(401, 'unauthorized');
  const firstName = tg?.firstName ?? 'Разработчик';
  const existing = getUser(id);
  return existing && existing.firstName === firstName ? existing : upsertUser(id, firstName);
};

const quotaOf = (user: User, day: string) => ({
  freeLeft: Math.max(0, env.FREE_SPREADS_PER_DAY - countFreeSpreads(user.id, day)),
  credits: user.credits,
  subscribed: Boolean(user.subscribedUntil && user.subscribedUntil > new Date().toISOString())
});

const meView = (user: User) => {
  const day = today();
  return {
    id: user.id,
    firstName: user.firstName,
    birthDate: user.birthDate,
    notify: user.notify,
    sign: user.birthDate ? signOfBirth(user.birthDate).name : null,
    quota: quotaOf(user, day),
    freePerDay: env.FREE_SPREADS_PER_DAY,
    today: { day, dateLabel: dateLong(day, env.APP_TZ), moonLine: daySky(day, env.APP_TZ).moonLine }
  };
};

const birthOf = (user: User) => {
  if (!user.birthDate) throw new HttpError(409, 'no_birth');
  return user.birthDate;
};

const validBirthDate = (value: string) => {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return value >= '1900-01-01' && value <= today();
};

const meBody = z.object({
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notify: z.boolean().optional()
});
const spreadBody = z.object({ question: z.string().trim().min(1).max(300) });
const pickBody = z.object({ index: z.number().int().min(0).max(FAN_SIZE - 1) });
const idParams = z.object({ id: z.string().min(1).max(64) });
const readingQuery = z.object({ refresh: z.string().optional() });

type ReadingJob = {
  user: User;
  kind: ReadingKind;
  key: string;
  prompt: string;
  fallback: string;
  refresh: boolean;
};

const sendReading = async (reply: FastifyReply, job: ReadingJob) => {
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  const send = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const finish = (source: 'ai' | 'template', note: string | null) => {
    send({ done: true, source, note });
    res.end();
  };

  const cached = job.refresh ? null : getReading(job.user.id, job.kind, job.key);
  if (cached) {
    send({ delta: cached });
    return finish('ai', null);
  }
  const blocked = !llmReady ? 'no_key' : !allowLlmCall(job.user.id) ? 'rate_limited' : null;
  if (blocked) {
    send({ delta: job.fallback });
    return finish('template', blocked);
  }

  const ctl = new AbortController();
  res.on('close', () => ctl.abort());
  let sent = false;
  try {
    const text = await streamCompletion(
      job.prompt,
      (delta) => {
        sent = true;
        send({ delta });
      },
      ctl.signal
    );
    saveReading(job.user.id, job.kind, job.key, text);
    finish('ai', null);
  } catch (error) {
    if (ctl.signal.aborted) return res.end();
    const code = error instanceof LlmError ? error.code : 'upstream_error';
    if (sent) return finish('ai', 'interrupted');
    send({ delta: job.fallback });
    finish('template', code);
  }
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
    if (body.data.birthDate !== undefined) {
      if (!validBirthDate(body.data.birthDate)) throw new HttpError(400, 'bad_birth');
      setBirthDate(user.id, body.data.birthDate);
    }
    if (body.data.notify !== undefined) setNotify(user.id, body.data.notify);
    const fresh = getUser(user.id);
    if (!fresh) throw new HttpError(404, 'not_found');
    return meView(fresh);
  });

  app.get('/api/sky', async (request) => {
    const user = authUser(request);
    const day = today();
    const sky = personalSky(birthOf(user), day, env.APP_TZ);
    return {
      day,
      dateLabel: dateLong(day, env.APP_TZ),
      signName: sky.sign.name,
      sunLon: sky.sunLon,
      moonLon: sky.moonLon,
      natalLon: sky.natalLon,
      natalSignIndex: sky.natalSignIndex,
      moonSign: sky.moonSign.prepositional,
      facts: [
        { label: 'Солнце сегодня', value: sky.sunText, wide: false },
        { label: 'Луна сегодня', value: sky.moonText, wide: false },
        { label: 'Фаза', value: `${sky.phase}, ${sky.lit}%`, wide: false },
        { label: 'Лунный день', value: `≈ ${sky.lunarDay}`, wide: false },
        { label: 'Ваше Солнце', value: sky.natalText, wide: false },
        { label: 'Стихия', value: sky.sign.element, wide: false },
        { label: 'Аспекты', value: sky.aspects.length ? sky.aspects.join('; ') : 'точных аспектов сегодня нет', wide: true }
      ]
    };
  });

  app.get('/api/sky/reading', async (request, reply) => {
    const user = authUser(request);
    const query = readingQuery.safeParse(request.query);
    const day = today();
    const sky = personalSky(birthOf(user), day, env.APP_TZ);
    return sendReading(reply, {
      user,
      kind: 'sky',
      key: `${day}:${user.birthDate}`,
      prompt: skyPrompt(sky, dateFull(day, env.APP_TZ)),
      fallback: skyFallback(sky),
      refresh: query.success && query.data.refresh === '1'
    });
  });

  app.get('/api/day', async (request) => {
    const user = authUser(request);
    const day = today();
    const birthDate = birthOf(user);
    const opened = isDayOpened(user.id, day);
    return { day, opened, card: opened ? faceOf(dayCardFor(user.id, birthDate, day)) : null };
  });

  app.post('/api/day/open', async (request) => {
    const user = authUser(request);
    const day = today();
    const birthDate = birthOf(user);
    openDay(user.id, day);
    return { day, opened: true, card: faceOf(dayCardFor(user.id, birthDate, day)) };
  });

  app.get('/api/day/reading', async (request, reply) => {
    const user = authUser(request);
    const day = today();
    const birthDate = birthOf(user);
    if (!isDayOpened(user.id, day)) throw new HttpError(409, 'not_ready');
    const face = faceOf(dayCardFor(user.id, birthDate, day));
    return sendReading(reply, {
      user,
      kind: 'day',
      key: `${day}:${birthDate}`,
      prompt: dayPrompt(face, signOfBirth(birthDate).name, dateFull(day, env.APP_TZ)),
      fallback: dayFallback(face),
      refresh: false
    });
  });

  app.post('/api/spreads', async (request) => {
    const user = authUser(request);
    const body = spreadBody.safeParse(request.body);
    if (!body.success) throw new HttpError(400, 'bad_question');
    const day = today();
    const quota = quotaOf(user, day);
    let paid = quota.subscribed;
    if (!quota.subscribed && quota.freeLeft === 0) {
      if (!takeCredit(user.id)) throw new HttpError(402, 'quota');
      paid = true;
    }
    const id = randomUUID();
    createSpread({ id, userId: user.id, day, question: body.data.question, deck: drawFan(), picks: [] }, paid);
    const fresh = getUser(user.id) ?? user;
    return { id, size: FAN_SIZE, quota: quotaOf(fresh, day) };
  });

  app.post('/api/spreads/:id/pick', async (request) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    const body = pickBody.safeParse(request.body);
    if (!params.success || !body.success) throw new HttpError(400, 'bad_request');
    const spread = getSpread(params.data.id);
    if (!spread || spread.userId !== user.id) throw new HttpError(404, 'not_found');
    if (spread.picks.length >= PICKS) throw new HttpError(409, 'spread_full');
    if (spread.picks.includes(body.data.index)) throw new HttpError(409, 'already_picked');
    const picks = [...spread.picks, body.data.index];
    setPicks(spread.id, picks);
    return { slot: picks.length - 1, card: faceOf(spread.deck[body.data.index]), done: picks.length === PICKS };
  });

  app.get('/api/spreads/:id/reading', async (request, reply) => {
    const user = authUser(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw new HttpError(400, 'bad_request');
    const spread = getSpread(params.data.id);
    if (!spread || spread.userId !== user.id) throw new HttpError(404, 'not_found');
    if (spread.picks.length < PICKS) throw new HttpError(409, 'not_ready');
    const faces = spread.picks.map((index) => faceOf(spread.deck[index]));
    return sendReading(reply, {
      user,
      kind: 'spread',
      key: spread.id,
      prompt: spreadPrompt(faces, spread.question),
      fallback: spreadFallback(faces),
      refresh: false
    });
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
