/**
 * law-basis.js — 權益工具計算頁「本計算依據條文」widget
 *
 * Phase 3 對外 surface（北極星：法律結構化資料公司）
 *   - 顯示計算頁所依據的條文清單 + 最後修正日期
 *   - 若條文 90 天內有結構化變動 → ⚠️ 「近期異動」chip + 連結到 law.moj
 *
 * 用法（在頁面適當位置塞）：
 *   <div data-law-basis
 *        data-formula-ids="core-labor.severance.calcOldSystem,core-labor.severance.calcNewSystem"></div>
 *   <script defer src="js/law-basis.js"></script>
 *
 * 資料源 = ai-triage worker `/law-impact/by-formulas` lean endpoint。
 * 不直接打前台 Supabase（權益工具用 nayqg... 專案；law_corpus / diffs 在 brbz... 專案 = ai-triage）。
 *
 * 故意不擋 init 失敗：widget 失敗就靜默不渲染，計算頁主體不受影響。
 */

(function () {
  'use strict';

  const WORKER_BASE = 'https://choulegal-worker-ai-triage.fly.dev';
  const RECENT_DAYS = 90;
  const STYLE_ID = 'law-basis-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .law-basis { margin: 16px 0; padding: 12px 14px; border: 1px solid #e3dfd5;
        border-radius: 8px; background: #faf8f3; font-size: 14px; line-height: 1.6; color: #3c3a35; }
      .law-basis__title { font-weight: 600; margin-bottom: 6px; color: #5b5648; font-size: 13px; letter-spacing: 0.5px; }
      .law-basis__list { margin: 0; padding: 0; list-style: none; }
      .law-basis__item { padding: 3px 0; }
      .law-basis__item a { color: #5b5648; text-decoration: none; border-bottom: 1px dotted #b5ad97; }
      .law-basis__item a:hover { color: #1a1a1a; border-bottom-color: #5b5648; }
      .law-basis__date { color: #655e52; font-size: 12px; margin-left: 6px; }
      .law-basis__chip { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 10px;
        font-size: 11px; font-weight: 600; vertical-align: middle; }
      .law-basis__chip--high { background: #fce8e8; color: #a13a3a; }
      .law-basis__chip--medium { background: #fdf3dc; color: #8a6a1f; }
      .law-basis__chip--low { background: #e9efe5; color: #4d6647; }
      .law-basis__empty { color: #655e52; font-size: 12px; }
    `;
    document.head.appendChild(s);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function render(host, articles) {
    if (!articles.length) {
      // 0 articles = SEEDS 還沒 apply 到 prod（待 F1 完成）或暫時 endpoint 缺資料；
      // 隱藏 widget 避免顯示「尚未建立依據對照」的 dead UI。F1 落地後自動顯示。
      host.innerHTML = '';
      host.style.display = 'none';
      return;
    }
    const items = articles
      .map((r) => {
        const lawLabel = r.law_name ? r.law_name : r.law_code;
        const dateLabel = r.version_date
          ? `（最後修正 ${escapeHtml(r.version_date)}）`
          : '';
        const link = r.source_url
          ? `<a href="${escapeHtml(r.source_url)}" target="_blank" rel="noopener">${escapeHtml(lawLabel)} §${escapeHtml(r.article_no)}</a>`
          : `${escapeHtml(lawLabel)} §${escapeHtml(r.article_no)}`;
        const chip =
          r.recent_diff && r.recent_diff.severity
            ? `<span class="law-basis__chip law-basis__chip--${escapeHtml(r.recent_diff.severity)}">近期異動</span>`
            : '';
        return `<li class="law-basis__item">${link}<span class="law-basis__date">${dateLabel}</span>${chip}</li>`;
      })
      .join('');
    host.innerHTML = `<div class="law-basis">
      <div class="law-basis__title">本計算依據條文</div>
      <ul class="law-basis__list">${items}</ul>
    </div>`;
  }

  async function hydrate(host) {
    const idsAttr = host.getAttribute('data-formula-ids') || '';
    const formulaIds = idsAttr.split(',').map((s) => s.trim()).filter(Boolean);
    if (!formulaIds.length) return;

    const url = `${WORKER_BASE}/law-impact/by-formulas?formula_ids=${encodeURIComponent(formulaIds.join(','))}&recent_days=${RECENT_DAYS}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`worker ${res.status}`);
    const body = await res.json();
    render(host, Array.isArray(body.articles) ? body.articles : []);
  }

  function init() {
    ensureStyle();
    const hosts = document.querySelectorAll('[data-law-basis]');
    hosts.forEach((h) => {
      hydrate(h).catch(() => {
        // 靜默：widget 失敗不影響計算頁
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
