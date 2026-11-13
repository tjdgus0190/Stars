// 낯선 점술관 — 서버리스 함수 pay (spec 15-3, 결정 96~100, CLAUDE.md 3장 결제 최소 기록 예외). 길 세 개:
//   POST /api/pay/feedback  페이앱 → 우리 (form 인코딩). userid·linkkey·linkval 인증 → 결제완료면 기록하고 열람 코드 1개 발급. 답 SUCCESS / FAIL
//   POST /api/pay/status    브라우저 → 우리 (JSON { r } 한 칸). R → P → ph로 pass/<ph>를 찾아 { state, pass? }
//   GET·POST /api/pay/return 페이앱 → 브라우저 이동. 본문을 읽지 않고 303으로 제품 페이지 #paid
// 기록(Netlify Blobs, 저장소 "strange-oracle-pay", strong 일관성) — 값은 결제번호·상태·코드 해시·시각뿐:
//   mul/<mul_no>    { ph, state, at }       결제번호로 찾기, 먼저 온 취소의 묘비
//   pass/<ph>       { mul_no, state, at }   status·book이 코드로 찾음 (완료 표지)
//   cancel/<mul_no> { mul_no, state, at }   취소 표지. 취소 통보만 쓴다(결제완료 경로는 절대 쓰지 않음)
//   R 원문·R의 해시·P 원문·휴대폰 번호·카드 정보·IP·linkkey·linkval·입력값·결과 코드는 두지 않는다.
// 열람 코드 P = "SOP"(책) | "SNY"(2027 신년운세) + HMAC-SHA256(PASS_SECRET, "pass:" | "pass-ny:" + R)의 앞 60비트(Crockford Base32 12자) + 검사 1자 (paycode.js Pass와 같은 모양)
// 코드 해시 ph = HMAC-SHA256(PASS_SECRET, "hash:" + normalize(P)) hex — 저장소가 새도 코드를 오프라인 대입할 수 없다.
// 503(로그 없음): PASS_MODE가 test·live가 아님 / PAYAPP_USERID·LINKKEY·LINKVAL 중 빈 칸 / PASS_SECRET 32바이트 미만.
// 비밀값 비교는 양쪽 SHA-256 뒤 timingSafeEqual. 요청 본문·머리·IP를 console에 찍지 않는다(예외: PAY_DEBUG_FIELDS=1일 때 칸 이름과 참·거짓만).
// 모든 응답 Cache-Control: no-store. 핵심 handle(req, env, store, now)을 모의 서버와 단위 시험이 그대로 부른다.
// 형식: 핵심 로직(이 파일, CommonJS). 실제 함수는 netlify/functions/pay.mjs(Functions v2)가 respond()를 부른다.
"use strict";
const crypto = require("crypto");
const Dust = require("./dust.js"); // 별가루 충전 코드 취소 시 회수(dust.js는 pay.js를 부르지 않는다)

const STORE_NAME = "strange-oracle-pay";
const PRICE = 9900;
// (2026-10-27 운영자) 첫 계절 값: 이 시각까지 4,900원 결제도 받는다(화면은 products/strange-oracle/data.js pay.season과 같은 값·시각).
// 마감 뒤 24시간은 마감 직전에 연 결제창이 늦게 끝나도 받는 여유. 취소 통보는 가격을 보지 않으므로 영향 없음
const SEASON = { price: 4900, until: Date.parse("2026-11-30T23:59:59+09:00"), graceMs: 24 * 60 * 60 * 1000 };
const priceOk = (n, now) => n === PRICE || (n === SEASON.price && now <= SEASON.until + SEASON.graceMs);
const TAG = "so-book-1";
// (2026-11-12 운영자 결정) 2027 신년운세는 책과 따로 파는 상품: 4,900원 고정, 꼬리표 so-ny-1, 열람 코드 SNY-….
//   책 코드(SOP)로는 신년운세가 열리지 않고, 신년운세 코드(SNY)로는 책이 열리지 않는다(함수 book이 접두로 가른다).
//   기록 모양은 그대로(결제번호·상태·코드 해시·시각). 상품은 코드 접두로 알 수 있어 따로 적지 않는다.
const TAG_NY = "so-ny-1";
const NY_PRICE = 4900;
// (2026-11-13 운영자 결정, CLAUDE.md 7장 재화) 별가루 충전 3종: 50 = 2,900원 · 120 = 5,900원 · 300 = 12,900원. 결제 코드 SDA·SDB·SDC는
//   카카오 계정에 한 번만 충전하는 데 쓰고(netlify/lib/dust.js), 책·신년운세를 열지 않는다(함수 book이 접두로 가른다)
const DUST_PRICES = Object.freeze({ dust50: 2900, dust120: 5900, dust300: 12900 });
const PRODUCTS = Object.freeze({
  book: { tag: TAG, prefix: "SOP", salt: "pass:", price: (n, now) => priceOk(n, now) },
  ny: { tag: TAG_NY, prefix: "SNY", salt: "pass-ny:", price: (n) => n === NY_PRICE },
  dust50: { tag: "so-dust50-1", prefix: "SDA", salt: "pass-dust50:", price: (n) => n === DUST_PRICES.dust50 },
  dust120: { tag: "so-dust120-1", prefix: "SDB", salt: "pass-dust120:", price: (n) => n === DUST_PRICES.dust120 },
  dust300: { tag: "so-dust300-1", prefix: "SDC", salt: "pass-dust300:", price: (n) => n === DUST_PRICES.dust300 },
});
const productOfTag = (t) => Object.keys(PRODUCTS).find((k) => PRODUCTS[k].tag === t) || null;
const R_RE = /^[0-9a-f]{32}$/;
const MUL_RE = /^[0-9A-Za-z_-]{1,40}$/; // 키 이름에 들어가므로 모양을 좁힌다
const CANCEL_STATES = new Set(["8", "32", "9", "64", "70", "71"]); // 요청취소·승인취소·부분취소
const WINDOW_MS = 10 * 60 * 1000;
const MAX_BAD = 10; // 모양 틀린 r, IP당 10분
const MAX_ALL = 120; // 전체 status 요청, IP당 10분
const MAX_STATUS_BODY = 256;
const MAX_FEEDBACK_BODY = 8192;
const RETURN_FALLBACK = "/products/strange-oracle/#paid"; // SITE_URL이 비었을 때 (같은 사이트의 제품 페이지)
const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const sha = (s) => crypto.createHash("sha256").update(String(s == null ? "" : s), "utf8").digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b)); // 길이가 달라도 예외 없음
const secretOk = (s) => typeof s === "string" && Buffer.byteLength(s, "utf8") >= 32;
const normalize = (s) => String(s || "").toUpperCase().replace(/[\s-]+/g, "");
function checkChar(body) {
  let s = 0;
  for (let i = 0; i < body.length; i++) s += (2 * i + 1) * ALPHA.indexOf(body[i]);
  return ALPHA[s % 32];
}
// R → P (결정적, 결제 1건 = R 1개 = 코드 1개). prod "ny"면 다른 소금·접두(SNY)라 같은 R이라도 책 코드와 겹치지 않는다
function passOf(secret, r, prod = "book") {
  const D = PRODUCTS[prod] || PRODUCTS.book;
  const d = crypto.createHmac("sha256", secret).update(D.salt + r).digest();
  let body = "";
  let acc = 0;
  let bits = 0;
  for (let i = 0; body.length < 12; i++) {
    acc = (acc << 8) | d[i];
    bits += 8;
    while (bits >= 5 && body.length < 12) {
      bits -= 5;
      body += ALPHA[(acc >> bits) & 31];
    }
    acc &= (1 << bits) - 1;
  }
  return D.prefix + body + checkChar(body);
}
const hashOfPass = (secret, p) => crypto.createHmac("sha256", secret).update("hash:" + normalize(p)).digest("hex");

function envOk(env) {
  if (env.PASS_MODE !== "live" && env.PASS_MODE !== "test") return false;
  if (!env.PAYAPP_USERID || !env.PAYAPP_LINKKEY || !env.PAYAPP_LINKVAL) return false;
  return secretOk(env.PASS_SECRET);
}

const H_TEXT = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };
const H_JSON = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const text = (status, body) => ({ status, headers: Object.assign({}, H_TEXT), body });
const json = (status, obj, extra) => ({ status, headers: Object.assign({}, H_JSON, extra || {}), body: JSON.stringify(obj) });

// ── 횟수 제한 (status만, 함수 인스턴스 메모리, IP는 Map 키로만) ──
const hits = new Map(); // ip → { all, bad, since }
function slot(ip, now) {
  let h = hits.get(ip);
  if (!h || now - h.since >= WINDOW_MS) {
    h = { all: 0, bad: 0, since: now };
    hits.set(ip, h);
  }
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.since >= WINDOW_MS) hits.delete(k);
  return h;
}
const retryAfter = (h, now) => String(Math.max(1, Math.ceil((h.since + WINDOW_MS - now) / 1000)));

// ── 기록 처리. store = { get(key) → 값|null (실패면 throw), set(key, value, { onlyIfNew }) → { modified } } ──
const iso = (now) => new Date(now).toISOString();

// mul/·(같은 mul_no의) pass/를 cancelled로. 결제완료 ②(기획 검수 3차 권장 1)·⑤에서 쓴다. cancel/은 쓰지 않는다.
async function settleCancelled(store, mul, ph, at) {
  const M = "mul/" + mul;
  const m = await store.get(M);
  if (!m || m.state !== "cancelled" || (m.ph == null && ph)) await store.set(M, { ph: (m && m.ph) || ph || null, state: "cancelled", at });
  if (!ph) return;
  const pr = await store.get("pass/" + ph);
  if (pr && pr.mul_no === mul && pr.state !== "cancelled") await store.set("pass/" + ph, { mul_no: mul, state: "cancelled", at });
}

// 결제완료(4). 쓰는 키는 mul/·pass/뿐 (cancel/ 0건, 합격 27)
async function onPaid(store, secret, mul, r, now, prod = "book") {
  const at = iso(now);
  const ph = hashOfPass(secret, passOf(secret, r, prod)); // ①
  const M = "mul/" + mul;
  const PK = "pass/" + ph;
  const C = "cancel/" + mul;
  // ② 취소 표지가 있으면 열지 않고 끝. 남은 paid 기록은 cancelled로 맞춘다(권장 1: ⑤ 쓰기 실패 뒤 재통보 복구)
  if (await store.get(C)) return settleCancelled(store, mul, ph, at);
  let m = await store.get(M);
  if (m && m.state === "cancelled") return;
  // ③
  const pr = await store.get(PK);
  if (pr && pr.mul_no !== mul) {
    // 같은 R로 두 번째 결제(B-3): mul/만 남기고 pass/는 건드리지 않는다(운영자 환불용)
    if (!m) await store.set(M, { ph, state: "paid", at }, { onlyIfNew: true });
  } else if (pr) {
    // 재통보: mul/이 없을 때만 채운다
    if (!m) await store.set(M, { ph, state: pr.state === "cancelled" ? "cancelled" : "paid", at }, { onlyIfNew: true });
  } else {
    // ④ mul/ 먼저, pass/ 마지막. 추가 방어: mul/은 "없을 때만 쓰기" — 그 사이 취소 묘비가 생겼으면 여기서 멈춘다
    if (!m) {
      const w = await store.set(M, { ph, state: "paid", at }, { onlyIfNew: true });
      if (w && w.modified === false) {
        m = await store.get(M);
        if (!m || m.state === "cancelled") return;
      }
    }
    await store.set(PK, { mul_no: mul, state: "paid", at }, { onlyIfNew: true }); // 다른 mul_no가 먼저 썼으면 그대로 둔다
  }
  // ⑤ 취소 표지를 다시 본다 (2차 검수의 4단계 경쟁)
  if (await store.get(C)) await settleCancelled(store, mul, ph, at);
}

// 취소(8·32·9·64·70·71): cancel/ → mul/ → pass/ 순서. 금액·var1 모양은 보지 않는다(B-1). r은 올바른 모양일 때만 넘어온다
async function onCancel(store, secret, mul, r, now, prod = "book") {
  const at = iso(now);
  const M = "mul/" + mul;
  await store.set("cancel/" + mul, { mul_no: mul, state: "cancelled", at }, { onlyIfNew: true }); // ① 이미 있으면 그대로
  const m = await store.get(M); // ②
  const ph = (m && m.ph) || (r ? hashOfPass(secret, passOf(secret, r, prod)) : null);
  // ③ 있으면 cancelled로, ④ 없으면(먼저 온 취소, B-2) 묘비 { ph | null, cancelled }
  if (!m || m.state !== "cancelled" || (m.ph == null && ph)) await store.set(M, { ph: ph || null, state: "cancelled", at });
  if (!ph) return;
  const pr = await store.get("pass/" + ph);
  if (pr && pr.mul_no === mul && pr.state !== "cancelled") await store.set("pass/" + ph, { mul_no: mul, state: "cancelled", at });
  // (v1-D) 별가루 충전 코드였으면 충전한 양을 되돌린다(충전 전이면 아무 일 없음)
  await Dust.refund(store, ph, now);
}

// 코드 P의 결제 상태: "paid" | "cancelled" | null (기록 없음). 읽기 실패는 throw. 함수 book도 쓴다
async function passState(store, secret, p) {
  const pr = await store.get("pass/" + hashOfPass(secret, p));
  if (!pr) return null;
  if (pr.state !== "paid") return "cancelled";
  return (await store.get("cancel/" + pr.mul_no)) ? "cancelled" : "paid"; // 마지막 방어선
}

async function feedback(req, env, store, now) {
  if (req.method !== "POST") return text(405, "FAIL");
  const raw = String(req.body || "");
  if (raw.length > MAX_FEEDBACK_BODY) return text(400, "FAIL");
  const f = new URLSearchParams(raw);
  if (env.PAY_DEBUG_FIELDS === "1") {
    // 실결제 시험 G7 ⑦ 전용: 칸 이름과 기대값 일치 여부(참·거짓)만. 값은 남기지 않는다
    console.log("pay-debug " + JSON.stringify({ fields: [...new Set(f.keys())].sort(), state: /^\d{1,3}$/.test(f.get("pay_state") || "") ? f.get("pay_state") : "?", priceOk: priceOk(Number(f.get("price")), now) || Number(f.get("price")) === NY_PRICE, tagOk: f.get("var2") === TAG, tagNy: f.get("var2") === TAG_NY }));
  }
  const a = same(f.get("userid"), env.PAYAPP_USERID);
  const b = same(f.get("linkkey"), env.PAYAPP_LINKKEY);
  const c = same(f.get("linkval"), env.PAYAPP_LINKVAL);
  if (!(a && b && c)) return text(403, "FAIL");
  // 이 아래에서 읽는 칸은 pay_state·mul_no·var1(그리고 요청·결제완료의 확인용 price·var2)뿐. recvphone·카드 정보 등은 읽지 않는다
  const state = String(f.get("pay_state") || "");
  const mul = String(f.get("mul_no") || "");
  const r = String(f.get("var1") || "");
  // 상품은 var2(꼬리표)로 가른다: so-book-1 = 책, so-ny-1 = 신년운세. 가격도 그 상품 값이어야 한다
  const prod = productOfTag(f.get("var2"));
  if (state === "1" || state === "4") {
    const price = String(f.get("price") || "");
    if (!prod || !/^\d{1,9}$/.test(price) || !PRODUCTS[prod].price(Number(price), now) || !R_RE.test(r)) return text(400, "FAIL");
    if (state === "1") return text(200, "SUCCESS");
    if (!MUL_RE.test(mul)) return text(400, "FAIL");
    try {
      await onPaid(store, env.PASS_SECRET, mul, r, now, prod);
    } catch (e) {
      return text(500, "FAIL"); // checkretry=y → 페이앱이 다시 보낸다
    }
    return text(200, "SUCCESS");
  }
  if (CANCEL_STATES.has(state)) {
    if (!MUL_RE.test(mul)) return text(400, "FAIL");
    try {
      await onCancel(store, env.PASS_SECRET, mul, R_RE.test(r) ? r : null, now, prod || "book"); // 꼬리표가 없으면 책으로 본다(mul/ 기록이 있으면 그 해시를 쓴다)
    } catch (e) {
      return text(500, "FAIL");
    }
    return text(200, "SUCCESS");
  }
  return text(200, "SUCCESS"); // 10 결제대기 등: 기록 없음
}

async function status(req, env, store, now) {
  if (req.method !== "POST") return json(405, { error: "method" });
  const h = slot(String(req.ip || "unknown"), now);
  if (h.bad >= MAX_BAD || h.all >= MAX_ALL) return json(429, { error: "busy" }, { "Retry-After": retryAfter(h, now) });
  h.all++;
  const raw = String(req.body || "");
  let b = null;
  if (raw.length <= MAX_STATUS_BODY) {
    try {
      b = JSON.parse(raw);
    } catch (e) {
      b = null;
    }
  }
  const okShape = b && typeof b === "object" && !Array.isArray(b) && Object.keys(b).length === 1 && typeof b.r === "string" && R_RE.test(b.r);
  if (!okShape) {
    h.bad++;
    return json(400, { error: "bad" });
  }
  // R 하나로 모든 상품의 코드를 본다(브라우저는 어느 상품인지 보내지 않는다 — 본문은 { r } 한 칸 그대로)
  let anyCancelled = false;
  for (const prod of Object.keys(PRODUCTS)) {
    const P = passOf(env.PASS_SECRET, b.r, prod);
    let st;
    try {
      st = await passState(store, env.PASS_SECRET, P);
    } catch (e) {
      return json(503, { error: "store" }); // pending으로 바꾸지 않는다(검수 E)
    }
    if (st === "paid") return json(200, { state: "paid", pass: P });
    if (st === "cancelled") anyCancelled = true;
  }
  if (anyCancelled) return json(200, { state: "cancelled" });
  return json(200, { state: "pending" });
}

function back(req, env) {
  if (req.method !== "GET" && req.method !== "POST") return text(405, "");
  const site = String(env.SITE_URL || "");
  // (2026-10-25 도메인 이전) 주소(origin)는 붙이지 않고 경로만 → 이용자가 결제를 시작한 주소(Netlify 주소·strange-oracle.com)로 돌아가 그 탭의 sessionStorage가 이어진다
  // (v1-D) 별가루 충전은 별가루 페이지로 돌아간다(고정 경로, 다른 값은 받지 않음)
  if (req.to === "dust") return { status: 303, headers: Object.assign({}, H_TEXT, { Location: "/stardust/#paid" }), body: "" };
  const to = /^https?:\/\/[^\s#?"'<>]+\/$/.test(site) ? new URL(site).pathname + "#paid" : RETURN_FALLBACK;
  return { status: 303, headers: Object.assign({}, H_TEXT, { Location: to }), body: "" }; // R·결제 값을 붙이지 않는다
}

// 핵심. req = { method, route: "feedback"|"status"|"return", body(문자열), ip }, env = 환경 변수, store = 위 모양
async function handle(req, env, store, now = Date.now()) {
  if (!envOk(env || {})) return json(503, { error: "off" });
  if (req.route === "feedback") return feedback(req, env, store, now);
  if (req.route === "status") return status(req, env, store, now);
  if (req.route === "return") return back(req, env);
  return json(404, { error: "route" });
}

// Netlify Blobs 저장소(getStore 결과)를 위 store 모양으로. open()은 처음 쓸 때 한 번(열기 실패도 읽기·쓰기 실패로 다룬다)
//   (2026-10-22) 옛 Lambda 호환 함수의 connectLambda는 strong 읽기에 필요한 uncachedEdgeURL을 주지 않아 모든 읽기가 실패했다(운영 503 "store").
//   그래서 함수를 새 형식(Functions v2, netlify/functions/pay.mjs)으로 바꾸고, 저장소는 그쪽에서 getStore로 열어 넘긴다.
function storeFrom(openStore) {
  let s = null;
  const open = () => s || (s = openStore());
  return {
    get: async (key) => open().get(key, { type: "json" }),
    set: async (key, value, o) => {
      const w = await open().setJSON(key, value, o && o.onlyIfNew ? { onlyIfNew: true } : {});
      return { modified: !w || w.modified !== false };
    },
    del: async (key) => open().delete(key), // (21단계) 카카오 로그인 표·연결 지우기
  };
}

// 새 형식 함수(v2)의 요청 → handle. req = 웹 표준 Request, context.ip = 접속 IP(메모리 Map 키로만)
async function respond(req, context, openStore, env = process.env) {
  const route = (new URL(req.url).pathname.match(/\/(feedback|status|return)\/?$/) || [])[1] || "";
  const body = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
  const to = new URL(req.url).searchParams.get("to") === "dust" ? "dust" : "";
  const r = await handle({ method: req.method, route, body, to, ip: String((context && context.ip) || "unknown") }, env, storeFrom(openStore), Date.now());
  return new Response(r.body, { status: r.status, headers: r.headers });
}

const _reset = () => hits.clear();
const productOfPass = (p) => { const n = normalize(p); return Object.keys(PRODUCTS).find((k) => n.startsWith(PRODUCTS[k].prefix)) || "book"; };
module.exports = { DUST_PRICES, productOfTag, respond, handle, storeFrom, passOf, hashOfPass, passState, secretOk, normalize, productOfPass, STORE_NAME, PRICE, SEASON, priceOk, TAG, TAG_NY, NY_PRICE, PRODUCTS, CANCEL_STATES, _hits: hits, _reset };
