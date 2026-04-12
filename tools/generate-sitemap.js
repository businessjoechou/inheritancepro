#!/usr/bin/env node
/**
 * generate-sitemap.js
 * Reads manifest.json and outputs a valid sitemap.xml to stdout.
 *
 * Usage:
 *   node tools/generate-sitemap.js > sitemap.xml
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const baseUrl = manifest.baseUrl;
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// Collect all unique tool URLs (some tools appear in multiple tabs via _shared)
const seenHrefs = new Set();
const toolEntries = [];

// 1. Static pages (homepage, etc.)
for (const page of manifest.pages || []) {
  const loc = page.href ? `${baseUrl}/${page.href}` : `${baseUrl}/`;
  toolEntries.push({
    loc,
    changefreq: page.changefreq || 'monthly',
    priority: page.sitemapPriority || 0.5,
  });
  seenHrefs.add(page.href || '');
}

// 2. Tool pages from tabs
for (const tab of manifest.tabs) {
  for (const tool of tab.tools) {
    if (seenHrefs.has(tool.href)) continue;
    seenHrefs.add(tool.href);
    toolEntries.push({
      loc: `${baseUrl}/${tool.href}`,
      changefreq: 'weekly',
      priority: tool.sitemapPriority || 0.7,
    });
  }
}

// 3. Generate XML
const urls = toolEntries.map(entry =>
  `  <url>\n` +
  `    <loc>${entry.loc}</loc>\n` +
  `    <lastmod>${today}</lastmod>\n` +
  `    <changefreq>${entry.changefreq}</changefreq>\n` +
  `    <priority>${entry.priority}</priority>\n` +
  `  </url>`
).join('\n');

const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

process.stdout.write(sitemap);
