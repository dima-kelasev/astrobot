import { useEffect } from 'react';
import { CardsRow } from '../components/CardsRow';
import { LimitNote } from '../components/LimitNote';
import { NeedBirth } from '../components/NeedBirth';
import { Reading } from '../components/Reading';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { go } from '../store/navSlice';
import { resetQuestion } from '../store/questionSlice';
import { fetchReading, resetReading } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';

const TOOL_TEXT = {
  tarot: 'Отвечаю раскладом Таро',
  chart: 'Отвечаю по вашей натальной карте и текущим транзитам',
  both: 'Смотрю вашу натальную карту и раскладываю Таро'
} as const;

const POSITIONS = ['Суть ситуации', 'Что мешает', 'Что поможет'];

export const Question = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const status = useAppSelector((state) => state.question.status);
  const asked = useAppSelector((state) => state.question.asked);
  const result = useAppSelector((state) => state.question.result);
  const errorCode = useAppSelector((state) => state.question.errorCode);
  const id = result?.id ?? null;

  useEffect(() => {
    if (!id) return;
    const current = store.getState().readings.question;
    if (current.key === id && current.status !== 'idle' && current.status !== 'error') return;
    const delay = result && result.cards.length > 0 ? 500 + result.cards.length * 450 : 0;
    let request: { abort: () => void } | null = null;
    const timer = setTimeout(() => {
      request = dispatch(
        fetchReading({
          kind: 'question',
          key: id,
          path: `/api/questions/${id}/reading`
        })
      );
    }, delay);
    return () => {
      clearTimeout(timer);
      request?.abort();
    };
  }, [id, result, dispatch, store]);

  const again = () => {
    dispatch(resetQuestion());
    dispatch(resetReading('question'));
    dispatch(go('ask'));
  };

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Ваш вопрос</span>
        <h1 className={ui.title}>{asked || 'Вопрос'}</h1>
        {status === 'asking' && <p className={ui.lead}>Подбираю, как лучше ответить…</p>}
        {result && <p className={ui.lead}>{TOOL_TEXT[result.tool]}.</p>}
      </div>
      {status === 'error' && errorCode && (errorCode === 'limit' || errorCode === 'premium') && <LimitNote code={errorCode} />}
      {status === 'error' && errorCode !== 'limit' && errorCode !== 'premium' && (
        <p className={ui.error}>Не получилось отправить вопрос. Попробуйте ещё раз.</p>
      )}
      {result && result.cards.length > 0 && <CardsRow cards={result.cards} positions={POSITIONS} animate />}
      <Reading kind="question" />
      {result?.needBirth && (
        <NeedBirth
          returnTo="ask"
          title="Ответ может быть точнее"
          text="Этот вопрос лучше разбирать по натальной карте. Укажите дату, время и город рождения, и в следующий раз Фрея учтёт вашу карту."
        />
      )}
      <button className={cx(ui.btn, ui.btnGhost, ui.btnWide)} type="button" onClick={again}>
        Задать другой вопрос
      </button>
    </section>
  );
};
