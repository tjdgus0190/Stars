// (2026-11-16) 웹 푸시 알림 단위 시험: netlify/lib/push.js — 켜는 조건 · 알림 주소 검사 · 등록/끄기 · VAPID 서명 · 시험 알림 · 매일 보내기와 지우기
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const path = require("path");
const Push = require(path.join(__dirname, "..", "..", "netlify", "lib", "push.js"));

class Mem {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? JSON.parse(JSON.stringify(this.m.get(k))) : null; }
  async set(k, v, o) { if (o && o.onlyIfNew && this.m.has(k)) return; this.m.set(k, JSON.parse(JSON.stringify(v))); }
  async del(k) { this.m.delete(k); }
  async keys(prefix) { return [...this.m.keys()].filter((k) => k.startsWith(prefix)); }
}
const EP = "https://fcm.googleapis.com/fcm/send/abc123";
const EP2 = "https://web.push.apple.com/QXYZ";
const T = { PUSH_MODE: "test", PUSH_TEST_DEPLOY: "1" };
const req = (route, body, method = "POST") => ({ method, route, body: body == null ? "" : JSON.stringify(body), ip: "1.1.1.1" });

test("꺼져 있으면 503 · test는 시험 배포에서만 · live는 어디서나", async () => {
  Push._reset();
  const s = new Mem(), f = async () => ({ status: 201 });
  assert.strictEqual((await Push.handle(req("key", null, "GET"), {}, s, f)).status, 503);
  assert.strictEqual((await Push.handle(req("key", null, "GET"), { PUSH_MODE: "test" }, s, f)).status, 503);
  assert.strictEqual((await Push.handle(req("key", null, "GET"), T, s, f)).status, 200);
  assert.strictEqual((await Push.handle(req("key", null, "GET"), { PUSH_MODE: "live" }, s, f)).status, 200);
});

test("알림 주소: 알림 서버 주소만(https·정해진 곳) · 다른 칸은 거절", async () => {
  Push._reset();
  for (const ok of [EP, EP2, "https://updates.push.services.mozilla.com/wpush/v2/x"]) assert.ok(Push.endpointOk(ok), ok);
  for (const bad of ["http://fcm.googleapis.com/x", "https://evil.example.com/x", "https://fcm.googleapis.com.evil.com/x", "https://u:p@fcm.googleapis.com/x", "x".repeat(2000), 3]) assert.ok(!Push.endpointOk(bad), String(bad).slice(0, 40));
  const s = new Mem(), f = async () => ({ status: 201 });
  assert.strictEqual((await Push.handle(req("subscribe", { endpoint: "https://evil.example.com/x" }), T, s, f)).status, 400);
  assert.strictEqual((await Push.handle(req("subscribe", { endpoint: EP, name: "홍길동" }), T, s, f)).status, 400);
});

test("등록 → 저장은 알림 주소·시각뿐(키는 주소의 해시) · 끄기 → 바로 지움", async () => {
  Push._reset();
  const s = new Mem(), f = async () => ({ status: 201 });
  assert.strictEqual((await Push.handle(req("subscribe", { endpoint: EP }), T, s, f)).status, 200);
  const keys = await s.keys("sub/");
  assert.strictEqual(keys.length, 1);
  assert.ok(/^sub\/[0-9a-f]{64}$/.test(keys[0]));
  assert.deepStrictEqual(Object.keys(await s.get(keys[0])).sort(), ["at", "e", "ok"]);
  assert.strictEqual((await Push.handle(req("unsubscribe", { endpoint: EP }), T, s, f)).status, 200);
  assert.strictEqual((await s.keys("sub/")).length, 0);
});

test("VAPID: 공개 열쇠로 서명이 맞고, 알림은 빈 몸통 · 처음 만든 열쇠를 다시 쓴다", async () => {
  Push._reset();
  const s = new Mem();
  let seen = null;
  const f = async (url, o) => { seen = { url, o }; return { status: 201 }; };
  await Push.handle(req("subscribe", { endpoint: EP }), T, s, f);
  const r = await Push.handle(req("test", { endpoint: EP }), T, s, f);
  assert.strictEqual(JSON.parse(r.body).sent, true);
  assert.strictEqual(seen.url, EP);
  assert.strictEqual(seen.o.body, undefined);
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(seen.o.headers.Authorization);
  assert.ok(m);
  const [h, p, sig] = m[1].split(".");
  const pub = Push.fromB64u(m[2]);
  const key = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: Push.b64u(pub.subarray(1, 33)), y: Push.b64u(pub.subarray(33)) }, format: "jwk" });
  assert.ok(crypto.verify("sha256", Buffer.from(h + "." + p), { key, dsaEncoding: "ieee-p1363" }, Push.fromB64u(sig)));
  const claims = JSON.parse(Push.fromB64u(p).toString());
  assert.strictEqual(claims.aud, "https://fcm.googleapis.com");
  const k1 = (await Push.handle(req("key", null, "GET"), T, s, f)).body;
  const k2 = (await Push.handle(req("key", null, "GET"), T, s, f)).body;
  assert.strictEqual(k1, k2);
  assert.strictEqual(JSON.parse(k1).key, m[2]);
});

test("시험 알림: 시험 배포에서만 · 등록 안 된 주소는 거절", async () => {
  Push._reset();
  const s = new Mem(), f = async () => ({ status: 201 });
  assert.strictEqual((await Push.handle(req("test", { endpoint: EP }), T, s, f)).status, 404);
  await Push.handle(req("subscribe", { endpoint: EP }), { PUSH_MODE: "live" }, s, f);
  assert.strictEqual((await Push.handle(req("test", { endpoint: EP }), { PUSH_MODE: "live" }, s, f)).status, 404);
});

test("매일 보내기: 받은 곳은 시각 갱신 · 410·404는 지움 · 1년 동안 못 보낸 곳은 지움 · live에서만", async () => {
  Push._reset();
  const s = new Mem();
  const NOW = Date.parse("2026-12-01T00:00:00Z");
  await s.set("sub/a", { e: EP, at: "2026-11-20T00:00:00Z", ok: null });
  await s.set("sub/b", { e: EP2, at: "2026-11-20T00:00:00Z", ok: null });
  await s.set("sub/c", { e: "https://updates.push.services.mozilla.com/x", at: "2025-10-01T00:00:00Z", ok: "2025-11-01T00:00:00Z" });
  const f = async (url) => ({ status: url === EP ? 201 : url === EP2 ? 410 : 500 });
  assert.deepStrictEqual(await Push.daily({ PUSH_MODE: "test" }, s, f, NOW), { off: true });
  const r = await Push.daily({ PUSH_MODE: "live" }, s, f, NOW);
  assert.deepStrictEqual(r, { sent: 1, gone: 2, fail: 1, total: 3 });
  assert.deepStrictEqual((await s.keys("sub/")).sort(), ["sub/a"]);
  assert.strictEqual((await s.get("sub/a")).ok, "2026-12-01T00:00:00.000Z");
});
