import { createBot, runBot, sendNotification } from './bot.js';
import { closeDb } from './db.js';
import { env, llmReady } from './env.js';
import { createApp } from './http.js';
import { startNotifier } from './notifier.js';

const app = await createApp();
await app.listen({ port: env.PORT, host: env.HOST });
console.log(`Сервер открыт: http://localhost:${env.PORT}`);
console.log(llmReady ? `Нейросеть: ${env.LLM_MODEL} через ${env.LLM_BASE_URL}` : 'Нейросеть не настроена: показывается текст по шаблону.');
if (env.DEV_USER_ID) console.warn(`Режим разработки: вход без Telegram под пользователем ${env.DEV_USER_ID}. На боевом сервере уберите DEV_USER_ID.`);

let stopBot = () => {};
let stopNotifier = () => {};

if (env.BOT_TOKEN) {
  const bot = createBot();
  stopBot = runBot(bot);
  stopNotifier = startNotifier((user, slot, text) => sendNotification(bot, user, slot, text));
} else {
  console.warn('BOT_TOKEN не задан: бот не запущен, работает только сайт.');
}

const shutdown = async () => {
  stopNotifier();
  stopBot();
  await app.close();
  closeDb();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
