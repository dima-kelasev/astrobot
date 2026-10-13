import { useAppDispatch, useAppSelector } from '../store/hooks';
import { back, go, isTab } from '../store/navSlice';
import { telegram } from '../telegram';
import styles from './TopBar.module.css';

const SUB_TITLES: Record<string, string> = {
  ask: 'Свой вопрос',
  day: 'Карта дня',
  topics: 'Расклады',
  tarot: 'Расклад Таро',
  question: 'Ваш вопрос',
  natal: 'Натальная карта',
  asc: 'Асцендент',
  why: 'Почему сейчас так?',
  compat: 'Совместимость',
  partner: 'Совместимость',
  historyItem: 'История',
  birth: 'Данные рождения',
  plan: 'Подписка'
};

export const TopBar = () => {
  const dispatch = useAppDispatch();
  const screen = useAppSelector((state) => state.nav.screen);
  const sign = useAppSelector((state) => state.profile.me?.sign ?? null);
  const subTitle = SUB_TITLES[screen];
  return (
    <header className={styles.top}>
      {!isTab(screen) && !telegram.inTelegram && (
        <button className={styles.back} type="button" aria-label="Назад" onClick={() => dispatch(back())}>
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
