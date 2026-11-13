// 낯선 점술관 — 함수 talk: 안내자 면담 (2026-11-13, 정식판 v1-D · specs/proposal-strange-oracle-v1.md 2장·8장).
// 길: POST /api/talk  JSON { room, r, q, hist, sid? }   sid = 카카오 로그인 표 → 충전한 별가루(계정)에서 10 차감(netlify/lib/dust.js). 없으면 무료 몫(이 기기, 서버는 하루 질문 수만 셈)
//   room  일곱 방 이름
//   r     그 방 결과 번호만 (방마다 모양이 정해짐, 아래 R_SHAPE). 없으면 null — 결과 없이 묻기
//   q     질문 글 (1~300자)
//   hist  앞선 문답 최대 3개 [{ q, a }] (각 300자·600자 이하) — 서버에 남기지 않는다
//   이름·생년월일·태어난 시각·성별은 받지 않는다(모양 검사에서 모르는 칸이 있으면 400).
// 답: 200 { a, declined?, paid?(남은 충전 별가루) } | 401 { error: "session" } | 402 { error: "dust" } | 400 { error: "bad" } | 429 { error: "rate" } | 503 { error: "off" | "budget" } | 502 { error: "upstream" }
//
// 켜는 조건 (하나라도 빠지면 503 off, 로그 없음):
//   TALK_MODE = "test" | "live",  ANTHROPIC_API_KEY,  TALK_MONTHLY_USD > 0 (월 비용 상한, 미국 달러)
//   CLAUDE.md 3·6·7장 면담·재화 예외(운영자 2026-11-13 반영).
// 저장(Netlify Blobs, 저장소 "strange-oracle-talk"): budget/<YYYY-MM> { usd, n } — 이번 달 쓴 돈(추정)과 문답 수뿐.
//   질문 글·답·IP·방 결과는 저장하지 않고 console에도 찍지 않는다.
// 횟수 제한(함수 인스턴스 메모리, IP는 Map 키로만): 10분에 12번, 한국 날짜 하루 무료 질문 4번(별가루 무료 몫 30 + 첫 방문 10 = 4번).
// 모델: TALK_MODEL(기본 claude-opus-5-5, 운영자 설정 claude-sonnet-5-5 — "sonnet-5-5"처럼 적어도 받는다). 거절(refusal) 시 서버 쪽 대체 모델(fallbacks "default")로 한 번 더 가고, 그래도 거절이면 안내자 말투의 정해진 한 줄.
// 핵심 handle(req, env, store, now, llm)을 모의 서버·단위 시험이 그대로 부른다(llm을 가짜로 바꿔 끼운다).
"use strict";
const Prompt = require("./talk-prompt.js");
const Dust = require("./dust.js");
const TALK_COST = 10; // 질문 하나 = 별가루 10 (화면 data-nav.js cost.talk와 같은 값)

const STORE_NAME = "strange-oracle-talk";
const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const MAX_Q = 300;
const MAX_A = 600;
const MAX_HIST = 3;
const MAX_BODY = 4096;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_WINDOW = 12;
const FREE_PER_DAY = 4;
const DEFAULT_MODEL = "claude-opus-5-5";
// 100만 토큰당 달러 (입력, 출력, 캐시 읽기, 캐시 쓰기 5분) — 2026-11-03 공식 표. 모르는 모델이면 가장 비싼 값으로 셈(상한을 넘기지 않게)
const PRICES = {
  "claude-opus-5-5": [4, 20, 0.2, 5],
  "claude-sonnet-5-5": [2, 10, 0.1, 2.5],
  "claude-haiku-5-5": [0.1, 0.5, 0.01, 0.125],
};
const PRICE_MAX = [10, 50, 1, 12.5];

// 방마다 결과 번호 모양: 칸 이름 → [최소, 최대] (정수). rune.p는 룬 코드 3개(서로 다름, 룬 표에 있는 것만)
const R_SHAPE = {
  saju: { s: [0, 9] }, // 일간(천간 번호)
  ogham: { i: [0, 19] },
  star: { i: [0, 26] }, // 나크샤트라
  decan: { i: [0, 35] },
  tzolkin: { n: [1, 13], s: [0, 19] },
  rune: { p: "codes" },
  sibyl: { i: [0, 31] },
};
// TALK_MODEL 값 정리: 앞뒤 빈칸을 지우고, "sonnet-5-5"처럼 claude- 없이 적어도 받는다. 모양이 이상하면 기본값
function modelOf(v) {
  let m = String(v || "").trim().toLowerCase();
  if (/^(opus|sonnet|haiku|fable)-/.test(m)) m = "claude-" + m;
  return /^claude-[a-z0-9-]{3,40}$/.test(m) ? m : DEFAULT_MODEL;
}
// 횟수 제한 값: 기본 10분 12번·하루 무료 4번. 시험 배포(Netlify 배포 문맥 "Branch deploys")에서만 TALK_RATE_10MIN·TALK_FREE_PER_DAY로 늘린다(1~1000)
const envInt = (v, def) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : def; };
const limits = (env) => ({ window: envInt(env.TALK_RATE_10MIN, MAX_WINDOW), free: envInt(env.TALK_FREE_PER_DAY, FREE_PER_DAY) });
const evalKeyOk = (env, got) => {
  const k = String(env.TALK_EVAL_KEY || "");
  if (k.length < 32 || typeof got !== "string" || !got) return false;
  const c = require("crypto"), H = (x) => c.createHash("sha256").update(x).digest();
  return c.timingSafeEqual(H(k), H(got));
};
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
function validR(room, r) {
  if (r == null) return true;
  if (typeof r !== "object" || Array.isArray(r)) return false;
  const S = R_SHAPE[room];
  const keys = Object.keys(r);
  if (keys.length !== Object.keys(S).length || !keys.every((k) => k in S)) return false;
  return keys.every((k) => (S[k] === "codes" ? Array.isArray(r[k]) && r[k].length === 3 && new Set(r[k]).size === 3 && r[k].every((x) => Prompt.runeCodes().includes(x)) : isInt(r[k], S[k][0], S[k][1])));
}
const okText = (s, max) => typeof s === "string" && s.trim().length > 0 && s.length <= max;
function parse(body) {
  if (typeof body !== "string" || body.length > MAX_BODY) return null;
  let o;
  try { o = JSON.parse(body); } catch (e) { return null; }
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const allowed = ["room", "r", "q", "hist", "sid"];
  if (!Object.keys(o).every((k) => allowed.includes(k))) return null; // 모르는 칸(이름·생일 등)은 받지 않는다
  if (!ROOMS.includes(o.room) || !validR(o.room, o.r === undefined ? null : o.r) || !okText(o.q, MAX_Q)) return null;
  const hist = o.hist === undefined ? [] : o.hist;
  if (!Array.isArray(hist) || hist.length > MAX_HIST) return null;
  if (!hist.every((h) => h && typeof h === "object" && Object.keys(h).every((k) => k === "q" || k === "a") && okText(h.q, MAX_Q) && okText(h.a, MAX_A))) return null;
  if (o.sid !== undefined && !/^[0-9a-f]{32}$/.test(String(o.sid))) return null; // 로그인 표(무작위 값) — 충전한 별가루로 묻기
  return { room: o.room, r: o.r == null ? null : o.r, q: o.q.trim(), hist, sid: o.sid || null };
}

function envOk(env) {
  if (env.TALK_MODE !== "test" && env.TALK_MODE !== "live") return false;
  if (!env.ANTHROPIC_API_KEY) return false;
  const cap = Number(env.TALK_MONTHLY_USD);
  return Number.isFinite(cap) && cap > 0;
}

const H_JSON = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, obj, extra) => ({ status, headers: Object.assign({}, H_JSON, extra || {}), body: JSON.stringify(obj) });
const kstDay = (now) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
const month = (now) => kstDay(now).slice(0, 7);

// ── 횟수 제한 (메모리) ──
const hits = new Map(); // ip → { n, since, day, free }
function slot(ip, now) {
  let h = hits.get(ip);
  if (!h || now - h.since >= WINDOW_MS) { h = { n: 0, since: now, day: h ? h.day : "", free: h ? h.free : 0 }; hits.set(ip, h); }
  if (h.day !== kstDay(now)) { h.day = kstDay(now); h.free = 0; }
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.since >= WINDOW_MS && v.day !== kstDay(now)) hits.delete(k);
  return h;
}

// 쓴 돈(추정, 달러). usage = API 응답의 usage
function costOf(model, u) {
  const p = PRICES[model] || PRICE_MAX;
  const n = (k) => Number((u && u[k]) || 0);
  return (n("input_tokens") * p[0] + n("output_tokens") * p[1] + n("cache_read_input_tokens") * p[2] + n("cache_creation_input_tokens") * p[3]) / 1e6;
}

// 핵심. req = { method, body, ip }, store = { get(key), set(key, value) }, llm(params) → API 응답(Message) 모양
async function handle(req, env, store, now = Date.now(), llm, payStore = null) {
  if (!envOk(env || {})) return json(503, { error: "off" });
  if (req.method !== "POST") return json(405, { error: "method" }, { Allow: "POST" });
  // (시험 전용) TALK_EVAL_KEY(32자 이상)와 같은 x-talk-eval-key 머리가 오면 IP 횟수 제한만 건너뛴다(월 비용 상한은 그대로). 운영자가 시험 배포에만 넣는다
  const evalOk = evalKeyOk(env, req.evalKey);
  const h = evalOk ? { n: 0, free: 0 } : slot(String(req.ip || "unknown"), now);
  const LIM = limits(env);
  if (h.n >= LIM.window) return json(429, { error: "rate" }, { "Retry-After": "600" });
  const p = parse(req.body);
  if (!p) return json(400, { error: "bad" });
  if (!p.sid && h.free >= LIM.free) return json(429, { error: "rate" }, { "Retry-After": "600" }); // 무료 몫만 하루 상한
  h.n++;

  // 위기 신호: 모델을 부르지 않고 정해진 안내(상담 전화)를 돌려준다. 횟수·별가루를 쓰지 않는다
  if (Prompt.crisis(p.q)) return json(200, { a: Prompt.crisisReply(p.room), crisis: true });

  const key = "budget/" + month(now);
  let b;
  try { b = (await store.get(key)) || { usd: 0, n: 0 }; } catch (e) { return json(503, { error: "store" }); }
  if (b.usd >= Number(env.TALK_MONTHLY_USD)) return json(503, { error: "budget" });

  // 충전한 별가루로 묻기: 로그인 표 → 계정 → 잔액 10 이상 (차감은 답을 받은 뒤)
  let uh = null;
  if (p.sid) {
    if (!payStore) return json(503, { error: "store" });
    try {
      uh = await require("./auth.js").sessionOf(payStore, p.sid, now);
      if (!uh) return json(401, { error: "session" });
      if ((await Dust.balanceOf(payStore, uh)) < TALK_COST) return json(402, { error: "dust" });
    } catch (e) { return json(503, { error: "store" }); }
  }

  const model = modelOf(env.TALK_MODEL);
  const params = Prompt.build(p, model);
  let msg;
  try { msg = await llm(params, env); } catch (e) {
    // 원인 구분용: 모델 API의 상태 번호와 오류 종류 이름만(메시지 본문·키·질문은 넣지 않는다)
    const st = Number(e && e.status) || 0;
    const ty = String((e && e.error && e.error.error && e.error.error.type) || (e && e.name) || "").replace(/[^A-Za-z_]/g, "").slice(0, 40);
    return json(502, { error: "upstream", status: st, type: ty });
  }
  if (!uh) h.free++;
  try { await store.set(key, { usd: Math.round((b.usd + costOf(model, msg && msg.usage)) * 1e6) / 1e6, n: b.n + 1 }); } catch (e) { /* 기록 실패는 답을 막지 않는다(다음 요청이 다시 읽는다) */ }
  const text = Prompt.textOf(msg);
  if (!text) return json(200, { a: Prompt.declineReply(p.room), declined: true }); // 답하지 못한 물음은 별가루를 쓰지 않는다
  if (uh) {
    let left = false;
    try { left = await Dust.spend(payStore, uh, TALK_COST, now); } catch (e) { left = false; }
    if (left === false) return json(200, { a: text, paid: null }); // 그새 잔액이 모자라졌으면 이번 답은 그대로 준다(다음부터 402)
    return json(200, { a: text, paid: left });
  }
  return json(200, { a: text });
}

// 실제 모델 호출 (Anthropic 공식 SDK). 함수 인스턴스마다 클라이언트 하나
let client = null;
async function anthropicLlm(params, env) {
  if (!client) {
    const A = require("@anthropic-ai/sdk");
    const Anthropic = A.default || A.Anthropic || A;
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60 * 1000, maxRetries: 1 });
  }
  return client.beta.messages.create(params);
}

function storeFrom(openStore) {
  let s = null;
  const open = () => s || (s = openStore());
  return {
    get: async (k) => open().get(k, { type: "json" }),
    set: async (k, v) => open().setJSON(k, v),
  };
}

// Netlify Functions v2 요청 → handle
async function respond(req, context, openStore, env = process.env, openPay = null) {
  const body = req.method === "POST" ? await req.text() : "";
  const r = await handle({ method: req.method, body, ip: String((context && context.ip) || "unknown"), evalKey: req.headers.get("x-talk-eval-key") || "" }, env, storeFrom(openStore), Date.now(), anthropicLlm, openPay ? require("./pay.js").storeFrom(openPay) : null);
  return new Response(r.body, { status: r.status, headers: r.headers });
}

const _reset = () => hits.clear();
module.exports = { limits, TALK_COST, modelOf, respond, handle, parse, validR, costOf, envOk, storeFrom, STORE_NAME, ROOMS, R_SHAPE, MAX_Q, FREE_PER_DAY, DEFAULT_MODEL, _reset };
