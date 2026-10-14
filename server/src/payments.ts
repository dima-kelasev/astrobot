import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env, paymentReturnUrl, yookassaReady } from './env.js';

export const PRODUCTS = {
  month: { title: 'Подписка на 30 дней', short: 'Месяц', price: 299, days: 30, kind: 'sub' },
  quarter: { title: 'Подписка на 90 дней', short: '3 месяца', price: 690, days: 90, kind: 'sub' },
  year: { title: 'Подписка на 365 дней', short: 'Год', price: 1990, days: 365, kind: 'sub' },
  natal: { title: 'Натальная карта целиком', short: 'Натальная карта', price: 199, days: null, kind: 'natal' },
  compat: { title: 'Совместимость с партнёром', short: 'Совместимость', price: 149, days: null, kind: 'compat' }
} as const;

export type ProductKey = keyof typeof PRODUCTS;

export const PRODUCT_KEYS = ['month', 'quarter', 'year', 'natal', 'compat'] as const;

export const METHODS = ['sbp', 'card', 'other'] as const;

export type Method = (typeof METHODS)[number];

export class PaymentError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const paymentSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'waiting_for_capture', 'succeeded', 'canceled']),
  paid: z.boolean().optional(),
  confirmation: z.object({ confirmation_url: z.string().optional() }).optional(),
  metadata: z.record(z.string(), z.string()).optional()
});

export type RemotePayment = z.infer<typeof paymentSchema>;

const auth = () => `Basic ${Buffer.from(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`).toString('base64')}`;

const call = async (path: string, init: { method: 'GET' | 'POST'; body?: unknown }) => {
  if (!yookassaReady) throw new PaymentError('not_configured');
  let response: Response;
  try {
    response = await fetch(`${env.YOOKASSA_API.replace(/\/+$/, '')}${path}`, {
      method: init.method,
      headers: {
        Authorization: auth(),
        'Content-Type': 'application/json',
        ...(init.method === 'POST' ? { 'Idempotence-Key': randomUUID() } : {})
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(20000)
    });
  } catch (error) {
    console.error('Нет связи с ЮKassa:', error);
    throw new PaymentError('upstream');
  }
  const text = await response.text();
  if (!response.ok) {
    console.error(`ЮKassa ответила ${response.status}:`, text.slice(0, 500));
    throw new PaymentError('upstream');
  }
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {}
  const parsed = paymentSchema.safeParse(json);
  if (!parsed.success) {
    console.error('Непонятный ответ ЮKassa:', text.slice(0, 500));
    throw new PaymentError('upstream');
  }
  return parsed.data;
};

const METHOD_DATA: Record<Method, { type: string } | null> = { sbp: { type: 'sbp' }, card: { type: 'bank_card' }, other: null };

const money = (rub: number) => ({ value: rub.toFixed(2), currency: 'RUB' });

export const createRemotePayment = async (input: { userId: number; product: ProductKey; ref: string; email: string; method: Method; description: string }) => {
  const product = PRODUCTS[input.product];
  const methodData = METHOD_DATA[input.method];
  const payment = await call('/payments', {
    method: 'POST',
    body: {
      amount: money(product.price),
      capture: true,
      confirmation: { type: 'redirect', return_url: paymentReturnUrl },
      description: input.description.slice(0, 128),
      metadata: { userId: String(input.userId), product: input.product, ref: input.ref },
      ...(methodData ? { payment_method_data: methodData } : {}),
      ...(env.YOOKASSA_RECEIPTS
        ? {
            receipt: {
              customer: { email: input.email },
              items: [
                {
                  description: product.title.slice(0, 128),
                  quantity: '1.00',
                  amount: money(product.price),
                  vat_code: env.YOOKASSA_VAT_CODE,
                  payment_mode: 'full_payment',
                  payment_subject: 'service'
                }
              ]
            }
          }
        : {})
    }
  });
  const url = payment.confirmation?.confirmation_url;
  if (!url) throw new PaymentError('upstream');
  return { id: payment.id, url };
};

export const fetchRemotePayment = (id: string) => call(`/payments/${encodeURIComponent(id)}`, { method: 'GET' });
