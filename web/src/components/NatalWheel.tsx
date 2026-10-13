import type { KeyboardEvent } from 'react';
import type { Natal } from '../api/schemas';
import { cx } from '../lib/cx';
import styles from './NatalWheel.module.css';

const rad = Math.PI / 180;
const TEXT = '︎';
const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
const R_OUT = 150;
const R_SIGN = 124;
const R_HOUSE = 104;
const R_PLANET = 86;
const R_CORE = 62;
const ASPECT_ANGLES = [
  { angle: 60, kind: 'soft' },
  { angle: 90, kind: 'hard' },
  { angle: 120, kind: 'soft' },
  { angle: 180, kind: 'hard' }
] as const;

const norm = (x: number) => ((x % 360) + 360) % 360;

const spread = (lons: number[], gap: number) => {
  const order = lons.map((lon, i) => ({ lon, i })).sort((a, b) => a.lon - b.lon);
  const placed = order.map((item) => item.lon);
  for (let pass = 0; pass < 6; pass++) {
    for (let k = 1; k < placed.length; k++) {
      if (placed[k] - placed[k - 1] < gap) placed[k] = placed[k - 1] + gap;
    }
  }
  const result: number[] = new Array(lons.length);
  order.forEach((item, k) => {
    result[item.i] = placed[k];
  });
  return result;
};

type Props = { natal: Natal; selected: string | null; onSelect: (part: string) => void };

const onKey = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
};

export const NatalWheel = ({ natal, selected, onSelect }: Props) => {
  const base = natal.asc ?? 0;
  const at = (lon: number, r: number) => {
    const theta = (180 + norm(lon - base)) * rad;
    return { x: r * Math.cos(theta), y: -r * Math.sin(theta) };
  };
  const planets = natal.points.filter((point) => point.key !== 'asc' && point.key !== 'mc');
  const shown = spread(
    planets.map((point) => point.lon),
    8
  );
  const lines: { a: number; b: number; keys: string[]; kind: 'soft' | 'hard' }[] = [];
  const main = planets.filter((point) => point.key !== 'node');
  for (let i = 0; i < main.length; i++) {
    for (let j = i + 1; j < main.length; j++) {
      const diff = Math.abs(norm(main[i].lon - main[j].lon + 180) - 180);
      const hit = ASPECT_ANGLES.find((aspect) => Math.abs(diff - aspect.angle) <= 5);
      if (hit) lines.push({ a: main[i].lon, b: main[j].lon, keys: [main[i].key, main[j].key], kind: hit.kind });
    }
  }

  return (
    <svg className={styles.wheel} viewBox="-160 -160 320 320" role="img" aria-label="Натальная карта">
      <circle r={R_OUT} className={styles.ring} />
      <circle r={R_SIGN} className={styles.ring} />
      <circle r={R_HOUSE} className={styles.ringSoft} />
      <circle r={R_CORE} className={styles.ringSoft} />
      {SIGN_GLYPHS.map((glyph, k) => {
        const start = at(k * 30, R_OUT);
        const end = at(k * 30, R_SIGN);
        const label = at(k * 30 + 15, (R_OUT + R_SIGN) / 2);
        return (
          <g key={glyph}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.tick} />
            <text x={label.x} y={label.y} className={`${styles.sign} ${styles[ELEMENTS[k % 4]]}`}>
              {glyph + TEXT}
            </text>
          </g>
        );
      })}
      {natal.cusps?.map((cusp, k) => {
        const outer = at(cusp, R_SIGN);
        const inner = at(cusp, R_CORE);
        const next = natal.cusps?.[(k + 1) % 12] ?? cusp;
        const mid = at(cusp + norm(next - cusp) / 2, (R_HOUSE + R_SIGN) / 2 - 2);
        const axis = k === 0 || k === 3 || k === 6 || k === 9;
        const part = `house${k + 1}`;
        const open = () => onSelect(part);
        return (
          <g key={k}>
            <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} className={axis ? styles.axis : styles.cusp} />
            <g className={styles.hit} role="button" tabIndex={0} aria-label={`${k + 1} дом`} onClick={open} onKeyDown={onKey(open)}>
              <circle cx={mid.x} cy={mid.y} r={7} className={cx(styles.halo, selected === part && styles.haloOn)} />
              <text x={mid.x} y={mid.y} className={cx(styles.house, selected === part && styles.houseOn)}>
                {k + 1}
              </text>
            </g>
          </g>
        );
      })}
      {lines.map((line, k) => {
        const a = at(line.a, R_CORE);
        const b = at(line.b, R_CORE);
        const dim = selected !== null && !line.keys.includes(selected);
        return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={cx(line.kind === 'hard' ? styles.hard : styles.soft, dim && styles.dim)} />;
      })}
      {planets.map((point, k) => {
        const spot = at(shown[k], R_PLANET);
        const dot = at(point.lon, R_HOUSE);
        const open = () => onSelect(point.key);
        const on = selected === point.key;
        return (
          <g key={point.key}>
            <circle cx={dot.x} cy={dot.y} r={1.6} className={styles.dot} />
            <g className={styles.hit} role="button" tabIndex={0} aria-label={point.name} onClick={open} onKeyDown={onKey(open)}>
              <circle cx={spot.x} cy={spot.y} r={9} className={cx(styles.halo, on && styles.haloOn)} />
              <text x={spot.x} y={spot.y} className={cx(styles.planet, on && styles.planetOn)}>
                {point.glyph + TEXT}
              </text>
            </g>
          </g>
        );
      })}
      {natal.asc !== null && (
        <text x={at(natal.asc, R_OUT + 1).x - 14} y={at(natal.asc, R_OUT + 1).y - 6} className={styles.angle}>
          ASC
        </text>
      )}
    </svg>
  );
};
