// 6단계 모의 서버 HTTP 점검 (D-4·D-5·D-7). 브라우저 없이 Node 내장 fetch만.
// 준비: node tools/build-dist.js && node tools/strange-oracle/mock-server.js --port 8787
// 실행: node tools/strange-oracle/http-check.js [http://127.0.0.1:8787]
"use strict";
const fs = require("fs");
const path = require("path");
const PayCode = require("../../products/strange-oracle/paycode.js");
const BASE = process.argv[2] || "http://127.0.0.1:8787";
const ROOT = path.resolve(__dirname, "..", "..");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const post = async (p, body, raw) => {
  const r = await fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: raw ?? JSON.stringify(body) });
  let data = null;
  try { data = await r.json(); } catch (e) { /* */ }
  return { status: r.status, data, cache: r.headers.get("cache-control") };
};
const codes = { rune: null, star: 3, ogham: 1, decan: null, tzolkin: null, sibyl: null, arch: "ruler", band: 3, partner: null, relOgham: null, relDecan: null, relTzolkin: null };

(async () => {
  // D-4: 서버 전용 경로가 200이 아님 + 공개 파일에 유료 문장 0건 (무작위 20문장)
  for (const p of ["/api/_paid/open.js", "/api/_paid/match.js", "/api/_lib/core.js", "/api/_lib/paycode.js", "/api/", "/api/%5Fpaid/open.js", "/products/strange-oracle/api/_paid/open.js", "/products/strange-oracle/api/_lib/core.js"]) {
    const r = await fetch(BASE + p);
    check(`D-4 ${p} → 200 아님`, r.status !== 200, r.status);
  }
  const paid = [];
  const collect = (v, k) => (typeof v === "string" ? k !== "code" && v.length >= 12 && paid.push(v) : Array.isArray(v) ? v.forEach((x) => collect(x)) : v && typeof v === "object" && Object.entries(v).forEach(([kk, x]) => collect(x, kk)));
  const PAID_DIR = path.join(ROOT, "products", "strange-oracle", "api", "_paid");
  for (const f of fs.readdirSync(PAID_DIR)) collect(require(path.join(PAID_DIR, f)));
  const sample = Array.from({ length: 20 }, () => paid[Math.floor(Math.random() * paid.length)]);
  const pub = path.join(ROOT, "dist", "public");
  const files = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : /\.(html|js|css|json|md)$/.test(e.name) && files.push(path.relative(pub, path.join(d, e.name)).split(path.sep).join("/")); })(pub);
  let hits = 0;
  for (const f of files) {
    const text = await (await fetch(`${BASE}/${f}`)).text();
    hits += sample.filter((s) => text.includes(s)).length;
  }
  check(`D-4 유료 문장 20개 × 공개 파일 ${files.length}개(서버로 받아 대조) → 0건`, hits === 0, hits);

  // config
  const cfg = await (await fetch(BASE + "/api/config")).json();
  check("config: mock 켜짐, 키 없음", cfg.enabled === true && cfg.mode === "mock" && !cfg.clientKey && cfg.price === 3900, JSON.stringify(cfg));

  // D-7
  const orderId = PayCode.encode(codes);
  let r = await post("/api/confirm", { paymentKey: "mock_http1", orderId, amount: 100 });
  check("D-7 금액 100원 → 거절", r.status === 400 && r.data.error === "bad_amount", r.status);
  r = await post("/api/confirm", { paymentKey: "mock_http1", orderId: "SO1BADBADBAD", amount: 3900 });
  check("D-7 형식 틀린 주문번호 → 거절", r.status === 400, r.status);
  r = await post("/api/report", { receipt: PayCode.encode(Object.assign({}, codes, { band: 0 })) });
  check("D-7 결제 기록 없는 주문번호 → 거절", r.status === 404, r.status);
  r = await post("/api/confirm", { paymentKey: "real_looking_key", orderId, amount: 3900 });
  check("mock: mock_ 아닌 paymentKey → 거절", r.status === 402, r.status);
  // D-5 정해진 키 외 필드
  r = await post("/api/confirm", { paymentKey: "mock_http1", orderId, amount: 3900, name: "김서윤" });
  check("D-5 정해진 키 외 필드(name) → 400", r.status === 400, r.status);
  r = await post("/api/report", { receipt: orderId, birth: "1995-03-21" });
  check("D-5 정해진 키 외 필드(birth) → 400", r.status === 400, r.status);
  r = await post("/api/report", null, "{not json");
  check("깨진 JSON → 400", r.status === 400, r.status);
  r = await post("/api/report", null, JSON.stringify({ receipt: "x".repeat(5000) }));
  check("큰 본문 → 413", r.status === 413, r.status);
  // D-6 멱등
  const a = await post("/api/confirm", { paymentKey: "mock_http1", orderId, amount: 3900 });
  const b = await post("/api/confirm", { paymentKey: "mock_http1", orderId, amount: 3900 });
  check("D-6 같은 결제로 두 번 → 같은 리포트", a.status === 200 && b.status === 200 && JSON.stringify(a.data) === JSON.stringify(b.data));
  check("응답 Cache-Control no-store", a.cache === "no-store", a.cache);
  const c = await post("/api/report", { receipt: PayCode.pretty(orderId) });
  check("D-8 영수증 코드로 같은 리포트", c.status === 200 && JSON.stringify(c.data.report) === JSON.stringify(a.data.report));
  const r405 = await fetch(BASE + "/api/confirm");
  check("GET /api/confirm → 405", r405.status === 405, r405.status);
  const fails = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fails} PASS / ${fails} FAIL`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
