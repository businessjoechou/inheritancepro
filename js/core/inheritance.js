/**
 * core/inheritance.js — 民法§1138 / §1144 / §1223 純計算模組
 *
 * 從 calculator.html 提取的繼承人順位、應繼分、特留分邏輯。
 * 不含 UI，可被任何頁面與未來旗艦工具引用。
 */

/**
 * 繼承人順位（民法§1138）：
 *   1 子女（直系血親卑親屬）
 *   2 父母
 *   3 兄弟姊妹
 *   4 祖父母
 * @param {object} state  { children, parents, siblings, grandparents }
 * @returns {number} 0 = 無血親，1-4 = 順位
 */
export function getHeirTier(state) {
  if (state.children > 0) return 1;
  if (state.parents > 0) return 2;
  if (state.siblings > 0) return 3;
  if (state.grandparents > 0) return 4;
  return 0;
}

/**
 * 配偶應繼分比例（民法§1144）
 * @param {number} tier  順位 0-4
 * @param {number} bloodSlots  血親人數（子女需另外考慮代位 slot）
 * @returns {{spouseShare:number, spouseFrac:string, bloodShareTotal:number}}
 */
export function getSpouseShare(tier, bloodSlots) {
  if (tier === 0) {
    return { spouseShare: 1, spouseFrac: '全部', bloodShareTotal: 0 };
  }
  if (tier === 1) {
    // 配偶與子女均分
    const totalHeirs = bloodSlots + 1;
    return {
      spouseShare: 1 / totalHeirs,
      spouseFrac: `1/${totalHeirs}`,
      bloodShareTotal: bloodSlots / totalHeirs,
    };
  }
  if (tier <= 3) {
    // 父母/兄弟姊妹：配偶 1/2
    return { spouseShare: 0.5, spouseFrac: '1/2', bloodShareTotal: 0.5 };
  }
  // 祖父母：配偶 2/3
  return { spouseShare: 2 / 3, spouseFrac: '2/3', bloodShareTotal: 1 / 3 };
}

/**
 * 特留分比例（民法§1223）
 *   第一順位（子女）：應繼分 ×1/2
 *   第二順位（父母）：應繼分 ×1/2
 *   第三順位（兄弟姊妹）：應繼分 ×1/3
 *   第四順位（祖父母）：應繼分 ×1/3
 *   配偶：應繼分 ×1/2
 * @param {number} tier 順位 0-4
 * @param {'spouse'|'blood'} who
 */
export function getForcedShareRate(tier, who) {
  if (who === 'spouse') return 0.5;
  if (tier <= 2) return 0.5;
  return 1 / 3;
}

/**
 * 應繼分計算（含代位繼承）
 *
 * @param {object} p
 * @param {number} p.totalEstate  遺產總額
 * @param {boolean} p.hasSpouse
 * @param {boolean} p.hasWill  有遺囑時會一併算特留分
 * @param {number} p.children
 * @param {number} p.parents
 * @param {number} p.siblings
 * @param {number} p.grandparents
 * @param {number} [p.deceasedChildren=0]  已故子女人數（會觸發代位繼承）
 * @param {number[]} [p.representatives]   每位已故子女的代位繼承人數
 * @param {{children?:number,parents?:number,siblings?:number,grandparents?:number}} [p.renounce] 拋棄人數
 * @returns {object} 各繼承人份額與法條依據
 */
export function calcStatutoryShare(p) {
  const {
    totalEstate,
    hasSpouse,
    hasWill = false,
    children = 0,
    parents = 0,
    siblings = 0,
    grandparents = 0,
    deceasedChildren = 0,
    representatives = [],
    renounce = {},
  } = p;

  const tier = getHeirTier({ children, parents, siblings, grandparents });

  const tierKey = ['', 'children', 'parents', 'siblings', 'grandparents'][tier];
  const bloodCount = tierKey === 'children' ? children
                    : tierKey === 'parents' ? parents
                    : tierKey === 'siblings' ? siblings
                    : tierKey === 'grandparents' ? grandparents
                    : 0;
  const renounced = renounce[tierKey] || 0;
  const effectiveBlood = Math.max(0, bloodCount - renounced);

  // 全數第一順位拋棄：返回警示（民法§1176）
  if (tier === 1 && effectiveBlood <= 0) {
    return {
      warning: '全數子女拋棄繼承',
      law: '民法§1176',
      heirs: [],
    };
  }

  // 子女含代位繼承的 slot 計算
  let bloodSlots = effectiveBlood;
  if (tier === 1) {
    const dec = deceasedChildren;
    const aliveActive = effectiveBlood - dec;
    bloodSlots = aliveActive + dec; // 每個代位位算 1 個 slot
  }

  const { spouseShare, spouseFrac, bloodShareTotal } = getSpouseShare(
    hasSpouse ? tier : tier, // 若無配偶則 bloodShareTotal 直接 = 1
    bloodSlots,
  );

  const spouseAmount = hasSpouse ? totalEstate * spouseShare : 0;
  const bloodPool = hasSpouse ? totalEstate * bloodShareTotal : totalEstate;

  const heirs = [];

  if (hasSpouse) {
    heirs.push({
      role: 'spouse',
      label: '配偶',
      fraction: spouseFrac,
      amount: spouseAmount,
      forcedShare: hasWill ? spouseAmount * getForcedShareRate(tier, 'spouse') : null,
    });
  }

  if (tier === 1 && effectiveBlood > 0) {
    const dec = deceasedChildren;
    const aliveActive = effectiveBlood - dec;
    const totalSlots = aliveActive + dec;
    const perSlot = totalSlots > 0 ? bloodPool / totalSlots : 0;
    for (let i = 0; i < aliveActive; i++) {
      heirs.push({
        role: 'child',
        label: `子女（第${i + 1}人）`,
        amount: perSlot,
        forcedShare: hasWill ? perSlot * getForcedShareRate(tier, 'blood') : null,
      });
    }
    for (let i = 0; i < dec; i++) {
      const repCount = representatives[i] || 1;
      const perRep = perSlot / repCount;
      for (let j = 0; j < repCount; j++) {
        heirs.push({
          role: 'representative',
          label: `孫子女（代位第${i + 1}位過世子女，第${j + 1}人）`,
          amount: perRep,
          note: '代位繼承',
          forcedShare: hasWill ? perRep * getForcedShareRate(tier, 'blood') : null,
        });
      }
    }
  } else if (effectiveBlood > 0) {
    const perBlood = bloodPool / effectiveBlood;
    const label = tier === 2 ? '父母' : tier === 3 ? '兄弟姊妹' : '祖父母';
    for (let i = 0; i < effectiveBlood; i++) {
      heirs.push({
        role: label,
        label: label + (effectiveBlood > 1 ? `（第${i + 1}人）` : ''),
        amount: perBlood,
        forcedShare: hasWill ? perBlood * getForcedShareRate(tier, 'blood') : null,
      });
    }
  }

  return {
    tier,
    heirs,
    renounced,
    law: '民法§1138, §1144, §1140' + (hasWill ? ', §1223' : ''),
  };
}
