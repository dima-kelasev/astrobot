import { daySky, signOfBirth } from './astro.js';
import type { SendResult } from './bot.js';
import { markNotified, setNotify, usersToNotify, type User } from './db.js';
import { env } from './env.js';
import { dayKey, hourIn } from './time.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const morningText = (user: User, day: string) => {
  const sky = daySky(day, env.APP_TZ);
  const sign = user.birthDate ? signOfBirth(user.birthDate).name : '';
  const hello = user.firstName ? `Доброе утро, ${user.firstName}!` : 'Доброе утро!';
  return `${hello}\n\n${sky.moonLine} ${sky.phaseTip}\n\nГороскоп${sign ? ` для знака ${sign}` : ''} и карта дня уже ждут.`;
};

export const notifyOnce = async (send: (user: User, text: string) => Promise<SendResult>, now: Date = new Date()) => {
  if (hourIn(env.APP_TZ, now) !== env.NOTIFY_HOUR) return 0;
  const day = dayKey(env.APP_TZ, now);
  let sent = 0;
  for (const user of usersToNotify(day)) {
    const result = await send(user, morningText(user, day));
    if (result === 'blocked') setNotify(user.id, false);
    if (result !== 'failed') markNotified(user.id, day);
    if (result === 'sent') sent += 1;
    await sleep(50);
  }
  return sent;
};

export const startNotifier = (send: (user: User, text: string) => Promise<SendResult>) => {
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
