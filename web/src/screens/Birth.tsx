import { useEffect, useRef } from 'react';
import { BirthForm } from '../components/BirthForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { back } from '../store/navSlice';
import { updateMe } from '../store/profileSlice';
import ui from '../styles/ui.module.css';

export const Birth = () => {
  const dispatch = useAppDispatch();
  const me = useAppSelector((state) => state.profile.me);
  const saving = useAppSelector((state) => state.profile.saving);
  const saveError = useAppSelector((state) => state.profile.saveError);
  const submitted = useRef(false);

  useEffect(() => {
    if (!submitted.current || saving) return;
    submitted.current = false;
    if (!saveError) dispatch(back());
  }, [saving, saveError, dispatch]);

  if (!me) return null;
  const birth = me.birth;

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Данные рождения</span>
        <h1 className={ui.title}>{birth ? 'Изменить данные рождения' : 'Когда и где вы родились?'}</h1>
        <p className={ui.lead}>По этим данным считаются натальная карта, асцендент, транзиты и личный гороскоп. Точнее всего с временем из свидетельства о рождении.</p>
      </div>
      <BirthForm
        key={birth ? `${birth.date}|${birth.time}|${birth.place?.name}` : 'new'}
        idPrefix="me"
        max={me.today.day}
        initialDate={birth?.date}
        initialTime={birth?.time ?? null}
        initialPlace={birth?.place ?? null}
        consent={{ required: !me.consent, privacyUrl: me.privacyUrl }}
        busy={saving}
        error={saveError}
        submitLabel="Сохранить"
        onSubmit={(value) => {
          submitted.current = true;
          dispatch(
            updateMe({
              ...(me.consent ? {} : { consent: true }),
              birth: { date: value.date, time: value.time, placeId: value.placeId, placeName: value.placeName, keepPlace: value.keepPlace }
            })
          );
        }}
      />
      <p className={ui.hint}>Данные хранятся на сервере в России и используются только для расчётов. Нейросеть получает готовые положения планет без вашего имени и аккаунта.</p>
    </section>
  );
};
