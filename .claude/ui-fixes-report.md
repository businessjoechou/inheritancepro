# UI 快修完成報告

## 1. 字體載入優化
- 33 個 .html 檔案全部加上 `preconnect` 標籤
- 所有檔案原已有 `&display=swap`

## 2. focus-visible 樣式
- 33 個頁面全部在 `:root` 之後加入 `*:focus-visible` 規則（gold 色 2px outline）
- pitch.html 因無 CSS 變數，使用硬編碼色碼

## 3. Landing 卡片文字對比度
- `landing.html` 的 `.card-features li` 顏色從 `#5a5048` 改為 `#d4ccc0`，通過 WCAG AA

## 4. Persona 卡片語義化
- `landing.html` 三張卡片加上 `role="button"`, `tabindex="0"`, `onkeydown` 鍵盤支援

## 5. Safe-area 處理
- 24 個有 `padding-bottom: 120px` 的頁面改為 `calc(120px + env(safe-area-inset-bottom, 0px))`

## 6. Header 返回導航一致化
- 9 個缺少返回連結的頁面新增 `← 首頁`
- 15 個文字不一致的頁面統一為 `← 首頁`
- property-check 和 pricing 保留原設計
