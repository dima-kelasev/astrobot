import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { env } from './env.js';
import type { Place } from './geo.js';
import type { DrawnCard } from './tarot.js';

mkdirSync(dirname(env.DB_PATH), { recursive: true });
const db = new DatabaseSync(env.DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL DEFAULT '',
    birth_date TEXT,
    notify INTEGER NOT NULL DEFAULT 0,
    last_notified_day TEXT,
    credits INTEGER NOT NULL DEFAULT 0,
    subscribed_until TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS spreads (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    question TEXT NOT NULL,
    deck TEXT NOT NULL,
    picks TEXT NOT NULL DEFAULT '[]',
    paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS spreads_user_day ON spreads (user_id, day);
  CREATE TABLE IF NOT EXISTS readings (
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    key TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, kind, key)
  );
  CREATE TABLE IF NOT EXISTS day_cards (
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    PRIMARY KEY (user_id, day)
  );
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    text TEXT NOT NULL,
    tool TEXT NOT NULL,
    cards TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS questions_user ON questions (user_id, created_at);
  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    birth_time TEXT,
    place_name TEXT,
    place_label TEXT,
    place_lat REAL,
    place_lon REAL,
    place_tz TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS partners_user ON partners (user_id, created_at);
  CREATE TABLE IF NOT EXISTS usage (
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    feature TEXT NOT NULL,
    n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day, feature)
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product TEXT NOT NULL,
    ref TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    paid_at TEXT
  );
  CREATE INDEX IF NOT EXISTS payments_user ON payments (user_id, created_at);
  CREATE TABLE IF NOT EXISTS grants (
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    ref TEXT NOT NULL DEFAULT '',
    until TEXT,
    payment_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS grants_user ON grants (user_id, kind);
  CREATE TABLE IF NOT EXISTS broadcasts (
    day TEXT NOT NULL,
    slot TEXT NOT NULL,
    text TEXT NOT NULL,
    PRIMARY KEY (day, slot)
  );
`);

const columnRow = z.object({ name: z.string() });

const addColumns = (table: string, columns: [string, string][]) => {
  const existing = new Set(
    db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => columnRow.parse(row).name)
  );
  for (const [name, type] of columns) if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
};

addColumns('users', [
  ['birth_time', 'TEXT'],
  ['place_name', 'TEXT'],
  ['place_label', 'TEXT'],
  ['place_lat', 'REAL'],
  ['place_lon', 'REAL'],
  ['place_tz', 'TEXT'],
  ['consent_at', 'TEXT'],
  ['notify_morning', 'INTEGER NOT NULL DEFAULT 1'],
  ['notify_evening', 'INTEGER NOT NULL DEFAULT 1'],
  ['last_morning_day', 'TEXT'],
  ['last_evening_day', 'TEXT'],
  ['email', 'TEXT']
]);
addColumns('spreads', [
  ['theme', "TEXT NOT NULL DEFAULT 'general'"],
  ['size', 'INTEGER NOT NULL DEFAULT 9']
]);

const userRow = z.object({
  id: z.number(),
  first_name: z.string(),
  birth_date: z.string().nullable(),
  birth_time: z.string().nullable(),
  place_name: z.string().nullable(),
  place_label: z.string().nullable(),
  place_lat: z.number().nullable(),
  place_lon: z.number().nullable(),
  place_tz: z.string().nullable(),
  consent_at: z.string().nullable(),
  notify_morning: z.number(),
  notify_evening: z.number(),
  credits: z.number(),
  subscribed_until: z.string().nullable(),
  email: z.string().nullable(),
  created_at: z.string()
});

const spreadRow = z.object({
  id: z.string(),
  user_id: z.number(),
  day: z.string(),
  question: z.string(),
  deck: z.string(),
  picks: z.string(),
  theme: z.string(),
  size: z.number(),
  created_at: z.string()
});

const questionRow = z.object({
  id: z.string(),
  user_id: z.number(),
  day: z.string(),
  text: z.string(),
  tool: z.string(),
  cards: z.string(),
  created_at: z.string()
});

const partnerRow = z.object({
  id: z.string(),
  user_id: z.number(),
  name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  place_name: z.string().nullable(),
  place_label: z.string().nullable(),
  place_lat: z.number().nullable(),
  place_lon: z.number().nullable(),
  place_tz: z.string().nullable(),
  created_at: z.string()
});

const readingRow = z.object({ kind: z.string(), key: z.string(), text: z.string(), created_at: z.string() });
const deckSchema = z.array(z.object({ i: z.number(), rev: z.boolean() }));
const picksSchema = z.array(z.number());
const countRow = z.object({ n: z.number() });
const textRow = z.object({ text: z.string() });

export type User = {
  id: number;
  firstName: string;
  birthDate: string | null;
  birthTime: string | null;
  place: Place | null;
  consentAt: string | null;
  notifyMorning: boolean;
  notifyEvening: boolean;
  credits: number;
  subscribedUntil: string | null;
  email: string | null;
};

export type Spread = {
  id: string;
  userId: number;
  day: string;
  theme: string;
  question: string;
  size: number;
  deck: DrawnCard[];
  picks: number[];
  createdAt: string;
};

export type Question = { id: string; userId: number; day: string; text: string; tool: string; cards: DrawnCard[]; createdAt: string };

export type Partner = {
  id: string;
  userId: number;
  name: string;
  birthDate: string;
  birthTime: string | null;
  place: Place | null;
  createdAt: string;
};

export type ReadingKind = 'sky' | 'day' | 'spread' | 'natal' | 'natalPart' | 'asc' | 'why' | 'compat' | 'question';

const placeOf = (r: {
  place_name: string | null;
  place_label: string | null;
  place_lat: number | null;
  place_lon: number | null;
  place_tz: string | null;
}): Place | null =>
  r.place_name !== null && r.place_lat !== null && r.place_lon !== null && r.place_tz !== null
    ? { name: r.place_name, label: r.place_label ?? '', lat: r.place_lat, lon: r.place_lon, tz: r.place_tz }
    : null;

const toUser = (row: unknown): User | null => {
  if (row === undefined) return null;
  const r = userRow.parse(row);
  return {
    id: r.id,
    firstName: r.first_name,
    birthDate: r.birth_date,
    birthTime: r.birth_time,
    place: placeOf(r),
    consentAt: r.consent_at,
    notifyMorning: r.notify_morning === 1,
    notifyEvening: r.notify_evening === 1,
    credits: r.credits,
    subscribedUntil: r.subscribed_until,
    email: r.email
  };
};

const toSpread = (row: unknown): Spread | null => {
  if (row === undefined) return null;
  const r = spreadRow.parse(row);
  return {
    id: r.id,
    userId: r.user_id,
    day: r.day,
    theme: r.theme,
    question: r.question,
    size: r.size,
    deck: deckSchema.parse(JSON.parse(r.deck)),
    picks: picksSchema.parse(JSON.parse(r.picks)),
    createdAt: r.created_at
  };
};

const toQuestion = (row: unknown): Question | null => {
  if (row === undefined) return null;
  const r = questionRow.parse(row);
  return { id: r.id, userId: r.user_id, day: r.day, text: r.text, tool: r.tool, cards: deckSchema.parse(JSON.parse(r.cards)), createdAt: r.created_at };
};

const toPartner = (row: unknown): Partner | null => {
  if (row === undefined) return null;
  const r = partnerRow.parse(row);
  return { id: r.id, userId: r.user_id, name: r.name, birthDate: r.birth_date, birthTime: r.birth_time, place: placeOf(r), createdAt: r.created_at };
};

const now = () => new Date().toISOString();

export const getUser = (id: number) => toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));

export const upsertUser = (id: number, firstName: string): User => {
  db.prepare(
    `INSERT INTO users (id, first_name, created_at) VALUES (?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET first_name = excluded.first_name`
  ).run(id, firstName, now());
  const user = getUser(id);
  if (!user) throw new Error('user_not_saved');
  return user;
};

export const setConsent = (id: number) => {
  db.prepare('UPDATE users SET consent_at = COALESCE(consent_at, ?) WHERE id = ?').run(now(), id);
};

export const setBirth = (id: number, birthDate: string, birthTime: string | null, place: Place | null) => {
  db.prepare('UPDATE users SET birth_date = ?, birth_time = ?, place_name = ?, place_label = ?, place_lat = ?, place_lon = ?, place_tz = ? WHERE id = ?').run(
    birthDate,
    birthTime,
    place?.name ?? null,
    place?.label ?? null,
    place?.lat ?? null,
    place?.lon ?? null,
    place?.tz ?? null,
    id
  );
};

export const setNotifications = (id: number, patch: { morning?: boolean; evening?: boolean }) => {
  if (patch.morning !== undefined) db.prepare('UPDATE users SET notify_morning = ? WHERE id = ?').run(patch.morning ? 1 : 0, id);
  if (patch.evening !== undefined) db.prepare('UPDATE users SET notify_evening = ? WHERE id = ?').run(patch.evening ? 1 : 0, id);
};

export const deleteUserData = (id: number) => {
  for (const table of ['readings', 'spreads', 'questions', 'partners', 'usage', 'day_cards']) {
    db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(id);
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
};

export const setEmail = (id: number, email: string) => {
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, id);
};

export const totalUsage = (userId: number, feature: string) => {
  const row = db.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM usage WHERE user_id = ? AND feature = ?').get(userId, feature);
  return row === undefined ? 0 : countRow.parse(row).n;
};

export type PaymentStatus = 'pending' | 'succeeded' | 'canceled';

const paymentRow = z.object({
  id: z.string(),
  user_id: z.number(),
  product: z.string(),
  ref: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'succeeded', 'canceled']),
  created_at: z.string(),
  paid_at: z.string().nullable()
});

export type Payment = {
  id: string;
  userId: number;
  product: string;
  ref: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
};

const toPayment = (row: unknown): Payment | null => {
  if (row === undefined) return null;
  const r = paymentRow.parse(row);
  return { id: r.id, userId: r.user_id, product: r.product, ref: r.ref, amount: r.amount, status: r.status, createdAt: r.created_at, paidAt: r.paid_at };
};

export const createPayment = (payment: { id: string; userId: number; product: string; ref: string; amount: number }) => {
  db.prepare('INSERT INTO payments (id, user_id, product, ref, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    payment.id,
    payment.userId,
    payment.product,
    payment.ref,
    payment.amount,
    'pending',
    now()
  );
};

export const getPayment = (id: string) => toPayment(db.prepare('SELECT * FROM payments WHERE id = ?').get(id));

export const markPaymentCanceled = (id: string) => {
  db.prepare("UPDATE payments SET status = 'canceled' WHERE id = ? AND status = 'pending'").run(id);
};

const untilRow = z.object({ until: z.string().nullable() });
const refRow = z.object({ ref: z.string() });

export const subscriptionUntil = (userId: number) => {
  const row = db.prepare("SELECT MAX(until) AS until FROM grants WHERE user_id = ? AND kind = 'sub'").get(userId);
  return row === undefined ? null : untilRow.parse(row).until;
};

export const grantRefs = (userId: number, kind: string) =>
  db
    .prepare('SELECT ref FROM grants WHERE user_id = ? AND kind = ?')
    .all(userId, kind)
    .map((row) => refRow.parse(row).ref);

export const completePayment = (id: string, grant: { kind: string; ref: string; days: number | null }) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    const changed = db.prepare("UPDATE payments SET status = 'succeeded', paid_at = ? WHERE id = ? AND status != 'succeeded'").run(now(), id);
    if (Number(changed.changes) === 0) {
      db.exec('COMMIT');
      return false;
    }
    const payment = getPayment(id);
    if (!payment) throw new Error('payment_missing');
    let until: string | null = null;
    if (grant.days !== null) {
      const current = subscriptionUntil(payment.userId);
      const start = current && current > now() ? new Date(current) : new Date();
      until = new Date(start.getTime() + grant.days * 86400000).toISOString();
    }
    db.prepare('INSERT INTO grants (user_id, kind, ref, until, payment_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      payment.userId,
      grant.kind,
      grant.ref,
      until,
      id,
      now()
    );
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

export const usageOf = (userId: number, day: string, feature: string) => {
  const row = db.prepare('SELECT n FROM usage WHERE user_id = ? AND day = ? AND feature = ?').get(userId, day, feature);
  return row === undefined ? 0 : countRow.parse(row).n;
};

export const addUsage = (userId: number, day: string, feature: string) => {
  db.prepare(
    `INSERT INTO usage (user_id, day, feature, n) VALUES (?, ?, ?, 1)
     ON CONFLICT (user_id, day, feature) DO UPDATE SET n = n + 1`
  ).run(userId, day, feature);
};

export const createSpread = (spread: Spread) => {
  db.prepare('INSERT INTO spreads (id, user_id, day, question, deck, picks, paid, theme, size, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)').run(
    spread.id,
    spread.userId,
    spread.day,
    spread.question,
    JSON.stringify(spread.deck),
    JSON.stringify(spread.picks),
    spread.theme,
    spread.size,
    spread.createdAt
  );
};

export const getSpread = (id: string) => toSpread(db.prepare('SELECT * FROM spreads WHERE id = ?').get(id));

export const setPicks = (id: string, picks: number[]) => {
  db.prepare('UPDATE spreads SET picks = ? WHERE id = ?').run(JSON.stringify(picks), id);
};

export const createQuestion = (question: Question) => {
  db.prepare('INSERT INTO questions (id, user_id, day, text, tool, cards, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    question.id,
    question.userId,
    question.day,
    question.text,
    question.tool,
    JSON.stringify(question.cards),
    question.createdAt
  );
};

export const getQuestion = (id: string) => toQuestion(db.prepare('SELECT * FROM questions WHERE id = ?').get(id));

export const createPartner = (partner: Partner) => {
  db.prepare(
    `INSERT INTO partners (id, user_id, name, birth_date, birth_time, place_name, place_label, place_lat, place_lon, place_tz, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    partner.id,
    partner.userId,
    partner.name,
    partner.birthDate,
    partner.birthTime,
    partner.place?.name ?? null,
    partner.place?.label ?? null,
    partner.place?.lat ?? null,
    partner.place?.lon ?? null,
    partner.place?.tz ?? null,
    partner.createdAt
  );
};

export const getPartner = (id: string) => toPartner(db.prepare('SELECT * FROM partners WHERE id = ?').get(id));

export const listPartners = (userId: number) =>
  db
    .prepare('SELECT * FROM partners WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId)
    .map(toPartner)
    .filter((partner) => partner !== null);

export const deletePartner = (userId: number, id: string) => {
  db.prepare('DELETE FROM partners WHERE id = ? AND user_id = ?').run(id, userId);
  db.prepare("DELETE FROM readings WHERE user_id = ? AND kind = 'compat' AND key LIKE ?").run(userId, `${id}:%`);
};

export const getReading = (userId: number, kind: ReadingKind, key: string) => {
  const row = db.prepare('SELECT text FROM readings WHERE user_id = ? AND kind = ? AND key = ?').get(userId, kind, key);
  return row === undefined ? null : textRow.parse(row).text;
};

export const saveReading = (userId: number, kind: ReadingKind, key: string, text: string) => {
  db.prepare(
    `INSERT INTO readings (user_id, kind, key, text, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, kind, key) DO UPDATE SET text = excluded.text, created_at = excluded.created_at`
  ).run(userId, kind, key, text, now());
};

export const listReadings = (userId: number, limit: number) =>
  db
    .prepare("SELECT kind, key, text, created_at FROM readings WHERE user_id = ? AND kind != 'natalPart' ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit)
    .map((row) => readingRow.parse(row));

export const isDayOpened = (userId: number, day: string) =>
  db.prepare('SELECT 1 AS n FROM day_cards WHERE user_id = ? AND day = ?').get(userId, day) !== undefined;

export const openDay = (userId: number, day: string) => {
  db.prepare('INSERT OR IGNORE INTO day_cards (user_id, day, opened_at) VALUES (?, ?, ?)').run(userId, day, now());
};

export type Slot = 'morning' | 'evening';

export const usersToNotify = (slot: Slot, day: string) => {
  const flag = slot === 'morning' ? 'notify_morning' : 'notify_evening';
  const last = slot === 'morning' ? 'last_morning_day' : 'last_evening_day';
  return db
    .prepare(`SELECT * FROM users WHERE ${flag} = 1 AND (${last} IS NULL OR ${last} <> ?)`)
    .all(day)
    .map(toUser)
    .filter((user) => user !== null);
};

export const markNotified = (id: number, slot: Slot, day: string) => {
  const last = slot === 'morning' ? 'last_morning_day' : 'last_evening_day';
  db.prepare(`UPDATE users SET ${last} = ? WHERE id = ?`).run(day, id);
};

export const disableNotifications = (id: number) => {
  db.prepare('UPDATE users SET notify_morning = 0, notify_evening = 0 WHERE id = ?').run(id);
};

export const getBroadcast = (day: string, slot: Slot) => {
  const row = db.prepare('SELECT text FROM broadcasts WHERE day = ? AND slot = ?').get(day, slot);
  return row === undefined ? null : textRow.parse(row).text;
};

export const saveBroadcast = (day: string, slot: Slot, text: string) => {
  db.prepare('INSERT OR REPLACE INTO broadcasts (day, slot, text) VALUES (?, ?, ?)').run(day, slot, text);
};

export const recentBroadcasts = (slot: Slot, limit: number) =>
  db
    .prepare('SELECT text FROM broadcasts WHERE slot = ? ORDER BY day DESC LIMIT ?')
    .all(slot, limit)
    .map((row) => textRow.parse(row).text);

export const closeDb = () => db.close();
