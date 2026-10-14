import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const schema = z.object({
  BOT_TOKEN: z.string().default(''),
  WEBAPP_URL: z.string().default(''),
  TELEGRAM_PROXY: z.string().default(''),
  TELEGRAM_API_ROOT: z.string().default(''),
  LLM_BASE_URL: z.string().default(''),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default(''),
  LLM_MODEL_FAST: z.string().default(''),
  LLM_EXTRA: z.string().default(''),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('127.0.0.1'),
  DB_PATH: z.string().default(fileURLToPath(new URL('../../data/astrobot.db', import.meta.url))),
  APP_TZ: z.string().default('Europe/Moscow'),
  LIMIT_SPREADS: z.coerce.number().int().min(0).default(3),
  LIMIT_QUESTIONS: z.coerce.number().int().min(0).default(3),
  LIMIT_PARTNERS: z.coerce.number().int().min(0).default(3),
  PAYMENTS_ENABLED: z
    .enum(['0', '1', 'true', 'false'])
    .default('0')
    .transform((value) => value === '1' || value === 'true'),
  NOTIFY_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  EVENING_HOUR: z.coerce.number().int().min(0).max(23).default(20),
  SITE_URL: z.string().default(''),
  BOT_USERNAME: z.string().default(''),
  YOOKASSA_SHOP_ID: z.string().default(''),
  YOOKASSA_SECRET_KEY: z.string().default(''),
  YOOKASSA_API: z.string().default('https://api.yookassa.ru/v3'),
  YOOKASSA_RECEIPTS: z
    .enum(['0', '1', 'true', 'false'])
    .default('1')
    .transform((value) => value === '1' || value === 'true'),
  YOOKASSA_VAT_CODE: z.coerce.number().int().min(1).max(12).default(1),
  PAYMENT_RETURN_URL: z.string().default(''),
  FREE_QUESTIONS: z.coerce.number().int().min(0).default(1),
  FREE_SPREADS: z.coerce.number().int().min(0).default(1),
  FREE_PARTNERS: z.coerce.number().int().min(0).default(1),
  ADMIN_IDS: z.string().default(''),
  DEV_USER_ID: z.coerce.number().int().positive().optional()
});

const filled = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''));

export const env = schema.parse(filled);
export const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
export const siteDist = fileURLToPath(new URL('../../site/out', import.meta.url));
export const fastModel = env.LLM_MODEL_FAST || env.LLM_MODEL;

export const llmReady = Boolean(env.LLM_BASE_URL && env.LLM_API_KEY && env.LLM_MODEL);

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

export const siteOrigin = env.SITE_URL.replace(/\/+$/, '') || originOf(env.WEBAPP_URL);
export const privacyUrl = siteOrigin ? `${siteOrigin}/privacy/` : '';

export const adminIds = env.ADMIN_IDS.split(/[\s,]+/)
  .map(Number)
  .filter((id) => Number.isInteger(id) && id > 0);

export const yookassaReady = Boolean(env.YOOKASSA_SHOP_ID && env.YOOKASSA_SECRET_KEY);

const botName = env.BOT_USERNAME.replace(/^@/, '');

export const paymentReturnUrl = env.PAYMENT_RETURN_URL || (botName ? `https://t.me/${botName}?start=paid` : siteOrigin || 'https://t.me');
