// 책 조립 단위 시험 (book.js). 14단계 F4-B2: core.js 동일성 시험(13-7의 6)은 은퇴하고 이동 무손실(tests.md 「14단계 · 유료 원본 이동」)로 대신한다.
// 지금 보는 것: 12장 조립(만신 포함) 빈칸·undefined 0, 만신 장 일간 10 × 묶음 5, 궁합 모듈 조립(13-7의 8), 다양성 실측(→ out/book-variety.txt).
// 문구는 공개 data-book-free.js + 유료 원본 api/_paid/book/book-*.js (함수 book이 주는 것과 같은 값).
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
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
load("data-saju.js");
load("data-book-free.js");
fs.readdirSync(path.join(PROD, "api", "_paid", "book")).filter((f) => /^book-.*\.js$/.test(f)).forEach((f) => load(path.join("api", "_paid", "book", f)));
const plain = (x) => JSON.parse(JSON.stringify(x));
const PUB = plain(Book.contentFrom(W)); // 브라우저가 받는 것과 같은 전역(BOOK_FREE·BOOK_SAJU…BOOK_ARCH)으로 묶은 문구
const BOND = PUB.bond;

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
  // 일곱 방 모두 + 상대 없음(궁합 지도) 원형마다
  for (let a = 0; a < 8; a++) out.push({ arch: ARCH[a], band: a % 7, saju: a * 600 + a * 2 + 1, ogham: a, star: a, decan: a, tzolkin: { number: a + 1, sign: a }, rune: [a, a + 1, a + 2], sibyl: a, partner: null });
  // 만신: 일간 10 × 우세 묶음 5
  for (let s = 0; s < 10; s++) for (let g = 0; g < 5; g++) out.push({ arch: ARCH[(s + g) % 8], band: g, saju: s * 500 + g * 2 + 1 + (s % 2) });
  return out;
}

// 문자열 전부가 비어 있지 않고 undefined·{자리} 없음
function allText(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allText(x, out));
  // 만신 숨은 장 제목은 유료 파일에 없고 공개 data-saju.js groups[묶음].hiddenTitle에만 있다(app.js sajuHiddenTitle) → 그 칸만 뺀다
  else if (v && typeof v === "object")
    Object.entries(v).forEach(([k, x]) => {
      if (k === "codes") return;
      allText(v.room === "saju" && k === "hidden" ? Object.assign({}, x, { title: "-" }) : x, out);
    });
  else if (v === undefined) out.push(undefined);
  return out;
}
test("12장 조립: 표본 전부(만신 포함) 빈 칸·undefined 0, 결정적", () => {
  const S = samples();
  for (const c of S) {
    const r = Book.buildReport(PUB, c);
    // (17단계) 방 장의 firstLine·heartLine은 copywriter가 채우기 전 빈칸("")이 허용된다(그리지 않음). 채움은 check-17이 본다
    const t = allText(JSON.parse(JSON.stringify(r.chapters, (k, v) => ((k === "firstLine" || k === "heartLine") && v === "" ? undefined : v))));
    assert.ok(t.every((x) => typeof x === "string" && x.trim() && !/undefined|\{\w+\}/.test(x)), JSON.stringify(c));
    assert.deepStrictEqual(Book.buildReport(PUB, c), r);
  }
  assert.ok(S.length >= 450, `표본 ${S.length}개`);
});
test("만신 장: 일간 10 × 우세 묶음 5 = 50 조합, Ⅰ~Ⅳ장·숨은 장 본문이 있고 일간·묶음이 코드대로", () => {
  const Saju = require(path.join(PROD, "saju.js"));
  for (let s = 0; s < 10; s++)
    for (let g = 0; g < 5; g++) {
      const code = s * 500 + g * 2 + 1;
      const d = Saju.decodeCode(code);
      assert.strictEqual(Book.sajuStem(code), d.S1);
      assert.strictEqual(Book.sajuGroup(code), ["bigeop", "siksang", "jaeseong", "gwanseong", "inseong"].indexOf(d.S3));
      const fr = Book.fullRoom(PUB, "saju", { saju: code });
      assert.ok(fr.ch1Rest.length && fr.ch2.length > 2 && fr.ch3.length > 2 && fr.ch4.length > 1 && fr.hidden.paragraphs.length, code);
      assert.strictEqual(fr.hidden.paragraphs[0], PUB.hidden.saju[g].body[0]);
    }
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

// ════ 함수 book (netlify/lib/book.js) — 14단계 F4-B2 시험을 pay.test.js에서 옮기고 15단계 Blobs 확인을 더함 ════
// 15-6 "book.test.js": Blobs paid 통과, cancelled 403, 읽기 실패 503(틀린 시도로 안 셈), 환경 변수 수동 코드 통과 유지. 합격 28.
// 시험 코드·비밀값은 이 실행 안에서 무작위로 만들고 버린다(파일·저장소에 쓰지 않음).
{
  const crypto = require("crypto");
  const { execFileSync } = require("child_process");
  const ROOT = path.resolve(__dirname, "..", "..");
  const PAIDDIR = path.join(PROD, "api", "_paid", "book");
  const Fn = require(path.join(ROOT, "netlify", "lib", "book.js"));
  const Pay = require(path.join(ROOT, "netlify", "lib", "pay.js"));
  const { MemStore } = require("./mem-store.js");
  const { Pass } = PayCode;
  const CODE = Pass.make();
  const SECRET = crypto.randomBytes(32).toString("hex");
  const ENV = { PASS_MODE: "test", BOOK_PASS_HASHES: Fn.hashOf(CODE), PASS_SECRET: SECRET };
  let ipN = 0;
  const call = async (body, opts = {}) => {
    const r = await Fn.handle({ method: opts.method || "POST", body: typeof body === "string" ? body : JSON.stringify(body), ip: opts.ip || `10.0.0.${++ipN}` }, opts.env || ENV, PAIDDIR, opts.now, opts.store || null);
    return Object.assign(r, { json: r.body ? JSON.parse(r.body) : null });
  };
  // 함수 pay가 쓰는 모양 그대로 기록을 만든다
  const paidRecord = (store, mul, state = "paid") => {
    const r = crypto.randomBytes(16).toString("hex");
    const P = Pay.passOf(SECRET, r);
    const ph = Pay.hashOfPass(SECRET, P);
    store.map.set("mul/" + mul, JSON.stringify({ ph, state, at: new Date().toISOString() }));
    store.map.set("pass/" + ph, JSON.stringify({ mul_no: mul, state, at: new Date().toISOString() }));
    return { r, P, ph };
  };

  test("함수 book: 허용 목록은 정확히 13개(17단계 yeon, 18단계 cross, 20단계 year), 유료 원본 파일과 1:1", () => {
    assert.deepStrictEqual([...Fn.ALLOW].sort(), ["arch", "cross", "decan", "flow", "match", "ogham", "rune", "saju", "sibyl", "star", "tzolkin", "year", "yeon"]);
    assert.deepStrictEqual(fs.readdirSync(PAIDDIR).filter((f) => f.endsWith(".js")).map((f) => f.replace(/^book-|\.js$/g, "")).sort(), [...Fn.ALLOW].sort());
  });
  test("함수 book: 수동 코드(BOOK_PASS_HASHES) + 허용 file → 200, no-store, 저장소를 읽지 않음", async () => {
    const store = new MemStore();
    store.failRead = true; // 읽으면 503이 날 상태에서도 수동 코드는 통과
    for (const file of Fn.ALLOW) {
      const r = await call({ pass: Pass.pretty(CODE).toLowerCase(), file }, { store });
      assert.strictEqual(r.status, 200, file);
      assert.strictEqual(r.headers["Cache-Control"], "no-store");
      assert.strictEqual(r.json.file, file);
    }
    assert.strictEqual(store.log.length, 0);
    assert.ok((await call({ pass: CODE, file: "match" })).json.data.bond.first, "궁합 다양화 모듈(bond) 포함");
  });
  test("함수 book (2026-10-25 운영자): 만신의 장(saju)도 유료 — 코드 없음·빈 코드·틀린 코드 401, 맞는 코드 200", async () => {
    for (const pass of ["", "SOP-0000-0000-0000"]) assert.strictEqual((await call({ pass, file: "saju" }, { store: new MemStore() })).status, 401, JSON.stringify(pass));
    const ok = await call({ pass: CODE, file: "saju" });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.json.file, "saju");
  });
  test("함수 book: 허용 목록 밖 file 400, 두 칸뿐, 405", async () => {
    for (const file of ["../x", "book-ogham", "OGHAM", "ogham.js", "../../../etc/passwd", "", "open", "close", ["ogham"], null])
      assert.strictEqual((await call({ pass: CODE, file })).status, 400, JSON.stringify(file));
    assert.strictEqual((await call({ pass: CODE, file: "arch", name: "김서윤" })).status, 400);
    assert.strictEqual((await call({ pass: CODE, file: "arch", codes: 532 })).status, 400);
    assert.strictEqual((await call({ pass: CODE })).status, 400);
    assert.strictEqual((await call("not json")).status, 400);
    assert.strictEqual((await call("x".repeat(600))).status, 400);
    assert.strictEqual((await call({ pass: CODE, file: "arch" }, { method: "GET" })).status, 405);
  });
  test("함수 book: 틀린 코드 401, 같은 IP 10분 10회 넘으면 429, 10분 뒤 풀림", async () => {
    const ip = "10.9.9.9";
    const now = 1_000_000;
    const wrong = Pass.make();
    for (let i = 0; i < 10; i++) assert.strictEqual((await call({ pass: wrong, file: "arch" }, { ip, now: now + i, store: new MemStore() })).status, 401, `틀림 ${i + 1}`);
    assert.strictEqual((await call({ pass: CODE, file: "arch" }, { ip, now: now + 20 })).status, 429);
    assert.strictEqual((await call({ pass: "SOP-모양틀림", file: "arch" }, { ip: "10.9.9.8", now })).status, 401);
    assert.strictEqual((await call({ pass: CODE, file: "arch" }, { ip, now: now + 10 * 60 * 1000 + 1 })).status, 200);
    assert.strictEqual((await call({ pass: CODE, file: "arch" }, { ip: "10.9.9.7", now })).status, 200, "다른 IP는 영향 없음");
  });
  test("함수 book: PASS_MODE가 비면 503, 해시가 비면 401, 여러 수동 코드", async () => {
    assert.strictEqual((await call({ pass: CODE, file: "arch" }, { env: {} })).status, 503);
    assert.strictEqual((await call({ pass: CODE, file: "arch" }, { env: { PASS_MODE: "live", BOOK_PASS_HASHES: "" } })).status, 401);
    assert.strictEqual((await call({ pass: CODE, file: "arch" }, { env: { PASS_MODE: "live", BOOK_PASS_HASHES: `${Fn.hashOf(Pass.make())},${ENV.BOOK_PASS_HASHES}` } })).status, 200);
  });
  test("함수 book (15단계): Blobs pass/ paid → 200, cancelled → 403 cancelled, 기록 없음 → 401", async () => {
    const store = new MemStore();
    const a = paidRecord(store, "1001");
    const r1 = await call({ pass: Pass.pretty(a.P), file: "arch" }, { store });
    assert.strictEqual(r1.status, 200);
    assert.deepStrictEqual(store.log.map((l) => l[1]), ["pass/" + a.ph, "cancel/1001"], "pass/·cancel/ 두 번 읽기");
    const c = paidRecord(store, "1002", "cancelled");
    const r2 = await call({ pass: c.P, file: "arch" }, { store });
    assert.strictEqual(r2.status, 403);
    assert.deepStrictEqual(r2.json, { error: "cancelled" });
    assert.strictEqual((await call({ pass: Pass.make(), file: "arch" }, { store })).status, 401);
  });
  test("함수 book (합격 28): pass/가 paid라도 cancel/<mul_no>가 있으면 403, cancel/ 읽기 실패면 503", async () => {
    const store = new MemStore();
    const a = paidRecord(store, "2001");
    store.map.set("cancel/2001", JSON.stringify({ mul_no: "2001", state: "cancelled", at: new Date().toISOString() }));
    assert.strictEqual((await call({ pass: a.P, file: "arch" }, { store })).status, 403);
    const b = paidRecord(store, "2002");
    store.failRead = (k) => k.startsWith("cancel/");
    assert.strictEqual((await call({ pass: b.P, file: "arch" }, { store })).status, 503);
  });
  test("함수 book (검수 E): Blobs 읽기 실패 → 503, 틀린 시도로 세지 않음(12번 실패 뒤에도 429 아님)", async () => {
    const store = new MemStore();
    const a = paidRecord(store, "3001");
    store.failRead = true;
    const ip = "10.7.7.7";
    for (let i = 0; i < 12; i++) assert.strictEqual((await call({ pass: a.P, file: "arch" }, { store, ip })).status, 503);
    store.failRead = false;
    assert.strictEqual((await call({ pass: a.P, file: "arch" }, { store, ip })).status, 200);
  });
  test("함수 book: PASS_SECRET이 비었거나 32바이트 미만이면 Blobs를 읽지 않고 401", async () => {
    const store = new MemStore();
    const a = paidRecord(store, "4001");
    for (const s of ["", "short", "x".repeat(31)]) {
      store.log = [];
      assert.strictEqual((await call({ pass: a.P, file: "arch" }, { store, env: Object.assign({}, ENV, { PASS_SECRET: s }) })).status, 401);
      assert.strictEqual(store.log.length, 0);
    }
  });
  test("함수 book: 새 형식(v2) respond — 웹 Request를 받아 Response(no-store), IP는 context.ip", async () => {
    const env = { PASS_MODE: "test", BOOK_PASS_HASHES: ENV.BOOK_PASS_HASHES };
    const req = new Request("https://x.example/api/book", { method: "POST", body: JSON.stringify({ pass: CODE, file: "flow" }) });
    const r = await Fn.respond(req, { ip: "10.1.1.1" }, () => { throw new Error("수동 코드는 저장소를 열지 않는다"); }, env);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("Cache-Control"), "no-store");
    assert.strictEqual((await r.json()).file, "flow");
  });
  test("열람 코드 모양: SOP+12+검사 1자, 표기·소문자·헷갈리는 글자, SO1·SOG는 따로", () => {
    for (let i = 0; i < 200; i++) {
      const c = Pass.make();
      assert.match(c, /^SOP[0-9A-HJKMNP-TV-Z]{13}$/);
      assert.strictEqual(Pass.normalize(Pass.pretty(c).toLowerCase()), c);
      assert.deepStrictEqual(Pass.check(` ${Pass.pretty(c)} `), { pass: c });
      const bad = c.slice(0, 8) + (c[8] === "0" ? "1" : "0") + c.slice(9);
      assert.strictEqual(Pass.check(bad).error, "shape");
    }
    assert.strictEqual(Pass.check("SO1-ABCD-EFGH").error, "receipt");
    assert.strictEqual(Pass.check("SOG2-ABCD-EFGH-JKMN").error, "resume");
    assert.strictEqual(Pass.check("").error, "shape");
    assert.ok(Pass.looksPass("sop-1234") && !Pass.looksPass("SOG2"));
  });
  test("make-pass: 코드·해시만 터미널에, 해시 = 함수가 쓰는 해시, 파일을 쓰지 않음", () => {
    const before = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
    const out = execFileSync(process.execPath, [path.join(__dirname, "make-pass.js"), "2"], { encoding: "utf8" });
    const codes = [...out.matchAll(/코드 \d: (SOP-\S+)/g)].map((m) => m[1]);
    const hashes = [...out.matchAll(/해시 \d: ([0-9a-f]{64})/g)].map((m) => m[1]);
    assert.strictEqual(codes.length, 2);
    codes.forEach((c, i) => assert.strictEqual(Fn.hashOf(c), hashes[i]));
    assert.ok(out.includes(`BOOK_PASS_HASHES=${hashes.join(",")}`));
    assert.strictEqual(execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }), before);
  });
}
