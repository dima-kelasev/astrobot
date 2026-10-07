export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? '';
export const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME ?? '';
export const METRIKA_ID = Number(process.env.NEXT_PUBLIC_METRIKA_ID ?? '') || 0;
export const SITE_NAME = 'Астробот';
export const START_TAG = 'site';

export const botLink = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}?start=${START_TAG}` : '#';
export const botAppLink = BOT_USERNAME ? `tg://resolve?domain=${BOT_USERNAME}&start=${START_TAG}` : '#';
