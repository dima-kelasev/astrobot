import { useEffect, useState } from 'react';
import { BirthForm } from '../components/BirthForm';
import { LimitNote } from '../components/LimitNote';
import { NeedBirth } from '../components/NeedBirth';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { openPartner } from '../store/navSlice';
import { addPartner, fetchPartners } from '../store/partnersSlice';
import ui from '../styles/ui.module.css';

export const Compat = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const me = useAppSelector((state) => state.profile.me);
  const list = useAppSelector((state) => state.partners.list);
  const status = useAppSelector((state) => state.partners.status);
  const adding = useAppSelector((state) => state.partners.adding);
  const addError = useAppSelector((state) => state.partners.addError);
  const [formOpen, setFormOpen] = useState(false);
  const hasBirth = Boolean(me?.birth);

  useEffect(() => {
    if (!hasBirth || store.getState().partners.status === 'ready') return;
    const request = dispatch(fetchPartners());
    return () => request.abort();
  }, [hasBirth, dispatch, store]);

  if (!me) return null;
  const limit = me.limits.partner;
  const showForm = formOpen || (status === 'ready' && list.length === 0);
  const blocked = addError === 'limit' || addError === 'premium';

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Синастрия</span>
        <h1 className={ui.title}>Совместимость</h1>
        <p className={ui.lead}>Сравним вашу карту с картой другого человека: где вы сходитесь, где возможны трения и как договариваться.</p>
      </div>
      {!hasBirth && <NeedBirth returnTo="compat" title="Сначала ваши данные" text="Для совместимости нужна и ваша карта рождения." />}
      {hasBirth && list.length > 0 && (
        <div className={cx(ui.glass, ui.list)}>
          {list.map((partner) => (
            <button key={partner.id} className={ui.listItem} type="button" onClick={() => dispatch(openPartner(partner.id))}>
              <span className={ui.listText}>
                <span className={ui.listTitle}>{partner.name}</span>
                <span className={ui.listDesc}>
                  {partner.sign}, {partner.birthDate.split('-').reverse().join('.')}
                  {partner.birthTime ? `, ${partner.birthTime}` : ''}
                </span>
              </span>
              <span className={ui.chevron} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {hasBirth && !showForm && (
        <button className={cx(ui.btn, ui.btnPrimary, ui.btnWide)} type="button" onClick={() => setFormOpen(true)}>
          Добавить человека
        </button>
      )}
      {hasBirth && showForm && (
        <>
          <h2 className={ui.sub}>Данные второго человека</h2>
          <BirthForm
            idPrefix="partner"
            max={me.today.day}
            withName
            busy={adding}
            error={blocked ? null : addError}
            submitLabel="Посчитать совместимость"
            onSubmit={(value) => dispatch(addPartner(value))}
          />
          <p className={ui.hint}>Достаточно даты. Время и город сделают расчёт точнее. Данные этого человека видите только вы, удалить их можно в любой момент.</p>
        </>
      )}
      {blocked && addError && <LimitNote code={addError} />}
      {hasBirth && <p className={cx(ui.hint, ui.center)}>Сегодня бесплатно: {Math.max(0, limit.max - limit.used)} из {limit.max}</p>}
    </section>
  );
};
