// 7단계 무료 흐름 점검 (강제 순차 진행·딥링크·봉인 절단부·다음 문·결말). 헤드리스 Edge, 결제 꺼짐 서버.
// 예전 scratchpad test-stage2.js(비선형 자유 이동 전제)를 대신한다.
// 준비: node tools/build-dist.js
//       node tools/strange-oracle/mock-server.js --port 8788 --mode off   (mock-server는 시작할 때 api/_paid를 읽어 두므로 바꿨으면 다시 켤 것)
// 실행: node --experimental-websocket tools/strange-oracle/e2e-flow.js [reduced|motion]
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/p7<r|m>-*.png, result.txt
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

// 유료 문장 목록 (D-4 확장판): api/_paid 전부, 12자 이상. 무료 칸(key·summary)과 원래 같은 문장은 build-dist.js와 같은 규칙으로 뺀다
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
  const P = reduced ? "p7r-" : "p7m-";
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no el " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const active = () => ev(`document.querySelector('.screen.is-active')?.id`);
  const waitFor = async (expr, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(100); } return false; };
  const waitScreen = (id, ms) => waitFor(`document.querySelector('.screen.is-active')?.id === ${JSON.stringify(id)}`, ms);
  const has = (sel, cls) => ev(`document.querySelector(${JSON.stringify(sel)}).classList.contains(${JSON.stringify(cls)})`);
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent || ''`);
  const noHScroll = async (label) => { const w = await ev("[document.documentElement.scrollWidth, window.innerWidth]"); check(`360px 가로 넘침 없음 (${label})`, w[0] <= w[1], w.join("/")); };
  const doors = () => ev(`${JSON.stringify(ORDER)}.map(r => { const d = document.querySelector('[data-js=hub-door-' + r + ']'); return r + ':' + ['is-visited','is-next','is-locked'].filter(c => d.classList.contains(c)).join('+') + (d.getAttribute('aria-disabled') === 'true' ? '(aria)' : ''); }).join(' ')`);
  const store = () => ev("sessionStorage.getItem('strange-oracle') || ''");
  const seed = (rooms) => ev(`(() => {
    const R = ${JSON.stringify(rooms)}, v = {};
    if (R.includes('ogham')) v.ogham = { ogham: 2, archetype: OGHAM[2].archetype };
    if (R.includes('star')) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: NAKSHATRAS[4].archetype };
    if (R.includes('decan')) v.decan = { decan: 10, when: null, archetype: DECANS[10].archetype };
    if (R.includes('tzolkin')) v.tzolkin = { number: 4, sign: 19, archetype: TZOLKIN_SIGNS[19].archetype };
    if (R.includes('rune')) v.rune = { picks: [RUNES[0].code, RUNES[5].code, RUNES[10].code], topic: 'me', archetype: RUNES[10].archetype };
    if (R.includes('sibyl')) v.sibyl = { sors: 12, topic: 'love', archetype: ORACLES[12].archetype };
    sessionStorage.setItem('strange-oracle', JSON.stringify({ started: true, profile: { name: ${JSON.stringify(NAME)}, birth: { y: 1995, m: 3, d: 21 } }, visits: v }));
  })()`);
  const freeLeak = async (room) => {
    const text = await ev(`document.querySelector('#screen-${room}-result').innerText`);
    return PAID.filter((s) => text.includes(s));
  };

  // ═══ 1. 새 세션: 어떤 주소로 와도 인트로 ═══
  await b.goto(BASE);
  await ev("sessionStorage.clear()");
  await b.goto(BASE + "#rune");
  check("새 세션 + #rune 딥링크 → 인트로", await waitScreen("screen-intro", 4000));
  check("인트로 광고 0", (await ev("document.querySelectorAll('#screen-intro [data-js=ad-slot], #screen-intro .ad-slot').length")) === 0);
  check("인트로 문구 채움(요약·시작 버튼)", (await txt("[data-js=intro-start]")).length > 0 && (await txt("#screen-intro .intro__summary")).length > 0);
  check("인트로 전에는 저장소 비어 있음", (await store()) === "");
  await noHScroll("인트로");
  await shot(P + "01-intro.png");
  await click("[data-js=intro-start]");
  check("시작 → 문 열림(.is-opening)", await has("[data-js=intro-gate]", "is-opening"));
  check("시작 → Ⅰ 오검의 방 시작 화면", await waitScreen("screen-ogham-intro", 4000));
  check("시작 뒤 저장 = 진행 기록(started)만, 입력값 없음", JSON.parse((await store()) || "{}").started === true && !(await store()).includes(NAME));

  // ═══ 2. 허브: 진행 막대·문 잠금 ═══
  await click("[data-js=topbar-back]");
  await waitScreen("screen-hub", 4000);
  await sleep(200);
  check("허브 진행 막대 0/6", (await txt("[data-js=hub-progress-count]")) === "0/6" && (await ev("document.querySelector('[data-js=hub-progress]').getAttribute('aria-valuenow')")) === "0");
  const d0 = await doors();
  check("문 상태: Ⅰ만 is-next, Ⅱ~Ⅵ 잠김(aria-disabled)", d0 === "ogham:is-next star:is-locked(aria) decan:is-locked(aria) tzolkin:is-locked(aria) rune:is-locked(aria) sibyl:is-locked(aria)", d0);
  check("허브 광고 ≤ 2, 문·진행 막대 안에 광고 없음", (await ev("document.querySelectorAll('#screen-hub [data-js=ad-slot]').length")) <= 2 && (await ev("document.querySelectorAll('[data-js=hub-doors] [data-js=ad-slot], [data-js=hub-progress] [data-js=ad-slot]').length")) === 0);
  await click("[data-js=hub-door-decan]");
  await sleep(60);
  check("잠긴 문 누름 → 흔들림(.is-denied) + 안내, 이동 없음", (await has("[data-js=hub-door-decan]", "is-denied")) && (await active()) === "screen-hub" && (await ev("document.body.innerText.includes(TEXT.toast.locked)")));
  await noHScroll("허브");
  await shot(P + "02-hub-locked.png");

  // ═══ 3. 딥링크: 같은 탭, 잠긴 방 → 허브 ═══
  await b.goto(BASE + "#tzolkin");
  await sleep(500);
  check("같은 탭 + 잠긴 방 딥링크(#tzolkin) → 허브(현재 지점), 인트로 다시 안 나옴", (await active()) === "screen-hub");
  await ev("StrangeOracle.go('decan-result')");
  await sleep(500);
  check("잠긴 방 결과 화면 직접 호출 → 허브", (await active()) === "screen-hub");

  // ═══ 4. Ⅰ 오검을 실제로 마치기 (입력 → 의식 → 결과) ═══
  await click("[data-js=hub-door-ogham]");
  check("열린 문 → 오검 시작", await waitScreen("screen-ogham-intro", 4000));
  await click("[data-js=ogham-intro-go]");
  await waitScreen("screen-ogham-input", 4000);
  await ev(`(() => { const i = document.querySelector('[data-js=ogham-name]'); i.value = ${JSON.stringify(NAME)}; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click("[data-js=ogham-input-go]");
  await waitScreen("screen-ogham-ritual", 4000);
  for (let i = 0; i < 40 && !(await ev("document.querySelector('#screen-ogham-ritual').classList.contains('is-carved')")); i++) { await click("[data-js=ogham-bark]"); await sleep(80); }
  check("오검 결과", await waitScreen("screen-ogham-result", 8000));
  await sleep(300);
  const scr = "#screen-ogham-result";
  check("무료 화면 장 = I·II 두 개, III·IV 섹션 없음", (await ev(`document.querySelectorAll('${scr} [data-js=result-chapter]').length`)) === 2 && (await ev(`document.querySelectorAll('${scr} .chapters-paid, ${scr} [data-paid-only]').length`)) === 0);
  check("II장 = 첫 문단 하나", (await ev(`document.querySelectorAll('${scr} [data-js=result-chapter]')[1].querySelectorAll('[data-js=chapter-body] > *').length`)) === 1);
  check("봉인 블록 = II장 바로 아래, 장 이름 3줄", (await ev(`document.querySelectorAll('${scr} [data-js=result-chapter]')[1].nextElementSibling.dataset.js`)) === "result-sealed" && (await ev(`document.querySelectorAll('${scr} .sealed-rest__item').length`)) === 3);
  check("목차 III·IV 제목은 채움(봉인 표시)", await ev(`[...document.querySelectorAll('${scr} [data-js=toc-title]')].every(e => e.textContent.trim().length > 0)`));
  check("상단 읽기 막대 = 2칸", (await ev("[...document.querySelectorAll('[data-js=read-progress-seg]')].filter(s => !s.classList.contains('is-hidden')).length")) === 2);
  const leak1 = await freeLeak("ogham");
  check("D-4 확장: 무료 화면에 유료 문장 0", leak1.length === 0, leak1.slice(0, 2).join(" | "));
  check("결제 꺼짐: 봉인 블록 글자 링크 숨김", await has(`${scr} [data-js=result-deeper]`, "is-hidden"));
  check("다리 문구·다음 문(Ⅱ 별의 방)", (await txt(`${scr} [data-js=result-bridge]`)) === (await ev("TEXT.bridges.ogham")) && (await ev(`document.querySelector('${scr} [data-js=result-next-door]').dataset.go`)) === "star-intro");
  check("다리·다음 문 바로 위아래 광고 없음", await ev(`(() => { const p = document.querySelector('${scr} [data-js=result-passage]'); const n = (e) => e && (e.dataset.js === 'ad-slot' || e.classList.contains('ad-slot')); return !n(p.previousElementSibling) && !n(p.nextElementSibling); })()`));
  check("결과 화면 광고 ≤ 2", (await ev(`document.querySelectorAll('${scr} [data-js=ad-slot]').length`)) <= 2);
  check("옛 다음 방 목록·빈 template 없음", (await ev("document.querySelectorAll('template, [data-js=next-rooms], [data-js=next-room]').length")) === 0);
  await noHScroll("오검 결과");
  await shot(P + "03-ogham-result.png", true);
  await click(`${scr} [data-js=result-next-door]`);
  check("다음 문 → .is-opening", await has(`${scr} [data-js=result-next-door]`, "is-opening"));
  check("다음 문 → Ⅱ 별의 방 시작 (허브 거치지 않음)", await waitScreen("screen-star-intro", 4000));
  await ev("StrangeOracle.go('hub')");
  await sleep(500);
  const d1 = await doors();
  check("오검 마친 뒤: Ⅰ 지나옴, Ⅱ is-next, Ⅲ~Ⅵ 잠김, 막대 1/6", d1.startsWith("ogham:is-visited star:is-next decan:is-locked(aria)") && (await txt("[data-js=hub-progress-count]")) === "1/6", d1);
  await click("[data-js=hub-door-ogham]");
  check("마친 방 문 → 결과 다시보기", await waitScreen("screen-ogham-result", 4000));
  await b.goto(BASE + "#ogham");
  await sleep(500);
  check("마친 방 딥링크(#ogham) → 결과 다시보기", (await active()) === "screen-ogham-result");

  // ═══ 5. 나의 이야기 등뼈: 다음 장만 열기 버튼, 나머지는 봉인 ═══
  await ev("StrangeOracle.go('story')");
  await waitScreen("screen-story", 4000);
  const spine = await ev("[...document.querySelectorAll('[data-js=story-chapter]')].map(li => li.dataset.room + ':' + ['is-done','is-available','is-upcoming'].filter(c => li.classList.contains(c)).join('+')).join(' ')");
  check("등뼈 순서 Ⅰ~Ⅵ, 다음 장만 열림", spine === "ogham:is-done star:is-available decan:is-upcoming tzolkin:is-upcoming rune:is-upcoming sibyl:is-upcoming", spine);
  check("등뼈 열기 버튼은 다음 장 하나뿐", (await ev("document.querySelectorAll('[data-js=story-chapter-go]').length")) === 1);

  // ═══ 6. 네 방 마친 상태 → 룬 (재던지기 없음) ═══
  await seed(["ogham", "star", "decan", "tzolkin", "rune"]);
  await b.goto(BASE + "#rune");
  await sleep(600);
  check("마친 룬 딥링크 → 결과", (await active()) === "screen-rune-result");
  check("룬 결과: 다시 던지기 버튼 0 · 문구 키 없음", (await ev("document.querySelectorAll('#screen-rune-result [data-js=result-retry]').length")) === 0 && (await ev("TEXT.rune.result.retry === undefined")));
  await ev("StrangeOracle.go('rune-input')");
  await sleep(500);
  check("룬을 마친 뒤 룬 입력·의식으로 가면 결과로 (다시 던지기 불가)", (await active()) === "screen-rune-result");
  check("룬 결과 = 나의 이야기 5장, 다음 문 = Ⅵ 시빌라", (await txt("#screen-rune-result [data-js=result-meta]")).includes("5장") && (await ev("document.querySelector('#screen-rune-result [data-js=result-next-door]').dataset.go")) === "sibyl-intro");
  const leakR = await freeLeak("rune");
  check("D-4 확장: 룬 무료 화면 유료 문장 0", leakR.length === 0, leakR.slice(0, 2).join(" | "));
  for (const room of ["star", "decan", "tzolkin"]) {
    await ev("StrangeOracle.go('hub')");
    await sleep(450);
    await click(`[data-js=hub-door-${room}]`);
    await waitScreen(`screen-${room}-result`, 4000);
    const lk = await freeLeak(room);
    check(`D-4 확장: ${room} 무료 화면 유료 문장 0 · 장 2개`, lk.length === 0 && (await ev(`document.querySelectorAll('#screen-${room}-result [data-js=result-chapter]').length`)) === 2, lk.slice(0, 2).join(" | "));
  }
  await ev("StrangeOracle.go('hub')");
  await sleep(450);
  check("다섯 방 마침: Ⅵ 시빌라만 is-next, 막대 5/6", (await doors()).endsWith("sibyl:is-next") && (await txt("[data-js=hub-progress-count]")) === "5/6");

  // ═══ 7. 시빌라: 다른 신탁 받기 (최근 것만), 질문 저장 안 함 → 결말 ═══
  await seed(ORDER);
  await b.goto(BASE + "#sibyl");
  await sleep(600);
  check("시빌라 결과 = 나의 이야기 6장", (await active()) === "screen-sibyl-result" && (await txt("#screen-sibyl-result [data-js=result-meta]")).includes("6장"));
  check("시빌라 버튼 = 다른 신탁 받기 + 무를 수 없음 안내", (await txt("#screen-sibyl-result [data-js=result-retry]")) === (await ev("TEXT.sibyl.result.retry")) && (await ev("TEXT.sibyl.result.retry.includes('다른 신탁')")) && (await ev("document.body.innerText.includes(TEXT.sibyl.result.retryNote)")));
  const leakS = await freeLeak("sibyl");
  check("D-4 확장: 시빌라 무료 화면 유료 문장 0", leakS.length === 0, leakS.slice(0, 2).join(" | "));
  await click("#screen-sibyl-result [data-js=result-retry]");
  check("다른 신탁 받기 → 주제 고르기 화면", await waitScreen("screen-sibyl-input", 4000));
  check("다른 신탁을 받기 전까지 이전 신탁 유지(visits.sibyl 1개)", JSON.parse(await store()).visits.sibyl.sors === 12);
  await ev("StrangeOracle.go('sibyl-result')");
  await sleep(450);
  await shot(P + "04-sibyl-result.png");
  await ev("(() => { window.__anim = 0; const a = Element.prototype.animate; Element.prototype.animate = function (...x) { window.__anim++; return a.apply(this, x); }; })()");
  await click("#screen-sibyl-result [data-js=result-next-door]");
  check("Ⅵ 다음 문 → 결말", await waitScreen("screen-finale", 4000));
  check("결말 시작 = .is-running", await has("#screen-finale", "is-running"));
  if (reduced) {
    const grid = await ev("getComputedStyle(document.querySelector('.converge__shard')).opacity");
    check("움직임 줄이기: 처음엔 정적 그리드(조각 보임, 카드 숨김)", grid === "1" && (await ev("getComputedStyle(document.querySelector('.converge__card')).opacity")) === "0");
    await shot(P + "05-finale-grid.png");
    check("약 1.2초 뒤 .is-running 해제 → 카드", await waitFor("!document.querySelector('#screen-finale').classList.contains('is-running')", 2500));
    check("교차 페이드 = element.animate() (조각 6 + 카드·문장·버튼)", (await ev("window.__anim")) >= 9, String(await ev("window.__anim")));
    await sleep(700);
    check("페이드 끝: 카드 보임, 조각 숨김", (await ev("getComputedStyle(document.querySelector('.converge__card')).opacity")) === "1" && (await ev("getComputedStyle(document.querySelector('.converge__shard')).opacity")) === "0");
  } else {
    await sleep(900);
    await shot(P + "05-finale-mid.png");
    await ev("document.querySelector('.converge').click()");
    await sleep(100);
    check("움직임: 아무 데나 누르면 건너뛰기(.is-running 해제)", !(await has("#screen-finale", "is-running")));
  }
  check("결말 광고 0", (await ev("document.querySelectorAll('#screen-finale [data-js=ad-slot]').length")) === 0);
  await noHScroll("결말");
  await shot(P + "06-finale-card.png");
  await click("[data-js=finale-go-story]");
  check("결말 → 나의 이야기 6/6", (await waitScreen("screen-story", 4000)) && (await ev("document.querySelector('[data-js=story-archetype]').classList.contains('is-complete')")));

  // ═══ 8. 개인정보·오류 ═══
  const all = b.log.bodies.map((x) => x.url + " " + x.body).join("\n");
  check("요청 주소·본문에 이름 없음", !all.includes(NAME) && !all.includes(encodeURIComponent(NAME)));
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
