/**
 * utils/format.js — 金額與數字格式化
 */

/**
 * NT$ 1,234,567
 * @param {number} v
 * @returns {string}
 */
export const FMT = (v) => 'NT$ ' + Math.round(Number(v) || 0).toLocaleString('zh-TW');

/**
 * 1,234 萬（四捨五入至萬）
 * @param {number} v
 * @returns {string}
 */
export const FMT_WAN = (v) => Math.round((Number(v) || 0) / 10000).toLocaleString('zh-TW') + ' 萬';

/**
 * 不含貨幣符號，只有千分位
 * @param {number} v
 * @returns {string}
 */
export const FMT_NUM = (v) => Math.round(Number(v) || 0).toLocaleString('zh-TW');

/**
 * 百分比
 * @param {number} v
 * @param {number} [digits=0]
 * @returns {string}
 */
export const FMT_PCT = (v, digits = 0) => (Number(v) * 100).toFixed(digits) + '%';

/**
 * 從 input 讀取數字，NaN 則回傳 fallback
 * @param {string} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function parseNum(value, fallback = 0) {
  const v = parseFloat(value);
  return isNaN(v) ? fallback : v;
}

/**
 * 安全取 DOM input 的數字值
 * @param {string} id
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function getInputNum(id, fallback = 0) {
  const el = /** @type {HTMLInputElement|null} */ (document.getElementById(id));
  if (!el) return fallback;
  return parseNum(el.value, fallback);
}
