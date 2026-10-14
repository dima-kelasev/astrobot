import type { z } from 'zod';
import { telegram } from '../telegram';
import {
  ascSchema,
  citiesSchema,
  daySchema,
  deletedSchema,
  errorSchema,
  historyItemSchema,
  historySchema,
  meSchema,
  natalSchema,
  partnerAddSchema,
  partnerDetailSchema,
  partnersSchema,
  paymentCreatedSchema,
  paymentStatusSchema,
  pickSchema,
  plansSchema,
  promoResultSchema,
  questionStartSchema,
  skySchema,
  spreadStartSchema,
  streamEventSchema,
  themesSchema,
  whySchema,
  type ProductKey
} from './schemas';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export const codeOf = (error: unknown) => (error instanceof ApiError ? error.code : 'unknown');

type RequestOptions = { method?: string; body?: unknown; signal?: AbortSignal };

const authHeaders = () => {
  const headers: Record<string, string> = {};
  const initData = telegram.initData();
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  return headers;
};

const failure = async (res: Response) => {
  const json: unknown = await res.json().catch(() => null);
  const parsed = errorSchema.safeParse(json);
  return new ApiError(res.status, parsed.success ? parsed.data.code : 'server_error');
};

const request = async <T>(schema: z.ZodType<T>, path: string, options: RequestOptions = {}) => {
  const headers = authHeaders();
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  if (!res.ok) throw await failure(res);
  const json: unknown = await res.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError(res.status, 'bad_response');
  return parsed.data;
};

export type BirthInput = { date: string; time: string | null; placeId: number | null; placeName?: string; keepPlace?: true };

export type MePatch = { consent?: true; birth?: BirthInput; notifyMorning?: boolean; notifyEvening?: boolean; email?: string };

export type PayMethod = 'sbp' | 'card' | 'other';

export const api = {
  me: (signal?: AbortSignal) => request(meSchema, '/api/me', { signal }),
  updateMe: (patch: MePatch) => request(meSchema, '/api/me', { method: 'PUT', body: patch }),
  deleteMe: () => request(deletedSchema, '/api/me', { method: 'DELETE' }),
  cities: (query: string, signal?: AbortSignal) => request(citiesSchema, `/api/cities?q=${encodeURIComponent(query)}`, { signal }),
  sky: (signal?: AbortSignal) => request(skySchema, '/api/sky', { signal }),
  day: (signal?: AbortSignal) => request(daySchema, '/api/day', { signal }),
  openDay: () => request(daySchema, '/api/day/open', { method: 'POST' }),
  themes: (signal?: AbortSignal) => request(themesSchema, '/api/themes', { signal }),
  startSpread: (theme: string, question: string) => request(spreadStartSchema, '/api/spreads', { method: 'POST', body: { theme, question } }),
  pick: (id: string, index: number) => request(pickSchema, `/api/spreads/${id}/pick`, { method: 'POST', body: { index } }),
  natal: (signal?: AbortSignal) => request(natalSchema, '/api/natal', { signal }),
  asc: (signal?: AbortSignal) => request(ascSchema, '/api/asc', { signal }),
  why: (signal?: AbortSignal) => request(whySchema, '/api/why', { signal }),
  partners: (signal?: AbortSignal) => request(partnersSchema, '/api/partners', { signal }),
  addPartner: (body: BirthInput & { name: string }) => request(partnerAddSchema, '/api/partners', { method: 'POST', body }),
  partner: (id: string, signal?: AbortSignal) => request(partnerDetailSchema, `/api/partners/${id}`, { signal }),
  deletePartner: (id: string) => request(deletedSchema, `/api/partners/${id}`, { method: 'DELETE' }),
  ask: (text: string) => request(questionStartSchema, '/api/questions', { method: 'POST', body: { text } }),
  plans: (signal?: AbortSignal) => request(plansSchema, '/api/plans', { signal }),
  pay: (body: { product: ProductKey; method: PayMethod; partnerId?: string }) => request(paymentCreatedSchema, '/api/payments', { method: 'POST', body }),
  promo: (code: string) => request(promoResultSchema, '/api/promo', { method: 'POST', body: { code } }),
  paymentStatus: (id: string, signal?: AbortSignal) => request(paymentStatusSchema, `/api/payments/${encodeURIComponent(id)}`, { signal }),
  history: (signal?: AbortSignal) => request(historySchema, '/api/history', { signal }),
  historyItem: (kind: string, key: string, signal?: AbortSignal) =>
    request(historyItemSchema, `/api/history/item?kind=${encodeURIComponent(kind)}&key=${encodeURIComponent(key)}`, { signal })
};

export type ReadingDone = { source: 'ai' | 'template'; note: string | null; locked: boolean };

export const streamReading = async (path: string, onDelta: (delta: string) => void, signal: AbortSignal) => {
  let res: Response;
  try {
    res = await fetch(path, { headers: authHeaders(), signal });
  } catch {
    throw new ApiError(0, 'network');
  }
  if (!res.ok || !res.body) throw await failure(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: ReadingDone | null = null;
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      throw new ApiError(0, 'network');
    }
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      let json: unknown;
      try {
        json = JSON.parse(part.slice(6));
      } catch {
        continue;
      }
      const event = streamEventSchema.safeParse(json);
      if (!event.success) continue;
      if (event.data.delta) onDelta(event.data.delta);
      if (event.data.done) result = { source: event.data.source ?? 'ai', note: event.data.note ?? null, locked: event.data.locked ?? false };
    }
  }
  if (!result) throw new ApiError(0, 'interrupted');
  return result;
};
