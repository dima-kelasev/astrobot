'use client';

import { useEffect, useRef } from 'react';
import styles from './Meteors.module.css';

type Meteor = { x: number; y: number; dx: number; dy: number; length: number; start: number; life: number; width: number };

const makeMeteor = (width: number, height: number, time: number): Meteor => {
  const angle = (25 + Math.random() * 20) * (Math.PI / 180);
  const speed = 0.7 + Math.random() * 0.5;
  const direction = Math.random() < 0.75 ? -1 : 1;
  return {
    x: direction < 0 ? width * (0.35 + Math.random() * 0.75) : width * Math.random() * 0.6,
    y: height * Math.random() * 0.7,
    dx: Math.cos(angle) * speed * direction,
    dy: Math.sin(angle) * speed,
    length: 90 + Math.random() * 110,
    start: time,
    life: 900 + Math.random() * 600,
    width: 1 + Math.random() * 0.8
  };
};

const nextDelay = () => 250 + Math.random() * 650;

export const Meteors = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let meteors: Meteor[] = [];
    let nextMeteor = 300;
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
      if (time >= nextMeteor) {
        meteors.push(makeMeteor(window.innerWidth, window.innerHeight, time));
        const extra = Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 2) : 0;
        for (let k = 1; k <= extra; k++) meteors.push(makeMeteor(window.innerWidth, window.innerHeight, time + k * (150 + Math.random() * 250)));
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
      meteors = [];
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
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} className={styles.meteors} aria-hidden="true" />;
};
