import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { City } from '../api/schemas';
import { cx } from '../lib/cx';
import ui from '../styles/ui.module.css';
import styles from './CityField.module.css';

type Props = { id: string; value: City | null; disabled?: boolean; onChange: (city: City | null) => void };

export const CityField = ({ id, value, disabled = false, onChange }: Props) => {
  const [text, setText] = useState(value ? value.name : '');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const query = text.trim();
  const searching = open && query.length >= 2 && (!value || value.name !== text);

  useEffect(() => {
    if (!searching) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      api
        .cities(query, ctl.signal)
        .then((data) => {
          setResults(data.cities);
          setFailed(false);
        })
        .catch(() => {
          if (!ctl.signal.aborted) setFailed(true);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [query, searching]);

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        className={ui.input}
        type="text"
        autoComplete="off"
        placeholder="Начните вводить город"
        value={text}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
      />
      {value && <span className={ui.hint}>{value.label}</span>}
      {searching && results.length > 0 && (
        <ul className={cx(ui.glass, styles.menu)} role="listbox">
          {results.map((city) => (
            <li key={`${city.id}-${city.name}`}>
              <button
                className={styles.option}
                type="button"
                onClick={() => {
                  onChange(city);
                  setText(city.name);
                  setOpen(false);
                }}
              >
                <span>{city.name}</span>
                <span className={ui.listDesc}>{city.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searching && failed && <span className={ui.error}>Не получилось найти город. Проверьте интернет.</span>}
    </div>
  );
};
