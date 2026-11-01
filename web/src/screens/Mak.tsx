import { useEffect, useState } from 'react';
import type { MakCard } from '../api/schemas';
import { FreeBadge, useFree } from '../components/FreeBadge';
import { ImageViewer } from '../components/ImageViewer';
import { LimitNote } from '../components/LimitNote';
import { Paywall } from '../components/Paywall';
import { Reading } from '../components/Reading';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { finishMak, nextQuestion, prevQuestion, resetMak, revealMak, setDraft, setMakQuestion, startMak } from '../store/makSlice';
import { fetchReading, resetReading } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';
import { telegram } from '../telegram';
import styles from './Mak.module.css';

const MAX_QUESTION = 500;
const MAX_ANSWER = 800;
const PAYWALL_CODES = new Set(['mak', 'limit', 'premium']);

const imageOf = (card: MakCard) => `${import.meta.env.BASE_URL}${card.image}`;

const captionOf = (card: MakCard) => [card.artist, card.year].filter(Boolean).join(', ');

const STEPS = [
  'Напишите, что вас волнует.',
  'Вытяните карту. Это картина, у которой нет готового значения.',
  'Ответьте на четыре вопроса Фреи о том, что вы видите и чувствуете.',
  'Фрея подведёт итог по вашим ответам.'
];

const Ask = () => {
  const dispatch = useAppDispatch();
  const question = useAppSelector((state) => state.mak.question);
  const starting = useAppSelector((state) => state.mak.starting);
  const error = useAppSelector((state) => state.mak.error);
  const free = useFree('mak');
  const locked = free.status === 'locked';
  const valid = question.trim().length >= 3;

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Метафорические карты</span>
        <h1 className={ui.title}>Что вас волнует?</h1>
        <p className={ui.lead}>Метафорическая карта показывает не судьбу, а то, что вы сами в ней увидите. Это помогает посмотреть на ситуацию со стороны.</p>
      </div>
      <FreeBadge feature="mak" />
      {locked ? (
        <Paywall title="Бесплатная сессия уже пройдена" text="Дальше сессии с метафорическими картами входят в подписку, без ограничений." />
      ) : (
        <div className={ui.block}>
          <div className={ui.textareaWrap}>
            <textarea
              className={ui.textarea}
              maxLength={MAX_QUESTION}
              aria-label="Ваш запрос"
              placeholder="Например: не понимаю, остаться на работе или уходить"
              value={question}
              onChange={(event) => dispatch(setMakQuestion(event.target.value))}
            />
            <span className={ui.counter}>
              {question.length}/{MAX_QUESTION}
            </span>
          </div>
          <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="button" disabled={!valid || starting} onClick={() => void dispatch(startMak())}>
            {starting ? 'Перемешиваю колоду…' : 'Вытянуть карту'}
          </button>
        </div>
      )}
      {error && PAYWALL_CODES.has(error) && !locked && <LimitNote code={error} />}
      {error && !PAYWALL_CODES.has(error) && <p className={ui.error}>Не получилось начать сессию. Попробуйте ещё раз.</p>}
      <div className={cx(ui.glass, ui.field)}>
        <span className={ui.label}>Как проходит сессия</span>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const Draw = ({ card }: { card: MakCard }) => {
  const dispatch = useAppDispatch();
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!flipped) return;
    telegram.impact('medium');
    const timer = setTimeout(() => dispatch(revealMak()), 1300);
    return () => clearTimeout(timer);
  }, [flipped, dispatch]);

  return (
    <section className={ui.screen}>
      <div className={cx(ui.head, ui.headCenter)}>
        <span className={ui.eyebrow}>Ваша карта</span>
        <h1 className={ui.title}>{flipped ? 'Посмотрите внимательно' : 'Коснитесь карты'}</h1>
        <p className={ui.lead}>{flipped ? 'Сейчас Фрея задаст вопросы.' : 'Карта уже выбрана для вашего вопроса. Откройте её, когда будете готовы.'}</p>
      </div>
      <button
        className={cx(styles.flip, flipped && styles.flipped)}
        type="button"
        aria-label={flipped ? card.title : 'Открыть карту'}
        disabled={flipped}
        onClick={() => setFlipped(true)}
      >
        <span className={styles.flipInner}>
          <span className={styles.back}>
            <svg viewBox="-50 -80 100 160" aria-hidden="true">
              <circle cy="-56" r="3" fill="currentColor" />
              <path d="M8 -24 A26 26 0 1 0 8 24 A21 21 0 1 1 8 -24 Z" fill="currentColor" />
              <circle cy="56" r="3" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.front}>
            <img src={imageOf(card)} alt={card.title} />
          </span>
        </span>
      </button>
    </section>
  );
};

const Picture = ({ card, small }: { card: MakCard; small?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={cx(styles.picture, small && styles.pictureSmall)} type="button" onClick={() => setOpen(true)}>
        <img src={imageOf(card)} alt={card.title} />
        <span className={styles.zoom}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 4h5v5M9 20H4v-5M20 4l-6 6M4 20l6-6" />
          </svg>
          Рассмотреть
        </span>
      </button>
      {open && <ImageViewer src={imageOf(card)} title={card.title} caption={captionOf(card)} onClose={() => setOpen(false)} />}
    </>
  );
};

const Answer = ({ card }: { card: MakCard }) => {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.mak.session);
  const index = useAppSelector((state) => state.mak.index);
  const draft = useAppSelector((state) => state.mak.drafts[state.mak.index] ?? '');
  const saving = useAppSelector((state) => state.mak.saving);
  const error = useAppSelector((state) => state.mak.error);
  if (!session) return null;
  const total = session.questions.length;
  const last = index === total - 1;
  const ready = draft.trim().length > 0;

  return (
    <section className={ui.screen}>
      <Picture card={card} />
      <div className={styles.progress} aria-label={`Вопрос ${index + 1} из ${total}`}>
        {session.questions.map((question, k) => (
          <span key={question} className={cx(styles.dot, k < index && styles.dotDone, k === index && styles.dotNow)} />
        ))}
      </div>
      <div className={ui.head}>
        <span className={ui.eyebrow}>
          Вопрос {index + 1} из {total}
        </span>
        <h2 className={styles.question}>{session.questions[index]}</h2>
      </div>
      <div className={ui.textareaWrap}>
        <textarea
          key={index}
          className={ui.textarea}
          maxLength={MAX_ANSWER}
          aria-label={session.questions[index]}
          placeholder="Пишите как есть, правильных ответов нет"
          value={draft}
          autoFocus
          onChange={(event) => dispatch(setDraft(event.target.value))}
        />
        <span className={ui.counter}>
          {draft.length}/{MAX_ANSWER}
        </span>
      </div>
      <div className={styles.buttons}>
        {index > 0 && (
          <button className={cx(ui.btn, ui.btnGhost)} type="button" onClick={() => dispatch(prevQuestion())}>
            Назад
          </button>
        )}
        <button
          className={cx(ui.btn, ui.btnPrimary, styles.grow)}
          type="button"
          disabled={!ready || saving}
          onClick={() => (last ? void dispatch(finishMak()) : dispatch(nextQuestion()))}
        >
          {last ? (saving ? 'Сохраняю…' : 'Получить итог Фреи') : 'Дальше'}
        </button>
      </div>
      {error && <p className={ui.error}>Не получилось сохранить ответы. Попробуйте ещё раз.</p>}
    </section>
  );
};

const Done = ({ card }: { card: MakCard }) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const session = useAppSelector((state) => state.mak.session);
  const id = session?.id ?? null;

  useEffect(() => {
    if (!id) return;
    const current = store.getState().readings.mak;
    if (current.key === id && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'mak', key: id, path: `/api/mak/${id}/reading` }));
    return () => request.abort();
  }, [id, dispatch, store]);

  if (!session) return null;
  return (
    <section className={ui.screen}>
      <div className={styles.doneHead}>
        <Picture card={card} small />
        <div className={ui.head}>
          <span className={ui.eyebrow}>Итог сессии</span>
          <p className={styles.doneQuestion}>{session.question}</p>
        </div>
      </div>
      <Reading kind="mak" />
      <button
        className={cx(ui.btn, ui.btnGhost, ui.btnWide)}
        type="button"
        onClick={() => {
          dispatch(resetReading('mak'));
          dispatch(resetMak());
        }}
      >
        Новая сессия
      </button>
    </section>
  );
};

export const Mak = () => {
  const step = useAppSelector((state) => state.mak.step);
  const card = useAppSelector((state) => state.mak.session?.card ?? null);
  if (step === 'ask' || !card) return <Ask />;
  if (step === 'draw') return <Draw card={card} />;
  if (step === 'answer') return <Answer card={card} />;
  return <Done card={card} />;
};
