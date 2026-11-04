// (2026-11-04 시험판) 2027 신년운세 탭 「새해의 회랑」 e2e. 모의 서버 test(새해 탭 켜짐·가짜 페이앱), 실제 결제 0.
// 준비: node tools/strange-oracle/mock-server.js --src --port 8788 --mode test   (새해 파일은 배포판(dist)에 없으므로 원본 폴더 --src로 띄운다)
// 실행: node --experimental-websocket tools/strange-oracle/e2e-ny.js   → 결과 tools/strange-oracle/out/e2e-ny.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const PAID = path.join(__dirname, "..", "..", "products", "strange-oracle", "api", "_paid", "book", "book-ny.js");
const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const CAL = { saju: 12, ogham: 4, star: 12, decan: 12, tzolkin: 12, rune: 3, sibyl: 4 };
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const BOOK = (() => { const w = {}; new Function("window", fs.readFileSync(PAID, "utf8"))(w); return w.BOOK_NY; })();
const paidStrings = [];
(function grab(v) { if (typeof v === "string" && v.length >= 30) paidStrings.push(v.slice(5, 35)); else if (v && typeof v === "object") Object.values(v).forEach(grab); })(BOOK);

(async () => {
  await fetch(`${TEST}/__dev/pay-switch?limits=reset&win=redirect&sdk=ok&store=ok&env=ok`);
  const b = await launch({ port: 9684, reduced: true, width: 360, height: 760 });
  const { sleep } = b;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(100); } return false; };
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const active = () => ev("document.querySelector('.screen.is-active')?.id");
  const skip = async (to, paid = 0, rooms = 0) => {
    await b.goto(`${TEST}/__dev/skip?rooms=${rooms}&to=${to}&paid=${paid}`);
    await waitFor(`document.querySelector('.screen.is-active')?.id === 'screen-${to}'`);
    await waitFor("!!document.querySelector('[data-js=ny-tabbar]')", 6000);
    await sleep(300);
  };
  const enterRoom = async (room) => {
    await click(`#screen-ny-hub [data-js=ny-door][data-room=${room}]`);
    await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-room'", 8000);
    if (room === "sibyl") await ev("document.querySelector('[data-js=ny-topic][value=work]').click()");
    await click("[data-js=ny-go]");
    return waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-result'", 15000);
  };
  const resultInfo = () => ev(`(() => { const s = document.querySelector('#screen-ny-result');
    return { theme: (s.querySelector('.ny-theme') || {}).textContent || '', cal: s.querySelectorAll('.ny-cal__item').length, bright: s.querySelectorAll('.ny-cal__item.is-bright').length,
      lock: !!s.querySelector('[data-js=ny-lock-btn]'), secs: s.querySelectorAll('.ny-sec').length, html: s.innerHTML, mark: (s.querySelector('.ny-res__mark') || {}).textContent || '' }; })()`);

  // 1. 결제 전: 입구에 하단 탭 · 새해 입구 일곱 문 · 방마다 고르고 나오기
  const n0 = b.log.bodies.length;
  await skip("hub", 0, 0);
  check("1-1 입구에 하단 탭(나의 이야기 / 2027 신년운세) 보임", await ev("document.querySelector('[data-js=ny-tabbar]').classList.contains('is-on') && /나의 이야기/.test(document.querySelector('[data-js=ny-tab-story]').textContent) && /2027/.test(document.querySelector('[data-js=ny-tab-ny]').textContent)"));
  await click("[data-js=ny-tab-ny]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  check("1-2 새해 탭 → 새해의 회랑: 일곱 문(순서 강제 없음·잠긴 문 없음) · 새해 탭이 현재 탭", (await ev("document.querySelectorAll('#screen-ny-hub [data-js=ny-door]').length")) === 7 && (await ev("document.querySelector('[data-js=ny-tab-ny]').classList.contains('is-current')")));
  for (const room of ROOMS) {
    const ok = await enterRoom(room);
    const r = await resultInfo();
    const leak = paidStrings.filter((t) => r.html.includes(t)).length;
    check(`1-3 ${room}: 결과 도착 · 한 해의 결 · 한눈에 ${CAL[room]}칸 · 잠금 칸(결제 전) · 유료 문장 0`, ok && r.theme.length > 20 && r.cal === CAL[room] && r.lock && r.secs === 0 && leak === 0, `${r.mark} · 빛남 ${r.bright} · 누출 ${leak}`);
    await click("[data-js=ny-back]");
    await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  }
  check("1-4 결제 전 새해 탭에서 함수 book 요청 0", !b.log.bodies.slice(n0).some((x) => /\/api\/book/.test(x.url)));
  check("1-5 들어 본 방에 '들어 봄' 표시 7개", (await ev("document.querySelectorAll('#screen-ny-hub .ny-door__heard').length")) === 7);
  await click("#screen-ny-hub [data-js=ny-door][data-room=saju]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-room'");
  await click("[data-js=ny-go]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-result'", 15000);
  await click("[data-js=ny-lock-btn]");
  check("1-6 [상세 풀이 열기] → 결제 전 화면", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'"));
  await ev("history.back()");
  check("1-7 뒤로 가기 → 새해 결과로", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-result'"));
  await click("[data-js=ny-tab-story]");
  check("1-8 [나의 이야기] 탭 → 입구(새해 화면과 따로)", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'"));

  // 2. 새 방문(이 탭에 정보 없음): 생년월일을 넣어야 열림 · 넣은 값은 이 탭 sessionStorage에만
  await ev("sessionStorage.clear(); localStorage.removeItem('strange-oracle-internal'); true");
  await b.goto(`${TEST}/products/strange-oracle/#ny-hub`);
  check("2-1 새해 탭 주소로 새로 열면 새해의 회랑", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'", 8000));
  await click("#screen-ny-hub [data-js=ny-door][data-room=decan]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-room'");
  await click("[data-js=ny-go]");
  await sleep(300);
  check("2-2 생년월일 없이 [2027년 듣기] → 안내 줄, 화면 그대로", (await active()) === "screen-ny-room" && (await ev("!document.querySelector('.ny-form__error').hidden")));
  await ev("(() => { const d = document.querySelector('[data-js=ny-birth]'); d.value = '1990-07-21'; return true; })()");
  await click("[data-js=ny-go]");
  const d2 = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-result'", 15000);
  const r2 = await resultInfo();
  check("2-3 생년월일 넣으면 데칸 결과(1990-07-21 = 게자리)", d2 && /게자리/.test(r2.mark), r2.mark);
  check("2-4 넣은 생일은 sessionStorage 이 탭에만 · localStorage·쿠키·주소에 없음 · 보낸 요청 본문에 없음", (await ev("(sessionStorage.getItem('strange-oracle') || '').includes('1990')")) && !(await ev("JSON.stringify(localStorage).includes('1990') || document.cookie.includes('1990') || location.href.includes('1990')")) && !b.log.bodies.some((x) => String(x.body || "").includes("1990") || String(x.url).includes("1990")));

  // 3. 결제한 탭: 상세 풀이(한 해 풀이·네 갈래·때마다·한 가지)가 서버에서 와서 열린다
  const n1 = b.log.bodies.length;
  await skip("hub", 1, 0);
  await click("[data-js=ny-tab-ny]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  for (const room of ROOMS) {
    await enterRoom(room);
    await waitFor("document.querySelectorAll('#screen-ny-result .ny-sec').length >= 3", 10000);
    const r = await resultInfo();
    const has = paidStrings.filter((t) => r.html.includes(t)).length;
    check(`3-1 ${room}(결제함): 상세 ${r.secs}칸 · 잠금 없음 · 유료 문장 보임`, r.secs >= 3 && !r.lock && has > 0, `유료 조각 ${has}`);
    await click("[data-js=ny-back]");
    await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  }
  const bookReqs = b.log.bodies.slice(n1).filter((x) => /\/api\/book/.test(x.url));
  check("3-2 함수 book 요청은 { pass, file:\"ny\" } 두 칸뿐 · 한 번만", bookReqs.length === 1 && bookReqs.every((x) => { try { const j = JSON.parse(x.body); return Object.keys(j).sort().join() === "file,pass" && j.file === "ny"; } catch (e) { return false; } }), `${bookReqs.length}건`);

  // 4. 내 정보 지우기 → 새해 탭 기록(뽑은 돌·신탁)도 지움
  check("4-1 뽑은 돌·신탁은 sessionStorage strange-oracle-ny에 번호만", await ev("(() => { const v = JSON.parse(sessionStorage.getItem('strange-oracle-ny') || '{}'); return Array.isArray(v.rune) && v.rune.length === 3 && Number.isInteger(v.sibyl?.sors); })()"));
  await ev("document.querySelector('[data-js=clear-open]').click()");
  await sleep(400);
  await ev("document.querySelector('[data-js=clear-confirm]')?.click()");
  await sleep(500);
  check("4-2 내 정보 지우기 뒤 strange-oracle-ny 없음", (await ev("sessionStorage.getItem('strange-oracle-ny')")) === null);

  const errs = b.log.errors.filter((e) => !/favicon/.test(e));
  check("5 콘솔 오류 0", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  const sum = `${out.length - fail} PASS / ${fail} FAIL`;
  console.log(sum);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-ny.txt"), out.concat(sum).join("\n") + "\n");
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("CRASH", e);
  process.exit(2);
});
