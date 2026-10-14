import { useEffect } from 'react';
import { PromoField } from '../components/PromoField';
import type { ProductKey } from '../api/schemas';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPlans, openPay } from '../store/paymentSlice';
import ui from '../styles/ui.module.css';
import styles from './Plan.module.css';

const INCLUDED = [
  'Натальная карта целиком: все планеты, дома, слабые места и советы',
  'Прогноз на ближайший год, обновляется каждый месяц',
  '«Почему сейчас так?» по вашей карте',
  'Свои вопросы и расклады по темам без ограничений',
  'Совместимость с любыми людьми'
];

const SUBS: { key: Extract<ProductKey, 'month' | 'quarter' | 'year'>; months: number; note: string | null }[] = [
  { key: 'year', months: 12, note: 'Выгоднее всего' },
  { key: 'quarter', months: 3, note: null },
  { key: 'month', months: 1, note: null }
];

const dateText = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

const Price = ({ price, full }: { price: number; full: number }) => (
  <span className={styles.price}>
    {full !== price && <s className={styles.old}>{full} ₽</s>}
    {price} ₽
  </span>
);

export const Plan = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  const plans = useAppSelector((state) => state.payment.plans);
  const status = useAppSelector((state) => state.payment.plansStatus);

  useEffect(() => {
    const request = dispatch(fetchPlans());
    return () => request.abort();
  }, [dispatch]);

  if (!me) return null;
  const access = me.access;
  const priceOf = (key: ProductKey) => plans?.products.find((item) => item.key === key) ?? null;
  const natal = priceOf('natal');

  if (!access.payments) {
    return (
      <section className={ui.screen}>
        <div className={ui.head}>
          <span className={ui.eyebrow}>Подписка</span>
          <h1 className={ui.title}>Сейчас всё открыто</h1>
          <p className={ui.lead}>Пока подписка не нужна: все функции работают бесплатно с небольшими дневными лимитами.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Подписка</span>
        <h1 className={ui.title}>Всё о вас без ограничений</h1>
        <p className={ui.lead}>Гороскоп, карта дня и асцендент остаются бесплатными. Подписка открывает всё остальное.</p>
      </div>

      {access.subscribed && access.until && (
        <div className={cx(ui.glass, styles.active)}>
          <span className={styles.activeTitle}>Подписка активна</span>
          <span className={styles.desc}>До {dateText(access.until)}. Продлить можно заранее: дни прибавятся к текущему сроку.</span>
        </div>
      )}

      <ul className={cx(ui.glass, styles.included)}>
        {INCLUDED.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {status === 'error' && <p className={ui.error}>Не получилось загрузить тарифы. Откройте экран ещё раз.</p>}

      <div className={styles.plans}>
        {SUBS.map((sub) => {
          const product = priceOf(sub.key);
          if (!product) return null;
          return (
            <button
              key={sub.key}
              className={cx(ui.glass, styles.plan, sub.note && styles.best)}
              type="button"
              onClick={() => dispatch(openPay({ product: sub.key, partnerId: null, partnerName: null }))}
            >
              <span className={styles.name}>
                {product.short}
                {sub.note && <span className={styles.badge}>{sub.note}</span>}
              </span>
              <Price price={product.price} full={product.full} />
              <span className={styles.desc}>{sub.months > 1 ? `${Math.round(product.price / sub.months)} ₽ в месяц` : 'Можно начать с месяца'}</span>
            </button>
          );
        })}
      </div>

      {natal && !access.natal && (
        <button
          className={cx(ui.glass, styles.plan, styles.single)}
          type="button"
          onClick={() => dispatch(openPay({ product: 'natal', partnerId: null, partnerName: null }))}
        >
          <span className={styles.name}>Только натальная карта</span>
          <Price price={natal.price} full={natal.full} />
          <span className={styles.desc}>Все планеты, дома и советы вашей карты. Покупается один раз и остаётся навсегда.</span>
        </button>
      )}

      <div className={cx(ui.glass, ui.field)}>
        <PromoField />
      </div>

      <p className={ui.hint}>
        Оплата через ЮKassa: СБП, банковская карта и другие способы. Подписка не продлевается сама, списаний без вашего ведома не будет.
      </p>
    </section>
  );
};
