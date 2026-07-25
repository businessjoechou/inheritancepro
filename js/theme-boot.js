(function () {
  var html = document.documentElement;
  var stored = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = stored || (prefersDark ? 'dark' : 'light');
  if (theme === 'light') html.setAttribute('data-theme', 'light');

  function updateIcon(t) {
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = t === 'light' ? '☾' : '☀';
  }

  function ensureControlNames(root) {
    var controls = (root || document).querySelectorAll
      ? (root || document).querySelectorAll('input, select, textarea')
      : [];
    Array.prototype.forEach.call(controls, function (control) {
      if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby')) return;
      if (control.id && document.querySelector('label[for="' + CSS.escape(control.id) + '"]')) return;
      var wrappingLabel = control.closest('label');
      if (wrappingLabel && wrappingLabel.textContent.trim()) return;

      var group = control.closest(
        '.input-group, .field-group, .form-group, .input-prefix, .person-row, td, section'
      );
      var label = group && group.querySelector('label, .card-title, .field-label, .input-label');
      var name = label && label.textContent.replace(/\s+/g, ' ').trim();
      if (!name && control.classList.contains('p-alive')) name = '此順位繼承人是否在世';
      if (!name && control.classList.contains('p-rel')) name = '與被繼承人的關係';
      if (!name) {
        name = control.getAttribute('placeholder') ||
          control.getAttribute('name') ||
          control.id ||
          (control.tagName === 'SELECT' ? '請選擇項目' : '請輸入資料');
      }
      control.setAttribute('aria-label', name);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var contrastStyle = document.createElement('style');
    contrastStyle.id = 'ip-accessible-contrast';
    contrastStyle.textContent = [
      '.law-pill,.ip-law-pill,.law-tag,.basis-label{color:#765400!important}',
      '.law-basis__date,.law-basis__empty{color:#655e52!important}',
      '.disclaimer,.ip-disclaimer,.subtitle em{color:#66615b!important}',
      '.home-link,.ip-home-link,header>a[href="index.html"]{color:#aebfd9!important}',
      '.asset-total-label,#assetTotalDisplay>div{color:#aeb8c7!important}',
      '.info-box span[style*="#888"],.ip-tab-panel.active>div[style*="#888"]{color:#625d57!important}',
      '.type-law{color:#526987!important}',
      '.type-note{color:#8d4854!important}',
      '.type-btn.uncommon{opacity:1!important;border-style:dashed}',
      '.type-btn .type-law,.type-btn .type-note{opacity:1!important}',
      '.legal-page .parent-brand,.legal-page .parent-brand>span,.legal-page .logo{color:#3f3a34!important}',
      '.legal-page .logo>span{color:#765400!important}',
      '.legal-page .page-sub,.legal-page .updated,.legal-page .disclaimer-bar>a{color:#655e52!important}',
      '.back-link{color:#c9c1b5!important}',
      '.calculator-page footer>div:nth-child(2),.calculator-page footer .disclaimer{color:#aeb8c7!important}',
      '.law-highlight>strong,.sh-eyebrow,.sh-xlink a,.sh-foot a{color:#765400!important}',
      '#progressLabel{color:#655e52!important}',
      'main>.subtitle{color:#655e52!important}',
      '.property-check-page main p{color:#655e52!important}',
      '.deadline-page a[href="index.html"]{color:#aebfd9!important}'
    ].join('');
    document.head.appendChild(contrastStyle);

    var main = document.querySelector('main, [role="main"], .ip-main, .wizard, .wrap, .sh-wrap');
    if (main) {
      if (!main.id) main.id = 'main-content';
      if (main.tagName !== 'MAIN' && !main.hasAttribute('role')) main.setAttribute('role', 'main');
      if (!document.querySelector('.skip-link, .ip-skip-link')) {
        var skip = document.createElement('a');
        skip.className = 'ip-skip-link';
        skip.href = '#' + main.id;
        skip.textContent = '跳至主要內容';
        var skipStyle = document.createElement('style');
        skipStyle.textContent = '.ip-skip-link{position:fixed;top:12px;left:12px;z-index:1400;padding:10px 14px;border-radius:8px;background:#081220;color:#fff;text-decoration:none;transform:translateY(-170%)}.ip-skip-link:focus{transform:translateY(0);outline:3px solid #9b6b00;outline-offset:3px}';
        document.head.appendChild(skipStyle);
        document.body.insertBefore(skip, document.body.firstChild);
      }
    }

    var btn = document.getElementById('themeToggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'themeToggle';
      btn.type = 'button';
      btn.className = 'theme-toggle-floating';
      btn.setAttribute('aria-label', '切換深色/淺色模式');
      btn.style.cssText = 'position:fixed;top:12px;right:12px;width:44px;height:44px;border-radius:50%;background:#ffffff;border:1px solid #c8bfb0;color:#425676;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.08);';
      document.body.appendChild(btn);
    }
    updateIcon(html.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    btn.addEventListener('click', function () {
      html.classList.add('theme-transitioning');
      var current = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      if (current === 'light') html.setAttribute('data-theme', 'light');
      else html.removeAttribute('data-theme');
      localStorage.setItem('theme', current);
      updateIcon(current);
      setTimeout(function () { html.classList.remove('theme-transitioning'); }, 350);
    });

    ensureControlNames(document);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function (node) {
          if (node.nodeType === 1) ensureControlNames(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
