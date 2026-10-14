import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { LimitNote } from './LimitNote';
import { useAppSelector } from '../store/hooks';
import type { ReadingKind } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';
import styles from './Reading.module.css';

const BRIEF = 'Сейчас не получается подготовить подробное толкование, поэтому показан краткий вариант. Загляните чуть позже.';

const NOTES: Record<string, string> = {
  rate_limited: 'Вы сегодня спрашивали много раз подряд. Пока показан краткий вариант, подробное толкование снова будет доступно через час.',
  interrupted: 'Связь прервалась на середине. Откройте экран ещё раз, чтобы дочитать.',
  network: 'Нет связи. Проверьте интернет и попробуйте ещё раз.',
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

const noteText = (code: string | null) => (code ? (NOTES[code] ?? BRIEF) : null);

type Props = { kind: ReadingKind; action?: ReactNode; locked?: ReactNode };

const PAYWALL = new Set(['premium', 'limit', 'natal']);

export const Reading = ({ kind, action, locked }: Props) => {
  const reading = useAppSelector((state) => state.readings[kind]);
  if (reading.status === 'idle') return null;
  if (reading.status === 'error' && reading.note && PAYWALL.has(reading.note)) return <LimitNote code={reading.note} />;
  const waiting = reading.status === 'loading';
  const label = waiting
    ? 'Смотрю на звёзды'
    : reading.status === 'streaming'
      ? 'Пишу толкование'
      : reading.status === 'error'
        ? 'Не получилось'
        : reading.source === 'template'
          ? 'Краткое толкование'
          : 'Ваше толкование';
  const note = noteText(reading.note);
  const isLocked = reading.locked && reading.status === 'done';
  return (
    <>
      <div className={cx(ui.glass, styles.reading)} aria-live="polite">
        <div className={styles.head}>
          <span className={styles.status}>
            <span className={cx(styles.dot, (waiting || reading.status === 'streaming') && styles.busy, reading.source === 'ai' && styles.ai)} />
            {label}
          </span>
          {reading.status === 'done' && action}
        </div>
        {reading.text && <div className={cx(styles.text, isLocked && styles.faded)}>{renderText(reading.text)}</div>}
        {note && <p className={ui.hint}>{note}</p>}
      </div>
      {isLocked && locked}
    </>
  );
};
