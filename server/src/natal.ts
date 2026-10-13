import { SIGNS } from './astro.js';
import {
  ASPECTS,
  HOUSES,
  POINT_NAMES,
  EXTRAS,
  PLANETS,
  buildChart,
  elements,
  extraAspects,
  figures,
  houseRulers,
  natalAspects,
  positionsAt,
  slowHouses,
  synastry,
  transitsTo,
  yearIngresses,
  yearTransits,
  type Aspect,
  type Chart,
  type ChartPoint,
  type ExtraKey,
  type ExtraPoint,
  type Figure,
  type PointKey,
  type Transit
} from './chart.js';
import { env } from './env.js';
import { localToUtc, type Place } from './geo.js';

export type Birth = { date: string; time: string | null; place: Place | null };

export const birthKey = (birth: Birth) =>
  `${birth.date}|${birth.time ?? '-'}|${birth.place ? `${birth.place.lat.toFixed(2)},${birth.place.lon.toFixed(2)}` : '-'}`;

export const chartOf = (birth: Birth): Chart => {
  const hasTime = birth.time !== null && birth.place !== null;
  const tz = birth.place?.tz ?? env.APP_TZ;
  const utc = localToUtc(birth.date, hasTime && birth.time ? birth.time : '12:00', tz);
  return buildChart({ utc, lat: birth.place?.lat ?? 55.75, lon: birth.place?.lon ?? 37.62, hasTime });
};

const WITH: Record<PointKey, string> = {
  sun: 'Солнцем',
  moon: 'Луной',
  mercury: 'Меркурием',
  venus: 'Венерой',
  mars: 'Марсом',
  jupiter: 'Юпитером',
  saturn: 'Сатурном',
  uranus: 'Ураном',
  neptune: 'Нептуном',
  pluto: 'Плутоном',
  node: 'Лунным узлом',
  asc: 'Асцендентом',
  mc: 'Серединой неба'
};

const YOUR_WITH: Record<PointKey, string> = {
  sun: 'вашим Солнцем',
  moon: 'вашей Луной',
  mercury: 'вашим Меркурием',
  venus: 'вашей Венерой',
  mars: 'вашим Марсом',
  jupiter: 'вашим Юпитером',
  saturn: 'вашим Сатурном',
  uranus: 'вашим Ураном',
  neptune: 'вашим Нептуном',
  pluto: 'вашим Плутоном',
  node: 'вашим Лунным узлом',
  asc: 'вашим Асцендентом',
  mc: 'вашей Серединой неба'
};

const PARTNER_WITH: Record<PointKey, string> = {
  sun: 'Солнцем партнёра',
  moon: 'Луной партнёра',
  mercury: 'Меркурием партнёра',
  venus: 'Венерой партнёра',
  mars: 'Марсом партнёра',
  jupiter: 'Юпитером партнёра',
  saturn: 'Сатурном партнёра',
  uranus: 'Ураном партнёра',
  neptune: 'Нептуном партнёра',
  pluto: 'Плутоном партнёра',
  node: 'Лунным узлом партнёра',
  asc: 'Асцендентом партнёра',
  mc: 'Серединой неба партнёра'
};

const IN_ASPECT: Record<string, string> = {
  соединение: 'в соединении с',
  секстиль: 'в секстиле с',
  квадрат: 'в квадрате с',
  трин: 'в трине с',
  квиконс: 'в квиконсе с',
  оппозиция: 'в оппозиции с'
};

const orbText = (orb: number) => `орб ${orb < 1 ? 'меньше 1' : Math.round(orb)}°`;

export const houseText = (house: number) => `${house} дом (${HOUSES[house - 1]})`;

export const signIn = (index: number) => SIGNS[index].prepositional;

export const pointLine = (point: ChartPoint) => {
  const sign = SIGNS[point.sign];
  const parts = [`${point.name} в ${sign.prepositional}, ${point.degree}°`];
  if (point.retro && point.key !== 'node') parts.push('ретроградный');
  if (point.house) parts.push(houseText(point.house));
  return parts.join(', ');
};

export const aspectLine = (aspect: Aspect) => `${POINT_NAMES[aspect.a]} ${IN_ASPECT[aspect.aspect]} ${WITH[aspect.b]} (${orbText(aspect.orb)})`;

export const transitLine = (transit: Transit) => {
  const mover =
    transit.a === 'sun'
      ? 'Транзитное Солнце'
      : transit.a === 'moon' || transit.a === 'venus'
        ? `Транзитная ${POINT_NAMES[transit.a]}`
        : `Транзитный ${POINT_NAMES[transit.a]}`;
  const base = `${mover} ${IN_ASPECT[transit.aspect]} ${YOUR_WITH[transit.b]} (${orbText(transit.orb)})`;
  return transit.transitHouse ? `${base}, сейчас проходит ваш ${houseText(transit.transitHouse)}` : base;
};

const YOUR: Record<PointKey, string> = {
  sun: 'Ваше Солнце',
  moon: 'Ваша Луна',
  mercury: 'Ваш Меркурий',
  venus: 'Ваша Венера',
  mars: 'Ваш Марс',
  jupiter: 'Ваш Юпитер',
  saturn: 'Ваш Сатурн',
  uranus: 'Ваш Уран',
  neptune: 'Ваш Нептун',
  pluto: 'Ваш Плутон',
  node: 'Ваш Лунный узел',
  asc: 'Ваш Асцендент',
  mc: 'Ваша Середина неба'
};

export const synastryLine = (aspect: Aspect) => `${YOUR[aspect.a]} ${IN_ASPECT[aspect.aspect]} ${PARTNER_WITH[aspect.b]} (${orbText(aspect.orb)})`;

export const aspectNature = (name: string) => ASPECTS.find((aspect) => aspect.name === name)?.nature ?? '';

export const elementsLine = (chart: Chart) => {
  const counts = elements(chart);
  return Object.entries(counts)
    .map(([element, n]) => `${element} ${n}`)
    .join(', ');
};

export const chartSummary = (chart: Chart) => {
  const lines = chart.points.filter((point) => point.key !== 'asc' && point.key !== 'mc').map(pointLine);
  if (chart.asc !== null) lines.push(`Асцендент в ${signIn(Math.floor(chart.asc / 30))}, ${Math.floor(chart.asc % 30)}°`);
  if (chart.mc !== null) lines.push(`Середина неба в ${signIn(Math.floor(chart.mc / 30))}, ${Math.floor(chart.mc % 30)}°`);
  return lines;
};

export const extraLine = (extra: ExtraPoint) => {
  const parts = [`${extra.name} в ${SIGNS[extra.sign].prepositional}, ${extra.degree}°`];
  if (extra.house) parts.push(houseText(extra.house));
  return `${parts.join(', ')}: ${extra.meaning}`;
};

export const extraAspectLines = (chart: Chart) =>
  extraAspects(chart).map((aspect) => `${EXTRAS[aspect.extra].name} ${IN_ASPECT[aspect.aspect]} ${WITH[aspect.b]} (${orbText(aspect.orb)})`);

const listNames = (keys: PointKey[]) => {
  const names = keys.map((key) => POINT_NAMES[key]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} и ${names[names.length - 1]}` : names.join('');
};

export const FIGURE_INFO: Record<Figure['kind'], { title: string; meaning: string }> = {
  grandTrine: {
    title: 'Большой трин',
    meaning: 'три планеты в трине друг к другу: врождённая лёгкость и талант в их темах, но без усилий он может остаться неиспользованным'
  },
  tSquare: {
    title: 'Тау-квадрат',
    meaning:
      'две планеты в оппозиции и обе в квадрате к третьей: постоянное напряжение, которое становится главным двигателем; третья планета показывает, куда уходит энергия'
  },
  grandCross: { title: 'Большой крест', meaning: 'четыре планеты, связанные квадратами и оппозициями: сильная внутренняя нагрузка и большая выносливость' },
  yod: {
    title: 'Йод (Перст судьбы)',
    meaning: 'две планеты в секстиле и обе в квиконсе к третьей: по традиции особая задача, к которой жизнь возвращает снова и снова'
  },
  stelliumSign: { title: 'Стеллиум', meaning: 'три и больше планет в одном знаке: его черты выражены очень ярко' },
  stelliumHouse: { title: 'Стеллиум', meaning: 'три и больше планет в одном доме: эта сфера жизни занимает особенно много места' }
};

export const figureView = (figure: Figure) => {
  const info = FIGURE_INFO[figure.kind];
  const where = figure.sign !== null ? ` в ${SIGNS[figure.sign].prepositional}` : figure.house !== null ? ` в ${figure.house} доме` : '';
  const apex = figure.apex ? `, вершина ${POINT_NAMES[figure.apex]}` : '';
  return { title: `${info.title}${where}`, points: `${listNames(figure.points)}${apex}`, meaning: info.meaning };
};

export const figureLines = (chart: Chart) =>
  figures(chart).map((figure) => {
    const view = figureView(figure);
    return `${view.title}: ${view.points} (${view.meaning})`;
  });

export const rulerLines = (chart: Chart) =>
  houseRulers(chart).map((item) => {
    const rulers = item.rulers.map((ruler) => `${POINT_NAMES[ruler.key]}${ruler.house ? ` в ${ruler.house} доме` : ''}`).join(' и ');
    return `${item.house} дом в ${SIGNS[item.sign].prepositional}, ${item.rulers.length > 1 ? 'управители' : 'управитель'} ${rulers}`;
  });

const ANGLE_MEANINGS: Record<string, string> = {
  node: 'направление развития, чему учит жизнь',
  asc: 'как вас видят при первой встрече, ваша манера и первая реакция',
  mc: 'призвание, карьера, каким вы хотите быть в глазах мира'
};

const meaningOf = (key: PointKey) => PLANETS.find((planet) => planet.key === key)?.meaning ?? ANGLE_MEANINGS[key] ?? '';

type Tone = 'soft' | 'hard' | 'mixed';

const TONES: Record<string, Tone> = { соединение: 'mixed', секстиль: 'soft', трин: 'soft', квадрат: 'hard', квиконс: 'hard', оппозиция: 'hard' };

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const withOf = (key: PointKey | ExtraKey) => (key === 'lilith' ? 'Лилит' : key === 'fortune' ? 'Парсом Фортуны' : WITH[key]);

type Link = { a: PointKey | ExtraKey; b: PointKey | ExtraKey; aspect: string; orb: number };

export type ItemAspect = { text: string; nature: string; tone: Tone; orb: number };

export type NatalItem = {
  key: PointKey | ExtraKey;
  name: string;
  glyph: string;
  title: string;
  position: string;
  meaning: string;
  sign: string;
  signText: string;
  house: number | null;
  houseText: string | null;
  rules: number[];
  retro: boolean;
  aspects: ItemAspect[];
};

export type HouseLink = { key: PointKey | ExtraKey; name: string; house: number | null };

export type HouseItem = { house: number; title: string; position: string; meaning: string; rulers: HouseLink[]; planets: HouseLink[] };

const mins = (minute: number) => String(minute).padStart(2, '0');

export const natalItems = (chart: Chart): NatalItem[] => {
  const all: Link[] = [
    ...natalAspects(chart).map((aspect) => ({ a: aspect.a, b: aspect.b, aspect: aspect.aspect, orb: aspect.orb })),
    ...extraAspects(chart).map((aspect) => ({ a: aspect.extra, b: aspect.b, aspect: aspect.aspect, orb: aspect.orb }))
  ];
  const aspectsOf = (key: PointKey | ExtraKey): ItemAspect[] =>
    all
      .filter((aspect) => aspect.a === key || aspect.b === key)
      .map((aspect) => {
        const other = aspect.a === key ? aspect.b : aspect.a;
        return {
          text: `${capital(aspect.aspect)} с ${withOf(other)}`,
          nature: aspectNature(aspect.aspect),
          tone: TONES[aspect.aspect] ?? 'mixed',
          orb: Math.round(aspect.orb * 10) / 10
        };
      });
  const rulers = houseRulers(chart);
  const rulesOf = (key: PointKey | ExtraKey) => rulers.filter((item) => item.rulers.some((ruler) => ruler.key === key)).map((item) => item.house);
  const signTextOf = (sign: number) => `Стихия: ${SIGNS[sign].element}. Тема знака: ${SIGNS[sign].theme}.`;
  const points: NatalItem[] = chart.points.map((point) => ({
    key: point.key,
    name: point.name,
    glyph: point.glyph,
    title: `${point.name} в ${SIGNS[point.sign].prepositional}`,
    position: [`${point.degree}°${mins(point.minute)}′`, point.house ? `${point.house} дом` : '', point.retro && point.key !== 'node' ? 'ретроградный' : '']
      .filter(Boolean)
      .join(' · '),
    meaning: meaningOf(point.key),
    sign: SIGNS[point.sign].name,
    signText: signTextOf(point.sign),
    house: point.house,
    houseText: point.house ? HOUSES[point.house - 1] : null,
    rules: rulesOf(point.key),
    retro: point.retro && point.key !== 'node',
    aspects: aspectsOf(point.key)
  }));
  const extras: NatalItem[] = chart.extras.map((extra) => ({
    key: extra.key,
    name: extra.name,
    glyph: extra.glyph,
    title: `${extra.name.split(' (')[0]} в ${SIGNS[extra.sign].prepositional}`,
    position: [`${extra.degree}°${mins(extra.minute)}′`, extra.house ? `${extra.house} дом` : ''].filter(Boolean).join(' · '),
    meaning: extra.meaning,
    sign: SIGNS[extra.sign].name,
    signText: signTextOf(extra.sign),
    house: extra.house,
    houseText: extra.house ? HOUSES[extra.house - 1] : null,
    rules: [],
    retro: false,
    aspects: aspectsOf(extra.key)
  }));
  return [...points, ...extras];
};

export const houseItems = (chart: Chart): HouseItem[] => {
  if (!chart.cusps) return [];
  const cusps = chart.cusps;
  return houseRulers(chart).map((item) => {
    const cusp = cusps[item.house - 1];
    const inSign = cusp % 30;
    return {
      house: item.house,
      title: `${item.house} дом в ${SIGNS[item.sign].prepositional}`,
      position: `${Math.floor(inSign)}°${mins(Math.floor((inSign % 1) * 60))}′ ${SIGNS[item.sign].genitive}`,
      meaning: HOUSES[item.house - 1],
      rulers: item.rulers.map((ruler) => ({ key: ruler.key, name: POINT_NAMES[ruler.key], house: ruler.house })),
      planets: [
        ...chart.points
          .filter((point) => point.house === item.house && point.key !== 'asc' && point.key !== 'mc')
          .map((point) => ({ key: point.key, name: point.name, house: point.house })),
        ...chart.extras.filter((extra) => extra.house === item.house).map((extra) => ({ key: extra.key, name: extra.name.split(' (')[0], house: extra.house }))
      ]
    };
  });
};

export const natalAspectViews = (chart: Chart) => [
  ...keyAspects(chart, 10).map((aspect) => ({ text: aspectLine(aspect), nature: aspectNature(aspect.aspect), tone: TONES[aspect.aspect] ?? 'mixed' })),
  ...extraAspects(chart).map((aspect) => ({
    text: `${EXTRAS[aspect.extra].name} ${IN_ASPECT[aspect.aspect]} ${WITH[aspect.b]} (${orbText(aspect.orb)})`,
    nature: aspectNature(aspect.aspect),
    tone: TONES[aspect.aspect] ?? 'mixed'
  }))
];

export const partKeys = (chart: Chart) => [...natalItems(chart).map((item) => item.key), ...houseItems(chart).map((item) => `house${item.house}`)];

export const partFacts = (chart: Chart, part: string) => {
  const house = /^house(\d{1,2})$/.exec(part);
  if (house) {
    const item = houseItems(chart).find((entry) => entry.house === Number(house[1]));
    if (!item) return null;
    return {
      subject: `${item.title} (${item.meaning})`,
      facts: [
        `Куспид дома: ${item.position}`,
        `Управитель дома: ${item.rulers.map((ruler) => `${ruler.name}${ruler.house ? ` в ${ruler.house} доме` : ''}`).join(' и ')}`,
        item.planets.length ? `Планеты в доме: ${item.planets.map((planet) => planet.name).join(', ')}` : 'Планет в доме нет, тему ведёт управитель'
      ]
    };
  }
  const item = natalItems(chart).find((entry) => entry.key === part);
  if (!item) return null;
  return {
    subject: `${item.title}, ${item.position} (${item.name}: ${item.meaning})`,
    facts: [
      `Знак ${item.sign}. ${item.signText.replace(/\.$/, '')}`,
      item.house && item.houseText ? `${item.house} дом: ${item.houseText}` : 'Дом не рассчитан: время рождения неизвестно',
      item.rules.length ? `Управляет домами: ${item.rules.join(', ')}` : '',
      item.retro ? 'Планета ретроградная' : '',
      item.aspects.length
        ? `Аспекты: ${item.aspects.map((aspect) => `${aspect.text}, орб ${aspect.orb}° (${aspect.nature})`).join('; ')}`
        : 'Точных аспектов нет'
    ].filter(Boolean)
  };
};

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const MONTHS_FROM = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const monthOf = (date: Date) => {
  const [year, month] = dayKeyIn(date).split('-').map(Number);
  return { year, month };
};

const dayKeyIn = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: env.APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const monthText = (date: Date) => {
  const { year, month } = monthOf(date);
  return `${MONTHS[month - 1]} ${year}`;
};

const rangeText = (start: Date, end: Date) => {
  const a = monthOf(start);
  const b = monthOf(end);
  if (a.year === b.year && a.month === b.month) return monthText(start);
  if (a.year === b.year) return `${MONTHS[a.month - 1]}–${MONTHS[b.month - 1]} ${a.year}`;
  return `${monthText(start)} – ${monthText(end)}`;
};

const YEAR_WEIGHT: Partial<Record<PointKey, number>> = { sun: 3, moon: 3, asc: 3, mc: 3, venus: 2, mars: 2, mercury: 1 };
const MOVER_WEIGHT: Partial<Record<PointKey, number>> = { pluto: 3, saturn: 3, uranus: 3, neptune: 2, jupiter: 2 };

export const yearKey = (now: Date) => {
  const { year, month } = monthOf(now);
  return `${year}-${String(month).padStart(2, '0')}`;
};

export const yearLines = (chart: Chart, now: Date) => {
  const windows = yearTransits(chart, now, 365)
    .map((window) => ({ window, weight: (YEAR_WEIGHT[window.target] ?? 1) * (MOVER_WEIGHT[window.mover] ?? 1) }))
    .sort((a, b) => b.weight - a.weight || a.window.start.getTime() - b.window.start.getTime())
    .slice(0, 8)
    .map((entry) => entry.window)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const transits = windows.map((window) => {
    const running = window.start.getTime() <= now.getTime() + 3 * 86400000;
    const house = window.natalHouse ? `, ваша точка в ${window.natalHouse} доме (${HOUSES[window.natalHouse - 1]})` : '';
    const period = running ? `уже идёт, до ${monthText(window.end)}` : rangeText(window.start, window.end);
    const peak = monthText(window.start) === monthText(window.end) ? '' : `, точнее всего ${monthText(window.exact)}`;
    return `${capital(period)}${peak}: транзитный ${POINT_NAMES[window.mover]} ${IN_ASPECT[window.aspect]} ${YOUR_WITH[window.target]}${house}`;
  });
  const houses = yearIngresses(chart, now, 365).map((item) => {
    const base = `${POINT_NAMES[item.mover]} сейчас проходит ваш ${houseText(item.startHouse)}`;
    if (!item.changes.length) return `${base} весь год`;
    return `${base}, затем ${item.changes.map((change) => `с ${MONTHS_FROM[monthOf(change.date).month - 1]} ${monthOf(change.date).year} ${houseText(change.house)}`).join(', потом ')}`;
  });
  return { transits, houses };
};

export const retroNames = (chart: Chart) => chart.points.filter((point) => point.retro && point.key !== 'node').map((point) => point.name);

export const keyAspects = (chart: Chart, limit: number) =>
  natalAspects(chart)
    .filter((aspect) => aspect.a !== 'node' && aspect.b !== 'node')
    .slice(0, limit);

export const ascInfo = (chart: Chart) => {
  if (chart.asc === null || !chart.cusps) return null;
  const sign = Math.floor(chart.asc / 30);
  const inFirst = chart.points.filter((point) => point.house === 1 && point.key !== 'asc' && point.key !== 'mc');
  const aspects = natalAspects(chart).filter((aspect) => (aspect.a === 'asc' || aspect.b === 'asc') && aspect.orb <= 4);
  return { sign, degree: Math.floor(chart.asc % 30), inFirst, aspects };
};

export const whyNow = (chart: Chart, utc: Date) => ({
  transits: transitsTo(chart, utc, 'slow').slice(0, 8),
  houses: slowHouses(chart, utc),
  retro: positionsAt(utc).filter((point) => point.retro && point.key !== 'node' && point.key !== 'pluto' && point.key !== 'neptune' && point.key !== 'uranus')
});

export const dayTransits = (chart: Chart, utc: Date) => transitsTo(chart, utc, 'day').slice(0, 5);

export const moonHouse = (chart: Chart, utc: Date) => {
  if (!chart.cusps) return null;
  const moon = positionsAt(utc).find((point) => point.key === 'moon');
  if (!moon) return null;
  const cusps = chart.cusps;
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    if ((((moon.lon - start) % 360) + 360) % 360 < (((end - start) % 360) + 360) % 360) return i + 1;
  }
  return null;
};

export const synastryOf = (a: Chart, b: Chart, limit: number) => synastry(a, b).slice(0, limit);

export const sunSignIndex = (chart: Chart) => chart.points.find((point) => point.key === 'sun')?.sign ?? 0;
export const moonSignIndex = (chart: Chart) => chart.points.find((point) => point.key === 'moon')?.sign ?? 0;
