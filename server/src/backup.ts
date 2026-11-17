import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { backupTo } from './db.js';
import { env } from './env.js';
import { dayKey, hourIn } from './time.js';

const KEEP = 14;

const backupDir = () => join(dirname(env.DB_PATH), 'backups');

const stamp = (now: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: env.APP_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}_${get('hour')}-${get('minute')}`;
};

export type BackupFile = { path: string; filename: string; sizeKb: number };

const rotate = async (dir: string) => {
  const files = (await readdir(dir))
    .filter((name) => /^astrobot-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.db\.gz$/.test(name))
    .sort();
  for (const name of files.slice(0, Math.max(0, files.length - KEEP))) {
    await unlink(join(dir, name)).catch(() => {});
  }
};

export const makeBackup = async (now: Date = new Date()): Promise<BackupFile> => {
  const dir = backupDir();
  await mkdir(dir, { recursive: true });
  const filename = `astrobot-${stamp(now)}.db.gz`;
  const path = join(dir, filename);
  const raw = join(dir, filename.replace(/\.gz$/, ''));
  backupTo(raw);
  await pipeline(createReadStream(raw), createGzip({ level: 9 }), createWriteStream(path));
  await unlink(raw);
  const { size } = await stat(path);
  await rotate(dir);
  return { path, filename, sizeKb: Math.max(1, Math.round(size / 1024)) };
};

export type BackupSender = (file: BackupFile) => Promise<void>;

export const startBackup = (send: BackupSender) => {
  let running = false;
  let lastDay = '';
  const tick = async () => {
    const now = new Date();
    const day = dayKey(env.APP_TZ, now);
    if (running || day === lastDay || hourIn(env.APP_TZ, now) !== env.BACKUP_HOUR) return;
    running = true;
    try {
      const file = await makeBackup(now);
      await send(file);
      lastDay = day;
      console.log(`Резервная копия отправлена админам: ${file.filename} (${file.sizeKb} КБ).`);
    } catch (error) {
      console.error('Ошибка резервного копирования:', error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 60 * 1000);
  void tick();
  return () => clearInterval(timer);
};
