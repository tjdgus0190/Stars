// 8단계 무료 흐름 점검 (입구 첫 화면·입구 버튼·뒤로 가기 기록·상징 떠오름·짧은 무료 결과·입력 건너뜀·의식 건너뛰기·결말). 헤드리스 Edge, 결제 꺼짐 서버.
// 준비: node tools/build-dist.js
//       node tools/strange-oracle/mock-server.js --port 8788 --mode off   (13단계: 정적 배포 폴더 dist/public)
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
const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]; // (14단계) 새 순서
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

// 책 문장 목록 (13단계: data-book-*.js 전부, 옛 api/_paid에서 옮긴 문장 + 궁합 새 모듈), 12자 이상. 무료 칸(key·summary)과 원래 같은 문장은 build-dist.js와 같은 규칙으로 뺀다.
// 방 결과 등 무료 화면에는 책 문장이 0건이어야 한다(책 문장은 장을 열 때만).
function paidSentences() {
  const set = new Set();
  const collect = (v) => (typeof v === "string" ? v.length >= 12 && set.add(v) : Array.isArray(v) ? v.forEach(collect) : v && typeof v === "object" && Object.entries(v).forEach(([k, x]) => k !== "code" && collect(x)));
  for (const f of fs.readdirSync(PROD).filter((n) => /^data-book-.*\.js$/.test(n))) {
    const w = {};
    vm.runInNewContext(fs.readFileSync(path.join(PROD, f), "utf8"), { window: w });
    Object.values(w).forEach(collect);
  }
  const free = [];
  for (const f of fs.readdirSync(PROD).filter((n) => /^data-.*\.js$/.test(n) && !/^data-book-/.test(n))) {
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
  const seed = (rooms, profile = { name: NAME, birth: { y: 1995, m: 3, d: 25 } }) => ev(`sessionStorage.setItem('strange-oracle', ${JSON.stringify(JSON.stringify({ profile, visits: seedVisits(rooms) }))})`);
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
  check("주 버튼 = 첫 번째 문 열기(Ⅰ 만신)", (await txt("[data-js=hub-cta-label]")) === (await ev("TEXT.hub.cta.first")) && (await ev("document.querySelector('[data-js=hub-cta]').dataset.room")) === "saju");
  check("지금까지의 이야기 = 0방이면 숨김", await has("[data-js=hub-sofar]", "is-hidden"));
  // 보이는 답 합계 300자 이상 (13단계: 5번 문답은 책 문답, 결제 문답 은퇴)
  const faq = await ev("[...document.querySelectorAll('[data-js=hub-faq] dd')].filter(d => d.offsetHeight > 0).reduce((a, d) => a + d.textContent.replace('[초안] ', '').length, 0)");
  check("자주 묻는 것: 펼친 채 보이는 답 합계 300자 이상", faq >= 300, String(faq));
  check("13단계: FAQ 결제 문답 훅 없음·가격 말 없음", await ev("!document.querySelector('[data-js=hub-faq-paid]') && !/[0-9],[0-9]{3}\\s*원|결제/.test(document.querySelector('[data-js=hub-faq]').innerText)"));
  check("입구 광고 0개(14-2)", (await ev("document.querySelectorAll('#screen-hub [data-js=ad-slot], #screen-hub [data-ad]').length")) === 0);
  check("첫 화면(스크롤 전)에 주 버튼·여정 칩 보임", await ev("(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return r('[data-js=hub-cta]').bottom <= innerHeight && document.querySelector('.journey__chip').getBoundingClientRect().bottom <= innerHeight; })()"));
  check("입구 전에는 저장소 비어 있음", (await store()) === "");
  const d0 = await doors();
  check("문 상태: Ⅰ만 is-next, Ⅱ~Ⅶ 잠김(aria-disabled)", d0 === "saju:is-next ogham:is-locked(aria) star:is-locked(aria) decan:is-locked(aria) tzolkin:is-locked(aria) rune:is-locked(aria) sibyl:is-locked(aria)", d0);
  await click("[data-js=hub-door-decan]");
  await sleep(60);
  check("잠긴 문 누름 → 흔들림 + 안내, 이동 없음", (await has("[data-js=hub-door-decan]", "is-denied")) && (await active()) === "screen-hub");
  await noHScroll("입구");
  await shot(P + "01-hub.png");

  // ═══ 2. 주 버튼 → 상징 떠오름 → Ⅱ 오검 시작 (만신을 마친 상태. 만신의 방 흐름은 e2e-saju.js) ═══
  await seed(["saju"], {});
  await b.goto(BASE);
  await waitScreen("screen-hub", 3000);
  check("14-6: 입구가 그려진 뒤 다음 방(오검) 파일을 미리 받음", await waitFor("Boolean(window.OGHAM)", 6000));
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
  check("방 화면 상단: 입구 버튼 + 'II 오검의 방 2/7'", !(await has("[data-js=topbar-home]", "is-hidden")) && (await txt("[data-js=read-label]")).replace(/\s+/g, " ").trim() === "II 오검의 방 2/7");
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
  check("핵심 풀이 채움 + 광고 0개(14-2) + '나의 이야기 보기' 링크 없음(U7)", sh.reading >= 3 && sh.ads === 0 && sh.goStory === 0, JSON.stringify(sh));
  check("13단계: 방 결과 책 한 줄 보임(결제 상태와 무관)", sh.bookLine === false);
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
  check("입구: 2/7 · 지금까지 줄(만신·오검 결과 이름) 2개, '?' 줄은 만들지 않음(10-6)", (await txt("[data-js=hub-progress-count]")) === "2/7" && (await ev("document.querySelectorAll('[data-js=sofar-line]').length")) === 2 && (await ev("document.querySelectorAll('#screen-hub .so-far__item.is-upcoming').length")) === 0 && (await txt("[data-js=sofar-line][data-room=ogham] [data-js=sofar-result]")) === (await ev("OGHAM[JSON.parse(sessionStorage.getItem('strange-oracle')).visits.ogham.ogham].title")));
  check("주 버튼 = III 별의 방 열기", (await ev("document.querySelector('[data-js=hub-cta]').dataset.room")) === "star" && (await txt("[data-js=hub-cta-num]")) === "III");
  await click("[data-js=sofar-line][data-room=ogham]");
  check("지금까지 줄 → 결과 다시 보기(번쩍)", await waitScreen("screen-ogham-result", 3000));
  await click("#screen-ogham-result [data-js=result-next-door]");
  check("다음 문 → 상징(별) → Ⅲ 별의 방 시작", (await ev("document.querySelector('[data-js=sigil-rise]').dataset.room")) === "star" && (await waitScreen("screen-star-intro", 3000)));
  await click("[data-js=topbar-home]");
  check("입구 버튼 → 입구", await waitScreen("screen-hub", 3000));

  // ═══ 5. 입력 건너뜀(U3)·의식 건너뛰기(U4): 데칸 ═══
  await seed(["saju", "ogham", "star"]);
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
  await seed(["saju", "ogham", "star", "decan", "tzolkin", "rune"]);
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
  check("6/6: '?' 줄 없음, 입구 책 카드 6/6 상태(all)", (await ev("document.querySelectorAll('#screen-hub .so-far__item.is-upcoming').length")) === 0 && (await ev("document.querySelector('[data-js=hub-book]').dataset.state")) === "all");
  await shot(P + "03-hub-done.png");

  // ═══ 10단계: 이어가기 코드·링크 복사·찌꺼기 정리·이름 미리 채움 (spec 10-1·10-2·10-6·10-7) ═══
  const setVal = (sel, v) => ev(`(() => { const i = document.querySelector(${JSON.stringify(sel)}); i.value = ${JSON.stringify(String(v))}; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const hiddenEl = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !e || e.offsetParent === null; })()`);
  const stubClip = (ok) => ev(`(() => { window.__clip = null; navigator.clipboard.writeText = async (t) => { if (!${ok}) throw new Error('blocked'); window.__clip = t; }; })()`);
  const pressEnter = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))`);
  const snap = () => ev("JSON.stringify({ rooms: StrangeOracle.filledRooms(), arch: StrangeOracle.currentArchetype(), lines: [...document.querySelectorAll('[data-js=sofar-result]')].map(e => e.textContent) })");
  const CODES = []; // 이 시험에서 만든 이어가기 코드 (어디에도 남으면 안 된다)
  const makeCode = async () => {
    await click("[data-js=resume-make-toggle]");
    const c = await txt("[data-js=resume-code]");
    CODES.push(c, c.replace(/-/g, ""));
    return c;
  };
  const enterCode = async (code, how = "button") => {
    if (await hiddenEl("[data-js=resume-enter-panel]")) await click("[data-js=resume-enter-toggle]");
    await setVal("[data-js=resume-input]", code);
    if (how === "enter") await pressEnter("[data-js=resume-input]");
    else await click("[data-js=resume-go]");
    await sleep(150);
  };

  // (a) 0/6 입구: 넣기 링크만, 입력 칸 규칙
  await ev("sessionStorage.clear()");
  await b.goto(BASE);
  await waitScreen("screen-hub", 3000);
  check("10-1: 0/6 — '이어가기 코드가 있어요' 보임, 패널 접힘, 3/6 한 줄·만들기 없음", !(await hiddenEl("[data-js=resume-enter-toggle]")) && (await hiddenEl("[data-js=resume-enter-panel]")) && (await hiddenEl("[data-js=hub-half]")) && (await hiddenEl("[data-js=resume-make-toggle]")));
  check("10-1: 입력 칸 autocomplete=off, name 없음, form 밖", await ev("(() => { const i = document.querySelector('[data-js=resume-input]'); return i.getAttribute('autocomplete') === 'off' && !i.hasAttribute('name') && !i.closest('form') && document.querySelector('[data-js=resume-go]').type === 'button'; })()"));
  check("10-2: 카카오 키가 비어 있으면 자리 8곳(방 7 + 나의 이야기) 모두 비어 있음(버튼 없음)", await ev("TEXT.kakao.jsKey === '' && document.querySelectorAll('[data-js=share-kakao-slot]').length === 8 && [...document.querySelectorAll('[data-js=share-kakao-slot]')].every(s => s.childNodes.length === 0) && !window.Kakao"));
  check("10-6: 숨긴 여정 줄(journey-path·journey-step) 마크업 0", (await ev("document.querySelectorAll('[data-js=journey-step], [data-js=journey-path], .journey__path').length")) === 0);
  check("10-3 a: 화면 문구(data.js)에 리포트·소장판·더 깊은 이야기·DEEPER STORY 0건", await ev("!/리포트|소장판|더 깊은 이야기|DEEPER STORY/.test(JSON.stringify(TEXT))"));
  check("10-7: 영문뿐인 윗줄은 모두 lang=en 또는 aria-hidden", await ev("[...document.querySelectorAll('[data-t]')].filter(e => /yebrow$/.test(e.dataset.t) && /^[\\x20-\\x7e]+$/.test(e.textContent.trim()) && /[A-Za-z]/.test(e.textContent)).every(e => e.closest('[lang=en]') || e.closest('[aria-hidden=true]'))"));
  const url0 = await ev("location.href");
  const req0 = b.log.requests.length;
  await enterCode("SOG1-0000-0000-000");
  check("10-1: 틀린 코드 → 모양 오류 한 줄, 복원 안 됨", (await txt("[data-js=resume-error]")) === (await ev("TEXT.resume.errors.shape")) && (await store()) === "" && (await ev("document.querySelector('[data-js=resume-input]').getAttribute('aria-invalid')")) === "true");
  await enterCode("SO1A-B2C3-D4E5-F6G7-H8J9-K0MN-PQRS-TV", "enter");
  check("10-1: 영수증 코드(SO1…)를 넣음 → '이 칸이 아니에요' 오류", (await txt("[data-js=resume-error]")) === (await ev("TEXT.resume.errors.receipt")) && (await store()) === "");
  // (14단계) 만신 없음 + Ⅱ 오검 + Ⅳ 데칸(별 빠짐) SOG2 코드(순서 어긋남): 시험용으로 직접 짠다
  const badOrder = await ev(`(() => { const R = PayCode.Resume, A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; let n = 0n; const d = { ogham: 3, decan: 11 };
    for (const [k, r] of R.FIELDS) n = n * BigInt(r) + BigInt(d[k] || 0); let pl = ""; for (let i = 0; i < 12; i++) { pl = A[Number(n % 32n)] + pl; n /= 32n; }
    let c = 0; for (let i = 0; i < 12; i++) c += (2 * i + 1) * A.indexOf(pl[i]); return R.PREFIX + pl + A[c % 32]; })()`);
  await enterCode(badOrder);
  check("10-1: 순서가 안 맞는 코드(만신 없음·Ⅱ·Ⅳ) → 순서 오류, 복원 안 됨", (await txt("[data-js=resume-error]")) === (await ev("TEXT.resume.errors.order")) && (await store()) === "");
  check("10-1: 오류 뒤에도 주소 변화·페이지 이동·요청 없음", (await ev("location.href")) === url0 && b.log.requests.length === req0 && (await active()) === "screen-hub");

  // (b) 3/6: 절반 한 줄 + 코드 만들기 (360x640에서 경고가 복사 버튼 위에 함께 보임)
  for (const n of [2, 4]) {
    await seed(ORDER.slice(0, n));
    await b.goto(BASE);
    await waitScreen("screen-hub", 3000);
    check(`10-1 c: ${n}/6 — 절반 한 줄 숨김`, await hiddenEl("[data-js=hub-half]"));
  }
  await seed(ORDER.slice(0, 3));
  await b.goto(BASE);
  await waitScreen("screen-hub", 3000);
  check("10-1 c: 3/6 — 절반 한 줄 + 링크 복사 글자 링크 보임, 넣기 링크 숨김", !(await hiddenEl("[data-js=hub-half]")) && !(await hiddenEl("[data-js=hub-half] [data-js=share-link-copy]")) && (await hiddenEl("[data-js=resume-enter-toggle]")));
  await stubClip(true);
  await click("[data-js=hub-half] [data-js=share-link-copy]");
  await sleep(150);
  const here = await ev("location.origin + location.pathname");
  check("10-2: 3/6 링크 복사 = 서비스 주소(site.url 빈 값 → 지금 주소, ?·# 없음) + 완료 한 줄", (await ev("window.__clip")) === here && !/[?#]/.test(here) && !(await hiddenEl("#screen-hub [data-js=share-link-msg]")) && (await hiddenEl("#screen-hub [data-js=share-link-url]")));
  const before3 = await snap();
  await b.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
  const reqMake = b.log.requests.length;
  const code3 = await makeCode();
  await sleep(reduced ? 200 : 1000); // 움직임 모드는 html scroll-behavior: smooth라 패널까지 스크롤이 끝나길 기다린다
  check("10-1: 코드 만들기 → SOG2 + 4자 묶음(17자, 20자 이내)", /^SOG2-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]$/.test(code3), code3.replace(/[0-9A-Z]/g, "#"));
  const lay = await ev("(() => { const r = (n) => document.querySelector('[data-js=' + n + ']').getBoundingClientRect(); const c = r('resume-code'), w = r('resume-warn'), b = r('resume-copy'); return { codeTop: Math.round(c.top), warnTop: Math.round(w.top), warnBottom: Math.round(w.bottom), copyTop: Math.round(b.top), copyBottom: Math.round(b.bottom), h: innerHeight, warnLen: document.querySelector('[data-js=resume-warn]').textContent.trim().length }; })()");
  check("10-1: 360x640 — 코드 → 경고 → 복사 버튼 순서로 한 화면 안(접힘·스크롤 밖 아님)", lay.codeTop >= 0 && lay.warnTop >= lay.codeTop && lay.warnBottom <= lay.copyTop && lay.copyBottom <= lay.h && lay.warnLen > 20, JSON.stringify(lay));
  check("10-1: 경고에 '태어난 날을 알아낼 수 있' 포함, '개인정보 없음·안전'류 0", await ev("(() => { const t = TEXT.resume.make.warn; return t.includes('태어난 날을 알아낼 수 있') && !/안전|개인정보가 없|개인정보 없/.test(t); })()"));
  await noHScroll("코드 만들기 펼침");
  await shot(P + "10-resume-make.png");
  await click("[data-js=resume-copy]");
  await sleep(150);
  check("10-1: 복사 버튼 → 클립보드 = 화면의 코드 + 복사 완료 한 줄", (await ev("window.__clip")) === code3 && !(await hiddenEl("[data-js=resume-copied]")));
  await b.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
  const leakHere = async () => { const st = await ev("JSON.stringify(Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)]))) + '|' + JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))) + '|' + document.cookie + '|' + location.href + '|' + JSON.stringify(history.state)"); return CODES.filter((c) => st.includes(c)); };
  check("10-1: 코드를 만드는 동안 요청 0건, 저장소·쿠키·주소·history에 코드 없음", b.log.requests.length === reqMake && (await leakHere()).length === 0 && (await ev("localStorage.length")) === 0 && (await ev("document.cookie")) === "");
  await click("[data-js=topbar-home]").catch(() => {});
  await ev("StrangeOracle.go('story')");
  await waitScreen("screen-story", 3000);
  await ev("StrangeOracle.go('hub')");
  await waitScreen("screen-hub", 3000);
  check("10-1: 입구를 떠났다 오면 패널 닫히고 화면의 코드 지워짐", (await hiddenEl("[data-js=resume-make-panel]")) && (await txt("[data-js=resume-code]")) === "");

  // (c) 새 탭(저장소 빈 상태)에서 복원 — Enter 키
  await ev("sessionStorage.clear()");
  await b.goto(BASE);
  await waitScreen("screen-hub", 3000);
  const urlR = await ev("location.href");
  const reqR = b.log.requests.length;
  await enterCode(code3.toLowerCase(), "enter");
  const after3 = await snap();
  check("10-1: 코드 복원(Enter) → 같은 방 3개 마침·같은 원형·같은 결과 줄", after3 === before3, after3);
  check("10-1: 복원 뒤 다음 문 = Ⅳ 데칸, 복원 완료 한 줄 보임(출처 문구)", (await ev("document.querySelector('[data-js=hub-cta]').dataset.room")) === "decan" && !(await hiddenEl("[data-js=resume-restored]")) && (await txt("[data-js=resume-restored]")) === (await ev("TEXT.resume.restored")));
  check("10-1: 복원 직후 입력 칸 비어 있음·넣기 링크 숨김", (await ev("document.querySelector('[data-js=resume-input]').value")) === "" && (await hiddenEl("[data-js=resume-enter-toggle]")));
  check("10-1: 복원하는 동안 방 문구 파일(14-6) 외 요청 0건·주소 변화 없음·코드가 저장소에 없음", b.log.requests.slice(reqR).every((r) => /^GET (http:\/\/127\.0\.0\.1:8788\/products\/strange-oracle\/[a-z-]+\.js|https:\/\/cdn\.jsdelivr\.net\/)/.test(r)) && (await ev("location.href")) === urlR && (await leakHere()).length === 0);
  const st3 = JSON.parse(await store());
  check("10-1: sessionStorage에는 결과 코드만(이름·생일 없음, 별은 nak·restored만)", Object.keys(st3.profile).length === 0 && st3.restored === true && Object.keys(st3.visits).join() === "saju,ogham,star" && Object.keys(st3.visits.star).sort().join() === "archetype,nak,restored", JSON.stringify(st3).replace(/[0-9]/g, "#").slice(0, 160));
  await shot(P + "11-resume-restored.png");
  // 복원 상태의 방 결과: 이름 자리 = "당신", 입력값이 필요한 부분은 숨기고 안내 한 줄
  await click("[data-js=sofar-line][data-room=star]");
  await waitScreen("screen-star-result", 3000);
  const starR = await ev("(() => { const s = document.querySelector('#screen-star-result'); const vis = (e) => !!e && e.offsetParent !== null; return { note: vis(s.querySelector('[data-js=restore-note]')), noteText: s.querySelector('[data-js=restore-note] span').textContent, twist: vis(s.querySelector('[data-js=twist-from]')), turnText: vis(s.querySelector('[data-js=turn-text]')), traits: vis(s.querySelector('[data-js=star-traits]')), facts: s.querySelectorAll('.reading__facts li').length, meta: s.querySelector('[data-js=result-meta]').textContent, open: s.querySelector('[data-js=guide-open] .say__line').textContent, bad: /undefined|null|NaN|\\{who\\}/.test(s.innerText) }; })()");
  check("10-1: 복원한 별의 방 — 반전 카드(서양 별자리→라시)·'마음' 줄 숨김 + '생일을 다시 넣으면' 한 줄, 맞아요 인셋은 그대로", starR.note && starR.noteText === (await ev("TEXT.resume.needInput")) && !starR.twist && !starR.turnText && starR.traits && starR.facts === 4, JSON.stringify(starR).slice(0, 200));
  check("10-1: 복원 상태 이름 자리 = '당신', 빈칸·undefined 없음", starR.meta.includes("당신") && starR.open.includes("당신") && !starR.bad, starR.meta);
  await hookCards();
  await ev("ShareCard.share = async (c, f, text, url) => { window.__share = { text, url }; return 'downloaded'; }");
  await click("#screen-star-result [data-js=result-share]");
  await waitFor("window.__share", 5000);
  const shareArgs = await ev("JSON.stringify(window.__share)");
  const cardOpts = await ev("window.__opts[window.__opts.length - 1]");
  check("10-2: 공유 글 끝에 표시용 주소(https:// 뗌) + url 전달, site.url 빈 값이면 카드 하단 주소 줄 없음", JSON.parse(shareArgs).url === here && JSON.parse(shareArgs).text.endsWith(" " + here.replace(/^https?:\/\//, "")) && JSON.parse(cardOpts).footerUrl === "" && JSON.parse(cardOpts).footer === (await ev("TEXT.card.footer")), shareArgs);
  check("10-1: 복원한 별 공유 카드 — 반전 알약 없이 만들어짐, 코드 없음", JSON.parse(cardOpts).badges.length === 1 && !CODES.some((c) => cardOpts.includes(c) || shareArgs.includes(c)));
  await stubClip(false);
  await click("#screen-star-result [data-js=share-link-copy]");
  await sleep(150);
  check("10-2: 클립보드가 막히면 주소를 고를 수 있는 글자로 보여 줌", (await txt("#screen-star-result [data-js=share-link-url]")) === here && !(await hiddenEl("#screen-star-result [data-js=share-link-url]")) && (await hiddenEl("#screen-star-result [data-js=share-link-msg]")));
  await noHScroll("복원한 별 결과");
  await click("#screen-star-result [data-js=restore-reinput]");
  check("10-1: '다시 입력' → 별의 방 입력 화면(입력칸 보임)", (await waitScreen("screen-star-input", 3000)) && !(await hiddenEl("[data-js=star-year]")));
  await b.goto(BASE + "#ogham");
  await waitScreen("screen-ogham-result", 3000);
  const ogR = await ev("(() => { const s = document.querySelector('#screen-ogham-result'); const n = s.querySelector('[data-js=restore-note]'); return { note: !!n && n.offsetParent !== null && n.querySelector('span').textContent === TEXT.resume.needName, go: n ? n.querySelector('[data-js=restore-reinput]').dataset.go : '', bad: /undefined|NaN|\\{who\\}/.test(s.innerText), meta: s.querySelector('[data-js=result-meta]').textContent }; })()");
  check("10-1: 복원한 오검의 방 — 이름 글자 줄 자리에 '이름을 다시 넣으면' 한 줄(→ 오검 입력), 빈칸 없음", ogR.note && ogR.go === "ogham-input" && !ogR.bad, JSON.stringify(ogR));
  await ev("StrangeOracle.go('story')");
  await waitScreen("screen-story", 3000);
  check("10-1: 복원 상태 나의 이야기 — '당신의 이야기', 3장 조립", (await txt("[data-js=story-title]")) === "당신의 이야기" && (await ev("document.querySelectorAll('[data-js=story-chapter].is-done').length")) === 3 && !(await ev("/undefined|\\{who\\}/.test(document.querySelector('#screen-story').innerText)")));
  check("10-2: 나의 이야기에도 링크 복사 글자 링크", !(await hiddenEl("#screen-story [data-js=share-link-copy]")));
  // "내 정보 지우기": 코드 표시·입력 칸 비움
  await click("[data-js=topbar-home]");
  await waitScreen("screen-hub", 3000);
  await makeCode();
  await click("[data-js=clear-open]");
  await click("[data-js=clear-confirm]");
  await sleep(300);
  check("10-1: 내 정보 지우기 → 방문 기록 지움, 코드 표시 닫힘·비움, 입력 칸 비어 있음", (await ev("StrangeOracle.filledRooms().length")) === 0 && (await txt("[data-js=resume-code]")) === "" && (await hiddenEl("[data-js=resume-make-panel]")) && (await ev("document.querySelector('[data-js=resume-input]').value")) === "" && (await leakHere()).length === 0);
  await ev("StrangeOracle.go('story')");
  await sleep(500);
  check("10-6: 방 0개로 나의 이야기에 닿을 수 있음(지운 뒤 뒤로 가기 등) → 빈 화면 안내 유지", (await active()) === "screen-story" && !(await hiddenEl("[data-js=story-empty]")));

  // (d) 마친 방 1~6개 왕복
  let rt = 0;
  for (let n = 1; n <= 7; n++) {
    await seed(ORDER.slice(0, n));
    await b.goto(BASE);
    await waitScreen("screen-hub", 3000);
    const before = await snap();
    const code = await makeCode();
    await ev("sessionStorage.clear()");
    await b.goto(BASE);
    await waitScreen("screen-hub", 3000);
    await enterCode(code);
    if ((await snap()) === before && JSON.parse(before).rooms.length === n) rt++;
  }
  check("10-1: 마친 방 1~7개 각각 — 코드로 복원하면 같은 방·같은 원형·같은 결과 이름", rt === 7, rt + "/7");
  check("10-1: 복원으로 7/7 → 주 버튼 = 나의 이야기 보기", (await ev("document.querySelector('[data-js=hub-cta]').dataset.go")) === "story");
  await b.goto(BASE + "#rune");
  await waitScreen("screen-rune-result", 3000);
  check("10-1: 복원한 룬의 방 — 주제가 코드에서 복원됨, 이름 인셋 자리에 안내 한 줄", (await txt("#screen-rune-result [data-js=result-meta]")).includes(await ev("TEXT.rune.topics.me.label")) && (await ev("(() => { const n = document.querySelector('#screen-rune-result [data-js=reading-body] [data-js=restore-note]'); return !!n && n.offsetParent !== null && !document.querySelector('#screen-rune-result [data-js=rune-name-runes]'); })()")));
  await b.goto(BASE + "#sibyl");
  await waitScreen("screen-sibyl-result", 3000);
  check("10-1: 복원한 시빌라 — 주제 복원, 질문 자리는 비어 있음(원래도 저장하지 않음)", (await txt("#screen-sibyl-result [data-js=sibyl-result-category]")) === (await ev("TEXT.sibyl.topics.love.label")) && (await txt("#screen-sibyl-result [data-js=sibyl-result-question]")) === "");

  // (e) 10-7 이름 미리 채움: 오검에서 넣은 이름이 별·룬 입력에 보인다
  await seed(["saju", "ogham"], { name: NAME });
  await b.goto(BASE);
  await ev("StrangeOracle.go('star-input')");
  await waitScreen("screen-star-input", 3000);
  const savedStar = await txt("#screen-star-input [data-js=saved-info-value]");
  await click("#screen-star-input [data-js=saved-info-edit]");
  check("10-7: 별의 방 입력 — 앞 방 이름이 저장된 정보로 보이고, 다시 입력하면 이름 칸에 미리 채워짐", savedStar.includes(NAME) && (await ev("document.querySelector('[data-js=star-name]').value")) === NAME);
  await seed(["saju", "ogham", "star", "decan", "tzolkin"], { name: NAME, birth: { y: 1995, m: 3, d: 25 } });
  await b.goto(BASE);
  await ev("StrangeOracle.go('rune-input')");
  await waitScreen("screen-rune-input", 3000);
  const savedRune = await txt("#screen-rune-input [data-js=saved-info-value]");
  await click("#screen-rune-input [data-js=saved-info-edit]");
  check("10-7: 룬의 방 입력 — 앞 방 이름이 보이고, 다시 입력하면 이름 칸에 미리 채워짐", savedRune === NAME && (await ev("document.querySelector('[data-js=rune-name]').value")) === NAME);
  await ev("StrangeOracle.go('ogham-input')");
  await waitScreen("screen-ogham-input", 3000);
  check("10-7: 오검의 방 입력 — 저장된 이름 보임", (await txt("#screen-ogham-input [data-js=saved-info-value]")) === NAME);

  // ═══ 11단계 묶음 1 (off): H3 흔들리는 원형 · H4 바통 질문 · H5 3/6 중간 결말 · 11-5 막다른 곳 0 ═══
  const deadScan = (scope) => ev(`(() => { const sc = document.querySelector(${JSON.stringify(scope)}); const t = sc.innerText; return { price: /[0-9],[0-9]{3}\\s*원/.test(t), soon: t.includes('곧 열'), dead: [...sc.querySelectorAll('button[disabled], button[aria-disabled=true]')].filter(b => b.offsetHeight > 0 && !b.closest('[data-js^=hub-door-]')).length, book: /한 권의 책|책을 준비/.test(t) }; })()`);
  const hookCount = (scope) => ev(`[...document.querySelectorAll(['result-archetype-sway', 'hub-archetype-sway', 'result-bridge', 'story-half'].map(k => ${JSON.stringify(scope)} + ' [data-js=' + k + ']').join(','))].filter(e => e.offsetHeight > 0 && e.textContent.trim()).length`);
  const swayWant = (n, arch) => ev(`TEXT.result.archetypeSway.replace('{arch}', TEXT.archetypes[${JSON.stringify(arch)}].name).replace('{n}', ${n})`);
  await seed(["saju", "ogham", "star"]);
  await b.goto(BASE + "#hub");
  await waitScreen("screen-hub", 3000);
  const arch3 = await ev("StrangeOracle.currentArchetype()");
  check("H3 입구: 3/7 흔들리는 원형 한 줄 = 템플릿({arch}·남은 문 4)", !(await has("[data-js=hub-archetype-sway]", "is-hidden")) && (await txt("[data-js=hub-archetype-sway]")) === (await swayWant(4, arch3)), await txt("[data-js=hub-archetype-sway]"));
  check("H5 입구: 3/6이면 나의 이야기 링크 글자 = hub.sofar.half (요소 수 그대로)", (await txt("[data-js=hub-story-label]")) === (await ev("TEXT.hub.sofar.half")) && !(await has("[data-js=hub-half]", "is-hidden")));
  const hubDead = await deadScan("#screen-hub");
  check("11-5 off 입구: 가격 0 · '곧' 0 · 눌리지 않는 버튼 0 · 떡밥 3개 이하", !hubDead.price && !hubDead.soon && hubDead.dead === 0 && (await hookCount("#screen-hub")) <= 3, JSON.stringify(hubDead));
  await ev("StrangeOracle.go('story')");
  await waitScreen("screen-story", 3000);
  const half = await ev("(() => { const sc = document.querySelector('#screen-story'); const vis = (e) => e && e.offsetHeight > 0; const next = sc.querySelector('[data-js=story-half-next]'); const share = sc.querySelector('[data-js=story-share]'); return { isHalf: sc.classList.contains('is-half'), half: vis(sc.querySelector('[data-js=story-half]')), slots: [...sc.querySelectorAll('[data-js=story-half-slot]')].filter(vis).length, next: vis(next) && next.dataset.go === 'decan-intro', primary: [...sc.querySelectorAll('.btn--primary')].filter(vis).length, shareSecondary: share.classList.contains('btn--secondary'), paid: vis(sc.querySelector('[data-js=story-paid]')), close: sc.querySelector('[data-js=story-half-close]').textContent, spine46: [...sc.querySelectorAll('[data-js=story-chapter]')].slice(3).filter(vis).length }; })()");
  check("H5 나의 이야기 3/7: is-half · 중간 맺음 · 남은 칸 3 · 다음 문(데칸) · 주 버튼은 다음 문 하나(공유는 보조) · 책 카드 숨김(off)", half.isHalf && half.half && half.slots === 3 && half.next && half.primary === 0 && half.shareSecondary && !half.paid && half.close.length > 0 && half.spine46 === 0, JSON.stringify(half));
  const storyDead = await deadScan("#screen-story");
  check("11-5 off 나의 이야기 3/6: 가격 0 · '곧' 0 · 눌리지 않는 버튼 0 · 책 말 0 · 떡밥 3개 이하", !storyDead.price && !storyDead.soon && storyDead.dead === 0 && !storyDead.book && (await hookCount("#screen-story")) <= 3, JSON.stringify(storyDead));
  await noHScroll("나의 이야기 3/6");
  await shot(P + "11-story-half.png");
  await click("[data-js=story-half-next]");
  check("H5 다음 문 → Ⅳ 데칸 시작(강제 순서 그대로)", await waitScreen("screen-decan-intro", 4000), await active());
  for (const room of ["saju", "ogham", "star"]) {
    await ev("StrangeOracle.go('story')");
    await waitScreen("screen-story", 3000);
    await click("[data-js=story-chapter-reread][data-room=" + room + "]");
    await waitScreen("screen-" + room + "-result", 4000);
    const sc = "#screen-" + room + "-result";
    const sway = await txt(sc + " [data-js=result-archetype-sway]");
    const br = await ev(`(() => { const e = document.querySelector('${sc} [data-js=result-bridge]'); const t = e.textContent.replace('[초안] ', ''); return { ok: t === TEXT.bridges['${room}'].replace('[초안] ', '') && [...t].length <= 45 && /\\?$/.test(t) && (t.match(/[.?!]/g) || []).length === 1, t }; })()`);
    const dead = await deadScan(sc);
    const hooks = await hookCount(sc);
    check(`H3·H4 ${room} 결과: 원형 한 줄(남은 문 4) · 다리 = 질문 1문장 45자 이내 · 가격·'곧'·죽은 버튼 0 · 떡밥 ${hooks}개(≤3)`, sway === (await swayWant(4, arch3)) && br.ok && !dead.price && !dead.soon && dead.dead === 0 && hooks <= 3, sway + " / " + br.t);
  }
  await seed(["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]);
  await b.goto(BASE + "#story");
  await waitScreen("screen-story", 3000);
  const six = await ev("(() => { const vis = (e) => e && e.offsetHeight > 0; return { paid: vis(document.querySelector('[data-js=story-paid]')), note: vis(document.querySelector('[data-js=story-book]')), half: vis(document.querySelector('[data-js=story-half]')), noteBtn: document.querySelector('[data-js=story-book]').querySelectorAll('button:not([disabled])').length === 1 }; })()");
  const sixDead = await deadScan("#screen-story");
  check("13단계 6/6 나의 이야기: 결제 카드 없음 · 책 목차 열기 버튼 1개 · 가격·'곧'·죽은 버튼 0 · H5 없음", !six.paid && six.note && six.noteBtn && !six.half && !sixDead.price && !sixDead.soon && sixDead.dead === 0, JSON.stringify(six) + JSON.stringify(sixDead));
  const sixRes = [];
  for (const room of ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]) {
    await ev("StrangeOracle.go('story')");
    await waitScreen("screen-story", 3000);
    await click("[data-js=story-chapter-reread][data-room=" + room + "]");
    await waitScreen("screen-" + room + "-result", 4000);
    const sc = "#screen-" + room + "-result";
    const d = await deadScan(sc);
    sixRes.push(Object.assign({ room, sway: await ev(`(() => { const e = document.querySelector('${sc} [data-js=result-archetype-sway]'); return e.offsetHeight > 0 || e.textContent.trim() !== ''; })()`), hooks: await hookCount(sc) }, d));
  }
  check("6/6 결과 여섯 곳: H3 없음 · 가격·'곧'·죽은 버튼 0 · 떡밥 3개 이하", sixRes.every((x) => !x.sway && !x.price && !x.soon && x.dead === 0 && x.hooks <= 3), JSON.stringify(sixRes.filter((x) => x.sway || x.price || x.soon || x.dead || x.hooks > 3)));
  await ev("StrangeOracle.go('hub')");
  await waitScreen("screen-hub", 3000);
  check("H3 입구 6/6: 흔들리는 원형 숨김", await has("[data-js=hub-archetype-sway]", "is-hidden"));
  check("H5 입구 6/6: 링크 글자 = hub.sofar.all", (await txt("[data-js=hub-story-label]")) === (await ev("TEXT.hub.sofar.all")));

  // ═══ 8. 개인정보·오류 ═══
  const allReq = b.log.bodies.map((x) => x.url + " " + x.body).join("\n");
  check("10-1: 모든 요청 주소·본문과 console에 이어가기 코드 없음", CODES.length >= 8 && !CODES.some((c) => allReq.includes(c) || b.log.console.join("\n").includes(c)), CODES.length + "개 대조");
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
  console.log(`\n${out.length - fails} PASS / ${fails} FAIL (책 문장 ${PAID.length}개 대조)`);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log(out.join("\n")); console.error("CRASH", e); process.exit(1); });
