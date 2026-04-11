/**
 * components/disclaimer.js — 統一免責聲明
 *
 * 大多數工具頁尾都有一行相同的免責文字。
 */

export const DEFAULT_DISCLAIMER =
  '本工具計算結果僅供參考，不構成稅務或法律意見。實際個案請諮詢地政士、會計師或稅務專業人員。';

/**
 * 產生 disclaimer HTML 字串
 * @param {string} [text] 自訂文字，否則用 DEFAULT_DISCLAIMER
 */
export function renderDisclaimer(text = DEFAULT_DISCLAIMER) {
  return `<div class="disclaimer">${text}</div>`;
}
