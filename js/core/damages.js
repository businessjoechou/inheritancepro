/**
 * core/damages.js — 民法侵權行為損害賠償模型（§184, §193, §194, §195, §197）
 *
 * 從 accident.html / minor-damages.html / infidelity-damages.html 提取。
 * 核心：過失比例、強制險抵扣、精神慰撫金區間、時效（§197 2 年 / 10 年）。
 * 日期字串統一走 parseDateTW（Asia/Taipei +08:00），避免跨時區差一天 bug。
 */

import { parseDateTW } from '../utils/dates-tw.js';

// === 精神慰撫金區間（法院判決實務約略值） ===
// 法源：民法§194（死亡慰撫金請求）、§195（身體健康名譽等人格權慰撫金）。
// 區間數字**非法條明文**，為我國法院實務判例之經驗值範圍，法院審酌因素包括：
// 加害人與被害人雙方之經濟能力、社會地位、加害情節、被害人痛苦程度等
// （最高法院 51 年台上字第 223 號、75 年台上字第 2403 號、96 年台上字第 513 號判例要旨）。
// 使用者應以本區間作為初步參考，個案之實際判決金額可能顯著偏離此範圍。
export const SOLATIUM_INJURY = {
  light:   { low: 100_000,   high: 500_000,   mid: 200_000   },
  serious: { low: 500_000,   high: 2_000_000, mid: 1_000_000 },
  severe:  { low: 1_500_000, high: 3_000_000, mid: 2_000_000 },
};

export const SOLATIUM_DEATH = {
  low:  { low: 1_000_000, high: 2_500_000, mid: 1_500_000 },
  mid:  { low: 1_000_000, high: 2_500_000, mid: 1_750_000 },
  high: { low: 1_000_000, high: 2_500_000, mid: 2_000_000 },
};

// === 強制汽車責任保險（強制險）給付上限 ===
// 法源：強制汽車責任保險給付標準（law.moj.gov.tw PCODE=G0390067）
//   §2 傷害醫療給付上限 20 萬／§6 死亡給付／§7 合計給付金額上限
// 強制汽車責任保險法本法（PCODE=G0390060）§25 規範給付時限（10 工作日），非金額
// 預告修正：金管會 2026/2/12 預告，2026/7/1（民國115/7/1）施行
//   死亡給付 200 萬 → 300 萬；合計上限 220 萬 → 320 萬
export const COMPULSORY_INJURY_MAX = 200_000;    // §2 傷害醫療給付上限 20 萬（僅抵醫療）
export const COMPULSORY_DEATH_MAX  = 2_000_000;  // §6 死亡給付 200 萬（2026/7/1 起升 300 萬）

/**
 * 傷害案件損害賠償
 * @param {object} p
 * @param {number} p.medical   醫療費用
 * @param {number} p.careDays  看護天數
 * @param {number} p.careRate  每日看護費（元）
 * @param {number} p.workLossDays 工作損失天數
 * @param {number} p.monthlySalary  月薪
 * @param {'light'|'serious'|'severe'} p.solatiumLevel
 * @param {number} p.faultPct  對方過失比例（0-1）
 * @returns {object}
 */
export function calcInjuryDamages(p) {
  const { medical = 0, careDays = 0, careRate = 2400, workLossDays = 0,
          monthlySalary = 0, solatiumLevel = 'light', faultPct = 1 } = p;

  const safeFault = Math.max(0, Math.min(1, faultPct));
  const safeLevel = SOLATIUM_INJURY[solatiumLevel] ? solatiumLevel : 'light';

  const careTotal = careDays * careRate;
  const workLoss = (monthlySalary / 30) * workLossDays;
  const solatium = SOLATIUM_INJURY[safeLevel].mid;
  const subtotal = medical + careTotal + workLoss + solatium;

  // 強制險：僅抵醫療費用
  const insuranceOffset = Math.min(COMPULSORY_INJURY_MAX, medical);
  const netAmount = Math.max(0, (subtotal - insuranceOffset) * safeFault);

  return {
    items: {
      medical,
      care: careTotal,
      workLoss,
      solatium,
    },
    subtotal,
    insuranceOffset,
    faultPct,
    netAmount,
    law: '民法§184, §193, §195, §197；強制汽車責任保險給付標準§2（傷害醫療給付 20 萬）',
  };
}

/**
 * 死亡案件損害賠償
 * @param {object} p
 * @param {number} [p.funeral=0]        喪葬費用
 * @param {number} [p.dependentCount=0] 扶養人數
 * @param {number} [p.dependentYears=0] 扶養年數
 * @param {number} [p.monthlySalary=0]  月薪
 * @param {'low'|'mid'|'high'} [p.solatiumLevel='mid']
 * @param {number} [p.faultPct=1]       過失比例（0-1）
 * @returns {object}
 */
export function calcDeathDamages(p) {
  const { funeral = 0, dependentCount = 0, dependentYears = 0,
          monthlySalary = 0, solatiumLevel = 'mid', faultPct = 1 } = p;

  const safeFault = Math.max(0, Math.min(1, faultPct));
  const safeLevel = SOLATIUM_DEATH[solatiumLevel] ? solatiumLevel : 'mid';

  const maintenance = monthlySalary * 12 * dependentYears * dependentCount;
  const solatium = SOLATIUM_DEATH[safeLevel].mid;
  const subtotal = funeral + maintenance + solatium;

  const faultShare = subtotal * safeFault;
  // 死亡強制險：抵全部損害
  const netAmount = Math.max(0, faultShare - COMPULSORY_DEATH_MAX);

  return {
    items: {
      funeral,
      maintenance,
      solatium,
    },
    subtotal,
    faultShare,
    insuranceOffset: COMPULSORY_DEATH_MAX,
    faultPct,
    netAmount,
    law: '民法§184, §192, §194, §197；強制汽車責任保險給付標準§6（死亡給付 200 萬，2026/7/1 起升 300 萬）',
  };
}

/**
 * §197 時效倒數（自知悉起 2 年、自行為起 10 年，取較短）
 * @param {Date|string} eventDate  侵權行為發生日
 * @param {Date|string} [knownDate] 知悉損害與加害人之日（預設 = eventDate）
 * @param {Date} [today=new Date()]
 * @returns {{daysLeft2y:number, daysLeft10y:number, hardDeadline:Date, expired:boolean, law:string}}
 */
export function calcDamageDeadline(eventDate, knownDate, today = new Date()) {
  const event = parseDateTW(eventDate);
  const known = parseDateTW(knownDate || eventDate);
  const ms = 86_400_000;

  const deadline2y = new Date(known); deadline2y.setFullYear(deadline2y.getFullYear() + 2);
  const deadline10y = new Date(event); deadline10y.setFullYear(deadline10y.getFullYear() + 10);
  const hard = deadline2y.getTime() < deadline10y.getTime() ? deadline2y : deadline10y;

  const daysLeft2y  = Math.ceil((deadline2y.getTime()  - today.getTime()) / ms);
  const daysLeft10y = Math.ceil((deadline10y.getTime() - today.getTime()) / ms);

  return {
    daysLeft2y,
    daysLeft10y,
    hardDeadline: hard,
    expired: today.getTime() > hard.getTime(),
    law: '民法§197',
  };
}
