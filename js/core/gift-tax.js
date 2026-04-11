/**
 * core/gift-tax.js — 遺產及贈與稅法 贈與稅計算
 *
 * 從 gift-tax.html 提取。
 * 累進稅率：
 *   ≤ 2,500 萬       10%
 *   2,500 萬 ~ 5,000 萬  15%
 *   > 5,000 萬       20%
 */

export const GIFT_ANNUAL_EXEMPT = 2_440_000; // 244 萬年度免稅額

const T1 = 25_000_000;
const T2 = 50_000_000;

/**
 * 累進贈與稅
 * @param {number} netGift 扣除免稅額後之贈與淨額
 */
export function calcGiftTax(netGift) {
  if (netGift <= 0) return 0;
  if (netGift <= T1) return Math.round(netGift * 0.10);
  if (netGift <= T2) return Math.round(T1 * 0.10 + (netGift - T1) * 0.15);
  return Math.round(T1 * 0.10 + (T2 - T1) * 0.15 + (netGift - T2) * 0.20);
}

export function getGiftTaxRate(netGift) {
  if (netGift > T2) return '20%';
  if (netGift > T1) return '15%';
  return '10%';
}

/**
 * 一站式贈與稅計算
 * @param {object} p
 * @param {number} p.priorGifts    年度內先前累計贈與（對同對象或任何人）
 * @param {number} p.currentGift   本次贈與
 * @param {boolean} [p.isSpouseGift=false]  是否為配偶間贈與（§20 全額免稅）
 */
export function calcGiftTaxFull(p) {
  const { priorGifts = 0, currentGift = 0, isSpouseGift = false } = p;

  if (isSpouseGift) {
    return {
      isSpouseGift: true,
      totalGifts: priorGifts + currentGift,
      annualExempt: GIFT_ANNUAL_EXEMPT,
      usedExempt: Math.min(priorGifts, GIFT_ANNUAL_EXEMPT),
      remainingExempt: Math.max(0, GIFT_ANNUAL_EXEMPT - priorGifts),
      netGift: 0,
      tax: 0,
      rate: '免稅',
      law: '遺產及贈與稅法§20（配偶間贈與不計入贈與總額）',
    };
  }

  const totalGifts = priorGifts + currentGift;
  const netGift = Math.max(0, totalGifts - GIFT_ANNUAL_EXEMPT);
  const tax = calcGiftTax(netGift);

  return {
    isSpouseGift: false,
    totalGifts,
    annualExempt: GIFT_ANNUAL_EXEMPT,
    usedExempt: Math.min(totalGifts, GIFT_ANNUAL_EXEMPT),
    remainingExempt: Math.max(0, GIFT_ANNUAL_EXEMPT - totalGifts),
    netGift,
    tax,
    rate: tax === 0 ? '免稅' : getGiftTaxRate(netGift),
    law: '遺產及贈與稅法§19, §22',
  };
}

/**
 * 分年贈與規劃：把總額 N 分成幾年可完全免稅
 * @param {number} totalAmount
 * @returns {{freeYears:number, remainder:number}}
 */
export function planGiftYears(totalAmount) {
  const freeYears = Math.floor(totalAmount / GIFT_ANNUAL_EXEMPT);
  const remainder = totalAmount % GIFT_ANNUAL_EXEMPT;
  return { freeYears, remainder };
}
