import { useAppDispatch, useAppSelector } from '../store/hooks';
import { go } from '../store/navSlice';
import { telegram } from '../telegram';
import styles from './TopBar.module.css';

const SUB_TITLES: Record<string, string> = { tarot: 'Расклад Таро', day: 'Карта дня' };

export const TopBar = () => {
  const dispatch = useAppDispatch();
  const screen = useAppSelector((state) => state.nav.screen);
  const sign = useAppSelector((state) => state.profile.me?.sign ?? null);
  const subTitle = SUB_TITLES[screen];
  return (
    <header className={styles.top}>
      {subTitle && !telegram.inTelegram && (
        <button className={styles.back} type="button" aria-label="Назад в меню" onClick={() => dispatch(go('menu'))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 5 8 12l6.5 7" />
          </svg>
        </button>
      )}
      <span className={styles.title}>{subTitle ?? 'Астробот'}</span>
      {sign && (
        <button className={styles.sign} type="button" aria-label={`Профиль, знак ${sign}`} onClick={() => dispatch(go('profile'))}>
          {sign}
        </button>
      )}
    </header>
  );
};
