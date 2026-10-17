// 17단계 문구 도구 공용 부분 (apply-17.js · check-17.js · yeon.test.js가 같이 쓴다). 배포하지 않는다(tools/).
// 유료 문장 원문은 이 파일·items.json에 넣지 않는다. 원문은 api/_paid/book/에만 있다.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..", "..");
const PROD = path.join(ROOT, "products", "strange-oracle");
const PAID = path.join(PROD, "api", "_paid", "book");
// (18단계 J2-a) 단계 인자: 명령줄에 --stage 18이 있으면 진행 폴더 copy-18/(items.json·out/), 원본 book-cross.js. 없으면 17단계(copy-17/) 그대로
const STAGE = (() => {
  const i = process.argv.indexOf("--stage");
  return i > -1 && process.argv[i + 1] === "18" ? 18 : 17;
})();
const DIR = STAGE === 18 ? path.join(__dirname, "..", "copy-18") : __dirname;
const ITEMS = path.join(DIR, "items.json");
const OUT = path.join(DIR, "out");
const JUDGED = path.join(__dirname, "gender-judged.json"); // 성별어 판단은 단계와 관계없이 한 벌(copy-17/)
// 명령줄에서 --stage N을 뺀 나머지 인자
const args = () => {
  const a = process.argv.slice(2);
  const i = a.indexOf("--stage");
  if (i > -1) a.splice(i, 2);
  return a;
};

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

// ── (18단계 18-2·18-10) 새 장 「겹치는 곳, 갈리는 곳」 칸. 원본 api/_paid/book/book-cross.js (window.BOOK_CROSS). 고르기는 book.js crossPick·crossChapter
//   shape.<모양>.<주 원형> 32 · common.<공통 축>.<주 원형> 40 · split.<차이 축> 5 · even.<주 원형> 8 (D 없음, 3쪽 「고른 결」)
//   lens.<홀로 다른 방> 7 · pair.<주 원형>-<홀로 다른 방 원형> 56 · same.<주 원형> 8 (O 없음, 4·5쪽 「한결같은 목소리」) · close.<주 원형> 8 = 164
//   방 2~7개 모든 조합(약 240만)에서 164 열쇠가 모두 나온다(cross.test.js, PROGRESS-18) → 뺀 열쇠 0
//   vars = 그 칸에서 쓸 수 있는 자리 값(check-17 --stage 18이 본다, 18-2 문장 조립 규칙)
const AXES = ["act", "talk", "heart", "order", "free"]; // arch-core.js AXES 순서
const SHAPES = ["one", "two", "trunk", "many"]; // 한 목소리 · 두 갈래 · 굵은 줄기 · 여러 갈래
const PAIRS = ARCH.flatMap((m) => ARCH.filter((x) => x !== m).map((x) => `${m}-${x}`));
const BASE_VARS = ["arch", "sub", "n", "axis"];
const SPLIT_EXTRA = 90; // 3쪽 {high}·{low}에 방 이름이 최대 다섯 개씩 들어간다(방 이름 최대 약 45자 × 2) → max에 더함(18-10)
const CROSS_SLOTS = [
  { batch: "cross-lens", kind: "cross.lens", path: ["lens"], keys: ROOMS, ...range(350), review: "all", by: "홀로 다른 방", vars: [...BASE_VARS, "other", "room"], note: "4쪽 방 렌즈: 그 방 소개 무료 문구와 사실 대조" },
  ...SHAPES.map((sh) => ({ batch: `cross-shape-${sh}`, kind: "cross.shape", path: ["shape", sh], keys: ARCH, ...range(350), ...(sh === "two" || sh === "many" ? { review: "all" } : {}), vars: BASE_VARS })),
  ...AXES.map((ax) => ({ batch: `cross-common-${ax}`, kind: "cross.common", path: ["common", ax], keys: ARCH, ...range(250), by: "공통 축 × 주 원형", vars: BASE_VARS })),
  { batch: "cross-split", kind: "cross.split", path: ["split"], keys: AXES, target: 450, min: Math.round(450 * 0.85), max: Math.round(450 * 1.15) + SPLIT_EXTRA, review: "all", by: "차이 축", vars: [...BASE_VARS, "high", "low"], note: "{high}·{low} 자리 값 몫 max +90" },
  ...Array.from({ length: 7 }, (_, i) => ({ batch: `cross-pair-${i + 1}`, kind: "cross.pair", path: ["pair"], keys: PAIRS.slice(i * 8, i * 8 + 8), ...range(300), review: "all", by: "(주 원형, 홀로 다른 방 원형)", vars: [...BASE_VARS, "other", "room"] })),
  { batch: "cross-even", kind: "cross.even", path: ["even"], keys: ARCH, ...range(300), review: "all", by: "주 원형 (차이 축 없음)", vars: BASE_VARS },
  { batch: "cross-same", kind: "cross.same", path: ["same"], keys: ARCH, ...range(450), review: "all", by: "주 원형 (홀로 다른 방 없음)", vars: BASE_VARS },
  { batch: "cross-close", kind: "cross.close", path: ["close"], keys: ARCH, ...range(300), review: "all", vars: BASE_VARS },
];
const CROSS_FILE = path.join(PAID, "book-cross.js");
const SAMPLE_FILE = path.join(PROD, "data-book-sample.js"); // (18-6, 결정 117) 공개 맛보기: 방 장 첫 줄(firstLine) 169개

const readWin = (file) => {
  const w = {};
  vm.runInNewContext(fs.readFileSync(file, "utf8"), { window: w });
  return w;
};
const roomFile = (r) => path.join(PAID, `book-${r}.js`);
const roomData = (r) => readWin(roomFile(r))[`BOOK_${r.toUpperCase()}`];
const YEON_FILE = path.join(PAID, "book-yeon.js");
const yeonData = () => readWin(YEON_FILE).BOOK_YEON;
const crossData = () => readWin(CROSS_FILE).BOOK_CROSS;
const sampleData = () => readWin(SAMPLE_FILE).BOOK_SAMPLE;

// 방 하나의 full 결과 코드를 chunk개 이하 묶음으로 고르게 나눈다
function chunks(list, max) {
  const n = Math.ceil(list.length / max);
  const size = Math.ceil(list.length / n);
  return Array.from({ length: n }, (_, i) => list.slice(i * size, (i + 1) * size));
}

// items.json 항목 전체 (순서 = 17-6 작업 순서: 인연의 장 기본판 → 대체 → heartLine → firstLine)
function buildItems() {
  if (STAGE === 18) return buildCrossItems();
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
            id: `${kind}.${r}.${code}`, batch: `${kind === "heartLine" ? "heart" : "first"}-${r}-${i + 1}`, file: kind === "firstLine" ? "data-book-sample.js" : `api/_paid/book/book-${r}.js`, path: kind === "firstLine" ? [r, code, kind] : ["full", code, kind], room: r, code, kind, voice: r,
            ...LINE[kind], status: "todo", note: "", ...(r === "rune" ? { note: "룬: 지금 자리에 놓였을 때를 겨냥(17-3)" } : {}),
          })
        )
      );
    }
  return out;
}

// (18단계) items.json 항목 (순서 = 18-10: 4쪽 방 렌즈 → 1쪽 → 2쪽 → 3쪽 → 5쪽 → 대체 → 6쪽)
function buildCrossItems() {
  const out = [];
  for (const s of CROSS_SLOTS)
    for (const k of s.keys)
      out.push({
        id: ["cross", ...s.path, k].join("."),
        batch: s.batch, file: "api/_paid/book/book-cross.js", path: [...s.path, k], room: null, code: k, kind: s.kind, voice: "book",
        target: s.target, min: s.min, max: s.max, status: "todo", note: "", vars: s.vars,
        ...(s.review ? { review: s.review } : {}), ...(s.by ? { by: s.by } : {}), ...(s.note ? { hint: s.note } : {}),
      });
  return out;
}
// 빈 book-cross.js 구조 (키만, 문구 자리는 빈칸)
function emptyCross() {
  const X = {};
  for (const s of CROSS_SLOTS) {
    let o = X;
    s.path.forEach((p) => (o = o[p] = o[p] || {}));
    s.keys.forEach((k) => (o[k] = ""));
  }
  return X;
}
const CROSS_HEAD = `// ═══════════════════════════════════════════════════════════════════════
// 한 권의 책 — 제2부 맨 앞 새 장 「겹치는 곳, 갈리는 곳」(가칭) (유료 원본, spec 18-2). 유료 문장의 유일한 원본이다. 공개 폴더에 복사하지 않는다(CLAUDE.md 7장).
// 함수 book(netlify/functions/book.js, file "cross")만 읽어 열람 코드가 확인된 사람에게 통째로 준다. 고르기는 브라우저(book.js crossPick·crossChapter)가 한다.
// 문구만, 로직 없음. 평문만. 문구는 tools/strange-oracle/apply-17.js --stage 18로 넣는다(손으로 고쳐도 되지만 키 구조는 바꾸지 않는다).
//  1쪽 shape.<one 한 목소리|two 두 갈래|trunk 굵은 줄기|many 여러 갈래>.<주 원형> 32 · 2쪽 common.<공통 축 act|talk|heart|order|free>.<주 원형> 40
//  3쪽 split.<차이 축> 5 · 3쪽 대신 even.<주 원형> 8 (고른 결) · 4쪽 lens.<홀로 다른 방 saju|ogham|star|decan|tzolkin|rune|sibyl> 7
//  5쪽 pair.<주 원형>-<홀로 다른 방 원형> 56 · 4·5쪽 대신 same.<주 원형> 8 (한결같은 목소리) · 6쪽 close.<주 원형> 8
//  자리 값: {arch} 주 · {sub} 보조 · {other} 홀로 다른 방 원형 · {axis} (2쪽 공통 축, 3쪽 차이 축, 그 밖 공통 축) · {room} 홀로 다른 방 · {high}·{low} 방 이름들 · {n} 마친 방 수
// ═══════════════════════════════════════════════════════════════════════
window.BOOK_CROSS = `;
const writeCross = (X) => fs.writeFileSync(CROSS_FILE, CROSS_HEAD + JSON.stringify(X, null, 2) + ";\n");
const SAMPLE_HEAD = `// 낯선 점술관 — 한 권의 책 맛보기: 방 장마다 첫 줄 (18단계 18-6, 운영자 결정 117). 공개 파일이다(유료 문장이 아니라 결제 전 맛보기).
// 문구만, 로직 없음. 방마다 유료 원본 full과 같은 순서·같은 code로 { code, firstLine }. 룬은 "지금" 자리 결과의 첫 줄(17-3).
// 쓰는 곳: 미리보기 「일곱 장의 첫 줄」, 책 장 첫 쪽 맨 앞(book.js fullRoom). 첫 화면에서는 부르지 않는다(app.js가 미리보기·목차·장을 열 때).
// 17단계 QA를 마친 문장을 글자 그대로 옮겼다. 고칠 때는 이 파일에서 고친다(tools/strange-oracle/apply-17.js의 first-<방>-<n> 묶음도 이 파일에 넣는다).
window.BOOK_SAMPLE = `;
const writeSample = (S) => fs.writeFileSync(SAMPLE_FILE, SAMPLE_HEAD + JSON.stringify(S, null, 2) + ";\n");
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
  if (item.room && item.kind === "firstLine") {
    // (18-6) 첫 줄은 공개 파일 data-book-sample.js로 옮겼다 (유료 원본에는 firstLine 키 0)
    const S = (cache.sample = cache.sample || sampleData());
    const e = (S[item.room] || []).find((x) => x.code === item.code);
    return e ? e.firstLine : undefined;
  }
  if (item.room) {
    const d = (cache[item.room] = cache[item.room] || roomData(item.room));
    const e = d.full.find((x) => x.code === item.code);
    return e ? e[item.kind] : undefined;
  }
  if (item.kind.startsWith("cross.")) {
    const X = (cache.cross = cache.cross || crossData());
    return item.path.reduce((o, k) => (o == null ? undefined : o[k]), X);
  }
  const Y = (cache.yeon = cache.yeon || yeonData());
  return item.path.reduce((o, k) => (o == null ? undefined : o[k]), Y);
}
const textOf = (v) => (Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : "");
const len = (s) => [...String(s)].length;

const loadItems = () => JSON.parse(fs.readFileSync(ITEMS, "utf8"));
const saveItems = (items) => fs.writeFileSync(ITEMS, JSON.stringify(items, null, 1) + "\n");

module.exports = { STAGE, args, ROOT, PROD, PAID, DIR, ITEMS, OUT, JUDGED, ARCH, ELEMENTS, ROOMS, AXES, SHAPES, PAIRS, YEON_SLOTS, CROSS_SLOTS, LINE, YEON_FILE, CROSS_FILE, SAMPLE_FILE, readWin, roomData, yeonData, crossData, sampleData, buildItems, buildCrossItems, emptyYeon, emptyCross, writeYeon, writeCross, writeSample, setRoomLines, valueOf, textOf, len, loadItems, saveItems };
