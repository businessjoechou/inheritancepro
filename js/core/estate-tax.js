/**
 * core/estate-tax.js — 遺產及贈與稅法 遺產稅計算
 *
 * 從 calculator.html / estate-tax-detail.html 提取。2026 年稅率。
 * 累進稅率：
 *   ≤ 5,000 萬        10%
 *   5,000 萬 ~ 1 億    15%
 *   > 1 億             20%
 */

// === 常數（2026 年）===
export const ESTATE_EXEMPTION      = 13_330_000; // 免稅額
export const DEDUCT_SPOUSE         = 5_530_000;  // 配偶扣除額
export const DEDUCT_FUNERAL        = 1_380_000;  // 喪葬費扣除額
export const DEDUCT_PER_CHILD      = 560_000;    // 子女 / 直系血親卑親屬
export const DEDUCT_PER_PARENT     = 1_380_000;  // 父母
export const DEDUCT_PER_DISABLED   = 6_930_000;  // 身心障礙
export const INSURANCE_EXCLUDE_MAX = 33_300_000; // 人壽保險免計入遺產上限

const T1 = 50_000_000;
const T2 = 100_000_000;

/**
 * 累進遺產稅
 * @param {number} netEstate 遺產淨額（已扣除免稅額與扣除額）
 * @returns {number} 應納稅額
 */
export function calcEstateTax(netEstate) {
  if (netEstate <= 0) return 0;
  if (netEstate <= T1) return Math.round(netEstate * 0.10);
  if (netEstate <= T2) return Math.round(T1 * 0.10 + (netEstate - T1) * 0.15);
  return Math.round(T1 * 0.10 + (T2 - T1) * 0.15 + (netEstate - T2) * 0.20);
}

/**
 * 適用稅率字串
 */
export function getEstateTaxRate(netEstate) {
  if (netEstate > T2) return '20%';
  if (netEstate > T1) return '15%';
  return '10%';
}

/**
 * 累進稅率拆解（供 UI 顯示分段計算）
 */
export function getEstateTaxBreakdown(netEstate) {
  if (netEstate <= 0) return [];
  if (netEstate <= T1) {
    return [{ rate: 0.10, base: netEstate, tax: Math.round(netEstate * 0.10) }];
  }
  if (netEstate <= T2) {
    return [
      { rate: 0.10, base: T1, tax: Math.round(T1 * 0.10) },
      { rate: 0.15, base: netEstate - T1, tax: Math.round((netEstate - T1) * 0.15) },
    ];
  }
  return [
    { rate: 0.10, base: T1, tax: Math.round(T1 * 0.10) },
    { rate: 0.15, base: T2 - T1, tax: Math.round((T2 - T1) * 0.15) },
    { rate: 0.20, base: netEstate - T2, tax: Math.round((netEstate - T2) * 0.20) },
  ];
}

/**
 * 一站式遺產稅計算（含扣除額）
 * @param {object} p
 * @param {number} p.totalAssets   遺產總額
 * @param {number} [p.insurancePaid=0]  人壽保險給付（>3,330 萬部分須計入）
 * @param {boolean} [p.hasSpouse=false]
 * @param {number} [p.childrenCount=0]
 * @param {number} [p.parentsCount=0]
 * @param {number} [p.disabledCount=0]
 * @param {number} [p.otherDeductions=0]
 * @param {number} [p.agriDeduction=0]  農業用地扣除額
 * @param {number} [p.retaxDeduction=0] 再次繼承扣除額
 */
export function calcEstateTaxFull(p) {
  const {
    totalAssets,
    insurancePaid = 0,
    hasSpouse = false,
    childrenCount = 0,
    parentsCount = 0,
    disabledCount = 0,
    otherDeductions = 0,
    agriDeduction = 0,
    retaxDeduction = 0,
  } = p;

  const insuranceTaxable  = Math.max(0, insurancePaid - INSURANCE_EXCLUDE_MAX);
  const insuranceExcluded = Math.min(insurancePaid, INSURANCE_EXCLUDE_MAX);

  const adjustedTotal = totalAssets + insuranceTaxable;

  const dSpouse   = hasSpouse ? DEDUCT_SPOUSE : 0;
  const dFuneral  = DEDUCT_FUNERAL;
  const dChildren = childrenCount * DEDUCT_PER_CHILD;
  const dParents  = parentsCount * DEDUCT_PER_PARENT;
  const dDisabled = disabledCount * DEDUCT_PER_DISABLED;

  const totalDeductions = dSpouse + dFuneral + dChildren + dParents + dDisabled
                        + otherDeductions + agriDeduction + retaxDeduction;

  const netEstate = Math.max(0, adjustedTotal - ESTATE_EXEMPTION - totalDeductions);
  const tax = calcEstateTax(netEstate);

  return {
    adjustedTotal,
    insuranceExcluded,
    insuranceTaxable,
    deductions: {
      spouse: dSpouse,
      funeral: dFuneral,
      children: dChildren,
      parents: dParents,
      disabled: dDisabled,
      other: otherDeductions,
      agriculture: agriDeduction,
      reinherit: retaxDeduction,
      total: totalDeductions,
    },
    exemption: ESTATE_EXEMPTION,
    netEstate,
    tax,
    rate: getEstateTaxRate(netEstate),
    breakdown: getEstateTaxBreakdown(netEstate),
    law: '遺產及贈與稅法§13, §17, §16',
  };
}
