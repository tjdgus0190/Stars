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

  // 2-1. (22→23단계) 입구 [카카오 로그인]: 방을 하나도 안 지난 새 탭에서도 보임 · 연결 없는 계정은 입구에 남아 저장 동의를 물음 · 연결된 계정은 책 코드를 받음
  await b.goto(TEST + P);
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(TEST + P);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  check("H1 입구(0/7): 카카오 로그인 버튼 보임(#FEE500)", await ev("(() => { const el = document.querySelector('[data-js=hub-kakao]'); const btn = document.querySelector('[data-js=hub-kakao-btn]'); return !!el && !el.classList.contains('is-hidden') && el.offsetHeight > 0 && getComputedStyle(btn).backgroundColor === 'rgb(254, 229, 0)'; })()"));
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(2003);
  const askH = await waitFor("!!document.querySelector('[data-js=kakao-consent]')?.open", 6000);
  await click("[data-js=kakao-consent-no]");
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.noSave)}`, 5000);
  check("H2 연결 없는 카카오 → 입구 · 저장 동의 물음 · [저장하지 않기] → 안내 · '저장하지 않음' 줄", askH && (await active()) === "screen-hub" && (await toastText()) === msg.noSave && (await ev("document.querySelector('[data-js=hub-kakao-state]').textContent")).includes("저장하지"), await toastText());
  await ev("localStorage.clear(); sessionStorage.clear(); true");
  await b.goto(TEST + P);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(1001);
  const hubBack = await waitFor("sessionStorage.getItem('strange-oracle-pass') !== null", 8000);
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.found)}`, 5000);
  check("H3 책을 연결해 둔 카카오 → 같은 코드 받음 · '책을 열었어요'", hubBack && (await ss("strange-oracle-pass")) === pass, await toastText());
  await ev("(() => { const d = document.querySelector('[data-js=kakao-consent]'); if (d.open) d.close(); return true; })()");
  check("H4 로그인한 기기 → 입구 버튼 숨김 · 상태 줄 보임", (await ev("document.querySelector('[data-js=hub-kakao-btn]').classList.contains('is-hidden')")) && (await ev("!document.querySelector('[data-js=hub-kakao-on]').classList.contains('is-hidden')")));
  await ev("localStorage.clear(); true");

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

  // 6. (23단계, 결정 135) 입구 로그인 → 저장 동의 → 진행·입력값 자동 저장 → 다른 기기 로그인으로 복원 · 새 탭 자동 복원 · 로그아웃 · 지우기 · 만 14세 미만
  const lsLogin = () => ev("localStorage.getItem('strange-oracle-login')");
  const dumpNow = async () => JSON.stringify(await (await fetch(`${TEST}/__dev/pay-store`)).json());
  await b.goto(TEST + P);
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(`${TEST}/__dev/skip?rooms=3&to=hub`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(5005);
  const conOpen = await waitFor("!!document.querySelector('[data-js=kakao-consent]')?.open", 6000);
  check("L1 처음 로그인 → 저장 동의 창 · 체크 꺼짐 · 자세히 보기 9줄 · localStorage엔 sid·만료·동의 칸뿐", conOpen && !(await ev("document.querySelector('[data-js=kakao-consent-agree]').checked")) && (await ev("document.querySelectorAll('[data-js=kakao-consent-list] li').length")) === 9 && Object.keys(JSON.parse((await lsLogin()) || "{}")).sort().join() === "consent,exp,sid");
  await click("[data-js=kakao-consent-yes]");
  check("L2 체크 없이 [저장] → 안내 · 창 그대로", (await ev("!document.querySelector('[data-js=kakao-consent-error]').classList.contains('is-hidden')")) && (await ev("document.querySelector('[data-js=kakao-consent]').open")));
  const nS = b.log.bodies.length;
  await ev("document.querySelector('[data-js=kakao-consent-agree]').click(); true");
  await click("[data-js=kakao-consent-yes]");
  await sleep(1200);
  const saves = b.log.bodies.slice(nS).filter((x) => /\/api\/auth\/save/.test(x.url));
  const sv = saves.length ? JSON.parse(saves[0].body) : {};
  check("L3 동의 → save 한 번 · 본문 sid·data(p·v)만 · p는 이름·생일·시각·성별만", saves.length >= 1 && Object.keys(sv).sort().join() === "data,sid" && Object.keys(sv.data).sort().join() === "p,v" && Object.keys(sv.data.p).every((k) => ["name", "birth", "time", "gender"].includes(k)) && Object.keys(sv.data.v).length === 3, saves.map((x) => x.body.replace(/"sid":"[^"]+"/, '"sid":"…"').slice(0, 160)).join(" | "));
  const d1 = await dumpNow();
  check("L4 저장소: 이름·생년 원문 0(암호문만) · 입구 줄 '로그인됨 · 자동 저장'", !d1.includes("테스트") && !d1.includes("1995") && /"data":"/.test(d1) && (await ev("document.querySelector('[data-js=hub-kakao-state]').textContent")).includes("자동 저장"));
  // 다른 기기: 저장소 전부 비움 → 같은 카카오로 로그인 → 다시 시작하며 복원
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(TEST + P);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(5005);
  const rest = await waitFor("(() => { try { const s = JSON.parse(sessionStorage.getItem('strange-oracle')); return s && s.profile.name === '테스트' && Object.keys(s.visits).length === 3; } catch (e) { return false; } })()", 10000);
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.restored)}`, 5000);
  check("L5 다른 기기 로그인 → 이름·방 3개 복원 · '불러왔어요' · 동의 창 다시 안 뜸", rest && (await toastText()) === msg.restored && !(await ev("!!document.querySelector('[data-js=kakao-consent]')?.open")), await toastText());
  // 같은 기기 새 탭(로그인 남음, sessionStorage 빔) → 자동 복원
  await ev("sessionStorage.clear(); true");
  await b.goto(TEST + P);
  const auto = await waitFor("(() => { try { return Object.keys(JSON.parse(sessionStorage.getItem('strange-oracle')).visits).length === 3; } catch (e) { return false; } })()", 10000);
  check("L6 같은 기기 새 탭 → 로그인 유지 · 자동 복원", auto && !!(await lsLogin()));
  // 로그아웃 → 버튼 다시 · localStorage 비움 · 서버 기록은 남음
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-logout]");
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.logout)}`, 5000);
  check("L7 로그아웃 → [카카오 로그인] 다시 · localStorage 비움 · 계정 기록 남음", (await lsLogin()) === null && (await ev("!document.querySelector('[data-js=hub-kakao-btn]').classList.contains('is-hidden')")) && /"data":"/.test(await dumpNow()));
  // 지우기
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(5005);
  await waitFor("!!localStorage.getItem('strange-oracle-login') && document.querySelector('.screen.is-active')?.id === 'screen-hub'", 8000);
  await sleep(600);
  await click("[data-js=hub-kakao-erase]");
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.erased)}`, 5000);
  check("L8 저장한 기록 지우기 → 계정 기록 0 · 로그아웃", !/"data":"/.test(await dumpNow()) && (await lsLogin()) === null, await toastText());
  // 만 14세 미만: 동의해도 저장 안 함
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(`${TEST}/__dev/skip?rooms=2&to=hub&birth=2016-05-05`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(6006);
  await waitFor("!!document.querySelector('[data-js=kakao-consent]')?.open", 6000);
  const nY = b.log.bodies.length;
  await ev("document.querySelector('[data-js=kakao-consent-agree]').click(); document.querySelector('[data-js=kakao-consent-yes]').click(); true");
  await sleep(2000);
  check("L9 만 14세 미만 → 저장 안 함(save 요청 0) · 안내", !b.log.bodies.slice(nY).some((x) => /\/api\/auth\/save/.test(x.url)) && (await toastText()) === msg.under14, await toastText());
  check("L10 콘솔 오류 0", b.log.errors.filter((e) => !/favicon|40[0-9]|net::|fonts/.test(e)).length === 0, b.log.errors.slice(0, 2).join(" | "));

  // 7. (점검 2026-10-25) 입구 로그인(저장 동의 안 함) → 방 결과에서 결제 → 결제 코드가 계정에 붙음 → 다른 기기에서 같은 카카오로 로그인하면 바로 열림
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(`${TEST}/__dev/skip?rooms=7&to=hub`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(7007);
  await waitFor("!!document.querySelector('[data-js=kakao-consent]')?.open", 6000);
  await click("[data-js=kakao-consent-no]");
  await ev("StrangeOracle.go('star-result'); true");
  await waitFor("!!document.querySelector('.screen.is-active [data-js=room-rest-buy]')", 8000);
  const nP = b.log.bodies.length;
  await click(".screen.is-active [data-js=room-rest-buy]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); })()");
  await click("[data-js=pay-buy]");
  await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 8000);
  await ev("document.querySelector('[data-act=complete]').click()");
  await waitFor("!!sessionStorage.getItem('strange-oracle-pass')", 30000);
  const passM = await ss("strange-oracle-pass");
  await sleep(1500);
  const linkSave = b.log.bodies.slice(nP).filter((x) => /\/api\/auth\/save/.test(x.url)).map((x) => JSON.parse(x.body));
  check("M1 로그인한 채 결제 → save에 결제 코드만(sid·pass, 입력값 0)", !!passM && linkSave.some((x) => x.pass && Object.keys(x).sort().join() === "pass,sid"), JSON.stringify(linkSave.map((x) => Object.keys(x))));
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(TEST + P);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(7007);
  const gotM = await waitFor(`sessionStorage.getItem('strange-oracle-pass') === ${JSON.stringify(passM)}`, 10000);
  await waitFor(`document.querySelector('[data-js=toast]')?.textContent === ${JSON.stringify(msg.found)}`, 5000);
  check("M2 다른 기기(저장소 빔)에서 같은 카카오 로그인 → 결제 코드 바로 불러옴 · '산 책을 찾았어요' 안내", gotM && (await toastText()) === msg.found, await toastText());

  // 먼저 결제(로그인 없이) → 나중에 입구에서 로그인 → 다른 기기에서 그 카카오로 열림
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(`${TEST}/__dev/skip?rooms=7&to=star-result`);
  await waitFor("!!document.querySelector('.screen.is-active [data-js=room-rest-buy]')", 8000);
  await click(".screen.is-active [data-js=room-rest-buy]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); })()");
  await click("[data-js=pay-buy]");
  await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 8000);
  await ev("document.querySelector('[data-act=complete]').click()");
  await waitFor("!!sessionStorage.getItem('strange-oracle-pass')", 30000);
  const passN = await ss("strange-oracle-pass");
  await ev("document.querySelector('[data-js=pay-code-dialog]')?.close?.(); StrangeOracle.go('hub'); true");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(8008);
  await waitFor("!!document.querySelector('[data-js=kakao-consent]')?.open", 6000);
  await click("[data-js=kakao-consent-no]");
  await sleep(1500);
  await ev("sessionStorage.clear(); localStorage.clear(); true");
  await b.goto(TEST + P);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await click("[data-js=hub-kakao-btn]");
  await kakaoLogin(8008);
  const gotN = await waitFor(`sessionStorage.getItem('strange-oracle-pass') === ${JSON.stringify(passN)}`, 10000);
  check("M3 먼저 결제하고 나중에 로그인 → 계정에 자동 연결 → 다른 기기 로그인으로 열림", !!passN && gotN);

  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-auth.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("CRASH " + (e && e.stack)); process.exit(1); });
