/**
 * utils/validation.js — 輸入驗證工具
 */

/**
 * 必須為正數
 * @param {string|number} value
 * @param {string} label
 * @returns {number}
 */
export function requirePositive(value, label) {
  const n = parseFloat(String(value));
  if (isNaN(n) || n <= 0) {
    throw new Error(`${label} 必須為正數`);
  }
  return n;
}

/**
 * 可為零的非負數
 * @param {string|number} value
 * @param {string} label
 * @returns {number}
 */
export function requireNonNegative(value, label) {
  const n = parseFloat(String(value));
  if (isNaN(n) || n < 0) {
    throw new Error(`${label} 不可為負數`);
  }
  return n;
}

/**
 * 範圍內數字
 * @param {string|number} value
 * @param {number} min
 * @param {number} max
 * @param {string} label
 * @returns {number}
 */
export function requireInRange(value, min, max, label) {
  const n = parseFloat(String(value));
  if (isNaN(n) || n < min || n > max) {
    throw new Error(`${label} 必須介於 ${min} 與 ${max} 之間`);
  }
  return n;
}
