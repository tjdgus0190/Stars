// (2026-11-16 운영자) 카카오 계정에 심층상담 대화 보관 → 다른 기기에서 같은 계정으로 로그인하면 대화가 이어진다.
// 준비: node tools/strange-oracle/mock-server.js --src --port 8788 --mode test --sync on
// 실행: node --experimental-websocket tools/strange-oracle/e2e-talksync.js → 결과 tools/strange-oracle/out/e2e-talksync.txt
// 「다른 기기」 = 이 기기의 localStorage·sessionStorage를 모두 비우고 같은 카카오 회원번호로 다시 로그인
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };

(async () => {
  const b = await launch({ port: 9698, reduced: true, width: 360, height: 760 });
  const { sleep } = b;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(120); } return false; };
  const KID = String(700000000 + Math.floor(Math.random() * 99999999));
  const KID2 = String(800000000 + Math.floor(Math.random() * 99999999));
  // 새 기기처럼: 저장소를 비우고 /talk/에서 카카오 로그인
  const freshLogin = async (kid) => {
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!window.Dust");
    await ev("localStorage.clear(); sessionStorage.clear(); true");
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!document.querySelector('[data-js=gate-login]')", 8000);
    await ev("document.querySelector('[data-js=gate-login]').click(); true");
    await waitFor("location.pathname === '/__dev/kakao/authorize'", 8000);
    await ev(`document.querySelector('[data-field=kid]').value = '${kid}'; document.querySelector('[data-act=agree]').click(); true`);
    return waitFor("location.pathname === '/talk/' && !!window.DEX && !!document.querySelector('[data-js=talk-pick]')", 15000);
  };
  const enterSaju = async () => {
    await ev("document.querySelector('[data-js=talk-pick][data-room=saju]').click(); true");
    await waitFor("!!document.querySelector('.groom')", 8000);
    if (await waitFor("!!document.querySelector('[data-js=setup-skip]')", 2500)) await ev("document.querySelector('[data-js=setup-skip]').click(); true");
  };
  const ask = async (q, n) => {
    await waitFor("!document.querySelector('.groom__send').disabled", 10000);
    await ev(`(() => { const t = document.querySelector('.groom textarea'); t.value = ${JSON.stringify(q)}; document.querySelector('.groom__send').click(); return true; })()`);
    return waitFor(`document.querySelectorAll('[data-js=talk-log] .gsay--me').length === ${n} && !document.querySelector('[data-js=talk-wait]')`, 20000);
  };
  const chatCalls = () => ev("performance.getEntriesByType('resource').filter((e) => /\\/api\\/auth\\/chat/.test(e.name)).length");
  try {
    // 1. 기기 A: 로그인 → 방에 들어가면 보관 동의 카드(체크 꺼짐·버튼 잠김·자세히 보기 안에 항목)
    check("기기 A 로그인", await freshLogin(KID));
    await enterSaju();
    const hasCard = await waitFor("!!document.querySelector('[data-js=sync-card]')", 8000);
    const c0 = await ev("(() => { const c = document.querySelector('[data-js=sync-card]'); return { agree: c.querySelector('[data-js=sync-agree]').checked, yes: c.querySelector('[data-js=sync-yes]').disabled, items: c.querySelectorAll('.gsync__more li').length, text: c.textContent }; })()");
    check("동의 카드: 체크 꺼짐 · 버튼 잠김 · 자세히 보기 9항목(국가·기간·지우는 법·14세)", hasCard && !c0.agree && c0.yes && c0.items === 9 && /미국/.test(c0.text) && /1년/.test(c0.text) && /14세/.test(c0.text) && /대화 지우기/.test(c0.text), JSON.stringify({ agree: c0.agree, yes: c0.yes, items: c0.items }));
    // 동의 전 질문 하나 → 이 탭에만
    check("동의 전 질문 → 답", await ask("동의 전에 묻는 질문이에요", 1));
    // 2. 체크 → 보관하기 → 이 탭의 대화를 계정에 올림
    await ev("(() => { const a = document.querySelector('[data-js=sync-agree]'); a.checked = true; a.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
    const yesOn = await ev("!document.querySelector('[data-js=sync-yes]').disabled");
    await ev("document.querySelector('[data-js=sync-yes]').click(); true");
    const done = await waitFor("!document.querySelector('[data-js=sync-card]') && /카카오 계정에 보관돼요/.test(document.querySelector('.groom__log').textContent)", 8000);
    check("체크하면 버튼이 켜지고, 보관하기 → 카드 사라지고 안내", yesOn && done);
    await sleep(600);

    // 3. 기기 B(같은 계정): 새로 로그인 → 로비에 「이어서」 · 보관할 때 올린 문답 그대로 · 동의 카드 없음 (첫 로그인 별가루 10 = 질문 두 번)
    check("기기 B 로그인(같은 계정)", await freshLogin(KID));
    const dot = await waitFor("!!document.querySelector('[data-js=talk-pick][data-room=saju] .gdoorpick__dot')", 8000);
    check("기기 B 로비: 만신 방에 「이어서」", dot);
    await enterSaju();
    const got = await waitFor("document.querySelectorAll('[data-js=talk-log] .gsay--me').length === 1", 8000);
    const r1 = await ev("({ me: [...document.querySelectorAll('[data-js=talk-log] .gsay--me')].map((x) => x.textContent.trim()), card: !!document.querySelector('[data-js=sync-card]'), note: document.querySelector('.groom__log').textContent })");
    check("기기 B: 기기 A의 문답(보관할 때 올린 것)이 그대로 · 보관 안내 · 동의 카드 없음", got && /동의 전에/.test(r1.me[0]) && !r1.card && /다른 기기에서도 이어져요/.test(r1.note), JSON.stringify(r1.me));
    check("기기 B에서 이어 묻기(계정에 덧붙임)", await ask("기기 B에서 이어 묻기", 2));
    await sleep(600);

    // 4. 다시 기기 A(탭을 새로 연 것처럼): 두 문답
    await ev("sessionStorage.removeItem('strange-oracle-talk'); true");
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!document.querySelector('[data-js=talk-pick]')", 8000);
    await enterSaju();
    check("새 탭에서도 계정의 두 문답(기기 B에서 물은 것까지)", await waitFor("document.querySelectorAll('[data-js=talk-log] .gsay--me').length === 2 && /기기 B에서/.test(document.querySelector('[data-js=talk-log]').textContent)", 8000));

    // 5. 대화 지우기 → 계정에서도 지워짐(새 탭에서 0)
    await ev("window.confirm = () => true; document.querySelector('[data-js=talk-clear]').click(); true");
    await sleep(500);
    await ev("sessionStorage.removeItem('strange-oracle-talk'); true");
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!document.querySelector('[data-js=talk-pick]')", 8000);
    await sleep(800);
    const noDot = await ev("!document.querySelector('[data-js=talk-pick][data-room=saju] .gdoorpick__dot')");
    check("대화 지우기 → 계정에서도 지워져 새 탭에서 「이어서」 없음", noDot);

    // 6. 나의 이야기: 보관 켜짐 · 끄기 → 꺼짐
    await b.goto(`${TEST}/me/`);
    const meOn = await waitFor("/심층상담 대화 보관/.test(document.querySelector('[data-js=app]')?.textContent || '') && !!document.querySelector('[data-js=me-sync-off]')", 10000);
    check("나의 이야기: 「심층상담 대화 보관 · 켜짐」과 끄기 버튼", meOn);
    await ev("window.confirm = () => true; document.querySelector('[data-js=me-sync-off]').click(); true");
    check("끄기 → 「보관을 껐고」", await waitFor("/대화 보관을 껐고/.test(document.querySelector('[data-js=app]').textContent) && !document.querySelector('[data-js=me-sync-off]')", 8000));
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!document.querySelector('[data-js=talk-pick]')", 8000);
    await enterSaju();
    check("끈 뒤에는 상담 방에 동의 카드가 다시", await waitFor("!!document.querySelector('[data-js=sync-card]')", 8000));

    // 7. 다른 계정 C: 「이 기기에서만」 → 카드 사라짐 · 질문해도 계정에 쓰지 않음(보관 요청 0)
    check("기기 C 로그인(다른 계정)", await freshLogin(KID2));
    await enterSaju();
    await waitFor("!!document.querySelector('[data-js=sync-card]')", 8000);
    await ev("document.querySelector('[data-js=sync-no]').click(); true");
    const gone = await ev("!document.querySelector('[data-js=sync-card]')");
    const n0 = await chatCalls();
    await ask("이 기기에서만 묻는 질문", 1);
    await sleep(500);
    const n1 = await chatCalls();
    check("「이 기기에서만」: 카드 사라짐 · 질문해도 보관 요청 없음", gone && n1 === n0, `${n0}→${n1}`);
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!document.querySelector('[data-js=talk-pick]')", 8000);
    await enterSaju();
    await sleep(800);
    check("같은 탭에서는 다시 묻지 않음", !(await ev("!!document.querySelector('[data-js=sync-card]')")));
  } catch (e) {
    check("예외 없음", false, String(e && e.stack || e).slice(0, 300));
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-talksync.txt"), out.join("\n") + "\n");
  await b.close();
  process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
})();
