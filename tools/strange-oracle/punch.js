// 방 결과 "찌르는 한 줄" 손보기 도구 (2026-10-24, 운영자 "방마다 수위를 세게, 속마음을 콕 찌르기, 유료 장까지").
// 결과마다 바로 꽂히는 칸만 고친다: 무료 = key(카드·공유 한 줄)·identity.lede(핵심 풀이 첫 문장)·event.hook(떡밥)·turn(반전 카드)
//                                 유료 = event.quote·shadow.hook·shadow.lede·shadow.quote·heartLine·숨은 장 제목 (룬은 now.hook·now.quote·past.lede)
//   node tools/strange-oracle/punch.js dump <방>   → tools/strange-oracle/punch/<방>.json (old·max가 찬 작업표, new는 빈칸)
//   node tools/strange-oracle/punch.js apply <방>  → new가 찬 줄을 검사(길이·금지어·성별어)한 뒤 원본 파일의 그 문자열을 바꾼다. 하나라도 걸리면 아무것도 쓰지 않는다
// 원본에서 같은 문자열이 정확히 한 번 나와야 바꾼다(두 번 이상·0번이면 실패).
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const P = path.join(ROOT, "products", "strange-oracle");
const PAID = path.join(P, "api", "_paid", "book");
const DIR = path.join(__dirname, "punch");

const ROOMS = {
  ogham: { pub: "data-ogham.js", list: "OGHAM", paid: "book-ogham.js", g: "BOOK_OGHAM" },
  star: { pub: "data-stars.js", list: "NAKSHATRAS", paid: "book-star.js", g: "BOOK_STAR" },
  decan: { pub: "data-decans.js", list: "DECANS", paid: "book-decan.js", g: "BOOK_DECAN" },
  tzolkin: { pub: "data-tzolkin.js", list: "TZOLKIN_SIGNS", paid: "book-tzolkin.js", g: "BOOK_TZOLKIN" },
  sibyl: { pub: "data-oracles.js", list: "ORACLES", paid: "book-sibyl.js", g: "BOOK_SIBYL" },
  rune: { pub: "data-runes.js", list: "RUNES", paid: "book-rune.js", g: "BOOK_RUNE" },
  saju: { pub: "data-saju.js", list: null, paid: "book-saju.js", g: "BOOK_SAJU" },
};
const load = (file) => {
  const w = {};
  new Function("window", fs.readFileSync(file, "utf8"))(w);
  return w;
};
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);

function items(room) {
  const R = ROOMS[room];
  const pubW = load(path.join(P, R.pub));
  const paidW = load(path.join(PAID, R.paid));
  const B = paidW[R.g];
  const out = [];
  const add = (file, id, field, old, max) => old && out.push({ file, id, field, max, old, new: "" });
  const pubList = room === "saju" ? Object.values(pubW.SAJU.stems) : pubW[R.list];
  pubList.forEach((e) => {
    const id = e.code;
    add(R.pub, id, "key", e.key, room === "saju" ? 90 : 60);
    if (room === "rune") add(R.pub, id, "now.hook", get(e, "now.hook"), 45);
    else {
      add(R.pub, id, "identity.lede", get(e, "identity.lede"), 80);
      add(R.pub, id, "event.hook", get(e, "event.hook"), 45);
    }
    if (e.turn) add(R.pub, id, "turn", e.turn, 180);
  });
  B.full.forEach((f) => {
    const id = f.code;
    if (room === "rune") {
      add(R.paid, id, "past.lede", get(f, "past.lede"), 80);
      add(R.paid, id, "now.quote", get(f, "now.quote"), 50);
    } else add(R.paid, id, "event.quote", get(f, "event.quote"), 50);
    add(R.paid, id, "shadow.hook", get(f, "shadow.hook"), 45);
    add(R.paid, id, "shadow.lede", get(f, "shadow.lede"), 80);
    add(R.paid, id, "shadow.quote", get(f, "shadow.quote"), 50);
    add(R.paid, id, "heartLine", f.heartLine, 170);
  });
  if (room !== "saju") (B.hidden || []).forEach((h) => add(R.paid, h.code, "hidden.title", h.title, 16));
  else Object.entries(pubW.SAJU.groups).forEach(([k, g]) => add(R.pub, k, "groups.hiddenTitle", g.hiddenTitle, 16));
  return out;
}

// ── 검사 목록 (check-17.js 금지·성별어와 같은 결 + 정확도 과장)
const W = (word, re, ok) => ({ word, re: re || new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), ok });
const FAIL = [
  ...["반드시", "무조건", "틀림없", "100%", "운명의 상대", "천생연분", "결혼한다", "적중", "정확히 맞"].map((w) => W(w)),
  ...["올해", "내년", "이번 달", "다음 달"].map((w) => W(w)),
  W("○년", /\d{4}\s?년/), W("○살", /\d+\s?살/), W("○세", /\d+\s?세/),
  ...["이별", "헤어지", "영영", "놓치면", "후회할", "늦기 전에", "마지막 기회", "영원히 혼자", "평생 혼자", "버림받", "배신당"].map((w) => W(w)),
  ...["모르면 후회", "지금 아니면", "서두르세요", "피해야", "최악"].map((w) => W(w)),
  ...["스킨십", "키스", "섹시", "몸매", "침대", "입술", "유혹", "관능", "야한", "하룻밤"].map((w) => W(w)),
  ...["바람피", "바람을 피", "외도", "집착"].map((w) => W(w)),
  ...["병원", "질병", "몸살", "두통", "건강", "수명", "치료", "진단", "통증", "우울증", "불면", "수술", "임신", "투병", "입원", "처방"].map((w) => W(w)),
  W("다치", /다치|다쳐/, /마음(이|을)?\s?(다치|다쳐)/),
  W("죽음", /죽음|죽는다|죽게 되|숨지|목숨/),
  W("사고(일)", /교통사고|사고 위험|사고(를 당|가 나|가 날|를 조심|를 겪|가 생기)/),
  W("비하", /한심|멍청|바보|못난|쓸모없|구제불능|패배자/),
];
const GENDER = [
  ...["그녀", "남친", "여친", "남자친구", "여자친구", "남편", "와이프", "신랑", "오빠", "언니", "누나", "남자", "여자", "남성", "여성"].map((w) => W(w)),
  W("아내", /(^|[^가-힣])아내/),
];
function check(it) {
  const t = it.new;
  const why = [];
  if ([...t].length > it.max) why.push(`길이 ${[...t].length} > ${it.max}`);
  for (const w of [...FAIL, ...GENDER]) {
    const s = w.ok ? t.replace(new RegExp(w.ok.source, "g"), "") : t;
    if (w.re.test(s)) why.push(`금지 "${w.word}"`);
  }
  if (/[<>]/.test(t) && it.field !== "turn") why.push("HTML 글자");
  return why;
}

const [cmd, room] = process.argv.slice(2);
if (!ROOMS[room]) throw new Error("방: " + Object.keys(ROOMS).join(" | "));
fs.mkdirSync(DIR, { recursive: true });
const sheet = path.join(DIR, room + ".json");
if (cmd === "dump") {
  const list = items(room);
  fs.writeFileSync(sheet, JSON.stringify(list, null, 1) + "\n");
  console.log(`${room}: ${list.length}줄 → ${path.relative(ROOT, sheet)}`);
} else if (cmd === "merge") {
  // <방>.new.json { id: { 칸: 새 문장 } } → 작업표의 new
  const map = JSON.parse(fs.readFileSync(path.join(DIR, room + ".new.json"), "utf8"));
  const list = JSON.parse(fs.readFileSync(sheet, "utf8"));
  let n = 0;
  const seen = new Set();
  for (const x of list) {
    const v = map[x.id] && map[x.id][x.field];
    if (v != null) {
      x.new = v;
      n++;
      seen.add(x.id + "|" + x.field);
    }
  }
  const unknown = Object.entries(map).flatMap(([id, o]) => Object.keys(o).map((f) => id + "|" + f)).filter((k) => !seen.has(k));
  if (unknown.length) console.log("작업표에 없는 칸: " + unknown.join(", "));
  fs.writeFileSync(sheet, JSON.stringify(list, null, 1) + "\n");
  const bad = list.filter((x) => x.new).map((x) => [x, check(x)]).filter(([, w]) => w.length);
  bad.forEach(([x, w]) => console.log(`걸림 ${x.id} ${x.field}: ${w.join(", ")} — ${x.new}`));
  console.log(`${room}: ${n}줄 채움, 걸림 ${bad.length}`);
} else if (cmd === "apply") {
  const list = JSON.parse(fs.readFileSync(sheet, "utf8")).filter((x) => x.new && x.new !== x.old);
  const bad = list.map((x) => [x, check(x)]).filter(([, w]) => w.length);
  if (bad.length) {
    bad.forEach(([x, w]) => console.log(`실패 ${x.id} ${x.field}: ${w.join(", ")} — ${x.new}`));
    process.exit(1);
  }
  const files = {};
  for (const x of list) {
    const fp = path.join(x.file.startsWith("book-") ? PAID : P, x.file);
    let s = files[fp] ?? fs.readFileSync(fp, "utf8");
    const a = JSON.stringify(x.old);
    const n = s.split(a).length - 1;
    let at = n === 1 ? s.indexOf(a) : -1;
    if (n > 1) {
      // 같은 문장이 여러 결과에 있으면 그 결과(code)의 덩어리 안에서 처음 나오는 것
      const anchor = [`"code": "${x.id}"`, `code: "${x.id}"`, `"code":"${x.id}"`].map((k) => s.indexOf(k)).find((i) => i >= 0);
      at = anchor != null ? s.indexOf(a, anchor) : -1;
    }
    if (at < 0) {
      console.log(`실패 ${x.id} ${x.field}: 원본에서 ${n}번 나옴(자리를 못 찾음)`);
      process.exit(1);
    }
    s = s.slice(0, at) + JSON.stringify(x.new) + s.slice(at + a.length);
    files[fp] = s;
  }
  for (const [fp, s] of Object.entries(files)) fs.writeFileSync(fp, s);
  // 작업표의 old를 새 문장으로 갱신(다시 apply해도 안전)
  const all = JSON.parse(fs.readFileSync(sheet, "utf8")).map((x) => (x.new ? Object.assign(x, { old: x.new }) : x));
  fs.writeFileSync(sheet, JSON.stringify(all, null, 1) + "\n");
  console.log(`${room}: ${list.length}줄 바꿈 (${Object.keys(files).map((f) => path.basename(f)).join(", ")})`);
} else throw new Error("dump | apply");
