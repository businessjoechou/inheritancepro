/**
 * ip-core-bridge.js — 把 core/* ESM 匯出的純函式掛到 `window.IP_CORE`
 *
 * ## 為什麼需要這層 bridge？
 * 專案內多個頁面（calculator.html、real-estate.html、stock-inheritance.html、
 * gift-tax.html、insurance-gift-tax.html、insurance-policyholder-death.html 等）
 * 的 calculate 邏輯寫在 classic IIFE `<script>` 裡，無法直接 `import`。為了避免
 * 每頁各自重抄一份 calcEstateTax / calcGiftTax（以往每次財政部公告就漂移），
 * 這層 bridge 在 ES module 入口 import core 後 pin 到 `window.IP_CORE`，讓
 * legacy IIFE 能用 `window.IP_CORE.calcEstateTax(net)` 取回 single source of truth。
 *
 * ## 使用規範
 * 1. 每頁在 `</body>` 前掛一段 `<script type="module" src="./js/ip-core-bridge.js"></script>`
 *    （或改成 inline module：`import './js/ip-core-bridge.js';`）。
 * 2. 原本的 `function calcEstateTax(net)` 本地實作要**保留為 fallback**，呼叫端改為：
 *       var tax = (window.IP_CORE && window.IP_CORE.calcEstateTax)
 *         ? window.IP_CORE.calcEstateTax(net)
 *         : calcEstateTax(net); // 本地 fallback（與 core 同為 V2025，任一皆對）
 *    module 載入完會觸發 `ip-core-ready` CustomEvent；若 legacy 程式有在 DOMContentLoaded
 *    前就算稅的需求，可監聽此 event 重算一次。
 * 3. core API 不得在此層改寫。本檔只做 **rename / pin**，不加邏輯、不 cache 結果。
 *
 * ## 下一年度升版 checklist（例：2027 要上 V2026 版本）
 * 1. 在 `core/estate-tax.js`、`core/gift-tax.js` 新增 `V2026` 物件，並把
 *    `ESTATE_TAX_VERSIONS[2027] = V2026;` / `LATEST_TAX_YEAR = 2027;`。舊常數保留。
 * 2. 本 bridge 無需改動（透明轉發）；各頁的本地 fallback 數字要同步，否則
 *    module 載入失敗的少數使用者會看到舊稅率。
 */

// Single source of truth：monorepo @choulegal/core-inheritance
// Bundle 由 scripts/build-core-bundle.mjs 從 ~/Desktop/choulegal/packages/core-inheritance/
// 編出，重生指令：`npm run build:core`。本地 js/core/ 目錄保留作 fallback 將逐步淘汰。
import {
  calcEstateTax,
  getEstateTaxRate,
  getEstateTaxBreakdown,
  calcEstateTaxFull,
  ESTATE_TAX_VERSIONS,
  ESTATE_EXEMPTION,
  LATEST_TAX_YEAR,
  calcGiftTax,
  getGiftTaxRate,
  calcGiftTaxFull,
  planGiftYears,
  GIFT_TAX_VERSIONS,
  LATEST_GIFT_YEAR,
  buildInheritanceAgreement,
} from './_generated/core-inheritance.bundle.js';

/**
 * 薄 wrapper：把 core 的 getEstateTaxRate 輸出（`"10%"`）包成各頁期望的
 * 「稅率 10% / 稅率 10%（5,621 萬以下）+ 15%（超出部分） / 稅率 10% / 15% / 20% 累進」
 * 三段式 UI 字串。年度跟著 core，不自己硬編金額。
 *
 * @param {number} netEstate
 * @param {{year?: number}} [opts]
 * @returns {string}
 */
function estateTaxRateLabel(netEstate, opts = {}) {
  const v = ESTATE_TAX_VERSIONS[opts.year || LATEST_TAX_YEAR]
        || ESTATE_TAX_VERSIONS[LATEST_TAX_YEAR];
  const brackets = v.brackets;
  // brackets[0].upTo = 第一級距上限；brackets[1].upTo = 第二級距上限
  if (netEstate <= brackets[0].upTo) return '稅率 10%';
  if (netEstate <= brackets[1].upTo) {
    const wan = Math.round(brackets[0].upTo / 10000).toLocaleString('zh-TW');
    return `稅率 10%（${wan} 萬以下）+ 15%（超出部分）`;
  }
  return '稅率 10% / 15% / 20% 累進';
}

/**
 * 薄 wrapper：給 insurance-gift-tax 用的「單純回傳百分比字串」版本
 *   0 → '0%'；level-1 → '10%'；level-2 → '15%'；最高 → '20%'
 * core 的 getGiftTaxRate 對 netAmount<=0 會回傳第一級距稅率（10%），
 * 舊頁期望 0；這裡補一個 special-case。
 *
 * @param {number} netAmount
 * @param {{year?: number}} [opts]
 * @returns {string}
 */
function giftTaxRateLabel(netAmount, opts = {}) {
  if (netAmount <= 0) return '0%';
  return getGiftTaxRate(netAmount, opts);
}

const IP_CORE = Object.freeze({
  // 遺產稅
  calcEstateTax,
  getEstateTaxRate,
  getEstateTaxBreakdown,
  calcEstateTaxFull,
  estateTaxRateLabel,
  ESTATE_TAX_VERSIONS,
  ESTATE_EXEMPTION,  // 遺產稅免稅額（依遺贈稅法§18 公告，目前 V2025 = 13,330,000）
  LATEST_TAX_YEAR,

  // 贈與稅
  calcGiftTax,
  getGiftTaxRate,
  giftTaxRateLabel,
  calcGiftTaxFull,
  planGiftYears,
  GIFT_TAX_VERSIONS,
  LATEST_GIFT_YEAR,

  // 遺產分割協議書（通用骨架）
  buildInheritanceAgreement,

  // 自我識別（讓 legacy 程式可 `if (window.IP_CORE?.version)` 偵測）
  version: '1.0.0',
});

// 掛上 window；若有人（例如 bridge 載入兩次）已掛過，沿用既有
if (typeof window !== 'undefined') {
  if (!window.IP_CORE) {
    window.IP_CORE = IP_CORE;
    // 觸發事件，讓 legacy script 可選擇性 re-render
    try {
      window.dispatchEvent(new CustomEvent('ip-core-ready', { detail: IP_CORE }));
    } catch (_) {
      // 舊瀏覽器 fallback，忽略
    }
  }
}

export default IP_CORE;
