import type { SendResult } from './bot.js';
import { disableNotifications, getBroadcast, markNotified, recentBroadcasts, saveBroadcast, usersToNotify, type Slot, type User } from './db.js';
import { env, fastModel, llmReady } from './env.js';
import { completeText } from './llm.js';
import { broadcastPrompt } from './prompts.js';
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
