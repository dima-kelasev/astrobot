import { createBot, runBot, sendNotification, sendPaid } from './bot.js';
import { closeDb } from './db.js';
import { env, fastModel, llmReady, yookassaReady } from './env.js';
import { createApp, onPaid, startPaymentSweeper } from './http.js';
import { startNotifier } from './notifier.js';

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
if (env.DEV_USER_ID) console.warn(`Режим разработки: вход без Telegram под пользователем ${env.DEV_USER_ID}. На боевом сервере уберите DEV_USER_ID.`);

const stopSweeper = startPaymentSweeper();

let stopBot = () => {};
let stopNotifier = () => {};

if (env.BOT_TOKEN) {
  const bot = createBot();
  stopBot = runBot(bot);
  stopNotifier = startNotifier((user, slot, text) => sendNotification(bot, user, slot, text));
  onPaid((event) => void sendPaid(bot, event));
} else {
  console.warn('BOT_TOKEN не задан: бот не запущен, работает только сайт.');
}

const shutdown = async () => {
  stopSweeper();
  stopNotifier();
  stopBot();
  await app.close();
  closeDb();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
