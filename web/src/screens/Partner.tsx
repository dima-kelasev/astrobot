import { useEffect, useState } from 'react';
import { Paywall } from '../components/Paywall';
import { Reading } from '../components/Reading';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { go } from '../store/navSlice';
import { fetchPartner, removePartner } from '../store/partnersSlice';
import { fetchReading } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';

export const Partner = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const id = useAppSelector((state) => state.nav.params.partnerId);
  const detail = useAppSelector((state) => state.partners.detail);
  const status = useAppSelector((state) => state.partners.detailStatus);
  const [confirm, setConfirm] = useState(false);
  const ready = detail !== null && detail.partner.id === id;
  const full = useAppSelector((state) => {
    const access = state.profile.me?.access;
    return !access || !access.payments || access.subscribed || (id !== null && access.compat.includes(id));
  });
  const readingKey = id ? `${id}|${full ? 'full' : 'free'}` : null;

  useEffect(() => {
    if (!id) return;
    const request = dispatch(fetchPartner(id));
    return () => request.abort();
  }, [id, dispatch]);

  useEffect(() => {
    if (!ready || !id || !readingKey) return;
    const current = store.getState().readings.compat;
    if (current.key === readingKey && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'compat', key: readingKey, path: `/api/partners/${id}/reading` }));
    return () => request.abort();
  }, [ready, id, readingKey, dispatch, store]);

  if (!id) return null;

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Совместимость</span>
        <h1 className={ui.title}>{ready ? `${detail.userSign} и ${detail.partner.sign}` : 'Считаем…'}</h1>
        {ready && <p className={ui.lead}>Вы и {detail.partner.name}</p>}
      </div>
      {status === 'error' && <p className={ui.error}>Не получилось загрузить данные. Откройте экран ещё раз.</p>}
      {ready && (
        <>
          <div className={cx(ui.glass, ui.field)}>
            <span className={ui.label}>Главные связи между картами</span>
            {detail.aspects.length ? (
              <ul className={ui.lines}>
                {detail.aspects.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className={ui.hint}>Точных аспектов между картами нет.</p>
            )}
          </div>
          <Reading
            kind="compat"
            locked={
              <Paywall
                title={`Дальше о вас и ${detail.partner.name}`}
                text="Где между вами трения, как договариваться и на что обратить внимание."
                topics={['Где трения', 'Как договариваться', 'На что обратить внимание']}
                product="compat"
                partnerId={detail.partner.id}
                partnerName={detail.partner.name}
              />
            }
          />
          {!confirm ? (
            <button className={cx(ui.btn, ui.btnGhost, ui.btnWide)} type="button" onClick={() => setConfirm(true)}>
              Удалить этого человека
            </button>
          ) : (
            <div className={ui.row}>
              <button
                className={cx(ui.btn, ui.btnGhost)}
                type="button"
                onClick={() => {
                  dispatch(removePartner(id));
                  dispatch(go('compat'));
                }}
              >
                Да, удалить
              </button>
              <button className={cx(ui.btn, ui.btnGhost)} type="button" onClick={() => setConfirm(false)}>
                Отмена
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
