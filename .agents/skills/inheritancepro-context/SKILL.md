---
name: inheritancepro-context
description: >
  InheritancePro 專案的完整上下文備忘錄。每當在此專案工作時應自動載入，
  包含所有頁面檔案清單、Persona 系統、CSS class 規範、JS 架構、index.html
  資料結構，以及尚未完成的功能計畫。凡涉及新增頁面、修改 persona 邏輯、
  調整 index.html TABS、或新增工具功能時，必須先讀取本 skill。
---

# InheritancePro — 專案上下文

**網址**：https://inheritancepro.app
**Git remote**：`origin main`
**根目錄**：`/Users/chouchunyeh/Desktop/台灣民法財產權計算機/`
**Tech stack**：純 HTML + Vanilla JS + CSS，Supabase（auth + DB），無 framework

---

## 頁面清單

### 系統頁（不收錄於 sitemap）
| 檔案 | 用途 |
|------|------|
| `landing.html` | Persona 選擇頁，有 `noindex`，三張卡片 |
| `login.html` | Supabase 登入，有 `noindex` |
| `account.html` | 用戶帳號，有 `noindex` |
| `index.html` | 首頁，動態 tabs + tool cards，依 persona 差異化 |
| `pitch.html` | 內部簡報頁，不公開 |
| `property-check.html` | robots.txt 封鎖 |

### 工具頁（sitemap 已收錄）
| 檔案 | 功能 | Tab |
|------|------|-----|
| `calculator.html` | 遺產繼承計算器（主力工具，最複雜） | 繼承 |
| `inheritance-timeline.html` | 繼承流程時間軸，法定期限倒數 | 繼承 |
| `deadline-dashboard.html` | 多案件期限管理儀表板（localStorage） | 繼承 |
| `caregiver.html` | 照顧者特別貢獻試算（§1149） | 繼承 |
| `gift-tax.html` | 贈與稅試算（244萬免稅額、分年規劃） | 繼承 |
| `property-sale-tax.html` | 房地合一稅試算（繼承後出售） | 繼承 |
| `real-estate.html` | 不動產繼承稅務試算（獨立版） | 繼承 |
| `stock-inheritance.html` | 股票繼承估算（上市/未上市） | 繼承 |
| `property-split.html` | 剩餘財產差額分配請求權（§1030-1） | 離婚 |
| `alimony.html` | 贍養費試算（§1057） | 離婚 |
| `asset-detection.html` | 脫產偵測分析，CSV 上傳 | 調查．賠償．時效 |
| `minor-damages.html` | 未成年損害賠償試算 | 調查．賠償．時效 |
| `accident.html` | 車禍損害賠償分析 | 調查．賠償．時效 |
| `prescription.html` | 消滅時效計算機（§125-127、§197） | 調查．賠償．時效 |

---

## Persona 系統

### localStorage key
```
ip_persona = 'public' | 'accountant' | 'lawyer'
```

### 顯示名稱（待改為以下 — 尚未實作）
| 值 | 舊名稱 | **新名稱（待改）** |
|----|--------|-------------------|
| `public` | 一般民眾 | **一般** |
| `accountant` | 會計師 | **進階稅務功能** |
| `lawyer` | 律師 | **進階法律功能** |

> ⚠️ landing.html、index.html PERSONAS config 的顯示名稱**尚未更新**。

### CSS class 規範（`js/persona.js` 控制）
| Class | 可見對象 |
|-------|---------|
| `.pro-only` | accountant + lawyer（公眾隱藏） |
| `.accountant-only` | 僅 accountant |
| `.lawyer-only` | 僅 lawyer |
| `.public-only` | 僅 public |

### persona.js 運作方式
- 放在 `<head>` 的 `<link>` 後、`<style>` 前
- 立即注入 `<style>` tag 隱藏不該顯示的 class（防止 FOUC）
- 設定 `window.IP_PERSONA` 供 JS 動態邏輯使用

---

## JS 架構

### `/js/` 目錄
| 檔案 | 功能 |
|------|------|
| `persona.js` | Persona 可見性控制，所有工具頁都已引入 |
| `save.js` | `saveCalculation()` — 儲存至 Supabase，自動注入 `_persona` 欄位 |
| `auth.js` | Supabase client export |
| `auth-bar.js` | 頁面頂部登入狀態列（module，頁尾引入） |
| `supabase-config.js` | `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` |

### 共用頁尾模式（每個工具頁底部）
```html
<div class="disclaimer-bar">...</div>
<script src="js/supabase-config.js"></script>
<script type="module" src="js/auth-bar.js"></script>
```

---

## index.html 結構

### PERSONAS config
```js
const PERSONAS = {
  public:     { name: '民眾版', emoji: '🏠', cls: 'public', sub: '...' },
  accountant: { name: '會計師版', emoji: '📊', cls: 'accountant', sub: '...' },
  lawyer:     { name: '律師版', emoji: '⚖️', cls: 'lawyer', sub: '...' },
};
```
> 待改名：`'民眾版'` → `'一般'`，`'會計師版'` → `'進階稅務'`，`'律師版'` → `'進階法律'`

### TABS 資料結構
```js
const TABS = [
  {
    id: 'inheritance',
    label: { public: '繼承', accountant: '繼承申報', lawyer: '繼承' },
    tools: [
      { href: 'xxx.html', name: '工具名稱', featured: true,
        desc: {
          public: '...', accountant: '...', lawyer: '...',
          // 或統一用 all: '...'
        }
      },
    ]
  },
  { id: 'divorce', label: { all: '離婚' }, tools: [...] },
  { id: 'litigation', label: { all: '調查．賠償．時效' }, tools: [...] },
];
```

新增工具頁時，在對應 tab 的 `tools` 陣列加入物件即可。

### Persona bar HTML
```html
<div class="persona-bar">
  <div class="persona-badge" id="personaBadge"></div>
  <button class="persona-switch" onclick="localStorage.removeItem('ip_persona');window.location.href='landing.html'">切換身份</button>
</div>
```

---

## 新頁面標準 Head 模板

```html
<meta name="robots" content="index, follow">
<meta name="author" content="InheritancePro">
<meta property="og:title" content="xxx｜InheritancePro">
<meta property="og:description" content="xxx">
<meta property="og:type" content="website">
<meta property="og:url" content="https://inheritancepro.app/xxx.html">
<meta property="og:site_name" content="InheritancePro">
<meta property="og:locale" content="zh_TW">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="xxx｜InheritancePro">
<link rel="canonical" href="https://inheritancepro.app/xxx.html">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=DM+Mono:wght@400;500&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet">
<script src="js/persona.js"></script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"xxx","url":"https://inheritancepro.app/xxx.html","applicationCategory":"LegalService","operatingSystem":"Web","inLanguage":"zh-TW","offers":{"@type":"Offer","price":"0","priceCurrency":"TWD"},"publisher":{"@type":"Organization","name":"InheritancePro","url":"https://inheritancepro.app"}}
</script>
```
新頁面加入 sitemap.xml 時優先度建議 `0.7`。

---

## CSS 設計語言

### 顏色變數（所有頁面通用）
```css
:root {
  --ink: #1a1410;      /* 主文字、背景深色 */
  --paper: #f5f0e8;    /* 頁面底色 */
  --accent: #8b2020;   /* 強調紅 */
  --gold: #c4932a;     /* 金色，logo 及重要數字 */
  --soft: #e8e0d0;     /* 淡底色 */
  --muted: #7a6f62;    /* 輔助文字 */
  --success: #2a6b4a;  /* 綠色 */
  --border: #c8bfb0;   /* 邊框 */
}
```

### 律師備忘卡樣式
```html
<div class="lawyer-only" style="background:#eef3fa;border:1.5px solid #3a5a80;border-radius:12px;padding:16px 20px;margin-top:16px">
  <div style="font-size:12px;font-weight:700;color:#1a3a5c;...">⚖ 律師訴訟策略備忘</div>
  <div style="font-size:12px;color:#1a2a3a;line-height:1.9">...</div>
</div>
```

### 會計師備忘卡樣式
```html
<div class="accountant-only" style="background:#eef8f2;border:1.5px solid #2a6b4a;border-radius:12px;padding:16px 20px;margin-top:16px">
  <div style="font-size:12px;font-weight:700;color:#2a6b4a;...">📊 會計師備忘</div>
  <div style="font-size:12px;color:#1a3a28;line-height:1.9">...</div>
</div>
```

---

## 待完成功能（下一批）

### Persona 名稱更名
- `landing.html`：三張卡片文字更新
- `index.html`：PERSONAS config 名稱更新

### 新工具頁（6個）
**進階稅務（accountant）：**
1. `case-manager.html` — 客戶案件管理（localStorage CRM）
2. `estate-tax-detail.html` — 遺產稅精算模組（完整扣除額）
3. `gift-planner.html` — 贈與規劃模擬器（最優分年方案）

**進階法律（lawyer）：**
4. `litigation-strength.html` — 訴訟強度評估
5. `settlement-calc.html` — 和解金額試算
6. `forced-share.html` — 特留分侵害試算

新增後需更新：
- `index.html` TABS（加入新工具，設定 accountant/lawyer desc）
- `sitemap.xml`（加入新頁面）
