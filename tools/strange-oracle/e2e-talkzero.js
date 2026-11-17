// (2026-11-17 운영자) 별가루가 모자라면 보내기 단추를 눌렀을 때 충전 창이 뜬다(단추가 잠기지 않음). 적던 질문은 그대로.
// 준비: node tools/strange-oracle/mock-server.js --src --port 8788 --mode test
// 실행: node --experimental-websocket tools/strange-oracle/e2e-talkzero.js → 결과 tools/strange-oracle/out/e2e-talkzero.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };

(async () => {
  const b = await launch({ port: 9699, reduced: true, width: 360, height: 760 });
  const { sleep } = b;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(120); } return false; };
  const KID = String(500000000 + Math.floor(Math.random() * 99999999));
  try {
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!window.Dust");
    await ev("localStorage.clear(); sessionStorage.clear(); true");
    await b.goto(`${TEST}/talk/`);
    await waitFor("!!document.querySelector('[data-js=gate-login]')", 8000);
    await ev("document.querySelector('[data-js=gate-login]').click(); true");
    await waitFor("location.pathname === '/__dev/kakao/authorize'", 8000);
    await ev(`document.querySelector('[data-field=kid]').value = '${KID}'; document.querySelector('[data-act=agree]').click(); true`);
    await waitFor("location.pathname === '/talk/' && !!document.querySelector('[data-js=talk-pick]')", 15000);
    await ev("document.querySelector('[data-js=talk-pick][data-room=saju]').click(); true");
    await waitFor("!!document.querySelector('[data-js=setup-skip]')", 8000);
    await ev("document.querySelector('[data-js=setup-skip]').click(); true");
    // 10 → 두 번 묻고 0
    for (const [q, left] of [["첫 질문이에요", 5], ["두 번째 질문이에요", 0]]) {
      await waitFor("!document.querySelector('.groom__send').disabled && !document.querySelector('.groom__send').classList.contains('is-short')", 15000);
      await ev(`(() => { const t = document.querySelector('.groom textarea'); t.value = ${JSON.stringify(q)}; document.querySelector('.groom__send').click(); return true; })()`);
      await waitFor(`/가진 별가루 ${left}/.test(document.querySelector('.groom__meta')?.textContent || '') && !document.querySelector('[data-js=talk-wait]')`, 20000);
    }
    const s0 = await ev("({ dis: document.querySelector('.groom__send').disabled, short: document.querySelector('.groom__send').classList.contains('is-short'), sheet: document.querySelector('.gsheet--charge').hidden })");
    check("별가루 0: 보내기 단추는 눌림(잠기지 않음) · 흐리게 표시 · 충전 창은 아직 닫힘", !s0.dis && s0.short && s0.sheet, JSON.stringify(s0));
    // 질문을 적고 보내기 → 충전 창, 질문 그대로, 보낸 말풍선 없음
    await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '세 번째로 묻고 싶은 것'; document.querySelector('.groom__send').click(); return true; })()");
    const opened = await waitFor("!document.querySelector('.gsheet--charge').hidden && document.querySelectorAll('.gsheet--charge [data-js=dust-pack]').length === 4", 8000);
    const s1 = await ev("({ draft: document.querySelector('.groom textarea').value, me: document.querySelectorAll('[data-js=talk-log] .gsay--me').length })");
    check("보내기 → 충전 창(묶음 4) · 적던 질문 그대로 · 질문은 보내지지 않음", opened && s1.draft === "세 번째로 묻고 싶은 것" && s1.me === 2, JSON.stringify(s1));
    // 닫고 빈 칸으로 보내기 → 그래도 충전 창
    await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
    await waitFor("document.querySelector('.gsheet--charge').hidden", 5000);
    await ev("(() => { document.querySelector('.groom textarea').value = ''; document.querySelector('.groom__send').click(); return true; })()");
    const opened2 = await waitFor("!document.querySelector('.gsheet--charge').hidden", 5000);
    const e2 = await ev("document.querySelector('[data-js=talk-error]')?.hidden !== false");
    check("빈 칸으로 보내기도 충전 창(「질문을 적어 주세요」 오류 대신)", opened2 && e2);
  } catch (e) {
    check("예외 없음", false, String(e && e.stack || e).slice(0, 300));
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-talkzero.txt"), out.join("\n") + "\n");
  await b.close();
  process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
})();
