import { useEffect, type ReactNode } from 'react';
import type { NatalHouse, NatalItem } from '../api/schemas';
import { cx } from '../lib/cx';
import { showNatalPart, toggleNatalPart } from '../store/chartSlice';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import type { AppDispatch } from '../store';
import { fetchReading } from '../store/readingsSlice';
import { Paywall } from './Paywall';
import { Reading } from './Reading';
import styles from './NatalParts.module.css';

const TEXT = '︎';

export const focusPart = (dispatch: AppDispatch, part: string) => {
  dispatch(showNatalPart(part));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.getElementById(`part-${part}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });
};

const PartReading = ({ part, baseKey }: { part: string; baseKey: string }) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  useEffect(() => {
    const key = `${baseKey}|${part}`;
    const current = store.getState().readings.natalPart;
    if (current.key === key && current.status !== 'idle' && current.status !== 'error') return;
    const request = dispatch(fetchReading({ kind: 'natalPart', key, path: `/api/natal/part/${part}/reading` }));
    return () => request.abort();
  }, [part, baseKey, dispatch, store]);

  return <Reading kind="natalPart" />;
};

type CardProps = { part: string; baseKey: string; badge: ReactNode; title: string; sub: string; accent?: boolean; children: ReactNode };

const Card = ({ part, baseKey, badge, title, sub, accent, children }: CardProps) => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.chart.natalView.open === part);
  const full = useAppSelector((state) => state.profile.me?.access.natal ?? true);
  return (
    <div id={`part-${part}`} className={cx(styles.card, open && styles.cardOpen)}>
      <button className={styles.head} type="button" aria-expanded={open} onClick={() => dispatch(toggleNatalPart(part))}>
        <span
          className={cx(
            styles.badge,
            accent && styles.badgeAccent,
            typeof badge === 'string' && /^[A-Za-z]+$/.test(badge) && styles.badgeText,
            typeof badge === 'number' && styles.badgeNumber
          )}
          aria-hidden="true"
        >
          {badge}
        </span>
        <span className={styles.titles}>
          <span className={styles.title}>{title}</span>
          <span className={styles.sub}>{sub}</span>
        </span>
        <svg
          className={styles.chevron}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.content}>
            {children}
            {open && full && <PartReading part={part} baseKey={baseKey} />}
            {open && !full && (
              <Paywall
                compact
                title="Толкование открывается с полной картой"
                text="Что это положение значит именно для вас и как с ним жить."
                product="natal"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TONE_CLASS = { soft: styles.soft, hard: styles.hard, mixed: styles.mixed } as const;

type AspectRow = { text: string; nature: string; tone: 'soft' | 'hard' | 'mixed'; orbText?: string };

export const AspectList = ({ aspects }: { aspects: AspectRow[] }) => (
  <ul className={styles.aspects}>
    {aspects.map((aspect) => (
      <li key={aspect.text} className={styles.aspect}>
        <span className={cx(styles.toneDot, TONE_CLASS[aspect.tone])} aria-hidden="true" />
        <span className={styles.aspectText}>
          <span>
            {aspect.text}
            {aspect.orbText && <span className={styles.orb}> {aspect.orbText}</span>}
          </span>
          <span className={styles.aspectNature}>{aspect.nature}</span>
        </span>
      </li>
    ))}
  </ul>
);

export const PlanetCard = ({ item, baseKey }: { item: NatalItem; baseKey: string }) => {
  const dispatch = useAppDispatch();
  const badge = item.key === 'asc' ? 'Asc' : item.key === 'mc' ? 'MC' : `${item.glyph}${TEXT}`;
  return (
    <Card part={item.key} baseKey={baseKey} badge={badge} title={item.title} sub={item.position} accent={item.key === 'lilith' || item.key === 'fortune'}>
      <p className={styles.lead}>
        <b>{item.name}</b> — {item.meaning}.
      </p>
      <div className={styles.facts}>
        <div className={styles.fact}>
          <span className={styles.factLabel}>Знак</span>
          <span className={styles.factValue}>{item.sign}</span>
          <span className={styles.factText}>{item.signText}</span>
        </div>
        {item.house !== null && (
          <button className={cx(styles.fact, styles.factLink)} type="button" onClick={() => item.house !== null && focusPart(dispatch, `house${item.house}`)}>
            <span className={styles.factLabel}>Дом</span>
            <span className={styles.factValue}>{item.house} дом</span>
            <span className={styles.factText}>{item.houseText}</span>
          </button>
        )}
      </div>
      {(item.rules.length > 0 || item.retro) && (
        <div className={styles.tags}>
          {item.retro && <span className={styles.tag}>ретроградная: темы проживаются больше внутри</span>}
          {item.rules.map((house) => (
            <button key={house} className={cx(styles.tag, styles.tagLink)} type="button" onClick={() => focusPart(dispatch, `house${house}`)}>
              управляет {house} домом
            </button>
          ))}
        </div>
      )}
      {item.aspects.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Аспекты</span>
          <AspectList aspects={item.aspects.map((aspect) => ({ ...aspect, orbText: `орб ${aspect.orb}°` }))} />
        </div>
      )}
    </Card>
  );
};

export const HouseCard = ({ house, baseKey }: { house: NatalHouse; baseKey: string }) => {
  const dispatch = useAppDispatch();
  return (
    <Card part={`house${house.house}`} baseKey={baseKey} badge={house.house} title={house.title} sub={house.meaning}>
      <p className={styles.lead}>
        Куспид: <b>{house.position}</b>. Знак на начале дома задаёт тон этой сферы жизни.
      </p>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>{house.rulers.length > 1 ? 'Управители' : 'Управитель'}</span>
        <div className={styles.tags}>
          {house.rulers.map((ruler) => (
            <button key={ruler.key} className={cx(styles.tag, styles.tagLink)} type="button" onClick={() => focusPart(dispatch, ruler.key)}>
              {ruler.name}
              {ruler.house ? ` в ${ruler.house} доме` : ''}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Планеты в доме</span>
        {house.planets.length > 0 ? (
          <div className={styles.tags}>
            {house.planets.map((planet) => (
              <button key={planet.key} className={cx(styles.tag, styles.tagLink)} type="button" onClick={() => focusPart(dispatch, planet.key)}>
                {planet.name}
              </button>
            ))}
          </div>
        ) : (
          <span className={styles.aspectNature}>Пусто. Это не плохо: сферу ведёт управитель дома.</span>
        )}
      </div>
    </Card>
  );
};
