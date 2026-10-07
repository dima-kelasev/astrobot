import { useEffect, type ComponentType } from 'react';
import styles from './App.module.css';
import { BottomNav } from './components/BottomNav';
import { Starfield } from './components/Starfield';
import { TopBar } from './components/TopBar';
import { cx } from './lib/cx';
import { Day } from './screens/Day';
import { Menu } from './screens/Menu';
import { Onboarding } from './screens/Onboarding';
import { Plan } from './screens/Plan';
import { Profile } from './screens/Profile';
import { Sky } from './screens/Sky';
import { Tarot } from './screens/Tarot';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { go, type Screen } from './store/navSlice';
import { fetchMe } from './store/profileSlice';
import ui from './styles/ui.module.css';
import { telegram } from './telegram';

const SCREENS: Record<Screen, ComponentType> = { menu: Menu, sky: Sky, plan: Plan, profile: Profile, tarot: Tarot, day: Day };

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
  const hasBirth = useAppSelector((state) => Boolean(state.profile.me?.birthDate));
  const screen = useAppSelector((state) => state.nav.screen);
  const isSub = screen === 'tarot' || screen === 'day';
  const ready = status === 'ready';
  const Current = SCREENS[screen];

  useEffect(() => {
    telegram.ready();
    const request = dispatch(fetchMe());
    return () => request.abort();
  }, [dispatch]);

  useEffect(() => {
    telegram.backButton(isSub);
  }, [isSub]);

  useEffect(() => telegram.onBack(() => dispatch(go('menu'))), [dispatch]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <>
      <Starfield />
      <div className={styles.app}>
        {ready && hasBirth && <TopBar />}
        <main>
          {status === 'error' && errorCode === 'unauthorized' && (
            <Message title="Откройте в Telegram" text="Мини-апп работает внутри Telegram. Найдите бота и нажмите кнопку «Открыть»." />
          )}
          {status === 'error' && errorCode !== 'unauthorized' && (
            <Message title="Нет связи" text="Не получилось загрузить данные. Проверьте интернет и откройте мини-апп ещё раз." />
          )}
          {(status === 'idle' || status === 'loading') && <Message title="Астробот" text="Смотрим на небо…" />}
          {ready && !hasBirth && <Onboarding />}
          {ready && hasBirth && <Current />}
        </main>
        <p className={styles.disclaimer}>Толкования не заменяют консультацию врача, юриста и финансового специалиста.</p>
      </div>
      {ready && hasBirth && <BottomNav />}
    </>
  );
};
