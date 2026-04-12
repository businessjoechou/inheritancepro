/**
 * components/header.js — 統一工具頁 header
 *
 * 未來要做 B2B 白標時，只需改這個檔案（從 CSS 變數讀 --ip-brand-logo-text/--ip-brand-logo-accent）。
 * 所有 class 使用 `ip-` 前綴。
 */

/**
 * 產生 header HTML 字串
 * @param {object} p
 * @param {string} p.subtitle  次標題（例如「繼承房貸陷阱試算」）
 * @param {string} [p.backHref='index.html']
 * @param {string} [p.backLabel='← 首頁']
 * @param {string} [p.brandText='Inheritance']
 * @param {string} [p.brandAccent='Pro']
 * @returns {string}
 */
export function renderHeader({
  subtitle,
  backHref = 'index.html',
  backLabel = '← 首頁',
  brandText = 'Inheritance',
  brandAccent = 'Pro',
}) {
  return `
    <header class="ip-header">
      <a href="${backHref}" style="text-decoration:none;color:inherit">
        <div class="ip-logo">${brandText}<span>${brandAccent}</span></div>
        <div class="ip-page-sub">${subtitle}</div>
      </a>
      <a class="ip-home-link" href="${backHref}">${backLabel}</a>
    </header>
  `;
}

/**
 * 直接掛載到 document.body 開頭
 * @param {Parameters<typeof renderHeader>[0]} props
 * @returns {void}
 */
export function mountHeader(props) {
  const html = renderHeader(props);
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const header = wrap.firstElementChild;
  if (header) {
    document.body.insertBefore(header, document.body.firstChild);
  }
}
