import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

const envFile = join(process.cwd(), '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '') || originOf(process.env.WEBAPP_URL ?? '') || 'http://localhost:3000';

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_BOT_USERNAME: (process.env.BOT_USERNAME ?? '').replace(/^@/, ''),
    NEXT_PUBLIC_METRIKA_ID: process.env.METRIKA_ID ?? '',
    NEXT_PUBLIC_OPERATOR_NAME: process.env.OPERATOR_NAME ?? '',
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.CONTACT_EMAIL ?? '',
    NEXT_PUBLIC_LLM_PROVIDER: process.env.LLM_BASE_URL?.includes('deepseek') ? 'DeepSeek (Китай)' : ''
  }
};

export default config;
