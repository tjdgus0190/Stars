// 13단계 E3 단위 시험: 브라우저 책 조립(products/strange-oracle/book.js) = 휴면 서버 core.js buildReport (13-7의 6),
// 궁합 모듈 조립(13-7의 8), 옮긴 파일 무손실(13-5), 다양성 실측(13-7의 9 → out/book-variety.txt).
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
const core = require(path.join(PROD, "api", "_lib", "core.js"));
const Book = require(path.join(PROD, "book.js"));
const PayCode = require(path.join(PROD, "paycode.js"));
const ARCH = PayCode.ARCHETYPES;
const ORDER = PayCode.CHAPTER_ORDER;
const TYPES = ["lover", "friend", "work", "family"];

// 공개 파일을 브라우저처럼 한 window에 읽는다
const W = { console };
W.window = W;
const load = (f) => vm.runInNewContext(fs.readFileSync(path.join(PROD, f), "utf8"), W, { filename: f });
["data.js", "data-ogham.js", "data-decans.js", "data-tzolkin.js", "calc.js"].forEach(load);
fs.readdirSync(PROD).filter((f) => /^data-book-.*\.js$/.test(f)).forEach(load);
const plain = (x) => JSON.parse(JSON.stringify(x));
const BOND = plain(W.BOOK_BOND);
const PUB = plain(Book.contentFrom(W)); // 브라우저 경로(data-book-*.js 전역)로 묶은 문구
const SRC = core.CONTENT; // 휴면 서버가 쓰는 원본 문구

// ── 표본 (tests.md 13단계에 같은 정의) ──
function samples() {
  const out = [];
  const base = (i) => ({ arch: ARCH[i % 8], band: i % 7 });
  for (let i = 0; i < 20; i++) out.push(Object.assign(base(i), { ogham: i }));
  for (let i = 0; i < 27; i++) out.push(Object.assign(base(i), { star: i }));
  for (let i = 0; i < 36; i++) out.push(Object.assign(base(i), { decan: i }));
  for (let i = 0; i < 20; i++) out.push(Object.assign(base(i), { tzolkin: { number: (i % 13) + 1, sign: i } }));
  // 룬: 24개가 지나온·지금·다가올 세 자리에 각각 한 번씩 (i, i+1, i+2 mod 24)
  for (let i = 0; i < 24; i++) out.push(Object.assign(base(i), { rune: [i, (i + 1) % 24, (i + 2) % 24] }));
  for (let i = 0; i < 32; i++) out.push(Object.assign(base(i), { sibyl: i }));
  // 흐름 8 × 7
  for (let a = 0; a < 8; a++) for (let b = 0; b < 7; b++) out.push({ arch: ARCH[a], band: b, ogham: (a + b) % 20 });
  // 궁합 36쌍 × 등급(오검 0~2·데칸 0~3·촐킨 0~2를 돌려 가며, 한 묶음은 등급 없음)
  for (let a = 0; a < 8; a++)
    for (let b = a; b < 8; b++)
      for (let k = 0; k < 5; k++) {
        const g = k < 4 ? { relOgham: k % 3, relDecan: k, relTzolkin: k % 3 } : { relOgham: null, relDecan: null, relTzolkin: null };
        out.push(Object.assign({ arch: ARCH[a], band: k % 7, partner: ARCH[b], decan: (a * 8 + b) % 36 }, g));
      }
  // 여섯 방 모두 + 상대 없음(궁합 지도) 원형마다
  for (let a = 0; a < 8; a++) out.push({ arch: ARCH[a], band: a % 7, ogham: a, star: a, decan: a, tzolkin: { number: a + 1, sign: a }, rune: [a, a + 1, a + 2], sibyl: a, partner: null });
  return out;
}

test("동일성: 브라우저 조립 = core.js buildReport (원본 문구, 새 모듈 끔)", () => {
  const S = samples();
  let n = 0;
  for (const c of S) {
    assert.deepStrictEqual(Book.buildReport(SRC, c), core.buildReport(c), JSON.stringify(c));
    n++;
  }
  assert.ok(n >= 400, `표본 ${n}개`);
});

test("동일성: 공개 파일(data-book-*.js)로 묶은 문구 = 원본 문구 (옮긴 직후, 무손실)", (t) => {
  const r = require("./move-book.js").check(require("./move-book.js").plan());
  // 옮긴 뒤 copywriter가 data-book-*.js를 고치면 원본과 달라지는 것이 정상(13-5) → 그때는 건너뛴다
  if (!r.ok) return t.skip("data-book-*.js가 옮긴 뒤 고쳐짐 (원본과 다름은 정상)");
  for (const c of samples().slice(0, 60)) assert.deepStrictEqual(plain(Book.buildReport(PUB, c)), plain(core.buildReport(c)));
});

// ── 궁합 모듈 ──
const relOf = (mine, p) => {
  const O = W.OGHAM;
  const s1 = Math.floor(mine.decan / 3), s2 = Math.floor(p.decan / 3);
  const e1 = s1 % 4, e2 = s2 % 4;
  return {
    relOgham: mine.ogham === p.ogham ? 0 : O[mine.ogham].aicme === O[p.ogham].aicme ? 1 : 2,
    relDecan: s1 === s2 ? 0 : e1 === e2 ? 1 : (e1 + e2) % 2 === 0 ? 2 : 3,
    relTzolkin: mine.tzSign === p.tzSign ? 0 : mine.tzSign % 4 === p.tzSign % 4 ? 1 : 2,
  };
};
const strip = (s) => String(s).replace(/<[^>]*>/g, "");
const peeksOf = (p) => [
  { room: W.TEXT.rooms.ogham.name, name: strip(W.OGHAM[p.ogham].title), key: strip(W.OGHAM[p.ogham].key) },
  { room: W.TEXT.rooms.decan.name, name: strip(W.DECANS[p.decan].title), key: strip(W.DECANS[p.decan].key) },
  { room: W.TEXT.rooms.tzolkin.name, name: strip(W.TZOLKIN_SIGNS[p.tzSign].name), key: strip(W.TZOLKIN_SIGNS[p.tzSign].key) },
];
function matchFor(meArch, mine, youArch, partner, type) {
  const codes = Object.assign({ arch: meArch, partner: youArch }, relOf(mine, partner));
  return Book.matchChapter(PUB, codes, BOND, { type, mine, partner, peeks: peeksOf(partner) });
}
const textOf = (m) => [m.summary, ...m.paragraphs, ...m.rooms.map((r) => r.text), m.end];

test("궁합: 8 × 8 × 4 = 256 조합 빈 칸·undefined 0, 결정적, 마지막 = M1 함께 해 볼 한 가지", () => {
  const mine = { ogham: 3, decan: 7, tzSign: 11 };
  const partner = { ogham: 9, decan: 20, tzSign: 2 };
  let n = 0;
  for (const a of ARCH)
    for (const b of ARCH)
      for (const t of TYPES) {
        const m = matchFor(a, mine, b, partner, t);
        const all = textOf(m);
        assert.ok(all.every((x) => typeof x === "string" && x.trim() && !/undefined|\{(room|name|key)\}/.test(x)), `${a}-${b}-${t}`);
        assert.strictEqual(m.end, BOND.first[t][b].together);
        assert.deepStrictEqual(matchFor(a, mine, b, partner, t), m);
        assert.ok(m.paragraphs.length >= 6 && m.rooms.length === 3);
        n++;
      }
  assert.strictEqual(n, 256);
});

test("궁합: pairUse(skip·lover)·pairOverride·summaryOverride·sidesOverride·roomVariants 적용", () => {
  const mine = { ogham: 0, decan: 0, tzSign: 0 };
  // lover-ruler: skip [4] → 어느 유형에도 원문 4번 문단 없음
  const lr = PUB.match.find((e) => e.code === "lover-ruler");
  for (const t of TYPES) assert.ok(!matchFor("lover", mine, "ruler", mine, t).paragraphs.includes(lr.body[4]));
  // warrior-lover: lover [3] → 연인 유형에만
  const wl = PUB.match.find((e) => e.code === "warrior-lover");
  const fixed3 = (BOND.pairOverride["warrior-lover"] || {})[3] ?? wl.body[3];
  assert.ok(matchFor("warrior", mine, "lover", mine, "lover").paragraphs.includes(fixed3));
  assert.ok(!matchFor("warrior", mine, "lover", mine, "friend").paragraphs.includes(fixed3));
  // 덮어쓰기: warrior-sage 3번 문단은 고친 글로
  if (BOND.pairOverride["warrior-sage"]) assert.ok(matchFor("warrior", mine, "sage", mine, "work").paragraphs.includes(BOND.pairOverride["warrior-sage"][3]));
  // summaryOverride: friend면 고친 요약, lover면 원문
  const so = BOND.summaryOverride && BOND.summaryOverride.friend && BOND.summaryOverride.friend["warrior-lover"];
  if (so) {
    assert.strictEqual(matchFor("warrior", mine, "lover", mine, "friend").summary, so);
    assert.strictEqual(matchFor("warrior", mine, "lover", mine, "lover").summary, wl.summary);
  }
  const sd = BOND.sidesOverride && BOND.sidesOverride.friend && BOND.sidesOverride.friend["warrior-lover"];
  if (sd && sd.lover) assert.ok(matchFor("warrior", mine, "lover", mine, "friend").paragraphs.includes(sd.lover));
  // roomVariants: v = (내 코드 + 상대 코드) mod 3, 0이면 원문
  const og = (o) => matchFor("sage", { ogham: o, decan: 0, tzSign: 0 }, "sage", { ogham: 0, decan: 0, tzSign: 0 }, "friend").rooms[0];
  const g0 = PUB.matchRooms.find((e) => e.code === "ogham-g0");
  assert.strictEqual(og(0).text, g0.text);
  const one = og(1);
  const g1 = PUB.matchRooms.find((e) => e.code === `ogham-g${one.grade}`);
  assert.strictEqual(one.text, (BOND.roomVariants[`ogham-g${one.grade}`] || {})[1] || g1.text);
  assert.strictEqual(one.label, g1.label);
});

// ── 다양성 실측 (13-7의 9): 무작위 두 사람 200쌍 ──
test("다양성 실측 → out/book-variety.txt", () => {
  let seed = 20261003;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const SYL = "가나다라마바사아자차카타파하서윤민지현우준영수희진호은";
  const person = () => {
    let name = "";
    for (let i = 0, n = 2 + Math.floor(rnd() * 2); i < n; i++) name += SYL[Math.floor(rnd() * SYL.length)];
    const y = 1960 + Math.floor(rnd() * 50), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28);
    const og = W.Calc.ogham(name).index;
    const tz = W.Calc.tzolkin(y, m, d).sign;
    const decan = Math.floor(rnd() * 36); // 데칸 계산은 천체 라이브러리(브라우저 CDN)가 필요해 무작위 번호로 대신한다
    const tags = [["ogham", W.OGHAM[og].archetype], ["decan", W.DECANS[decan].archetype], ["tzolkin", W.TZOLKIN_SIGNS[tz].archetype]];
    const tally = {};
    tags.forEach(([r, a], i) => ((tally[a] = tally[a] || { c: 0, f: i }), tally[a].c++));
    const arch = Object.entries(tally).sort((x, y2) => y2[1].c - x[1].c || x[1].f - y2[1].f)[0][0];
    return { arch, ogham: og, decan, tzSign: tz };
  };
  const sents = (m) => textOf(m).flatMap((t) => String(t).match(/[^.?!…]+(?:[.?!…]+[”’"')\]」』]*|$)/g) || []).map((s) => s.trim()).filter(Boolean);
  const diffShare = (A, B) => {
    const a = sents(A), b = new Set(sents(B));
    return a.filter((s) => !b.has(s)).length / a.length;
  };
  const pairs = Array.from({ length: 200 }, () => [person(), person()]);
  // ① 같은 원형 쌍·같은 유형, 다른 두 사람끼리
  const groups = {};
  pairs.forEach(([me, you]) => TYPES.forEach((t) => (groups[`${Book.pairCode(me.arch, you.arch)}|${me.arch}|${t}`] = groups[`${Book.pairCode(me.arch, you.arch)}|${me.arch}|${t}`] || []).push(matchFor(me.arch, me, you.arch, you, t))));
  const same = [];
  Object.values(groups).forEach((list) => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) same.push((diffShare(list[i], list[j]) + diffShare(list[j], list[i])) / 2);
  });
  // ② 같은 두 사람, 유형만 다르게
  const types = [];
  pairs.forEach(([me, you]) => {
    const ms = TYPES.map((t) => matchFor(me.arch, me, you.arch, you, t));
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) types.push((diffShare(ms[i], ms[j]) + diffShare(ms[j], ms[i])) / 2);
  });
  const avg = (l) => (l.reduce((s, x) => s + x, 0) / l.length) * 100;
  const lines = [
    `다양성 실측 (seed 20261003, 무작위 두 사람 200쌍, 문장 단위, 장 전체 = 요약·본문·방별 관계·마지막 문단)`,
    `① 같은 원형 쌍·같은 유형·다른 사람: 비교 ${same.length}쌍, 다른 문장 비율 평균 ${avg(same).toFixed(1)}% (목표 30% 이상)`,
    `② 같은 두 사람·유형만 다름: 비교 ${types.length}쌍, 다른 문장 비율 평균 ${avg(types).toFixed(1)}% (추정 60% 이상)`,
  ];
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", "book-variety.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  assert.ok(same.length > 0 && types.length === 1200);
});
