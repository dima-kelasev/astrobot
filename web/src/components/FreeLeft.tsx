import { cx } from '../lib/cx';
import { useAppSelector } from '../store/hooks';
import ui from '../styles/ui.module.css';

type Props = { feature: 'spread' | 'question' | 'partner'; className?: string };

export const FreeLeft = ({ feature, className }: Props) => {
  const me = useAppSelector((state) => state.profile.me);
  if (!me || me.access.subscribed) return null;
  const limit = me.limits[feature];
  const left = Math.max(0, limit.max - limit.used);
  const text = me.access.payments
    ? left > 0
      ? `Бесплатно: ${left} из ${limit.max}`
      : 'Бесплатная попытка использована'
    : `Сегодня бесплатно: ${left} из ${limit.max}`;
  return <p className={cx(ui.hint, ui.center, className)}>{text}</p>;
};
