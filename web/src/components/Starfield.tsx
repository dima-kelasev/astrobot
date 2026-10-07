import { useEffect, useRef } from 'react';
import styles from './Starfield.module.css';

type Star = { x: number; y: number; r: number; a: number; s: number; p: number };

const makeStars = (width: number, height: number): Star[] =>
  Array.from({ length: Math.min(220, Math.round((width * height) / 9000)) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() < 0.12 ? 1.5 + Math.random() : 0.4 + Math.random() * 0.8,
    a: 0.3 + Math.random() * 0.6,
    s: 0.4 + Math.random() * 1.4,
    p: Math.random() * 6.283
  }));

export const Starfield = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#F4EFFF';
    let stars: Star[] = [];
    let frame = 0;
    let last = 0;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = color;
      for (const star of stars) {
        ctx.globalAlpha = star.a * (reduceMotion ? 1 : 0.6 + 0.4 * Math.sin((time / 1000) * star.s + star.p));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(window.innerWidth, window.innerHeight);
      draw(0);
    };

    const tick = (time: number) => {
      if (!document.hidden && time - last > 33) {
        last = time;
        draw(time);
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} className={styles.stars} aria-hidden="true" />;
};
