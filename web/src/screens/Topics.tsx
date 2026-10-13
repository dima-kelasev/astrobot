import { useEffect } from 'react';
import { cx } from '../lib/cx';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { openTheme } from '../store/navSlice';
import { fetchThemes } from '../store/spreadSlice';
import ui from '../styles/ui.module.css';

export const Topics = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const themes = useAppSelector((state) => state.spread.themes);
  const status = useAppSelector((state) => state.spread.themesStatus);
  const limit = useAppSelector((state) => state.profile.me?.limits.spread ?? null);

  useEffect(() => {
    if (store.getState().spread.themesStatus === 'ready') return;
    const request = dispatch(fetchThemes());
    return () => request.abort();
  }, [dispatch, store]);

  return (
    <section className={ui.screen}>
      <div className={ui.head}>
        <span className={ui.eyebrow}>Таро</span>
        <h1 className={ui.title}>Расклады по темам</h1>
        <p className={ui.lead}>Выберите тему. Карты вы вытянете сами из перемешанной колоды.</p>
      </div>
      {status === 'error' && <p className={ui.error}>Не получилось загрузить список раскладов. Откройте экран ещё раз.</p>}
      <div className={cx(ui.glass, ui.list)}>
        {themes.map((theme) => (
          <button key={theme.key} className={ui.listItem} type="button" onClick={() => dispatch(openTheme(theme.key))}>
            <span className={ui.listText}>
              <span className={ui.listTitle}>{theme.title}</span>
              <span className={ui.listDesc}>
                {theme.description} {theme.positions.length} {theme.positions.length <= 4 ? 'карты' : 'карт'}.
              </span>
            </span>
            <span className={ui.chevron} aria-hidden="true" />
          </button>
        ))}
      </div>
      {limit && <p className={cx(ui.hint, ui.center)}>Сегодня бесплатно: {Math.max(0, limit.max - limit.used)} из {limit.max}</p>}
    </section>
  );
};
