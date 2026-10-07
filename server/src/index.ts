import { createBot, sendMorning, setupBot } from './bot.js';
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
  bot.launch().catch((error: unknown) => {
    console.error('Бот остановился с ошибкой:', error);
  });
  setupBot(bot)
    .then(() => console.log('Бот запущен.'))
    .catch((error: unknown) => console.error('Не удалось настроить бота:', error));
  stopNotifier = startNotifier((user, text) => sendMorning(bot, user, text));
  stopBot = () => bot.stop();
} else {
  console.warn('BOT_TOKEN не задан: бот не запущен, работает только сайт.');
}

const shutdown = async () => {
  stopNotifier();
  try {
    stopBot();
  } catch {}
  await app.close();
  closeDb();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
