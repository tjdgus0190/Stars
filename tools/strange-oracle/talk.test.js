// (2026-11-13 v1-D) 함수 talk(netlify/lib/talk.js·talk-prompt.js) 단위 시험 — 모델은 가짜(외부 요청 없음).
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("assert");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const Talk = require(path.join(ROOT, "netlify", "lib", "talk.js"));
const Prompt = require(path.join(ROOT, "netlify", "lib", "talk-prompt.js"));

const ENV = { TALK_MODE: "test", ANTHROPIC_API_KEY: "test-not-a-key", TALK_MONTHLY_USD: "1" };
const mem = () => { const m = new Map(); return { m, get: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), set: async (k, v) => { m.set(k, JSON.stringify(v)); } }; };
const NOW = Date.parse("2026-11-13T03:00:00Z");
let calls = [];
const llm = async (params) => { calls.push(params); return { stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "좋은 물음이구먼. 오늘은 작은 일 하나부터 끝내 보게." }], usage: { input_tokens: 2000, output_tokens: 300 } }; };
const post = (obj, ip = "1.1.1.1") => ({ method: "POST", body: typeof obj === "string" ? obj : JSON.stringify(obj), ip });
const run = (obj, opts = {}) => Talk.handle(post(obj, opts.ip), opts.env || ENV, opts.store || mem(), opts.now || NOW, opts.llm || llm);
test.beforeEach(() => { Talk._reset(); calls = []; });

test("켜는 조건이 하나라도 없으면 503 off, 모델을 부르지 않음", async () => {
  for (const env of [{}, { ...ENV, TALK_MODE: "off" }, { ...ENV, ANTHROPIC_API_KEY: "" }, { ...ENV, TALK_MONTHLY_USD: "0" }, { ...ENV, TALK_MONTHLY_USD: "abc" }]) {
    const r = await run({ room: "saju", q: "안녕" }, { env });
    assert.strictEqual(r.status, 503);
    assert.strictEqual(JSON.parse(r.body).error, "off");
  }
  assert.strictEqual(calls.length, 0);
});

test("정상: 답 글만 돌려주고(생각 칸 빼고) 이번 달 비용·횟수를 기록", async () => {
  const store = mem();
  const r = await run({ room: "saju", r: { s: 3 }, q: "올해 일은 어떻게 풀까요?" }, { store });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(JSON.parse(r.body).a, "좋은 물음이구먼. 오늘은 작은 일 하나부터 끝내 보게.");
  const b = JSON.parse(store.m.get("budget/2026-11"));
  assert.strictEqual(b.n, 1);
  assert.ok(Math.abs(b.usd - (2000 * 4 + 300 * 20) / 1e6) < 1e-9, String(b.usd)); // claude-opus-5-5 $4 / $20
  assert.deepStrictEqual([...store.m.keys()], ["budget/2026-11"]); // 질문·답·IP는 저장하지 않는다
  assert.strictEqual(r.headers["Cache-Control"], "no-store");
});

test("모델 요청: 결과 해석(무료 칸)과 안내자 설정 · 거절 대체 · 질문은 메시지에만", async () => {
  await run({ room: "tzolkin", r: { n: 4, s: 19 }, q: "요즘 일이 잘 안 풀려요", hist: [{ q: "안녕하세요", a: "어서 와요." }] });
  const p = calls[0];
  assert.strictEqual(p.model, "claude-opus-5-5");
  assert.deepStrictEqual(p.betas, ["server-side-fallback-2026-07-01"]);
  assert.strictEqual(p.fallbacks, "default");
  assert.ok(!("thinking" in p) && !("temperature" in p));
  assert.ok(/안내자 촐킨이다/.test(p.system[0].text) && /건강·질병/.test(p.system[0].text));
  assert.ok(/날의 숫자: 4/.test(p.system[1].text));
  assert.deepStrictEqual(p.messages.map((m) => m.role), ["user", "assistant", "user"]);
  assert.strictEqual(p.messages[2].content, "요즘 일이 잘 안 풀려요");
  assert.ok(!p.system.some((b) => b.text.includes("요즘 일이")));
});

test("TALK_MODEL로 모델을 바꿀 수 있고 비용도 그 값으로", async () => {
  const store = mem();
  await run({ room: "rune", q: "x" }, { store, env: { ...ENV, TALK_MODEL: "claude-sonnet-5-5" } });
  assert.strictEqual(calls[0].model, "claude-sonnet-5-5");
  assert.ok(Math.abs(JSON.parse(store.m.get("budget/2026-11")).usd - (2000 * 2 + 300 * 10) / 1e6) < 1e-9);
});

test("모르는 칸(이름·생일 등)·잘못된 결과 번호·길이 초과는 400, 모델을 부르지 않음", async () => {
  const bad = [
    { room: "saju", q: "x", name: "홍길동" },
    { room: "saju", q: "x", birth: "1995-03-25" },
    { room: "saju", r: { s: 10 }, q: "x" },
    { room: "saju", r: { s: 1, gender: "f" }, q: "x" },
    { room: "nope", q: "x" },
    { room: "saju", q: "" },
    { room: "saju", q: "가".repeat(301) },
    { room: "saju", q: "x", hist: [{ q: "a", a: "b" }, { q: "a", a: "b" }, { q: "a", a: "b" }, { q: "a", a: "b" }] },
    { room: "saju", q: "x", hist: [{ q: "a", a: "b", name: "x" }] },
    { room: "rune", r: { p: ["fehu", "fehu", "uruz"] }, q: "x" },
    { room: "rune", r: { p: ["fehu", "uruz", "<b>"] }, q: "x" },
    "not json",
    "[]",
  ];
  for (const b of bad) {
    Talk._reset();
    const r = await run(b);
    assert.strictEqual(r.status, 400, JSON.stringify(b).slice(0, 80));
  }
  assert.strictEqual(calls.length, 0);
  const big = await run("{" + " ".repeat(5000) + "}");
  assert.strictEqual(big.status, 400);
});

test("방마다 결과 번호 모양이 맞으면 통과", async () => {
  const codes = Prompt.runeCodes();
  const ok = { saju: { s: 9 }, ogham: { i: 19 }, star: { i: 26 }, decan: { i: 35 }, tzolkin: { n: 13, s: 0 }, rune: { p: codes.slice(21, 24) }, sibyl: { i: 31 } };
  for (const [room, r] of Object.entries(ok)) {
    Talk._reset();
    const res = await run({ room, r, q: "x" });
    assert.strictEqual(res.status, 200, room);
    assert.ok(Prompt.resultText(room, r).length > 10, room);
  }
});

test("위기 신호: 모델을 부르지 않고 상담 전화 안내(무료 몫도 쓰지 않음)", async () => {
  const r = await run({ room: "sibyl", q: "요즘 그냥 죽고 싶어요" });
  const o = JSON.parse(r.body);
  assert.strictEqual(r.status, 200);
  assert.ok(o.crisis && /109/.test(o.a) && /1577-0199/.test(o.a));
  assert.strictEqual(calls.length, 0);
  for (let i = 0; i < Talk.FREE_PER_DAY; i++) assert.strictEqual((await run({ room: "sibyl", q: "x" + i })).status, 200);
});

test("거절(전체 사슬)·빈 답 → 안내자 말투의 정해진 한 줄", async () => {
  const refuse = async () => ({ stop_reason: "refusal", content: [], usage: { input_tokens: 10, output_tokens: 0 } });
  const r = await run({ room: "rune", q: "x" }, { llm: refuse });
  assert.strictEqual(r.status, 200);
  assert.ok(/^룬이 고개를/.test(JSON.parse(r.body).a));
});

test("모델 오류 → 502, 저장소 읽기 실패 → 503 store", async () => {
  const r = await run({ room: "saju", q: "x" }, { llm: async () => { throw new Error("boom"); } });
  assert.strictEqual(r.status, 502);
  const broken = { get: async () => { throw new Error("x"); }, set: async () => {} };
  Talk._reset();
  assert.strictEqual((await run({ room: "saju", q: "x" }, { store: broken })).status, 503);
});

test("월 상한을 넘으면 503 budget(모델을 부르지 않음), 다음 달엔 다시", async () => {
  const store = mem();
  store.m.set("budget/2026-11", JSON.stringify({ usd: 1.0, n: 99 }));
  const r = await run({ room: "saju", q: "x" }, { store });
  assert.strictEqual(r.status, 503);
  assert.strictEqual(JSON.parse(r.body).error, "budget");
  assert.strictEqual(calls.length, 0);
  Talk._reset();
  const next = await run({ room: "saju", q: "x" }, { store, now: Date.parse("2026-11-30T16:00:00Z") }); // 한국 12월 1일
  assert.strictEqual(next.status, 200);
});

test("하루 무료 질문 4번 → 다섯 번째 429, 다른 IP는 따로, 한국 날짜가 바뀌면 다시", async () => {
  for (let i = 0; i < 4; i++) assert.strictEqual((await run({ room: "saju", q: "q" + i })).status, 200);
  const r5 = await run({ room: "saju", q: "q5" });
  assert.strictEqual(r5.status, 429);
  assert.ok(r5.headers["Retry-After"]);
  assert.strictEqual((await run({ room: "saju", q: "q" }, { ip: "2.2.2.2" })).status, 200);
  assert.strictEqual((await run({ room: "saju", q: "q" }, { now: NOW + 86400000 })).status, 200);
});

test("POST만 받는다", async () => {
  const r = await Talk.handle({ method: "GET", body: "", ip: "x" }, ENV, mem(), NOW, llm);
  assert.strictEqual(r.status, 405);
});

test("함수 파일·배포 설정: 주소 /api/talk, 함수 묶음에 안내자·해석 파일, 공개 화면 기본값 off", () => {
  const fs = require("fs");
  const fn = fs.readFileSync(path.join(ROOT, "netlify", "functions", "talk.mjs"), "utf8");
  assert.ok(/path:\s*"\/api\/talk"/.test(fn));
  const toml = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
  for (const f of ["data-dex.js", "data-saju.js", "data-runes.js", "data-oracles.js"]) assert.ok(toml.includes("products/strange-oracle/" + f), f);
  const g = fs.readFileSync(path.join(ROOT, "products", "strange-oracle", "data-guide.js"), "utf8");
  assert.ok(/talkMode:\s*"off"/.test(g));
  assert.ok(!/sk-ant-/.test(fn + toml + g + fs.readFileSync(path.join(ROOT, "netlify", "lib", "talk.js"), "utf8")));
});
