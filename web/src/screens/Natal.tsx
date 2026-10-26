import { useEffect } from 'react';
import { AspectList, HouseCard, PlanetCard, focusPart } from '../components/NatalParts';
import { Tag } from '../components/FreeBadge';
import { NatalWheel } from '../components/NatalWheel';
import { NeedBirth } from '../components/NeedBirth';
import { Paywall } from '../components/Paywall';
import { Reading } from '../components/Reading';
import { cx } from '../lib/cx';
import { NATAL_TABS, fetchNatal, setNatalTab, type NatalTab } from '../store/chartSlice';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { askBirth } from '../store/navSlice';
import { fetchReading } from '../store/readingsSlice';
import ui from '../styles/ui.module.css';
import styles from './Natal.module.css';

const TAB_TITLES: Record<NatalTab, string> = { planets: 'Планеты', houses: 'Дома', aspects: 'Аспекты' };

export const Natal = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const birth = useAppSelector((state) => state.profile.me?.birth ?? null);
  const natal = useAppSelector((state) => state.chart.natal.data);
  const status = useAppSelector((state) => state.chart.natal.status);
  const tab = useAppSelector((state) => state.chart.natalView.tab);
  const open = useAppSelector((state) => state.chart.natalView.open);
  const full = useAppSelector((state) => state.profile.me?.access.natal ?? true);
  const birthKey = birth ? `${birth.date}|${birth.time ?? '-'}|${birth.place?.name ?? '-'}` : null;
  const readingKey = natal && birthKey ? `${birthKey}|${full ? 'full' : 'free'}` : null;

  useEffect(() => {
    if (!birth || store.getState().chart.natal.status === 'ready') return;
    const request = dispatch(fetchNatal());
    return () => request.abort();
  }, [birth, dispatch, store]);

  useEffect(() => {
    if (!readingKey) return;
    const current = store.getState().readings.natal;
    if (current.key === readingKey && current.status === 'done') return;
    const request = dispatch(fetchReading({ kind: 'natal', key: readingKey, path: '/api/natal/reading' }));
    return () => request.abort();
  }, [readingKey, dispatch, store]);

  if (!birth) {
    return (
      <section className={ui.screen}>
        <div className={ui.head}>
          <h1 className={ui.title}>Натальная карта</h1>
        </div>
        <NeedBirth returnTo="natal" title="Нужны данные рождения" text="Карта строится по дате, времени и городу рождения." />
      </section>
    );
  }

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Натальная карта</span>
        <h1 className={ui.title}>Небо в момент вашего рождения</h1>
        <p className={ui.lead}>
          {birth.date.split('-').reverse().join('.')}
          {birth.time ? `, ${birth.time}` : ''}
          {birth.place ? `, ${birth.place.name}` : ''}
        </p>
      </div>
      {status === 'error' && <p className={ui.error}>Не получилось построить карту. Откройте экран ещё раз.</p>}
      {natal && readingKey && (
        <>
          <div className={cx(ui.glass, styles.wheelCard)}>
            <NatalWheel natal={natal} selected={open} onSelect={(part) => focusPart(dispatch, part)} />
            <p className={styles.wheelHint}>Нажмите на планету или номер дома, чтобы открыть подробности</p>
          </div>
          {!natal.hasTime && (
            <div className={cx(ui.glass, ui.notice)}>
              <span className={ui.sub}>Расчёт неточный</span>
              <p className={ui.hint}>
                Без времени рождения карта построена на полдень: нет асцендента, домов и Парса Фортуны, положение Луны может отличаться на несколько градусов.
              </p>
              <button className={cx(ui.btn, ui.btnGhost, ui.btnSmall)} type="button" onClick={() => dispatch(askBirth('natal'))}>
                Указать время
              </button>
            </div>
          )}
          <div className={styles.tabs} role="tablist">
            {NATAL_TABS.map((key) => (
              <button
                key={key}
                className={cx(styles.tab, tab === key && styles.tabOn)}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => dispatch(setNatalTab(key))}
              >
                {TAB_TITLES[key]}
              </button>
            ))}
          </div>
          {tab === 'planets' && (
            <div className={styles.stack}>
              {natal.items.map((item) => (
                <PlanetCard key={item.key} item={item} baseKey={birthKey ?? ''} />
              ))}
            </div>
          )}
          {tab === 'houses' && (
            <div className={styles.stack}>
              {natal.houseItems.length > 0 ? (
                natal.houseItems.map((house) => <HouseCard key={house.house} house={house} baseKey={birthKey ?? ''} />)
              ) : (
                <div className={cx(ui.glass, ui.notice)}>
                  <span className={ui.sub}>Нужно время рождения</span>
                  <p className={ui.hint}>Дома зависят от точного времени и места рождения. Без них их не посчитать.</p>
                  <button className={cx(ui.btn, ui.btnGhost, ui.btnSmall)} type="button" onClick={() => dispatch(askBirth('natal'))}>
                    Указать время
                  </button>
                </div>
              )}
              {natal.houseSystem === 'porphyry' && (
                <p className={ui.hint}>Для вашей широты дома посчитаны по системе Порфирия: Плацидус на крайнем севере не работает.</p>
              )}
            </div>
          )}
          {tab === 'aspects' && (
            <div className={styles.stack}>
              {natal.figures.length > 0 && (
                <div className={ui.block}>
                  <h2 className={ui.sub}>Фигуры в карте</h2>
                  <p className={ui.hint}>Фигура складывается, когда несколько планет связаны аспектами в одну систему. Она усиливает их темы.</p>
                  {natal.figures.map((figure) => (
                    <div key={`${figure.title}${figure.points}`} className={cx(ui.glass, styles.figure)}>
                      <span className={styles.figureTitle}>{figure.title}</span>
                      <span className={styles.figurePoints}>{figure.points}</span>
                      <span className={styles.figureText}>{figure.meaning}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className={ui.block}>
                <h2 className={ui.sub}>Главные аспекты</h2>
                <p className={ui.hint}>Аспект означает, что две планеты стоят под особым углом и их темы влияют друг на друга.</p>
                <div className={styles.legend}>
                  <span className={cx(styles.legendItem, styles.legendSoft)}>гармония</span>
                  <span className={cx(styles.legendItem, styles.legendHard)}>напряжение</span>
                  <span className={cx(styles.legendItem, styles.legendMixed)}>слияние</span>
                </div>
                <div className={cx(ui.glass, styles.aspectCard)}>
                  {natal.aspects.length > 0 ? <AspectList aspects={natal.aspects} /> : <p className={ui.hint}>Точных аспектов нет.</p>}
                </div>
              </div>
            </div>
          )}
          <h2 className={ui.sub}>Разбор всей карты</h2>
          {!full && <Tag kind="free" text="Характер и сильные стороны — бесплатно" />}
          <Reading
            kind="natal"
            locked={
              <Paywall
                title="Дальше в полной карте"
                text="Где вам будет трудно и что с этим делать, отношения, работа и деньги, ближайший год по месяцам и личные советы."
                topics={['Где будет трудно', 'Отношения', 'Работа и деньги', 'Ближайший год', 'Советы']}
                product="natal"
              />
            }
          />
        </>
      )}
    </section>
  );
};
