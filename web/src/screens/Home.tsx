import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { askBirth, go, type Screen } from '../store/navSlice';
import ui from '../styles/ui.module.css';
import styles from './Home.module.css';

type Tile = { screen: Screen; title: string; desc: string; free?: boolean; needsBirth?: boolean };

const TILES: Tile[] = [
  { screen: 'sky', title: 'Гороскоп', desc: 'По Луне и транзитам к вашей карте', free: true, needsBirth: true },
  { screen: 'day', title: 'Карта дня', desc: 'Одна карта и вопрос на сегодня', free: true },
  { screen: 'topics', title: 'Расклады по темам', desc: 'Любовь, работа, выбор, сценарии' },
  { screen: 'why', title: 'Почему сейчас так?', desc: 'Что сейчас активно в вашей карте', needsBirth: true },
  { screen: 'asc', title: 'Асцендент', desc: 'Как вас видят люди', free: true, needsBirth: true },
  { screen: 'compat', title: 'Совместимость', desc: 'Сильные и слабые стороны пары', needsBirth: true }
];

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const Wheel = () => (
  <svg className={styles.wheel} viewBox="-60 -60 120 120" aria-hidden="true">
    <circle r="56" className={styles.wheelRing} />
    <circle r="42" className={styles.wheelRing} />
    <circle r="22" className={styles.wheelSoft} />
    {SIGN_GLYPHS.map((glyph, k) => {
      const angle = (k * 30 * Math.PI) / 180;
      const mid = ((k * 30 + 15) * Math.PI) / 180;
      return (
        <g key={glyph}>
          <line x1={42 * Math.cos(angle)} y1={42 * Math.sin(angle)} x2={56 * Math.cos(angle)} y2={56 * Math.sin(angle)} className={styles.wheelRing} />
          <text x={49 * Math.cos(mid)} y={49 * Math.sin(mid)} className={styles.wheelGlyph}>
            {`${glyph}︎`}
          </text>
        </g>
      );
    })}
    <path d="M-30 -8 L18 -26 L24 20 Z" className={styles.wheelLines} />
    <path d="M-30 -8 L26 12" className={styles.wheelLines} />
  </svg>
);

export const Home = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  if (!me) return null;
  const hasBirth = me.birth !== null;

  const open = (screen: Screen, needsBirth?: boolean) => {
    dispatch(needsBirth && !hasBirth ? askBirth(screen) : go(screen));
  };

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>
          {me.today.dateLabel}
          {me.sign ? ` · ${me.sign}` : ''}
        </span>
        <h1 className={ui.title}>Чем помочь сегодня?</h1>
      </div>
      <div className={styles.grid}>
        <button className={cx(ui.glass, styles.tile, styles.hero, styles.heroNatal)} type="button" onClick={() => open('natal', true)}>
          <Wheel />
          <span className={styles.heroBody}>
            <span className={styles.heroTitle}>Натальная карта</span>
            <span className={styles.tileDesc}>
              Ваш характер, сильные стороны, где будет трудно и что важно в ближайший год. Каждую планету и дом можно открыть.
            </span>
            <span className={styles.heroAction}>{hasBirth ? 'Открыть карту →' : 'Построить карту →'}</span>
          </span>
        </button>
        <button className={cx(ui.glass, styles.tile, styles.hero)} type="button" onClick={() => dispatch(go('ask'))}>
          <span className={styles.heroBody}>
            <span className={styles.heroTitle}>Задать свой вопрос</span>
            <span className={styles.tileDesc}>
              Про отношения, работу, деньги или то, что происходит сейчас. Бот ответит картами Таро или по вашей натальной карте.
            </span>
            <span className={styles.heroAction}>Спросить →</span>
          </span>
        </button>
        {TILES.map((tile, index) => (
          <button
            key={tile.screen}
            className={cx(ui.glass, styles.tile, TILES.length % 2 === 1 && index === TILES.length - 1 && styles.full)}
            type="button"
            onClick={() => open(tile.screen, tile.needsBirth)}
          >
            {tile.free && <span className={ui.pill}>бесплатно</span>}
            <span className={styles.tileTitle}>{tile.title}</span>
            <span className={styles.tileDesc}>{tile.desc}</span>
          </button>
        ))}
      </div>
      {!hasBirth && (
        <button className={cx(ui.glass, styles.birthBanner)} type="button" onClick={() => dispatch(askBirth('home'))}>
          <span className={styles.tileTitle}>Добавьте дату рождения</span>
          <span className={styles.tileDesc}>С ней гороскоп станет личным, откроются натальная карта, асцендент и совместимость.</span>
        </button>
      )}
    </section>
  );
};
