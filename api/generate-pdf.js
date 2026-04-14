/**
 * Vercel Serverless Function: /api/generate-pdf
 *
 * 接收結構化計算結果 JSON，在伺服器端用 pdfkit 產生 PDF。
 * 所有平台（iOS/Android/Web）都 POST 到這裡，確保輸出一致。
 *
 * 字體：Noto Sans TC 從 Google Fonts GitHub 倉庫下載，冷啟動時載入一次，
 *       後續請求重用（Vercel Function 在暖啟動時保留全域變數）。
 *
 * POST /api/generate-pdf
 * Body: {
 *   title: string,
 *   subtitle: string,
 *   sections: Section[],
 *   meta?: { taxYear?, lawVersion?, caseId? }
 * }
 *
 * Section types:
 *   { type: 'hero',   label, value, desc? }
 *   { type: 'alert',  title, body }
 *   { type: 'table',  headers: string[], rows: string[][] }
 *   { type: 'compare', leftLabel, rightLabel, rows: {label,left,right}[], diff?: {label,value} }
 *   { type: 'detail', title, items: {label,value}[] }
 *   { type: 'law',    text }
 *   { type: 'text',   text }
 */

import PDFDocument from 'pdfkit';

// === 顏色 ===
const C = {
  ink:     '#1a1410',
  paper:   '#f5f0e8',
  gold:    '#c4932a',
  accent:  '#8b2020',
  success: '#2a6b4a',
  muted:   '#7a6f62',
  border:  '#c8bfb0',
  soft:    '#e8e0d0',
  white:   '#ffffff',
};

// === 字體快取 ===
let fontBuffer = null;

async function loadFont() {
  if (fontBuffer) return fontBuffer;
  const url = 'https://github.com/google/fonts/raw/refs/heads/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Font download failed: ${resp.status}`);
  fontBuffer = Buffer.from(await resp.arrayBuffer());
  return fontBuffer;
}

// === PDF 繪製工具 ===
function drawHero(doc, section, pageW) {
  const boxX = doc.x;
  const boxW = pageW - 100;
  const startY = doc.y;

  // 深色背景
  doc.save();
  doc.roundedRect(boxX, startY, boxW, 80, 8).fill(C.ink);
  doc.fillColor('#ffffff').fontSize(9).font('NotoSansTC')
     .text(section.label || '', boxX + 20, startY + 14, { width: boxW - 40 });
  doc.fillColor(C.gold).fontSize(22).font('NotoSansTC')
     .text(section.value || '', boxX + 20, startY + 30, { width: boxW - 40 });
  if (section.desc) {
    doc.fillColor('#b0a89a').fontSize(9).font('NotoSansTC')
       .text(section.desc, boxX + 20, startY + 56, { width: boxW - 40 });
  }
  doc.restore();
  doc.y = startY + 90;
}

function drawAlert(doc, section, pageW) {
  const boxW = pageW - 100;
  const startY = doc.y;
  doc.save();
  doc.roundedRect(doc.x, startY, boxW, 60, 8).fill('#8b1a1a');
  doc.fillColor('#ffd6cc').fontSize(11).font('NotoSansTC')
     .text(section.title || '⚠ 警示', doc.x + 16, startY + 12, { width: boxW - 32 });
  doc.fillColor('#ffffff').fontSize(9).font('NotoSansTC')
     .text(section.body || '', doc.x + 16, startY + 28, { width: boxW - 32 });
  doc.restore();
  doc.y = startY + 68;
}

function drawCompare(doc, section, pageW) {
  const boxW = pageW - 100;
  const colW = [boxW * 0.4, boxW * 0.3, boxW * 0.3];
  const x = doc.x;
  let y = doc.y;

  // Header
  doc.save();
  doc.rect(x, y, colW[0], 22).fill(C.ink);
  doc.rect(x + colW[0], y, colW[1], 22).fill('#5a1f1f');
  doc.rect(x + colW[0] + colW[1], y, colW[2], 22).fill('#1d4a31');
  doc.fillColor('#ffffff').fontSize(8).font('NotoSansTC');
  doc.text('項目', x + 6, y + 6, { width: colW[0] - 12 });
  doc.text(section.leftLabel || '', x + colW[0] + 6, y + 6, { width: colW[1] - 12, align: 'center' });
  doc.text(section.rightLabel || '', x + colW[0] + colW[1] + 6, y + 6, { width: colW[2] - 12, align: 'center' });
  doc.restore();
  y += 22;

  // Rows
  const rows = section.rows || [];
  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#faf8f4';
    doc.save();
    doc.rect(x, y, boxW, 18).fill(bg);
    doc.fillColor(C.muted).fontSize(8).font('NotoSansTC')
       .text(row.label || '', x + 6, y + 4, { width: colW[0] - 12 });
    doc.fillColor(C.accent).fontSize(8)
       .text(row.left || '', x + colW[0] + 6, y + 4, { width: colW[1] - 12, align: 'right' });
    doc.fillColor(C.success).fontSize(8)
       .text(row.right || '', x + colW[0] + colW[1] + 6, y + 4, { width: colW[2] - 12, align: 'right' });
    doc.restore();
    y += 18;
  });

  // Diff row
  if (section.diff) {
    doc.save();
    doc.rect(x, y, boxW, 24).fill('#f5f0e0');
    doc.fillColor(C.muted).fontSize(9).font('NotoSansTC')
       .text(section.diff.label || '差額', x + 10, y + 6);
    doc.fillColor(C.gold).fontSize(14).font('NotoSansTC')
       .text(section.diff.value || '', x + boxW / 2, y + 4, { width: boxW / 2 - 10, align: 'right' });
    doc.restore();
    y += 28;
  }

  doc.y = y + 6;
}

function drawDetail(doc, section, pageW) {
  const boxW = pageW - 100;
  const x = doc.x;
  let y = doc.y;

  // Title
  if (section.title) {
    doc.fillColor(C.muted).fontSize(8).font('NotoSansTC')
       .text(section.title.toUpperCase(), x, y);
    y += 14;
    doc.moveTo(x, y).lineTo(x + boxW, y).strokeColor(C.soft).lineWidth(0.5).stroke();
    y += 6;
  }

  (section.items || []).forEach(item => {
    doc.fillColor(C.muted).fontSize(9).font('NotoSansTC')
       .text(item.label || '', x + 4, y, { width: boxW * 0.6 - 8, continued: false });
    doc.fillColor(C.ink).fontSize(9).font('NotoSansTC')
       .text(item.value || '', x + boxW * 0.6, y, { width: boxW * 0.4 - 4, align: 'right' });
    y += 16;
    doc.moveTo(x, y - 2).lineTo(x + boxW, y - 2).strokeColor('#eeebe5').lineWidth(0.3).stroke();
  });

  doc.y = y + 6;
}

function drawLaw(doc, section, pageW) {
  const boxW = pageW - 100;
  const x = doc.x;
  const startY = doc.y;

  doc.save();
  // 金色左邊條 + 淡底色
  doc.rect(x, startY, 3, 60).fill(C.gold);
  doc.rect(x + 3, startY, boxW - 3, 60).fill('#f8f5e8');
  doc.fillColor(C.muted).fontSize(8).font('NotoSansTC')
     .text(section.text || '', x + 12, startY + 8, { width: boxW - 24 });
  doc.restore();
  doc.y = startY + 68;
}

function drawText(doc, section) {
  doc.fillColor(C.ink).fontSize(10).font('NotoSansTC')
     .text(section.text || '');
  doc.moveDown(0.5);
}

function drawTable(doc, section, pageW) {
  const boxW = pageW - 100;
  const headers = section.headers || [];
  const rows = section.rows || [];
  const colW = boxW / Math.max(headers.length, 1);
  const x = doc.x;
  let y = doc.y;

  // Header
  doc.save();
  doc.rect(x, y, boxW, 18).fill(C.ink);
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').fontSize(8).font('NotoSansTC')
       .text(h, x + i * colW + 4, y + 4, { width: colW - 8, align: 'center' });
  });
  doc.restore();
  y += 18;

  // Rows
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? '#ffffff' : '#faf8f4';
    doc.save();
    doc.rect(x, y, boxW, 16).fill(bg);
    row.forEach((cell, ci) => {
      doc.fillColor(C.ink).fontSize(8).font('NotoSansTC')
         .text(cell, x + ci * colW + 4, y + 3, { width: colW - 8, align: ci === 0 ? 'left' : 'right' });
    });
    doc.restore();
    y += 16;
  });

  doc.y = y + 8;
}

// === 主要 Handler ===
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { title, subtitle, sections, meta } = req.body;
    if (!title || !sections) {
      return res.status(400).json({ error: 'title and sections are required' });
    }

    // 載入字體
    const font = await loadFont();

    // 建立 PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    doc.registerFont('NotoSansTC', font);

    const pageW = doc.page.width;

    // === Header ===
    doc.save();
    doc.rect(0, 0, pageW, 60).fill(C.ink);
    doc.fillColor(C.gold).fontSize(18).font('NotoSansTC')
       .text('InheritancePro', 50, 18);
    doc.fillColor(C.muted).fontSize(9).font('NotoSansTC')
       .text(subtitle || '', 50, 40);

    // 右上 meta
    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
    const metaLines = [today];
    if (meta?.taxYear) metaLines.push(`稅法年度：${meta.taxYear}`);
    if (meta?.lawVersion) metaLines.push(`法條版本：${meta.lawVersion}`);
    doc.fillColor('#9a9080').fontSize(8).font('NotoSansTC')
       .text(metaLines.join('  |  '), pageW - 250, 22, { width: 200, align: 'right' });
    doc.restore();

    doc.y = 80;

    // === Title ===
    doc.fillColor(C.ink).fontSize(18).font('NotoSansTC')
       .text(title, 50, doc.y, { align: 'center', width: pageW - 100 });
    doc.moveDown(1);

    // === Sections ===
    for (const section of sections) {
      // 自動換頁（留至少 80pt）
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        doc.y = 50;
      }

      switch (section.type) {
        case 'hero':    drawHero(doc, section, pageW);    break;
        case 'alert':   drawAlert(doc, section, pageW);   break;
        case 'compare': drawCompare(doc, section, pageW); break;
        case 'detail':  drawDetail(doc, section, pageW);  break;
        case 'law':     drawLaw(doc, section, pageW);     break;
        case 'text':    drawText(doc, section);           break;
        case 'table':   drawTable(doc, section, pageW);   break;
        default: break;
      }
    }

    // === Footer ===
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor('#aaa').fontSize(7).font('NotoSansTC')
         .text(
           `© ${new Date().getFullYear()} InheritancePro · inheritancepro.choulegal.com · 本報告僅供參考，不構成法律意見`,
           50, doc.page.height - 30,
           { width: pageW - 100, align: 'center' }
         );
    }

    doc.end();

    // 收集 buffer
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });
    const pdfBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.pdf"`);
    res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF 產生失敗：' + (err.message || String(err)) });
  }
}
