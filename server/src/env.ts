import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const schema = z.object({
  BOT_TOKEN: z.string().default(''),
  WEBAPP_URL: z.string().default(''),
  LLM_BASE_URL: z.string().default(''),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default(''),
  LLM_EXTRA: z.string().default(''),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('127.0.0.1'),
  DB_PATH: z.string().default(fileURLToPath(new URL('../../data/astrobot.db', import.meta.url))),
  APP_TZ: z.string().default('Europe/Moscow'),
  FREE_SPREADS_PER_DAY: z.coerce.number().int().min(0).default(1),
  NOTIFY_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  DEV_USER_ID: z.coerce.number().int().positive().optional()
});

const filled = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''));

export const env = schema.parse(filled);
export const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
export const llmReady = Boolean(env.LLM_BASE_URL && env.LLM_API_KEY && env.LLM_MODEL);
