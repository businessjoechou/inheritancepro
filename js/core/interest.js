/**
 * core/interest.js — 民法§203 法定利率與利息計算
 *
 * 從 interest-calc.html 提取。民法§203：未約定利率者，週年利率為 5%。
 */

export const LEGAL_RATE_ANNUAL = 0.05; // 民法§203 法定週年利率 5%

/**
 * 單利計算
 * @param {number} principal  本金
 * @param {number} ratePct    年利率（百分比，例如 5 代表 5%）
 * @param {number} days       天數
 */
export function simpleInterest(principal, ratePct, days) {
  const r = ratePct / 100;
  return principal * r * (days / 365);
}

/**
 * 複利計算（逐年複利）
 */
export function compoundInterest(principal, ratePct, days) {
  const r = ratePct / 100;
  const years = days / 365;
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
    law: '民法§203（法定週年利率 5%）',
  };
}
