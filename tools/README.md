# /tools/ — Tool Manifest System

## What is manifest.json?

`manifest.json` is the **single source of truth** for every tool in InheritancePro.

It contains:
- All 6 tab categories (death, insurance, divorce, gift, accident, debt)
- Every tool with its `id`, `href`, `name`, `desc`, `featured`, `badge`, and `sitemapPriority`
- Static pages (homepage) for sitemap generation
- Cross-reference notes for discrepancies found during the initial audit

## How to add a new tool

1. **Create the HTML file** (e.g., `new-tool.html`) in the project root.
2. **Add an entry to `manifest.json`** under the appropriate tab's `tools` array:
   ```json
   {
     "id": "new-tool",
     "href": "new-tool.html",
     "name": "新工具名稱",
     "featured": false,
     "badge": null,
     "sitemapPriority": 0.7,
     "desc": "工具描述文字"
   }
   ```
   - If the tool appears in multiple tabs, add it to each tab and mark duplicates with `"_shared": true`.
3. **Regenerate the sitemap:**
   ```bash
   node tools/generate-sitemap.js > sitemap.xml
   ```
4. **Update `index.html`** — currently you still need to manually add the tool to `ALL_TOOLS` and the relevant `TABS` entry. (Future: index.html will read directly from manifest.json.)

## Scripts

| Script | Usage | Description |
|--------|-------|-------------|
| `generate-sitemap.js` | `node tools/generate-sitemap.js > sitemap.xml` | Reads manifest.json, outputs valid sitemap.xml with today's date as lastmod |

## Cross-reference notes (from initial audit)

During manifest creation, these discrepancies were found between `index.html`, `sitemap.xml`, and actual HTML files:

| File | In index.html TABS? | In sitemap.xml? | Status |
|------|---------------------|-----------------|--------|
| `divorce-agreement.html` | No | Yes | Added to manifest under "divorce" tab |
| `deadline-dashboard.html` | Yes | No | Added to manifest, now included in sitemap |
| `legal-basis.html` | Yes | No | Added to manifest, now included in sitemap |

## Future plans

- `index.html` will import manifest.json at build time (or fetch at runtime) to generate `ALL_TOOLS` and `TABS` automatically.
- A validation script (`validate-manifest.js`) to check that every `href` in the manifest has a corresponding HTML file on disk.
- CI integration: run `generate-sitemap.js` on deploy to keep sitemap always in sync.
