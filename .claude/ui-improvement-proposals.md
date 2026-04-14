# UI 改善構想報告

分析 7 個頁面後，共 22 項建議（9 高 / 10 中 / 7 低優先級）

---

## 高優先級（9 項）

### 1. CSS 沒有共用樣式檔
- **現狀**：每個頁面各自重複定義近百行相同 CSS（`:root` 變數、header、card、input、nav-bar 等）
- **建議**：抽出 `css/common.css`
- **影響**：全部頁面
- **難度**：中

### 2. 字體載入阻塞渲染
- **現狀**：每頁各自載入 Google Fonts，未加 `font-display=swap`、未 preconnect
- **建議**：加 preconnect + font-display=swap
- **影響**：全部頁面
- **難度**：低

### 3. Header 返回導航不一致
- **現狀**：prescription.html 和 accident.html 完全沒有返回首頁的連結；calculator.html 寫「返回」而 gift-tax.html 寫「首頁」
- **建議**：統一為「← 首頁」
- **影響**：多數工具頁
- **難度**：低

### 4. 缺少 focus-visible 樣式
- **現狀**：所有按鈕、卡片只有 hover 效果，鍵盤使用者看不到焦點位置
- **建議**：新增 `:focus-visible` 樣式
- **影響**：全部頁面
- **難度**：低

### 5. Landing 卡片文字對比度不足
- **現狀**：`.card-features li` 顏色 `#5a5048` 在深色背景上約 2.5:1 對比度，低於 WCAG AA 4.5:1
- **建議**：調整為更淺的文字色
- **影響**：landing.html
- **難度**：低

### 6. Persona 卡片沒有語義化
- **現狀**：`<div onclick>` 缺少 `role="button"` 和鍵盤支援
- **建議**：加 role="button" tabindex="0" + Enter/Space 鍵盤事件
- **影響**：landing.html
- **難度**：低

### 7. Nav bar 沒有處理 safe-area
- **現狀**：固定底部導航列寫死 `padding-bottom: 120px`，iPhone home indicator 會遮擋
- **建議**：使用 `env(safe-area-inset-bottom)`
- **影響**：全部工具頁
- **難度**：低

### 8. 金額輸入缺少千位分隔
- **現狀**：輸入 50000000 時使用者難以判讀位數
- **建議**：加入即時千位分隔顯示
- **影響**：所有有金額輸入的工具頁
- **難度**：中

### 9. 表單完全沒有即時錯誤提示
- **現狀**：輸入負數、未來日期等不合理值時無任何回饋
- **建議**：加入基本 validation feedback
- **影響**：全部工具頁
- **難度**：中

---

## 建議執行順序

- **Phase 1**：抽取共用 CSS + 字體優化（#1, #2）
- **Phase 2**：無障礙修復（#4, #5, #6）— focus-visible、對比度、ARIA
- **Phase 3**：手機體驗（#7）— safe-area、觸控目標、響應式
- **Phase 4**：表單體驗（#8, #9）— 千位分隔、錯誤提示
- **Phase 5**：細節打磨 — 動畫、列印、空狀態、導航一致性（#3）
