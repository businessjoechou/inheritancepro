/**
 * pdf/sections.js — 可重用的 PDF 區塊
 *
 * 每個函式回傳一段 HTML 字串，用於組裝到 template.js 的 body 裡。
 */

import { PDF_COLORS } from './theme.js';

const C = PDF_COLORS;

/**
 * Summary 卡片（深色 hero 結果）
 * @param {object} p
 * @param {string} p.label
 * @param {string} p.value
 * @param {string} [p.desc]
 * @returns {string}
 */
export function pdfSummaryCard({ label, value, desc }) {
  return `
    <div style="background:${C.ink};color:${C.paper};border-radius:12px;padding:22px;margin-bottom:14px;break-inside:avoid;">
      <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;margin-bottom:6px;">${label}</div>
      <div style="font-size:28px;font-weight:700;color:${C.gold};">${value}</div>
      ${desc ? `<div style="font-size:12px;color:rgba(255,255,255,0.7);line-height:1.65;margin-top:10px;">${desc}</div>` : ''}
    </div>
  `;
}

/**
 * Compare card（A/B 對比表）
 * @param {object} p
 * @param {string} p.leftLabel
 * @param {string} p.rightLabel
 * @param {Array<{label:string, left:string, right:string, highlight?:boolean, divider?:boolean}>} p.rows
 * @param {{label:string, left:string, right:string}} [p.taxRow]
 * @param {string} [p.diffLabel]
 * @param {string} [p.diffValue]
 * @returns {string}
 */
export function pdfCompareCard({ leftLabel, rightLabel, rows, taxRow, diffLabel, diffValue }) {
  const rowsHtml = rows.map(r => {
    const border = r.divider ? `border-top:2px solid ${C.ink};` : '';
    const hl = r.highlight ? `background:rgba(196,147,42,0.1);` : '';
    return `
      <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;border-bottom:1px solid ${C.soft};${border}${hl}">
        <div style="padding:10px 8px;color:${C.muted};font-size:11px;">${r.label}</div>
        <div style="padding:10px 8px;font-family:'Noto Serif TC',monospace;text-align:right;font-size:12px;color:${C.accent};">${r.left}</div>
        <div style="padding:10px 8px;font-family:'Noto Serif TC',monospace;text-align:right;font-size:12px;color:${C.success};">${r.right}</div>
      </div>
    `;
  }).join('');

  const taxRowHtml = taxRow ? `
    <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;background:${C.soft};font-weight:700;">
      <div style="padding:12px 8px;color:${C.ink};font-size:12px;">${taxRow.label}</div>
      <div style="padding:12px 8px;font-family:'Noto Serif TC',monospace;text-align:right;font-size:14px;color:${C.accent};">${taxRow.left}</div>
      <div style="padding:12px 8px;font-family:'Noto Serif TC',monospace;text-align:right;font-size:14px;color:${C.success};">${taxRow.right}</div>
    </div>
  ` : '';

  const diffHtml = (diffLabel || diffValue) ? `
    <div style="background:rgba(196,147,42,0.12);display:flex;justify-content:space-between;padding:16px 14px;">
      <span style="font-size:12px;color:${C.muted};font-family:'Noto Serif TC',monospace;">${diffLabel || ''}</span>
      <span style="font-family:'Noto Serif TC',monospace;font-size:22px;font-weight:700;color:${C.gold};">${diffValue || ''}</span>
    </div>
  ` : '';

  return `
    <div style="background:#fff;border:1.5px solid ${C.border};border-radius:12px;overflow:hidden;margin-bottom:14px;break-inside:avoid;">
      <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;background:${C.ink};color:#fff;">
        <div style="padding:10px;font-size:11px;text-align:center;">項目</div>
        <div style="padding:10px;font-size:11px;text-align:center;background:#5a1f1f;">${leftLabel}</div>
        <div style="padding:10px;font-size:11px;text-align:center;background:#1d4a31;">${rightLabel}</div>
      </div>
      ${rowsHtml}
      ${taxRowHtml}
      ${diffHtml}
    </div>
  `;
}

/**
 * Advantage block（綠色優惠項目）
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.body
 * @returns {string}
 */
export function pdfAdvantage({ title, body }) {
  return `
    <div style="background:${C.successBg};border-left:3px solid ${C.success};padding:10px 14px;font-size:11px;line-height:1.7;margin-bottom:8px;">
      <div style="font-weight:600;color:${C.success};margin-bottom:4px;">${title}</div>
      ${body}
    </div>
  `;
}

/**
 * Law note（法條備註）
 * @param {string} lawHtml
 * @returns {string}
 */
export function pdfLawNote(lawHtml) {
  return `
    <div style="background:#f8f5e8;border-left:3px solid ${C.gold};padding:12px 14px;font-size:11px;color:${C.muted};line-height:1.75;margin:14px 0;">
      ${lawHtml}
    </div>
  `;
}

/**
 * Trap alert（紅色警示）
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.body
 * @returns {string}
 */
export function pdfTrapAlert({ title, body }) {
  return `
    <div style="background:#8b1a1a;color:#fff;border-radius:12px;padding:16px 20px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:700;color:#ffd6cc;margin-bottom:6px;">${title}</div>
      <div style="font-size:12px;line-height:1.7;">${body}</div>
    </div>
  `;
}

/**
 * Detail row（通用「標籤：數值」行）
 * @param {object} p
 * @param {string} p.label
 * @param {string} p.value
 * @param {boolean} [p.emphasis=false]
 * @returns {string}
 */
export function pdfDetailRow({ label, value, emphasis = false }) {
  return `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${C.soft};font-size:12px;">
      <span style="color:${C.muted};">${label}</span>
      <span style="font-family:'Noto Serif TC',monospace;${emphasis ? `font-weight:700;color:${C.ink};` : ''}">${value}</span>
    </div>
  `;
}
