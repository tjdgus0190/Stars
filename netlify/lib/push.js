// 낯선 점술관 웹 푸시 알림 — 「오늘의 안내자가 찾아왔어요」 (2026-11-16 운영자 요청)
// 보내는 것: 내용 없는 빈 알림(payload 없음). 알림 문구는 휴대폰의 서비스 워커가 공개 문구 파일(data-dex.js)로 그날 안내자를 골라 만든다
//   → 알림 서버(구글·애플·모질라)에도 문구·개인정보가 가지 않는다. 그래서 암호화 없이 VAPID 서명만 쓴다(외부 라이브러리 없음).
// 저장하는 것(저장소 strange-oracle-push): sub/<알림 주소의 sha256> = { e: 알림 주소, at: 등록 시각, ok: 마지막으로 보낸 시각 }. 이름·생년월일·카카오 계정과 잇지 않는다.
//   알림 주소 = 브라우저가 만든 무작위 주소(endpoint). 알림 끄기 → 바로 지움 · 알림 서버가 404/410(없어진 주소)을 주면 지움 · 1년 동안 보낸 적 없으면 지움
// 켜는 조건: 환경 변수 PUSH_MODE = "test"(시험 배포에서만) | "live"(어디서나). 없으면 503 off — CLAUDE.md 예외(specs/claude-md-push.md)를 운영자가 넣은 뒤에 켠다
// 서명 열쇠(VAPID): 환경 변수 VAPID_PUBLIC_KEY·VAPID_PRIVATE_KEY(base64url)가 있으면 그것, 없으면 처음 한 번 만들어 저장소 vapid에 둔다(코드·문서에 쓰지 않는다)
"use strict";
const crypto = require("crypto");

const STORE_NAME = "strange-oracle-push";
const SUBJECT = "https://strange-oracle.com";
const YEAR = 365 * 24 * 3600 * 1000;
// 알림 서버 주소만 받는다(그 밖의 주소로는 요청을 보내지 않는다)
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const json = (status, obj) => ({ status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(obj) });

function endpointOk(e) {
  if (typeof e !== "string" || e.length > 1024) return false;
  let u;
  try { u = new URL(e); } catch (x) { return false; }
  return u.protocol === "https:" && !u.username && !u.password && PUSH_HOSTS.some((re) => re.test(u.hostname));
}

// VAPID 열쇠: { pub: base64url(04|x|y), key: KeyObject }
async function vapid(env, store) {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    const pub = fromB64u(env.VAPID_PUBLIC_KEY);
    const key = crypto.createPrivateKey({ key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: env.VAPID_PRIVATE_KEY }, format: "jwk" });
    return { pub: env.VAPID_PUBLIC_KEY, key };
  }
  let v = await store.get("vapid");
  if (!v || !v.jwk) {
    const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = privateKey.export({ format: "jwk" });
    await store.set("vapid", { jwk, at: new Date().toISOString() }, { onlyIfNew: true });
    v = (await store.get("vapid")) || { jwk }; // 두 요청이 동시에 만들면 먼저 쓴 것
  }
  const key = crypto.createPrivateKey({ key: v.jwk, format: "jwk" });
  return { pub: b64u(Buffer.concat([Buffer.from([4]), fromB64u(v.jwk.x), fromB64u(v.jwk.y)])), key };
}

// 서명한 표(JWT, ES256)
function jwt(aud, key, now) {
  const enc = (o) => b64u(Buffer.from(JSON.stringify(o)));
  const data = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: SUBJECT });
  return data + "." + b64u(crypto.sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" }));
}

// 빈 알림 하나 보내기 → 알림 서버의 상태 번호(201 = 받음, 404·410 = 없어진 주소)
async function sendOne(endpoint, v, fetcher, now) {
  const aud = new URL(endpoint).origin;
  const r = await fetcher(endpoint, { method: "POST", headers: { Authorization: `vapid t=${jwt(aud, v.key, now)}, k=${v.pub}`, TTL: "43200", Urgency: "normal" } }); // 몸통 없음(빈 알림)
  return r.status;
}

const modeOn = (env) => env.PUSH_MODE === "live" || (env.PUSH_MODE === "test" && env.PUSH_TEST_DEPLOY === "1");
const hits = new Map();
const tooMany = (ip, now) => { const h = hits.get(ip) || { n: 0, since: now }; if (now - h.since > 3600000) { h.n = 0; h.since = now; } h.n++; hits.set(ip, h); return h.n > 30; };

// req = { method, route: "key"|"subscribe"|"unsubscribe"|"test", body, ip }
async function handle(req, env, store, fetcher, now = Date.now()) {
  if (!modeOn(env)) return json(503, { error: "off" });
  if (req.route === "key" && req.method === "GET") return json(200, { key: (await vapid(env, store)).pub });
  if (req.method !== "POST") return json(405, { error: "method" });
  if (tooMany(String(req.ip || "?"), now)) return json(429, { error: "rate" });
  let b = null;
  try { b = JSON.parse(req.body || "null"); } catch (x) { b = null; }
  if (!b || typeof b !== "object" || Array.isArray(b) || Object.keys(b).some((k) => k !== "endpoint") || !endpointOk(b.endpoint)) return json(400, { error: "bad" });
  const K = "sub/" + sha(b.endpoint);
  if (req.route === "subscribe") {
    const old = await store.get(K);
    await store.set(K, { e: b.endpoint, at: (old && old.at) || new Date(now).toISOString(), ok: (old && old.ok) || null });
    return json(200, { state: "on" });
  }
  if (req.route === "unsubscribe") { await store.del(K); return json(200, { state: "off" }); }
  // 시험 알림: 시험 배포에서만, 등록된 주소에만
  if (req.route === "test") {
    if (env.PUSH_TEST_DEPLOY !== "1") return json(404, { error: "route" });
    if (!(await store.get(K))) return json(404, { error: "unknown" });
    const st = await sendOne(b.endpoint, await vapid(env, store), fetcher, now);
    if (st === 404 || st === 410) await store.del(K);
    return json(200, { sent: st >= 200 && st < 300, status: st });
  }
  return json(404, { error: "route" });
}

// 매일 아침 한 번(예약 함수): 모든 주소에 빈 알림 → 없어진 주소·1년 동안 못 보낸 주소는 지운다
async function daily(env, store, fetcher, now = Date.now()) {
  if (!modeOn(env)) return { off: true };
  const v = await vapid(env, store);
  const keys = await store.keys("sub/");
  let sent = 0, gone = 0, fail = 0;
  for (const k of keys) {
    const s = await store.get(k);
    if (!s || !endpointOk(s.e)) { await store.del(k); gone++; continue; }
    let st = 0;
    try { st = await sendOne(s.e, v, fetcher, now); } catch (x) { st = 0; }
    if (st === 404 || st === 410) { await store.del(k); gone++; continue; }
    if (st >= 200 && st < 300) { sent++; await store.set(k, Object.assign({}, s, { ok: new Date(now).toISOString() })); continue; }
    fail++;
    const last = Date.parse(s.ok || s.at || 0);
    if (Number.isFinite(last) && now - last > YEAR) { await store.del(k); gone++; }
  }
  return { sent, gone, fail, total: keys.length };
}

function storeFrom(openStore) {
  let s = null;
  const open = () => s || (s = openStore());
  return {
    get: async (k) => open().get(k, { type: "json" }),
    set: async (k, v, o) => open().setJSON(k, v, o && o.onlyIfNew ? { onlyIfNew: true } : {}),
    del: async (k) => open().delete(k),
    keys: async (prefix) => { const out = []; for await (const page of open().list({ prefix, paginate: true })) for (const b of page.blobs) out.push(b.key); return out; },
  };
}

// Netlify Functions v2 요청 → handle. 시험 배포(branch-deploy)인지는 배포 종류로 정한다
const withDeploy = (env, context) => Object.assign({}, env, { PUSH_TEST_DEPLOY: context && context.deploy && context.deploy.context === "branch-deploy" ? "1" : "" });
async function respond(req, context, openStore, env = process.env, fetcher = globalThis.fetch) {
  const route = (new URL(req.url).pathname.match(/\/api\/push\/(key|subscribe|unsubscribe|test)\/?$/) || [])[1] || "";
  const body = req.method === "POST" ? await req.text() : "";
  if (body.length > 2048) return new Response(JSON.stringify({ error: "bad" }), { status: 400 });
  const r = await handle({ method: req.method, route, body, ip: String((context && context.ip) || "?") }, withDeploy(env, context), storeFrom(openStore), fetcher);
  return new Response(r.body, { status: r.status, headers: r.headers });
}

const _reset = () => hits.clear();
module.exports = { STORE_NAME, endpointOk, vapid, jwt, sendOne, handle, daily, storeFrom, respond, withDeploy, _reset, b64u, fromB64u };
