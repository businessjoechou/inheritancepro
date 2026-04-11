/**
 * components/modal.js — 簡易彈窗元件
 *
 * 不用第三方庫，純粹 DOM。需搭配 CSS（可於 components.css 未來擴充）。
 */

let currentModal = null;

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.body  支援 HTML
 * @param {Array<{label:string, onClick?:()=>void, primary?:boolean}>} [p.buttons]
 */
export function openModal({ title, body, buttons = [{ label: '關閉' }] }) {
  closeModal();

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

  const dialog = document.createElement('div');
  dialog.style.cssText = 'background:#fff;border-radius:12px;max-width:420px;width:100%;padding:24px;max-height:80vh;overflow-y:auto';
  dialog.innerHTML = `
    <h3 style="font-family:var(--ip-font-serif);font-size:18px;margin-bottom:12px">${title}</h3>
    <div style="font-size:13px;color:var(--ip-ink);line-height:1.7;margin-bottom:20px">${body}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end"></div>
  `;
  const btnRow = dialog.lastElementChild;
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.label;
    btn.style.cssText = b.primary
      ? 'padding:10px 20px;background:var(--ip-ink);color:var(--ip-paper);border:none;border-radius:8px;cursor:pointer;font-size:14px'
      : 'padding:10px 20px;background:var(--ip-paper);color:var(--ip-ink);border:1.5px solid var(--ip-border);border-radius:8px;cursor:pointer;font-size:14px';
    btn.onclick = () => { if (b.onClick) b.onClick(); closeModal(); };
    btnRow.appendChild(btn);
  });

  backdrop.appendChild(dialog);
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal();
  });

  document.body.appendChild(backdrop);
  currentModal = backdrop;
}

export function closeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
}
