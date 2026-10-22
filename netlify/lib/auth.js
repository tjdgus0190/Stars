// 낯선 점술관 — 카카오 로그인으로 산 책 다시 열기 (spec 21단계, 운영자 결정 133, CLAUDE.md 3·6장 2026-10-22 예외). 함수 auth(netlify/functions/auth.mjs)가 respond()를 부른다.
// 길 셋:
//   GET  /api/auth/kakao/start?state=S      S(32자 16진수, 브라우저 sessionStorage에만) → 카카오 인가 주소로 302. 동의 항목(scope)은 요청하지 않는다(회원번호만)
//   GET  /api/auth/kakao/callback?code&state 카카오 → 우리. 코드를 토큰으로 바꾸고 /v2/user/me로 회원번호만 받아 uh = HMAC(PASS_SECRET, "kakao:"+회원번호)
//                                            → 한 번 쓰는 표 ticket/<T>(2분) = { uh, sh: SHA-256(S), exp } → 303 SITE_URL#kakao-<T>-<S>. 토큰은 쓰고 버린다(저장 0)
//   POST /api/auth/claim  { t, s, pass?, forget? } 표를 한 번 쓰고 지운 뒤
//        pass가 있고 결제 확인(pay.passState = paid)이면 그 카카오에 연결(최대 5개) · forget이면 그 카카오의 연결을 지움 · 그 밖에는 연결된 열람 코드를 돌려줌
// 기록(Netlify Blobs "strange-oracle-pay" 같은 저장소): ticket/<T> · kakao/<uh> = { enc: [암호문…], at }
//   회원번호 원문·닉네임·이메일·토큰·이름·생년월일은 두지 않는다. 열람 코드는 AES-256-GCM(키 = HMAC(PASS_SECRET, "kakao-enc"))으로만 둔다.
// 503(로그 없음): PASS_MODE가 test·live가 아님 / KAKAO_REST_KEY 빈 칸 / PASS_SECRET 32바이트 미만 / SITE_URL 모양 틀림.
"use strict";
const crypto = require("crypto");
const Pay = require("./pay.js");

const HEX32 = /^[0-9a-f]{32}$/;
const TICKET_MS = 2 * 60 * 1000;
const MAX_LINKS = 5;
const KAUTH = "https://kauth.kakao.com";
const KAPI = "https://kapi.kakao.com";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const hmac = (secret, s) => crypto.createHmac("sha256", secret).update(s).digest("hex");
const siteOk = (u) => /^https?:\/\/[^\s#?"'<>]+\/$/.test(String(u || ""));
const originOf = (u) => new URL(u).origin;
const H = { "Cache-Control": "no-store" };
const json = (status, obj) => ({ status, headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, H), body: JSON.stringify(obj) });
const go = (status, to) => ({ status, headers: Object.assign({ Location: to }, H), body: "" });

function envOk(env) {
  if (env.PASS_MODE !== "live" && env.PASS_MODE !== "test") return false;
  return Boolean(env.KAKAO_REST_KEY) && Pay.secretOk(env.PASS_SECRET) && siteOk(env.SITE_URL);
}
const redirectUri = (env) => originOf(env.SITE_URL) + "/api/auth/kakao/callback";

// 열람 코드 암호화 (저장소가 새도 코드가 드러나지 않게)
const encKey = (secret) => crypto.createHmac("sha256", secret).update("kakao-enc").digest();
function seal(secret, text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", encKey(secret), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}
function open(secret, b64) {
  const raw = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", encKey(secret), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

// 실제 카카오 호출 (시험에서는 같은 모양의 가짜를 넘긴다): code → 회원번호(문자열) | throw
function realKakao(env, fetchImpl) {
  return {
    async idOf(code) {
      const form = new URLSearchParams({ grant_type: "authorization_code", client_id: env.KAKAO_REST_KEY, redirect_uri: redirectUri(env), code });
      if (env.KAKAO_CLIENT_SECRET) form.set("client_secret", env.KAKAO_CLIENT_SECRET);
      const t = await fetchImpl(KAUTH + "/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: form.toString() });
      if (!t.ok) throw new Error("token");
      const tok = (await t.json()).access_token;
      if (!tok) throw new Error("token");
      const me = await fetchImpl(KAPI + "/v2/user/me", { headers: { Authorization: "Bearer " + tok } });
      if (!me.ok) throw new Error("me");
      const id = (await me.json()).id;
      if (id == null || !/^\d{1,20}$/.test(String(id))) throw new Error("me");
      return String(id);
    },
  };
}

async function start(url, env) {
  const s = url.searchParams.get("state") || "";
  if (!HEX32.test(s)) return json(400, { error: "bad" });
  const q = new URLSearchParams({ client_id: env.KAKAO_REST_KEY, redirect_uri: redirectUri(env), response_type: "code", state: s });
  return go(302, KAUTH + "/oauth/authorize?" + q.toString());
}

async function callback(url, env, store, kakao, now) {
  const back = (frag) => go(303, env.SITE_URL + "#" + frag);
  const s = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (!HEX32.test(s) || !code || code.length > 512) return back("kakao-error");
  let id;
  try {
    id = await kakao.idOf(code);
  } catch (e) {
    return back("kakao-error");
  }
  const t = crypto.randomBytes(16).toString("hex");
  try {
    await store.set("ticket/" + t, { uh: hmac(env.PASS_SECRET, "kakao:" + id), sh: sha(s), exp: now + TICKET_MS });
  } catch (e) {
    return back("kakao-error");
  }
  return back(`kakao-${t}-${s}`);
}

async function claim(body, env, store, now) {
  let b = null;
  try {
    b = JSON.parse(String(body || ""));
  } catch (e) {
    b = null;
  }
  const keys = b && typeof b === "object" && !Array.isArray(b) ? Object.keys(b) : null;
  if (!keys || keys.some((k) => !["t", "s", "pass", "forget"].includes(k)) || !HEX32.test(b.t) || !HEX32.test(b.s)) return json(400, { error: "bad" });
  if (b.pass != null && typeof b.pass !== "string") return json(400, { error: "bad" });
  let tk;
  try {
    tk = await store.get("ticket/" + b.t);
    if (tk) await store.del("ticket/" + b.t); // 한 번만
  } catch (e) {
    return json(503, { error: "store" });
  }
  if (!tk || tk.exp < now || tk.sh !== sha(b.s)) return json(401, { error: "ticket" });
  const K = "kakao/" + tk.uh;
  try {
    if (b.forget === true) {
      await store.del(K);
      return json(200, { state: "forgot" });
    }
    const rec = (await store.get(K)) || { enc: [] };
    let passes = rec.enc.map((x) => {
      try {
        return open(env.PASS_SECRET, x);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    let linked = false;
    if (b.pass) {
      const p = Pay.normalize(b.pass);
      if ((await Pay.passState(store, env.PASS_SECRET, p)) !== "paid") return json(403, { error: "pass" });
      if (!passes.includes(p)) {
        passes = [p].concat(passes).slice(0, MAX_LINKS);
        await store.set(K, { enc: passes.map((x) => seal(env.PASS_SECRET, x)), at: new Date(now).toISOString() });
      }
      linked = true;
    }
    // 취소된 결제의 코드는 돌려주지 않는다
    const live = [];
    for (const p of passes) if ((await Pay.passState(store, env.PASS_SECRET, p)) === "paid") live.push(p);
    return json(200, { state: linked ? "linked" : live.length ? "found" : "none", passes: live });
  } catch (e) {
    return json(503, { error: "store" });
  }
}

// 핵심. req = { method, url(전체 주소 문자열), body }, store = { get, set, del }, kakao = { idOf(code) }
async function handle(req, env, store, kakao, now = Date.now()) {
  if (!envOk(env || {})) return json(503, { error: "off" });
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "");
  if (p.endsWith("/api/auth/kakao/start") && req.method === "GET") return start(url, env);
  if (p.endsWith("/api/auth/kakao/callback") && req.method === "GET") return callback(url, env, store, kakao || realKakao(env, globalThis.fetch), now);
  if (p.endsWith("/api/auth/claim") && req.method === "POST") return claim(req.body, env, store, now);
  return json(404, { error: "route" });
}

// 새 형식 함수(v2) 연결
async function respond(req, context, openStore, env = process.env, kakao = null) {
  const body = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
  const r = await handle({ method: req.method, url: req.url, body }, env, Pay.storeFrom(openStore), kakao);
  return new Response(r.body, { status: r.status, headers: r.headers });
}

module.exports = { respond, handle, realKakao, seal, open, envOk, redirectUri, TICKET_MS, MAX_LINKS };
