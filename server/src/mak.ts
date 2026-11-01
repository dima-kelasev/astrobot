import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const deckFile = fileURLToPath(new URL('../deck/mak.json', import.meta.url));

const cardSchema = z.object({
  id: z.number(),
  file: z.string(),
  title: z.string(),
  artist: z.string(),
  year: z.string(),
  description: z.string()
});

export type MakCard = z.infer<typeof cardSchema>;

const loadDeck = (): MakCard[] => {
  if (!existsSync(deckFile)) return [];
  try {
    return z.array(cardSchema).parse(JSON.parse(readFileSync(deckFile, 'utf8')));
  } catch (error) {
    console.error('Колода метафорических карт не прочиталась:', error);
    return [];
  }
};

export const MAK_DECK = loadDeck();

export const MAK_QUESTIONS = [
  'Что вы видите на этой картине в первую очередь?',
  'Какие чувства она у вас вызывает?',
  'Как то, что вы увидели, связано с вашим вопросом?',
  'Если бы вы могли что-то изменить на этой картине, что бы это было?'
] as const;

export const makCardOf = (id: number) => MAK_DECK.find((card) => card.id === id) ?? null;

export const drawMakCard = (recent: number[]) => {
  const pool = MAK_DECK.filter((card) => !recent.includes(card.id));
  const from = pool.length ? pool : MAK_DECK;
  return from[Math.floor(Math.random() * from.length)];
};

export const makCardView = (card: MakCard) => ({
  id: card.id,
  image: `mak/${card.file}`,
  title: card.title,
  artist: card.artist,
  year: card.year
});
