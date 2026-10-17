// 17단계 문구 도구 공용 부분 (apply-17.js · check-17.js · yeon.test.js가 같이 쓴다). 배포하지 않는다(tools/).
// 유료 문장 원문은 이 파일·items.json에 넣지 않는다. 원문은 api/_paid/book/에만 있다.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..", "..");
const PROD = path.join(ROOT, "products", "strange-oracle");
const PAID = path.join(PROD, "api", "_paid", "book");
const DIR = __dirname;
const ITEMS = path.join(DIR, "items.json");
const OUT = path.join(DIR, "out");
const JUDGED = path.join(DIR, "gender-judged.json");

const ARCH = ["warrior", "sage", "lover", "rebel", "caregiver", "explorer", "creator", "ruler"];
const ELEMENTS = ["wood", "fire", "earth", "metal", "water"]; // saju.js ELEMENTS 순서(목·화·토·금·수)
const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]; // 책 장 순서(paycode CHAPTER_ORDER)
const BANDS = 7;

// ── 인연의 장 칸 (spec 17-2 쪽 구성). path = BOOK_YEON 안 경로, target = 목표 글자, review = 사람 전부 읽기(17-13의 7)
const range = (t) => ({ target: t, min: Math.round(t * 0.85), max: Math.round(t * 1.15) });
const YEON_SLOTS = [
  { batch: "yeon-pull", kind: "yeon.pull", path: ["pull"], keys: ARCH, ...range(450) },
  { batch: "yeon-mirror", kind: "yeon.mirror", path: ["mirror"], keys: ARCH, ...range(450), review: "all" },
  { batch: "yeon-meet", kind: "yeon.meet", path: ["meet"], keys: ARCH, ...range(600) },
  { batch: "yeon-twist", kind: "yeon.twist", path: ["twist"], keys: ARCH, ...range(300), review: "all", by: "보조 원형" },
  { batch: "yeon-scene", kind: "yeon.scene", path: ["scene"], keys: ARCH, ...range(400) },
  ...Array.from({ length: BANDS }, (_, b) => ({ batch: `yeon-time-b${b + 1}`, kind: "yeon.time", path: ["time"], keys: ARCH.map((a) => `${a}-b${b + 1}`), ...range(220), review: "all" })),
  { batch: "yeon-season", kind: "yeon.season", path: ["season"], keys: ELEMENTS, ...range(350), review: "all", by: "만신 일간 오행" },
  { batch: "yeon-alt-same", kind: "yeon.alt.same", path: ["alt", "same"], keys: ARCH, ...range(300) },
  { batch: "yeon-alt-notime", kind: "yeon.alt.notime", path: ["alt", "notime"], keys: ARCH, ...range(220) },
];
const LINE = { firstLine: range(80), heartLine: range(150) };

const readWin = (file) => {
  const w = {};
  vm.runInNewContext(fs.readFileSync(file, "utf8"), { window: w });
  return w;
};
const roomFile = (r) => path.join(PAID, `book-${r}.js`);
const roomData = (r) => readWin(roomFile(r))[`BOOK_${r.toUpperCase()}`];
const YEON_FILE = path.join(PAID, "book-yeon.js");
const yeonData = () => readWin(YEON_FILE).BOOK_YEON;

// 방 하나의 full 결과 코드를 chunk개 이하 묶음으로 고르게 나눈다
function chunks(list, max) {
  const n = Math.ceil(list.length / max);
  const size = Math.ceil(list.length / n);
  return Array.from({ length: n }, (_, i) => list.slice(i * size, (i + 1) * size));
}

// items.json 항목 전체 (순서 = 17-6 작업 순서: 인연의 장 기본판 → 대체 → heartLine → firstLine)
function buildItems() {
  const out = [];
  for (const s of YEON_SLOTS)
    for (const k of s.keys)
      out.push({
        id: ["yeon", ...s.path, k].join("."),
        batch: s.batch, file: "api/_paid/book/book-yeon.js", path: [...s.path, k], room: null, code: k, kind: s.kind, voice: "book",
        target: s.target, min: s.min, max: s.max, status: "todo", note: "", ...(s.review ? { review: s.review } : {}), ...(s.by ? { by: s.by } : {}),
      });
  for (const kind of ["heartLine", "firstLine"])
    for (const r of ROOMS) {
      const codes = roomData(r).full.map((e) => e.code);
      chunks(codes, 12).forEach((part, i) =>
        part.forEach((code) =>
          out.push({
            id: `${kind}.${r}.${code}`, batch: `${kind === "heartLine" ? "heart" : "first"}-${r}-${i + 1}`, file: `api/_paid/book/book-${r}.js`, path: ["full", code, kind], room: r, code, kind, voice: r,
            ...LINE[kind], status: "todo", note: "", ...(r === "rune" ? { note: "룬: 지금 자리에 놓였을 때를 겨냥(17-3)" } : {}),
          })
        )
      );
    }
  return out;
}

// 빈 book-yeon.js 구조 (키만, 문구 자리는 빈칸)
function emptyYeon() {
  const Y = {};
  for (const s of YEON_SLOTS) {
    let o = Y;
    s.path.forEach((p) => (o = o[p] = o[p] || {}));
    s.keys.forEach((k) => (o[k] = ""));
  }
  return Y;
}
const YEON_HEAD = `// ═══════════════════════════════════════════════════════════════════════
// 한 권의 책 — 제2부 「인연의 장」 (유료 원본, spec 17-2). 유료 문장의 유일한 원본이다. 공개 폴더에 복사하지 않는다(CLAUDE.md 7장).
// 함수 book(netlify/functions/book.js, file "yeon")만 읽어 열람 코드가 확인된 사람에게 통째로 준다. 고르기는 브라우저(book.js yeonChapter)가 한다.
// 문구만, 로직 없음. 평문만. 문구는 tools/strange-oracle/apply-17.js로 넣는다(손으로 고쳐도 되지만 키 구조는 바꾸지 않는다).
//  pull 끌림의 결 · mirror 연애 습관 거울 · meet 만나야 할 사람 · scene 만남의 장면 = 주 원형 8
//  twist 의외의 끌림 = 보조 원형 8 · time 인연의 시기 = "<주 원형>-b<나이 구간 1~7>" 56 · season 인연의 계절 = 일간 오행 5(wood fire earth metal water)
//  alt.same 한결같은 결(보조 = 주) 8 · alt.notime 나이 모를 때 8 (만 19세 미만판은 두지 않음, 결정 114)
// ═══════════════════════════════════════════════════════════════════════
window.BOOK_YEON = `;
const writeYeon = (Y) => fs.writeFileSync(YEON_FILE, YEON_HEAD + JSON.stringify(Y, null, 2) + ";\n");

// 방 원본에 firstLine·heartLine 넣기: "full" 구획 안 "code": "<code>", 줄 바로 뒤에 넣거나 같은 키 줄을 바꾼다. 다른 줄은 손대지 않는다
function setRoomLines(room, values /* {code: {firstLine?, heartLine?}} */, fileOverride) {
  const file = fileOverride || roomFile(room); // fileOverride = 시험용 사본
  const text = fs.readFileSync(file, "utf8");
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\s*"full": \[/.test(l));
  const endOf = () => lines.findIndex((l, i) => i > start && /^\s*"hidden": \[/.test(l));
  if (start < 0 || endOf() < 0) throw new Error(`${room}: full/hidden 구획을 못 찾음`);
  for (const [code, v] of Object.entries(values)) {
    const end = endOf(); // 앞 결과에 줄을 넣으면 hidden 위치가 밀린다
    const i = lines.findIndex((l, j) => j > start && j < end && l.trim() === `"code": ${JSON.stringify(code)},`);
    if (i < 0) throw new Error(`${room}: 코드 ${code} 없음`);
    const ind = lines[i].match(/^\s*/)[0];
    const cur = {};
    let n = 0; // code 줄 바로 뒤에 이미 있는 firstLine·heartLine 줄 수
    while (n < 2) {
      const m = /^\s*"(firstLine|heartLine)": (.*),$/.exec(lines[i + 1 + n] || "");
      if (!m) break;
      cur[m[1]] = JSON.parse(m[2]);
      n++;
    }
    const next = Object.assign(cur, v);
    const add = ["firstLine", "heartLine"].filter((k) => k in next).map((k) => `${ind}${JSON.stringify(k)}: ${JSON.stringify(next[k])},`);
    lines.splice(i + 1, n, ...add);
  }
  fs.writeFileSync(file, lines.join(nl));
}

// 원본 안 값 읽기 (항목 하나)
function valueOf(item, cache) {
  if (item.room) {
    const d = (cache[item.room] = cache[item.room] || roomData(item.room));
    const e = d.full.find((x) => x.code === item.code);
    return e ? e[item.kind] : undefined;
  }
  const Y = (cache.yeon = cache.yeon || yeonData());
  return item.path.reduce((o, k) => (o == null ? undefined : o[k]), Y);
}
const textOf = (v) => (Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : "");
const len = (s) => [...String(s)].length;

const loadItems = () => JSON.parse(fs.readFileSync(ITEMS, "utf8"));
const saveItems = (items) => fs.writeFileSync(ITEMS, JSON.stringify(items, null, 1) + "\n");

module.exports = { ROOT, PROD, PAID, DIR, ITEMS, OUT, JUDGED, ARCH, ELEMENTS, ROOMS, YEON_SLOTS, LINE, YEON_FILE, readWin, roomData, yeonData, buildItems, emptyYeon, writeYeon, setRoomLines, valueOf, textOf, len, loadItems, saveItems };
