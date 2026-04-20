/**
 * core/insurance.js — 保險計算模組
 *
 * 涵蓋：AMT（最低稅負制）、人壽保險納入遺產判斷、保單借款 vs 解約金對比。
 * 由 insurance-amt.html / insurance-estate-risk.html / insurance-loan-vs-surrender.html 提取。
 *
 * 注意：本模組為 Phase 2 初版，完整邊界條件請於 Phase 6 遷移各保險工具時補齊。
 */

/**
 * 各年度保險相關常數。新年度調整時請新增條目，舊條目永不刪除。
 * 這樣過往年度儲存的計算記錄，在未來重新開啟時仍能重現原始數字。
 */
export const INSURANCE_VERSIONS = {
  2026: {
    lawVersion: '2026-Q1',
    amtExemption: 7_500_000,                 // 個人基本所得額扣除額 750 萬
    amtRate: 0.20,                           // 最低稅負稅率 20%
    lifeInsuranceAmtThreshold: 37_400_000,   // 所得基本稅額條例§12-I-2 保險死亡給付免稅額（財政部 112/11/23 台財稅字第 11204674390 號公告，113 年度起自 3,330 萬調為 3,740 萬；114、115 年度沿用）
    // 舊欄位：遺贈稅法§16(9) 本身**無金額上限**，是否計入遺產由「實質課稅原則」個案判斷
    //   （釋字 420、財政部 101.7.13 台財稅字第 10100107900 號函）。
    //   前版常數 33_300_000（舊 AMT 免稅額）被誤述為「遺產稅 免計上限」，已停用；
    //   若工具需要警示門檻請改用 lifeInsuranceAmtThreshold。
    lifeInsuranceEstateExclude: 37_400_000,  // 向後相容保留；語意同 lifeInsuranceAmtThreshold（非遺產稅法上限）
  },
};

export const LATEST_INSURANCE_YEAR = 2026;

/**
 * 解析年度 → 保險版本
 * @param {number} [year]
 */
function getVersion(year) {
  const y = year || LATEST_INSURANCE_YEAR;
  return INSURANCE_VERSIONS[/** @type {keyof typeof INSURANCE_VERSIONS} */ (y)] || INSURANCE_VERSIONS[LATEST_INSURANCE_YEAR];
}

// === 便利常數（以最新年度為準）===
export const AMT_EXEMPTION = INSURANCE_VERSIONS[LATEST_INSURANCE_YEAR].amtExemption;
export const AMT_RATE = INSURANCE_VERSIONS[LATEST_INSURANCE_YEAR].amtRate;
export const LIFE_INSURANCE_AMT_THRESHOLD = INSURANCE_VERSIONS[LATEST_INSURANCE_YEAR].lifeInsuranceAmtThreshold;
export const LIFE_INSURANCE_ESTATE_EXCLUDE = INSURANCE_VERSIONS[LATEST_INSURANCE_YEAR].lifeInsuranceEstateExclude;

/**
 * AMT（最低稅負制）計算
 * @param {object} p
 * @param {number} p.regularIncomeTax  一般綜所稅應納額
 * @param {number} p.insurancePayout   死亡保險給付（受益人非要保人）
 * @param {number} [p.otherAmtItems=0] 其他最低稅負項目（如海外所得）
 * @param {number} [p.year]            指定稅法年度
 */
export function calcAmt(p) {
  const { regularIncomeTax = 0, insurancePayout = 0, otherAmtItems = 0, year } = p;
  const v = getVersion(year);

  // 保險給付超過門檻部分計入基本所得
  const insuranceAmtBase = Math.max(0, insurancePayout - v.lifeInsuranceAmtThreshold);
  const amtBase = insuranceAmtBase + otherAmtItems;
  const netAmtBase = Math.max(0, amtBase - v.amtExemption);
  const amtTax = Math.round(netAmtBase * v.amtRate);

  // AMT 只補差額
  const amtPayable = Math.max(0, amtTax - regularIncomeTax);

  return {
    insuranceAmtBase,
    amtBase,
    netAmtBase,
    amtTax,
    regularIncomeTax,
    amtPayable,
    law: '所得基本稅額條例§12, §13',
  };
}

/**
 * 保險給付是否計入遺產
 *
 * 遺贈稅法§16(9)：保險金額指定受益人時免計入遺產，但實務上若「要保人=被繼承人、受益人=指定」
 * 仍可能被國稅局認定為實質課稅（如短期躉繳、高齡投保、帶病投保等 8 大特徵）。
 *
 * @param {object} p
 * @param {number} p.insuranceAmount 保險金額
 * @param {boolean} p.designatedBeneficiary 是否指定受益人
 * @param {boolean} [p.suspiciousFeatures=false] 是否具國稅局實質課稅特徵
 * @param {number} [p.year] 指定稅法年度
 */
export function analyzeInsuranceEstateRisk(p) {
  const { insuranceAmount = 0, designatedBeneficiary = false, suspiciousFeatures = false, year } = p;
  // year reserved for future use when estate-exclude threshold affects logic

  if (!designatedBeneficiary) {
    return {
      includedInEstate: insuranceAmount,
      excluded: 0,
      reason: '未指定受益人，全額計入遺產',
      law: '遺贈稅法§16(9)',
    };
  }

  if (suspiciousFeatures) {
    return {
      includedInEstate: insuranceAmount,
      excluded: 0,
      reason: '具實質課稅特徵（如躉繳、高齡、帶病投保等），國稅局可能全額納入遺產',
      riskLevel: 'high',
      law: '遺贈稅法§16(9) + 實質課稅原則',
    };
  }

  // 正常情況：全額免計入遺產（但 AMT 仍適用 3,740 萬門檻）
  return {
    includedInEstate: 0,
    excluded: insuranceAmount,
    reason: '指定受益人且無實質課稅特徵，免計入遺產',
    riskLevel: 'low',
    law: '遺贈稅法§16(9)',
  };
}

/**
 * 保單借款 vs 解約金對比
 * @param {object} p
 * @param {number} p.surrenderValue 解約金
 * @param {number} p.loanRate       保單借款利率（年%）
 * @param {number} p.loanYears      借款年數
 */
export function compareLoanVsSurrender(p) {
  const { surrenderValue = 0, loanRate = 2.5, loanYears = 1 } = p;
  const loanableAmount = surrenderValue * 0.7; // 保單借款一般可借保價金 70%
  const totalInterest = loanableAmount * (loanRate / 100) * loanYears;
  const netAfterLoan = loanableAmount - totalInterest;

  return {
    surrenderValue,
    loanableAmount,
    totalInterest,
    netAfterLoan,
    // 解約一次取得 surrenderValue；保單借款則保留保單但負利息
    diff: surrenderValue - netAfterLoan,
  };
}
