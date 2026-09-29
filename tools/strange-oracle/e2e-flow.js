// 8단계 무료 흐름 점검 (입구 첫 화면·입구 버튼·뒤로 가기 기록·상징 떠오름·짧은 무료 결과·입력 건너뜀·의식 건너뛰기·결말). 헤드리스 Edge, 결제 꺼짐 서버.
// 준비: node tools/build-dist.js
//       node tools/strange-oracle/mock-server.js --port 8788 --mode off   (mock-server는 시작할 때 api/_paid를 읽어 두므로 바꿨으면 다시 켤 것)
// 실행: node --experimental-websocket tools/strange-oracle/e2e-flow.js [reduced|motion]
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/p8<r|m>-*.png, result.txt
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mode = process.argv[2] || "reduced";
const reduced = mode === "reduced";
const BASE = "http://127.0.0.1:8788/products/strange-oracle/index.html";
const OUT = path.join(__dirname, "out");
const PROD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const ORDER = ["ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const NAME = "김서윤";

// 유료 문장 목록 (D-4 확장판): api/_paid 전부(8단계 identity.rest·event.lede 포함), 12자 이상. 무료 칸(key·summary)과 원래 같은 문장은 build-dist.js와 같은 규칙으로 뺀다
function paidSentences() {
  const set = new Set();
  const collect = (v) => (typeof v === "string" ? v.length >= 12 && set.add(v) : Array.isArray(v) ? v.forEach(collect) : v && typeof v === "object" && Object.entries(v).forEach(([k, x]) => k !== "code" && collect(x)));
  for (const f of fs.readdirSync(path.join(PROD, "api", "_paid"))) collect(require(path.join(PROD, "api", "_paid", f)));
  const free = [];
  for (const f of fs.readdirSync(PROD).filter((n) => /^data-.*\.js$/.test(n))) {
    const w = {};
    vm.runInNewContext(fs.readFileSync(path.join(PROD, f), "utf8"), { window: w });
    const grab = (v, k) => (typeof v === "string" ? (k === "key" || k === "summary") && free.push(v) : Array.isArray(v) ? v.forEach((x) => grab(x, k)) : v && typeof v === "object" && Object.entries(v).forEach(([kk, x]) => grab(x, k === "summary" ? k : kk)));
    Object.values(w).forEach((v) => grab(v, ""));
  }
  return [...set].filter((s) => !free.some((t) => t.includes(s)));
}

(async () => {
  const PAID = paidSentences();
  const b = await launch({ port: reduced ? 9613 : 9614, reduced, shimRaf: !reduced });
  const { evaluate: ev, shot, sleep } = b;
  const P = reduced ? "p8r-" : "p8m-";
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no el " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const active = () => ev(`document.querySelector('.screen.is-active')?.id`);
  const waitFor = async (expr, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(40); } return false; };
  const waitScreen = (id, ms) => waitFor(`document.querySelector('.screen.is-active')?.id === ${JSON.stringify(id)} && document.querySelector('[data-js=sigil-rise]').classList.contains('is-hidden')`, ms);
  const has = (sel, cls) => ev(`document.querySelector(${JSON.stringify(sel)}).classList.contains(${JSON.stringify(cls)})`);
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent || ''`);
  const noHScroll = async (label) => { const w = await ev("[document.documentElement.scrollWidth, window.innerWidth]"); check(`360px 가로 넘침 없음 (${label})`, w[0] <= w[1], w.join("/")); };
  const doors = () => ev(`${JSON.stringify(ORDER)}.map(r => { const d = document.querySelector('[data-js=hub-door-' + r + ']'); return r + ':' + ['is-visited','is-next','is-locked'].filter(c => d.classList.contains(c)).join('+') + (d.getAttribute('aria-disabled') === 'true' ? '(aria)' : ''); }).join(' ')`);
  const store = () => ev("sessionStorage.getItem('strange-oracle') || ''");
  const seed = (rooms, profile = { name: NAME, birth: { y: 1995, m: 3, d: 25 } }) => ev(`(() => {
    const R = ${JSON.stringify(rooms)}, v = {};
    if (R.includes('ogham')) v.ogham = { ogham: 2, archetype: OGHAM[2].archetype };
    if (R.includes('star')) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: NAKSHATRAS[4].archetype };
    if (R.includes('decan')) v.decan = { decan: 10, when: null, archetype: DECANS[10].archetype };
    if (R.includes('tzolkin')) v.tzolkin = { number: 4, sign: 19, archetype: TZOLKIN_SIGNS[19].archetype };
    if (R.includes('rune')) v.rune = { picks: [RUNES[0].code, RUNES[5].code, RUNES[10].code], topic: 'me', archetype: RUNES[10].archetype };
    if (R.includes('sibyl')) v.sibyl = { sors: 12, topic: 'love', archetype: ORACLES[12].archetype };
    sessionStorage.setItem('strange-oracle', JSON.stringify({ profile: ${JSON.stringify(profile)}, visits: v }));
  })()`);
  const freeLeak = async (room) => {
    const text = await ev(`document.querySelector('#screen-${room}-result').innerText`);
    return PAID.filter((s) => text.includes(s));
  };
  const hookCards = () => ev(`(() => { window.__cards = []; window.__opts = []; const r = ShareCard.render; ShareCard.render = (o) => { window.__opts.push(JSON.stringify(o)); return r(o); }; ShareCard.share = async (c) => { window.__cards.push(c.toDataURL('image/png')); return 'downloaded'; }; })()`);
  // (9단계) 안내자 대사 칸: scope 안 [data-js=name]의 .say__line이 화면에 보이고 글자가 있는지
  const sayLine = (scope, name) => ev(`(() => { const b = document.querySelector(${JSON.stringify(scope)} + ' [data-js=' + ${JSON.stringify(name)} + ']'); const l = b && b.querySelector('.say__line'); return { shown: !!b && getComputedStyle(b).display !== 'none', text: (l ? l.textContent : (b ? b.textContent : '')).trim() }; })()`);
  const roomShape = (room) => ev(`(() => { const s = document.querySelector('#screen-${room}-result');
    return { chapters: s.querySelectorAll('[data-js=result-chapter], [data-js=result-toc], [data-js=result-sealed], [data-ad=result-mid]').length,
      reading: s.querySelector('[data-js=reading-body]').children.length, ads: s.querySelectorAll('[data-js=ad-slot]').length,
      goStory: s.querySelectorAll('[data-js=result-go-story]').length, bookLine: s.querySelector('[data-js=result-book-line]').classList.contains('is-hidden') }; })()`);

  // ═══ 1. 새 세션: 어떤 주소로 와도 입구 (인트로 없음) ═══
  await b.goto(BASE);
  await ev("sessionStorage.clear()");
  await b.goto(BASE + "#rune");
  check("새 세션 + #rune 딥링크 → 입구", await waitScreen("screen-hub", 4000));
  check("인트로 화면·옛 뒤로 버튼 마크업 없음", (await ev("!document.querySelector('#screen-intro') && !document.querySelector('[data-js=topbar-back]')")));
  check("입구에서는 입구 버튼 숨김", await has("[data-js=topbar-home]", "is-hidden"));
  check("주 버튼 = 첫 번째 문 열기(Ⅰ 오검)", (await txt("[data-js=hub-cta-label]")) === (await ev("TEXT.hub.cta.first")) && (await ev("document.querySelector('[data-js=hub-cta]').dataset.room")) === "ogham");
  check("지금까지의 이야기 = 0방이면 숨김", await has("[data-js=hub-sofar]", "is-hidden"));
  const faq = await ev("[...document.querySelectorAll('[data-js=hub-faq] dd')].reduce((a, d) => a + d.textContent.replace('[초안] ', '').length, 0)");
  check("자주 묻는 것: 펼친 채 답 합계 300자 이상", faq >= 300 && (await ev("[...document.querySelectorAll('[data-js=hub-faq] dd')].every(d => d.offsetHeight > 0)")), String(faq));
  check("입구 광고 1개", (await ev("document.querySelectorAll('#screen-hub [data-js=ad-slot]').length")) === 1);
  check("첫 화면(스크롤 전)에 주 버튼·여정 칩 보임", await ev("(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return r('[data-js=hub-cta]').bottom <= innerHeight && document.querySelector('.journey__chip').getBoundingClientRect().bottom <= innerHeight; })()"));
  check("입구 전에는 저장소 비어 있음", (await store()) === "");
  const d0 = await doors();
  check("문 상태: Ⅰ만 is-next, Ⅱ~Ⅵ 잠김(aria-disabled)", d0 === "ogham:is-next star:is-locked(aria) decan:is-locked(aria) tzolkin:is-locked(aria) rune:is-locked(aria) sibyl:is-locked(aria)", d0);
  await click("[data-js=hub-door-decan]");
  await sleep(60);
  check("잠긴 문 누름 → 흔들림 + 안내, 이동 없음", (await has("[data-js=hub-door-decan]", "is-denied")) && (await active()) === "screen-hub");
  await noHScroll("입구");
  await shot(P + "01-hub.png");

  // ═══ 2. 주 버튼 → 상징 떠오름 → Ⅰ 오검 시작 ═══
  const t0 = Date.now();
  await click("[data-js=hub-cta]");
  check("상징 오버레이 재생(data-room=ogham)", (await ev("document.querySelector('[data-js=sigil-rise]').dataset.room")) === "ogham" && !(await has("[data-js=sigil-rise]", "is-hidden")));
  if (!reduced) {
    await sleep(250);
    await click("[data-js=sigil-rise]");
    check("움직임: 누르면 건너뛰기(.is-skipped)", await has("[data-js=sigil-rise]", "is-skipped"));
  }
  check("→ 오검 시작 화면", await waitScreen("screen-ogham-intro", 3000));
  const dt = Date.now() - t0;
  check(reduced ? "움직임 줄이기: 전환 400ms 이하(+측정 여유 250ms)" : "움직임: 건너뛰기로 1.2초 전에 도착", reduced ? dt <= 650 : dt < 1200, dt + "ms");
  check("방 화면 상단: 입구 버튼 + 'I 오검의 방 1/6'", !(await has("[data-js=topbar-home]", "is-hidden")) && (await txt("[data-js=read-label]")).replace(/\s+/g, " ").trim() === "I 오검의 방 1/6");
  check("주소 해시 = 화면 이름(#ogham-intro)", (await ev("location.hash")) === "#ogham-intro");
  const greet = await sayLine("#screen-ogham-intro", "guide-greet");
  check("9단계: 방 시작 인사(안내자) 보이고 글자 있음", greet.shown && greet.text.length > 0, greet.text);

  // ═══ 3. 오검 실제로 마치기 (입력 → 의식 → 결과) ═══
  await click("[data-js=ogham-intro-go]");
  await waitScreen("screen-ogham-input", 4000);
  await ev(`(() => { const i = document.querySelector('[data-js=ogham-name]'); i.value = ${JSON.stringify(NAME)}; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click("[data-js=ogham-input-go]");
  await waitScreen("screen-ogham-ritual", 4000);
  const ritualG = await sayLine("#screen-ogham-ritual", "guide-ritual");
  check("9단계: 의식 중 안내자 한마디 보이고 글자 있음", ritualG.shown && ritualG.text.length > 0, ritualG.text);
  for (let i = 0; i < 40 && !(await ev("document.querySelector('#screen-ogham-ritual').classList.contains('is-carved')")); i++) { await click("[data-js=ogham-bark]"); await sleep(80); }
  check("오검 결과", await waitScreen("screen-ogham-result", 8000));
  await sleep(300);
  const sh = await roomShape("ogham");
  check("방 결과: 장 목차·장 섹션·봉인·장 사이 광고 0개", sh.chapters === 0, JSON.stringify(sh));
  check("핵심 풀이 채움 + 광고 1개 + '나의 이야기 보기' 링크 없음(U7)", sh.reading >= 3 && sh.ads === 1 && sh.goStory === 0, JSON.stringify(sh));
  check("결제 꺼짐: 책 한 줄 숨김", sh.bookLine === true);
  const leak1 = await freeLeak("ogham");
  check("D-4 확장: 무료 화면에 유료 문장(identity.rest·event.lede 포함) 0", leak1.length === 0, leak1.slice(0, 2).join(" | "));
  check("공유 = 카드 아래 주 1개 + 글자 링크, 다시 보기 = 글자 링크(U6)", (await ev("document.querySelector('#screen-ogham-result [data-js=result-retry]').classList.contains('text-link') && document.querySelector('#screen-ogham-result [data-js=result-share]').classList.contains('text-link')")));
  check("다음 문 바로 위아래 광고 없음", await ev(`(() => { const p = document.querySelector('#screen-ogham-result [data-js=result-passage]'); const n = (e) => e && e.dataset.js === 'ad-slot'; return !n(p.previousElementSibling) && !n(p.nextElementSibling); })()`));
  const openG = await sayLine("#screen-ogham-result", "guide-open");
  const closeG = await sayLine("#screen-ogham-result", "guide-close");
  check("9단계: 결과 여는말 보이고 글자 있음(자리표시 {who} 남지 않음)", openG.shown && openG.text.length > 0 && !openG.text.includes("{who}"), openG.text);
  check("9단계: 결과 닫는말 보이고 글자 있음", closeG.shown && closeG.text.length > 0, closeG.text);
  check("9단계: 다음 문 위 바통(다리)에 안내자 이름 보임", await ev("(() => { const b = document.querySelector('#screen-ogham-result [data-js=guide-bridge]'); return !!b && getComputedStyle(b).display !== 'none' && b.querySelector('.say__name').textContent.trim().length > 0 && b.querySelector('[data-js=result-bridge]').textContent.trim().length > 0; })()"));
  await hookCards();
  await click("#screen-ogham-result [data-js=result-share]");
  await waitFor("window.__opts.length > 0", 5000);
  const shareOpts = await ev("window.__opts[0] || ''");
  check("9단계: 방 공유 카드에 guideSignature 전달(안내자 이름 포함)", shareOpts.includes('"guideSignature"') && shareOpts.includes(await ev("TEXT.guides.ogham.name")));
  check("상단 읽기 막대 없음(방 화면)", !(await has("[data-js=topbar]", "is-reading")));
  await noHScroll("오검 결과");
  await shot(P + "02-ogham-result.png", true);

  // ═══ 4. 뒤로 가기(U1): 사이트를 나가지 않고, 의식을 다시 틀지 않는다 ═══
  await ev("history.back()");
  await sleep(700);
  check("결과에서 뒤로 → 오검 시작(의식·입력 아님)", (await active()) === "screen-ogham-intro");
  await ev("history.back()");
  await sleep(700);
  check("한 번 더 뒤로 → 입구", (await active()) === "screen-hub" && (await ev("location.href.startsWith('http://127.0.0.1:8788/')")));
  check("입구: 1/6 · 지금까지 줄(오검 결과 이름) + ? 줄 5개", (await txt("[data-js=hub-progress-count]")) === "1/6" && (await ev("document.querySelectorAll('[data-js=sofar-line]').length")) === 1 && (await ev("document.querySelectorAll('#screen-hub .so-far__item.is-upcoming').length")) === 5 && (await txt("[data-js=sofar-result]")) === (await ev("OGHAM[JSON.parse(sessionStorage.getItem('strange-oracle')).visits.ogham.ogham].title")));
  check("주 버튼 = II 별의 방 열기", (await ev("document.querySelector('[data-js=hub-cta]').dataset.room")) === "star" && (await txt("[data-js=hub-cta-num]")) === "II");
  await click("[data-js=sofar-line]");
  check("지금까지 줄 → 결과 다시 보기(번쩍)", await waitScreen("screen-ogham-result", 3000));
  await click("#screen-ogham-result [data-js=result-next-door]");
  check("다음 문 → 상징(별) → Ⅱ 별의 방 시작", (await ev("document.querySelector('[data-js=sigil-rise]').dataset.room")) === "star" && (await waitScreen("screen-star-intro", 3000)));
  await click("[data-js=topbar-home]");
  check("입구 버튼 → 입구", await waitScreen("screen-hub", 3000));

  // ═══ 5. 입력 건너뜀(U3)·의식 건너뛰기(U4): 데칸 ═══
  await seed(["ogham", "star"]);
  await b.goto(BASE);
  await waitScreen("screen-hub", 3000);
  await click("[data-js=hub-cta]");
  await waitScreen("screen-decan-intro", 3000);
  check("데칸 시작: 저장값 한 줄 보임(1995. 3. 25. 기준, 데칸 경계일 아님)", !(await has("#screen-decan-intro [data-js=room-saved]", "is-hidden")) && (await txt("#screen-decan-intro [data-js=room-saved-value]")).includes("1995"));
  const t1 = Date.now();
  await click("[data-js=decan-intro-go]");
  check("탭 2번(주 버튼·시작) 만에 의식 시작(입력 화면 건너뜀)", await waitScreen("screen-decan-ritual", 2000));
  const ritualDecan = await sayLine("#screen-decan-ritual", "guide-ritual");
  check("9단계: 데칸 의식에 안내자 한마디 + 기존 상태 라벨 함께 보임", ritualDecan.shown && ritualDecan.text.length > 0 && (await ev("(document.querySelector('#screen-decan-ritual .decan-head__label')||{}).textContent || ''")).trim().length > 0, ritualDecan.text);
  check("의식 건너뛰기 힌트 1초 뒤 보임", await waitFor("document.querySelector('#screen-decan-ritual [data-js=ritual-skip]').classList.contains('is-visible')", 2500));
  await click("#screen-decan-ritual");
  check("아무 데나 누르면 바로 결과(5.2초 기다리지 않음)", (await waitScreen("screen-decan-result", 1500)) && (!reduced ? Date.now() - t1 < 4000 : true), (Date.now() - t1) + "ms");
  const lkD = await freeLeak("decan");
  check("D-4 확장: 데칸 무료 화면 유료 문장 0", lkD.length === 0, lkD.slice(0, 2).join(" | "));
  await click("#screen-decan-result [data-js=result-retry]");
  check("정보 바꿔 다시 보기 → 입력 화면", await waitScreen("screen-decan-input", 3000));

  // ═══ 6. 별·촐킨·룬 무료 화면 ═══
  await seed(["ogham", "star", "decan", "tzolkin", "rune"]);
  for (const room of ["star", "tzolkin", "rune"]) {
    await b.goto(BASE + "#" + room);
    await waitScreen(`screen-${room}-result`, 3000);
    const s = await roomShape(room);
    const lk = await freeLeak(room);
    if (room === 'star') check('별: 맞아요 인셋이 공감 카드 안', await ev("!!document.querySelector('#screen-star-result [data-js=result-turn] [data-js=star-traits]')"));
    check(`${room}: 무료 결과·유료 문장 0·장 0개`, lk.length === 0 && s.chapters === 0 && s.reading >= 2, lk.slice(0, 1).join("") + JSON.stringify(s));
  }
  check("룬: 돌마다 소제목 + 첫 단락, 다시 던지기 없음", (await ev("document.querySelectorAll('#screen-rune-result [data-js=reading-body] .reading__sub').length")) === 3 && (await ev("document.querySelectorAll('#screen-rune-result [data-js=result-retry]').length")) === 0);
  await ev("StrangeOracle.go('rune-input')");
  await sleep(500);
  check("룬을 마친 뒤 룬 입력으로 가면 결과로", (await active()) === "screen-rune-result");

  // ═══ 7. 시빌라 → 결말 → 나의 이야기 ═══
  await seed(ORDER);
  await b.goto(BASE + "#sibyl");
  await waitScreen("screen-sibyl-result", 3000);
  const lkS = await freeLeak("sibyl");
  check("D-4 확장: 시빌라 무료 화면 유료 문장 0", lkS.length === 0, lkS.slice(0, 2).join(" | "));
  check("시빌라 = 다른 신탁 받기 버튼 유지", (await txt("#screen-sibyl-result [data-js=result-retry]")) === (await ev("TEXT.sibyl.result.retry")));
  await click("#screen-sibyl-result [data-js=result-next-door]");
  check("Ⅵ 다음 문 → 결말", await waitScreen("screen-finale", 4000));
  if (!reduced) await ev("document.querySelector('.converge').click()");
  else await waitFor("!document.querySelector('#screen-finale').classList.contains('is-running')", 2500);
  await sleep(700);
  check("결말 광고 0", (await ev("document.querySelectorAll('#screen-finale [data-js=ad-slot]').length")) === 0);
  await click("[data-js=finale-go-story]");
  check("결말 → 나의 이야기 6/6", (await waitScreen("screen-story", 4000)) && (await ev("document.querySelector('[data-js=story-archetype]').classList.contains('is-complete')")));
  await ev("history.back()");
  await sleep(600);
  check("나의 이야기에서 뒤로 → 시빌라 결과(결말 다시 안 틂)", (await active()) === "screen-sibyl-result");
  await click("[data-js=topbar-home]");
  await waitScreen("screen-hub", 3000);
  check("6/6 입구: 주 버튼 = 나의 이야기 보기, 번호판 숨김", (await ev("document.querySelector('[data-js=hub-cta]').dataset.go")) === "story" && (await has("[data-js=hub-cta-num]", "is-hidden")));
  check("6/6: '?' 줄 없음, 결제 꺼짐이면 책 카드 숨김", (await ev("document.querySelectorAll('#screen-hub .so-far__item.is-upcoming').length")) === 0 && (await has("[data-js=hub-paid]", "is-hidden")));
  await shot(P + "03-hub-done.png");

  // ═══ 8. 개인정보·오류 ═══
  const all = b.log.bodies.map((x) => x.url + " " + x.body).join("\n");
  check("요청 주소·본문에 이름 없음", !all.includes(NAME) && !all.includes(encodeURIComponent(NAME)));
  check("주소 해시에 입력값 없음(화면 이름만)", /^#?[a-z-]*$/.test(await ev("location.hash")));
  check("localStorage·쿠키 0", (await ev("localStorage.length")) === 0 && (await ev("document.cookie")) === "");
  const ext = b.log.requests.filter((r) => !r.includes("127.0.0.1:") && !r.includes("cdn.jsdelivr.net") && !r.startsWith("GET data:") && !r.startsWith("GET blob:") && !r.includes("about:blank"));
  check("외부 요청 = jsdelivr뿐", ext.length === 0, ext.join(" | "));
  check("콘솔 오류 없음", b.log.errors.length === 0, b.log.errors.join(" | "));

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, P + "result.txt"), out.join("\n") + "\n");
  const fails = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fails} PASS / ${fails} FAIL (유료 문장 ${PAID.length}개 대조)`);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log(out.join("\n")); console.error("CRASH", e); process.exit(1); });
