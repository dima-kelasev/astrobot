import { useEffect } from 'react';
import styles from './ImageViewer.module.css';

type Props = { src: string; title: string; caption: string; onClose: () => void };

export const ImageViewer = ({ src, title, caption, onClose }: Props) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <button className={styles.close} type="button" aria-label="Закрыть" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <img className={styles.image} src={src} alt={title} />
      <div className={styles.caption}>
        <span className={styles.title}>{title}</span>
        {caption && <span className={styles.meta}>{caption}</span>}
      </div>
    </div>
  );
};
