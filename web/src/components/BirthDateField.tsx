import { useState } from 'react';
import styles from './BirthDateField.module.css';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'] as const;
const FIRST_YEAR = 1900;

const pad = (value: string) => value.padStart(2, '0');
const daysIn = (year: string, month: string) => (month ? new Date(year ? Number(year) : 2000, Number(month), 0).getDate() : 31);
const trimZero = (value: string | undefined) => (value ? String(Number(value)) : '');

type Props = { id: string; value: string; max: string; disabled?: boolean; onChange: (value: string) => void };

export const BirthDateField = ({ id, value, max, disabled = false, onChange }: Props) => {
  const [initialYear, initialMonth, initialDay] = value.split('-');
  const [day, setDay] = useState(trimZero(initialDay));
  const [month, setMonth] = useState(trimZero(initialMonth));
  const [year, setYear] = useState(value ? initialYear : '');
  const limit = max || new Date().toISOString().slice(0, 10);
  const lastYear = Number(limit.slice(0, 4));
  const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, k) => String(lastYear - k));
  const days = Array.from({ length: daysIn(year, month) }, (_, k) => String(k + 1));
  const complete = Boolean(day && month && year);
  const future = complete && `${year}-${pad(month)}-${pad(day)}` > limit;

  const update = (nextDay: string, nextMonth: string, nextYear: string) => {
    const count = daysIn(nextYear, nextMonth);
    const fixedDay = nextDay && Number(nextDay) > count ? String(count) : nextDay;
    setDay(fixedDay);
    setMonth(nextMonth);
    setYear(nextYear);
    const next = fixedDay && nextMonth && nextYear ? `${nextYear}-${pad(nextMonth)}-${pad(fixedDay)}` : '';
    onChange(next && next <= limit ? next : '');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.fields}>
        <select id={id} className={styles.select} aria-label="День" value={day} disabled={disabled} onChange={(event) => update(event.target.value, month, year)}>
          <option value="">День</option>
          {days.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className={styles.select} aria-label="Месяц" value={month} disabled={disabled} onChange={(event) => update(day, event.target.value, year)}>
          <option value="">Месяц</option>
          {MONTHS.map((name, k) => (
            <option key={name} value={String(k + 1)}>
              {name}
            </option>
          ))}
        </select>
        <select className={styles.select} aria-label="Год" value={year} disabled={disabled} onChange={(event) => update(day, month, event.target.value)}>
          <option value="">Год</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      {future && <p className={styles.warn}>Эта дата ещё не наступила.</p>}
    </div>
  );
};
