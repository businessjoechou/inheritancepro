/**
 * animations.js — InheritancePro 共用動畫模組
 *
 * 功能：
 *   1. Count-up animation for result numbers (.ip-count-up)
 *   2. Staggered result card reveal (.ip-anim-result)
 *   3. Scroll-reveal via IntersectionObserver (.ip-reveal)
 *
 * 使用方式：
 *   <script src="js/animations.js"></script>
 *   在計算結果產出後呼叫 window.ipAnimateResults()
 *
 * 注意：
 *   - 尊重 prefers-reduced-motion
 *   - 純 vanilla JS，無外部相依
 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ────────────────────────────────────────────
   * Count-up animation
   * ──────────────────────────────────────────── */

  /**
   * easeOutExpo easing function
   */
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /**
   * Animate a single element's numeric text from 0 to its target value.
   * Supports:
   *   - Integers: "1,234,567"
   *   - Decimals: "1,234.56"
   *   - Prefixed: "NT$ 1,234,567"
   *   - Suffixed: "1,234,567 元"
   *   - Negative: "-1,234"
   *   - Percentage: "45.2%"
   *
   * @param {HTMLElement} el — must have text content with a number
   * @param {number} duration — ms (default 800)
   */
  function countUp(el, duration) {
    if (prefersReduced) return;
    duration = duration || 800;

    var text = el.textContent.trim();
    if (!text) return;

    // Extract numeric part
    var match = text.match(/(-?[\d,]+\.?\d*)/);
    if (!match) return;

    var numStr = match[1];
    var prefix = text.substring(0, text.indexOf(numStr));
    var suffix = text.substring(text.indexOf(numStr) + numStr.length);
    var target = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(target)) return;

    // Determine decimal places
    var dotIdx = numStr.indexOf('.');
    var decimals = dotIdx >= 0 ? numStr.length - dotIdx - 1 : 0;

    // Check if original uses comma formatting
    var usesComma = numStr.indexOf(',') >= 0;

    var startTime = null;

    function formatNum(val) {
      var str;
      if (decimals > 0) {
        str = val.toFixed(decimals);
      } else {
        str = Math.round(val).toString();
      }
      if (usesComma) {
        var parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        str = parts.join('.');
      }
      return str;
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = easeOutExpo(progress);
      var current = target * eased;

      el.textContent = prefix + formatNum(current) + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Ensure final value is exact
        el.textContent = prefix + numStr + suffix;
      }
    }

    // Start from 0
    el.textContent = prefix + formatNum(0) + suffix;
    requestAnimationFrame(step);
  }

  /* ────────────────────────────────────────────
   * Reveal result cards with stagger
   * ──────────────────────────────────────────── */

  /**
   * Call after dynamically inserting result HTML.
   * Finds all .ip-anim-result elements and reveals them sequentially.
   * Also triggers count-up on .ip-count-up elements within.
   *
   * @param {HTMLElement} [container] — scope (default: document)
   */
  function animateResults(container) {
    container = container || document;

    var resultEls = container.querySelectorAll('.ip-anim-result');
    var countEls = container.querySelectorAll('.ip-count-up');

    if (prefersReduced) {
      // Instantly show everything
      resultEls.forEach(function (el) {
        el.classList.add('ip-anim-visible');
      });
      return;
    }

    // Staggered reveal
    resultEls.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add('ip-anim-visible');
      }, i * 120 + 50);
    });

    // Count-up after a slight delay
    countEls.forEach(function (el, i) {
      setTimeout(function () {
        countUp(el, 800);
      }, i * 120 + 200);
    });
  }

  /* ────────────────────────────────────────────
   * Scroll reveal via IntersectionObserver
   * ──────────────────────────────────────────── */

  function initScrollReveal() {
    if (prefersReduced) {
      // Show everything immediately
      document.querySelectorAll('.ip-reveal').forEach(function (el) {
        el.classList.add('ip-visible');
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      // Fallback: show everything
      document.querySelectorAll('.ip-reveal').forEach(function (el) {
        el.classList.add('ip-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Stagger siblings
          var parent = entry.target.parentElement;
          var siblings = parent
            ? Array.from(parent.querySelectorAll(':scope > .ip-reveal'))
            : [];
          var idx = siblings.indexOf(entry.target);
          var delay = idx > 0 ? idx * 80 : 0;
          setTimeout(function () {
            entry.target.classList.add('ip-visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.ip-reveal').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ────────────────────────────────────────────
   * Auto-init on DOMContentLoaded
   * ──────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollReveal);
  } else {
    initScrollReveal();
  }

  /* ────────────────────────────────────────────
   * Public API
   * ──────────────────────────────────────────── */
  window.ipAnimateResults = animateResults;
  window.ipCountUp = countUp;

})();
