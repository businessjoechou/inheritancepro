/**
 * components/save-button.js — 統一儲存按鈕元件
 *
 * 取代 14 個工具頁各自複製的 initSaveButton()。
 *
 * 改進：
 *  1. Supabase SDK 動態 import 不阻塞 UI — 按鈕先渲染，auth 狀態背景檢查
 *  2. 未登入時也顯示按鈕（點擊後導向登入）
 *  3. 自動 localStorage 草稿暫存（重整不遺失）
 *  4. 移除 _is_pro / _persona 欄位（全面免費）
 *  5. 防重複點擊 + 成功/失敗視覺回饋
 *
 * 使用方式（在工具頁的 calculate() 結束後呼叫）：
 *
 *   <div id="save-btn-container"></div>
 *
 *   <script type="module">
 *     import { mountSaveButton } from './js/components/save-button.js';
 *     mountSaveButton({
 *       tool: 'calculator',
 *       title: '遺產計算 2026/04/12',
 *       summary: '遺產總額 NT$ 20,000,000',
 *       data: { ... },
 *       containerId: 'save-btn-container',  // 可選，預設 'save-btn-container'
 *     });
 *   </script>
 *
 * 或在 plain script 中使用全域函式：
 *
 *   initSaveButton('calculator', '遺產計算', '總額 2000 萬', { ... });
 */

const DRAFT_PREFIX = 'ip_draft_';
// localStorage 未加密，敏感資料（遺產、家庭成員）72 小時後自動過期以降低曝險
const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * 暫存計算結果到 localStorage（重整頁面後還原用）。加入 savedAt 時戳，loadDraft 會據此自動過期。
 */
function saveDraft(tool, data) {
  try {
    localStorage.setItem(DRAFT_PREFIX + tool, JSON.stringify({
      data,
      savedAt: new Date().toISOString(),
    }));
  } catch (_) {}
}

/**
 * 讀取暫存草稿；若已逾 DRAFT_TTL_MS 則視為過期並自動清除。
 */
export function loadDraft(tool) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + tool);
    if (!raw) return null;
    const wrapped = JSON.parse(raw);
    const savedMs = wrapped && wrapped.savedAt ? new Date(wrapped.savedAt).getTime() : NaN;
    if (!Number.isFinite(savedMs) || Date.now() - savedMs > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_PREFIX + tool);
      return null;
    }
    return wrapped;
  } catch (_) {
    return null;
  }
}

/**
 * 清除單一工具的暫存草稿
 */
function clearDraft(tool) {
  localStorage.removeItem(DRAFT_PREFIX + tool);
}

/**
 * 立即清除所有 ip_draft_* 草稿（登出、使用者主動離開共用電腦時用）
 * @returns {number} 清除數量
 */
export function clearAllDrafts() {
  let n = 0;
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) keys.push(k);
    }
    for (const k of keys) { localStorage.removeItem(k); n++; }
  } catch (_) {}
  return n;
}

// 也掛到 window 便於 account.html / 未登入 UI 的「立即清除」按鈕使用
if (typeof window !== 'undefined') {
  window.IP_clearAllDrafts = clearAllDrafts;
}

/**
 * 渲染儲存按鈕 + 綁定事件
 *
 * @param {object} p
 * @param {string} p.tool         工具代號
 * @param {string} p.title        紀錄標題
 * @param {string} p.summary      紀錄摘要
 * @param {object} p.data         計算結果 JSON
 * @param {string} [p.containerId='save-btn-container']
 * @param {object} [p.pdfPayload]  手動提供的 PDF sections（優先於 DOM 自動擷取）
 */
export async function mountSaveButton({ tool, title, summary, data, containerId, pdfPayload }) {
  const container = document.getElementById(containerId || 'save-btn-container');
  if (!container) return;

  // 自動暫存到 localStorage
  saveDraft(tool, { tool, title, summary, data });

  // 先渲染按鈕（不等 auth）
  container.innerHTML = `
    <button class="save-btn" id="ip-save-btn"
      style="display:block;width:100%;padding:12px;background:var(--ip-accent, #8b2020);color:#fff;border:none;border-radius:10px;font-size:14px;font-family:var(--ip-font-sans, 'Noto Sans TC', sans-serif);font-weight:500;cursor:pointer;margin-top:16px;transition:all 0.2s;">
      儲存此次結果
    </button>
  `;

  const btn = document.getElementById('ip-save-btn');

  btn.addEventListener('click', async function handleSave() {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '儲存中…';
    btn.style.opacity = '0.7';

    try {
      // 自動擷取結構化 sections（供紀錄檢視 + PDF 匯出）
      const enrichedData = { ...data };
      if (pdfPayload) {
        enrichedData._pdfPayload = pdfPayload;
      } else if (typeof window.extractPdfSections === 'function') {
        const resultContainer = document.getElementById('resultSection')
          || document.getElementById('results')
          || document.getElementById('resultContainer');
        if (resultContainer) {
          const sections = window.extractPdfSections(resultContainer);
          if (sections.length > 0) {
            enrichedData._pdfSections = sections;
            enrichedData._pdfTitle = title;
            enrichedData._pdfSubtitle = tool;
          }
        }
      }

      // 動態 import（只在使用者真的點擊時才載入 Supabase）
      const { saveCalculation } = await import('../save.js');
      const result = await saveCalculation({ tool, title, summary, data: enrichedData });

      if (result.error === '請先登入') {
        // 未登入：導向登入頁，存 redirect 資訊
        sessionStorage.setItem('save_after_login', JSON.stringify({ tool, title, summary, data: enrichedData }));
        window.location.href = 'login.html';
        return;
      }

      if (result.success) {
        btn.textContent = '✓ 已儲存';
        btn.style.background = 'var(--ip-success, #2a6b4a)';
        btn.style.opacity = '1';
        clearDraft(tool);
      } else {
        btn.textContent = '儲存失敗：' + (result.error || '未知錯誤');
        btn.style.opacity = '1';
        btn.disabled = false;
      }
    } catch (e) {
      console.error('Save error:', e);
      btn.textContent = '儲存失敗';
      btn.style.opacity = '1';
      btn.disabled = false;
    }
  });
}

/**
 * 全域函式版（向後相容舊工具的 initSaveButton 呼叫模式）
 * 舊工具用法：initSaveButton('calculator', '標題', '摘要', { data })
 */
window.initSaveButton = function(tool, title, summary, data, pdfPayload) {
  mountSaveButton({ tool, title, summary, data, pdfPayload });
};
