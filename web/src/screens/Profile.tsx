import { useState } from 'react';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { go } from '../store/navSlice';
import { deleteMe, updateMe } from '../store/profileSlice';
import ui from '../styles/ui.module.css';
import { telegram } from '../telegram';

const formatDate = (value: string) => value.split('-').reverse().join('.');

export const Profile = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  const saving = useAppSelector((state) => state.profile.saving);
  const deleting = useAppSelector((state) => state.profile.deleting);
  const saveError = useAppSelector((state) => state.profile.saveError);
  const [confirm, setConfirm] = useState(false);
  if (!me) return null;
  const birth = me.birth;

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Профиль</span>
        <h1 className={ui.title}>{me.sign ? `${me.sign}${me.ascSign ? `, асцендент в знаке ${me.ascSign}` : ''}` : me.firstName || 'Профиль'}</h1>
      </div>
      <div className={cx(ui.glass, ui.field)}>
        <span className={ui.label}>Данные рождения</span>
        {birth ? (
          <ul className={ui.lines}>
            <li>Дата: {formatDate(birth.date)}</li>
            <li>Время: {birth.time ?? 'не указано, расчёт без асцендента и домов'}</li>
            <li>Город: {birth.place ? `${birth.place.name}${birth.place.label ? `, ${birth.place.label}` : ''}` : 'не указан'}</li>
          </ul>
        ) : (
          <p className={ui.hint}>Пока не указаны. С ними откроются личный гороскоп, натальная карта, асцендент и совместимость.</p>
        )}
        <div className={ui.row}>
          <button className={cx(ui.btn, birth ? ui.btnGhost : ui.btnPrimary, ui.btnSmall)} type="button" onClick={() => dispatch(go('birth'))}>
            {birth ? 'Изменить' : 'Указать'}
          </button>
        </div>
      </div>
      <label className={cx(ui.glass, ui.field, ui.switchRow)} htmlFor="notifyMorning">
        <span className={ui.switchText}>
          <span className={ui.label}>Утреннее сообщение</span>
          <span className={ui.hint}>Гороскоп и карта дня каждое утро.</span>
        </span>
        <input
          className={ui.switch}
          id="notifyMorning"
          type="checkbox"
          role="switch"
          checked={me.notifyMorning}
          disabled={saving}
          onChange={(event) => dispatch(updateMe({ notifyMorning: event.target.checked }))}
        />
      </label>
      <label className={cx(ui.glass, ui.field, ui.switchRow)} htmlFor="notifyEvening">
        <span className={ui.switchText}>
          <span className={ui.label}>Вечернее сообщение</span>
          <span className={ui.hint}>Приглашение к раскладу вечером.</span>
        </span>
        <input
          className={ui.switch}
          id="notifyEvening"
          type="checkbox"
          role="switch"
          checked={me.notifyEvening}
          disabled={saving}
          onChange={(event) => dispatch(updateMe({ notifyEvening: event.target.checked }))}
        />
      </label>
      {saveError && <p className={ui.error}>Не получилось сохранить. Попробуйте ещё раз.</p>}
      <div className={ui.block}>
        <h2 className={ui.sub}>Как это устроено</h2>
        <ul className={cx(ui.dash, ui.col)}>
          <li>Положения планет, асцендент и дома считает программа по астрономическим формулам.</li>
          <li>Карты Таро перемешиваются на сервере случайным образом.</li>
          <li>Текст толкования пишет нейросеть по этим расчётам. Она не получает ваше имя и аккаунт.</li>
        </ul>
      </div>
      <div className={cx(ui.glass, ui.field)}>
        <span className={ui.label}>Ваши данные</span>
        {me.privacyUrl && (
          <button className={cx(ui.link, ui.hint)} type="button" onClick={() => telegram.openLink(me.privacyUrl)}>
            Политика обработки персональных данных
          </button>
        )}
        {!confirm ? (
          <button className={cx(ui.btn, ui.btnGhost, ui.btnSmall)} type="button" onClick={() => setConfirm(true)}>
            Удалить мои данные
          </button>
        ) : (
          <>
            <p className={ui.hint}>Удалятся данные рождения, история, расклады и люди в совместимости. Отменить это нельзя.</p>
            <div className={ui.row}>
              <button
                className={cx(ui.btn, ui.btnGhost, ui.btnSmall)}
                type="button"
                disabled={deleting}
                onClick={() => {
                  setConfirm(false);
                  dispatch(deleteMe());
                }}
              >
                Да, удалить всё
              </button>
              <button className={cx(ui.btn, ui.btnGhost, ui.btnSmall)} type="button" onClick={() => setConfirm(false)}>
                Отмена
              </button>
            </div>
          </>
        )}
      </div>
      <p className={ui.hint}>Данные о городах: GeoNames (CC BY 3.0) и russia-cities-data.</p>
    </section>
  );
};
