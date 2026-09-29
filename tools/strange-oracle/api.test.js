// 6~8단계 서버 로직 단위 시험 (Node 내장 node:test, 설치 없음). 토스 호출은 가짜 fetch로 바꿔 넣는다. 실제 키·네트워크 없음.
// 실행: node --test tools/strange-oracle/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const P = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
const PayCode = require(path.join(P, "paycode.js"));
const core = require(path.join(P, "api", "_lib", "core.js"));

const TEST_ENV = { PAY_MODE: "test", TOSS_CLIENT_KEY: "test_ck_FAKE", TOSS_SECRET_KEY: "test_sk_FAKE" }; // 가짜 값(실제 키 아님)
const baseCodes = () => ({
  rune: [3, 7, 11], star: 5, ogham: 2, decan: 10, tzolkin: { number: 4, sign: 19 }, sibyl: 12,
  arch: "sage", band: 2, partner: "lover", relOgham: 1, relDecan: 3, relTzolkin: 0,
});
// 가짜 토스: 주문번호별 결제 기록
function fakeToss(ledger = {}, opts = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    const json = (status, obj) => ({ ok: status < 300, status, json: async () => obj });
    const u = new URL(url);
    if (u.pathname === "/v1/payments/confirm") {
      const b = JSON.parse(init.body);
      const had = ledger[b.orderId];
      if (had) return json(400, { code: "ALREADY_PROCESSED_PAYMENT", message: "이미 처리된 결제 입니다." });
      if (opts.rejectConfirm) return json(404, { code: "NOT_FOUND_PAYMENT" });
      const p = { paymentKey: b.paymentKey, orderId: b.orderId, totalAmount: b.amount, status: "DONE", receipt: { url: "https://dashboard.tosspayments.com/receipt/FAKE" } };
      ledger[b.orderId] = p;
      return json(200, p);
    }
    const m = u.pathname.match(/^\/v1\/payments\/orders\/(.+)$/);
    if (m) {
      const p = ledger[decodeURIComponent(m[1])];
      return p ? json(200, p) : json(404, { code: "NOT_FOUND_PAYMENT" });
    }
    return json(404, { code: "NOT_FOUND" });
  };
  return { fetch, calls, ledger };
}
const rejects = async (p, status, reason) => {
  await assert.rejects(p, (e) => e instanceof core.Fail && e.status === status && (!reason || e.reason === reason));
};

test("영수증 코드: 부호화·해독 왕복, 모양(토스 orderId 규칙)", () => {
  for (let k = 0; k < 2000; k++) {
    const r = (n) => Math.floor(Math.random() * n);
    const opt = (n) => (Math.random() < 0.3 ? null : r(n));
    const c = {
      rune: Math.random() < 0.3 ? null : [r(24), r(24), r(24)], star: opt(27), ogham: opt(20), decan: opt(36),
      tzolkin: Math.random() < 0.3 ? null : { number: r(13) + 1, sign: r(20) }, sibyl: opt(32),
      arch: PayCode.ARCHETYPES[r(8)], band: r(7), partner: null, relOgham: null, relDecan: null, relTzolkin: null,
    };
    if (!PayCode.roomsOf(c).length) c.star = 0;
    if (Math.random() < 0.5) Object.assign(c, { partner: PayCode.ARCHETYPES[r(8)], relOgham: opt(3), relDecan: opt(4), relTzolkin: opt(3) });
    const code = PayCode.encode(c);
    assert.match(code, /^SO1[0-9A-HJKMNP-TV-Z]{27}$/);
    assert.ok(code.length >= 6 && code.length <= 64);
    assert.deepEqual(PayCode.decode(code), c);
    assert.deepEqual(PayCode.decode(PayCode.pretty(code).toLowerCase()), c); // 하이픈·소문자 입력
  }
});
test("영수증 코드: 오타·위조 거절", () => {
  const code = PayCode.encode(baseCodes());
  const flip = code.slice(0, 10) + (code[10] === "A" ? "B" : "A") + code.slice(11);
  assert.equal(PayCode.decode(flip), null);
  assert.equal(PayCode.decode(code.slice(0, -1)), null);
  assert.equal(PayCode.decode("XX" + code.slice(2)), null);
  assert.equal(PayCode.decode(""), null);
  assert.throws(() => PayCode.encode(Object.assign(baseCodes(), { rune: null, star: null, ogham: null, decan: null, tzolkin: null, sibyl: null })));
  assert.throws(() => PayCode.encode(Object.assign(baseCodes(), { band: 7 })));
});

test("config: 모드와 키 안전장치 (D-10)", () => {
  assert.equal(core.config({}).enabled, false);
  assert.equal(core.config({ PAY_MODE: "off" }).enabled, false);
  assert.deepEqual(core.config({ PAY_MODE: "mock" }).mode, "mock");
  assert.equal(core.config({ PAY_MODE: "mock", TOSS_SECRET_KEY: "test_sk_FAKE" }).enabled, false, "시크릿 키가 있으면 mock 꺼짐");
  assert.equal(core.config({ PAY_MODE: "test", TOSS_CLIENT_KEY: "live_ck_X", TOSS_SECRET_KEY: "live_sk_X" }).enabled, false, "live가 아닌데 test_ 키가 아니면 거절");
  const c = core.config(TEST_ENV);
  assert.equal(c.enabled, true);
  assert.equal(c.clientKey, "test_ck_FAKE");
  assert.ok(!JSON.stringify(c).includes("sk_"), "시크릿 키는 응답에 없다");
});

test("confirm: 승인 → 리포트, Basic 인증 헤더 모양", async () => {
  const t = fakeToss();
  const orderId = PayCode.encode(baseCodes());
  const out = await core.confirmPayment({ paymentKey: "pk_1", orderId, amount: 3900 }, TEST_ENV, t.fetch);
  assert.equal(out.receipt, orderId);
  assert.equal(out.receiptUrl, "https://dashboard.tosspayments.com/receipt/FAKE");
  assert.deepEqual(out.report.codes, baseCodes());
  const c = t.calls[0];
  assert.equal(c.url, "https://api.tosspayments.com/v1/payments/confirm");
  assert.equal(c.init.headers.Authorization, "Basic " + Buffer.from("test_sk_FAKE:").toString("base64"));
  assert.deepEqual(JSON.parse(c.init.body), { paymentKey: "pk_1", orderId, amount: 3900 });
});

test("confirm 멱등 (D-6): 같은 paymentKey로 두 번 → 같은 리포트", async () => {
  const t = fakeToss();
  const orderId = PayCode.encode(baseCodes());
  const a = await core.confirmPayment({ paymentKey: "pk_1", orderId, amount: 3900 }, TEST_ENV, t.fetch);
  const b = await core.confirmPayment({ paymentKey: "pk_1", orderId, amount: 3900 }, TEST_ENV, t.fetch);
  assert.deepEqual(b, a);
  assert.equal(t.calls[2].url, "https://api.tosspayments.com/v1/payments/orders/" + orderId, "이미 처리됨 → 주문번호 조회");
  await rejects(core.confirmPayment({ paymentKey: "pk_OTHER", orderId, amount: 3900 }, TEST_ENV, t.fetch), 402);
});

test("위조 방지 (D-7): 금액·형식·기록 없음·취소", async () => {
  const t = fakeToss();
  const orderId = PayCode.encode(baseCodes());
  await rejects(core.confirmPayment({ paymentKey: "pk", orderId, amount: 100 }, TEST_ENV, t.fetch), 400, "bad_amount");
  await rejects(core.confirmPayment({ paymentKey: "pk", orderId: "SO1HELLO", amount: 3900 }, TEST_ENV, t.fetch), 400, "bad_order");
  await rejects(core.confirmPayment({ paymentKey: "pk", orderId: orderId.toLowerCase(), amount: 3900 }, TEST_ENV, t.fetch), 400, "bad_order");
  await rejects(core.confirmPayment({ paymentKey: "pk", orderId, amount: 3900 }, TEST_ENV, fakeToss({}, { rejectConfirm: true }).fetch), 402);
  await rejects(core.reopenReport({ receipt: orderId }, TEST_ENV, t.fetch), 404, "not_found");
  for (const status of ["CANCELED", "PARTIAL_CANCELED"]) {
    const led = { [orderId]: { paymentKey: "pk", orderId, totalAmount: 3900, status } };
    await rejects(core.reopenReport({ receipt: orderId }, TEST_ENV, fakeToss(led).fetch), 410, "canceled");
  }
  const cheap = { [orderId]: { paymentKey: "pk", orderId, totalAmount: 100, status: "DONE" } };
  await rejects(core.reopenReport({ receipt: orderId }, TEST_ENV, fakeToss(cheap).fetch), 402);
  // 결제 후 코드를 바꾼 주문번호: 토스에 기록이 없다
  const other = PayCode.encode(Object.assign(baseCodes(), { arch: "ruler" }));
  await rejects(core.reopenReport({ receipt: other }, TEST_ENV, t.fetch), 404);
});

test("8-1 결제는 6/6에서만: 방 코드가 하나라도 없으면 토스를 부르지 않고 400, 옛 코드 재열람은 그대로", async () => {
  const t = fakeToss();
  for (const room of PayCode.CHAPTER_ORDER) {
    const orderId = PayCode.encode(Object.assign(baseCodes(), { [room]: null }));
    await rejects(core.confirmPayment({ paymentKey: "pk", orderId, amount: 3900 }, TEST_ENV, t.fetch), 400, "incomplete");
  }
  assert.equal(t.calls.length, 0, "6방 미만은 돈이 나가기 전에 막힌다");
  // 6·7단계 테스트 모드 영수증(방 3개): 재열람은 있는 방만으로 열린다
  const old = PayCode.encode(Object.assign(baseCodes(), { rune: null, star: null, sibyl: null }));
  const led = { [old]: { paymentKey: "pk_old", orderId: old, totalAmount: 3900, status: "DONE" } };
  const r = await core.reopenReport({ receipt: old }, TEST_ENV, fakeToss(led).fetch);
  assert.deepEqual(r.report.chapters.find((c) => c.id === "rooms").rooms.map((x) => x.room), ["ogham", "decan", "tzolkin"]);
});

test("정해진 키 외 필드 → 400 (D-5)", async () => {
  const t = fakeToss();
  const orderId = PayCode.encode(baseCodes());
  await rejects(core.confirmPayment({ paymentKey: "pk", orderId, amount: 3900, name: "김서윤" }, TEST_ENV, t.fetch), 400, "bad_request");
  await rejects(core.confirmPayment({ paymentKey: "pk", orderId }, TEST_ENV, t.fetch), 400, "bad_request");
  await rejects(core.reopenReport({ receipt: orderId, birth: "1995-03-21" }, TEST_ENV, t.fetch), 400, "bad_request");
  await rejects(core.reopenReport(null, TEST_ENV, t.fetch), 400);
  assert.equal(t.calls.length, 0, "거절된 요청은 토스를 부르지 않는다");
});

test("재열람 (D-8): 영수증 코드만으로 같은 리포트", async () => {
  const t = fakeToss();
  const orderId = PayCode.encode(baseCodes());
  const a = await core.confirmPayment({ paymentKey: "pk_1", orderId, amount: 3900 }, TEST_ENV, t.fetch);
  const b = await core.reopenReport({ receipt: PayCode.pretty(orderId).toLowerCase() }, TEST_ENV, t.fetch);
  assert.deepEqual(b, a);
});

test("mock 모드: 가짜 장부로 승인·멱등·재열람, 기록 없는 코드 거절", async () => {
  const env = { PAY_MODE: "mock" };
  const orderId = PayCode.encode(Object.assign(baseCodes(), { arch: "rebel" }));
  const a = await core.confirmPayment({ paymentKey: "mock_1", orderId, amount: 3900 }, env);
  const b = await core.confirmPayment({ paymentKey: "mock_1", orderId, amount: 3900 }, env);
  assert.deepEqual(b, a);
  assert.deepEqual(await core.reopenReport({ receipt: orderId }, env), a);
  await rejects(core.confirmPayment({ paymentKey: "pk_real", orderId: PayCode.encode(baseCodes()), amount: 3900 }, env), 402);
  await rejects(core.reopenReport({ receipt: PayCode.encode(Object.assign(baseCodes(), { band: 6 })) }, env), 404);
  await rejects(core.confirmPayment({ paymentKey: "mock_1", orderId, amount: 3900 }, { PAY_MODE: "mock", TOSS_SECRET_KEY: "x" }), 404, "off");
});

test("리포트 조립: 모든 유료 항목에 도달, 구간·궁합 규칙", () => {
  const C = core.CONTENT;
  assert.equal(C.open.length + C.deep.length + C.close.length, 24);
  assert.deepEqual(Object.fromEntries(Object.entries(C.hidden).map(([k, v]) => [k, v.length])), { rune: 24, star: 27, ogham: 20, decan: 36, tzolkin: 20, sibyl: 32 });
  assert.equal(C.timeline.length, 56);
  assert.equal(C.match.length, 36);
  assert.equal(C.matchRooms.length, 10);
  const seen = new Set();
  const mark = (s) => seen.add(s);
  for (const arch of PayCode.ARCHETYPES)
    for (let band = 0; band < 7; band++)
      for (const partner of [null, ...PayCode.ARCHETYPES]) {
        const r = core.buildReport(Object.assign(baseCodes(), { arch, band, partner, relOgham: partner ? band % 3 : null, relDecan: partner ? band % 4 : null, relTzolkin: partner ? (band + 1) % 3 : null }));
        const tl = r.chapters.find((x) => x.id === "timeline").stages;
        assert.equal(tl.length, 3);
        assert.equal(tl.filter((s) => s.now).length, 1);
        assert.equal(tl[0].band, Math.min(band, 4));
        tl.forEach((s) => mark(`${arch}-b${s.band + 1}`));
        const m = r.chapters.find((x) => x.id === "match");
        if (partner) {
          mark([arch, partner].sort((a, b) => PayCode.ARCHETYPES.indexOf(a) - PayCode.ARCHETYPES.indexOf(b)).join("-"));
          // 본문(여러 단락 가능) + 각자의 쪽 단락(같은 원형 1, 다른 원형 2)
          const pair = C.match.find((x) => x.code === [arch, partner].sort((a, b) => PayCode.ARCHETYPES.indexOf(a) - PayCode.ARCHETYPES.indexOf(b)).join("-"));
          assert.equal(m.paragraphs.length, pair.body.length + (arch === partner ? 1 : 2));
          m.rooms.forEach((x) => mark(`${x.room}-g${x.grade}`));
        } else assert.equal(m.map.length, 8);
      }
  assert.equal([...seen].filter((s) => /-b\d$/.test(s)).length, 56);
  assert.equal([...seen].filter((s) => /^[a-z]+-[a-z]+$/.test(s)).length, 36);
  for (let i = 0; i < 24; i++) core.buildReport(Object.assign(baseCodes(), { rune: [0, i, 0] }));
  for (let i = 0; i < 36; i++) core.buildReport(Object.assign(baseCodes(), { decan: i }));
  for (let s = 0; s < 20; s++) core.buildReport(Object.assign(baseCodes(), { tzolkin: { number: 13, sign: s }, ogham: s }));
  for (let i = 0; i < 32; i++) core.buildReport(Object.assign(baseCodes(), { sibyl: i, star: i % 27 }));
});

test("분량 (D-11 구조 점검): 모든 칸을 한도만큼 채우면 조립 글자 수 = 미리보기 계산식", () => {
  // 브라우저 app.js의 VOL 계산식과 같은 식
  const VOL = { open: 300, stage: 600, summary: 150, matchBody: 800, side: 200, matchRoom: 350, deep: 1500, close: 300 };
  const estimate = (c) => {
    const rooms = PayCode.roomsOf(c);
    const rel = [c.relOgham, c.relDecan, c.relTzolkin].filter((g) => g != null).length;
    return VOL.open + VOL.stage * 3 + // (8단계) 숨은 장은 제1부 방 안(rooms)으로 들어가 아래 "방별 분량" 시험이 본다

      (c.partner ? VOL.summary + VOL.matchBody + (c.partner === c.arch ? 1 : 2) * VOL.side + rel * VOL.matchRoom : VOL.summary * 8) + VOL.deep + VOL.close;
  };
  // 복사본 내용을 한도 길이 문자열로 바꿔 끼운다 (원본 파일은 건드리지 않음)
  const C = core.CONTENT;
  const saved = JSON.stringify(C);
  const x = (n) => "가".repeat(n);
  C.open.forEach((e) => (e.body = [x(300)]));
  Object.entries(C.hidden).forEach(([room, list]) => list.forEach((e) => (e.body = [x(room === "sibyl" ? 400 : 700)])));
  C.timeline.forEach((e) => Object.assign(e, { work: x(150), relation: x(150), learn: x(150), move: x(150) }));
  C.match.forEach((e) => { e.summary = x(150); e.body = [x(800)]; Object.keys(e.sides).forEach((k) => (e.sides[k] = x(200))); });
  C.matchRooms.forEach((e) => (e.text = x(350)));
  C.deep.forEach((e) => Object.assign(e, { strength: [x(500)], shadow: [x(500)], growth: [x(500)] }));
  C.close.forEach((e) => (e.body = [x(300)]));
  try {
    const cases = [
      ["방1·상대 없음", { rune: null, star: 3, ogham: null, decan: null, tzolkin: null, sibyl: null, arch: "sage", band: 1, partner: null, relOgham: null, relDecan: null, relTzolkin: null }],
      ["방1·상대 있음", { rune: null, star: 3, ogham: null, decan: null, tzolkin: null, sibyl: null, arch: "sage", band: 1, partner: "lover", relOgham: 1, relDecan: 2, relTzolkin: 0 }],
      ["방3·상대 없음", Object.assign(baseCodes(), { rune: null, star: null, sibyl: null, partner: null, relOgham: null, relDecan: null, relTzolkin: null })],
      ["방3·상대 있음", Object.assign(baseCodes(), { rune: null, star: null, sibyl: null })],
      ["방6·상대 없음", Object.assign(baseCodes(), { partner: null, relOgham: null, relDecan: null, relTzolkin: null })],
      ["방6·상대 있음(같은 원형)", Object.assign(baseCodes(), { partner: "sage" })],
    ];
    for (const [label, c] of cases) {
      // (7단계) 방별 온전한 이야기는 옮겨 온 실제 문구라 한도 채우기 대상이 아니다 → 아래 "방별 온전한 이야기 분량" 시험이 따로 본다
      const rep = core.buildReport(c);
      const got = core.countChars({ chapters: rep.chapters.filter((ch) => ch.id !== "rooms") });
      const est = estimate(c);
      assert.ok(Math.abs(got - est) / est <= 0.15, `${label}: 실제 ${got} / 예상 ${est}`);
      console.log(`  ${label}: 예상 ${est}자 · 조립 ${got}자`);
    }
  } finally {
    const orig = JSON.parse(saved);
    for (const k of Object.keys(orig)) {
      if (!Array.isArray(orig[k])) for (const r of Object.keys(orig[k])) orig[k][r].forEach((e, i) => Object.assign(C[k][r][i], e));
      else orig[k].forEach((e, i) => Object.assign(C[k][i], e));
    }
  }
});

// ───────── 7단계 (spec 7-1·7-4) ─────────
const FULL_N = { rune: 24, star: 27, ogham: 20, decan: 36, tzolkin: 20, sibyl: 32 };
const onlyRoom = (room, i) => {
  const c = { rune: null, star: null, ogham: null, decan: null, tzolkin: null, sibyl: null, arch: "sage", band: 0, partner: null, relOgham: null, relDecan: null, relTzolkin: null };
  c[room] = room === "rune" ? [i, (i + 1) % 24, (i + 2) % 24] : room === "tzolkin" ? { number: 1 + (i % 13), sign: i } : i;
  return c;
};
test("7-1 순서 단일화: paycode.js CHAPTER_ORDER 하나를 브라우저·서버가 함께 쓴다", () => {
  assert.deepEqual([...PayCode.CHAPTER_ORDER], ["ogham", "star", "decan", "tzolkin", "rune", "sibyl"]);
  const rep = core.buildReport(baseCodes());
  // (8단계) 책 순서: 여는 글 → 제1부 여섯 방(숨은 장 포함) → 제2부 → 닫는 글. 별도 hidden 장 없음
  assert.deepEqual(rep.chapters.map((c) => c.id), ["open", "rooms", "timeline", "match", "deep", "close"]);
  assert.deepEqual(rep.chapters.find((c) => c.id === "rooms").rooms.map((r) => r.room), [...PayCode.CHAPTER_ORDER]);
  rep.chapters.find((c) => c.id === "rooms").rooms.forEach((r) => assert.ok(r.hidden && r.hidden.title && r.hidden.paragraphs.length, r.room + " 숨은 장"));
  // 다른 곳에 순서 배열을 다시 적지 않았는지
  const fs = require("fs");
  for (const f of ["app.js", "api/_lib/core.js"]) {
    const src = fs.readFileSync(path.join(P, f), "utf8");
    assert.ok(/CHAPTER_ORDER = (window\.)?PayCode\.CHAPTER_ORDER/.test(src), f + "가 paycode.js 순서를 읽지 않음");
    assert.ok(!/\["ogham", "star", "decan"/.test(src), f + "에 순서 배열이 따로 있음");
  }
});
test("7-4 방별 온전한 이야기: 모든 결과에 도달, 빈 문단 없음, 들른 방만", () => {
  const C = core.CONTENT;
  assert.deepEqual(Object.fromEntries(Object.entries(C.full).map(([k, v]) => [k, v.length])), FULL_N);
  for (const [room, n] of Object.entries(FULL_N))
    for (let i = 0; i < n; i++) {
      const rooms = core.buildReport(onlyRoom(room, i)).chapters.find((c) => c.id === "rooms").rooms;
      assert.equal(rooms.length, 1);
      const r = rooms[0];
      assert.equal(r.room, room);
      assert.ok(Array.isArray(r.ch1Rest), room + " ch1Rest");
      if (room === "rune") assert.equal(r.ch1Rest.length, 3, "룬 ch1Rest = 돌 셋");
      assert.ok(r.hidden.paragraphs.length >= 1 && r.hidden.paragraphs.every((p) => p.trim().length > 0));
      assert.ok(!JSON.stringify(r).includes('"close"'), "책에 identity.close 없음 (R-1)");
      for (const k of ["ch2", "ch3", "ch4"]) {
        assert.ok(r[k].length >= 2, `${room} ${i} ${k} 문단 수`);
        r[k].forEach((p) => assert.ok(typeof p === "string" && p.trim().length > 0 && !/<[a-z/]/i.test(p), `${room} ${i} ${k} 빈 문단·태그`));
      }
      if (room === "rune" || room === "sibyl") assert.ok(Object.keys(r.topics).length >= 4);
      else assert.equal(r.topics, undefined);
    }
});
test("8-1 결제 전 분량: app.js VOL.room(책 제1부 한 방 새 문장) = 방별 실측 평균(±3%)", () => {
  const src = require("fs").readFileSync(path.join(P, "app.js"), "utf8");
  const m = /room: \{ ([^}]+) \}/.exec(src);
  const VOLROOM = Object.fromEntries(m[1].split(",").map((x) => x.trim().split(": ")).map(([k, v]) => [k, Number(v)]));
  const L = (v) => (typeof v === "string" ? [...v].length : Array.isArray(v) ? v.reduce((a, x) => a + L(x), 0) : 0);
  const runeAvg = () => { // 룬은 돌 세 개 조합: 표본(겹치지 않는 조합 가운데 9개 중 1개)
    let s = 0, k = 0;
    for (let a = 0; a < 24; a++) for (let b = 0; b < 24; b++) for (let d = 0; d < 24; d++) {
      if (a === b || b === d || a === d || (a * 7 + b * 3 + d) % 9) continue;
      const c = onlyRoom("rune", 0); c.rune = [a, b, d];
      const r = core.buildReport(c).chapters.find((x) => x.id === "rooms").rooms[0];
      s += L([r.ch1Rest, r.ch2, r.ch3, r.ch4, r.hidden.paragraphs]) + L(Object.values(r.topics)) / Object.keys(r.topics).length; k++;
    }
    return s / k;
  };
  for (const [room, n] of Object.entries(FULL_N)) {
    let t = 0;
    for (let i = 0; i < n; i++) {
      const r = core.buildReport(onlyRoom(room, i)).chapters.find((c) => c.id === "rooms").rooms[0];
      const topic = r.topics ? L(Object.values(r.topics)) / Object.keys(r.topics).length : 0;
      t += L([r.ch1Rest, r.ch2, r.ch3, r.ch4, r.hidden.paragraphs]) + topic;
    }
    const avg = room === "rune" ? runeAvg() : t / n;
    assert.ok(Math.abs(avg - VOLROOM[room]) / avg <= 0.03, `${room}: 실측 ${Math.round(avg)} / VOL ${VOLROOM[room]}`);
    console.log(`  ${room}: 실측 평균 ${Math.round(avg)}자 · VOL ${VOLROOM[room]}`);
  }
});
test("7-4 무료 파일에 유료 칸 없음 (공개 data-*.js)", () => {
  const vm = require("vm");
  const fs = require("fs");
  const w = {};
  for (const f of fs.readdirSync(P).filter((n) => /^data-.*\.js$/.test(n))) vm.runInNewContext(fs.readFileSync(path.join(P, f), "utf8"), { window: w });
  const bad = [];
  const chk = (e, where) => {
    for (const s of ["shadow", "advice"]) if (e[s]) Object.keys(e[s]).forEach((k) => k !== "title" && bad.push(`${where}.${s}.${k}`));
    if (e.event) ["body", "quote", "lede"].forEach((k) => k in e.event && bad.push(`${where}.event.${k}`)); // (8단계) II장 첫 문단도 서버로
    if (e.past && ("body" in e.past || "lede" in e.past)) bad.push(where + ".past");
    if (e.identity && "rest" in e.identity) bad.push(where + ".identity.rest");
    // (8단계) 자르기 규칙: 룬은 돌마다 첫 단락 하나, 그 밖은 lede + body가 750자 이하(body 첫 단락은 늘 남김)
    if (Array.isArray(e.identity)) { if (e.identity.length !== 1) bad.push(where + ".identity 단락 " + e.identity.length); }
    else if (e.identity) { const n = [e.identity.lede, ...e.identity.body].reduce((a, x) => a + [...x].length, 0); if (e.identity.body.length > 1 && n > 750) bad.push(where + " 핵심 풀이 " + n + "자"); }
    if (e.now) ["body", "quote"].forEach((k) => k in e.now && bad.push(`${where}.now.${k}`));
    if (e.topics && where.startsWith("ORACLES")) bad.push(where + ".topics");
  };
  for (const name of ["RUNES", "NAKSHATRAS", "OGHAM", "DECANS", "TZOLKIN_SIGNS", "ORACLES"]) w[name].forEach((e, i) => chk(e, `${name}[${i}]`));
  assert.deepEqual(bad, []);
});

test("8-1 이동 손실 0: 공개 Ⅰ장(lede+body) + 서버 ch1Rest = 8단계 이전 원문(git HEAD), II장 lede도 같다", () => {
  const { execFileSync } = require("child_process");
  const vm = require("vm");
  const fs = require("fs");
  const FILES = { ogham: ["data-ogham.js", "OGHAM"], star: ["data-stars.js", "NAKSHATRAS"], decan: ["data-decans.js", "DECANS"], tzolkin: ["data-tzolkin.js", "TZOLKIN_SIGNS"], sibyl: ["data-oracles.js", "ORACLES"], rune: ["data-runes.js", "RUNES"] };
  let before;
  try { before = (f) => execFileSync("git", ["show", "e996e59:products/strange-oracle/" + f], { cwd: P, encoding: "utf8", maxBuffer: 1 << 26 }); before("data-ogham.js"); }
  catch (e) { console.log("  git 없음 — 건너뜀"); return; }
  for (const [room, [f, name]] of Object.entries(FILES)) {
    const old = {}, now = {};
    vm.runInNewContext(before(f), { window: old });
    vm.runInNewContext(fs.readFileSync(path.join(P, f), "utf8"), { window: now });
    const paid = core.CONTENT.full[room];
    old[name].forEach((o, i) => {
      const n = now[name][i], q = paid[i];
      if (room === "rune") {
        assert.equal(JSON.stringify(n.identity.concat(q.identity.rest)), JSON.stringify(o.identity), room + " " + o.code);
        assert.equal(q.past.lede, o.past.lede);
      } else {
        assert.equal([n.identity.lede, ...n.identity.body, ...q.identity.rest].join("|"), [o.identity.lede, ...o.identity.body].join("|"), room + " " + o.code);
        assert.equal(q.event.lede, o.event.lede);
      }
    });
  }
});
