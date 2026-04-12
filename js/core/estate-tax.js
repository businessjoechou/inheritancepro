/**
 * core/estate-tax.js — 遺產及贈與稅法 遺產稅計算
 *
 * 從 calculator.html / estate-tax-detail.html 提取。
 * 累進稅率：
 *   ≤ 5,000 萬        10%
 *   5,000 萬 ~ 1 億    15%
 *   > 1 億             20%
 *
 * 稅率與免稅額隨年度調整。本模組維護所有過往版本，呼叫端可透過 { year } 鎖定。
 */

/**
 * 各年度稅法常數。新年度調整時請新增條目，舊條目永不刪除。
 * 這樣 2024 年儲存的計算記錄，在 2027 年重新開啟時仍能重現原始數字。
 */
export const ESTATE_TAX_VERSIONS = {
  2026: {
    lawVersion: '2026-Q1',
    exemption:          13_330_000,
    deductSpouse:       5_530_000,
    deductFuneral:      1_380_000,
    deductPerChild:     560_000,
    deductPerParent:    1_380_000,
    deductPerDisabled:  6_930_000,
    insuranceExcludeMax: 33_300_000,
    brackets: [
      { upTo: 50_000_000,  rate: 0.10 },
      { upTo: 100_000_000, rate: 0.15 },
      { upTo: Infinity,    rate: 0.20 },
    ],
  },
};

export const LATEST_TAX_YEAR = 2026;

// === 便利常數（以最新年度為準）===
export const ESTATE_EXEMPTION      = ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR].exemption;
export const DEDUCT_SPOUSE         = ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR].deductSpouse;
export const DEDUCT_FUNERAL        = ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR].deductFuneral;
export const DEDUCT_PER_CHILD      = ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR].deductPerChild;
export const DEDUCT_PER_PARENT     = ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR].deductPerParent;
export const DEDUCT_PER_DISABLED   = ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR].deductPerDisabled;
export const INSURANCE_EXCLUDE_MAX = ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR].insuranceExcludeMax;

/**
 * 解析年度 → 稅法版本
 * @param {number} [year]
 */
function getVersion(year) {
  const y = year || LATEST_TAX_YEAR;
  return ESTATE_TAX_VERSIONS[/** @type {keyof typeof ESTATE_TAX_VERSIONS} */ (y)] || ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR];
}

/**
 * 累進遺產稅
 * @param {number} netEstate 遺產淨額（已扣除免稅額與扣除額）
 * @param {object} [opts]
 * @param {number} [opts.year]  指定稅法年度
 * @returns {number} 應納稅額
 */
export function calcEstateTax(netEstate, opts = {}) {
  if (netEstate <= 0) return 0;
  const { brackets } = getVersion(opts.year);
  let remaining = netEstate;
  let prevUpTo = 0;
  let tax = 0;
  for (const b of brackets) {
    const slice = Math.min(remaining, b.upTo - prevUpTo);
    tax += slice * b.rate;
    remaining -= slice;
    prevUpTo = b.upTo;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

/**
 * 適用稅率字串（最高階）
 * @param {number} netEstate
 * @param {object} [opts]
 * @param {number} [opts.year]
 * @returns {string}
 */
export function getEstateTaxRate(netEstate, opts = {}) {
  const { brackets } = getVersion(opts.year);
  let prevUpTo = 0;
  for (const b of brackets) {
    if (netEstate <= b.upTo) return (b.rate * 100) + '%';
    prevUpTo = b.upTo;
  }
  return (brackets[brackets.length - 1].rate * 100) + '%';
}

/**
 * 累進稅率拆解（供 UI 顯示分段計算）
 * @param {number} netEstate
 * @param {object} [opts]
 * @param {number} [opts.year]
 * @returns {Array<{rate: number, base: number, tax: number}>}
 */
export function getEstateTaxBreakdown(netEstate, opts = {}) {
  if (netEstate <= 0) return [];
  const { brackets } = getVersion(opts.year);
  const out = [];
  let remaining = netEstate;
  let prevUpTo = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.upTo - prevUpTo);
    out.push({ rate: b.rate, base: slice, tax: Math.round(slice * b.rate) });
    remaining -= slice;
    prevUpTo = b.upTo;
  }
  return out;
}

/**
 * 一站式遺產稅計算（含扣除額）
 * @param {object} p
 * @param {number} p.totalAssets        遺產總額
 * @param {number} [p.insurancePaid=0]  人壽保險給付（>3,330 萬部分須計入）
 * @param {boolean} [p.hasSpouse=false]
 * @param {number} [p.childrenCount=0]
 * @param {number} [p.parentsCount=0]
 * @param {number} [p.disabledCount=0]
 * @param {number} [p.otherDeductions=0]
 * @param {number} [p.agriDeduction=0]  農業用地扣除額
 * @param {number} [p.retaxDeduction=0] 再次繼承扣除額
 * @param {number} [p.year]             稅法年度（未指定則用 LATEST_TAX_YEAR）
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
    year,
  } = p;

  const v = getVersion(year);

  const insuranceTaxable  = Math.max(0, insurancePaid - v.insuranceExcludeMax);
  const insuranceExcluded = Math.min(insurancePaid, v.insuranceExcludeMax);

  const adjustedTotal = totalAssets + insuranceTaxable;

  const dSpouse   = hasSpouse ? v.deductSpouse : 0;
  const dFuneral  = v.deductFuneral;
  const dChildren = childrenCount * v.deductPerChild;
  const dParents  = parentsCount * v.deductPerParent;
  const dDisabled = disabledCount * v.deductPerDisabled;

  const totalDeductions = dSpouse + dFuneral + dChildren + dParents + dDisabled
                        + otherDeductions + agriDeduction + retaxDeduction;

  const netEstate = Math.max(0, adjustedTotal - v.exemption - totalDeductions);
  const tax = calcEstateTax(netEstate, { year });

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
    exemption: v.exemption,
    netEstate,
    tax,
    rate: getEstateTaxRate(netEstate, { year }),
    breakdown: getEstateTaxBreakdown(netEstate, { year }),
    taxYear: year || LATEST_TAX_YEAR,
    lawVersion: v.lawVersion,
    law: '遺產及贈與稅法§13, §17, §16',
  };
}
