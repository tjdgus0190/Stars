// 유료 리포트 서버 공통 로직 (Vercel 함수 api/config·confirm·report가 쓴다). Node 내장만 사용(fetch, Buffer). npm 패키지 없음.
// 밑줄로 시작하는 폴더라 Vercel이 함수로 만들지 않는다 (vercel.com/docs/functions/configuring-functions/advanced-configuration 확인).
//
// 지키는 것 (spec 6-4, CLAUDE.md 6·7장)
//  - 받는 값: 결제 정보(paymentKey, orderId, amount)와 영수증 코드(receipt)뿐. 정해진 키 외 값이 오면 400 (개인 입력이 실려 오는 사고 차단).
//  - 리포트는 요청 본문의 코드가 아니라 "토스가 결제 완료로 확인한 orderId" 안의 코드로만 조립한다.
//  - 키는 환경 변수에서만 읽는다(TOSS_SECRET_KEY 등). 응답·로그에 싣지 않는다. 로그에는 오류 종류와 orderId 앞 8자만.
//  - PAY_MODE: off(기본) / mock / test / live. mock은 TOSS_SECRET_KEY가 비어 있을 때만. live가 아니면 test_ 키만 허용.
"use strict";
let PayCode;
try {
  PayCode = require("./paycode.js"); // dist/api/_lib/paycode.js (build-dist.js가 복사)
} catch (e) {
  PayCode = require("../../paycode.js"); // 원본 폴더 products/strange-oracle/paycode.js
}
const C = {
  open: require("../_paid/open.js").PAID_OPEN,
  hidden: {
    rune: require("../_paid/hidden-rune.js").PAID_HIDDEN_RUNE,
    star: require("../_paid/hidden-star.js").PAID_HIDDEN_STAR,
    ogham: require("../_paid/hidden-ogham.js").PAID_HIDDEN_OGHAM,
    decan: require("../_paid/hidden-decan.js").PAID_HIDDEN_DECAN,
    tzolkin: require("../_paid/hidden-tzolkin.js").PAID_HIDDEN_TZOLKIN,
    sibyl: require("../_paid/hidden-sibyl.js").PAID_HIDDEN_SIBYL,
  },
  // (7단계) 방별 온전한 이야기: 공개 data-*.js에서 옮겨 온 II장 나머지·III·IV장 (spec 7-4)
  full: {
    rune: require("../_paid/full-rune.js").PAID_FULL_RUNE,
    star: require("../_paid/full-star.js").PAID_FULL_STAR,
    ogham: require("../_paid/full-ogham.js").PAID_FULL_OGHAM,
    decan: require("../_paid/full-decan.js").PAID_FULL_DECAN,
    tzolkin: require("../_paid/full-tzolkin.js").PAID_FULL_TZOLKIN,
    sibyl: require("../_paid/full-sibyl.js").PAID_FULL_SIBYL,
  },
  timeline: require("../_paid/timeline.js").PAID_TIMELINE,
  match: require("../_paid/match.js").PAID_MATCH,
  matchRooms: require("../_paid/match-rooms.js").PAID_MATCH_ROOMS,
  deep: require("../_paid/deep.js").PAID_DEEP,
  close: require("../_paid/close.js").PAID_CLOSE,
};

const PRICE = 3900;
const ORDER_NAME = "낯선 점술관 · 더 깊은 이야기";
const TOSS_API = "https://api.tosspayments.com";
const ARCH = PayCode.ARCHETYPES;
const byCode = (list) => Object.fromEntries(list.map((e) => [e.code, e]));
const IDX = {
  open: byCode(C.open), timeline: byCode(C.timeline), match: byCode(C.match),
  matchRooms: byCode(C.matchRooms), deep: byCode(C.deep), close: byCode(C.close),
};
// 방 나열 순서 = 나의 이야기 장 순서. paycode.js 한 곳에서 읽는다 (spec 7-1)
const CHAPTER_ORDER = PayCode.CHAPTER_ORDER;

// ───────── 모드·키 ─────────
function modeOf(env) {
  const m = String(env.PAY_MODE || "off").toLowerCase();
  const sk = env.TOSS_SECRET_KEY || "";
  const ck = env.TOSS_CLIENT_KEY || "";
  if (m === "mock") return sk ? { mode: "off", why: "mock_with_secret" } : { mode: "mock" };
  if (m === "test") {
    if (!sk.startsWith("test_") || !ck.startsWith("test_")) return { mode: "off", why: "not_test_key" };
    return { mode: "test" };
  }
  if (m === "live") return sk && ck ? { mode: "live" } : { mode: "off", why: "no_key" };
  return { mode: "off" };
}
function config(env) {
  const { mode } = modeOf(env);
  if (mode === "off") return { enabled: false, mode: "off", price: PRICE };
  return { enabled: true, mode, clientKey: mode === "mock" ? "" : env.TOSS_CLIENT_KEY, price: PRICE, orderName: ORDER_NAME };
}

// ───────── 토스 호출 (mock이면 메모리 속 가짜 토스) ─────────
// mock 장부: 이 함수 인스턴스 메모리에만 있다(재시작하면 비워짐). mock은 로컬 시험 전용.
const mockLedger = new Map();
function mockToss() {
  return {
    async confirm({ paymentKey, orderId, amount }) {
      if (!String(paymentKey).startsWith("mock_")) return { ok: false, status: 404, code: "NOT_FOUND_PAYMENT" };
      const had = mockLedger.get(orderId);
      if (had) return { ok: false, status: 400, code: "ALREADY_PROCESSED_PAYMENT" };
      const p = { paymentKey, orderId, totalAmount: amount, status: "DONE", receipt: null };
      mockLedger.set(orderId, p);
      return { ok: true, payment: p };
    },
    async byOrder(orderId) {
      const p = mockLedger.get(orderId);
      return p ? { ok: true, payment: p } : { ok: false, status: 404, code: "NOT_FOUND_PAYMENT" };
    },
  };
}
function realToss(env, fetchImpl) {
  const auth = "Basic " + Buffer.from(String(env.TOSS_SECRET_KEY) + ":").toString("base64");
  const call = async (method, p, body) => {
    const res = await fetchImpl(TOSS_API + p, {
      method,
      headers: Object.assign({ Authorization: auth }, body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* 빈 응답 */ }
    return res.ok ? { ok: true, payment: data } : { ok: false, status: res.status, code: data.code || "UNKNOWN" };
  };
  return {
    confirm: (b) => call("POST", "/v1/payments/confirm", b),
    byOrder: (orderId) => call("GET", "/v1/payments/orders/" + encodeURIComponent(orderId)),
  };
}
function tossFor(mode, env, fetchImpl) {
  return mode === "mock" ? mockToss() : realToss(env, fetchImpl || globalThis.fetch);
}

// 결제 기록이 "완료·3,900원·같은 주문번호"인지
function paidOk(p, orderId) {
  return p && p.status === "DONE" && Number(p.totalAmount) === PRICE && p.orderId === orderId;
}

// ───────── 요청 검사 ─────────
class Fail extends Error {
  constructor(status, reason) { super(reason); this.status = status; this.reason = reason; }
}
function strictBody(body, keys) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Fail(400, "bad_request");
  const got = Object.keys(body);
  if (got.length !== keys.length || !got.every((k) => keys.includes(k))) throw new Fail(400, "bad_request");
}

// ───────── 리포트 조립 (코드 → 문단, 고정 순서) ─────────
const paras = (v) => (Array.isArray(v) ? v.slice() : v ? [v] : []);
function hiddenEntry(room, codes) {
  const list = C.hidden[room];
  if (room === "rune") return list[codes.rune[1]]; // 가운데(현재) 룬
  if (room === "tzolkin") return list[codes.tzolkin.sign]; // 문양
  return list[codes[room]];
}
// 방별 온전한 이야기 한 방: 무료 화면(I장 + II장 첫 문단) 뒤를 예전 무료판과 같은 순서로 잇는다.
// 각 장 끝의 떡밥(hook)은 다음 장으로 넘어가는 문장이라 앞 장의 마지막 문단으로 둔다. 인용(quote)은 문단 하나.
// 룬·시빌라의 넷째 장 끝 "고른 주제" 단락은 영수증 코드에 주제가 없어 topics(주제별 단락)로 모두 보내고, 브라우저가 이 탭에 남은 주제로 하나를 고른다.
const insertAt = (arr, i, item) => [...arr.slice(0, i), item, ...arr.slice(i)];
function fullRoom(room, codes) {
  const list = C.full[room];
  if (room === "rune") {
    const [past, now, next] = codes.rune.map((i) => list[i]);
    return {
      room,
      ch2: [...past.past.body, ...insertAt(now.now.body, 1, now.now.quote), next.shadow.hook],
      ch3: [next.shadow.lede, ...insertAt(next.shadow.body, 1, next.shadow.quote), next.advice.hook],
      ch4: [next.advice.lede, ...next.advice.body],
      topics: Object.assign({}, next.advice.topics),
    };
  }
  const e = list[room === "tzolkin" ? codes.tzolkin.sign : codes[room]];
  const eb = e.event.body;
  // 별의 방은 II장 첫 단락 뒤 맞아요 인셋(무료) 다음에 인용이 둘째 단락 뒤였다 → 나머지 순서: 단락1, 단락2, 인용, 그 뒤
  const ch2 = room === "star" ? [eb[0], eb[1], e.event.quote, ...eb.slice(2)] : insertAt(eb, Math.min(2, eb.length), e.event.quote);
  const out = {
    room,
    ch2: [...ch2.filter((p) => p != null), e.shadow.hook],
    ch3: [e.shadow.lede, ...insertAt(e.shadow.body, 1, e.shadow.quote), e.advice.hook],
    ch4: [e.advice.lede, ...e.advice.body],
  };
  if (room === "sibyl") out.topics = Object.assign({}, e.topics);
  return out;
}
function pairCode(a, b) {
  return ARCH.indexOf(a) <= ARCH.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
}
function timelineStages(arch, band) {
  // 지금 구간부터 다음 두 구간. 남은 구간이 3개가 안 되면 앞 구간을 "지나온 흐름"으로 채운다
  const start = Math.min(band, 4);
  return [start, start + 1, start + 2].map((b) => {
    const e = IDX.timeline[`${arch}-b${b + 1}`];
    return { band: b, now: b === band, past: b < band, label: e.label, work: e.work, relation: e.relation, learn: e.learn, move: e.move, keyword: e.keyword };
  });
}
function buildReport(codes) {
  const me = codes.arch;
  const rooms = CHAPTER_ORDER.filter((r) => codes[r] != null);
  const chapters = [];
  chapters.push({ id: "open", paragraphs: paras(IDX.open[me].body) });
  chapters.push({ id: "rooms", rooms: rooms.map((room) => fullRoom(room, codes)) });
  chapters.push({
    id: "hidden",
    rooms: rooms.map((room) => {
      const e = hiddenEntry(room, codes);
      return { room, title: e.title, paragraphs: paras(e.body) };
    }),
  });
  const stages = timelineStages(me, codes.band);
  chapters.push({ id: "timeline", stages: stages.map(({ keyword, ...s }) => s) });
  if (codes.partner) {
    const you = codes.partner;
    const m = IDX.match[pairCode(me, you)];
    const sides = me === you ? [m.sides[me]] : [m.sides[me], m.sides[you]];
    const rel = [["ogham", codes.relOgham], ["decan", codes.relDecan], ["tzolkin", codes.relTzolkin]]
      .filter(([, g]) => g != null)
      .map(([room, g]) => {
        const e = IDX.matchRooms[`${room}-g${g}`];
        return { room, grade: g, label: e.label, text: e.text };
      });
    chapters.push({ id: "match", me, you, summary: m.summary, paragraphs: paras(m.body).concat(sides), rooms: rel });
  } else {
    chapters.push({ id: "match", me, you: null, map: ARCH.map((other) => ({ other, summary: IDX.match[pairCode(me, other)].summary })) });
  }
  const d = IDX.deep[me];
  chapters.push({ id: "deep", strength: paras(d.strength), shadow: paras(d.shadow), growth: paras(d.growth) });
  chapters.push({ id: "close", paragraphs: paras(IDX.close[me].body) });
  const card = { keyword: stages.find((s) => s.now).keyword, closeLine: IDX.close[me].cardLine };
  return { chapters, card, codes };
}
// 글자 수(공백 포함) — 분량 점검(D-11)용
function countChars(report) {
  let n = 0;
  const add = (v) => {
    if (typeof v === "string") n += [...v].length;
    else if (Array.isArray(v)) v.forEach(add);
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (!["id", "room", "me", "you", "other", "band", "grade", "now", "past", "label", "title", "topics"].includes(k)) add(x); });
  };
  add(report.chapters);
  return n;
}

// ───────── 함수 본체 (HTTP와 무관, 시험하기 쉽게) ─────────
async function confirmPayment(body, env, fetchImpl) {
  const { mode } = modeOf(env);
  if (mode === "off") throw new Fail(404, "off");
  strictBody(body, ["paymentKey", "orderId", "amount"]);
  const { paymentKey, orderId, amount } = body;
  if (typeof paymentKey !== "string" || !paymentKey || paymentKey.length > 200) throw new Fail(400, "bad_request");
  if (typeof orderId !== "string" || orderId !== PayCode.normalize(orderId)) throw new Fail(400, "bad_order");
  const codes = PayCode.decode(orderId);
  if (!codes) throw new Fail(400, "bad_order");
  if (Number(amount) !== PRICE) throw new Fail(400, "bad_amount");
  const toss = tossFor(mode, env, fetchImpl);
  let r = await toss.confirm({ paymentKey, orderId, amount: PRICE });
  if (!r.ok && r.code === "ALREADY_PROCESSED_PAYMENT") {
    // 새로고침·뒤로 가기로 같은 승인을 다시 부른 경우(멱등): 조회로 상태 확인
    r = await toss.byOrder(orderId);
    if (r.ok && r.payment.paymentKey !== paymentKey) throw new Fail(402, "not_paid");
  }
  if (!r.ok || !paidOk(r.payment, orderId)) throw new Fail(402, "not_paid");
  return reply(orderId, codes, r.payment);
}
async function reopenReport(body, env, fetchImpl) {
  const { mode } = modeOf(env);
  if (mode === "off") throw new Fail(404, "off");
  strictBody(body, ["receipt"]);
  if (typeof body.receipt !== "string") throw new Fail(400, "bad_request");
  const orderId = PayCode.normalize(body.receipt);
  const codes = orderId && PayCode.decode(orderId);
  if (!codes) throw new Fail(400, "bad_order");
  const r = await tossFor(mode, env, fetchImpl).byOrder(orderId);
  if (!r.ok) throw new Fail(r.status === 404 ? 404 : 502, r.status === 404 ? "not_found" : "toss_error");
  if (r.payment.status === "CANCELED" || r.payment.status === "PARTIAL_CANCELED") throw new Fail(410, "canceled");
  if (!paidOk(r.payment, orderId)) throw new Fail(402, "not_paid");
  return reply(orderId, codes, r.payment);
}
function reply(orderId, codes, payment) {
  const report = buildReport(codes);
  const receiptUrl = payment.receipt && typeof payment.receipt.url === "string" && /^https:\/\//.test(payment.receipt.url) ? payment.receipt.url : null;
  return { receipt: orderId, receiptUrl, report };
}

// ───────── HTTP 어댑터 (Vercel Node 함수 · 로컬 모의 서버 공통) ─────────
async function readBody(req) {
  if (req.body !== undefined && typeof req.body !== "string") return req.body;
  let raw = typeof req.body === "string" ? req.body : "";
  if (!raw) {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 2048) throw new Fail(413, "too_large");
    }
  }
  if (raw.length > 2048) throw new Fail(413, "too_large");
  try { return JSON.parse(raw || "null"); } catch (e) { throw new Fail(400, "bad_request"); }
}
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(obj));
}
function handler(kind, opts = {}) {
  return async function (req, res) {
    const env = opts.env || process.env;
    try {
      if (kind === "config") {
        if (req.method !== "GET") throw new Fail(405, "method");
        return send(res, 200, config(env));
      }
      if (req.method !== "POST") throw new Fail(405, "method");
      const body = await readBody(req);
      const out = kind === "confirm" ? await confirmPayment(body, env, opts.fetch) : await reopenReport(body, env, opts.fetch);
      return send(res, 200, out);
    } catch (e) {
      if (e instanceof Fail) return send(res, e.status, { error: e.reason });
      // 요청 본문은 찍지 않는다. 오류 종류만
      console.error(`[${kind}] ${e && e.name}`);
      return send(res, 500, { error: "server" });
    }
  };
}

module.exports = { handler, config, modeOf, confirmPayment, reopenReport, buildReport, countChars, Fail, PRICE, ORDER_NAME, _mockLedger: mockLedger, CONTENT: C };
