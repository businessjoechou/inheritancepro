/**
 * pdf-export.js — 跨平台 PDF 匯出
 *
 * 策略：所有平台（Web / iOS / Android）統一 POST 結構化 JSON 到 /api/generate-pdf，
 *       伺服器端用 pdfkit + Noto Sans TC 產生 PDF → 確保三平台輸出完全一致。
 *
 * 舊 API（向後相容）：
 *   exportPDF(htmlString, filename)   — 舊工具繼續呼叫這個
 *   printOrExport(filename, selector) — 部分工具使用的列印/匯出
 *
 * 新 API（推薦）：
 *   exportPdfFromData({ title, subtitle, sections, meta, filename })
 */

function _isCapacitor() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/**
 * 新 API：從結構化資料產生 PDF（推薦所有新工具使用）
 *
 * @param {object} p
 * @param {string} p.title       PDF 主標題
 * @param {string} [p.subtitle]  副標題
 * @param {Array}  p.sections    結構化區塊（見 /api/generate-pdf.js 註解）
 * @param {object} [p.meta]      { taxYear, lawVersion, caseId }
 * @param {string} [p.filename]  檔名（不含 .pdf）
 */
async function exportPdfFromData({ title, subtitle, sections, meta, filename }) {
  filename = filename || title || 'InheritancePro-報告';

  try {
    const resp = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subtitle, sections, meta }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const blob = await resp.blob();
    await _deliverPdf(blob, filename);

  } catch (err) {
    console.error('PDF export error:', err);
    alert('PDF 匯出失敗：' + (err.message || err));
  }
}

/**
 * 舊 API（向後相容）：從 HTML 字串產生 PDF
 *
 * 在伺服器端 API 可用時，會嘗試解析 HTML 中的 results 並轉為結構化資料。
 * 若無法解析，則 fallback 到 window.print()。
 */
async function exportPDF(htmlString, filename) {
  filename = filename || 'InheritancePro-報告';

  // 先嘗試用 API（從 DOM 提取結構化資料）
  try {
    // 建立一個隱藏 iframe 解析 HTML
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;border:none;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(htmlString);
    iDoc.close();
    await new Promise(r => setTimeout(r, 300));

    // 從 HTML 提取文字內容
    const body = iDoc.body;
    const sections = _extractSections(body);
    document.body.removeChild(iframe);

    if (sections.length > 0) {
      // 取標題
      const titleEl = body.querySelector('.pdf-logo, h1, h2');
      const subtitleEl = body.querySelector('.pdf-header div[style*="margin-top"]');
      const title = filename.replace('InheritancePro-', '') || '計算報告';
      const subtitle = subtitleEl?.textContent?.trim() || '';

      await exportPdfFromData({ title, subtitle, sections, filename });
      return;
    }
  } catch (e) {
    console.warn('API export failed, falling back to print:', e);
  }

  // Fallback：直接用 window.print
  _printFallback(htmlString, filename);
}

/**
 * 從 HTML DOM 提取結構化 sections
 */
function _extractSections(body) {
  const sections = [];

  // Hero / summary cards
  body.querySelectorAll('.summary-card, .ip-summary-card, .result-hero').forEach(el => {
    const label = (el.querySelector('.sum-lbl, .ip-sum-lbl, .result-hero-label')?.textContent || '').trim();
    const value = (el.querySelector('.sum-val, .ip-sum-val, .result-hero-amount, [style*="font-size:28px"], [style*="font-size:22px"]')?.textContent || '').trim();
    const desc = (el.querySelector('.sum-desc, .ip-sum-desc, .result-hero-sub')?.textContent || '').trim();
    if (value) sections.push({ type: 'hero', label, value, desc });
  });

  // Alert boxes
  body.querySelectorAll('.trap-alert, .ip-trap-alert').forEach(el => {
    sections.push({
      type: 'alert',
      title: (el.querySelector('.trap-alert-title, .ip-trap-alert-title')?.textContent || '').trim(),
      body: (el.querySelector('.trap-alert-body, .ip-trap-alert-body')?.textContent || '').trim(),
    });
  });

  // Result cards with rows
  body.querySelectorAll('.result-card, [class*="compare-card"], .ip-compare-card').forEach(el => {
    const items = [];
    el.querySelectorAll('.result-row, .ip-result-row, .heir-row, .compare-row, .ip-compare-row').forEach(row => {
      const cells = row.querySelectorAll('div, span, td');
      if (cells.length >= 2) {
        items.push({
          label: cells[0]?.textContent?.trim() || '',
          value: cells[cells.length - 1]?.textContent?.trim() || '',
        });
      }
    });
    const title = (el.querySelector('.result-title, .ip-result-title, .section-title, .ip-section-title')?.textContent || '').trim();
    if (items.length > 0) {
      sections.push({ type: 'detail', title, items });
    }
  });

  // Detail cards
  body.querySelectorAll('.card, .ip-card').forEach(el => {
    // Skip if already captured as result-card
    if (el.querySelector('.result-row, .ip-result-row, .compare-row, .ip-compare-row')) return;
    const title = (el.querySelector('.section-title, .ip-section-title, .result-title')?.textContent || '').trim();
    const items = [];
    el.querySelectorAll('.heir-row, .result-row, .ip-result-row').forEach(row => {
      const label = (row.querySelector('.heir-row-label, .result-label, span:first-child')?.textContent || '').trim();
      const value = (row.querySelector('.heir-row-val, .result-value, span:last-child')?.textContent || '').trim();
      if (label && value && label !== value) items.push({ label, value });
    });
    if (items.length > 0) sections.push({ type: 'detail', title, items });
  });

  // Law notes
  body.querySelectorAll('.law-note, .ip-law-note').forEach(el => {
    sections.push({ type: 'law', text: el.textContent?.trim() || '' });
  });

  // Advantages
  body.querySelectorAll('.advantage, .ip-advantage').forEach(el => {
    const title = (el.querySelector('.adv-title, .ip-adv-title')?.textContent || '').trim();
    const amt = (el.querySelector('.adv-amt, .ip-adv-amt')?.textContent || '').trim();
    sections.push({ type: 'text', text: `${title}：${amt}` });
  });

  // Warn/info boxes
  body.querySelectorAll('.warn-box, .ip-warn-box, .info-box, .ip-info-box').forEach(el => {
    sections.push({ type: 'text', text: el.textContent?.trim() || '' });
  });

  return sections;
}

/**
 * 把 PDF blob 交付給使用者（跨平台）
 */
async function _deliverPdf(blob, filename) {
  // iOS Capacitor：用 Share plugin
  if (_isCapacitor()) {
    try {
      if (window.Capacitor?.Plugins?.Filesystem && window.Capacitor?.Plugins?.Share) {
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const result = await Filesystem.writeFile({
          path: filename + '.pdf',
          data: base64,
          directory: 'CACHE',
        });
        await Share.share({ title: filename, url: result.uri, dialogTitle: '分享 PDF 報告' });
        return;
      }
    } catch (_) { /* fall through */ }

    // Capacitor fallback：blob URL in new tab
    const url = URL.createObjectURL(blob);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html><head><title>${filename}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:20px;display:flex;flex-direction:column;align-items:center;background:#f5f0e8;font-family:-apple-system,sans-serif;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a1410;">PDF 已產生</p>
          <a href="${url}" download="${filename}.pdf"
             style="display:inline-block;padding:14px 28px;background:#1a1410;color:#f5f0e8;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">
             ⬇ 儲存 PDF
          </a>
          <iframe src="${url}" style="width:100%;height:80vh;border:none;margin-top:16px;border-radius:8px;"></iframe>
        </body></html>
      `);
      w.document.close();
      return;
    }
  }

  // Web：直接下載
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.pdf';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * window.print() fallback（最後手段）
 */
function _printFallback(htmlString, filename) {
  try {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(htmlString);
      w.document.close();
      setTimeout(() => w.print(), 600);
      return;
    }
  } catch (_) {}

  // 真的開不了 popup，把 HTML 寫入當前頁面（最後手段）
  alert('無法開啟列印視窗，請使用瀏覽器的「列印」功能（Ctrl+P / Cmd+P）來儲存 PDF。');
}

/**
 * printOrExport（部分舊工具使用）
 * 優先走 API，fallback 走 window.print
 */
async function printOrExport(filename, targetSelector) {
  filename = filename || 'InheritancePro-報告';

  const target = targetSelector ? document.querySelector(targetSelector) : document.body;
  if (!target) { alert('找不到列印內容'); return; }

  // 嘗試從頁面 DOM 提取結構化資料
  const sections = _extractSections(target);
  if (sections.length > 0) {
    const title = filename.replace('InheritancePro-', '') || '計算報告';
    try {
      await exportPdfFromData({ title, subtitle: title, sections, filename });
      return;
    } catch (e) {
      console.warn('API export failed:', e);
    }
  }

  // Fallback
  window.print();
}
