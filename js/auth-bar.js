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
      background: #8f1f2b;
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
        <a href="https://choulegal.com/professional.html" role="menuitem">企業合規</a>
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

  // 注入律師媒合欄位
  await initLawyerMatching(user);
}

async function initLawyerMatching(user) {
  const targetSelectors = ['#step5', '#step2', '#result', '.total-claim-box', '.result-card', '.next-step-claim', '.law-note', '.disclaimer'];
  let targetContainer = null;
  for (const sel of targetSelectors) {
    targetContainer = document.querySelector(sel);
    if (targetContainer) break;
  }
  if (!targetContainer) return;

  if (document.getElementById('choulegal-match-card-root')) return;

  const card = document.createElement('div');
  card.id = 'choulegal-match-card-root';
  card.className = 'choulegal-match-card';
  card.style.cssText = `
    margin: 24px 0 16px;
    padding: 20px;
    border-radius: 12px;
    border: 1.5px solid #2a6e3e;
    background: rgba(42, 110, 62, 0.05);
    font-family: 'Noto Sans TC', system-ui, -apple-system, sans-serif;
    color: #1a3a28;
    text-align: left;
    box-sizing: border-box;
  `;

  const path = window.location.pathname;
  let accentColor = '#2a6e3e';
  let bgColor = 'rgba(42, 110, 62, 0.05)';
  let textColor = '#1a3a28';
  let borderColor = '#2a6e3e';

  if (window.location.host.includes('inheritance') || path.includes('inheritance')) {
    accentColor = '#8f1f2b';
    bgColor = 'rgba(143, 31, 43, 0.04)';
    textColor = '#3a1a1d';
    borderColor = '#8f1f2b';
    card.style.borderColor = borderColor;
    card.style.background = bgColor;
    card.style.color = textColor;
  } else if (window.location.host.includes('consumer') || path.includes('consumer')) {
    accentColor = '#c8901a';
    bgColor = 'rgba(200, 144, 26, 0.05)';
    textColor = '#4a3a10';
    borderColor = '#c8901a';
    card.style.borderColor = borderColor;
    card.style.background = bgColor;
    card.style.color = textColor;
  } else if (window.location.host.includes('rental') || path.includes('rental')) {
    accentColor = '#2a5a6e';
    bgColor = 'rgba(42, 90, 110, 0.05)';
    textColor = '#1a2e3a';
    borderColor = '#2a5a6e';
    card.style.borderColor = borderColor;
    card.style.background = bgColor;
    card.style.color = textColor;
  }

  card.innerHTML = `
    <div style="font-size: 14px; font-weight: 700; color: ${accentColor}; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
      ⚖️ 需專業律師為您評估嗎？
    </div>
    <p style="font-size: 12px; line-height: 1.7; margin-bottom: 14px; opacity: 0.85; margin-top: 0;">
      您可以將本次試算結果與案情摘要，免費同步至您的周全帳號。周全平台合作律師將主動為您提供精準法律評估與建議。
    </p>
    <div id="choulegal-match-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
      ${user ? `
        <button id="choulegal-match-submit-btn" type="button" style="display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; border: none; border-radius: 8px; background: ${accentColor}; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: inherit;">
          申請律師媒合（同步此案資料）
        </button>
      ` : `
        <a id="choulegal-match-login-btn" href="#" style="display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; border-radius: 8px; background: ${accentColor}; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: inherit;">
          登入並申請律師媒合
        </a>
      `}
    </div>
    <div id="choulegal-match-status" style="font-size: 12.5px; margin-top: 10px; display: none; line-height: 1.6;"></div>
  `;

  if (targetContainer.classList.contains('next-step-claim') || targetContainer.classList.contains('law-note') || targetContainer.classList.contains('disclaimer')) {
    targetContainer.parentNode.insertBefore(card, targetContainer);
  } else {
    targetContainer.appendChild(card);
  }

  async function submitLead() {
    const statusEl = document.getElementById('choulegal-match-status');
    const actionsEl = document.getElementById('choulegal-match-actions');
    const submitBtn = document.getElementById('choulegal-match-submit-btn');

    if (submitBtn) submitBtn.disabled = true;
    statusEl.style.display = 'block';
    statusEl.style.color = '#666';
    statusEl.innerHTML = '正在發送申請...';

    const inputs = {};
    document.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.id && el.value !== undefined && el.value !== '') {
        if (el.type === 'button' || el.type === 'submit' || el.type === 'file') return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          inputs[el.id] = el.checked;
        } else {
          inputs[el.id] = el.value;
        }
      }
    });

    const resultsText = targetContainer.innerText || '';
    const payload = {
      inputs: inputs,
      resultsText: resultsText.slice(0, 1500),
      pageUrl: window.location.href,
      pageTitle: document.title,
      request_lawyer_matching: true,
      timestamp: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('choulegal_account_data')
        .insert({
          account_id: user.id,
          product_key: 'people',
          data_type: 'saved_item',
          source: window.location.pathname,
          title: `律師媒合 - ${document.title.split('｜')[0]}`,
          summary: `民眾於 ${document.title.split('｜')[0]} 申請律師媒合。`,
          payload: payload
        });

      if (error) throw error;

      statusEl.style.color = '#185b39';
      statusEl.innerHTML = '✓ <strong>申請成功！</strong>本案自檢資料已同步至您的帳號，周全平台合作律師將主動與您聯絡。';
      if (actionsEl) actionsEl.style.display = 'none';
      localStorage.removeItem('choulegal_pending_match');
    } catch (err) {
      console.error('Lawyer matching failed:', err);
      statusEl.style.color = '#8b2020';
      statusEl.innerHTML = '✕ 發送失敗：' + (err.message || '網路錯誤') + '，請稍後再試。';
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  const sBtn = document.getElementById('choulegal-match-submit-btn');
  if (sBtn) {
    sBtn.addEventListener('click', submitLead);
  }

  const lBtn = document.getElementById('choulegal-match-login-btn');
  if (lBtn) {
    lBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const inputs = {};
      document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id && el.value !== undefined && el.value !== '') {
          if (el.type === 'button' || el.type === 'submit' || el.type === 'file') return;
          inputs[el.id] = el.value;
        }
      });
      const resultsText = targetContainer.innerText || '';
      const pendingData = {
        inputs,
        resultsText: resultsText.slice(0, 1500),
        pageUrl: window.location.href,
        pageTitle: document.title,
        request_lawyer_matching: true
      };
      localStorage.setItem('choulegal_pending_match', JSON.stringify(pendingData));
      window.location.href = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    });
  }

  const pendingRaw = localStorage.getItem('choulegal_pending_match');
  if (pendingRaw && user) {
    try {
      const pending = JSON.parse(pendingRaw);
      if (pending.pageUrl === window.location.href) {
        submitLead();
      }
    } catch (_) {}
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthBar);
} else {
  initAuthBar();
}
