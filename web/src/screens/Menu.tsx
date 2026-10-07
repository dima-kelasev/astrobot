import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { go } from '../store/navSlice';
import ui from '../styles/ui.module.css';
import styles from './Menu.module.css';

export const Menu = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  if (!me) return null;
  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>
          {me.today.dateLabel} · {me.sign}
        </span>
        <h1 className={ui.title}>Что посмотрим сегодня?</h1>
        <p className={ui.lead}>{me.today.moonLine}</p>
      </div>
      <button className={cx(ui.glass, styles.tile, styles.hero)} type="button" onClick={() => dispatch(go('tarot'))}>
        <span className={styles.heroText}>
          <span className={styles.tileTitle}>Расклад Таро</span>
          <span className={styles.tileDesc}>Задайте вопрос и вытяните три карты из веера. Толкование напишет нейросеть.</span>
        </span>
        <span className={styles.miniFan} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      <div className={styles.rowTiles}>
        <button className={cx(ui.glass, styles.tile)} type="button" onClick={() => dispatch(go('day'))}>
          <span className={styles.orb} aria-hidden="true">
            <svg viewBox="-12 -12 24 24">
              <path d="M2,-9A9,9 0 1 0 2,9A6.5,9 0 1 1 2,-9Z" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.tileTitle}>Карта дня</span>
          <span className={styles.tileDesc}>Одна карта на весь день</span>
        </button>
        <button className={cx(ui.glass, styles.tile)} type="button" onClick={() => dispatch(go('sky'))}>
          <span className={cx(styles.orb, styles.orbGold)} aria-hidden="true">
            <svg viewBox="-12 -12 24 24">
              <circle r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle r="2.4" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.tileTitle}>Гороскоп</span>
          <span className={styles.tileDesc}>Небо сегодня для вашего знака</span>
        </button>
      </div>
      <div className={styles.rowTiles}>
        <div className={cx(ui.glass, styles.tile, styles.soonTile)}>
          <span className={styles.soon}>скоро</span>
          <span className={styles.tileTitle}>Натальная карта</span>
          <span className={styles.tileDesc}>Планеты и дома на момент рождения</span>
        </div>
        <div className={cx(ui.glass, styles.tile, styles.soonTile)}>
          <span className={styles.soon}>скоро</span>
          <span className={styles.tileTitle}>Совместимость</span>
          <span className={styles.tileDesc}>Два знака и их аспекты</span>
        </div>
      </div>
    </section>
  );
};
