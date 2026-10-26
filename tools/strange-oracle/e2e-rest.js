// 22단계 e2e: 방 결과 아래 "이 방의 나머지 이야기"(결정 134). 모의 서버 test(가짜 페이앱), 실제 결제 0.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
// 실행: node tools/strange-oracle/e2e-rest.js   → 결과 tools/strange-oracle/out/e2e-rest.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const PAID = path.join(__dirname, "..", "..", "products", "strange-oracle", "api", "_paid", "book");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
// 유료 원본에서 한 문장(공개 파일·결제 전 화면에 있으면 안 됨)
const paidLine = (file, global, pick) => {
  const w = {};
  new Function("window", fs.readFileSync(path.join(PAID, file), "utf8"))(w);
  return pick(w[global]);
};

(async () => {
  await fetch(`${TEST}/__dev/pay-switch?limits=reset&win=redirect&sdk=ok&store=ok&env=ok`);
  await fetch(`${TEST}/__dev/pay-store?clear=1`);
  const b = await launch({ port: 9682, reduced: true, width: 360, height: 700 });
  const { sleep } = b;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(100); } return false; };
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const rest = () => ev("(() => { const x = document.querySelector('.screen.is-active [data-js=room-rest]'); return x ? { state: x.dataset.state, text: x.innerText, ps: x.querySelectorAll('.room-rest__body p').length, empty: [...x.querySelectorAll('.room-rest__body p')].filter((p) => !p.textContent.trim()).length } : null; })()");
  const skip = async (to, paid = 0) => {
    await b.goto(`${TEST}/__dev/skip?rooms=7&to=${to}&paid=${paid}`);
    await waitFor(`document.querySelector('.screen.is-active')?.id === 'screen-${to}'`);
    await sleep(400);
  };

  // 1. (2026-10-25 운영자) 만신도 유료: 결제 전 = 판정 + "여기까지가 흔히 보던 사주" 잠긴 칸(이 사람의 장 제목) + 떠 있는 결제 버튼. 함수 book 요청 0
  const PUB = (() => { const w = {}; new Function("window", fs.readFileSync(path.join(PAID, "..", "..", "..", "data-saju.js"), "utf8"))(w); return w.SAJU; })();
  const sajuStrikeAll = paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.flatMap((e) => e.strike.lines.concat(e.strike.turn)));
  const n0 = b.log.bodies.length;
  await skip("saju-result");
  let r = await rest();
  const sj = await ev(`(() => { const s = document.querySelector('.screen.is-active'); const v = s.querySelector('[data-js=saju-verdict]'); const d = document.querySelector('[data-js=pay-dock]');
    return { verdict: v && !v.hidden ? { head: v.querySelector('[data-js=saju-verdict-head]').textContent, lines: [...v.querySelectorAll('.verdict__line')].map((x) => x.textContent), turn: v.querySelector('[data-js=saju-verdict-turn]').textContent, beforeBoard: !!(v.compareDocumentPosition(s.querySelector('[data-js=saju-board]')) & 4) } : null,
      cut: s.querySelector('.room-rest__cut')?.textContent || '', locks: [...s.querySelectorAll('.room-rest__lock-name')].map((x) => x.textContent), tease: s.querySelector('[data-js=room-strike-tease] .strike__line')?.textContent || '', blur: s.querySelectorAll('[data-js=room-strike-tease] .strike__blur').length, match: s.querySelector('[data-js=room-rest-match]')?.innerText || '', safe: s.querySelector('.room-rest__safe')?.textContent || '', buy: !!s.querySelector('[data-js=room-rest-buy]'),
      dock: d && !d.hidden ? d.querySelector('[data-js=pay-dock-label]').textContent + ' ' + d.querySelector('[data-js=pay-dock-price]').textContent : null, html: document.documentElement.outerHTML }; })()`);
  const stem = PUB.stems.find((x) => sj.verdict && x.verdict && sj.verdict.lines[0] === x.verdict.lines[0]);
  check("A1 만신 결과(결제 전): 판정(머리 한 줄·세 줄·맺음, 원국 판보다 위)이 이 사람 일간의 공개 문장", Boolean(sj.verdict && stem && sj.verdict.lines.length === 3 && sj.verdict.head.includes(stem.verdict.head) && sj.verdict.turn === stem.verdict.turn && sj.verdict.beforeBoard), JSON.stringify(sj.verdict));
  check("A2 만신 나머지 칸 locked · '여기까지가 흔히 보던 사주예요.' · (2026-10-26) 직언 첫 마디 맛보기(이 일간의 것) + 흐린 두 줄 · 잠긴 줄 5개 = 이 사람의 장 제목 4개 + 숨은 장 제목 · 궁합 카드 · 안심 한 줄 · 9,900원 · [모두 열기]", r && r.state === "locked" && /흔히 보던 사주/.test(sj.cut) && stem && sj.tease === paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.find((e) => e.code === stem.code).strike.lines[0]) && sj.blur === 2 && sj.locks.length === 5 && sj.locks[0] === stem.identity.title && sj.locks[1] === stem.event.title && sj.locks[2] === stem.shadow.title && sj.locks[3] === stem.advice.title && sj.locks[4].length > 0 && /궁합/.test(sj.match) && /구독 아님/.test(sj.safe) && /9,900원/.test(r.text) && sj.buy, JSON.stringify({ locks: sj.locks, tease: sj.tease, safe: sj.safe }));
  const sajuOpenTease = stem ? paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.find((e) => e.code === stem.code).strike.lines[0]) : "";
  check("A3 결제 전 만신 화면에 유료 원본 문장 0(맛보기 첫 마디만 예외) · 함수 book 요청 0", !sajuStrikeAll.filter((t) => t !== sajuOpenTease).some((t) => sj.html.includes(t)) && !b.log.bodies.slice(n0).some((x) => /\/api\/book/.test(x.url)));
  check("A4 떠 있는 결제 버튼: 만신 문구 + 9,900원", /만신/.test(sj.dock || "") && /9,900원/.test(sj.dock || ""), sj.dock);
  // 떠 있는 버튼 → 결제 전 화면, 결제를 시작한 방 = saju. 다른 화면에서는 숨음
  await click("[data-js=pay-dock-btn]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await sleep(300);
  check("A5 떠 있는 버튼 → 결제 전 화면 · payroom=saju · 결제 전 화면에서는 버튼 숨음 · 받는 것에 Ⅰ 만신의 방", (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === "saju" && (await ev("document.querySelector('[data-js=pay-dock]').hidden")) && /만신의 방/.test(await ev("document.querySelector('.screen.is-active').innerText")));
  const pz = await ev("(() => { const s = document.querySelector('.screen.is-active'); return { hi: s.querySelector('[data-js=pay-highlight]')?.innerText || '', safe: s.querySelector('[data-js=pay-safe]')?.textContent || '', subs: s.querySelectorAll('[data-js=pay-chapters] .pay-list__sub').length, items: s.querySelectorAll('[data-js=pay-chapters] li').length, hot: [...s.querySelectorAll('.pay-list__item--hot')].map((li) => li.firstElementChild.firstChild.textContent), safeAfterBuy: !!(s.querySelector('[data-js=pay-buy]').compareDocumentPosition(s.querySelector('[data-js=pay-safe]')) & 4) }; })()");
  check("A5b (2026-10-26) 결제 전 화면: 궁합 강조 카드 · 받는 것 13줄 모두 한 줄 설명 · 궁합 줄 강조 · 결제 버튼 아래 안심 한 줄", /궁합/.test(pz.hi) && pz.items === 13 && pz.subs === 13 && pz.hot.length === 1 && /궁합/.test(pz.hot[0]) && /구독 아님/.test(pz.safe) && pz.safeAfterBuy, JSON.stringify(pz));
  // 결제한 탭: 만신 바로 열림(직언이 장 맨 앞) · 떠 있는 버튼 없음
  const n0b = b.log.bodies.length;
  await skip("saju-result", 1);
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  const sajuReq = b.log.bodies.slice(n0b).filter((x) => /\/api\/book/.test(x.url));
  check("A6 만신(결제한 탭): 바로 open · Ⅱ~Ⅳ장·숨은 장 문단(빈 문단 0) · 요청 본문 = pass·file 두 칸, file=saju · 떠 있는 버튼 숨음", r && r.state === "open" && r.ps >= 8 && r.empty === 0 && sajuReq.length >= 1 && sajuReq.every((q) => Object.keys(JSON.parse(q.body)).sort().join() === "file,pass" && JSON.parse(q.body).pass.length > 0) && sajuReq.some((q) => JSON.parse(q.body).file === "saju") && (await ev("document.querySelector('[data-js=pay-dock]').hidden")), `${r && r.ps}문단 · ${sajuReq.map((x) => x.body.replace(/"pass":"[^"]*"/, '"pass":"…"')).join(" | ")}`);

  const strikeOf = () => ev("(() => { const x = document.querySelector('.screen.is-active [data-js=room-strike]'); return x ? { lines: [...x.querySelectorAll('.strike__line')].map((p) => p.textContent), turn: x.querySelector('.strike__turn')?.textContent || '', first: /room-rest__(title|note)/.test((x.previousElementSibling || {}).className || '') } : null; })()");
  const sajuStrike = paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.map((e) => e.strike.lines[0]));
  let st = await strikeOf();
  check("A7 (24단계) 만신 펼침: 직격 세 마디 + 한 줄이 장 맨 앞 · 유료 원본 문장", st && st.lines.length === 3 && st.turn.length > 10 && st.first && sajuStrike.includes(st.lines[0]), st && st.lines[0]);

  // 2. 오검: 결제 전 잠김 — 장 이름·분량·결제 버튼, 유료 문장 0
  const ogLine = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full[2].event.body[0]);
  const n1 = b.log.bodies.length;
  await skip("ogham-result");
  r = await rest();
  const html = await ev("document.documentElement.outerHTML");
  check("B1 오검 결과(결제 전): locked · 직격 맛보기 1줄 + 흐린 2줄 · 잠긴 줄 5개(이 사람의 장 제목) · 궁합 카드 · 안심 한 줄 · 9,900원 · [모두 열기]·[이미 샀어요]", r && r.state === "locked" && (await ev("document.querySelectorAll('.screen.is-active .room-rest__lock').length")) === 5 && (await ev("document.querySelectorAll('.screen.is-active [data-js=room-strike-tease] .strike__blur').length")) === 2 && (await ev("!!document.querySelector('.screen.is-active [data-js=room-rest-match]') && !!document.querySelector('.screen.is-active .room-rest__safe')")) && /9,900원/.test(r.text) && (await ev("!!document.querySelector('.screen.is-active [data-js=room-rest-buy]') && !!document.querySelector('.screen.is-active [data-js=room-rest-have]')")), r && r.state);
  const ogStrike = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full.flatMap((e) => e.strike.lines.concat(e.strike.turn)));
  check("B1b 오검(결제 전): 떠 있는 결제 버튼 보임(오검 문구) · 큰 카카오톡 버튼 1개 · 작은 카카오 글자 링크는 감춤", (await ev("(() => { const d = document.querySelector('[data-js=pay-dock]'); return !d.hidden && /이 방 이야기/.test(d.innerText); })()")) && (await ev("document.querySelectorAll('.screen.is-active .kakao-share .btn-kakao--share').length")) === 1 && (await ev("getComputedStyle(document.querySelector('.screen.is-active .result-more [data-js=share-kakao-slot]')).display")) === "none");
  const ogTease = await ev("document.querySelector('.screen.is-active [data-js=room-strike-tease] .strike__line')?.textContent || ''");
  const ogFirsts = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full.map((e) => e.strike.lines[0]));
  check("B2 결제 전 화면: 직격은 이 결과의 첫 마디 하나만 보임 · 나머지 직격·유료 문장 0 · 열린 직격 칸 없음 · 함수 book 요청 0", ogFirsts.includes(ogTease) && !ogStrike.filter((t) => t !== ogTease).some((t) => html.includes(t)) && !(await ev("!!document.querySelector('.screen.is-active [data-js=room-strike]')")) && !html.includes(ogLine.slice(0, 30)) && !b.log.bodies.slice(n1).some((x) => /\/api\/book/.test(x.url)), ogTease);
  await click(".screen.is-active [data-js=room-rest-have]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await sleep(300);
  check("B3 [이미 샀어요] → 결제 전 화면 · 코드 넣기 칸 펼침", (await ev("document.querySelector('.screen.is-active')?.id")) === "screen-deeper" && (await ev("document.querySelector('[data-js=pass-toggle]')?.getAttribute('aria-expanded')")) === "true");

  // 3. 오검에서 결제 → 가짜 페이앱 → 돌아오면 오검 결과로, 나머지가 바로 열림 + 코드 카드
  await skip("ogham-result");
  await click(".screen.is-active [data-js=room-rest-buy]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  check("C1 [모두 열기] → 결제 전 화면(받는 것·가격·환불 고지 먼저) · 방 이름만 sessionStorage", (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === "ogham");
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); })()");
  await click("[data-js=pay-buy]");
  await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 8000);
  await ev("document.querySelector('[data-act=complete]').click()");
  const back = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ogham-result' && document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'", 30000);
  r = await rest();
  check("C2 결제 뒤 오검 결과로 돌아옴 · 나머지 이야기 open(빈 문단 0) · 코드 카드 열림", back && r && r.ps >= 8 && r.empty === 0 && (await ev("!!document.querySelector('[data-js=pay-code-dialog]')?.open")), r && `${r.state} ${r.ps}`);
  check("C3 펼친 글에 유료 문장 있음 · payroom 지워짐", (await ev("document.querySelector('.screen.is-active [data-js=room-rest]').innerText")).includes(ogLine.slice(0, 30)) && (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === null);

  // 4. 결제한 탭: 룬(세 돌 소제목)·시빌라 바로 열림
  await skip("rune-result", 1);
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  st = await strikeOf();
  check("D0 (24단계) 룬(결제한 탭): 직격 = '지금' 자리 돌의 세 마디", st && st.lines.length === 3 && paidLine("book-rune.js", "BOOK_RUNE", (x) => x.full.map((e) => e.strike.lines[0])).includes(st.lines[0]), st && st.lines[0]);
  check("D1 룬(결제한 탭): 바로 open · 돌 소제목 · 빈 문단 0", r && r.state === "open" && (await ev("document.querySelectorAll('.screen.is-active .room-rest__sub').length")) >= 1 && r.empty === 0, r && r.state);
  await skip("sibyl-result", 1);
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  check("D2 시빌라(결제한 탭): 바로 open · Ⅱ~Ⅳ장·숨은 장", r && r.state === "open" && r.ps >= 6 && r.empty === 0);

  // 5. 함수 book이 응답하지 않으면 그 칸만 안내 + [다시 불러오기], 나머지 화면은 그대로
  await b.send("Network.setBlockedURLs", { urls: ["*/api/book"] }); // 함수 book이 응답하지 않는 상태
  await skip("star-result", 1);
  await waitFor("['fail','locked'].includes(document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state)", 8000);
  r = await rest();
  await b.send("Network.setBlockedURLs", { urls: [] });
  check("E1 함수 book 장애: 칸만 안내(fail 또는 locked) · 방 결과 본문은 그대로", r && ["fail", "locked"].includes(r.state) && (await ev("document.querySelector('.screen.is-active [data-js=reading-body]')?.innerText.length > 200")), r && r.state);
  check("E2 콘솔 오류 0", b.log.errors.filter((e) => !/favicon|40[0-9]|50[0-9]|net::|fonts/.test(e)).length === 0, b.log.errors.slice(0, 2).join(" | "));

  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-rest.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("CRASH " + (e && e.stack)); process.exit(1); });
