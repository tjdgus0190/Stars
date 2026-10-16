// 15단계 모의 페이앱 (spec 15-6) — mock-server.js --mode test에서만 붙는다. 배포 폴더·본 페이지에는 없다(__dev 길, build-dist 가드).
// 길:
//   /api/pay/feedback|status|return  함수 netlify/functions/pay.js의 handle()을 그대로 부른다(Blobs 대신 메모리 저장소)
//   /__dev/payapp-lite.js            가짜 SDK. PayApp.setDefault·setParam·payrequest·call. 결제창 방식은 스위치 win(redirect 기본 | popup)
//   /__dev/payapp/checkout (POST)    가짜 결제창. 받은 값(상품명·금액·결제수단)과 단추. 견본 HTML이 있으면 그것을 쓴다(CHECKOUT_TEMPLATE)
//   /__dev/payapp/act (POST JSON)    단추 동작 → 가짜 통보를 함수 pay에 보낸다 → { results, next }
//   /__dev/pay-switch?win=redirect|popup&sdk=ok|fail&store=ok|fail-read|fail-write&env=ok|empty-linkval|empty-linkkey|empty-userid|short-secret&late=<ms>&limits=reset
//   /__dev/pay-store                 메모리 저장소의 키와 값(JSON). ?clear=1이면 비움
// 모의 linkkey·linkval·PASS_SECRET은 켤 때마다 새로 만들고 터미널에도 찍지 않는다(통보 흉내에만 씀). 요청 본문은 찍지 않는다.
//
// 견본 결제창 HTML(designer) 계약 — 파일이 있으면 그대로 내보내고 </body> 앞에 동작 스크립트만 넣는다:
//   [data-field=goodname|price|shopname|openpaytype]  받은 값을 글자로 채움
//   input[data-field=phone]                          휴대폰 번호 칸(가짜 통보의 recvphone, 우리 기록에 남지 않는지 확인용)
//   button[data-act=complete|fail|close|late|cancel-after|cancel-first|triple|second-r|bad-price|bad-linkval|bad-tag|bad-var1]
"use strict";
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { MemStore } = require("./mem-store.js");

const ROOT = path.resolve(__dirname, "..", "..");
const Pay = require(path.join(ROOT, "netlify", "functions", "pay.js"));
const CHECKOUT_TEMPLATE = path.join(__dirname, "payapp-mock.html");
const MOCK_USERID = "mock-seller";
const TEST_PHONE = "01099990000"; // 가짜 통보 recvphone 기본값(시험용, 실재 번호 아님)
const OFFICIAL_SDK = "https://lite.payapp.kr/public/api/v2/payapp-lite.js";

const rnd = (n) => crypto.randomBytes(n).toString("hex");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const readBody = (req, max = 16384) =>
  new Promise((ok) => {
    let b = "";
    let big = false;
    req.on("data", (c) => {
      if (big) return;
      b += c;
      if (b.length > max) big = true;
    });
    req.on("end", () => ok(big ? "x".repeat(max + 1) : b));
  });

function createPayMock({ port }) {
  const SECRETS = { linkkey: rnd(16), linkval: rnd(16), secret: rnd(32) };
  const store = new MemStore();
  const sw = { win: "redirect", sdk: "ok", store: "ok", env: "ok", late: 40000 };
  const sessions = new Map(); // token → 결제창에 넘어온 값 (메모리, 시험 중에만)

  const payEnv = () => ({
    PASS_MODE: "test",
    PAYAPP_USERID: sw.env === "empty-userid" ? "" : MOCK_USERID,
    PAYAPP_LINKKEY: sw.env === "empty-linkkey" ? "" : SECRETS.linkkey,
    PAYAPP_LINKVAL: sw.env === "empty-linkval" ? "" : SECRETS.linkval,
    PASS_SECRET: sw.env === "short-secret" ? "short" : SECRETS.secret,
    SITE_URL: `http://127.0.0.1:${port}/products/strange-oracle/`,
  });
  const applyStore = () => {
    store.failRead = sw.store === "fail-read";
    store.failWrite = sw.store === "fail-write";
  };
  const callPay = (route, method, body, ip) => Pay.handle({ method, route, body, ip }, payEnv(), store);

  // test 모드 data.js 응답 변환: SDK 주소 → 가짜 SDK, 빈 userid → 모의 값 (파일은 고치지 않음, pay.mode와 같은 방식)
  const transformDataJs = (t) =>
    t.replace(/(\bsdk:\s*)"https:\/\/lite\.payapp\.kr\/public\/api\/v2\/payapp-lite\.js"/, '$1"/__dev/payapp-lite.js"').replace(/(\bpayapp:\s*\{[^}]*?\buserid:\s*)""/, `$1"${MOCK_USERID}"`);

  const sdkScript = () => `// 가짜 페이앱 SDK (모의 서버 전용, 결제창 방식: ${sw.win})
(function () {
  var WIN = ${JSON.stringify(sw.win)}, d = {}, p = {};
  function go() {
    var all = {}, k;
    for (k in d) all[k] = d[k];
    for (k in p) all[k] = p[k];
    var f = document.createElement("form");
    f.method = "post"; f.action = "/__dev/payapp/checkout"; f.acceptCharset = "utf-8"; f.style.display = "none";
    for (k in all) { var i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = all[k] == null ? "" : String(all[k]); f.appendChild(i); }
    if (WIN === "popup") { window.open("", "payapp_mock", "width=420,height=720"); f.target = "payapp_mock"; }
    document.body.appendChild(f); f.submit(); f.parentNode.removeChild(f);
  }
  window.PayApp = {
    setDefault: function (k, v) { d[k] = v; return this; },
    setParam: function (k, v) { p[k] = v; return this; },
    payrequest: function () { go(); },
    call: function (o) { for (var k in (o || {})) p[k] = o[k]; go(); },
    _mock: true
  };
})();
`;

  const ACTS = [
    ["complete", "결제 완료"], ["fail", "결제 실패"], ["close", "창 닫기"], ["late", "완료, 통보 늦게"], ["cancel-after", "완료 뒤 취소"],
    ["cancel-first", "취소 먼저"], ["triple", "같은 통보 3번"], ["second-r", "같은 R로 두 번째 결제"],
    ["bad-price", "금액 조작"], ["bad-linkval", "linkval 틀림"], ["bad-tag", "표지 틀림"], ["bad-var1", "var1 모양 틀림"],
  ];
  function checkoutHtml(token, s) {
    const script = `<script>
(function () {
  var TOKEN = ${JSON.stringify(token)}, V = ${JSON.stringify({ goodname: s.goodname || "", price: s.price || "", shopname: s.shopname || "", openpaytype: s.openpaytype || "" })};
  document.querySelectorAll("[data-field]").forEach(function (el) { var k = el.getAttribute("data-field"); if (k !== "phone" && k in V) el.textContent = V[k]; });
  document.querySelectorAll("[data-act]").forEach(function (b) {
    b.addEventListener("click", function () {
      var ph = document.querySelector("input[data-field=phone]");
      document.querySelectorAll("[data-act]").forEach(function (x) { x.disabled = true; });
      fetch("/__dev/payapp/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: TOKEN, act: b.getAttribute("data-act"), phone: ph ? ph.value : "" }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { window.__mockResult = j; if (j.next === "close" && window.opener) window.close(); else location.href = j.next || "/api/pay/return"; });
    });
  });
})();
</script>`;
    if (fs.existsSync(CHECKOUT_TEMPLATE)) {
      const t = fs.readFileSync(CHECKOUT_TEMPLATE, "utf8");
      return t.includes("</body>") ? t.replace("</body>", script + "</body>") : t + script;
    }
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>가짜 결제창 (시험 전용)</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:16px;max-width:420px;background:#f4f4f4;color:#111}h1{font-size:17px}dl{background:#fff;padding:12px;border-radius:8px}dt{color:#666;font-size:13px}dd{margin:0 0 8px}button{display:block;width:100%;margin:6px 0;padding:10px;font-size:15px}input{width:100%;padding:8px;box-sizing:border-box}</style></head><body>
<h1>가짜 결제창 (모의 서버 시험 전용)</h1>
<dl><dt>판매자</dt><dd data-field="shopname"></dd><dt>상품</dt><dd data-field="goodname"></dd><dt>금액</dt><dd data-field="price"></dd><dt>결제수단</dt><dd data-field="openpaytype"></dd></dl>
<label>휴대폰 번호 (시험용)<input data-field="phone" value="${TEST_PHONE}" inputmode="numeric"></label>
${ACTS.map(([a, l]) => `<button type="button" data-act="${a}">${esc(l)}</button>`).join("\n")}
${script}</body></html>`;
  }

  // 가짜 통보 한 통
  function notice(s, state, mul, phone, over = {}) {
    const f = Object.assign(
      { pay_type: "1", userid: MOCK_USERID, linkkey: SECRETS.linkkey, linkval: SECRETS.linkval, goodname: s.goodname || "", price: String(s.price || ""), recvphone: phone || TEST_PHONE, mul_no: mul, pay_state: String(state), pay_date: new Date().toISOString().slice(0, 19).replace("T", " "), var1: s.var1 || "", var2: s.var2 || "" },
      over
    );
    for (const k of Object.keys(f)) if (f[k] === undefined) delete f[k];
    return new URLSearchParams(f).toString();
  }
  const newMul = () => String(10000000 + crypto.randomInt(89999999));
  async function runAct(s, act, phone) {
    const results = [];
    const send = async (state, mul, over) => {
      const r = await callPay("feedback", "POST", notice(s, state, mul, phone, over), "payapp");
      results.push({ state: String(state), status: r.status, body: r.body });
    };
    const mul = newMul();
    switch (act) {
      case "complete": await send(1, mul); await send(4, mul); break;
      case "fail": case "close": await send(1, mul); break;
      case "late": await send(1, mul); setTimeout(() => send(4, mul).catch(() => {}), sw.late).unref(); break;
      case "cancel-after": await send(1, mul); await send(4, mul); await send(9, mul); break;
      case "cancel-first": await send(9, mul, { var1: undefined, price: undefined }); await send(4, mul); break;
      case "triple": await send(1, mul); await send(4, mul); await send(4, mul); await send(4, mul); break;
      case "second-r": { const mul2 = newMul(); await send(1, mul); await send(4, mul); await send(1, mul2); await send(4, mul2); await send(9, mul2); break; }
      case "bad-price": await send(1, mul, { price: "100" }); await send(4, mul, { price: "100" }); break;
      case "bad-linkval": await send(1, mul, { linkval: rnd(16) }); await send(4, mul, { linkval: rnd(16) }); break;
      case "bad-tag": await send(1, mul, { var2: "so-book-x" }); await send(4, mul, { var2: "so-book-x" }); break;
      case "bad-var1": await send(1, mul, { var1: "zz" + String(s.var1 || "").slice(2) }); await send(4, mul, { var1: "zz" + String(s.var1 || "").slice(2) }); break;
      default: return null;
    }
    return results;
  }
  const returnTo = (s, host) => {
    try {
      const u = new URL(String(s.returnurl || ""), `http://${host}`);
      if (u.host === host && u.pathname === "/api/pay/return") return u.pathname;
    } catch (e) {}
    return "/api/pay/return";
  };

  const sendJson = (res, status, obj) => res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }).end(JSON.stringify(obj));

  // 처리했으면 true
  function route(req, res, rel, url, log) {
    if (rel.startsWith("/api/pay/")) {
      readBody(req).then(async (body) => {
        const r = await callPay(rel.slice("/api/pay/".length), req.method, body, req.socket.remoteAddress);
        res.writeHead(r.status, r.headers).end(r.body);
        log(r.status);
      });
      return true;
    }
    if (rel === "/__dev/payapp-lite.js") {
      if (sw.sdk === "fail") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }).end("없는 파일");
        log(404);
      } else {
        res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" }).end(sdkScript());
        log(200);
      }
      return true;
    }
    if (rel === "/__dev/payapp/checkout") {
      readBody(req).then((body) => {
        const s = Object.fromEntries(new URLSearchParams(req.method === "POST" ? body : url.search));
        const token = rnd(12);
        sessions.set(token, s);
        if (sessions.size > 200) sessions.delete(sessions.keys().next().value);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(checkoutHtml(token, s));
        log(200);
      });
      return true;
    }
    if (rel === "/__dev/payapp/act") {
      readBody(req).then(async (body) => {
        let j = {};
        try {
          j = JSON.parse(body);
        } catch (e) {}
        const s = sessions.get(j.token);
        const results = s ? await runAct(s, String(j.act || ""), String(j.phone || "")) : null;
        if (!results) {
          sendJson(res, 400, { error: "act" });
          return log(400);
        }
        sendJson(res, 200, { results, next: j.act === "close" ? "close" : returnTo(s, req.headers.host) });
        log(200);
      });
      return true;
    }
    if (rel === "/__dev/pay-switch") {
      const q = url.searchParams;
      if (["redirect", "popup"].includes(q.get("win"))) sw.win = q.get("win");
      if (["ok", "fail"].includes(q.get("sdk"))) sw.sdk = q.get("sdk");
      if (["ok", "fail-read", "fail-write"].includes(q.get("store"))) sw.store = q.get("store");
      if (["ok", "empty-linkval", "empty-linkkey", "empty-userid", "short-secret"].includes(q.get("env"))) sw.env = q.get("env");
      if (/^\d{1,6}$/.test(q.get("late") || "")) sw.late = Number(q.get("late"));
      if (q.get("limits") === "reset") Pay._reset();
      applyStore();
      sendJson(res, 200, sw);
      log(200);
      return true;
    }
    if (rel === "/__dev/pay-store") {
      if (url.searchParams.get("clear") === "1") store.clear();
      sendJson(res, 200, store.dump());
      log(200);
      return true;
    }
    return false;
  }

  return { route, store, payEnv, transformDataJs, sw, OFFICIAL_SDK, MOCK_USERID, TEST_PHONE };
}

module.exports = { createPayMock, MOCK_USERID, TEST_PHONE, CHECKOUT_TEMPLATE };
