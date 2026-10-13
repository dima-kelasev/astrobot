import { cx } from '../lib/cx';
import { useAppSelector } from '../store/hooks';
import ui from '../styles/ui.module.css';
import styles from './Plan.module.css';

export const Plan = () => {
  const me = useAppSelector((state) => state.profile.me);
  if (!me) return null;
  const { spread, question, partner } = me.limits;
  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Тарифы</span>
        <h1 className={ui.title}>Подписка</h1>
        <p className={ui.lead}>{me.subscribed ? 'Подписка активна: лимитов нет.' : 'Сейчас все функции открыты с дневными лимитами.'}</p>
      </div>
      <div className={cx(ui.glass, ui.field)}>
        <span className={ui.label}>Сегодня осталось</span>
        <ul className={ui.lines}>
          <li>
            Расклады: {Math.max(0, spread.max - spread.used)} из {spread.max}
          </li>
          <li>
            Свои вопросы: {Math.max(0, question.max - question.used)} из {question.max}
          </li>
          <li>
            Совместимость: {Math.max(0, partner.max - partner.used)} из {partner.max}
          </li>
        </ul>
      </div>
      <div className={styles.plans}>
        <div className={cx(ui.glass, styles.plan)}>
          <span className={styles.name}>Бесплатно</span>
          <span className={styles.desc}>Гороскоп и карта дня каждый день, асцендент, расклад на вопрос.</span>
        </div>
        <div className={cx(ui.glass, styles.plan, styles.best)}>
          <span className={styles.name}>Подписка</span>
          <span className={styles.desc}>Натальная карта, «Почему сейчас так?», совместимость, свои вопросы и расклады по темам без лимитов.</span>
        </div>
      </div>
      <p className={ui.hint}>Оплата появится в следующем обновлении.</p>
    </section>
  );
};
