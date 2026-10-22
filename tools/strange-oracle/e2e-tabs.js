// 19단계 K2: 입구 바로 가기 띠(19-4, 결정 125) e2e — 19-7의 5·6. 헤드리스 Edge(cdp.js, 구글 요청은 cdp.js가 막음).
// 준비: node tools/build-dist.js · 모의 서버 node tools/strange-oracle/mock-server.js --port 8788 --mode test (실행 중이어야 함)
//       off(배포판) 확인용 서버는 이 시험이 직접 띄우고 끈다: mock-server.js --port 8793 --mode off
// 실행: node --experimental-websocket tools/strange-oracle/e2e-tabs.js
// 보는 것:
//   1. 상태표: 0/7·1/7·3/7·7/7 × off / test·map on / test·map off → 보이는 칸(공유 늘 · 나의 이야기·책 1/7 이상 · 책은 test만 · 지도는 map on만)
//   2. 누르면: 공유(완료 줄은 띠 안, 3/7 줄 완료 줄은 안 뜸) · 나의 이야기 · 책(1/7 목차, 7/7 결제 전 미리보기) · 지도(7/7 전 토스트, 7/7 키 없음 → 나의 이야기 지도 만들기 자리)
//   3. 만 14세 미만 생년월일로 지도 칸 → 지도 만들기 → 막힘(young) + "나의 이야기로" 버튼(막다른 곳 0)
//   4. 360·480 넘침 0 · 360×640 첫 화면에서 고대의 문 전체가 띠 위에 보임 · 글 칸 초점 때 숨김 · 움직임 줄이기에서 띠 움직임 0
//   5. 분석: so_tab 값은 목록 안 낱말뿐, so_share link도 함께 · dataLayer에 입력값(이름·생일)·키 0 · 측정 ID는 시험 ID
"use strict";
const path = require("path");
const { spawn } = require("child_process");
const { launch, sleep } = require("./cdp.js");

const TEST = "http://127.0.0.1:8788";
const OFF = "http://127.0.0.1:8793";
const P = "/products/strange-oracle/";
let pass = 0, fail = 0;
function check(name, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? "  — " + detail : ""}`);
}

async function open({ port, width = 360, height = 640, reduced = true, mapOff = false }) {
  const b = await launch({ port, width, height, reduced });
  const { send } = b;
  await send("Emulation.setFocusEmulationEnabled", { enabled: true }); // 헤드리스는 창 초점이 없어 :focus가 안 맞는다
  // 분석 인자 기록: 페이지마다 dataLayer가 새로 생기므로 push를 console.debug("DL …")로도 남긴다(e2e-map과 같은 방식)
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.dataLayer = []; window.dataLayer.push = function () { try { console.debug('DL ' + JSON.stringify(Array.from(arguments[0] || []))); } catch (e) {} return Array.prototype.push.apply(this, arguments); };" });
  if (mapOff) {
    // test 판에서 지도만 끈다(응답의 map.mode "test" → "off", 파일은 그대로)
    b.on(async (m) => {
      if (m.method !== "Fetch.requestPaused") return;
      const { requestId } = m.params;
      try {
        const r = await send("Fetch.getResponseBody", { requestId });
        const t = (r.base64Encoded ? Buffer.from(r.body, "base64").toString("utf8") : r.body).replace(/(\bmap:\s*\{\s*mode:\s*)"[^"]*"/, '$1"off"');
        send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/javascript; charset=utf-8" }], body: Buffer.from(t).toString("base64") });
      } catch (e) {
        send("Fetch.continueRequest", { requestId }).catch(() => {});
      }
    });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/strange-oracle/data.js", requestStage: "Response" }] });
  }
  const ev = async (expr) => {
    for (let i = 0; i < 20; i++) {
      try { return await b.evaluate(expr); } catch (e) { if (!/context|destroyed|navigat|Cannot find/i.test(e.message)) throw e; await sleep(150); }
    }
    return b.evaluate(expr);
  };
  const waitFor = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await b.evaluate(expr)) return true; } catch (e) {} await sleep(60); } return false; };
  const active = () => ev("document.querySelector('.screen.is-active')?.id || ''");
  const skip = async (base, qs) => { await b.goto(`${base}/__dev/skip?${qs}`); return waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub' || (!!document.querySelector('.screen.is-active') && !location.pathname.includes('__dev'))", 8000); };
  const toHub = async (base, rooms, extra = "") => { await b.goto(base + P); await ev("sessionStorage.clear(); true"); await skip(base, `rooms=${rooms}&to=hub${extra}`); await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub'"); await sleep(900); };
  const tabs = () => ev("JSON.stringify([...document.querySelectorAll('[data-js=hub-tabs] [data-tab]')].filter((e) => !e.hidden && e.getClientRects().length).map((e) => e.dataset.tab))").then(JSON.parse);
  const inDom = () => ev("JSON.stringify([...document.querySelectorAll('[data-js=hub-tabs] [data-tab]')].map((e) => e.dataset.tab))").then(JSON.parse);
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('no ' + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  return Object.assign(b, { ev, waitFor, active, skip, toHub, tabs, inDom, click });
}

(async () => {
  // ═══ 1·2·3·5. test (pay test · map on) ═══
  const A = await open({ port: 9661 });
  const want = { 0: ["share", "map"], 1: ["share", "story", "book", "map"], 3: ["share", "story", "book", "map"], 7: ["share", "story", "book", "map"] };
  for (const n of [0, 1, 3, 7]) {
    await A.toHub(TEST, n);
    const t = await A.tabs();
    check(`1 test·map on ${n}/7: 보이는 칸 ${want[n].join(",")}`, JSON.stringify(t) === JSON.stringify(want[n]), JSON.stringify(t));
    const lay = JSON.parse(await A.ev(`JSON.stringify((() => { const nav = document.querySelector('[data-js=hub-tabs]'); const r = nav.getBoundingClientRect(); const door = document.querySelector('[data-js=hub-cta]').getBoundingClientRect();
      const hs = [...nav.querySelectorAll('[data-tab]')].filter((e) => !e.hidden).map((e) => Math.round(e.getBoundingClientRect().height));
      return { fixed: getComputedStyle(nav).position, bottom: Math.round(innerHeight - r.bottom), doorTop: Math.round(door.top), doorBottom: Math.round(door.bottom), navTop: Math.round(r.top), minH: Math.min(...hs), wide: document.documentElement.scrollWidth <= innerWidth, nav: nav.tagName, aria: nav.getAttribute('aria-label'), btns: [...nav.querySelectorAll('[data-tab]')].every((e) => e.tagName === 'BUTTON'), last: document.querySelector('#screen-hub').lastElementChild === nav }; })())`));
    check(`4 ${n}/7 360×640: 화면 아래 고정 · 누름 높이 44 이상 · 넘침 0 · 첫 화면에서 고대의 문 전체가 띠 위 · nav(aria-label)·button·입구 맨 끝`, lay.fixed === "fixed" && lay.bottom <= 1 && lay.minH >= 44 && lay.wide && lay.doorTop >= 0 && lay.doorBottom <= lay.navTop && lay.nav === "NAV" && lay.aria && !/\[초안\]x/.test(lay.aria) && lay.btns && lay.last, JSON.stringify(lay));
  }
  // 누르면 — 7/7 전 지도 칸: 토스트, 입구 그대로
  await A.toHub(TEST, 1);
  const TM = JSON.parse(await A.ev("JSON.stringify({ locked: TEXT.map.tabLocked, labels: [TEXT.hub.tabs.share, TEXT.hub.tabs.story, TEXT.hub.tabs.book, TEXT.map.tab] })"));
  check("1 칸 이름 = data.js 문구(공유·나의 이야기·책 hub.tabs, 지도 map.tab)", JSON.stringify(JSON.parse(await A.ev("JSON.stringify([...document.querySelectorAll('[data-js=hub-tabs] .hub-tab__label')].map((e) => e.textContent))"))) === JSON.stringify(TM.labels));
  await A.click("[data-js=hub-tab-map]");
  await sleep(300);
  check("2 지도 칸(키 없음·1/7): 토스트 map.tabLocked · 입구 그대로", (await A.ev("document.querySelector('[data-js=toast]').textContent")) === TM.locked && (await A.active()) === "screen-hub");
  await A.click("[data-js=hub-tab-story]");
  check("2 나의 이야기 칸 → 나의 이야기", await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-story'"));
  await A.toHub(TEST, 1);
  await A.click("[data-js=hub-tab-book]");
  check("2 책 칸(1/7 결제 전) → 목차(입구 책 카드 버튼과 같은 곳)", await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'"));
  await A.toHub(TEST, 7);
  await A.click("[data-js=hub-tab-book]");
  check("2 책 칸(7/7 결제 전) → 미리보기(18-5 상태표)", await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-preview'", 10000));
  // 공유 칸: 완료 줄은 띠 안, 3/7 줄의 완료 줄은 안 뜸
  await A.toHub(TEST, 3);
  await A.click("[data-js=hub-tabs] [data-js=share-link-copy]");
  await sleep(500);
  const sh = JSON.parse(await A.ev("JSON.stringify({ inNav: !document.querySelector('[data-js=hub-tabs] [data-js=share-link-status]').classList.contains('is-hidden'), others: [...document.querySelectorAll('[data-js=share-link-status]')].filter((s) => !s.closest('[data-js=hub-tabs]') && !s.classList.contains('is-hidden')).length, hub: document.querySelector('.screen.is-active').id })"));
  check("2 공유 칸(3/7): 완료 줄이 띠 안에서 뜸 · 3/7 줄 완료 줄은 안 뜸 · 입구 그대로", sh.inNav && sh.others === 0 && sh.hub === "screen-hub", JSON.stringify(sh));
  // 7/7 키 없음 → 나의 이야기의 지도 만들기 자리
  await A.toHub(TEST, 7);
  await A.click("[data-js=hub-tab-map]");
  const toSlot = await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-story' && document.activeElement?.dataset.js === 'map-create' && !!document.activeElement.closest('[data-js=map-slot-story]')", 8000);
  const slotRect = JSON.parse(await A.ev("JSON.stringify((() => { const r = document.querySelector('[data-js=map-slot-story] [data-js=map-create]').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight }; })())"));
  check("2 지도 칸(키 없음·7/7) → 나의 이야기 지도 만들기 버튼(초점·화면 안)", toSlot && slotRect.top >= 0 && slotRect.bottom <= slotRect.h, JSON.stringify(Object.assign({ ae: await A.ev("document.activeElement && (document.activeElement.dataset.js || document.activeElement.tagName)") }, slotRect)));
  // 분석: so_tab 값·입력값 0
  const dl = A.log.console.filter((l) => /^debug: DL /.test(l)).join("\n");
  const tabEv = [...dl.matchAll(/\["event","so_tab",(\{[^}]*\})\]/g)].map((m) => JSON.parse(m[1]));
  const tabsSent = tabEv.map((p) => p.tab);
  check("5 so_tab 값은 share·story·book·map 낱말뿐(누른 칸마다, 다른 인자 0) · 공유는 so_share link도", tabsSent.length >= 6 && tabEv.every((p) => Object.keys(p).filter((k) => !/^(send_to|event_callback|event_timeout)$/.test(k)).join() === "tab") && tabsSent.every((t) => ["share", "story", "book", "map"].includes(t)) && new Set(tabsSent).size === 4 && /\["event","so_share",\{"method":"link"/.test(dl), tabsSent.join(","));
  check("5 dataLayer에 입력값(이름·생일 1995)·열람 키·초대 ID 0 · 측정 ID는 시험 ID(G-TEST12345)", !/1995|홍길|"key"|invite/.test(dl) && /G-TEST12345/.test(dl) && !/G-4J5SVQV3B1/.test(dl));
  // 만 14세 미만 → 지도 칸 → 지도 만들기 → 막힘 → "나의 이야기로"
  await A.toHub(TEST, 7, "&birth=2014-01-01");
  await A.click("[data-js=hub-tab-map]");
  await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-story' && !!document.querySelector('[data-js=map-slot-story] [data-js=map-create]')", 8000);
  await A.click("[data-js=map-slot-story] [data-js=map-create]");
  await sleep(400);
  const young = JSON.parse(await A.ev("JSON.stringify({ st: document.querySelector('[data-js=map-slot-story] [data-js=map-card]')?.dataset.state, back: !!document.querySelector('[data-js=map-slot-story] [data-js=map-age-back]')?.getClientRects().length })"));
  await A.click("[data-js=map-slot-story] [data-js=map-age-back]");
  await sleep(300);
  check("3 만 14세 미만(2014년생) 지도 칸 → 지도 만들기 → 막힘 + '나의 이야기로' → 나의 이야기(막다른 곳 0)", young.st === "young" && young.back && (await A.active()) === "screen-story", JSON.stringify(young));
  // 글 칸 초점 때 숨김 (0/7 이어가기 코드 넣기)
  await A.toHub(TEST, 0);
  await A.click("[data-js=resume-enter-toggle]");
  await A.send("Page.bringToFront"); // (2026-10-22) 브라우저 둘이 함께 떠 있으면 이 창이 뒤에 있어 document.hasFocus()가 false → :focus가 안 맞음(리눅스 Chromium에서 확인)
  await A.ev("document.querySelector('[data-js=resume-input]').focus(); true");
  await sleep(250);
  const hid = await A.ev("getComputedStyle(document.querySelector('[data-js=hub-tabs]')).visibility");
  await A.ev("document.activeElement.blur(); true");
  await sleep(250);
  check("4 입구 글 칸 초점 → 띠 숨김 · 초점 풀리면 다시 보임", hid === "hidden" && (await A.ev("getComputedStyle(document.querySelector('[data-js=hub-tabs]')).visibility")) === "visible", hid);
  // 움직임 줄이기: 띠의 애니메이션·전환 0
  const mo = JSON.parse(await A.ev("JSON.stringify((() => { const nav = document.querySelector('[data-js=hub-tabs]'); const cs = getComputedStyle(nav); return { anim: cs.animationName, tr: cs.transitionDuration, running: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && (a.effect.target === nav || nav.contains(a.effect.target))).length }; })())"));
  check("4 움직임 줄이기: 띠 animation none · transition 0 · 도는 애니메이션 0", mo.anim === "none" && /^0s(, 0s)*$/.test(mo.tr) && mo.running === 0, JSON.stringify(mo));
  // 방·책·지도 화면에는 띠가 보이지 않음
  await A.toHub(TEST, 1);
  await A.click("[data-js=hub-tab-story]");
  await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-story'");
  check("1 입구 밖(나의 이야기)에서는 띠가 안 보임", !(await A.ev("!!document.querySelector('[data-js=hub-tabs]').getClientRects().length && getComputedStyle(document.querySelector('[data-js=hub-tabs]')).visibility !== 'hidden'")));
  await A.close();

  // 480 넘침 0
  const W = await open({ port: 9662, width: 480, height: 800 });
  await W.toHub(TEST, 7);
  check("4 480: 넘침 0 · 네 칸", (await W.ev("document.documentElement.scrollWidth <= innerWidth")) && (await W.tabs()).length === 4);
  await W.close();

  // ═══ test · map off ═══
  const M = await open({ port: 9663, mapOff: true });
  const wantM = { 0: ["share"], 1: ["share", "story", "book"], 3: ["share", "story", "book"], 7: ["share", "story", "book"] };
  for (const n of [0, 1, 3, 7]) {
    await M.toHub(TEST, n);
    const t = await M.tabs();
    check(`1 test·map off ${n}/7: 보이는 칸 ${wantM[n].join(",")} · 지도 칸 DOM 0`, JSON.stringify(t) === JSON.stringify(wantM[n]) && !(await M.inDom()).includes("map"), JSON.stringify(t));
  }
  await M.close();

  // ═══ off (배포판과 같은 data.js) ═══
  const srv = spawn(process.execPath, [path.join(__dirname, "mock-server.js"), "--port", "8793", "--mode", "off"], { stdio: "ignore" });
  await sleep(900);
  try {
    const O = await open({ port: 9664 });
    // (2026-10-22) 배포판 pay.mode를 읽어 기대값을 고른다: live면 책 칸이 1/7부터 보이고 DOM에 있다. 지도 칸은 map off라 늘 DOM 0
    const live = /\bpay:\s*\{\s*mode:\s*"live"/.test(await (await fetch(`${OFF}/products/strange-oracle/data.js`)).text());
    const wantO = live ? { 0: ["share"], 1: ["share", "story", "book"], 3: ["share", "story", "book"], 7: ["share", "story", "book"] } : { 0: ["share"], 1: ["share", "story"], 3: ["share", "story"], 7: ["share", "story"] };
    const PM = live ? "live" : "off";
    for (const n of [0, 1, 3, 7]) {
      await O.toHub(OFF, n);
      const t = await O.tabs();
      const dom = await O.inDom();
      check(`1 ${PM} ${n}/7: 보이는 칸 ${wantO[n].join(",")} · 책 칸 DOM ${live ? "있음" : "0"} · 지도 칸 DOM 0 · 넘침 0`, JSON.stringify(t) === JSON.stringify(wantO[n]) && dom.includes("book") === live && !dom.includes("map") && (await O.ev("document.documentElement.scrollWidth <= innerWidth")), JSON.stringify({ t, dom }));
    }
    await O.close();
  } finally {
    srv.kill();
  }
  console.log(`${pass} PASS / ${fail} FAIL`);
  process.exitCode = fail ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
