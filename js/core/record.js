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
 * 草稿自動過期時間（毫秒）
 * localStorage 儲存的使用者計算輸入包含敏感個人資訊（遺產金額、家庭成員、薪資等）。
 * 由於客戶端加密在無使用者密碼的情況下為安全劇場（key 必須寫死在 JS 中），
 * 改採「限時自動過期」降低暴露窗口。使用者可隨時呼叫 clearAllDrafts() 立即清除。
 */
export const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;  // 72 小時

/**
 * 深拷貝（含 structuredClone fallback）。
 * structuredClone 於 iOS Safari 15.4+、Chrome 98+、Firefox 94+ 可用；
 * 舊瀏覽器退回 JSON 序列化，但會丟失 Date / Map / Set / Blob。
 * 本模組的 input/result 目前皆為純 JSON 可序列化結構，故 fallback 可接受；
 * 若未來需要保留 Date 物件類型，請升級為 structuredClone 或專用深拷貝。
 */
function _deepClone(v) {
  if (typeof structuredClone === 'function') return structuredClone(v);
  // fallback：JSON 序列化（Date 會變字串）
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

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
    input: _deepClone(input),
    result: _deepClone(result),
    taxYear: taxYear ?? new Date().getFullYear(),
    lawVersion: lawVersion || `${new Date().getFullYear()}-Q1`,
    meta: meta || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 從 localStorage 讀取暫存記錄。超過 DRAFT_TTL_MS 自動失效並移除。
 * @param {string} key
 * @returns {*}
 */
export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(`ip_draft_${key}`);
    if (!raw) return null;
    const wrapped = JSON.parse(raw);
    if (wrapped && typeof wrapped === 'object' && wrapped.__ts) {
      if (Date.now() - wrapped.__ts > DRAFT_TTL_MS) {
        localStorage.removeItem(`ip_draft_${key}`);
        return null;
      }
      return wrapped.data;
    }
    // 舊格式（未包裝時戳）— 視為過期，清除
    localStorage.removeItem(`ip_draft_${key}`);
    return null;
  } catch (_e) {
    return null;
  }
}

/**
 * 暫存記錄到 localStorage（供工具頁重新整理後還原）。
 * 會包上時戳以支援 DRAFT_TTL_MS 自動過期。
 * @param {string} key
 * @param {object} record
 * @returns {boolean}
 */
export function saveDraft(key, record) {
  try {
    localStorage.setItem(`ip_draft_${key}`, JSON.stringify({
      __ts: Date.now(),
      data: record,
    }));
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * 立即清除「所有」ip_draft_* 草稿（登出、使用者主動清除、離開共用電腦時呼叫）
 * @returns {number} 清除數量
 */
export function clearAllDrafts() {
  let n = 0;
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ip_draft_')) keys.push(k);
    }
    for (const k of keys) { localStorage.removeItem(k); n++; }
  } catch (_e) {}
  return n;
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
