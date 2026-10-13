import { useEffect } from 'react';
import { Reading } from '../components/Reading';
import { TarotCard } from '../components/TarotCard';
import { cx } from '../lib/cx';
import { fetchDay, openDay } from '../store/daySlice';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { fetchReading } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';
import { telegram } from '../telegram';
import styles from './Day.module.css';

export const Day = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const status = useAppSelector((state) => state.day.status);
  const data = useAppSelector((state) => state.day.data);
  const errorCode = useAppSelector((state) => state.day.errorCode);
  const card = data?.card ?? null;
  const readingKey = data?.opened ? data.day : null;

  useEffect(() => {
    if (store.getState().day.status !== 'idle') return;
    const request = dispatch(fetchDay());
    return () => request.abort();
  }, [dispatch, store]);

  useEffect(() => {
    if (!readingKey) return;
    const current = store.getState().readings.day;
    if (current.key === readingKey && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'day', key: readingKey, path: '/api/day/reading' }));
    return () => request.abort();
  }, [readingKey, dispatch, store]);

  return (
    <section className={ui.screen}>
      <div className={cx(ui.head, ui.headCenter)}>
        <h1 className={ui.title}>Карта дня</h1>
        <p className={ui.lead}>Одна карта на весь день. До полуночи она не меняется.</p>
      </div>
      <div className={styles.wrap}>
        <button
          className={styles.card}
          type="button"
          disabled={status !== 'ready' || card !== null}
          aria-label={card ? `Карта дня: ${card.name}, ${card.orientation}` : 'Открыть карту дня'}
          onClick={() => {
            telegram.impact('medium');
            dispatch(openDay());
          }}
        >
          <TarotCard face={card} flipped={card !== null} floating={card === null} />
        </button>
        <span className={styles.ori}>{card ? `Аркан ${card.roman} · ${card.orientation}` : 'Карта закрыта'}</span>
        <span className={styles.name}>{card ? card.name : 'Коснитесь карты'}</span>
        {card && <span className={ui.hint}>{card.meaning}</span>}
        {(status === 'error' || errorCode) && <p className={ui.error}>Не получилось загрузить карту. Попробуйте открыть экран ещё раз.</p>}
      </div>
      <Reading kind="day" />
    </section>
  );
};
