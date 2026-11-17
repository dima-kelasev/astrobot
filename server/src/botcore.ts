import {
  adminStats,
  buyerOf,
  createPromo,
  getPromo,
  grantRefs,
  promoStats,
  recentSales,
  setPromoActive,
  subscriptionUntil,
  type PromoKind,
  type SalesSum
} from './db.js';
import { adminIds, env, maxBotName, tgBotName } from './env.js';
import { PRODUCTS, PRODUCT_KEYS, PROMO_CODE, normalizePromo } from './payments.js';
import { daysWord, promoText, usePromo } from './promo.js';
import { dayKey, noonOf } from './time.js';

export const WELCOME = [
  'Здравствуйте! Я Фрея 🌙 Читаю звёзды и карты Таро.',
  '',
  'Что у меня есть для вас:',
  '🔮 ответ на ваш вопрос раскладом Таро или по натальной карте',
  '🪐 натальная карта, асцендент и «Почему сейчас так?»',
  '💞 совместимость пары',
  '🃏 расклады по темам: любовь, работа, трудный выбор',
  '☀️ гороскоп и карта дня каждый день',
  '',
  '✨ Утром и вечером я присылаю короткое сообщение. Отключить можно в профиле.'
].join('\n');

export const DELETE_TEXT = 'Удалить все ваши данные: дату, время и место рождения, расклады, историю и данные партнёров? Это нельзя отменить.';
export const DELETE_DONE_TEXT = 'Ваши данные удалены. Если снова откроете бота, начнём с чистого листа.';
export const DELETE_CANCEL_TEXT = 'Удаление отменено.';

export const dateText = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: env.APP_TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const paidStatus = (userId: number) => {
  const until = subscriptionUntil(userId);
  if (until && until > new Date().toISOString()) return `Спасибо! Подписка активна до ${dateText(until)}. Всё уже открыто.`;
  if (grantRefs(userId, 'natal').length || grantRefs(userId, 'compat').length) return 'Спасибо! Покупка уже открыта.';
  return 'Платёж ещё обрабатывается. Обычно это занимает до минуты. Если через несколько минут ничего не изменится, напишите на почту из политики конфиденциальности.';
};

export type StartReply = { text: string; screen?: 'plan' };

export const startReply = (userId: number, payload: string, known: boolean): StartReply => {
  if (payload.startsWith('promo_')) {
    const outcome = usePromo(userId, payload);
    const result = promoText(outcome, dateText);
    return { text: known ? result : `${WELCOME}\n\n${result}`, screen: outcome.ok ? 'plan' : undefined };
  }
  if (payload === 'paid') return { text: paidStatus(userId) };
  return { text: WELCOME };
};

export const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const rub = (amount: number) => `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`;

const dateTimeText = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: env.APP_TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const productTitle = (key: string) => {
  const found = PRODUCT_KEYS.find((item) => item === key);
  return found ? PRODUCTS[found].title : key;
};

export const personLink = (userId: number, firstName: string, username: string | null) => {
  const name = escapeHtml(firstName || 'Без имени');
  return `<a href="tg://user?id=${userId}">${name}</a>${username ? ` @${escapeHtml(username)}` : ''}`;
};

const DAY_MS = 86400000;

export const statsText = () => {
  const day = dayKey(env.APP_TZ);
  const now = Date.now();
  const stats = adminStats({
    today: day,
    todayIso: new Date(noonOf(day, env.APP_TZ).getTime() - DAY_MS / 2).toISOString(),
    weekDay: dayKey(env.APP_TZ, new Date(now - 7 * DAY_MS)),
    weekIso: new Date(now - 7 * DAY_MS).toISOString(),
    monthIso: new Date(now - 30 * DAY_MS).toISOString()
  });
  const sales = (label: string, value: SalesSum) => `${label}: ${value.count} на ${rub(value.sum)}`;
  return [
    '<b>Пользователи</b>',
    `Всего: ${stats.users}`,
    `Новых сегодня: ${stats.newToday}, за 7 дней: ${stats.newWeek}, за 30 дней: ${stats.newMonth}`,
    `Заходили сегодня: ${stats.activeToday}, за 7 дней: ${stats.activeWeek}`,
    `Ввели данные рождения: ${stats.withBirth}`,
    `Получают рассылку: ${stats.notified}`,
    '',
    '<b>Деньги</b>',
    `Активных подписок: ${stats.subscribers}`,
    sales('Сегодня', stats.salesToday),
    sales('За 7 дней', stats.salesWeek),
    sales('За 30 дней', stats.salesMonth),
    sales('За всё время', stats.salesAll),
    '',
    'Последние покупки: /sales'
  ].join('\n');
};

export const salesText = () => {
  const sales = recentSales(15);
  if (!sales.length) return 'Покупок пока нет.';
  return [
    '<b>Последние покупки</b>',
    ...sales.map(
      (sale) =>
        `${dateTimeText(sale.paidAt)} · ${rub(sale.amount)} · ${escapeHtml(productTitle(sale.product))}\n${personLink(sale.userId, sale.firstName, sale.username)}`
    )
  ].join('\n\n');
};

export const promoLabel = (kind: PromoKind, value: number) => (kind === 'discount' ? `скидка ${value}%` : `${value} ${daysWord(value)} подписки`);

export const promoLinks = (code: string) => {
  const links: string[] = [];
  if (tgBotName) links.push(`https://t.me/${tgBotName}?start=promo_${code}`);
  if (maxBotName) links.push(`https://max.ru/${maxBotName}?start=promo_${code}`);
  if (!links.length) links.push(`/start promo_${code}`);
  return links;
};

export const promosText = () => {
  const stats = promoStats();
  const help = [
    '<b>Как создать</b>',
    '<code>/promo_new ANNA 20%</code> — скидка 20% на одну покупку',
    '<code>/promo_new ANNA 30d</code> — 30 дней подписки бесплатно',
    '<code>/promo_new ANNA 20% 100</code> — то же, но только 100 активаций',
    '<code>/promo_off ANNA</code> и <code>/promo_on ANNA</code> — выключить и включить'
  ].join('\n');
  if (!stats.length) return `Промокодов пока нет.\n\n${help}`;
  const blocks = stats.map((promo) =>
    [
      `<b>${escapeHtml(promo.code)}</b> — ${promoLabel(promo.kind, promo.value)}${promo.active ? '' : ' · выключен'}`,
      `Применили: ${promo.uses}${promo.maxUses !== null ? ` из ${promo.maxUses}` : ''}${promo.kind === 'discount' ? ` · купили со скидкой: ${promo.discounted}` : ''}`,
      `Пришли по коду и заплатили: ${promo.buyers} на ${rub(promo.revenue)}`,
      ...promoLinks(promo.code)
    ].join('\n')
  );
  return [...blocks, help].join('\n\n');
};

const NEW_PROMO = /^([A-Za-z0-9_-]+)\s+(\d+)\s*(%|d|д|дн|дней)?(?:\s+(\d+))?$/i;

export const createPromoText = (args: string) => {
  const match = NEW_PROMO.exec(args.trim());
  if (!match) return 'Не понял. Пример: <code>/promo_new ANNA 20%</code> или <code>/promo_new ANNA 30d 100</code>';
  const code = normalizePromo(match[1]);
  const value = Number(match[2]);
  const kind: PromoKind = match[3] && match[3] !== '%' ? 'days' : 'discount';
  const maxUses = match[4] ? Number(match[4]) : null;
  if (!PROMO_CODE.test(code)) return 'Код — от 3 до 32 латинских букв, цифр, _ или -.';
  if (kind === 'discount' && (value < 1 || value > 90)) return 'Скидка может быть от 1 до 90%.';
  if (kind === 'days' && (value < 1 || value > 365)) return 'Дней может быть от 1 до 365.';
  if (maxUses !== null && maxUses < 1) return 'Лимит активаций должен быть больше нуля.';
  if (!createPromo({ code, kind, value, maxUses })) return `Код ${escapeHtml(code)} уже есть. Посмотреть все: /promos`;
  return [
    `Готово: <b>${escapeHtml(code)}</b> — ${promoLabel(kind, value)}${maxUses !== null ? `, лимит ${maxUses}` : ''}.`,
    '',
    'Ссылки для блогера, по ним код применится сам:',
    ...promoLinks(code),
    '',
    'Ещё код можно ввести вручную в мини-аппе: в Профиле или на экране подписки.'
  ].join('\n');
};

export const togglePromoText = (raw: string, active: boolean) => {
  const code = normalizePromo(raw);
  if (!code) return `Укажите код: /promo_${active ? 'on' : 'off'} ANNA`;
  if (!setPromoActive(code, active)) return `Кода ${code} нет. Список: /promos`;
  return active ? `${code} снова работает.` : `${code} выключен. Уже выданные скидки и дни остаются у людей.`;
};

export const isAdmin = (id: number) => adminIds.includes(id);
