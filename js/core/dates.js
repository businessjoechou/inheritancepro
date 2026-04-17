/**
 * core/dates.js — 日期計算工具（時效倒數、持有年數、繼承期限）
 *
 * 所有時效計算以民法與稅法規定為準。
 * 日期字串解析統一走 parseDateTW（Asia/Taipei +08:00），避免跨時區差一天 bug。
 */

import { parseDateTW } from '../utils/dates-tw.js';

const MS_PER_DAY = 86_400_000;

/**
 * 兩日期之間的天數差（無條件捨去）
 * @param {Date|string} a
 * @param {Date|string} b
 * @returns {number}
 */
export function daysBetween(a, b) {
  const d1 = parseDateTW(a), d2 = parseDateTW(b);
  return Math.floor((d2.getTime() - d1.getTime()) / MS_PER_DAY);
}

/**
 * 兩日期之間的完整年數（如 2024-03-15 到 2026-03-14 = 1 年）
 * @param {Date|string} a
 * @param {Date|string} b
 * @returns {number}
 */
export function yearsBetween(a, b) {
  const d1 = parseDateTW(a), d2 = parseDateTW(b);
  let years = d2.getFullYear() - d1.getFullYear();
  const m = d2.getMonth() - d1.getMonth();
  if (m < 0 || (m === 0 && d2.getDate() < d1.getDate())) years--;
  return years;
}

/**
 * 加上年數後的日期
 * @param {Date|string} date
 * @param {number} years
 * @returns {Date}
 */
export function addYears(date, years) {
  const d = parseDateTW(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/**
 * 加上月數後的日期
 * @param {Date|string} date
 * @param {number} months
 * @returns {Date}
 */
export function addMonths(date, months) {
  const d = parseDateTW(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * 時效倒數計算
 * @param {Date|string} fromDate  起算日（如事故日、知悉日、請求權發生日）
 * @param {number} limitYears    時效年數（2/5/10/15 等）
 * @param {Date} [today=new Date()]
 * @returns {{deadline:Date, daysLeft:number, expired:boolean}}
 */
export function calcStatuteOfLimitations(fromDate, limitYears, today = new Date()) {
  const deadline = addYears(fromDate, limitYears);
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / MS_PER_DAY);
  return {
    deadline,
    daysLeft,
    expired: daysLeft <= 0,
  };
}

/**
 * 持有年數計算（房地合一稅用）
 * 依所§4-5，繼承取得不動產者可併計被繼承人持有期間。
 *
 * @param {Date|string} acquiredDate
 * @param {Date|string} [saleDate] 出售日期（預設今天）
 * @param {Date|string} [deceasedAcquiredDate] 被繼承人取得日（若併計）
 * @returns {number | {ownerYears: number, combinedYears: number}}
 */
export function calcHoldingYears(acquiredDate, saleDate, deceasedAcquiredDate) {
  const sale = saleDate ? parseDateTW(saleDate) : new Date();
  const ownerYears = yearsBetween(acquiredDate, sale);
  if (!deceasedAcquiredDate) return ownerYears;
  const combinedYears = yearsBetween(deceasedAcquiredDate, sale);
  return { ownerYears, combinedYears };
}

/**
 * 繼承相關法定期限
 * @param {Date|string} deathDate  被繼承人死亡日
 * @returns {Record<string, {label: string, deadline: Date, law: string}>} 所有重要期限
 */
export function getInheritanceDeadlines(deathDate) {
  const d = parseDateTW(deathDate);
  return {
    renounce:        { label: '拋棄繼承', deadline: addMonths(d, 3),  law: '民法§1174' },
    limitedAccept:   { label: '限定繼承',  deadline: addMonths(d, 3),  law: '民法§1156' },
    estateTaxReport: { label: '遺產稅申報', deadline: addMonths(d, 6),  law: '遺產及贈與稅法§23' },
    incomeTaxReport: { label: '綜合所得稅', deadline: addMonths(d, 3),  law: '所得稅法§71-1' },
  };
}

/**
 * 格式化日期為 zh-TW 字串
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  return parseDateTW(date).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
