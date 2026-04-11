/**
 * pdf/template.js — 統一 PDF 外殼
 *
 * 把 sections 組裝成完整的 HTML document，然後呼叫既有的 window.exportPDF()
 * （/js/pdf-export.js 已 loaded）。新頁面使用這個模組而非自己寫 HTML。
 *
 * 支援簡易 meta（稅法年度、案件編號等）。若要完整法律意見書樣式，
 * 改用 professional-template.js。
 */

import { getBrandTheme, PDF_FONTS, PDF_COLORS } from './theme.js';

const C = PDF_COLORS;

/**
 * 產生完整 PDF HTML 字串
 * @param {object} p
 * @param {string} p.title        PDF 分頁標題
 * @param {string} p.pageSubtitle 工具頁副標
 * @param {string} p.bodyHtml     已組裝好的 sections HTML
 * @param {object} [p.meta]
 * @param {number} [p.meta.taxYear]     稅法年度（顯示於 header）
 * @param {string} [p.meta.lawVersion]  法條版本
 * @param {string} [p.meta.caseId]      案件編號
 * @returns {string}
 */
export function buildPdfHtml({ title, pageSubtitle, bodyHtml, meta = {} }) {
  const brand = getBrandTheme();
  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const year = new Date().getFullYear();

  const metaLines = [`產出日期：${today}`];
  if (meta.taxYear) metaLines.push(`稅法年度：${meta.taxYear}`);
  if (meta.lawVersion) metaLines.push(`法條版本：${meta.lawVersion}`);
  if (meta.caseId) metaLines.push(`案件編號：${meta.caseId}`);

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
${PDF_FONTS}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Noto Sans TC', sans-serif;
  background: #fff;
  color: ${C.ink};
  font-size: 13px;
  padding: 40px;
  max-width: 700px;
  margin: 0 auto;
}
.pdf-header {
  border-bottom: 3px solid ${C.ink};
  padding-bottom: 20px;
  margin-bottom: 28px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.pdf-logo {
  font-family: 'Noto Serif TC', serif;
  font-size: 24px;
  font-weight: 700;
}
.pdf-logo span { color: ${C.gold}; }
.pdf-meta {
  font-size: 11px;
  color: ${C.muted};
  text-align: right;
  line-height: 1.8;
  font-family: 'DM Mono', monospace;
}
.pdf-footer {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid ${C.border};
  font-size: 11px;
  color: ${C.muted};
  line-height: 1.8;
  text-align: center;
}
.pdf-disc { font-size: 10px; color: #aaa; margin-top: 8px; }
button, .cross-link, .ip-cross-link, .ip-btn-calc { display: none !important; }
@media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="pdf-header">
    <div>
      <div class="pdf-logo">${brand.logoText}<span>${brand.logoAccent}</span></div>
      <div style="font-size:12px;color:${C.muted};margin-top:4px">${pageSubtitle}</div>
    </div>
    <div class="pdf-meta">${metaLines.join('<br>')}</div>
  </div>
  ${bodyHtml}
  <div class="pdf-footer">
    © ${year} ${brand.name} · ${brand.url}
    <div class="pdf-disc">本報告僅供參考，不構成法律意見。實際個案請諮詢地政士、會計師或稅務專業人員。</div>
  </div>
</body>
</html>`;
}

/**
 * 產生並觸發 PDF 下載（iOS Capacitor 會走 Share sheet）
 */
export async function exportPdfDocument({ title, pageSubtitle, bodyHtml, filename, meta }) {
  const html = buildPdfHtml({ title, pageSubtitle, bodyHtml, meta });
  if (typeof window.exportPDF !== 'function') {
    console.error('window.exportPDF 未載入。請在頁面引入 <script src="js/pdf-export.js">。');
    alert('PDF 模組未載入，請重整頁面後再試。');
    return;
  }
  return window.exportPDF(html, filename);
}
