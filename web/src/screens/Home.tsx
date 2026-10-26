import { Tag, freeLabel, useFree, type FreeStatus } from '../components/FreeBadge';
import { Freya } from '../components/Freya';
import { SubReminder } from '../components/SubStatus';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { askBirth, go, type Screen } from '../store/navSlice';
import ui from '../styles/ui.module.css';
import styles from './Home.module.css';

type Tile = { screen: Screen; title: string; desc: string; free?: boolean; needsBirth?: boolean; feature?: 'spread' | 'partner'; paid?: boolean };

const TILES: Tile[] = [
  { screen: 'sky', title: 'Гороскоп', desc: 'По Луне и транзитам к вашей карте', free: true, needsBirth: true },
  { screen: 'day', title: 'Карта дня', desc: 'Одна карта и вопрос на сегодня', free: true },
  { screen: 'topics', title: 'Расклады по темам', desc: 'Любовь, работа, выбор, сценарии', feature: 'spread' },
  { screen: 'why', title: 'Почему сейчас так?', desc: 'Что сейчас активно в вашей карте', needsBirth: true, paid: true },
  { screen: 'asc', title: 'Асцендент', desc: 'Как вас видят люди', free: true, needsBirth: true },
  { screen: 'compat', title: 'Совместимость', desc: 'Сильные и слабые стороны пары', needsBirth: true, feature: 'partner' }
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

type Status = { status: FreeStatus; left: number };

const LOCKED = { kind: 'locked', text: 'по подписке' } as const;

const tagFor = (tile: Tile, payments: boolean, subscribed: boolean, spread: Status, partner: Status) => {
  if (subscribed) return null;
  if (tile.free) return { kind: 'free', text: 'бесплатно' } as const;
  if (!payments) return null;
  if (tile.paid) return LOCKED;
  const current = tile.feature === 'spread' ? spread : tile.feature === 'partner' ? partner : null;
  if (!current) return null;
  if (current.status === 'free') return { kind: 'free', text: `${current.left} бесплатно` } as const;
  if (current.status === 'locked') return LOCKED;
  return null;
};

export const Home = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  const question = useFree('question');
  const spread = useFree('spread');
  const partner = useFree('partner');
  if (!me) return null;
  const hasBirth = me.birth !== null;
  const { payments, subscribed } = me.access;
  const paid = payments && !subscribed;

  const open = (screen: Screen, needsBirth?: boolean) => {
    dispatch(needsBirth && !hasBirth ? askBirth(screen) : go(screen));
  };

  return (
    <section className={ui.screen}>
      <div className={styles.greet}>
        <Freya size={104} className={styles.freya} />
        <div className={styles.greetText}>
          <span className={ui.eyebrow}>
            {me.today.dateLabel}
            {me.sign ? ` · ${me.sign}` : ''}
          </span>
          <h1 className={styles.greetTitle}>{me.firstName ? `Здравствуйте, ${me.firstName}!` : 'Здравствуйте!'}</h1>
          <p className={styles.greetLead}>Я Фрея. Читаю звёзды и карты. С чего начнём сегодня?</p>
        </div>
      </div>
      <SubReminder />
      <div className={styles.grid}>
        <button className={cx(ui.glass, styles.tile, styles.hero, styles.heroNatal)} type="button" onClick={() => open('natal', true)}>
          <Wheel />
          <span className={styles.heroBody}>
            {paid && !me.access.natal && <Tag kind="free" text="характер бесплатно" />}
            <span className={styles.heroTitle}>Натальная карта</span>
            <span className={styles.tileDesc}>
              Ваш характер, сильные стороны, где будет трудно и что важно в ближайший год. Каждую планету и дом можно открыть.
            </span>
            <span className={styles.heroAction}>{hasBirth ? 'Открыть карту →' : 'Построить карту →'}</span>
          </span>
        </button>
        <button className={cx(ui.glass, styles.tile, styles.hero)} type="button" onClick={() => dispatch(go('ask'))}>
          <span className={styles.heroBody}>
            {question.status === 'free' && <Tag kind="free" text={freeLabel('question', question.left)} />}
            {question.status === 'locked' && <Tag kind="locked" text="по подписке" />}
            <span className={styles.heroTitle}>Спросить Фрею</span>
            <span className={styles.tileDesc}>
              Про отношения, работу, деньги или то, что происходит сейчас. Фрея ответит картами Таро или по вашей натальной карте.
            </span>
            <span className={styles.heroAction}>Спросить →</span>
          </span>
        </button>
        {TILES.map((tile, index) => {
          const tag = tagFor(tile, payments, subscribed, spread, partner);
          return (
            <button
              key={tile.screen}
              className={cx(ui.glass, styles.tile, TILES.length % 2 === 1 && index === TILES.length - 1 && styles.full)}
              type="button"
              onClick={() => open(tile.screen, tile.needsBirth)}
            >
              {tag && <Tag kind={tag.kind} text={tag.text} />}
              <span className={styles.tileTitle}>{tile.title}</span>
              <span className={styles.tileDesc}>{tile.desc}</span>
            </button>
          );
        })}
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
