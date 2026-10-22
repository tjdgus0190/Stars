// 21단계 e2e: 카카오 로그인으로 산 책 연결·다시 열기 (spec 21-6). 모의 서버 test(가짜 페이앱·가짜 카카오 동의 화면), 실제 카카오 요청 0.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
// 실행: node tools/strange-oracle/e2e-auth.js   → 결과 tools/strange-oracle/out/e2e-auth.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const P = "/products/strange-oracle/index.html";
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };

(async () => {
  await fetch(`${TEST}/__dev/pay-switch?limits=reset&win=redirect&sdk=ok&store=ok&env=ok`);
  await fetch(`${TEST}/__dev/pay-store?clear=1`);
  const b = await launch({ port: 9681, reduced: true, width: 360, height: 700 });
  const { sleep, send } = b;
  b.on((m) => { if (m.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: true }); });
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(100); } return false; };
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const active = () => ev("document.querySelector('.screen.is-active')?.id");
  const ss = (k) => ev(`sessionStorage.getItem(${JSON.stringify(k)})`);
  const toastText = () => ev("document.querySelector('[data-js=toast]')?.textContent || ''");
  const kakaoLogin = async (id, act = "agree") => {
    if (!(await waitFor("location.pathname === '/__dev/kakao/authorize'", 8000))) return false;
    await ev(`document.querySelector('[data-field=kid]').value = ${JSON.stringify(String(id))}; document.querySelector('[data-act=${act}]').click(); true`);
    return waitFor("location.pathname.endsWith('/products/strange-oracle/') && document.querySelector('.screen.is-active')", 8000);
  };
  const msg = await (async () => { await b.goto(TEST + P); return JSON.parse(await ev("JSON.stringify(TEXT.auth.msg)")); })();

  // 1. 결제(가짜 페이앱) → 코드 카드 → [카카오 계정에 이 책 연결하기]
  await b.goto(TEST + P);
  await ev("sessionStorage.clear()");
  await b.goto(`${TEST}/__dev/skip?rooms=7&to=book`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await ev("StrangeOracle.go('deeper')");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  check("A1 결제 전 화면에 카카오 버튼(#FEE500) · 도움말 · 연결 지우기", await ev("(() => { const btn = document.querySelector('[data-js=kakao-restore]'); return !!btn && getComputedStyle(btn).backgroundColor === 'rgb(254, 229, 0)' && !!document.querySelector('[data-js=kakao-forget]'); })()"));
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); })()");
  await click("[data-js=pay-buy]");
  await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 8000);
  await ev("document.querySelector('[data-act=complete]').click()");
  const open = await waitFor("!!document.querySelector('[data-js=pay-code-dialog]')?.open", 30000);
  const pass = await ss("strange-oracle-pass");
  check("A2 결제 → 코드 카드에 [카카오 계정에 이 책 연결하기]", open && !!pass && (await ev("!!document.querySelector('[data-js=pay-code-dialog] [data-js=kakao-link-btn]')")));
  const n0 = b.log.bodies.length;
  await click("[data-js=kakao-link-btn]");
  check("A3 가짜 카카오 동의(회원번호 1001) → 돌아옴", await kakaoLogin(1001));
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.linked)}`, 6000);
  check("A4 연결 완료 토스트 · 주소에 #kakao- 없음 · sessionStorage kakao 지워짐 · 코드 그대로", (await toastText()) === msg.linked && !(await ev("location.hash")).includes("kakao") && (await ss("strange-oracle-kakao")) === null && (await ss("strange-oracle-pass")) === pass, await toastText());
  const claims = b.log.bodies.slice(n0).filter((x) => /\/api\/auth\/claim/.test(x.url));
  check("A5 claim 본문 = t·s·pass 세 칸뿐(이름·생일·회원번호 0)", claims.length === 1 && Object.keys(JSON.parse(claims[0].body)).sort().join() === "pass,s,t", claims.map((x) => x.body.replace(/"pass":"[^"]+"/, '"pass":"…"')).join(" | "));
  const dump = JSON.stringify(await (await fetch(`${TEST}/__dev/pay-store`)).json());
  check("A6 저장소에 회원번호(1001)·열람 코드 원문 0, kakao/ 기록 1", !/"1001"|kakao:1001/.test(dump) && !dump.includes(pass) && /"kakao\//.test(dump));

  // 2. 다른 기기(새 탭 상태): 코드 없이 → [카카오로 산 책 다시 열기] → 열림
  await ev("sessionStorage.clear()");
  await b.goto(`${TEST}/__dev/skip?rooms=7&to=book`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await ev("StrangeOracle.go('deeper')");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await click("[data-js=kakao-restore]");
  await kakaoLogin(1001);
  const back = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report' && !!sessionStorage.getItem('strange-oracle-pass')", 8000);
  check("B1 다른 기기: 카카오 로그인만으로 같은 코드 받음 → 목차", back && (await ss("strange-oracle-pass")) === pass, await toastText());

  // 3. 다른 카카오 → 없음 / 취소 → 오류
  await ev("sessionStorage.removeItem('strange-oracle-pass')");
  await ev("StrangeOracle.go('deeper')");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await click("[data-js=kakao-restore]");
  await kakaoLogin(2002);
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.none)}`, 6000);
  check("C1 연결 안 된 카카오 → '연결된 책이 없어요' · 코드 없음", (await toastText()) === msg.none && !(await ss("strange-oracle-pass")));
  await click("[data-js=kakao-restore]");
  await kakaoLogin(1001, "cancel");
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.error)}`, 6000);
  check("C2 카카오에서 취소 → 오류 안내 한 줄 · 결제 전 화면(막다른 곳 없음)", (await toastText()) === msg.error && (await active()) === "screen-deeper");

  // 4. 연결 지우기 → 다시 열기 없음
  await click("[data-js=kakao-forget]");
  await kakaoLogin(1001);
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.forgot)}`, 6000);
  check("D1 연결 지우기(확인 창) → '지웠어요'", (await toastText()) === msg.forgot);
  await click("[data-js=kakao-restore]");
  await kakaoLogin(1001);
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.none)}`, 6000);
  check("D2 지운 뒤 같은 카카오 → 없음", (await toastText()) === msg.none);

  // 5. 다른 탭의 state로 돌아오면 묻지 않음(CSRF)
  const nC = b.log.requests.length;
  await b.goto(`${TEST}/products/strange-oracle/#kakao-${"a".repeat(32)}-${"b".repeat(32)}`);
  await sleep(1200);
  check("E1 이 탭이 시작하지 않은 #kakao-… → claim 요청 0 · 오류 안내", !b.log.requests.slice(nC).some((r) => /\/api\/auth\/claim/.test(r)) && (await toastText()) === msg.error);
  check("E2 콘솔 오류 0", b.log.errors.filter((e) => !/favicon|40[0-9]|net::|fonts/.test(e)).length === 0, b.log.errors.slice(0, 2).join(" | "));

  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-auth.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("CRASH " + (e && e.stack)); process.exit(1); });
