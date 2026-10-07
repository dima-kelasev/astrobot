import { Markup, Telegraf, TelegramError } from 'telegraf';
import { upsertUser, type User } from './db.js';
import { env } from './env.js';

export type SendResult = 'sent' | 'blocked' | 'failed';

const hasWebApp = env.WEBAPP_URL.startsWith('https://');

const openKeyboard = () => Markup.inlineKeyboard([Markup.button.webApp('Открыть Астробота', env.WEBAPP_URL)]);

const WELCOME = [
  'Здравствуйте! Я Астробот.',
  '',
  'Что умею:',
  '• расклад Таро на ваш вопрос',
  '• карта дня',
  '• гороскоп по реальному положению Солнца и Луны'
].join('\n');

export const createBot = () => {
  const bot = new Telegraf(env.BOT_TOKEN);

  bot.start(async (ctx) => {
    upsertUser(ctx.from.id, ctx.from.first_name);
    if (hasWebApp) await ctx.reply(WELCOME, openKeyboard());
    else await ctx.reply(`${WELCOME}\n\nМини-апп пока не подключён: в настройках сервера не задан адрес WEBAPP_URL.`);
  });

  bot.help(async (ctx) => {
    const text = 'Нажмите кнопку ниже, чтобы открыть мини-апп. Утренний гороскоп включается в профиле.';
    if (hasWebApp) await ctx.reply(text, openKeyboard());
    else await ctx.reply(text);
  });

  bot.catch((error) => {
    console.error('Ошибка бота:', error);
  });

  return bot;
};

export const setupBot = async (bot: Telegraf) => {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Открыть Астробота' },
    { command: 'help', description: 'Помощь' }
  ]);
  if (hasWebApp) {
    await bot.telegram.setChatMenuButton({ menuButton: { type: 'web_app', text: 'Открыть', web_app: { url: env.WEBAPP_URL } } });
  } else {
    console.warn('WEBAPP_URL не задан или не начинается с https://, кнопка мини-аппа не добавлена.');
  }
};

export const sendMorning = async (bot: Telegraf, user: User, text: string): Promise<SendResult> => {
  try {
    if (hasWebApp) await bot.telegram.sendMessage(user.id, text, openKeyboard());
    else await bot.telegram.sendMessage(user.id, text);
    return 'sent';
  } catch (error) {
    if (error instanceof TelegramError && error.code === 403) return 'blocked';
    console.error(`Не удалось отправить утреннее сообщение ${user.id}:`, error);
    return 'failed';
  }
};
