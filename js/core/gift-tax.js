/**
 * core/gift-tax.js — 遺產及贈與稅法 贈與稅計算
 *
 * 從 gift-tax.html 提取。
 * 累進稅率：
 *   ≤ 2,500 萬       10%
 *   2,500 萬 ~ 5,000 萬  15%
 *   > 5,000 萬       20%
 *
 * 年度免稅額與稅率隨年度調整，透過 GIFT_TAX_VERSIONS 維護。
 */

export const GIFT_TAX_VERSIONS = {
  2026: {
    lawVersion: '2026-Q1',
    annualExempt: 2_440_000, // 244 萬
    brackets: [
      { upTo: 25_000_000, rate: 0.10 },
      { upTo: 50_000_000, rate: 0.15 },
      { upTo: Infinity,   rate: 0.20 },
    ],
  },
};

export const LATEST_GIFT_YEAR = 2026;

export const GIFT_ANNUAL_EXEMPT = GIFT_TAX_VERSIONS[LATEST_GIFT_YEAR].annualExempt;

function getVersion(year) {
  return GIFT_TAX_VERSIONS[year || LATEST_GIFT_YEAR] || GIFT_TAX_VERSIONS[LATEST_GIFT_YEAR];
}

/**
 * 累進贈與稅
 * @param {number} netGift 扣除免稅額後之贈與淨額
 * @param {object} [opts]
 * @param {number} [opts.year]
 */
export function calcGiftTax(netGift, opts = {}) {
  if (netGift <= 0) return 0;
  const { brackets } = getVersion(opts.year);
  let remaining = netGift;
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

export function getGiftTaxRate(netGift, opts = {}) {
  const { brackets } = getVersion(opts.year);
  for (const b of brackets) {
    if (netGift <= b.upTo) return (b.rate * 100) + '%';
  }
  return (brackets[brackets.length - 1].rate * 100) + '%';
}

/**
 * 一站式贈與稅計算
 * @param {object} p
 * @param {number} p.priorGifts    年度內先前累計贈與
 * @param {number} p.currentGift   本次贈與
 * @param {boolean} [p.isSpouseGift=false]  是否為配偶間贈與（§20 全額免稅）
 * @param {number} [p.year]
 */
export function calcGiftTaxFull(p) {
  const { priorGifts = 0, currentGift = 0, isSpouseGift = false, year } = p;
  const v = getVersion(year);

  if (isSpouseGift) {
    return {
      isSpouseGift: true,
      totalGifts: priorGifts + currentGift,
      annualExempt: v.annualExempt,
      usedExempt: Math.min(priorGifts, v.annualExempt),
      remainingExempt: Math.max(0, v.annualExempt - priorGifts),
      netGift: 0,
      tax: 0,
      rate: '免稅',
      taxYear: year || LATEST_GIFT_YEAR,
      lawVersion: v.lawVersion,
      law: '遺產及贈與稅法§20（配偶間贈與不計入贈與總額）',
    };
  }

  const totalGifts = priorGifts + currentGift;
  const netGift = Math.max(0, totalGifts - v.annualExempt);
  const tax = calcGiftTax(netGift, { year });

  return {
    isSpouseGift: false,
    totalGifts,
    annualExempt: v.annualExempt,
    usedExempt: Math.min(totalGifts, v.annualExempt),
    remainingExempt: Math.max(0, v.annualExempt - totalGifts),
    netGift,
    tax,
    rate: tax === 0 ? '免稅' : getGiftTaxRate(netGift, { year }),
    taxYear: year || LATEST_GIFT_YEAR,
    lawVersion: v.lawVersion,
    law: '遺產及贈與稅法§19, §22',
  };
}

/**
 * 分年贈與規劃：把總額 N 分成幾年可完全免稅
 */
export function planGiftYears(totalAmount, opts = {}) {
  const v = getVersion(opts.year);
  const freeYears = Math.floor(totalAmount / v.annualExempt);
  const remainder = totalAmount % v.annualExempt;
  return { freeYears, remainder, annualExempt: v.annualExempt };
}
