import { pendingDiscount, redeemPromo, type RedeemResult } from './db.js';
import { env, yookassaReady } from './env.js';
import { PROMO_CODE, normalizePromo } from './payments.js';

export type PromoOutcome = RedeemResult | { ok: false; reason: 'bad_code' | 'payments_off' | 'too_many' };

export type PromoFail = Exclude<PromoOutcome, { ok: true }>['reason'];

const TRIES_PER_HOUR = 10;
const tries = new Map<number, number[]>();

const allowTry = (userId: number) => {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = (tries.get(userId) ?? []).filter((time) => time > hourAgo);
  const allowed = recent.length < TRIES_PER_HOUR;
  if (allowed) recent.push(Date.now());
  tries.set(userId, recent);
  return allowed;
};

export const usePromo = (userId: number, raw: string): PromoOutcome => {
  if (!(env.PAYMENTS_ENABLED && yookassaReady)) return { ok: false, reason: 'payments_off' };
  if (!allowTry(userId)) return { ok: false, reason: 'too_many' };
  const code = normalizePromo(raw);
  if (!PROMO_CODE.test(code)) return { ok: false, reason: 'bad_code' };
  return redeemPromo(userId, code);
};

export const discountOf = (userId: number) => (env.PAYMENTS_ENABLED && yookassaReady ? pendingDiscount(userId) : null);

export const daysWord = (n: number) => {
  const tail = n % 100;
  if (tail >= 11 && tail <= 14) return 'дней';
  if (n % 10 === 1) return 'день';
  if (n % 10 >= 2 && n % 10 <= 4) return 'дня';
  return 'дней';
};

const FAIL_TEXT: Record<PromoFail, string> = {
  bad_code: 'Такого промокода нет или он больше не действует.',
  not_found: 'Такого промокода нет или он больше не действует.',
  used: 'Вы уже применяли этот промокод.',
  exhausted: 'Промокод закончился: все активации уже разобрали.',
  has_discount: 'У вас уже есть скидка не меньше этой. Она сработает при следующей покупке.',
  payments_off: 'Сейчас всё открыто бесплатно, промокод не нужен.',
  too_many: 'Слишком много попыток. Попробуйте через час.'
};

export const promoText = (outcome: PromoOutcome, dateText: (iso: string) => string) => {
  if (!outcome.ok) return FAIL_TEXT[outcome.reason];
  const { promo, until } = outcome;
  if (promo.kind === 'days') {
    return `Промокод ${promo.code} принят: подписка на ${promo.value} ${daysWord(promo.value)}${until ? `, до ${dateText(until).replace(/\.$/, '')}` : ''}. Всё уже открыто.`;
  }
  return `Промокод ${promo.code} принят: скидка ${promo.value}% на следующую покупку. Она уже учтена в ценах.`;
};
