import { useState } from 'react';
import { BirthDateField } from '../components/BirthDateField';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateMe } from '../store/profileSlice';
import ui from '../styles/ui.module.css';
import styles from './Onboarding.module.css';

export const Onboarding = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  const saving = useAppSelector((state) => state.profile.saving);
  const saveError = useAppSelector((state) => state.profile.saveError);
  const [birthDate, setBirthDate] = useState('');
  const hello = me?.firstName ? `Здравствуйте, ${me.firstName}!` : 'Здравствуйте!';
  return (
    <section className={cx(ui.screen, styles.wrap)}>
      <div className={cx(ui.head, ui.headCenter)}>
        <h1 className={ui.title}>{hello}</h1>
        <p className={ui.lead}>Укажите дату рождения. По ней считаются ваш знак, гороскоп и карта дня.</p>
      </div>
      <form
        className={cx(ui.glass, styles.form)}
        onSubmit={(event) => {
          event.preventDefault();
          if (birthDate) dispatch(updateMe({ birthDate }));
        }}
      >
        <label className={styles.label} htmlFor="onboardingBirth">
          Дата рождения
        </label>
        <BirthDateField id="onboardingBirth" value={birthDate} max={me?.today.day ?? ''} disabled={saving} onChange={setBirthDate} />
        {saveError && <p className={ui.error}>Не получилось сохранить. Проверьте дату и попробуйте ещё раз.</p>}
        <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="submit" disabled={!birthDate || saving}>
          Продолжить
        </button>
      </form>
      <p className={cx(ui.hint, styles.center)}>Дату можно изменить в профиле.</p>
    </section>
  );
};
