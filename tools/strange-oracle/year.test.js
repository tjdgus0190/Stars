// 20단계 단위 시험: 「2027년의 흐름」(결정 130, spec 20-6) — 판 고르기(일간 10 + 공통판)·쪽 모양·빈칸 0·분량표(data-volume.js year)·
// 문장 규칙(20-4 금지어, 끝맺음)·함수 book의 year(코드 없으면 401, 있으면 200)·제2부 순서(시기별 흐름 바로 뒤).
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const PROD = path.join(ROOT, "products", "strange-oracle");
const PAIDDIR = path.join(PROD, "api", "_paid", "book");
const Book = require(path.join(PROD, "book.js"));
const PayCode = require(path.join(PROD, "paycode.js"));
const Fn = require(path.join(ROOT, "netlify", "lib", "book.js"));

const W = {};
vm.runInNewContext(fs.readFileSync(path.join(PAIDDIR, "book-year.js"), "utf8"), { window: W });
const Y = W.BOOK_YEAR;
const C = Book.contentFrom(W);
const STEMS = [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);

test("20-3 판 고르기: 일간 10판 + 공통판, 쪽 4개(theme·areas·seasons·one), 빈칸 0", () => {
  assert.strictEqual(Y.year, 2027);
  assert.strictEqual(Y.stems.length, 10);
  for (const stem of STEMS) {
    const ch = Book.yearChapter(C, { stem });
    assert.strictEqual(ch.variant, stem == null ? "unknown" : "stem");
    assert.deepStrictEqual(ch.pages.map((p) => p.key), ["theme", "areas", "seasons", "one"]);
    assert.ok(ch.pages[0].text.length >= 2 && ch.pages[0].text.every((t) => t.length > 40), `theme ${stem}`);
    assert.deepStrictEqual(ch.pages[1].items.map((x) => x.key), Book.YEAR_AREAS);
    assert.deepStrictEqual(ch.pages[2].items.map((x) => x.key), Book.YEAR_SEASONS);
    [...ch.pages[1].items, ...ch.pages[2].items].forEach((x) => assert.ok(typeof x.text === "string" && x.text.length > 20, `${stem} ${x.key}`));
    assert.ok(ch.pages[3].text.length > 40);
  }
  // 일간 판은 서로 다른 문장 (같은 판을 복사해 둔 칸 0)
  const themes = new Set(Y.stems.map((e) => e.theme[0]));
  assert.strictEqual(themes.size, 10);
});

test("20-5 분량: data-volume.js year = yearTable(원본), yearVolume = 실제 조립 글자 수", () => {
  const w = {};
  vm.runInNewContext(fs.readFileSync(path.join(PROD, "data-volume.js"), "utf8"), { window: w });
  assert.strictEqual(JSON.stringify(w.BOOK_VOLUME.year), JSON.stringify(Book.yearTable(Y)), "data-volume.js가 낡음 → make-volume");
  for (const stem of STEMS) assert.strictEqual(Book.yearVolume(w.BOOK_VOLUME.year, { stem }), Book.yearChars(Book.yearChapter(C, { stem })));
});

test("20-4 문장 규칙: 금지어 0, 쪽 끝 '요'로 끝남(해요체), 연도·간지 말고 월 단위 시기 0", () => {
  const BAN = /반드시|무조건|틀림없이|100%|운명의 상대|천생연분|올해|내년|내후년|이번 달|다음 달|\d{1,2}월|\d+살|\d+세|이별|헤어지|영영|놓치면|후회할|늦기 전에|마지막 기회|모르면 후회|지금 아니면|서두르세요|피해야|최악|(?<!정)돈(?!독)|재물|재산|투자|주식|코인|로또|대박|수익|연봉|건강|질병|병원|아프|사고(?!방식)|조심해야|남자|여자|남편|아내|그녀|해야 해요|하지 마세요/;
  const all = [...Y.stems, Y.unknown];
  const bad = [];
  all.forEach((e) => strings({ theme: e.theme, work: e.work, relation: e.relation, learn: e.learn, move: e.move, seasons: e.seasons, one: e.one }).forEach((t) => {
    const m = t.match(BAN);
    if (m) bad.push(`${e.stem}: ${m[0]}`);
  }));
  assert.deepStrictEqual(bad, []);
  all.forEach((e) => strings({ work: e.work, relation: e.relation, learn: e.learn, move: e.move, seasons: e.seasons, one: e.one }).forEach((t) => assert.match(t, /요\.$/, `${e.stem}: ${t.slice(-12)}`)));
});

test("20-5 함수 book: year는 허용 목록에 있고, 코드 없으면 401 · 코드 있으면 200(파일 통째)", async () => {
  assert.ok(Fn.ALLOW.includes("year"));
  const CODE = PayCode.Pass.make();
  const env = { PASS_MODE: "test", BOOK_PASS_HASHES: Fn.hashOf(CODE) };
  const call = (pass) => Fn.handle({ method: "POST", body: JSON.stringify({ pass, file: "year" }), ip: "10.9.0." + Math.floor(Math.random() * 200) }, env, PAIDDIR, Date.now(), null);
  const no = await call("");
  assert.strictEqual(no.status, 401);
  const ok = await call(CODE);
  assert.strictEqual(ok.status, 200);
  const j = JSON.parse(ok.body);
  assert.strictEqual(j.file, "year");
  assert.strictEqual(j.data.stems.length, 10);
});

test("20-5 제2부 순서: 2027년의 흐름은 시기별 흐름 바로 뒤, 책 15장", () => {
  const order = Book.bookOrder(PayCode.CHAPTER_ORDER, {});
  assert.strictEqual(order.length, 15);
  assert.strictEqual(order[order.indexOf("flow") + 1], "year");
});
