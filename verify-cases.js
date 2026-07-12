#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'js', 'case-law-data.js');
const RENDERER_FILE = path.join(ROOT, 'js', 'case-law-render.js');
const CASE_NUMBER_PATTERN = /\b\d{2,3}\s*年(?:度)?\s*(?:台上|台抗|上易|上|家上|家財訴|家繼訴|婚|重訴|訴|簡|勞訴|勞上更一|勞上易|勞上|簡上|判)字\s*第?\s*(?:\d+|X+)\s*號?/gu;
const SKIP_DIRS = new Set([
  '.git', '.vercel', 'node_modules', 'ios', 'www', 'vendor', '.agents', '.claude', '_generated',
]);
const SCAN_EXTENSIONS = new Set(['.html', '.js']);
const LAW_ALIASES = {
  '遺贈稅': '遺產及贈與稅法',
  '遺贈稅法': '遺產及贈與稅法',
  '遺贈稅法施行細則': '遺產及贈與稅法施行細則',
  '強責法': '強制汽車責任保險法',
  '強制責任險': '強制汽車責任保險法',
  '強制險法': '強制汽車責任保險法',
  '民訴': '民事訴訟法',
  '刑法': '中華民國刑法',
  '所': '所得稅法',
  '勞保條例': '勞工保險條例',
  '健保法': '全民健康保險法',
};
const LAW_NAMES = [
  '強制汽車責任保險給付標準',
  '強制汽車責任保險法',
  '遺產及贈與稅法施行細則',
  '納稅者權利保護法',
  '所得基本稅額條例',
  '遺產及贈與稅法',
  '道路交通安全規則',
  '全民健康保險法',
  '勞工保險條例',
  '遺贈稅法施行細則',
  '家事事件法',
  '國家賠償法',
  '房屋稅條例',
  '稅捐稽徵法',
  '所得稅法',
  '民事訴訟法',
  '土地稅法',
  '強制責任險',
  '強制險法',
  '勞保條例',
  '保險法',
  '土地法',
  '戶籍法',
  '訴願法',
  '健保法',
  '公司法',
  '刑法',
  '所',
  '信託法',
  '民法',
  '民訴',
  '遺贈稅法',
  '遺贈稅',
  '強責法',
];
const LAW_NAME_PATTERN = LAW_NAMES
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const ARTICLE_PATTERN = '(?:\\d+(?:-\\d+)?(?:\\s*[-–]\\s*[IVX]+(?:\\s*[-–]\\s*\\d+)?)?|[零〇一二三四五六七八九十百]+)';
const LAW_CITATION_PATTERN = new RegExp(`(${LAW_NAME_PATTERN})\\s*(?:第\\s*)?(?:§\\s*)?(${ARTICLE_PATTERN})\\s*(?:條)?`, 'gu');
const SAME_LAW_CONTINUATION_PATTERN = new RegExp(`^\\s*(?:[、,，/／及與和至~～])?\\s*(?:(?:第\\s*)(${ARTICLE_PATTERN})\\s*條|§\\s*(${ARTICLE_PATTERN}))`, 'u');
const BARE_CITATION_PATTERN = new RegExp(`§\\s*(${ARTICLE_PATTERN})`, 'gu');
const CIVIL_BARE_ARTICLES = new Set([
  '125', '126', '127', '128', '129', '130', '139', '140', '141', '142', '143', '144',
  '184', '185', '187', '188', '191-2', '192', '193', '194', '195', '197',
  '203', '205', '213', '216', '217', '229', '233', '244', '245',
  '736', '737', '738', '1005', '1017', '1020-1', '1030', '1030-1', '1030-3', '1030-4',
  '1050', '1052', '1055', '1056', '1057', '1065', '1084',
  '1055-1',
  '1116-2', '1117', '1118-1', '1119', '1132', '1137',
  '1138', '1140', '1141', '1144', '1146', '1148', '1148-1', '1149',
  '1151', '1153', '1154', '1156', '1157', '1159', '1160', '1162-2', '1164', '1165',
  '1173', '1174', '1176', '1185', '1186', '1187',
  '1189', '1190', '1191', '1192', '1193', '1194', '1195', '1196', '1197', '1198', '1209',
  '1219', '1220', '1221', '1222', '1223', '1224', '1225',
]);
const INHERITANCE_TAX_BARE_ARTICLES = new Set([
  '1', '4', '5', '5-1', '10', '11', '12-1', '13', '15', '16', '16-1', '17', '17-1', '18', '19', '20', '22', '23', '24', '44',
]);
const STRONG_INSURANCE_STANDARD_BARE_ARTICLES = new Set(['2', '3', '6', '7']);

function loadCaseDatabase() {
  const source = fs.readFileSync(DATA_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: DATA_FILE });
  return sandbox.window.IP_CASE_LAW || {};
}

function isOfficialJudicialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'judgment.judicial.gov.tw' &&
      url.pathname.toLowerCase() === '/fjud/data.aspx' &&
      url.searchParams.get('ty') === 'JD' &&
      Boolean(url.searchParams.get('id'));
  } catch {
    return false;
  }
}

function validateCaseRecord(category, record, index) {
  const location = `${category}[${index}]`;
  const errors = [];

  if (record.verified !== true) errors.push(`${location}: verified 必須為 true`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedAt || '')) {
    errors.push(`${location}: verifiedAt 必須為 YYYY-MM-DD`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.judgmentDate || '')) {
    errors.push(`${location}: judgmentDate 必須為 YYYY-MM-DD`);
  }
  if (record.sourceType !== '司法院裁判書原文') {
    errors.push(`${location}: sourceType 必須為「司法院裁判書原文」`);
  }
  if (!isOfficialJudicialUrl(record.sourceUrl)) {
    errors.push(`${location}: sourceUrl 必須是司法院裁判書官方網址`);
  }
  if (!record.caseNo || !record.summary || !record.law || !record.amountLabel) {
    errors.push(`${location}: 案號、摘要、法條與金額標示不得空白`);
  }
  if (!Number.isFinite(record.amount) || record.amount <= 0) {
    errors.push(`${location}: amount 必須是正數`);
  }
  if (!Array.isArray(record.evidence) || record.evidence.length < 2) {
    errors.push(`${location}: evidence 至少需要兩段司法院原文證據`);
  }
  if (!['confirmed-final', 'unknown', 'not-final'].includes(record.finality)) {
    errors.push(`${location}: finality 必須標示裁判終局狀態`);
  }

  return errors;
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (
      SCAN_EXTENSIONS.has(path.extname(entry.name)) &&
      fullPath !== DATA_FILE &&
      fullPath !== __filename
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function findHardcodedCaseNumbers() {
  const findings = [];
  for (const file of walk(ROOT)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const matches = line.match(CASE_NUMBER_PATTERN) || [];
      for (const caseNo of matches) {
        findings.push({
          file: path.relative(ROOT, file),
          line: index + 1,
          caseNo,
        });
      }
    });
  }
  return findings;
}

function chineseNumeralToNumber(value) {
  if (!value) return null;
  const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (value === '十') return 10;
  if (value === '百') return 100;
  if (value.endsWith('百') && value.length === 2) return digits[value[0]] * 100;
  const hundredIndex = value.indexOf('百');
  if (hundredIndex >= 0) {
    const hundreds = hundredIndex === 0 ? 1 : digits[value.slice(0, hundredIndex)];
    const rest = chineseNumeralToNumber(value.slice(hundredIndex + 1)) || 0;
    return hundreds * 100 + rest;
  }
  const tenIndex = value.indexOf('十');
  if (tenIndex >= 0) {
    const tens = tenIndex === 0 ? 1 : digits[value.slice(0, tenIndex)];
    const ones = tenIndex === value.length - 1 ? 0 : digits[value.slice(tenIndex + 1)];
    return tens * 10 + ones;
  }
  return digits[value] ?? null;
}

function expandArticleToken(token) {
  const normalized = token.replace(/\s+/g, '');
  const romanMatch = normalized.match(/^(\d+)(?:[-–][IVX]+(?:[-–]\d+)?)$/i);
  if (romanMatch) return [romanMatch[1]];

  const chineseValue = chineseNumeralToNumber(normalized);
  if (chineseValue) return [String(chineseValue)];

  const rangeMatch = normalized.match(/^(\d+)-(\d{3,4})$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (end > start && end - start <= 30) {
      return Array.from({ length: end - start + 1 }, (_, offset) => String(start + offset));
    }
  }

  return [normalized];
}

function canonicalLawName(name) {
  return LAW_ALIASES[name] || name;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function collectLawCitation(findings, lawName, token, file, source, index) {
  const canonicalName = canonicalLawName(lawName);
  for (const article of expandArticleToken(token)) {
    findings.push({
      article: `${canonicalName}§${article}`,
      file: path.relative(ROOT, file),
      line: lineNumberAt(source, index),
    });
  }
}

function findLatestLawContext(line, endIndex) {
  const prefix = line.slice(0, endIndex);
  let latest = null;
  for (const match of prefix.matchAll(LAW_CITATION_PATTERN)) {
    latest = canonicalLawName(match[1]);
  }
  return latest;
}

function inferBareCitationLaw(article, line, file) {
  const nearby = line.replace(/\s+/g, '');
  if (
    STRONG_INSURANCE_STANDARD_BARE_ARTICLES.has(article) &&
    /強制汽車責任保險給付標準|強制險|強制責任險|傷害醫療給付|死亡給付|失能/.test(nearby)
  ) {
    return '強制汽車責任保險給付標準';
  }
  if (
    INHERITANCE_TAX_BARE_ARTICLES.has(article) &&
    /遺贈稅|遺產稅|贈與稅|遺產總額|免稅額|扣除額|剩餘財產差額分配請求權|稅率/.test(nearby)
  ) {
    return '遺產及贈與稅法';
  }
  if (CIVIL_BARE_ARTICLES.has(article)) return '民法';
  if (article === '344' || article === '356') return '中華民國刑法';
  if ((article === '4-4' || article === '4-5' || article === '14-4') && /房地合一|所得稅/.test(nearby)) {
    return '所得稅法';
  }
  if (file.endsWith('accident.html') && STRONG_INSURANCE_STANDARD_BARE_ARTICLES.has(article)) {
    return '強制汽車責任保險給付標準';
  }
  return null;
}

function isBareCitationPartOfFullCitation(line, index) {
  const before = line.slice(0, index);
  return new RegExp(`(${LAW_NAME_PATTERN})\\s*$`, 'u').test(before);
}

function findLegalCitations() {
  const findings = [];
  const seen = new Set();

  for (const file of walk(ROOT)) {
    const source = fs.readFileSync(file, 'utf8').replace(/&sect;/g, '§');
    for (const match of source.matchAll(LAW_CITATION_PATTERN)) {
      const [, lawName, token] = match;
      collectLawCitation(findings, lawName, token, file, source, match.index);

      let tail = source.slice(match.index + match[0].length, match.index + match[0].length + 80);
      let consumed = 0;
      while (true) {
        const continuation = tail.match(SAME_LAW_CONTINUATION_PATTERN);
        if (!continuation) break;
        collectLawCitation(findings, lawName, continuation[1] || continuation[2], file, source, match.index + match[0].length + consumed);
        tail = tail.slice(continuation[0].length);
        consumed += continuation[0].length;
      }
    }

    const lines = source.split(/\r?\n/);
    let sourceOffset = 0;
    lines.forEach((line, lineIndex) => {
      for (const match of line.matchAll(BARE_CITATION_PATTERN)) {
        if (isBareCitationPartOfFullCitation(line, match.index)) continue;
        const absoluteIndex = sourceOffset + match.index;
        const token = match[1];
        for (const article of expandArticleToken(token)) {
          const locationKey = `${file}:${lineIndex + 1}:${match.index}:${article}`;
          if (seen.has(locationKey)) continue;
          const lawName = findLatestLawContext(line, match.index) || inferBareCitationLaw(article, line, path.relative(ROOT, file));
          if (!lawName) {
            findings.push({
              article: null,
              file: path.relative(ROOT, file),
              line: lineIndex + 1,
              error: `裸法條「§${article}」缺少可驗證法規名稱`,
            });
            seen.add(locationKey);
            continue;
          }
          collectLawCitation(findings, lawName, article, file, source, absoluteIndex);
          seen.add(locationKey);
        }
      }
      sourceOffset += line.length + 1;
    });
  }

  return findings;
}

async function verifyLegalCitations(citations, lookupLaw, offline) {
  const errors = [];
  const seen = new Map();

  citations.forEach((citation) => {
    if (citation.error) {
      errors.push(`${citation.file}:${citation.line} ${citation.error}`);
      return;
    }
    if (!seen.has(citation.article)) seen.set(citation.article, []);
    seen.get(citation.article).push(citation);
  });

  for (const [article, occurrences] of seen.entries()) {
    const result = await lookupLaw(article, { offline });
    if (result.error) {
      const first = occurrences[0];
      errors.push(`${first.file}:${first.line} 法條「${article}」未通過 AVS 官方法規驗證：${result.error}`);
    }
  }

  return { checked: seen.size, errors };
}

function verifyRendererGate() {
  const rendererSource = fs.readFileSync(RENDERER_FILE, 'utf8');
  let insertedHtml = '';
  const target = {
    insertAdjacentHTML(position, html) {
      if (position !== 'afterend') throw new Error('判例面板插入位置異常');
      insertedHtml = html;
    },
  };
  const sandbox = {
    URL,
    Number,
    window: {
      IP_CASE_LAW: {
        test: [{
          caseNo: '未驗證測試案號',
          amount: 100,
          amountLabel: 'NT$ 100',
          summary: '不得顯示',
          law: '測試法條',
        }],
      },
    },
    document: {
      getElementById(id) {
        return id === 'target' ? target : null;
      },
    },
  };

  vm.runInNewContext(rendererSource, sandbox, { filename: RENDERER_FILE });
  sandbox.window.IP_renderCaseLaw('test', 100, 'target');
  if (insertedHtml) throw new Error('渲染器錯誤：未驗證案例仍會顯示');

  sandbox.window.IP_CASE_LAW.test = [{
    caseNo: '官方來源測試案號',
    judgmentDate: '2021-01-01',
    amount: 100,
    amountLabel: 'NT$ 100',
    summary: '僅測試驗證閘門',
    law: '測試法條',
    verified: true,
    verifiedAt: '2026-06-24',
    sourceType: '司法院裁判書原文',
    sourceUrl: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=TEST',
    finality: 'unknown',
    evidence: ['測試證據文字第一段', '測試證據文字第二段'],
  }];
  sandbox.window.IP_renderCaseLaw('test', 100, 'target');
  if (!insertedHtml.includes('司法院裁判書原文') || !insertedHtml.includes('2026-06-24')) {
    throw new Error('渲染器錯誤：已驗證案例缺少官方來源或查核日期');
  }
}

async function main() {
  const database = loadCaseDatabase();
  const validationErrors = [];
  const citations = [];

  for (const [category, records] of Object.entries(database)) {
    if (!Array.isArray(records)) {
      validationErrors.push(`${category}: 分類資料必須是陣列`);
      continue;
    }
    records.forEach((record, index) => {
      validationErrors.push(...validateCaseRecord(category, record, index));
      citations.push(record);
    });
  }

  const hardcodedCases = findHardcodedCaseNumbers();
  const legalCitations = findLegalCitations();
  let rendererError = null;
  try {
    verifyRendererGate();
  } catch (error) {
    rendererError = error;
  }

  const { verifyJudgmentCitations } = await import('avs/judgment-registry');
  const { lookupLaw } = await import('avs/law-registry');
  const offline = !process.argv.includes('--refresh');
  const avsReport = await verifyJudgmentCitations(citations, {
    offline,
  });
  const lawReport = await verifyLegalCitations(legalCitations, lookupLaw, offline);

  if (validationErrors.length || hardcodedCases.length || rendererError || avsReport.status === 'FAIL' || lawReport.errors.length) {
    console.error('裁判驗證失敗：未通過 AVS 官方來源守門。');
    validationErrors.forEach(error => console.error(`- ${error}`));
    hardcodedCases.forEach(finding => {
      console.error(`- ${finding.file}:${finding.line} 發現散落案號「${finding.caseNo}」`);
    });
    if (rendererError) console.error(`- ${rendererError.message}`);
    avsReport.errors.forEach(error => console.error(`- ${error}`));
    lawReport.errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  avsReport.warnings.forEach(warning => console.warn(`警告：${warning}`));
  console.log(`裁判與法條驗證通過：AVS 已核對 ${citations.length} 則司法院裁判、${lawReport.checked} 個官方法條；未驗證資料無法顯示，頁面亦無散落案號。`);
}

main().catch(error => {
  console.error(`裁判驗證執行失敗：${error.message}`);
  process.exit(1);
});
