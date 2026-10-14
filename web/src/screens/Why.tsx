import { useEffect } from 'react';
import { NeedBirth } from '../components/NeedBirth';
import { Paywall } from '../components/Paywall';
import { Reading } from '../components/Reading';
import { cx } from '../lib/cx';
import { fetchWhy } from '../store/chartSlice';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { askBirth } from '../store/navSlice';
import { fetchReading } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';

export const Why = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const birth = useAppSelector((state) => state.profile.me?.birth ?? null);
  const day = useAppSelector((state) => state.profile.me?.today.day ?? '');
  const why = useAppSelector((state) => state.chart.why.data);
  const status = useAppSelector((state) => state.chart.why.status);
  const allowed = useAppSelector((state) => state.profile.me?.access.why ?? true);
  const readingKey = why && birth && allowed ? `${day}|${birth.date}|${birth.time ?? '-'}|${birth.place?.name ?? '-'}` : null;

  useEffect(() => {
    if (!birth || store.getState().chart.why.status === 'ready') return;
    const request = dispatch(fetchWhy());
    return () => request.abort();
  }, [birth, dispatch, store]);

  useEffect(() => {
    if (!readingKey) return;
    const current = store.getState().readings.why;
    if (current.key === readingKey && current.status !== 'idle' && current.status !== 'error') return;
    const request = dispatch(fetchReading({ kind: 'why', key: readingKey, path: '/api/why/reading' }));
    return () => request.abort();
  }, [readingKey, dispatch, store]);

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Транзиты</span>
        <h1 className={ui.title}>Почему сейчас так?</h1>
        <p className={ui.lead}>
          Медленные планеты сейчас стоят под особыми углами к планетам вашей карты рождения. По астрологической традиции так объясняют, почему в жизни наступает
          тот или иной период.
        </p>
      </div>
      {!birth && (
        <NeedBirth returnTo="why" title="Нужны данные рождения" text="Чтобы сравнить нынешнее небо с вашей картой, нужны дата, время и город рождения." />
      )}
      {status === 'error' && <p className={ui.error}>Не получилось посчитать транзиты. Откройте экран ещё раз.</p>}
      {why && (
        <>
          <div className={cx(ui.glass, ui.field)}>
            <span className={ui.label}>Что сейчас активно</span>
            {why.transits.length ? (
              <ul className={ui.lines}>
                {why.transits.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className={ui.hint}>Точных медленных транзитов к вашей карте сейчас нет: по традиции это ровный период.</p>
            )}
            {why.retro.length > 0 && <p className={ui.hint}>Сейчас ретроградны: {why.retro.join(', ')}.</p>}
          </div>
          {!why.hasTime && (
            <div className={cx(ui.glass, ui.notice)}>
              <p className={ui.hint}>Без времени рождения не видно, в каких сферах жизни проходят планеты. С временем ответ будет точнее.</p>
              <button className={cx(ui.btn, ui.btnGhost, ui.btnSmall)} type="button" onClick={() => dispatch(askBirth('why'))}>
                Указать время
              </button>
            </div>
          )}
          {allowed ? (
            <Reading kind="why" />
          ) : (
            <Paywall
              title="Что это значит для вас"
              text="Подробный разбор: как эти влияния проявятся в отношениях, работе, деньгах и состоянии, и что с этим делать."
              topics={['Отношения', 'Работа', 'Деньги', 'Состояние']}
            />
          )}
        </>
      )}
    </section>
  );
};
