import { useState } from 'react';
import { BirthDateField } from '../components/BirthDateField';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateMe } from '../store/profileSlice';
import ui from '../styles/ui.module.css';
import styles from './Profile.module.css';

const formatDate = (value: string) => value.split('-').reverse().join('.');

export const Profile = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  const saving = useAppSelector((state) => state.profile.saving);
  const saveError = useAppSelector((state) => state.profile.saveError);
  const savedBirth = me?.birthDate ?? '';
  const [draft, setDraft] = useState(savedBirth);
  if (!me || !savedBirth) return null;
  const changed = draft !== savedBirth;
  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Профиль</span>
        <h1 className={ui.title}>
          {me.sign}, {formatDate(savedBirth)}
        </h1>
      </div>
      <div className={cx(ui.glass, styles.field)}>
        <label className={styles.label} htmlFor="birthInput">
          Дата рождения
        </label>
        <BirthDateField key={savedBirth} id="birthInput" value={savedBirth} max={me.today.day} disabled={saving} onChange={setDraft} />
        {changed && (
          <button className={cx(ui.btn, ui.btnPrimary)} type="button" disabled={!draft || saving} onClick={() => dispatch(updateMe({ birthDate: draft }))}>
            Сохранить дату
          </button>
        )}
        <p className={ui.hint}>По дате считаются знак, гороскоп и карта дня.</p>
      </div>
      <label className={cx(ui.glass, styles.field, styles.switchRow)} htmlFor="notifyInput">
        <span className={styles.switchText}>
          <span className={styles.label}>Утренний гороскоп</span>
          <span className={ui.hint}>Бот будет присылать сообщение каждое утро.</span>
        </span>
        <input
          className={styles.switch}
          id="notifyInput"
          type="checkbox"
          role="switch"
          checked={me.notify}
          disabled={saving}
          onChange={(event) => dispatch(updateMe({ notify: event.target.checked }))}
        />
      </label>
      {saveError && <p className={ui.error}>Не получилось сохранить. Попробуйте ещё раз.</p>}
      <div className={ui.block}>
        <h2 className={ui.sub}>Как это устроено</h2>
        <ul className={cx(ui.dash, ui.col)}>
          <li>Положение Солнца и Луны, фазу и аспекты считает код.</li>
          <li>Карты перемешиваются на сервере случайным образом.</li>
          <li>Нейросеть пишет только текст толкования по этим данным.</li>
        </ul>
      </div>
    </section>
  );
};
