---
name: calmcart-context
description: "CalmCart (冷靜購物) 專案上下文。每當處理 CalmCart 時自動載入，避免重新 explore 專案消耗 token。"
---

# CalmCart 專案備忘錄

**路徑**: `/Users/chouchunyeh/Desktop/CalmCart/`
**產品**: 冷靜購物 — 衝動消費防治 App（強制冷靜期機制）
**Bundle ID**: `com.calmcart.app`

## 技術棧
- React Native 0.81.5 + Expo ~54
- Supabase (auth + cloud sync)
- AsyncStorage（本地儲存）
- react-native-iap（IAP）
- expo-notifications
- iOS Widget (Swift)
- EAS build

## 目錄結構
```
src/
├── screens/      (11 個畫面)
├── components/   (ItemCard)
├── utils/        (11 個模組)
└── constants/theme.js
App.js            ← 自訂導航（不用 React Navigation）
widgets/CalmCartWidget.swift
```

## 11 個畫面
Home, AddItem, ItemDetail, Stats, Goals, Account, Auth, Paywall, Onboarding, Privacy, Terms

## 11 個 utils
storage, calculator, notifications, supabase, cloudSync, pro, purchases, goals, customInvestments, weeklySummary, widgetData

## 核心功能
1. **冷靜期** — 加入商品設倒數（12–72h 免費 / 1h–7天 Pro），三狀態：cooling / resisted / decided_buy
2. **儲蓄追蹤** — 抗拒購買 = 存錢
3. **投資試算** — 0050 (10%) / 全球ETF (7%) / 定存 (2%)，年限 1/3/5/10/20
4. **目標管理** — 儲蓄目標 CRUD
5. **統計** — 抗拒率、分類、月趨勢
6. **雲端同步** — Supabase（Pro 限定）
7. **iOS Widget** — 顯示冷靜中商品數

## 變現
- 免費：10 個冷靜中商品上限
- Pro：月/年/終身 訂閱（react-native-iap）
- 兌換碼：寫死在 code 裡，終身 Pro

## Item 資料結構
```js
{ id, name, price, link, reason, cooldownHours, createdAt,
  notificationId, status, decidedAt, category, customMsg }
```

## 主題色
bg `#F6F5F0` / primary `#111` / accent `#D4552A` / cooling `#C48B00`

## 注意
- 自由入口在 `App.js`，不是標準 React Navigation
- Supabase 同步策略：雲端優先，本地 merge
- 改動 UI 前先看 `src/constants/theme.js`
