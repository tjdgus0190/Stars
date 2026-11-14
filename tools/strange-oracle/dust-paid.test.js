// (2026-11-13 v1-D) 충전한 별가루(카카오 계정) 단위 시험: 함수 pay(상품 3종·상태·취소) + auth(/api/auth/dust) + talk(sid로 차감) + dust.js
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("assert");
const crypto = require("crypto");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const Pay = require(path.join(ROOT, "netlify", "lib", "pay.js"));
const Auth = require(path.join(ROOT, "netlify", "lib", "auth.js"));
const Dust = require(path.join(ROOT, "netlify", "lib", "dust.js"));
const Talk = require(path.join(ROOT, "netlify", "lib", "talk.js"));
const { MemStore } = require("./mem-store.js");

const rnd = (n) => crypto.randomBytes(n).toString("hex");
const ENV = { PASS_MODE: "test", PAYAPP_USERID: "u" + rnd(4), PAYAPP_LINKKEY: rnd(16), PAYAPP_LINKVAL: rnd(16), PASS_SECRET: rnd(32), SITE_URL: "https://example.test/products/strange-oracle/", KAKAO_REST_KEY: "k" };
const NOW = Date.parse("2026-11-13T03:00:00Z");
let mulN = 70000000;
const fb = (store, f) => Pay.handle({ method: "POST", route: "feedback", body: new URLSearchParams(Object.assign({ userid: ENV.PAYAPP_USERID, linkkey: ENV.PAYAPP_LINKKEY, linkval: ENV.PAYAPP_LINKVAL }, f)).toString(), ip: "9.9.9.9" }, ENV, store, NOW);
async function pay(store, prod, price, r = rnd(16)) {
  const mul = String(++mulN);
  const tag = Pay.PRODUCTS[prod].tag;
  await fb(store, { pay_state: "1", mul_no: mul, var1: r, var2: tag, price: String(price) });
  const res = await fb(store, { pay_state: "4", mul_no: mul, var1: r, var2: tag, price: String(price) });
  return { r, mul, res };
}
const status = async (store, r) => JSON.parse((await Pay.handle({ method: "POST", route: "status", body: JSON.stringify({ r }), ip: "8.8.8." + (mulN % 200) }, ENV, store, NOW)).body);
async function login(store, uh = rnd(32).slice(0, 64)) {
  const sid = rnd(16);
  await store.set("sess/" + crypto.createHash("sha256").update(sid).digest("hex"), { uh, exp: NOW + 86400000 });
  return { sid, uh };
}
const dust = (store, body) => Auth.handle({ method: "POST", url: "https://example.test/api/auth/dust", body: JSON.stringify(body) }, ENV, store, null, NOW);
test.beforeEach(() => { Pay._reset(); Talk._reset(); });

test("상품 3종: 꼬리표·값이 맞아야 기록, 코드 머리 SDA·SDB·SDC, 상태 확인으로 받음", async () => {
  const store = new MemStore();
  for (const [prod, price, head] of [["dust50", 2900, "SDA"], ["dust120", 5900, "SDB"], ["dust300", 12900, "SDC"]]) {
    const { r, res } = await pay(store, prod, price);
    assert.strictEqual(res.body, "SUCCESS");
    const st = await status(store, r);
    assert.strictEqual(st.state, "paid");
    assert.ok(st.pass.startsWith(head), st.pass);
    assert.strictEqual(Pay.productOfPass(st.pass), prod);
  }
  const bad = await fb(store, { pay_state: "4", mul_no: String(++mulN), var1: rnd(16), var2: "so-dust50-1", price: "100" });
  assert.strictEqual(bad.status, 400);
});

test("돌아오는 길: ?to=dust면 별가루 페이지로, 아니면 입구 #paid", async () => {
  const a = await Pay.handle({ method: "GET", route: "return", body: "", to: "dust" }, ENV, new MemStore(), NOW);
  assert.strictEqual(a.status, 303);
  assert.strictEqual(a.headers.Location, "/stardust/#paid");
  const b = await Pay.handle({ method: "GET", route: "return", body: "" }, ENV, new MemStore(), NOW);
  assert.strictEqual(b.headers.Location, "/products/strange-oracle/#paid");
});

test("충전: 로그인한 계정에 한 번만, 다른 계정은 같은 코드로 못 씀, 잔액만 기록", async () => {
  const store = new MemStore();
  const { r } = await pay(store, "dust120", 5900);
  const { pass } = await status(store, r);
  const A = await login(store), B = await login(store);
  let x = JSON.parse((await dust(store, { sid: A.sid, pass })).body);
  assert.deepStrictEqual([x.state, x.bal, x.n], ["credited", 120, 120]);
  x = JSON.parse((await dust(store, { sid: A.sid, pass })).body);
  assert.deepStrictEqual([x.state, x.bal], ["already", 120]);
  const other = await dust(store, { sid: B.sid, pass });
  assert.strictEqual(other.status, 409);
  assert.strictEqual(JSON.parse((await dust(store, { sid: B.sid })).body).bal, 0);
  const rec = await store.get("dust/" + A.uh);
  assert.deepStrictEqual(Object.keys(rec).sort(), ["at", "bal", "free", "log", "oday", "once", "rooms", "stories"]);
  assert.deepStrictEqual(Object.keys(rec.log[0]).sort(), ["at", "k", "n"]);
});

test("충전 거부: 로그인 없음 401, 책·신년운세 코드 400, 결제 안 된 코드 403", async () => {
  const store = new MemStore();
  const { sid } = await login(store);
  assert.strictEqual((await dust(store, { sid: rnd(16) })).status, 401);
  const book = Pay.passOf(ENV.PASS_SECRET, rnd(16), "book");
  assert.strictEqual((await dust(store, { sid, pass: book })).status, 400);
  const unpaid = Pay.passOf(ENV.PASS_SECRET, rnd(16), "dust50");
  assert.strictEqual((await dust(store, { sid, pass: unpaid })).status, 403);
});

test("별가루 코드는 카카오에 책처럼 '연결'되지 않음(책·신년운세가 열리지 않게)", async () => {
  const store = new MemStore();
  const { r } = await pay(store, "dust50", 2900);
  const { pass } = await status(store, r);
  const { sid } = await login(store);
  const res = await Auth.handle({ method: "POST", url: "https://example.test/api/auth/save", body: JSON.stringify({ sid, pass }) }, ENV, store, null, NOW);
  assert.strictEqual(res.status, 403);
});

test("결제 취소(환불) 통보 → 충전분을 남은 잔액까지 되돌림", async () => {
  const store = new MemStore();
  const { r, mul } = await pay(store, "dust50", 2900);
  const { pass } = await status(store, r);
  const { sid, uh } = await login(store);
  await dust(store, { sid, pass });
  await Dust.spend(store, uh, 10, NOW); // 40 남음
  await fb(store, { pay_state: "9", mul_no: mul, var1: r, var2: "so-dust50-1" });
  assert.strictEqual(await Dust.balanceOf(store, uh), 0);
  assert.strictEqual((await store.get("dust/" + uh)).log[0].k, "refund");
  assert.strictEqual((await status(store, r)).state, "cancelled");
});

test("erase(저장한 기록 지우기)는 충전한 별가루도 지움, sweep은 잔액 0인 1년 지난 기록만", async () => {
  const store = new MemStore();
  const { sid, uh } = await login(store);
  await store.set("dust/" + uh, { bal: 30, log: [], at: new Date(NOW).toISOString() });
  await Auth.handle({ method: "POST", url: "https://example.test/api/auth/erase", body: JSON.stringify({ sid }) }, ENV, store, null, NOW);
  assert.strictEqual(await store.get("dust/" + uh), null);
  const old = new Date(NOW - 400 * 86400000).toISOString();
  await store.set("dust/a", { bal: 5, log: [], at: old });
  await store.set("dust/b", { bal: 0, log: [], at: old });
  await Auth.sweep(store, async (pre) => [...store.map.keys()].filter((k) => k.startsWith(pre)), NOW);
  assert.ok(await store.get("dust/a"));
  assert.strictEqual(await store.get("dust/b"), null);
});

test("면담: sid면 계정 별가루에서 5 차감(무료 하루 상한과 별개), 모자라면 402, 거절 답은 차감 없음", async () => {
  const pay_ = new MemStore();
  const talkStore = new MemStore();
  const T_ENV = { TALK_MODE: "test", ANTHROPIC_API_KEY: "x", TALK_MONTHLY_USD: "5" };
  const ok = async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "답" }], usage: { input_tokens: 10, output_tokens: 10 } });
  const no = async () => ({ stop_reason: "refusal", content: [], usage: {} });
  const { sid, uh } = await login(pay_);
  await pay_.set("dust/" + uh, { bal: 12, log: [], at: new Date(NOW).toISOString() });
  const ask = (llm, extra = {}) => Talk.handle({ method: "POST", body: JSON.stringify(Object.assign({ room: "saju", q: "물음", sid }, extra)), ip: "7.7.7.7" }, T_ENV, talkStore, NOW, llm, pay_);
  for (let i = 0; i < Talk.FREE_PER_DAY; i++) await Talk.handle({ method: "POST", body: JSON.stringify({ room: "saju", q: "무료" + i }), ip: "7.7.7.7" }, T_ENV, talkStore, NOW, ok, pay_);
  let r = await ask(ok);
  assert.strictEqual(r.status, 200, r.body);
  assert.strictEqual(JSON.parse(r.body).paid, 7);
  r = await ask(no);
  assert.ok(JSON.parse(r.body).declined);
  assert.strictEqual(await Dust.balanceOf(pay_, uh), 7);
  r = await ask(ok);
  assert.strictEqual(JSON.parse(r.body).paid, 2);
  r = await ask(ok);
  assert.strictEqual(r.status, 402);
  r = await ask(ok, { sid: rnd(16) });
  assert.strictEqual(r.status, 401);
  r = await ask(ok, { sid: "NOTHEX" });
  assert.strictEqual(r.status, 400);
});

// ── (2026-11-14 운영자 결정) 별가루 1개 = 100원 · 모든 결제는 별가루로
test("새 충전 묶음 4종: 30=3,000 · 50=5,000 · 100=10,000(+10) · 300=30,000(+50), 코드 SDD·SDE·SDF·SDG", async () => {
  for (const [prod, price, head, n] of [["d30", 3000, "SDD", 30], ["d50", 5000, "SDE", 50], ["d100", 10000, "SDF", 110], ["d300", 30000, "SDG", 350]]) {
    const store = new MemStore();
    const { r } = await pay(store, prod, price);
    const { pass } = await status(store, r);
    assert.ok(pass.startsWith(head), pass);
    const { sid } = await login(store);
    const x = JSON.parse((await dust(store, { sid, pass })).body);
    assert.deepStrictEqual([x.state, x.bal, x.paid, x.free, x.n], ["credited", n, n, 0, n]);
  }
});

test("로그인한 계정에만 주는 별가루: 출석 5(하루 한 번)·첫 로그인 10·금빛 봉인 30(계정에 일곱 방 완주가 있어야, 한 번) · 다른 안내자 3·숨은 이야기 10(방 카드 있어야, 한 번) 차감", async () => {
  const store = new MemStore();
  const { sid, uh } = await login(store);
  let x = JSON.parse((await dust(store, { sid, earn: "oracle" })).body);
  assert.deepStrictEqual([x.added, x.free, x.bal], [5, 5, 5]);
  x = JSON.parse((await dust(store, { sid, earn: "oracle" })).body);
  assert.strictEqual(x.added, 0);
  assert.strictEqual((await dust(store, { sid, earn: "tool" })).status, 400);
  x = JSON.parse((await dust(store, { sid, earn: "first" })).body);
  assert.deepStrictEqual([x.added, x.free], [10, 15]);
  x = JSON.parse((await dust(store, { sid, earn: "first" })).body);
  assert.strictEqual(x.added, 0);
  assert.strictEqual((await dust(store, { sid, earn: "seal" })).status, 403); // 일곱 방 완주가 계정에 없으면 못 받음
  for (const r of ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]) assert.strictEqual((await dust(store, { sid, room: r })).status, 200);
  assert.strictEqual((await dust(store, { sid, room: "nope" })).status, 400);
  x = JSON.parse((await dust(store, { sid, earn: "seal" })).body);
  assert.deepStrictEqual([x.added, x.free, x.rooms.length], [30, 45, 7]);
  x = JSON.parse((await dust(store, { sid, earn: "seal" })).body);
  assert.strictEqual(x.added, 0);
  x = JSON.parse((await dust(store, { sid, use: "extra" })).body);
  assert.deepStrictEqual([x.state, x.bal], ["used", 42]);
  assert.strictEqual((await dust(store, { sid, use: "story" })).status, 400); // 방 이름 없음
  x = JSON.parse((await dust(store, { sid, use: "story", room: "rune" })).body);
  assert.deepStrictEqual([x.bal, x.stories], [32, ["rune"]]);
  x = JSON.parse((await dust(store, { sid, use: "story", room: "rune" })).body);
  assert.strictEqual(x.bal, 32); // 이미 펼친 이야기는 다시 쓰지 않음
  assert.strictEqual((await dust(store, { sid, use: "talk" })).status, 400);
  const nx = await Dust.earn(store, uh, "oracle", NOW + 86400000);
  assert.deepStrictEqual([nx.added, nx.free], [5, 37]);
});

test("별가루로 책·신년운세 열기: 49 차감(무료 먼저) → 결제 끝난 열람 코드가 계정에 연결, 모자라면 402", async () => {
  const store = new MemStore();
  const { sid, uh } = await login(store);
  await store.set("dust/" + uh, { bal: 60, free: 10, oday: "", log: [], at: new Date(NOW).toISOString() });
  let r = await dust(store, { sid, buy: "book" });
  assert.strictEqual(r.status, 200, r.body);
  const x = JSON.parse(r.body);
  assert.ok(/^SOP/.test(x.pass), x.pass);
  assert.deepStrictEqual([x.bal, x.paid, x.free, x.cost], [21, 21, 0, 49]);
  assert.strictEqual(await Pay.passState(store, ENV.PASS_SECRET, x.pass), "paid");
  const me = JSON.parse((await Auth.handle({ method: "POST", url: "https://example.test/api/auth/me", body: JSON.stringify({ sid }) }, ENV, store, null, NOW)).body);
  assert.ok(me.passes.some((p) => p.pass === x.pass || p === x.pass), JSON.stringify(me.passes));
  r = await dust(store, { sid, buy: "ny" });
  assert.strictEqual(r.status, 402);
  assert.strictEqual(JSON.parse(r.body).need, 28);
  assert.strictEqual(await Dust.balanceOf(store, uh), 21);
  assert.strictEqual((await dust(store, { sid, buy: "dust50" })).status, 400);
  assert.strictEqual((await dust(store, { sid: rnd(16), buy: "book" })).status, 401);
});

// (2026-11-14) 배포 길: 화면이 부르는 /api/auth/* 길은 모두 함수 auth의 config.path에 있어야 한다(빠지면 Netlify에서 404)
test("함수 auth 길 목록에 화면이 부르는 /api/auth/dust·me·save·logout·erase·claim이 모두 있음", () => {
  const fs = require("fs"), path = require("path");
  const cfg = fs.readFileSync(path.join(__dirname, "..", "..", "netlify", "functions", "auth.mjs"), "utf8");
  const used = new Set();
  for (const f of ["app.js", "guide.js"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "products", "strange-oracle", f), "utf8");
    for (const m of src.matchAll(/\/api\/auth\/([a-z]+)/g)) if (m[1] !== "kakao") used.add(m[1]);
  }
  for (const p of ["dust", "me", "save", "logout", "erase", "claim"]) used.add(p);
  for (const p of used) assert.ok(cfg.includes(`"/api/auth/${p}"`), "빠진 길: /api/auth/" + p);
});
