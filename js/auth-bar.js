// Floating ChouLegal account UI for static public tools.
import { ensureChouLegalAccount, supabase } from './auth.js';

async function initAuthBar() {
  if (document.getElementById('auth-bar-root')) return;

  const style = document.createElement('style');
  style.textContent = `
    .auth-bar {
      position: fixed;
      right: 18px;
      bottom: calc(18px + env(safe-area-inset-bottom, 0px));
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Noto Sans TC', sans-serif;
    }
    .auth-pill {
      display: inline-flex;
      align-items: center;
      min-height: 38px;
      gap: 8px;
      background: rgba(22, 24, 30, 0.94);
      border: 1px solid rgba(198, 151, 52, 0.38);
      border-radius: 999px;
      color: #fffaf0;
      padding: 7px 14px 7px 8px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
    }
    .auth-pill:hover { border-color: rgba(198, 151, 52, 0.72); }
    .auth-pill:focus-visible {
      outline: 2px solid #c69734;
      outline-offset: 3px;
    }
    .auth-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #8f1f2b, #c69734);
      color: #fffaf0;
      font-size: 11px;
      font-weight: 800;
      flex: 0 0 auto;
    }
    #auth-dropdown {
      position: fixed;
      right: 18px;
      bottom: calc(66px + env(safe-area-inset-bottom, 0px));
      width: min(220px, calc(100vw - 36px));
      z-index: 10000;
      border-radius: 12px;
      border: 1px solid rgba(198, 151, 52, 0.3);
      background: #16181e;
      box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32);
      padding: 8px;
      font-family: 'Noto Sans TC', sans-serif;
    }
    #auth-dropdown a,
    #auth-dropdown button {
      display: flex;
      width: 100%;
      align-items: center;
      min-height: 36px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #fffaf0;
      padding: 8px 10px;
      text-align: left;
      text-decoration: none;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }
    #auth-dropdown a:hover,
    #auth-dropdown button:hover { background: rgba(255, 255, 255, 0.08); }
    .auth-dropdown-meta {
      padding: 8px 10px 10px;
      color: rgba(255, 250, 240, 0.62);
      font-size: 11px;
      line-height: 1.5;
      word-break: break-all;
    }
    .auth-dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 4px 0;
    }
    .auth-back-btn {
      position: fixed;
      top: calc(14px + env(safe-area-inset-top, 0px));
      right: 14px;
      z-index: 9999;
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 7px 13px;
      background: rgba(22, 24, 30, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #fffaf0;
      text-decoration: none;
      font: 600 12px/1 'Noto Sans TC', sans-serif;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .auth-back-btn:hover { border-color: rgba(198, 151, 52, 0.58); }
    @media (max-width: 520px) {
      .auth-bar { right: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
      .auth-pill { min-height: 36px; padding-right: 12px; }
      #auth-dropdown { right: 12px; bottom: calc(58px + env(safe-area-inset-bottom, 0px)); }
    }
    @media print { .auth-bar, #auth-dropdown, .auth-back-btn { display: none !important; } }
  `;
  document.head.appendChild(style);

  const path = window.location.pathname;
  const isIndex = path === '/' || path.endsWith('/index.html');
  document.querySelectorAll('.home-link').forEach((el) => el.remove());
  if (!isIndex && !document.querySelector('.auth-back-btn')) {
    const backBtn = document.createElement('a');
    backBtn.className = 'auth-back-btn';
    backBtn.href = '/index.html';
    backBtn.textContent = '返回';
    document.body.appendChild(backBtn);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) await ensureChouLegalAccount();

  const bar = document.createElement('div');
  bar.className = 'auth-bar';
  bar.id = 'auth-bar-root';

  if (!user) {
    bar.innerHTML = `<a class="auth-pill" href="/login.html" aria-label="登入周全帳號">
      <span class="auth-avatar" aria-hidden="true">周</span><span>登入周全帳號</span>
    </a>`;
  } else {
    const initial = (user.email || '周')[0].toUpperCase();
    bar.innerHTML = `<button class="auth-pill" id="auth-menu-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="開啟周全帳號選單">
      <span class="auth-avatar" aria-hidden="true">${initial}</span><span>周全帳號</span>
    </button>`;

    const menuBtn = bar.querySelector('#auth-menu-btn');
    const toggleDropdown = (event) => {
      event.stopPropagation();
      const existing = document.getElementById('auth-dropdown');
      if (existing) {
        existing.remove();
        menuBtn.setAttribute('aria-expanded', 'false');
        return;
      }

      const dropdown = document.createElement('div');
      dropdown.id = 'auth-dropdown';
      dropdown.setAttribute('role', 'menu');
      dropdown.innerHTML = `
        <div class="auth-dropdown-meta">${user.email || '已登入'}</div>
        <a href="/account.html" role="menuitem">帳號與資料</a>
        <a href="https://choulegal.com/professional.html" role="menuitem">專業版</a>
        <a href="https://choulegal.com/education.html" role="menuitem">法律教育平台</a>
        <div class="auth-dropdown-divider"></div>
        <button type="button" id="auth-signout-btn" role="menuitem">登出</button>
      `;
      document.body.appendChild(dropdown);
      menuBtn.setAttribute('aria-expanded', 'true');

      dropdown.querySelector('#auth-signout-btn').addEventListener('click', async () => {
        dropdown.remove();
        await supabase.auth.signOut();
        window.location.href = '/';
      });

      setTimeout(() => {
        document.addEventListener('click', () => {
          document.getElementById('auth-dropdown')?.remove();
          menuBtn.setAttribute('aria-expanded', 'false');
        }, { once: true });
      }, 10);
    };

    menuBtn.addEventListener('click', toggleDropdown);
  }

  document.body.appendChild(bar);
  window.__signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthBar);
} else {
  initAuthBar();
}
