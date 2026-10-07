import Link from 'next/link';
import styles from './page.module.css';

const NotFound = () => (
  <main className={styles.lost}>
    <h1 className={styles.h2}>Страница не найдена</h1>
    <p className={styles.sub}>Возможно, адрес набран с ошибкой.</p>
    <Link className={styles.button} href="/">
      На главную
    </Link>
  </main>
);

export default NotFound;
