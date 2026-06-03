/**
 * doc-generator.js — 民眾版通用「法律文件產生器」UI 元件（各站共用，drop-in）
 *
 * 提供存證信函／協議書等文字產生器：渲染按鈕 → 開 dialog 表單（可一鍵帶入計算結果）
 * → 呼叫 build() 產文字 → 可複製／下載 .txt／列印（瀏覽器存 PDF）。
 *
 * 純文件文字協助，非法律意見；個案應視事證調整，重大爭議建議洽相關調處或執業律師。
 *
 * 用法：
 *   var gen = DocGen.create({
 *     docLabel: '存證信函',
 *     variants: [{ id:'deposit-return', label:'催告返還押金' }, ...],   // 選填，無則單一模板
 *     fields: [{ id, label, type, placeholder, hint, required, rows }],
 *     build: function (values) { return { title, subject, body, legalBasis:[], tips:[] }; },
 *     filenamePrefix: '存證信函',
 *   });
 *   gen.mountButton(containerEl, function prefill(){ return { tenantName:'', depositAmount: 8000 }; });
 *
 * build() 回傳 { title, subject, body, legalBasis?, tips? }；body 為主文（通常以「受文者：」起首）。
 */
(function () {
  'use strict';
  if (window.DocGen) return;

  var STYLE_ID = 'dg-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.dg-trigger{display:inline-flex;align-items:center;gap:8px;margin-top:18px;padding:12px 22px;',
      'background:var(--accent,#3b6db5);color:#fff;border:none;border-radius:var(--radius-sm,6px);',
      "font-family:var(--font-serif,'Noto Serif TC',serif);font-size:14px;font-weight:600;letter-spacing:.03em;",
      'cursor:pointer;transition:filter .15s,transform .1s}',
      '.dg-trigger:hover{filter:brightness(1.08)}.dg-trigger:active{transform:translateY(1px)}',
      '.dg-trigger .dg-ic{font-size:16px;line-height:1}',
      '.dg-dialog{position:fixed;inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);margin:0;',
      'width:min(680px,94vw);max-height:90vh;border:1.5px solid var(--border-2,#3a4768);',
      'border-radius:var(--radius-lg,14px);padding:0;background:var(--card,#1a2233);color:var(--paper,#eef2f8);',
      'overflow:hidden}',
      '.dg-dialog::backdrop{background:rgba(8,12,20,.62);backdrop-filter:blur(2px)}',
      '.dg-wrap{display:flex;flex-direction:column;max-height:90vh}',
      '.dg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;',
      'padding:20px 24px 14px;border-bottom:1px solid var(--border,#2a3550)}',
      ".dg-head h3{margin:0;font-family:var(--font-serif,serif);font-size:19px;color:var(--paper,#eef2f8)}",
      '.dg-head p{margin:4px 0 0;font-size:12.5px;color:var(--paper-3,rgba(238,242,248,.55))}',
      '.dg-x{flex:0 0 auto;background:none;border:none;color:var(--paper-3,#889);font-size:24px;line-height:1;',
      'cursor:pointer;padding:0 4px}.dg-x:hover{color:var(--paper,#eef)}',
      '.dg-body{padding:18px 24px;overflow-y:auto}',
      '.dg-field{margin-bottom:14px}',
      '.dg-field label{display:block;font-size:13px;font-weight:500;margin-bottom:5px;color:var(--paper-2,#dde)}',
      '.dg-field input,.dg-field select,.dg-field textarea{width:100%;padding:10px 12px;',
      'border:1.5px solid var(--border-2,#3a4768);border-radius:var(--radius-sm,6px);',
      'background:var(--ink-2,#1c2333);color:var(--paper,#eef2f8);font-family:inherit;font-size:14.5px;box-sizing:border-box}',
      '.dg-field textarea{resize:vertical;min-height:62px;line-height:1.55}',
      '.dg-field .dg-hint{font-size:11.5px;color:var(--paper-3,#889);margin-top:4px;line-height:1.5}',
      '.dg-prefill{font-size:11px;color:var(--accent-soft,#5a8cd0);margin-left:6px}',
      '.dg-actions{display:flex;flex-wrap:wrap;gap:10px;padding:14px 24px 20px;border-top:1px solid var(--border,#2a3550)}',
      '.dg-btn{padding:11px 20px;border-radius:var(--radius-sm,6px);font-family:var(--font-serif,serif);',
      'font-size:13.5px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:filter .15s}',
      '.dg-btn-primary{background:var(--gold,#c4932a);color:var(--ink,#141a24);border-color:var(--gold,#c4932a)}',
      '.dg-btn-ghost{background:transparent;color:var(--paper-2,#dde);border-color:var(--border-2,#3a4768)}',
      '.dg-btn:hover{filter:brightness(1.07)}',
      '.dg-out{margin-top:4px}',
      '.dg-letter{white-space:pre-wrap;font-family:var(--font-mono,ui-monospace,monospace);font-size:13px;',
      'line-height:1.85;background:var(--ink-3,#252e42);color:var(--paper,#eef2f8);border:1px solid var(--border,#2a3550);',
      'border-radius:var(--radius-sm,6px);padding:18px 18px;max-height:340px;overflow-y:auto}',
      '.dg-meta{margin-top:14px;font-size:12.5px;line-height:1.7;color:var(--paper-2,#dde)}',
      '.dg-meta strong{color:var(--gold-soft,#d4a742)}',
      '.dg-meta ul{margin:5px 0 0;padding-left:18px}.dg-meta li{margin-bottom:3px}',
      '.dg-disc{margin-top:14px;font-size:11.5px;color:var(--paper-3,#889);line-height:1.6;',
      'border-top:1px dashed var(--border,#2a3550);padding-top:10px}',
      '.dg-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--success,#2a6b4a);',
      'color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:99999;box-shadow:0 6px 24px rgba(0,0,0,.3)}',
      '@media print{body *{visibility:hidden}}',
    ].join('');
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function toast(msg) {
    var t = el('div', { class: 'dg-toast', text: msg });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  // 組成完整存證信函文字：受文者 / 主旨 / 說明，方便直接抄至郵局格式
  function composeLetter(doc) {
    var body = doc.body || '';
    if (doc.subject) {
      var i = body.indexOf('\n\n');
      if (i > -1 && body.slice(0, i).indexOf('受文者') > -1) {
        body = body.slice(0, i) + '\n主旨：' + doc.subject + body.slice(i);
      } else {
        body = '主旨：' + doc.subject + '\n\n' + body;
      }
    }
    return body;
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function printText(title, text) {
    var w = window.open('', '_blank', 'width=720,height=860');
    if (!w) { toast('瀏覽器擋了列印視窗'); return; }
    var safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    w.document.write(
      '<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"><title>' + title + '</title>' +
      '<style>body{font-family:"Noto Serif TC",serif;line-height:2.0;font-size:15px;padding:40px 48px;color:#111}' +
      'pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>' + safe + '</pre></body></html>'
    );
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 350);
  }

  function create(config) {
    injectStyle();
    var dialog = null;

    function buildDialog(prefill) {
      var vals = prefill || {};
      var variantSel = null;

      // 表單欄位
      var fieldEls = config.fields.map(function (f) {
        var input;
        if (f.type === 'textarea') {
          input = el('textarea', { id: 'dg-' + f.id, rows: String(f.rows || 3), placeholder: f.placeholder || '' });
        } else if (f.type === 'select') {
          input = el('select', { id: 'dg-' + f.id });
          (f.options || []).forEach(function (o) {
            input.appendChild(el('option', { value: o.value, text: o.label }));
          });
        } else {
          input = el('input', { id: 'dg-' + f.id, type: f.type || 'text', placeholder: f.placeholder || '' });
        }
        if (vals[f.id] !== undefined && vals[f.id] !== null && vals[f.id] !== '') input.value = vals[f.id];
        var labelEl = el('label', { for: 'dg-' + f.id, text: f.label });
        if (vals[f.id] !== undefined && vals[f.id] !== null && vals[f.id] !== '')
          labelEl.appendChild(el('span', { class: 'dg-prefill', text: '· 已帶入試算' }));
        var kids = [labelEl, input];
        if (f.hint) kids.push(el('div', { class: 'dg-hint', text: f.hint }));
        return el('div', { class: 'dg-field' }, kids);
      });

      // 模板選擇器（多模板時）
      if (config.variants && config.variants.length > 1) {
        variantSel = el('select', { id: 'dg-variant' });
        config.variants.forEach(function (v) { variantSel.appendChild(el('option', { value: v.id, text: v.label })); });
        if (vals.__variant) variantSel.value = vals.__variant;
        fieldEls.unshift(el('div', { class: 'dg-field' }, [
          el('label', { for: 'dg-variant', text: '文件類型' }), variantSel,
        ]));
      }

      var out = el('div', { class: 'dg-out' });
      var body = el('div', { class: 'dg-body' }, fieldEls.concat([out]));

      var genBtn = el('button', { class: 'dg-btn dg-btn-primary', type: 'button', text: '產生' + (config.docLabel || '文件') });

      function collect() {
        var o = {};
        config.fields.forEach(function (f) {
          var node = document.getElementById('dg-' + f.id);
          if (!node) return;
          o[f.id] = (f.type === 'number') ? (node.value === '' ? '' : Number(node.value)) : node.value;
        });
        if (variantSel) o.variant = variantSel.value;
        return o;
      }

      function render() {
        var doc;
        try { doc = config.build(collect()); }
        catch (err) { toast('產生失敗：' + err.message); return; }
        var letter = composeLetter(doc);

        var copyBtn = el('button', { class: 'dg-btn dg-btn-primary', type: 'button', text: '複製全文' });
        copyBtn.addEventListener('click', function () {
          navigator.clipboard.writeText(letter).then(function () { toast('已複製，可貼到 Word／郵局存證信函用紙'); },
            function () { toast('複製失敗，請手動選取'); });
        });
        var dlBtn = el('button', { class: 'dg-btn dg-btn-ghost', type: 'button', text: '下載 .txt' });
        dlBtn.addEventListener('click', function () {
          download((config.filenamePrefix || '文件') + '_' + (doc.title || '') + '.txt', letter);
        });
        var prBtn = el('button', { class: 'dg-btn dg-btn-ghost', type: 'button', text: '列印／存 PDF' });
        prBtn.addEventListener('click', function () { printText(doc.title || (config.docLabel || '文件'), letter); });

        var metaKids = [];
        if (doc.legalBasis && doc.legalBasis.length) {
          metaKids.push(el('div', { html: '<strong>法律依據：</strong>' + doc.legalBasis.join('、') }));
        }
        if (doc.tips && doc.tips.length) {
          var ul = el('ul');
          doc.tips.forEach(function (t) { ul.appendChild(el('li', { text: t })); });
          metaKids.push(el('div', { html: '<strong>提醒：</strong>' }));
          metaKids[metaKids.length - 1].appendChild(ul);
        }

        out.innerHTML = '';
        out.appendChild(el('div', { class: 'dg-letter', text: letter }));
        out.appendChild(el('div', { class: 'dg-actions', style: 'padding:14px 0 0;border:none' }, [copyBtn, dlBtn, prBtn]));
        if (metaKids.length) out.appendChild(el('div', { class: 'dg-meta' }, metaKids));
        out.appendChild(el('div', { class: 'dg-disc', text: config.disclaimer ||
          '本文字僅為一般情形之自助範本，非法律意見；請依個案事證調整，重大爭議建議洽相關調處機關、法律扶助基金會或執業律師。' }));
        out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      genBtn.addEventListener('click', render);
      if (variantSel) variantSel.addEventListener('change', function () { out.innerHTML = ''; });

      var closeBtn = el('button', { class: 'dg-x', type: 'button', 'aria-label': '關閉', html: '&times;' });
      var head = el('div', { class: 'dg-head' }, [
        el('div', {}, [
          el('h3', { text: '產生' + (config.docLabel || '文件') }),
          el('p', { text: config.subtitle || '填寫資料後產生，可複製／下載／列印，再到郵局辦理。' }),
        ]),
        closeBtn,
      ]);
      var actions = el('div', { class: 'dg-actions' }, [genBtn]);
      var wrap = el('div', { class: 'dg-wrap' }, [head, body, actions]);
      var dlg = el('dialog', { class: 'dg-dialog' }, [wrap]);
      closeBtn.addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('close', function () { dlg.remove(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      return dlg;
    }

    function open(prefill) {
      if (dialog) { dialog.close(); }
      dialog = buildDialog(prefill);
      document.body.appendChild(dialog);
      dialog.showModal();
    }

    function mountButton(container, getPrefill, label) {
      if (!container) return;
      var btn = el('button', { class: 'dg-trigger', type: 'button' }, [
        el('span', { class: 'dg-ic', html: '&#9993;' }),
        el('span', { text: label || ('生成' + (config.docLabel || '文件') + '（可複製到郵局辦理）') }),
      ]);
      btn.addEventListener('click', function () {
        open(typeof getPrefill === 'function' ? getPrefill() : (getPrefill || {}));
      });
      container.appendChild(btn);
      return btn;
    }

    return { open: open, mountButton: mountButton };
  }

  window.DocGen = { create: create };
})();
