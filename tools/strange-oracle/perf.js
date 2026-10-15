// 14단계 14-6 성능 측정 (CDP). 조건: 360×640, 내려받기 1.6Mbps·지연 150ms, CPU 4배 느리게, 캐시 비움, 모의 서버(test), 각 3회 중앙값.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
// 실행: node tools/strange-oracle/perf.js   → out/perf.txt (tests.md 「14단계 · 성능」에 옮긴다)
// 재는 것
//  1 첫 화면: 탐색 시작 → ① 입구 제목·첫 문 버튼 보임 + 앱 시작 끝(window.StrangeOracle) ② 그 뒤 50ms 넘는 긴 작업이 없는 첫 시점(5초 관찰). 전송량(압축 후 encodedDataLength 합)
//  2 방 전환: 문을 누른 뒤 그 방 첫 화면(.is-active)까지. 미리 받은 경우(만신: 입구가 한가할 때 미리 받음) / 처음 받는 경우(오검: rooms=1로 입구에 바로 도착해 누름)
//  3 쪽 넘김: 책 장 안에서 다음 쪽 버튼 → 다음 쪽 is-current, 애니메이션 끝까지. 넘기는 동안 긴 작업 수·평균 fps
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const BASE = "http://127.0.0.1:8788";
const P = "/products/strange-oracle/index.html";
const LT = `window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true }); } catch (e) {}`;
const med = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const lines = [];
const log = (s) => (lines.push(s), console.log(s));

async function session(reduced, port) {
  const b = await launch({ port, reduced, width: 360, height: 640 });
  await b.send("Network.setCacheDisabled", { cacheDisabled: true });
  await b.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6e6 / 8), uploadThroughput: (750e3 / 8) });
  await b.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await b.send("Page.addScriptToEvaluateOnNewDocument", { source: LT });
  let bytes = 0;
  b.on((m) => { if (m.method === "Network.loadingFinished") bytes += m.params.encodedDataLength; });
  const waitFor = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await b.evaluate(expr)) return true; await b.sleep(20); } return false; };
  return { b, waitFor, resetBytes: () => (bytes = 0), bytes: () => bytes };
}

(async () => {
  // ── 1 첫 화면
  const first = [], kb = [], only1 = [], ltEnds = [];
  for (let i = 0; i < 3; i++) {
    const s = await session(true, 9631 + i);
    await s.b.goto(BASE + P); // 저장소 비우기용
    await s.b.evaluate("sessionStorage.clear()");
    s.resetBytes();
    await s.b.send("Page.navigate", { url: BASE + P + "#hub" });
    await s.waitFor("document.readyState !== 'loading' && !!window.StrangeOracle && (() => { const c = document.querySelector('[data-js=hub-cta]'); const t = document.querySelector('#screen-hub h1'); return c && c.offsetHeight > 0 && t && t.offsetHeight > 0; })()");
    const t1 = await s.b.evaluate("performance.now()");
    await s.b.sleep(5000);
    const r = await s.b.evaluate("({ lt: window.__lt, nav: performance.getEntriesByType('navigation')[0].startTime })");
    const lastEnd = r.lt.reduce((a, [st, d]) => Math.max(a, st + d), 0);
    first.push(Math.max(t1, lastEnd));
    only1.push(t1);
    ltEnds.push(r.lt.filter(([st, d]) => st + d > t1).map(([st, d]) => Math.round(st) + "+" + Math.round(d)).join(",") || "없음");
    kb.push(s.bytes() / 1024);
    await s.b.close();
  }
  log(`1 첫 화면(①+②): ${first.map((x) => (x / 1000).toFixed(2)).join(" / ")}초 → 중앙값 ${(med(first) / 1000).toFixed(2)}초 (기준 3.0초 이하) · ①만 ${(med(only1) / 1000).toFixed(2)}초 · ① 뒤 긴 작업(시작ms+길이) ${ltEnds.join(" | ")} · 전송량(모의 서버는 압축 안 함 = 압축 전, 5초 안, 한가할 때 미리 받는 만신 파일 포함) 중앙값 ${med(kb).toFixed(0)}KB`);

  // ── 2 방 전환
  const pre = [], cold = [], show = [];
  for (let i = 0; i < 3; i++) {
    const s = await session(true, 9641 + i);
    await s.b.goto(BASE + P);
    await s.b.evaluate("sessionStorage.clear()");
    await s.b.goto(BASE + P + "#hub");
    await s.waitFor("!!window.StrangeOracle");
    await s.waitFor("!!window.SAJU", 30000); // 한가할 때 미리 받기 끝
    const a = await s.b.evaluate(`new Promise((res) => { const t0 = performance.now(); document.querySelector('[data-js=hub-cta]').click(); (function f() { const x = document.querySelector('#screen-saju-intro.is-active'); if (x && x.offsetHeight) res(performance.now() - t0); else requestAnimationFrame(f); })(); })`);
    pre.push(a);
    await s.b.goto(BASE + "/__dev/skip?rooms=1&to=hub");
    await s.waitFor("!!window.StrangeOracle && document.querySelector('.screen.is-active')?.id === 'screen-hub'");
    const c = await s.b.evaluate(`new Promise((res) => { const t0 = performance.now(); let firstFeedback = null; document.querySelector('[data-js=hub-cta]').click(); (function f() { if (firstFeedback == null && (document.body.classList.contains('is-loading') || document.querySelector('.sigil-rise.is-active, [data-js=sigil-rise].is-on'))) firstFeedback = performance.now() - t0; const x = document.querySelector('#screen-ogham-intro.is-active'); if (x && x.offsetHeight) res([performance.now() - t0, firstFeedback]); else requestAnimationFrame(f); })(); })`);
    cold.push(c[0]);
    if (c[1] != null) show.push(c[1]);
    await s.b.close();
  }
  log(`2 방 전환: 미리 받음(만신) ${pre.map((x) => x.toFixed(0)).join(" / ")}ms → 중앙값 ${med(pre).toFixed(0)}ms (기준 300ms 이하) · 처음 받음(오검) ${cold.map((x) => x.toFixed(0)).join(" / ")}ms → 중앙값 ${med(cold).toFixed(0)}ms (기준 1500ms 이하) · 로딩 표시까지 ${show.length ? med(show).toFixed(0) + "ms" : "미검출"}`);

  // ── 3 쪽 넘김 (움직임 줄이기 / 애니메이션)
  for (const reduced of [true, false]) {
    const turns = [], lts = [], fpss = [];
    for (let i = 0; i < 3; i++) {
      const s = await session(reduced, 9651 + i + (reduced ? 0 : 5));
      await s.b.goto(BASE + P);
      await s.b.evaluate("sessionStorage.clear()");
      await s.b.goto(BASE + "/__dev/skip?rooms=7&paid=1&to=book");
      await s.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-report'");
      await s.b.evaluate("document.querySelector('[data-js=book-chapter][data-chapter=ogham] [data-js=book-chapter-btn]').click()");
      await s.waitFor("!document.querySelector('[data-js=book-chapter-open]').disabled", 30000);
      await s.b.evaluate("document.querySelector('[data-js=book-chapter-open]').click()");
      await s.waitFor("document.querySelector('[data-js=book-reader]').dataset.view === 'pages' && document.querySelectorAll('[data-js=book-page]').length > 2", 30000);
      await s.b.sleep(1500);
      const r = await s.b.evaluate(`new Promise((res) => { const lt0 = window.__lt.length; const pages = [...document.querySelectorAll('[data-js=book-page]')]; const cur = () => pages.findIndex((p) => p.classList.contains('is-current'));
        const i0 = cur(); const t0 = performance.now(); let frames = 0, seen = null;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        (function f() { frames++; const now = performance.now(); if (seen == null && cur() === i0 + 1) seen = now; const busy = document.getAnimations().some((a) => a.playState === 'running');
          if (seen != null && !busy) res({ ms: now - t0, frames, lt: window.__lt.slice(lt0).filter(([s, d]) => d > 50 && s >= t0).length }); else if (now - t0 > 3000) res({ ms: -1, frames, lt: -1 }); else requestAnimationFrame(f); })(); })`);
      turns.push(r.ms);
      lts.push(r.lt);
      fpss.push(r.ms > 0 ? (r.frames * 1000) / r.ms : 0);
      await s.b.close();
    }
    log(`3 쪽 넘김(${reduced ? "움직임 줄이기, 기준 100ms" : "애니메이션, 기준 450ms"}): ${turns.map((x) => x.toFixed(0)).join(" / ")}ms → 중앙값 ${med(turns).toFixed(0)}ms · 긴 작업 ${lts.join("/")}개 · 평균 fps ${fpss.map((x) => x.toFixed(0)).join("/")}`);
  }
  log("4 의식 연출(일곱 방) 긴 작업: 이 도구에서는 재지 않음 (미측정)");
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", "perf.txt"), lines.join("\n") + "\n");
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
