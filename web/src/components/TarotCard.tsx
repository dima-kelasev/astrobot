import type { Card } from '../api/schemas';
import { cx } from '../lib/cx';
import styles from './TarotCard.module.css';

const rad = Math.PI / 180;

const starPath = (points: number, step: number, radius: number) => {
  const point = (k: number) => {
    const angle = (-90 + (360 * k) / points) * rad;
    return `${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`;
  };
  let d = '';
  for (let k = 0; k < points; k++) d += `M${point(k)}L${point((k + step) % points)}`;
  return d;
};

const Emblem = ({ index }: { index: number }) => {
  const points = 3 + (index % 9);
  const rings = [14, 22].slice(0, Math.floor(index / 9));
  return (
    <svg className={styles.emblem} viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="43" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle r="36" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 3" />
      <path d={starPath(points, points > 4 ? 2 : 1, 36)} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {rings.map((radius) => (
        <circle key={radius} r={radius} fill="none" stroke="currentColor" strokeWidth="0.6" />
      ))}
      <circle r="3" fill="currentColor" />
    </svg>
  );
};

type Props = { face: Card | null; flipped: boolean; floating?: boolean; floatDelay?: number };

export const TarotCard = ({ face, flipped, floating = false, floatDelay = 0 }: Props) => (
  <span className={styles.card}>
    <span className={cx(styles.float, floating && styles.floating)} style={floating ? { animationDelay: `${floatDelay}s` } : undefined}>
      <span className={cx(styles.inner, flipped && styles.flipped)}>
        <span className={styles.back}>
          <svg className={styles.backStar} viewBox="-50 -80 100 160" aria-hidden="true">
            <circle cy="-56" r="3" fill="currentColor" />
            <path d="M8 -24 A26 26 0 1 0 8 24 A21 21 0 1 1 8 -24 Z" fill="currentColor" />
            <circle cy="56" r="3" fill="currentColor" />
          </svg>
        </span>
        <span className={styles.face}>
          {face && (
            <span className={cx(styles.art, face.reversed && styles.reversed)}>
              <span className={styles.num}>{face.roman}</span>
              <Emblem index={face.index} />
              <span className={styles.name}>{face.name}</span>
            </span>
          )}
        </span>
      </span>
    </span>
  </span>
);
