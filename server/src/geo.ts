import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { z } from 'zod';

const dataFile = fileURLToPath(new URL('../data/cities.json.gz', import.meta.url));

const rowSchema = z.tuple([z.string(), z.string(), z.number(), z.number(), z.string(), z.number(), z.array(z.string())]);

type City = { id: number; name: string; label: string; lat: number; lon: number; tz: string; keys: string[]; names: string[]; own: number };

export type Place = { name: string; label: string; lat: number; lon: number; tz: string };

const normalize = (text: string) => text.toLowerCase().replaceAll('ё', 'е').replaceAll('-', ' ').replace(/\s+/g, ' ').trim();

const ALIASES: Record<string, string[]> = {
  'Санкт-Петербург': ['Питер', 'Ленинград', 'Петербург', 'СПб'],
  'Екатеринбург': ['Свердловск'],
  'Нижний Новгород': ['Горький'],
  'Самара': ['Куйбышев'],
  'Тверь': ['Калинин'],
  'Волгоград': ['Сталинград'],
  'Владикавказ': ['Орджоникидзе'],
  'Киров': ['Вятка'],
  'Ульяновск': ['Симбирск'],
  'Пермь': ['Молотов'],
  'Тольятти': ['Ставрополь-на-Волге'],
  'Алматы': ['Алма-Ата'],
  'Бишкек': ['Фрунзе'],
  'Астана': ['Целиноград', 'Акмола', 'Нур-Султан']
};

let cities: City[] | null = null;

const load = () => {
  if (cities) return cities;
  const raw: unknown = JSON.parse(gunzipSync(readFileSync(dataFile)).toString('utf8'));
  const rows = z.array(rowSchema).parse(raw);
  cities = rows.map(([name, label, lat, lon, tz, , list], id) => {
    const names = [...list, ...(ALIASES[name] ?? [])];
    return { id, name, label, lat, lon, tz, names, own: list.length, keys: names.map(normalize) };
  });
  return cities;
};

const matchIndex = (city: City, query: string) => {
  const exact = city.keys.indexOf(query);
  if (exact >= 0) return { index: exact, rank: query.length >= 4 ? 0 : 1 };
  if (city.keys[0].startsWith(query)) return { index: 0, rank: 1 };
  let best = -1;
  for (let i = 1; i < city.keys.length; i++) {
    if (city.keys[i].startsWith(query) && (best < 0 || city.keys[i].length < city.keys[best].length)) best = i;
  }
  if (best >= 0) return { index: best, rank: 1 };
  for (let i = 0; i < city.keys.length; i++) if (city.keys[i].includes(` ${query}`)) return { index: i, rank: 2 };
  return null;
};

export const searchCities = (text: string, limit = 8) => {
  const query = normalize(text);
  if (query.length < 2) return [];
  const found: { id: number; name: string; label: string; rank: number; order: number }[] = [];
  const all = load();
  for (let order = 0; order < all.length; order++) {
    const city = all[order];
    const hit = matchIndex(city, query);
    if (!hit) continue;
    found.push({ id: city.id, name: hit.index < city.own ? city.names[hit.index] : city.name, label: city.label, rank: hit.rank, order });
    if (found.filter((item) => item.rank === 0).length >= limit) break;
  }
  return found
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map((item) => ({ id: item.id, name: item.name, label: item.label }));
};

export const placeById = (id: number, name?: string): Place | null => {
  const city = load()[id];
  if (!city) return null;
  const shown = name && city.names.includes(name) ? name : city.name;
  return { name: shown, label: city.label, lat: city.lat, lon: city.lon, tz: city.tz };
};

const partsOf = (tz: string, date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
};

export const localToUtc = (date: string, time: string, tz: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const offset = partsOf(tz, new Date(guess)) - guess;
    guess = wall - offset;
  }
  return new Date(guess);
};

export const offsetLabel = (date: Date, tz: string) => {
  const minutes = Math.round((partsOf(tz, date) - date.getTime()) / 60000);
  const sign = minutes >= 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}`;
};
