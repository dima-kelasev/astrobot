import { useState, type FormEvent } from 'react';
import type { BirthInput } from '../api/client';
import type { City } from '../api/schemas';
import { cx } from '../lib/cx';
import ui from '../styles/ui.module.css';
import { telegram } from '../telegram';
import { BirthDateField } from './BirthDateField';
import { CityField } from './CityField';
import { TimeField } from './TimeField';

export type BirthFormValue = BirthInput & { name: string };

type Props = {
  idPrefix: string;
  max: string;
  initialDate?: string;
  initialTime?: string | null;
  initialPlace?: { name: string; label: string } | null;
  withName?: boolean;
  consent?: { required: boolean; privacyUrl: string };
  busy: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (value: BirthFormValue) => void;
};

const ERRORS: Record<string, string> = {
  need_place: 'Чтобы учесть время рождения, выберите город из списка.',
  bad_birth: 'Проверьте дату рождения.',
  bad_place: 'Город не найден. Выберите его из списка ещё раз.',
  no_consent: 'Нужно согласие на обработку данных.',
  limit: 'Лимит на сегодня исчерпан. Завтра можно будет добавить ещё.',
  premium: 'Эта функция доступна по подписке.'
};

export const BirthForm = ({ idPrefix, max, initialDate = '', initialTime = null, initialPlace = null, withName = false, consent, busy, error, submitLabel, onSubmit }: Props) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState<string | null>(initialTime);
  const [place, setPlace] = useState<City | null>(null);
  const [keepPlace, setKeepPlace] = useState(initialPlace !== null);
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (withName && !name.trim()) return setProblem('Напишите имя, чтобы потом не перепутать.');
    if (!date) return setProblem('Выберите дату рождения.');
    if (time && !place && !keepPlace) return setProblem(ERRORS.need_place);
    if (consent?.required && !agreed) return setProblem(ERRORS.no_consent);
    setProblem(null);
    const placeInput = place ? { placeId: place.id, placeName: place.name } : { placeId: null };
    onSubmit({ name: name.trim(), date, time, ...(keepPlace && !place ? { placeId: null, keepPlace: true } : placeInput) });
  };

  const shown = problem ?? (error ? (ERRORS[error] ?? 'Не получилось сохранить. Попробуйте ещё раз.') : null);

  return (
    <form className={cx(ui.glass, ui.field)} onSubmit={submit}>
      {withName && (
        <>
          <label className={ui.label} htmlFor={`${idPrefix}Name`}>
            Имя
          </label>
          <input id={`${idPrefix}Name`} className={ui.input} type="text" maxLength={40} placeholder="Как его или её зовут" value={name} disabled={busy} onChange={(event) => setName(event.target.value)} />
        </>
      )}
      <label className={ui.label} htmlFor={`${idPrefix}Date`}>
        Дата рождения
      </label>
      <BirthDateField id={`${idPrefix}Date`} value={initialDate} max={max} disabled={busy} onChange={setDate} />
      <label className={ui.label} htmlFor={`${idPrefix}Time`}>
        Время рождения
      </label>
      <TimeField id={`${idPrefix}Time`} value={initialTime} unknown={Boolean(initialDate) && initialTime === null} disabled={busy} onChange={setTime} />
      <p className={ui.hint}>Без времени расчёт будет неточным: не получится узнать асцендент и дома.</p>
      <label className={ui.label} htmlFor={`${idPrefix}City`}>
        Город рождения
      </label>
      {keepPlace && initialPlace ? (
        <div className={ui.row}>
          <span>
            {initialPlace.name}
            <span className={ui.listDesc}>{initialPlace.label ? `, ${initialPlace.label}` : ''}</span>
          </span>
          <button className={cx(ui.btn, ui.btnGhost, ui.btnSmall)} type="button" disabled={busy} onClick={() => setKeepPlace(false)}>
            Изменить
          </button>
        </div>
      ) : (
        <CityField id={`${idPrefix}City`} value={place} disabled={busy} onChange={setPlace} />
      )}
      {consent?.required && (
        <label className={ui.check}>
          <input type="checkbox" checked={agreed} disabled={busy} onChange={(event) => setAgreed(event.target.checked)} />
          <span>
            Соглашаюсь на обработку даты, времени и места рождения для расчёта карты.{' '}
            {consent.privacyUrl && (
              <button className={ui.link} type="button" onClick={() => telegram.openLink(consent.privacyUrl)}>
                Политика обработки данных
              </button>
            )}
          </span>
        </label>
      )}
      {shown && <p className={ui.error}>{shown}</p>}
      <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="submit" disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
};
