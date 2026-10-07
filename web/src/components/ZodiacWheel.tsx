import type { Sky } from '../api/schemas';
import styles from './ZodiacWheel.module.css';

const rad = Math.PI / 180;
const ABBR = ['ОВН', 'ТЛЦ', 'БЛЗ', 'РАК', 'ЛЕВ', 'ДЕВ', 'ВЕС', 'СКР', 'СТР', 'КЗР', 'ВДЛ', 'РЫБ'];

const at = (lon: number, radius: number) => ({ x: -radius * Math.cos(lon * rad), y: radius * Math.sin(lon * rad) });
const pair = (lon: number, radius: number) => {
  const point = at(lon, radius);
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
};

export const ZodiacWheel = ({ sky }: { sky: Sky }) => {
  const start = sky.natalSignIndex * 30;
  const sun = at(sky.sunLon, 52);
  const moon = at(sky.moonLon, 30);
  const ticks = Array.from({ length: 36 }, (_, t) => t).filter((t) => t % 3 !== 0);
  return (
    <svg className={styles.wheel} viewBox="-114 -114 228 228" role="img" aria-label={`Зодиакальный круг: Луна в ${sky.moonSign}, ваш знак ${sky.signName}`}>
      <path
        d={`M${pair(start, 100)}A100,100 0 0 0 ${pair(start + 30, 100)}L${pair(start + 30, 74)}A74,74 0 0 1 ${pair(start, 74)}Z`}
        className={styles.natalSector}
      />
      <circle r="100" className={styles.ring} />
      <circle r="74" className={styles.ring} />
      {ABBR.map((label, s) => {
        const a = at(s * 30, 74);
        const b = at(s * 30, 100);
        const text = at(s * 30 + 15, 87);
        return (
          <g key={label}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.divider} />
            <text x={text.x} y={text.y} textAnchor="middle" dominantBaseline="central" className={s === sky.natalSignIndex ? styles.labelOwn : styles.label}>
              {label}
            </text>
          </g>
        );
      })}
      {ticks.map((t) => {
        const a = at(t * 10, 74);
        const b = at(t * 10, 70);
        return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.tick} />;
      })}
      <line x1="0" y1="0" x2={sun.x} y2={sun.y} className={styles.hand} />
      <line x1="0" y1="0" x2={moon.x} y2={moon.y} className={styles.hand} />
      <circle cx={sun.x} cy={sun.y} r="8" className={styles.sunDisc} />
      <circle cx={sun.x} cy={sun.y} r="2.2" className={styles.sunDot} />
      <g transform={`translate(${moon.x} ${moon.y})`}>
        <circle r="9" className={styles.moonDisc} />
        <path d="M0,-7A7,7 0 0 0 0,7A4,7 0 0 1 0,-7Z" className={styles.moon} />
      </g>
      <path d={`M${pair(sky.natalLon, 102)}L${pair(sky.natalLon - 3.2, 112)}L${pair(sky.natalLon + 3.2, 112)}Z`} className={styles.natalMark} />
      <circle r="1.8" className={styles.moon} />
    </svg>
  );
};
