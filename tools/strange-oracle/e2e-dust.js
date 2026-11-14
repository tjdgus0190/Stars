// (2026-11-14 운영자 결정) 모든 결제는 별가루로 — 별가루 1개 = 100원. 충전 묶음 4종(덤 포함), 일곱 방의 책·신년운세는 카카오 계정의 별가루 49로 연다.
// 준비: node tools/strange-oracle/mock-server.js --src --port 8788 --mode test   (data.js pay.dust.on = true 그대로)
// 실행: node --experimental-websocket tools/strange-oracle/e2e-dust.js → 결과 tools/strange-oracle/out/e2e-dust.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };

(async () => {
  const b = await launch({ port: 9693, reduced: true, width: 360, height: 760 });
  const { sleep } = b;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(120); } return false; };
  const KID = String(500000000 + Math.floor(Math.random() * 99999999));

  // ── 1. 별가루 페이지: 묶음 4종(개수·가격·덤), 1개 = 100원, 쓰는 곳에 책·신년운세 49
  await b.goto(`${TEST}/stardust/`);
  await waitFor("!!window.Dust");
  await ev("localStorage.clear(); sessionStorage.clear(); true");
  await b.goto(`${TEST}/stardust/`);
  await waitFor("!!document.querySelector('[data-js=gate-login]')", 8000);
  // 카카오 로그인(모의) — 별가루 페이지는 로그인 뒤에 열린다
  await ev("document.querySelector('[data-js=gate-login]').click(); true");
  await waitFor("location.pathname === '/__dev/kakao/authorize'", 8000);
  await ev(`document.querySelector('[data-field=kid]').value = '${KID}'; document.querySelector('[data-act=agree]').click(); true`);
  await waitFor("location.pathname === '/stardust/' && !!document.querySelector('[data-js=dust-pack]')", 15000);
  const sd = await ev("({ uses: [...document.querySelectorAll('.gmini')[1].querySelectorAll('li')].map((l) => l.textContent), rate: [...document.querySelectorAll('.gnote')].some((n) => /1개 = 100원/.test(n.textContent)) })");
  check("별가루 페이지: 쓰는 곳 = 면담 5 · 다른 안내자 3 · 숨은 이야기 10 · 책 49 · 신년운세 49 · 1개 = 100원", sd.uses.length === 5 && /면담.*5/.test(sd.uses[0]) && /책.*49/.test(sd.uses[3]) && /신년운세.*49/.test(sd.uses[4]) && sd.rate, JSON.stringify(sd));
  const packs = await ev("[...document.querySelectorAll('[data-js=dust-pack]')].map((p) => p.textContent.replace(/\\s+/g, ' ').trim())");
  check("충전 묶음 4종: 30개 3,000원 · 50개 5,000원 · 100개(+10 덤) 10,000원 · 300개(+50 덤) 30,000원", packs.length === 4 && /30개.*3,000원/.test(packs[0]) && /50개.*5,000원/.test(packs[1]) && /100개.*\+10 덤.*10,000원/.test(packs[2]) && /300개.*\+50 덤.*30,000원/.test(packs[3]), packs.join(" | "));
  // 30개 충전 → 49에 모자람
  await ev("document.querySelector('[data-js=dust-pack][data-prod=d30]').click(); document.querySelector('[data-js=dust-agree]').checked = true; document.querySelector('[data-js=dust-buy]').click(); true");
  await waitFor("location.pathname === '/__dev/payapp/checkout'", 15000);
  const co = await ev("({ good: document.querySelector('[data-field=goodname]').textContent, price: document.querySelector('[data-field=price]').textContent })");
  await ev("document.querySelector('[data-act=complete]').click(); true");
  const cr = await waitFor("location.pathname === '/stardust/' && /들어왔어요/.test(document.querySelector('[data-js=dust-msg]')?.textContent || '')", 20000);
  check("30개 충전: 결제창 상품·금액(별가루 30개 · 3,000원) → 카카오 계정에 30(첫 로그인 10과 합쳐 40)", /별가루 30개/.test(co.good) && /3,?000/.test(co.price) && cr, JSON.stringify(co));

  // ── 2. 일곱 방 결제 화면: 별가루 49개로 열기 · 가진 별가루 30 → 19개 모자람 + 충전하러 가기
  await b.goto(`${TEST}/products/strange-oracle/`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'", 10000);
  await ev("StrangeOracle.go('deeper'); true");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper' && /가진 별가루/.test(document.querySelector('[data-js=pay-dust]')?.textContent || '')", 10000);
  const p0 = await ev("({ buy: document.querySelector('[data-js=pay-buy]').textContent, line: document.querySelector('[data-js=pay-dust]').textContent, price: document.querySelector('[data-js=pay-quick-price]')?.textContent || '' })");
  check("일곱 방 결제 화면: 버튼 「별가루 49개로 책 열기」 · 가격 별가루 49개 · 가진 별가루 40개(첫 로그인 10 + 충전 30) · 9개 모자라요 · 충전 묶음 표", /별가루 49개로 책 열기/.test(p0.buy) && /별가루 49개/.test(p0.price) && /가진 별가루 40개/.test(p0.line) && /9개 모자라요/.test(p0.line) && /30개 3,000원/.test(p0.line), JSON.stringify(p0));
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); document.querySelector('[data-js=pay-buy]').click(); return true; })()");
  await waitFor("/모자라요/.test(document.querySelector('[data-js=pay-dust]').textContent) && !!document.querySelector('.pay-dust__charge')", 8000);
  check("모자라면 열지 않고 「별가루 충전하러 가기」", (await ev("document.querySelector('.screen.is-active').id")) === "screen-deeper" && (await ev("!!document.querySelector('.pay-dust__charge')")));
  // 충전하러 가기 → 별가루 페이지 · 돌아가기 단추
  await ev("document.querySelector('.pay-dust__charge').click(); true");
  await waitFor("location.pathname === '/stardust/' && !!document.querySelector('[data-js=dust-pack]')", 10000);
  check("충전하러 가기 → 별가루 페이지 + 「책을 열던 곳으로 돌아가기」", await ev("!!document.querySelector('[data-js=dust-back]')"));
  await ev("document.querySelector('[data-js=dust-pack][data-prod=d50]').click(); document.querySelector('[data-js=dust-agree]').checked = true; document.querySelector('[data-js=dust-buy]').click(); true");
  await waitFor("location.pathname === '/__dev/payapp/checkout'", 15000);
  await ev("document.querySelector('[data-act=complete]').click(); true");
  await waitFor("location.pathname === '/stardust/' && /들어왔어요/.test(document.querySelector('[data-js=dust-msg]')?.textContent || '')", 20000);
  const tot = await ev("document.querySelector('.gwallet [data-js=dust-total]').textContent");

  // ── 3. 돌아가서 별가루 49로 책 열기 → 열람 코드(SOP) · 책 열림 · 계정 잔액 41
  await b.goto(`${TEST}/products/strange-oracle/`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'", 10000);
  await ev("StrangeOracle.go('deeper'); true");
  await waitFor("/가진 별가루 90개/.test(document.querySelector('[data-js=pay-dust]')?.textContent || '')", 10000);
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); document.querySelector('[data-js=pay-buy]').click(); return true; })()");
  const opened = await waitFor("!!document.querySelector('[data-js=pay-code-dialog][open], dialog[open] [data-js=code-list]') || /^SOP/.test(sessionStorage.getItem('strange-oracle-pass') || '')", 15000);
  const codes = await ev("[...document.querySelectorAll('[data-js=code-list] *')].map((x) => x.textContent).join(' ')");
  const sid = await ev("JSON.parse(localStorage.getItem('strange-oracle-login') || 'null')?.sid || ''");
  const bal = await (await fetch(`${TEST}/api/auth/dust`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid }) })).json();
  check("50개 더 충전(계정 90 = 첫 로그인 10 + 30 + 50) → 별가루 49로 책 열기 → SOP 열람 코드 카드 · 계정 잔액 41", /90/.test(tot) && opened && /SOP/.test(codes) && bal.bal === 41, JSON.stringify({ tot, codes: codes.slice(0, 60), bal }));
  const me = await (await fetch(`${TEST}/api/auth/me`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid }) })).json();
  check("열린 책의 열람 코드가 카카오 계정에 연결됨", JSON.stringify(me.passes || []).includes("SOP"), JSON.stringify(me.passes || []).slice(0, 80));

  // ── 4. 로그인 없이 별가루로 열기 → 카카오 로그인으로
  await ev("localStorage.removeItem('strange-oracle-login'); true");
  await b.goto(`${TEST}/products/strange-oracle/`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'", 10000);
  await ev("sessionStorage.removeItem('strange-oracle-pass'); StrangeOracle.go('deeper'); true");
  const gated = await waitFor("!!document.querySelector('[data-js=login-gate]:not([hidden]) .login-gate__go') && document.querySelector('.screen.is-active')?.id === 'screen-hub'", 8000);
  await ev("StrangeOracle.go('saju-intro'); true");
  const gated2 = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub' && !!document.querySelector('[data-js=login-gate]:not([hidden])')", 8000);
  check("로그인 전: 입구는 보이지만 방·책 화면으로는 못 가고 카카오 로그인 안내", gated && gated2);

  const pass = out.filter((l) => l.startsWith("PASS")).length, fail = out.length - pass;
  console.log(`${pass} PASS / ${fail} FAIL`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-dust.txt"), out.join("\n") + `\n${pass} PASS / ${fail} FAIL\n`);
  await b.close();
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
