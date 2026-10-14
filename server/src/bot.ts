import type { Agent } from 'node:http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Markup, Telegraf, TelegramError } from 'telegraf';
import { adminStats, buyerOf, deleteUserData, grantRefs, recentSales, subscriptionUntil, upsertUser, type SalesSum, type Slot, type User } from './db.js';
import { adminIds, env, privacyUrl } from './env.js';
import { PRODUCTS, PRODUCT_KEYS } from './payments.js';
import { dayKey, noonOf } from './time.js';

export type SendResult = 'sent' | 'blocked' | 'failed';

const RETRY_MS = 15000;

const hasWebApp = env.WEBAPP_URL.startsWith('https://');

const appUrl = (screen?: string) => {
  if (!screen) return env.WEBAPP_URL;
  const url = new URL(env.WEBAPP_URL);
  url.searchParams.set('s', screen);
  return url.toString();
};

const openKeyboard = () => Markup.inlineKeyboard([Markup.button.webApp('Открыть Астробота', appUrl())]);

const slotKeyboard = (slot: Slot) =>
  slot === 'morning'
    ? Markup.inlineKeyboard([[Markup.button.webApp('Гороскоп на сегодня', appUrl('sky'))], [Markup.button.webApp('Карта дня', appUrl('day'))]])
    : Markup.inlineKeyboard([Markup.button.webApp('Разложить карты', appUrl('topics'))]);

const WELCOME = [
  'Здравствуйте! Я Астробот.',
  '',
  'Что умею:',
  '• отвечать на ваш вопрос раскладом Таро или по натальной карте',
  '• натальная карта, асцендент и «Почему сейчас так?»',
  '• совместимость пары',
  '• расклады по темам: любовь, работа, трудный выбор',
  '• гороскоп и карта дня каждый день',
  '',
  'Утром и вечером я присылаю короткое сообщение. Отключить можно в профиле.'
].join('\n');

const dateText = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: env.APP_TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

const paidStatus = (userId: number) => {
  const until = subscriptionUntil(userId);
  if (until && until > new Date().toISOString()) return `Спасибо! Подписка активна до ${dateText(until)}. Всё уже открыто в Астроботе.`;
  if (grantRefs(userId, 'natal').length || grantRefs(userId, 'compat').length) return 'Спасибо! Покупка уже открыта в Астроботе.';
  return 'Платёж ещё обрабатывается. Обычно это занимает до минуты. Если через несколько минут ничего не изменится, напишите на почту из политики конфиденциальности.';
};

export const sendPaid = async (bot: Telegraf, event: { userId: number; title: string; until: string | null }) => {
  const text = event.until ? `Оплата прошла. ${event.title}: доступ открыт до ${dateText(event.until)}.` : `Оплата прошла. ${event.title}: уже открыто.`;
  try {
    await bot.telegram.sendMessage(event.userId, text, hasWebApp ? openKeyboard() : undefined);
  } catch (error) {
    console.error('Не удалось сообщить об оплате:', reasonOf(error));
  }
};

const isAdmin = (id: number) => adminIds.includes(id);

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rub = (amount: number) => `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`;

const dateTimeText = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: env.APP_TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const productTitle = (key: string) => {
  const found = PRODUCT_KEYS.find((item) => item === key);
  return found ? PRODUCTS[found].title : key;
};

const personLink = (userId: number, firstName: string, username: string | null) => {
  const name = escapeHtml(firstName || 'Без имени');
  return `<a href="tg://user?id=${userId}">${name}</a>${username ? ` @${escapeHtml(username)}` : ''}`;
};

const DAY_MS = 86400000;

const statsText = () => {
  const day = dayKey(env.APP_TZ);
  const now = Date.now();
  const stats = adminStats({
    today: day,
    todayIso: new Date(noonOf(day, env.APP_TZ).getTime() - DAY_MS / 2).toISOString(),
    weekDay: dayKey(env.APP_TZ, new Date(now - 7 * DAY_MS)),
    weekIso: new Date(now - 7 * DAY_MS).toISOString(),
    monthIso: new Date(now - 30 * DAY_MS).toISOString()
  });
  const sales = (label: string, value: SalesSum) => `${label}: ${value.count} на ${rub(value.sum)}`;
  return [
    '<b>Пользователи</b>',
    `Всего: ${stats.users}`,
    `Новых сегодня: ${stats.newToday}, за 7 дней: ${stats.newWeek}, за 30 дней: ${stats.newMonth}`,
    `Заходили сегодня: ${stats.activeToday}, за 7 дней: ${stats.activeWeek}`,
    `Ввели данные рождения: ${stats.withBirth}`,
    `Получают рассылку: ${stats.notified}`,
    '',
    '<b>Деньги</b>',
    `Активных подписок: ${stats.subscribers}`,
    sales('Сегодня', stats.salesToday),
    sales('За 7 дней', stats.salesWeek),
    sales('За 30 дней', stats.salesMonth),
    sales('За всё время', stats.salesAll),
    '',
    'Последние покупки: /sales'
  ].join('\n');
};

const salesText = () => {
  const sales = recentSales(15);
  if (!sales.length) return 'Покупок пока нет.';
  return [
    '<b>Последние покупки</b>',
    ...sales.map(
      (sale) =>
        `${dateTimeText(sale.paidAt)} · ${rub(sale.amount)} · ${escapeHtml(productTitle(sale.product))}\n${personLink(sale.userId, sale.firstName, sale.username)}`
    )
  ].join('\n\n');
};

export const sendAdminPaid = async (bot: Telegraf, event: { userId: number; title: string; amount: number; until: string | null }) => {
  if (!adminIds.length) return;
  const buyer = buyerOf(event.userId);
  const lines = [
    `💰 <b>Оплата ${rub(event.amount)}</b>`,
    escapeHtml(event.title),
    `Покупатель: ${personLink(event.userId, buyer.firstName, buyer.username)}`,
    `ID: <code>${event.userId}</code>`
  ];
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

const DELETE_TEXT = 'Удалить все ваши данные: дату, время и место рождения, расклады, историю и данные партнёров? Это нельзя отменить.';

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
    upsertUser(ctx.from.id, ctx.from.first_name, ctx.from.username ?? null);
    if (ctx.payload === 'paid') {
      await ctx.reply(paidStatus(ctx.from.id), hasWebApp ? openKeyboard() : undefined);
      return;
    }
    if (hasWebApp) await ctx.reply(WELCOME, openKeyboard());
    else await ctx.reply(`${WELCOME}\n\nМини-апп пока не подключён: в настройках сервера не задан адрес WEBAPP_URL.`);
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

  bot.command('delete', async (ctx) => {
    await ctx.reply(
      DELETE_TEXT,
      Markup.inlineKeyboard([Markup.button.callback('Удалить данные', 'delete_confirm'), Markup.button.callback('Отмена', 'delete_cancel')])
    );
  });

  bot.action('delete_confirm', async (ctx) => {
    deleteUserData(ctx.from.id);
    await ctx.answerCbQuery();
    await ctx.editMessageText('Ваши данные удалены. Если снова откроете бота, начнём с чистого листа.');
  });

  bot.action('delete_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Удаление отменено.');
  });

  bot.catch((error) => {
    console.error('Ошибка бота:', error);
  });

  return bot;
};

const PUBLIC_COMMANDS = [
  { command: 'start', description: 'Открыть Астробота' },
  { command: 'help', description: 'Помощь' },
  { command: 'delete', description: 'Удалить мои данные' }
];

const ADMIN_COMMANDS = [...PUBLIC_COMMANDS, { command: 'stats', description: 'Статистика' }, { command: 'sales', description: 'Последние покупки' }];

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
    console.error(`Не удалось отправить личное уведомление ${userId}:`, error);
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
