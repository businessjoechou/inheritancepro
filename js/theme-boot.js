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

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'themeToggle';
      btn.type = 'button';
      btn.className = 'theme-toggle-floating';
      btn.setAttribute('aria-label', '切換深色/淺色模式');
      btn.style.cssText = 'position:fixed;top:16px;right:16px;width:32px;height:32px;border-radius:50%;background:#ffffff;border:1px solid #c8bfb0;color:#7a6f62;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.08);';
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
  });
})();
