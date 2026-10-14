import { useEffect, useState } from 'react';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { applyPromo, resetPromo } from '../store/paymentSlice';
import ui from '../styles/ui.module.css';
import styles from './PromoField.module.css';

const ERRORS: Record<string, string> = {
  promo_not_found: 'Такого промокода нет или он больше не действует.',
  promo_bad_code: 'Такого промокода нет или он больше не действует.',
  promo_used: 'Вы уже применяли этот промокод.',
  promo_exhausted: 'Промокод закончился: все активации уже разобрали.',
  promo_has_discount: 'У вас уже есть скидка не меньше этой. Она сработает при следующей покупке.',
  promo_payments_off: 'Сейчас всё открыто бесплатно, промокод не нужен.',
  promo_too_many: 'Слишком много попыток. Попробуйте через час.'
};

const daysWord = (n: number) => {
  const tail = n % 100;
  if (tail >= 11 && tail <= 14) return 'дней';
  if (n % 10 === 1) return 'день';
  if (n % 10 >= 2 && n % 10 <= 4) return 'дня';
  return 'дней';
};

const dateText = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(iso));

export const PromoField = ({ open: startOpen = false }: { open?: boolean }) => {
  const dispatch = useAppDispatch();
  const promo = useAppSelector((state) => state.payment.promo);
  const payments = useAppSelector((state) => state.profile.me?.access.payments ?? false);
  const discount = useAppSelector((state) => state.profile.me?.access.discount ?? null);
  const [open, setOpen] = useState(startOpen);
  const [code, setCode] = useState('');

  useEffect(
    () => () => {
      dispatch(resetPromo());
    },
    [dispatch]
  );

  if (!payments) return null;
  const saving = promo.status === 'saving';
  const valid = code.trim().length >= 3;
  const result = promo.result;

  const submit = () => {
    if (!valid || saving) return;
    void dispatch(applyPromo(code.trim()));
  };

  return (
    <div className={styles.wrap}>
      {discount && !result && (
        <p className={styles.active}>
          Скидка {discount.percent}% по промокоду {discount.code} ждёт следующей покупки.
        </p>
      )}
      {result && (
        <p className={styles.ok}>
          {result.kind === 'days'
            ? `Готово: подписка на ${result.value} ${daysWord(result.value)}${result.until ? `, до ${dateText(result.until)}` : ''}. Всё уже открыто.`
            : `Готово: скидка ${result.value}% на следующую покупку. Цены уже пересчитаны.`}
        </p>
      )}
      {!open && !result && (
        <button className={cx(ui.link, styles.toggle)} type="button" onClick={() => setOpen(true)}>
          Есть промокод?
        </button>
      )}
      {open && !result && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className={ui.label} htmlFor="promo-code">
            Промокод
          </label>
          <div className={styles.row}>
            <input
              id="promo-code"
              className={cx(ui.input, styles.input)}
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              placeholder="Например, STAR20"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (promo.status === 'error') dispatch(resetPromo());
              }}
            />
            <button className={cx(ui.btn, ui.btnPrimary, ui.btnSmall)} type="submit" disabled={!valid || saving}>
              {saving ? 'Проверяю…' : 'Применить'}
            </button>
          </div>
          {promo.status === 'error' && <p className={ui.error}>{ERRORS[promo.error ?? ''] ?? 'Не получилось проверить код. Попробуйте ещё раз.'}</p>}
        </form>
      )}
    </div>
  );
};
