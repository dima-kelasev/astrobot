import { useEffect, useState } from 'react';
import type { Card } from '../api/schemas';
import { TarotCard } from './TarotCard';
import styles from './CardsRow.module.css';

type Props = { cards: Card[]; positions: string[]; animate?: boolean };

export const CardsRow = ({ cards, positions, animate = false }: Props) => {
  const [shown, setShown] = useState(animate ? 0 : cards.length);

  useEffect(() => {
    if (!animate) return;
    setShown(0);
    const timers = cards.map((_, k) => setTimeout(() => setShown(k + 1), 500 + k * 450));
    return () => timers.forEach(clearTimeout);
  }, [animate, cards]);

  return (
    <div className={styles.row} style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 3)}, minmax(0, 1fr))` }}>
      {cards.map((card, k) => (
        <figure key={`${card.index}-${k}`} className={styles.item}>
          <span className={styles.pos}>{positions[k] ?? ''}</span>
          <TarotCard face={card} flipped={k < shown} />
          <figcaption className={styles.name}>
            {k < shown ? card.name : ' '}
            {k < shown && <span className={styles.ori}>{card.orientation}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
};
