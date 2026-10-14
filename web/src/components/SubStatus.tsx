import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { go } from '../store/navSlice';
import ui from '../styles/ui.module.css';
import styles from './SubStatus.module.css';

const DAY_MS = 86400000;

const dateText = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

const daysWord = (n: number) => {
  const tail = n % 100;
  if (tail >= 11 && tail <= 14) return 'дней';
  if (n % 10 === 1) return 'день';
  if (n % 10 >= 2 && n % 10 <= 4) return 'дня';
  return 'дней';
};

export const daysLeft = (until: string) => Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / DAY_MS));

export const SubStatus = () => {
  const dispatch = useAppDispatch();
  const access = useAppSelector((state) => state.profile.me?.access ?? null);
  if (!access || !access.payments) return null;
  const left = access.subscribed && access.until ? daysLeft(access.until) : 0;
  const soon = access.subscribed && left <= 3;

  return (
    <div className={cx(ui.glass, styles.card, access.subscribed && styles.active, soon && styles.soon)}>
      <span className={styles.label}>Подписка</span>
      {access.subscribed && access.until ? (
        <>
          <span className={styles.title}>Активна до {dateText(access.until)}</span>
          <span className={styles.text}>
            {soon
              ? `Осталось ${left} ${daysWord(left)}. Продлите заранее: новые дни прибавятся к текущему сроку.`
              : `Осталось ${left} ${daysWord(left)}. Всё открыто, а в бот приходят личные уведомления о важных периодах.`}
          </span>
        </>
      ) : (
        <>
          <span className={styles.title}>Не оформлена</span>
          <span className={styles.text}>
            {access.natal ? 'Натальная карта у вас открыта навсегда. ' : ''}С подпиской открываются вопросы, расклады, «Почему сейчас так?» и личные уведомления
            о важных периодах.
          </span>
        </>
      )}
      <button className={cx(ui.btn, access.subscribed && !soon ? ui.btnGhost : ui.btnPrimary, ui.btnSmall)} type="button" onClick={() => dispatch(go('plan'))}>
        {access.subscribed ? 'Продлить' : 'Оформить подписку'}
      </button>
    </div>
  );
};

export const SubReminder = () => {
  const dispatch = useAppDispatch();
  const access = useAppSelector((state) => state.profile.me?.access ?? null);
  if (!access || !access.payments || !access.subscribed || !access.until) return null;
  const left = daysLeft(access.until);
  if (left > 3) return null;
  return (
    <button className={cx(ui.glass, styles.reminder)} type="button" onClick={() => dispatch(go('plan'))}>
      <span className={styles.title}>Подписка заканчивается {dateText(access.until)}</span>
      <span className={styles.text}>Продлите заранее, чтобы ничего не закрылось. Новые дни прибавятся к текущему сроку.</span>
    </button>
  );
};
