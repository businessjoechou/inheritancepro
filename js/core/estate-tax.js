/**
 * core/estate-tax.js — 遺產及贈與稅法 遺產稅計算
 *
 * ## 法源
 * - 條文：遺產及贈與稅法§13（稅率）、§17（扣除額）、§18（免稅額）、§16（不計入遺產總額）、§12-1（物價連動調整）
 * - 條文最後修正日：民國 110/01/20（全國法規資料庫）
 * - 級距／免稅額／扣除額之金額非載於條文本身，依§12-1 由財政部隨 CPI 每年公告
 *
 * ## 各版本採用之公告
 * - 2024 版：財政部 111 年公告（112/01/01 起適用），級距維持 5,000 萬 / 1 億
 * - 2025 版：財政部 113/11/28 公告（114/01/01 起適用），CPI 累計上漲 12.42% 觸發調整
 *
 * ## 累進稅率（2025 版，自 114/01/01 起適用）
 *   ≤ 5,621 萬              10%
 *   5,621 萬 ~ 1 億 1,242 萬  15%
 *   > 1 億 1,242 萬          20%
 *
 * 稅率與金額隨年度調整。本模組維護所有過往版本，呼叫端可透過 { year } 鎖定。
 * **新年度調整時請新增條目，舊條目永不刪除**（以便 2024 年儲存的計算記錄在 2027 年重新開啟時仍能重現原始數字）。
 */

/**
 * 2025 版常數：財政部 113/11/28「公告 114 年發生繼承或贈與案件適用遺產稅、贈與稅
 * 之免稅額、課稅級距金額、不計入遺產總額及各項扣除額之金額」，自 114/01/01 起適用。
 *
 * 觸發依據：遺贈稅§12-1 物價連動機制（累計 CPI 漲幅達 10% 觸發）；113/11 公告時
 * 累計漲幅 12.42%，所以級距/扣除額同步上調；114 年度 CPI 僅再漲 2.29%，未達
 * 10% 門檻，故 115 年發生之案件沿用 2025 版數字（見下方 ESTATE_TAX_VERSIONS）。
 *
 * @see https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=79400945835542af9a8d5d42a3001fdb
 * @see https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=b7b5105ddf0848bbaf8e7a174fb6d385
 */
const V2025 = {
  lawVersion: '2025 (財政部 113/11/28 公告)',
  appliesFrom: '2025-01-01',
  exemption:          13_330_000, // 免稅額 1,333 萬（§18，113/11/28 公告）
  deductSpouse:       5_530_000,  // 配偶扣除 553 萬（§17-I-1，113/11/28 公告）
  deductFuneral:      1_380_000,  // 喪葬費扣除 138 萬（§17-I-10，113/11/28 公告）
  deductPerChild:     560_000,    // 直系血親卑親屬每人 56 萬（§17-I-2，113/11/28 公告）
  deductPerParent:    1_380_000,  // 父母每人 138 萬（§17-I-3，113/11/28 公告）
  deductPerDisabled:  6_930_000,  // 身心障礙每人 693 萬（§17-I-4，113/11/28 公告）
  // ⚠️ 重要：insuranceExcludeMax 並非遺贈稅法明文規定的「不計入遺產總額」上限。
  //   遺贈稅§16-I-9 只規定「約定於本人死亡時給付其指定受益人之人壽保險金額」不計入遺產，
  //   本條文並無金額上限；是否計入遺產改以「實質課稅原則」個案判斷
  //   （司法院大法官釋字第 420 號、財政部 101.7.13 台財稅字第 10100107900 號函）。
  //   本欄位為「所得基本稅額條例§12-I-2 保險死亡給付免稅額」（最低稅負制 AMT），
  //   借用作為「大額保險金可能觸發 實質課稅原則」的警示門檻，非遺產稅法之嚴格規定。
  //   114 年度該免稅額自 3,330 萬調升至 3,740 萬（財政部 113/11/28 公告）。
  insuranceExcludeMax: 37_400_000, // 所得基本稅額條例§12-I-2 保險死亡給付免稅額（AMT 概念，非遺贈稅上限）
  brackets: [
    { upTo: 56_210_000,  rate: 0.10 }, // 5,621 萬以下 10%
    { upTo: 112_420_000, rate: 0.15 }, // 5,621 萬 ~ 1億1,242萬 15%
    { upTo: Infinity,    rate: 0.20 }, // 超過 1億1,242萬 20%
  ],
};

/**
 * 2022-2024 版常數：財政部 110/11/24 公告（111 年發生之繼承案件適用），
 * 112 年、113 年均經查驗 CPI 未達 10% 門檻沿用，故 2022-01-01 至 2024-12-31
 * 發生之繼承案件均適用本版。
 *
 * 觸發依據：遺贈稅§12-1，98 年基期 CPI 93.49 vs 110 年 CPI 103.86 → 漲幅 11.09%。
 *
 * @see https://www.dot.gov.tw/singlehtml/ch26?cntId=4c40feb43876418f94ac0cb8dbe4ea86
 * @see https://www.dot.gov.tw/singlehtml/ch26?cntId=fae59b5407394d3989e2db2121c59af3
 */
const V2022_2024 = {
  lawVersion: '2022-2024 (財政部 110/11/24 公告)',
  appliesFrom: '2022-01-01',
  exemption:          13_330_000, // 免稅額 1,333 萬
  deductSpouse:       4_930_000,  // 配偶扣除 493 萬
  deductFuneral:      1_230_000,  // 喪葬費扣除 123 萬
  deductPerChild:     500_000,    // 直系血親卑親屬每人 50 萬
  deductPerParent:    1_230_000,  // 父母每人 123 萬
  deductPerDisabled:  6_180_000,  // 身心障礙每人 618 萬
  insuranceExcludeMax: 33_300_000, // 見 V2025 同名欄位說明：此為 AMT 借用門檻，非遺贈稅硬性上限；2022-2023 年 AMT 免稅額為 3,330 萬
  brackets: [
    { upTo: 50_000_000,  rate: 0.10 }, // 5,000 萬以下 10%
    { upTo: 100_000_000, rate: 0.15 }, // 5,000 萬 ~ 1 億 15%
    { upTo: Infinity,    rate: 0.20 }, // 超過 1 億 20%
  ],
};

/**
 * 各年度稅法常數。新年度調整時請新增條目，舊條目永不刪除（以便重現舊案件）。
 *
 * 目前尚未支援 2021/12/31 以前發生之案件（1,200 萬免稅額版本，財政部 97 年公告）；
 * 如需支援請先以全國法規資料庫 + 財政部公告查證確切金額後再新增條目，不得憑記憶填入。
 */
export const ESTATE_TAX_VERSIONS = {
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
  const dChildren = Math.max(0, childrenCount) * v.deductPerChild;
  const dParents  = Math.max(0, parentsCount) * v.deductPerParent;
  const dDisabled = Math.max(0, disabledCount) * v.deductPerDisabled;

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
