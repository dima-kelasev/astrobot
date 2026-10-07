import styles from './Stars.module.css';

const COUNT = 150;
const WIDTH = 1200;
const HEIGHT = 2400;

const random = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const next = random(2027);

const STARS = Array.from({ length: COUNT }, (_, index) => ({
  id: index,
  x: Math.round(next() * WIDTH),
  y: Math.round(next() * HEIGHT),
  r: next() < 0.12 ? 1.6 + next() : 0.5 + next() * 0.8,
  opacity: Number((0.3 + next() * 0.6).toFixed(2)),
  group: index % 3
}));

const GROUPS = [styles.a, styles.b, styles.c];

export const Stars = () => (
  <svg className={styles.stars} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    {GROUPS.map((group, index) => (
      <g key={group} className={group}>
        {STARS.filter((star) => star.group === index).map((star) => (
          <circle key={star.id} cx={star.x} cy={star.y} r={star.r.toFixed(2)} opacity={star.opacity} />
        ))}
      </g>
    ))}
  </svg>
);
