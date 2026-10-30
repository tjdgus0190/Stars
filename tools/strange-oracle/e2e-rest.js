// 22단계 e2e: 방 결과 아래 "이 방의 나머지 이야기"(결정 134). (2026-10-30 기획 v7) 결제 전 판매 칸 없음 · 오검 뒤 책 제안 한 번 · 완주 화면 책 칸. 모의 서버 test(가짜 페이앱), 실제 결제 0.
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

  // ═══ (2026-10-30 기획 v7) 방마다 되풀이하던 판매 칸은 없다. 결제 전 방 결과 = 무료 결과 + 다음 문. 책 제안은 오검 → 셋째 방으로 갈 때 한 번(book-offer)
  const skip = async (to, paid = 0, rooms = 7) => {
    await b.goto(`${TEST}/__dev/skip?rooms=${rooms}&to=${to}&paid=${paid}`);
    await waitFor(`document.querySelector('.screen.is-active')?.id === 'screen-${to}'`);
    await sleep(400);
  };
  const noSale = () => ev(`(() => { const s = document.querySelector('.screen.is-active'); const x = s.querySelector('[data-js=room-rest]'); const link = s.querySelector('[data-js=result-book-link]');
    return { box: !!x && !x.hidden, sale: s.querySelectorAll('[data-js=room-rest-buy], [data-js=room-rest-buy-mini], [data-js=room-rest-have], [data-js=room-strike-tease], .room-rest__lock, [data-js=room-rest-match], [data-js=room-rest-all]').length,
      link: !!link && !link.classList.contains('is-hidden') && getComputedStyle(link).display !== 'none', price: /\d,\d{3}원/.test(s.innerText), doorInBox: !!s.querySelector('[data-js=room-rest] [data-js=result-next-door]') }; })()`);
  const dockMode = () => ev("document.querySelector('[data-js=pay-dock]').dataset.mode");
  const offerOpen = () => ev("!!document.querySelector('[data-js=book-offer]')?.open");

  // 1. 만신(결제 전): 판정 + 무료 결과. 판매 칸·맛보기·가격·[이미 샀어요]·책 장 링크 없음, 함수 book 요청 0
  const PUB = (() => { const w = {}; new Function("window", fs.readFileSync(path.join(PAID, "..", "..", "..", "data-saju.js"), "utf8"))(w); return w.SAJU; })();
  const sajuStrikeAll = paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.flatMap((e) => e.strike.lines.concat(e.strike.turn)));
  const n0 = b.log.bodies.length;
  await skip("saju-result");
  let r;
  const sj = await ev(`(() => { const s = document.querySelector('.screen.is-active'); const v = s.querySelector('[data-js=saju-verdict]');
    return { verdict: v && !v.hidden ? { head: v.querySelector('[data-js=saju-verdict-head]').textContent, lines: [...v.querySelectorAll('.verdict__line')].map((x) => x.textContent), turn: v.querySelector('[data-js=saju-verdict-turn]').textContent, beforeBoard: !!(v.compareDocumentPosition(s.querySelector('[data-js=saju-board]')) & 4) } : null, html: document.documentElement.outerHTML }; })()`);
  const stem = PUB.stems.find((x) => sj.verdict && x.verdict && sj.verdict.lines[0] === x.verdict.lines[0]);
  check("A1 만신 결과(결제 전): 판정(머리 한 줄·세 줄·맺음, 원국 판보다 위)이 이 사람 일간의 공개 문장", Boolean(sj.verdict && stem && sj.verdict.lines.length === 3 && sj.verdict.head.includes(stem.verdict.head) && sj.verdict.turn === stem.verdict.turn && sj.verdict.beforeBoard), JSON.stringify(sj.verdict));
  let ns = await noSale();
  check("A2 (v7 작업 B) 만신(결제 전): 판매 칸 없음 · 맛보기·잠긴 줄·결제 버튼·[이미 샀어요] 0 · 가격 글자 0 · '책에서 이 장 펼치기' 숨김", !ns.box && ns.sale === 0 && !ns.price && !ns.link, JSON.stringify(ns));
  check("A3 결제 전 만신 화면에 유료 원본 문장 0(맛보기 예외 없음) · 함수 book 요청 0", !sajuStrikeAll.some((t) => sj.html.includes(t)) && !b.log.bodies.slice(n0).some((x) => /\/api\/book/.test(x.url)));
  check("A4p 결과 위 잠긴 한 대목 미리보기 없음 · 카카오톡·카드 저장·공유는 다음 문 뒤 맨 아래 묶음", await ev("(() => { const s = document.querySelector('.screen.is-active'); const end = s.querySelector('.result-share-end'); const pass = s.querySelector('[data-js=result-passage]'); return !s.querySelector('[data-js=room-peek]') && !!end && !!end.querySelector('[data-js=share-kakao-slot][data-variant=big]') && !!(pass.compareDocumentPosition(end) & 4); })()"));
  await ev("scrollTo(0, document.body.scrollHeight)");
  await sleep(600);
  check("A4 (v7) 떠 있는 버튼 = 다음 문 모습만(끝까지 내려도 결제 모습 안 됨) · [II 오검의 방 열기]", (await dockMode()) === "next" && /II 오검의 방 열기/.test(await ev("document.querySelector('[data-js=pay-dock-next]').innerText")));

  // 2. 오검(결제 전): 판매 칸 없음. 다음 문은 결과 아래 제자리
  const ogLine = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full[2].event.body[0]);
  const ogStrike = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full.flatMap((e) => e.strike.lines.concat(e.strike.turn)));
  const n1 = b.log.bodies.length;
  await skip("ogham-result", 0, 2);
  ns = await noSale();
  const html = await ev("document.documentElement.outerHTML");
  check("B1 (v7) 오검(결제 전): 판매 칸·큰 제안 칸 없음 · 가격 글자 0 · 다음 문은 칸 밖 제자리 하나", !ns.box && ns.sale === 0 && !ns.price && !ns.doorInBox && (await ev("document.querySelectorAll('.screen.is-active [data-js=result-next-door]').length")) === 1, JSON.stringify(ns));
  check("B2 결제 전 오검 화면에 유료 원본 문장 0 · 열린 직격 칸 없음 · 함수 book 요청 0", !ogStrike.some((t) => html.includes(t)) && !html.includes(ogLine.slice(0, 30)) && !(await ev("!!document.querySelector('.screen.is-active [data-js=room-strike]')")) && !b.log.bodies.slice(n1).some((x) => /\/api\/book/.test(x.url)));

  // 3. (v7 작업 D) 오검 → 셋째 방 문을 누르면 책 제안 한 번: 이름·받는 것·지금 값·무료로 계속. 자세히 보기 → 결제 → 오검 결과로 돌아와 나머지 open
  await ev("localStorage.removeItem('strange-oracle-offer')");
  await click(".screen.is-active [data-js=result-next-door]");
  await waitFor("!!document.querySelector('[data-js=book-offer]')?.open", 3000);
  const of = await ev("(() => { const d = document.querySelector('[data-js=book-offer]'); return { open: d.open, title: d.querySelector('.book-offer__title').textContent, items: d.querySelectorAll('.book-offer__list li').length, price: d.querySelector('[data-js=book-offer-price]').textContent, cont: d.querySelector('[data-js=book-offer-continue]').textContent, active: document.querySelector('.screen.is-active').id }; })()");
  check("C0 (v7) 오검 문 → 책 제안(셋째 방으로 넘어가기 전): 상품명 = 결제 화면 이름 · 받는 것 3줄 · 지금 값 · '무료로 베다의 방 계속 둘러보기'", of.open && of.title === (await ev("TEXT.pay.title")) && of.items === 3 && of.price.includes(SALE.text + "원") && /무료로 베다의 방/.test(of.cont) && of.active === "screen-ogham-result", JSON.stringify(of));
  await click("[data-js=book-offer-detail]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  check("C1 [자세히 보기] → 결제 전 화면 · 방 이름만 sessionStorage(payroom=ogham) · 제안은 닫힘", (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === "ogham" && !(await offerOpen()));
  check("C1b 결제 전 화면: 요약 3줄 · 받는 것 13줄 · 결제 버튼 아래 안심 한 줄", (await ev("document.querySelectorAll('.screen.is-active [data-js=pay-quick-items] li').length")) === 3 && (await ev("document.querySelectorAll('.screen.is-active [data-js=pay-chapters] li').length")) === 13 && /구독 아님/.test(await ev("document.querySelector('.screen.is-active [data-js=pay-safe]')?.textContent || ''")));
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); })()");
  await click("[data-js=pay-buy]");
  await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 8000);
  await ev("document.querySelector('[data-act=complete]').click()");
  const back = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ogham-result' && document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'", 30000);
  r = await rest();
  check("C2 결제 뒤 오검 결과로 돌아옴 · 나머지 이야기 open(빈 문단 0) · 코드 카드 열림", back && r && r.ps >= 8 && r.empty === 0 && (await ev("!!document.querySelector('[data-js=pay-code-dialog]')?.open")), r && `${r.state} ${r.ps}`);
  check("C3 펼친 글에 유료 문장 있음 · payroom 지워짐 · 산 사람에게는 '책에서 이 장 펼치기' 보임", (await ev("document.querySelector('.screen.is-active [data-js=room-rest]').innerText")).includes(ogLine.slice(0, 30)) && (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === null && (await noSale()).link);

  // 3b. 제안은 한 번만 · 산 사람에게는 없음 · 무료로 계속 = 바로 셋째 방
  await skip("ogham-result", 1, 2);
  await ev("localStorage.removeItem('strange-oracle-offer')");
  await click(".screen.is-active [data-js=result-next-door]");
  await waitFor("/^screen-star-(intro|result)$/.test(document.querySelector('.screen.is-active')?.id || '')", 6000);
  check("C4 결제한 탭: 오검 문 → 제안 없이 바로 베다의 방", !(await offerOpen()) && /^screen-star-intro$/.test(await ev("document.querySelector('.screen.is-active').id")));
  await skip("ogham-result", 0, 2);
  await ev("localStorage.removeItem('strange-oracle-offer')");
  await click(".screen.is-active [data-js=result-next-door]");
  await waitFor("!!document.querySelector('[data-js=book-offer]')?.open", 3000);
  await click("[data-js=book-offer-continue]");
  const went = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-star-intro'", 6000);
  await skip("ogham-result", 0, 2);
  await click(".screen.is-active [data-js=result-next-door]");
  await sleep(500);
  const again = await offerOpen();
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-star-intro'", 6000);
  check("C5 [무료로 계속] → 결제·로그인 없이 베다의 방 · 새로 고친 뒤 같은 길에서 제안 다시 안 뜸", went && !again && (await ev("document.querySelector('.screen.is-active').id")) === "screen-star-intro");

  // 4. 결제한 탭: 만신·룬·시빌라 바로 열림
  const n0b = b.log.bodies.length;
  await skip("saju-result", 1);
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  const sajuReq = b.log.bodies.slice(n0b).filter((x) => /\/api\/book/.test(x.url));
  check("A6 만신(결제한 탭): 바로 open · Ⅱ~Ⅳ장·숨은 장 문단(빈 문단 0) · 요청 본문 = pass·file 두 칸, file=saju · 떠 있는 버튼 = 다음 문 모습", r && r.state === "open" && r.ps >= 8 && r.empty === 0 && sajuReq.length >= 1 && sajuReq.every((q) => Object.keys(JSON.parse(q.body)).sort().join() === "file,pass" && JSON.parse(q.body).pass.length > 0) && sajuReq.some((q) => JSON.parse(q.body).file === "saju") && (await dockMode()) === "next", `${r && r.ps}문단`);
  const strikeOf = () => ev("(() => { const x = document.querySelector('.screen.is-active [data-js=room-strike]'); return x ? { lines: [...x.querySelectorAll('.strike__line')].map((p) => p.textContent), turn: x.querySelector('.strike__turn')?.textContent || '', first: /room-rest__(title|note)/.test((x.previousElementSibling || {}).className || '') } : null; })()");
  const sajuStrike = paidLine("book-saju.js", "BOOK_SAJU", (x) => x.full.map((e) => e.strike.lines[0]));
  let st = await strikeOf();
  check("A7 (24단계) 만신 펼침: 직격 세 마디 + 한 줄이 장 맨 앞 · 유료 원본 문장", st && st.lines.length === 3 && st.turn.length > 10 && st.first && sajuStrike.includes(st.lines[0]), st && st.lines[0]);
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

  // 4b. 결제 없이 다음 방으로 · (v7 작업 E) 완주 화면의 조용한 책 칸
  await skip("saju-result");
  await ev("scrollTo(0, 1200)");
  await sleep(500);
  await click("[data-js=pay-dock-next]");
  await waitFor("/^screen-ogham-(intro|result)$/.test(document.querySelector('.screen.is-active')?.id || '')", 6000);
  check("F1 만신(결제 전) 떠 있는 [다음 문] → 오검의 방(이미 지난 방이면 결과)", /^screen-ogham-(intro|result)$/.test(await ev("document.querySelector('.screen.is-active').id")));
  await skip("sibyl-result");
  ns = await noSale();
  check("F2 (v7) 시빌라(결제 전): 판매 칸·가격 없음", !ns.box && ns.sale === 0 && !ns.price, JSON.stringify(ns));
  await click("[data-js=pay-dock-next]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-finale'", 6000);
  const fb = await ev("(() => { const f = document.querySelector('[data-js=finale-book]'); return f ? { lead: f.querySelector('.finale-book__lead').textContent, btn: f.querySelector('[data-js=finale-book-go]').textContent, afterStory: !!(document.querySelector('[data-js=finale-go-story]').compareDocumentPosition(f) & 4) } : null; })()");
  check("F3 시빌라(결제 전) 떠 있는 [마지막 문] → 완주 화면 · 나의 이야기 버튼 아래 조용한 책 칸(강제 팝업 아님) · '상세 해석서 보기'", (await ev("document.querySelector('.screen.is-active').id")) === "screen-finale" && fb && /일곱 방을 모두 지나왔어요/.test(fb.lead) && fb.btn === "상세 해석서 보기" && fb.afterStory && !(await offerOpen()), JSON.stringify(fb));
  await skip("sibyl-result", 1);
  await click("[data-js=pay-dock-next]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-finale'", 6000);
  check("F4 결제한 탭 완주 화면: 책 칸 = '내 책 펴기'(결제 권유 문장 없음)", (await ev("document.querySelector('[data-js=finale-book-go]').textContent")) === "내 책 펴기" && (await ev("document.querySelector('.finale-book__lead').hidden")));

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
