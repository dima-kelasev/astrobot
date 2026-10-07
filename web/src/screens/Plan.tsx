import { cx } from '../lib/cx';
import { useAppSelector } from '../store/hooks';
import ui from '../styles/ui.module.css';
import styles from './Plan.module.css';

export const Plan = () => {
  const me = useAppSelector((state) => state.profile.me);
  if (!me) return null;
  const { quota, freePerDay } = me;
  const status = quota.subscribed
    ? 'Подписка активна'
    : `Бесплатных раскладов сегодня: ${quota.freeLeft} из ${freePerDay}${quota.credits > 0 ? `, оплаченных: ${quota.credits}` : ''}`;
  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Тарифы</span>
        <h1 className={ui.title}>Подписка</h1>
        <p className={ui.lead}>{status}</p>
      </div>
      <div className={styles.plans}>
        <div className={cx(ui.glass, styles.plan)}>
          <span className={styles.name}>Каждый день</span>
          <span className={styles.price}>0 ₽</span>
          <span className={styles.desc}>Гороскоп дня, карта дня и бесплатный расклад на вопрос.</span>
        </div>
        <div className={cx(ui.glass, styles.plan)}>
          <span className={styles.name}>Расклад сверх лимита</span>
          <span className={styles.price}>99 ₽</span>
          <span className={styles.desc}>Разовая покупка, когда бесплатный расклад уже использован.</span>
        </div>
        <div className={cx(ui.glass, styles.plan, styles.best)}>
          <span className={styles.name}>Подписка</span>
          <span className={styles.price}>299 ₽ / мес</span>
          <span className={styles.desc}>Расклады без лимита, позже натальная карта и совместимость.</span>
        </div>
      </div>
      <p className={ui.hint}>Оплата пока не подключена. Цены предварительные.</p>
    </section>
  );
};
