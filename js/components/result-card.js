/**
 * components/result-card.js — 深色結論卡片
 *
 * 用於 hero 結果展示：一個大數字、一句話描述。
 */

/**
 * @param {object} p
 * @param {string} p.label   小字 label
 * @param {string} p.value   大字數值（已格式化的字串）
 * @param {string} [p.desc]  支援 HTML 的描述行
 * @returns {string}
 */
export function renderResultCard({ label, value, desc }) {
  return `
    <div class="ip-summary-card">
      <div class="ip-sum-lbl">${label}</div>
      <div class="ip-sum-val">${value}</div>
      ${desc ? `<div class="ip-sum-desc">${desc}</div>` : ''}
    </div>
  `;
}
