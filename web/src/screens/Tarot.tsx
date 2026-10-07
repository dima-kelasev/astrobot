import { Fragment, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Reading } from '../components/Reading';
import { TarotCard } from '../components/TarotCard';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { go } from '../store/navSlice';
import { fetchReading, resetReading } from '../store/readingsSlice';
import { PICKS, finishSpread, pickCard, resetSpread, setQuestion, startSpread } from '../store/spreadSlice';
import ui from '../styles/ui.module.css';
import { telegram } from '../telegram';
import styles from './Tarot.module.css';

const rad = Math.PI / 180;
const MAX_QUESTION = 300;
const MAX_ANGLE = 24;
const POSITIONS = ['Что есть', 'Что мешает', 'Что поможет'] as const;
const PICK_TITLES = ['Выберите первую карту', 'Выберите вторую карту', 'Выберите третью карту', 'Ваш расклад'] as const;
const EXAMPLES = ['На чём сосредоточиться в этом месяце?', 'Что важно в отношениях сейчас?', 'Стоит ли менять работу?'] as const;

type Phase = 'deck' | 'dealing' | 'fan';

const layoutFor = (width: number, size: number) => {
  const cw = Math.max(78, Math.min(104, Math.floor((width - 72) / 3.4)));
  const ch = (cw * 12) / 7;
  const slotY = 24;
  const nameH = 58;
  const colW = width / 3;
  const fanTop = slotY + ch + nameH + 30;
  const reach = width / 2 - 4 - (cw / 2) * Math.cos(MAX_ANGLE * rad) - (ch / 2) * Math.sin(MAX_ANGLE * rad);
  const radius = Math.max(60, reach) / Math.sin(MAX_ANGLE * rad);
  return {
    cw,
    ch,
    slotY,
    colW,
    nameY: slotY + ch + 10,
    slotX: (k: number) => colW * k + (colW - cw) / 2,
    fan: (k: number) => {
      const angle = size > 1 ? (k - (size - 1) / 2) * ((2 * MAX_ANGLE) / (size - 1)) : 0;
      return { x: width / 2 + radius * Math.sin(angle * rad) - cw / 2, y: fanTop + radius * (1 - Math.cos(angle * rad)), r: angle };
    },
    deck: { x: width / 2 - cw / 2, y: fanTop + 24, r: 0 },
    hFull: fanTop + ch + radius * (1 - Math.cos(MAX_ANGLE * rad)) + 30,
    hDone: slotY + ch + nameH + 6
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
  const quota = useAppSelector((state) => state.profile.me?.quota ?? null);
  const [empty, setEmpty] = useState(false);

  const start = () => {
    const text = question.trim();
    if (!text) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    dispatch(resetReading('spread'));
    dispatch(startSpread(text));
  };

  const quotaLine = !quota
    ? ''
    : quota.subscribed
      ? 'Подписка активна: расклады без лимита'
      : quota.freeLeft > 0
        ? `Сегодня бесплатно: ${quota.freeLeft}`
        : quota.credits > 0
          ? `Оплаченных раскладов: ${quota.credits}`
          : 'Бесплатный расклад на сегодня использован';

  return (
    <div className={ui.screen}>
      <div className={cx(ui.head, ui.headCenter)}>
        <h1 className={ui.title}>О чём спросим карты?</h1>
        <p className={ui.lead}>Чем конкретнее вопрос, тем точнее получится толкование.</p>
      </div>
      <div className={styles.questionWrap}>
        <textarea
          className={styles.question}
          id="question"
          maxLength={MAX_QUESTION}
          aria-label="Ваш вопрос"
          placeholder="Например: на чём сосредоточиться в этом месяце?"
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
      {empty && <p className={ui.error}>Напишите вопрос или выберите пример под полем.</p>}
      {errorCode && errorCode !== 'quota' && <p className={ui.error}>Не получилось начать расклад. Попробуйте ещё раз.</p>}
      <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="button" disabled={starting} onClick={start}>
        Перемешать и разложить
      </button>
      <p className={cx(ui.hint, styles.center)}>{quotaLine}</p>
      {errorCode === 'quota' && (
        <div className={cx(ui.glass, styles.paywall)}>
          <span className={ui.sub}>Бесплатный расклад на сегодня использован</span>
          <p className={ui.hint}>Следующий бесплатный расклад будет завтра. Платные расклады и подписка появятся позже.</p>
          <div className={ui.row}>
            <button className={cx(ui.btn, ui.btnGhost)} type="button" onClick={() => dispatch(go('plan'))}>
              Посмотреть тарифы
            </button>
          </div>
        </div>
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

  const closing = !picked && count >= PICKS;
  const place = picked ? { x: layout.slotX(slot), y: layout.slotY, r: 0 } : phase === 'deck' ? layout.deck : layout.fan(index);
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
      aria-label={card ? `${POSITIONS[slot] ?? ''}: ${card.name}, ${card.orientation}` : `Закрытая карта ${index + 1}`}
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
  const count = useAppSelector((state) => state.spread.picks.length);
  const revealed = useAppSelector((state) => state.spread.picks.filter((pick) => pick.card !== null).length);
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
    if (step !== 'pick' || revealed < PICKS) return;
    const timer = setTimeout(() => dispatch(finishSpread()), 1600);
    return () => clearTimeout(timer);
  }, [step, revealed, dispatch]);

  useEffect(() => {
    if (step !== 'done' || !id) return;
    const current = store.getState().readings.spread;
    if (current.key === id && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'spread', key: id, path: `/api/spreads/${id}/reading` }));
    return () => request.abort();
  }, [step, id, dispatch, store]);

  const layout = width ? layoutFor(width, size) : null;
  const finished = count >= PICKS;

  return (
    <div className={ui.screen}>
      <div className={cx(ui.head, ui.headCenter)}>
        <h1 className={ui.title}>{PICK_TITLES[Math.min(count, PICKS)]}</h1>
        <p className={ui.lead}>{finished ? question : 'Коснитесь любой карты в веере'}</p>
      </div>
      <div ref={stageRef} className={styles.stage} style={layout ? { height: step === 'done' ? layout.hDone : layout.hFull } : undefined}>
        {layout &&
          POSITIONS.map((label, k) => (
            <Fragment key={label}>
              <div className={styles.ghost} style={{ left: layout.slotX(k), top: layout.slotY, width: layout.cw, height: layout.ch }} />
              <span className={styles.slotPos} style={{ left: layout.colW * k, width: layout.colW }}>
                {label}
              </span>
              <div className={styles.slotName} style={{ left: layout.colW * k, width: layout.colW, top: layout.nameY }}>
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
  const step = useAppSelector((state) => state.spread.step);
  return <section>{step === 'ask' ? <Ask /> : <Pick />}</section>;
};
