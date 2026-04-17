/**
 * dates-tw.js — 以 Asia/Taipei (+08:00) 解析日期字串的共用 helper
 *
 * 解決 `new Date('2025-01-01')` 被當 UTC 00:00 → 台北時區變前一天的 bug。
 * 核心計算（core/dates.js, core/damages.js）都應透過此 helper 構造 Date。
 *
 * 規則：
 * - 空字串/null → Invalid Date
 * - Date 物件 → clone 回傳（避免下游 setXXX mutate 原物件）
 * - 有 T / Z / 時區 offset 的字串 → 交給原生 Date
 * - 純日期字串（YYYY-MM-DD 或 YYYY/MM/DD）→ 補 T00:00:00+08:00
 * - 其他格式（民國年等）→ 交給原生 Date
 */

/**
 * @param {string|Date|null|undefined} s
 * @returns {Date}
 */
export function parseDateTW(s) {
  if (s == null || s === '') return new Date(NaN);
  if (s instanceof Date) return new Date(s.getTime());
  const str = String(s).trim();
  if (/[TZ]|[+-]\d\d:?\d\d$/.test(str)) return new Date(str);
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    return new Date(str.replace(/\//g, '-') + 'T00:00:00+08:00');
  }
  return new Date(str);
}
