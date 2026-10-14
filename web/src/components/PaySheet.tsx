import { useEffect, useState } from 'react';
import type { PayMethod } from '../api/client';
import type { ProductKey } from '../api/schemas';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { backToChoose, checkPayment, closePay, fetchPlans, startPayment } from '../store/paymentSlice';
import { updateMe } from '../store/profileSlice';
import { telegram } from '../telegram';
import ui from '../styles/ui.module.css';
import styles from './PaySheet.module.css';

const METHODS: { key: PayMethod; label: string }[] = [
  { key: 'sbp', label: 'СБП — по QR или в приложении банка' },
  { key: 'card', label: 'Банковская карта' },
  { key: 'other', label: 'Другой способ' }
];

const SUFFIX: Record<ProductKey, string> = {
  month: 'за 30 дней',
  quarter: 'за 90 дней',
  year: 'за год',
  natal: 'за натальную карту целиком',
  compat: 'за совместимость'
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const dateText = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const PaySheet = () => {
  const dispatch = useAppDispatch();
  const sheet = useAppSelector((state) => state.payment.sheet);
  const step = useAppSelector((state) => state.payment.step);
  const url = useAppSelector((state) => state.payment.url);
  const plans = useAppSelector((state) => state.payment.plans);
  const me = useAppSelector((state) => state.profile.me);
  const saving = useAppSelector((state) => state.profile.saving);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!sheet || plans) return;
    const request = dispatch(fetchPlans());
    return () => request.abort();
  }, [sheet, plans, dispatch]);

  useEffect(() => {
    if (step !== 'waiting') return;
    const check = () => {
      if (!document.hidden) void dispatch(checkPayment());
    };
    const timer = setInterval(check, 4000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [step, dispatch]);

  useEffect(() => {
    setEditing(false);
    setDraft('');
  }, [sheet]);

  if (!sheet || !me) return null;
  const product = plans?.products.find((item) => item.key === sheet.product) ?? null;
  const email = me.email;
  const askEmail = !email || editing;
  const valid = EMAIL.test(draft.trim());
  const suffix = sheet.product === 'compat' && sheet.partnerName ? `за совместимость с ${sheet.partnerName}` : SUFFIX[sheet.product];

  const saveEmail = async () => {
    if (!valid) return;
    const result = await dispatch(updateMe({ email: draft.trim() }));
    if (updateMe.fulfilled.match(result)) setEditing(false);
  };

  const close = () => dispatch(closePay());

  return (
    <div className={styles.backdrop} role="presentation" onClick={close}>
      <div className={cx(ui.glass, styles.sheet)} role="dialog" aria-modal="true" aria-label="Оплата" onClick={(event) => event.stopPropagation()}>
        <button className={styles.close} type="button" aria-label="Закрыть" onClick={close}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        {step === 'success' ? (
          <div className={styles.body}>
            <span className={styles.icon} aria-hidden="true">
              ✓
            </span>
            <h2 className={styles.title}>Оплата прошла</h2>
            <p className={styles.text}>
              {me.access.subscribed && me.access.until
                ? `Подписка активна до ${dateText(me.access.until)}. Всё уже открыто.`
                : 'Покупка открыта. Можно читать прямо сейчас.'}
            </p>
            <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="button" onClick={close}>
              Отлично
            </button>
          </div>
        ) : (
          <div className={styles.body}>
            <h2 className={styles.title}>{product ? `Оплата ${product.price} ₽ ${suffix}` : 'Оплата'}</h2>

            {askEmail ? (
              <div className={styles.email}>
                <label className={ui.label} htmlFor="pay-email">
                  Почта для чека
                </label>
                <div className={styles.emailRow}>
                  <input
                    id="pay-email"
                    className={ui.input}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@mail.ru"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <button className={cx(ui.btn, ui.btnPrimary, ui.btnSmall)} type="button" disabled={!valid || saving} onClick={() => void saveEmail()}>
                    Сохранить
                  </button>
                </div>
                <span className={ui.hint}>Чек об оплате придёт на эту почту. Укажете один раз, мы её запомним.</span>
              </div>
            ) : (
              <p className={styles.text}>
                Чек придёт на <b>{email}</b>{' '}
                <button
                  className={styles.link}
                  type="button"
                  onClick={() => {
                    setDraft(email ?? '');
                    setEditing(true);
                  }}
                >
                  изменить
                </button>
              </p>
            )}

            {step === 'choose' && !askEmail && (
              <>
                <span className={styles.text}>Выберите способ оплаты:</span>
                <div className={styles.methods}>
                  {METHODS.map((method) => (
                    <button
                      key={method.key}
                      className={styles.method}
                      type="button"
                      disabled={!product}
                      onClick={() => void dispatch(startPayment(method.key))}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'creating' && <p className={styles.text}>Готовим оплату…</p>}

            {step === 'waiting' && (
              <>
                <p className={styles.text}>Страница оплаты открылась. Оплатите и вернитесь сюда: доступ откроется сам.</p>
                <div className={styles.methods}>
                  <button className={styles.method} type="button" onClick={() => void dispatch(checkPayment())}>
                    Я оплатил, проверить
                  </button>
                  {url && (
                    <button className={cx(styles.method, styles.methodGhost)} type="button" onClick={() => telegram.openLink(url)}>
                      Открыть оплату ещё раз
                    </button>
                  )}
                </div>
              </>
            )}

            {(step === 'error' || step === 'canceled') && (
              <>
                <p className={ui.error}>
                  {step === 'canceled' ? 'Оплата не прошла или была отменена. Деньги не списаны.' : 'Не получилось открыть оплату. Попробуйте ещё раз.'}
                </p>
                <button className={cx(ui.btn, ui.btnGhost, ui.btnWide)} type="button" onClick={() => dispatch(backToChoose())}>
                  Выбрать способ оплаты
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
