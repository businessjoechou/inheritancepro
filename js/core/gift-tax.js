/**
 * core/gift-tax.js — 遺產及贈與稅法 贈與稅計算
 *
 * ## 法源
 * - 條文：遺產及贈與稅法§19（稅率）、§20（不計入贈與總額，含配偶間贈與）、§21（扣除額）、§22（免稅額）、§12-1（物價連動調整）
 * - 條文最後修正日：民國 110/01/20（全國法規資料庫）
 * - 級距／免稅額之金額非載於條文本身，依§12-1 由財政部隨 CPI 每年公告
 *
 * ## 各版本採用之公告
 * - 2024 版：財政部 111 年公告，級距維持 2,500 萬 / 5,000 萬
 * - 2025 版：財政部 113/11/28 公告（114/01/01 起適用），CPI 累計上漲 12.42% 觸發調整
 *
 * ## 累進稅率（2025 版，自 114/01/01 起適用）
 *   ≤ 2,811 萬             10%
 *   2,811 萬 ~ 5,621 萬     15%
 *   > 5,621 萬             20%
 *
 * 稅率與金額隨年度調整，透過 GIFT_TAX_VERSIONS 維護。
 * **新年度調整時請新增條目，舊條目永不刪除**。
 */

/**
 * 2025 版常數：財政部 113/11/28 公告，自 114/01/01 起發生之贈與行為適用
 * @see https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=8dbb4973744d4f30804dbd4e529c1978
 */
const V2025 = {
  lawVersion: '2025 (財政部 113/11/28 公告)',
  appliesFrom: '2025-01-01',
  annualExempt: 2_440_000, // 年度免稅額 244 萬（§22）
  brackets: [
    { upTo: 28_110_000, rate: 0.10 }, // 2,811 萬以下 10%
    { upTo: 56_210_000, rate: 0.15 }, // 2,811 萬 ~ 5,621 萬 15%
    { upTo: Infinity,   rate: 0.20 }, // 超過 5,621 萬 20%
  ],
};

/**
 * 2022-2024 版常數：財政部 110/11/24 公告（111 年起適用），112/113 年 CPI
 * 未達 10% 門檻沿用。自 111/01/01 起年免稅額由 220 萬升至 244 萬。
 *
 * 觸發依據：遺贈稅§12-1，98 年基期 CPI 93.49 vs 110 年 CPI 103.86 → 漲幅 11.09%。
 *
 * @see https://www.dot.gov.tw/singlehtml/ch26?cntId=4c40feb43876418f94ac0cb8dbe4ea86
 */
const V2022_2024 = {
  lawVersion: '2022-2024 (財政部 110/11/24 公告)',
  appliesFrom: '2022-01-01',
  annualExempt: 2_440_000, // 年度免稅額 244 萬（§22；111 年自 220 萬調升）
  brackets: [
    { upTo: 25_000_000, rate: 0.10 }, // 2,500 萬以下 10%
    { upTo: 50_000_000, rate: 0.15 }, // 2,500 萬 ~ 5,000 萬 15%
    { upTo: Infinity,   rate: 0.20 }, // 超過 5,000 萬 20%
  ],
};

/**
 * 各年度稅法常數。新年度調整時請新增條目，舊條目永不刪除（以便重現舊案件）。
 *
 * 目前尚未支援 2021/12/31 以前發生之案件（220 萬年免稅額、2,500/5,000 萬級距，
 * 財政部 97 年公告）；如需支援請先查證財政部公告後再新增，不得憑記憶填入。
 */
export const GIFT_TAX_VERSIONS = {
  /** 2022 版：財政部 110/11/24 公告，自 111/01/01 起適用 */
  2022: V2022_2024,
  /** 2023 版：CPI 未達 10% 門檻，沿用 2022 版 */
  2023: V2022_2024,
  /** 2024 版：CPI 未達 10% 門檻，沿用 2022 版 */
  2024: V2022_2024,
  /** 2025 版：財政部 113/11/28 公告，自 114/01/01 起適用 */
  2025: V2025,
  /** 2026 版：CPI 未達 10% 門檻，沿用 2025 版 */
  2026: V2025,
};

export const LATEST_GIFT_YEAR = 2026;

export const GIFT_ANNUAL_EXEMPT = GIFT_TAX_VERSIONS[LATEST_GIFT_YEAR].annualExempt;

/**
 * @param {number} [year]
 */
function getVersion(year) {
  return GIFT_TAX_VERSIONS[/** @type {keyof typeof GIFT_TAX_VERSIONS} */ (year || LATEST_GIFT_YEAR)] || GIFT_TAX_VERSIONS[LATEST_GIFT_YEAR];
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

/**
 * @param {number} netGift
 * @param {object} [opts]
 * @param {number} [opts.year]
 * @returns {string}
 */
export function getGiftTaxRate(netGift, opts = {}) {
  const { brackets } = getVersion(opts.year);
  for (const b of brackets) {
    if (netGift <= b.upTo) return (b.rate * 100) + '%';
  }
  return (brackets[brackets.length - 1].rate * 100) + '%';
}

/**
 * 一站式贈與稅計算
 *
 * §20-I-6：配偶相互贈與之財產**不計入贈與總額**。
 *   法條本身無金額上限、亦無登記等附加條件（僅要求贈與雙方確為配偶），故
 *   `isSpouseGift=true` 時直接回傳 tax=0 屬合法簡化。但注意：
 *   (a) 非§20-I-6 之「父母贈與子女婚嫁財物」請改用 §20-I-7（限 100 萬）的邏輯；
 *   (b) 若贈與行為發生於配偶死亡後（已非配偶），不適用本款。
 *
 * @param {object} p
 * @param {number} p.priorGifts    年度內先前累計贈與
 * @param {number} p.currentGift   本次贈與
 * @param {boolean} [p.isSpouseGift=false]  是否為配偶間贈與（§20-I-6 全額免稅、無上限）
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
      law: '遺產及贈與稅法§20-I-6（配偶相互贈與之財產不計入贈與總額，無金額上限）',
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
 * @param {number} totalAmount
 * @param {object} [opts]
 * @param {number} [opts.year]
 * @returns {{freeYears: number, remainder: number, annualExempt: number}}
 */
export function planGiftYears(totalAmount, opts = {}) {
  const v = getVersion(opts.year);
  const freeYears = Math.floor(totalAmount / v.annualExempt);
  const remainder = totalAmount % v.annualExempt;
  return { freeYears, remainder, annualExempt: v.annualExempt };
}
