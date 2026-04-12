/**
 * pdf/professional-template.js — 專業法律意見書樣式 PDF 模板
 *
 * 給律師、地政士、會計師出具客戶報告用。與 template.js 差別：
 *  · 封面頁（事務所名、案號、客戶、承辦律師、日期）
 *  · 目錄（可選）
 *  · 正文（同 template.js 的 body）
 *  · 末頁簽名區（承辦人、事務所章）
 *
 * B2B 白標客戶只需注入 CSS 變數：
 *   :root {
 *     --ip-brand-logo-text: '王大明律師事務所';
 *     --ip-brand-logo-accent: '';
 *     --ip-brand-name: '王大明律師事務所';
 *     --ip-brand-url: 'www.wang-law.com';
 *   }
 *
 * 完全不需改這個檔案。
 */

import { getBrandTheme, PDF_FONTS, PDF_COLORS } from './theme.js';

const C = PDF_COLORS;

/**
 * @typedef {object} ProfessionalCaseMeta
 * @property {string} [caseId]       案件編號（例：2026-LIT-0042）
 * @property {string} [clientName]   客戶姓名
 * @property {string} [advisor]      承辦人（律師/會計師姓名）
 * @property {string} [advisorTitle] 職稱（律師、會計師、地政士）
 * @property {string} [firmName]     事務所全名（預設從 --ip-brand-name 讀取）
 * @property {string} [firmAddress]  事務所地址
 * @property {string} [firmPhone]    事務所電話
 * @property {string} [reportType]   報告類型（例：法律意見書、稅務試算報告）
 * @property {number} [taxYear]      稅法年度
 * @property {string} [lawVersion]   法條版本
 */

/**
 * 產生專業版 PDF HTML 字串
 *
 * @param {object} p
 * @param {string} p.title          PDF 標題
 * @param {string} p.pageSubtitle   副標題（工具名稱）
 * @param {string} p.bodyHtml       正文 HTML（已由 sections.js 組裝）
 * @param {ProfessionalCaseMeta} [p.meta]
 * @param {string} [p.tocHtml]      目錄 HTML（可選）
 * @param {string} [p.coverBadge]   封面右上角徽章（例：「機密」「內部使用」）
 * @returns {string}
 */
export function buildProfessionalPdfHtml({
  title,
  pageSubtitle,
  bodyHtml,
  meta = {},
  tocHtml,
  coverBadge,
}) {
  const brand = getBrandTheme();
  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const year = new Date().getFullYear();

  const firmName    = meta.firmName    || brand.name;
  const firmAddress = meta.firmAddress || '';
  const firmPhone   = meta.firmPhone   || '';
  const reportType  = meta.reportType  || '試算報告';
  const clientName  = meta.clientName  || '';
  const advisor     = meta.advisor     || '';
  const advisorTitle = meta.advisorTitle || '';
  const caseId      = meta.caseId      || '';
  const taxYear     = meta.taxYear     || '';
  const lawVersion  = meta.lawVersion  || '';

  // === 封面頁 ===
  const coverPage = `
    <section class="pdf-cover">
      ${coverBadge ? `<div class="cover-badge">${coverBadge}</div>` : ''}
      <div class="cover-top">
        <div class="cover-firm-name">${firmName}</div>
        ${firmAddress || firmPhone ? `
          <div class="cover-firm-contact">
            ${firmAddress ? `${firmAddress}<br>` : ''}
            ${firmPhone ? `電話：${firmPhone}` : ''}
          </div>
        ` : ''}
      </div>

      <div class="cover-hero">
        <div class="cover-report-type">${reportType}</div>
        <h1 class="cover-title">${title}</h1>
        <div class="cover-subtitle">${pageSubtitle}</div>
      </div>

      <div class="cover-meta">
        ${caseId ? `<div class="cover-meta-row"><span>案件編號</span><strong>${caseId}</strong></div>` : ''}
        ${clientName ? `<div class="cover-meta-row"><span>當事人</span><strong>${clientName}</strong></div>` : ''}
        ${advisor ? `<div class="cover-meta-row"><span>承辦${advisorTitle || '專員'}</span><strong>${advisor}</strong></div>` : ''}
        <div class="cover-meta-row"><span>報告日期</span><strong>${today}</strong></div>
        ${taxYear ? `<div class="cover-meta-row"><span>稅法年度</span><strong>${taxYear}${lawVersion ? `（${lawVersion}）` : ''}</strong></div>` : ''}
      </div>

      <div class="cover-disclaimer">
        本報告係依據當事人提供之資料，結合中華民國現行法令所作之專業試算，
        僅供個案評估參考，不得視為正式法律意見書。實際個案結果需視證據、
        承審法院見解及國稅局核定而定。
      </div>
    </section>
  `;

  // === 目錄頁 ===
  const tocPage = tocHtml ? `
    <section class="pdf-toc">
      <h2 class="pdf-section-heading">目錄</h2>
      ${tocHtml}
    </section>
  ` : '';

  // === 正文頁 ===
  const contentPage = `
    <section class="pdf-content">
      <div class="pdf-running-header">
        <div>${firmName}</div>
        <div>${title}</div>
      </div>
      ${bodyHtml}
    </section>
  `;

  // === 簽名頁 ===
  const signaturePage = `
    <section class="pdf-signature">
      <div class="sig-block">
        <div class="sig-label">承辦${advisorTitle || '專員'}</div>
        <div class="sig-line"></div>
        ${advisor ? `<div class="sig-name">${advisor}</div>` : ''}
      </div>
      <div class="sig-block">
        <div class="sig-label">事務所用章</div>
        <div class="sig-seal-placeholder">（此處用印）</div>
      </div>
    </section>
  `;

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
  padding: 0;
  margin: 0 auto;
  max-width: 700px;
}

/* ===== 封面頁 ===== */
.pdf-cover {
  padding: 60px 50px;
  min-height: 900px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  break-after: page;
  position: relative;
  border-bottom: 3px solid ${C.ink};
}
.cover-badge {
  position: absolute;
  top: 40px;
  right: 50px;
  padding: 6px 14px;
  border: 1.5px solid ${C.accent};
  color: ${C.accent};
  font-size: 11px;
  font-family: 'DM Mono', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.cover-top {
  text-align: left;
  padding-bottom: 24px;
  border-bottom: 1px solid ${C.border};
}
.cover-firm-name {
  font-family: 'Noto Serif TC', serif;
  font-size: 28px;
  font-weight: 700;
  color: ${C.ink};
  letter-spacing: 0.05em;
}
.cover-firm-contact {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: ${C.muted};
  margin-top: 8px;
  line-height: 1.8;
}
.cover-hero {
  text-align: center;
  padding: 60px 0;
}
.cover-report-type {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.3em;
  color: ${C.gold};
  margin-bottom: 20px;
  text-transform: uppercase;
}
.cover-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 36px;
  font-weight: 700;
  color: ${C.ink};
  line-height: 1.4;
  margin-bottom: 16px;
}
.cover-subtitle {
  font-size: 15px;
  color: ${C.muted};
  letter-spacing: 0.05em;
}
.cover-meta {
  background: ${C.soft};
  padding: 24px 28px;
  border-radius: 8px;
  margin-top: 40px;
}
.cover-meta-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  font-size: 13px;
}
.cover-meta-row:last-child { border-bottom: none; }
.cover-meta-row span {
  color: ${C.muted};
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
}
.cover-meta-row strong {
  color: ${C.ink};
  font-weight: 600;
}
.cover-disclaimer {
  margin-top: 30px;
  padding: 14px 16px;
  background: rgba(196, 147, 42, 0.08);
  border-left: 3px solid ${C.gold};
  font-size: 11px;
  color: ${C.muted};
  line-height: 1.8;
}

/* ===== 目錄頁 ===== */
.pdf-toc {
  padding: 50px;
  break-after: page;
  border-bottom: 1px solid ${C.border};
}
.pdf-section-heading {
  font-family: 'Noto Serif TC', serif;
  font-size: 22px;
  font-weight: 700;
  color: ${C.ink};
  margin-bottom: 24px;
  padding-bottom: 10px;
  border-bottom: 2px solid ${C.gold};
}

/* ===== 正文頁 ===== */
.pdf-content {
  padding: 40px 50px;
}
.pdf-running-header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${C.border};
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: ${C.muted};
  letter-spacing: 0.08em;
}

/* ===== 簽名頁 ===== */
.pdf-signature {
  padding: 60px 50px 40px;
  display: flex;
  justify-content: space-between;
  gap: 40px;
  break-before: page;
}
.sig-block {
  flex: 1;
  text-align: center;
}
.sig-label {
  font-size: 12px;
  color: ${C.muted};
  font-family: 'DM Mono', monospace;
  letter-spacing: 0.1em;
  margin-bottom: 40px;
}
.sig-line {
  border-bottom: 1.5px solid ${C.ink};
  margin-bottom: 10px;
  min-height: 40px;
}
.sig-name {
  font-family: 'Noto Serif TC', serif;
  font-size: 16px;
  font-weight: 600;
}
.sig-seal-placeholder {
  margin-top: 10px;
  padding: 30px;
  border: 1.5px dashed ${C.border};
  font-size: 11px;
  color: ${C.muted};
}

button, .cross-link, .ip-cross-link, .ip-btn-calc { display: none !important; }
@media print { body { padding: 0; } .pdf-cover, .pdf-toc { page-break-after: always; } }
</style>
</head>
<body>
  ${coverPage}
  ${tocPage}
  ${contentPage}
  ${signaturePage}
  <div style="padding:20px 50px;border-top:1px solid ${C.border};text-align:center;font-size:10px;color:${C.muted};">
    © ${year} ${firmName} · 本報告採用 ${brand.name} 平台產出
  </div>
</body>
</html>`;
}

/**
 * 產生並觸發專業版 PDF 下載
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.pageSubtitle
 * @param {string} p.bodyHtml
 * @param {string} p.filename
 * @param {ProfessionalCaseMeta} [p.meta]
 * @param {string} [p.tocHtml]
 * @param {string} [p.coverBadge]
 * @returns {Promise<void>}
 */
export async function exportProfessionalPdf({ title, pageSubtitle, bodyHtml, filename, meta, tocHtml, coverBadge }) {
  const html = buildProfessionalPdfHtml({ title, pageSubtitle, bodyHtml, meta, tocHtml, coverBadge });
  if (typeof window.exportPDF !== 'function') {
    console.error('window.exportPDF 未載入。');
    alert('PDF 模組未載入，請重整頁面後再試。');
    return;
  }
  return window.exportPDF(html, filename);
}
