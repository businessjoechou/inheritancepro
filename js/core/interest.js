/**
 * core/interest.js — 民法§203 法定利率與利息計算
 *
 * 從 interest-calc.html 提取。民法§203：未約定利率者，週年利率為 5%。
 *
 * ## 天數換算說明（民法§203 實務）
 * 本模組採 365 天/年 的固定基期（簡化估算）。民法§203 條文本身只規範「週年利率」
 * 百分比，並未指定天數計算基準；實務上銀行/法院多採 365 或 366 天（含閏年）計算。
 * 若跨越閏年且金額重大（例如逾期利息訴訟），使用者應自行換算實際日數，或
 * 透過 `daysBetween(a, b)` 加上 `baseYearDays` 參數精算（本模組尚未支援，
 * 後續視需求實作）。
 */

export const LEGAL_RATE_ANNUAL = 0.05; // 民法§203 法定週年利率 5%
export const DAYS_PER_YEAR = 365;      // 簡化基期：不考慮閏年；跨閏年重大金額請自行校正

/**
 * 單利計算
 * @param {number} principal  本金
 * @param {number} ratePct    年利率（百分比，例如 5 代表 5%）
 * @param {number} days       天數
 * @returns {number}
 */
export function simpleInterest(principal, ratePct, days) {
  const r = ratePct / 100;
  return principal * r * (days / DAYS_PER_YEAR);
}

/**
 * 複利計算（逐年複利）
 * @param {number} principal  本金
 * @param {number} ratePct    年利率（百分比）
 * @param {number} days       天數
 * @returns {number}
 */
export function compoundInterest(principal, ratePct, days) {
  const r = ratePct / 100;
  const years = days / DAYS_PER_YEAR;
  return principal * (Math.pow(1 + r, years) - 1);
}

/**
 * 通用利息計算
 * @param {object} p
 * @param {number} p.principal
 * @param {number} [p.ratePct=5]
 * @param {number} p.days
 * @param {'simple'|'compound'} [p.method='simple']
 */
export function calcInterest(p) {
  const { principal, ratePct = LEGAL_RATE_ANNUAL * 100, days, method = 'simple' } = p;
  const interest = method === 'compound'
    ? compoundInterest(principal, ratePct, days)
    : simpleInterest(principal, ratePct, days);
  return {
    principal,
    ratePct,
    days,
    method,
    interest: Math.round(interest),
    total: Math.round(principal + interest),
    law: '民法§203（法定週年利率 5%；本模組以 365 天/年 簡化，跨閏年重大金額建議實際日數核算）',
  };
}
