import { plainTerms } from "./choulegal-plain-language.mjs";

const normalize = (text = "") => String(text).replace(/\s+/g, "");

const matchedTerm = (text) =>
  Object.entries(plainTerms)
    .sort(([left], [right]) => normalize(right).length - normalize(left).length)
    .find(([term]) => normalize(text).includes(normalize(term)));

const renderHelp = (help, text) => {
  const match = matchedTerm(text);
  help.querySelector("[data-plain-term-help-body]").innerHTML = match
    ? `<p><strong>例如：</strong>${match[1].example}</p><p><strong>不是這類：</strong>${match[1].counter}</p>`
    : "<p>先依實際發生的事情選擇；仍無法區分時，保留照片、契約與對話紀錄，再向官方管道或專業人士確認。</p>";
};

const enhanceSelect = (select) => {
  if (select.dataset.plainLanguageReady === "true") return;
  let hasTerms = false;
  [...select.options].forEach((option) => {
    const original = option.dataset.originalLabel ?? option.textContent;
    const match = matchedTerm(original);
    if (!match) return;
    hasTerms = true;
    option.dataset.originalLabel = original;
    option.textContent = `${match[1].plain}（${match[0]}）`;
  });
  if (!hasTerms) return;
  select.dataset.plainLanguageReady = "true";

  const help = document.createElement("details");
  help.className = "plain-term-help";
  help.dataset.plainTermHelp = "";
  help.innerHTML = "<summary>不確定怎麼選？看例子</summary><div data-plain-term-help-body></div>";
  const refresh = () => {
    const selected = select.selectedOptions[0];
    renderHelp(help, selected?.dataset.originalLabel ?? selected?.textContent ?? "");
  };
  select.insertAdjacentElement("afterend", help);
  select.addEventListener("change", refresh);
  refresh();
};

const enhanceLabel = (label) => {
  if (label.dataset.plainLanguageReady === "true") return;
  const match = matchedTerm(label.textContent);
  if (!match) return;
  label.dataset.plainLanguageReady = "true";
  label.title = `${match[0]}：${match[1].plain}。例如：${match[1].example}`;
};

const enhance = (root = document) => {
  if (root.matches?.("select")) enhanceSelect(root);
  if (root.matches?.("label")) enhanceLabel(root);
  root.querySelectorAll?.("select").forEach(enhanceSelect);
  root.querySelectorAll?.("label").forEach(enhanceLabel);
};

const addStyles = () => {
  if (document.querySelector("style[data-plain-language-styles]")) return;
  const style = document.createElement("style");
  style.dataset.plainLanguageStyles = "";
  style.textContent = `
    .plain-term-help{margin:.5rem 0;max-width:46rem}
    .plain-term-help>summary{min-height:44px;display:flex;align-items:center;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:.2em}
    .plain-term-help>summary:focus-visible{outline:3px solid var(--accent,#9b6b2f);outline-offset:3px}
    .plain-term-help p{margin:.35rem 0}
  `;
  document.head.append(style);
};

const ready = () => {
  addStyles();
  enhance();
  new MutationObserver((mutations) => {
    mutations.forEach(({ addedNodes }) => {
      addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ready, { once: true });
} else {
  ready();
}
