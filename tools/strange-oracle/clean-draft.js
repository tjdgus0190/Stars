// index.html [초안] 정리: data-t/data-h/data-aria 요소는 확정 문구로 채우고, 키가 없는 [초안]은 가장 안쪽 글자를 비운다.
// 사용: node tools/strange-oracle/clean-draft.js <product dir> [--dry]
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.argv[2];
const dry = process.argv.includes("--dry");
const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
for (const f of ["data.js", "data-saju.js"]) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8").replace(/^\s*(const|let)\s+/gm, "var "), sandbox);
const W = sandbox.window;
const T = W.TEXT;
const SAJU = W.SAJU;
// app.js의 mergeSajuText를 그대로 꺼내 실행
const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const start = app.indexOf("function mergeSajuText()");
let i = app.indexOf("{", start), depth = 0;
for (; i < app.length; i++) { if (app[i] === "{") depth++; else if (app[i] === "}" && --depth === 0) break; }
const src = app.slice(start, i + 1);
new Function("T", "SAJU", src + "; mergeSajuText();")(T, SAJU);
const get = (p) => p.split(".").reduce((o, k) => (o == null ? o : o[k]), T);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escA = (s) => esc(s).replace(/"/g, "&quot;");

const file = path.join(dir, "index.html");
let html = fs.readFileSync(file, "utf8");
const before = (html.match(/\[초안\]/g) || []).length;
const log = { filled: 0, emptied: 0, missing: [], aria: 0, bare: 0 };

// 1) data-t / data-h 요소의 [초안] 내용 (자식 태그 없는 요소만)
html = html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-(t|h)="([^"]+)"[^>]*>)\s*\[초안\][^<]*(<\/\2>)/g, (m, open, tag, kind, key, close) => {
  const v = get(key);
  if (typeof v === "string" && v.trim()) { log.filled++; return open + (kind === "h" ? v : esc(v)) + close; }
  log.emptied++; log.missing.push(key); return open + close;
});
// 2) aria-label="[초안] ..." : data-aria 키가 있으면 채우고, 없으면 비움
html = html.replace(/<[^>]*aria-label="\[초안\][^"]*"[^>]*>/g, (tag) => {
  const k = (tag.match(/data-aria="([^"]+)"/) || [])[1];
  const v = k ? get(k) : "";
  log.aria++;
  return tag.replace(/aria-label="\[초안\][^"]*"/, `aria-label="${escA(typeof v === "string" ? v : "")}"`);
});
// 3) 주석 속 [초안] 언급
html = html.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/\[초안\]/g, "견본"));
// 4) 남은 키 없는 [초안]: 가장 안쪽 텍스트 비움
html = html.replace(/>(\s*)\[초안\][^<]*</g, (m, sp) => { log.bare++; return ">" + "<"; });
const after = (html.match(/\[초안\]/g) || []).length;
console.log(JSON.stringify({ before, after, ...log }, null, 1));
if (!dry) fs.writeFileSync(file, html);
