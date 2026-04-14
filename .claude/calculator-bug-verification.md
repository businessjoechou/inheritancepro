# calculator.html 繼承計算邏輯 Bug 驗證報告

日期：2026-04-08

---

## Bug 1：配偶與子女（第一順位）同為繼承時，配偶應繼分是否錯誤

### 指控內容
配偶應繼分被硬性寫死為 0.5（1/2），違反民法第 1144 條第 1 款。

### 驗證結果：**此 Bug 不存在（指控錯誤）**

### 分析

核心邏輯位於 calculator.html 第 1119-1128 行：

```javascript
else if (tier === 1) {
    // 配偶與子女均分：需考慮代位繼承的 slot 數
    const dec = state.deceased_children;
    const aliveActive = effectiveBlood - dec;
    const totalSlots = aliveActive + dec; // 每個代位繼承位算1個 slot
    const totalHeirs = totalSlots + 1; // +1 for spouse
    spouseShare = 1 / totalHeirs;
    spouseFrac = `1/${totalHeirs}`;
    bloodFrac = totalSlots / totalHeirs;
}
```

這段邏輯完全正確：
- 1 名配偶 + 2 名子女 → `totalHeirs = 2 + 1 = 3` → `spouseShare = 1/3`，每人各得 1/3
- 1 名配偶 + 3 名子女 → `totalHeirs = 3 + 1 = 4` → `spouseShare = 1/4`，每人各得 1/4
- 完全符合民法第 1144 條第 1 款「與他繼承人平均」的規定

配偶應繼分為 0.5 的邏輯（第 1129 行）僅適用於第二、三順位（`tier <= 3`，即 tier 2 父母、tier 3 兄弟姊妹），這也完全符合民法第 1144 條第 2、3 款的規定。

第 1201 行的說明文字也正確印證了此邏輯：
```
`子女（第一順位）與配偶共同繼承，按人數均分（民法第1144條第1款）。
 配偶與${effectiveBlood}名子女共${effectiveBlood + 1}人，各得 1/${effectiveBlood + 1}。`
```

### 結論
提出此 Bug 的 AI 可能只看到了第 1129 行的 `spouseShare = 0.5`，誤以為該行適用於第一順位，但實際上該行的條件是 `tier <= 3`（即 tier 2 或 tier 3），第一順位（tier 1）有獨立的 `else if (tier === 1)` 分支正確處理。

---

## Bug 2：第一順位全體拋棄繼承時的處理失效

### 指控內容
所有子女拋棄時，effectiveBlood 為 0，但 tier 沒有往下傳遞至第二順位。

### 驗證結果：**此 Bug 確實存在**

### 問題分析

**tier 的決定邏輯（第 1095-1099 行）：**

```javascript
let tier = 0;
if (state.children > 0) tier = 1;
else if (state.parents > 0) tier = 2;
else if (state.siblings > 0) tier = 3;
else if (state.grandparents > 0) tier = 4;
```

問題：tier 的判定基於 `state.children`（登記子女總人數），而非 `effectiveBlood`（扣除拋棄後的有效人數）。

**拋棄計算（第 1108-1109 行）：**

```javascript
const renounced = tierKey ? (state.renounce[tierKey] || 0) : 0;
const effectiveBlood = bloodCount - renounced;
```

**Bug 觸發情境：**
- 被繼承人有 2 名子女、2 名父母
- 2 名子女全部拋棄繼承
- 此時：`state.children = 2` → `tier = 1`
- `effectiveBlood = 2 - 2 = 0`
- 但 tier 仍然停留在 1，不會往下傳遞到父母（第二順位）

**後果：**
1. 配偶應繼分計算（第 1119-1128 行）：`totalSlots = 0`，`totalHeirs = 0 + 1 = 1`，`spouseShare = 1/1 = 1`，配偶拿走全部遺產
2. 血親繼承人分配（第 1137 行）：`tier === 1 && effectiveBlood > 0` 為 false，跳過
3. 第 1148 行：`effectiveBlood > 0` 也為 false，跳過
4. 結果：父母明明存在卻完全無法繼承，配偶獨得全部

**正確行為（依民法第 1176 條）：**
第一順位繼承人全部拋棄時，應由第二順位繼承人（父母）繼承。配偶應與父母共同繼承，配偶得 1/2，父母共得 1/2。

### 問題確切位置

- **第 1095-1099 行**：tier 判定邏輯缺乏拋棄後的重新評估
- 缺少的邏輯：在計算 effectiveBlood 後，若 effectiveBlood === 0，應自動降級到下一順位（tier 2 → tier 3 → tier 4），並重新計算 bloodCount、renounced、effectiveBlood、配偶應繼分比例

### 修復方向（僅供參考，不實際修改）

應在第 1109 行之後加入迴圈或遞迴邏輯：當 effectiveBlood === 0 且還有下一順位繼承人時，自動將 tier 往下推移，重新設定 bloodCount、bloodLabel、renounced、effectiveBlood，以及對應的配偶應繼分比例。

---

## 總結

| Bug | 狀態 | 說明 |
|-----|------|------|
| Bug 1：配偶與第一順位應繼分 | **不存在（誤報）** | 程式碼第 1119-1128 行已正確實作均分邏輯 |
| Bug 2：全體拋棄後順位傳遞 | **確實存在** | 第 1095-1099 行 tier 判定不考慮拋棄，effectiveBlood=0 時不會降級 |
