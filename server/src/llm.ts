import { z } from 'zod';
import { env, llmReady } from './env.js';

export class LlmError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const chunkSchema = z.object({
  choices: z.array(z.object({ delta: z.object({ content: z.string().nullish() }).optional() })).optional()
});

const extraSchema = z.record(z.string(), z.unknown());

const readExtra = (): Record<string, unknown> => {
  if (!env.LLM_EXTRA) return env.LLM_BASE_URL.includes('deepseek.com') ? { thinking: { type: 'disabled' } } : {};
  try {
    const parsed = extraSchema.safeParse(JSON.parse(env.LLM_EXTRA));
    if (parsed.success) return parsed.data;
  } catch {}
  console.error('LLM_EXTRA не разобран: нужен JSON-объект, например {"thinking":{"type":"disabled"}}.');
  return {};
};

const extraBody = readExtra();

const codeFor = (status: number) => {
  if (status === 401 || status === 403) return 'bad_key';
  if (status === 402) return 'no_funds';
  if (status === 400 || status === 404) return 'bad_model';
  if (status === 429) return 'rate_limited';
  return 'upstream_error';
};

export type CompletionOptions = { maxTokens?: number; temperature?: number; model?: string };

export const streamCompletion = async (prompt: string, onDelta: (delta: string) => void, signal: AbortSignal, options: CompletionOptions = {}) => {
  if (!llmReady) throw new LlmError('no_key');
  const base = env.LLM_BASE_URL.replace(/\/+$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({
        model: options.model || env.LLM_MODEL,
        stream: true,
        max_tokens: options.maxTokens ?? 900,
        temperature: options.temperature ?? 0.9,
        messages: [{ role: 'user', content: prompt }],
        ...extraBody
      }),
      signal
    });
  } catch (error) {
    if (!signal.aborted) console.error('Нет связи с сервисом нейросети:', error);
    throw new LlmError('upstream_error');
  }
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    console.error(`Сервис нейросети ответил ${response.status}:`, detail.slice(0, 500));
    throw new LlmError(codeFor(response.status));
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  try {
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let json: unknown;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const parsed = chunkSchema.safeParse(json);
        const delta = parsed.success ? (parsed.data.choices?.[0]?.delta?.content ?? '') : '';
        if (delta) {
          text += delta;
          onDelta(delta);
        }
      }
    }
  } catch (error) {
    if (!signal.aborted) console.error('Ответ нейросети оборвался:', error);
    throw new LlmError(text ? 'interrupted' : 'upstream_error');
  }
  if (!text.trim()) {
    console.error('Нейросеть вернула пустой ответ. Если у модели есть режим размышлений, отключите его через LLM_EXTRA.');
    throw new LlmError('empty_answer');
  }
  return text;
};

export const completeText = async (prompt: string, options: CompletionOptions = {}, timeoutMs = 45000) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return (await streamCompletion(prompt, () => {}, ctl.signal, options)).trim();
  } finally {
    clearTimeout(timer);
  }
};
