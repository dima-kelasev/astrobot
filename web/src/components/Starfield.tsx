import { useEffect, useRef } from 'react';
import styles from './Starfield.module.css';

type Star = { x: number; y: number; r: number; a: number; s: number; p: number };

type Meteor = { x: number; y: number; dx: number; dy: number; length: number; start: number; life: number; width: number };

const makeStars = (width: number, height: number): Star[] =>
  Array.from({ length: Math.min(380, Math.round((width * height) / 5200)) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() < 0.12 ? 1.5 + Math.random() : 0.4 + Math.random() * 0.8,
    a: 0.3 + Math.random() * 0.6,
    s: 0.4 + Math.random() * 1.4,
    p: Math.random() * 6.283
  }));

const makeMeteor = (width: number, height: number, time: number): Meteor => {
  const angle = (25 + Math.random() * 20) * (Math.PI / 180);
  const speed = 0.7 + Math.random() * 0.5;
  const direction = Math.random() < 0.75 ? -1 : 1;
  return {
    x: direction < 0 ? width * (0.35 + Math.random() * 0.75) : width * Math.random() * 0.6,
    y: height * Math.random() * 0.45,
    dx: Math.cos(angle) * speed * direction,
    dy: Math.sin(angle) * speed,
    length: 90 + Math.random() * 110,
    start: time,
    life: 900 + Math.random() * 600,
    width: 1 + Math.random() * 0.8
  };
};

const nextDelay = () => 700 + Math.random() * 1800;

export const Starfield = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#F4EFFF';
    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    let nextMeteor = 500;
    let frame = 0;
    let last = 0;

    const drawMeteor = (meteor: Meteor, time: number) => {
      const t = (time - meteor.start) / meteor.life;
      const travelled = t * meteor.life;
      const headX = meteor.x + meteor.dx * travelled;
      const headY = meteor.y + meteor.dy * travelled;
      const norm = Math.hypot(meteor.dx, meteor.dy);
      const tail = meteor.length * Math.min(1, t * 3);
      const tailX = headX - (meteor.dx / norm) * tail;
      const tailY = headY - (meteor.dy / norm) * tail;
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const gradient = ctx.createLinearGradient(headX, headY, tailX, tailY);
      gradient.addColorStop(0, `rgba(255, 244, 220, ${0.95 * fade})`);
      gradient.addColorStop(0.25, `rgba(243, 201, 122, ${0.5 * fade})`);
      gradient.addColorStop(1, 'rgba(185, 162, 255, 0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = meteor.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#fff6e0';
      ctx.shadowColor = 'rgba(243, 201, 122, 0.9)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(headX, headY, meteor.width * 1.1, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

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
      if (reduceMotion) return;
      if (time >= nextMeteor) {
        meteors.push(makeMeteor(window.innerWidth, window.innerHeight, time));
        if (Math.random() < 0.35) meteors.push(makeMeteor(window.innerWidth, window.innerHeight, time + 200 + Math.random() * 300));
        nextMeteor = time + nextDelay();
      }
      meteors = meteors.filter((meteor) => time - meteor.start < meteor.life);
      for (const meteor of meteors) {
        if (time >= meteor.start) drawMeteor(meteor, time);
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(window.innerWidth, window.innerHeight);
      meteors = [];
      draw(last);
    };

    const tick = (time: number) => {
      if (document.hidden) {
        nextMeteor = time + nextDelay();
      } else if (time - last > 16) {
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
