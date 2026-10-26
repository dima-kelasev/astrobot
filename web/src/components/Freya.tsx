import { useId } from 'react';
import { cx } from '../lib/cx';
import styles from './Freya.module.css';

const HEM = Array.from({ length: 8 }, (_, k) => 44 + k * 22);

const BRAID = [154, 166, 178, 190, 202, 214];

const DOTS = [
  [70, 196],
  [76, 236],
  [166, 184],
  [172, 222],
  [62, 222],
  [180, 246]
] as const;

type Props = { size?: number; className?: string; still?: boolean; withMoon?: boolean };

export const Freya = ({ size = 160, className, still = false, withMoon = true }: Props) => {
  const id = useId().replace(/:/g, '');
  const moonMask = `moon-${id}`;
  const robe = `robe-${id}`;
  return (
    <svg
      className={cx(styles.freya, !still && styles.alive, className)}
      width={size}
      height={(size * 280) / 240}
      viewBox="0 0 240 280"
      role="img"
      aria-label="Фрея"
    >
      <defs>
        <mask id={moonMask}>
          <rect width="240" height="280" fill="#fff" />
          <circle cx="140" cy="86" r="62" fill="#000" />
        </mask>
        <linearGradient id={robe} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3594" />
          <stop offset="1" stopColor="#3e2c7a" />
        </linearGradient>
      </defs>
      {withMoon && <circle cx="120" cy="72" r="62" fill="#f2c14e" mask={`url(#${moonMask})`} />}
      <g className={styles.body}>
        <path d="M28 262 L60 146 Q58 38 120 36 Q182 38 180 146 L212 262 Z" fill={`url(#${robe})`} />
        <path d="M86 160 L154 160 L176 262 L64 262 Z" fill="#4c3899" opacity="0.7" />
        <path d="M78 158 Q76 70 120 68 Q164 70 162 158 Z" fill="#35276e" />
        <path d="M76 156 Q74 64 120 62 Q166 64 164 156" fill="none" stroke="#2bb3a3" strokeWidth="5" strokeLinecap="round" />
        <path d="M82 168 L82 112 Q82 78 120 76 Q158 78 158 112 L158 168 Z" fill="#ede0ad" />
        <path d="M92 102 L148 102 L148 124 Q148 152 120 152 Q92 152 92 124 Z" fill="#f5d7c1" />
        <path d="M88 107 Q88 80 120 79 Q152 80 152 107 Q120 101 88 107 Z" fill="#ede0ad" />
        <path d="M120 85 L124 91 L120 97 L116 91 Z" fill="#f2c14e" />
        <path d="M120 30 L127 42 L120 54 L113 42 Z" fill="#f2c14e" />
        <g className={styles.eyes} fill="none" stroke="#2a2148" strokeWidth="2.2" strokeLinecap="round">
          <path d="M103 120 Q109 126 115 120" />
          <path d="M125 120 Q131 126 137 120" />
          <path d="M104.5 122.5 L102.5 125.5 M109 125 L109 128.5 M113.5 122.5 L115.5 125.5" strokeWidth="1.4" />
          <path d="M126.5 122.5 L124.5 125.5 M131 125 L131 128.5 M135.5 122.5 L137.5 125.5" strokeWidth="1.4" />
        </g>
        <circle cx="101" cy="133" r="5" fill="#f2a5a8" opacity="0.85" />
        <circle cx="139" cy="133" r="5" fill="#f2a5a8" opacity="0.85" />
        <path d="M114 139 Q120 144 126 139" fill="none" stroke="#c4607a" strokeWidth="2" strokeLinecap="round" />
        {BRAID.map((y) => (
          <ellipse key={y} cx="158" cy={y} rx="7.5" ry="7" fill="#ede0ad" stroke="#d9c88d" strokeWidth="1" />
        ))}
        <rect x="152" y="221" width="12" height="5" rx="2" fill="#2bb3a3" />
        <path d="M155 226 L158 240 L161 226 Z" fill="#ede0ad" />
        {DOTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#f2c14e" />
        ))}
        <g className={styles.card}>
          <g className={styles.cardBack}>
            <rect x="98" y="174" width="44" height="70" rx="5" fill="#5b43b0" stroke="#f2c14e" strokeWidth="2.5" />
            <rect x="103" y="179" width="34" height="60" rx="3" fill="none" stroke="#f2c14e" strokeWidth="1" opacity="0.55" />
            <circle cx="120" cy="209" r="10" fill="#f2c14e" />
            <circle cx="125" cy="205" r="9" fill="#5b43b0" />
            <circle cx="120" cy="186" r="1.8" fill="#f2c14e" />
            <circle cx="120" cy="232" r="1.8" fill="#f2c14e" />
          </g>
          {!still && (
            <g className={styles.cardFace}>
              <rect x="98" y="174" width="44" height="70" rx="5" fill="#f6eed6" stroke="#f2c14e" strokeWidth="2.5" />
              <path d="M120 194 L123.5 205.5 L135 209 L123.5 212.5 L120 224 L116.5 212.5 L105 209 L116.5 205.5 Z" fill="#f2c14e" />
              <circle cx="120" cy="209" r="3" fill="#fff6dc" />
              <path d="M112 182 L128 182" stroke="#5b43b0" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M112 236 L128 236" stroke="#5b43b0" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          )}
        </g>
        {!still && (
          <g className={styles.sparks} fill="#f2c14e">
            <path className={styles.spark} d="M90 180 L91.6 184.4 L96 186 L91.6 187.6 L90 192 L88.4 187.6 L84 186 L88.4 184.4 Z" />
            <path className={styles.spark} d="M152 172 L153.2 175.3 L156.5 176.5 L153.2 177.7 L152 181 L150.8 177.7 L147.5 176.5 L150.8 175.3 Z" />
            <path className={styles.spark} d="M150 238 L151 240.8 L153.8 241.8 L151 242.8 L150 245.6 L149 242.8 L146.2 241.8 L149 240.8 Z" />
          </g>
        )}
        <circle cx="97" cy="226" r="9" fill="#f5d7c1" />
        <circle cx="143" cy="226" r="9" fill="#f5d7c1" />
        <path d="M26 252 Q120 244 214 252 L217 267 Q120 259 23 267 Z" fill="#2bb3a3" />
        {HEM.map((x) => (
          <path key={x} d={`M${x} 251 L${x + 4} 256 L${x} 261 L${x - 4} 256 Z`} fill="#f5efdf" />
        ))}
      </g>
    </svg>
  );
};
