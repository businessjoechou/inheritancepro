/**
 * components/header.js — 統一工具頁 header
 *
 * 未來要做 B2B 白標時，只需改這個檔案（從 CSS 變數讀 --brand-logo-text/--brand-logo-accent）。
 */

/**
 * 產生 header HTML 字串
 * @param {object} p
 * @param {string} p.subtitle  次標題（例如「繼承房貸陷阱試算」）
 * @param {string} [p.backHref='index.html']
 * @param {string} [p.backLabel='← 首頁']
 * @returns {string}
 */
export function renderHeader({ subtitle, backHref = 'index.html', backLabel = '← 首頁' }) {
  return `
    <header>
      <a href="${backHref}" style="text-decoration:none;color:inherit">
        <div class="logo">Inheritance<span>Pro</span></div>
        <div class="page-sub">${subtitle}</div>
      </a>
      <a class="home-link" href="${backHref}">${backLabel}</a>
    </header>
  `;
}

/**
 * 直接掛載到 document.body 開頭
 */
export function mountHeader(props) {
  const html = renderHeader(props);
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const header = wrap.firstElementChild;
  document.body.insertBefore(header, document.body.firstChild);
}
