// 22단계 e2e: 방 결과 아래 "이 방의 나머지 이야기"(결정 134). 모의 서버 test(가짜 페이앱), 실제 결제 0.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
// 실행: node tools/strange-oracle/e2e-rest.js   → 결과 tools/strange-oracle/out/e2e-rest.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const SALE = require("./sale-price.js"); // (2026-10-27) 지금 판매 값(첫 계절 4,900원)
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
      cut: s.querySelector('.room-rest__cut')?.textContent || '', locks: [...s.querySelectorAll('.room-rest__lock-name')].map((x) => x.textContent), tease: s.querySelector('[data-js=room-strike-tease] .strike__line')?.textContent || '', blur: s.querySelectorAll('[data-js=room-strike-tease] .strike__blur').length, match: s.querySelector('[data-js=room-rest-match]')?.innerText || '', safe: s.querySelector('.room-rest__safe')?.textContent || '', buy: !!s.querySelector('[data-js=room-rest-buy]'), tier: s.querySelector('[data-js=room-rest]')?.dataset.tier || '', ov: s.querySelector('[data-js=room-rest-overlap]')?.textContent || '', mini: s.querySelector('[data-js=room-rest-buy-mini]')?.textContent || '', have: !!s.querySelector('[data-js=room-rest-have]'),
      dock: d && !d.hidden ? d.querySelector('[data-js=pay-dock-label]').textContent + ' ' + d.querySelector('[data-js=pay-dock-price]').textContent : null, dockNext: d && !d.hidden ? d.querySelector('[data-js=pay-dock-next]').innerText : null,
      title: s.querySelector('.room-rest__title')?.textContent || '', all: s.querySelector('[data-js=room-rest-all]')?.innerText || '', rooms: s.querySelectorAll('[data-js=room-rest-all] .room-rest__room').length, here: s.querySelector('.room-rest__room.is-here')?.dataset.room || '', next: s.querySelector('[data-js=room-rest-next]') ? s.querySelector('.room-rest__next').innerText : '',
      order: (() => { const R = s.querySelector('[data-js=room-rest]'), N = s.querySelector('[data-js=result-next-door]'), M = s.querySelector('.result-more'); return !!(R.compareDocumentPosition(N) & 4) && !!(N.compareDocumentPosition(M) & 4); })(), html: document.documentElement.outerHTML }; })()`);
  const stem = PUB.stems.find((x) => sj.verdict && x.verdict && sj.verdict.lines[0] === x.verdict.lines[0]);
  check("A1 만신 결과(결제 전): 판정(머리 한 줄·세 줄·맺음, 원국 판보다 위)이 이 사람 일간의 공개 문장", Boolean(sj.verdict && stem && sj.verdict.lines.length === 3 && sj.verdict.head.includes(stem.verdict.head) && sj.verdict.turn === stem.verdict.turn && sj.verdict.beforeBoard), JSON.stringify(sj.verdict));
  check("A2 (2026-10-27) 만신 = 작은 칸(겹침 전): locked · tier mini · '여기까지가 흔히 보던 사주예요.' · 직언 첫 마디 맛보기(이 일간의 것) + 흐린 두 줄 · 겹침 줄(첫 점술) · 잠긴 줄·궁합 카드·큰 결제 버튼 없음 · 작은 글자 링크에 지금 값 · [이미 샀어요]", r && r.state === "locked" && sj.tier === "mini" && /흔히 보던 사주/.test(sj.cut) && stem && sj.tease === paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.find((e) => e.code === stem.code).strike.lines[0]) && sj.blur === 2 && /첫 점술이 당신을/.test(sj.ov) && sj.locks.length === 0 && !sj.match && !sj.buy && sj.mini.includes(SALE.text + "원") && sj.have, JSON.stringify({ tier: sj.tier, ov: sj.ov, mini: sj.mini }));
  const sajuOpenTease = stem ? paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.find((e) => e.code === stem.code).strike.lines[0]) : "";
  check("A3 결제 전 만신 화면에 유료 원본 문장 0(맛보기 첫 마디만 예외) · 함수 book 요청 0", !sajuStrikeAll.filter((t) => t !== sajuOpenTease).some((t) => sj.html.includes(t)) && !b.log.bodies.slice(n0).some((x) => /\/api\/book/.test(x.url)));
  check("A4p (2026-10-28) 결과 카드 바로 아래(카카오 버튼 다음) 잠긴 한 대목: 직격 첫 마디 + 흐린 두 줄 + [이어서 펼치기] · 잠긴 칸보다 위", (await ev("(() => { const s = document.querySelector('.screen.is-active'); const p = s.querySelector('[data-js=room-peek]'); return !!p && p.previousElementSibling === s.querySelector('[data-js=share-kakao-slot]') && p.querySelectorAll('.strike__blur').length === 2 && !!p.querySelector('.room-peek__more') && !!(p.compareDocumentPosition(s.querySelector('[data-js=room-rest]')) & 4); })()")) && (await ev("document.querySelector('.screen.is-active .room-peek__line').textContent")) === sj.tease);
  check("A4 (2026-10-28 브랜드) 떠 있는 버튼 하나: 읽는 동안 = 다음 문 모습 [다음 문 / II 오검의 방 열기 →] (결제 모습 문구 한 권 전부 펼치기 · 지금 값은 같은 자리에 대기)", (await ev("document.querySelector('[data-js=pay-dock]').dataset.mode")) === "next" && /한 권 전부 펼치기/.test(sj.dock || "") && (sj.dock || "").includes(SALE.text + "원") && /다음 문/.test(sj.dockNext || "") && !/무료/.test(sj.dockNext || "") && /II 오검의 방 열기/.test(sj.dockNext || ""), `${sj.dock} | ${sj.dockNext}`);
  await ev("scrollTo(0, document.querySelector('.screen.is-active [data-js=room-rest]').getBoundingClientRect().top + scrollY - 300)");
  await sleep(600);
  check("A4b (2026-10-27) 작은 칸: 제목 '이 방의 나머지 이야기' · 일곱 방 줄 없음 · 칸에 들어서도 떠 있는 버튼은 결제 모습으로 안 바뀜 · 칸 안에 진짜 문 · 순서 = 잠긴 칸(문 포함) → 공유·다시 하기", sj.title === "이 방의 나머지 이야기" && sj.rooms === 0 && (await ev("document.querySelector('[data-js=pay-dock]').dataset.mode")) === "next" && !!(await ev("document.querySelector('.screen.is-active [data-js=room-rest-next] [data-js=result-next-door]')")) && sj.order, JSON.stringify({ title: sj.title, rooms: sj.rooms, order: sj.order }));
  // (2026-10-27) 큰 칸: 이 시험 상태(일곱 방)에서는 세 방째(베다)까지 원형이 겹치지 않아 베다가 큰 칸
  await skip("star-result");
  const bg = await ev("(() => { const x = document.querySelector('.screen.is-active [data-js=room-rest]'); return { tier: x.dataset.tier, title: x.querySelector('.room-rest__title').textContent, moment: x.querySelector('[data-js=room-rest-moment]')?.innerText || '', season: x.querySelector('[data-js=season]')?.innerText || '', buy: x.querySelector('[data-js=room-rest-buy]')?.textContent || '', match: !!x.querySelector('[data-js=room-rest-match]'), rooms: x.querySelectorAll('.room-rest__room').length, next: x.querySelector('.room-rest__next-text')?.textContent || '', seal: (() => { const w = x.querySelector('.room-rest__seal .wax-seal'); return !!w && getComputedStyle(w).opacity === '1' && w.getBoundingClientRect().width > 40; })(), owner: x.querySelector('.room-rest__owner')?.textContent || '' }; })()");
  check("A4d (2026-10-27) 큰 칸(첫 겹침 또는 세 방째): 제목 '일곱 점술이 같은 말을 한 곳, 다른 말을 한 곳' · 큰 머리말(문화 수) · 궁합 카드 · 일곱 방 줄 · 지금 값 결제 버튼 · 첫 계절이면 줄 그은 정가와 꼬리표 · '책은 나중에' + 다음 문 · (2026-10-28 브랜드) 봉인 + 주인 한 줄", bg.tier === "big" && /같은 말을 한 곳/.test(bg.title) && /문화가/.test(bg.moment) && bg.match && bg.rooms === 7 && bg.buy.includes(SALE.text + "원") && (!SALE.season || (bg.season.includes("9,900원") && /첫 계절/.test(bg.season))) && /그대로 열려 있어요/.test(bg.next) && bg.seal && /주인/.test(bg.owner), JSON.stringify(bg));
  await ev("scrollTo(0, document.querySelector('.screen.is-active [data-js=room-rest]').getBoundingClientRect().top + scrollY - 300)");
  await waitFor("document.querySelector('[data-js=pay-dock]').dataset.mode === 'pay'", 3000);
  const m1 = await ev("document.querySelector('[data-js=pay-dock]').dataset.mode");
  await ev("scrollTo(0, document.querySelector('.screen.is-active [data-js=room-rest-buy]').getBoundingClientRect().top + scrollY - 400)");
  await waitFor("document.querySelector('[data-js=pay-dock]').classList.contains('is-tucked')", 3000);
  const t1 = await ev("document.querySelector('[data-js=pay-dock]').classList.contains('is-tucked')");
  await ev("scrollTo(0, document.querySelector('.screen.is-active [data-js=result-next-door]').getBoundingClientRect().top + scrollY - 300)");
  await sleep(500);
  const t2 = await ev("document.querySelector('[data-js=pay-dock]').classList.contains('is-tucked')");
  check("A4c (2026-10-27) 잠긴 칸에 들어서면 같은 버튼이 결제 모습 · 칸 안 결제 버튼이 보이면 내려 숨김 · 진짜 문이 보여도 숨김", m1 === "pay" && t1 && t2, JSON.stringify({ m1, t1, t2 }));
  await ev("scrollTo(0, document.querySelector('.screen.is-active [data-js=room-rest]').getBoundingClientRect().top + scrollY - 300)");
  await waitFor("document.querySelector('[data-js=pay-dock]').dataset.mode === 'pay' && !document.querySelector('[data-js=pay-dock]').classList.contains('is-tucked')", 3000);
  // 떠 있는 버튼 → 결제 전 화면, 결제를 시작한 방 = saju. 다른 화면에서는 숨음
  await click("[data-js=pay-dock-btn]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await sleep(300);
  check("A5 떠 있는 버튼 → 결제 전 화면 · payroom=star · 결제 전 화면에서는 버튼 숨음 · 받는 것에 Ⅰ 만신의 방", (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === "star" && (await ev("document.querySelector('[data-js=pay-dock]').hidden")) && /만신의 방/.test(await ev("document.querySelector('.screen.is-active').textContent")) && (await ev("document.querySelectorAll('.screen.is-active [data-js=pay-quick-items] li').length")) === 3);
  const pz = await ev("(() => { const s = document.querySelector('.screen.is-active'); return { hi: s.querySelector('[data-js=pay-highlight]')?.textContent || '', safe: s.querySelector('[data-js=pay-safe]')?.textContent || '', subs: s.querySelectorAll('[data-js=pay-chapters] .pay-list__sub').length, items: s.querySelectorAll('[data-js=pay-chapters] li').length, hot: [...s.querySelectorAll('.pay-list__item--hot')].map((li) => li.firstElementChild.firstChild.textContent), safeAfterBuy: !!(s.querySelector('[data-js=pay-buy]').compareDocumentPosition(s.querySelector('[data-js=pay-safe]')) & 4) }; })()");
  check("A5b (2026-10-26) 결제 전 화면: 궁합 강조 카드 · 받는 것 13줄 모두 한 줄 설명 · 궁합 줄 강조 · 결제 버튼 아래 안심 한 줄", /궁합/.test(pz.hi) && pz.items === 13 && pz.subs === 13 && pz.hot.length === 1 && /궁합/.test(pz.hot[0]) && /구독 아님/.test(pz.safe) && pz.safeAfterBuy, JSON.stringify(pz));
  // 결제한 탭: 만신 바로 열림(직언이 장 맨 앞) · 떠 있는 버튼 없음
  const n0b = b.log.bodies.length;
  await skip("saju-result", 1);
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  const sajuReq = b.log.bodies.slice(n0b).filter((x) => /\/api\/book/.test(x.url));
  check("A6 만신(결제한 탭): 바로 open · Ⅱ~Ⅳ장·숨은 장 문단(빈 문단 0) · 요청 본문 = pass·file 두 칸, file=saju · 떠 있는 버튼 = 다음 문 모습(결제 모습 아님)", r && r.state === "open" && r.ps >= 8 && r.empty === 0 && sajuReq.length >= 1 && sajuReq.every((q) => Object.keys(JSON.parse(q.body)).sort().join() === "file,pass" && JSON.parse(q.body).pass.length > 0) && sajuReq.some((q) => JSON.parse(q.body).file === "saju") && (await ev("document.querySelector('[data-js=pay-dock]').dataset.mode === 'next'")), `${r && r.ps}문단 · ${sajuReq.map((x) => x.body.replace(/"pass":"[^"]*"/, '"pass":"…"')).join(" | ")}`);
  check("A6p (2026-10-28) 결제한 탭: 잠긴 한 대목 미리보기 없음", !(await ev("!!document.querySelector('.screen.is-active [data-js=room-peek]')")));

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
  check("B1 (2026-10-27) 오검 결과(결제 전, 아직 겹침 없음 → 작은 칸): locked · tier mini · 직격 맛보기 1줄 + 흐린 2줄 · 겹침 줄('두 방이 모두 다른 말') · 잠긴 줄·궁합 카드·큰 결제 버튼 없음 · 작은 글자 링크(지금 값)·[이미 샀어요] · 칸 안 다음 문", r && r.state === "locked" && (await ev("document.querySelector('.screen.is-active [data-js=room-rest]').dataset.tier")) === "mini" && (await ev("document.querySelectorAll('.screen.is-active [data-js=room-strike-tease] .strike__blur').length")) === 2 && /두 방이 모두 다른 말/.test(await ev("document.querySelector('.screen.is-active [data-js=room-rest-overlap]')?.textContent || ''")) && (await ev("!document.querySelector('.screen.is-active .room-rest__lock') && !document.querySelector('.screen.is-active [data-js=room-rest-match]') && !document.querySelector('.screen.is-active [data-js=room-rest-buy]') && !!document.querySelector('.screen.is-active [data-js=room-rest-have]') && !!document.querySelector('.screen.is-active [data-js=room-rest-next] [data-js=result-next-door]')")) && (await ev("document.querySelector('.screen.is-active [data-js=room-rest-buy-mini]')?.textContent || ''")).includes(SALE.text + "원"), r && r.state);
  const ogStrike = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full.flatMap((e) => e.strike.lines.concat(e.strike.turn)));
  check("B1b 오검(결제 전): 떠 있는 버튼 보임(한 권 전부 펼치기 · 다음 = 베다의 방) · 큰 카카오톡 버튼 1개 · 작은 카카오 글자 링크는 감춤", (await ev("(() => { const d = document.querySelector('[data-js=pay-dock]'); return !d.hidden && /한 권 전부 펼치기/.test(d.textContent) && /III 베다의 방 열기/.test(d.textContent); })()")) && (await ev("document.querySelectorAll('.screen.is-active .kakao-share .btn-kakao--share').length")) === 1 && (await ev("getComputedStyle(document.querySelector('.screen.is-active .result-more [data-js=share-kakao-slot]')).display")) === "none");
  const ogTease = await ev("document.querySelector('.screen.is-active [data-js=room-strike-tease] .strike__line')?.textContent || ''");
  const ogFirsts = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full.map((e) => e.strike.lines[0]));
  check("B2 결제 전 화면: 직격은 이 결과의 첫 마디 하나만 보임 · 나머지 직격·유료 문장 0 · 열린 직격 칸 없음 · 함수 book 요청 0", ogFirsts.includes(ogTease) && !ogStrike.filter((t) => t !== ogTease).some((t) => html.includes(t)) && !(await ev("!!document.querySelector('.screen.is-active [data-js=room-strike]')")) && !html.includes(ogLine.slice(0, 30)) && !b.log.bodies.slice(n1).some((x) => /\/api\/book/.test(x.url)), ogTease);
  await click(".screen.is-active [data-js=room-rest-have]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await sleep(300);
  check("B3 [이미 샀어요] → 결제 전 화면 · 코드 넣기 칸 펼침", (await ev("document.querySelector('.screen.is-active')?.id")) === "screen-deeper" && (await ev("document.querySelector('[data-js=pass-toggle]')?.getAttribute('aria-expanded')")) === "true");

  // 3. 오검에서 결제 → 가짜 페이앱 → 돌아오면 오검 결과로, 나머지가 바로 열림 + 코드 카드
  await skip("ogham-result");
  await click(".screen.is-active [data-js=room-rest-buy-mini]"); // (2026-10-27) 오검은 작은 칸 → 작은 글자 링크
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  check("C1 [지금 바로 전부 열기] → 결제 전 화면(받는 것·가격·환불 고지 먼저) · 방 이름만 sessionStorage", (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === "ogham");
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

  // 4b. (2026-10-27) 결제 없이 다음 방으로: 떠 있는 왼쪽 버튼 · 잠긴 칸 [다음 문 열기]
  await skip("saju-result");
  await ev("scrollTo(0, 1200)");
  await sleep(500);
  await click("[data-js=pay-dock-next]");
  await waitFor("/^screen-ogham-(intro|result)$/.test(document.querySelector('.screen.is-active')?.id || '')", 6000);
  check("F1 만신(결제 전) 떠 있는 [다음 방 · 무료] → 오검의 방(이미 지난 방이면 결과)", /^screen-ogham-(intro|result)$/.test(await ev("document.querySelector('.screen.is-active').id")));
  await skip("ogham-result");
  check("F2a (2026-10-27) 잠긴 칸의 갈림길 = 글자 버튼 없이 진짜 문(안내자 한마디 + 문 버튼) 하나 · 칸 밖에 문 없음", (await ev("(() => { const s = document.querySelector('.screen.is-active'); const doors = s.querySelectorAll('[data-js=result-next-door]'); return doors.length === 1 && !!doors[0].closest('[data-js=room-rest-next]') && !s.querySelector('.room-rest__next-btn'); })()")));
  await click(".screen.is-active [data-js=room-rest-next] [data-js=result-next-door]");
  await waitFor("/^screen-star-(intro|result)$/.test(document.querySelector('.screen.is-active')?.id || '')", 6000);
  check("F2 오검(결제 전) 잠긴 칸 안의 문 버튼 → 베다의 방(이미 지난 방이면 결과)", /^screen-star-(intro|result)$/.test(await ev("document.querySelector('.screen.is-active').id")));
  await skip("sibyl-result");
  await click("[data-js=pay-dock-next]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-finale'", 6000);
  check("F3 시빌라(결제 전) 떠 있는 [마지막 문 · 무료] → 마지막 화면", (await ev("document.querySelector('.screen.is-active').id")) === "screen-finale");

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
