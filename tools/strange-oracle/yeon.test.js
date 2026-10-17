// 17단계 I2 단위 시험: 인연의 장(17-2) 고르기·빠진 경우 표·만 19세 미만·나이 구간·옛 이어가기 코드·"받는 것" 글자 수(검수 2차 권장 5),
// 함수 book의 yeon(본문 두 칸 그대로), 문구 도구(apply-17 줄 넣기가 기존 문장을 바꾸지 않음, check-17 금지·오탐 규칙).
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");

const PROD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
const Book = require(path.join(PROD, "book.js"));
const PayCode = require(path.join(PROD, "paycode.js"));
const Map = require(path.join(PROD, "map.js"));
const Saju = require(path.join(PROD, "saju.js"));
Saju.useLibrary(require("./vendor/lunar.js"));
const L = require("./copy-17/lib.js");
const Check = require("./check-17.js");
const ARCH = PayCode.ARCHETYPES;
const ORDER = PayCode.CHAPTER_ORDER;
const R = PayCode.Resume;

let seed = 20261017;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (n) => Math.floor(rnd() * n);

// 가짜 인연의 장 문구: 칸마다 "칸 이름 + 다른 길이" → 어느 칸이 나갔는지와 글자 수를 함께 본다
function fakeYeon() {
  const Y = L.emptyYeon();
  (function fill(o, p) {
    for (const k of Object.keys(o)) if (typeof o[k] === "object") fill(o[k], p + k + "."); else o[k] = `<${p}${k}>` + "가".repeat(10 + pick(400));
  })(Y, "");
  return Y;
}
const C = { yeon: fakeYeon() };
const V = Book.yeonTable(C.yeon);
const texts = (ch) => ch.pages.flatMap((p) => [p.text].concat((p.bands || []).map((b) => b.text))).filter(Boolean);
const tags = (ch) => texts(ch).map((t) => /^<([^>]+)>/.exec(t)[1]);
const base = { arch: "sage", sub: "rebel", allDone: true, band: 3, teen: false, stem: 2 };
const day = (y, m, d) => new Date(y, m - 1, d, 12);

test("인연의 장 기본판: 1~3·5쪽 주 원형, 4쪽 보조 원형, 6쪽 지금+다음 구간, 7쪽 일간 오행", () => {
  const ch = Book.yeonChapter(C, base);
  assert.strictEqual(ch.variant, "base");
  assert.deepStrictEqual(tags(ch), ["pull.sage", "mirror.sage", "meet.sage", "twist.rebel", "scene.sage", "time.sage-b4", "time.sage-b5", "season.fire"]);
  assert.deepStrictEqual(ch.pages[5].bands.map((b) => [b.band, b.now]), [[3, true], [4, false]]);
  // 마지막 구간이면 그 구간만
  assert.deepStrictEqual(Book.yeonChapter(C, { ...base, band: 6 }).pages[5].bands.map((b) => b.band), [6]);
  // 오행: 갑을=목 … 임계=수 (saju.js STEM_EL과 같음)
  for (let s = 0; s < 10; s++) assert.strictEqual(Book.ELEMENT_OF_STEM[s], Saju.ELEMENTS[Saju.STEM_EL[s]]);
});

test("빠진 경우 표 다섯 줄 (17-2)", () => {
  // ① 보조 = 주: 한결같은 결, 일곱 방 전이면 안내 한 줄
  let ch = Book.yeonChapter(C, { ...base, sub: "sage", allDone: false });
  assert.strictEqual(ch.pages[3].key, "same");
  assert.ok(tags(ch).includes("alt.same.sage") && !tags(ch).some((t) => t.startsWith("twist.")));
  assert.strictEqual(ch.pages[3].note, "more");
  assert.strictEqual(Book.yeonChapter(C, { ...base, sub: "sage", allDone: true }).pages[3].note, null);
  // ② 나이 구간 없음: b1 문장(어느 구간 문장도) 안 나감, 나이와 관계없는 문장 + 안내
  ch = Book.yeonChapter(C, { ...base, band: null });
  assert.ok(!tags(ch).some((t) => t.startsWith("time.")), "나이 모름에 시기 문장");
  assert.ok(tags(ch).includes("alt.notime.sage"));
  assert.strictEqual(ch.pages[5].note, "noAge");
  // ③ 만신 미방문: 계절 쪽 문장 없이 안내 한 줄
  ch = Book.yeonChapter(C, { ...base, stem: null });
  assert.strictEqual(ch.pages[6].text, null);
  assert.strictEqual(ch.pages[6].note, "noSaju");
  // ④ 만 19세 미만: 미성년판 3쪽 + 미성년 계절, 4·6쪽 숨김, 기본판 문장 0
  ch = Book.yeonChapter(C, { ...base, teen: true });
  assert.strictEqual(ch.variant, "teen");
  assert.deepStrictEqual(ch.pages.map((p) => p.key), ["teenKnow", "teenFriend", "teenPlace", "season"]);
  assert.deepStrictEqual(tags(ch), ["alt.teen.know.sage", "alt.teen.friend.sage", "alt.teen.place.sage", "alt.teen.season.fire"]);
  assert.strictEqual(Book.yeonChapter(C, { ...base, teen: true, stem: null }).pages[3].note, "noSaju");
  // ⑤ 옛 이어가기 코드 → 아래 시험
});

test("보조 원형 = 지도 규칙(map.js archPair)과 같음, 주 원형 = 동점이면 앞선 장", () => {
  for (let t = 0; t < 3000; t++) {
    const list = ORDER.map(() => (rnd() < 0.25 ? null : ARCH[pick(t % 3 ? 3 : 8)]));
    assert.deepStrictEqual(Book.archPair(list), Map.archPair(list), JSON.stringify(list));
  }
  assert.deepStrictEqual(Book.archPair(["rebel", "sage", "sage", "rebel", "lover", "lover", "ruler"]), { main: "rebel", sub: "sage" });
  assert.deepStrictEqual(Book.archPair(["lover", null, null, null, null, null, null]), { main: "lover", sub: "lover" });
  assert.strictEqual(Book.archPair([null, null]), null);
});

test("나이 구간 b1·b4·b7 표본과 구간이 바뀌는 생일 경계", () => {
  const today = day(2026, 10, 17);
  const band = (y, m, d) => Book.bandOf(Book.ageOf({ y, m, d }, today));
  assert.strictEqual(band(2004, 1, 1), 0); // 22세 b1
  assert.strictEqual(band(1991, 5, 5), 3); // 35세 b4
  assert.strictEqual(band(1960, 1, 1), 6); // 66세 b7
  // 만 25세 생일 전날 b1 → 당일 b2, 만 50세 생일 전날 b6 → 당일 b7
  assert.strictEqual(band(2001, 10, 18), 0);
  assert.strictEqual(band(2001, 10, 17), 1);
  assert.strictEqual(band(1976, 10, 18), 5);
  assert.strictEqual(band(1976, 10, 17), 6);
});

test("만 19세 생일 전날 = 미성년판, 당일 = 기본판", () => {
  const today = day(2026, 10, 17);
  const ctxOf = (b) => { const age = Book.ageOf(b, today); return { ...base, band: Book.bandOf(age), teen: Book.isTeen(age) }; };
  assert.strictEqual(Book.ageOf({ y: 2007, m: 10, d: 18 }, today), 18);
  assert.strictEqual(Book.yeonChapter(C, ctxOf({ y: 2007, m: 10, d: 18 })).variant, "teen");
  assert.strictEqual(Book.yeonChapter(C, ctxOf({ y: 2007, m: 10, d: 17 })).variant, "base");
  assert.strictEqual(Book.isTeen(null), false, "나이 모름 = 기본판(98번)");
});

test("일간: 시각 모름·23시 30분 표본, 성별만 바꿔도 인연의 장이 같음", () => {
  for (const time of [null, { h: 23, mi: 30 }, { h: 0, mi: 30 }, { h: 9, mi: 5 }]) {
    const outs = ["none", "male", "female"].map((gender) => {
      const r = Saju.compute({ y: 1990, m: 7, d: 14, time, gender });
      assert.strictEqual(Book.sajuStem(r.code), r.dayStem, `시각 ${JSON.stringify(time)}`);
      assert.strictEqual(Book.ELEMENT_OF_STEM[Book.sajuStem(r.code)], r.dayElement);
      return JSON.stringify(Book.yeonChapter(C, { ...base, stem: Book.sajuStem(r.code) }));
    });
    assert.ok(outs.every((o) => o === outs[0]), "성별에 따라 달라짐");
  }
  // 자시(23:30)는 다음 날 일주로 넘기지 않는 규칙이면 같은 날 정오와 같은 일간 (saju.js 주석 기준) — 값만 기록
  const a = Saju.compute({ y: 1990, m: 7, d: 14, time: { h: 23, mi: 30 }, gender: "none" }).dayStem;
  const b = Saju.compute({ y: 1990, m: 7, d: 14, time: { h: 12, mi: 0 }, gender: "none" }).dayStem;
  assert.ok(Number.isInteger(a) && Number.isInteger(b));
});

// 옛 이어가기 코드로 돌아온 탭 = app.js visitsFromCodes처럼 결과 코드 → 원형, 생년월일 없음
const W = {};
for (const f of ["data-saju.js", "data-ogham.js", "data-stars.js", "data-decans.js", "data-tzolkin.js", "data-runes.js", "data-oracles.js"]) vm.runInNewContext(fs.readFileSync(path.join(PROD, f), "utf8"), { window: W });
function ctxFromCodes(c) {
  const arch = {
    saju: c.saju && W.SAJU.stems[Saju.decodeCode(c.saju).S1].archetype, ogham: c.ogham != null && W.OGHAM[c.ogham].archetype, star: c.star != null && W.NAKSHATRAS[c.star].archetype,
    decan: c.decan != null && W.DECANS[c.decan].archetype, tzolkin: c.tzolkin && W.TZOLKIN_SIGNS[c.tzolkin.sign].archetype, rune: c.rune && W.RUNES[c.rune[2]].archetype, sibyl: c.sibyl != null && W.ORACLES[c.sibyl].archetype,
  };
  const pair = Book.archPair(ORDER.map((r) => arch[r] || null));
  return { arch: pair.main, sub: pair.sub, allDone: ORDER.every((r) => arch[r]), band: null, teen: Book.isTeen(null), stem: c.saju ? Book.sajuStem(c.saju) : null };
}
test("옛 이어가기 코드: SOG2는 만신 결과 번호로 일간을 되찾음, SOG1은 만신 없음 → 계절 안내. 둘 다 나이 모름 → b1 안 씀", () => {
  const c2 = { saju: 2 * 500 + 7, ogham: 3, star: 5, decan: 7, tzolkin: null, rune: null, sibyl: null, runeTopic: null, sibylTopic: null };
  const d2 = R.decode(R.encode(c2));
  assert.strictEqual(d2.codes.saju, c2.saju);
  const ctx2 = ctxFromCodes(d2.codes);
  assert.strictEqual(ctx2.stem, 2);
  const ch2 = Book.yeonChapter(C, ctx2);
  assert.strictEqual(ch2.pages[6].note, null);
  assert.ok(!tags(ch2).some((t) => t.startsWith("time.")) && ch2.pages[5].note === "noAge");
  // SOG1 (saju-b1.test.js와 같은 방식으로 만듦)
  const A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let n = 0n;
  const d = { ogham: 3, star: 5, decan: 7 };
  for (const [name, radix] of R.LEGACY.FIELDS) n = n * BigInt(radix) + BigInt(d[name] || 0);
  let p = "";
  for (let i = 0; i < 10; i++) { p = A[Number(n % 32n)] + p; n /= 32n; }
  let s = 0;
  for (let i = 0; i < p.length; i++) s += (2 * i + 1) * A.indexOf(p[i]);
  const d1 = R.decode("SOG1" + p + A[s % 32]);
  assert.strictEqual(d1.codes.saju, null);
  const ch1 = Book.yeonChapter(C, ctxFromCodes(d1.codes));
  assert.strictEqual(ch1.pages[6].note, "noSaju");
  assert.strictEqual(ch1.pages[5].note, "noAge");
  assert.ok(texts(ch1).every((t) => typeof t === "string" && t.length > 0), "빈칸 없음(계절 쪽 빼고)");
});

test('"받는 것" 인연의 장 글자 수 = 그 사람이 받는 판의 실제 글자 수 (검수 2차 권장 5)', () => {
  const seen = new Set();
  for (let t = 0; t < 2000; t++) {
    const arch = ARCH[pick(8)];
    const ctx = { arch, sub: t % 3 ? ARCH[pick(8)] : arch, allDone: t % 2 === 0, band: t % 5 ? pick(7) : null, teen: t % 6 === 0, stem: t % 4 ? pick(10) : null };
    const ch = Book.yeonChapter(C, ctx);
    assert.strictEqual(Book.yeonVolume(V, ctx), Book.yeonChars(ch), JSON.stringify(ctx));
    seen.add(ch.variant + (ctx.sub === arch ? ":same" : "") + (ctx.band == null ? ":notime" : "") + (ctx.stem == null ? ":nosaju" : ""));
  }
  assert.ok(seen.size >= 10, `판 ${seen.size}가지`);
  // 판마다 값이 정말 다름(같은 사람의 미성년판·기본판)
  assert.notStrictEqual(Book.yeonVolume(V, { ...base, teen: true }), Book.yeonVolume(V, base));
  assert.notStrictEqual(Book.yeonVolume(V, { ...base, band: null }), Book.yeonVolume(V, base));
  // 지금 data-volume.js 표에 yeon 칸이 있고, 원본(book-yeon.js)과 같은 칸 구조
  const BV = {};
  vm.runInNewContext(fs.readFileSync(path.join(PROD, "data-volume.js"), "utf8"), { window: BV });
  assert.deepStrictEqual(Object.keys(BV.BOOK_VOLUME.yeon).sort(), Object.keys(V).sort());
  assert.strictEqual(JSON.stringify(BV.BOOK_VOLUME.yeon), JSON.stringify(Book.yeonTable(L.yeonData())), "data-volume.js가 낡음 → make-volume");
});

test("함수 book: file yeon → 200, 본문은 { pass, file } 두 칸 그대로, 인연의 장 전체를 준다", async () => {
  // 열람 코드 왕복(200·no-store·file 그대로)은 book.test.js "수동 코드 + 허용 file" 시험이 ALLOW 전체(yeon 포함)를 돌며 본다
  const Fn = require(path.join(__dirname, "..", "..", "netlify", "functions", "book.js"));
  assert.ok(Fn.ALLOW.includes("yeon"));
  const r = await Fn.handle({ method: "POST", body: JSON.stringify({ pass: "SOP0000000000000", file: "yeon", arch: "sage" }), ip: "10.17.0.1" }, { PASS_MODE: "test" }, L.PAID);
  assert.ok(r.status >= 400, "본문에 셋째 칸(원형 등)이 있으면 받지 않음: " + r.status);
  // 브라우저 쪽: app.js callBook 본문은 { pass, file } 두 칸뿐
  const app = fs.readFileSync(path.join(PROD, "app.js"), "utf8");
  assert.ok(app.includes("body: JSON.stringify({ pass, file })"));
});

test("문구 도구: items.json 484항목, 줄 넣기가 원본의 다른 문장을 바꾸지 않음", () => {
  const items = L.loadItems();
  assert.strictEqual(items.length, 146 + 338);
  assert.strictEqual(items.filter((x) => x.kind === "firstLine").length, 169);
  assert.strictEqual(items.filter((x) => x.kind === "heartLine").length, 169);
  assert.strictEqual(items.filter((x) => x.review === "all").length, 106); // + 무료 떡밥 8 = 114 (17-13의 7)
  assert.strictEqual(new Set(items.map((x) => x.id)).size, items.length);
  // 임시 사본에 줄을 넣고 되읽기
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so17-"));
  const file = path.join(tmp, "book-x.js");
  const orig = fs.readFileSync(path.join(L.PAID, "book-ogham.js"), "utf8");
  fs.writeFileSync(file, orig);
  const before = L.readWin(file).BOOK_OGHAM;
  L.setRoomLines("ogham", { beith: { heartLine: "시험 줄 \"따옴표\"" } }, file);
  const after = L.readWin(file).BOOK_OGHAM;
  assert.strictEqual(after.full[0].heartLine, "시험 줄 \"따옴표\"");
  const strip = (x) => JSON.stringify(x, (k, v) => (k === "firstLine" || k === "heartLine" ? undefined : v));
  assert.strictEqual(strip(after), strip(before));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("check-17 규칙: 금지어·성별어 오탐 제외(신부터·알아내·이성적·원형), 확인 목록", () => {
  const f = (t) => Check.scan(t).fail.map((h) => h.word);
  const c = (t) => Check.scan(t).confirm.map((h) => h.word);
  assert.deepStrictEqual(f("당신부터 먼저 웃어 보세요. 자신부터 챙겨요. 답을 알아내요. 이성적인 판단. 원형이 바뀌어요."), []);
  assert.ok(f("그녀는 웃었어요").includes("그녀"));
  assert.ok(f("신부 대기실").includes("신부"));
  assert.ok(f("형이 말했어요").includes("형"));
  assert.ok(f("2027년 봄에 만나요").length && f("반드시 만나요").includes("반드시") && f("31살 무렵").length);
  assert.ok(f("이별이 와요").includes("이별"));
  assert.ok(c("여행을 떠나요").includes("떠나"));
  assert.ok(c("운명처럼").includes("운명"));
  assert.ok(c("서른셋 무렵").length, "한 살 단위 수 낱말");
  assert.ok(!c("서른 무렵").length);
  assert.ok(c("꼭 해야 해요.").length, "경고형 끝맺음");
});
