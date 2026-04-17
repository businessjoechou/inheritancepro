/**
 * core/property-tax.js — 房地合一稅 2.0 純計算模組
 *
 * 涵蓋：
 *  · 一般持有稅率計算（所§4-4, §4-5, §14-4）
 *  · 繼承取得之房地「額外負擔扣除」（財部台財稅字第 11004561660 號函）
 *  · 非自願出售 20% 稅率（所§14-4 III 第 1 款 + 財政部公告「個人及營利事業非自願交易持有期間在5年以下之房屋、土地，得按20%稅率課徵房地合一所得稅情形」）
 *  · 物價調整、可列舉費用、憑直覺 vs 懂規則對比
 *
 * 所有函式為純函式（不碰 DOM），可被任何頁面或未來的 React 旗艦工具引用。
 * 參數與回傳皆使用 TWD 的元為單位。
 */

export const PROPERTY_TAX_VERSIONS = {
  2026: {
    lawVersion: '2026-Q1',
    // 房地合一稅 2.0 稅率在可預見期間內穩定。變動時請在此新增年度。
    rates: { long10: 0.15, long5: 0.20, short2: 0.35, short1: 0.45, forced: 0.20 },
  },
};
export const LATEST_PROPERTY_YEAR = 2026;

/**
 * 依持有年數與是否非自願出售決定房地合一稅率
 * @param {number} holdYears  持有年數（可依所§4-5 併計被繼承人持有期間）
 * @param {boolean} isForced  是否符合「非自願出售」
 * @param {object} [opts]
 * @param {number} [opts.year]
 * @returns {number} 稅率（小數，例如 0.20）
 */
export function getPropertyTaxRate(holdYears, isForced = false, opts = {}) {
  const v = PROPERTY_TAX_VERSIONS[/** @type {keyof typeof PROPERTY_TAX_VERSIONS} */ (opts.year || LATEST_PROPERTY_YEAR)] || PROPERTY_TAX_VERSIONS[LATEST_PROPERTY_YEAR];
  const r = v.rates;
  if (holdYears >= 10) return r.long10;
  if (holdYears >= 5)  return r.long5;
  if (isForced)        return r.forced;
  if (holdYears >= 2)  return r.short2;
  return r.short1;
}

/**
 * 計算單邊房地合一稅（不做對比）
 * @param {object} p
 * @param {number} p.salePrice          出售價
 * @param {number} p.acquisitionCost    取得成本（公告現值或原買價）
 * @param {number} p.deductibleExpense  可列舉費用
 * @param {number} p.extraBurden        額外負擔扣除（繼承時房貸 - 現值，>0 部分）
 * @param {number} p.taxRate            適用稅率（小數）
 * @returns {{taxableGain:number, tax:number}}
 */
export function calcPropertyTaxOnce({ salePrice, acquisitionCost, deductibleExpense, extraBurden, taxRate }) {
  const taxableGain = Math.max(0, salePrice - acquisitionCost - deductibleExpense - extraBurden);
  const tax = Math.round(taxableGain * taxRate);
  return { taxableGain, tax };
}

/**
 * 繼承房貸陷阱專用：計算「憑直覺申報」與「套用優惠」兩種結果與差額
 *
 * @param {object} p
 * @param {number} p.salePrice        出售價
 * @param {number} p.mortgage         繼承時房貸餘額
 * @param {number} p.inheritedValue   繼承時公告現值（= 一般取得成本）
 * @param {number} p.holdYears        繼承後持有年數
 * @param {number} [p.cpiMult=1.08]   物價調整係數
 * @param {number} [p.expenseRate=0.03] 可列舉費用率
 * @param {boolean} [p.isForced=false] 是否主張非自願出售
 * @param {number} [p.year]           稅法年度
 * @returns {object} 包含兩邊的 taxableGain/tax、各優惠貢獻、省下金額、對比表資料
 */
export function calcInheritedPropertyTrap(p) {
  const {
    salePrice,
    mortgage,
    inheritedValue,
    holdYears,
    cpiMult = 1.08,
    expenseRate = 0.03,
    isForced = false,
    year,
  } = p;

  // 決定稅率
  const smartRate = getPropertyTaxRate(holdYears, isForced, { year });
  const naiveRate = getPropertyTaxRate(holdYears, false, { year });

  // === 憑直覺申報 ===
  // 一般人：取得成本 = 公告現值（未物價調整）、無費用、無額外負擔
  const naiveCost = inheritedValue;
  const naiveExp = 0;
  const naiveExtBurden = 0;
  const naive = calcPropertyTaxOnce({
    salePrice,
    acquisitionCost: naiveCost,
    deductibleExpense: naiveExp,
    extraBurden: naiveExtBurden,
    taxRate: naiveRate,
  });

  // === 套用優惠 ===
  // 1. 取得成本物價調整
  const smartCost = inheritedValue * cpiMult;
  // 2. 可列舉費用
  const smartExp = salePrice * expenseRate;
  // 3. 額外負擔扣除 = max(0, 房貸餘額 - 公告現值)
  const extBurden = Math.max(0, mortgage - inheritedValue);
  const smart = calcPropertyTaxOnce({
    salePrice,
    acquisitionCost: smartCost,
    deductibleExpense: smartExp,
    extraBurden: extBurden,
    taxRate: smartRate,
  });

  // === 差額與拆解 ===
  const savings = naive.tax - smart.tax;
  const savingsPct = naive.tax > 0 ? Math.round((savings / naive.tax) * 100) : 0;

  // 拆解各優惠貢獻（用 smartRate 估算節稅金額）
  const cpiSaving = Math.round((smartCost - naiveCost) * smartRate);
  const expSaving = Math.round(smartExp * smartRate);
  const extSaving = Math.round(extBurden * smartRate);
  const rateSaving = naiveRate !== smartRate
    ? Math.round(naive.taxableGain * (naiveRate - smartRate))
    : 0;

  // 陷阱警示：賣屋後現金是否被稅吃光
  const cashOnHand = salePrice - mortgage;
  const isTrap = cashOnHand > 0 && naive.tax > cashOnHand * 0.5;
  const isExtremeTrap = naive.tax >= cashOnHand;

  const v = PROPERTY_TAX_VERSIONS[/** @type {keyof typeof PROPERTY_TAX_VERSIONS} */ (year || LATEST_PROPERTY_YEAR)] || PROPERTY_TAX_VERSIONS[LATEST_PROPERTY_YEAR];

  return {
    naive: {
      cost: naiveCost,
      expense: naiveExp,
      extraBurden: naiveExtBurden,
      taxableGain: naive.taxableGain,
      tax: naive.tax,
      rate: naiveRate,
    },
    smart: {
      cost: smartCost,
      expense: smartExp,
      extraBurden: extBurden,
      taxableGain: smart.taxableGain,
      tax: smart.tax,
      rate: smartRate,
    },
    savings,
    savingsPct,
    breakdown: {
      cpiSaving,
      expSaving,
      extSaving,
      rateSaving,
    },
    trap: {
      cashOnHand,
      isTrap,
      isExtremeTrap,
    },
    taxYear: year || LATEST_PROPERTY_YEAR,
    lawVersion: v.lawVersion,
    law: '所§4-4, §4-5, §14-4；財部台財稅字第 11004561660 號函；非自願出售 20% 依所§14-4 III 第 1 款及財政部公告「個人及營利事業非自願交易持有期間在 5 年以下之房屋、土地，得按 20% 稅率課徵房地合一所得稅情形」',
  };
}
