import { useEffect } from 'react';
import { NeedBirth } from '../components/NeedBirth';
import { Reading } from '../components/Reading';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { fetchReading } from '../store/readingsSlice';
import { fetchSky } from '../store/skySlice';
import ui from '../styles/ui.module.css';
import styles from './Sky.module.css';

export const Sky = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const status = useAppSelector((state) => state.sky.status);
  const sky = useAppSelector((state) => state.sky.data);
  const birth = useAppSelector((state) => state.profile.me?.birth ?? null);
  const readingKey = sky && birth ? `${sky.day}|${birth.date}|${birth.time ?? '-'}|${birth.place?.name ?? '-'}` : null;

  useEffect(() => {
    if (!birth || store.getState().sky.status !== 'idle') return;
    const request = dispatch(fetchSky());
    return () => request.abort();
  }, [birth, dispatch, store]);

  useEffect(() => {
    if (!readingKey) return;
    const current = store.getState().readings.sky;
    if (current.key === readingKey && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'sky', key: readingKey, path: '/api/sky/reading' }));
    return () => request.abort();
  }, [readingKey, dispatch, store]);

  if (!birth) {
    return (
      <section className={ui.screen}>
        <div className={ui.head}>
          <h1 className={ui.title}>Гороскоп на сегодня</h1>
        </div>
        <NeedBirth returnTo="sky" title="Личный гороскоп" text="Гороскоп считается по Луне и транзитам к вашей карте рождения. Укажите хотя бы дату рождения." />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className={ui.screen}>
        <p className={ui.error}>Не получилось загрузить гороскоп. Проверьте интернет и откройте экран ещё раз.</p>
      </section>
    );
  }
  if (!sky) {
    return (
      <section className={ui.screen}>
        <p className={ui.lead}>Считаем положение Солнца и Луны…</p>
      </section>
    );
  }

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>{sky.dateLabel}</span>
        <h1 className={ui.title}>{sky.signName}: гороскоп на сегодня</h1>
      </div>
      <div className={styles.sky}>
        <div className={styles.wheelBox}>
          <ZodiacWheel sky={sky} />
        </div>
        <dl className={styles.facts}>
          {sky.facts.map((fact) => (
            <div key={fact.label} className={cx(styles.fact, fact.wide && styles.factWide)}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className={ui.hint}>Положения рассчитаны на полдень. Треугольник на круге отмечает ваше Солнце при рождении.</p>
      <Reading
        kind="sky"
        action={
          readingKey && (
            <button
              className={cx(ui.btn, ui.btnGhost, ui.btnSmall)}
              type="button"
              onClick={() => dispatch(fetchReading({ kind: 'sky', key: readingKey, path: '/api/sky/reading?refresh=1' }))}
            >
              Другая формулировка
            </button>
          )
        }
      />
    </section>
  );
};
