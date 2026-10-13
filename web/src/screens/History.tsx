import { useEffect } from 'react';
import { cx } from '../lib/cx';
import { fetchHistory } from '../store/historySlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openHistoryItem } from '../store/navSlice';
import ui from '../styles/ui.module.css';

const dateLabel = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(iso));

export const History = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.history.items);
  const status = useAppSelector((state) => state.history.status);

  useEffect(() => {
    const request = dispatch(fetchHistory());
    return () => request.abort();
  }, [dispatch]);

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Дневник</span>
        <h1 className={ui.title}>История</h1>
        <p className={ui.lead}>Здесь сохраняются ваши расклады, ответы и разборы. К ним можно вернуться в любой момент.</p>
      </div>
      {status === 'error' && <p className={ui.error}>Не получилось загрузить историю. Откройте экран ещё раз.</p>}
      {status === 'ready' && items.length === 0 && <p className={ui.hint}>Пока пусто. Задайте вопрос или сделайте расклад, и он появится здесь.</p>}
      {items.length > 0 && (
        <div className={cx(ui.glass, ui.list)}>
          {items.map((item) => (
            <button key={`${item.kind}:${item.key}`} className={ui.listItem} type="button" onClick={() => dispatch(openHistoryItem({ kind: item.kind, key: item.key }))}>
              <span className={ui.listText}>
                <span className={ui.listTitle}>{item.title}</span>
                <span className={ui.listDesc}>{[item.subtitle, dateLabel(item.date)].filter(Boolean).join(' · ')}</span>
              </span>
              <span className={ui.chevron} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
