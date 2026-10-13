import { cx } from '../lib/cx';
import { useAppDispatch } from '../store/hooks';
import { go } from '../store/navSlice';
import ui from '../styles/ui.module.css';

const TEXTS: Record<string, { title: string; text: string }> = {
  limit: { title: 'Лимит на сегодня исчерпан', text: 'Бесплатные попытки обновятся завтра. Подписка без лимитов появится позже.' },
  premium: { title: 'Доступно по подписке', text: 'Эта функция входит в подписку.' }
};

export const LimitNote = ({ code }: { code: string }) => {
  const dispatch = useAppDispatch();
  const content = TEXTS[code];
  if (!content) return null;
  return (
    <div className={cx(ui.glass, ui.notice)}>
      <span className={ui.sub}>{content.title}</span>
      <p className={ui.hint}>{content.text}</p>
      <div className={ui.row}>
        <button className={cx(ui.btn, ui.btnGhost, ui.btnSmall)} type="button" onClick={() => dispatch(go('plan'))}>
          Подробнее о подписке
        </button>
      </div>
    </div>
  );
};
