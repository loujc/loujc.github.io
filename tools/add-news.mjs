// Adds one item to the homepage "News / 动态" ledger: the <li> in index.html (English default text)
// plus the matching news.nX key in both I18N dictionaries of script.js. Used by the add-news skill.
//
// usage (from the repo root):
//   node tools/add-news.mjs --date 2026.10.20 --kind service \
//     --en 'Invited to serve as a reviewer for IEEE TCAD.' \
//     --zh '受邀担任 IEEE TCAD 审稿人。' [--visible 7] [--dry-run]
//
// --date   YYYY.MM.DD, or YYYY.MM when only the month is known
// --kind   paper | award | service | venture | open
// --en/zh  one sentence each; may contain <a>, <abbr>, <b>
// Items stay newest-first; only the newest --visible items show, the rest fold behind "Earlier news".
// script.js?v=N in index.html is bumped so browsers fetch the new dictionary.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const fail = (message) => {
  console.error(`add-news: ${message}`);
  process.exit(1);
};

const KINDS = { paper: "Paper", award: "Award", service: "Service", venture: "Venture", open: "Open source" };
const root = opt("root", join(dirname(fileURLToPath(import.meta.url)), ".."));
const date = opt("date", "");
const kind = opt("kind", "");
const en = opt("en", "");
const zh = opt("zh", "");
const visible = Number(opt("visible", 7));
const dryRun = args.includes("--dry-run");

if (!/^\d{4}\.\d{2}(\.\d{2})?$/.test(date)) fail("--date must be YYYY.MM.DD or YYYY.MM");
if (!KINDS[kind]) fail(`--kind must be one of: ${Object.keys(KINDS).join(", ")}`);
if (!en.trim() || !zh.trim()) fail("--en and --zh are both required");
for (const text of [en, zh]) {
  if (/[`\n]|\$\{/.test(text)) fail("text must be a single line without backticks or ${");
}
const iso = date.replaceAll(".", "-");

/* ——— index.html ——— */
const htmlPath = join(root, "index.html");
let html = readFileSync(htmlPath, "utf8");
const list = html.match(/(<ol class="news-list"[^>]*>\n)([\s\S]*?)(\n\s*<\/ol>)/);
if (!list) fail('<ol class="news-list"> not found in index.html');
const items = [...list[2].matchAll(/ *<li class="news-item"[\s\S]*?<\/li>/g)].map((m) => m[0]);
const keyOf = (item) => Number(item.match(/data-i18n-html="news\.n(\d+)"/)?.[1] ?? 0);
const isoOf = (item) => item.match(/<time datetime="([\d-]+)">/)?.[1] ?? "";
const n = Math.max(0, ...items.map(keyOf)) + 1;
const fresh = `        <li class="news-item" data-kind="${kind}">
          <time datetime="${iso}">${date}</time>
          <span class="news-kind" data-i18n="news.k.${kind}">${KINDS[kind]}</span>
          <p data-i18n-html="news.n${n}">${en}</p>
        </li>`;
// newest first; a month-only date sorts late in its month, and a new item leads its own date
const sortKey = (d) => (d.length === 7 ? `${d}-28` : d);
const ordered = [fresh, ...items].sort((a, b) => sortKey(isoOf(b)).localeCompare(sortKey(isoOf(a))));
const folded = ordered.map((item, i) => {
  const shown = item.replace(" data-older hidden", "");
  return i < visible ? shown : shown.replace(/(<li class="news-item" data-kind="[a-z]+")/, "$1 data-older hidden");
});
html = html.replace(list[0], `${list[1]}${folded.join("\n")}${list[3]}`);
let version = "";
html = html.replace(/script\.js\?v=(\d+)/, (_, v) => {
  version = `script.js?v=${Number(v) + 1}`;
  return version;
});

/* ——— script.js: the key goes right after the last news key of each dictionary ——— */
const jsPath = join(root, "script.js");
let js = readFileSync(jsPath, "utf8");
const zhStart = js.indexOf("\n    zh: {");
if (zhStart < 0) fail("I18N.zh not found in script.js");
const KEY_LINE = /\n {6}"news\.n\d+": (?:`[^`]*`|"[^"\n]*"),/g;
const insertAfterLastKey = (from, to, text) => {
  const found = [...js.slice(from, to).matchAll(KEY_LINE)].at(-1);
  if (!found) fail("no existing news.nX keys found in script.js");
  const at = from + found.index + found[0].length;
  js = `${js.slice(0, at)}\n      "news.n${n}": \`${text}\`,${js.slice(at)}`;
};
insertAfterLastKey(zhStart, js.length, zh); // zh lives later in the file, so do it first
insertAfterLastKey(0, zhStart, en);
try {
  new vm.Script(js, { filename: "script.js" });
} catch (error) {
  fail(`script.js would no longer parse: ${error.message}`);
}

const position = folded.findIndex((item) => item.includes(`news.n${n}"`)) + 1;
const summary = `news.n${n} · ${date} · ${kind} · position ${position}/${folded.length} (${Math.min(visible, folded.length)} visible) · ${version}`;
if (dryRun) {
  console.log(`[dry run] ${summary}\n\n${fresh}\n\n      "news.n${n}": \`${en}\`,\n      "news.n${n}": \`${zh}\`,`);
} else {
  writeFileSync(htmlPath, html);
  writeFileSync(jsPath, js);
  console.log(`added ${summary}`);
}
