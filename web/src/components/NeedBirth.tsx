import { cx } from '../lib/cx';
import { useAppDispatch } from '../store/hooks';
import { askBirth, type Screen } from '../store/navSlice';
import ui from '../styles/ui.module.css';

type Props = { returnTo: Screen; title: string; text: string; button?: string };

export const NeedBirth = ({ returnTo, title, text, button = 'Указать данные рождения' }: Props) => {
  const dispatch = useAppDispatch();
  return (
    <div className={cx(ui.glass, ui.notice)}>
      <span className={ui.sub}>{title}</span>
      <p className={ui.hint}>{text}</p>
      <button className={cx(ui.btn, ui.btnPrimary)} type="button" onClick={() => dispatch(askBirth(returnTo))}>
        {button}
      </button>
    </div>
  );
};
