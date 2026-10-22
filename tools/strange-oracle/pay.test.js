// 15단계 G2 단위 시험: 함수 pay(netlify/lib/pay.js) + pay·book 연동 + 배포 설정. spec 15-3·15-6, 합격 5·6·8·13·17·20~24·26~28(서버 쪽).
// 함수 book 단독 시험·열람 코드 모양·make-pass는 book.test.js로 옮겼다.
// 실행: node --test "tools/strange-oracle/*.test.js"
// 모의 userid·linkkey·linkval·PASS_SECRET·R은 이 실행 안에서 무작위로 만들고 버린다(파일·저장소에 쓰지 않음).
"use strict";
const test = require("node:test");
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PROD = path.join(ROOT, "products", "strange-oracle");
const PAIDDIR = path.join(PROD, "api", "_paid", "book");
const Pay = require(path.join(ROOT, "netlify", "lib", "pay.js"));
const Book = require(path.join(ROOT, "netlify", "lib", "book.js"));
const { Pass } = require(path.join(PROD, "paycode.js"));
const { MemStore } = require("./mem-store.js");

const rnd = (n) => crypto.randomBytes(n).toString("hex");
const ENV = { PASS_MODE: "test", PAYAPP_USERID: "u" + rnd(4), PAYAPP_LINKKEY: rnd(16), PAYAPP_LINKVAL: rnd(16), PASS_SECRET: rnd(32), SITE_URL: "https://example.test/products/strange-oracle/" };
const PHONE = "01055550000";
const newR = () => rnd(16);
let mulN = 50000000;
const newMul = () => String(++mulN);
let ipN = 0;

const form = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))).toString();
const notice = (state, mul, r, over = {}) =>
  form(Object.assign({ userid: ENV.PAYAPP_USERID, linkkey: ENV.PAYAPP_LINKKEY, linkval: ENV.PAYAPP_LINKVAL, goodname: "낯선 점술관 한 권의 책", price: "9900", recvphone: PHONE, mul_no: mul, pay_state: String(state), var1: r, var2: "so-book-1", card_name: "시험카드" }, over));
const fb = (store, body, env = ENV) => Pay.handle({ method: "POST", route: "feedback", body, ip: "payapp" }, env, store);
const status = async (store, r, opts = {}) => {
  const res = await Pay.handle({ method: opts.method || "POST", route: "status", body: typeof r === "string" ? JSON.stringify({ r }) : JSON.stringify(r), ip: opts.ip || `10.2.${ipN >> 8}.${++ipN & 255}` }, opts.env || ENV, store, opts.now);
  return Object.assign(res, { json: res.body ? JSON.parse(res.body) : null });
};
const book = async (store, pass, ip) => Book.handle({ method: "POST", body: JSON.stringify({ pass, file: "arch" }), ip: ip || `10.3.0.${++ipN & 255}` }, { PASS_MODE: "test", BOOK_PASS_HASHES: "", PASS_SECRET: ENV.PASS_SECRET }, PAIDDIR, Date.now(), store);
const P_of = (r) => Pay.passOf(ENV.PASS_SECRET, r);
const ph_of = (r) => Pay.hashOfPass(ENV.PASS_SECRET, P_of(r));
const keys = (store) => [...store.map.keys()].sort();
const val = (store, k) => (store.map.has(k) ? JSON.parse(store.map.get(k)) : null);
const paidOk = async (store, mul, r) => {
  assert.strictEqual((await fb(store, notice(1, mul, r))).body, "SUCCESS");
  const res = await fb(store, notice(4, mul, r));
  assert.strictEqual(res.body, "SUCCESS");
  return res;
};

// ── 공통 ──
test("P = HMAC 결정적, SOP 모양·검사 글자가 paycode.js Pass와 같고, ph = HMAC(hash:P) (SHA-256(P)와 다름)", () => {
  for (let i = 0; i < 300; i++) {
    const r = newR();
    const P = P_of(r);
    assert.strictEqual(Pass.normalize(P), P, P);
    assert.strictEqual(P_of(r), P);
    assert.strictEqual(ph_of(r), crypto.createHmac("sha256", ENV.PASS_SECRET).update("hash:" + P).digest("hex"));
    assert.notStrictEqual(ph_of(r), Book.hashOf(P));
  }
  assert.notStrictEqual(Pay.passOf(rnd(32), "a".repeat(32)), Pay.passOf(rnd(32), "a".repeat(32)), "비밀값이 다르면 코드가 다름");
});

test("합격 24·검수 C: 빈 USERID·LINKKEY·LINKVAL, 짧은 PASS_SECRET, PASS_MODE 없음 → 세 길 모두 503, 빈 칸 위조 통보로 기록 0", async () => {
  const store = new MemStore();
  const bad = [
    { PAYAPP_USERID: "" }, { PAYAPP_LINKKEY: "" }, { PAYAPP_LINKVAL: "" }, { PASS_SECRET: "" }, { PASS_SECRET: "x".repeat(31) }, { PASS_MODE: "" }, { PASS_MODE: "off" },
  ];
  for (const b of bad) {
    const env = Object.assign({}, ENV, b);
    const forged = notice(4, newMul(), newR(), { userid: "", linkkey: "", linkval: "" });
    for (const route of ["feedback", "status", "return"]) {
      const r = await Pay.handle({ method: "POST", route, body: route === "status" ? JSON.stringify({ r: newR() }) : forged, ip: "10.4.4.4" }, env, store);
      assert.strictEqual(r.status, 503, JSON.stringify(b) + route);
      assert.strictEqual(r.headers["Cache-Control"], "no-store");
    }
  }
  assert.strictEqual(store.log.length, 0, "저장소를 건드리지 않음");
  const ok32 = Object.assign({}, ENV, { PASS_SECRET: "y".repeat(32) });
  assert.strictEqual((await Pay.handle({ method: "GET", route: "return", body: "", ip: "x" }, ok32, store)).status, 303, "32바이트면 통과");
});

test("합격 8: userid·linkkey·linkval 틀림 403 FAIL(길이가 달라도 예외 없음), 금액·표지·var1 모양 틀림 400 FAIL, 기록 0", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  for (const over of [{ userid: "x" }, { linkkey: "x" }, { linkval: "x" }, { linkval: "x".repeat(5000) }, { linkval: undefined }, { linkval: ENV.PAYAPP_LINKVAL + " " }])
    for (const st of [1, 4, 9]) {
      const res = await fb(store, notice(st, mul, r, over));
      assert.strictEqual(res.status, 403, JSON.stringify(over));
      assert.strictEqual(res.body, "FAIL");
    }
  for (const over of [{ price: "100" }, { price: "99000" }, { price: "" }, { price: "9900.5" }, { price: "3900" }, { price: "5900" }, { var2: "so-book-2" }, { var2: undefined }, { var1: "zz" + r.slice(2) }, { var1: r.toUpperCase() }, { var1: r.slice(1) }, { var1: undefined }])
    for (const st of [1, 4]) {
      const res = await fb(store, notice(st, mul, r, over));
      assert.strictEqual(res.status, 400, JSON.stringify(over) + st);
      assert.strictEqual(res.body, "FAIL");
    }
  assert.strictEqual((await fb(store, notice(4, "../x", r))).status, 400, "mul_no 모양");
  assert.deepStrictEqual(keys(store), []);
});

test("상태 1·10·그 밖 → SUCCESS, 기록 없음 / 405 / 없는 길 404", async () => {
  const store = new MemStore();
  for (const st of [1, 10, 2, 99]) assert.strictEqual((await fb(store, notice(st, newMul(), newR()))).body, "SUCCESS");
  assert.deepStrictEqual(keys(store), []);
  assert.strictEqual((await Pay.handle({ method: "GET", route: "feedback", body: "", ip: "x" }, ENV, store)).status, 405);
  assert.strictEqual((await Pay.handle({ method: "GET", route: "status", body: "", ip: "x" }, ENV, store)).status, 405);
  assert.strictEqual((await Pay.handle({ method: "POST", route: "nope", body: "", ip: "x" }, ENV, store)).status, 404);
});

test("결제완료 → mul/·pass/ 한 벌, 칸은 15-3 표뿐, status = paid + P, book 200", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  await paidOk(store, mul, r);
  const ph = ph_of(r);
  assert.deepStrictEqual(keys(store), ["mul/" + mul, "pass/" + ph]);
  assert.deepStrictEqual(Object.keys(val(store, "mul/" + mul)).sort(), ["at", "ph", "state"]);
  assert.deepStrictEqual(Object.keys(val(store, "pass/" + ph)).sort(), ["at", "mul_no", "state"]);
  assert.strictEqual(val(store, "mul/" + mul).ph, ph);
  assert.strictEqual(val(store, "pass/" + ph).state, "paid");
  assert.match(val(store, "mul/" + mul).at, /^\d{4}-\d\d-\d\dT/);
  const s = await status(store, r);
  assert.strictEqual(s.status, 200);
  assert.deepStrictEqual(s.json, { state: "paid", pass: P_of(r) });
  assert.strictEqual(s.headers["Cache-Control"], "no-store");
  assert.strictEqual((await book(store, Pass.pretty(s.json.pass))).status, 200);
  assert.deepStrictEqual((await status(store, newR())).json, { state: "pending" });
});

test("합격 5: 같은 통보 3번 → 키 한 벌(2개), cancel/ 없음, 코드 하나, 값 그대로(멱등)", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  await paidOk(store, mul, r);
  const snap = JSON.stringify(store.dump());
  for (let i = 0; i < 2; i++) assert.strictEqual((await fb(store, notice(4, mul, r))).body, "SUCCESS");
  assert.strictEqual(JSON.stringify(store.dump()), snap);
  assert.strictEqual(keys(store).length, 2);
  assert.ok(!keys(store).some((k) => k.startsWith("cancel/")));
});

test("합격 13: 저장소 값·함수 응답에 휴대폰 번호·R·R의 해시·P 원문·linkkey·linkval·카드 이름 0건", async () => {
  const store = new MemStore();
  const r = newR();
  const mul = newMul();
  const out = [];
  out.push((await fb(store, notice(1, mul, r))).body, (await fb(store, notice(4, mul, r))).body);
  out.push((await status(store, newR())).body);
  await fb(store, notice(9, newMul(), r));
  const dump = JSON.stringify(store.dump());
  const forbidden = [PHONE, r, crypto.createHash("sha256").update(r).digest("hex"), P_of(r), ENV.PAYAPP_LINKKEY, ENV.PAYAPP_LINKVAL, ENV.PAYAPP_USERID, ENV.PASS_SECRET, "시험카드"];
  for (const f of forbidden) {
    assert.ok(!dump.includes(f), "저장소에 " + f.slice(0, 6));
    assert.ok(!out.join("|").includes(f), "응답에 " + f.slice(0, 6));
  }
  for (const [k, v] of Object.entries(store.dump())) {
    const want = k.startsWith("mul/") ? ["at", "ph", "state"] : ["at", "mul_no", "state"];
    assert.deepStrictEqual(Object.keys(v).sort(), want, k);
    assert.ok(["paid", "cancelled"].includes(v.state));
  }
});

test("합격 6: 완료 뒤 취소 → cancel/·mul/·pass/ 모두 cancelled, status cancelled, book 403, 늦게 온 결제완료로 다시 열리지 않음", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  await paidOk(store, mul, r);
  assert.strictEqual((await fb(store, notice(9, mul, r))).body, "SUCCESS");
  const ph = ph_of(r);
  assert.deepStrictEqual(keys(store), ["cancel/" + mul, "mul/" + mul, "pass/" + ph]);
  assert.deepStrictEqual(Object.keys(val(store, "cancel/" + mul)).sort(), ["at", "mul_no", "state"]);
  for (const k of keys(store)) assert.strictEqual(val(store, k).state, "cancelled", k);
  assert.deepStrictEqual((await status(store, r)).json, { state: "cancelled" });
  const b = await book(store, P_of(r));
  assert.strictEqual(b.status, 403);
  assert.deepStrictEqual(JSON.parse(b.body), { error: "cancelled" });
  await fb(store, notice(4, mul, r));
  assert.strictEqual(val(store, "pass/" + ph).state, "cancelled");
  assert.deepStrictEqual((await status(store, r)).json, { state: "cancelled" });
  for (const st of [8, 32, 64, 70, 71]) {
    const m2 = newMul();
    const r2 = newR();
    await paidOk(store, m2, r2);
    await fb(store, notice(st, m2, r2));
    assert.strictEqual(val(store, "pass/" + ph_of(r2)).state, "cancelled", "상태 " + st);
  }
});

test("합격 20·B-1: 취소 통보는 금액·var1 모양·표지가 틀려도 처리됨 (인증은 필요)", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  await paidOk(store, mul, r);
  assert.strictEqual((await fb(store, notice(9, mul, "not-hex", { price: "0", var2: "x" }))).body, "SUCCESS");
  assert.strictEqual(val(store, "pass/" + ph_of(r)).state, "cancelled", "mul/의 ph로 pass/를 찾음");
  assert.strictEqual((await fb(store, notice(9, newMul(), r, { linkval: "x" }))).status, 403);
});

test("합격 21·B-2: var1 없는 취소가 먼저 → mul/ 묘비 { ph: null }, 뒤에 온 결제완료는 pass/를 paid로 만들지 않음", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  assert.strictEqual((await fb(store, notice(9, mul, undefined, { price: undefined }))).body, "SUCCESS");
  assert.deepStrictEqual(val(store, "mul/" + mul), Object.assign({ ph: null, state: "cancelled" }, { at: val(store, "mul/" + mul).at }));
  await paidOk(store, mul, r);
  assert.strictEqual(val(store, "pass/" + ph_of(r)), null);
  assert.strictEqual(val(store, "mul/" + mul).state, "cancelled");
  assert.notDeepStrictEqual((await status(store, r)).json.state, "paid");
  assert.strictEqual((await book(store, P_of(r))).status, 401);
  // var1이 있는 취소가 먼저 → 묘비에 ph
  const m2 = newMul();
  const r2 = newR();
  await fb(store, notice(9, m2, r2));
  assert.strictEqual(val(store, "mul/" + m2).ph, ph_of(r2));
  await paidOk(store, m2, r2);
  assert.notStrictEqual((await status(store, r2)).json.state, "paid");
});

test("합격 22·B-3: 같은 R로 두 번째 결제 → 두 번째는 mul/에만, 그 취소 뒤에도 첫 결제 코드는 열림", async () => {
  const store = new MemStore();
  const r = newR();
  const a = newMul();
  const b = newMul();
  await paidOk(store, a, r);
  await paidOk(store, b, r);
  const ph = ph_of(r);
  assert.deepStrictEqual(val(store, "pass/" + ph).mul_no, a);
  assert.deepStrictEqual(val(store, "mul/" + b), Object.assign({ ph, state: "paid" }, { at: val(store, "mul/" + b).at }));
  await fb(store, notice(9, b, r));
  assert.strictEqual(val(store, "mul/" + b).state, "cancelled");
  assert.strictEqual(val(store, "pass/" + ph).state, "paid");
  assert.deepStrictEqual((await status(store, r)).json, { state: "paid", pass: P_of(r) });
  assert.strictEqual((await book(store, P_of(r))).status, 200);
  // 두 번째 결제 재통보도 첫 결제를 건드리지 않음
  await fb(store, notice(4, b, r));
  assert.strictEqual(val(store, "pass/" + ph).mul_no, a);
});

test("합격 23·A: pass/ 쓰기 실패 → 500 FAIL → 재통보에서 pass/ 완성, 책 열림", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  store.failWrite = (k) => k.startsWith("pass/");
  const res = await fb(store, notice(4, mul, r));
  assert.strictEqual(res.status, 500);
  assert.strictEqual(res.body, "FAIL");
  assert.deepStrictEqual(keys(store), ["mul/" + mul]);
  assert.deepStrictEqual((await status(store, r)).json, { state: "pending" });
  store.failWrite = false;
  assert.strictEqual((await fb(store, notice(4, mul, r))).body, "SUCCESS");
  assert.deepStrictEqual(keys(store), ["mul/" + mul, "pass/" + ph_of(r)]);
  assert.strictEqual((await status(store, r)).json.state, "paid");
  assert.strictEqual((await book(store, P_of(r))).status, 200);
  // 읽기 실패·취소 쓰기 실패도 500
  store.failRead = true;
  assert.strictEqual((await fb(store, notice(4, newMul(), newR()))).status, 500);
  assert.strictEqual((await fb(store, notice(9, newMul(), newR()))).status, 500);
});

// 동시 도착: 저장소 고리로 단계마다 멈춘다
function gate() {
  let open;
  const p = new Promise((ok) => (open = ok));
  return { p, open };
}
test("결제완료 쓰기 도중 취소(동시 도착 흉내): pass/ 쓰기 직전에 취소가 끝까지 돌아도 최종 cancelled", async () => {
  for (const conditional of [true, false]) {
    const store = new MemStore({ conditional });
    const mul = newMul();
    const r = newR();
    const g = gate();
    const reached = gate();
    store.before = async (op, key) => {
      if (op === "set" && key.startsWith("pass/") && store.before) {
        store.before = null;
        reached.open();
        await g.p;
      }
    };
    const paid = fb(store, notice(4, mul, r));
    await reached.p;
    assert.strictEqual((await fb(store, notice(9, mul, r))).body, "SUCCESS");
    g.open();
    assert.strictEqual((await paid).body, "SUCCESS");
    assert.strictEqual(val(store, "mul/" + mul).state, "cancelled");
    assert.strictEqual(val(store, "pass/" + ph_of(r)).state, "cancelled", "조건부 쓰기 " + conditional);
    assert.deepStrictEqual((await status(store, r)).json, { state: "cancelled" });
  }
});

// 2차 검수 4단계 경쟁: ① 결제완료 ②가 읽음(없음) → ② 취소 ①~④가 cancel/·묘비 → ③ 결제완료 ④가 mul/·pass/ = paid → ④ 결제완료 ⑤가 되돌림
async function race(conditional) {
  const store = new MemStore({ conditional });
  const mul = newMul();
  const r = newR();
  const hold = gate();
  const reached = gate();
  const paidLog = [];
  let inPaid = true;
  store.before = async (op, key) => {
    if (inPaid) paidLog.push([op, key]);
    if (op === "set" && key === "mul/" + mul && inPaid && !reached.done) {
      reached.done = true; // 결제완료 ②·③ 읽기는 끝났고 ④ 첫 쓰기 직전
      reached.open();
      await hold.p;
    }
  };
  const paid = fb(store, notice(4, mul, r));
  await reached.p;
  assert.deepStrictEqual(paidLog.map((l) => l.join(" ")), ["get cancel/" + mul, "get mul/" + mul, "get pass/" + ph_of(r), "set mul/" + mul], "1단계: 읽기 → 없음");
  inPaid = false;
  assert.strictEqual((await fb(store, notice(9, mul, r))).body, "SUCCESS"); // 2단계
  assert.ok(val(store, "cancel/" + mul) && val(store, "mul/" + mul).state === "cancelled" && !val(store, "pass/" + ph_of(r)), "2단계: cancel/·묘비, pass/ 없음");
  inPaid = true;
  hold.open(); // 3·4단계
  assert.strictEqual((await paid).body, "SUCCESS");
  return { store, mul, r, paidLog };
}
test("합격 27: 2차 검수 4단계 경쟁 재현 → 최종 mul/·pass/ cancelled, status·book 열지 않음, 결제완료 경로의 쓰기에 cancel/ 0건", async () => {
  // (가) 조건부 쓰기 없는 저장소 = 기획서 4단계 그대로: ④가 묘비를 paid로 덮어쓰고 pass/ = paid → ⑤가 되돌림
  const a = await race(false);
  assert.ok(a.paidLog.some(([op, k]) => op === "set" && k === "pass/" + ph_of(a.r)), "3단계: pass/ = paid를 썼음");
  assert.strictEqual(val(a.store, "mul/" + a.mul).state, "cancelled");
  assert.strictEqual(val(a.store, "pass/" + ph_of(a.r)).state, "cancelled");
  // (나) onlyIfNew 추가 방어: ④의 mul/ 쓰기가 거절되어 pass/를 아예 쓰지 않음
  const b = await race(true);
  assert.strictEqual(val(b.store, "mul/" + b.mul).state, "cancelled");
  assert.strictEqual(val(b.store, "pass/" + ph_of(b.r)), null);
  for (const x of [a, b]) {
    assert.ok(!x.paidLog.some(([op, k]) => op === "set" && k.startsWith("cancel/")), "결제완료 경로 쓰기에 cancel/ 0건");
    assert.notStrictEqual((await status(x.store, x.r)).json.state, "paid");
    assert.notStrictEqual((await book(x.store, P_of(x.r))).status, 200);
  }
  // 결제완료만 단독으로(첫 통보·재통보·취소 뒤) 돌려도 cancel/ 쓰기 0건
  const s = new MemStore();
  const m = newMul();
  const r = newR();
  await paidOk(s, m, r);
  await fb(s, notice(4, m, r));
  s.log = [];
  await fb(s, notice(9, m, r));
  const afterCancel = s.log.length;
  await fb(s, notice(4, m, r));
  assert.ok(!s.log.slice(afterCancel).some(([op, k]) => op === "set" && k.startsWith("cancel/")));
});

test("합격 28 마지막 방어선: 같은 경쟁에서 ⑤를 건너뛰어 pass/가 paid로 남아도 status cancelled, book 403 / cancel/ 읽기 실패 → 둘 다 503", async () => {
  const { store, mul, r } = await race(false);
  const ph = ph_of(r);
  store.map.set("pass/" + ph, JSON.stringify({ mul_no: mul, state: "paid", at: new Date().toISOString() })); // ⑤ 미실행 상태
  store.map.set("mul/" + mul, JSON.stringify({ ph, state: "paid", at: new Date().toISOString() }));
  assert.deepStrictEqual((await status(store, r)).json, { state: "cancelled" });
  assert.strictEqual((await book(store, P_of(r))).status, 403);
  store.failRead = (k) => k.startsWith("cancel/");
  assert.strictEqual((await status(store, r)).status, 503);
  assert.strictEqual((await book(store, P_of(r))).status, 503);
});

test("검수 3차 권장 1: ⑤의 cancelled 쓰기가 실패해 pass/가 paid로 남으면, 재통보 ②가 cancel/을 보고 mul/·pass/를 cancelled로 고침", async () => {
  const store = new MemStore({ conditional: false });
  const mul = newMul();
  const r = newR();
  const ph = ph_of(r);
  // ⑤에서 쓰기 실패 흉내: 결제완료가 pass/를 쓴 직후 취소 표지가 생기고, 그다음 쓰기(되돌리기)가 실패
  let armed = false;
  store.before = async (op, key) => {
    if (op === "set" && key === "pass/" + ph && !armed) {
      armed = true;
      store.map.set("cancel/" + mul, JSON.stringify({ mul_no: mul, state: "cancelled", at: new Date().toISOString() }));
    } else if (armed && op === "set") throw new Error("write");
  };
  assert.strictEqual((await fb(store, notice(4, mul, r))).status, 500);
  assert.strictEqual(val(store, "pass/" + ph).state, "paid");
  store.before = null;
  assert.strictEqual((await fb(store, notice(4, mul, r))).body, "SUCCESS");
  assert.strictEqual(val(store, "pass/" + ph).state, "cancelled");
  assert.strictEqual(val(store, "mul/" + mul).state, "cancelled");
});

test("합격 26·검수 E: status 읽기 실패 → 503 (pending 아님), 복구 뒤 paid", async () => {
  const store = new MemStore();
  const mul = newMul();
  const r = newR();
  await paidOk(store, mul, r);
  store.failRead = true;
  const s = await status(store, r);
  assert.strictEqual(s.status, 503);
  assert.deepStrictEqual(s.json, { error: "store" });
  assert.strictEqual((await book(store, P_of(r))).status, 503);
  store.failRead = false;
  assert.strictEqual((await status(store, r)).json.state, "paid");
});

test("검수 D: status 횟수 제한 — 모양 틀림 10회까지 400, 11회째 429 + Retry-After / 전체 120회까지, 121회째 429 / pending은 안 셈 / 10분 뒤 풀림", async () => {
  Pay._reset();
  const store = new MemStore();
  const now = 5_000_000;
  const ip1 = "10.8.0.1";
  for (let i = 0; i < 30; i++) assert.strictEqual((await status(store, newR(), { ip: ip1, now })).json.state, "pending");
  for (let i = 0; i < 10; i++) assert.strictEqual((await status(store, { r: "zz" }, { ip: ip1, now })).status, 400, "틀림 " + (i + 1));
  const t = await status(store, { r: "zz" }, { ip: ip1, now: now + 60_000 });
  assert.strictEqual(t.status, 429);
  assert.strictEqual(t.headers["Retry-After"], String(9 * 60));
  assert.strictEqual((await status(store, newR(), { ip: ip1, now: now + 60_000 })).status, 429, "막힌 동안은 맞는 모양도");
  assert.strictEqual((await status(store, newR(), { ip: ip1, now: now + 10 * 60_000 })).status, 200, "10분 뒤 풀림");
  for (const bad of [{ r: newR(), x: 1 }, {}, [newR()], { r: 5 }, "not json"]) assert.strictEqual((await status(store, bad, { ip: "10.8.0.9", now })).status, 400);
  // 한 회차 17회 × 3 = 51회는 통과, 전체 120회까지 통과, 121회째 429
  const ip2 = "10.8.0.2";
  let n = 0;
  for (let round = 0; round < 3; round++) for (let i = 0; i < 17; i++, n++) assert.strictEqual((await status(store, newR(), { ip: ip2, now: now + n })).status, 200);
  for (; n < 120; n++) assert.strictEqual((await status(store, newR(), { ip: ip2, now: now + n })).status, 200, "요청 " + (n + 1));
  const over = await status(store, newR(), { ip: ip2, now: now + 1000 });
  assert.strictEqual(over.status, 429);
  assert.ok(Number(over.headers["Retry-After"]) > 0 && Number(over.headers["Retry-After"]) <= 600);
  assert.strictEqual(over.headers["Cache-Control"], "no-store");
  Pay._reset();
});

test("return: 본문을 읽지 않고 303 → SITE_URL#paid, 비면 상대 경로, R·결제 값 없음", async () => {
  const store = new MemStore();
  const r = newR();
  for (const method of ["GET", "POST"]) {
    const res = await Pay.handle({ method, route: "return", body: notice(4, newMul(), r), ip: "x" }, ENV, store);
    assert.strictEqual(res.status, 303);
    assert.strictEqual(res.headers.Location, ENV.SITE_URL + "#paid");
    assert.strictEqual(res.headers["Cache-Control"], "no-store");
  }
  for (const site of ["", "javascript:alert(1)/", "https://x.test/no-slash", "https://x.test/a/?q=1/"]) {
    const res = await Pay.handle({ method: "GET", route: "return", body: "", ip: "x" }, Object.assign({}, ENV, { SITE_URL: site }), store);
    assert.strictEqual(res.headers.Location, "/products/strange-oracle/#paid", site);
  }
  assert.strictEqual((await Pay.handle({ method: "PUT", route: "return", body: "", ip: "x" }, ENV, store)).status, 405);
  assert.strictEqual(store.log.length, 0);
});

test("PAY_DEBUG_FIELDS=1: 칸 이름과 참·거짓만 로그, 값 0 / 꺼져 있으면 로그 0", async () => {
  const store = new MemStore();
  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(" "));
  const r = newR();
  try {
    await fb(store, notice(4, newMul(), r));
    assert.strictEqual(lines.length, 0);
    await fb(store, notice(4, newMul(), r), Object.assign({}, ENV, { PAY_DEBUG_FIELDS: "1" }));
  } finally {
    console.log = orig;
  }
  assert.strictEqual(lines.length, 1);
  const j = JSON.parse(lines[0].replace(/^pay-debug /, ""));
  assert.ok(j.fields.includes("recvphone") && j.priceOk === true && j.tagOk === true && j.state === "4");
  for (const f of [PHONE, r, ENV.PAYAPP_LINKKEY, ENV.PAYAPP_LINKVAL, ENV.PAYAPP_USERID, "9900", "so-book-1"]) assert.ok(!lines[0].includes(f), f);
});

test("새 형식(v2) respond: 경로 끝으로 길을 고르고, 저장소 열기 실패는 503/500, 그 밖 경로 404", async () => {
  const fail = () => { throw new Error("저장소 열기 실패"); };
  const R = (p, init) => new Request("https://x.example" + p, init);
  const ret = await Pay.respond(R("/api/pay/return"), {}, fail, ENV);
  assert.strictEqual(ret.status, 303);
  const st = await Pay.respond(R("/api/pay/status", { method: "POST", body: JSON.stringify({ r: newR() }) }), { ip: "10.6.6.6" }, fail, ENV);
  assert.strictEqual(st.status, 503);
  const f = await Pay.respond(R("/api/pay/feedback", { method: "POST", body: notice(4, newMul(), newR()) }), {}, fail, ENV);
  assert.strictEqual(f.status, 500);
  assert.strictEqual((await Pay.respond(R("/api/pay/other", { method: "POST", body: "" }), {}, fail, ENV)).status, 404);
  // 저장소가 열리면 status는 pending (메모리 저장소를 Blobs 모양으로)
  const mem = new Map();
  const blobsLike = () => ({ get: async (k) => (mem.has(k) ? JSON.parse(mem.get(k)) : null), setJSON: async (k, v) => (mem.set(k, JSON.stringify(v)), { modified: true }) });
  const ok = await Pay.respond(R("/api/pay/status", { method: "POST", body: JSON.stringify({ r: newR() }) }), { ip: "10.6.6.7" }, blobsLike, ENV);
  assert.deepStrictEqual(await ok.json(), { state: "pending" });
});

// ── 설정 파일 ──
test("합격 18: package.json @netlify/blobs 버전 고정 + package-lock.json, 조건부 쓰기(onlyIfNew) 지원 확인", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.match(pkg.dependencies["@netlify/blobs"], /^\d+\.\d+\.\d+$/, "범위(^~) 없이 고정");
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8"));
  const ent = lock.packages["node_modules/@netlify/blobs"];
  assert.strictEqual(ent.version, pkg.dependencies["@netlify/blobs"]);
  assert.match(ent.resolved, /^https:\/\/registry\.npmjs\.org\//);
  for (const [k, v] of Object.entries(lock.packages)) if (k && v.resolved) assert.match(v.resolved, /^https:\/\/registry\.npmjs\.org\//, k);
  const dts = fs.readFileSync(path.join(ROOT, "node_modules", "@netlify", "blobs", "dist", "main.d.cts"), "utf8");
  assert.ok(/onlyIfNew\?: boolean/.test(dts) && /modified: boolean/.test(dts) && /connectLambda/.test(dts));
});

test("netlify.toml·v2 함수: build-dist·dist/public·함수 폴더·included_files 유지, /api/book·/api/pay/* 는 config.path", () => {
  const t = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
  assert.match(t, /command = "node tools\/build-dist\.js"/);
  assert.match(t, /publish = "dist\/public"/);
  assert.match(t, /directory = "netlify\/functions"/);
  assert.deepStrictEqual([...t.matchAll(/included_files = \[([^\]]*)\]/g)].map((m) => m[1].trim()), ['"products/strange-oracle/api/_paid/book/**"']);
  // (2026-10-22) 함수는 v2(.mjs), 주소는 config.path. 옛 redirects·v1 파일 없음
  assert.ok(!/\.netlify\/functions/.test(t.replace(/^#.*$/gm, "")), "옛 redirects 없음");
  assert.ok(fs.existsSync(path.join(ROOT, "netlify", "lib", "pay.js")) && !fs.existsSync(path.join(ROOT, "netlify", "functions", "pay.js")) && !fs.existsSync(path.join(ROOT, "netlify", "functions", "book.js")));
  const pm = fs.readFileSync(path.join(ROOT, "netlify", "functions", "pay.mjs"), "utf8"), bm = fs.readFileSync(path.join(ROOT, "netlify", "functions", "book.mjs"), "utf8");
  assert.match(pm, /export default/); assert.match(pm, /consistency: "strong"/);
  assert.match(pm, /path: \["\/api\/pay\/feedback", "\/api\/pay\/status", "\/api\/pay\/return"\]/);
  assert.match(bm, /path: "\/api\/book"/); assert.ok(!/connectLambda/.test(pm + bm));
});

test("합격 17: 저장소 파일에 실제 키처럼 보이는 linkkey·linkval·PASS_SECRET 값 0건 (함수·모의 서버·시험)", () => {
  const files = ["netlify/lib/pay.js", "netlify/lib/book.js", "netlify/functions/pay.mjs", "netlify/functions/book.mjs", "tools/strange-oracle/mock-server.js", "tools/strange-oracle/mock-pay.js", "tools/strange-oracle/pay.test.js", "netlify.toml", "package.json"];
  for (const f of files) {
    const t = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(!/(PAYAPP_LINK(KEY|VAL)|PASS_SECRET|linkkey|linkval)\s*[:=]\s*["'][^"']{8,}["']/.test(t), f);
  }
});

test("data.js 배포판: pay.mode off 또는 live(2026-10-22 live, 모의 서버가 찾는 첫 줄 모양) · 9,900원(2026-10-22)", () => {
  const w = {};
  require("vm").runInNewContext(fs.readFileSync(path.join(PROD, "data.js"), "utf8"), { window: w });
  assert.ok(["off", "live"].includes(w.TEXT.pay.mode), w.TEXT.pay.mode);
  assert.strictEqual(w.TEXT.pay.amount, 9900);
  // 19-6: 페이앱 공개 값만, 비밀값 키 없음
  assert.strictEqual(w.TEXT.pay.payapp.userid, "tjdgus0190");
  assert.strictEqual(w.TEXT.pay.payapp.shopname, "SHA Studio");
  for (const k of ["linkkey", "linkval", "PASS_SECRET"]) assert.ok(!(k in w.TEXT.pay.payapp), k);
  assert.match(fs.readFileSync(path.join(PROD, "data.js"), "utf8"), /\bpay:\s*\{\s*mode:\s*"(?:off|live)"/);
});
