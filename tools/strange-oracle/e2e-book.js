// 13단계 E3: 광고로 여는 책 e2e (옛 e2e-paid.js 대체 — 결제 흐름은 은퇴). 헤드리스 Edge, 정적 배포 폴더.
// 구글 주소 요청은 CDP Fetch로 가로채 가짜 스크립트로 답한다(실제 구글 요청 0건). 시험용 ID는 페이지가 뜰 때 window.TEXT에 끼워 넣는다.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
// (14단계 F4-B2) 책은 결제를 켠 시험 페이지(test)에만 있다. 시험은 모의 열람 코드(/__dev/skip?paid=1이 넣는 값)를 seed에 함께 넣어 "결제한 탭"으로 시작한다.
// 결제 전 화면·틀린 코드·off 배포판 DOM 0은 e2e-pay.js가 본다.
// 실행: node --experimental-websocket tools/strange-oracle/e2e-book.js
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/e2e-book.txt (+ out/book-variety-e2e.txt)
const { launch, googleCount } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const BASE = "http://127.0.0.1:8788/products/strange-oracle/index.html";
const OUT = path.join(__dirname, "out");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]; // (14단계) 새 순서
const BOOK_ROOMS = ORDER; // (F4-B2) Ⅰ 만신 장 포함 → 책 12장, (17단계) 인연의 장 → 13장, (18단계) 새 장 cross → 14장 (tests.md 「18단계 · 바뀐 기대값」)
// (14-6) 방 문구 파일은 지연 불러오기라 페이지에 전역이 없을 수 있다 → 시험 방문 기록은 node에서 만든다
const DATA = (() => { const w = {}; for (const f of ["data-saju.js", "data-ogham.js", "data-stars.js", "data-decans.js", "data-tzolkin.js", "data-runes.js", "data-oracles.js"]) require("vm").runInNewContext(require("fs").readFileSync(require("path").resolve(__dirname, "..", "..", "products", "strange-oracle", f), "utf8"), { window: w }); return w; })();
const SajuLib = require("../../products/strange-oracle/saju.js");
function seedVisits(R) {
  const v = {};
  if (R.includes("saju")) v.saju = { code: 532, archetype: DATA.SAJU.stems[SajuLib.decodeCode(532).S1].archetype };
  if (R.includes("ogham")) v.ogham = { ogham: 2, archetype: DATA.OGHAM[2].archetype };
  if (R.includes("star")) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: DATA.NAKSHATRAS[4].archetype };
  if (R.includes("decan")) v.decan = { decan: 10, when: null, archetype: DATA.DECANS[10].archetype };
  if (R.includes("tzolkin")) v.tzolkin = { number: 4, sign: 19, archetype: DATA.TZOLKIN_SIGNS[19].archetype };
  if (R.includes("rune")) v.rune = { picks: [DATA.RUNES[0].code, DATA.RUNES[5].code, DATA.RUNES[10].code], topic: "me", archetype: DATA.RUNES[10].archetype };
  if (R.includes("sibyl")) v.sibyl = { sors: 12, topic: "love", archetype: DATA.ORACLES[12].archetype };
  return v;
}
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
  let PASS = "";
  const seed = (rooms, profile = PROFILE, paid = true) => ev(`sessionStorage.setItem('strange-oracle', ${JSON.stringify(JSON.stringify({ profile, visits: seedVisits(rooms) }))}); ${paid ? `sessionStorage.setItem('strange-oracle-pass', ${JSON.stringify(PASS)});` : ""} true`);
  const fresh = async (rooms, hash = "#report", profile, paid = true) => {
    await b.goto(BASE);
    await ev("sessionStorage.clear()");
    await seed(rooms, profile, paid);
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
  // 0. 모의 열람 코드 (시험 페이지 지름길이 넣는 값을 읽는다)
  await b.goto("http://127.0.0.1:8788/__dev/skip?rooms=0&paid=1&to=hub");
  await waitFor("location.pathname.endsWith('/strange-oracle/') || location.pathname.endsWith('index.html')", 5000);
  PASS = await ev("sessionStorage.getItem('strange-oracle-pass') || ''");
  check("시험 페이지: /__dev/skip?paid=1이 모의 열람 코드를 넣음 (test 모드 서버)", /^SOP[0-9A-Z]{13}$/.test(PASS));
  // 1. 첫 화면
  await b.goto(BASE);
  await ev("sessionStorage.clear()");
  const nReq0 = b.log.requests.length;
  await b.goto(BASE);
  await sleep(300);
  const firstReq = b.log.requests.slice(nReq0);
  check("13-7.1 첫 화면: data-book-*.js·/api/ 요청 0건, pay.json 요청 0", !firstReq.some((r) => /data-book-|\/api\/|pay\.json/.test(r)), firstReq.filter((r) => /data-book-|\/api\//.test(r)).join(" "));
  check("test: 결제 전 화면을 template에서 꺼냄(#screen-deeper, 비활성)·template 없음 (off의 DOM 0은 e2e-pay)", await ev("!!document.querySelector('#screen-deeper') && !document.querySelector('#screen-deeper.is-active') && !document.querySelector('[data-js=pay-tpl]')"));
  check("입구 책 카드: 0/6 상태 none·state0 문구·목차 보기 버튼", await ev("(() => { const c = document.querySelector('[data-js=hub-book]'); return c.dataset.state === 'none' && document.querySelector('[data-js=hub-book-hint]').textContent === TEXT.hub.book.state0 && document.querySelector('[data-js=hub-book-go]').offsetHeight > 0; })()"));

  // 2. 0/7 목차
  check("F4-B2: 목차에 Ⅰ 만신 장 있음(오검 앞), (17-2) 인연의 장은 시기별 흐름 다음, (18-2) 새 장은 제2부 맨 앞(Ⅶ 시빌라 다음), (20단계) 2027년의 흐름은 시기별 흐름 바로 다음·인연의 장 앞 · 15장", await ev("(() => { const ids = [...document.querySelectorAll('[data-js=book-chapter]')].map(li => li.dataset.chapter); return ids.indexOf('saju') === ids.indexOf('ogham') - 1 && ids.length === 15 && ids.indexOf('year') === ids.indexOf('flow') + 1 && ids.indexOf('yeon') === ids.indexOf('year') + 1 && ids.indexOf('cross') === ids.indexOf('sibyl') + 1 && ids.indexOf('flow') === ids.indexOf('cross') + 1; })()"));
  await click("[data-js=hub-book-go]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  const r0 = await rows();
  check("13-7.2 0/7: 모든 장 '지나면 열려요'(need-room), 광고 버튼 0 (15장)", Object.values(r0).every((s) => s === "need-room") && Object.keys(r0).length === 15 && (await ev("[...document.querySelectorAll('[data-js=book-chapter-state]')].every(e => /열려요|\\[초안\\]/.test(e.textContent))")), JSON.stringify(r0));
  await row("match");
  check("0/6: 잠긴 행을 누르면 안내만(목차 그대로)", (await view()) === "toc");

  // 2/7 (만신·오검)
  await fresh(["saju", "ogham"]);
  const r1 = await rows();
  check("14-4 2/7 결제함: 여는 글·만신·오검·(18-2 방 2개) 새 장·흐름·궁합·심층 열림·나머지 방·닫는 글 '지나면 열려요'(59번)",
    r1.open === "opened" && ["saju", "ogham", "cross", "flow", "yeon", "match", "deep"].every((k) => r1[k] === "opened") && ["star", "decan", "tzolkin", "rune", "sibyl", "close"].every((k) => r1[k] === "need-room"), JSON.stringify(r1));
  check("목차: 원형 이름·안내 줄({n}=2)·배너 자리 없음(14-2)", await ev("(() => { const a = document.querySelector('[data-js=book-home-arch]'); return !a.hidden && a.textContent === TEXT.archetypes[StrangeOracle.currentArchetype()].name && document.querySelector('[data-js=book-home-lede]').textContent === TEXT.book.toc.lede.replace('{n}', 2) && !document.querySelector('#screen-report [data-ad]'); })()"));
  check("목차: 유료 장 문장 0 (함수 book 요청 아직 0건)", !b.log.requests.some((r) => /\/api\/book/.test(r)));

  // 3. 입구 → 궁합 첫 쪽 탭 수 (기본 설정: 광고 없음 → 안내 + 펼치기)
  await b.goto(BASE + "#hub");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  let taps = 0;
  await click("[data-js=hub-book-go]"); taps++;
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await row("match"); taps++;
  check("궁합 표지: 열림(14-2) · 입력 묶음 · 잠금 버튼 없음", (await view()) === "cover" && (await coverState()) === "open" && (await ev("document.querySelector('[data-js=chapter-cover]').dataset.chapter === 'match' && !document.querySelector('[data-js=book-unlock]')")));
  // 유형 미선택 → 진행 안 됨
  await fillMatch(null);
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  await sleep(150);
  check("13-7.8 관계 유형 미선택: 오류 문구·aria-invalid·표지 그대로", (await view()) === "cover" && (await ev("document.querySelector('[data-js=book-match-error]').textContent === TEXT.book.match.errors.type && document.querySelector('[data-js=book-match-type]').getAttribute('aria-invalid') === 'true'")));
  await fillMatch("friend");
  check("14-2 광고 잠금 표시 칸(strange-oracle-unlock) 없음", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === null);

  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]"); taps++;
  check("13-7.3 입구 → 궁합 첫 쪽 탭 4번 이하(지금 3번)", (await toPages()) && taps <= 4, `${taps}번`);
  const friendText = await pageText();
  check("궁합 본문: 쌍 머리·요약·방별 관계·마지막 문단 = M1 함께 해 볼 한 가지·장 끝 쪽", await ev(`(() => { const pages = [...document.querySelectorAll('[data-js=book-page]')]; const last = pages[pages.length - 1]; const prev = pages[pages.length - 2].textContent; const me = StrangeOracle.currentArchetype(); return last.querySelector('[data-js=chapter-end]') && BOOK_MATCH.bond.first.friend && Object.values(BOOK_MATCH.bond.first.friend).some(x => prev.includes(x.together.slice(-25))); })()`));
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
  check("궁합: 상대·유형을 바꿔도 잠금 표시 없음", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === null);
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
  check("여는 글: 열림(펼치기)", (await coverState()) === "open");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled");
  await click("[data-js=book-chapter-open]");
  await toPages();
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))");
  await sleep(100);
  const end = await ev("(() => { const cur = document.querySelector('[data-js=book-page].is-current'); const n = cur.querySelector('[data-js=chapter-end-next]'); return { end: !!cur.querySelector('[data-js=chapter-end]'), next: n && !n.classList.contains('is-hidden') ? n.dataset.next : null }; })()");
  check("13-7.7 마지막 쪽 = 장 끝 쪽: 다음 장(Ⅰ 만신)·목차로", end.end && end.next === "saju", JSON.stringify(end));
  await click("[data-js=book-page].is-current [data-js=chapter-end-next]");
  await sleep(200);
  check("다음 장(열림) → 그 장 첫 쪽으로 바로 (14-2: 잠금 없음)", (await toPages()) && (await ev("document.querySelector('[data-js=chapter-cover]').dataset.chapter")) === "saju");
  await waitFor("!!window.BOOK_SAJU", 4000);
  const bookBodies = b.log.bodies.filter((x) => /\/api\/book$/.test(x.url));
  check("14-7.13 함수 book 요청: 주소에 query 없음·본문은 pass·file 두 칸뿐·file은 장 이름", bookBodies.length > 0 && bookBodies.every((x) => { try { const o = JSON.parse(x.body); return Object.keys(o).sort().join() === "file,pass" && /^[a-z]+$/.test(o.file); } catch (e) { return false; } }), `${bookBodies.length}건`);
  check("공개 책 파일은 data-book-free.js·(18-6) data-book-sample.js 둘뿐", b.log.requests.filter((r) => /data-book-/.test(r)).every((r) => /\/data-book-(free|sample)\.js$/.test(r)));
  check("숨은 장 제목(결정 65 공개)·결과 이름·분량 표지에 보임", await ev("(() => { const c = document.querySelector('[data-js=chapter-cover]'); return !c.querySelector('[data-js=chapter-cover-hidden-row]').hidden && c.querySelector('[data-js=chapter-cover-result]').textContent.length > 0 && /\\d/.test(c.querySelector('[data-js=chapter-cover-volume]').textContent); })()"));
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  await toPages();
  await click("[data-js=book-toc-open]");
  await waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'toc'", 2000);
  await row("ogham");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  await toPages();
  await waitFor("!!window.BOOK_OGHAM", 4000);
  const og = await ev("(() => { const t = [...document.querySelectorAll('[data-js=book-page]')].map(p => p.textContent).join(' '); return { hidden: t.includes(BOOK_OGHAM.hidden[2].title), shadow: t.includes(BOOK_OGHAM.full[2].shadow.body[0].slice(0, 20)) }; })()");
  check("오검 장: Ⅰ~Ⅳ장·숨은 장 본문", og.hidden && og.shadow, JSON.stringify(og));
  // (17-3, design 17단계 5절) 첫 줄 = 장 첫 쪽 book-opening 바로 뒤 p.book-first-line, 마음 한 줄 = Ⅰ장 쪽 안 aside.book-heart(쪼개지지 않음). 문구가 빈칸이면 그리지 않음
  const fl = JSON.parse(await ev("JSON.stringify((() => { const ps = [...document.querySelectorAll('[data-js=book-page][data-room=ogham]')]; const src = document.querySelector('[data-js=book-room][data-room=ogham]'); const has = Object.values(BOOK_OGHAM.full).some((e) => e.firstLine); const hasH = Object.values(BOOK_OGHAM.full).some((e) => e.heartLine); const f = ps.flatMap((p) => [...p.querySelectorAll('p.book-first-line')]); const h = ps.flatMap((p) => [...p.querySelectorAll('aside.book-heart')]); const first = ps[0]; const after = first && first.querySelector('.book-opening') && first.querySelector('.book-opening').nextElementSibling; const hp = h[0] && h[0].closest('[data-js=book-page]'); const ch2Start = ps.findIndex((p, i) => i > 0 && p.classList.contains('is-chapter-start')); return { src: src.querySelectorAll('.book-first-line').length, srcH: src.querySelectorAll('.book-heart').length, f: f.length, h: h.length, has, hasH, firstAfterOpening: f.length ? after === f[0] : null, heartInCh1: hp ? ps.indexOf(hp) < ch2Start : null, heartLabel: h[0] ? h[0].querySelector('.book-heart__label').textContent.length > 0 : null }; })())"));
  check("17-3 오검 장: 첫 줄은 장 머리 바로 뒤 · 마음 한 줄은 Ⅰ장 쪽 안 한 덩어리 · 원본 칸과 쪽 수 같음(문구 빈칸이면 0)", fl.f === fl.src && fl.h === fl.srcH && fl.f <= 1 && fl.h <= 1 && fl.firstAfterOpening !== false && fl.heartInCh1 !== false && fl.heartLabel !== false, JSON.stringify(fl));

  // 시기별 흐름: 생년월일 없는 탭 → 표지에 날짜 입력, profile에 저장
  await fresh(["saju", "ogham"], "#report", { name: NAME });
  await row("flow");
  check("흐름 표지: 생년월일 없으면 날짜 입력 보임", await ev("!document.querySelector('[data-js=book-flow-date]').hidden"));
  await ev("(() => { const s = (k, v) => (document.querySelector('[data-js=' + k + ']').value = v); s('book-flow-year', '1995'); s('book-flow-month', '3'); s('book-flow-day', '25'); })()");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  check("흐름 장 첫 쪽", await toPages());
  check("흐름: 생년월일을 profile에 저장(6장 예외)", (await ev("JSON.parse(sessionStorage.getItem('strange-oracle')).profile.birth.y")) === 1995);

  // (17-2) 인연의 장: 같은 탭(생년월일 있음, 만신·오검 지남) → 기본판 7쪽 + 장 끝. 요청 본문은 { pass, file: "yeon" } 두 칸
  await click("[data-js=book-toc-open]");
  await sleep(150);
  await row("yeon");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  check("17-2 인연의 장 표지: 분량 표지에 숫자", await ev("/\\d/.test(document.querySelector('[data-js=chapter-cover-volume]').textContent)"));
  await click("[data-js=book-chapter-open]");
  check("17-2 인연의 장 첫 쪽", await toPages());
  const yeon = JSON.parse(await ev("JSON.stringify((() => { const ps = [...document.querySelectorAll('[data-js=book-page][data-part=yeon]')]; const src = document.querySelector('[data-js=report-yeon]'); const pg = (sel) => ps.reduce((n, p) => n + p.querySelectorAll(sel).length, 0); return { pages: ps.length, secs: [...src.querySelectorAll('section.yeon-sec')].map(s => s.dataset.page), variant: src.dataset.variant, band: src.querySelectorAll('.yeon-when__item').length, ages: src.querySelectorAll('.yeon-when__age').length, heads: pg('.yeon-sec__head'), nums: [...src.querySelectorAll('.yeon-sec__num')].map(n => n.textContent).join(''), draft: ps.some(p => p.textContent.includes('[초안] 당신')), hiddenNotes: pg('.yeon-sec__note[hidden]') }; })())"));
  check("17-2 인연의 장(yeon-tpl 견본): 기본판 7쪽(끌림·거울·만날 사람·4쪽·장면·시기·계절) + 장 끝, 쪽 머리 7개(번호 1~7), 시기 칸 2개(지금·다음), 견본 본문 0", yeon.variant === "base" && yeon.secs.length === 7 && yeon.secs[0] === "pull" && yeon.secs[5] === "time" && yeon.band === 2 && yeon.ages === 2 && yeon.heads === 7 && yeon.nums === "1234567" && !yeon.draft && yeon.hiddenNotes === 0 && yeon.pages >= 8, JSON.stringify(yeon));
  // (I4 developer 요청 1) 쪽 머리만 남는 쪽 0: 본문 자식이 모두 장 머리(.book-opening)·쪽 머리 unit(.yeon-sec__head만 감싼 것)인 쪽이 없어야 한다. 360 → 480 → 360
  const HEADONLY = "JSON.stringify((() => { const ps = [...document.querySelectorAll('[data-js=book-page][data-part=yeon]')]; const hd = (c) => c.classList.contains('book-opening') || (c.children.length === 1 && c.firstElementChild.classList.contains('yeon-sec__head')); return { w: innerWidth, pages: ps.length, headOnly: ps.map((p, i) => [...p.querySelector('.book-page__body').children].every(hd) ? i + 1 : 0).filter(Boolean), firstText: ps.filter((p) => p.querySelector('.yeon-sec__head')).every((p) => p.querySelector('.book-page__body > p, .yeon-when, .yeon-sec__note')) }; })())";
  const ho = [JSON.parse(await ev(HEADONLY))];
  for (const w of [480, 360]) {
    await b.send("Emulation.setDeviceMetricsOverride", { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
    await sleep(150);
    await waitFor(`document.querySelectorAll('[data-js=book-page][data-part=yeon]').length > 0 && innerWidth === ${w}`, 5000);
    await sleep(600); // 다시 나누기(150ms 지연) 뒤
    ho.push(JSON.parse(await ev(HEADONLY)));
  }
  check("I4-1 인연의 장 쪽 머리만 남는 쪽 0 (360·480·360, 쪽 머리가 있는 쪽마다 본문 시작)", ho.every((x) => x.headOnly.length === 0 && x.firstText) && ho[1].w === 480, JSON.stringify(ho));
  const yb = b.log.bodies.filter((x) => /\/api\/book$/.test(x.url)).map((x) => x.body).filter((s) => /yeon/.test(s));
  check("17-13의 3: 인연의 장 요청 본문 = { pass, file: \"yeon\" } 두 칸뿐", yb.length > 0 && yb.every((s) => { const o = JSON.parse(s); return Object.keys(o).sort().join() === "file,pass" && o.file === "yeon"; }), `${yb.length}건`);

  // #deeper = 결제 전 화면(test), 옛 영수증 칸 → 목차
  await b.goto(BASE + "#deeper");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  check("test: #deeper → 결제 전 화면", (await active()) === "screen-deeper");
  await ev("sessionStorage.setItem('strange-oracle-receipt', 'SO1TESTCODE')");
  await b.goto(BASE + "#hub");
  await sleep(200);
  check("옛 영수증 칸 → 지우고 목차로", (await active()) === "screen-report" && (await ev("sessionStorage.getItem('strange-oracle-receipt')")) === null);
  const nReqPay = b.log.requests.length;
  await b.goto(BASE + "?pay=success&paymentKey=PK_TEST&orderId=ORDER_TEST&amount=5900#hub");
  await sleep(300);
  check("옛 결제 복귀 주소: query 지움·/api 요청 0", (await ev("location.search")) === "" && !b.log.requests.slice(nReqPay).some((r) => /\/api\//.test(r)));

  // 방 결과의 책 한 줄 → 그 장 표지
  await fresh(["saju", "ogham", "star"], "#star-result");
  check("방 결과 책 한 줄: 늘 보임·링크 = room.bookLink", await ev("(() => { const s = document.querySelector('#screen-star-result [data-js=result-book-line]'); return !s.classList.contains('is-hidden') && s.querySelector('[data-js=book-line-link-label]').textContent === TEXT.room.bookLink; })()"));
  await click("#screen-star-result [data-js=result-book-link]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  check("→ 그 방 장 표지로 바로", (await view()) === "cover" && (await ev("document.querySelector('[data-js=chapter-cover]').dataset.chapter")) === "star");
  // 7/7: 닫는 글 열림, 나의 이야기 책 버튼
  await fresh(ORDER, "#story");
  check("나의 이야기: 책 목차 열기 버튼 보임", await ev("!document.querySelector('[data-js=story-book]').classList.contains('is-hidden')"));
  await click("[data-js=story-book-link]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  const r6 = await rows();
  check("7/7 결제함: 15장 모두 열림(만신·새 장·2027년의 흐름 포함)", Object.keys(r6).length === 15 && Object.values(r6).every((s) => s === "opened"), JSON.stringify(r6));
  // (20단계) 「2027년의 흐름」: 결제한 탭에서 열기 → 쪽 4개(한 해의 결·네 갈래·계절마다·이 해를 위한 한 가지)·머리 줄에 나의 일간·빈 칸 0·유료 요청 file "year"
  await row("year");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  await toPages();
  const yr = await ev("(() => { const a = document.querySelector('[data-js=report-year] article'); if (!a) return null; const secs = [...a.querySelectorAll('section.year-sec')]; return { secs: secs.map((x) => x.dataset.page).join(), empty: [...a.querySelectorAll('p, li')].filter((x) => !x.textContent.trim()).length, items: a.querySelectorAll('.year-list li').length, head: (a.querySelector('.year-ganji') || {}).textContent || '', variant: document.querySelector('[data-js=report-year]').dataset.variant }; })()");
  check("20단계 2027년의 흐름: 쪽 4개 · 칸 8개(네 갈래+계절) · 빈 칸 0 · 머리 줄 '나의 일간' · 일간 판", !!yr && yr.secs === "theme,areas,seasons,one" && yr.items === 8 && yr.empty === 0 && /나의 일간/.test(yr.head) && yr.variant === "stem", JSON.stringify(yr));
  await click("[data-js=book-toc-open]");
  await waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'toc'", 4000);
  // 룬·시빌라·데칸 장 열기 (큰 파일)
  for (const id of ["saju", "rune", "sibyl", "decan"]) {
    await click("[data-js=book-toc-open]").catch(() => {});
    await waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'toc'", 2000);
    await row(id);
    await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled");
    await click("[data-js=book-chapter-open]");
    const ok = await toPages();
    const st = await ev("(() => { const P = [...document.querySelectorAll('[data-js=book-page]')]; return { n: P.length, over: P.filter(p => { const bd = p.querySelector('.book-page__body'); return bd.scrollHeight > bd.clientHeight + 1; }).length, ms: Number(document.querySelector('[data-js=book-reader]').dataset.pagedMs) }; })()");
    check(`${id} 장: 쪽 나눔·넘침 0`, ok && st.n > 3 && st.over === 0, JSON.stringify(st));
    if (id === "saju") {
      const sj = await ev("(() => { const t = [...document.querySelectorAll('[data-js=book-page]')].map(p => p.textContent).join(' '); const c = JSON.parse(sessionStorage.getItem('strange-oracle')).visits.saju.code; const s = Math.floor((c - 1) / 500), g = Math.floor((c - 1) / 2) % 5; return { rest: t.includes(BOOK_SAJU.full[s].identity.rest[0].slice(0, 30)), hidden: t.includes(BOOK_SAJU.hidden[g].body[0].slice(0, 30)), title: t.includes(SAJU.groups[Object.keys(SAJU.groups)[g]].hiddenTitle), bad: /undefined|\\{\\w+\\}/.test(t) }; })()");
      check("Ⅰ 만신 장: Ⅰ장 나머지·숨은 장(묶음 제목 = data-saju.js hiddenTitle)·빈칸 0", sj.rest && sj.hidden && sj.title && !sj.bad, JSON.stringify(sj));
    }
  }

  // ═══ (18단계 J2) 새 장 · 미리보기 · 잠긴 장 길 · 상태표 · 관심사 · 이벤트 값 (spec 18-12의 4~8·11) ═══
  // 시험 GA ID를 페이지에 끼운다(구글 주소는 위 가로채기로 가짜 응답). dataLayer는 같은 페이지 안에서 읽는다
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `(function () { var v; Object.defineProperty(window, "TEXT", { configurable: true, get: function () { return v; }, set: function (x) { if (x && x.analytics) x.analytics.ga4 = "G-TEST12345"; v = x; } }); })();` });
  const dlNow = () => ev("JSON.stringify((window.dataLayer || []).map((a) => [...a]).filter((a) => a[0] === 'event'))").then(JSON.parse);
  const evSeen = (list, name, props) => list.some((a) => a[1] === name && Object.entries(props).every(([k, v]) => a[2] && a[2][k] === v));
  const toastText = () => ev("document.querySelector('[data-js=toast]').textContent");
  const targetIs = (sel) => ev(`!!document.querySelector(${JSON.stringify(sel)} + '.is-target')`);
  const nApi0 = () => b.log.requests.filter((r) => /\/api\/book/.test(r)).length;
  const sdkReq = () => b.log.requests.filter((r) => /payapp/i.test(r)).length;

  // 18-a 결제함 7/7(같은 탭): 새 장 6쪽 · 대조표 · 요청 본문 { pass, file: "cross" }
  await fresh(ORDER, "#report");
  await row("cross");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 6000);
  check("18-9 새 장 표지: 분량 숫자", await ev("/\\d/.test(document.querySelector('[data-js=chapter-cover-volume]').textContent)"));
  await click("[data-js=book-chapter-open]");
  check("18-12의 5 결제함: 새 장 첫 쪽", await toPages());
  const cx = JSON.parse(await ev(`JSON.stringify((() => { const src = document.querySelector('[data-js=report-cross]'); const ps = [...document.querySelectorAll('[data-js=book-page][data-part=cross]')]; const t = ps.map(p => p.textContent).join(' '); return { secs: [...src.querySelectorAll('section.cross-sec')].map(s => s.dataset.page), variant: src.dataset.variant, rows: src.querySelectorAll('[data-js=cross-row]').length, pending: src.querySelectorAll('.cross-table__row.is-pending').length, main: src.querySelectorAll('.cross-table__row.is-main').length, th: src.querySelectorAll('table th[scope]').length, caption: !!src.querySelector('table caption'), nums: [...src.querySelectorAll('.axis-meter__num')].every(n => /^[0-4]$/.test(n.textContent)), pages: ps.length, bad: /undefined|null|\\{(arch|sub|other|axis|room|high|low|n)\\}/.test(t), note: !!src.querySelector('[data-js=cross-note]'), tableUnit: ps.filter(p => p.querySelector('table.cross-table')).length, over: ps.filter(p => { const bd = p.querySelector('.book-page__body'); return bd.scrollHeight > bd.clientHeight + 1; }).length }; })())`));
  check("18-12의 5 새 장: 6쪽 또는 대체 경로 쪽 · 대조표 7줄(아직 0)·table·th·caption·막대 숫자 0~4 · 자리 값 남음 0 · 7방이라 끝 안내 없음 · 표는 한 쪽에 통째로 · 넘침 0", cx.secs.length >= 5 && cx.secs[0] === "shape" && cx.secs[cx.secs.length - 1] === "close" && cx.rows === 7 && cx.pending === 0 && cx.main >= 1 && cx.th >= 11 && cx.caption && cx.nums && !cx.bad && !cx.note && cx.tableUnit === 1 && cx.over === 0 && cx.pages >= cx.secs.length + 1, JSON.stringify(cx));
  const cb = b.log.bodies.filter((x) => /\/api\/book$/.test(x.url)).map((x) => x.body).filter((x) => /cross/.test(x));
  check("18-12의 4 새 장 요청 본문 = { pass, file: \"cross\" } 두 칸뿐(원형·축·방 목록·관심사 0)", cb.length > 0 && cb.every((x) => { const o = JSON.parse(x); return Object.keys(o).sort().join() === "file,pass" && o.file === "cross"; }), `${cb.length}건`);
  // 관심사(시드: 시빌라 love · 룬 me) → 제2부 = 새 장 → 인연의 장 → 원형 심층 → 궁합 → 시기별 흐름, 장 끝 "다음 장"도 같은 순서
  const ord = await ev("[...document.querySelectorAll('[data-js=book-chapter]')].map(li => li.dataset.chapter).slice(8).join()");
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))");
  await sleep(150);
  const nx = await ev("(() => { const n = document.querySelector('[data-js=book-page].is-current [data-js=chapter-end-next]'); return n ? n.dataset.next : null; })()");
  check("18-12의 11 관심사(시빌라 사랑 + 룬 나): 목차 제2부 = cross·yeon·deep·match·flow·year(20단계: flow 바로 뒤) · 새 장 끝 다음 장 = 인연의 장", ord === "cross,yeon,deep,match,flow,year,close" && nx === "yeon", `${ord} / next ${nx}`);
  await click("[data-js=book-toc-open]");
  await sleep(200);
  check("18-8 관심사 줄: 목차 위 한 줄 = book.interest.sibyl.love, 주제 이름 '돈' 0", await ev("(() => { const el = document.querySelector('[data-js=book-interest]'); return !!el && !el.hidden && el.textContent.trim() === TEXT.book.interest.sibyl.love && !/돈/.test(el.textContent); })()"));
  check("18-5 결제 뒤: 맨 위 띠·작은 글자 버튼 숨김, 입구 카드 owned·내 책 다시 펴기", await ev("document.querySelector('[data-js=book-preview-band]').hidden && document.querySelector('[data-js=book-buy-row]').hidden"));
  // 시기별 흐름 영역 순서(사랑 → 관계 먼저)
  await row("flow");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 6000);
  await click("[data-js=book-chapter-open]");
  await toPages();
  check("18-8 시기별 흐름 영역 순서(사랑): 관계 → 일 → 배움 → 이동", (await ev("[...document.querySelector('[data-js=report-timeline] .timeline__areas').children].map(d => d.querySelector('dd').dataset.js.replace('timeline-', '')).join()")) === "relation,work,learn,move");
  await b.goto(BASE + "#hub");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  check("18-5 결제 뒤 입구 카드: data-state owned · 버튼 hub.book.goReopen", await ev("document.querySelector('[data-js=hub-book]').dataset.state === 'owned' && document.querySelector('[data-js=hub-book-go]').textContent === TEXT.hub.book.goReopen"));
  await b.goto(BASE + "#preview");
  await sleep(400);
  check("18-5 #preview 직접(결제한 탭) → 목차", (await active()) === "screen-report");
  await b.goto(BASE + "#story");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-story'");
  check("18-5 결제 뒤 나의 이야기: 미리보기 카드 숨김 · 책 버튼 = story.bookLinkPaid · 공유가 주 버튼", await ev("document.querySelector('[data-js=story-preview]').hidden && !document.querySelector('[data-js=story-book]').classList.contains('is-hidden') && document.querySelector('[data-js=story-book-link]').textContent.trim() === TEXT.story.bookLinkPaid && document.querySelector('[data-js=story-share]').classList.contains('btn--primary')"));

  // 18-b 결제 전 1/7: 새 장 need-room · 작은 글자 버튼 · 입구 카드 · #deeper "받는 것" 새 장 줄 = 평균 + 상태 글자
  await fresh(["saju"], "#report", PROFILE, false);
  const rb = await rows();
  check("18-2 방 1개: 새 장 need-room · 상태 한 줄 = book.toc.needCross · 누르면 안내만", rb.cross === "need-room" && (await ev("document.querySelector('[data-js=book-chapter][data-chapter=cross] [data-js=book-chapter-state]').textContent === TEXT.book.toc.needCross")), JSON.stringify(rb));
  check("18-5 1/7 결제 전: 맨 위 띠 숨김 · 맨 아래 작은 글자 버튼 하나(btn--text, {price} 채움)", await ev("document.querySelector('[data-js=book-preview-band]').hidden && !document.querySelector('[data-js=book-buy-row]').hidden && document.querySelectorAll('[data-js=book-buy]').length === 1 && document.querySelector('[data-js=book-buy]').classList.contains('btn--text') && !/\\{price\\}/.test(document.querySelector('[data-js=book-buy]').textContent) && /9,900/.test(document.querySelector('[data-js=book-buy]').textContent)"));
  await b.goto(BASE + "#hub");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  const hubPrice = await ev("/9,900|\\d+원/.test(document.querySelector('[data-js=hub-book]').textContent)");
  check("18-5 1/7 입구 카드: some · 버튼 '목차 보기'", await ev("document.querySelector('[data-js=hub-book]').dataset.state === 'some' && document.querySelector('[data-js=hub-book-go]').textContent === TEXT.hub.book.goToc"));
  out.push(`INFO  18-12의 8 입구 카드 가격 0: ${hubPrice ? "아직 가격 있음(hub.book.desc — copywriter J3가 가격을 뺌)" : "가격 0"}`);
  console.log(out[out.length - 1]);
  const cwText = async () => ev("(() => { const li = [...document.querySelectorAll('[data-js=pay-chapters] li')].find(li => li.firstElementChild.firstChild.textContent === TEXT.book.parts.cross); return li ? { state: (li.querySelector('.pay-list__state') || {}).textContent || '', vol: li.querySelector('.pay-list__vol').textContent, nw: !!li.querySelector('.pay-list__new') } : null; })()");
  const avgVol = await ev("TEXT.pay.what.item.replace('{n}', (Math.round(BOOK_VOLUME.avg.cross / 100) * 100).toLocaleString('ko-KR'))");
  await b.goto(BASE + "#deeper");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await sleep(300);
  const cw1 = await cwText();
  check("18-9 #deeper 1/7: 새 장 줄 = 평균 분량 + '방 2개를 지나면 열려요' + 새로 더해진 장 알약", !!cw1 && cw1.state === (await ev("TEXT.pay.what.crossWait")) && cw1.vol === avgVol && cw1.nw, JSON.stringify(cw1));
  // (검수 2차 권장 1) 0/7에 #deeper로 바로: 방 1개와 같은 줄
  await b.goto(BASE);
  await ev("sessionStorage.clear()");
  await b.goto(BASE + "#deeper");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await sleep(300);
  const cw0 = await cwText();
  check("18-9 #deeper 0/7(검수 2차 권장 1): 새 장 줄 = 방 1개와 같음(평균 + 상태 글자)", !!cw0 && cw0.state === cw1.state && cw0.vol === cw1.vol, JSON.stringify(cw0));
  const pv0 = await dlNow();
  check("18-11 #deeper로 바로 들어옴 → so_pay view from other", evSeen(pv0, "so_pay", { step: "view", from: "other" }), JSON.stringify(pv0.filter((a) => a[1] === "so_pay")));
  await b.goto(BASE + "#preview");
  await sleep(400);
  check("18-5 #preview 직접 0/7 → 입구", (await active()) === "screen-hub");

  // 18-c 결제 전 3/7: 잠긴 장으로 가는 길 — (2026-10-21 기대값 변경, 결제 유도 앞당기기) 결제 전 화면으로 간다. SDK·유료 장 요청은 0
  //   만신의 장은 무료가 되어(로컬 작업 4cc23a1) 여는 글 끝 "다음 장"(saju)은 잠긴 길이 아니라 그 장 표지로 열린다
  await fresh(["saju", "ogham", "star"], "#report", PROFILE, false);
  const sdk3 = sdkReq();
  const toReport = async () => { await b.goto(BASE + "#report"); await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'"); };
  const toDeeper = () => waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'", 5000);
  await row("star");
  await toDeeper();
  const road1 = { scr: await active() };
  await b.goto(BASE + "#star-result");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-star-result'");
  await click("#screen-star-result [data-js=result-book-link]");
  await toDeeper();
  const road2 = { scr: await active() };
  await toReport();
  await row("open");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  await toPages();
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))");
  await sleep(150);
  const nx3 = await ev("document.querySelector('[data-js=book-page].is-current [data-js=chapter-end-next]').dataset.next");
  await click("[data-js=book-page].is-current [data-js=chapter-end-next]");
  await sleep(600);
  const road3 = { next: nx3, scr: await active(), view: await view() };
  await ev("sessionStorage.setItem('strange-oracle-bookmark', 'ogham:2')");
  await toReport();
  await click("[data-js=book-resume]");
  await toDeeper();
  const road4 = { scr: await active() };
  const roads = [road1, road2, road3, road4];
  check("18-12의 8 (2026-10-21) 1~6/7 결제 전 잠긴 길(목차 잠긴 장·방 결과 책 한 줄·이어 읽기) → 결제 전 화면 · 여는 글 다음 장 = 무료 만신의 장 표지 · SDK 0", [road1, road2, road4].every((r) => r.scr === "screen-deeper") && road3.next === "saju" && road3.scr === "screen-report" && road3.view !== "toc" && sdkReq() === sdk3, JSON.stringify(roads));
  await toReport();
  await click("[data-js=book-buy]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  const pv3 = await dlNow();
  check("18-11 목차 작은 글자 버튼 → 결제 전 화면 · so_pay view from toc · 미리보기로 돌아가기 숨김", evSeen(pv3, "so_pay", { step: "view", from: "toc" }) && (await ev("document.querySelector('[data-js=pay-back-preview]').hidden")), JSON.stringify(pv3.filter((a) => a[1] === "so_pay")));
  await b.goto(BASE + "#preview");
  await sleep(400);
  check("18-5 #preview 직접 3/7 → 목차", (await active()) === "screen-report");

  // 18-d 결제 전 7/7: 나의 이야기 카드 → 미리보기 (18-5 순서 1~8) · 유료 지문 0 · /api/book·SDK 0
  await fresh(ORDER, "#story", PROFILE, false);
  check("18-5 7/7 결제 전 나의 이야기: 미리보기 카드 = 주 버튼, 책 한 줄 숨김, 공유는 보조로(위쪽 공유 그대로)", await ev("(() => { const c = document.querySelector('[data-js=story-preview]'); return !!c && !c.hidden && c.querySelector('[data-js=story-preview-go]').classList.contains('btn--primary') && document.querySelector('[data-js=story-book]').classList.contains('is-hidden') && document.querySelector('[data-js=story-share]').classList.contains('btn--secondary') && !document.querySelector('[data-js=story-share]').classList.contains('btn--primary') && [...document.querySelectorAll('#screen-story .btn--primary')].filter(e => e.offsetHeight > 0 && !e.closest('[data-js^=map-]') && !e.matches('[data-js=story-pay-btn]')).length === 1 && document.querySelector('[data-js=story-pay-btn]')?.offsetHeight > 0 && document.querySelector('[data-js=story-share]').offsetHeight > 0; })()")); // 지도 카드(16단계, test에서만)의 주 버튼은 따로 센다. (2026-10-21) 결제 버튼(19단계 K10)은 미리보기 카드 아래 따로, 공유 버튼은 숨기지 않음
  const api7 = nApi0(), sdk7 = sdkReq();
  await click("[data-js=story-preview-go]");
  await waitFor("document.querySelector('#screen-preview')?.dataset.state === 'ready' && document.querySelector('.screen.is-active')?.id === 'screen-preview'", 8000);
  const pv = JSON.parse(await ev(`JSON.stringify((() => { const s = document.querySelector('#screen-preview'); const y = (el) => el ? el.getBoundingClientRect().top + scrollY : -1; const seq = [s.querySelector('.pv-head'), s.querySelector('.pv-toc'), s.querySelector('.pv-sample'), s.querySelector('.pv-diff'), s.querySelector('.pv-once'), s.querySelector('[data-js=preview-go]'), s.querySelector('.pv-links')].map(y);
    return { seq: seq.every((v, i) => v >= 0 && (i === 0 || v > seq[i - 1])), title: s.querySelector('[data-js=preview-title]').textContent, toc: [...s.querySelectorAll('[data-js=preview-chapter]')].map(li => li.dataset.chapter + ':' + li.dataset.kind).join(), free: [...s.querySelectorAll('[data-js=preview-chapter][data-kind=free] [data-js=preview-chapter-tag]')].every(e => e.textContent === TEXT.book.preview.tagFree),
      open: s.querySelector('[data-js=preview-open]').children.length, drop: s.querySelector('[data-js=preview-open] p').classList.contains('has-dropcap'), firsts: [...s.querySelectorAll('[data-js=preview-first-text]')].filter(e => e.textContent.length > 10).length, cross: s.querySelectorAll('[data-js=preview-cross] [data-js=cross-row]').length, crossText: s.querySelector('[data-js=preview-cross]').querySelectorAll('.prose').length,
      closeHidden: s.querySelector('[data-js=preview-close]').hidden, closeHas: s.querySelector('[data-js=preview-close]').children.length > 0, disc: !s.querySelector('[data-js=disclaimer-slot]') && !/재미로 보는 콘텐츠|중요한 결정의 근거/.test(s.textContent), ads: s.querySelectorAll('[data-ad], .ad-slot').length, band: !s.querySelector('[data-js=preview-test-band]').classList.contains('is-hidden'),
      prim: s.querySelectorAll('.btn--primary').length, price: s.querySelector('[data-js=preview-go-label]').textContent, h: [...s.querySelectorAll('h1,h2,h3')].map(h => h.tagName).join(''), interest: !s.querySelector('[data-js=preview-interest]').hidden && s.querySelector('[data-js=preview-interest-text]').textContent === TEXT.book.interest.sibyl.love,
      bad: /undefined|\\{(who|n|price|arch|sub)\\}/.test(s.textContent), wide: document.documentElement.scrollWidth <= innerWidth }; })())`));
  check("18-12의 7 미리보기(7/7 결제 전): 18-5 순서 1~7(19-2: 8 면책 없음) · 15장 목차(무료 3 글자 표지, 20단계 year 포함) · 여는 글 전문(머리글자) · 첫 줄 7개 · 대조표(쪽 문장 0) · 닫는 글 접힘 · 면책 문구 0 · 광고 0 · 주 버튼 하나 · 시험 띠 · 관심사 줄 · 제목 단계", pv.seq && pv.toc.split(",").length === 15 && pv.toc.startsWith("open:free,saju:free") && pv.toc.endsWith("close:free") && pv.toc.includes("sibyl:paid,cross:paid,yeon:paid,deep:paid,match:paid,flow:paid,year:paid") && pv.free && pv.open > 0 && pv.drop && pv.firsts === 7 && pv.cross === 7 && pv.crossText === 0 && pv.closeHidden && pv.closeHas && pv.disc && pv.ads === 0 && pv.band && pv.prim === 1 && /9,900/.test(pv.price) && pv.h === "H1H2H2H3H3H3H3H2H2" && pv.interest && !pv.bad && pv.wide, JSON.stringify(pv));
  // 유료 문장 지문(build-dist와 같은 규칙: 30자 이상 문자열의 가운데 60자, 공개 data*.js와 같은 문자열은 뺌)이 미리보기 화면 HTML에 0
  const prints = (() => {
    const vm = require("vm");
    const PRODD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
    const freeSet = new Set();
    for (const f of fs.readdirSync(PRODD).filter((n) => /^data[^/]*\.js$/.test(n))) { const w = {}; try { vm.runInNewContext(fs.readFileSync(path.join(PRODD, f), "utf8"), { window: w }); } catch (e) { continue; } (function g(v) { if (typeof v === "string") freeSet.add(v); else if (v && typeof v === "object") Object.values(v).forEach(g); })(w); }
    const out2 = new Set();
    const dir = path.join(PRODD, "api", "_paid", "book");
    for (const f of fs.readdirSync(dir).filter((n) => /\.js$/.test(n))) {
      const w = {};
      vm.runInNewContext(fs.readFileSync(path.join(dir, f), "utf8"), { window: w });
      (function c(v, k) { if (typeof v === "string") { if (k === "code" || v.length < 30 || freeSet.has(v)) return; const L2 = Math.min(60, v.length); const m = Math.floor((v.length - L2) / 2); const x = v.slice(m, m + L2); if (!/["'\\\n\r{}<>]/.test(x)) out2.add(x); } else if (Array.isArray(v)) v.forEach((x) => c(x, k)); else if (v && typeof v === "object") Object.entries(v).forEach(([kk, x]) => c(x, kk)); })(w, "");
    }
    return [...out2];
  })();
  const pvHtml = await ev("document.querySelector('#screen-preview').outerHTML");
  const leak = prints.filter((x) => pvHtml.includes(x));
  check("18-12의 7 미리보기 DOM에 유료 문장 지문 0 · 미리보기에서 /api/book 요청 0 · 결제 SDK 요청 0", prints.length > 1000 && leak.length === 0 && nApi0() === api7 && sdkReq() === sdk7, `지문 ${prints.length}개 · 걸림 ${leak.length} · api ${nApi0() - api7} · sdk ${sdkReq() - sdk7}`);
  const pvEv = await dlNow();
  check("18-11 미리보기 도착 → so_book step preview", evSeen(pvEv, "so_book", { step: "preview" }), JSON.stringify(pvEv.filter((a) => a[1] === "so_book").slice(-2)));
  await click("[data-js=preview-close-toggle]");
  check("18-5 닫는 글 펼치기 한 번 → 본문 보임 · 버튼 사라짐(접기 없음)", await ev("!document.querySelector('[data-js=preview-close]').hidden && document.querySelector('[data-js=preview-close-toggle]').hidden && document.querySelector('[data-js=preview-close-toggle]').getAttribute('aria-expanded') === 'true'"));
  const rests = await ev("Object.fromEntries([...document.querySelectorAll('[data-js=preview-first]')].map(li => [li.dataset.room, (li.querySelector('[data-js=preview-first-rest]').textContent.match(/[\\d,]+/) || [''])[0]]))");
  await click("[data-js=preview-go]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  const pay7 = await ev("Object.fromEntries([...document.querySelectorAll('[data-js=pay-chapters] li')].map(li => [li.firstElementChild.firstChild.textContent, (li.querySelector('.pay-list__vol').textContent.match(/[\\d,]+/) || [''])[0]]))");
  const roomName = await ev("Object.fromEntries(" + JSON.stringify(ORDER) + ".map((r) => [r, TEXT.rooms[r].name]))");
  const payOf = (r) => { const k = Object.keys(pay7).find((x) => x.endsWith(" " + roomName[r])); return k ? pay7[k] : null; };
  const sameN = ORDER.filter((r) => r !== "saju").every((r) => rests[r] && rests[r] === payOf(r)) && payOf("saju") === null; // (2026-10-21) 만신의 장은 무료라 '받는 것'에 없음
  check("18-12의 7 '이 장의 나머지 약 {n}자' = 결제 전 화면 '받는 것'의 그 장 분량 (유료 방 장 6개, 만신의 장은 무료)", sameN, JSON.stringify({ rests, pay7 }));
  const pvp = await dlNow();
  check("18-5·18-11 미리보기 주 버튼 → 결제 전 화면(결제하지 않음, SDK 0) · so_pay from preview · 미리보기로 돌아가기 보임", evSeen(pvp, "so_pay", { step: "view", from: "preview" }) && !(await ev("document.querySelector('[data-js=pay-back-preview]').hidden")) && sdkReq() === sdk7, JSON.stringify(pvp.filter((a) => a[1] === "so_pay")));
  await click("[data-js=pay-back-preview]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-preview'");
  check("18-5 미리보기로 돌아가기 → 미리보기", (await active()) === "screen-preview");
  // 7/7 결제 전 네 길 → 미리보기의 그 장 샘플 자리
  await b.goto(BASE + "#report");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  check("18-5 7/7 결제 전 목차: 맨 위 띠 보임 · 작은 글자 버튼 그대로", await ev("!document.querySelector('[data-js=book-preview-band]').hidden && !document.querySelector('[data-js=book-buy-row]').hidden"));
  const toPv = () => waitFor("document.querySelector('.screen.is-active')?.id === 'screen-preview' && document.querySelector('#screen-preview').dataset.state === 'ready'", 8000);
  await row("star");
  const p1 = (await toPv()) && (await targetIs("[data-js=preview-first][data-chapter=star]"));
  await b.goto(BASE + "#star-result");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-star-result'");
  await click("#screen-star-result [data-js=result-book-link]");
  const p2 = (await toPv()) && (await targetIs("[data-js=preview-first][data-chapter=star]"));
  await b.goto(BASE + "#report");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await row("open");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  await toPages();
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))");
  await sleep(150);
  await click("[data-js=book-page].is-current [data-js=chapter-end-next]");
  await sleep(600);
  const p3 = (await active()) === "screen-report" && (await view()) !== "toc"; // (2026-10-21) 여는 글 다음 장 = 무료 만신의 장 → 미리보기가 아니라 그 장이 열린다
  await ev("sessionStorage.setItem('strange-oracle-bookmark', 'ogham:2')");
  await b.goto(BASE + "#report");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await click("[data-js=book-resume]");
  const p4 = (await toPv()) && (await targetIs("[data-js=preview-first][data-chapter=ogham]"));
  await b.goto(BASE + "#report");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await row("flow");
  const p5 = (await toPv()) && (await targetIs("[data-js=preview-chapter][data-chapter=flow]"));
  await b.goto(BASE + "#report");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await row("cross");
  const p6 = (await toPv()) && (await targetIs("[data-js=preview-cross]"));
  check("18-12의 8 7/7 결제 전 네 길 → 미리보기 그 장 샘플 자리(방 장 = 첫 줄 · 제2부 = 미리보기 목차 줄 · 새 장 = 대조표)", p1 && p2 && p3 && p4 && p5 && p6, JSON.stringify({ p1, p2, p3, p4, p5, p6 }));
  await b.goto(BASE + "#hub");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  check("18-5 7/7 결제 전 입구 카드: all · 버튼 hub.book.goPreview → 미리보기", (await ev("document.querySelector('[data-js=hub-book]').dataset.state === 'all' && document.querySelector('[data-js=hub-book-go]').textContent === TEXT.hub.book.goPreview")) && (await click("[data-js=hub-book-go]")) && (await toPv()));
  await b.goto(BASE + "#preview");
  check("18-5 #preview 직접 7/7 결제 전 → 미리보기", await toPv());
  await click("[data-js=preview-to-toc]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  const tocOk = (await active()) === "screen-report";
  await b.goto(BASE + "#preview");
  await toPv();
  await click("[data-js=preview-to-story]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-story'");
  check("18-5 미리보기 보조 링크: 목차로 · 나의 이야기로 (막다른 곳 0)", tocOk && (await active()) === "screen-story");
  const pvAll = await dlNow();
  const evBad = JSON.stringify(pvAll).match(/love|"me"|money|work|relation|warrior|sage|lover|rebel|caregiver|explorer|creator|ruler|act|talk|heart|order|free"/g);
  check("18-11 분석 이벤트에 관심사·주제·모양·축·원형 조합 0 (so_book·so_pay 값)", !pvAll.filter((a) => /so_book|so_pay/.test(a[1])).some((a) => /love|"me"|money|relation|shape|axis/.test(JSON.stringify(a[2] || {}))), (evBad || []).slice(0, 5).join(","));

  // ═══ B·C. (14-2) 광고 은퇴: 보상형 광고·배너·lockAlways 시험은 뺐다(e2e-ads.js도 은퇴). GA4만 남는다 ═══
  const evs = b.log.console.filter((l) => l.startsWith("debug: __DL ")).map((l) => JSON.parse(l.slice(12))).filter((a) => a[0] === "event");
  const dl = await ev("JSON.stringify((window.dataLayer||[]).map(a => [...a]))");
  check("14-2: 책 화면에 잠금 버튼·광고 자리 0", await ev("!document.querySelector('[data-js=book-unlock], [data-js=book-unlock-status], #screen-report [data-ad], #screen-report .ad-slot')"));

  // 내 정보 지우기
  await ev("document.querySelector('[data-js=clear-open]').click()");
  await sleep(100);
  await ev("document.querySelector('[data-js=clear-confirm]').click()");
  await sleep(200);
  check("내 정보 지우기 → 열람 코드·이어 읽기·입력 모두 없음", (await ev("['strange-oracle', 'strange-oracle-unlock', 'strange-oracle-bookmark', 'strange-oracle-pass'].every(k => sessionStorage.getItem(k) === null)")));

  // ═══ 개인정보 전수 검색 (13-7.11) ═══
  const store = await ev("JSON.stringify({ s: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)])), l: localStorage.length, c: document.cookie })");
  // 시험이 직접 연 옛 결제 복귀 주소(문서 요청 자체)는 빼고 본다
  const hay = [b.log.bodies.filter((x) => !x.url.startsWith(BASE + "?pay=")).map((x) => x.url + " " + x.body).join("\n"), JSON.stringify(ext), dl, JSON.stringify(evs), store].join("\n");
  const SECRETS = [PARTNER.name, encodeURIComponent(PARTNER.name), "19931107", "1993-11", NAME, encodeURIComponent(NAME), "19950325", "PK_TEST", "ORDER_TEST", "friend", "family", "\"work\""];
  const hits = SECRETS.filter((s) => hay.includes(s));
  check("13-7.11 상대·내 이름·생일·관계 유형·옛 결제 값: 요청 URL·본문·gtag 인자·storage·쿠키 0건", hits.length === 0, hits.join(","));
  check("localStorage·쿠키 0", (await ev("localStorage.length")) === 0 && (await ev("document.cookie")) === "");
  const realGoogle = b.log.requests.filter((u) => /google|doubleclick/.test(u)).map((u) => u.replace(/^\w+ /, ""));
  // (19-5) GA4 주소(googletagmanager·google-analytics)는 cdp.js가 먼저 막아 가짜 답 단계까지 오지 않는다 → 막힘으로 센다
  const gaRe = /googletagmanager\.com|google-analytics\.com/;
  const gc = googleCount();
  check("구글 주소 요청은 모두 가로채 가짜로 답하거나(광고) cdp.js가 막음(GA4) (실제 전송 0)", realGoogle.filter((u) => !gaRe.test(u)).every((u) => ext.some((x) => x.url === u)) && gc.leaked === 0 && gc.blocked >= realGoogle.filter((u) => gaRe.test(u)).length, `${realGoogle.length}건 · ${JSON.stringify(gc)}`);
  const errs = b.log.errors.filter((e) => !/favicon/.test(e));
  check("콘솔 오류 0", errs.length === 0, errs.slice(0, 3).join(" | "));

  await b.close();
  fs.writeFileSync(path.join(OUT, "e2e-book.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(out.join("\n")); console.error("CRASH", e); process.exit(1); });
