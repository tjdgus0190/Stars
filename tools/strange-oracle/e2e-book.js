// 13단계 E3: 광고로 여는 책 e2e (옛 e2e-paid.js 대체 — 결제 흐름은 은퇴). 헤드리스 Edge, 정적 배포 폴더.
// 구글 주소 요청은 CDP Fetch로 가로채 가짜 스크립트로 답한다(실제 구글 요청 0건). 시험용 ID는 페이지가 뜰 때 window.TEXT에 끼워 넣는다.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode off
// 실행: node --experimental-websocket tools/strange-oracle/e2e-book.js
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/e2e-book.txt (+ out/book-variety-e2e.txt)
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const BASE = "http://127.0.0.1:8788/products/strange-oracle/index.html";
const OUT = path.join(__dirname, "out");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const ORDER = ["ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const NAME = "김서윤";
const PROFILE = { name: NAME, birth: { y: 1995, m: 3, d: 25 }, time: { h: 14, min: 37 } };
const PARTNER = { name: "박도현", y: "1993", m: "11", d: "7" };
const TYPES = ["lover", "friend", "work", "family"];

const inject = (lockAlways, ids) => `(function () {
  var v;
  Object.defineProperty(window, "TEXT", { configurable: true, get: function () { return v; }, set: function (x) {
    ${ids ? `x.analytics.ga4 = "G-TEST12345"; x.ads.adsenseClient = "ca-pub-1234567890123456"; x.ads.rewardedUnit = "/1234567/so_unlock";
    x.ads.slots.hub.id = "1234567890"; x.ads.slots["result-end"].id = "2234567890"; x.ads.slots["story-end"].id = "3234567890"; x.ads.slots["book-toc"].id = "4234567890";` : ""}
    x.ads.lockAlways = ${lockAlways}; v = x; } });
  window.__gptMode = "granted"; window.__adsMode = "filled";
  var dl;
  Object.defineProperty(window, "dataLayer", { configurable: true, get: function () { return dl; }, set: function (a) {
    var push = a.push.bind(a);
    a.push = function (x) { try { console.debug("__DL " + JSON.stringify([].slice.call(x))); } catch (e) {} return push(x); };
    dl = a; } });
})();`;
const STUB_GPT = `(function () {
  var calls = (window.__gcalls = window.__gcalls || []);
  var handlers = (window.__gh = window.__gh || {});
  var q = (window.googletag && window.googletag.cmd) || [];
  var g = (window.googletag = window.googletag || {});
  g.enums = { OutOfPageFormat: { REWARDED: 4 } };
  g.pubads = function () { return { addEventListener: function (n, h) { (handlers[n] = handlers[n] || []).push(h); } }; };
  g.defineOutOfPageSlot = function () { calls.push(["define"].concat([].slice.call(arguments))); return window.__gptMode === "null" ? null : { addService: function () { return this; } }; };
  g.enableServices = function () {}; g.destroySlots = function () {};
  g.display = function (s) {
    var mode = window.__gptMode;
    var fire = function (n, ev) { ev.slot = s; (handlers[n] || []).forEach(function (h) { h(ev); }); };
    setTimeout(function () {
      if (mode === "empty") return fire("slotRenderEnded", { isEmpty: true });
      fire("rewardedSlotReady", { makeRewardedVisible: function () {} });
      setTimeout(function () { if (mode === "granted") fire("rewardedSlotGranted", {}); fire("rewardedSlotClosed", {}); }, 50);
    }, 50);
  };
  g.cmd = { push: function (f) { f(); } };
  [].slice.call(q).forEach(function (f) { f(); });
})();`;
const STUB_ADS = `(function () {
  function proc() { document.querySelectorAll("ins.adsbygoogle:not([data-ad-status])").forEach(function (ins) {
    ins.setAttribute("data-ad-status", "filled"); ins.style.height = "100px"; ins.style.background = "#999"; }); }
  window.adsbygoogle = { push: proc }; proc();
})();`;

(async () => {
  const b = await launch({ port: 9619, reduced: true });
  const { evaluate: ev, sleep, send } = b;
  const ext = [];
  b.on(async (m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId, request } = m.params;
    ext.push({ url: request.url, body: request.postData || "" });
    const body = /gpt\.js/.test(request.url) ? STUB_GPT : /adsbygoogle\.js/.test(request.url) ? STUB_ADS : "/* stub */";
    send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/javascript" }, { name: "Access-Control-Allow-Origin", value: "*" }], body: Buffer.from(body).toString("base64") });
  });
  await send("Fetch.enable", { patterns: ["*googlesyndication.com*", "*doubleclick.net*", "*googletagmanager.com*", "*google-analytics.com*", "*googleadservices.com*", "*adtrafficquality.google*"].map((urlPattern) => ({ urlPattern })) });
  const waitFor = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(40); } return false; };
  const active = () => ev("document.querySelector('.screen.is-active')?.id");
  const view = () => ev("document.querySelector('[data-js=book-reader]').dataset.view");
  const coverState = () => ev("document.querySelector('[data-js=chapter-cover]').dataset.state");
  const rows = () => ev("Object.fromEntries([...document.querySelectorAll('[data-js=book-chapter]')].map(li => [li.dataset.chapter, li.dataset.state]))");
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const row = (id) => click(`[data-js=book-chapter][data-chapter=${id}] [data-js=book-chapter-btn]`);
  const seed = (rooms, profile = PROFILE) => ev(`(() => {
    const R = ${JSON.stringify(rooms)}, v = {};
    if (R.includes('ogham')) v.ogham = { ogham: 2, archetype: OGHAM[2].archetype };
    if (R.includes('star')) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: NAKSHATRAS[4].archetype };
    if (R.includes('decan')) v.decan = { decan: 10, when: null, archetype: DECANS[10].archetype };
    if (R.includes('tzolkin')) v.tzolkin = { number: 4, sign: 19, archetype: TZOLKIN_SIGNS[19].archetype };
    if (R.includes('rune')) v.rune = { picks: [RUNES[0].code, RUNES[5].code, RUNES[10].code], topic: 'me', archetype: RUNES[10].archetype };
    if (R.includes('sibyl')) v.sibyl = { sors: 12, topic: 'love', archetype: ORACLES[12].archetype };
    sessionStorage.setItem('strange-oracle', JSON.stringify({ profile: ${JSON.stringify(profile)}, visits: v }));
  })()`);
  const fresh = async (rooms, hash = "#report", profile) => {
    await b.goto(BASE);
    await ev("sessionStorage.clear()");
    await seed(rooms, profile);
    await b.goto(BASE + hash);
    await waitFor(`document.querySelector('.screen.is-active')?.id === 'screen-${hash === "#report" ? "report" : hash.slice(1)}'`);
  };
  const fillMatch = (type) => ev(`(() => {
    const s = (k, v) => { const el = document.querySelector('[data-js=' + k + ']'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    s('book-match-name', ${JSON.stringify(PARTNER.name)}); s('book-match-year', ${JSON.stringify(PARTNER.y)}); s('book-match-month', ${JSON.stringify(PARTNER.m)}); s('book-match-day', ${JSON.stringify(PARTNER.d)});
    document.querySelectorAll('[data-js=book-match-type-input]').forEach(x => (x.checked = false)); const r =${type ? `document.querySelector('[data-js=book-match-type-input][value=${type}]')` : "null"}; if (r) r.checked = true; return true; })()`);
  const pageText = () => ev("[...document.querySelectorAll('[data-js=book-page]')].map(p => p.querySelector('.book-page__body').textContent).join('\\n')");
  const toPages = () => waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'pages'", 6000);

  // ═══ A. 기본 설정 (ID 없음, lockAlways true → 누르면 광고 없음 안내와 함께 바로 열림) ═══
  // 1. 첫 화면
  await b.goto(BASE);
  await ev("sessionStorage.clear()");
  const nReq0 = b.log.requests.length;
  await b.goto(BASE);
  await sleep(300);
  const firstReq = b.log.requests.slice(nReq0);
  check("13-7.1 첫 화면: data-book-*.js·/api/ 요청 0건, pay.json 요청 0", !firstReq.some((r) => /data-book-|\/api\/|pay\.json/.test(r)), firstReq.filter((r) => /data-book-|\/api\//.test(r)).join(" "));
  check("13-7.10 첫 화면 소스: 가격·토스·결제 화면 0, 은퇴 화면 없음", await ev("(() => { const h = document.documentElement.outerHTML; return !/3,900|tosspayments|결제하기/.test(h) && !document.querySelector('#screen-deeper,#screen-unseal,[data-js=receipt-toggle],[data-js=hub-faq-paid]') && !/[0-9],[0-9]{3}\\s*원/.test(document.body.innerText); })()"));
  check("입구 책 카드: 0/6 상태 none·state0 문구·목차 보기 버튼", await ev("(() => { const c = document.querySelector('[data-js=hub-book]'); return c.dataset.state === 'none' && document.querySelector('[data-js=hub-book-hint]').textContent === TEXT.hub.book.state0 && document.querySelector('[data-js=hub-book-go]').offsetHeight > 0; })()"));

  // 2. 0/6 목차
  await click("[data-js=hub-book-go]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  const r0 = await rows();
  check("13-7.2 0/6: 모든 장 '지나면 열려요'(need-room), 광고 버튼 0", Object.values(r0).every((s) => s === "need-room") && Object.keys(r0).length === 11 && (await ev("[...document.querySelectorAll('[data-js=book-chapter-state]')].every(e => /열려요|\\[초안\\]/.test(e.textContent))")), JSON.stringify(r0));
  await row("match");
  check("0/6: 잠긴 행을 누르면 안내만(목차 그대로)", (await view()) === "toc");

  // 1/6 (오검만)
  await fresh(["ogham"]);
  const r1 = await rows();
  check("13-7.2 1/6: 여는 글 열림(광고 없음)·오검·흐름·궁합·심층 열 수 있음·나머지 방·닫는 글 잠김",
    r1.open === "opened" && ["ogham", "flow", "match", "deep"].every((k) => r1[k] === "can-open") && ["star", "decan", "tzolkin", "rune", "sibyl", "close"].every((k) => r1[k] === "need-room"), JSON.stringify(r1));
  check("목차: 원형 이름·안내 줄({n}=1)·배너 자리 book-toc", await ev("(() => { const a = document.querySelector('[data-js=book-home-arch]'); return !a.hidden && a.textContent === TEXT.archetypes[StrangeOracle.currentArchetype()].name && document.querySelector('[data-js=book-home-lede]').textContent === TEXT.book.toc.lede.replace('{n}', 1) && !!document.querySelector('#screen-report [data-ad=book-toc]'); })()"));
  check("목차: 잠긴 장의 문장 0 (장 파일 아직 안 받음)", !b.log.requests.some((r) => /data-book-(ogham|match|flow|star)/.test(r)));

  // 3. 입구 → 궁합 첫 쪽 탭 수 (기본 설정: 광고 없음 → 안내 + 펼치기)
  await b.goto(BASE + "#hub");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  let taps = 0;
  await click("[data-js=hub-book-go]"); taps++;
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await row("match"); taps++;
  check("궁합 표지: 입력 묶음·관계 유형 4칸·상대 없이 링크·잠금 버튼에 '광고'", (await view()) === "cover" && (await coverState()) === "locked" && (await ev("(() => { const c = document.querySelector('[data-js=chapter-cover]'); return c.dataset.chapter === 'match' && c.querySelector('[data-js=book-match-form]').offsetHeight > 0 && c.querySelectorAll('[data-js=book-match-type-input]').length === 4 && c.querySelector('[data-js=book-match-nopartner]').offsetHeight > 0 && /광고/.test(c.querySelector('[data-js=book-unlock]').textContent) && document.querySelectorAll('#screen-report .ad-slot.is-filled').length === 0; })()")));
  // 유형 미선택 → 진행 안 됨
  await fillMatch(null);
  await click("[data-js=book-unlock]");
  await sleep(150);
  check("13-7.8 관계 유형 미선택: 오류 문구·aria-invalid·잠긴 채(광고 시작 안 함)", (await coverState()) === "locked" && (await ev("document.querySelector('[data-js=book-match-error]').textContent === TEXT.book.match.errors.type && document.querySelector('[data-js=book-match-type]').getAttribute('aria-invalid') === 'true'")) && (await ev("!sessionStorage.getItem('strange-oracle-unlock')")));
  await fillMatch("friend");
  await click("[data-js=book-unlock]"); taps++;
  await waitFor("document.querySelector('[data-js=chapter-cover]').dataset.state === 'open'", 4000);
  check("13-7.4 광고단위 없음 + lockAlways: 누르는 즉시 열림 + 광고 없음 안내", (await coverState()) === "open" && (await ev("document.querySelector('[data-js=book-unlock-status]').textContent === TEXT.book.unlock.unavailable")));
  check("13-7.4 열림 기록 = book-match 표시만", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === '{"book-match":1}', await ev("sessionStorage.getItem('strange-oracle-unlock')"));
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]"); taps++;
  check("13-7.3 입구 → 궁합 첫 쪽 탭 4번 이하", (await toPages()) && taps <= 4, `${taps}번`);
  const friendText = await pageText();
  check("궁합 본문: 쌍 머리·요약·방별 관계·마지막 문단 = M1 함께 해 볼 한 가지·장 끝 쪽", await ev(`(() => { const pages = [...document.querySelectorAll('[data-js=book-page]')]; const last = pages[pages.length - 1]; const prev = pages[pages.length - 2].textContent; const me = StrangeOracle.currentArchetype(); return last.querySelector('[data-js=chapter-end]') && BOOK_BOND.first.friend && Object.values(BOOK_BOND.first.friend).some(x => prev.includes(x.together.slice(-25))); })()`));
  check("궁합 본문에 undefined·{ } 자리 0", !/undefined|\{(room|name|key)\}/.test(friendText));
  // 장 안 리더
  const pg = await ev("(() => { const P = [...document.querySelectorAll('[data-js=book-page]')]; return { n: P.length, over: P.filter(p => { const bd = p.querySelector('.book-page__body'); return bd.scrollHeight > bd.clientHeight + 1; }).length, folio: P[0].querySelector('[data-js=book-page-total]').textContent, label: document.querySelector('[data-js=read-label]').textContent, ads: document.querySelectorAll('#screen-report .ad-slot.is-filled').length, w: document.documentElement.scrollWidth <= innerWidth }; })()");
  check("13-7.7 장 안: 쪽 넘침 0·쪽 번호 장 안 기준·머리줄 장 이름·배너 0·가로 넘침 0", pg.over === 0 && Number(pg.folio) === pg.n && pg.label.startsWith(await ev("TEXT.book.parts.match")) && pg.ads === 0 && pg.w, JSON.stringify(pg));
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))");
  await sleep(100);
  check("→ 키로 다음 쪽", (await ev("[...document.querySelectorAll('[data-js=book-page]')].findIndex(p => p.classList.contains('is-current'))")) === 1);
  check("이어 읽기 저장 = 'match:2' (장 id·쪽 번호만)", (await ev("sessionStorage.getItem('strange-oracle-bookmark')")) === "match:2");
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))");
  await sleep(100);
  await click("[data-js=book-prev]");
  await sleep(100);
  check("13-7.7 장 첫 쪽에서 이전 = 장 표지", (await view()) === "cover" && (await ev("document.querySelector('[data-js=chapter-cover]').dataset.chapter")) === "match");
  // 유형별 다양성·결정성
  const texts = {};
  for (const t of TYPES) {
    await row("match").catch(() => {});
    if ((await view()) !== "cover") { await click("[data-js=book-cover-toc]"); await row("match"); }
    await fillMatch(t);
    await click("[data-js=book-chapter-open]");
    await toPages();
    texts[t] = await pageText();
    await click("[data-js=book-toc-open]");
    await waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'toc'");
  }
  check("궁합: 상대를 바꿔도·유형을 바꿔도 광고 다시 없음 (열림 표시 유지)", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === '{"book-match":1}');
  check("13-7.8 같은 입력 두 번 = 같은 글 (friend)", texts.friend === friendText);
  const sent = (t) => (t.match(/[^.?!…\n]+[.?!…]+/g) || []).map((s) => s.trim());
  const diff = (a, c) => { const A = sent(a), B = new Set(sent(c)); return A.filter((s) => !B.has(s)).length / A.length; };
  const pairs = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pairs.push(`${TYPES[i]}-${TYPES[j]} ${(diff(texts[TYPES[i]], texts[TYPES[j]]) * 100).toFixed(0)}%`);
  check("궁합: 관계 유형 네 가지 글이 서로 다름 (다른 문장 비율)", TYPES.every((x, i) => TYPES.slice(i + 1).every((y) => texts[x] !== texts[y])), pairs.join(", "));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "book-variety-e2e.txt"), "같은 두 사람(브라우저 화면 글), 유형만 다를 때 다른 문장 비율: " + pairs.join(", ") + "\n");
  // 상대 없이 궁합 지도
  await row("match");
  await click("[data-js=book-match-nopartner]");
  await toPages();
  check("상대 없이 궁합 지도: 여덟 원형 행", (await ev("document.querySelectorAll('[data-js=book-page] .match-rooms li').length")) === 8);

  // 9·reload: 새로고침 → 목차, 이어 읽기 → 궁합 표지(상대 정보 없음, 광고 다시 없음)
  await b.goto(BASE + "#report");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  check("새로고침(#report) → 목차, 이어 읽기 한 줄 보임", (await view()) === "toc" && (await ev("!document.querySelector('[data-js=book-resume]').classList.contains('is-hidden')")));
  await click("[data-js=book-resume]");
  await sleep(200);
  check("이어 읽기로 궁합 → 표지(빈 입력)·열림 상태(펼치기)", (await view()) === "cover" && (await coverState()) === "open" && (await ev("document.querySelector('[data-js=book-match-name]').value === '' && ![...document.querySelectorAll('[data-js=book-match-type-input]')].some(r => r.checked)")));
  // 다른 장: 여는 글(광고 없음), 장 끝 → 다음 장
  await click("[data-js=book-cover-toc]");
  await row("open");
  check("여는 글: 광고 없이 열림(펼치기)", (await coverState()) === "open");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled");
  await click("[data-js=book-chapter-open]");
  await toPages();
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))");
  await sleep(100);
  const end = await ev("(() => { const cur = document.querySelector('[data-js=book-page].is-current'); const n = cur.querySelector('[data-js=chapter-end-next]'); return { end: !!cur.querySelector('[data-js=chapter-end]'), next: n && !n.classList.contains('is-hidden') ? n.dataset.next : null }; })()");
  check("13-7.7 마지막 쪽 = 장 끝 쪽: 다음 장(오검)·목차로", end.end && end.next === "ogham", JSON.stringify(end));
  await click("[data-js=book-page].is-current [data-js=chapter-end-next]");
  await sleep(200);
  check("다음 장(잠김) → 그 장 표지(잠금 버튼)", (await view()) === "cover" && (await coverState()) === "locked" && (await ev("document.querySelector('[data-js=chapter-cover]').dataset.chapter")) === "ogham");
  await waitFor("!!window.BOOK_OGHAM", 4000);
  check("13-7.5 잠긴 방 장: 문장이 DOM에 없음, 파일 이름은 방 단위(번호·query 없음)", await ev("(() => { const e = BOOK_OGHAM.full[2]; const t = e.shadow.body[0].slice(0, 24); return !document.body.innerHTML.includes(t); })()") && b.log.requests.filter((r) => /data-book-/.test(r)).every((r) => /\/data-book-[a-z]+\.js$/.test(r)), b.log.requests.filter((r) => /data-book-/.test(r)).join(" "));
  check("숨은 장 제목(결정 65 공개)·결과 이름·분량 표지에 보임", await ev("(() => { const c = document.querySelector('[data-js=chapter-cover]'); return !c.querySelector('[data-js=chapter-cover-hidden-row]').hidden && c.querySelector('[data-js=chapter-cover-result]').textContent.length > 0 && /\\d/.test(c.querySelector('[data-js=chapter-cover-volume]').textContent); })()"));
  await click("[data-js=book-unlock]");
  await waitFor("document.querySelector('[data-js=chapter-cover]').dataset.state === 'open'");
  await click("[data-js=book-chapter-open]");
  await toPages();
  const og = await ev("(() => { const t = [...document.querySelectorAll('[data-js=book-page]')].map(p => p.textContent).join(' '); return { hidden: t.includes(BOOK_OGHAM.hidden[2].title), shadow: t.includes(BOOK_OGHAM.full[2].shadow.body[0].slice(0, 20)) }; })()");
  check("오검 장: Ⅰ~Ⅳ장·숨은 장 본문", og.hidden && og.shadow, JSON.stringify(og));

  // 시기별 흐름: 생년월일 없는 탭 → 표지에 날짜 입력, profile에 저장
  await fresh(["ogham"], "#report", { name: NAME });
  await row("flow");
  check("흐름 표지: 생년월일 없으면 날짜 입력 보임", await ev("!document.querySelector('[data-js=book-flow-date]').hidden"));
  await ev("(() => { const s = (k, v) => (document.querySelector('[data-js=' + k + ']').value = v); s('book-flow-year', '1995'); s('book-flow-month', '3'); s('book-flow-day', '25'); })()");
  await click("[data-js=book-unlock]");
  await waitFor("document.querySelector('[data-js=chapter-cover]').dataset.state === 'open'");
  check("흐름: 생년월일을 profile에 저장(6장 예외)·열림", (await ev("JSON.parse(sessionStorage.getItem('strange-oracle')).profile.birth.y")) === 1995);
  await click("[data-js=book-chapter-open]");
  check("흐름 장 첫 쪽", await toPages());

  // 옛 주소·옛 영수증 칸 → 목차
  await b.goto(BASE + "#deeper");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  check("옛 #deeper → 책 목차", (await active()) === "screen-report" && (await view()) === "toc");
  await ev("sessionStorage.setItem('strange-oracle-receipt', 'SO1TESTCODE')");
  await b.goto(BASE + "#hub");
  await sleep(200);
  check("옛 영수증 칸 → 지우고 목차로", (await active()) === "screen-report" && (await ev("sessionStorage.getItem('strange-oracle-receipt')")) === null);
  await b.goto(BASE + "?pay=success&paymentKey=PK_TEST&orderId=ORDER_TEST&amount=3900#hub");
  await sleep(300);
  check("옛 결제 복귀 주소: query 지움·/api 요청 0", (await ev("location.search")) === "" && !b.log.requests.some((r) => /\/api\//.test(r)));

  // 방 결과의 책 한 줄 → 그 장 표지
  await fresh(["ogham", "star"], "#star-result");
  check("방 결과 책 한 줄: 늘 보임·링크 = room.bookLink", await ev("(() => { const s = document.querySelector('#screen-star-result [data-js=result-book-line]'); return !s.classList.contains('is-hidden') && s.querySelector('[data-js=book-line-link-label]').textContent === TEXT.room.bookLink; })()"));
  await click("#screen-star-result [data-js=result-book-link]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  check("→ 그 방 장 표지로 바로", (await view()) === "cover" && (await ev("document.querySelector('[data-js=chapter-cover]').dataset.chapter")) === "star");
  // 6/6: 닫는 글 열림, 나의 이야기 책 버튼
  await fresh(ORDER, "#story");
  check("나의 이야기: 책 목차 열기 버튼 보임", await ev("!document.querySelector('[data-js=story-book]').classList.contains('is-hidden')"));
  await click("[data-js=story-book-link]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  const r6 = await rows();
  check("6/6: 닫는 글 열림(광고 없음)·방 장 여섯 모두 열 수 있음", r6.close === "opened" && ORDER.every((k) => r6[k] === "can-open"), JSON.stringify(r6));
  // 룬·시빌라·데칸 장 열기 (큰 파일)
  for (const id of ["rune", "sibyl", "decan"]) {
    await click("[data-js=book-toc-open]").catch(() => {});
    await waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'toc'", 2000);
    await row(id);
    await click("[data-js=book-unlock]");
    await waitFor("document.querySelector('[data-js=chapter-cover]').dataset.state === 'open'");
    await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled");
    await click("[data-js=book-chapter-open]");
    const ok = await toPages();
    const st = await ev("(() => { const P = [...document.querySelectorAll('[data-js=book-page]')]; return { n: P.length, over: P.filter(p => { const bd = p.querySelector('.book-page__body'); return bd.scrollHeight > bd.clientHeight + 1; }).length, ms: Number(document.querySelector('[data-js=book-reader]').dataset.pagedMs) }; })()");
    check(`${id} 장: 쪽 나눔·넘침 0`, ok && st.n > 3 && st.over === 0, JSON.stringify(st));
  }

  // ═══ B. 시험 ID 끼워 넣기 (보상형 광고·배너·GA4) ═══
  const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", { source: inject(true, true) });
  await fresh(["ogham"]);
  await sleep(300);
  check("ID 있음: 목차 배너 채움 ≤1", (await ev("document.querySelectorAll('#screen-report .ad-slot.is-filled').length")) <= 1 && (await ev("document.querySelectorAll('#screen-report .ad-slot.is-filled').length")) === 1);
  await row("deep");
  check("장 표지 배너 0", (await ev("[...document.querySelectorAll('#screen-report .ad-slot.is-filled')].filter(a => a.offsetHeight > 0).length")) === 0);
  await ev("window.__gptMode = 'closed'");
  await click("[data-js=book-unlock]");
  check("기다림: 버튼 비활성·aria-busy·loading 문구", await ev("(() => { const u = document.querySelector('[data-js=book-unlock]'); return document.querySelector('[data-js=chapter-cover]').dataset.state === 'waiting' && u.disabled && u.getAttribute('aria-busy') === 'true' && document.querySelector('[data-js=book-unlock-status]').textContent === TEXT.book.unlock.loading; })()"));
  await waitFor("document.querySelector('[data-js=book-unlock-status]').textContent === TEXT.book.unlock.closed", 3000);
  check("13-7.4 closed: 잠긴 채·안내·다시 누를 수 있음·기록 없음", (await coverState()) === "locked" && (await ev("!document.querySelector('[data-js=book-unlock]').disabled && !sessionStorage.getItem('strange-oracle-unlock')")));
  await ev("window.__gptMode = 'granted'");
  await click("[data-js=book-unlock]");
  check("13-7.4 granted: 바로 첫 쪽(탭 하나 줄임)", await toPages());
  check("granted: 기록 = book-deep만", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === '{"book-deep":1}');
  await click("[data-js=book-toc-open]");
  await row("flow");
  await ev("window.__gptMode = 'empty'");
  await click("[data-js=book-unlock]");
  await waitFor("document.querySelector('[data-js=chapter-cover]').dataset.state === 'open'", 4000);
  check("13-7.4 빈 광고(isEmpty) → unavailable 열림·안내", (await ev("document.querySelector('[data-js=book-unlock-status]').textContent === TEXT.book.unlock.unavailable")));
  // 분석 이벤트
  const evs = b.log.console.filter((l) => l.startsWith("debug: __DL ")).map((l) => JSON.parse(l.slice(12))).filter((a) => a[0] === "event");
  const book = evs.filter((e) => e[1] === "so_book");
  const unl = evs.filter((e) => e[1] === "so_unlock");
  check("13-7.12 so_book: step(toc·cover·read)·chapter만", ["toc", "cover", "read"].every((s) => book.some((e) => e[2].step === s)) && book.every((e) => Object.keys(e[2]).every((k) => ["step", "chapter"].includes(k))), JSON.stringify(book.slice(0, 4)));
  check("13-7.12 so_unlock: chapter·outcome만 (slot 없음)", unl.length >= 4 && unl.every((e) => Object.keys(e[2]).sort().join() === "chapter,outcome"), JSON.stringify(unl.slice(0, 3)));
  const dl = await ev("JSON.stringify((window.dataLayer||[]).map(a => [...a]))");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });

  // ═══ C. lockAlways false + 광고단위 없음 → 잠금 UI 0 ═══
  const c2 = await send("Page.addScriptToEvaluateOnNewDocument", { source: inject(false, false) });
  await fresh(["ogham"]);
  const rc = await rows();
  check("13-7.4 lockAlways false + 광고단위 없음: 열 수 있는 장 모두 바로 열림(광고 표시 0)", !Object.values(rc).includes("can-open") && rc.match === "opened", JSON.stringify(rc));
  await row("match");
  check("표지 잠금 버튼 안 보임", (await coverState()) === "open" && (await ev("document.querySelector('[data-js=book-unlock]').offsetHeight === 0")));
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: c2.identifier });

  // 내 정보 지우기
  await ev("document.querySelector('[data-js=clear-open]').click()");
  await sleep(100);
  await ev("document.querySelector('[data-js=clear-confirm]').click()");
  await sleep(200);
  check("내 정보 지우기 → 열림 표시·이어 읽기·입력 모두 없음", (await ev("['strange-oracle', 'strange-oracle-unlock', 'strange-oracle-bookmark'].every(k => sessionStorage.getItem(k) === null)")));

  // ═══ 개인정보 전수 검색 (13-7.11) ═══
  const store = await ev("JSON.stringify({ s: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)])), l: localStorage.length, c: document.cookie })");
  // 시험이 직접 연 옛 결제 복귀 주소(문서 요청 자체)는 빼고 본다
  const hay = [b.log.bodies.filter((x) => !x.url.startsWith(BASE + "?pay=")).map((x) => x.url + " " + x.body).join("\n"), JSON.stringify(ext), dl, JSON.stringify(evs), store].join("\n");
  const SECRETS = [PARTNER.name, encodeURIComponent(PARTNER.name), "19931107", "1993-11", NAME, encodeURIComponent(NAME), "19950325", "PK_TEST", "ORDER_TEST", "friend", "family", "\"work\""];
  const hits = SECRETS.filter((s) => hay.includes(s));
  check("13-7.11 상대·내 이름·생일·관계 유형·옛 결제 값: 요청 URL·본문·gtag 인자·storage·쿠키 0건", hits.length === 0, hits.join(","));
  check("localStorage·쿠키 0", (await ev("localStorage.length")) === 0 && (await ev("document.cookie")) === "");
  const realGoogle = b.log.requests.filter((u) => /google|doubleclick/.test(u)).map((u) => u.replace(/^\w+ /, ""));
  check("구글 주소 요청은 모두 가로채 가짜로 답함 (실제 전송 0)", realGoogle.every((u) => ext.some((x) => x.url === u)), `${realGoogle.length}건`);
  const errs = b.log.errors.filter((e) => !/favicon/.test(e));
  check("콘솔 오류 0", errs.length === 0, errs.slice(0, 3).join(" | "));

  await b.close();
  fs.writeFileSync(path.join(OUT, "e2e-book.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(out.join("\n")); console.error("CRASH", e); process.exit(1); });
