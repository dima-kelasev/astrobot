import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { go } from '../store/navSlice';
import ui from '../styles/ui.module.css';

const PAID: Record<string, { title: string; text: string }> = {
  limit: { title: 'Бесплатный расклад на сегодня уже сделан', text: 'Завтра будет новый. С подпиской расклады без ограничений.' },
  premium: { title: 'Это входит в подписку', text: 'Свои вопросы, «Почему сейчас так?», расклады и натальная карта целиком открываются подпиской.' },
  natal: { title: 'Открывается с полной натальной картой', text: 'Толкования планет и домов входят в полную карту и в подписку.' }
};

const FREE: Record<string, { title: string; text: string }> = {
  limit: { title: 'Лимит на сегодня исчерпан', text: 'Бесплатные попытки обновятся завтра.' }
};

export const LimitNote = ({ code }: { code: string }) => {
  const dispatch = useAppDispatch();
  const payments = useAppSelector((state) => state.profile.me?.access.payments ?? false);
  const content = (payments ? PAID : FREE)[code];
  if (!content) return null;
  return (
    <div className={cx(ui.glass, ui.notice)}>
      <span className={ui.sub}>{content.title}</span>
      <p className={ui.hint}>{content.text}</p>
      {payments && (
        <div className={ui.row}>
          <button className={cx(ui.btn, ui.btnPrimary, ui.btnSmall)} type="button" onClick={() => dispatch(go('plan'))}>
            Посмотреть подписку
          </button>
        </div>
      )}
    </div>
  );
};
