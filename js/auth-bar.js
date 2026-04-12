// auth-bar.js — auto-inject floating auth UI into every page
import { supabase, getProfile, signOut } from './auth.js';

async function initAuthBar() {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    .auth-bar {
      position: fixed;
      bottom: 24px;
      right: 20px;
      bottom: calc(24px + env(safe-area-inset-bottom, 0px));
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .auth-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(26, 20, 16, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(196, 147, 42, 0.25);
      border-radius: 40px;
      padding: 6px 14px 6px 8px;
      cursor: pointer;
      font-family: 'Noto Sans TC', sans-serif;
      font-size: 12px;
      color: rgba(245, 240, 232, 0.7);
      text-decoration: none;
      transition: border-color 0.2s, color 0.2s;
      user-select: none;
    }
    .auth-pill:hover {
      border-color: rgba(196, 147, 42, 0.6);
      color: #f5f0e8;
    }
    .auth-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #8b2020;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #f5f0e8;
      flex-shrink: 0;
    }
    /* Auth dropdown */
    #auth-dropdown {
      position: fixed;
      bottom: calc(64px + env(safe-area-inset-bottom, 0px));
      right: 20px;
      background: #1a1410;
      border: 1px solid rgba(196, 147, 42, 0.25);
      border-radius: 10px;
      padding: 8px;
      min-width: 148px;
      z-index: 10000;
      font-family: 'Noto Sans TC', sans-serif;
      font-size: 13px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      animation: authDropIn 0.15s ease both;
    }
    #auth-dropdown a,
    #auth-dropdown .dropdown-item {
      display: block;
      padding: 8px 12px;
      color: #f5f0e8;
      text-decoration: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    #auth-dropdown a:hover,
    #auth-dropdown .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.07);
    }
    #auth-dropdown .dropdown-signout {
      color: #c4932a;
    }
    #auth-dropdown .dropdown-divider {
      height: 1px;
      background: rgba(255,255,255,0.08);
      margin: 4px 0;
    }
    @keyframes authDropIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Back button (top-right, non-index pages only) */
    .auth-back-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      top: calc(16px + env(safe-area-inset-top, 0px));
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(26, 20, 16, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(200, 191, 176, 0.2);
      border-radius: 20px;
      padding: 6px 14px;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      color: rgba(245, 240, 232, 0.6);
      text-decoration: none;
      letter-spacing: 0.06em;
      transition: border-color 0.2s, color 0.2s;
    }
    .auth-back-btn:hover {
      border-color: rgba(196, 147, 42, 0.5);
      color: #f5f0e8;
    }
  `;
  document.head.appendChild(style);

  // Inject back button on non-index pages (unified floating button)
  const path = window.location.pathname;
  const isIndex = path === '/' || path === '/index.html' || path.endsWith('/index.html');
  // Remove any existing back links to avoid duplicates
  document.querySelectorAll('.home-link').forEach(el => el.remove());
  if (!isIndex) {
    const backBtn = document.createElement('a');
    backBtn.className = 'auth-back-btn';
    backBtn.href = '/index.html';
    backBtn.textContent = '← 返回';
    document.body.appendChild(backBtn);
  }

  // Check auth state
  const { data: { user } } = await supabase.auth.getUser();

  const bar = document.createElement('div');
  bar.className = 'auth-bar';
  bar.id = 'auth-bar-root';

  if (!user) {
    // Not logged in
    bar.innerHTML = `<a class="auth-pill" href="/login.html">
      <div class="auth-avatar">?</div>登入
    </a>`;
  } else {
    const initial = (user.email || 'U')[0].toUpperCase();

    bar.innerHTML = `<div class="auth-pill" id="auth-menu-btn" role="button" tabindex="0" aria-label="帳號選單">
      <div class="auth-avatar">${initial}</div>我的帳號
    </div>`;

    // Dropdown for logged-in users
    const menuBtn = bar.querySelector('#auth-menu-btn');
    if (menuBtn) {
      const toggleDropdown = (e) => {
        e.stopPropagation();
        const existing = document.getElementById('auth-dropdown');
        if (existing) { existing.remove(); return; }

        const dropdown = document.createElement('div');
        dropdown.id = 'auth-dropdown';
        dropdown.innerHTML = `
          <a href="/account.html">我的帳號</a>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item dropdown-signout" id="auth-signout-btn">登出</div>
        `;
        document.body.appendChild(dropdown);

        dropdown.querySelector('#auth-signout-btn').addEventListener('click', async () => {
          dropdown.remove();
          await supabase.auth.signOut();
          window.location.href = '/';
        });

        // Close on outside click
        setTimeout(() => {
          document.addEventListener('click', () => {
            document.getElementById('auth-dropdown')?.remove();
          }, { once: true });
        }, 10);
      };

      menuBtn.addEventListener('click', toggleDropdown);
      menuBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') toggleDropdown(e);
      });
    }
  }

  document.body.appendChild(bar);

  // Global sign-out helper (used by account.html inline buttons too)
  window.__signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthBar);
} else {
  initAuthBar();
}
