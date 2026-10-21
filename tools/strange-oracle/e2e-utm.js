// 광고 측정(제안서 strange-oracle-ads 8장 4번): 광고 링크 utm 허용 목록 e2e. 헤드리스 Edge(cdp.js).
// 준비: node tools/strange-oracle/mock-server.js --port 8788 --mode test
// 실행: node --experimental-websocket tools/strange-oracle/e2e-utm.js → 결과 tools/strange-oracle/out/e2e-utm.txt
// data.js 응답의 GA4 ID를 시험값으로 바꾸고 구글 스크립트 요청은 막는다 → dataLayer(config·event)를 검사한다(6장).
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const PAGE = "http://127.0.0.1:8788/products/strange-oracle/index.html";
const out = [];
const check = (name, ok, extra = "") => {
  const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`;
  out.push(l);
  console.log(l);
};
const INPUTS = ["테스트", "%ED%85%8C", "1995", "0325", "name", "birth", "fbclid", "ttclid", "IWAR", "CLICKSECRET", "pay=", "Facebook", "utm_term"];
const CASES = [
  { name: "허용 utm 4개 + fbclid", q: "?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad1_seven_doors&utm_content=ad1_seven_doors&fbclid=IWAR_CLICKSECRET", want: "?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad1_seven_doors&utm_content=ad1_seven_doors" },
  { name: "허용 utm, 순서 섞임 + ttclid", q: "?ttclid=CLICKSECRET&utm_content=ad2_manshin&utm_source=tiktok&utm_medium=paid_social&utm_campaign=ad2_manshin", want: "?utm_source=tiktok&utm_medium=paid_social&utm_campaign=ad2_manshin&utm_content=ad2_manshin" },
  { name: "utm + 입력값처럼 생긴 키(섞인 쿼리)", q: "?utm_source=instagram&name=%ED%85%8C%EC%8A%A4%ED%8A%B8&birth=1995-03-25", want: "" },
  { name: "목록 밖 값(대소문자)", q: "?utm_source=Facebook&utm_medium=paid_social", want: "" },
  { name: "목록 밖 키(utm_term)", q: "?utm_source=instagram&utm_term=1995", want: "" },
  { name: "옛 결제 복귀 query", q: "?pay=success&orderId=CLICKSECRET", want: "" },
  { name: "query 없음", q: "", want: "" },
];

(async () => {
  const b = await launch({ port: 9361, reduced: true, width: 360, height: 640 });
  const { send, sleep } = b;
  b.on(async (m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId, request, responseStatusCode } = m.params;
    try {
      if (/googletagmanager|google-analytics/.test(request.url)) return send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
      if (/\/data\.js$/.test(request.url) && responseStatusCode) {
        const r = await send("Fetch.getResponseBody", { requestId });
        const t = (r.base64Encoded ? Buffer.from(r.body, "base64").toString("utf8") : r.body).replace(/analytics:\s*\{\s*ga4:\s*"[^"]*"/, 'analytics: { ga4: "G-E2EUTM0001"');
        return send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/javascript; charset=utf-8" }], body: Buffer.from(t).toString("base64") });
      }
      send("Fetch.continueRequest", { requestId });
    } catch (e) {
      send("Fetch.continueRequest", { requestId }).catch(() => {});
    }
  });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.dataLayer = [];" });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*googletagmanager*" }, { urlPattern: "*google-analytics*" }, { urlPattern: "*/data.js", requestStage: "Response" }] });
  try {
    for (const c of CASES) {
      await b.goto("about:blank");
      await b.goto(PAGE + c.q);
      await sleep(400);
      const r = await b.evaluate(`({ dl: JSON.stringify((window.dataLayer || []).map((a) => Array.from(a)).filter((a) => a[0] !== "js")), search: location.search, href: location.href,
        gtag: [...document.scripts].filter((s) => /googletagmanager/.test(s.src)).length })`);
      const dl = JSON.parse(r.dl);
      const cfg = dl.find((a) => a[0] === "config");
      const loc = cfg ? cfg[2].page_location : null;
      const visit = dl.some((a) => a[0] === "event" && a[1] === "so_visit");
      const hits = INPUTS.filter((s) => r.dl.includes(s) || r.href.includes(s));
      check(`${c.name}: page_location = 주소${c.want ? " + 허용 utm만" : "(query 없음)"}`, loc === PAGE + c.want, loc);
      check(`${c.name}: 방문 기록(so_visit 1건·gtag 1개)·주소창 query 지움`, visit && r.gtag === 1 && r.search === "", `search="${r.search}" gtag ${r.gtag}`);
      check(`${c.name}: dataLayer·주소창에 입력값·클릭 ID·목록 밖 값 0건`, hits.length === 0 && !/utm_/.test(r.href), hits.join(",") || `${dl.length}건`);
      const utms = r.dl.match(/utm_[a-z]+=[a-z0-9_]+/g) || [];
      check(`${c.name}: dataLayer의 utm은 page_location 안의 것뿐`, utms.join("&") === c.want.replace(/^\?/, ""), utms.join("&") || "없음");
    }
    const errs = b.log.errors.filter((e) => !/googletagmanager|google-analytics|favicon/.test(e));
    check("콘솔 오류 0(구글 차단 제외)", errs.length === 0, errs.slice(0, 3).join(" | "));
  } finally {
    await b.close();
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-utm.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail}/${out.length} 통과`);
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });
