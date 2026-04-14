/**
 * pdf/theme.js — PDF 主題配置
 *
 * 為未來 B2B 白標預留：讀取 CSS 變數 --brand-logo-text/--brand-logo-accent/--brand-name/--brand-url。
 * 預設為 InheritancePro 品牌。白標客戶只需在 :root 注入變數即可。
 */

/**
 * 讀取目前頁面的品牌主題（從 CSS 變數）
 * @returns {{logoText: string, logoAccent: string, name: string, url: string}}
 */
export function getBrandTheme() {
  const get = (name, fallback) => {
    if (typeof window === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    // 移除首尾的引號（CSS 字串變數會帶引號）
    return v ? v.replace(/^['"]|['"]$/g, '') : fallback;
  };

  return {
    logoText:   get('--brand-logo-text',   'Inheritance'),
    logoAccent: get('--brand-logo-accent', 'Pro'),
    name:       get('--brand-name',        'InheritancePro'),
    url:        get('--brand-url',         'inheritancepro.choulegal.com'),
  };
}

/**
 * PDF 內的顏色與字體常數（一致於主站）
 */
export const PDF_COLORS = {
  ink:     '#1a1410',
  paper:   '#f5f0e8',
  accent:  '#8b2020',
  gold:    '#c4932a',
  soft:    '#e8e0d0',
  muted:   '#7a6f62',
  success: '#2a6b4a',
  border:  '#c8bfb0',
  successBg: '#f0f8f3',
};

export const PDF_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');`;
