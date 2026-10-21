// 15단계 G3: 결제 흐름 e2e (spec 15-8 화면 쪽 1~4·7·9~12·14~16·18·25·26). 헤드리스 Edge(cdp.js).
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test   (시험 페이지, 가짜 SDK·결제창·메모리 저장소)
//       off(배포판) 확인용 서버는 이 시험이 직접 띄우고 끈다: mock-server.js --port 8791 --mode off
// 실행: node tools/strange-oracle/e2e-pay.js   → 결과 tools/strange-oracle/out/e2e-pay.txt (약 4~5분: 30초 회차를 여러 번 돈다)
// 보는 것
//  A. 결제 전 화면: 1~6이 버튼 위·판매자 정보 줄은 아래·동의 전 비활성·userid 빈칸이면 비활성 + 판매 준비 중·이미 열린 탭이면 "이미 열려 있어요"·SDK 요청 0
//     열람 코드 칸(SO1·SOG·모양 → 요청 0, 틀림 fail, 닿지 않음 offline, 맞음 → 목차)
//  B. 이동 방식: [결제하기] → SDK 1건 → 가짜 결제창(넘긴 값은 15-2 표뿐) → [결제 완료] → #paid → 책 12장(18단계) + 코드 카드(SOP·복사) → 새 탭에서 코드로 열림
//  C. 팝업 방식: 진짜 마우스 클릭 → 팝업이 막히지 않음 → 팝업에 "원래 창에서 열려요" → 원래 탭에서 책·코드 카드
//  D. 실패·늦음: [결제 실패] → 30초 넘음(late)·[다시 확인]·[목차로], 회차 3번 되풀이 429 없음·회차당 17회 이하(겹침 없음), [완료, 통보 늦게] → late → [다시 확인]으로 열림
//  E. 429: 화면 busy + Retry-After 동안 [다시 확인] 비활성(가로챈 응답으로 3초 뒤 활성 확인, 머리 없으면 60초)
//  F. 503(store=fail-read): offline 화면·payreq·pass 남음 → ok로 돌린 뒤 [다시 확인]으로 열림 / book 503에도 pass 남음
//  G. 취소: [완료 뒤 취소] → cancelled 화면 / R 없음(#paid) → noreq + 코드 넣기 길 / sdk=fail → sdkfail + [다시 시도]·[목차로]
//  H. 내 정보 지우기: 결제 확인 중 경고 줄 → payreq·pass 지움
//  I. 개인정보: 입력값·R·P가 URL·console·localStorage·쿠키에 0, status 본문 { r }뿐, book 본문 pass·file뿐
//  J. off: 결제·책 요소 DOM 0(새 요소 포함), payapp·/api/pay 요청 0, #paid·#report·#deeper → 막다른 곳 없음
"use strict";
const { launch, googleCount } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const OFF = "http://127.0.0.1:8791";
const P = "/products/strange-oracle/index.html";
const CDP_PORT = 9621;
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const PAID = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl", "cross", "flow", "yeon", "match", "deep"]; // (17단계) 유료 11장 → (18단계) 새 장 cross 더해 12장(방 2개 이상에서 열림)
const PassCode = require("../../products/strange-oracle/paycode.js").Pass;
const sw = (q) => fetch(`${TEST}/__dev/pay-switch?${q}`).then((r) => r.json());
const storeDump = () => fetch(`${TEST}/__dev/pay-store`).then((r) => r.json());

(async () => {
  await sw("limits=reset&win=redirect&sdk=ok&store=ok&env=ok&late=40000");
  await fetch(`${TEST}/__dev/pay-store?clear=1`);
  const b = await launch({ port: CDP_PORT, reduced: true, width: 360, height: 640 });
  const { sleep, send } = b;
  const ev = async (expr) => { for (let i = 0; i < 20; i++) { try { return await b.evaluate(expr); } catch (e) { if (!/context|destroyed|navigat|Cannot find/i.test(e.message)) throw e; await sleep(150); } } return b.evaluate(expr); };
  // 가로채기: /api/book 연결 실패 · data.js userid 비우기 · status 429 꾸미기
  const intercept = { failBook: false, emptyUserid: false, fake429: null };
  b.on(async (m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId, request, responseStatusCode } = m.params;
    try {
      if (/\/api\/book/.test(request.url) && intercept.failBook) return send("Fetch.failRequest", { requestId, errorReason: "ConnectionRefused" });
      if (/\/api\/pay\/status/.test(request.url) && intercept.fake429) {
        const headers = [{ name: "Content-Type", value: "application/json" }].concat(intercept.fake429.after ? [{ name: "Retry-After", value: String(intercept.fake429.after) }] : []);
        return send("Fetch.fulfillRequest", { requestId, responseCode: 429, responseHeaders: headers, body: Buffer.from('{"error":"busy"}').toString("base64") });
      }
      if (/\/data\.js$/.test(request.url) && responseStatusCode && intercept.emptyUserid) {
        const r = await send("Fetch.getResponseBody", { requestId });
        const t = (r.base64Encoded ? Buffer.from(r.body, "base64").toString("utf8") : r.body).replace(/(payapp:\s*\{\s*userid:\s*)"[^"]*"/, '$1""');
        return send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/javascript; charset=utf-8" }], body: Buffer.from(t).toString("base64") });
      }
      send("Fetch.continueRequest", { requestId });
    } catch (e) {
      send("Fetch.continueRequest", { requestId }).catch(() => {});
    }
  });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/book*" }, { urlPattern: "*/api/pay/status*" }, { urlPattern: "*/data.js", requestStage: "Response" }] });
  const waitFor = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await b.evaluate(expr)) return true; } catch (e) {} await sleep(80); } return false; };
  const active = () => ev("document.querySelector('.screen.is-active')?.id");
  const state = () => ev("document.querySelector('#screen-paycheck')?.dataset.state");
  const rows = () => ev("Object.fromEntries([...document.querySelectorAll('[data-js=book-chapter]')].map(li => [li.dataset.chapter, li.dataset.state]))");
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const visible = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); return !!el && el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden'; })()`);
  const reqs = (re) => b.log.requests.filter((r) => re.test(r)).length;
  const statusN = () => reqs(/\/api\/pay\/status/);
  const sdkN = () => reqs(/payapp-lite\.js/);
  const ss = (k) => ev(`sessionStorage.getItem(${JSON.stringify(k)})`);
  const skip = async (base, q, screen) => {
    await b.goto(base + P);
    await ev("sessionStorage.clear()");
    await b.goto(`${base}/__dev/skip?${q}`);
    return waitFor(`document.querySelector('.screen.is-active')?.id === '${screen}'`, 8000);
  };
  const toPay = async (q = "rooms=7&to=book") => {
    await skip(TEST, q, "screen-report");
    await ev("StrangeOracle.go('deeper')");
    return waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  };
  const realClick = async (sel) => {
    const r = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    await sleep(150);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x, y: r.y, button: "left", clickCount: 1 });
  };
  const codesShown = () => ev("[...document.querySelectorAll('[data-js=pay-code-dialog] [data-js=code-value]')].map(e => e.textContent)");
  const dlgOpen = () => ev("!!document.querySelector('[data-js=pay-code-dialog]')?.open");
  // 가짜 결제창(같은 탭)에서 단추 하나 누르기
  const checkoutAct = async (act) => {
    const ok = await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 8000);
    if (!ok) return false;
    await ev(`document.querySelector('[data-act=${act}]').click()`);
    return true;
  };
  const buyRedirect = async () => {
    await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); })()");
    await click("[data-js=pay-buy]");
  };
  const allCodes = [];
  const allReqs = [];
  const grabReq = async () => { const r = JSON.parse((await ss("strange-oracle-payreq")) || "[]"); r.forEach((x) => allReqs.includes(x) || allReqs.push(x)); return r; };

  // ═══ A. 결제 전 화면 ═══
  check("A0 지름길 rooms=2&to=book(결제 전) → 목차", await skip(TEST, "rooms=2&to=book", "screen-report"));
  const sdk0 = sdkN();
  // (2026-10-21 기대값 변경 — 결제 유도 앞당기기, tests.md) 만신의 장은 무료 → 잠긴 장 표본은 오검. 1~6/7 결제 전에도 잠긴 장을 누르면 결제 전 화면, SDK는 아직 0
  await click("[data-js=book-chapter][data-chapter=ogham] [data-js=book-chapter-btn]");
  await sleep(400);
  const a1 = await ev("({ scr: document.querySelector('.screen.is-active')?.id })");
  check("A1 (2026-10-21) 1~6/7 결제 전 잠긴 장 → 결제 전 화면 · SDK 요청 0", a1.scr === "screen-deeper" && sdkN() === sdk0, JSON.stringify(a1));
  await ev("StrangeOracle.go('report')");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  check("A1b (18-5) 목차 맨 아래 작은 글자 버튼 하나(btn--text, 주 버튼 모양 아님) → 결제 전 화면", (await ev("(() => { const b = document.querySelector('[data-js=book-buy]'); const row = document.querySelector('[data-js=book-buy-row]'); return !!b && !row.hidden && b.classList.contains('btn--text') && !b.classList.contains('btn--primary'); })()")) && (await click("[data-js=book-buy]")) && (await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'")));
  const lay = await ev(`(() => {
    const s = document.querySelector('#screen-deeper');
    const y = (el) => el.getBoundingClientRect().top + scrollY;
    const secs = [...s.querySelectorAll('.pay-sec')].map(y);
    const buyY = y(s.querySelector('[data-js=pay-buy]'));
    const order = [...secs, y(s.querySelector('[data-js=pay-agree]')), buyY, y(s.querySelector('[data-js=pass-toggle]')), y(s.querySelector('[data-js=pay-seller]'))];
    return { n: secs.length, sorted: order.every((v, i) => i === 0 || v > order[i - 1]), items: s.querySelectorAll('[data-js=pay-chapters] li').length,
      band: s.querySelector('[data-js=pay-test-band]').offsetHeight > 0, buyOff: s.querySelector('[data-js=pay-buy]').getAttribute('aria-disabled') === 'true',
      empty: !s.querySelector('[data-js=pay-store-empty]').classList.contains('is-hidden'), wide: document.documentElement.scrollWidth <= 360,
      seller: s.querySelectorAll('.pay-seller__row:not(.is-hidden)').length, legal: s.querySelectorAll('.pay-seller__legal a').length,
      tag: s.querySelector('[data-js=pay-buy]').tagName, href: s.querySelector('[data-js=pay-buy]').hasAttribute('href'),
      old: !!s.querySelector('[data-js=pay-price-unit], [data-js=pay-store-name]'),
      names: [...s.querySelectorAll('[data-js=pay-chapters] li')].map((li) => li.firstElementChild.firstChild.textContent), news: [...s.querySelectorAll('[data-js=pay-chapters] li.pay-list__item--new')].map((li) => li.firstElementChild.firstChild.textContent + '|' + (li.querySelector('.pay-list__new') || {}).textContent) };
  })()`);
  check("A2 1 받는 것(유료 11장, 만신의 장 무료)→2 가격→3 결제 방법·판매자→4 열람 방법→5 환불→6 동의→7 결제하기→8 코드 넣기→판매자 정보 줄(아래) 순서", lay.n === 5 && lay.sorted && lay.items === 11, JSON.stringify(lay));
  // (18-9, 기대값 변경) 새로 더해진 장 알약은 인연의 장 → 새 장. 새 장 줄은 방 장 7줄 바로 뒤(제2부 맨 앞), 인연의 장은 그대로 시기별 흐름 다음(관심사 없음)
  const cxName = await ev("TEXT.book.parts.cross"), rmLast = await ev("TEXT.topbar.room.replace('{num}', 'Ⅶ').replace('{name}', TEXT.rooms.sibyl.name)");
  check("18-9 받는 것: 새 장 줄은 방 장 바로 뒤·시기별 흐름 앞, 그 줄 하나만 .pay-list__item--new + 알약 · 인연의 장은 시기별 흐름 다음", lay.names.indexOf(cxName) === 6 && lay.names.indexOf(await ev("TEXT.book.parts.timeline")) === 7 && lay.names.indexOf(await ev("TEXT.book.parts.yeon")) === lay.names.indexOf(await ev("TEXT.book.parts.timeline")) + 1 && lay.news.length === 1 && lay.news[0].split("|")[0] === cxName && lay.news[0].split("|")[1].length > 0, JSON.stringify({ names: lay.names, news: lay.news, rmLast }));
  check("A3 판매자 정보 줄 5칸(신고 줄은 값이 없어 숨김)·legal 3종 링크·결제 버튼은 <button>(href 없음)·옛 칸 2개 없음", lay.seller === 5 && lay.legal === 3 && lay.tag === "BUTTON" && !lay.href && !lay.old);
  check("A4 동의 전 비활성·시험 띠·userid(모의 값) 있으면 '판매 준비 중' 숨김·가로 넘침 0", lay.buyOff && lay.band && !lay.empty && lay.wide);
  // K. (15단계 QA 1차 필수 1) test: 판매자 정보 줄 legal 링크 3개가 200이고 결제 문단이 주석 밖에 보인다
  const legalHrefs = await ev(`[...document.querySelectorAll('#screen-deeper .pay-seller__legal a')].map((a) => a.href)`);
  const legalRes = [];
  for (const u of legalHrefs) { const r = await fetch(u); legalRes.push({ u: u.replace(/^.*\/legal\//, ""), s: r.status, t: await r.text() }); }
  check("K1 test: 판매자 정보 줄 legal 링크 3개(refund·terms·privacy) 모두 200", legalRes.length === 3 && legalRes.every((x) => x.s === 200) && ["refund.html", "terms.html", "privacy.html"].every((n) => legalRes.some((x) => x.u === n)), legalRes.map((x) => `${x.u} ${x.s}`).join(" · "));
  const legalText = (n) => (legalRes.find((x) => x.u === n) || { t: "" }).t;
  const vis = (n) => legalText(n).replace(/<!--[\s\S]*?-->/g, ""); // 주석 밖 본문
  check("K2 test: privacy 제4조의3·terms 제2조의2 결제 문단과 목차 줄이 주석 밖에 보임", /id="s4-3"/.test(vis("privacy.html")) && /href="#s4-3"/.test(vis("privacy.html")) && /페이앱/.test(vis("privacy.html")) && /id="s2-2"/.test(vis("terms.html")) && /href="#s2-2"/.test(vis("terms.html")) && /5,900원/.test(vis("terms.html")));
  check("K3 test: 결제가 꺼진 판 문장('결제를 받지 않으므로'·'판매하는 상품이나 결제가 없습니다') 0·표지 주석 0·refund 본문 있음", !/결제를 받지 않으므로/.test(vis("privacy.html")) && !/판매하는 상품이나 결제가 없습니다/.test(vis("terms.html")) && !legalRes.some((x) => /pay:(on|off)\s*-->/.test(x.t)) && /환불/.test(vis("refund.html")));
  await click("[data-js=pay-agree]");
  check("A5 동의하면 결제 버튼 활성", (await ev("document.querySelector('[data-js=pay-buy]').getAttribute('aria-disabled')")) === "false");
  check("A6 결제하기 전 SDK 요청 0 (첫 화면·목차·결제 전 화면)", sdkN() === sdk0 && sdk0 === 0, `${sdkN()}`);
  // userid 빈칸
  intercept.emptyUserid = true;
  await toPay("rooms=2&to=book");
  await click("[data-js=pay-agree]");
  const emp = await ev("({ off: document.querySelector('[data-js=pay-buy]').getAttribute('aria-disabled') === 'true', note: !document.querySelector('[data-js=pay-store-empty]').classList.contains('is-hidden') })");
  await click("[data-js=pay-buy]");
  await sleep(300);
  check("A7 userid 빈칸: 동의해도 비활성 + '판매 준비 중' 한 줄, 눌러도 SDK 요청 0·화면 그대로", emp.off && emp.note && sdkN() === 0 && (await active()) === "screen-deeper", JSON.stringify(emp));
  intercept.emptyUserid = false;
  // 열람 코드 칸
  await toPay("rooms=2&to=book");
  await click("[data-js=pass-toggle]");
  check("A8 열람 코드 칸: 펼침·autocomplete off·name 없음·form 아님", await ev("(() => { const i = document.querySelector('[data-js=pass-input]'); return i.offsetHeight > 0 && i.getAttribute('autocomplete') === 'off' && !i.name && !i.closest('form'); })()"));
  const tryCode = async (code) => {
    await ev(`document.querySelector('[data-js=pass-input]').value = ${JSON.stringify(code)}`);
    await click("[data-js=pass-go]");
    await sleep(300);
    return ev("(() => { const e = document.querySelector('[data-js=pass-error]'); return e.classList.contains('is-hidden') ? '' : e.dataset.kind; })()");
  };
  let n0 = reqs(/\/api\/book/);
  const k = [await tryCode("SO1-ABCD-EFGH-JKMN-PQRS"), await tryCode("SOG2-ABCD-EFGH-JKMN-PQRS"), await tryCode("SOP-12")];
  check("A9 SO1 → receipt · SOG → resume · 모양 틀림 → shape, 서버 요청 0", k.join() === "receipt,resume,shape" && reqs(/\/api\/book/) === n0, k.join());
  n0 = reqs(/\/api\/book/);
  const k4 = await tryCode(PassCode.pretty(PassCode.make()));
  check("A10 모양은 맞지만 없는 코드 → fail 한 줄(요청 1)", k4 === "fail" && reqs(/\/api\/book/) - n0 === 1, k4);
  intercept.failBook = true;
  const k5 = await tryCode(PassCode.pretty(PassCode.make()));
  intercept.failBook = false;
  check("A11 서버에 닿지 않음 → offline 한 줄, 열람 표시 없음", k5 === "offline" && (await ss("strange-oracle-pass")) === null, k5);

  // ═══ B. 이동 방식 ═══
  check("B0 결제 전(7방 마침) → 결제 전 화면", await toPay());
  const sdkB = sdkN();
  await buyRedirect();
  await sleep(200);
  check("B1 [결제하기] → SDK 요청 1건(가짜 SDK 주소)", sdkN() - sdkB === 1, `${sdkN() - sdkB}`);
  const okB = await checkoutAct("complete");
  check("B2 가짜 결제창(이동 방식)이 열리고 [결제 완료]", okB);
  const coB = b.log.bodies.filter((x) => /\/__dev\/payapp\/checkout/.test(x.url)).pop();
  const sent = Object.fromEntries(new URLSearchParams(coB ? coB.body : ""));
  const WANT = ["checkretry", "feedbackurl", "goodname", "openpaytype", "price", "returnurl", "shopname", "skip_cstpage", "smsuse", "userid", "var1", "var2"];
  check("B3 결제창으로 간 값 = 15-2 표의 12칸뿐(recvphone 없음), price 5900·var2 so-book-1·var1 32자 16진수·returnurl /api/pay/return", Object.keys(sent).sort().join() === WANT.join() && sent.price === "5900" && sent.var2 === "so-book-1" && /^[0-9a-f]{32}$/.test(sent.var1) && /\/api\/pay\/return$/.test(sent.returnurl) && /\/api\/pay\/feedback$/.test(sent.feedbackurl) && /card/.test(sent.openpaytype) && !/phone|vbank|rbank/.test(sent.openpaytype), Object.keys(sent).join(","));
  allReqs.push(sent.var1);
  const openB = await waitFor("!!document.querySelector('[data-js=pay-code-dialog]')?.open", 30000);
  const codeB = (await codesShown())[0] || "";
  check("B4 #paid 복귀 → 30초 안에 코드 카드(SOP 코드·[복사])", openB && /^SOP/.test(codeB) && (await ev("document.querySelectorAll('[data-js=pay-code-dialog] [data-js=code-copy]').length")) === 1, codeB);
  const passB = await ss("strange-oracle-pass");
  allCodes.push(passB);
  check("B5 strange-oracle-pass = 카드의 코드(정규화)·payreq에서 그 R이 빠짐·주소에 #paid·R 없음", passB === PassCode.normalize(codeB) && !((await ss("strange-oracle-payreq")) || "").includes(sent.var1) && !/paid|[0-9a-f]{32}/.test(await ev("location.hash")), `${await ev("location.hash")}`);
  check("B6 코드 카드 두 번 결제 줄 숨김(코드 1개)", await ev("document.querySelector('[data-js=code-double]').classList.contains('is-hidden')"));
  await click("[data-js=code-copy]");
  await sleep(300);
  check("B7 [복사] 누르면 복사됨 표시 또는 복사 실패 안내 한 줄(헤드리스 클립보드 권한 미확인)", await ev("!document.querySelector('[data-js=code-status]').classList.contains('is-hidden') && document.querySelector('[data-js=code-status]').textContent.length > 0"));
  await click("[data-js=code-close]");
  const rB = await rows();
  check("B8 책 목차: 유료 12장 모두 열림", (await active()) === "screen-report" && PAID.every((id) => rB[id] === "opened"), JSON.stringify(rB));
  check("B9 목차 '내 열람 코드 보기' 줄 보임 → 누르면 코드 카드", (await visible("[data-js=book-code-row]")) && (await click("[data-js=book-show-code]")) && (await dlgOpen()));
  await click("[data-js=code-close]");
  await ev("StrangeOracle.go('deeper')");
  await sleep(300);
  check("B10 이미 열린 탭의 결제 전 화면: 결제 버튼 대신 '이미 열려 있어요' + [내 열람 코드 보기]", (await ev("document.querySelector('[data-js=pay-act]').classList.contains('is-opened')")) && (await visible("[data-js=pay-opened]")) && !(await visible("[data-js=pay-buy]")));
  // 새 탭에서 그 코드로
  await toPay("rooms=7&to=book");
  await click("[data-js=pass-toggle]");
  await ev(`document.querySelector('[data-js=pass-input]').value = ${JSON.stringify(codeB)}`);
  await click("[data-js=pass-go]");
  const nb = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'", 6000);
  const rN = await rows();
  check("B11 새 탭(저장소 비움)에서 그 코드를 넣으면 12장 열림", nb && PAID.every((id) => rN[id] === "opened"), JSON.stringify(rN));

  // ═══ C. 팝업 방식 ═══
  await sw("win=popup");
  await toPay();
  await ev("document.querySelector('[data-js=pay-agree]').click()");
  const sdkC = sdkN();
  await realClick("[data-js=pay-buy]");
  let pop = null;
  for (let i = 0; i < 40 && !pop; i++) {
    await sleep(200);
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    pop = list.find((t) => t.type === "page" && /\/__dev\/payapp\/checkout/.test(t.url));
  }
  check("C1 팝업 방식: 진짜 클릭 → SDK 1건 → 팝업이 막히지 않고 가짜 결제창이 열림", Boolean(pop) && sdkN() - sdkC === 1, pop ? pop.url : "팝업 없음");
  check("C2 원래 탭은 결제 확인 화면 wait([결제 확인하기]·[돌아가기])", (await active()) === "screen-paycheck" && (await state()) === "wait" && (await visible("[data-js=paycheck-check]")) && (await visible("[data-js=paycheck-back]")));
  if (pop) {
    const ws = new WebSocket(pop.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const wait = new Map();
    ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.id && wait.has(j.id)) { wait.get(j.id)(j.result); wait.delete(j.id); } };
    const pev = (expression) => new Promise((r) => { const i = ++id; wait.set(i, (x) => r(x && x.result ? x.result.value : undefined)); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression, returnByValue: true } })); });
    for (let i = 0; i < 40 && !(await pev("!!document.querySelector('[data-act=complete]')")); i++) await sleep(150);
    await pev("document.querySelector('[data-act=complete]').click()");
    let popScreen = "";
    for (let i = 0; i < 60; i++) { await sleep(200); popScreen = await pev("document.querySelector('.screen.is-active')?.id || ''").catch(() => ""); if (popScreen === "screen-paypopup") break; }
    const popTop = await pev("document.querySelector('[data-js=topbar]').classList.contains('is-hidden')");
    const popReq = await pev("location.hash");
    check("C3 팝업 안 #paid → 팝업 화면('원래 창에서 열려요' + [이 창 닫기])·상단 막대 숨김", popScreen === "screen-paypopup" && popTop === true && (await pev("document.querySelector('[data-js=paypopup-close]').offsetHeight > 0")) === true, `${popScreen} ${popReq}`);
    const openC = await waitFor("!!document.querySelector('[data-js=pay-code-dialog]')?.open", 30000);
    const codeC = (await codesShown())[0] || "";
    check("C4 원래 탭: 팝업 신호 → 책·코드 카드(새 코드)", openC && /^SOP/.test(codeC) && PassCode.normalize(codeC) !== passB && (await active()) === "screen-report", codeC);
    allCodes.push(PassCode.normalize(codeC));
    await pev("document.querySelector('[data-js=paypopup-close]').click()");
    ws.close();
  } else { check("C3 팝업 화면", false, "팝업 없음"); check("C4 원래 탭 코드 카드", false); }
  await sw("win=redirect");
  const msgs = await ev("(() => { return 'ok'; })()");
  void msgs;

  // ═══ D. 결제 실패 → 30초 넘음, 회차 3번 ═══
  await sw("limits=reset");
  await toPay();
  await buyRedirect();
  await checkoutAct("fail");
  await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'checking'", 8000);
  await grabReq();
  const s1 = statusN();
  // 회차 중 겹치기 시도: [결제 확인하기](비활성)·탭 전환 신호·팝업 신호
  const dis = await ev("document.querySelector('[data-js=paycheck-check]').disabled");
  await ev("document.querySelector('[data-js=paycheck-check]').click(); document.dispatchEvent(new Event('visibilitychange')); window.postMessage({ type: 'so-paid' }, location.origin)");
  const lateOk = await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'late'", 40000);
  const r1 = statusN() - s1;
  check("D1 [결제 실패] → 30초 넘음 화면(late)·[다시 확인]·[목차로]", lateOk && (await visible("[data-js=paycheck-retry]")) && (await visible("[data-js=paycheck-toc]")));
  check("D2 회차 중 [결제 확인하기] 비활성·겹치기 신호를 넣어도 한 회차 요청 ≤ 17", dis && r1 >= 14 && r1 <= 17, `${r1}회`);
  let maxR = r1, got429 = false;
  for (let i = 0; i < 2; i++) {
    const s = statusN();
    await click("[data-js=paycheck-retry]");
    await waitFor("document.querySelector('#screen-paycheck')?.dataset.state !== 'checking'", 1000);
    const done = await waitFor("['late','busy'].includes(document.querySelector('#screen-paycheck')?.dataset.state)", 40000);
    if ((await state()) === "busy" || !done) got429 = true;
    maxR = Math.max(maxR, statusN() - s);
  }
  check("D3 회차 3번 되풀이해도 429 없음(busy 아님)·회차당 ≤ 17", !got429 && maxR <= 17, `최대 ${maxR}회`);
  await click("[data-js=paycheck-toc]");
  check("D4 [목차로] → 책 목차(막다른 곳 없음)", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'"));
  // 늦은 통보
  await sw("limits=reset&late=33000");
  await toPay();
  await buyRedirect();
  await checkoutAct("late");
  const lt = await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'late'", 40000);
  await grabReq();
  await sleep(4000);
  await click("[data-js=paycheck-retry]");
  const lo = await waitFor("!!document.querySelector('[data-js=pay-code-dialog]')?.open", 35000);
  check("D5 [완료, 통보 늦게] → late 화면 → 늦은 통보 뒤 [다시 확인]으로 열림", lt && lo);
  allCodes.push(await ss("strange-oracle-pass"));
  await click("[data-js=code-close]");

  // ═══ E. 429 ═══
  await sw("limits=reset&late=40000");
  await toPay();
  await buyRedirect();
  await checkoutAct("fail");
  await waitFor("location.pathname.endsWith('/strange-oracle/') || location.pathname.endsWith('index.html')", 8000);
  await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'checking'", 8000);
  await grabReq();
  await ev("Promise.all(Array.from({ length: 11 }, () => fetch('/api/pay/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ r: 'zz' }) }))).then(() => 1)");
  const bz = await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'busy'", 8000);
  const raRes = await ev("fetch('/api/pay/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ r: 'zz' }) }).then(r => r.status + ' ' + r.headers.get('Retry-After'))");
  check("E1 모양 틀린 r 11회 뒤 status 429 + Retry-After → 화면 busy·[다시 확인] 비활성·[목차로]", bz && /^429 \d+$/.test(raRes) && (await ev("document.querySelector('[data-js=paycheck-retry]').disabled")) && (await visible("[data-js=paycheck-toc]")), raRes);
  await sw("limits=reset");
  await ev("StrangeOracle.go('report')");
  await ev("StrangeOracle.go('paycheck')");
  intercept.fake429 = { after: 3 };
  await click("[data-js=paycheck-check]");
  await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'busy'", 5000);
  const d0 = await ev("document.querySelector('[data-js=paycheck-retry]').disabled");
  await sleep(3400);
  const d1 = await ev("document.querySelector('[data-js=paycheck-retry]').disabled");
  check("E2 Retry-After 3초: 그동안 [다시 확인] 비활성 → 3초 뒤 활성", d0 === true && d1 === false, `${d0}/${d1}`);
  intercept.fake429 = { after: 0 };
  await click("[data-js=paycheck-retry]");
  await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'busy'", 5000);
  await sleep(3400);
  check("E3 Retry-After 없음: 3초 뒤에도 비활성(60초 기본)", await ev("document.querySelector('[data-js=paycheck-retry]').disabled"));
  intercept.fake429 = null;

  // ═══ F. 503 (store=fail-read) ═══
  await sw("limits=reset&late=9000");
  await toPay();
  await buyRedirect();
  await checkoutAct("late");
  await waitFor("location.pathname.endsWith('/strange-oracle/')", 8000);
  await sw("store=fail-read");
  const off1 = await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'offline'", 10000);
  const reqLeft = JSON.parse((await ss("strange-oracle-payreq")) || "[]").length;
  await grabReq();
  check("F1 store=fail-read → status 503 → 화면 offline(errors.offline 줄)·[다시 확인]·[목차로]·payreq 남음", off1 && reqLeft > 0 && (await visible("[data-when=offline][data-t='pay.pass.errors.offline']")) && (await visible("[data-js=paycheck-toc]")), `payreq ${reqLeft}`);
  await sw("store=ok");
  await sleep(9000);
  await click("[data-js=paycheck-retry]");
  check("F2 store=ok로 돌린 뒤(늦은 통보 도착) [다시 확인] → 열림", await waitFor("!!document.querySelector('[data-js=pay-code-dialog]')?.open", 35000));
  allCodes.push(await ss("strange-oracle-pass"));
  await click("[data-js=code-close]");
  // book 503: Blobs 코드가 든 탭에서 장을 열 때
  await skip(TEST, "rooms=7&to=book", "screen-report");
  await ev(`sessionStorage.setItem('strange-oracle-pass', ${JSON.stringify(passB)})`);
  await b.goto(TEST + P + "#report");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await sw("store=fail-read");
  const bk0 = reqs(/\/api\/book/);
  await click("[data-js=book-chapter][data-chapter=ogham] [data-js=book-chapter-btn]");
  await waitFor(`${bk0} < 0`, 2500);
  const bkStatus = await ev("fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pass: sessionStorage.getItem('strange-oracle-pass'), file: 'ogham' }) }).then(r => r.status)");
  check("F3 store=fail-read에서 book 503 → strange-oracle-pass 지우지 않음", bkStatus === 503 && (await ss("strange-oracle-pass")) === passB, `${bkStatus}`);
  await sw("store=ok");

  // ═══ G. 취소 · R 없음 · SDK 실패 ═══
  await sw("limits=reset");
  await toPay();
  await buyRedirect();
  await checkoutAct("cancel-after");
  const cc = await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'cancelled'", 15000);
  check("G1 [완료 뒤 취소] → 취소된 결제 화면(errors.cancelled 줄)·[목차로]·책 안 열림", cc && (await visible("[data-when=cancelled][data-t='pay.pass.errors.cancelled']")) && (await visible("[data-js=paycheck-toc]")) && (await ss("strange-oracle-pass")) === null);
  await b.goto(TEST + P);
  await ev("sessionStorage.clear()");
  await b.goto(TEST + P + "#paid");
  const nr = await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'noreq' && document.querySelector('.screen.is-active')?.id === 'screen-paycheck'", 6000);
  check("G2 R 없는 탭으로 #paid → '찾지 못했어요'·[열람 코드 넣기]·[목차로]", nr && (await visible("[data-js=paycheck-to-pass]")) && (await visible("[data-js=paycheck-toc]")));
  await click("[data-js=paycheck-to-pass]");
  await sleep(700);
  check("G3 [열람 코드 넣기] → 결제 전 화면, 코드 칸 펼침", (await active()) === "screen-deeper" && (await visible("[data-js=pass-input]")) && (await ev("document.querySelector('[data-js=pass-toggle]').getAttribute('aria-expanded')")) === "true");
  await sw("sdk=fail");
  await toPay();
  const sdkG = sdkN();
  await buyRedirect();
  const sf = await waitFor("document.querySelector('#screen-paycheck')?.dataset.state === 'sdkfail'", 12000);
  check("G4 sdk=fail → '결제창을 열지 못했어요'·[다시 시도]·[목차로]", sf && sdkN() - sdkG === 1 && (await visible("[data-js=paycheck-sdk-retry]")) && (await visible("[data-js=paycheck-toc]")));
  await sw("sdk=ok");
  await click("[data-js=paycheck-sdk-retry]");
  check("G5 [다시 시도](sdk=ok) → 가짜 결제창으로 이동", await waitFor("location.pathname === '/__dev/payapp/checkout'", 8000));
  await b.goto(TEST + P + "#report");
  await sleep(500);
  await grabReq();

  // ═══ H. 내 정보 지우기 ═══
  const hasReq = JSON.parse((await ss("strange-oracle-payreq")) || "[]").length > 0;
  await ev(`sessionStorage.setItem('strange-oracle-pass', ${JSON.stringify(passB)})`);
  await click("[data-js=clear-open]");
  await sleep(150);
  const warn = await visible("[data-js=clear-warn-pay]");
  await click("[data-js=clear-confirm]");
  await sleep(250);
  check("H1 결제 확인 중(payreq 있음) → 확인 창에 경고 줄 → 지우면 payreq·pass 둘 다 없음", hasReq && warn && (await ss("strange-oracle-payreq")) === null && (await ss("strange-oracle-pass")) === null);
  await click("[data-js=clear-open]");
  await sleep(150);
  check("H2 payreq 없으면 경고 줄 숨김", !(await visible("[data-js=clear-warn-pay]")));
  await click("[data-js=clear-cancel]");

  // ═══ I. 개인정보 ═══
  const urls = b.log.requests.join("\n");
  const secrets = allReqs.concat(allCodes.filter(Boolean), allCodes.filter(Boolean).map((c) => PassCode.pretty(c)));
  check("I1 R·열람 코드가 요청 주소(URL)에 0건", secrets.length >= 6 && !secrets.some((s) => urls.includes(s)), `R ${allReqs.length} · 코드 ${allCodes.filter(Boolean).length}`);
  const stBodies = b.log.bodies.filter((x) => /\/api\/pay\/status/.test(x.url));
  check("I2 status 본문은 { r } 한 칸뿐", stBodies.length > 0 && stBodies.every((x) => { try { return Object.keys(JSON.parse(x.body)).join() === "r"; } catch (e) { return false; } }), `${stBodies.length}건`);
  const bkBodies = b.log.bodies.filter((x) => /\/api\/book/.test(x.url));
  check("I3 book 본문은 pass·file 두 칸뿐", bkBodies.length > 0 && bkBodies.every((x) => { try { const o = JSON.parse(x.body); return Object.keys(o).sort().join() === "file,pass" && PAID.concat("arch").includes(o.file); } catch (e) { return false; } }), `${bkBodies.length}건`);
  const allBodies = b.log.bodies.map((x) => x.url + " " + x.body).join("\n");
  check("I4 시험 입력값(이름·생일·시각·결과 코드)이 모든 요청 URL·본문(결제창으로 간 값 포함)에 0건", !/테스트|%ED%85%8C|1995|14:37|"532"|code=532/.test(allBodies));
  check("I5 console에 R·코드 0건·localStorage 0·쿠키 0", !secrets.some((s) => b.log.console.join("\n").includes(s)) && (await ev("localStorage.length")) === 0 && (await ev("document.cookie")) === "");
  // (19-5) GA4 ID가 차서 gtag.js를 부른다 → 모의 서버가 G-TEST12345로 바꿔 내보내고, cdp.js가 구글 요청을 모두 막는다. dataLayer에 입력값 0
  const dl = await ev("JSON.stringify(window.dataLayer || [])");
  const gc = googleCount();
  check("I6 (19단계) gtag 요청은 막혔고(나간 0)·측정 ID는 시험 ID·dataLayer에 입력값·R·코드 0", reqs(/googletagmanager/) >= 1 && gc.leaked === 0 && gc.blocked >= 1 && /G-TEST12345/.test(dl) && !/G-4J5SVQV3B1/.test(dl) && !/테스트|1995|14:37|"532"/.test(dl) && !secrets.some((x) => dl.includes(x)), JSON.stringify(gc));
  const dump = JSON.stringify(await storeDump());
  check("I7 /__dev/pay-store에 R·시험 휴대폰 번호 0건", !allReqs.some((r) => dump.includes(r)) && !/01099990000/.test(dump));
  // (QA 권장 4) 외부 글꼴 CDN의 일시 CORS·네트워크 오류는 따로 기록만 한다(실패로 세지 않음). 우리 출처 오류는 그대로 실패
  const FONT_CDN = /cdn\.jsdelivr\.net\/npm\/@fontsource/;
  const fontErrs = b.log.errors.filter((e) => FONT_CDN.test(e) && !e.includes("127.0.0.1"));
  if (fontErrs.length) { const l = `INFO  I8 참고: 외부 글꼴 CDN 오류 ${fontErrs.length}건(실패로 세지 않음) — ${fontErrs[0].slice(0, 160)}`; out.push(l); console.log(l); }
  const errs = b.log.errors.filter((e) => !fontErrs.includes(e)).filter((e) => !/favicon|\/api\/|40[0-9]|429|503|ERR_|net::|payapp-lite/.test(e));
  check("I8 test: 콘솔 오류 0 (일부러 낸 401·403·404·429·503·연결 실패 제외)", errs.length === 0, errs.slice(0, 3).join(" | "));

  // ═══ J. off (배포판과 같은 data.js) ═══
  const srv = spawn(process.execPath, [path.join(__dirname, "mock-server.js"), "--port", "8791", "--mode", "off"], { stdio: "ignore" });
  await sleep(900);
  try {
    const nOff = b.log.requests.length;
    const DOM0 = "#screen-report, #screen-deeper, #screen-paycheck, #screen-paypopup, template, [data-js=pay-tpl], [data-js=pay-toc-tpl], [data-js=pay-code-dialog], [data-js=clear-warn-pay], [data-js=book-code-row], [data-js=hub-book], [data-js=result-book-line], [data-js=story-book], [data-js=story-book-link], [data-js=pass-enter], [data-js=book-chapter], [data-t='hub.faq.items.4.q'], [data-js=book-toc-open], #screen-preview, [data-js=story-preview], [data-js=book-preview-band], [data-js=book-interest], [data-js=book-buy-row], [data-js=report-cross]"; // (18-7) 미리보기·나의 이야기 카드·목차 조각·새 장 원본 칸도 0
    const counts = {};
    check("J1 off: 지름길 rooms=7(결제 표시 없음) → 나의 이야기", await skip(OFF, "rooms=7&paid=1", "screen-story"));
    counts.story = await ev(`document.querySelectorAll(${JSON.stringify(DOM0)}).length`);
    for (const h of ["hub", "saju-result", "sibyl-result"]) {
      await b.goto(`${OFF}${P}#${h}`);
      await waitFor(`document.querySelector('.screen.is-active')?.id === 'screen-${h}'`, 5000);
      counts[h] = await ev(`document.querySelectorAll(${JSON.stringify(DOM0)}).length`);
    }
    await click("[data-js=clear-open]");
    counts.clearDlg = await ev(`document.querySelectorAll(${JSON.stringify(DOM0)}).length`);
    await click("[data-js=clear-cancel]");
    check("J2 off: 결제·책 요소 DOM 0개 (결제 확인·팝업·코드 카드·목차 코드 줄·지우기 경고 줄 포함)", Object.values(counts).every((n) => n === 0), JSON.stringify(counts));
    const txt = await ev("document.body.innerText");
    check("J3 off: 화면 글에 '준비 중'·'곧 열려요'·가격 0", !/준비 중|곧 열려|3,900|5,900/.test(txt));
    for (const h of ["report", "deeper", "paid", "paycheck"]) {
      await b.goto(`${OFF}${P}#${h}`);
      await sleep(400);
      const a = await active();
      check(`J4 off: #${h} → 막다른 곳 없이 화면 하나(${a})`, Boolean(a) && !/report|deeper|paycheck|paypopup/.test(a));
    }
    check("J5 off: /api·payapp 요청 0", !b.log.requests.slice(nOff).some((r) => /\/api\/|payapp/.test(r)));
    // (15단계 QA 1차 필수 1·권장 2) off: legal 결제 문단 0·refund.html 404·index.html 원본에 결제 template·판매자 ◯◯ 0
    const get = async (p) => { const r = await fetch(`${OFF}/products/strange-oracle/${p}`); return { s: r.status, t: await r.text() }; };
    const [oPriv, oTerms, oRefund, oIndex] = [await get("legal/privacy.html"), await get("legal/terms.html"), await get("legal/refund.html"), await get("index.html")];
    check("J6 off: privacy·terms 200, 결제 문단(제4조의3·제2조의2·페이앱·목차 줄)·표지 0, '결제 없음' 문장 있음, refund.html 404",
      oPriv.s === 200 && oTerms.s === 200 && oRefund.s === 404 && !/s4-3|s2-2|페이앱|3,900|5,900|pay:(on|off)/.test(oPriv.t + oTerms.t) && /결제를 받지 않으므로/.test(oPriv.t) && /판매하는 상품이나 결제가 없습니다/.test(oTerms.t),
      `privacy ${oPriv.s} · terms ${oTerms.s} · refund ${oRefund.s}`);
    check("J7 off: index.html 원본(소스 보기)에 pay-tpl·pay-toc-tpl·(18-7) preview-tpl·toc18-tpl·cross-tpl·story-preview-tpl template·'판매자 ◯◯'·표지 0", oIndex.s === 200 && !/pay-tpl|pay-toc-tpl|preview-tpl|toc18-tpl|cross-tpl|story-preview-tpl|판매자 ◯◯|pay:(on|off)\s*-->/.test(oIndex.t));
  } finally {
    srv.kill();
  }
  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-pay.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
