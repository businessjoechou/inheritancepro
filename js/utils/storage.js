/**
 * utils/storage.js — localStorage 封裝（JSON-safe）
 */

const PREFIX = 'ip_';

/**
 * @param {string} key
 * @param {*} [fallback=null]
 * @returns {*}
 */
export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_e) {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {*} value
 * @returns {boolean}
 */
export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * @param {string} key
 * @returns {void}
 */
export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

/**
 * @returns {void}
 */
export function clearAll() {
  /** @type {string[]} */
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
