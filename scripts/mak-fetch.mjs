import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../mak-candidates/', import.meta.url));
const API = 'https://api.artic.edu/api/v1/artworks/search';
const HEADERS = { 'AIC-User-Agent': 'astrobot-mak (starrysorcery@yandex.ru)' };
const PER_QUERY = 5;
const TOTAL = 220;

const QUERIES = [
  'door', 'open door', 'window', 'road', 'path', 'staircase', 'bridge', 'gate', 'well',
  'boat', 'sailboat', 'lighthouse', 'harbor', 'sea', 'waves', 'river', 'waterfall', 'lake', 'shore',
  'moonlight', 'night', 'sunrise', 'sunset', 'clouds', 'fog', 'rain', 'snow', 'storm',
  'forest', 'tree', 'garden', 'flowers', 'mountain', 'cliff', 'valley', 'field', 'meadow',
  'bird', 'birds flying', 'horse', 'deer', 'cat', 'dog',
  'house', 'cottage', 'village', 'lantern', 'candle', 'mirror', 'interior', 'empty room',
  'woman reading', 'child', 'girl', 'couple walking', 'traveler', 'fisherman', 'figure on beach',
  'cherry blossom', 'Hiroshige', 'Hokusai', 'Japanese landscape', 'crossroads', 'island', 'winter landscape'
];

const BANNED =
  /\b(nude|nudes|naked|nudity|bather|bathers|crucif\w*|christ|jesus|saint|st\.|martyr\w*|madonna|virgin|annunciation|piet[aà]|holy|god|gods|goddess|death|dead|dying|skull|skeleton|corpse|funeral|mourning|grave|tomb|battle|war|soldier\w*|army|blood|execution|murder|hell|devil|demon\w*|massacre|slave\w*|hunt\w*|kill\w*|wounded|gun|sword|portrait|self-portrait|erotic|lovers|venus|bacchus|satyr)\b/i;

const GOOD_KIND = /painting|print|drawing|watercolor/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const search = async (q) => {
  const params = new URLSearchParams({
    q,
    limit: '40',
    fields: 'id,title,artist_title,date_display,image_id,is_public_domain,classification_title,thumbnail,subject_titles'
  });
  const response = await fetch(`${API}?${params}`, { headers: HEADERS });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()).data ?? [];
};

const fits = (item) => {
  if (!item.is_public_domain || !item.image_id) return false;
  if (!GOOD_KIND.test(item.classification_title ?? '')) return false;
  const text = [item.title, item.thumbnail?.alt_text, ...(item.subject_titles ?? [])].join(' ');
  return !BANNED.test(text);
};

const download = async (item, file) => {
  const url = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`image ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
};

await mkdir(OUT, { recursive: true });
const picked = new Map();

for (const q of QUERIES) {
  if (picked.size >= TOTAL) break;
  try {
    const items = (await search(q)).filter(fits).filter((item) => !picked.has(item.id)).slice(0, PER_QUERY);
    for (const item of items) {
      const file = `${OUT}${item.id}.jpg`;
      try {
        if (!existsSync(file)) await download(item, file);
        picked.set(item.id, {
          id: item.id,
          title: item.title,
          artist: item.artist_title ?? '',
          year: item.date_display ?? '',
          alt: item.thumbnail?.alt_text ?? '',
          kind: item.classification_title ?? '',
          query: q,
          file: `${item.id}.jpg`
        });
        await sleep(400);
      } catch (error) {
        console.log(`  пропуск ${item.id}: ${error.message}`);
      }
    }
    console.log(`${q}: +${items.length}, всего ${picked.size}`);
  } catch (error) {
    console.log(`${q}: ошибка ${error.message}`);
  }
  await sleep(1100);
}

await writeFile(`${OUT}candidates.json`, JSON.stringify([...picked.values()], null, 2));
console.log(`\nГотово: ${picked.size} картин в папке mak-candidates`);
