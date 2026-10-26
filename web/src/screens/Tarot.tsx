import { Fragment, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { FreeBadge } from '../components/FreeBadge';
import { Paywall } from '../components/Paywall';
import { LimitNote } from '../components/LimitNote';
import { Reading } from '../components/Reading';
import { TarotCard } from '../components/TarotCard';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { fetchReading, resetReading } from '../store/readingsSlice';
import { fetchThemes, finishSpread, pickCard, resetSpread, setQuestion, startSpread } from '../store/spreadSlice';
import ui from '../styles/ui.module.css';
import { telegram } from '../telegram';
import styles from './Tarot.module.css';

const rad = Math.PI / 180;
const MAX_QUESTION = 300;
const MAX_ANGLE = 24;
const ORDINALS = ['первую', 'вторую', 'третью', 'четвёртую', 'пятую'] as const;
const EXAMPLES = ['На чём сосредоточиться в этом месяце?', 'Что важно в отношениях сейчас?', 'Стоит ли менять работу?'] as const;

type Phase = 'deck' | 'dealing' | 'fan';

const layoutFor = (width: number, size: number, picks: number) => {
  const cw = Math.max(78, Math.min(104, Math.floor((width - 72) / 3.4)));
  const ch = (cw * 12) / 7;
  const top = 34;
  const nameH = 58;
  const rowH = ch + nameH + 34;
  const rows = Math.ceil(picks / 3);
  const colW = width / 3;
  const rowOf = (k: number) => Math.floor(k / 3);
  const inRow = (k: number) => Math.min(3, picks - rowOf(k) * 3);
  const colX = (k: number) => {
    const count = inRow(k);
    const offset = ((3 - count) * colW) / 2;
    return offset + colW * (k % 3);
  };
  const slotsH = rows * rowH - 34;
  const fanTop = top + slotsH + 30;
  const reach = width / 2 - 4 - (cw / 2) * Math.cos(MAX_ANGLE * rad) - (ch / 2) * Math.sin(MAX_ANGLE * rad);
  const radius = Math.max(60, reach) / Math.sin(MAX_ANGLE * rad);
  return {
    cw,
    ch,
    colW,
    colX,
    slotY: (k: number) => top + rowOf(k) * rowH,
    nameY: (k: number) => top + rowOf(k) * rowH + ch + 10,
    posY: (k: number) => top + rowOf(k) * rowH - 4,
    slotX: (k: number) => colX(k) + (colW - cw) / 2,
    fan: (k: number) => {
      const angle = size > 1 ? (k - (size - 1) / 2) * ((2 * MAX_ANGLE) / (size - 1)) : 0;
      return { x: width / 2 + radius * Math.sin(angle * rad) - cw / 2, y: fanTop + radius * (1 - Math.cos(angle * rad)), r: angle };
    },
    deck: { x: width / 2 - cw / 2, y: fanTop + 24, r: 0 },
    hFull: fanTop + ch + radius * (1 - Math.cos(MAX_ANGLE * rad)) + 30,
    hDone: top + slotsH + 6
  };
};

type Layout = ReturnType<typeof layoutFor>;

const useElementWidth = (ref: RefObject<HTMLDivElement | null>) => {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

const Ask = () => {
  const dispatch = useAppDispatch();
  const question = useAppSelector((state) => state.spread.question);
  const starting = useAppSelector((state) => state.spread.starting);
  const errorCode = useAppSelector((state) => state.spread.errorCode);
  const themeKey = useAppSelector((state) => state.spread.theme);
  const theme = useAppSelector((state) => state.spread.themes.find((item) => item.key === state.spread.theme) ?? null);
  const [empty, setEmpty] = useState(false);

  const start = () => {
    if (theme?.questionRequired && !question.trim()) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    dispatch(resetReading('spread'));
    dispatch(startSpread());
  };

  const blocked = errorCode === 'limit' || errorCode === 'premium';
  const exhausted = useAppSelector((state) => {
    const me = state.profile.me;
    return Boolean(me && me.access.payments && !me.access.subscribed && me.limits.spread.used >= me.limits.spread.max);
  });

  return (
    <div className={ui.screen}>
      <div className={cx(ui.head, ui.headCenter)}>
        <span className={ui.eyebrow}>Расклад Таро</span>
        <h1 className={ui.title}>{theme?.title ?? 'Расклад'}</h1>
        {theme && <p className={ui.lead}>{theme.description}</p>}
      </div>
      <FreeBadge feature="spread" />
      {exhausted && (
        <Paywall
          title="Бесплатный расклад уже сделан"
          text="Дальше расклады по любым темам входят в подписку, без ограничений. Вопрос можно будет задать сразу после оформления."
        />
      )}
      {theme && (
        <div className={cx(ui.chips, styles.positions)}>
          {theme.positions.map((position, k) => (
            <span key={position} className={styles.position}>
              {k + 1}. {position}
            </span>
          ))}
        </div>
      )}
      {!exhausted && (
        <>
          <div className={styles.questionWrap}>
            <textarea
              className={styles.question}
              id="question"
              maxLength={MAX_QUESTION}
              aria-label={theme?.questionRequired ? 'Ваш вопрос' : 'Уточнение, необязательно'}
              placeholder={theme?.hint ?? 'Ваш вопрос'}
              value={question}
              onChange={(event) => {
                setEmpty(false);
                dispatch(setQuestion(event.target.value));
              }}
            />
            <span className={styles.counter}>
              {question.length}/{MAX_QUESTION}
            </span>
          </div>
          {themeKey === 'general' && (
            <div className={styles.chips}>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  className={styles.chip}
                  type="button"
                  onClick={() => {
                    setEmpty(false);
                    dispatch(setQuestion(example));
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          )}
          {empty && <p className={ui.error}>Напишите вопрос или выберите пример.</p>}
          {errorCode && !blocked && <p className={ui.error}>Не получилось начать расклад. Попробуйте ещё раз.</p>}
          <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="button" disabled={starting || !theme} onClick={start}>
            Перемешать и разложить
          </button>
          {blocked && errorCode && <LimitNote code={errorCode} />}
        </>
      )}
    </div>
  );
};

type FanCardProps = { index: number; layout: Layout; phase: Phase };

const FanCard = ({ index, layout, phase }: FanCardProps) => {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((state) => state.spread.picks.findIndex((pick) => pick.index === index));
  const card = useAppSelector((state) => state.spread.picks.find((pick) => pick.index === index)?.card ?? null);
  const count = useAppSelector((state) => state.spread.picks.length);
  const total = useAppSelector((state) => state.spread.positions.length);
  const step = useAppSelector((state) => state.spread.step);
  const picked = slot >= 0;
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!picked) {
      setLanded(false);
      return;
    }
    const timer = setTimeout(() => setLanded(true), 640);
    return () => clearTimeout(timer);
  }, [picked]);

  const flipped = landed && card !== null;

  useEffect(() => {
    if (flipped) telegram.impact('medium');
  }, [flipped]);

  if (!picked && step === 'done') return null;

  const closing = !picked && count >= total;
  const place = picked ? { x: layout.slotX(slot), y: layout.slotY(slot), r: 0 } : phase === 'deck' ? layout.deck : layout.fan(index);
  const y = closing ? place.y + 48 : place.y;

  return (
    <button
      type="button"
      className={cx(styles.fcard, picked && styles.picked, (phase === 'deck' || closing) && styles.hidden)}
      style={{
        width: layout.cw,
        transform: `translate(${place.x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${place.r.toFixed(2)}deg)`,
        zIndex: picked ? 30 + slot : undefined,
        transitionDelay: phase === 'dealing' && !picked ? `${index * 60}ms` : undefined
      }}
      disabled={picked || closing}
      aria-label={card ? `${card.name}, ${card.orientation}` : `Закрытая карта ${index + 1}`}
      onClick={() => {
        telegram.impact('light');
        dispatch(pickCard(index));
      }}
    >
      <span className={styles.lift}>
        <TarotCard face={card} flipped={flipped} floating={!picked} floatDelay={index * -0.47} />
      </span>
    </button>
  );
};

const SlotName = ({ slot }: { slot: number }) => {
  const card = useAppSelector((state) => state.spread.picks[slot]?.card ?? null);
  const [shown, setShown] = useState(false);
  const ready = card !== null;

  useEffect(() => {
    if (!ready) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), 900);
    return () => clearTimeout(timer);
  }, [ready]);

  if (!card || !shown) return null;
  return (
    <>
      {card.name}
      <span className={styles.slotOri}>{card.orientation}</span>
    </>
  );
};

const Pick = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const step = useAppSelector((state) => state.spread.step);
  const id = useAppSelector((state) => state.spread.id);
  const size = useAppSelector((state) => state.spread.size);
  const question = useAppSelector((state) => state.spread.question);
  const title = useAppSelector((state) => state.spread.title);
  const positions = useAppSelector((state) => state.spread.positions);
  const count = useAppSelector((state) => state.spread.picks.length);
  const revealed = useAppSelector((state) => state.spread.picks.filter((pick) => pick.card !== null).length);
  const total = positions.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(stageRef);
  const [phase, setPhase] = useState<Phase>('deck');

  useEffect(() => {
    const dealing = setTimeout(() => setPhase('dealing'), 60);
    const settled = setTimeout(() => setPhase('fan'), 60 + size * 60 + 800);
    return () => {
      clearTimeout(dealing);
      clearTimeout(settled);
    };
  }, [size]);

  useEffect(() => {
    if (step !== 'pick' || total === 0 || revealed < total) return;
    const timer = setTimeout(() => dispatch(finishSpread()), 1600);
    return () => clearTimeout(timer);
  }, [step, revealed, total, dispatch]);

  useEffect(() => {
    if (step !== 'done' || !id) return;
    const current = store.getState().readings.spread;
    if (current.key === id && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'spread', key: id, path: `/api/spreads/${id}/reading` }));
    return () => request.abort();
  }, [step, id, dispatch, store]);

  const layout = width ? layoutFor(width, size, total) : null;
  const finished = count >= total;
  const heading = finished ? title : `Выберите ${ORDINALS[count] ?? 'следующую'} карту`;

  return (
    <div className={ui.screen}>
      <div className={cx(ui.head, ui.headCenter)}>
        <h1 className={ui.title}>{heading}</h1>
        <p className={ui.lead}>{finished ? question : `${positions[count] ?? ''}. Коснитесь любой карты в веере`}</p>
      </div>
      <div ref={stageRef} className={styles.stage} style={layout ? { height: step === 'done' ? layout.hDone : layout.hFull } : undefined}>
        {layout &&
          positions.map((label, k) => (
            <Fragment key={label}>
              <div className={styles.ghost} style={{ left: layout.slotX(k), top: layout.slotY(k), width: layout.cw, height: layout.ch }} />
              <span className={styles.slotPos} style={{ left: layout.colX(k), width: layout.colW, top: layout.posY(k) }}>
                {label}
              </span>
              <div className={styles.slotName} style={{ left: layout.colX(k), width: layout.colW, top: layout.nameY(k) }}>
                <SlotName slot={k} />
              </div>
            </Fragment>
          ))}
        {layout && Array.from({ length: size }, (_, k) => <FanCard key={k} index={k} layout={layout} phase={phase} />)}
      </div>
      {step === 'done' && (
        <>
          <Reading kind="spread" />
          <button
            className={cx(ui.btn, ui.btnGhost, ui.btnWide)}
            type="button"
            onClick={() => {
              dispatch(resetReading('spread'));
              dispatch(resetSpread());
            }}
          >
            Новый расклад
          </button>
        </>
      )}
    </div>
  );
};

export const Tarot = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const step = useAppSelector((state) => state.spread.step);

  useEffect(() => {
    if (store.getState().spread.themesStatus === 'ready') return;
    const request = dispatch(fetchThemes());
    return () => request.abort();
  }, [dispatch, store]);

  return <section>{step === 'ask' ? <Ask /> : <Pick />}</section>;
};
