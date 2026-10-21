// 11단계 F3: 책 분량 표(숫자만) 생성 → products/strange-oracle/data-volume.js
// 실행: node tools/strange-oracle/make-volume.js
// 표는 글자 수(공백 포함)만 담는다. 유료 문장은 한 글자도 넣지 않는다.
// 세는 방식은 app.js renderReport(책)와 같다: 여는 글 + 방마다(Ⅰ장 공개 핵심 풀이 + ch1Rest + Ⅱ~Ⅳ + 숨은 장 본문) + 시기별 흐름·궁합·원형 심층 + 닫는 글.
// 룬·시빌라 "고른 주제" 단락은 빼고 센다(구매 직후와 재열람이 같은 값, spec 11-6 F3). 숨은 장 제목·구간 표지·관계 이름표도 세지 않는다(app.js SKIP_KEYS).
// (17단계) 방 장에 firstLine·heartLine을 함께 센다. 인연의 장은 V.yeon(칸마다 글자 수, book.js yeonTable)이고, 그 사람이 받는 판의 값은 book.js yeonVolume이 고른다.
// (18단계 18-6, 결정 117) 방 장 첫 줄(firstLine)은 공개 맛보기(data-book-sample.js)로 옮겼으므로 "받는 것" 분량에서 뺀다 — 이 도구는 data-book-sample.js를 읽지 않는다.
//   미리보기 "이 장의 나머지 약 {n}자"와 결제 전 화면 "받는 것"은 같은 V.room 값(첫 줄을 뺀 값)을 쓴다.
// (18단계 18-9) 새 장 「겹치는 곳, 갈리는 곳」은 V.cross(칸마다 글자 수, book.js crossTable)이고, 그 사람이 받는 판의 값은 book.js crossVolume이 고른다.
//   V.avg.cross = 기본 경로(1·2·3·4·5·6쪽) 칸마다 평균의 합 — 마친 방이 1개일 때 "받는 것"에 쓴다.
// 생성 뒤 무작위 코드 조합으로 "표 합계 = book.js buildReport 실제 글자 수"를 대조한다(불일치면 exit 1). (14단계) 원본 = data-book-free.js + api/_paid/book/
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const SRC = path.join(__dirname, "..", "..", "products", "strange-oracle");
const PayCode = require(path.join(SRC, "paycode.js"));
const Book = require(path.join(SRC, "book.js"));

const w = {};
for (const f of ["data.js", "data-saju.js", "data-runes.js", "data-stars.js", "data-ogham.js", "data-decans.js", "data-tzolkin.js", "data-oracles.js"])
  vm.runInNewContext(fs.readFileSync(path.join(SRC, f), "utf8"), { window: w });
// (14단계 F4-B2) 책 문구: 공개 data-book-free.js(여는·닫는 글) + 유료 원본 api/_paid/book/book-*.js. 숫자만 꺼내고 문장은 쓰지 않는다
const BW = {};
vm.runInNewContext(fs.readFileSync(path.join(SRC, "data-book-free.js"), "utf8"), { window: BW });
const PAID = path.join(SRC, "api", "_paid", "book");
for (const f of fs.readdirSync(PAID).filter((n) => /^book-.*\.js$/.test(n))) vm.runInNewContext(fs.readFileSync(path.join(PAID, f), "utf8"), { window: BW });
const CONTENT = Book.contentFrom(BW);
const core = { buildReport: (c) => Book.buildReport(CONTENT, c) }; // 13단계 core.buildReport와 같은 모양 (book.js)
const T = w.TEXT;
const strip = (h) => String(h).replace(/<[^>]*>/g, "");
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const len = (s) => [...String(s)].length;
const SKIP = new Set(["id", "room", "me", "you", "other", "band", "grade", "now", "past", "label", "title", "topics"]);
function charsOf(v) {
  if (typeof v === "string") return len(v);
  if (Array.isArray(v)) return v.reduce((a, x) => a + charsOf(x), 0);
  if (v && typeof v === "object") return Object.entries(v).reduce((a, [k, x]) => a + (SKIP.has(k) ? 0 : charsOf(x)), 0);
  return 0;
}
const ARCH = PayCode.ARCHETYPES;
const ROOMS = PayCode.CHAPTER_ORDER;
const PUB = { star: w.NAKSHATRAS, ogham: w.OGHAM, decan: w.DECANS, tzolkin: w.TZOLKIN_SIGNS, sibyl: w.ORACLES };

// ── 실제 글자 수 (app.js renderReport와 같은 셈)
function bookCh1Len(room, c, rest) {
  if (room === "saju") {
    const st = w.SAJU.stems[Book.sajuStem(c.saju)];
    return [st.identity.title, st.identity.lede, ...st.body, ...(rest || [])].reduce((a, t) => a + len(strip(t)), 0);
  }
  if (room === "rune") {
    const rs = c.rune.map((i) => w.RUNES[i]);
    const R = T.rune.result;
    let n = len(strip(fill(R.ch1Lede, { past: rs[0].name, now: rs[1].name, next: rs[2].name })));
    rs.forEach((r, i) => {
      n += len(strip(fill(R.ch1Sub, { norn: T.rune.norns[i].name, name: r.name })));
      r.identity.concat((rest && rest[i]) || []).forEach((t) => (n += len(strip(t))));
    });
    return n;
  }
  const e = room === "tzolkin" ? PUB.tzolkin[c.tzolkin.sign] : PUB[room][c[room]];
  return [e.identity.lede, ...e.identity.body, ...(rest || [])].reduce((a, t) => a + len(strip(t)), 0);
}
function actual(c) {
  const rep = core.buildReport(c);
  const ch = Object.fromEntries(rep.chapters.map((x) => [x.id, x]));
  let n = charsOf(ch.open.paragraphs);
  for (const fr of ch.rooms.rooms) n += bookCh1Len(fr.room, c, fr.ch1Rest) + charsOf([fr.ch2, fr.ch3, fr.ch4, fr.hidden.paragraphs, fr.firstLine, fr.heartLine]);
  return n + charsOf([ch.timeline, ch.match, ch.deep]) + charsOf(ch.close.paragraphs);
}

// ── 표 만들기: 한 방 = 그 방만 있는 코드로 재고, 나머지 부분은 따로 잰다
const base = { arch: ARCH[0], band: 0, partner: null, relOgham: null, relDecan: null, relTzolkin: null };
function roomOnly(room, val) {
  const c = Object.assign({}, base, { [room]: val });
  const rep = core.buildReport(c);
  const fr = rep.chapters.find((x) => x.id === "rooms").rooms[0];
  return bookCh1Len(room, c, fr.ch1Rest) + charsOf([fr.ch2, fr.ch3, fr.ch4, fr.hidden.paragraphs, fr.firstLine, fr.heartLine]);
}
const V = { room: {}, rune: {}, open: {}, close: {}, deep: {}, timeline: {}, map: {}, pair: {}, rel: {}, avg: {}, yeon: Book.yeonTable(BW.BOOK_YEON), cross: Book.crossTable(BW.BOOK_CROSS), year: Book.yearTable(BW.BOOK_YEAR) }; // (20단계) year = 일간 0~9 + unknown
// 만신: 일간 10 × 우세 묶음 5 = 50칸, 칸 번호 = 일간*5 + 묶음 (app.js chapterChars와 같은 식). 대표 코드 = 그 일간·묶음의 첫 코드
const sajuCode = (s, g) => s * 500 + g * 2 + 1;
V.room.saju = [];
for (let s = 0; s < 10; s++) for (let g = 0; g < 5; g++) V.room.saju.push(roomOnly("saju", sajuCode(s, g)));
V.room.ogham = w.OGHAM.map((_, i) => roomOnly("ogham", i));
V.room.star = w.NAKSHATRAS.map((_, i) => roomOnly("star", i));
V.room.decan = w.DECANS.map((_, i) => roomOnly("decan", i));
V.room.tzolkin = w.TZOLKIN_SIGNS.map((_, s) => roomOnly("tzolkin", { number: 1, sign: s }));
V.room.sibyl = w.ORACLES.map((_, i) => roomOnly("sibyl", i));
// 룬: 세 돌의 자리(지나온·지금·다가올)별 몫으로 나눈다. 몫 = 합계(a,b,c)에서 다른 자리를 고정해 빼서 구한다
const NR = w.RUNES.length;
const rune3 = (a, b, x) => roomOnly("rune", [a, b, x]);
const r0 = rune3(0, 1, 2); // 기준 조합: past[0] = now[1] = next[2] = 0, base = r0
const free = (...ban) => { const out = []; for (let k = 0; out.length < 2; k++) if (!ban.includes(k)) out.push(k); return out; };
V.rune.past = w.RUNES.map((_, i) => { const [y, z] = free(i, 0); return rune3(i, y, z) - rune3(0, y, z); });
V.rune.now = w.RUNES.map((_, i) => { const [x, z] = free(i, 1); return rune3(x, i, z) - rune3(x, 1, z); });
V.rune.next = w.RUNES.map((_, i) => { const [x, y] = free(i, 2); return rune3(x, y, i) - rune3(x, y, 2); });
V.rune.base = r0;

const parts = (c) => Object.fromEntries(core.buildReport(c).chapters.map((x) => [x.id, x]));
for (const a of ARCH) {
  const ch = parts(Object.assign({}, base, { arch: a }));
  V.open[a] = charsOf(ch.open.paragraphs);
  V.close[a] = charsOf(ch.close.paragraphs);
  V.deep[a] = charsOf(ch.deep);
  V.map[a] = charsOf(ch.match);
  V.timeline[a] = [0, 1, 2, 3, 4, 5, 6].map((b) => charsOf(parts(Object.assign({}, base, { arch: a, band: b })).timeline));
}
for (const a of ARCH) for (const b of ARCH) {
  const k = ARCH.indexOf(a) <= ARCH.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
  if (V.pair[k] == null) V.pair[k] = charsOf(Object.assign({}, parts(Object.assign({}, base, { arch: a, partner: b })).match, { rooms: [] }));
}
for (const [room, key] of [["ogham", "relOgham"], ["decan", "relDecan"], ["tzolkin", "relTzolkin"]])
  for (let g = 0; g < 6; g++) {
    let m;
    try {
      m = parts(Object.assign({}, base, { partner: ARCH[0], [key]: g })).match;
    } catch (e) {
      break;
    }
    if (!m.rooms.length || m.rooms[0].text == null) break;
    V.rel[`${room}-g${g}`] = charsOf(m.rooms);
  }
const mean = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
for (const r of ["saju", "ogham", "star", "decan", "tzolkin", "sibyl"]) V.avg[r] = mean(V.room[r]);
V.avg.rune = V.rune.base + mean(V.rune.past) + mean(V.rune.now) + mean(V.rune.next);
V.avg.open = mean(Object.values(V.open));
V.avg.close = mean(Object.values(V.close));
V.avg.deep = mean(Object.values(V.deep));
V.avg.map = mean(Object.values(V.map));
V.avg.timeline = mean([].concat(...Object.values(V.timeline)));
{
  const X = V.cross;
  const all2 = (o) => [].concat(...Object.values(o).map((x) => Object.values(x)));
  V.avg.cross = mean(all2(X.shape)) + mean(all2(X.common)) + mean(Object.values(X.split)) + mean(Object.values(X.lens)) + mean(Object.values(X.pair)) + mean(Object.values(X.close));
}

// ── 표로 계산 (app.js bookVolume과 같은 식)
function fromTable(c) {
  let n = V.open[c.arch] + V.close[c.arch] + V.deep[c.arch] + V.timeline[c.arch][c.band];
  for (const r of ROOMS) {
    if (c[r] == null) continue;
    n += r === "saju" ? V.room.saju[Book.sajuStem(c.saju) * 5 + Book.sajuGroup(c.saju)] : r === "rune" ? V.rune.base + V.rune.past[c.rune[0]] + V.rune.now[c.rune[1]] + V.rune.next[c.rune[2]] : r === "tzolkin" ? V.room.tzolkin[c.tzolkin.sign] : V.room[r][c[r]];
  }
  if (c.partner) {
    const ia = ARCH.indexOf(c.arch), ib = ARCH.indexOf(c.partner);
    n += V.pair[ia <= ib ? `${c.arch}-${c.partner}` : `${c.partner}-${c.arch}`];
    [["ogham", c.relOgham], ["decan", c.relDecan], ["tzolkin", c.relTzolkin]].forEach(([r, g]) => g != null && (n += V.rel[`${r}-g${g}`]));
  } else n += V.map[c.arch];
  return n;
}
const rnd = (n) => Math.floor(Math.random() * n);
const relMax = (r) => Object.keys(V.rel).filter((k) => k.startsWith(r + "-")).length;
let bad = 0, checked = 0;
for (let t = 0; t < 3000; t++) {
  const rune = [];
  while (rune.length < 3) { const x = rnd(NR); if (!rune.includes(x)) rune.push(x); }
  const partner = t % 2 ? ARCH[rnd(ARCH.length)] : null;
  const c = {
    arch: ARCH[rnd(ARCH.length)], band: rnd(7), partner,
    relOgham: partner && t % 3 ? rnd(relMax("ogham")) : null, relDecan: partner && t % 5 ? rnd(relMax("decan")) : null, relTzolkin: partner && t % 7 ? rnd(relMax("tzolkin")) : null,
    saju: 1 + rnd(5000), ogham: rnd(w.OGHAM.length), star: rnd(w.NAKSHATRAS.length), decan: rnd(w.DECANS.length), tzolkin: { number: 1 + rnd(13), sign: rnd(w.TZOLKIN_SIGNS.length) }, rune, sibyl: rnd(w.ORACLES.length),
  };
  if (t % 10 === 9) ["star", "decan", "tzolkin", "rune", "sibyl"].slice(rnd(5)).forEach((r) => (c[r] = null)); // 방 일부만
  if (t % 4 === 3) c.saju = null; // 만신 미완(옛 상태)
  checked++;
  if (fromTable(c) !== actual(c)) bad++;
}
// (17단계) 인연의 장: 판(기본·한결같은 결·나이 모름·만신 미방문, 19세 미만판 없음 — 결정 114)마다 표 값 = 실제 조립 글자 수
let yeonBad = 0;
for (let t = 0; t < 3000; t++) {
  const ctx = { arch: ARCH[rnd(8)], sub: t % 3 ? ARCH[rnd(8)] : null, allDone: t % 2 === 0, band: t % 5 ? rnd(7) : null, stem: t % 4 ? rnd(10) : null };
  if (!ctx.sub) ctx.sub = ctx.arch;
  checked++;
  if (Book.yeonVolume(V.yeon, ctx) !== Book.yeonChars(Book.yeonChapter(CONTENT, ctx))) yeonBad++;
}
bad += yeonBad;
// (18단계) 새 장: 방 2~7개 무작위 조합(대체 경로 포함)마다 표 값 = 실제 조립 글자 수
const AK = require(path.join(SRC, "arch-core.js"));
let crossBad = 0;
for (let t = 0; t < 3000; t++) {
  const n = 2 + rnd(6);
  const same = t % 7 === 0 ? ARCH[rnd(8)] : null; // 가끔 모두 같은 원형(한결같은 목소리·고른 결 경로)
  const list = ROOMS.slice(0, n).map((room) => ({ room, arch: same || ARCH[rnd(8)] }));
  const pick = Book.crossPick(list, AK);
  checked++;
  if (Book.crossVolume(V.cross, pick) !== Book.crossChars(Book.crossChapter(CONTENT, pick))) crossBad++;
}
bad += crossBad;
// (20단계) 「2027년의 흐름」: 일간 10판 + 공통판마다 표 값 = 실제 조립 글자 수
let yearBad = 0;
for (const stem of [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  checked++;
  if (Book.yearVolume(V.year, { stem }) !== Book.yearChars(Book.yearChapter(CONTENT, { stem }))) yearBad++;
}
bad += yearBad;
const out = `// 책 분량 표 — 숫자(글자 수, 공백 포함)만. 문구·로직 없음. 손으로 고치지 않는다.
// 자동 생성: node tools/strange-oracle/make-volume.js (유료 문구를 고친 뒤 다시 실행). spec 11-6 F3 "원본 하나".
// 룬·시빌라 "고른 주제" 단락은 빼고 센 값이다. app.js bookVolume()만 이 표를 읽는다.
window.BOOK_VOLUME = ${JSON.stringify(V)};
`;
if (process.argv.includes("--check")) {
  // 시험용: 파일을 쓰지 않고 지금 유료·공개 문구로 다시 만든 표가 커밋된 data-volume.js와 같은지만 본다
  const same = fs.readFileSync(path.join(SRC, "data-volume.js"), "utf8") === out;
  console.log(`대조 ${checked}건 중 불일치 ${bad}건`);
  console.log(same ? "data-volume.js 최신" : "data-volume.js가 낡음 — node tools/strange-oracle/make-volume.js 다시 실행");
  process.exit(same && !bad ? 0 : 1);
}
fs.writeFileSync(path.join(SRC, "data-volume.js"), out);
console.log(`data-volume.js 생성 (${out.length}바이트). 대조 ${checked}건 중 불일치 ${bad}건. 평균: ${JSON.stringify(V.avg)}`);
if (bad) process.exit(1);
