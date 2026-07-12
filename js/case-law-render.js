/**
 * case-law-render.js — InheritancePro 已驗證裁判面板
 */
(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isOfficialJudicialUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' &&
        (url.hostname === 'judicial.gov.tw' || url.hostname.endsWith('.judicial.gov.tw'));
    } catch (error) {
      return false;
    }
  }

  function isVerifiedCase(caseData) {
    return caseData &&
      caseData.verified === true &&
      /^\d{4}-\d{2}-\d{2}$/.test(caseData.verifiedAt || '') &&
      caseData.sourceType === '司法院裁判書原文' &&
      isOfficialJudicialUrl(caseData.sourceUrl) &&
      typeof caseData.caseNo === 'string' &&
      typeof caseData.summary === 'string' &&
      Number.isFinite(caseData.amount) &&
      caseData.amount > 0;
  }

  function renderCaseLaw(category, amount, containerId) {
    var cases = ((window.IP_CASE_LAW || {})[category] || []).filter(isVerifiedCase);
    if (!cases.length || !amount || amount <= 0) return;

    var scored = cases.map(function (caseData) {
      var maxValue = Math.max(caseData.amount, amount);
      return {
        c: caseData,
        score: maxValue > 0 ? 1 - Math.abs(caseData.amount - amount) / maxValue : 0
      };
    }).sort(function (left, right) {
      return right.score - left.score;
    });
    var top = scored.slice(0, 3);

    var casesHtml = top.map(function (item) {
      var caseData = item.c;
      return '<div class="cl-item">' +
        '<div class="cl-case-no">' + escapeHtml(caseData.caseNo) + '</div>' +
        '<div class="cl-amount">' + escapeHtml(caseData.amountLabel) + '</div>' +
        '<div class="cl-summary">' + escapeHtml(caseData.summary) + '</div>' +
        (caseData.law ? '<div class="cl-law">' + escapeHtml(caseData.law) + '</div>' : '') +
        '<div class="cl-finality">' +
          (caseData.finality === 'confirmed-final'
            ? '終局狀態：官方原文載明不得上訴'
            : '終局狀態：尚未確認後續上訴，僅供該審裁判參考') +
        '</div>' +
        '<a class="cl-source" href="' + escapeHtml(caseData.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' +
          '司法院裁判書原文 · 查核日 ' + escapeHtml(caseData.verifiedAt) +
        '</a>' +
      '</div>';
    }).join('');

    var panelId = 'caseLawPanel_' + category;
    var panelHtml =
      '<div class="case-law-panel" id="' + panelId + '">' +
        '<button class="cl-toggle" onclick="this.parentElement.classList.toggle(\'cl-open\')">' +
          '<span class="cl-toggle-icon">▶</span>' +
          '<span>已驗證裁判參考 (' + top.length + ' 則)</span>' +
        '</button>' +
        '<div class="cl-body">' + casesHtml + '</div>' +
      '</div>';

    var target = document.getElementById(containerId);
    if (!target) return;
    var existing = document.getElementById(panelId);
    if (existing) existing.remove();
    target.insertAdjacentHTML('afterend', panelHtml);
  }

  window.IP_renderCaseLaw = renderCaseLaw;
})();
