import { AstroTime, Body, Ecliptic, EclipticGeoMoon, GeoVector, SiderealTime, SunPosition, e_tilt } from 'astronomy-engine';
import { SIGNS } from './astro.js';

const rad = Math.PI / 180;
const deg = 180 / Math.PI;
const norm = (x: number) => ((x % 360) + 360) % 360;
const delta = (a: number, b: number) => norm(a - b + 180) - 180;

export const PLANETS = [
  { key: 'sun', body: Body.Sun, name: 'Солнце', glyph: '☉', meaning: 'характер, воля, то, ради чего вы живёте' },
  { key: 'moon', body: Body.Moon, name: 'Луна', glyph: '☽', meaning: 'чувства, привычки, что даёт ощущение безопасности' },
  { key: 'mercury', body: Body.Mercury, name: 'Меркурий', glyph: '☿', meaning: 'мышление, речь, как вы договариваетесь' },
  { key: 'venus', body: Body.Venus, name: 'Венера', glyph: '♀', meaning: 'любовь, вкус, что вам приятно и ценно' },
  { key: 'mars', body: Body.Mars, name: 'Марс', glyph: '♂', meaning: 'энергия, напор, как вы добиваетесь своего' },
  { key: 'jupiter', body: Body.Jupiter, name: 'Юпитер', glyph: '♃', meaning: 'рост, удача, где жизнь расширяется' },
  { key: 'saturn', body: Body.Saturn, name: 'Сатурн', glyph: '♄', meaning: 'ответственность, ограничения, взросление' },
  { key: 'uranus', body: Body.Uranus, name: 'Уран', glyph: '♅', meaning: 'перемены, свобода, неожиданности' },
  { key: 'neptune', body: Body.Neptune, name: 'Нептун', glyph: '♆', meaning: 'мечты, вдохновение, иллюзии' },
  { key: 'pluto', body: Body.Pluto, name: 'Плутон', glyph: '♇', meaning: 'глубокие перемены, сила, кризисы роста' }
] as const;

export type PlanetKey = (typeof PLANETS)[number]['key'] | 'node';
export type PointKey = PlanetKey | 'asc' | 'mc';

const NODE = { key: 'node', name: 'Лунный узел', glyph: '☊', meaning: 'направление развития, чему учит жизнь' } as const;

export const POINT_NAMES: Record<PointKey, string> = {
  sun: 'Солнце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
  node: 'Лунный узел',
  asc: 'Асцендент',
  mc: 'Середина неба'
};

export const HOUSES = [
  'личность, внешность, как вы начинаете дела',
  'деньги, вещи, самооценка',
  'общение, учёба, поездки рядом',
  'дом, семья, корни',
  'любовь, творчество, дети, радости',
  'работа, режим, повседневные дела',
  'партнёрство, брак, договоры',
  'общие деньги, близость, кризисы',
  'путешествия, образование, взгляды',
  'карьера, статус, цели',
  'друзья, единомышленники, планы',
  'уединение, отдых, внутренний мир'
] as const;

export const ASPECTS = [
  { angle: 0, name: 'соединение', nature: 'сливает темы двух планет' },
  { angle: 60, name: 'секстиль', nature: 'даёт возможность, если ею воспользоваться' },
  { angle: 90, name: 'квадрат', nature: 'создаёт напряжение, которое толкает к действию' },
  { angle: 120, name: 'трин', nature: 'даёт лёгкость и естественный талант' },
  { angle: 150, name: 'квиконс', nature: 'заставляет постоянно подстраиваться: темы двух планет плохо стыкуются' },
  { angle: 180, name: 'оппозиция', nature: 'ставит перед выбором между двумя сторонами' }
] as const;

const MINOR_ORB = 3;

export type ChartPoint = {
  key: PointKey;
  name: string;
  glyph: string;
  lon: number;
  sign: number;
  degree: number;
  minute: number;
  retro: boolean;
  house: number | null;
};

export type Chart = {
  hasTime: boolean;
  houseSystem: 'placidus' | 'porphyry' | null;
  points: ChartPoint[];
  asc: number | null;
  mc: number | null;
  cusps: number[] | null;
  extras: ExtraPoint[];
};

export type ExtraKey = 'lilith' | 'fortune';

export type ExtraPoint = {
  key: ExtraKey;
  name: string;
  glyph: string;
  meaning: string;
  lon: number;
  sign: number;
  degree: number;
  minute: number;
  house: number | null;
};

export const EXTRAS: Record<ExtraKey, { name: string; glyph: string; meaning: string }> = {
  lilith: { name: 'Лилит (Чёрная Луна)', glyph: '⚸', meaning: 'искушения, теневые желания, где трудно держать меру' },
  fortune: { name: 'Парс Фортуны', glyph: '⊗', meaning: 'где легче всего приходят радость и удача' }
};

export type Aspect = { a: PointKey; b: PointKey; aspect: (typeof ASPECTS)[number]['name']; angle: number; orb: number };

const meanNode = (time: AstroTime) => {
  const t = time.tt / 36525;
  return norm(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000);
};

const meanLilith = (time: AstroTime) => {
  const t = time.tt / 36525;
  return norm(83.3532465 + 4069.0137287 * t - 0.01032 * t * t - (t * t * t) / 80053 + 180);
};

const lonAt = (key: PlanetKey, time: AstroTime) => {
  if (key === 'node') return meanNode(time);
  if (key === 'sun') return norm(SunPosition(time).elon);
  if (key === 'moon') return norm(EclipticGeoMoon(time).lon);
  const planet = PLANETS.find((item) => item.key === key);
  if (!planet) throw new Error(`unknown_planet_${key}`);
  return norm(Ecliptic(GeoVector(planet.body, time, true)).elon);
};

const isRetro = (key: PlanetKey, time: AstroTime) => {
  if (key === 'sun' || key === 'moon') return false;
  if (key === 'node') return true;
  return delta(lonAt(key, time.AddDays(0.5)), lonAt(key, time.AddDays(-0.5))) < 0;
};

const ramcOf = (time: AstroTime, longitude: number) => norm(SiderealTime(time) * 15 + longitude);

const oblOf = (time: AstroTime) => e_tilt(time).tobl;

export const mcOf = (ramc: number, obl: number) => norm(Math.atan2(Math.sin(ramc * rad), Math.cos(ramc * rad) * Math.cos(obl * rad)) * deg);

export const ascOf = (ramc: number, obl: number, lat: number) =>
  norm(Math.atan2(Math.cos(ramc * rad), -(Math.sin(ramc * rad) * Math.cos(obl * rad) + Math.tan(lat * rad) * Math.sin(obl * rad))) * deg);

const lonFromRa = (ra: number, obl: number) => norm(Math.atan2(Math.sin(ra * rad), Math.cos(ra * rad) * Math.cos(obl * rad)) * deg);

const placidusCusp = (ramc: number, obl: number, lat: number, fraction: number, above: boolean) => {
  let lon = lonFromRa(norm(ramc + (above ? 90 * fraction : 180 - 90 * fraction)), obl);
  for (let i = 0; i < 60; i++) {
    const dec = Math.asin(Math.sin(obl * rad) * Math.sin(lon * rad));
    const x = Math.tan(lat * rad) * Math.tan(dec);
    if (Math.abs(x) >= 1) return null;
    const ad = Math.asin(x) * deg;
    const ra = above ? ramc + fraction * (90 + ad) : ramc + 180 - fraction * (90 - ad);
    const next = lonFromRa(norm(ra), obl);
    if (Math.abs(delta(next, lon)) < 1e-7) return next;
    lon = next;
  }
  return lon;
};

const placidus = (ramc: number, obl: number, lat: number, asc: number, mc: number) => {
  const c11 = placidusCusp(ramc, obl, lat, 1 / 3, true);
  const c12 = placidusCusp(ramc, obl, lat, 2 / 3, true);
  const c2 = placidusCusp(ramc, obl, lat, 2 / 3, false);
  const c3 = placidusCusp(ramc, obl, lat, 1 / 3, false);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;
  const half = [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180)];
  return [...half, ...half.map((lon) => norm(lon + 180))];
};

const porphyry = (asc: number, mc: number) => {
  const ic = norm(mc + 180);
  const q1 = norm(ic - asc);
  const q2 = norm(asc - mc);
  const half = [asc, norm(asc + q1 / 3), norm(asc + (2 * q1) / 3), ic, norm(ic + q2 / 3), norm(ic + (2 * q2) / 3)];
  return [...half, ...half.map((lon) => norm(lon + 180))];
};

export const houseOf = (lon: number, cusps: number[]) => {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm(end - start);
    if (norm(lon - start) < span) return i + 1;
  }
  return 12;
};

const pointOf = (key: PointKey, lon: number, retro: boolean, cusps: number[] | null): ChartPoint => {
  const inSign = norm(lon) % 30;
  const planet = PLANETS.find((item) => item.key === key);
  return {
    key,
    name: POINT_NAMES[key],
    glyph: planet ? planet.glyph : key === 'node' ? NODE.glyph : key === 'asc' ? 'Asc' : 'MC',
    lon: norm(lon),
    sign: Math.floor(norm(lon) / 30),
    degree: Math.floor(inSign),
    minute: Math.floor((inSign % 1) * 60),
    retro,
    house: cusps && key !== 'asc' && key !== 'mc' ? houseOf(lon, cusps) : null
  };
};

const extraOf = (key: ExtraKey, lon: number, cusps: number[] | null): ExtraPoint => {
  const inSign = norm(lon) % 30;
  return {
    key,
    ...EXTRAS[key],
    lon: norm(lon),
    sign: Math.floor(norm(lon) / 30),
    degree: Math.floor(inSign),
    minute: Math.floor((inSign % 1) * 60),
    house: cusps ? houseOf(lon, cusps) : null
  };
};

const fortuneOf = (asc: number, sun: number, moon: number) => {
  const isDay = norm(sun - asc) > 180;
  return norm(isDay ? asc + moon - sun : asc + sun - moon);
};

export type ChartInput = { utc: Date; lat: number; lon: number; hasTime: boolean };

export const buildChart = (input: ChartInput): Chart => {
  const time = new AstroTime(input.utc);
  const keys: PlanetKey[] = [...PLANETS.map((planet) => planet.key), 'node'];
  if (!input.hasTime) {
    return {
      hasTime: false,
      houseSystem: null,
      points: keys.map((key) => pointOf(key, lonAt(key, time), isRetro(key, time), null)),
      asc: null,
      mc: null,
      cusps: null,
      extras: [extraOf('lilith', meanLilith(time), null)]
    };
  }
  const ramc = ramcOf(time, input.lon);
  const obl = oblOf(time);
  const asc = ascOf(ramc, obl, input.lat);
  const mc = mcOf(ramc, obl);
  const placid = placidus(ramc, obl, input.lat, asc, mc);
  const cusps = placid ?? porphyry(asc, mc);
  return {
    hasTime: true,
    houseSystem: placid ? 'placidus' : 'porphyry',
    points: [
      ...keys.map((key) => pointOf(key, lonAt(key, time), isRetro(key, time), cusps)),
      pointOf('asc', asc, false, cusps),
      pointOf('mc', mc, false, cusps)
    ],
    asc,
    mc,
    cusps,
    extras: [extraOf('lilith', meanLilith(time), cusps), extraOf('fortune', fortuneOf(asc, lonAt('sun', time), lonAt('moon', time)), cusps)]
  };
};

export const positionsAt = (utc: Date) => {
  const time = new AstroTime(utc);
  const keys: PlanetKey[] = [...PLANETS.map((planet) => planet.key), 'node'];
  return keys.map((key) => pointOf(key, lonAt(key, time), isRetro(key, time), null));
};

const LUMINARIES: PointKey[] = ['sun', 'moon'];
const ANGLES: PointKey[] = ['asc', 'mc'];

const natalOrb = (a: PointKey, b: PointKey) => {
  if (LUMINARIES.includes(a) || LUMINARIES.includes(b)) return 8;
  if (ANGLES.includes(a) || ANGLES.includes(b)) return 5;
  if (a === 'node' || b === 'node') return 3;
  return 6;
};

const aspectBetween = (lonA: number, lonB: number, maxOrb: number, withMinor = false) => {
  const diff = Math.abs(delta(lonA, lonB));
  let best: { aspect: (typeof ASPECTS)[number]; orb: number } | null = null;
  for (const aspect of ASPECTS) {
    const minor = aspect.angle === 150;
    if (minor && !withMinor) continue;
    const orb = Math.abs(diff - aspect.angle);
    if (orb <= (minor ? Math.min(maxOrb, MINOR_ORB) : maxOrb) && (!best || orb < best.orb)) best = { aspect, orb };
  }
  return best;
};

export const natalAspects = (chart: Chart): Aspect[] => {
  const result: Aspect[] = [];
  const points = chart.points;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
      if ((a.key === 'asc' && b.key === 'mc') || (a.key === 'node' && ANGLES.includes(b.key))) continue;
      const hit = aspectBetween(a.lon, b.lon, natalOrb(a.key, b.key), true);
      if (hit) result.push({ a: a.key, b: b.key, aspect: hit.aspect.name, angle: hit.aspect.angle, orb: hit.orb });
    }
  }
  return result.sort((x, y) => x.orb - y.orb);
};

export type ExtraAspect = { extra: ExtraKey; b: PointKey; aspect: (typeof ASPECTS)[number]['name']; orb: number };

export const extraAspects = (chart: Chart): ExtraAspect[] => {
  const lilith = chart.extras.find((extra) => extra.key === 'lilith');
  if (!lilith) return [];
  const result: ExtraAspect[] = [];
  for (const point of chart.points) {
    if (point.key === 'node') continue;
    const hit = aspectBetween(lilith.lon, point.lon, MINOR_ORB);
    if (hit) result.push({ extra: 'lilith', b: point.key, aspect: hit.aspect.name, orb: hit.orb });
  }
  return result.sort((x, y) => x.orb - y.orb);
};

const FIGURE_KEYS: PointKey[] = PLANETS.map((planet) => planet.key);

export type FigureKind = 'grandTrine' | 'tSquare' | 'grandCross' | 'yod' | 'stelliumSign' | 'stelliumHouse';

export type Figure = { kind: FigureKind; points: PointKey[]; apex: PointKey | null; sign: number | null; house: number | null };

export const figures = (chart: Chart): Figure[] => {
  const aspects = natalAspects(chart).filter((aspect) => FIGURE_KEYS.includes(aspect.a) && FIGURE_KEYS.includes(aspect.b));
  const has = (x: PointKey, y: PointKey, name: string) =>
    aspects.some((aspect) => aspect.aspect === name && ((aspect.a === x && aspect.b === y) || (aspect.a === y && aspect.b === x)));
  const keys = FIGURE_KEYS;
  const result: Figure[] = [];
  const crosses: PointKey[][] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      for (let k = j + 1; k < keys.length; k++) {
        const [a, b, c] = [keys[i], keys[j], keys[k]];
        if (has(a, b, 'трин') && has(b, c, 'трин') && has(a, c, 'трин'))
          result.push({ kind: 'grandTrine', points: [a, b, c], apex: null, sign: null, house: null });
      }
    }
  }
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const [a, b] = [keys[i], keys[j]];
      if (has(a, b, 'оппозиция')) {
        for (let k = i + 1; k < keys.length; k++) {
          for (let l = k + 1; l < keys.length; l++) {
            const [c, d] = [keys[k], keys[l]];
            if ([c, d].some((key) => key === a || key === b)) continue;
            if (has(c, d, 'оппозиция') && has(a, c, 'квадрат') && has(a, d, 'квадрат') && has(b, c, 'квадрат') && has(b, d, 'квадрат')) {
              crosses.push([a, b, c, d]);
              result.push({ kind: 'grandCross', points: [a, b, c, d], apex: null, sign: null, house: null });
            }
          }
        }
        for (const c of keys) {
          if (c === a || c === b) continue;
          if (crosses.some((cross) => [a, b, c].every((key) => cross.includes(key)))) continue;
          if (has(a, c, 'квадрат') && has(b, c, 'квадрат')) result.push({ kind: 'tSquare', points: [a, b, c], apex: c, sign: null, house: null });
        }
      }
      if (has(a, b, 'секстиль')) {
        for (const c of keys) {
          if (c === a || c === b) continue;
          if (has(a, c, 'квиконс') && has(b, c, 'квиконс')) result.push({ kind: 'yod', points: [a, b, c], apex: c, sign: null, house: null });
        }
      }
    }
  }
  const planets = chart.points.filter((point) => FIGURE_KEYS.includes(point.key));
  for (let sign = 0; sign < 12; sign++) {
    const inSign = planets.filter((point) => point.sign === sign).map((point) => point.key);
    if (inSign.length >= 3) result.push({ kind: 'stelliumSign', points: inSign, apex: null, sign, house: null });
  }
  if (chart.cusps) {
    for (let house = 1; house <= 12; house++) {
      const inHouse = planets.filter((point) => point.house === house).map((point) => point.key);
      const same = result.some(
        (figure) => figure.kind === 'stelliumSign' && figure.points.length === inHouse.length && inHouse.every((key) => figure.points.includes(key))
      );
      if (inHouse.length >= 3 && !same) result.push({ kind: 'stelliumHouse', points: inHouse, apex: null, sign: null, house });
    }
  }
  return result;
};

const RULERS: PlanetKey[][] = [
  ['mars'],
  ['venus'],
  ['mercury'],
  ['moon'],
  ['sun'],
  ['mercury'],
  ['venus'],
  ['pluto', 'mars'],
  ['jupiter'],
  ['saturn'],
  ['uranus', 'saturn'],
  ['neptune', 'jupiter']
];

export type HouseRuler = { house: number; sign: number; rulers: { key: PlanetKey; house: number | null }[] };

export const houseRulers = (chart: Chart): HouseRuler[] => {
  if (!chart.cusps) return [];
  return chart.cusps.map((cusp, index) => {
    const sign = Math.floor(norm(cusp) / 30);
    return {
      house: index + 1,
      sign,
      rulers: RULERS[sign].map((key) => ({ key, house: chart.points.find((point) => point.key === key)?.house ?? null }))
    };
  });
};

const SLOW: PlanetKey[] = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const FAST: PlanetKey[] = ['sun', 'mercury', 'venus', 'mars'];
const SLOW_SET = new Set<string>(SLOW);
const NATAL_TARGETS: PointKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'asc', 'mc'];

export type Transit = Aspect & { transitHouse: number | null; natalHouse: number | null; slow: boolean };

export const transitsTo = (chart: Chart, utc: Date, scope: 'slow' | 'day'): Transit[] => {
  const now = positionsAt(utc);
  const movers = scope === 'slow' ? [...SLOW, 'mars' as const] : ['moon' as const, ...FAST];
  const result: Transit[] = [];
  for (const mover of movers) {
    const moving = now.find((point) => point.key === mover);
    if (!moving) continue;
    const orb = mover === 'moon' ? 4 : SLOW.includes(mover) ? 2 : 1.5;
    for (const target of chart.points) {
      if (!NATAL_TARGETS.includes(target.key)) continue;
      const hit = aspectBetween(moving.lon, target.lon, orb);
      if (!hit) continue;
      result.push({
        a: mover,
        b: target.key,
        aspect: hit.aspect.name,
        angle: hit.aspect.angle,
        orb: hit.orb,
        transitHouse: chart.cusps ? houseOf(moving.lon, chart.cusps) : null,
        natalHouse: target.house,
        slow: SLOW.includes(mover)
      });
    }
  }
  return result.sort((x, y) => Number(y.slow) - Number(x.slow) || x.orb - y.orb);
};

export const slowHouses = (chart: Chart, utc: Date) => {
  if (!chart.cusps) return [];
  const cusps = chart.cusps;
  return positionsAt(utc)
    .filter((point) => SLOW_SET.has(point.key))
    .map((point) => ({ key: point.key, name: point.name, house: houseOf(point.lon, cusps), retro: point.retro }));
};

const OUTER: PlanetKey[] = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const YEAR_TARGETS: PointKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'asc', 'mc'];
const STEP_DAYS = 2;
const YEAR_ORB = 1;
const MERGE_DAYS = 150;

export type TransitWindow = {
  mover: PlanetKey;
  target: PointKey;
  aspect: (typeof ASPECTS)[number]['name'];
  start: Date;
  end: Date;
  exact: Date;
  natalHouse: number | null;
};

type OpenWindow = TransitWindow & { best: number; last: number };

export const yearTransits = (chart: Chart, from: Date, days: number): TransitWindow[] => {
  const steps = Math.ceil(days / STEP_DAYS);
  const result: OpenWindow[] = [];
  const open = new Map<string, OpenWindow>();
  for (let k = 0; k <= steps; k++) {
    const date = new Date(from.getTime() + k * STEP_DAYS * 86400000);
    const time = new AstroTime(date);
    for (const mover of OUTER) {
      const lon = lonAt(mover, time);
      for (const target of chart.points) {
        if (!YEAR_TARGETS.includes(target.key)) continue;
        const hit = aspectBetween(lon, target.lon, YEAR_ORB);
        if (!hit) continue;
        const id = `${mover}|${target.key}|${hit.aspect.name}`;
        const current = open.get(id);
        if (current && k - current.last <= MERGE_DAYS / STEP_DAYS) {
          current.end = date;
          current.last = k;
          if (hit.orb < current.best) {
            current.best = hit.orb;
            current.exact = date;
          }
          continue;
        }
        if (current) result.push(current);
        open.set(id, {
          mover,
          target: target.key,
          aspect: hit.aspect.name,
          start: date,
          end: date,
          exact: date,
          natalHouse: target.house,
          best: hit.orb,
          last: k
        });
      }
    }
  }
  result.push(...open.values());
  return result
    .map((window) => ({
      mover: window.mover,
      target: window.target,
      aspect: window.aspect,
      start: window.start,
      end: window.end,
      exact: window.exact,
      natalHouse: window.natalHouse
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
};

export type Ingress = { mover: PlanetKey; house: number; date: Date };

export const yearIngresses = (chart: Chart, from: Date, days: number): { mover: PlanetKey; startHouse: number; changes: Ingress[] }[] => {
  if (!chart.cusps) return [];
  const cusps = chart.cusps;
  return (['jupiter', 'saturn'] as const).map((mover) => {
    const startHouse = houseOf(lonAt(mover, new AstroTime(from)), cusps);
    const changes: Ingress[] = [];
    let current = startHouse;
    for (let k = 1; k <= Math.ceil(days / STEP_DAYS); k++) {
      const date = new Date(from.getTime() + k * STEP_DAYS * 86400000);
      const house = houseOf(lonAt(mover, new AstroTime(date)), cusps);
      if (house !== current) {
        changes.push({ mover, house, date });
        current = house;
      }
    }
    return { mover, startHouse, changes };
  });
};

const SYN: PointKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'asc'];

export const synastry = (a: Chart, b: Chart): Aspect[] => {
  const result: Aspect[] = [];
  for (const pa of a.points) {
    if (!SYN.includes(pa.key)) continue;
    for (const pb of b.points) {
      if (!SYN.includes(pb.key)) continue;
      if (pa.key === 'asc' && pb.key === 'asc') continue;
      const orb = LUMINARIES.includes(pa.key) || LUMINARIES.includes(pb.key) ? 7 : 5;
      const hit = aspectBetween(pa.lon, pb.lon, orb);
      if (hit) result.push({ a: pa.key, b: pb.key, aspect: hit.aspect.name, angle: hit.aspect.angle, orb: hit.orb });
    }
  }
  return result.sort((x, y) => x.orb - y.orb);
};

export const signName = (index: number) => SIGNS[index].name;

export const pointText = (point: ChartPoint) =>
  `${point.name}: ${point.degree}° ${SIGNS[point.sign].genitive}${point.retro && point.key !== 'node' ? ', ретроградный' : ''}${point.house ? `, ${point.house} дом` : ''}`;

export const elements = (chart: Chart) => {
  const counts: Record<string, number> = { огонь: 0, земля: 0, воздух: 0, вода: 0 };
  for (const point of chart.points) {
    if (point.key === 'node' || point.key === 'mc') continue;
    counts[SIGNS[point.sign].element] += point.key === 'sun' || point.key === 'moon' || point.key === 'asc' ? 2 : 1;
  }
  return counts;
};
