import { useEffect, type ComponentType } from 'react';
import styles from './App.module.css';
import { BottomNav } from './components/BottomNav';
import { PaySheet } from './components/PaySheet';
import { Starfield } from './components/Starfield';
import { TopBar } from './components/TopBar';
import { cx } from './lib/cx';
import { Asc } from './screens/Asc';
import { Ask } from './screens/Ask';
import { Birth } from './screens/Birth';
import { Compat } from './screens/Compat';
import { Day } from './screens/Day';
import { History } from './screens/History';
import { HistoryItem } from './screens/HistoryItem';
import { Home } from './screens/Home';
import { Natal } from './screens/Natal';
import { Partner } from './screens/Partner';
import { Plan } from './screens/Plan';
import { Profile } from './screens/Profile';
import { Question } from './screens/Question';
import { Sky } from './screens/Sky';
import { Tarot } from './screens/Tarot';
import { Topics } from './screens/Topics';
import { Why } from './screens/Why';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { back, go, type Screen } from './store/navSlice';
import { fetchMe } from './store/profileSlice';
import ui from './styles/ui.module.css';
import { telegram } from './telegram';

const SCREENS: Record<Screen, ComponentType> = {
  home: Home,
  sky: Sky,
  history: History,
  profile: Profile,
  ask: Ask,
  day: Day,
  topics: Topics,
  tarot: Tarot,
  question: Question,
  natal: Natal,
  asc: Asc,
  why: Why,
  compat: Compat,
  partner: Partner,
  historyItem: HistoryItem,
  birth: Birth,
  plan: Plan
};

const DEEP_LINKS: Record<string, Screen> = {
  ask: 'ask',
  sky: 'sky',
  day: 'day',
  topics: 'topics',
  natal: 'natal',
  why: 'why',
  asc: 'asc',
  compat: 'compat',
  plan: 'plan'
};

const startScreen = () => {
  const key = new URLSearchParams(window.location.search).get('s');
  return key ? (DEEP_LINKS[key] ?? null) : null;
};

const Message = ({ title, text }: { title: string; text: string }) => (
  <div className={cx(ui.head, ui.headCenter, styles.message)}>
    <h1 className={ui.title}>{title}</h1>
    <p className={ui.lead}>{text}</p>
  </div>
);

export const App = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.profile.status);
  const errorCode = useAppSelector((state) => state.profile.errorCode);
  const screen = useAppSelector((state) => state.nav.screen);
  const canBack = screen !== 'home';
  const ready = status === 'ready';
  const Current = SCREENS[screen];

  useEffect(() => {
    telegram.ready();
    const start = startScreen();
    if (start) dispatch(go(start));
    const request = dispatch(fetchMe());
    return () => request.abort();
  }, [dispatch]);

  useEffect(() => {
    telegram.backButton(canBack);
  }, [canBack]);

  useEffect(() => telegram.onBack(() => dispatch(back())), [dispatch]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <>
      <Starfield />
      <div className={styles.app}>
        {ready && <TopBar />}
        <main>
          {status === 'error' && errorCode === 'unauthorized' && (
            <Message title="Откройте в Telegram" text="Мини-апп работает внутри Telegram. Найдите бота и нажмите кнопку «Открыть»." />
          )}
          {status === 'error' && errorCode !== 'unauthorized' && (
            <Message title="Нет связи" text="Не получилось загрузить данные. Проверьте интернет и откройте мини-апп ещё раз." />
          )}
          {(status === 'idle' || status === 'loading') && <Message title="Астробот" text="Смотрим на небо…" />}
          {ready && <Current />}
        </main>
        <p className={styles.disclaimer}>Толкования не заменяют консультацию врача, юриста и финансового специалиста.</p>
      </div>
      {ready && <BottomNav />}
      {ready && <PaySheet />}
    </>
  );
};
