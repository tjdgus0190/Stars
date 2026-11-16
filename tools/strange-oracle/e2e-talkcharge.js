// (2026-11-16 운영자) 심층상담 화면 안 충전: 별가루 페이지로 넘어가지 않고, 아래에서 올라오는 충전 창 → 결제 → 같은 대화·적던 질문으로 돌아온다.
// 준비: node tools/strange-oracle/mock-server.js --src --port 8788 --mode test
// 실행: node --experimental-websocket tools/strange-oracle/e2e-talkcharge.js → 결과 tools/strange-oracle/out/e2e-talkcharge.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };

(async () => {
  const b = await launch({ port: 9697, reduced: true, width: 360, height: 760 });
  const { sleep } = b;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(120); } return false; };
  const KID = String(600000000 + Math.floor(Math.random() * 99999999));
  try {
    // 1. 로그인(모의 카카오) → 첫 로그인 별가루 10
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!window.Dust");
    await ev("localStorage.clear(); sessionStorage.clear(); true");
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!document.querySelector('[data-js=gate-login]')", 8000);
    await ev("document.querySelector('[data-js=gate-login]').click(); true");
    await waitFor("location.pathname === '/__dev/kakao/authorize'", 8000);
    await ev(`document.querySelector('[data-field=kid]').value = '${KID}'; document.querySelector('[data-act=agree]').click(); true`);
    await waitFor("location.pathname === '/talk/' && !!window.DEX && !!document.querySelector('[data-js=talk-pick]')", 15000);
    await ev("document.querySelector('[data-js=talk-pick][data-room=saju]').click(); true");
    await waitFor("!!document.querySelector('[data-js=setup-skip]')", 8000);
    await ev("document.querySelector('[data-js=setup-skip]').click(); true");
    await waitFor("/가진 별가루 10/.test(document.querySelector('.groom__meta')?.textContent || '') && !document.querySelector('.groom__send').disabled", 10000);
    const m0 = await ev("document.querySelector('.groom__meta').textContent");
    check("첫 로그인 10: 두 번 물을 수 있어 미리 알림 없음", !/남았어요/.test(m0) && !document_has_charge(m0), m0);
    // (2026-11-16) 대화 보관(talkSync)이 꺼진 기본 상태: 동의 카드 없음 · /api/auth/chat 요청 0
    const sy = await ev("({ card: !!document.querySelector('[data-js=sync-card]'), calls: performance.getEntriesByType('resource').filter((e) => /\\/api\\/auth\\/chat/.test(e.name)).length })");
    check("대화 보관 꺼짐(기본): 동의 카드 없음 · 보관 요청 0", !sy.card && sy.calls === 0, JSON.stringify(sy));

    // 2. 한 번 묻기 → 5 남음 → 「한 번 물을 만큼 남았어요 · 충전하기」
    await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '올해 일은 어떻게 풀어 가면 좋을까요?'; document.querySelector('.groom__send').click(); return true; })()");
    await waitFor("/가진 별가루 5/.test(document.querySelector('.groom__meta')?.textContent || '') && !document.querySelector('.groom__send').disabled", 20000);
    const m1 = await ev("({ meta: document.querySelector('.groom__meta').textContent, btn: !!document.querySelector('.groom__meta [data-js=talk-charge]'), link: !!document.querySelector('.groom__meta a[href=\"/stardust/\"]') })");
    check("5 남음: 「한 번 물을 만큼 남았어요」 + 화면 안 「충전하기」 단추(별가루 페이지 링크 아님)", /한 번 물을 만큼 남았어요/.test(m1.meta) && m1.btn && !m1.link, JSON.stringify(m1));

    // 3. 질문을 적다가 충전 창 열기 → 충전 칸(묶음 4·요약·동의) · 대화는 뒤에 그대로
    await ev("document.querySelector('.groom textarea').value = '두 번째로 묻고 싶은 것: 이직 시기'; true");
    await ev("document.querySelector('[data-js=talk-charge]').click(); true");
    await waitFor("!document.querySelector('.gsheet--charge').hidden && document.querySelectorAll('.gsheet--charge [data-js=dust-pack]').length === 4", 8000);
    const s0 = await ev("({ path: location.pathname, packs: document.querySelectorAll('.gsheet--charge [data-js=dust-pack]').length, sum: !!document.querySelector('.gsheet--charge .gsummary'), agree: !!document.querySelector('.gsheet--charge [data-js=dust-agree]'), room: !!document.querySelector('.groom'), lead: document.querySelector('.gcharge__lead').textContent })");
    check("충전 창: 같은 페이지 · 묶음 4 · 요약 · 동의 칸 · 뒤에 상담 방 그대로", s0.path === "/talk/" && s0.packs === 4 && s0.sum && s0.agree && s0.room && /대화로 바로 돌아와요/.test(s0.lead), JSON.stringify(s0));
    // 닫기(Esc) → 다시 열기
    await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
    const esc1 = await ev("({ hidden: document.querySelector('.gsheet--charge').hidden, room: !!document.querySelector('.groom') })");
    check("Esc: 충전 창만 닫히고 상담 방은 그대로", esc1.hidden && esc1.room, JSON.stringify(esc1));
    await ev("document.querySelector('[data-js=talk-charge]').click(); true");
    await waitFor("!document.querySelector('.gsheet--charge').hidden", 5000);

    // 4. 30개 결제 → 돌아오면 같은 방·적던 질문 · 충전 확인 → 창 닫힘 · 잔액 35 · 보내기 가능
    await ev("document.querySelector('.gsheet--charge [data-js=dust-pack][data-prod=d30]').click(); document.querySelector('.gsheet--charge [data-js=dust-agree]').checked = true; document.querySelector('.gsheet--charge [data-js=dust-buy]').click(); true");
    await waitFor("location.pathname === '/__dev/payapp/checkout'", 15000);
    const ret = await ev("document.querySelector('[data-field=returnurl]')?.textContent || ''");
    await ev("document.querySelector('[data-act=complete]').click(); true");
    const back = await waitFor("location.pathname === '/talk/' && !!document.querySelector('.groom') && /들어왔어요/.test(document.querySelector('.gsheet--charge [data-js=dust-msg]')?.textContent || '')", 20000);
    const r1 = await ev("({ hash: location.hash, room: document.querySelector('.groom')?.getAttribute('aria-label'), draft: document.querySelector('.groom textarea')?.value, me: document.querySelectorAll('[data-js=talk-log] .gsay--me').length })");
    check("결제 뒤 /talk/로 돌아옴: 만신 방 · 적던 질문 그대로 · 지난 대화 그대로 · 충전 확인 문구", back && r1.hash === "" && r1.room === "만신" && r1.draft === "두 번째로 묻고 싶은 것: 이직 시기" && r1.me === 1, JSON.stringify(Object.assign({ ret }, r1)));
    const closed = await waitFor("document.querySelector('.gsheet--charge').hidden", 5000);
    const r2 = await ev("({ meta: document.querySelector('.groom__meta').textContent, send: document.querySelector('.groom__send').disabled, pend: sessionStorage.getItem('strange-oracle-dustpay'), res: sessionStorage.getItem('strange-oracle-talk-resume') })");
    check("충전 확인 뒤 창이 저절로 닫힘 · 가진 별가루 35 · 미리 알림 사라짐 · 보내기 가능 · 결제·복귀 기록 지움", closed && /가진 별가루 35/.test(r2.meta) && !/남았어요/.test(r2.meta) && !r2.send && r2.pend === null && r2.res === null, JSON.stringify(r2));

    // 5. 별가루 페이지 충전은 그대로(별가루 페이지로 돌아옴)
    await b.goto(`${TEST}/stardust/`);
    await waitFor("!!document.querySelector('[data-js=dust-pack]')", 8000);
    await ev("document.querySelector('[data-js=dust-pack][data-prod=d30]').click(); document.querySelector('[data-js=dust-agree]').checked = true; document.querySelector('[data-js=dust-buy]').click(); true");
    await waitFor("location.pathname === '/__dev/payapp/checkout'", 15000);
    await ev("document.querySelector('[data-act=complete]').click(); true");
    const sd = await waitFor("location.pathname === '/stardust/' && /들어왔어요/.test(document.querySelector('[data-js=dust-msg]')?.textContent || '') && /65/.test(document.querySelector('[data-js=dust-total]')?.textContent || '')", 20000);
    check("별가루 페이지 충전은 예전처럼 별가루 페이지로 돌아와 65", sd, await ev("document.querySelector('[data-js=dust-total]')?.textContent"));
  } catch (e) {
    check("예외 없음", false, String(e && e.stack || e).slice(0, 300));
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-talkcharge.txt"), out.join("\n") + "\n");
  await b.close();
  process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
})();
function document_has_charge(meta) { return /충전하기/.test(meta); }
