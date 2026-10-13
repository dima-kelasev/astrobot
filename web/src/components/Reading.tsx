import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { useAppSelector } from '../store/hooks';
import type { ReadingKind } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';
import styles from './Reading.module.css';

const NOTES: Record<string, string> = {
  no_key: 'Нейросеть на сервере не подключена. Показан базовый текст.',
  bad_key: 'Сервис нейросети не принял ключ. Показан базовый текст.',
  no_funds: 'На счёте сервиса нейросети закончились средства. Показан базовый текст.',
  bad_model: 'Сервис нейросети не знает такую модель. Показан базовый текст.',
  empty_answer: 'Нейросеть вернула пустой ответ. Показан базовый текст.',
  rate_limited: 'Слишком много запросов за час. Показан базовый текст.',
  interrupted: 'Ответ оборвался. Попробуйте открыть экран ещё раз.',
  network: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',
  unauthorized: 'Сессия устарела. Закройте мини-апп и откройте его заново из бота.'
};

const HEADING = /^([А-ЯЁ][а-яё]+(?: [а-яё]+){0,3}[.:?])(?:\s|$)/;

const renderText = (text: string) =>
  text.split('\n').map((line, index, lines) => {
    if (!line.trim()) return <span key={index} className={styles.gap} />;
    if (line.startsWith('— ') || line.startsWith('- ')) {
      return (
        <span key={index} className={styles.item}>
          {line.slice(2)}
        </span>
      );
    }
    const match = index === 0 || !lines[index - 1].trim() ? HEADING.exec(line) : null;
    if (match) {
      return (
        <span key={index} className={styles.line}>
          <b className={styles.heading}>{match[1]}</b>
          {line.slice(match[1].length)}
        </span>
      );
    }
    return (
      <span key={index} className={styles.line}>
        {line}
      </span>
    );
  });

const noteText = (code: string | null) => (code ? (NOTES[code] ?? 'Нейросеть не ответила. Показан базовый текст.') : null);

type Props = { kind: ReadingKind; action?: ReactNode };

export const Reading = ({ kind, action }: Props) => {
  const reading = useAppSelector((state) => state.readings[kind]);
  if (reading.status === 'idle') return null;
  const waiting = reading.status === 'loading';
  const label = waiting
    ? 'Нейросеть думает'
    : reading.status === 'streaming'
      ? 'Нейросеть пишет'
      : reading.status === 'error'
        ? 'Не получилось'
        : reading.source === 'template'
          ? 'Базовый текст по шаблону'
          : 'Написано нейросетью';
  const note = noteText(reading.note);
  return (
    <div className={cx(ui.glass, styles.reading)} aria-live="polite">
      <div className={styles.head}>
        <span className={styles.status}>
          <span className={cx(styles.dot, (waiting || reading.status === 'streaming') && styles.busy, reading.source === 'ai' && styles.ai)} />
          {label}
        </span>
        {reading.status === 'done' && action}
      </div>
      {reading.text && <div className={styles.text}>{renderText(reading.text)}</div>}
      {note && <p className={ui.hint}>{note}</p>}
    </div>
  );
};
