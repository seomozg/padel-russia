// Счётчик Яндекс.Метрики — вставляется первым элементом <body> в корневом layout,
// чтобы код заработал как можно раньше на всех страницах (App Router, SSR).
// HTML-комментарии `<!-- Yandex.Metrika counter -->` не выводятся: React/JSX не рендерит
// сырые `<!-- -->` в children, поэтому они сохранены как JS-комментарии внутри скрипта.
const YANDEX_METRIKA_SCRIPT = `
// <!-- Yandex.Metrika counter -->
(function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=113162684', 'ym');

ym(113162684, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
// <!-- /Yandex.Metrika counter -->
`;

export default function YandexMetrika() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: YANDEX_METRIKA_SCRIPT }} />
      {/* noscript через dangerouslySetInnerHTML: иначе React SSR добавляет
          <link rel="preload"> на пиксель в <head> — лишний хит в Метрику */}
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            '<div><img src="https://mc.yandex.ru/watch/113162684" style="position:absolute; left:-9999px;" alt="" /></div>',
        }}
      />
    </>
  );
}