import { findPlainTerm } from "./choulegal-plain-language.mjs";

const SOURCE_PATTERN = /pcode\s+([A-Z]\d+)\s*·\s*flno\s+([\d-]+)/i;

const sourceName = (text) => {
  const match = text.match(/([\u3400-\u9fffA-Za-z]+)\s*§\s*([\d-]+)/);
  return match ? `${match[1]}第${match[2]}條` : "這則法條";
};

const linkSource = (element) => {
  if (element.querySelector("a[data-law-source-link]")) return;
  const match = element.textContent.match(SOURCE_PATTERN);
  if (!match) return;
  const [marker, pcode, flno] = match;
  const label = sourceName(element.textContent);
  const link = document.createElement("a");
  link.dataset.lawSourceLink = "";
  link.href = `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${encodeURIComponent(pcode)}&flno=${encodeURIComponent(flno)}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", `在全國法規資料庫查看${label}，另開新視窗`);
  link.textContent = marker;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const index = node.nodeValue.search(SOURCE_PATTERN);
    if (index === -1) continue;
    const after = node.splitText(index);
    after.splitText(marker.length);
    after.replaceWith(link);
    break;
  }
};

const existingPlainParagraph = (section) =>
  [...section.querySelectorAll("p")].find((paragraph) => /^\s*白話[：:]/.test(paragraph.textContent));

const quoteFor = (meta) => {
  let cursor = meta.previousElementSibling;
  while (cursor && cursor.tagName !== "BLOCKQUOTE") cursor = cursor.previousElementSibling;
  return cursor?.tagName === "BLOCKQUOTE" ? cursor : null;
};

const reorderSource = (meta) => {
  if (meta.closest("details[data-law-source-details]")) return;
  const section = meta.closest("section, article, div");
  const quote = quoteFor(meta);
  if (!section || !quote) return;
  const plain = existingPlainParagraph(section);
  const term = findPlainTerm(`${plain?.textContent ?? ""} ${quote.textContent}`);
  if (!plain && !term) return;

  const anchor = quote;
  const plainLayer = document.createElement("div");
  plainLayer.className = "law-source-plain";
  plainLayer.dataset.lawSourcePlain = "";
  if (plain) {
    plainLayer.append(plain);
  } else {
    const paragraph = document.createElement("p");
    paragraph.textContent = `白話：${term.plain}`;
    plainLayer.append(paragraph);
  }
  if (term) {
    const examples = document.createElement("div");
    examples.className = "law-source-examples";
    examples.innerHTML = `<p><strong>例如：</strong>${term.example}</p><p><strong>不屬於：</strong>${term.counter}</p>`;
    plainLayer.append(examples);
  }
  section.insertBefore(plainLayer, anchor);

  const details = document.createElement("details");
  details.className = "law-source-details";
  details.dataset.lawSourceDetails = "";
  const summary = document.createElement("summary");
  summary.textContent = `看法條原文（${sourceName(meta.textContent)}）`;
  details.append(summary, quote, meta);
  const officialLink = meta.querySelector("a[data-law-source-link]")?.cloneNode(true);
  if (officialLink) {
    const action = document.createElement("p");
    action.className = "law-source-action";
    officialLink.textContent = "到全國法規資料庫查看此條 ↗";
    action.append(officialLink);
    details.append(action);
  }
  section.insertBefore(details, plainLayer.nextSibling);
};

const addStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    .law-source-plain{margin-block:1rem;padding:1rem;border-inline-start:4px solid var(--accent,#9b6b2f);background:color-mix(in srgb,var(--card,#fff) 88%,var(--accent,#9b6b2f))}
    .law-source-examples{display:grid;gap:.5rem;margin-block-start:.75rem}.law-source-examples p{margin:0}
    .law-source-details{margin-block:1rem;border:1px solid var(--line,#767676);border-radius:.5rem}
    .law-source-details>summary{min-height:44px;display:flex;align-items:center;padding:.75rem 1rem;font-weight:700;cursor:pointer}
    .law-source-details>summary:focus-visible{outline:3px solid var(--accent,#9b6b2f);outline-offset:3px}
    .law-source-details[open]>summary{border-block-end:1px solid var(--line,#767676)}
    .law-source-details>blockquote,.law-source-details>p{margin:1rem}.law-source-action a{text-decoration:underline;text-underline-offset:.2em}
    @media (min-width:40rem){.law-source-examples{grid-template-columns:1fr 1fr}}
  `;
  document.head.append(style);
};

const ready = () => {
  addStyles();
  const metas = [...document.querySelectorAll("p, small, div, li")].filter(
    (element) => SOURCE_PATTERN.test(element.textContent) && ![...element.children].some((child) => SOURCE_PATTERN.test(child.textContent))
  );
  metas.forEach(linkSource);
  metas.forEach(reorderSource);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ready, { once: true });
} else {
  ready();
}
