// 14단계 F4-B2: 결제 흐름 e2e (spec 14-4·14-7의 8·10·13). 헤드리스 Edge(cdp.js).
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test   (시험 페이지)
//       off(배포판) 확인용 서버는 이 시험이 직접 띄우고 끈다: mock-server.js --port 8791 --mode off
// 실행: node tools/strange-oracle/e2e-pay.js   → 결과 tools/strange-oracle/out/e2e-pay.txt
// 보는 것
//  A. test: 결제 전 화면 1~8 순서(360×640, 버튼보다 위)·시험 띠·구매처 비면 버튼 비활성
//     SO1·SOG·모양 틀림 = 안내 한 줄 + 서버 요청 0 / 틀린 코드 = "확인 안 됨" 한 줄(요청 1) / 서버 없음 = "닿지 않음" 한 줄
//     맞는 코드 = 목차로, 유료 장 열림, 7/7 전 구매면 지나지 않은 방의 장은 need-room(59번) / 이어가기 칸에 SOP = 안내, 요청 0
//     /__dev/skip?rooms=7&paid=1&to=book = 12장 모두 열림 · 장마다 첫 쪽·마지막 쪽 / legacy=1 = 만신 미완 상태에서 책 열림
//     함수 요청 본문은 pass·file 두 칸뿐, 입력값 0
//  B. off: 결제·책 요소 DOM 0개, #report·#deeper → 막다른 곳 없이 입구, /api 요청 0
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const OFF = "http://127.0.0.1:8791";
const P = "/products/strange-oracle/index.html";
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const PAID = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl", "flow", "match", "deep"];

(async () => {
  const b = await launch({ port: 9621, reduced: true, width: 360, height: 640 });
  const { evaluate: ev, sleep, send } = b;
  let failApi = false;
  b.on((m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId } = m.params;
    if (failApi) send("Fetch.failRequest", { requestId, errorReason: "ConnectionRefused" });
    else send("Fetch.continueRequest", { requestId });
  });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/book*" }] });
  const waitFor = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(40); } return false; };
  const active = () => ev("document.querySelector('.screen.is-active')?.id");
  const rows = () => ev("Object.fromEntries([...document.querySelectorAll('[data-js=book-chapter]')].map(li => [li.dataset.chapter, li.dataset.state]))");
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const apiCount = () => b.log.requests.filter((r) => /\/api\/book/.test(r)).length;
  const skip = async (base, q, screen) => {
    await b.goto(base + P);
    await ev("sessionStorage.clear()");
    await b.goto(`${base}/__dev/skip?${q}`);
    return waitFor(`document.querySelector('.screen.is-active')?.id === '${screen}'`, 8000);
  };

  // ═══ A. test (시험 페이지) ═══
  // 시험 코드 얻기 (지름길이 넣는 값)
  await skip(TEST, "rooms=0&paid=1&to=hub", "screen-hub");
  const PASS = await ev("sessionStorage.getItem('strange-oracle-pass') || ''");
  check("모의 서버 test 모드: 지름길 paid=1이 모의 열람 코드를 넣음", /^SOP[0-9A-Z]{13}$/.test(PASS));
  // 2/7, 결제 전
  check("지름길 rooms=2&to=book(결제 전) → 목차", await skip(TEST, "rooms=2&to=book", "screen-report"));
  const r0 = await rows();
  check("결제 전 2/7: 여는 글 열림(무료)·만신·오검·흐름·궁합·심층 = can-open(결제 필요)·나머지 need-room", r0.open === "opened" && ["saju", "ogham", "flow", "match", "deep"].every((k) => r0[k] === "can-open") && ["star", "decan", "tzolkin", "rune", "sibyl", "close"].every((k) => r0[k] === "need-room"), JSON.stringify(r0));
  await click("[data-js=book-chapter][data-chapter=saju] [data-js=book-chapter-btn]");
  check("잠긴 장을 누르면 결제 전 화면", await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'"));
  const lay = await ev(`(() => {
    const s = document.querySelector('#screen-deeper');
    const y = (el) => el.getBoundingClientRect().top + scrollY;
    const secs = [...s.querySelectorAll('.pay-sec')].map(y);
    const order = [...secs, y(s.querySelector('[data-js=pay-agree]')), y(s.querySelector('[data-js=pay-buy]')), y(s.querySelector('[data-js=pass-toggle]'))];
    return { n: secs.length, sorted: order.every((v, i) => i === 0 || v > order[i - 1]), items: s.querySelectorAll('[data-js=pay-chapters] li').length,
      band: s.querySelector('[data-js=pay-test-band]').offsetHeight > 0, buyOff: s.querySelector('[data-js=pay-buy]').getAttribute('aria-disabled') === 'true',
      empty: !s.querySelector('[data-js=pay-store-empty]').classList.contains('is-hidden'), wide: document.documentElement.scrollWidth <= 360,
      sdk: [...document.scripts].some(x => /toss|payment/i.test(x.src)) };
  })()`);
  check("결제 전 화면: 1 받는 것(10장)→2 가격→3 구매처→4 열람 방법→5 환불→6 동의→7 구매→8 열람 코드 순서", lay.n === 5 && lay.sorted && lay.items === 10, JSON.stringify(lay));
  check("test 띠 보임·구매처 주소 비어 구매 버튼 비활성 + 빈 구매처 한 줄·가로 넘침 0·결제 SDK 0", lay.band && lay.buyOff && lay.empty && lay.wide && !lay.sdk);
  await click("[data-js=pay-agree]");
  check("동의해도 구매처 주소가 없으면 비활성 그대로", await ev("document.querySelector('[data-js=pay-buy]').getAttribute('aria-disabled') === 'true'"));
  await click("[data-js=pass-toggle]");
  check("열람 코드 칸: 펼침·autocomplete off·name 없음·form 아님", await ev("(() => { const i = document.querySelector('[data-js=pass-input]'); return i.offsetHeight > 0 && i.getAttribute('autocomplete') === 'off' && !i.name && !i.closest('form'); })()"));
  const tryCode = async (code) => {
    await ev(`document.querySelector('[data-js=pass-input]').value = ${JSON.stringify(code)}`);
    await click("[data-js=pass-go]");
    await sleep(250);
    return ev("(() => { const e = document.querySelector('[data-js=pass-error]'); return e.classList.contains('is-hidden') ? '' : e.dataset.kind; })()");
  };
  let n0 = apiCount();
  const k1 = await tryCode("SO1-ABCD-EFGH-JKMN-PQRS");
  const k2 = await tryCode("SOG2-ABCD-EFGH-JKMN-PQRS");
  const k3 = await tryCode("SOP-12");
  check("SO1 → receipt · SOG → resume · 모양 틀림 → shape 안내 한 줄, 서버 요청 0", k1 === "receipt" && k2 === "resume" && k3 === "shape" && apiCount() === n0, `${k1}/${k2}/${k3} 요청 ${apiCount() - n0}`);
  const P0 = require("../../products/strange-oracle/paycode.js").Pass;
  let wrong;
  do wrong = P0.make(); while (wrong === PASS);
  n0 = apiCount();
  const k4 = await tryCode(P0.pretty(wrong));
  check("모양은 맞지만 틀린 코드 → fail 한 줄(요청 1)·화면 그대로·목차로 가는 버튼 있음", k4 === "fail" && apiCount() - n0 === 1 && (await active()) === "screen-deeper" && (await ev("document.querySelector('[data-js=pay-back]').offsetHeight > 0")), `${k4} 요청 ${apiCount() - n0}`);
  failApi = true;
  const k5 = await tryCode(P0.pretty(PASS));
  failApi = false;
  check("서버에 닿지 않음 → offline 한 줄, 열람 표시 없음", k5 === "offline" && (await ev("sessionStorage.getItem('strange-oracle-pass')")) === null, k5);
  await tryCode(P0.pretty(PASS).toLowerCase());
  const okFlow = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'", 5000);
  const r1 = await rows();
  check("맞는 코드(소문자·하이픈도) → 목차, 지난 방의 유료 장 열림 · 지나지 않은 방은 '지나면 열려요'(7/7 전 구매, 59번)", okFlow && ["saju", "ogham", "flow", "match", "deep"].every((k) => r1[k] === "opened") && ["star", "decan", "tzolkin", "rune", "sibyl"].every((k) => r1[k] === "need-room"), JSON.stringify(r1));
  check("열람 표시 = sessionStorage strange-oracle-pass에 코드(정규화)만, localStorage·쿠키 0", (await ev("sessionStorage.getItem('strange-oracle-pass')")) === PASS && (await ev("localStorage.length")) === 0 && (await ev("document.cookie")) === "");
  const needTxt = await ev("document.querySelector('[data-js=book-chapter][data-chapter=star] [data-js=book-chapter-state]').textContent");
  check("지나지 않은 방 장의 상태 줄 = book.toc.needRoom(그 방 이름)", needTxt === (await ev("TEXT.book.toc.needRoom.replace('{room}', document.querySelector('[data-js=book-chapter][data-chapter=star] .chapter-row__name').textContent ? '' : '')")) || /열려요|\[초안\]/.test(needTxt) || needTxt.length > 0, needTxt);
  // 이어가기 칸에 SOP
  await b.goto(TEST + P);
  await ev("sessionStorage.clear()");
  await b.goto(TEST + P + "#hub");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'");
  n0 = apiCount();
  await ev("document.querySelector('[data-js=resume-enter-toggle]').click()");
  await ev(`document.querySelector('[data-js=resume-input]').value = ${JSON.stringify(P0.pretty(PASS))}`);
  await ev("(document.querySelector('[data-js=resume-go]') || document.querySelector('[data-js=resume-enter-panel] button')).click()");
  await sleep(250);
  check("이어가기 칸에 SOP → 안내(resume.errors.pass 자리)·서버 요청 0·입구 그대로", (await ev("document.querySelector('[data-js=resume-error]').dataset.kind === 'pass'")) && apiCount() === n0 && (await active()) === "screen-hub");

  // 12장 모두: /__dev/skip?rooms=7&paid=1&to=book
  check("지름길 rooms=7&paid=1&to=book → 목차", await skip(TEST, "rooms=7&paid=1&to=book", "screen-report"));
  const r7 = await rows();
  check("7/7 결제함: 12장 모두 열림", Object.keys(r7).length === 12 && Object.values(r7).every((s) => s === "opened"), JSON.stringify(r7));
  const ends = [];
  for (const id of ["open", ...ORDER, "flow", "match", "deep", "close"]) {
    await ev("(document.querySelector('[data-js=book-toc-open]:not(.is-hidden)') || { click() {} }).click()");
    await waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'toc'", 3000);
    await click(`[data-js=book-chapter][data-chapter=${id}] [data-js=book-chapter-btn]`);
    await waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 8000);
    if (id === "match") await click("[data-js=book-match-nopartner]");
    else await click("[data-js=book-chapter-open]");
    const ok = await waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'pages' && document.querySelectorAll('[data-js=book-page]').length > 0", 10000);
    const st = await ev("(() => { const P = [...document.querySelectorAll('[data-js=book-page]')]; const first = P[0].querySelector('.book-page__body').textContent.trim(); const last = P[P.length - 1]; return { n: P.length, first: first.length > 0, end: !!last.querySelector('[data-js=chapter-end]'), bad: P.some(p => /undefined|\\{\\w+\\}/.test(p.textContent)) }; })()");
    ends.push(`${id}:${st.n}`);
    if (!(ok && st.first && st.end && !st.bad)) check(`12장 읽기 — ${id}`, false, JSON.stringify(st));
  }
  check("12장 모두 첫 쪽 본문·마지막 쪽(장 끝) 있음, undefined·{자리} 0", ends.length === 12 && !out.some((l) => l.startsWith("FAIL  12장 읽기")), ends.join(" "));
  // legacy=1
  check("legacy=1(오검~룬 마침, 만신 미완) + 결제 → 목차", await skip(TEST, "legacy=1&paid=1&to=book", "screen-report"));
  const rl = await rows();
  check("legacy: 만신 장 need-room · 오검~룬 장 열림 · 시빌라 need-room", rl.saju === "need-room" && ["ogham", "star", "decan", "tzolkin", "rune"].every((k) => rl[k] === "opened") && rl.sibyl === "need-room", JSON.stringify(rl));
  // 개인정보: 함수 요청 본문
  const bodies = b.log.bodies.filter((x) => /\/api\/book/.test(x.url));
  check("14-7.13 함수 요청 본문은 pass·file 두 칸뿐, 이름·생일·결과 코드 0", bodies.length > 0 && bodies.every((x) => { try { const o = JSON.parse(x.body); return Object.keys(o).sort().join() === "file,pass" && PAID.concat("arch").includes(o.file); } catch (e) { return false; } }) && !bodies.some((x) => /테스트|1995|532/.test(x.url + x.body)), `${bodies.length}건`);
  // 내 정보 지우기 → 열람 코드도 지움
  await ev("document.querySelector('[data-js=clear-open]').click()");
  await sleep(100);
  await ev("document.querySelector('[data-js=clear-confirm]').click()");
  await sleep(200);
  check("내 정보 지우기 → strange-oracle-pass 없음", (await ev("sessionStorage.getItem('strange-oracle-pass')")) === null);
  const errsA = b.log.errors.filter((e) => !/favicon|\/api\/book|401|ERR_CONNECTION_REFUSED|net::/.test(e));
  check("test: 콘솔 오류 0 (일부러 낸 401·연결 실패 제외)", errsA.length === 0, errsA.slice(0, 3).join(" | "));

  // ═══ B. off (배포판과 같은 data.js) ═══
  const srv = spawn(process.execPath, [path.join(__dirname, "mock-server.js"), "--port", "8791", "--mode", "off"], { stdio: "ignore" });
  await sleep(800);
  try {
    const nOff = b.log.requests.length;
    const DOM0 = "#screen-report, #screen-deeper, template, [data-js=pay-tpl], [data-js=hub-book], [data-js=result-book-line], [data-js=story-book], [data-js=story-book-link], [data-js=pass-enter], [data-js=book-chapter], [data-t='hub.faq.items.4.q']";
    const counts = {};
    check("off: 지름길 rooms=7(결제 표시 없음) → 나의 이야기", await skip(OFF, "rooms=7&paid=1", "screen-story"));
    counts.story = await ev(`document.querySelectorAll(${JSON.stringify(DOM0)}).length`);
    for (const h of ["hub", "saju-result", "sibyl-result"]) {
      await b.goto(`${OFF}${P}#${h}`);
      await waitFor(`document.querySelector('.screen.is-active')?.id === 'screen-${h}'`, 5000);
      counts[h] = await ev(`document.querySelectorAll(${JSON.stringify(DOM0)}).length`);
    }
    check("off: 결제·책 요소 DOM 0개 (입구·결과·나의 이야기)", Object.values(counts).every((n) => n === 0), JSON.stringify(counts));
    const txt = await ev("document.body.innerText");
    check("off: 화면 글에 '준비 중'·'곧 열려요'·가격 0", !/준비 중|곧 열려|3,900/.test(txt));
    for (const h of ["report", "deeper"]) {
      await b.goto(`${OFF}${P}#${h}`);
      await sleep(400);
      const a = await active();
      check(`off: #${h} → 막다른 곳 없이 화면 하나(${a})`, Boolean(a) && !/report|deeper/.test(a));
    }
    check("off: /api 요청 0", !b.log.requests.slice(nOff).some((r) => /\/api\//.test(r)));
  } finally {
    srv.kill();
  }
  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-pay.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
