import { noonOf } from './time.js';

const rad = Math.PI / 180;
const norm = (x: number) => ((x % 360) + 360) % 360;

export type Sign = { name: string; genitive: string; prepositional: string; element: string; theme: string };

export const SIGNS: Sign[] = [
  { name: 'Овен', genitive: 'Овна', prepositional: 'Овне', element: 'огонь', theme: 'импульс и прямота' },
  { name: 'Телец', genitive: 'Тельца', prepositional: 'Тельце', element: 'земля', theme: 'комфорт и устойчивость' },
  { name: 'Близнецы', genitive: 'Близнецов', prepositional: 'Близнецах', element: 'воздух', theme: 'разговоры и новости' },
  { name: 'Рак', genitive: 'Рака', prepositional: 'Раке', element: 'вода', theme: 'дом и близкие' },
  { name: 'Лев', genitive: 'Льва', prepositional: 'Льве', element: 'огонь', theme: 'внимание и самовыражение' },
  { name: 'Дева', genitive: 'Девы', prepositional: 'Деве', element: 'земля', theme: 'порядок и детали' },
  { name: 'Весы', genitive: 'Весов', prepositional: 'Весах', element: 'воздух', theme: 'партнёрство и компромисс' },
  { name: 'Скорпион', genitive: 'Скорпиона', prepositional: 'Скорпионе', element: 'вода', theme: 'глубина и откровенность' },
  { name: 'Стрелец', genitive: 'Стрельца', prepositional: 'Стрельце', element: 'огонь', theme: 'планы и горизонты' },
  { name: 'Козерог', genitive: 'Козерога', prepositional: 'Козероге', element: 'земля', theme: 'дела и дисциплина' },
  { name: 'Водолей', genitive: 'Водолея', prepositional: 'Водолее', element: 'воздух', theme: 'идеи и свобода' },
  { name: 'Рыбы', genitive: 'Рыб', prepositional: 'Рыбах', element: 'вода', theme: 'чувства и воображение' }
];

const FRIENDS: Record<string, string> = { огонь: 'воздух', воздух: 'огонь', земля: 'вода', вода: 'земля' };

const PHASES = [
  { name: 'новолуние', tip: 'Это день для замыслов, а не для рывков.' },
  { name: 'растущий серп', tip: 'Хорошо начинать небольшое и проверять идеи делом.' },
  { name: 'первая четверть', tip: 'Время решений: первые препятствия покажут, что для вас важно.' },
  { name: 'растущая Луна', tip: 'Можно наращивать темп и доводить начатое до заметного результата.' },
  { name: 'полнолуние', tip: 'Эмоции на пике, а результаты последних недель хорошо видны.' },
  { name: 'убывающая Луна', tip: 'Подходящее время делиться сделанным и подводить итоги.' },
  { name: 'последняя четверть', tip: 'Пора отпускать лишнее и закрывать хвосты.' },
  { name: 'убывающий серп', tip: 'День для отдыха и спокойного завершения дел.' }
];

const ASPECTS: [number, string][] = [
  [0, 'в соединении с вашим Солнцем'],
  [60, 'в секстиле к вашему Солнцу'],
  [90, 'в квадрате к вашему Солнцу'],
  [120, 'в трине к вашему Солнцу'],
  [180, 'в оппозиции к вашему Солнцу']
];

const daysJ2000 = (date: Date) => (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;

const sunLon = (d: number) => {
  const L = 280.46 + 0.9856474 * d;
  const g = (357.528 + 0.9856003 * d) * rad;
  return norm(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
};

const moonLon = (d: number) => {
  const L = 218.316 + 13.176396 * d;
  const Mm = (134.963 + 13.064993 * d) * rad;
  const Ms = (357.529 + 0.98560028 * d) * rad;
  const D = (297.85 + 12.190749 * d) * rad;
  const F = (93.272 + 13.22935 * d) * rad;
  return norm(
    L +
      6.289 * Math.sin(Mm) -
      1.274 * Math.sin(Mm - 2 * D) +
      0.658 * Math.sin(2 * D) +
      0.214 * Math.sin(2 * Mm) -
      0.186 * Math.sin(Ms) -
      0.114 * Math.sin(2 * F)
  );
};

const signIndex = (lon: number) => Math.floor(norm(lon) / 30);
const degIn = (lon: number) => `${Math.floor(norm(lon) % 30)}° ${SIGNS[signIndex(lon)].genitive}`;

const aspectTo = (lon: number, natal: number) => {
  const diff = Math.abs(norm(lon - natal + 180) - 180);
  let best: { label: string; orb: number } | null = null;
  for (const [angle, label] of ASPECTS) {
    const orb = Math.abs(diff - angle);
    if (orb <= 6 && (!best || orb < best.orb)) best = { label, orb };
  }
  return best;
};

export type DaySky = {
  sunLon: number;
  moonLon: number;
  moonSign: Sign;
  phase: string;
  phaseTip: string;
  lit: number;
  lunarDay: number;
  moonLine: string;
};

export const daySky = (day: string, tz: string): DaySky => {
  const d = daysJ2000(noonOf(day, tz));
  const sun = sunLon(d);
  const moon = moonLon(d);
  const elong = norm(moon - sun);
  const phase = PHASES[Math.floor(norm(elong + 22.5) / 45)];
  const moonSign = SIGNS[signIndex(moon)];
  const lit = Math.round(((1 - Math.cos(elong * rad)) / 2) * 100);
  return {
    sunLon: sun,
    moonLon: moon,
    moonSign,
    phase: phase.name,
    phaseTip: phase.tip,
    lit,
    lunarDay: Math.floor((elong / 360) * 29.53) + 1,
    moonLine: `Луна в ${moonSign.prepositional}, ${phase.name}, освещена на ${lit}%.`
  };
};

export const natalSunLon = (birthDate: string) => {
  const [year, month, date] = birthDate.split('-').map(Number);
  return sunLon(daysJ2000(new Date(Date.UTC(year, month - 1, date, 12))));
};

export const signOfBirth = (birthDate: string) => SIGNS[signIndex(natalSunLon(birthDate))];

export type PersonalSky = DaySky & {
  natalLon: number;
  natalSignIndex: number;
  sign: Sign;
  aspects: string[];
  sunText: string;
  moonText: string;
  natalText: string;
};

export const personalSky = (birthDate: string, day: string, tz: string): PersonalSky => {
  const base = daySky(day, tz);
  const natal = natalSunLon(birthDate);
  const aspects: string[] = [];
  const sunAspect = aspectTo(base.sunLon, natal);
  const moonAspect = aspectTo(base.moonLon, natal);
  if (sunAspect) aspects.push(`Солнце ${sunAspect.label} (орб ${Math.round(sunAspect.orb)}°)`);
  if (moonAspect) aspects.push(`Луна ${moonAspect.label} (орб ${Math.round(moonAspect.orb)}°)`);
  return {
    ...base,
    natalLon: natal,
    natalSignIndex: signIndex(natal),
    sign: SIGNS[signIndex(natal)],
    aspects,
    sunText: degIn(base.sunLon),
    moonText: degIn(base.moonLon),
    natalText: degIn(natal)
  };
};

export const skyFallback = (sky: PersonalSky) => {
  const userElement = sky.sign.element;
  const moonElement = sky.moonSign.element;
  const relation =
    userElement === moonElement
      ? 'Ваша стихия совпадает с лунной, поэтому день идёт легко.'
      : FRIENDS[userElement] === moonElement
        ? 'Стихии дружат: поддержка окажется рядом.'
        : 'Стихии спорят, так что не торопите события.';
  return `Луна в ${sky.moonSign.prepositional}: на первом плане ${sky.moonSign.theme}. ${relation}\n\n${sky.phaseTip}`;
};
