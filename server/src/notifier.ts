import type { SendResult } from './bot.js';
import {
  activeSubscribers,
  alertSent,
  disableNotifications,
  getBroadcast,
  lastAlertAt,
  markAlert,
  markNotified,
  recentBroadcasts,
  saveBroadcast,
  usersToNotify,
  type Slot,
  type User
} from './db.js';
import { env, fastModel, llmReady } from './env.js';
import { completeText } from './llm.js';
import { chartOf, personalAlerts } from './natal.js';
import { alertPrompt, broadcastPrompt } from './prompts.js';
import { dateFull, dayKey, hourIn } from './time.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FALLBACK: Record<Slot, string[]> = {
  morning: [
    'Гороскоп и карта дня уже готовы. Загляните, прежде чем день разгонится.',
    'Новый день, новая карта. Посмотрите, на что она советует обратить внимание.',
    'Утро хорошо начинать с ясности. Гороскоп на сегодня ждёт вас.',
    'Карта дня выбрана. Пара минут, чтобы понять настроение дня.',
    'Загляните в гороскоп и карту дня, если хотите начать день с опоры на небо.',
    'Ваш гороскоп на сегодня собран по положению Луны и планет.',
    'Перед делами загляните в карту дня: она подскажет, где быть внимательнее.'
  ],
  evening: [
    'Вечер подходит, чтобы спокойно подумать о том, что волнует. Карты рядом.',
    'Если за день накопились вопросы, можно разложить карты и посмотреть на них со стороны.',
    'Есть ситуация, которая не выходит из головы? Расклад поможет её разобрать.',
    'Тихий вечер хорош для расклада. Задайте вопрос, который давно откладывали.',
    'Перед сном можно разложить карты на то, что сейчас важно.',
    'Вечером мысли спокойнее. Хорошее время спросить карты о том, что волнует.',
    'Расклады по темам ждут: отношения, работа, трудный выбор.',
    'Вечером можно сделать расклад таро и спокойно обдумать то, что вас волнует.'
  ]
};

const pickFallback = (slot: Slot, day: string) => {
  const list = FALLBACK[slot];
  const seed = Number(day.replaceAll('-', '')) % list.length;
  return list[seed];
};

const BANNED = /(последний шанс|успейте|только сегодня|срочно|%|освещ|градус|луна в |растущ|убывающ|полнолун|новолун)/i;

const clean = (text: string) =>
  text
    .replace(/^[«"'\s]+|[»"'\s]+$/g, '')
    .replaceAll('!', '.')
    .replace(/\s+[—–-]\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

const generate = async (slot: Slot, day: string) => {
  if (!llmReady) return null;
  try {
    const text = clean(
      await completeText(
        broadcastPrompt(slot, dateFull(day, env.APP_TZ), recentBroadcasts(slot, 7)),
        { maxTokens: 120, temperature: 1, model: fastModel },
        30000
      )
    );
    if (text.length < 15 || text.length > 160 || BANNED.test(text)) return null;
    return text;
  } catch (error) {
    console.error('Не удалось написать текст рассылки:', error);
    return null;
  }
};

export const broadcastText = async (slot: Slot, day: string) => {
  const saved = getBroadcast(day, slot);
  if (saved) return saved;
  const text = (await generate(slot, day)) ?? pickFallback(slot, day);
  saveBroadcast(day, slot, text);
  return text;
};

export type Sender = (user: User, slot: Slot, text: string) => Promise<SendResult>;

const slotAt = (now: Date): Slot | null => {
  const hour = hourIn(env.APP_TZ, now);
  if (hour === env.NOTIFY_HOUR) return 'morning';
  if (hour === env.EVENING_HOUR) return 'evening';
  return null;
};

export const notifyOnce = async (send: Sender, now: Date = new Date()) => {
  const slot = slotAt(now);
  if (!slot) return 0;
  const day = dayKey(env.APP_TZ, now);
  const users = usersToNotify(slot, day);
  if (users.length === 0) return 0;
  const text = await broadcastText(slot, day);
  let sent = 0;
  for (const user of users) {
    const result = await send(user, slot, text);
    if (result === 'blocked') disableNotifications(user.id);
    if (result !== 'failed') markNotified(user.id, slot, day);
    if (result === 'sent') sent += 1;
    await sleep(40);
  }
  return sent;
};

export const startNotifier = (send: Sender) => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await notifyOnce(send);
    } catch (error) {
      console.error('Ошибка рассылки:', error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 60 * 1000);
  void tick();
  return () => clearInterval(timer);
};

export type PersonalSender = (userId: number, text: string, screen: 'why' | 'plan') => Promise<SendResult>;

const DAY_MS = 86400000;
const ALERT_GAP_MS = 3 * DAY_MS;
const REPEAT_MS = 300 * DAY_MS;

const dateText = (iso: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: env.APP_TZ, day: 'numeric', month: 'long' }).format(new Date(iso));

const writeAlert = async (facts: string, fallback: string) => {
  if (!llmReady) return fallback;
  try {
    const text = clean(await completeText(alertPrompt(facts), { maxTokens: 220, temperature: 0.8, model: fastModel }, 30000));
    return text.length >= 40 && text.length <= 400 && !BANNED.test(text) ? text : fallback;
  } catch (error) {
    console.error('Не удалось написать личное уведомление:', error);
    return fallback;
  }
};

const expiryAlert = (until: string, now: Date) => {
  const left = new Date(until).getTime() - now.getTime();
  if (left <= 0) return null;
  if (left <= 1.5 * DAY_MS)
    return {
      key: `exp1:${until}`,
      text: `Подписка заканчивается ${dateText(until)}. Чтобы натальная карта, вопросы и расклады оставались открыты, продлите её заранее: новые дни прибавятся к текущему сроку.`
    };
  if (left <= 3.5 * DAY_MS)
    return {
      key: `exp3:${until}`,
      text: `Через несколько дней, ${dateText(until)}, заканчивается подписка. Продлить можно уже сейчас: дни прибавятся к текущему сроку, ничего не потеряется.`
    };
  return null;
};

export const personalOnce = async (send: PersonalSender, now: Date = new Date()) => {
  let sent = 0;
  for (const { user, until } of activeSubscribers()) {
    const expiry = expiryAlert(until, now);
    if (expiry && !alertSent(user.id, expiry.key)) {
      const result = await send(user.id, expiry.text, 'plan');
      if (result !== 'failed') markAlert(user.id, expiry.key);
      if (result === 'sent') sent += 1;
      await sleep(40);
    }
    if (!user.notifyMorning || !user.birthDate) continue;
    const recent = [lastAlertAt(user.id, 'tr:'), lastAlertAt(user.id, 'in:')].filter((value): value is string => value !== null);
    if (recent.some((value) => now.getTime() - new Date(value).getTime() < ALERT_GAP_MS)) continue;
    const fresh = (key: string) => {
      const previous = lastAlertAt(user.id, key.slice(0, key.lastIndexOf(':') + 1));
      return !alertSent(user.id, key) && (!previous || now.getTime() - new Date(previous).getTime() > REPEAT_MS);
    };
    const alert = personalAlerts(chartOf({ date: user.birthDate, time: user.birthTime, place: user.place }), now).find((item) => fresh(item.key));
    if (!alert) continue;
    const text = await writeAlert(alert.facts, alert.fallback);
    const result = await send(user.id, text, 'why');
    if (result !== 'failed') markAlert(user.id, alert.key);
    if (result === 'sent') sent += 1;
    await sleep(40);
  }
  return sent;
};

const PERSONAL_HOUR = (env.NOTIFY_HOUR + 2) % 24;

export const startPersonal = (send: PersonalSender) => {
  let running = false;
  let lastDay = '';
  const tick = async () => {
    const now = new Date();
    const day = dayKey(env.APP_TZ, now);
    if (running || day === lastDay || hourIn(env.APP_TZ, now) !== PERSONAL_HOUR) return;
    running = true;
    try {
      await personalOnce(send, now);
      lastDay = day;
    } catch (error) {
      console.error('Ошибка личных уведомлений:', error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 60 * 1000);
  void tick();
  return () => clearInterval(timer);
};
