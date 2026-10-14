import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const MAX_AGE_SECONDS = 24 * 60 * 60;

const userSchema = z.object({ id: z.number().int().positive(), first_name: z.string().optional(), username: z.string().optional() });

export type TgUser = { id: number; firstName: string; username: string | null };

export const validateInitData = (raw: string, botToken: string, nowSeconds: number = Math.floor(Date.now() / 1000)): TgUser | null => {
  if (!raw || !botToken) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const checkString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || nowSeconds - authDate > MAX_AGE_SECONDS) return null;
  let json: unknown;
  try {
    json = JSON.parse(params.get('user') ?? '');
  } catch {
    return null;
  }
  const user = userSchema.safeParse(json);
  if (!user.success) return null;
  return { id: user.data.id, firstName: user.data.first_name ?? '', username: user.data.username ?? null };
};
