import { useEffect } from 'react';
import { NeedBirth } from '../components/NeedBirth';
import { Reading } from '../components/Reading';
import { cx } from '../lib/cx';
import { fetchAsc } from '../store/chartSlice';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { fetchReading } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';
import styles from './Asc.module.css';

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

export const Asc = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const birth = useAppSelector((state) => state.profile.me?.birth ?? null);
  const asc = useAppSelector((state) => state.chart.asc.data);
  const status = useAppSelector((state) => state.chart.asc.status);
  const readingKey = asc?.available && birth ? `${birth.date}|${birth.time}|${birth.place?.name ?? ''}` : null;

  useEffect(() => {
    if (!birth || store.getState().chart.asc.status === 'ready') return;
    const request = dispatch(fetchAsc());
    return () => request.abort();
  }, [birth, dispatch, store]);

  useEffect(() => {
    if (!readingKey) return;
    const current = store.getState().readings.asc;
    if (current.key === readingKey && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'asc', key: readingKey, path: '/api/asc/reading' }));
    return () => request.abort();
  }, [readingKey, dispatch, store]);

  return (
    <section className={ui.screen}>
      <div className={cx(ui.head, ui.headCenter)}>
        <span className={ui.eyebrow}>Асцендент</span>
        <h1 className={ui.title}>Как вас видят люди</h1>
        <p className={ui.lead}>Асцендент это знак, который поднимался над горизонтом в момент вашего рождения. По традиции он описывает первое впечатление.</p>
      </div>
      {!birth && <NeedBirth returnTo="asc" title="Нужны данные рождения" text="Асцендент считается по дате, точному времени и городу рождения." />}
      {status === 'error' && <p className={ui.error}>Не получилось посчитать асцендент. Откройте экран ещё раз.</p>}
      {asc && !asc.available && (
        <NeedBirth
          returnTo="asc"
          title={asc.reason === 'no_place' ? 'Нужны время и город рождения' : 'Нужно время рождения'}
          text="Асцендент меняется примерно каждые два часа, поэтому без точного времени его не посчитать. Время можно найти в свидетельстве о рождении или спросить у родных."
          button="Указать время и город"
        />
      )}
      {asc?.available && asc.signIndex !== null && (
        <>
          <div className={styles.badge}>
            <span className={styles.glyph} aria-hidden="true">
              {SIGN_GLYPHS[asc.signIndex]}
              {'︎'}
            </span>
            <span className={styles.sign}>{asc.sign}</span>
            <span className={ui.hint}>{asc.degree}° асцендента</span>
          </div>
          <Reading kind="asc" />
        </>
      )}
    </section>
  );
};
