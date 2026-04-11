/**
 * utils/validation.js — 輸入驗證工具
 */

/** 必須為正數 */
export function requirePositive(value, label) {
  const n = parseFloat(value);
  if (isNaN(n) || n <= 0) {
    throw new Error(`${label} 必須為正數`);
  }
  return n;
}

/** 可為零的非負數 */
export function requireNonNegative(value, label) {
  const n = parseFloat(value);
  if (isNaN(n) || n < 0) {
    throw new Error(`${label} 不可為負數`);
  }
  return n;
}

/** 範圍內數字 */
export function requireInRange(value, min, max, label) {
  const n = parseFloat(value);
  if (isNaN(n) || n < min || n > max) {
    throw new Error(`${label} 必須介於 ${min} 與 ${max} 之間`);
  }
  return n;
}
