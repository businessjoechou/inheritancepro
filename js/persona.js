/**
 * InheritancePro — Persona visibility utility
 *
 * CSS class conventions:
 *   .pro-only        → visible to accountant + lawyer, hidden from public
 *   .accountant-only → visible to accountant only
 *   .lawyer-only     → visible to lawyer only
 *   .public-only     → visible to public only
 *
 * Include in <head> — uses style injection to prevent FOUC.
 */
(function () {
  // iOS Safe Area — inject once, covers all pages that load persona.js
  const safeArea = document.createElement('style');
  safeArea.textContent = `
    :root {
      --sat: env(safe-area-inset-top, 0px);
      --sab: env(safe-area-inset-bottom, 0px);
    }
    body { padding-top: var(--sat); padding-bottom: var(--sab); }
  `;
  (document.head || document.documentElement).appendChild(safeArea);

  const p = localStorage.getItem('ip_persona') || 'public';
  window.IP_PERSONA = p;

  const hide = [];
  if (p === 'public')     hide.push('.pro-only', '.lawyer-only', '.accountant-only');
  if (p === 'accountant') hide.push('.lawyer-only', '.public-only');
  if (p === 'lawyer')     hide.push('.accountant-only', '.public-only');

  if (hide.length) {
    const style = document.createElement('style');
    style.textContent = hide.join(',') + '{display:none!important}';
    (document.head || document.documentElement).appendChild(style);
  }
})();
