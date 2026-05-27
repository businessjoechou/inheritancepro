// coffee-button.js — 浮動贊助按鈕（bottom-left 不與 auth-bar 衝突）
// 點擊跳轉到 https://choulegal.com/sponsor.html
// 使用者關掉後 7 日內不再顯示（sessionStorage + dismissedAt 持久化）
(function () {
  if (window.__coffeeButtonInit) return;
  window.__coffeeButtonInit = true;

  var STORAGE_KEY = 'choulegal_coffee_dismissed';
  var DISMISS_DAYS = 7;
  var SPONSOR_URL = 'https://choulegal.com/sponsor.html';

  function isDismissed() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var at = parseInt(raw, 10);
      if (isNaN(at)) return false;
      var ageMs = Date.now() - at;
      return ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch (e) { return false; }
  }
  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
  }

  function init() {
    if (isDismissed()) return;

    var style = document.createElement('style');
    style.textContent = [
      '.coffee-fab{',
        'position:fixed;bottom:calc(24px + env(safe-area-inset-bottom,0px));left:20px;z-index:9998;',
        'display:flex;align-items:center;gap:8px;',
        'background:rgba(10,12,18,0.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
        'border:1px solid rgba(253,230,138,0.35);border-radius:40px;',
        'padding:8px 14px 8px 12px;',
        'font-family:"Noto Sans TC",sans-serif;font-size:12px;color:rgba(253,230,138,0.95);',
        'text-decoration:none;cursor:pointer;',
        'box-shadow:0 4px 16px rgba(0,0,0,0.3),0 1px 0 rgba(255,255,255,0.04) inset;',
        'transition:transform 0.2s,background 0.2s,border-color 0.2s;',
        'opacity:0;transform:translateY(8px);animation:coffeeFabIn 500ms 1200ms cubic-bezier(0.16,1,0.3,1) forwards;',
      '}',
      '@keyframes coffeeFabIn{to{opacity:1;transform:none;}}',
      '.coffee-fab:hover{background:rgba(15,18,26,0.96);border-color:rgba(253,230,138,0.6);transform:translateY(-1px);}',
      '.coffee-fab svg{width:14px;height:14px;flex-shrink:0;}',
      '.coffee-fab-close{',
        'margin-left:2px;width:18px;height:18px;border-radius:50%;',
        'display:inline-flex;align-items:center;justify-content:center;',
        'background:transparent;border:none;color:rgba(253,230,138,0.5);cursor:pointer;',
        'font-size:14px;line-height:1;padding:0;',
        'transition:color 0.15s,background 0.15s;',
      '}',
      '.coffee-fab-close:hover{color:rgba(253,230,138,0.95);background:rgba(253,230,138,0.1);}',
      '[data-theme="light"] .coffee-fab{background:rgba(26,24,20,0.92);color:rgba(253,230,138,0.95);}',
      '@media (max-width:480px){.coffee-fab{font-size:11px;padding:7px 12px 7px 10px;left:14px;bottom:calc(80px + env(safe-area-inset-bottom,0px));}}',
    ].join('');
    document.head.appendChild(style);

    var fab = document.createElement('div');
    fab.className = 'coffee-fab';
    fab.innerHTML = [
      '<a href="' + SPONSOR_URL + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;">',
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<path d="M10 2v2"/><path d="M14 2v2"/>',
          '<path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
          '<path d="M6 2v2"/>',
        '</svg>',
        '<span>請開發者喝咖啡</span>',
      '</a>',
      '<button class="coffee-fab-close" type="button" aria-label="關閉">×</button>',
    ].join('');

    fab.querySelector('.coffee-fab-close').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
      fab.remove();
    });

    document.body.appendChild(fab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
