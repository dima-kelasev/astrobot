import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { env } from './env.js';
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
`);

const userRow = z.object({
  id: z.number(),
  first_name: z.string(),
  birth_date: z.string().nullable(),
  notify: z.number(),
  last_notified_day: z.string().nullable(),
  credits: z.number(),
  subscribed_until: z.string().nullable()
});

const spreadRow = z.object({
  id: z.string(),
  user_id: z.number(),
  day: z.string(),
  question: z.string(),
  deck: z.string(),
  picks: z.string(),
  paid: z.number()
});

const deckSchema = z.array(z.object({ i: z.number(), rev: z.boolean() }));
const picksSchema = z.array(z.number());
const countRow = z.object({ n: z.number() });
const textRow = z.object({ text: z.string() });

export type User = {
  id: number;
  firstName: string;
  birthDate: string | null;
  notify: boolean;
  credits: number;
  subscribedUntil: string | null;
};

export type Spread = {
  id: string;
  userId: number;
  day: string;
  question: string;
  deck: DrawnCard[];
  picks: number[];
};

export type ReadingKind = 'sky' | 'day' | 'spread';

const toUser = (row: unknown): User | null => {
  if (row === undefined) return null;
  const r = userRow.parse(row);
  return {
    id: r.id,
    firstName: r.first_name,
    birthDate: r.birth_date,
    notify: r.notify === 1,
    credits: r.credits,
    subscribedUntil: r.subscribed_until
  };
};

const toSpread = (row: unknown): Spread | null => {
  if (row === undefined) return null;
  const r = spreadRow.parse(row);
  return {
    id: r.id,
    userId: r.user_id,
    day: r.day,
    question: r.question,
    deck: deckSchema.parse(JSON.parse(r.deck)),
    picks: picksSchema.parse(JSON.parse(r.picks))
  };
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

export const setBirthDate = (id: number, birthDate: string) => {
  db.prepare('UPDATE users SET birth_date = ? WHERE id = ?').run(birthDate, id);
};

export const setNotify = (id: number, notify: boolean) => {
  db.prepare('UPDATE users SET notify = ? WHERE id = ?').run(notify ? 1 : 0, id);
};

export const takeCredit = (id: number) =>
  db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0').run(id).changes === 1;

export const countFreeSpreads = (userId: number, day: string) =>
  countRow.parse(db.prepare('SELECT COUNT(*) AS n FROM spreads WHERE user_id = ? AND day = ? AND paid = 0').get(userId, day)).n;

export const createSpread = (spread: Spread, paid: boolean) => {
  db.prepare('INSERT INTO spreads (id, user_id, day, question, deck, picks, paid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    spread.id,
    spread.userId,
    spread.day,
    spread.question,
    JSON.stringify(spread.deck),
    JSON.stringify(spread.picks),
    paid ? 1 : 0,
    now()
  );
};

export const getSpread = (id: string) => toSpread(db.prepare('SELECT * FROM spreads WHERE id = ?').get(id));

export const setPicks = (id: string, picks: number[]) => {
  db.prepare('UPDATE spreads SET picks = ? WHERE id = ?').run(JSON.stringify(picks), id);
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

export const isDayOpened = (userId: number, day: string) =>
  db.prepare('SELECT 1 AS n FROM day_cards WHERE user_id = ? AND day = ?').get(userId, day) !== undefined;

export const openDay = (userId: number, day: string) => {
  db.prepare('INSERT OR IGNORE INTO day_cards (user_id, day, opened_at) VALUES (?, ?, ?)').run(userId, day, now());
};

export const usersToNotify = (day: string) =>
  db
    .prepare('SELECT * FROM users WHERE notify = 1 AND birth_date IS NOT NULL AND (last_notified_day IS NULL OR last_notified_day <> ?)')
    .all(day)
    .map(toUser)
    .filter((user) => user !== null);

export const markNotified = (id: number, day: string) => {
  db.prepare('UPDATE users SET last_notified_day = ? WHERE id = ?').run(day, id);
};

export const closeDb = () => db.close();
