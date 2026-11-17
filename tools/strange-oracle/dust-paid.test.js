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

test("돌아오는 길: ?to=talk면 심층상담으로(2026-11-16 화면 안 충전) · 모르는 값은 입구", async () => {
  const t = await Pay.handle({ method: "GET", route: "return", body: "", to: "talk" }, ENV, new MemStore(), NOW);
  assert.strictEqual(t.status, 303);
  assert.strictEqual(t.headers.Location, "/talk/#paid");
  const req = new Request("https://example.test/api/pay/return?to=evil", { method: "GET" });
  const r = await Pay.respond(req, {}, () => new MemStore(), ENV);
  assert.strictEqual(r.headers.get("Location"), "/products/strange-oracle/#paid");
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

// (2026-11-14 운영자) 예전에 방을 연 사람: 카카오에 저장한 방 결과가 도감 카드로 옮겨진다(잔액 볼 때)
test("로그인할 때: 저장한 방 결과(v)의 방 이름이 계정 도감(rooms)으로 · 빈 방은 빼고 · 별가루는 그대로 (2026-11-15: 잔액 볼 때마다가 아니라 로그인할 때 한 번)", async () => {
  const store = new MemStore();
  const { sid: sid0, uh } = await login(store);
  const save = await Auth.handle({ method: "POST", url: "https://example.test/api/auth/save", body: JSON.stringify({ sid: sid0, data: { p: {}, v: { saju: { s: 3 }, rune: { k: [1, 2, 3] }, star: {} } } }) }, ENV, store, null, NOW);
  assert.strictEqual(save.status, 200);
  assert.deepStrictEqual(JSON.parse((await dust(store, { sid: sid0 })).body).rooms, []); // 잔액 보기만으로는 옮기지 않음
  // 다시 로그인(표 → claim login)
  const T = rnd(16), S = rnd(16);
  await store.set("ticket/" + T, { uh, sh: crypto.createHash("sha256").update(S).digest("hex"), exp: NOW + 60000 });
  const c = JSON.parse((await Auth.handle({ method: "POST", url: "https://example.test/api/auth/claim", body: JSON.stringify({ t: T, s: S, login: true }) }, ENV, store, null, NOW)).body);
  const sid = c.sid;
  const r = JSON.parse((await dust(store, { sid })).body);
  assert.deepStrictEqual([r.rooms.slice().sort(), r.bal], [["rune", "saju"], 0]);
  // 이미 있는 방은 겹치지 않음
  await dust(store, { sid, room: "saju" });
  const r2 = JSON.parse((await dust(store, { sid })).body);
  assert.deepStrictEqual(r2.rooms.slice().sort(), ["rune", "saju"]);
});

// (2026-11-15 운영자) 시험 배포(branch-deploy)에서만 심층상담에 별가루를 쓰지 않음
test("심층상담: 시험 배포(TALK_TEST_FREE)면 잔액 0이어도 답하고 차감 없음 · 운영 env에서는 402", async () => {
  const pay_ = new MemStore();
  const talkStore = new MemStore();
  const ok = async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "답" }], usage: { input_tokens: 10, output_tokens: 10 } });
  const { sid, uh } = await login(pay_);
  const base = { TALK_MODE: "test", ANTHROPIC_API_KEY: "x", TALK_MONTHLY_USD: "5" };
  const ask = (env) => Talk.handle({ method: "POST", body: JSON.stringify({ room: "saju", q: "물음", sid }), ip: "8.8.4.4" }, env, talkStore, NOW, ok, pay_);
  assert.strictEqual((await ask(base)).status, 402);
  for (let i = 0; i < 3; i++) {
    const r = await ask(Object.assign({}, base, { TALK_TEST_FREE: "1" }));
    assert.strictEqual(r.status, 200, r.body);
    assert.strictEqual(JSON.parse(r.body).paid, 0);
  }
  assert.strictEqual(await Dust.balanceOf(pay_, uh), 0);
  // 잔액 응답: 시험 배포 문맥(context.deploy.context = branch-deploy)이면 talkFree, 아니면 없음
  const view = async (env) => JSON.parse((await Auth.handle({ method: "POST", url: "https://example.test/api/auth/dust", body: JSON.stringify({ sid }) }, env, pay_, null, NOW)).body);
  assert.strictEqual((await view(Object.assign({}, ENV, { TALK_TEST_FREE: "1" }))).talkFree, true);
  assert.strictEqual((await view(ENV)).talkFree, undefined);
});

// (2026-11-16 운영자) 손님과의 사이: 그 방 문을 지나온 계정이면 단골, 결과만 계산해 왔으면 초면 — 서버가 계정 도감으로 정한다(화면 값 안 믿음)
test("심층상담 손님과의 사이: 도감에 그 방이 있으면 단골(다시 온 손님) · 없고 결과만 있으면 초면 · 결과 없으면 결과 없음", async () => {
  const pay_ = new MemStore();
  const talkStore = new MemStore();
  let seen = "";
  const llm = async (params) => { seen = params.system[1].text; return { stop_reason: "end_turn", content: [{ type: "text", text: "답" }], usage: { input_tokens: 10, output_tokens: 10 } }; };
  const { sid, uh } = await login(pay_);
  const env = { TALK_MODE: "test", ANTHROPIC_API_KEY: "x", TALK_MONTHLY_USD: "5", TALK_TEST_FREE: "1" };
  const ask = (extra) => Talk.handle({ method: "POST", body: JSON.stringify(Object.assign({ room: "saju", q: "물음", sid }, extra)), ip: "8.8.8.1" }, env, talkStore, NOW, llm, pay_);
  assert.strictEqual((await ask({ r: { s: 0 } })).status, 200);
  assert.ok(/처음 만난 손님\(초면\)/.test(seen) && !/다시 온 손님/.test(seen));
  await ask({});
  assert.ok(/처음 만난 손님\(결과 없음\)/.test(seen));
  await Dust.addRooms(pay_, uh, ["saju"], NOW);
  await ask({ r: { s: 0 } });
  assert.ok(/다시 온 손님\(단골\)/.test(seen) && /위 결과는 그때 나온 것/.test(seen) && /첫 답에서 한 번/.test(seen));
  await ask({ r: { s: 0 }, hist: [{ q: "앞 질문", a: "앞 답" }] });
  assert.ok(/이미 인사는 했다/.test(seen));
  await ask({ room: "ogham", r: { i: 1 } }); // 다른 방은 문을 안 지났으면 초면
  assert.ok(/처음 만난 손님\(초면\)/.test(seen));
  // 로그인 없이(무료 몫)는 계정을 모르니 단골이 될 수 없다
  await Talk.handle({ method: "POST", body: JSON.stringify({ room: "saju", r: { s: 0 }, q: "물음" }), ip: "8.8.8.2" }, env, talkStore, NOW, llm, pay_);
  assert.ok(/처음 만난 손님\(초면\)/.test(seen));
});

// (2026-11-17 운영자) 시험 배포는 운영과 따로: 무료 · 비용 장부 budget-test/ · 월 상한 TALK_TEST_MONTHLY_USD(기본 10달러). 운영 장부·상한은 건드리지 않는다
test("심층상담 시험 배포: 무료 + 따로 센 비용 장부 · 시험 상한에 닿아도 운영은 그대로", async () => {
  const pay_ = new MemStore();
  const talkStore = new MemStore();
  const ok = async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "답" }], usage: { input_tokens: 10, output_tokens: 10 } });
  const { sid } = await login(pay_);
  const prod = { TALK_MODE: "live", ANTHROPIC_API_KEY: "x", TALK_MONTHLY_USD: "50" };
  const branch = Talk.testEnv(prod, { deploy: { context: "branch-deploy" } });
  assert.strictEqual(branch.TALK_TEST_FREE, "1");
  assert.strictEqual(branch.TALK_MONTHLY_USD, "10", "시험 상한 기본 10달러");
  assert.strictEqual(Talk.testEnv(Object.assign({ TALK_TEST_MONTHLY_USD: "3" }, prod), { deploy: { context: "branch-deploy" } }).TALK_MONTHLY_USD, "3");
  assert.deepStrictEqual(Talk.testEnv(prod, { deploy: { context: "production" } }), prod, "운영은 그대로");
  const ask = (env, ip) => Talk.handle({ method: "POST", body: JSON.stringify({ room: "saju", q: "물음", sid }), ip }, env, talkStore, NOW, ok, pay_);
  assert.strictEqual((await ask(branch, "8.8.1.1")).status, 200, "잔액 0이어도 시험 배포는 답함");
  const keys = [...talkStore.map.keys()];
  assert.ok(keys.some((k) => k.startsWith("budget-test/")) && !keys.some((k) => k.startsWith("budget/")), "시험 대화는 시험 장부에만");
  // 시험 장부가 상한을 넘어도 운영은 닫히지 않는다
  const mk = [...talkStore.map.keys()].find((k) => k.startsWith("budget-test/"));
  talkStore.map.set(mk, JSON.stringify({ usd: 999, n: 1 }));
  assert.strictEqual(JSON.parse((await ask(branch, "8.8.1.2")).body).error, "budget");
  assert.strictEqual((await ask(prod, "8.8.1.3")).status, 402, "운영은 상한과 무관(잔액 0이라 402)");
});

// (2026-11-17 운영자) 모델이 위기를 알아챈 답(끝에 ⟦곁⟧): 표시를 걷고 crisis 표시 · 별가루를 쓰지 않음 · 109는 안내자 말에 없음(화면이 작은 줄로)
test("심층상담 위기 표시: ⟦곁⟧ → crisis, 표시 걷음, 차감 없음", async () => {
  const pay_ = new MemStore();
  const talkStore = new MemStore();
  const { sid, uh } = await login(pay_);
  await Dust.earn(pay_, uh, "first", NOW);
  const before = await Dust.balanceOf(pay_, uh);
  const llm = async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "오늘 밤은 혼자 견디지 말아요. 저도 여기 곁에 있을게요. ⟦곁⟧" }], usage: { input_tokens: 10, output_tokens: 10 } });
  const env = { TALK_MODE: "live", ANTHROPIC_API_KEY: "x", TALK_MONTHLY_USD: "5" };
  const r = await Talk.handle({ method: "POST", body: JSON.stringify({ room: "star", q: "요즘 너무 지쳐서 다 그만두고 싶어요", sid }), ip: "8.8.2.1" }, env, talkStore, NOW, llm, pay_);
  const o = JSON.parse(r.body);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(o.crisis, true);
  assert.ok(!/⟦곁⟧/.test(o.a) && !/109/.test(o.a));
  assert.strictEqual(await Dust.balanceOf(pay_, uh), before, "위기 답은 차감 없음");
});
