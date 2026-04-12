/**
 * core/record.js — 統一計算記錄 schema
 *
 * 所有工具把計算結果儲存到 Supabase 前都應透過這裡，
 * 以確保未來 B2B 事務所案件管理的一致性。
 *
 * 欄位設計：
 *  · schemaVersion   — 讓舊記錄可被未來版本解析
 *  · toolId          — 工具代號（如 'inherited-property-trap'）
 *  · persona         — 使用者身分（不作付費區分，僅為個人化）
 *  · input           — 原始輸入（供重現計算）
 *  · result          — 計算結果（可為任意 JSON）
 *  · taxYear         — 套用的稅法年度（2027 年調整稅率後，舊記錄可鎖定 2026）
 *  · lawVersion      — 法條版本字串（如 '2026-Q1'）
 *  · meta            — 事務所案件 metadata（caseId, clientName, advisor）
 *  · createdAt       — ISO 時間戳
 */

export const SCHEMA_VERSION = 1;

/**
 * 建立計算記錄
 * @param {object} p
 * @param {string} p.toolId               工具代號
 * @param {string} [p.persona='public']   身分
 * @param {object} p.input                 原始輸入
 * @param {object} p.result                計算結果
 * @param {number} [p.taxYear]             稅法年度（未提供則預設為今年）
 * @param {string} [p.lawVersion]          法條版本
 * @param {object} [p.meta]                事務所案件 metadata
 * @returns {object}
 */
export function createCalcRecord({
  toolId,
  persona = 'public',
  input,
  result,
  taxYear,
  lawVersion,
  meta,
}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    toolId,
    persona,
    input: typeof structuredClone === 'function' ? structuredClone(input) : JSON.parse(JSON.stringify(input)),
    result: typeof structuredClone === 'function' ? structuredClone(result) : JSON.parse(JSON.stringify(result)),
    taxYear: taxYear ?? new Date().getFullYear(),
    lawVersion: lawVersion || `${new Date().getFullYear()}-Q1`,
    meta: meta || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 從 localStorage 讀取暫存記錄
 * @param {string} key
 * @returns {*}
 */
export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(`ip_draft_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

/**
 * 暫存記錄到 localStorage（供工具頁重新整理後還原）
 * @param {string} key
 * @param {object} record
 * @returns {boolean}
 */
export function saveDraft(key, record) {
  try {
    localStorage.setItem(`ip_draft_${key}`, JSON.stringify(record));
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * 更新案件 metadata（事務所案件管理用）
 * @param {object} record
 * @param {object} meta
 * @returns {object}
 */
export function attachCaseMeta(record, meta) {
  return { ...record, meta: { ...record.meta, ...meta } };
}
