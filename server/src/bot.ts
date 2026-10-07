import type { Agent } from 'node:http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Markup, Telegraf, TelegramError } from 'telegraf';
import { upsertUser, type User } from './db.js';
import { env } from './env.js';

export type SendResult = 'sent' | 'blocked' | 'failed';

const RETRY_MS = 15000;

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

const proxyAgent = (): Agent | undefined => {
  if (!env.TELEGRAM_PROXY) return undefined;
  const options = { keepAlive: true, keepAliveMsecs: 10000 };
  return env.TELEGRAM_PROXY.startsWith('socks') ? new SocksProxyAgent(env.TELEGRAM_PROXY, options) : new HttpsProxyAgent(env.TELEGRAM_PROXY, options);
};

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const isBadToken = (error: unknown) => error instanceof TelegramError && (error.code === 401 || error.code === 404);

const isRejected = (error: unknown) => error instanceof TelegramError && error.code >= 400 && error.code < 500 && error.code !== 429;

export const createBot = () => {
  const agent = proxyAgent();
  const bot = new Telegraf(env.BOT_TOKEN, {
    telegram: {
      ...(agent ? { agent } : {}),
      ...(env.TELEGRAM_API_ROOT ? { apiRoot: env.TELEGRAM_API_ROOT } : {})
    }
  });
  if (agent) console.log('Бот ходит в Telegram через прокси.');

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

const setupBot = async (bot: Telegraf) => {
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

export const runBot = (bot: Telegraf) => {
  let stopped = false;
  let configured = false;
  let timer: NodeJS.Timeout | undefined;

  const configure = async () => {
    if (configured) return;
    try {
      await setupBot(bot);
    } catch (error) {
      if (isBadToken(error) || !isRejected(error)) throw error;
      console.error('Telegram не принял настройки бота:', reasonOf(error));
    }
    configured = true;
  };

  const attempt = async () => {
    try {
      await configure();
      await bot.launch(() => console.log('Бот запущен.'));
    } catch (error) {
      if (stopped) return;
      if (isBadToken(error)) {
        console.error('Telegram не принял токен бота. Проверьте BOT_TOKEN и перезапустите сервер.');
        return;
      }
      const conflict = error instanceof TelegramError && error.code === 409;
      const reason = conflict ? 'бот с этим токеном уже запущен в другом месте' : reasonOf(error);
      console.error(`Бот не на связи с Telegram: ${reason}. Повтор через ${RETRY_MS / 1000} с.`);
      timer = setTimeout(() => void attempt(), RETRY_MS);
    }
  };

  void attempt();

  return () => {
    stopped = true;
    clearTimeout(timer);
    try {
      bot.stop();
    } catch {}
  };
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
