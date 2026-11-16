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
  assert.ok(t && r.headers.Location.startsWith(ENV.SITE_URL + "auth.html#kakao-")); // (2026-11-15 성능) 가벼운 복귀 페이지
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
  // (2026-10-28) keep/(열람 코드에 담은 결과)도 1년 지나면 지우고, 새 기록은 남긴다
  st.map.set("keep/old", JSON.stringify({ c: "x", at: new Date(Date.now() - Auth.KEEP_MS - 60000).toISOString() }));
  st.map.set("keep/new", JSON.stringify({ c: "x", at: new Date().toISOString() }));
  await Auth.sweep(st, list);
  assert.deepStrictEqual(await list("keep/"), ["keep/new"]);
});
test("23 v2 연결 파일: auth.mjs 새 주소 · auth-sweep 예약", () => {
  const m = fs.readFileSync(path.join(ROOT, "netlify", "functions", "auth.mjs"), "utf8");
  for (const p of ["/api/auth/me", "/api/auth/save", "/api/auth/logout", "/api/auth/erase"]) assert.ok(m.includes(`"${p}"`), p);
  assert.match(fs.readFileSync(path.join(ROOT, "netlify", "functions", "auth-sweep.mjs"), "utf8"), /schedule: "@daily"/);
});

// ── (2026-11-14 운영자) 카카오톡 채널 친구 추가 → 별가루 10 (계정에 한 번, 카카오 확인으로만)
test("채널: 시작에 ch=1일 때만 scope=plusfriends · 아니면 scope 없음", async () => {
  const st = new MemStore();
  const a = new URL((await call(st, "GET", `/api/auth/kakao/start?state=${hex()}`)).headers.Location);
  const b = new URL((await call(st, "GET", `/api/auth/kakao/start?state=${hex()}&ch=1`)).headers.Location);
  assert.strictEqual(a.searchParams.get("scope"), null);
  assert.strictEqual(b.searchParams.get("scope"), "plusfriends");
});
test("채널: 카카오가 ADDED라고 하면 로그인 때 별가루 10 한 번 · 두 번째는 0 · 표에는 참/거짓만 · earn:channel 직접 요청은 400", async () => {
  const st = new MemStore();
  const added = { idOf: async () => ({ id: "4242", ch: true }) };
  const one = await login(st, hex(), added);
  const tk = JSON.parse(st.map.get("ticket/" + one.t));
  assert.deepStrictEqual(Object.keys(tk).sort(), ["ch", "exp", "sh", "uh"]);
  const c1 = JSON.parse((await call(st, "POST", "/api/auth/claim", { t: one.t, s: one.s, login: true })).body);
  assert.strictEqual(c1.channel, 10);
  const bal = JSON.parse((await call(st, "POST", "/api/auth/dust", { sid: c1.sid })).body);
  assert.ok(bal.once.includes("channel") && bal.bal === 10);
  const two = await login(st, hex(), added);
  const c2 = JSON.parse((await call(st, "POST", "/api/auth/claim", { t: two.t, s: two.s, login: true })).body);
  assert.strictEqual(c2.channel, 0);
  assert.strictEqual((await call(st, "POST", "/api/auth/dust", { sid: c2.sid, earn: "channel" })).status, 400);
  // 추가하지 않은 상태(NONE)면 0도 아니고 칸 없음
  const none = await login(st, hex(), { idOf: async () => ({ id: "5151", ch: false }) });
  const c3 = JSON.parse((await call(st, "POST", "/api/auth/claim", { t: none.t, s: none.s, login: true })).body);
  assert.strictEqual(c3.channel, undefined);
});
test("채널: realKakao — 토큰 scope에 plusfriends가 있을 때만 talk/channels를 묻고 ADDED면 ch 참", async () => {
  const calls = [];
  const mk = (scope, relation) => async (u, o) => {
    calls.push(String(u));
    if (/oauth\/token/.test(u)) return { ok: true, json: async () => ({ access_token: "tok", scope }) };
    if (/v2\/user\/me/.test(u)) return { ok: true, json: async () => ({ id: 777 }) };
    if (/talk\/channels/.test(u)) return { ok: true, json: async () => ({ user_id: 777, channels: [{ channel_public_id: "_abc", relation }] }) };
    return { ok: false };
  };
  assert.strictEqual(await Auth.realKakao(ENV, mk("", "ADDED")).idOf("c"), "777");
  assert.ok(!calls.some((u) => /talk\/channels/.test(u)));
  assert.deepStrictEqual(await Auth.realKakao(Object.assign({}, ENV, { KAKAO_CHANNEL_ID: "_abc" }), mk("plusfriends", "ADDED")).idOf("c"), { id: "777", ch: true });
  assert.deepStrictEqual(await Auth.realKakao(ENV, mk("plusfriends", "BLOCKED")).idOf("c"), { id: "777", ch: false });
  assert.deepStrictEqual(await Auth.realKakao(Object.assign({}, ENV, { KAKAO_CHANNEL_ID: "_other" }), mk("plusfriends", "ADDED")).idOf("c"), { id: "777", ch: false });
});

// ── (2026-11-16 운영자) 심층상담 대화 보관: 동의한 계정에만 · 암호문 · 방마다 30개 · 지우기·끄기·1년 정리
const SYNC_ENV = Object.assign({}, ENV, { TALK_SYNC: "live" });
const chat = (st, body, env = SYNC_ENV, now) => call(st, "POST", "/api/auth/chat", body, null, env, now);
test("대화 보관: 꺼져 있으면 503 · 로그인 없으면 401 · 동의 전에는 쓰지 않음(409)", async () => {
  const st = new MemStore();
  const a = await loginSid(st);
  assert.strictEqual((await chat(st, { sid: a.sid }, ENV)).status, 503, "TALK_SYNC 없으면 off");
  assert.strictEqual((await chat(st, { sid: hex() })).status, 401);
  const g = JSON.parse((await chat(st, { sid: a.sid })).body);
  assert.deepStrictEqual(g, { on: false, chat: {} });
  assert.strictEqual((await chat(st, { sid: a.sid, room: "saju", add: { q: "질문", a: "답" } })).status, 409);
  assert.ok(![...st.map.keys()].some((k) => k.startsWith("chat/")), "동의 전 기록 없음");
});
test("대화 보관: 동의 → 덧붙이기 → 다른 기기(새 로그인)에서 그대로 · 저장소에는 암호문만", async () => {
  const st = new MemStore();
  const a = await loginSid(st);
  assert.strictEqual(JSON.parse((await chat(st, { sid: a.sid, consent: true })).body).on, true);
  assert.strictEqual((await chat(st, { sid: a.sid, room: "saju", add: { q: "올해 일은 어떨까요?", a: "만신이 보기엔 봄에 길이 열려요." } })).status, 200);
  assert.strictEqual((await chat(st, { sid: a.sid, put: { rune: [{ q: "룬 질문", a: "룬 답" }], saju: [{ q: "덮어쓰기?", a: "아니요" }] } })).status, 200);
  const b = await loginSid(st); // 같은 카카오 계정, 다른 기기
  const g = JSON.parse((await chat(st, { sid: b.sid })).body);
  assert.strictEqual(g.on, true);
  assert.deepStrictEqual(g.chat.saju, [{ q: "올해 일은 어떨까요?", a: "만신이 보기엔 봄에 길이 열려요." }], "계정에 있던 방은 put으로 덮지 않음");
  assert.deepStrictEqual(g.chat.rune, [{ q: "룬 질문", a: "룬 답" }]);
  const dump = [...st.map.values()].join("\n");
  assert.ok(!dump.includes("올해 일은") && !dump.includes("룬 답") && !dump.includes(KAKAO_ID), "저장소에 문답·회원번호 원문 없음");
  const other = await loginSid(st, fakeKakao("999"));
  assert.deepStrictEqual(JSON.parse((await chat(st, { sid: other.sid })).body), { on: false, chat: {} }, "다른 계정은 못 봄");
});
test("대화 보관: 방마다 최근 30개 · 길이·방 이름·모양 검사", async () => {
  const st = new MemStore();
  const a = await loginSid(st);
  await chat(st, { sid: a.sid, consent: true });
  for (let i = 0; i < 33; i++) await chat(st, { sid: a.sid, room: "star", add: { q: "q" + i, a: "a" + i } });
  const g = JSON.parse((await chat(st, { sid: a.sid })).body);
  assert.strictEqual(g.chat.star.length, 30);
  assert.strictEqual(g.chat.star[0].q, "q3");
  const bad = [
    { sid: a.sid, room: "nope", add: { q: "a", a: "b" } },
    { sid: a.sid, room: "star", add: { q: "x".repeat(301), a: "b" } },
    { sid: a.sid, room: "star", add: { q: "a", a: "x".repeat(1601) } },
    { sid: a.sid, room: "star", add: { q: "a", a: "b", name: "홍길동" } },
    { sid: a.sid, room: "star", add: { q: "", a: "b" } },
    { sid: a.sid, put: { star: [{ q: "a" }] } },
    { sid: a.sid, birth: "1990-01-01" },
  ];
  for (const x of bad) assert.strictEqual((await chat(st, x)).status, 400, JSON.stringify(x).slice(0, 80));
});
test("대화 보관: 방 지우기 · 끄기(모두 지움) · 저장한 기록 지우기 · 1년 정리", async () => {
  const st = new MemStore();
  const a = await loginSid(st);
  await chat(st, { sid: a.sid, consent: true });
  await chat(st, { sid: a.sid, room: "saju", add: { q: "a", a: "b" } });
  await chat(st, { sid: a.sid, room: "rune", add: { q: "c", a: "d" } });
  await chat(st, { sid: a.sid, room: "saju", clear: true });
  let g = JSON.parse((await chat(st, { sid: a.sid })).body);
  assert.ok(!g.chat.saju && g.chat.rune.length === 1);
  assert.deepStrictEqual(JSON.parse((await chat(st, { sid: a.sid, consent: false })).body), { on: false, chat: {} });
  assert.ok(![...st.map.keys()].some((k) => k.startsWith("chat/")), "끄면 기록 없음");
  await chat(st, { sid: a.sid, consent: true });
  await chat(st, { sid: a.sid, room: "rune", add: { q: "c", a: "d" } });
  assert.strictEqual(JSON.parse((await call(st, "POST", "/api/auth/erase", { sid: a.sid })).body).state, "erased");
  assert.ok(![...st.map.keys()].some((k) => k.startsWith("chat/")), "저장한 기록 지우기에 함께");
  const b = await loginSid(st);
  await chat(st, { sid: b.sid, consent: true });
  const list = async (pre) => [...st.map.keys()].filter((k) => k.startsWith(pre));
  await Auth.sweep(st, list, Date.now() + Auth.KEEP_MS - 60000);
  assert.ok((await list("chat/")).length === 1, "1년 안은 그대로");
  await Auth.sweep(st, list, Date.now() + Auth.KEEP_MS + 60000);
  assert.strictEqual((await list("chat/")).length, 0, "마지막 상담 뒤 1년 지나면 지움");
});
