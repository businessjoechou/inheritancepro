/**
 * components/score-group.js — 評分按鈕群組
 *
 * 許多損賠類工具都有「輕微／中等／嚴重／極嚴重」選項。
 */

/**
 * @param {object} p
 * @param {{value:string, label:string}[]} p.options
 * @param {string} [p.name='score']
 * @param {string} [p.activeValue]
 */
export function renderScoreGroup({ options, name = 'score', activeValue }) {
  const buttons = options.map(o => {
    const active = o.value === activeValue ? ' is-active' : '';
    return `<button type="button" class="ip-score-btn${active}" data-group="${name}" data-value="${o.value}">${o.label}</button>`;
  }).join('');
  return `<div class="ip-score-group">${buttons}</div>`;
}

/**
 * 啟用 score-group 的點擊行為（獨立選一）
 * @param {string} containerSelector
 * @param {(value:string, name:string) => void} [onChange]
 */
export function initScoreGroups(containerSelector, onChange) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('.ip-score-btn');
    if (!btn) return;
    const group = btn.dataset.group;
    container.querySelectorAll(`.ip-score-btn[data-group="${group}"]`)
             .forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    onChange && onChange(btn.dataset.value, group);
  });
}
