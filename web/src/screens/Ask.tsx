import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { askBirth, go, openTheme, type Screen } from '../store/navSlice';
import { askQuestion, setText } from '../store/questionSlice';
import { resetReading } from '../store/readingsSlice';
import { setQuestion } from '../store/spreadSlice';
import ui from '../styles/ui.module.css';

const MAX_QUESTION = 500;

type Situation = { text: string; theme?: string; screen?: Screen };

const SITUATIONS: Situation[] = [
  { text: 'Что происходит между нами?', theme: 'love' },
  { text: 'Что он или она чувствует?', theme: 'love' },
  { text: 'Будут ли у нас отношения?', theme: 'love' },
  { text: 'Почему меня не выбирают?' },
  { text: 'Почему сейчас в жизни всё меняется?', screen: 'why' },
  { text: 'Стоит ли менять работу?', theme: 'choice' },
  { text: 'Что происходит с деньгами?', theme: 'work' },
  { text: 'Почему я попадаю в один и тот же сценарий?', theme: 'repeat' }
];

export const Ask = () => {
  const dispatch = useAppDispatch();
  const hasBirth = useAppSelector((state) => state.profile.me?.birth != null);
  const text = useAppSelector((state) => state.question.text);

  const send = (question: string) => {
    dispatch(resetReading('question'));
    dispatch(askQuestion(question));
  };

  const pick = (situation: Situation) => {
    if (situation.theme) {
      dispatch(openTheme(situation.theme));
      dispatch(setQuestion(situation.text));
      return;
    }
    if (situation.screen) {
      dispatch(hasBirth ? go(situation.screen) : askBirth(situation.screen));
      return;
    }
    send(situation.text);
  };

  const ask = () => {
    const question = text.trim();
    if (question.length >= 3) send(question);
  };

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Свой вопрос</span>
        <h1 className={ui.title}>Что вас волнует?</h1>
        <p className={ui.lead}>Напишите своими словами. Бот сам выберет, чем ответить: картами Таро или вашей натальной картой.</p>
      </div>
      <div className={ui.block}>
        <div className={ui.textareaWrap}>
          <textarea
            className={ui.textarea}
            maxLength={MAX_QUESTION}
            aria-label="Ваш вопрос"
            placeholder="Например: почему я никак не могу решиться на переезд?"
            value={text}
            onChange={(event) => dispatch(setText(event.target.value))}
          />
          <span className={ui.counter}>
            {text.length}/{MAX_QUESTION}
          </span>
        </div>
        <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="button" disabled={text.trim().length < 3} onClick={ask}>
          Спросить
        </button>
      </div>
      <div className={ui.block}>
        <h2 className={ui.sub}>Частые вопросы</h2>
        <div className={ui.chips}>
          {SITUATIONS.map((situation) => (
            <button key={situation.text} className={ui.chip} type="button" onClick={() => pick(situation)}>
              {situation.text}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
