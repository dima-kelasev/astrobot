import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/cyrillic-600.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/onest/cyrillic-400.css';
import '@fontsource/onest/cyrillic-500.css';
import '@fontsource/onest/cyrillic-600.css';
import '@fontsource/onest/latin-400.css';
import '@fontsource/onest/latin-500.css';
import '@fontsource/onest/latin-600.css';
import '@fontsource/forum/cyrillic-400.css';
import '@fontsource/forum/latin-400.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Metrika } from '../components/Metrika';
import { SITE_NAME, SITE_URL } from '../config';
import { META } from '../content';

const TELEGRAM_REDIRECT = "if(location.hash.indexOf('tgWebAppData')>-1)location.replace('/app/'+location.hash);";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: META.title,
  description: META.description,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: '/',
    siteName: SITE_NAME,
    title: META.ogTitle,
    description: META.ogDescription,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: META.ogTitle }]
  },
  twitter: { card: 'summary_large_image', title: META.ogTitle, description: META.ogDescription, images: ['/og.png'] }
};

export const viewport: Viewport = {
  themeColor: '#0b0718',
  width: 'device-width',
  initialScale: 1
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru">
    <head>
      <script dangerouslySetInnerHTML={{ __html: TELEGRAM_REDIRECT }} />
    </head>
    <body>
      {children}
      <Metrika />
    </body>
  </html>
);

export default RootLayout;
