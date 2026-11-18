import type { Agent } from 'node:http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Markup, Telegraf, TelegramError } from 'telegraf';
import { makeBackup, type BackupFile } from './backup.js';
import {
  DELETE_CANCEL_TEXT,
  DELETE_DONE_TEXT,
  DELETE_TEXT,
  WELCOME,
  createPromoText,
  dateText,
  escapeHtml,
  isAdmin,
  personLink,
  promosText,
  rub,
  salesText,
  startReply,
  statsText,
  togglePromoText
} from './botcore.js';
import { allUsers, buyerOf, deleteUserData, disableNotifications, getPayment, getPromo, getUser, upsertUser, type Slot, type User } from './db.js';
import { adminIds, env, privacyUrl } from './env.js';
import { sendToUser } from './sendout.js';

export type SendResult = 'sent' | 'blocked' | 'failed';

const RETRY_MS = 15000;

const hasWebApp = env.WEBAPP_URL.startsWith('https://');

const appUrl = (screen?: string) => {
  if (!screen) return env.WEBAPP_URL;
  const url = new URL(env.WEBAPP_URL);
  url.searchParams.set('s', screen);
  return url.toString();
};

const openKeyboard = () => Markup.inlineKeyboard([Markup.button.webApp('Открыть Фрею', appUrl())]);

const slotKeyboard = (slot: Slot) =>
  slot === 'morning'
    ? Markup.inlineKeyboard([[Markup.button.webApp('Гороскоп на сегодня', appUrl('sky'))], [Markup.button.webApp('Карта дня', appUrl('day'))]])
    : Markup.inlineKeyboard([Markup.button.webApp('Разложить карты', appUrl('topics'))]);

export const sendPaid = async (bot: Telegraf, event: { userId: number; title: string; until: string | null }) => {
  const text = event.until ? `Оплата прошла. ${event.title}: доступ открыт до ${dateText(event.until)}.` : `Оплата прошла. ${event.title}: уже открыто.`;
  try {
    await bot.telegram.sendMessage(event.userId, text, hasWebApp ? openKeyboard() : undefined);
  } catch (error) {
    console.error('Не удалось сообщить об оплате:', reasonOf(error));
  }
};

export const sendAdminPaid = async (bot: Telegraf, event: { paymentId: string; userId: number; title: string; amount: number; until: string | null }) => {
  if (!adminIds.length) return;
  const buyer = buyerOf(event.userId);
  const lines = [
    `💰 <b>Оплата ${rub(event.amount)}</b>`,
    escapeHtml(event.title),
    `Покупатель: ${personLink(event.userId, buyer.firstName, buyer.username)}`,
    `ID: <code>${event.userId}</code>`
  ];
  const promoCode = getPayment(event.paymentId)?.promo ?? null;
  const promo = promoCode ? getPromo(promoCode) : null;
  if (promo) lines.push(`Промокод: ${escapeHtml(promo.code)} (−${promo.value}%)`);
  else if (buyer.refPromo) lines.push(`Пришёл по промокоду ${escapeHtml(buyer.refPromo)}`);
  if (event.until) lines.push(`Подписка до ${dateText(event.until)}`);
  if (buyer.purchases > 1) lines.push(`Всего покупок: ${buyer.purchases} на ${rub(buyer.spent)}`);
  for (const adminId of adminIds) {
    try {
      await bot.telegram.sendMessage(adminId, lines.join('\n'), { parse_mode: 'HTML' });
    } catch (error) {
      console.error(`Не удалось сообщить админу ${adminId} об оплате:`, reasonOf(error));
    }
  }
};

export const sendBackup = async (bot: Telegraf, file: BackupFile) => {
  const caption = `Резервная копия базы · ${file.sizeKb} КБ (gzip)`;
  for (const adminId of adminIds) {
    try {
      await bot.telegram.sendDocument(adminId, { source: file.path, filename: file.filename }, { caption });
    } catch (error) {
      console.error(`Не удалось отправить бэкап админу ${adminId}:`, reasonOf(error));
    }
  }
};

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
    const known = getUser(ctx.from.id) !== null;
    const user = upsertUser(ctx.from.id, ctx.from.first_name, ctx.from.username ?? null);
    const reply = startReply(user.id, ctx.payload, known);
    if (reply.screen || hasWebApp) {
      const screen = reply.screen;
      const url = appUrl(screen);
      await ctx.reply(reply.text, Markup.inlineKeyboard([Markup.button.webApp('Открыть Фрею', url)]));
      return;
    }
    await ctx.reply(reply.text);
  });

  bot.help(async (ctx) => {
    const lines = ['Нажмите кнопку ниже, чтобы открыть мини-апп. Уведомления отключаются в профиле.', 'Удалить свои данные: /delete'];
    if (privacyUrl) lines.push(`Политика обработки данных: ${privacyUrl}`);
    const text = lines.join('\n');
    if (hasWebApp) await ctx.reply(text, openKeyboard());
    else await ctx.reply(text);
  });

  bot.command('id', async (ctx) => {
    await ctx.reply(`Ваш ID: <code>${ctx.from.id}</code>`, { parse_mode: 'HTML' });
  });

  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(statsText(), { parse_mode: 'HTML' });
  });

  bot.command('sales', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(salesText(), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  });

  bot.command('promos', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(promosText(), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  });

  bot.command('promo_new', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(createPromoText(ctx.payload), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  });

  bot.command('promo_off', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(togglePromoText(ctx.payload, false));
  });

  bot.command('promo_on', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(togglePromoText(ctx.payload, true));
  });

  bot.command('backup', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    try {
      const file = await makeBackup();
      await ctx.replyWithDocument({ source: file.path, filename: file.filename }, { caption: `Резервная копия базы · ${file.sizeKb} КБ (gzip)` });
    } catch (error) {
      console.error('Не удалось сделать бэкап по команде:', reasonOf(error));
      await ctx.reply('Не получилось сделать резервную копию. Подробности в журнале сервера.');
    }
  });

  type PendingBroadcast = { text: string; photo: string | null };
  const pendingBroadcast = new Map<number, PendingBroadcast>();
  let broadcastAbort = false;
  let broadcastRunning = false;
  const broadcastSleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const text = ctx.payload.trim();
    if (!text) {
      await ctx.reply('Напишите текст после команды, например:\n/broadcast Добрый день! У нас новый раздел.\n\nМожно и с картинкой: пришлите фото с подписью /broadcast Текст');
      return;
    }
    pendingBroadcast.set(ctx.from.id, { text, photo: null });
    const count = allUsers().length;
    await ctx.reply(`Отправить это сообщение всем пользователям (${count})?\n\n${escapeHtml(text)}`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([Markup.button.callback('Отправить всем', 'broadcast_send'), Markup.button.callback('Отмена', 'broadcast_cancel')])
    });
  });

  bot.on('photo', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const caption = ctx.message.caption?.trim() ?? '';
    const match = /^\/broadcast(?:@[\w_]+)?\s*([\s\S]*)$/.exec(caption);
    if (!match) return;
    const photo = ctx.message.photo.at(-1)?.file_id;
    if (!photo) return;
    const text = match[1].trim();
    pendingBroadcast.set(ctx.from.id, { text, photo });
    const count = allUsers().length;
    const question = `Отправить это фото${text ? ' с текстом' : ' без текста'} всем пользователям (${count})?`;
    const preview = text ? `\n\n${escapeHtml(text)}` : '';
    await ctx.replyWithPhoto(photo, {
      caption: `${question}${preview}`.slice(0, 1000),
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([Markup.button.callback('Отправить всем', 'broadcast_send'), Markup.button.callback('Отмена', 'broadcast_cancel')])
    });
  });

  bot.action('broadcast_send', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }
    const pending = pendingBroadcast.get(ctx.from.id);
    await ctx.answerCbQuery();
    if (!pending) {
      await ctx.editMessageText('Текст рассылки потерян. Отправьте /broadcast ещё раз.').catch(() => {});
      return;
    }
    pendingBroadcast.delete(ctx.from.id);
    await ctx.editMessageCaption('Рассылка пошла. Пришлю отчёт, когда закончу. Остановить: /broadcast_stop').catch(() =>
      ctx.editMessageText('Рассылка пошла. Пришлю отчёт, когда закончу. Остановить: /broadcast_stop')
    );
    const users = allUsers();
    let sent = 0;
    let blocked = 0;
    let failed = 0;
    broadcastAbort = false;
    broadcastRunning = true;
    for (const user of users) {
      if (broadcastAbort) break;
      const result = await sendToUser(user, pending.text, [], pending.photo);
      if (result === 'sent') sent += 1;
      else if (result === 'blocked') {
        blocked += 1;
        disableNotifications(user.id);
      } else failed += 1;
      await broadcastSleep(40);
    }
    broadcastRunning = false;
    const stoppedEarly = broadcastAbort;
    await ctx.reply(
      `${stoppedEarly ? 'Рассылка остановлена досрочно.' : 'Рассылка закончена.'}\nДоставлено: ${sent}\nБот заблокирован: ${blocked}\nОшибки: ${failed}${stoppedEarly ? `\nНе отправлено: ${users.length - sent - blocked - failed}` : ''}`
    );
  });

  bot.command('broadcast_stop', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    if (!broadcastRunning) {
      await ctx.reply('Сейчас рассылка не идёт.');
      return;
    }
    broadcastAbort = true;
    await ctx.reply('Останавливаю. Отчёт придёт, когда рассылка остановится.');
  });

  bot.action('broadcast_cancel', async (ctx) => {
    pendingBroadcast.delete(ctx.from.id);
    await ctx.answerCbQuery();
    await ctx.editMessageCaption('Рассылка отменена.').catch(() => ctx.editMessageText('Рассылка отменена.'));
  });

  bot.command('delete', async (ctx) => {
    await ctx.reply(
      DELETE_TEXT,
      Markup.inlineKeyboard([Markup.button.callback('Удалить данные', 'delete_confirm'), Markup.button.callback('Отмена', 'delete_cancel')])
    );
  });

  bot.action('delete_confirm', async (ctx) => {
    deleteUserData(ctx.from.id);
    await ctx.answerCbQuery();
    await ctx.editMessageText(DELETE_DONE_TEXT);
  });

  bot.action('delete_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(DELETE_CANCEL_TEXT);
  });

  bot.catch((error) => {
    console.error('Ошибка бота:', error);
  });

  return bot;
};

const PUBLIC_COMMANDS = [
  { command: 'start', description: 'Открыть Фрею' },
  { command: 'help', description: 'Помощь' },
  { command: 'delete', description: 'Удалить мои данные' }
];

const ADMIN_COMMANDS = [
  ...PUBLIC_COMMANDS,
  { command: 'stats', description: 'Статистика' },
  { command: 'sales', description: 'Последние покупки' },
  { command: 'promos', description: 'Промокоды' },
  { command: 'promo_new', description: 'Создать промокод' },
  { command: 'broadcast', description: 'Рассылка всем пользователям' },
  { command: 'backup', description: 'Резервная копия базы' }
];

const setupBot = async (bot: Telegraf) => {
  await bot.telegram.setMyCommands(PUBLIC_COMMANDS);
  for (const adminId of adminIds) {
    try {
      await bot.telegram.setMyCommands(ADMIN_COMMANDS, { scope: { type: 'chat', chat_id: adminId } });
    } catch (error) {
      console.error(`Не удалось задать команды админу ${adminId}. Он должен сначала нажать /start в боте:`, reasonOf(error));
    }
  }
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

export const sendPersonal = async (bot: Telegraf, userId: number, text: string, screen: 'why' | 'plan'): Promise<SendResult> => {
  const label = screen === 'plan' ? 'Продлить подписку' : 'Открыть разбор';
  try {
    if (hasWebApp) await bot.telegram.sendMessage(userId, text, Markup.inlineKeyboard([Markup.button.webApp(label, appUrl(screen))]));
    else await bot.telegram.sendMessage(userId, text);
    return 'sent';
  } catch (error) {
    if (error instanceof TelegramError && (error.code === 403 || error.code === 400)) return 'blocked';
    console.error(`Не удалось отправить личное уведомление ${userId}:`, reasonOf(error));
    return 'failed';
  }
};

export const sendNotification = async (bot: Telegraf, user: User, slot: Slot, text: string): Promise<SendResult> => {
  try {
    if (hasWebApp) await bot.telegram.sendMessage(user.id, text, slotKeyboard(slot));
    else await bot.telegram.sendMessage(user.id, text);
    return 'sent';
  } catch (error) {
    if (error instanceof TelegramError && (error.code === 403 || error.code === 400)) return 'blocked';
    console.error(`Не удалось отправить уведомление ${user.id}:`, error);
    return 'failed';
  }
};
