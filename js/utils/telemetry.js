/**
 * utils/telemetry.js — Lightweight error + usage telemetry via GA4
 *
 * Zero-dependency module that uses the globally available `gtag` function
 * injected by the GA4 snippet. Fails silently if GA4 is not loaded.
 *
 * Usage in tool pages:
 *   import { trackCalc, trackError } from './js/utils/telemetry.js';
 *   trackCalc('inherited-property-trap', 'public');
 *   try { result = calcXxx(...); } catch(e) { trackError('inherited-property-trap', e); }
 *
 * Or wrap a calc function:
 *   import { safeCalc } from './js/utils/telemetry.js';
 *   const result = safeCalc('tool-id', () => calcXxx(input));
 *   if (result.error) { alert('計算錯誤'); }
 */

/**
 * Send a GA4 `calc_executed` event when a calculation tool is used.
 * @param {string} toolId - Unique identifier for the tool (e.g. 'inherited-property-trap')
 * @param {string} [persona] - Which persona triggered the calc (e.g. 'public', 'lawyer')
 */
export function trackCalc(toolId, persona) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', 'calc_executed', {
        tool_id: toolId,
        persona: persona || 'unknown',
      });
    }
  } catch (_) {
    // Silently ignore — telemetry must never break the app
  }
}

/**
 * Send a GA4 `calc_error` event and log to console.
 * @param {string} toolId - Unique identifier for the tool
 * @param {Error|string} error - The error object or message
 * @param {*} [context] - Optional context (e.g. input values) for debugging
 */
export function trackError(toolId, error, context) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', 'calc_error', {
        tool_id: toolId,
        error_message: String(/** @type {any} */ (error)?.message || error).slice(0, 100),
        context: context ? JSON.stringify(context).slice(0, 200) : undefined,
      });
    }
  } catch (_) {
    // Silently ignore
  }
  // Always log to console for local debugging, wrapped in try/catch for safety
  try {
    console.error(`[IP:${toolId}]`, error);
  } catch (_) {
    // Silently ignore
  }
}

/**
 * Wrap a calculation function with automatic error tracking and NaN detection.
 *
 * Returns { result, error: null } on success, or { result: null, error } on failure.
 * Automatically sends a `calc_error` GA4 event if the function throws or if the
 * result contains NaN/null values (the most dangerous silent failure for a
 * financial calculator).
 *
 * @param {string} toolId - Unique identifier for the tool
 * @param {Function} fn - The calculation function to execute
 * @param {*} [context] - Optional context passed to trackError on failure
 * @returns {{ result: *, error: Error|null }}
 */
export function safeCalc(toolId, fn, context) {
  try {
    const result = fn();

    // Detect NaN / null lurking inside object results — these are silent killers
    // in financial calculations that can mislead users.
    if (typeof result === 'object' && result !== null) {
      try {
        const json = JSON.stringify(result);
        if (json.includes('null') || json.includes('NaN')) {
          trackError(toolId, new Error('Result contains NaN/null'), context);
        }
      } catch (_) {
        // JSON.stringify can fail on circular refs; not a calc error
      }
    } else if (typeof result === 'number' && isNaN(result)) {
      trackError(toolId, new Error('Result is NaN'), context);
    }

    return { result, error: null };
  } catch (e) {
    trackError(toolId, /** @type {Error} */ (e), context);
    return { result: null, error: /** @type {Error} */ (e) };
  }
}

/**
 * Send a GA4 `pdf_exported` event when a user exports a PDF from a tool.
 * @param {string} toolId - Unique identifier for the tool
 */
export function trackPdfExport(toolId) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', 'pdf_exported', {
        tool_id: toolId,
      });
    }
  } catch (_) {
    // Silently ignore
  }
}
