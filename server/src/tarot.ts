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

export const POSITIONS = ['Что есть', 'Что мешает', 'Что поможет'];
export const FAN_SIZE = 9;
export const PICKS = 3;

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

export const drawFan = (): DrawnCard[] => {
  const deck = ARCANA.map((_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, FAN_SIZE).map((i) => ({ i, rev: randomInt(2) === 1 }));
};

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const dayCardFor = (userId: number, birthDate: string, day: string): DrawnCard => {
  const h = hash(`${userId}|${birthDate}|${day}`);
  return { i: h % ARCANA.length, rev: ((h >>> 8) & 1) === 1 };
};

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const dayFallback = (face: CardFace) =>
  `Сегодня с вами ${face.name}${face.reversed ? ' в перевёрнутом положении' : ''}. Темы дня: ${face.meaning}.`;

export const spreadFallback = (faces: CardFace[]) =>
  faces.map((face, k) => `${POSITIONS[k]}: ${face.name}${face.reversed ? ' (перевёрнутая)' : ''}. ${capital(face.meaning)}.`).join('\n\n');
