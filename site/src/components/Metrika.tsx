import Script from 'next/script';
import { METRIKA_ID } from '../config';

const code = (id: number) =>
  `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${id},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});`;

export const Metrika = () => {
  if (!METRIKA_ID) return null;
  return (
    <Script id="metrika" strategy="afterInteractive">
      {code(METRIKA_ID)}
    </Script>
  );
};
