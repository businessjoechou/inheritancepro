/**
 * InheritancePro — Google Analytics GA4 共用載入器
 * 取代各 HTML 頁面重複的 5 行 gtag snippet
 */
(function () {
  var id = 'G-9P35VNFL1V';
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id);
})();
