// 17단계 I1·I4 (designer) 화면 점검: 360·480 넘침 0, 글자 대비(다섯 점 픽셀 중 가장 나쁜 값), 일곱 문 캡처표
//   node tools/strange-oracle/mock-server.js --port 8788 --mode test   (먼저, 백그라운드)
//   node tools/strange-oracle/look-17.js            → tools/strange-oracle/out/i1/ 에 PNG와 look-17.json
// 대비 재는 법(specs 17-7 권장 4): 보이는 글자의 글자색을 읽어 둔 뒤, 모든 글자를 투명하게 한 화면을 찍고,
//   글자 상자의 네 귀퉁이(안쪽 2px)와 가운데, 다섯 점의 픽셀을 배경으로 삼아 가장 나쁜 대비를 쓴다.
//   기준: 본문 4.5:1, 큰 글자(24px 이상 또는 18.66px 이상 굵게)·꾸밈 글자(aria-hidden 안) 3:1. 비활성 버튼은 제외 목록.
const fs = require("fs");
const path = require("path");
const { launch, sleep } = require("./cdp.js");
const ORIGIN = "http://127.0.0.1:8788";
const I4 = process.argv.includes("--i4"); // (I4) 결제·지도·책 쪽 상태를 더 잰다 → out/i4
const OUT = path.join(__dirname, "out", I4 ? "i4" : "i1");
fs.mkdirSync(OUT, { recursive: true });
const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];

const STATES = [
  { name: "hub-0", url: "/__dev/skip?rooms=0&to=hub" },
  { name: "hub-3", url: "/__dev/skip?rooms=3&to=hub" },
  { name: "hub-7", url: "/__dev/skip?rooms=7&to=hub" },
  { name: "story-3", url: "/__dev/skip?rooms=3" },
  { name: "story-7", url: "/__dev/skip?rooms=7" },
  ...ROOMS.map((r) => ({ name: `result-${r}`, url: `/__dev/skip?rooms=7&to=${r}-result` })),
  { name: "book-toc", url: "/__dev/skip?rooms=7&paid=1&to=book" },
  { name: "saju-input", url: "/__dev/skip?rooms=0&to=saju-input" },
];

// (I4) 결제·지도·책 쪽 상태. act = 화면까지 가기, show = 잴 쪽을 is-current로, probe = 따로 살필 값, fixed = 책처럼 화면 높이 고정, clip = 확대 캡처
const until = async (b, expr, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await b.evaluate(expr)) return true; await sleep(60); } throw new Error("시간 넘김: " + expr.slice(0, 60)); };
const openCh = (id, prep) => async (b) => {
  if (prep) { await until(b, "!!document.querySelector('.screen.is-active')"); await b.evaluate(prep); await b.evaluate("location.reload()"); await sleep(800); }
  await until(b, "document.querySelector('.screen.is-active')?.id === 'screen-report'");
  await b.evaluate(`document.querySelector('[data-js=book-chapter][data-chapter=${id}] [data-js=book-chapter-btn]').click()`);
  await until(b, "!document.querySelector('[data-js=book-chapter-open]').disabled");
  await b.evaluate("document.querySelector('[data-js=book-chapter-open]').click()");
  await until(b, "document.querySelector('[data-js=book-reader]').dataset.view === 'pages'");
  await sleep(500);
};
const showPage = (sel) => `(() => { const P = [...document.querySelectorAll('[data-js=book-page]')]; const t = P.find((p) => p.querySelector(${JSON.stringify(sel)})) || P[0]; P.forEach((p) => p.classList.toggle('is-current', p === t)); return P.indexOf(t); })()`;
// 책 쪽 전부: 세로 넘침(본문 scrollHeight) · 가로 넘침(본문 밖으로 나간 요소) · 쪽 수 · 새 요소 수
const PAGES = `(() => { const P = [...document.querySelectorAll('[data-js=book-page]')]; let over = 0; const hov = [];
  P.forEach((p) => { const bd = p.querySelector('.book-page__body'); if (bd.scrollHeight > bd.clientHeight + 1) over++; const was = p.classList.contains('is-current'); });
  const x = (s) => document.querySelectorAll('[data-js=book-page] ' + s).length;
  const lines = (s) => Math.max(0, ...[...document.querySelectorAll('[data-js=book-page] ' + s)].map((h) => { const rg = document.createRange(); rg.selectNodeContents(h); return [...rg.getClientRects()].map((r) => Math.round(r.top)).filter((v, i, a) => a.indexOf(v) === i).length; }));
  P.forEach((p) => { const bd = p.querySelector('.book-page__body'); const R = bd.getBoundingClientRect(); if (!R.width) return; bd.querySelectorAll('*').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.right > R.right + 0.5 || r.left < R.left - 0.5)) hov.push(String(e.className || e.tagName)); }); });
  return { pages: P.length, over, hov: hov.slice(0, 4), nhov: hov.length, heads: x('.yeon-sec__head'), headLines: lines('.yeon-sec__head'), when: x('.yeon-when__item'), ageLines: lines('.yeon-when__age'), season: x('.yeon-season__name'), notes: [...document.querySelectorAll('[data-js=book-page] .yeon-sec__note')].filter((n) => !n.hidden).length, first: x('p.book-first-line'), heart: x('aside.book-heart'), labelLines: lines('.book-heart__label') }; })()`;
const BK = "/__dev/skip?rooms=7&paid=1&to=book";
const NOBIRTH = "(() => { const s = JSON.parse(sessionStorage.getItem('strange-oracle')); delete s.profile.birth; sessionStorage.setItem('strange-oracle', JSON.stringify(s)); return true; })()";
const toCreate = async (b) => {
  await b.evaluate("localStorage.removeItem('strange-oracle-mapkey')");
  await until(b, "document.querySelector('[data-js=map-slot-story] [data-js=map-card]')?.dataset.state === 'create'");
  await b.evaluate("document.querySelector('[data-js=map-slot-story] [data-js=map-card] [data-js=map-create]').click()");
  await until(b, "document.querySelector('.screen.is-active')?.id === 'screen-map-consent'");
  await sleep(300);
};
const I4_STATES = [
  { name: "hub-7", url: "/__dev/skip?rooms=7&to=hub", clip: ".so-far .hub-progress", probe: "(() => { const e = document.querySelector('[data-js=hub-progress-count]'); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { text: e.textContent, color: cs.color, fs: cs.fontSize, x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }; })()" },
  { name: "pay", url: "/__dev/skip?rooms=7&to=book", act: async (b) => { await until(b, "document.querySelector('.screen.is-active')?.id === 'screen-report'"); await b.evaluate("StrangeOracle.go('deeper')"); await until(b, "document.querySelector('.screen.is-active')?.id === 'screen-deeper'"); await sleep(300); },
    clip: ".pay-list__item--new", probe: "(() => { const li = document.querySelector('.pay-list__item--new'); const p = li && li.querySelector('.pay-list__new'); if (!p) return { li: !!li }; const top = (e) => Math.round(e.getBoundingClientRect().top); const vol = li.querySelector('.pay-list__vol'); return { pillRects: p.getClientRects().length, pillH: Math.round(p.getBoundingClientRect().height), liH: Math.round(li.getBoundingClientRect().height), sameLine: Math.abs(top(p) - top(li.querySelector('.pay-list__name'))) < 6 && Math.abs(p.getBoundingClientRect().bottom - vol.getBoundingClientRect().bottom) < 8, text: li.textContent.replace(/\\s+/g, ' ').trim() }; })()" },
  { name: "map-consent", url: "/__dev/skip?rooms=7", act: toCreate },
  { name: "map-empty", url: "/__dev/skip?rooms=7", act: async (b) => { await toCreate(b);
    await b.evaluate("(() => { const n = document.querySelector('#screen-map-consent [data-js=map-nick]'); n.value = '별빛토끼여덟자'; n.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('input[name=map-icon][value=i05]').click(); document.querySelector('[data-js=map-agree]').click(); document.querySelector('[data-js=map-send]').click(); return true; })()");
    await until(b, "document.querySelector('[data-js=map-key-dialog]')?.open"); await b.evaluate("(() => { document.querySelector('[data-js=map-key-ack]').click(); document.querySelector('[data-js=map-key-close]').click(); return true; })()"); await until(b, "document.querySelector('.screen.is-active')?.id === 'screen-map'"); await sleep(500); } },
  { name: "book-toc", url: BK, act: (b) => until(b, "document.querySelector('.screen.is-active')?.id === 'screen-report'"), clip: "[data-js=book-chapter][data-chapter=yeon]", probe: "(() => { const r = document.querySelectorAll('[data-js=book-chapter][data-chapter=yeon]'); const f = r[0]; return { rows: r.length, name: f && f.querySelector('.chapter-row__name').textContent, sub: f && f.querySelector('.chapter-row__sub').textContent, time: f && f.querySelector('[data-js=book-chapter-time]').textContent, state: f && f.dataset.state, order: [...document.querySelectorAll('[data-js=book-chapter]')].map((x) => x.dataset.chapter).join(',') }; })()" },
  { name: "yeon-p1", url: BK, fixed: true, act: openCh("yeon"), probe: PAGES, show: showPage(".yeon-sec__head") },
  { name: "yeon-when", url: BK, fixed: true, act: openCh("yeon"), show: showPage(".yeon-when"), clip: "[data-js=book-page].is-current .yeon-when" },
  { name: "yeon-season", url: BK, fixed: true, act: openCh("yeon"), show: showPage(".yeon-season__name"), clip: "[data-js=book-page].is-current .yeon-season__name" },
  { name: "yeon-noage", url: BK, fixed: true, act: openCh("yeon", NOBIRTH), probe: PAGES, show: showPage(".yeon-sec__note:not([hidden])") },
  { name: "yeon-nosaju", url: "/__dev/skip?legacy=1&paid=1&to=book", fixed: true, act: openCh("yeon"), probe: PAGES, show: showPage(".yeon-sec__note:not([hidden])") },
  { name: "ogham-first", url: BK, fixed: true, act: openCh("ogham"), probe: PAGES, show: showPage("p.book-first-line") },
  { name: "ogham-heart", url: BK, fixed: true, act: openCh("ogham"), show: showPage("aside.book-heart"), clip: "[data-js=book-page].is-current aside.book-heart" },
  { name: "saju-heart", url: BK, fixed: true, act: openCh("saju"), probe: PAGES, show: showPage("aside.book-heart") },
  { name: "rune-heart", url: BK, fixed: true, act: openCh("rune"), probe: PAGES, show: showPage("aside.book-heart") },
  { name: "sibyl-first", url: BK, fixed: true, act: openCh("sibyl"), probe: PAGES, show: showPage("p.book-first-line") },
];
if (I4) STATES.splice(0, STATES.length, ...I4_STATES);

// 페이지 안: 보이는 글자 요소 목록(글자색 sRGB 포함)
const COLLECT = `(() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgb = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const out = [];
  const W = innerWidth;
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "TEMPLATE", "svg", "SVG", "OPTION"].includes(el.tagName)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible" || +cs.opacity === 0) continue;
    if (el.closest(".visually-hidden, [hidden], .is-hidden")) continue;
    // 글자 상자 = 이 요소 바로 안의 글자 노드들이 차지한 줄 상자의 합 (둥근 단추·잘린 쐐기돌에서 귀퉁이가 배경 밖으로 나가지 않게)
    let r = null;
    for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); const q = rg.getBoundingClientRect(); if (!q.width) continue; r = r ? { left: Math.min(r.left, q.left), top: Math.min(r.top, q.top), right: Math.max(r.right, q.right), bottom: Math.max(r.bottom, q.bottom) } : { left: q.left, top: q.top, right: q.right, bottom: q.bottom }; }
    if (!r) continue; r.width = r.right - r.left; r.height = r.bottom - r.top;
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.left >= W || r.right <= 0) continue;
    let op = 1; for (let a = el; a; a = a.parentElement) op *= +getComputedStyle(a).opacity;
    if (op < 0.05) continue;
    const fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 600;
    out.push({
      sel: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "") + (el.dataset.t ? "[" + el.dataset.t + "]" : ""),
      text: el.textContent.trim().slice(0, 24), fs, bold, op: +op.toFixed(2),
      deco: !!el.closest("[aria-hidden=true]"), clipText: /text/.test(cs.webkitBackgroundClip || cs.backgroundClip), disabled: !!el.closest("button:disabled, [aria-disabled=true], .is-locked .door__glyph"),
      color: rgb(cs.color), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height,
    });
  }
  return out;
})()`;
const overflowJS = `(() => { const W = document.documentElement.clientWidth; const bad = [];
  for (const el of document.querySelectorAll("body *")) { const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (r.right > W + 0.5 || r.left < -0.5) { let clip = false; for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (/(hidden|clip)/.test(o.overflowX + o.overflow) ) { clip = true; break; } if (o.position === "fixed") break; }
      if (!clip && getComputedStyle(el).position !== "fixed") bad.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + " " + Math.round(r.left) + "~" + Math.round(r.right)); } }
  return { scroll: document.documentElement.scrollWidth - W, bad: bad.slice(0, 8), n: bad.length }; })()`;

const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const report = { when: new Date().toISOString(), widths: {} };
  for (const width of [360, 480]) {
    const b = await launch({ port: 9420 + width / 120, width, height: 800, reduced: true });
    const W = (report.widths[width] = { states: {}, worst: [] });
    for (const st of STATES) {
      try {
        await b.goto(ORIGIN + st.url);
        await sleep(500);
        if (st.act) await st.act(b);
        const ov = await b.evaluate(overflowJS);
        const probe = st.probe ? await b.evaluate(st.probe) : null;
        // 글자 상자 좌표는 전체 높이로 바꾼 뒤에 잰다(100dvh 자리가 바뀌므로)
        const H = st.fixed ? 800 : await b.evaluate("Math.min(document.documentElement.scrollHeight, 9000)");
        await b.send("Emulation.setDeviceMetricsOverride", { width, height: H, deviceScaleFactor: 1, mobile: true });
        await sleep(400);
        if (st.show) { await b.evaluate(st.show); await sleep(150); }
        if (st.clip) { const r = await b.evaluate(`(() => { const q = document.querySelector(${JSON.stringify(st.clip)}).getBoundingClientRect(); return { x: Math.max(0, q.left - 12), y: Math.max(0, q.top + scrollY - 12), width: Math.min(${width}, q.width + 24), height: q.height + 24, scale: 4 }; })()`); const c = await b.send("Page.captureScreenshot", { format: "png", clip: r }); fs.writeFileSync(path.join(OUT, `${width}-${st.name}-clip.png`), Buffer.from(c.data, "base64")); }
        const items = await b.evaluate(COLLECT);
        const shot = await b.send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(OUT, `${width}-${st.name}.png`), Buffer.from(shot.data, "base64"));
        await b.evaluate(`(() => { const s = document.createElement("style"); s.id = "so-hide"; s.textContent = "*, *::before, *::after { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; caret-color: transparent !important; text-decoration-color: transparent !important; }"; document.head.append(s); })()`);
        await sleep(200);
        const bare = await b.send("Page.captureScreenshot", { format: "png" });
        const px = await b.evaluate(`(async () => {
          const img = new Image(); img.src = "data:image/png;base64,${bare.data}"; await img.decode();
          const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0);
          const items = ${JSON.stringify(items.map((i) => [i.x - 0, i.y, i.w, i.h]))};
          return items.map(([x, y, w, h]) => [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3], [x + w / 2, y + h / 2]].map(([a, c]) => { const d = cx.getImageData(Math.max(0, Math.min(img.width - 1, Math.round(a))), Math.max(0, Math.min(img.height - 1, Math.round(c))), 1, 1).data; return [d[0], d[1], d[2]]; }));
        })()`);
        await b.evaluate(`document.getElementById("so-hide").remove()`);
        await b.send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 2, mobile: true });
        const rows = items.map((it, k) => {
          const bgs = px[k];
          const a = it.color[3] * it.op;
          const worst = Math.min(...bgs.map((bg) => ratio(it.color.slice(0, 3).map((c, j) => c * a + bg[j] * (1 - a)), bg)));
          const big = it.fs >= 24 || (it.fs >= 18.66 && it.bold);
          const need = it.deco || big ? 3 : 4.5;
          return { sel: it.sel, text: it.text, fs: it.fs, ratio: +worst.toFixed(2), need, pass: worst >= need, excluded: it.disabled || it.clipText };
        });
        const small = rows.filter((r) => r.fs < 11);
        const fails = rows.filter((r) => !r.pass && !r.excluded);
        W.states[st.name] = { overflow: ov, texts: rows.length, small: small.length, fails, probe };
        if (probe) console.log(`    살핌 ${JSON.stringify(probe)}`);
        W.worst.push(...rows.filter((r) => !r.excluded).map((r) => ({ ...r, state: st.name })));
        console.log(`${width} ${st.name}: 넘침 ${ov.scroll}px·${ov.n}개, 글자 ${rows.length}, 11px 미만 ${small.length}, 대비 미달 ${fails.length}`);
        fails.slice(0, 6).forEach((f) => console.log(`    미달 ${f.ratio}<${f.need} ${f.fs}px ${f.sel} "${f.text}"`));
      } catch (e) { console.log(`${width} ${st.name}: 오류 ${e.message}`); W.states[st.name] = { error: e.message }; }
    }
    // 일곱 문 캡처표: 다음 방을 바꿔 가며 입구 고대 문 · 작은 문 칸 · 다음 문 견본
    if (!I4) try {
      await b.goto(ORIGIN + "/__dev/skip?rooms=0&to=hub");
      await b.evaluate(`(() => {
        const box = document.createElement("div"); box.id = "so-doors"; box.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:16px 0;";
        const rooms = ${JSON.stringify(ROOMS.slice(1))};
        for (const r of rooms) {
          const g = document.querySelector("[data-js=hub-cta]").cloneNode(true); g.dataset.room = r; g.removeAttribute("data-js"); g.style.cssText = "--gw:120px;zoom:0.8";
          const n = document.querySelector('.next-door[data-room="' + r + '"]') || document.querySelector(".next-door"); const nd = n.cloneNode(true); nd.dataset.room = r; nd.style.cssText = "--nd-w:150px;zoom:0.8";
          const cell = document.createElement("div"); cell.style.cssText = "display:grid;justify-items:center;gap:8px;"; cell.append(g, nd); box.append(cell);
        }
        document.querySelector(".hub").prepend(box);
        document.querySelectorAll(".hub .door").forEach((d) => d.classList.remove("is-locked"));
      })()`);
      await sleep(400);
      const H = await b.evaluate("Math.min(document.documentElement.scrollHeight, 9000)");
      await b.send("Emulation.setDeviceMetricsOverride", { width, height: H, deviceScaleFactor: 1, mobile: true });
      await sleep(300);
      const s = await b.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(OUT, `${width}-doors-sheet.png`), Buffer.from(s.data, "base64"));
    } catch (e) { console.log("문 캡처표 오류 " + e.message); }
    W.worst.sort((a, b) => a.ratio / a.need - b.ratio / b.need);
    W.worst = W.worst.slice(0, 15);
    if (b.log.errors.length) console.log(`  콘솔 오류 ${b.log.errors.length}: ${b.log.errors.slice(0, 3).join(" | ")}`);
    await b.close();
  }
  fs.writeFileSync(path.join(OUT, "look-17.json"), JSON.stringify(report, null, 1));
  for (const [w, W] of Object.entries(report.widths)) console.log(`${w} 가장 낮은 대비: ` + W.worst.slice(0, 5).map((r) => `${r.ratio}/${r.need} ${r.sel}(${r.state})`).join(" · "));
})();
