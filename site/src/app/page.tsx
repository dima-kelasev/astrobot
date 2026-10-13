import { BotLink } from '../components/BotLink';
import { HeroCards } from '../components/HeroCards';
import { Stars } from '../components/Stars';
import { BOT_USERNAME, SITE_NAME, SITE_URL, botAppLink } from '../config';
import { DISCLAIMER, FAQ, FEATURES, FINAL, HERO, META, METHOD, STEPS } from '../content';
import styles from './page.module.css';

const YEAR = new Date().getFullYear();

const STRUCTURED = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: 'ru', description: META.description },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer }
      }))
    }
  ]
}).replace(/</g, '\\u003c');

const Home = () => (
  <div className={styles.page}>
    <div className={styles.sky}>
      <Stars />
    </div>

    <header className={styles.header}>
      <span className={styles.logo}>{SITE_NAME}</span>
      <BotLink className={styles.headerLink} place="header">
        Открыть в Telegram
      </BotLink>
    </header>

    <main>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{HERO.eyebrow}</p>
          <h1 className={styles.h1}>{HERO.title}</h1>
          <p className={styles.lead}>{HERO.lead}</p>
          <BotLink className={styles.button} place="hero">
            {HERO.button}
          </BotLink>
          <p className={styles.note}>{HERO.note}</p>
        </div>
        <div className={styles.heroArt}>
          <HeroCards />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="features">
        <h2 className={styles.h2} id="features">
          Что умеет {SITE_NAME}
        </h2>
        <ul className={styles.features}>
          {FEATURES.map((item) => (
            <li key={item.title} className={styles.tile}>
              <h3 className={styles.h3}>{item.title}</h3>
              <p className={styles.text}>{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="steps">
        <h2 className={styles.h2} id="steps">
          Как начать
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((item, index) => (
            <li key={item.title} className={styles.step}>
              <span className={styles.stepNum}>{index + 1}</span>
              <h3 className={styles.h3}>{item.title}</h3>
              <p className={styles.text}>{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="method">
        <h2 className={styles.h2} id="method">
          Как составляется прогноз
        </h2>
        <ul className={styles.method}>
          {METHOD.map((item) => (
            <li key={item.title} className={styles.methodItem}>
              <h3 className={styles.h3}>{item.title}</h3>
              <p className={styles.text}>{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="faq">
        <h2 className={styles.h2} id="faq">
          Частые вопросы
        </h2>
        <div className={styles.faq}>
          {FAQ.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary className={styles.question}>{item.question}</summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.final} aria-labelledby="final">
        <h2 className={styles.h2} id="final">
          {FINAL.title}
        </h2>
        <p className={styles.sub}>{FINAL.text}</p>
        <BotLink className={styles.button} place="final">
          {HERO.button}
        </BotLink>
        {BOT_USERNAME && (
          <p className={styles.hint}>
            Не открывается? Найдите в Telegram <b>@{BOT_USERNAME}</b> или <a href={botAppLink}>откройте через приложение</a>.
          </p>
        )}
      </section>
    </main>

    <footer className={styles.footer}>
      <p>{DISCLAIMER}</p>
      <p>
        © {YEAR} {SITE_NAME} · <a href="/privacy/">Политика обработки персональных данных</a>
      </p>
    </footer>

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED }} />
  </div>
);

export default Home;
