// 21단계 단위 시험: 카카오 로그인으로 산 책 다시 열기 (netlify/lib/auth.js, spec 21-6). 카카오는 가짜(idOf)로 바꿔 끼운다. 실제 카카오 요청 0.
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("assert");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..", "..");
const Auth = require(path.join(ROOT, "netlify", "lib", "auth.js"));
const Pay = require(path.join(ROOT, "netlify", "lib", "pay.js"));
const { MemStore } = require("./mem-store.js");

const SECRET = crypto.randomBytes(32).toString("hex");
const ENV = { PASS_MODE: "test", KAKAO_REST_KEY: "rest-key-test", PASS_SECRET: SECRET, SITE_URL: "https://site.example/products/strange-oracle/" };
const hex = () => crypto.randomBytes(16).toString("hex");
const KAKAO_ID = "4242424242";
const fakeKakao = (id = KAKAO_ID) => ({ idOf: async (code) => { if (code === "bad") throw new Error("x"); return id; } });
const call = (store, method, p, body, kakao, env = ENV, now = Date.now()) => Auth.handle({ method, url: "https://site.example" + p, body: body == null ? "" : JSON.stringify(body) }, env, store, kakao || fakeKakao(), now);
// 결제 기록(함수 pay와 같은 모양) → 열람 코드 P
function paid(store, state = "paid") {
  const r = hex();
  const P = Pay.passOf(SECRET, r);
  const ph = Pay.hashOfPass(SECRET, P);
  const mul = "m" + hex().slice(0, 8);
  store.map.set("mul/" + mul, JSON.stringify({ ph, state, at: "x" }));
  store.map.set("pass/" + ph, JSON.stringify({ mul_no: mul, state, at: "x" }));
  return P;
}
async function login(store, s = hex(), kakao) {
  const r = await call(store, "GET", `/api/auth/kakao/callback?code=c1&state=${s}`, null, kakao);
  const m = /#kakao-([0-9a-f]{32})-([0-9a-f]{32})$/.exec(r.headers.Location || "");
  return { r, t: m && m[1], s };
}

test("21-6 꺼짐: 환경 변수(KAKAO_REST_KEY·PASS_SECRET·SITE_URL·PASS_MODE) 하나라도 없으면 503", async () => {
  const st = new MemStore();
  for (const k of ["KAKAO_REST_KEY", "PASS_SECRET", "SITE_URL", "PASS_MODE"]) {
    const env = Object.assign({}, ENV, { [k]: "" });
    assert.strictEqual((await call(st, "GET", `/api/auth/kakao/start?state=${hex()}`, null, null, env)).status, 503, k);
  }
});

test("21-6 시작: 카카오 인가 주소로 302, client_id·redirect_uri(사이트 출처/api/auth/kakao/callback)·state, scope 없음 · state 모양 틀리면 400", async () => {
  const s = hex();
  const r = await call(new MemStore(), "GET", `/api/auth/kakao/start?state=${s}`);
  assert.strictEqual(r.status, 302);
  const u = new URL(r.headers.Location);
  assert.strictEqual(u.origin + u.pathname, "https://kauth.kakao.com/oauth/authorize");
  assert.strictEqual(u.searchParams.get("client_id"), "rest-key-test");
  assert.strictEqual(u.searchParams.get("redirect_uri"), "https://site.example/api/auth/kakao/callback");
  assert.strictEqual(u.searchParams.get("state"), s);
  assert.ok(!u.searchParams.has("scope"));
  assert.strictEqual((await call(new MemStore(), "GET", "/api/auth/kakao/start?state=zz")).status, 400);
});

test("21-6 콜백: 표 하나(uh·state 해시·2분), 회원번호 원문 0 · 실패는 #kakao-error", async () => {
  const st = new MemStore();
  const { r, t, s } = await login(st);
  assert.strictEqual(r.status, 303);
  assert.ok(t && r.headers.Location.startsWith(ENV.SITE_URL + "#kakao-"));
  const dump = JSON.stringify(st.dump());
  assert.ok(!dump.includes(KAKAO_ID) && !dump.includes(s), "회원번호·state 원문 없음");
  const bad = await call(st, "GET", `/api/auth/kakao/callback?code=bad&state=${hex()}`);
  assert.ok(bad.headers.Location.endsWith("#kakao-error"));
  assert.ok((await call(st, "GET", `/api/auth/kakao/callback?code=c&state=nothex`)).headers.Location.endsWith("#kakao-error"));
});

test("21-6 연결 → 다른 기기 복원 → 연결 지우기, 표는 한 번만·state가 맞아야 함", async () => {
  const st = new MemStore();
  const P = paid(st);
  // 연결 (결제한 탭)
  let a = await login(st);
  assert.strictEqual((await call(st, "POST", "/api/auth/claim", { t: a.t, s: hex() })).status, 401, "state 다르면 거부");
  a = await login(st);
  let c = await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s, pass: Pay.normalize(P) });
  assert.strictEqual(c.status, 200);
  assert.deepStrictEqual(JSON.parse(c.body), { state: "linked", passes: [P] });
  assert.strictEqual((await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s })).status, 401, "같은 표 두 번 거부");
  const dump = JSON.stringify(st.dump());
  assert.ok(!dump.includes(P) && !dump.includes(KAKAO_ID), "열람 코드·회원번호 원문 없음(암호문만)");
  // 다른 기기: 같은 카카오로 로그인 → 코드 받음
  const b = await login(st);
  c = await call(st, "POST", "/api/auth/claim", { t: b.t, s: b.s });
  assert.deepStrictEqual(JSON.parse(c.body), { state: "found", passes: [P] });
  // 다른 카카오는 없음
  const o = await login(st, hex(), fakeKakao("777"));
  assert.deepStrictEqual(JSON.parse((await call(st, "POST", "/api/auth/claim", { t: o.t, s: o.s })).body), { state: "none", passes: [] });
  // 지우기
  const f = await login(st);
  assert.deepStrictEqual(JSON.parse((await call(st, "POST", "/api/auth/claim", { t: f.t, s: f.s, forget: true })).body), { state: "forgot" });
  const g = await login(st);
  assert.deepStrictEqual(JSON.parse((await call(st, "POST", "/api/auth/claim", { t: g.t, s: g.s })).body), { state: "none", passes: [] });
});

test("21-6 거부: 결제 안 된 코드 연결 403 · 취소된 결제 코드는 복원에서 빠짐 · 2분 지난 표 401 · 모르는 칸 400", async () => {
  const st = new MemStore();
  let a = await login(st);
  assert.strictEqual((await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s, pass: "SOPAAAAAAAAAAAAA" })).status, 403);
  const P = paid(st);
  a = await login(st);
  await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s, pass: P });
  // 취소 반영
  const ph = Pay.hashOfPass(SECRET, P);
  const pr = JSON.parse(st.map.get("pass/" + ph));
  st.map.set("pass/" + ph, JSON.stringify(Object.assign(pr, { state: "cancelled" })));
  a = await login(st);
  assert.deepStrictEqual(JSON.parse((await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s })).body).passes, []);
  a = await login(st);
  assert.strictEqual((await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s }, null, ENV, Date.now() + Auth.TICKET_MS + 1000)).status, 401);
  a = await login(st);
  assert.strictEqual((await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s, name: "x" })).status, 400);
});

test("21-6 v2 연결 파일·암호화 왕복", () => {
  const m = fs.readFileSync(path.join(ROOT, "netlify", "functions", "auth.mjs"), "utf8");
  assert.match(m, /export default/);
  assert.match(m, /path: \["\/api\/auth\/kakao\/start", "\/api\/auth\/kakao\/callback", "\/api\/auth\/claim"/);
  const c = Auth.seal(SECRET, "SOPTEST");
  assert.notStrictEqual(c, Auth.seal(SECRET, "SOPTEST"), "IV가 매번 다름");
  assert.strictEqual(Auth.open(SECRET, c), "SOPTEST");
  assert.throws(() => Auth.open(crypto.randomBytes(32).toString("hex"), c));
});

// ── (23단계, 결정 135) 로그인 유지·진행 저장
const DATA = { p: { name: "테스트", birth: { y: 1995, m: 3, d: 25 }, time: { h: 14, m: 37 }, gender: "f" }, v: { saju: { code: 532, archetype: "sage" }, rune: { picks: ["fehu", "uruz", "thurisaz"], topic: "me", archetype: "rebel" } } };
async function loginSid(st, kakao) {
  const a = await login(st, hex(), kakao);
  const r = await call(st, "POST", "/api/auth/claim", { t: a.t, s: a.s, login: true });
  return JSON.parse(r.body);
}
test("23 로그인: claim login → sid(32자)·data null · 세션 기록은 uh·만료뿐", async () => {
  const st = new MemStore();
  const j = await loginSid(st);
  assert.match(j.sid, /^[0-9a-f]{32}$/);
  assert.strictEqual(j.data, null);
  const dump = JSON.stringify(st.dump());
  assert.ok(!dump.includes(j.sid) && !dump.includes(KAKAO_ID), "sid·회원번호 원문 없음");
});
test("23 저장 → 다른 기기 로그인에서 같은 data·결제 코드 · 저장소에는 암호문만", async () => {
  const st = new MemStore();
  const P = paid(st);
  const a = await loginSid(st);
  assert.strictEqual((await call(st, "POST", "/api/auth/save", { sid: a.sid, data: DATA, pass: P })).status, 200);
  const dump = JSON.stringify(st.dump());
  assert.ok(!dump.includes("테스트") && !dump.includes("1995") && !dump.includes(P), "이름·생년·코드 원문 없음");
  const b = await loginSid(st);
  assert.deepStrictEqual(b.data, DATA);
  assert.deepStrictEqual(b.passes, [P]);
  const me = JSON.parse((await call(st, "POST", "/api/auth/me", { sid: b.sid })).body);
  assert.deepStrictEqual([me.data, me.passes], [DATA, [P]]);
});
test("23 거부: 모르는 칸·상대 정보·긴 글·세션 없음·만료 세션", async () => {
  const st = new MemStore();
  const a = await loginSid(st);
  const bad = [
    { p: Object.assign({}, DATA.p, { partner: { name: "x" } }), v: {} },
    { p: DATA.p, v: { sibyl: { sors: 1, question: "아주 긴 질문 글이 여기에 들어가면 안 됩니다 정말로" } } },
    { p: DATA.p, v: { other: {} } },
    { p: { name: "열한글자가넘는이름입니다" }, v: {} },
    { p: DATA.p, v: {}, extra: 1 },
  ];
  for (const d of bad) assert.strictEqual((await call(st, "POST", "/api/auth/save", { sid: a.sid, data: d })).status, 400, JSON.stringify(d));
  assert.strictEqual((await call(st, "POST", "/api/auth/save", { sid: hex(), data: DATA })).status, 401);
  assert.strictEqual((await call(st, "POST", "/api/auth/save", { sid: a.sid, pass: "SOPAAAAAAAAAAAAA" })).status, 403);
  assert.strictEqual((await call(st, "POST", "/api/auth/me", { sid: a.sid }, null, ENV, Date.now() + Auth.SESSION_MS + 1000)).status, 401);
});
test("23 로그아웃(세션만)·지우기(기록 전체)", async () => {
  const st = new MemStore();
  let a = await loginSid(st);
  await call(st, "POST", "/api/auth/save", { sid: a.sid, data: DATA });
  assert.strictEqual(JSON.parse((await call(st, "POST", "/api/auth/logout", { sid: a.sid })).body).state, "out");
  assert.strictEqual((await call(st, "POST", "/api/auth/me", { sid: a.sid })).status, 401);
  a = await loginSid(st);
  assert.deepStrictEqual(a.data, DATA, "로그아웃해도 기록은 남음");
  assert.strictEqual(JSON.parse((await call(st, "POST", "/api/auth/erase", { sid: a.sid })).body).state, "erased");
  const b = await loginSid(st);
  assert.strictEqual(b.data, null);
  assert.deepStrictEqual(b.passes, []);
});
test("23 보관 1년: 지난 기록은 읽을 때 없음 · sweep이 지난 표·세션·기록을 지움", async () => {
  const st = new MemStore();
  const a = await loginSid(st);
  await call(st, "POST", "/api/auth/save", { sid: a.sid, data: DATA });
  const later = Date.now() + Auth.KEEP_MS + 60000;
  const list = async (pre) => [...st.map.keys()].filter((k) => k.startsWith(pre));
  const n = await Auth.sweep(st, list, later);
  assert.ok(n >= 2, "kakao/·sess/ 지움: " + n);
  assert.strictEqual((await list("kakao/")).length + (await list("sess/")).length, 0);
});
test("23 v2 연결 파일: auth.mjs 새 주소 · auth-sweep 예약", () => {
  const m = fs.readFileSync(path.join(ROOT, "netlify", "functions", "auth.mjs"), "utf8");
  for (const p of ["/api/auth/me", "/api/auth/save", "/api/auth/logout", "/api/auth/erase"]) assert.ok(m.includes(`"${p}"`), p);
  assert.match(fs.readFileSync(path.join(ROOT, "netlify", "functions", "auth-sweep.mjs"), "utf8"), /schedule: "@daily"/);
});
