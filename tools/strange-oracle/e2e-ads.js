// 12단계 D2: 광고로 여는 조각·배너·GA4 점검. 헤드리스 Edge, 결제 꺼짐 서버. 구글 주소 요청은 CDP Fetch로 가로채 가짜 스크립트로 답한다(실제 구글 요청 0건).
// 시험용 ID는 파일에 넣지 않고 페이지가 뜰 때 window.TEXT에 끼워 넣는다(addScriptToEvaluateOnNewDocument).
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode off
// 실행: node --experimental-websocket tools/strange-oracle/e2e-ads.js
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/e2e-ads.txt
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
const PAYKEY = "PAYKEY_TEST_7731";
const ORDERID = "ORDER_TEST_5521";
const GOOGLE = /googlesyndication\.com|doubleclick\.net|googletagmanager\.com|google-analytics\.com|googleadservices\.com|adtrafficquality\.google/;

const INJECT = `(function () {
  var v;
  Object.defineProperty(window, "TEXT", { configurable: true, get: function () { return v; }, set: function (x) {
    x.analytics.ga4 = "G-TEST12345"; x.ads.adsenseClient = "ca-pub-1234567890123456"; x.ads.rewardedUnit = "/1234567/so_unlock";
    x.ads.slots.hub.id = "1234567890"; x.ads.slots["result-end"].id = "2234567890"; x.ads.slots["story-end"].id = "3234567890"; v = x; } });
  window.__gptMode = "granted"; window.__adsMode = "filled";
  var dl;
  Object.defineProperty(window, "dataLayer", { configurable: true, get: function () { return dl; }, set: function (a) {
    var push = a.push.bind(a);
    a.push = function (x) { try { console.debug("__DL " + JSON.stringify([].slice.call(x))); } catch (e) {} return push(x); };
    dl = a; } });
})();`;
const STUB_GPT = `(function () {
  var q = (window.googletag && window.googletag.cmd) || [];
  var calls = (window.__gcalls = window.__gcalls || []);
  var handlers = (window.__gh = window.__gh || {});
  var g = (window.googletag = window.googletag || {});
  g.enums = { OutOfPageFormat: { REWARDED: 4 } };
  g.pubads = function () { return { addEventListener: function (n, h) { (handlers[n] = handlers[n] || []).push(h); } }; };
  g.defineOutOfPageSlot = function () { calls.push(["define"].concat([].slice.call(arguments))); return window.__gptMode === "null" ? null : { addService: function () { return this; } }; };
  g.enableServices = function () { calls.push(["enable"]); };
  g.destroySlots = function () { calls.push(["destroy"]); };
  g.display = function (s) {
    calls.push(["display"]);
    var mode = window.__gptMode;
    var fire = function (n, ev) { ev.slot = s; (handlers[n] || []).forEach(function (h) { h(ev); }); };
    setTimeout(function () {
      if (mode === "empty") return fire("slotRenderEnded", { isEmpty: true });
      if (mode === "never") return;
      fire("rewardedSlotReady", { makeRewardedVisible: function () { calls.push(["visible"]); } });
      setTimeout(function () { if (mode === "granted") fire("rewardedSlotGranted", {}); fire("rewardedSlotClosed", {}); }, 50);
    }, 50);
  };
  g.cmd = { push: function (f) { f(); } };
  [].slice.call(q).forEach(function (f) { f(); });
})();`;
const STUB_ADS = `(function () {
  var calls = (window.__acalls = window.__acalls || []);
  function proc() { document.querySelectorAll("ins.adsbygoogle:not([data-ad-status])").forEach(function (ins) {
    calls.push([ins.getAttribute("data-ad-client"), ins.getAttribute("data-ad-slot")]);
    var f = window.__adsMode !== "unfilled"; ins.setAttribute("data-ad-status", f ? "filled" : "unfilled");
    if (f) { ins.style.height = "100px"; ins.style.background = "#999"; } }); }
  window.adsbygoogle = { push: proc }; proc();
})();`;

(async () => {
  const b = await launch({ port: 9617, reduced: true });
  const { evaluate: ev, sleep, send } = b;
  const ext = []; // 가로챈 구글 요청 (url, 본문)
  let blockGpt = false;
  b.on(async (m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId, request } = m.params;
    ext.push({ url: request.url, body: request.postData || "" });
    if (/gpt\.js/.test(request.url) && blockGpt) return send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
    const body = /gpt\.js/.test(request.url) ? STUB_GPT : /adsbygoogle\.js/.test(request.url) ? STUB_ADS : "/* stub */";
    send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/javascript" }, { name: "Access-Control-Allow-Origin", value: "*" }], body: Buffer.from(body).toString("base64") });
  });
  await send("Fetch.enable", { patterns: ["*googlesyndication.com*", "*doubleclick.net*", "*googletagmanager.com*", "*google-analytics.com*", "*googleadservices.com*", "*adtrafficquality.google*"].map((urlPattern) => ({ urlPattern })) });

  const waitFor = async (expr, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(40); } return false; };
  const waitScreen = (id, ms = 6000) => waitFor(`document.querySelector('.screen.is-active')?.id === ${JSON.stringify(id)}`, ms);
  const googleTags = () => ev(`[...document.scripts].filter(s => /google|doubleclick/.test(s.src)).map(s => s.src)`);
  const seed = (rooms) => ev(`(() => {
    const R = ${JSON.stringify(rooms)}, v = {};
    if (R.includes('ogham')) v.ogham = { ogham: 2, archetype: OGHAM[2].archetype };
    if (R.includes('star')) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: NAKSHATRAS[4].archetype };
    if (R.includes('decan')) v.decan = { decan: 10, when: null, archetype: DECANS[10].archetype };
    if (R.includes('tzolkin')) v.tzolkin = { number: 4, sign: 19, archetype: TZOLKIN_SIGNS[19].archetype };
    if (R.includes('rune')) v.rune = { picks: [RUNES[0].code, RUNES[5].code, RUNES[10].code], topic: 'me', archetype: RUNES[10].archetype };
    if (R.includes('sibyl')) v.sibyl = { sors: 12, topic: 'love', archetype: ORACLES[12].archetype };
    sessionStorage.setItem('strange-oracle', JSON.stringify({ profile: ${JSON.stringify(PROFILE)}, visits: v }));
  })()`);
  const room = (r, expr) => ev(`(() => { const s = document.querySelector('#screen-${r}-result'); const box = s.querySelector('[data-js=result-turn]'); const lock = box.querySelector('[data-js=unlock]'); const text = box.querySelector('[data-js=turn-text]'); const status = box.querySelector('[data-js=unlock-status]'); const btn = box.querySelector('[data-js=unlock-btn]'); return ${expr}; })()`);
  const openRoom = async (r) => { await b.goto(BASE + "#" + r + "-result"); return waitScreen(`screen-${r}-result`); };

  // ═══ 1. ID 모두 빈 값 (파일 그대로) ═══
  await b.goto(BASE);
  const TEXT_UNAVAILABLE = await ev("TEXT.unlock.unavailable");
  await ev("sessionStorage.clear()");
  await seed(ORDER);
  for (const r of ORDER) {
    await openRoom(r);
    const st = await room(r, `({ locked: box.classList.contains('is-locked'), lockShown: !lock.hidden, text: text.textContent.trim().length, ads: s.querySelectorAll('.ad-slot.is-filled').length, h: [...s.querySelectorAll('[data-ad]')].map(a => a.getBoundingClientRect().height).join(',') })`);
    // (운영자 결정 2026-10-01 ads.lockAlways) 광고 ID가 없어도 잠금은 보이고, 누르면 '광고 없음' 안내와 함께 바로 열린다
    check(`빈 ID + lockAlways: ${r} 잠금 보임·단락 비어 있음·광고 자리 높이 0`, st.locked && st.lockShown && st.text === 0 && st.ads === 0 && /^0(,0)*$/.test(st.h), JSON.stringify(st));
    await room(r, "btn.click()");
    await sleep(150);
    const op = await room(r, `({ locked: box.classList.contains('is-locked'), lockShown: !lock.hidden, text: text.textContent.trim().length, msg: status.textContent.trim() })`);
    check(`빈 ID + lockAlways: ${r} 누르면 바로 열림·광고 없음 안내`, !op.locked && !op.lockShown && op.text > 0 && op.msg === TEXT_UNAVAILABLE, JSON.stringify(op));
  }
  await b.goto(BASE + "#hub");
  await waitScreen("screen-hub");
  check("빈 ID: 구글 script 태그 0개", (await googleTags()).length === 0);
  check("빈 ID: 쿠키 줄 숨김·FAQ 광고 안내 보임(lockAlways), dataLayer·googletag 없음", await ev("document.querySelector('[data-js=cookie-line]').hidden && !document.querySelector('[data-js=hub-faq-adnote]').hidden && !window.dataLayer && !window.googletag && !window.adsbygoogle"));
  check("빈 ID: 가로챈 구글 요청 0건", ext.length === 0, ext.length);

  // ═══ 2. 시험 ID 끼워 넣기 ═══
  const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", { source: INJECT });
  await ev("sessionStorage.clear()");
  await b.goto(BASE);
  await waitScreen("screen-hub");
  await sleep(300);
  check("ID 있음: 입구 쿠키 줄·FAQ 광고 안내(1번 답 끝) 보임", await ev("!document.querySelector('[data-js=cookie-line]').hidden && !document.querySelector('[data-js=hub-faq-adnote]').hidden && document.querySelector('[data-js=hub-faq-adnote]').closest('.faq__item').querySelector('dt').dataset.t === 'hub.faq.items.1.q'"));
  check("ID 있음: 입구 배너 채움 1개 + '광고' 표시", await ev("(() => { const a = document.querySelectorAll('#screen-hub .ad-slot.is-filled'); return a.length === 1 && a[0].querySelector('.ad-slot__label').textContent === TEXT.ads.label; })()"));
  const cfg = await ev("JSON.stringify((window.dataLayer||[]).map(a => [...a]).find(a => a[0] === 'config'))");
  check("gtag config: send_page_view false·신호 끔·page_location에 ?·# 없음", /"send_page_view":false/.test(cfg) && /"allow_google_signals":false/.test(cfg) && /"allow_ad_personalization_signals":false/.test(cfg) && /"page_location":"http:\/\/127\.0\.0\.1:8788\/products\/strange-oracle\/index\.html"/.test(cfg), cfg);
  check("gpt.js는 버튼 전에는 안 불러옴", !(await googleTags()).some((s) => /gpt\.js/.test(s)));
  // 이어가기 코드 (전수 검색용 문자열)
  await seed(ORDER);
  await b.goto(BASE + "#hub");
  await waitScreen("screen-hub");
  await ev("document.querySelector('[data-js=resume-make-toggle]').click()");
  const RESUME = (await ev("document.querySelector('[data-js=resume-code]').textContent")).trim();
  check("이어가기 코드 만듦 (검색용)", RESUME.length > 5, RESUME);

  // 잠김 상태 (여섯 방)
  for (const r of ORDER) {
    await openRoom(r);
    const st = await room(r, `({ locked: box.classList.contains('is-locked'), lockShown: !lock.hidden, html: text.innerHTML, btn: btn.textContent, ads: document.querySelectorAll('#screen-${r}-result .ad-slot.is-filled').length, w: document.documentElement.scrollWidth <= innerWidth })`);
    const ok = r === "star" ? true : true;
    check(`잠김: ${r} 잠금 상자·turn-text 비어 있음·버튼에 '광고'·배너 ≤2·넘침 없음`, ok && st.locked && st.lockShown && st.html === "" && st.btn.includes("광고") && st.ads <= 2 && st.w, JSON.stringify(st));
  }
  // 잠긴 문장이 DOM에 없음 (데칸: DECANS[10].turn)
  await openRoom("decan");
  check("잠김: 잠긴 문장이 DOM 어디에도 없음(데칸)", await ev("(() => { const t = DECANS[10].turn.replace(/<[^>]+>/g, '').slice(0, 20); return !document.body.innerHTML.includes(t) && !document.body.innerText.includes(t); })()"));

  // closed → 잠긴 채, 다시 → granted
  await openRoom("ogham");
  await ev("window.__gptMode = 'closed'");
  await room("ogham", "btn.click()");
  check("closed: 기다림 표시(버튼 비활성·aria-busy·loading 글)", await room("ogham", "lock.classList.contains('is-waiting') && btn.disabled && btn.getAttribute('aria-busy') === 'true' && status.textContent === TEXT.unlock.loading"));
  await waitFor(`(() => { const st = document.querySelector('#screen-ogham-result [data-js=unlock-status]'); return st.textContent === TEXT.unlock.closed; })()`, 3000);
  check("closed: 잠긴 채·안내 한 줄·버튼 다시 켜짐·기록 없음", await room("ogham", "box.classList.contains('is-locked') && !lock.hidden && lock.classList.contains('is-closed') && !btn.disabled && text.innerHTML === '' && status.textContent === TEXT.unlock.closed && !sessionStorage.getItem('strange-oracle-unlock')"));
  await ev("window.__gptMode = 'granted'");
  await room("ogham", "btn.click()");
  await waitFor("document.querySelector('#screen-ogham-result [data-js=unlock]').hidden", 3000);
  check("granted: 단락 열림·포커스 turn-text·상자 숨김", await room("ogham", "!box.classList.contains('is-locked') && lock.hidden && text.innerHTML.length > 0 && document.activeElement === text && status.querySelector('.visually-hidden')?.textContent === TEXT.unlock.opened"));
  check("granted: sessionStorage에 그 방만 {\"ogham\":1}", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === '{"ogham":1}');
  check("보상형 요청 인자 = 광고단위만", await ev("JSON.stringify(window.__gcalls.find(c => c[0] === 'define')) === JSON.stringify(['define', '/1234567/so_unlock', 4])"));
  await b.goto(BASE + "#ogham-result");
  await waitScreen("screen-ogham-result");
  check("새로고침 뒤에도 열림", await room("ogham", "!box.classList.contains('is-locked') && lock.hidden && text.innerHTML.length > 0"));

  // unavailable: isEmpty / null / 8초 / 스크립트 차단
  const unav = async (r, setup, label, ms = 3000) => {
    await openRoom(r);
    await ev(setup);
    const t0 = Date.now();
    await room(r, "btn.click()");
    const ok = await waitFor(`document.querySelector('#screen-${r}-result [data-js=unlock]').hidden`, ms);
    const st = await room(r, "({ open: !box.classList.contains('is-locked') && text.innerHTML.length > 0, status: status.textContent === TEXT.unlock.unavailable, focus: document.activeElement === text })");
    check(`unavailable(${label}): ${r} 바로 열림·안내 한 줄·포커스`, ok && st.open && st.status && st.focus, `${Date.now() - t0}ms ${JSON.stringify(st)}`);
  };
  await unav("star", "window.__gptMode = 'empty'", "isEmpty");
  await unav("decan", "window.__gptMode = 'null'", "null 슬롯");
  await unav("tzolkin", "window.__gptMode = 'never'", "8초 초과", 11000);
  // 스크립트 차단: 새 페이지(gpt.js를 아직 안 불러온 상태)에서
  blockGpt = true;
  await b.goto(BASE + "#hub");
  await waitScreen("screen-hub");
  await unav("rune", "void 0", "gpt.js 차단");
  blockGpt = false;
  check("열린 방 기록 = 방 이름만", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === '{"ogham":1,"star":1,"decan":1,"tzolkin":1,"rune":1}', await ev("sessionStorage.getItem('strange-oracle-unlock')"));
  // 잠금은 진행에 영향 없음: 시빌라는 잠긴 채로도 마친 방·나의 이야기 6/6
  check("잠긴 방(시빌라)도 마친 방 6개·원형 그대로", (await ev("StrangeOracle.filledRooms().length")) === 6 && Boolean(await ev("StrangeOracle.currentArchetype()")));
  await b.goto(BASE + "#story");
  await waitScreen("screen-story");
  await sleep(200);
  check("나의 이야기: 배너 ≤2", (await ev("document.querySelectorAll('#screen-story .ad-slot.is-filled').length")) <= 2);

  // 이벤트
  // 화면 이동 이벤트는 페이지 안에서 옮겨 다닐 때 생긴다 (새로고침 직후 첫 화면은 광고·분석 시작 전이라 so_visit만)
  await ev("StrangeOracle.go('hub')");
  await ev("StrangeOracle.go('sibyl-result')");
  await waitScreen("screen-sibyl-result");
  await ev("StrangeOracle.go('rune-intro')");
  await ev("StrangeOracle.go('story')");
  await waitScreen("screen-story");
  const allDl = () => b.log.console.filter((l) => l.startsWith("debug: __DL ")).map((l) => JSON.parse(l.slice(12)));
  const evs = allDl().filter((a) => a[0] === "event");
  check("이벤트: 허용 이름만 (so_*), 자동 page_view·scroll·form 없음", evs.every((e) => /^so_(visit|room_view|result|story|unlock|share|resume|book)$/.test(e[1])) && !evs.some((e) => /page_view|scroll|form_|view_search/.test(e[1])), [...new Set(evs.map((e) => e[1]))].join(","));
  check("이벤트: so_unlock request/closed/granted/unavailable 기록", ["request", "closed", "granted", "unavailable"].every((o) => evs.some((e) => e[1] === "so_unlock" && e[2].outcome === o)));
  check("이벤트: so_resume made·so_story 6of6·so_result(room·archetype만)", evs.some((e) => e[1] === "so_resume" && e[2].step === "made") && evs.some((e) => e[1] === "so_story" && e[2].step === "6of6") && evs.filter((e) => e[1] === "so_result").every((e) => Object.keys(e[2]).sort().join() === "archetype,room"));
  check("이벤트 속성 키는 room·archetype·step·method·outcome뿐", evs.every((e) => Object.keys(e[2] || {}).every((k) => ["room", "archetype", "step", "method", "outcome"].includes(k))));

  // 내 정보 지우기 → 잠금 기록도 사라짐
  await ev("document.querySelector('[data-js=clear-open]').click()");
  await sleep(100);
  await ev("document.querySelector('[data-js=clear-confirm]').click()");
  await sleep(200);
  check("내 정보 지우기 → strange-oracle-unlock 없음", (await ev("sessionStorage.getItem('strange-oracle-unlock')")) === null && (await ev("sessionStorage.getItem('strange-oracle')")) === null);
  check("localStorage·쿠키에 제품이 쓴 값 0", (await ev("localStorage.length")) === 0 && (await ev("document.cookie")) === "");

  // 수집 (전수 검색용) — 이 페이지 기록은 goto 때 사라지므로 지금 모은다
  const dump1 = await ev("JSON.stringify({ dl: (window.dataLayer||[]).map(a => [...a]), g: window.__gcalls || [], a: window.__acalls || [], ins: [...document.querySelectorAll('ins.adsbygoogle')].map(i => i.outerHTML) })");

  // ═══ 3. 결제 복귀 주소: query가 지워지기 전에는 아무것도 안 불러옴 ═══
  const nExt = ext.length;
  await b.goto(`${BASE}?pay=success&paymentKey=${PAYKEY}&orderId=${ORDERID}&amount=3900`);
  await sleep(1500);
  check("결제 복귀(success): query 남아 있는 동안 구글 script 0·dataLayer·googletag·adsbygoogle 없음·가로챈 요청 0", (await googleTags()).length === 0 && (await ev("!window.dataLayer && !window.googletag && !window.adsbygoogle && location.search.length > 0")) && ext.length === nExt, await ev("location.search"));
  await b.goto(`${BASE}?pay=fail&code=PAY_PROCESS_CANCELED&orderId=${ORDERID}&paymentKey=${PAYKEY}`);
  await waitFor("location.search === '' && Array.isArray(window.dataLayer)", 5000);
  const dump2 = await ev("JSON.stringify({ dl: (window.dataLayer||[]).map(a => [...a]), href: location.href, tags: [...document.scripts].map(s => s.src) })");
  check("결제 복귀(fail): stripQuery 뒤에 시작, 인자·요청에 paymentKey·orderId 시험값 0건", !dump2.includes(PAYKEY) && !dump2.includes(ORDERID) && !ext.some((x) => (x.url + x.body).includes(PAYKEY) || (x.url + x.body).includes(ORDERID)), JSON.parse(dump2).href);

  // ═══ 4. 결제와 무관한 query는 시작할 때 지움 ═══
  await b.goto(`${BASE}?fbclid=FBCLID_TEST&utm_source=insta`);
  await waitFor("Array.isArray(window.dataLayer)", 4000);
  check("fbclid·utm_* query: 시작 때 지우고 광고·분석 켬", (await ev("location.search")) === "" && (await ev("!!document.querySelector('#screen-hub .ad-slot.is-filled')")) && !ext.some((x) => x.url.includes("FBCLID_TEST")));

  // ═══ 5. 이어가기 코드로 복원한 새 탭은 잠긴 채 시작 ═══
  await ev("sessionStorage.clear()");
  await b.goto(BASE);
  await waitScreen("screen-hub");
  await ev(`(() => { document.querySelector('[data-js=resume-enter-toggle]').click(); const i = document.querySelector('[data-js=resume-input]'); i.value = ${JSON.stringify(RESUME)}; document.querySelector('[data-js=resume-go]').click(); })()`);
  await sleep(300);
  await openRoom("ogham");
  check("복원 탭: 오검 잠긴 채", await room("ogham", "box.classList.contains('is-locked') && !lock.hidden"));
  await openRoom("star");
  check("복원 탭: 별(복원 상태)은 잠금 UI 없음", await room("star", "!box.classList.contains('is-locked') && lock.hidden"));
  const dump3 = await ev("JSON.stringify({ dl: (window.dataLayer||[]).map(a => [...a]) })");

  // ═══ 6. 전수 검색: 입력값·코드가 구글 쪽 인자·요청에 0건 ═══
  const hay = [JSON.stringify(allDl()), dump1, dump2, dump3, JSON.stringify(ext), b.log.requests.filter((u) => GOOGLE.test(u)).join("\n")].join("\n");
  const SECRETS = [NAME, "1995", "19950325", "14:37", "1437", RESUME, RESUME.replace(/[^A-Za-z0-9]/g, ""), PAYKEY, ORDERID, "FBCLID_TEST", "utm_source"];
  const hits = SECRETS.filter((s) => s && hay.includes(s));
  check("전수 검색: 이름·생일·시각·이어가기 코드·결제 시험값·query 값 0건", hits.length === 0, hits.join(","));
  check("세부 결과 번호 키 0건 (ogham·nak·decan·sors 등 숫자 칸)", !/"(ogham|nak|decan|number|sign|sors|picks)":/.test(hay));
  const real = b.log.requests.filter((u) => GOOGLE.test(u)).map((u) => u.replace(/^\w+ /, ""));
  check("구글 주소 요청은 모두 가로채 가짜로 답함 (실제 전송 0)", real.every((u) => ext.some((x) => x.url === u)), `${real.length}건 / 가로챔 ${ext.length}`);
  // 예상된 오류 둘은 뺀다: gpt.js 차단 시험 자체, 결제 꺼짐 서버에서 pay=success 복귀의 /api/confirm 404(12단계 전과 같은 동작)
  const errs = b.log.errors.filter((e) => !/ERR_BLOCKED_BY_CLIENT.*gpt\.js|404.*\/api\/confirm/.test(e));
  check("콘솔 오류 0 (예상된 차단·confirm 404 제외)", errs.length === 0, errs.slice(0, 3).join(" | "));
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });

  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-ads.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
