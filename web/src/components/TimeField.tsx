import { useState } from 'react';
import ui from '../styles/ui.module.css';
import date from './BirthDateField.module.css';
import styles from './TimeField.module.css';

const HOURS = Array.from({ length: 24 }, (_, k) => String(k).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, k) => String(k).padStart(2, '0'));

type Props = { id: string; value: string | null; unknown: boolean; disabled?: boolean; onChange: (value: string | null) => void };

export const TimeField = ({ id, value, unknown: initialUnknown, disabled = false, onChange }: Props) => {
  const [hour, setHour] = useState(value ? value.slice(0, 2) : '');
  const [minute, setMinute] = useState(value ? value.slice(3, 5) : '');
  const [unknown, setUnknown] = useState(initialUnknown);

  const update = (nextHour: string, nextMinute: string) => {
    setHour(nextHour);
    setMinute(nextMinute);
    onChange(nextHour && nextMinute ? `${nextHour}:${nextMinute}` : null);
  };

  return (
    <div className={styles.wrap}>
      {!unknown && (
        <div className={styles.fields}>
          <select id={id} className={date.select} aria-label="Часы" value={hour} disabled={disabled} onChange={(event) => update(event.target.value, minute || '00')}>
            <option value="">Часы</option>
            {HOURS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className={date.select} aria-label="Минуты" value={minute} disabled={disabled} onChange={(event) => update(hour, event.target.value)}>
            <option value="">Минуты</option>
            {MINUTES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className={ui.check}>
        <input
          type="checkbox"
          checked={unknown}
          disabled={disabled}
          onChange={(event) => {
            setUnknown(event.target.checked);
            if (event.target.checked) onChange(null);
            else onChange(hour && minute ? `${hour}:${minute}` : null);
          }}
        />
        <span>Не знаю время рождения</span>
      </label>
    </div>
  );
};
