// 24단계 직격(直擊) — punch/strike.js 시트를 유료 원본 api/_paid/book/book-<방>.js의 full[].strike에 넣는다.
//   node tools/strange-oracle/strike.js check   검사만 (길이·금지어·성별어·결과 코드 대조)
//   node tools/strange-oracle/strike.js apply   검사 통과 시 넣기 (이미 있으면 바꿈, 다시 돌려도 같은 결과)
// strike = { lines: [마디 3개], turn: 돌려주는 한 줄 }. 유료 원본에만 두고 공개 파일에는 넣지 않는다(7장).
"use strict";
const fs = require("fs");
const path = require("path");
const { FAIL, GENDER } = require("./punch-words.js");
const SHEET = require("./punch/strike.js");

const ROOT = path.join(__dirname, "..", "..");
const BOOK = path.join(ROOT, "products", "strange-oracle", "api", "_paid", "book");
const GLOBAL = { saju: "BOOK_SAJU", ogham: "BOOK_OGHAM", star: "BOOK_STAR", decan: "BOOK_DECAN", tzolkin: "BOOK_TZOLKIN", sibyl: "BOOK_SIBYL", rune: "BOOK_RUNE" };
const MAX_LINE = 40;
const MAX_TURN = 70;

function words(t) {
  const why = [];
  for (const w of [...FAIL, ...GENDER]) {
    const s = w.ok ? t.replace(new RegExp(w.ok.source, "g"), "") : t;
    if (w.re.test(s)) why.push(`금지 "${w.word}"`);
  }
  if (/[<>]/.test(t)) why.push("HTML 글자");
  return why;
}
function load(room) {
  const fp = path.join(BOOK, `book-${room}.js`);
  const src = fs.readFileSync(fp, "utf8");
  const w = {};
  new Function("window", src)(w);
  return { fp, src, book: w[GLOBAL[room]] };
}

const cmd = process.argv[2];
if (cmd !== "check" && cmd !== "apply") throw new Error("check | apply");
let bad = 0;
const out = {};
for (const room of Object.keys(GLOBAL)) {
  const { fp, src, book } = load(room);
  const codes = book.full.map((x) => x.code);
  const sheet = SHEET[room] || {};
  codes.filter((c) => !sheet[c]).forEach((c) => (bad++, console.log(`빠짐 ${room} ${c}`)));
  Object.keys(sheet).filter((c) => !codes.includes(c)).forEach((c) => (bad++, console.log(`모르는 코드 ${room} ${c}`)));
  for (const [c, v] of Object.entries(sheet)) {
    if (!Array.isArray(v) || v.length !== 4) {
      bad++;
      console.log(`모양 ${room} ${c}: [마디, 마디, 마디, 한 줄]`);
      continue;
    }
    v.forEach((t, i) => {
      const max = i < 3 ? MAX_LINE : MAX_TURN;
      const why = words(t);
      if ([...t].length > max) why.push(`길이 ${[...t].length} > ${max}`);
      if (why.length) (bad++, console.log(`걸림 ${room} ${c} [${i}] ${why.join(", ")} — ${t}`));
    });
  }
  out[room] = { fp, src, codes, sheet };
}
if (bad) {
  console.log(`실패: ${bad}건`);
  process.exit(1);
}
const total = Object.values(out).reduce((n, r) => n + r.codes.length, 0);
if (cmd === "check") {
  console.log(`통과: ${total}개 결과`);
  process.exit(0);
}
for (const [room, r] of Object.entries(out)) {
  // 이미 넣은 strike 줄을 지우고, code 줄 뒤(copy-17 도구가 쓰는 firstLine·heartLine 줄이 있으면 그 뒤)에 다시 넣는다
  const lines = r.src.split("\n").filter((l) => !/^\s*"strike": \{/.test(l));
  for (const c of r.codes) {
    const [a, b, d, turn] = r.sheet[c];
    let i = lines.findIndex((l) => l.trim() === `"code": ${JSON.stringify(c)},`);
    if (i < 0) throw new Error(`자리 없음 ${room} ${c}`);
    const ind = lines[i].match(/^\s*/)[0];
    while (/^\s*"(firstLine|heartLine)": /.test(lines[i + 1] || "")) i++;
    lines.splice(i + 1, 0, `${ind}"strike": ${JSON.stringify({ lines: [a, b, d], turn })},`);
  }
  const s = lines.join("\n");
  fs.writeFileSync(r.fp, s);
  console.log(`${room}: ${r.codes.length}개 넣음 (${path.basename(r.fp)})`);
}
