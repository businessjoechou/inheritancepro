/**
 * core/damages.js — 民法侵權行為損害賠償模型（§184, §193, §194, §195, §197）
 *
 * 從 accident.html / minor-damages.html / infidelity-damages.html 提取。
 * 核心：過失比例、強制險抵扣、精神慰撫金區間、時效（§197 2 年 / 10 年）。
 */

// === 精神慰撫金區間（法院判決實務約略值） ===
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
export const COMPULSORY_INJURY_MAX = 200_000;    // 傷害醫療給付上限 20 萬（僅抵醫療）
export const COMPULSORY_DEATH_MAX  = 2_000_000;  // 死亡給付 200 萬（抵全部損害）

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

  const careTotal = careDays * careRate;
  const workLoss = (monthlySalary / 30) * workLossDays;
  const solatium = (SOLATIUM_INJURY[solatiumLevel] || SOLATIUM_INJURY.light).mid;
  const subtotal = medical + careTotal + workLoss + solatium;

  // 強制險：僅抵醫療費用
  const insuranceOffset = Math.min(COMPULSORY_INJURY_MAX, medical);
  const netAmount = Math.max(0, (subtotal - insuranceOffset) * faultPct);

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
    law: '民法§184, §193, §195, §197；強制汽車責任保險法§25',
  };
}

/**
 * 死亡案件損害賠償
 */
export function calcDeathDamages(p) {
  const { funeral = 0, dependentCount = 0, dependentYears = 0,
          monthlySalary = 0, solatiumLevel = 'mid', faultPct = 1 } = p;

  const maintenance = monthlySalary * 12 * dependentYears * dependentCount;
  const solatium = (SOLATIUM_DEATH[solatiumLevel] || SOLATIUM_DEATH.mid).mid;
  const subtotal = funeral + maintenance + solatium;

  const faultShare = subtotal * faultPct;
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
    law: '民法§184, §192, §194, §197；強制汽車責任保險法§25',
  };
}

/**
 * §197 時效倒數（自知悉起 2 年、自行為起 10 年，取較短）
 * @param {Date|string} eventDate  侵權行為發生日
 * @param {Date|string} [knownDate] 知悉損害與加害人之日（預設 = eventDate）
 * @param {Date} [today=new Date()]
 * @returns {{daysLeft2y:number, daysLeft10y:number, hardDeadline:Date, expired:boolean}}
 */
export function calcDamageDeadline(eventDate, knownDate, today = new Date()) {
  const event = new Date(eventDate);
  const known = new Date(knownDate || eventDate);
  const ms = 86_400_000;

  const deadline2y = new Date(known); deadline2y.setFullYear(deadline2y.getFullYear() + 2);
  const deadline10y = new Date(event); deadline10y.setFullYear(deadline10y.getFullYear() + 10);
  const hard = deadline2y < deadline10y ? deadline2y : deadline10y;

  const daysLeft2y  = Math.ceil((deadline2y  - today) / ms);
  const daysLeft10y = Math.ceil((deadline10y - today) / ms);

  return {
    daysLeft2y,
    daysLeft10y,
    hardDeadline: hard,
    expired: today > hard,
    law: '民法§197',
  };
}
