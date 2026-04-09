/**
 * pdf-export.js — iOS-compatible PDF export using html2canvas + jsPDF
 *
 * Usage:  exportPDF(htmlString, filename)
 *
 * On web browsers: triggers a download.
 * On Capacitor iOS: writes to temp file and opens Share sheet.
 */

/* CDN libs are loaded lazily on first call */
let _libsLoaded = false;

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function _ensureLibs() {
  if (_libsLoaded) return;
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
  _libsLoaded = true;
}

function _isCapacitor() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/**
 * Main export function.
 * @param {string} htmlString  Full HTML document string (the same one previously passed to window.open)
 * @param {string} [filename]  PDF filename without extension
 */
async function exportPDF(htmlString, filename) {
  filename = filename || 'InheritancePro-報告';

  try {
    await _ensureLibs();
  } catch (e) {
    alert('PDF 元件載入失敗，請確認網路連線後重試。');
    return;
  }

  /* --- render HTML in a hidden iframe --- */
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;border:none;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument || iframe.contentWindow.document;
  iDoc.open();
  iDoc.write(htmlString);
  iDoc.close();

  /* wait for fonts & images */
  await new Promise(r => setTimeout(r, 800));

  try {
    const body = iDoc.body;
    /* make body visible inside iframe for html2canvas */
    body.style.width = '700px';
    body.style.margin = '0 auto';
    body.style.padding = '40px';
    body.style.background = '#fff';

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 780,
      windowWidth: 800,
      logging: false
    });

    const { jsPDF } = window.jspdf;
    /* A4 dimensions in mm */
    const pageW = 210;
    const pageH = 297;
    const marginX = 10;
    const contentW = pageW - marginX * 2;
    const imgRatio = canvas.height / canvas.width;
    const totalImgH = contentW * imgRatio;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    /* split into pages if content is taller than one page */
    const usableH = pageH - 20; /* 10mm top + 10mm bottom margin */
    let srcY = 0;
    const srcW = canvas.width;
    const pxPerMM = srcW / contentW;
    let page = 0;

    while (srcY < canvas.height) {
      if (page > 0) pdf.addPage();
      const sliceH = Math.min(usableH * pxPerMM, canvas.height - srcY);

      /* create a slice canvas */
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = srcW;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, srcW, sliceH, 0, 0, srcW, sliceH);

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
      const sliceMMH = sliceH / pxPerMM;
      pdf.addImage(sliceData, 'JPEG', marginX, 10, contentW, sliceMMH);

      srcY += sliceH;
      page++;
    }

    /* --- deliver the PDF --- */
    if (_isCapacitor()) {
      await _sharePDFCapacitor(pdf, filename);
    } else {
      pdf.save(filename + '.pdf');
    }
  } catch (err) {
    console.error('PDF export error:', err);
    /* fallback: try window.print for desktop browsers */
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(htmlString);
        w.document.close();
        setTimeout(() => w.print(), 600);
        return;
      }
    } catch (_) {}
    alert('PDF 匯出失敗：' + (err.message || err));
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * For pages that use window.print() directly (no custom HTML construction).
 * On desktop browsers: calls window.print().
 * On Capacitor iOS: captures the page (or a target element) as PDF.
 * @param {string} [filename] PDF filename without extension
 * @param {string} [targetSelector] CSS selector for the element to capture (defaults to body)
 */
async function printOrExport(filename, targetSelector) {
  if (!_isCapacitor()) {
    window.print();
    return;
  }

  filename = filename || 'InheritancePro-報告';

  try {
    await _ensureLibs();
  } catch (e) {
    alert('PDF 元件載入失敗，請確認網路連線後重試。');
    return;
  }

  const target = targetSelector ? document.querySelector(targetSelector) : document.body;
  if (!target) { alert('找不到列印內容'); return; }

  /* Hide buttons during capture */
  const btns = document.querySelectorAll('.btn-print, .print-btn, .btn-secondary, .nav-bar button, .auth-bar');
  btns.forEach(b => b.style.display = 'none');

  try {
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const { jsPDF } = window.jspdf;
    const pageW = 210, pageH = 297, marginX = 10;
    const contentW = pageW - marginX * 2;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const usableH = pageH - 20;
    let srcY = 0;
    const srcW = canvas.width;
    const pxPerMM = srcW / contentW;
    let page = 0;

    while (srcY < canvas.height) {
      if (page > 0) pdf.addPage();
      const sliceH = Math.min(usableH * pxPerMM, canvas.height - srcY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = srcW;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, srcW, sliceH, 0, 0, srcW, sliceH);
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', marginX, 10, contentW, sliceH / pxPerMM);
      srcY += sliceH;
      page++;
    }

    await _sharePDFCapacitor(pdf, filename);
  } catch (err) {
    console.error('printOrExport error:', err);
    alert('PDF 匯出失敗：' + (err.message || err));
  } finally {
    btns.forEach(b => b.style.display = '');
  }
}

/**
 * On Capacitor iOS: use blob + data URI workaround for WKWebView
 */
async function _sharePDFCapacitor(pdf, filename) {
  const blob = pdf.output('blob');

  /* Try native Share plugin first (if installed) */
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share) {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const base64 = pdf.output('datauristring').split(',')[1];
      const result = await Filesystem.writeFile({
        path: filename + '.pdf',
        data: base64,
        directory: 'CACHE'
      });
      await Share.share({ title: filename, url: result.uri, dialogTitle: '分享 PDF 報告' });
      return;
    }
  } catch (_) { /* fall through */ }

  /* Fallback: open PDF in new tab via blob URL — works in WKWebView */
  const dataUri = pdf.output('datauristring');
  const newTab = window.open('', '_blank');
  if (newTab) {
    newTab.document.write(
      `<html><head><title>${filename}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
      `<body style="margin:0;padding:0;display:flex;flex-direction:column;align-items:center;background:#f5f0e8;">` +
      `<div style="padding:16px;text-align:center;font-family:-apple-system,sans-serif;">` +
      `<p style="margin:0 0 12px;font-size:15px;color:#1a1410;">PDF 已產生，請長按下方按鈕儲存</p>` +
      `<a href="${dataUri}" download="${filename}.pdf" style="display:inline-block;padding:14px 28px;background:#1a1410;color:#f5f0e8;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">⬇ 儲存 PDF</a>` +
      `</div>` +
      `<iframe src="${dataUri}" style="width:100%;flex:1;border:none;min-height:80vh;margin-top:8px;"></iframe>` +
      `</body></html>`
    );
    newTab.document.close();
  } else {
    /* Last resort: direct data URI navigation */
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = filename + '.pdf';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 1000);
  }
}
