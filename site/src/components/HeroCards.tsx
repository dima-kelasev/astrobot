import styles from './HeroCards.module.css';

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

const BACK_STAR = starPath(8, 3, 44);
const FACE_STAR = starPath(8, 3, 36);

const Back = ({ className }: { className: string }) => (
  <span className={`${styles.card} ${className}`}>
    <span className={`${styles.body} ${styles.back}`}>
      <svg className={styles.backStar} viewBox="-50 -50 100 100">
        <circle r="44" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d={BACK_STAR} fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle r="15" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 3" />
        <circle r="4" fill="currentColor" />
      </svg>
    </span>
  </span>
);

export const HeroCards = () => (
  <div className={styles.fan} aria-hidden="true">
    <Back className={styles.left} />
    <Back className={styles.right} />
    <span className={`${styles.card} ${styles.middle}`}>
      <span className={`${styles.body} ${styles.face}`}>
        <span className={styles.num}>XVII</span>
        <svg className={styles.emblem} viewBox="-50 -50 100 100">
          <circle r="43" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle r="36" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 3" />
          <path d={FACE_STAR} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <circle r="14" fill="none" stroke="currentColor" strokeWidth="0.6" />
          <circle r="3" fill="currentColor" />
        </svg>
        <span className={styles.name}>Звезда</span>
      </span>
    </span>
  </div>
);
