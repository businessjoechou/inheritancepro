/**
 * core/insurance.js — 保險計算模組
 *
 * 涵蓋：AMT（最低稅負制）、人壽保險納入遺產判斷、保單借款 vs 解約金對比。
 * 由 insurance-amt.html / insurance-estate-risk.html / insurance-loan-vs-surrender.html 提取。
 *
 * 注意：本模組為 Phase 2 初版，完整邊界條件請於 Phase 6 遷移各保險工具時補齊。
 */

// === 常數（2026 年）===
export const AMT_EXEMPTION = 7_500_000; // 個人基本所得額扣除額 750 萬
export const AMT_RATE = 0.20;           // 最低稅負稅率 20%
export const LIFE_INSURANCE_AMT_THRESHOLD = 37_400_000; // 死亡給付 3,740 萬以下免計入 AMT
export const LIFE_INSURANCE_ESTATE_EXCLUDE = 33_300_000; // 遺贈稅法§16(9) 免計入遺產上限

/**
 * AMT（最低稅負制）計算
 * @param {object} p
 * @param {number} p.regularIncomeTax  一般綜所稅應納額
 * @param {number} p.insurancePayout   死亡保險給付（受益人非要保人）
 * @param {number} [p.otherAmtItems=0] 其他最低稅負項目（如海外所得）
 */
export function calcAmt(p) {
  const { regularIncomeTax = 0, insurancePayout = 0, otherAmtItems = 0 } = p;

  // 保險給付超過 3,740 萬部分計入基本所得
  const insuranceAmtBase = Math.max(0, insurancePayout - LIFE_INSURANCE_AMT_THRESHOLD);
  const amtBase = insuranceAmtBase + otherAmtItems;
  const netAmtBase = Math.max(0, amtBase - AMT_EXEMPTION);
  const amtTax = Math.round(netAmtBase * AMT_RATE);

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
 */
export function analyzeInsuranceEstateRisk(p) {
  const { insuranceAmount = 0, designatedBeneficiary = false, suspiciousFeatures = false } = p;

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
