import { cx } from '../lib/cx';
import { useAppSelector } from '../store/hooks';
import styles from './FreeBadge.module.css';

export type FreeFeature = 'question' | 'spread' | 'partner';

export type FreeStatus = 'open' | 'free' | 'locked';

const FORMS: Record<FreeFeature, readonly [string, string, string]> = {
  question: ['вопрос', 'вопроса', 'вопросов'],
  spread: ['расклад', 'расклада', 'раскладов'],
  partner: ['совместимость', 'совместимости', 'совместимостей']
};

const plural = (n: number, forms: readonly [string, string, string]) => {
  const tail = n % 100;
  if (tail >= 11 && tail <= 14) return forms[2];
  if (n % 10 === 1) return forms[0];
  if (n % 10 >= 2 && n % 10 <= 4) return forms[1];
  return forms[2];
};

export const useFree = (feature: FreeFeature) =>
  useAppSelector((state) => {
    const me = state.profile.me;
    if (!me || !me.access.payments || me.access.subscribed) return { status: 'open' as const, left: 0 };
    const limit = me.limits[feature];
    const left = Math.max(0, limit.max - limit.used);
    return { status: left > 0 ? ('free' as const) : ('locked' as const), left };
  });

export const usePaid = () => useAppSelector((state) => Boolean(state.profile.me?.access.payments && !state.profile.me.access.subscribed));

export const freeLabel = (feature: FreeFeature, left: number) => `${left} ${plural(left, FORMS[feature])} бесплатно`;

type Props = { feature: FreeFeature; className?: string; center?: boolean };

export const FreeBadge = ({ feature, className, center }: Props) => {
  const { status, left } = useFree(feature);
  if (status !== 'free') return null;
  return (
    <div className={cx(styles.badge, center && styles.center, className)} role="status">
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 14.3 9.7 21.5 12 14.3 14.3 12 21.5 9.7 14.3 2.5 12 9.7 9.7Z" fill="currentColor" />
      </svg>
      <span className={styles.text}>
        <span className={styles.title}>{freeLabel(feature, left)}</span>
        <span className={styles.sub}>Попробуйте сейчас, дальше — с подпиской</span>
      </span>
    </div>
  );
};

type TagProps = { kind: 'free' | 'locked'; text: string };

export const Tag = ({ kind, text }: TagProps) => (
  <span className={cx(styles.tag, kind === 'locked' ? styles.tagLocked : styles.tagFree)}>
    {kind === 'locked' ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="3" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 14.3 9.7 21.5 12 14.3 14.3 12 21.5 9.7 14.3 2.5 12 9.7 9.7Z" fill="currentColor" />
      </svg>
    )}
    {text}
  </span>
);

export const LockIcon = ({ className }: { className?: string }) => (
  <svg
    className={cx(styles.lockIcon, className)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label="по подписке"
  >
    <rect x="5" y="11" width="14" height="10" rx="3" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
