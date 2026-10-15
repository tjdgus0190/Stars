// 13단계 E3: 광고로 여는 책 e2e (옛 e2e-paid.js 대체 — 결제 흐름은 은퇴). 헤드리스 Edge, 정적 배포 폴더.
// 구글 주소 요청은 CDP Fetch로 가로채 가짜 스크립트로 답한다(실제 구글 요청 0건). 시험용 ID는 페이지가 뜰 때 window.TEXT에 끼워 넣는다.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
// (14단계 F4-B2) 책은 결제를 켠 시험 페이지(test)에만 있다. 시험은 모의 열람 코드(/__dev/skip?paid=1이 넣는 값)를 seed에 함께 넣어 "결제한 탭"으로 시작한다.
// 결제 전 화면·틀린 코드·off 배포판 DOM 0은 e2e-pay.js가 본다.
// 실행: node --experimental-websocket tools/strange-oracle/e2e-book.js
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/e2e-book.txt (+ out/book-variety-e2e.txt)
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const BASE = "http://127.0.0.1:8788/products/strange-oracle/index.html";
const OUT = path.join(__dirname, "out");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]; // (14단계) 새 순서
const BOOK_ROOMS = ORDER; // (F4-B2) Ⅰ 만신 장 포함 → 책 12장
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
  check("F4-B2: 목차에 Ⅰ 만신 장 있음(오검 앞)", await ev("(() => { const ids = [...document.querySelectorAll('[data-js=book-chapter]')].map(li => li.dataset.chapter); return ids.indexOf('saju') === ids.indexOf('ogham') - 1 && ids.length === 12; })()"));
  await click("[data-js=hub-book-go]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
  const r0 = await rows();
  check("13-7.2 0/7: 모든 장 '지나면 열려요'(need-room), 광고 버튼 0 (12장)", Object.values(r0).every((s) => s === "need-room") && Object.keys(r0).length === 12 && (await ev("[...document.querySelectorAll('[data-js=book-chapter-state]')].every(e => /열려요|\\[초안\\]/.test(e.textContent))")), JSON.stringify(r0));
  await row("match");
  check("0/6: 잠긴 행을 누르면 안내만(목차 그대로)", (await view()) === "toc");

  // 2/7 (만신·오검)
  await fresh(["saju", "ogham"]);
  const r1 = await rows();
  check("14-4 2/7 결제함: 여는 글·만신·오검·흐름·궁합·심층 열림·나머지 방·닫는 글 '지나면 열려요'(59번)",
    r1.open === "opened" && ["saju", "ogham", "flow", "match", "deep"].every((k) => r1[k] === "opened") && ["star", "decan", "tzolkin", "rune", "sibyl", "close"].every((k) => r1[k] === "need-room"), JSON.stringify(r1));
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
  check("공개 책 파일은 data-book-free.js 하나뿐", b.log.requests.filter((r) => /data-book-/.test(r)).every((r) => /\/data-book-free\.js$/.test(r)));
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

  // 시기별 흐름: 생년월일 없는 탭 → 표지에 날짜 입력, profile에 저장
  await fresh(["saju", "ogham"], "#report", { name: NAME });
  await row("flow");
  check("흐름 표지: 생년월일 없으면 날짜 입력 보임", await ev("!document.querySelector('[data-js=book-flow-date]').hidden"));
  await ev("(() => { const s = (k, v) => (document.querySelector('[data-js=' + k + ']').value = v); s('book-flow-year', '1995'); s('book-flow-month', '3'); s('book-flow-day', '25'); })()");
  await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 5000);
  await click("[data-js=book-chapter-open]");
  check("흐름 장 첫 쪽", await toPages());
  check("흐름: 생년월일을 profile에 저장(6장 예외)", (await ev("JSON.parse(sessionStorage.getItem('strange-oracle')).profile.birth.y")) === 1995);

  // #deeper = 결제 전 화면(test), 옛 영수증 칸 → 목차
  await b.goto(BASE + "#deeper");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  check("test: #deeper → 결제 전 화면", (await active()) === "screen-deeper");
  await ev("sessionStorage.setItem('strange-oracle-receipt', 'SO1TESTCODE')");
  await b.goto(BASE + "#hub");
  await sleep(200);
  check("옛 영수증 칸 → 지우고 목차로", (await active()) === "screen-report" && (await ev("sessionStorage.getItem('strange-oracle-receipt')")) === null);
  const nReqPay = b.log.requests.length;
  await b.goto(BASE + "?pay=success&paymentKey=PK_TEST&orderId=ORDER_TEST&amount=3900#hub");
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
  check("7/7 결제함: 12장 모두 열림(만신 포함)", Object.keys(r6).length === 12 && Object.values(r6).every((s) => s === "opened"), JSON.stringify(r6));
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
  check("구글 주소 요청은 모두 가로채 가짜로 답함 (실제 전송 0)", realGoogle.every((u) => ext.some((x) => x.url === u)), `${realGoogle.length}건`);
  const errs = b.log.errors.filter((e) => !/favicon/.test(e));
  check("콘솔 오류 0", errs.length === 0, errs.slice(0, 3).join(" | "));

  await b.close();
  fs.writeFileSync(path.join(OUT, "e2e-book.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(out.join("\n")); console.error("CRASH", e); process.exit(1); });
