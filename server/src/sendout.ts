import { Markup, Telegraf, TelegramError } from 'telegraf';
import { externalIdOf, type User } from './db.js';
import { env } from './env.js';
import { maxAppButton, type MaxButton, type MaxClient } from './max.js';

export type SendResult = 'sent' | 'blocked' | 'failed';

export type OutButton = { text: string; screen?: string };

let tg: Telegraf | null = null;
let max: MaxClient | null = null;

export const registerTelegram = (bot: Telegraf) => {
  tg = bot;
};

export const registerMax = (client: MaxClient) => {
  max = client;
};

const hasWebApp = env.WEBAPP_URL.startsWith('https://');

const appUrl = (screen?: string) => {
  if (!screen) return env.WEBAPP_URL;
  const url = new URL(env.WEBAPP_URL);
  url.searchParams.set('s', screen);
  return url.toString();
};

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const sendTg = async (userId: number, text: string, buttons: OutButton[]): Promise<SendResult> => {
  if (!tg) return 'failed';
  try {
    const keyboard =
      hasWebApp && buttons.length ? Markup.inlineKeyboard(buttons.map((button) => Markup.button.webApp(button.text, appUrl(button.screen)))) : undefined;
    await tg.telegram.sendMessage(userId, text, keyboard);
    return 'sent';
  } catch (error) {
    if (error instanceof TelegramError && (error.code === 403 || error.code === 400)) return 'blocked';
    console.error(`Не удалось отправить сообщение в Telegram ${userId}:`, reasonOf(error));
    return 'failed';
  }
};

const sendMax = async (userId: number, text: string, buttons: OutButton[]): Promise<SendResult> => {
  if (!max) return 'failed';
  const external = externalIdOf(userId);
  if (!external) return 'failed';
  try {
    const keyboard: MaxButton[][] = hasWebApp && buttons.length ? [buttons.map((button) => maxAppButton(button.text, button.screen))] : [];
    await max.send(Number(external), text, keyboard);
    return 'sent';
  } catch (error) {
    const reason = reasonOf(error);
    if (/blocked|not\.found|chat\.denied/i.test(reason)) return 'blocked';
    console.error(`Не удалось отправить сообщение в MAX ${external}:`, reason);
    return 'failed';
  }
};

export const sendToUser = (user: User, text: string, buttons: OutButton[] = []): Promise<SendResult> =>
  user.platform === 'max' ? sendMax(user.id, text, buttons) : sendTg(user.id, text, buttons);

export const slotButtons = (slot: 'morning' | 'evening'): OutButton[] =>
  slot === 'morning' ? [{ text: 'Гороскоп на сегодня', screen: 'sky' }, { text: 'Карта дня', screen: 'day' }] : [{ text: 'Разложить карты', screen: 'topics' }];

export const screenButton = (screen: 'why' | 'plan'): OutButton[] => [{ text: screen === 'plan' ? 'Продлить подписку' : 'Открыть разбор', screen }];

export const openButtons = (): OutButton[] => [{ text: 'Открыть Фрею' }];
