// 낯선 점술관 — 카카오 로그인으로 산 책 다시 열기 (spec 21단계, 운영자 결정 133, CLAUDE.md 3·6장 2026-10-22 예외). 함수 auth(netlify/functions/auth.mjs)가 respond()를 부른다.
// 길 셋:
//   GET  /api/auth/kakao/start?state=S      S(32자 16진수, 브라우저 sessionStorage에만) → 카카오 인가 주소로 302. 동의 항목(scope)은 요청하지 않는다(회원번호만)
//   GET  /api/auth/kakao/callback?code&state 카카오 → 우리. 코드를 토큰으로 바꾸고 /v2/user/me로 회원번호만 받아 uh = HMAC(PASS_SECRET, "kakao:"+회원번호)
//                                            → 한 번 쓰는 표 ticket/<T>(2분) = { uh, sh: SHA-256(S), exp } → 303 SITE_URL#kakao-<T>-<S>. 토큰은 쓰고 버린다(저장 0)
//   POST /api/auth/claim  { t, s, pass?, forget? } 표를 한 번 쓰고 지운 뒤
//        pass가 있고 결제 확인(pay.passState = paid)이면 그 카카오에 연결(최대 5개) · forget이면 그 카카오의 연결을 지움 · 그 밖에는 연결된 열람 코드를 돌려줌
// 기록(Netlify Blobs "strange-oracle-pay" 같은 저장소): ticket/<T> · kakao/<uh> = { enc: [암호문…], at }
//   회원번호 원문·닉네임·이메일·토큰·이름·생년월일은 두지 않는다. 열람 코드는 AES-256-GCM(키 = HMAC(PASS_SECRET, "kakao-enc"))으로만 둔다.
// (23단계, 결정 135 — CLAUDE.md 3·6장 2026-10-23 개정) 로그인 유지·진행 저장:
//   claim에 login: true → 세션 sess/<SHA-256(sid)> = { uh, exp(30일) }을 만들고 { sid, data }도 돌려준다. sid(무작위 32자)는 브라우저 localStorage에만.
//   POST /api/auth/me     { sid }              → { passes, data }   (data = 저장한 진행·입력값, 없으면 null)
//   POST /api/auth/save   { sid, data?, pass? } → data(동의한 이용자의 이름·생년월일·태어난 시각·성별 + 방 결과 코드)를 AES-256-GCM으로 덮어쓰고, pass(결제 확인된 코드)는 연결
//   POST /api/auth/logout { sid }              → 세션만 지움
//   POST /api/auth/erase  { sid }              → 그 카카오의 기록(kakao/<uh>) 전체와 세션을 지움
//   보관: 마지막 저장·로그인 뒤 1년(KEEP_MS). 읽을 때 지난 기록은 지우고, 함수 auth-sweep이 하루 한 번 ticket/·sess/·kakao/의 지난 것을 지운다.
//   data 모양(서버가 검사): { p: { name(1~10자), birth{y,m,d}, time{h,m}|null, gender m|f|x }, v: { 방: { 숫자·짧은 글자 칸 } } }, JSON 4KB 이하. 상대(궁합) 정보·질문 글은 받지 않는다.
// 503(로그 없음): PASS_MODE가 test·live가 아님 / KAKAO_REST_KEY 빈 칸 / PASS_SECRET 32바이트 미만 / SITE_URL 모양 틀림.
"use strict";
const crypto = require("crypto");
const Pay = require("./pay.js");

const HEX32 = /^[0-9a-f]{32}$/;
const TICKET_MS = 2 * 60 * 1000;
const MAX_LINKS = 5;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 로그인 유지 30일
const KEEP_MS = 365 * 24 * 60 * 60 * 1000; // 마지막 활동 뒤 1년이면 지움
const DATA_MAX = 4096;
const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
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
const CALLBACK = "/api/auth/kakao/callback";
const redirectUri = (env) => originOf(env.SITE_URL) + CALLBACK;
// (2026-10-25 도메인 이전) 요청이 들어온 주소(우리 사이트의 Netlify 주소 또는 strange-oracle.com)를 기준으로 오가게 한다.
//   이용자가 시작한 주소로 돌아와야 그 탭의 sessionStorage(state)가 맞는다. 카카오 콘솔에는 두 주소의 Redirect URI를 모두 등록한다.
const redirectUriAt = (url) => url.origin + CALLBACK;
const homeAt = (url, env) => url.origin + new URL(env.SITE_URL).pathname; // 제품 경로는 SITE_URL에서, 주소(origin)는 요청에서

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
    async idOf(code, ru = redirectUri(env)) {
      const form = new URLSearchParams({ grant_type: "authorization_code", client_id: env.KAKAO_REST_KEY, redirect_uri: ru, code });
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
  const q = new URLSearchParams({ client_id: env.KAKAO_REST_KEY, redirect_uri: redirectUriAt(url), response_type: "code", state: s });
  return go(302, KAUTH + "/oauth/authorize?" + q.toString());
}

async function callback(url, env, store, kakao, now) {
  const back = (frag) => go(303, homeAt(url, env) + "#" + frag);
  const s = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (!HEX32.test(s) || !code || code.length > 512) return back("kakao-error");
  let id;
  try {
    id = await kakao.idOf(code, redirectUriAt(url));
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
  if (!keys || keys.some((k) => !["t", "s", "pass", "forget", "login"].includes(k)) || !HEX32.test(b.t) || !HEX32.test(b.s)) return json(400, { error: "bad" });
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
    const rec = await getRec(store, K, now);
    let passes = openPasses(env, rec);
    let linked = false;
    if (b.pass) {
      const p = Pay.normalize(b.pass);
      if ((await Pay.passState(store, env.PASS_SECRET, p)) !== "paid") return json(403, { error: "pass" });
      if (!passes.includes(p)) {
        passes = [p].concat(passes).slice(0, MAX_LINKS);
        rec.enc = passes.map((x) => seal(env.PASS_SECRET, x));
        await putRec(store, K, rec, now);
      }
      linked = true;
    }
    const live = await livePasses(store, env, passes);
    const out = { state: linked ? "linked" : live.length ? "found" : "none", passes: live };
    if (b.login === true) {
      // (23단계) 로그인 유지: 세션 하나 + 저장한 진행·입력값
      const sid = crypto.randomBytes(16).toString("hex");
      await store.set("sess/" + sha(sid), { uh: tk.uh, exp: now + SESSION_MS });
      if (rec.enc.length || rec.data) await putRec(store, K, rec, now); // 로그인도 활동 — 보관 1년을 다시 센다
      out.sid = sid;
      out.data = openData(env, rec);
    }
    return json(200, out);
  } catch (e) {
    return json(503, { error: "store" });
  }
}

// ── (23단계) 기록 읽기·쓰기 도우미
async function getRec(store, K, now) {
  const rec = await store.get(K);
  if (!rec) return { enc: [] };
  if (rec.at && Date.parse(rec.at) + KEEP_MS < now) {
    await store.del(K); // 1년 지난 기록
    return { enc: [] };
  }
  return { enc: Array.isArray(rec.enc) ? rec.enc : [], data: rec.data || null, at: rec.at };
}
async function putRec(store, K, rec, now) {
  const out = { enc: rec.enc || [], at: new Date(now).toISOString() };
  if (rec.data) out.data = rec.data;
  await store.set(K, out);
}
function openPasses(env, rec) {
  return rec.enc.map((x) => {
    try {
      return open(env.PASS_SECRET, x);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}
function openData(env, rec) {
  if (!rec.data) return null;
  try {
    return JSON.parse(open(env.PASS_SECRET, rec.data));
  } catch (e) {
    return null;
  }
}
// 취소된 결제의 코드는 돌려주지 않는다
async function livePasses(store, env, passes) {
  const live = [];
  for (const p of passes) if ((await Pay.passState(store, env.PASS_SECRET, p)) === "paid") live.push(p);
  return live;
}
// 저장 값 모양 검사: 정해 둔 칸만, 짧은 값만 (상대 정보·질문 글·그 밖의 칸이 있으면 거부)
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const plainObj = (o) => o && typeof o === "object" && !Array.isArray(o);
function dataOk(d) {
  if (!plainObj(d) || Object.keys(d).some((k) => k !== "p" && k !== "v")) return false;
  const p = d.p || {};
  if (!plainObj(p) || Object.keys(p).some((k) => !["name", "birth", "time", "gender"].includes(k))) return false;
  if (p.name != null && (typeof p.name !== "string" || [...p.name].length < 1 || [...p.name].length > 10)) return false;
  if (p.birth != null && !(plainObj(p.birth) && Object.keys(p.birth).length === 3 && isInt(p.birth.y, 1900, 2100) && isInt(p.birth.m, 1, 12) && isInt(p.birth.d, 1, 31))) return false;
  if (p.time != null && !(plainObj(p.time) && Object.keys(p.time).length === 2 && isInt(p.time.h, 0, 23) && isInt(p.time.m, 0, 59))) return false;
  if (p.gender != null && !["m", "f", "x"].includes(p.gender)) return false;
  const v = d.v || {};
  if (!plainObj(v) || Object.keys(v).some((k) => !ROOMS.includes(k))) return false;
  const leafOk = (x) => x === null || typeof x === "boolean" || (typeof x === "number" && Number.isFinite(x)) || (typeof x === "string" && x.length <= 24);
  for (const r of Object.keys(v)) {
    if (!plainObj(v[r]) || Object.keys(v[r]).length > 12) return false;
    for (const x of Object.values(v[r])) {
      if (Array.isArray(x) ? !(x.length <= 3 && x.every(leafOk)) : plainObj(x) ? !Object.values(x).every(leafOk) || Object.keys(x).length > 4 : !leafOk(x)) return false;
    }
  }
  return true;
}
// 세션 확인 → uh | null
async function sessionOf(store, sid, now) {
  if (!HEX32.test(String(sid || ""))) return null;
  const k = "sess/" + sha(sid);
  const ss = await store.get(k);
  if (!ss) return null;
  if (ss.exp < now) {
    await store.del(k);
    return null;
  }
  return ss.uh;
}
async function account(path, body, env, store, now) {
  let b = null;
  try {
    b = JSON.parse(String(body || ""));
  } catch (e) {
    b = null;
  }
  if (!plainObj(b) || Object.keys(b).some((k) => !["sid", "data", "pass"].includes(k)) || String(body).length > DATA_MAX + 200) return json(400, { error: "bad" });
  try {
    const uh = await sessionOf(store, b.sid, now);
    if (!uh) return json(401, { error: "session" });
    const K = "kakao/" + uh;
    if (path === "logout") {
      await store.del("sess/" + sha(b.sid));
      return json(200, { state: "out" });
    }
    if (path === "erase") {
      await store.del(K);
      await store.del("sess/" + sha(b.sid));
      return json(200, { state: "erased" });
    }
    const rec = await getRec(store, K, now);
    let passes = openPasses(env, rec);
    if (path === "save") {
      if (b.data != null) {
        const txt = JSON.stringify(b.data);
        if (txt.length > DATA_MAX || !dataOk(b.data)) return json(400, { error: "data" });
        rec.data = seal(env.PASS_SECRET, txt);
      }
      if (b.pass != null) {
        if (typeof b.pass !== "string") return json(400, { error: "bad" });
        const p = Pay.normalize(b.pass);
        if ((await Pay.passState(store, env.PASS_SECRET, p)) !== "paid") return json(403, { error: "pass" });
        if (!passes.includes(p)) passes = [p].concat(passes).slice(0, MAX_LINKS);
        rec.enc = passes.map((x) => seal(env.PASS_SECRET, x));
      }
      await putRec(store, K, rec, now);
      return json(200, { state: "saved" });
    }
    // me
    return json(200, { state: "me", passes: await livePasses(store, env, passes), data: openData(env, rec) });
  } catch (e) {
    return json(503, { error: "store" });
  }
}
// 하루 한 번(함수 auth-sweep): 지난 표·세션·1년 지난 기록 지우기. list = 저장소의 prefix 목록 함수(키 배열)
async function sweep(store, list, now = Date.now()) {
  let n = 0;
  for (const pre of ["ticket/", "sess/", "kakao/", "keep/"]) { // (2026-10-28) keep/ = 열람 코드에 담아 둔 결과 암호문(함수 book), 마지막 저장 뒤 1년
    for (const k of await list(pre)) {
      const r = await store.get(k);
      const gone = !r || (pre === "kakao/" || pre === "keep/" ? !r.at || Date.parse(r.at) + KEEP_MS < now : !(r.exp > now));
      if (gone) {
        await store.del(k);
        n++;
      }
    }
  }
  return n;
}

// 핵심. req = { method, url(전체 주소 문자열), body }, store = { get, set, del }, kakao = { idOf(code) }
async function handle(req, env, store, kakao, now = Date.now()) {
  if (!envOk(env || {})) return json(503, { error: "off" });
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "");
  if (p.endsWith("/api/auth/kakao/start") && req.method === "GET") return start(url, env);
  if (p.endsWith("/api/auth/kakao/callback") && req.method === "GET") return callback(url, env, store, kakao || realKakao(env, globalThis.fetch), now);
  if (p.endsWith("/api/auth/claim") && req.method === "POST") return claim(req.body, env, store, now);
  const m = /\/api\/auth\/(me|save|logout|erase)$/.exec(p);
  if (m && req.method === "POST") return account(m[1], req.body, env, store, now);
  return json(404, { error: "route" });
}

// 새 형식 함수(v2) 연결
async function respond(req, context, openStore, env = process.env, kakao = null) {
  const body = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
  const r = await handle({ method: req.method, url: req.url, body }, env, Pay.storeFrom(openStore), kakao);
  return new Response(r.body, { status: r.status, headers: r.headers });
}

module.exports = { respond, handle, realKakao, seal, open, envOk, redirectUri, sweep, dataOk, TICKET_MS, MAX_LINKS, SESSION_MS, KEEP_MS };
