import { useEffect } from 'react';
import { CardsRow } from '../components/CardsRow';
import { cx } from '../lib/cx';
import { fetchHistoryItem } from '../store/historySlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import ui from '../styles/ui.module.css';
import reading from '../components/Reading.module.css';

const dateLabel = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const HistoryItem = () => {
  const dispatch = useAppDispatch();
  const kind = useAppSelector((state) => state.nav.params.historyKind);
  const key = useAppSelector((state) => state.nav.params.historyKey);
  const item = useAppSelector((state) => state.history.item);
  const status = useAppSelector((state) => state.history.itemStatus);

  useEffect(() => {
    if (!kind || !key) return;
    const request = dispatch(fetchHistoryItem({ kind, key }));
    return () => request.abort();
  }, [kind, key, dispatch]);

  const current = item && item.key === key && item.kind === kind ? item : null;

  return (
    <section className={ui.screen}>
      {status === 'error' && <p className={ui.error}>Не получилось открыть запись.</p>}
      {current && (
        <>
          <div className={ui.head}>
            <span className={ui.eyebrow}>{dateLabel(current.date)}</span>
            <h1 className={ui.title}>{current.title}</h1>
            {current.subtitle && <p className={ui.lead}>{current.subtitle}</p>}
          </div>
          {current.cards.length > 0 && <CardsRow cards={current.cards} positions={current.positions} />}
          <div className={cx(ui.glass, reading.reading)}>
            <p className={reading.text}>{current.text}</p>
          </div>
        </>
      )}
    </section>
  );
};
