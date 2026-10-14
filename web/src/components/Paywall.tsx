import { useEffect } from 'react';
import type { ProductKey } from '../api/schemas';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { go } from '../store/navSlice';
import { fetchPlans, openPay } from '../store/paymentSlice';
import ui from '../styles/ui.module.css';
import styles from './Paywall.module.css';

type Props = {
  title: string;
  text: string;
  topics?: string[];
  product?: Extract<ProductKey, 'natal' | 'compat'>;
  partnerId?: string;
  partnerName?: string;
  compact?: boolean;
};

export const Paywall = ({ title, text, topics, product, partnerId, partnerName, compact }: Props) => {
  const dispatch = useAppDispatch();
  const payments = useAppSelector((state) => state.profile.me?.access.payments ?? false);
  const plans = useAppSelector((state) => state.payment.plans);
  const plansStatus = useAppSelector((state) => state.payment.plansStatus);

  useEffect(() => {
    if (payments && plansStatus === 'idle') void dispatch(fetchPlans());
  }, [payments, plansStatus, dispatch]);

  if (!payments) return null;
  const single = product ? plans?.products.find((item) => item.key === product) : null;
  const year = plans?.products.find((item) => item.key === 'year');
  const perMonth = year ? Math.round(year.price / 12) : null;

  return (
    <div className={cx(ui.glass, styles.wall, compact && styles.compact)}>
      <span className={styles.lock} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="3" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.text}>{text}</span>
      {topics && topics.length > 0 && (
        <div className={styles.topics}>
          {topics.map((topic) => (
            <span key={topic} className={styles.topic}>
              {topic}
            </span>
          ))}
        </div>
      )}
      <div className={styles.actions}>
        {product && single && (
          <button
            className={cx(ui.btn, ui.btnPrimary, ui.btnWide)}
            type="button"
            onClick={() => dispatch(openPay({ product, partnerId: partnerId ?? null, partnerName: partnerName ?? null }))}
          >
            Открыть за {single.price} ₽
          </button>
        )}
        <button className={cx(ui.btn, product ? ui.btnGhost : ui.btnPrimary, ui.btnWide)} type="button" onClick={() => dispatch(go('plan'))}>
          {perMonth ? `Подписка на всё — от ${perMonth} ₽ в месяц` : 'Подписка на всё'}
        </button>
      </div>
    </div>
  );
};
