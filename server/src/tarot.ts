import { randomInt } from 'node:crypto';

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

const ARCANA = [
  { name: 'Шут', up: 'новое начало, лёгкость, доверие пути', rev: 'поспешность, неготовность, риск без расчёта' },
  { name: 'Маг', up: 'воля, умение, ресурсы уже в руках', rev: 'распыление сил, сомнение в себе' },
  { name: 'Верховная Жрица', up: 'интуиция, тишина, скрытое знание', rev: 'шум вместо чутья, недосказанность' },
  { name: 'Императрица', up: 'рост, забота, изобилие', rev: 'застой, чрезмерная опека' },
  { name: 'Император', up: 'порядок, опора, ответственность', rev: 'жёсткость, контроль ради контроля' },
  { name: 'Иерофант', up: 'традиция, наставник, правила', rev: 'чужие нормы тесны, поиск своего пути' },
  { name: 'Влюблённые', up: 'выбор сердцем, союз, согласие', rev: 'разлад, отложенный выбор' },
  { name: 'Колесница', up: 'движение, собранность, победа усилием', rev: 'тянет в разные стороны, потеря курса' },
  { name: 'Сила', up: 'мягкая сила, терпение, смелость', rev: 'усталость, неуверенность' },
  { name: 'Отшельник', up: 'пауза, поиск ответа внутри', rev: 'изоляция, застревание в раздумьях' },
  { name: 'Колесо Фортуны', up: 'перемены, поворот, шанс', rev: 'сопротивление переменам, повтор цикла' },
  { name: 'Справедливость', up: 'честность, баланс, последствия', rev: 'перекос, нежелание признать факты' },
  { name: 'Повешенный', up: 'новый взгляд, отпускание, ожидание', rev: 'жертва без смысла, затянувшаяся пауза' },
  { name: 'Смерть', up: 'завершение этапа, обновление', rev: 'страх отпустить старое' },
  { name: 'Умеренность', up: 'мера, соединение, спокойный темп', rev: 'крайности, нетерпение' },
  { name: 'Дьявол', up: 'привязанность, соблазн, сила привычки', rev: 'освобождение от того, что держит' },
  { name: 'Башня', up: 'резкая перемена, правда выходит наружу', rev: 'перемена назревает, отсрочка' },
  { name: 'Звезда', up: 'надежда, восстановление, ясность', rev: 'сомнение, усталость веры' },
  { name: 'Луна', up: 'неясность, воображение, тревоги', rev: 'туман рассеивается, страхи слабеют' },
  { name: 'Солнце', up: 'радость, успех, ясность', rev: 'приглушённая радость, завышенные ожидания' },
  { name: 'Суд', up: 'пробуждение, итог, зов', rev: 'самокритика, отложенное решение' },
  { name: 'Мир', up: 'завершённость, целостность, новый уровень', rev: 'незавершённость, последний шаг' }
];

export const THEMES = [
  {
    key: 'general',
    title: 'Расклад на вопрос',
    description: 'Три карты: что есть, что мешает и что поможет.',
    positions: ['Что есть', 'Что мешает', 'Что поможет'],
    questionRequired: true,
    hint: 'Например: на чём сосредоточиться в этом месяце?'
  },
  {
    key: 'love',
    title: 'Любовь и отношения',
    description: 'Что происходит между вами и куда это может привести.',
    positions: ['Вы в этих отношениях', 'Что между вами сейчас', 'Что мешает', 'Что поможет', 'Куда это ведёт'],
    questionRequired: false,
    hint: 'Можно уточнить: о ком или о какой ситуации речь'
  },
  {
    key: 'work',
    title: 'Работа и деньги',
    description: 'Ваше положение, препятствия и на что опереться.',
    positions: ['Где вы сейчас', 'Что мешает', 'Ваша опора', 'Совет'],
    questionRequired: false,
    hint: 'Можно уточнить: работа, проект, доход'
  },
  {
    key: 'choice',
    title: 'Трудный выбор',
    description: 'Два пути рядом, чтобы спокойно их сравнить.',
    positions: ['Суть выбора', 'Первый путь', 'Второй путь', 'Что важно учесть'],
    questionRequired: false,
    hint: 'Опишите оба варианта, например: остаться или уйти'
  },
  {
    key: 'repeat',
    title: 'Повторяющаяся ситуация',
    description: 'Почему сценарий повторяется и как из него выйти.',
    positions: ['Что повторяется', 'Откуда это', 'Что это вам даёт', 'Как выйти из круга'],
    questionRequired: false,
    hint: 'Можно описать, что именно повторяется'
  }
] as const;

export type ThemeKey = (typeof THEMES)[number]['key'];
export type Theme = (typeof THEMES)[number];

export const themeOf = (key: string): Theme => THEMES.find((theme) => theme.key === key) ?? THEMES[0];

export const fanSizeFor = (picks: number) => (picks <= 3 ? 9 : 12);

export type DrawnCard = { i: number; rev: boolean };

export type CardFace = { index: number; reversed: boolean; name: string; roman: string; meaning: string; orientation: string };

export const faceOf = (card: DrawnCard): CardFace => ({
  index: card.i,
  reversed: card.rev,
  name: ARCANA[card.i].name,
  roman: ROMAN[card.i],
  meaning: card.rev ? ARCANA[card.i].rev : ARCANA[card.i].up,
  orientation: card.rev ? 'перевёрнутая' : 'прямая'
});

export const drawCards = (count: number): DrawnCard[] => {
  const deck = ARCANA.map((_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, count).map((i) => ({ i, rev: randomInt(2) === 1 }));
};

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const dayCardFor = (userId: number, day: string): DrawnCard => {
  const h = hash(`${userId}|${day}`);
  return { i: h % ARCANA.length, rev: ((h >>> 8) & 1) === 1 };
};

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const dayFallback = (face: CardFace) =>
  `Сегодня с вами ${face.name}${face.reversed ? ' в перевёрнутом положении' : ''}. Темы дня: ${face.meaning}.`;

export const spreadFallback = (faces: CardFace[], positions: readonly string[]) =>
  faces.map((face, k) => `${positions[k] ?? `Карта ${k + 1}`}: ${face.name}${face.reversed ? ' (перевёрнутая)' : ''}. ${capital(face.meaning)}.`).join('\n\n');
