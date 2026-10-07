import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { go, type Tab } from '../store/navSlice';
import styles from './BottomNav.module.css';

const ITEMS: { tab: Tab; label: string; icon: ReactNode }[] = [
  { tab: 'menu', label: 'Меню', icon: <path d="M4 11.5 12 4l8 7.5V20h-5.5v-5.5h-5V20H4z" strokeLinejoin="round" /> },
  {
    tab: 'sky',
    label: 'Гороскоп',
    icon: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-25 12 12)" />
      </>
    )
  },
  {
    tab: 'plan',
    label: 'Подписка',
    icon: <path d="M12 3C12.8 8.2 15.8 11.2 21 12C15.8 12.8 12.8 15.8 12 21C11.2 15.8 8.2 12.8 3 12C8.2 11.2 11.2 8.2 12 3Z" strokeLinejoin="round" />
  },
  {
    tab: 'profile',
    label: 'Профиль',
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" strokeLinecap="round" />
      </>
    )
  }
];

export const BottomNav = () => {
  const dispatch = useAppDispatch();
  const screen = useAppSelector((state) => state.nav.screen);
  const active: Tab = screen === 'tarot' || screen === 'day' ? 'menu' : screen;
  return (
    <nav className={styles.nav} aria-label="Разделы">
      {ITEMS.map((item) => (
        <button
          key={item.tab}
          className={styles.item}
          type="button"
          aria-current={item.tab === active ? 'page' : undefined}
          onClick={() => dispatch(go(item.tab))}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {item.icon}
          </svg>
          {item.label}
        </button>
      ))}
    </nav>
  );
};
