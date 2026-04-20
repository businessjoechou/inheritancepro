/**
 * tab-bar.js — InheritancePro 共用 Tab 切換元件
 *
 * 使用方式：
 * 1. HTML 加入 tab 按鈕列 + tab 面板
 *    <div class="ip-tab-bar" id="mainTabs">
 *      <button class="ip-tab-btn active" data-tab="basic">年度試算</button>
 *      <button class="ip-tab-btn" data-tab="advanced">進階規劃</button>
 *    </div>
 *    <div class="ip-tab-panel active" data-tab="basic">...</div>
 *    <div class="ip-tab-panel" data-tab="advanced">...</div>
 *
 * 2. JS 初始化
 *    import { initTabs } from './js/components/tab-bar.js';
 *    initTabs('mainTabs');   // 自動讀取 URL ?tab=xxx
 */

const TAB_CSS = `
.ip-tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--soft, #e8e0d4);
  margin-bottom: 24px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.ip-tab-bar::-webkit-scrollbar { display: none; }

.ip-tab-btn {
  padding: 10px 18px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--ip-font-sans, 'Noto Sans TC', sans-serif);
  font-size: 13px;
  font-weight: 400;
  color: var(--muted, #8a8070);
  border-bottom: 2.5px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
  letter-spacing: 0.02em;
}
.ip-tab-btn:hover { color: var(--ink, #1a1410); }
.ip-tab-btn.active {
  color: var(--ink, #1a1410);
  border-bottom-color: var(--gold, #c4932a);
  font-weight: 600;
}

.ip-tab-panel { display: none; }
.ip-tab-panel.active { display: block; }

@media (max-width: 480px) {
  .ip-tab-btn { padding: 8px 12px; font-size: 12px; }
}
`;

// 注入 CSS（只注入一次）
let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = TAB_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

/**
 * 初始化 tab 切換
 * @param {string} barId - tab bar 的 id
 * @param {{ paramName?: string, onSwitch?: (tabKey: string) => void }} [opts]
 */
export function initTabs(barId, opts = {}) {
  injectCSS();

  const bar = document.getElementById(barId);
  if (!bar) return;

  const paramName = opts.paramName || 'tab';
  const onSwitch = opts.onSwitch || null;

  const btns = /** @type {NodeListOf<HTMLElement>} */ (bar.querySelectorAll('.ip-tab-btn'));
  const panels = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(`.ip-tab-panel[data-tab-group="${barId}"], .ip-tab-panel`));

  // 過濾出屬於此 bar 的 panels（靠 data-tab 值匹配）
  const tabKeys = new Set(Array.from(btns).map(b => b.dataset.tab));
  const myPanels = Array.from(panels).filter(p => tabKeys.has(p.dataset.tab));

  function switchTo(key) {
    btns.forEach(b => b.classList.toggle('active', b.dataset.tab === key));
    myPanels.forEach(p => p.classList.toggle('active', p.dataset.tab === key));
    // 更新 URL（不觸發頁面重載）
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, key);
    history.replaceState(null, '', url);
    if (onSwitch) onSwitch(key);
  }

  // 綁定點擊事件
  btns.forEach(btn => {
    btn.addEventListener('click', () => switchTo(btn.dataset.tab));
  });

  // 從 URL 讀取初始 tab
  const urlTab = new URLSearchParams(window.location.search).get(paramName);
  if (urlTab && tabKeys.has(urlTab)) {
    switchTo(urlTab);
  }

  return { switchTo };
}
