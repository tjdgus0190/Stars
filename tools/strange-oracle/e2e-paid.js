// 6단계 유료 흐름 점검 (모의 결제, 헤드리스 Edge). 계정·키·네트워크 결제 없음.
// 결정 53: 책은 표지→쪽 넘기기(쪽 수·이전/다음·키·스와이프·목차 이동·이어 읽기 쪽 번호·다시 나누기·쪽 안 스크롤 없음).
// 8단계: 결제는 6/6에서만(미리보기 잠금·서버 400), 한 권의 책(제1부 여섯 방 Ⅰ~Ⅳ+숨은 장 · 제2부), 목차 시트·9칸 진행률·이어 읽기,
//        책 한 줄(방 안)·입구 책 카드, identity.close 책 제외(R-1), 새 탭 재열람은 주제 단락 2개만 빠짐.
// ※ mock-server는 시작할 때 api/_paid를 읽어 둔다 → _paid·build-dist를 바꿨으면 서버를 다시 켤 것
// 준비: node tools/build-dist.js
//       node tools/strange-oracle/mock-server.js --port 8787            (mock, dist 모양)
//       node tools/strange-oracle/mock-server.js --port 8788 --mode off (결제 꺼짐 비교용)
// 실행: node --experimental-websocket tools/strange-oracle/e2e-paid.js [reduced|motion]
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/ (스크린샷·소장 카드·결과 txt)
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const mode = process.argv[2] || "reduced";
const reduced = mode === "reduced";
const BASE = "http://127.0.0.1:8787/products/strange-oracle/index.html";
const OFF = "http://127.0.0.1:8788/products/strange-oracle/index.html";
const OUT = path.join(__dirname, "out");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
// 개인 입력값 (요청·저장소 어디에도 나오면 안 된다)
const ME = { name: "김서윤", y: 1995, m: 3, d: 21 };
const PARTNER = { name: "이하준", y: 1994, m: 11, d: 2 };
const PERSONAL = [ME.name, PARTNER.name, encodeURIComponent(ME.name), encodeURIComponent(PARTNER.name), "1995-03", "1994-11", "19950321", "19941102"];
const SIBYL_Q = "비밀질문XYZ";

(async () => {
  const b = await launch({ port: reduced ? 9611 : 9612, reduced, shimRaf: !reduced });
  const { evaluate: ev, shot, sleep } = b;
  const P = reduced ? "p6r-" : "p6m-";
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no el " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const active = () => ev(`document.querySelector('.screen.is-active')?.id`);
  const waitFor = async (expr, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(100); } return false; };
  const waitScreen = (id, ms) => waitFor(`document.querySelector('.screen.is-active')?.id === ${JSON.stringify(id)}`, ms);
  const hidden = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !e || e.classList.contains('is-hidden') || e.offsetParent === null; })()`);
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent || ''`);
  const setVal = (sel, v) => ev(`(() => { const i = document.querySelector(${JSON.stringify(sel)}); i.value = ${JSON.stringify(String(v))}; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const noHScroll = async (label) => { const w = await ev("[document.documentElement.scrollWidth, window.innerWidth]"); check(`360px 가로 넘침 없음 (${label})`, w[0] <= w[1], w.join("/")); };
  const storage = () => ev("JSON.stringify({ s: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)])), l: Object.keys(localStorage).length, c: document.cookie })");
  const hookCards = () => ev(`(() => { window.__cards = []; window.__opts = []; const r = ShareCard.render; ShareCard.render = (o) => { window.__opts.push(JSON.stringify(o)); return r(o); }; ShareCard.share = async (c) => { window.__cards.push(c.toDataURL('image/png')); return 'downloaded'; }; })()`);
  // (결정 53) 원본 book-source는 hidden → innerText 대신 단락·항목 단위 textContent로 읽는다
  const reportText = () => ev(`[...document.querySelectorAll('#screen-report [data-js=book-source] [data-js=report-part], #screen-report [data-js=book-source] [data-js=book-room]')].filter(p => !p.classList.contains('is-hidden')).map(p => [...p.querySelectorAll('p, dd, [data-js=match-room-text]')].map(x => x.textContent.trim()).filter(Boolean).join('\\n')).join('\\n')`);
  const seed = (visits, profile) => ev(`(() => {
    const V = ${JSON.stringify(visits)};
    const v = {};
    if (V.includes('rune')) v.rune = { picks: [RUNES[0].code, RUNES[5].code, RUNES[10].code], topic: Object.keys(TEXT.rune.topics)[0], archetype: RUNES[10].archetype };
    if (V.includes('star')) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: NAKSHATRAS[4].archetype };
    if (V.includes('ogham')) v.ogham = { ogham: 2, archetype: OGHAM[2].archetype };
    if (V.includes('decan')) v.decan = { decan: 10, when: null, archetype: DECANS[10].archetype };
    if (V.includes('tzolkin')) v.tzolkin = { number: 4, sign: 19, archetype: TZOLKIN_SIGNS[19].archetype };
    if (V.includes('sibyl')) v.sibyl = { sors: 12, topic: Object.keys(TEXT.sibyl.topics)[0], archetype: ORACLES[12].archetype };
    sessionStorage.clear();
    sessionStorage.setItem('strange-oracle', JSON.stringify({ profile: ${JSON.stringify(profile)}, visits: v }));
  })()`);

  // ═══ 1. 결제 꺼짐(PAY_MODE=off) — 무료판과 같아야 한다 (D-9) ═══
  await b.goto(OFF);
  await sleep(500);
  await seed(["ogham", "decan"], { name: ME.name, birth: { y: ME.y, m: ME.m, d: ME.d } });
  await b.goto(OFF + "#story");
  await sleep(700);
  check("off: 허브 유료 칸 숨김", await hidden("[data-js=hub-paid]"));
  check("off: 나의 이야기 유료 카드 = 곧 열려요, 버튼 잠김", (await ev("document.querySelector('[data-js=story-paid-go]').disabled")) && !(await ev("document.querySelector('[data-js=story-paid]').classList.contains('is-on')")) && (await txt("[data-js=story-paid-status]")) === (await ev("TEXT.story.paid.status")));
  check("off: 영수증 코드 입력 숨김", await hidden("[data-js=story-paid-reopen]"));
  check("off: 방 결과 책 한 줄 6개 모두 숨김", await ev("[...document.querySelectorAll('[data-js=result-book-line]')].length === 6 && [...document.querySelectorAll('[data-js=result-book-line]')].every(e => e.classList.contains('is-hidden'))"));
  await ev("StrangeOracle.go('deeper')");
  await sleep(500);
  check("off: #deeper로 직접 가도 허브로 돌아감", (await active()) === "screen-hub");
  check("off: 토스 SDK 요청 없음", !b.log.requests.some((r) => r.includes("tosspayments")));
  check("off: 마크업 견본 글자([초안] 영수증·목차 견본) 지워짐", (await txt("[data-js=receipt-code]")) === "" && (await txt("[data-js=deeper-total]")) === "" );

  // ═══ 2. mock: 6/6 전 = 미리보기만 (결제 버튼·동의 체크 없음) ═══
  await b.goto(BASE);
  await seed(["ogham", "star", "decan", "tzolkin", "rune"], { name: ME.name, birth: { y: ME.y, m: ME.m, d: ME.d } });
  await b.goto(BASE);
  check("mock: 설정 받아 입구 책 카드 보임", await waitFor("!document.querySelector('[data-js=hub-paid]').classList.contains('is-hidden')"));
  check("5/6 입구 책 카드 = locked, 핍 5칸", (await ev("document.querySelector('[data-js=hub-book]').dataset.state")) === "locked" && (await ev("document.querySelectorAll('[data-js=hub-book-lock] i.is-on').length")) === 5 && (await txt("[data-js=hub-book-hint]")).includes("5/6"));
  check("영수증 코드 입력 = 접힌 글자 링크(U9)", (await ev("document.querySelector('[data-js=receipt-toggle]').getAttribute('aria-expanded')")) === "false" && (await hidden("[data-js=hub-paid] [data-js=receipt-open]")));
  await b.goto(BASE + "#rune");
  await waitScreen("screen-rune-result");
  await waitFor("!document.querySelector('#screen-rune-result [data-js=result-book-line]').classList.contains('is-hidden')", 3000);
  check("5/6 방 책 한 줄 = locked 글자만(링크 없음)", (await ev("document.querySelector('#screen-rune-result [data-js=result-book-line]').dataset.state")) === "locked" && (await hidden("#screen-rune-result [data-js=result-book-link]")) && (await txt("#screen-rune-result [data-js=book-line-hook]")).length > 0);
  await click("[data-js=topbar-home]");
  await waitScreen("screen-hub");
  await click("[data-js=hub-book-go]");
  check("책 카드(locked) → 미리보기", await waitScreen("screen-deeper"));
  await sleep(300);
  check("6/6 전 미리보기: 잠금 블록 보임(5/6), 동의 체크·결제 버튼 없음", !(await hidden("[data-js=deeper-gate]")) && (await txt("[data-js=deeper-gate-count]")).includes("5/6") && (await hidden("[data-js=deeper-consent-row]")) && (await hidden("[data-js=deeper-pay-cta]")) && (await hidden("[data-js=deeper-pay]")));
  await click("[data-js=deeper-gate-next]");
  check("다음 문 열기 → Ⅵ 시빌라 시작", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-sibyl-intro' && document.querySelector('[data-js=sigil-rise]').classList.contains('is-hidden')", 4000));

  // ═══ 2b. 6/6: 진입점 ═══
  await seed(["ogham", "star", "decan", "tzolkin", "sibyl", "rune"], { name: ME.name, birth: { y: ME.y, m: ME.m, d: ME.d } });
  await b.goto(BASE);
  await waitFor("!document.querySelector('[data-js=hub-paid]').classList.contains('is-hidden')");
  check("6/6 입구 책 카드 = ready, 3,900원 버튼", (await ev("document.querySelector('[data-js=hub-book]').dataset.state")) === "ready" && (await txt("[data-js=hub-book-go]")).includes("3,900"));
  await b.goto(BASE + "#ogham");
  await waitScreen("screen-ogham-result");
  await waitFor("!document.querySelector('#screen-ogham-result [data-js=result-book-line]').classList.contains('is-hidden')", 3000);
  check("6/6 방 책 한 줄 = ready 링크", (await ev("document.querySelector('#screen-ogham-result [data-js=result-book-line]').dataset.state")) === "ready" && !(await hidden("#screen-ogham-result [data-js=result-book-link]")));
  await ev("StrangeOracle.go('story')");
  await waitScreen("screen-story");
  check("mock: 나의 이야기 유료 카드 is-on + 버튼 켜짐", (await ev("document.querySelector('[data-js=story-paid]').classList.contains('is-on')")) && !(await ev("document.querySelector('[data-js=story-paid-go]').disabled")));
  await click("[data-js=story-paid-go]");
  check("미리보기 화면", await waitScreen("screen-deeper"));
  await sleep(300);
  check("6/6 미리보기: 잠금 블록 숨김, 동의·결제 보임", (await hidden("[data-js=deeper-gate]")) && !(await hidden("[data-js=deeper-consent-row]")) && !(await hidden("[data-js=deeper-pay]")));
  check("모의 결제 띠 보임", !(await hidden("#screen-deeper [data-js=pay-band]")) && (await txt("#screen-deeper [data-js=pay-band]")).includes(await ev("TEXT.pay.band.mock")));
  const toc = await ev("[...document.querySelectorAll('[data-js=deeper-toc-item]')].map(li => li.querySelector('[data-js=toc-name]').textContent + ' | ' + li.querySelector('[data-js=toc-vol]').textContent)");
  check("목차 6칸 채움(여는 글·제1부·제2부 셋·닫는 글, 숨은 장 칸 없음)", toc.length === 6 && toc.every((x) => !x.includes("{")) && (await ev("document.querySelectorAll('[data-js=deeper-toc-item][data-part=hidden]').length")) === 0, toc.join(" / "));
  check("결제 전 고지: 핵심 풀이 포함·분량(새 문장) 표시", (await txt("[data-js=deeper-items]")).includes("핵심 풀이") && /만.*새 문장/.test(await txt("[data-js=deeper-volume]")), await txt("[data-js=deeper-volume]"));
  check("고지: 결제 시점의 여섯 결과로 엮임", (await ev("document.body.innerText.includes(TEXT.deeper.bookFix)")) && !(await ev("document.body.innerText.includes(TEXT.deeper.fixNote)")));
  check("봉인 칸에 글자 없음", await ev("[...document.querySelectorAll('.seal-lines')].every(e => e.textContent.trim() === '')"));
  check("견본 문단 3개", (await ev("document.querySelectorAll('[data-js=deeper-sample] p').length")) === 3);
  check("저장된 생년월일 확인 카드", !(await hidden("[data-js=deeper-saved]")) && (await hidden("[data-js=deeper-date-field]")));
  check("D-2 고지 블록 바로 뒤 = 결제 알림/버튼", await ev("(() => { const d = document.querySelector('#screen-deeper .disclosure'); const n = d.nextElementSibling; const gate = n.nextElementSibling; return n.dataset.js === 'pay-alert' && gate.dataset.js === 'deeper-gate' && gate.classList.contains('is-hidden') && gate.nextElementSibling.querySelector('[data-js=deeper-pay]') !== null && !d.closest('details'); })()"));
  check("결제 버튼: 동의 전 잠김", await ev("document.querySelector('[data-js=deeper-pay]').disabled"));
  const volNoPartner = await txt("[data-js=deeper-total]");
  // 상대: 이름만 → 오류
  await setVal("[data-js=deeper-partner-name]", PARTNER.name);
  await click("[data-js=deeper-consent]");
  check("동의 후 결제 버튼 켜짐", !(await ev("document.querySelector('[data-js=deeper-pay]').disabled")));
  await click("[data-js=deeper-pay]");
  await sleep(300);
  check("상대 입력 반쪽 → 오류, 이동 없음", !(await hidden("[data-js=deeper-partner-error]")) && (await active()) === "screen-deeper");
  await setVal("[data-js=deeper-partner-year]", PARTNER.y);
  await setVal("[data-js=deeper-partner-month]", PARTNER.m);
  await setVal("[data-js=deeper-partner-day]", PARTNER.d);
  const volPartner = await txt("[data-js=deeper-total]");
  check("상대 입력 → 목차·분량 갱신", volPartner !== volNoPartner && (await txt("[data-js=deeper-items]")).includes(await ev("TEXT.deeper.disclosure.itemsMatch.partner")), `${volNoPartner} → ${volPartner}`);
  const st1 = await storage();
  check("상대 정보가 저장소에 없음 (D-5)", !st1.includes(PARTNER.name) && !st1.includes(String(PARTNER.y)), st1.slice(0, 120));
  await noHScroll("미리보기");
  await shot(P + "01-deeper.png");
  check("D-12 광고 0 (미리보기·봉인 해제·리포트)", (await ev("document.querySelectorAll('#screen-deeper [data-js=ad-slot], #screen-unseal [data-js=ad-slot], #screen-report [data-js=ad-slot], #screen-deeper .ad-slot, #screen-report .ad-slot').length")) === 0);
  const expectTotal = Number(volPartner.replace(/\D/g, ""));
  await click("[data-js=deeper-pay]");

  // ═══ 3. 모의 결제 → successUrl → 봉인 해제 → 리포트 ═══
  check("successUrl로 돌아와 봉인 해제/리포트", await waitFor("location.search.includes('pay=success') && ['screen-unseal','screen-report'].includes(document.querySelector('.screen.is-active')?.id)", 8000));
  if (!reduced) { await sleep(800); await shot(P + "02-unseal-mid.png"); }
  check("리포트 화면", await waitScreen("screen-report", 9000));
  await hookCards();
  const url1 = await ev("location.href");
  const q = new URL(url1).searchParams;
  check("successUrl 주소 값 = pay·paymentKey·orderId·amount뿐", [...q.keys()].sort().join() === "amount,orderId,pay,paymentKey", [...q.keys()].join());
  const receipt = q.get("orderId");
  check("주문번호 모양 SO1 + 30자", /^SO1[0-9A-Z]{27}$/.test(receipt), receipt);
  const r1 = await reportText();
  check("책 본문 채움 (여는 글·구간 3·궁합·심층·닫는 글)", (await ev("document.querySelectorAll('[data-js=report-timeline] > li').length")) === 3 && (await ev("document.querySelectorAll('[data-js=report-timeline] > li.is-now').length")) === 1 && (await ev("document.querySelector('[data-js=report-open]').children.length")) > 0 && (await ev("document.querySelector('[data-js=report-close]').children.length")) > 0);
  check("궁합 쌍 = 내 원형 × 상대 원형(이름 아님)", !(await txt("[data-js=report-match-pair]")).includes(PARTNER.name) && (await ev("document.querySelector('[data-js=report-match-pair]').children[2].textContent")) !== "");
  const fr = await ev(`[...document.querySelectorAll('[data-js=book-room]')].filter(el => !el.classList.contains('is-hidden')).map(el => ({ room: el.dataset.room, n: ['book-ch1','book-ch2','book-ch3','book-ch4','book-hidden'].map(k => el.querySelector('[data-js=' + k + ']').children.length), last: el.querySelector('[data-js=book-ch4]').lastElementChild.textContent, head: el.querySelector('[data-js=book-room-result]').textContent }))`);
  check("책 제1부: 6방 Ⅰ~Ⅵ 순서, 방마다 Ⅰ~Ⅳ장 + 숨은 장 문단, 방 머리 채움", fr.length === 6 && fr.map((x) => x.room).join() === "ogham,star,decan,tzolkin,rune,sibyl" && fr.every((x) => x.n.every((n) => n >= 2) && x.head && !x.head.includes("[초안]")), JSON.stringify(fr.map((x) => x.room + x.n.join("/"))));
  const ch1 = await ev(`(() => { const e = OGHAM[2]; const t = document.querySelector('#book-ogham [data-js=book-ch1]').innerText; return t.startsWith(e.identity.lede) && e.identity.body.every(p => t.includes(p)); })()`);
  check("책 Ⅰ장 = 방에서 본 핵심 풀이(공개 data) + 서버 나머지", ch1);
  const lens = await ev("[TEXT.rune.topics[Object.keys(TEXT.rune.topics)[0]].lens, ORACLE_TOPICS[Object.keys(TEXT.sibyl.topics)[0]].lens]");
  check("룬·시빌라 IV장 끝 = 이 탭의 주제 단락", fr[4].last.startsWith(lens[0]) && fr[5].last.startsWith(lens[1]));
  check("책 순서: 여는 글 → 여섯 방 → 시기별 흐름·궁합·심층 → 닫는 글", await ev("[...document.querySelectorAll('#screen-report [data-js=report-part], #screen-report [data-js=book-room]')].map(p => p.dataset.part).join() === 'open,ogham,star,decan,tzolkin,rune,sibyl,timeline,match,deep,close'"));
  check("목차 9칸 + 읽는 시간 + 전체 분량", (await ev("[...document.querySelectorAll('[data-js=book-toc-item]')].filter(li => !li.classList.contains('is-hidden') && /\\d/.test(li.querySelector('[data-js=book-toc-time]').textContent)).length")) === 9 && /만/.test(await txt("[data-js=book-total]")), await txt("[data-js=book-total]"));
  // ── (결정 53) 책을 넘기는 리더: 표지 → 쪽 나누기 → 넘기기 · 목차 · 이어 읽기
  const cur = () => ev("(() => { const p = document.querySelector('[data-js=book-pages] [data-js=book-page].is-current'); return p ? Number(p.dataset.page) : 0; })()");
  const view = () => ev("document.querySelector('[data-js=book-reader]').dataset.view");
  const pageCount = () => ev("document.querySelectorAll('[data-js=book-pages] [data-js=book-page]').length");
  const overflowPages = () => ev("[...document.querySelectorAll('[data-js=book-pages] [data-js=book-page-body]')].filter(b => b.scrollHeight > b.clientHeight).map(b => b.parentElement.dataset.page)");
  const turnWait = reduced ? 60 : 900;
  await ev("document.fonts.ready.then(() => true)");
  await sleep(600); // 글꼴이 늦게 도착하면 한 번 다시 나눈다 (loadingdone → 150ms 디바운스)
  const nPages = await pageCount();
  check("상단: 입구 버튼·목차 버튼, 9칸 진행률 은퇴(마크업 0)", !(await hidden("[data-js=topbar-home]")) && !(await hidden("[data-js=book-toc-open]")) && (await ev("document.querySelectorAll('[data-js=read-progress-seg], [data-js=read-progress]').length")) === 0);
  check("표지부터(data-view=cover) · 마크업 견본 쪽 없음", (await view()) === "cover" && (await ev("document.querySelectorAll('[data-sample]').length")) === 0);
  const pagedMs = await ev("Number(document.querySelector('[data-js=book-reader]').dataset.pagedMs)");
  check("쪽 나누기: 쪽 수 > 1, 1초 안", nPages > 1 && pagedMs < 1000, `${nPages}쪽 · ${pagedMs}ms`);
  const ov = await overflowPages();
  check("모든 쪽 안쪽 스크롤 없음 (본문 scrollHeight <= clientHeight)", ov.length === 0, ov.join(","));
  const lost = await ev(`(() => { const n = (s) => s.replace(/\\s+/g, ''); const pg = n([...document.querySelectorAll('[data-js=book-pages] [data-js=book-page-body] p')].map(p => p.textContent).join('')); return [...document.querySelectorAll('[data-js=book-source] [data-js=book-room] [data-js^=book-] > p, [data-js=report-open] > p, [data-js=report-close] > p, [data-js^=report-deep-] > p')].filter(p => p.textContent.trim() && !pg.includes(n(p.textContent))).length; })()`);
  check("원본 단락이 쪽에 빠짐없이 (쪼갠 단락은 이어 붙여 대조)", lost === 0, `빠진 단락 ${lost}`);
  await click("[data-js=book-open-btn]");
  const box = await ev("(() => { const r = document.querySelector('[data-js=book-page].is-current [data-js=book-page-body]').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })()");
  check("책 펼치기 → 1쪽 면지(영수증 코드 카드)", (await view()) === "pages" && (await cur()) === 1 && (await ev("!!document.querySelector('[data-js=book-page].is-current [data-js=receipt-code]')")), `본문 상자 ${box}`);
  await shot(P + "03a-page1.png");
  await click("[data-js=book-next]");
  await sleep(turnWait);
  const pA = await cur();
  await click("[data-js=book-next]");
  await sleep(turnWait);
  const pB = await cur();
  await click("[data-js=book-prev]");
  await sleep(turnWait);
  const pC = await cur();
  check("다음·이전 버튼으로 쪽이 바뀜 (1→2→3→2)", pA === 2 && pB === 3 && pC === 2, `${pA},${pB},${pC}`);
  check("쪽 번호 'N / M' · aria-label · aria-live", (await txt("[data-js=book-page].is-current [data-js=book-page-folio]")).replace(/\s+/g, " ").trim() === `2 / ${nPages}` && (await ev("document.querySelector('[data-js=book-page].is-current').getAttribute('aria-label')")).includes(String(nPages)) && (await txt("[data-js=book-live]")).includes(String(nPages)));
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))");
  await sleep(turnWait);
  const pK = await cur();
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))");
  await sleep(turnWait);
  check("←/→ 키로 넘김", pK === 3 && (await cur()) === 2, `${pK},${await cur()}`);
  const swipe = (x0, y0, x1, y1) => ev(`(() => { const s = document.querySelector('[data-js=book-stage]'); s.dispatchEvent(new PointerEvent('pointerdown', { clientX: ${x0}, clientY: ${y0}, isPrimary: true, bubbles: true })); s.dispatchEvent(new PointerEvent('pointerup', { clientX: ${x1}, clientY: ${y1}, isPrimary: true, bubbles: true })); })()`);
  await swipe(250, 300, 240, 420); // 세로 움직임: 넘기지 않음
  await sleep(turnWait);
  const pV = await cur();
  await swipe(260, 300, 180, 310); // 왼쪽으로 80px → 다음
  await sleep(turnWait);
  const pS = await cur();
  await swipe(150, 300, 250, 300); // 오른쪽 → 이전
  await sleep(turnWait);
  check("스와이프: 가로 40px 이상만 넘김(세로는 그대로)", pV === 2 && pS === 3 && (await cur()) === 2, `${pV},${pS},${await cur()}`);
  if (reduced) {
    await ev("document.querySelector('[data-js=book-next]').click()");
    check("움직임 줄이기: turn class 없이 즉시 바뀜", (await cur()) === 3 && !(await ev("!!document.querySelector('.is-turn-next, .is-turn-prev, .is-under, [data-js=book-stage].is-turning')")));
  } else {
    await ev("document.querySelector('[data-js=book-next]').click(); document.querySelector('[data-js=book-next]').click()");
    const mid = await ev("document.querySelector('[data-js=book-stage]').classList.contains('is-turning') && !!document.querySelector('[data-js=book-page].is-turn-next') && !!document.querySelector('[data-js=book-page].is-under')");
    await sleep(260);
    await shot(P + "03b-turn-mid.png");
    await sleep(700);
    check("움직임: 넘기는 중 is-turning·is-turn-next·is-under, 연타는 1쪽만", mid && (await cur()) === 3 && !(await ev("!!document.querySelector('.is-turn-next, .is-under')")), String(await cur()));
  }
  await click("[data-js=book-toc-open]");
  check("목차 시트 열림(9항목 복제)", (await ev("document.querySelector('[data-js=book-toc-sheet]').open")) && (await ev("document.querySelectorAll('[data-js=book-toc-sheet-list] a').length")) === 9);
  await click("[data-js=book-toc-sheet-list] li[data-part=tzolkin] a");
  await sleep(150);
  const tzStart = Number((await txt("[data-js=book-pages] [data-js=book-toc-item][data-part=tzolkin] [data-js=book-toc-time]")).replace(/\D/g, ""));
  check("목차 시트 → 촐킨 방 첫 쪽으로 즉시 (시트 닫힘·해시 그대로·목차의 쪽 번호와 같음)", !(await ev("document.querySelector('[data-js=book-toc-sheet]').open")) && (await ev("document.querySelector('[data-js=book-page].is-current').dataset.room")) === "tzolkin" && (await ev("document.querySelector('[data-js=book-page].is-current').classList.contains('is-chapter-start')")) && (await cur()) === tzStart && (await ev("location.hash")) === "#report", `${await cur()} / 목차 ${tzStart}`);
  check("상단 라벨 'IV 촐킨의 방' · bookmark = 쪽 번호(숫자)만", (await txt("[data-js=read-label]")).includes("IV 촐킨의 방") && (await ev("sessionStorage.getItem('strange-oracle-bookmark')")) === String(tzStart), await txt("[data-js=read-label]"));
  check("목차 is-current = 촐킨", await ev("document.querySelector('[data-js=book-toc-item][data-part=tzolkin]').classList.contains('is-current')"));
  await shot(P + "03c-tzolkin.png");
  // 다시 나누기: 360×640으로 줄였다가 되돌려도 같은 장(촐킨)에 머묾
  await b.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  const n640 = await pageCount();
  const ov640 = await overflowPages();
  const room640 = await ev("document.querySelector('[data-js=book-page].is-current').dataset.room");
  await b.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  check("크기 바뀜 → 다시 나누고 같은 장 유지 (640: 쪽 수 늘고 넘침 없음)", n640 > nPages && ov640.length === 0 && room640 === "tzolkin" && (await ev("document.querySelector('[data-js=book-page].is-current').dataset.room")) === "tzolkin" && (await pageCount()) === nPages, `640 ${n640}쪽(${room640}) · 800 ${await pageCount()}/${nPages}쪽(${await ev("document.querySelector('[data-js=book-page].is-current').dataset.room")}) · 넘침 ${ov640.join(",")}`);
  await ev("document.querySelector('[data-js=book-pages] [data-js=book-toc-item][data-part=flow] a').click()");
  await sleep(150);
  check("목차 쪽 링크 → 제2부 표제지", (await ev("document.querySelector('[data-js=book-page].is-current').dataset.part")) === "flow" && (await ev("document.querySelector('[data-js=book-page].is-current').classList.contains('is-chapter-start')")));
  // R-1: identity.close(방 화면 맺음 문장)는 책에 넣지 않는다
  await ev("OGHAM[2].identity.close = '맺음문장XCLOSE'");
  await click("[data-js=topbar-home]");
  await waitScreen("screen-hub");
  check("결제 뒤 입구 책 카드 = owned", (await ev("document.querySelector('[data-js=hub-book]').dataset.state")) === "owned");
  await click("[data-js=hub-book-go]");
  await waitScreen("screen-report", 6000);
  check("R-1: 책 조립에 identity.close 없음", !(await reportText()).includes("XCLOSE"));
  const bm = Number(await ev("sessionStorage.getItem('strange-oracle-bookmark')"));
  check("같은 탭에서 다시 열면 표지 + 이어 읽기 줄(부 이름·쪽 번호)", (await view()) === "cover" && !(await hidden("[data-js=book-resume]")) && (await txt("[data-js=book-resume-name]")).length > 0 && (await txt("[data-js=book-resume-page]")) === String(bm), `${await txt("[data-js=book-resume-name]")} · ${bm}`);
  await click("[data-js=book-resume]");
  check("이어 읽기 → 저장된 쪽 복원", bm > 1 && (await view()) === "pages" && (await cur()) === bm, `${await cur()} / ${bm}`);
  await ev("StrangeOracle.renderOgham({ ogham: 2 }); StrangeOracle.go('ogham-result')");
  await waitScreen("screen-ogham-result");
  check("R-1: 방 화면에는 맺음 문장 칸이 보임", (await txt("#screen-ogham-result [data-js=reading-close]")).includes("XCLOSE") && !(await hidden("#screen-ogham-result [data-js=reading-close]")));
  await ev("delete OGHAM[2].identity.close");
  check("결제 뒤 방 책 한 줄 = owned '내 책에서 이 방 펼치기'", (await ev("document.querySelector('#screen-ogham-result [data-js=result-book-line]').dataset.state")) === "owned");
  await click("#screen-ogham-result [data-js=result-book-link]");
  await waitScreen("screen-report", 6000);
  await sleep(150);
  check("→ 책 속 오검 방 첫 쪽으로 바로 펼침", (await view()) === "pages" && (await ev("document.querySelector('[data-js=book-page].is-current').dataset.room")) === "ogham" && (await ev("document.querySelector('[data-js=book-page].is-current').classList.contains('is-chapter-start')")), String(await cur()));
  await ev("window.scrollTo(0, 0)");
  check("4장 근거 6줄 (코드로 조립)", (await ev("document.querySelectorAll('[data-js=report-evidence] li').length")) === 6);
  check("면책 문구", (await txt("#screen-report [data-js=disclaimer-slot]")).includes("재미로 보는 콘텐츠"));
  check("영수증 코드 4자 묶음 ×2곳", (await ev("document.querySelector('[data-js=receipt-code]').children.length")) === 8 && (await txt("[data-js=receipt-code]")) === receipt && (await txt("[data-js=receipt-code-end]")) === receipt);
  check("mock: 토스 영수증 링크 숨김(값 없음)", await hidden("[data-js=receipt-toss]"));
  check("책 견본 자리표시 남지 않음(방 머리·본문)", !(await ev("[...document.querySelectorAll('#screen-report [data-js=book-room-result], #screen-report [data-js=book-room-key], #screen-report [data-js=book-ch1], #screen-report [data-js=book-ch2], #screen-report [data-js=book-hidden]')].some(e => e.textContent.includes('[초안]'))")));
  const metaN = Number((await txt("[data-js=report-meta]")).replace(/.*약\s*/, "").replace(/\D/g, ""));
  check("D-11 분량: 미리보기 예상 vs 받은 리포트 ±15%", metaN > 0 && Math.abs(expectTotal - metaN) / metaN <= 0.15, `예상 ${expectTotal} / 실제 ${metaN}`);
  const st2 = await storage();
  check("저장소: 영수증 코드·bookmark(쪽 번호)만 추가, 유료 문구·상대 없음, localStorage·쿠키 0", st2.includes(receipt) && Object.keys(JSON.parse(st2).s).sort().join() === "strange-oracle,strange-oracle-bookmark,strange-oracle-receipt" && /^\d+$/.test(JSON.parse(st2).s["strange-oracle-bookmark"] || "") && !st2.includes(PARTNER.name) && JSON.parse(st2).l === 0 && JSON.parse(st2).c === "", Object.keys(JSON.parse(st2).s).join() + " " + JSON.parse(st2).s["strange-oracle-bookmark"]);
  await noHScroll("리포트");
  await shot(P + "03-report-top.png");
  await click("[data-js=report-share]");
  await waitFor("window.__cards.length > 0", 8000);
  const cardUrl = await ev("window.__cards[0] || ''");
  if (cardUrl) fs.writeFileSync(path.join(OUT, P + "keepsake.png"), Buffer.from(cardUrl.split(",")[1], "base64"));
  const cardOpts = await ev("window.__opts[0] || ''");
  check("소장 카드 생성 (keepsake 틀)", cardUrl.length > 1000 && cardOpts.includes('"frame":"keepsake"'));
  check("소장 카드에 이름·생일·영수증 코드 없음", !cardOpts.includes(ME.name) && !cardOpts.includes(PARTNER.name) && !cardOpts.includes(receipt) && !cardOpts.includes("1995"));

  // ═══ 4. 새로고침 = 같은 리포트 (멱등, D-6) ═══
  await b.goto(url1);
  check("새로고침 → 다시 리포트 (오류 화면 아님)", await waitScreen("screen-report", 9000));
  check("새로고침 후 같은 본문", (await reportText()) === r1);

  // ═══ 5. 리포트를 떠나면 주소 정리, 허브 "내 리포트 다시 보기" ═══
  await click("[data-js=report-go-story]");
  await waitScreen("screen-story");
  check("리포트를 떠나면 주소에서 결제 값 지움", (await ev("location.search")) === "");
  check("나의 이야기 카드 is-owned", await ev("document.querySelector('[data-js=story-paid]').classList.contains('is-owned')"));
  await click("[data-js=topbar-home]");
  await waitScreen("screen-hub");
  await click("[data-js=hub-book-go]");
  check("입구 '내 책 다시 펴기' → 같은 책", (await waitScreen("screen-report", 6000)) && (await reportText()) === r1);
  await click("[data-js=receipt-forget]");
  await sleep(200);
  check("이 탭에서 코드 지우기(bookmark도)", !(await storage()).includes(receipt) && !(await storage()).includes("strange-oracle-bookmark"));

  // ═══ 6. 새 탭(저장소 빈 상태)에서 영수증 코드로 열기 (D-8) ═══
  await ev("sessionStorage.clear()");
  await b.goto(BASE);
  // (8단계) 새 탭 = 입구부터. 접힌 "영수증 코드가 있어요"를 펼쳐 입력
  check("새 탭: 입구부터(인트로 없음)", await waitScreen("screen-hub", 4000));
  await waitFor("!document.querySelector('[data-js=hub-paid]').classList.contains('is-hidden')");
  await click("[data-js=receipt-toggle]");
  check("영수증 링크 펼침 → 입력칸", (await ev("document.querySelector('[data-js=receipt-toggle]').getAttribute('aria-expanded')")) === "true" && !(await hidden("#receipt-open-hub")));
  await setVal("#receipt-open-hub", "SO1-HELLO");
  await click("[data-js=hub-paid] [data-js=receipt-open-go]");
  await sleep(200);
  check("잘못된 코드 → 모양 오류(서버에 묻지 않음)", !(await hidden("[data-js=hub-paid] [data-js=receipt-open-error]")) && !b.log.requests.some((r) => r.includes("HELLO")));
  const pretty = receipt.match(/.{1,4}/g).join("-").toLowerCase();
  await setVal("#receipt-open-hub", pretty);
  await click("[data-js=hub-paid] [data-js=receipt-open-go]");
  const reopened = (await waitScreen("screen-report", 6000)) ? await reportText() : "";
  // 주제(룬·시빌라)는 영수증 코드에 없어서, 이 탭에 결과가 없으면 IV장 끝 주제 단락 2개만 빠진다
  const l1 = r1.split("\n"), l3 = reopened.split("\n");
  const missing = l1.filter((x) => !l3.includes(x));
  check("영수증 코드만으로 같은 리포트 (이름·생일 없음, 주제 단락 2개만 빠짐)", l3.length > 10 && l3.every((x) => l1.includes(x)) && missing.length === 2 && missing[0].startsWith(lens[0]) && missing[1].startsWith(lens[1]), `빠진 줄 ${missing.length}`);
  await shot(P + "04-reopen.png");

  // ═══ 7. 실패·취소로 돌아옴 ═══
  await b.goto(BASE + "?pay=fail&code=PAY_PROCESS_CANCELED&message=%EC%B7%A8%EC%86%8C&orderId=" + receipt);
  check("failUrl → 미리보기 + 실패 알림", (await waitScreen("screen-deeper", 6000)) && !(await hidden("[data-js=pay-alert]")));
  check("오류 코드·메시지를 화면에 보이지 않음", !(await ev("document.body.innerText.includes('PAY_PROCESS_CANCELED')")));
  check("failUrl 값 주소에서 지움", (await ev("location.search")) === "");
  await shot(P + "05-fail.png");

  // ═══ 8. 생년월일이 프로필에 없을 때: 입력은 계산에만, 저장하지 않음 / 상대 없음 ═══
  await seed(["ogham", "star", "decan", "tzolkin", "sibyl", "rune"], {});
  await b.goto(BASE + "#story");
  await waitFor("document.querySelector('[data-js=story-paid]').classList.contains('is-on')");
  await click("[data-js=story-paid-go]");
  await waitScreen("screen-deeper");
  check("프로필에 생일 없음 → 입력칸", !(await hidden("[data-js=deeper-date-field]")));
  await click("[data-js=deeper-consent]");
  await click("[data-js=deeper-pay]");
  await sleep(200);
  check("생일 비움 → 오류", !(await hidden("[data-js=deeper-date-error]")) && (await active()) === "screen-deeper");
  await setVal("[data-js=deeper-year]", 1961);
  await setVal("[data-js=deeper-month]", 1);
  await setVal("[data-js=deeper-day]", 5);
  check("궁합 지도 목차", (await ev("document.querySelector('[data-js=deeper-toc-item][data-part=match]').textContent")).includes(await ev("TEXT.archetypes[StrangeOracle.currentArchetype()].name")));
  await click("[data-js=deeper-pay]");
  check("상대 없음 → 책", await waitScreen("screen-report", 12000));
  check("50세 이상 → 지나온 흐름 2구간 + 지금", (await ev("document.querySelectorAll('[data-js=report-timeline] > li').length")) === 3 && (await ev("document.querySelector('[data-js=report-timeline] > li:last-child').classList.contains('is-now')")));
  check("상대 없음 → 궁합 지도 8줄", (await ev("document.querySelectorAll('[data-js=report-match-rooms] li').length")) === 8);
  check("입력한 생일은 저장되지 않음", !(await storage()).includes("1961"));
  // 서버: 6방 미만 주문번호로 승인 요청 → 토스 부르기 전 400 (브라우저 버튼을 우회해도)
  const PayCode = require(path.join(__dirname, "..", "..", "products", "strange-oracle", "paycode.js"));
  const five = (await fetch("http://127.0.0.1:8787/api/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentKey: "mock_zz", orderId: PayCode.encode({ rune: null, star: 1, ogham: 2, decan: 3, tzolkin: { number: 1, sign: 2 }, sibyl: 4, arch: "sage", band: 1, partner: null, relOgham: null, relDecan: null, relTzolkin: null }), amount: 3900 }) })).status;
  check("서버: 6방 미만 주문번호 confirm → 400 (버튼을 우회해도, Node에서 직접)", five === 400, String(five));

  // ═══ 9. 네트워크 기록 점검 (D-5) ═══
  const api = b.log.bodies.filter((x) => x.url.includes("/api/"));
  check("API 요청 = config·confirm·report뿐", api.every((x) => /\/api\/(config|confirm|report)$/.test(new URL(x.url).pathname)), [...new Set(api.map((x) => new URL(x.url).pathname))].join(","));
  const bad = api.filter((x) => {
    if (!x.body) return false;
    const o = JSON.parse(x.body);
    const keys = Object.keys(o).sort().join();
    return !(keys === "amount,orderId,paymentKey" || keys === "receipt");
  });
  check("요청 본문 키 = {paymentKey, orderId, amount} 또는 {receipt}", bad.length === 0, bad.map((x) => x.body).join(" | "));
  const all = b.log.bodies.map((x) => x.url + " " + x.body).join("\n");
  check("모든 요청 주소·본문에 이름·생년월일·상대·질문 없음", !PERSONAL.some((s) => all.includes(s)) && !all.includes(SIBYL_Q));
  check("mock: 토스 SDK·토스 API 요청 없음", !b.log.requests.some((r) => r.includes("tosspayments")));
  const ext = b.log.requests.filter((r) => !r.includes("127.0.0.1:") && !r.includes("cdn.jsdelivr.net") && !r.startsWith("GET data:") && !r.startsWith("GET blob:") && !r.includes("about:blank"));
  check("외부 요청 = jsdelivr뿐", ext.length === 0, ext.join(" | "));
  check("콘솔 오류 없음", b.log.errors.length === 0, b.log.errors.join(" | "));

  fs.writeFileSync(path.join(OUT, P + "result.txt"), out.join("\n") + "\n\n요청 기록(본문):\n" + b.log.bodies.filter((x) => x.body || x.url.includes("/api/")).map((x) => `${x.url} ${x.body}`).join("\n"));
  const fails = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fails} PASS / ${fails} FAIL`);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log(out.join("\n")); console.error("CRASH", e); process.exit(1); });
