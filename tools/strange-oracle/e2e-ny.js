// (2026-11-04 시험판, 2026-11-12 별도 상품) 2027 신년운세 탭 「새해의 회랑」 e2e. 모의 서버 test(새해 탭 켜짐·가짜 페이앱), 실제 결제 0.
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
const SOP = (() => { const PC = require(path.join(__dirname, "..", "..", "products", "strange-oracle", "paycode.js")); return PC.Pass.pretty(PC.Pass.make()); })(); // 모양만 맞는 책 코드(서버에 묻지 않는지 보는 용도)
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

  const doorInfo = () => ev(`[...document.querySelectorAll('#screen-ny-hub [data-js=ny-door]')].map((d) => ({ room: d.dataset.room, lock: d.dataset.lock === '1', free: !!d.querySelector('.ny-door__badge.is-free') }))`);
  const freeReqs = (from) => b.log.bodies.slice(from).filter((x) => /\/api\/book/.test(x.url)).map((x) => { try { return JSON.parse(x.body); } catch (e) { return {}; } });

  // 1. 결제 전(2026-11-12 운영자 결정: 신년운세는 책과 따로 파는 상품): 처음 고른 두 방은 상세까지 무료, 셋째 문부터 결제 안내
  const n0 = b.log.bodies.length;
  await skip("hub", 0, 0);
  await ev("localStorage.removeItem('strange-oracle-ny-free'); true");
  check("1-1 입구에 하단 탭(나의 이야기 / 2027 신년운세) 보임", await ev("document.querySelector('[data-js=ny-tabbar]').classList.contains('is-on') && /나의 이야기/.test(document.querySelector('[data-js=ny-tab-story]').textContent) && /2027/.test(document.querySelector('[data-js=ny-tab-ny]').textContent)"));
  await click("[data-js=ny-tab-ny]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  const d0 = await doorInfo();
  check("1-2 새해의 회랑: 일곱 문 · 잠긴 문 0 · '처음 고르는 두 방은 무료' 안내 · 새해 탭이 현재 탭", d0.length === 7 && d0.every((d) => !d.lock) && /두 방은 무료/.test(await ev("document.querySelector('[data-js=ny-free-state]').textContent")) && (await ev("document.querySelector('[data-js=ny-tab-ny]').classList.contains('is-current')")));
  for (const [i, room] of [["1", "saju"], ["2", "ogham"]]) {
    const nb = b.log.bodies.length;
    const ok = await enterRoom(room);
    await waitFor("document.querySelectorAll('#screen-ny-result .ny-sec').length >= 2", 10000);
    const r = await resultInfo();
    const has = paidStrings.filter((t) => r.html.includes(t)).length;
    const reqs = freeReqs(nb);
    check(`1-3 ${room}(무료 ${i}/2): 결과 · ${CAL[room]}칸 · 무료 표시 · 상세 ${r.secs}칸이 열림(유료 문장 ${has}) · 잠금 없음`, ok && r.cal === CAL[room] && new RegExp(i + "/2").test(await ev("document.querySelector('[data-js=ny-free-tag]')?.textContent || ''")) && r.secs >= 2 && has > 0 && !r.lock);
    check(`1-4 ${room}: 함수 book에 { file:"ny-free", room, k } 세 칸만(코드·입력값 없음)`, reqs.length === 1 && Object.keys(reqs[0]).sort().join() === "file,k,room" && reqs[0].file === "ny-free" && reqs[0].room === room && Object.keys(reqs[0].k).every((x) => ["year", "areas", "one", "seasons"].includes(x)), JSON.stringify(reqs));
    check(`1-5 ${room}: 결과 끝 안내 = ${i === "1" ? "무료로 한 방 더" : "[남은 방 모두 열기 · 4,900원]"}`, i === "1" ? (await ev("!!document.querySelector('[data-js=ny-more]') && !document.querySelector('[data-js=ny-more-btn]')")) : /4,900원/.test(await ev("document.querySelector('[data-js=ny-more-btn]')?.textContent || ''")));
    await click("[data-js=ny-back]");
    await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  }
  const d1 = await doorInfo();
  check("1-6 무료 두 방을 고른 뒤: 만신·오검 문은 '무료', 나머지 다섯 문은 잠김(4,900원)", d1.filter((d) => d.free).map((d) => d.room).sort().join() === "ogham,saju" && d1.filter((d) => d.lock).length === 5 && /4,900원/.test(await ev("document.querySelector('#screen-ny-hub [data-js=ny-door][data-room=star]').textContent")));
  check("1-7 이 기기 localStorage에는 고른 방 이름 두 개뿐(입력값 없음)", (await ev("localStorage.getItem('strange-oracle-ny-free')")) === '["saju","ogham"]' && !(await ev("JSON.stringify(localStorage).includes('1995') || JSON.stringify(localStorage).includes('테스트')")));
  await click("#screen-ny-hub [data-js=ny-door][data-room=star]");
  check("1-8 셋째 문(베다) → 방이 아니라 신년운세 결제 전 화면", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-pay'", 6000));
  const payTxt = await ev("document.querySelector('#screen-ny-pay').textContent");
  check("1-9 결제 전 화면(7장): 받는 것·분량·가격 4,900원·책과 다른 상품·7일 환불·판매자·결제대행·동의 칸·SNY 코드 칸", /열리는 것/.test(payTxt) && /분량/.test(payTxt) && /4,900원/.test(payTxt) && /다른 상품/.test(payTxt) && /7일/.test(payTxt) && /SHA Studio/.test(payTxt) && /페이앱/.test(payTxt) && (await ev("!!document.querySelector('[data-js=ny-pay-agree]') && !document.querySelector('[data-js=ny-pay-agree]').checked")) && /SNY/.test(payTxt) && !/책을 산 분께/.test(payTxt));
  const sdkBefore = b.log.bodies.length;
  await click("[data-js=ny-pay-buy]");
  await sleep(300);
  check("1-10 동의 전 [결제하기] → 동의 칸을 짚어 주고 결제창은 열지 않음", (await active()) === "screen-ny-pay" && (await ev("!document.querySelector('#screen-ny-pay .pay-agree__nudge').hidden")));
  // 책 코드(SOP)를 신년운세 칸에 넣으면 서버에 묻지 않고 안내
  const nbk = b.log.bodies.length;
  await ev(`(() => { document.querySelector('[data-js=ny-pay-owned]').open = true; const i = document.querySelector('[data-js=ny-pass-input]'); i.value = ${JSON.stringify(SOP)}; return true; })()`);
  await click("[data-js=ny-pass-go]");
  await sleep(300);
  check("1-11 신년운세 코드 칸에 책 코드(SOP) → '책의 코드예요' 안내 · 서버 요청 0", (await ev("document.querySelector('[data-js=ny-pass-error]').dataset.kind")) === "book" && !b.log.bodies.slice(nbk).some((x) => /\/api\/book/.test(x.url)));
  await click("[data-js=ny-pay-back]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  check("1-12 고른 무료 방(만신)은 다시 들어가도 무료로 열림", await enterRoom("saju"));
  await click("[data-js=ny-back]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  check("1-13 결제 전 새해 탭의 함수 book 요청에 pass 칸 0", !freeReqs(n0).some((j) => "pass" in j));
  await click("[data-js=ny-tab-story]");
  check("1-14 [나의 이야기] 탭 → 입구(새해 화면과 따로)", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'"));

  // 1b. 책을 산 탭(SOP)이어도 신년운세는 열리지 않는다(별개 상품)
  await skip("hub", 1, 0);
  await click("[data-js=ny-tab-ny]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  const d2 = await doorInfo();
  check("1b 책 열람 코드가 있는 탭: 신년운세 문은 여전히 다섯 개 잠김(책 코드로 열리지 않음)", d2.filter((d) => d.lock).length === 5 && !(await ev("!!document.querySelector('[data-js=ny-show-code]')")));

  // 2. 새 방문(이 탭에 정보 없음): 생년월일을 넣어야 열림 · 넣은 값은 이 탭 sessionStorage에만
  await ev("sessionStorage.clear(); localStorage.removeItem('strange-oracle-internal'); localStorage.removeItem('strange-oracle-ny-free'); true");
  await b.goto(`${TEST}/products/strange-oracle/#ny-hub`);
  check("2-1 새해 탭 주소로 새로 열면 새해의 회랑", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'", 8000));
  await click("#screen-ny-hub [data-js=ny-door][data-room=decan]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-room'");
  await click("[data-js=ny-go]");
  await sleep(300);
  check("2-2 생년월일 없이 [2027년 듣기] → 안내 줄, 화면 그대로", (await active()) === "screen-ny-room" && (await ev("!document.querySelector('.ny-form__error').hidden")));
  await ev("(() => { const d = document.querySelector('[data-js=ny-birth]'); d.value = '1990-07-21'; return true; })()");
  await click("[data-js=ny-go]");
  const d2r = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-result'", 15000);
  const r2 = await resultInfo();
  check("2-3 생년월일 넣으면 데칸 결과(1990-07-21 = 게자리)", d2r && /게자리/.test(r2.mark), r2.mark);
  check("2-4 넣은 생일은 sessionStorage 이 탭에만 · localStorage·쿠키·주소에 없음 · 보낸 요청 본문에 없음", (await ev("(sessionStorage.getItem('strange-oracle') || '').includes('1990')")) && !(await ev("JSON.stringify(localStorage).includes('1990') || document.cookie.includes('1990') || location.href.includes('1990')")) && !b.log.bodies.some((x) => String(x.body || "").includes("1990") || String(x.url).includes("1990")));

  // 3. 신년운세를 산 탭(SNY): 일곱 방 모두 · 상세는 { pass(SNY), file:"ny" }로 한 번
  const n1 = b.log.bodies.length;
  await b.goto(`${TEST}/__dev/skip?rooms=0&to=hub&nypaid=1`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  await waitFor("!!document.querySelector('[data-js=ny-tabbar]')", 6000);
  await sleep(300);
  await click("[data-js=ny-tab-ny]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  const d3 = await doorInfo();
  check("3-0 신년운세를 산 탭: 잠긴 문 0 · '일곱 방이 모두 열려 있어요' · [내 신년운세 코드 보기]", d3.every((d) => !d.lock && !d.free) && /모두 열려/.test(await ev("document.querySelector('[data-js=ny-free-state]').textContent")) && (await ev("!!document.querySelector('[data-js=ny-show-code]')")));
  for (const room of ROOMS) {
    await enterRoom(room);
    await waitFor("document.querySelectorAll('#screen-ny-result .ny-sec').length >= 3", 10000);
    const r = await resultInfo();
    const has = paidStrings.filter((t) => r.html.includes(t)).length;
    check(`3-1 ${room}(신년운세 결제함): 상세 ${r.secs}칸 · 잠금·결과 끝 결제 안내 없음 · 유료 문장 보임`, r.secs >= 3 && !r.lock && has > 0 && !(await ev("!!document.querySelector('[data-js=ny-more]')")), `유료 조각 ${has}`);
    await click("[data-js=ny-back]");
    await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  }
  const bookReqs = b.log.bodies.slice(n1).filter((x) => /\/api\/book/.test(x.url));
  check("3-2 함수 book 요청은 { pass(SNY…), file:\"ny\" } 두 칸뿐 · 한 번만", bookReqs.length === 1 && bookReqs.every((x) => { try { const j = JSON.parse(x.body); return Object.keys(j).sort().join() === "file,pass" && j.file === "ny" && /^SNY/.test(j.pass); } catch (e) { return false; } }), `${bookReqs.length}건`);
  await click("[data-js=ny-show-code]");
  await sleep(300);
  const card = await ev("(() => { const d = document.querySelector('[data-js=pay-code-dialog]'); return { open: d.open, codes: [...d.querySelectorAll('[data-js=code-value]')].map((e) => e.textContent), title: d.querySelector('#code-card-title').textContent, keep: !d.querySelector('[data-js=keep]').classList.contains('is-hidden') && !d.querySelector('[data-js=keep]').hidden }; })()");
  check("3-3 [내 신년운세 코드 보기] → 코드 카드에 SNY 코드 하나 · 신년운세 제목 · 결과 담기 칸 없음", card.open && card.codes.length === 1 && /^SNY-/.test(card.codes[0]) && /신년운세/.test(card.title) && !card.keep, JSON.stringify(card));
  await ev("document.querySelector('[data-js=code-close]').click()");

  // 4. 내 정보 지우기 → 새해 탭 기록(뽑은 돌·신탁)·신년운세 코드도 지움
  check("4-1 뽑은 돌·신탁은 sessionStorage strange-oracle-ny에 번호만", await ev("(() => { const v = JSON.parse(sessionStorage.getItem('strange-oracle-ny') || '{}'); return Array.isArray(v.rune) && v.rune.length === 3 && Number.isInteger(v.sibyl?.sors); })()"));
  await ev("document.querySelector('[data-js=clear-open]').click()");
  await sleep(400);
  await ev("document.querySelector('[data-js=clear-confirm]')?.click()");
  await sleep(500);
  check("4-2 내 정보 지우기 뒤 strange-oracle-ny · strange-oracle-pass-ny 없음", (await ev("sessionStorage.getItem('strange-oracle-ny')")) === null && (await ev("sessionStorage.getItem('strange-oracle-pass-ny')")) === null);

  // 5. 결제 흐름(가짜 페이앱): 무료 두 방 → 셋째 문 → 동의 → 결제 → 결제창 값(신년운세 상품) → SNY 코드 → 멈췄던 방으로
  await skip("hub", 0, 0);
  await ev("localStorage.setItem('strange-oracle-ny-free', '[\"saju\",\"ogham\"]'); true");
  await click("[data-js=ny-tab-ny]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-hub'");
  await click("#screen-ny-hub [data-js=ny-door][data-room=tzolkin]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-pay'");
  await ev("document.querySelector('[data-js=ny-pay-agree]').click()");
  await click("[data-js=ny-pay-buy]");
  const atCo = await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 10000);
  const coB = b.log.bodies.filter((x) => /\/__dev\/payapp\/checkout/.test(x.url)).pop();
  const sent = Object.fromEntries(new URLSearchParams(coB ? coB.body : ""));
  check("5-1 결제창으로 간 값: 상품명 '2027 신년운세' · 4900 · var2 so-ny-1 · var1 32자 16진수 · 이름·생일 없음", atCo && /2027 신년운세/.test(sent.goodname || "") && sent.price === "4900" && sent.var2 === "so-ny-1" && /^[0-9a-f]{32}$/.test(sent.var1 || "") && !JSON.stringify(sent).includes("1995") && !JSON.stringify(sent).includes("테스트"), JSON.stringify({ goodname: sent.goodname, price: sent.price, var2: sent.var2 }));
  await ev("document.querySelector('[data-act=complete]').click()");
  const back5 = await waitFor("document.querySelector('[data-js=pay-code-dialog]')?.open", 20000);
  const codes5 = await ev("[...document.querySelectorAll('[data-js=pay-code-dialog] [data-js=code-value]')].map((e) => e.textContent)");
  check("5-2 결제 완료 → 코드 카드에 SNY 코드 · 이 탭 strange-oracle-pass-ny = 그 코드 · 책 코드 칸(strange-oracle-pass)은 비어 있음", back5 && codes5.length === 1 && /^SNY-/.test(codes5[0]) && (await ev("sessionStorage.getItem('strange-oracle-pass-ny')")) === codes5[0].replace(/-/g, "") && (await ev("sessionStorage.getItem('strange-oracle-pass')")) === null, JSON.stringify(codes5));
  await ev("document.querySelector('[data-js=code-close]').click()");
  check("5-3 결제 뒤 멈췄던 방(촐킨) 안으로", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ny-room' && document.querySelector('#screen-ny-room').dataset.nyRoom === 'tzolkin'", 8000), await active());
  const st5 = await (await fetch(`${TEST}/__dev/pay-store`)).text();
  check("5-4 결제 기록 저장소에 이름·생일·결과 0건", !/1995|테스트/.test(st5));

  if (b.log.bad.length) console.log("400 이상 응답:", JSON.stringify(b.log.bad.slice(0, 6)));
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
