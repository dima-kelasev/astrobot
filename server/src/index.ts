import { startBackup } from './backup.js';
import { createBot, runBot, sendAdminPaid, sendBackup } from './bot.js';
import { dateText } from './botcore.js';
import { closeDb, getUser } from './db.js';
import { adminIds, env, fastModel, llmReady, yookassaReady } from './env.js';
import { createApp, onPaid, startPaymentSweeper } from './http.js';
import { MaxClient, runMaxBot } from './max.js';
import { startNotifier, startPersonal } from './notifier.js';
import { openButtons, registerMax, registerTelegram, screenButton, sendToUser, slotButtons } from './sendout.js';

const paymentsOn = env.PAYMENTS_ENABLED && yookassaReady;

const app = await createApp();
await app.listen({ port: env.PORT, host: env.HOST });
console.log(`Сервер открыт: http://localhost:${env.PORT}`);
console.log(
  llmReady
    ? `Нейросеть: ${env.LLM_MODEL}, для гороскопа и рассылки ${fastModel}, через ${env.LLM_BASE_URL}`
    : 'Нейросеть не настроена: показывается текст по шаблону.'
);
console.log(paymentsOn ? 'Оплата: ЮKassa подключена.' : 'Оплата выключена: всё открыто, работают только дневные лимиты.');
console.log(adminIds.length ? `Админы: ${adminIds.join(', ')}.` : 'ADMIN_IDS не задан: уведомления об оплатах и /stats выключены.');
if (env.DEV_USER_ID) console.warn(`Режим разработки: вход без Telegram под пользователем ${env.DEV_USER_ID}. На боевом сервере уберите DEV_USER_ID.`);

const stopSweeper = startPaymentSweeper();

let stopBot = () => {};
let stopMax = () => {};
let stopNotifier = () => {};
let stopBackup = () => {};

const tgBot = env.BOT_TOKEN ? createBot() : null;

if (tgBot) {
  stopBot = runBot(tgBot);
  registerTelegram(tgBot);
} else {
  console.warn('BOT_TOKEN не задан: Telegram-бот не запущен.');
}

if (env.MAX_BOT_TOKEN) {
  const client = new MaxClient();
  registerMax(client);
  stopMax = runMaxBot(client);
} else {
  console.log('MAX_BOT_TOKEN не задан: MAX-бот выключен.');
}

if (tgBot || env.MAX_BOT_TOKEN) {
  stopNotifier = startNotifier((user, slot, text) => sendToUser(user, text, slotButtons(slot)));
  onPaid((event) => {
    const user = getUser(event.userId);
    const text = event.until ? `Оплата прошла. ${event.title}: доступ открыт до ${dateText(event.until)}.` : `Оплата прошла. ${event.title}: уже открыто.`;
    if (user) void sendToUser(user, text, openButtons());
    if (tgBot) void sendAdminPaid(tgBot, event);
  });
  const stopPersonal = startPersonal((userId, text, screen) => {
    const user = getUser(userId);
    return user ? sendToUser(user, text, screenButton(screen)) : Promise.resolve('failed' as const);
  });
  const stopOld = stopNotifier;
  stopNotifier = () => {
    stopOld();
    stopPersonal();
  };
  if (tgBot && adminIds.length) stopBackup = startBackup((file) => sendBackup(tgBot, file));
  else if (!tgBot) console.warn('Telegram-бот не запущен: ежедневная отправка бэкапов выключена.');
  else console.warn('ADMIN_IDS не задан: ежедневная отправка бэкапов выключена.');
}

const shutdown = async () => {
  stopSweeper();
  stopNotifier();
  stopBackup();
  stopBot();
  stopMax();
  await app.close();
  closeDb();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
