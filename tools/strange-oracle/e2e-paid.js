// 6단계 유료 흐름 점검 (모의 결제, 헤드리스 Edge). 계정·키·네트워크 결제 없음.
// 7단계: 목차 7칸(방별 온전한 이야기), 리포트 rooms 파트(Ⅰ~Ⅵ 순서·주제 단락), 새 탭 재열람은 주제 단락 2개만 빠짐.
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
  const reportText = () => ev(`[...document.querySelectorAll('#screen-report [data-js=report-part]')].map(p => p.innerText).join('\\n')`);
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
    sessionStorage.setItem('strange-oracle', JSON.stringify({ started: true, profile: ${JSON.stringify(profile)}, visits: v }));
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
  check("off: 방 결과 글자 링크 6개 모두 숨김", await ev("[...document.querySelectorAll('[data-js=result-deeper]')].every(e => e.classList.contains('is-hidden'))"));
  await ev("StrangeOracle.go('deeper')");
  await sleep(500);
  check("off: #deeper로 직접 가도 허브로 돌아감", (await active()) === "screen-hub");
  check("off: 토스 SDK 요청 없음", !b.log.requests.some((r) => r.includes("tosspayments")));
  check("off: 마크업 견본 글자([초안] 영수증·목차 견본) 지워짐", (await txt("[data-js=receipt-code]")) === "" && (await txt("[data-js=deeper-total]")) === "" && (await ev("document.querySelectorAll('#screen-report .hidden-room').length")) === 0);

  // ═══ 2. mock: 진입점 ═══
  await b.goto(BASE);
  await seed(["ogham", "star", "decan", "tzolkin", "sibyl", "rune"], { name: ME.name, birth: { y: ME.y, m: ME.m, d: ME.d } });
  await b.goto(BASE);
  check("mock: 설정 받아 허브 유료 칸 보임", await waitFor("!document.querySelector('[data-js=hub-paid]').classList.contains('is-hidden')"));
  check("mock: 내 리포트 다시 보기(코드 없음) 숨김", await hidden("[data-js=hub-report]"));
  check("mock: 방 결과 글자 링크 6개 보임", await ev("[...document.querySelectorAll('[data-js=result-deeper]')].every(e => !e.classList.contains('is-hidden'))"));
  check("D-3 방 결과 유료 진입 = 글자 링크 1줄", await ev("[...document.querySelectorAll('[data-js=result-deeper]')].every(e => e.getBoundingClientRect().height === 0 || e.getClientRects().length <= 1)"));
  await ev("StrangeOracle.go('story')");
  await waitScreen("screen-story");
  check("mock: 유료 카드 is-on + 버튼 켜짐", (await ev("document.querySelector('[data-js=story-paid]').classList.contains('is-on')")) && !(await ev("document.querySelector('[data-js=story-paid-go]').disabled")));
  await click("[data-js=story-paid-go]");
  check("미리보기 화면", await waitScreen("screen-deeper"));
  await sleep(300);
  check("모의 결제 띠 보임", !(await hidden("#screen-deeper [data-js=pay-band]")) && (await txt("#screen-deeper [data-js=pay-band]")).includes(await ev("TEXT.pay.band.mock")));
  const toc = await ev("[...document.querySelectorAll('[data-js=deeper-toc-item]')].map(li => li.querySelector('[data-js=toc-name]').textContent + ' | ' + li.querySelector('[data-js=toc-vol]').textContent)");
  check("목차 7칸 채움(방별 온전한 이야기·숨은 장 모두 Ⅰ~Ⅵ 순서)", toc.length === 7 && toc[1].includes("오검·별·데칸·촐킨·룬·시빌라") && toc[2].includes("오검·별·데칸·촐킨·룬·시빌라") && !toc[1].includes("[초안] 방별 온전한 이야기 — {"), toc.join(" / "));
  check("결제 전 고지 받는 것에 방별 온전한 이야기", (await txt("[data-js=deeper-items]")).includes("방별 온전한 이야기"));
  check("봉인 칸에 글자 없음", await ev("[...document.querySelectorAll('.seal-lines')].every(e => e.textContent.trim() === '')"));
  check("견본 문단 3개", (await ev("document.querySelectorAll('[data-js=deeper-sample] p').length")) === 3);
  check("저장된 생년월일 확인 카드", !(await hidden("[data-js=deeper-saved]")) && (await hidden("[data-js=deeper-date-field]")));
  check("D-2 고지 블록 바로 뒤 = 결제 알림/버튼", await ev("(() => { const d = document.querySelector('#screen-deeper .disclosure'); const n = d.nextElementSibling; return n.dataset.js === 'pay-alert' && n.nextElementSibling.querySelector('[data-js=deeper-pay]') !== null && !d.closest('details'); })()"));
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
  check("리포트 본문 채움 (여는 글·숨은 장 6·구간 3·궁합·심층·닫는 글)", (await ev("document.querySelectorAll('[data-js=report-hidden] .hidden-room').length")) === 6 && (await ev("document.querySelectorAll('[data-js=report-timeline] > li').length")) === 3 && (await ev("document.querySelectorAll('[data-js=report-timeline] > li.is-now').length")) === 1 && (await ev("document.querySelector('[data-js=report-open]').children.length")) > 0 && (await ev("document.querySelector('[data-js=report-close]').children.length")) > 0);
  check("궁합 쌍 = 내 원형 × 상대 원형(이름 아님)", !(await txt("[data-js=report-match-pair]")).includes(PARTNER.name) && (await ev("document.querySelector('[data-js=report-match-pair]').children[2].textContent")) !== "");
  const fr = await ev(`[...document.querySelectorAll('[data-js=report-rooms] [data-js=full-room]')].map(el => ({ room: el.dataset.room, n: ['full-room-ch2','full-room-ch3','full-room-ch4'].map(k => el.querySelector('[data-js=' + k + ']').children.length), last: el.querySelector('[data-js=full-room-ch4]').lastElementChild.textContent }))`);
  check("7-4 방별 온전한 이야기: 6방, Ⅰ~Ⅵ 순서, 장마다 문단", fr.length === 6 && fr.map((x) => x.room).join() === "ogham,star,decan,tzolkin,rune,sibyl" && fr.every((x) => x.n.every((n) => n >= 2)), JSON.stringify(fr.map((x) => x.room + x.n.join("/"))));
  const lens = await ev("[TEXT.rune.topics[Object.keys(TEXT.rune.topics)[0]].lens, ORACLE_TOPICS[Object.keys(TEXT.sibyl.topics)[0]].lens]");
  check("7-4 룬·시빌라 IV장 끝 = 이 탭의 주제 단락", fr[4].last.startsWith(lens[0]) && fr[5].last.startsWith(lens[1]));
  check("7-4 방별 온전한 이야기 = 여는 글 바로 뒤", await ev("[...document.querySelectorAll('#screen-report [data-js=report-part]')].map(p => p.dataset.part).join() === 'open,rooms,hidden,timeline,match,deep,close'"));
  check("4장 근거 6줄 (코드로 조립)", (await ev("document.querySelectorAll('[data-js=report-evidence] li').length")) === 6);
  check("면책 문구", (await txt("#screen-report [data-js=disclaimer-slot]")).includes("재미로 보는 콘텐츠"));
  check("영수증 코드 4자 묶음 ×2곳", (await ev("document.querySelector('[data-js=receipt-code]').children.length")) === 8 && (await txt("[data-js=receipt-code]")) === receipt && (await txt("[data-js=receipt-code-end]")) === receipt);
  check("mock: 토스 영수증 링크 숨김(값 없음)", await hidden("[data-js=receipt-toss]"));
  check("리포트 견본 [초안] 없음 (틀 문구 외)", !(await ev("[...document.querySelectorAll('#screen-report .hidden-room [data-js=hidden-room-body], #screen-report [data-js=timeline-work]')].some(e => e.textContent.includes('(약 700자)') || e.textContent.includes('(약 150자)'))")));
  const metaN = Number((await txt("[data-js=report-meta]")).replace(/.*약\s*/, "").replace(/\D/g, ""));
  check("D-11 분량: 미리보기 예상 vs 받은 리포트 ±15%", metaN > 0 && Math.abs(expectTotal - metaN) / metaN <= 0.15, `예상 ${expectTotal} / 실제 ${metaN}`);
  const st2 = await storage();
  check("저장소: 영수증 코드만 추가, 유료 문구·상대 없음, localStorage·쿠키 0", st2.includes(receipt) && !st2.includes("[초안] 여는 글") && !st2.includes(PARTNER.name) && JSON.parse(st2).l === 0 && JSON.parse(st2).c === "", st2.slice(0, 160));
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
  await ev("StrangeOracle.go('hub')");
  await sleep(450);
  check("허브: 내 리포트 다시 보기 보임", !(await hidden("[data-js=hub-report]")));
  await click("[data-js=hub-report]");
  check("다시 보기 → 같은 리포트", (await waitScreen("screen-report", 6000)) && (await reportText()) === r1);
  await click("[data-js=receipt-forget]");
  await sleep(200);
  check("이 탭에서 코드 지우기", !(await storage()).includes(receipt));

  // ═══ 6. 새 탭(저장소 빈 상태)에서 영수증 코드로 열기 (D-8) ═══
  await ev("sessionStorage.clear()");
  await b.goto(BASE);
  // (7단계) 새 탭 = 인트로부터. 시작하면 Ⅰ 오검의 방 → 뒤로(허브)에서 영수증 코드 입력
  check("새 탭: 인트로부터", await waitScreen("screen-intro", 4000));
  await click("[data-js=intro-start]");
  await waitScreen("screen-ogham-intro", 4000);
  await click("[data-js=topbar-back]");
  await waitScreen("screen-hub", 4000);
  await waitFor("!document.querySelector('[data-js=hub-paid]').classList.contains('is-hidden')");
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

  // ═══ 8. 생년월일이 프로필에 없을 때: 입력은 계산에만, 저장하지 않음 / 방 1개·상대 없음 ═══
  await seed(["tzolkin"], {});
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
  check("궁합 지도 목차", (await ev("document.querySelectorAll('[data-js=deeper-toc-item]')[4].textContent")).includes(await ev("TEXT.archetypes[StrangeOracle.currentArchetype()].name")));
  await click("[data-js=deeper-pay]");
  check("방 1개·상대 없음 → 리포트", await waitScreen("screen-report", 12000));
  check("50세 이상 → 지나온 흐름 2구간 + 지금", (await ev("document.querySelectorAll('[data-js=report-timeline] > li').length")) === 3 && (await ev("document.querySelector('[data-js=report-timeline] > li:last-child').classList.contains('is-now')")));
  check("상대 없음 → 궁합 지도 8줄", (await ev("document.querySelectorAll('[data-js=report-match-rooms] li').length")) === 8);
  check("입력한 생일은 저장되지 않음", !(await storage()).includes("1961"));

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
