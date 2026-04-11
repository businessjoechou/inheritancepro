/**
 * components/disclaimer.js — 統一免責聲明
 */

export const DEFAULT_DISCLAIMER =
  '本工具計算結果僅供參考，不構成稅務或法律意見。實際個案請諮詢地政士、會計師或稅務專業人員。';

/**
 * @param {string} [text]
 */
export function renderDisclaimer(text = DEFAULT_DISCLAIMER) {
  return `<div class="ip-disclaimer">${text}</div>`;
}
