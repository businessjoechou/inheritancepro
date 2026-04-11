/**
 * components/law-note.js — 法條備註框
 */

/**
 * @param {object} p
 * @param {string[]|string} p.laws  法條陣列或直接 HTML 字串
 * @param {string} [p.note]
 */
export function renderLawNote({ laws, note }) {
  const lawHtml = Array.isArray(laws)
    ? laws.map(l => `· ${l}`).join('<br>')
    : laws;
  return `
    <div class="ip-law-note">
      <strong>法律依據：</strong><br>
      ${lawHtml}
      ${note ? `<br><br><strong>重要提醒：</strong>${note}` : ''}
    </div>
  `;
}
