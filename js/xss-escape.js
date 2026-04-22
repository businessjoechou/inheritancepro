/**
 * xss-escape.js — 共用 XSS 防護 helper
 *
 * 使用情境：使用者輸入的 text（如備註、姓名、物件名稱）在被嵌入 innerHTML 前必須 escape，
 * 避免 <script>、<img onerror="...">、"><svg onload> 等注入式攻擊被執行。
 *
 * 2026-04-22 第三輪稽核（破壞式使用者測試）於 asset-detection.html 發現 XSS 漏洞後建立。
 *
 * 使用方式：
 *   <script src="js/xss-escape.js"></script>
 *   <script>
 *     div.innerHTML = `姓名：${escHtml(userInput)}`;
 *   </script>
 *
 * 保守原則：
 *   - 即使確信某欄位只接受數字（如 <input type="number">），只要它的值會被塞進 innerHTML，
 *     仍建議 escape（JS 賦值可繞過 HTML5 type 限制）。
 *   - 系統產生之 label / enum 不必 escape，但保留 escape 不會造成錯誤。
 */
(function (global) {
  'use strict';

  var ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
    '/': '&#47;'
  };

  function escHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`\/]/g, function (c) { return ESCAPE_MAP[c] || c; });
  }

  // Attribute escape — 供 innerHTML 內 HTML attribute 值使用（例如 title=""）
  // 需同時處理 HTML 實體 + 移除控制字元
  function escAttr(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`\/\x00-\x1F]/g, function (c) {
      return ESCAPE_MAP[c] || ('&#' + c.charCodeAt(0) + ';');
    });
  }

  // URL escape — 供 href / src 使用，拒絕 javascript: 與 data: 協定
  function safeUrl(s) {
    if (s === null || s === undefined) return '#';
    var str = String(s).trim();
    var lower = str.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
      return '#';
    }
    return encodeURI(str);
  }

  global.escHtml = escHtml;
  global.escAttr = escAttr;
  global.safeUrl = safeUrl;
})(typeof window !== 'undefined' ? window : globalThis);
