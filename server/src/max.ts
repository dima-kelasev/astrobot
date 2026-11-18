import {
  DELETE_CANCEL_TEXT,
  DELETE_DONE_TEXT,
  DELETE_TEXT,
  createPromoText,
  isAdmin,
  promosText,
  salesText,
  startReply,
  statsText,
  togglePromoText
} from './botcore.js';
import { deleteUserData, internalIdOf, resolveExternalUser } from './db.js';
import { env, privacyUrl } from './env.js';

const RETRY_MS = 15000;
const POLL_TIMEOUT = 30;

export type MaxButton =
  | { type: 'callback'; text: string; payload: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'open_app'; text: string; web_app?: string; payload?: string };

type MaxUpdate = {
  update_type?: string;
  chat_id?: number;
  payload?: string;
  user?: { user_id?: number; first_name?: string; last_name?: string; username?: string; name?: string };
  message?: {
    sender?: { user_id?: number; first_name?: string; username?: string };
    recipient?: { chat_id?: number; chat_type?: string };
    body?: { mid?: string; text?: string };
  };
  callback?: {
    callback_id?: string;
    payload?: string;
    sender?: { user_id?: number; first_name?: string; username?: string };
    message?: { recipient?: { chat_id?: number } };
  };
};

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MaxClient {
  private readonly base = env.MAX_API.replace(/\/+$/, '');

  async call<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, query: Record<string, string | number | undefined> = {}, body?: unknown): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, String(value));
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { Authorization: env.MAX_BOT_TOKEN, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(method === 'GET' ? (POLL_TIMEOUT + 15) * 1000 : 20000)
      });
    } catch (error) {
      throw new Error(`max: нет связи с API (${reasonOf(error)})`);
    }
    if (response.status === 429) {
      await sleep(2000);
      return this.call(method, path, query, body);
    }
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    if (!response.ok) {
      const code = json && typeof json === 'object' && 'code' in json ? String((json as { code: unknown }).code) : '';
      throw new Error(`max: API ответил ${response.status}${code ? ` (${code})` : ''}: ${text.slice(0, 300)}`);
    }
    return json as T;
  }

  me() {
    return this.call<{ user_id?: number; name?: string; username?: string }>('GET', '/me');
  }

  clearWebhook() {
    return this.call('DELETE', '/subscriptions').catch(() => {});
  }

  updates(marker: number | null) {
    return this.call<{ updates?: MaxUpdate[]; marker?: number | null }>('GET', '/updates', {
      marker: marker ?? undefined,
      timeout: POLL_TIMEOUT,
      limit: 100
    });
  }

  async send(userId: number, text: string, buttons: MaxButton[][] = []): Promise<string | null> {
    const attachments = buttons.length ? [{ type: 'inline_keyboard', payload: { buttons } }] : [];
    const response = await this.call<{ message?: { body?: { mid?: string }; mid?: string } }>('POST', '/messages', { user_id: userId }, { text, format: 'html', attachments });
    return response.message?.body?.mid ?? response.message?.mid ?? null;
  }

  async sendChat(chatId: number, text: string, buttons: MaxButton[][] = []): Promise<string | null> {
    const attachments = buttons.length ? [{ type: 'inline_keyboard', payload: { buttons } }] : [];
    const response = await this.call<{ message?: { body?: { mid?: string }; mid?: string } }>('POST', '/messages', { chat_id: chatId }, { text, format: 'html', attachments });
    return response.message?.body?.mid ?? response.message?.mid ?? null;
  }

  deleteMessage(messageId: string) {
    return this.call('DELETE', '/messages', { message_id: messageId });
  }

  answerCallback(callbackId: string, notification?: string) {
    return this.call('POST', '/answers', { callback_id: callbackId }, notification ? { notification } : {}).catch(() => {});
  }
}

const appUrl = (screen?: string) => {
  if (!screen) return env.WEBAPP_URL;
  const url = new URL(env.WEBAPP_URL);
  url.searchParams.set('s', screen);
  return url.toString();
};

export const maxAppButton = (text: string, screen?: string): MaxButton => {
  if (env.MAX_BOT_USERNAME) {
    const button: MaxButton = { type: 'open_app', text, web_app: env.MAX_BOT_USERNAME.replace(/^@/, '') };
    if (screen) button.payload = screen;
    return button;
  }
  return { type: 'link', text, url: appUrl(screen) };
};

const hasWebApp = env.WEBAPP_URL.startsWith('https://');

const openButtons = (screen?: string): MaxButton[][] => (hasWebApp ? [[maxAppButton('Открыть Фрею', screen)]] : []);

const COMMAND_TEXTS: Record<string, () => string> = {
  '/stats': statsText,
  '/sales': salesText,
  '/promos': promosText
};

const handleCommand = async (client: MaxClient, maxUserId: number, userId: number, text: string) => {
  const [raw, ...rest] = text.trim().split(/\s+/);
  const command = raw.toLowerCase().replace(/@[\w_]+$/, '');
  const args = rest.join(' ');
  if (command === '/start') return;
  if (command === '/help') {
    const lines = ['Нажмите кнопку ниже, чтобы открыть мини-апп. Уведомления отключаются в профиле.', 'Удалить свои данные: /delete'];
    if (privacyUrl) lines.push(`Политика обработки данных: ${privacyUrl}`);
    await client.send(maxUserId, lines.join('\n'), openButtons());
    return;
  }
  if (command === '/id') {
    await client.send(maxUserId, `Ваш ID: <code>${maxUserId}</code>`);
    return;
  }
  if (command === '/delete') {
    await client.send(maxUserId, DELETE_TEXT, [
      [
        { type: 'callback', text: 'Удалить данные', payload: 'delete_confirm' },
        { type: 'callback', text: 'Отмена', payload: 'delete_cancel' }
      ]
    ]);
    return;
  }
  if (command === '/promo_new' && isAdmin(userId)) {
    await client.send(maxUserId, createPromoText(args));
    return;
  }
  if ((command === '/promo_off' || command === '/promo_on') && isAdmin(userId)) {
    await client.send(maxUserId, togglePromoText(args, command === '/promo_on'));
    return;
  }
  const fixed = COMMAND_TEXTS[command];
  if (fixed && isAdmin(userId)) {
    await client.send(maxUserId, fixed());
    return;
  }
};

const handleUpdate = async (client: MaxClient, update: MaxUpdate) => {
  if (update.update_type === 'bot_started' && update.user?.user_id) {
    const maxUserId = update.user.user_id;
    const known = internalIdOf('max', String(maxUserId)) !== null;
    const user = resolveExternalUser('max', String(maxUserId), update.user.first_name ?? update.user.name ?? '', update.user.username ?? null);
    const reply = startReply(user.id, update.payload ?? '', known);
    await client.send(maxUserId, reply.text, openButtons(reply.screen));
    return;
  }
  if (update.update_type === 'message_created') {
    const maxUserId = update.message?.sender?.user_id;
    const text = update.message?.body?.text ?? '';
    if (!maxUserId || !text.startsWith('/')) return;
    const user = resolveExternalUser('max', String(maxUserId), update.message?.sender?.first_name ?? '', update.message?.sender?.username ?? null);
    await handleCommand(client, maxUserId, user.id, text);
    return;
  }
  if (update.update_type === 'message_callback') {
    const callback = update.callback;
    const maxUserId = callback?.sender?.user_id;
    if (!callback?.callback_id || !maxUserId) return;
    const user = resolveExternalUser('max', String(maxUserId), callback.sender?.first_name ?? '', callback.sender?.username ?? null);
    if (callback.payload === 'delete_confirm') {
      deleteUserData(user.id);
      await client.answerCallback(callback.callback_id);
      await client.send(maxUserId, DELETE_DONE_TEXT);
    } else if (callback.payload === 'delete_cancel') {
      await client.answerCallback(callback.callback_id);
      await client.send(maxUserId, DELETE_CANCEL_TEXT);
    }
    return;
  }
};

export const runMaxBot = (client: MaxClient) => {
  let stopped = false;

  const poll = async (marker: number | null): Promise<number | null> => {
    const batch = await client.updates(marker);
    const updates = batch.updates ?? [];
    for (const update of updates) {
      try {
        await handleUpdate(client, update);
      } catch (error) {
        console.error('max: ошибка обработки события:', reasonOf(error));
      }
    }
    return batch.marker ?? marker;
  };

  const loop = async () => {
    await client.clearWebhook();
    let marker: number | null = null;
    while (!stopped) {
      try {
        marker = await poll(marker);
      } catch (error) {
        if (stopped) return;
        console.error(`max: ошибка опроса: ${reasonOf(error)}. Повтор через ${RETRY_MS / 1000} с.`);
        await sleep(RETRY_MS);
      }
    }
  };

  void (async () => {
    try {
      const me = await client.me();
      console.log(`MAX-бот запущен: ${me.name ?? ''} @${me.username ?? '?'}.`);
    } catch (error) {
      console.error(`max: не удалось проверить токен (${reasonOf(error)}). Проверьте MAX_BOT_TOKEN и сертификат Минцифры.`);
      return;
    }
    void loop();
  })();

  return () => {
    stopped = true;
  };
};
