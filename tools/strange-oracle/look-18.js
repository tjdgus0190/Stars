// 18단계 J4 (designer) UI 점검: 실제 앱 + 실제 문구로 미리보기·샘플·새 장 6쪽(대체 경로)·대조표·18-5 상태별 자리를 360·480에서 잰다.
//   node tools/strange-oracle/mock-server.js --port 8788 --mode test   (먼저, 백그라운드. 8787 금지)
//   node tools/strange-oracle/look-18.js       → tools/strange-oracle/out/j4/ 에 PNG와 look-18.json
// 대비·넘침 재는 법은 look-17.js의 measure()를 그대로 쓴다(다섯 점 픽셀, 본문 4.5:1 · 큰 글자/꾸밈 3:1).
// 더해서: 360×640 낮은 화면 첫 화면(미리보기)·새 장 쪽(대조표가 한 쪽에 들어가는지), 움직임 줄이기에서 animation 0, 한 화면 주 버튼 수.
const fs = require("fs");
const path = require("path");
const { measure, until, sleep, launch, ORIGIN } = require("./look-17.js");
const OUT = path.join(__dirname, "out", "j4");
fs.mkdirSync(OUT, { recursive: true });

const active = (id) => `document.querySelector('.screen.is-active')?.id === '${id}'`;
const ready = (b) => until(b, `${active("screen-preview")} && document.querySelector('#screen-preview').dataset.state === 'ready'`);
// 세션 고치기 → 다시 읽기 (지름길 뒤)
const prep = (code) => async (b) => { await until(b, "!!document.querySelector('.screen.is-active')"); await b.evaluate(`(() => { const s = JSON.parse(sessionStorage.getItem('strange-oracle')); ${code}; sessionStorage.setItem('strange-oracle', JSON.stringify(s)); return true; })()`); await b.evaluate("location.reload()"); await sleep(900); };
const SAME_ARCH = "const a = s.visits.saju.archetype; Object.values(s.visits).forEach((v) => (v.archetype = a))"; // 일곱 방 모두 같은 원형 → 고른 결 + 한결같은 목소리 + D 없음
const LONG_NAME = "s.profile.name = '남궁수한무거'";
const openCross = (pre) => async (b) => {
  if (pre) await pre(b);
  await until(b, active("screen-report"));
  await b.evaluate("document.querySelector('[data-js=book-chapter][data-chapter=cross] [data-js=book-chapter-btn]').click()");
  await until(b, "!document.querySelector('[data-js=book-chapter-open]').disabled");
  await b.evaluate("document.querySelector('[data-js=book-chapter-open]').click()");
  await until(b, "document.querySelector('[data-js=book-reader]').dataset.view === 'pages' && document.querySelectorAll('[data-js=book-page][data-part=cross]').length > 0");
  await sleep(600);
};
const showCross = (sel) => `(() => { const P = [...document.querySelectorAll('[data-js=book-page]')]; const t = P.find((p) => p.dataset.part === 'cross' && p.querySelector(${JSON.stringify(sel)})) || P[0]; P.forEach((p) => p.classList.toggle('is-current', p === t)); return P.indexOf(t); })()`;
// 새 장 쪽 전부: 쪽 수 · 세로 넘침 · 가로 넘침 · 대조표 쪽(표 높이, 그 쪽 본문 높이, 범례가 같은 쪽인지) · 쪽 이름 줄 수
const CROSS = `(() => { const P = [...document.querySelectorAll('[data-js=book-page][data-part=cross]')]; let over = 0, hov = 0; const secs = [];
  P.forEach((p) => { const bd = p.querySelector('.book-page__body'); if (bd.scrollHeight > bd.clientHeight + 1) over++; const R = bd.getBoundingClientRect();
    bd.querySelectorAll('*').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.right > R.right + 0.5 || r.left < R.left - 0.5)) hov++; });
    p.querySelectorAll('section.cross-sec').forEach((s) => secs.push(s.dataset.sec || s.dataset.page)); });
  const tp = P.find((p) => p.querySelector('table.cross-table')); const t = tp && tp.querySelector('table.cross-table');
  const lines = (s) => Math.max(0, ...[...document.querySelectorAll('[data-js=book-page][data-part=cross] ' + s)].map((h) => { const rg = document.createRange(); rg.selectNodeContents(h); return new Set([...rg.getClientRects()].map((r) => Math.round(r.top))).size; }));
  return { pages: P.length, over, hov, secs: [...new Set(secs)].join(','), variant: document.querySelector('[data-js=report-cross]')?.dataset.variant, tableUnits: P.filter((p) => p.querySelector('table.cross-table')).length,
    tableH: t ? Math.round(t.getBoundingClientRect().height) : 0, bodyH: tp ? tp.querySelector('.book-page__body').clientHeight : 0, legendSame: !!(tp && tp.querySelector('.cross-legend')), legendPage: P.findIndex((p) => p.querySelector('.cross-legend')) - P.indexOf(tp),
    split: t && t.dataset.split, pending: document.querySelectorAll('[data-js=book-page] .cross-table__row.is-pending').length, note: [...document.querySelectorAll('[data-js=book-page] [data-js=cross-note]')].some((n) => !n.hidden), headLines: lines('.cross-sec__name') }; })()`;
// 화면에 보이는 주 버튼 수(한 화면 주 버튼 1개)
const PRIM = (scr) => `[...document.querySelectorAll('#${scr} .btn--primary')].filter((e) => e.offsetHeight > 0 && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').map((e) => e.dataset.js || e.textContent.trim().slice(0, 10))`;
const ANIM = `[...document.querySelectorAll('.is-target, .is-target *')].map((e) => getComputedStyle(e).animationName).filter((n) => n && n !== 'none').length`;

const STATES = [
  // 미리보기 (7/7 결제 전)
  { name: "preview", url: "/__dev/skip?rooms=7&to=preview", act: ready, probe: `({ h: [...document.querySelectorAll('#screen-preview h1,#screen-preview h2,#screen-preview h3')].map((h) => h.tagName).join(''), prim: ${PRIM("screen-preview")}, ads: document.querySelectorAll('#screen-preview [data-ad], #screen-preview .ad-slot').length, disc: (document.querySelector('#screen-preview [data-js=disclaimer-slot]')?.textContent || '').trim().slice(0, 30), title: document.querySelector('[data-js=preview-title]').textContent, closeHidden: document.querySelector('[data-js=preview-close]').hidden, restLines: Math.max(...[...document.querySelectorAll('[data-js=preview-first-rest]')].map((e) => Math.round(e.getBoundingClientRect().height))) })` },
  { name: "preview-long", url: "/__dev/skip?rooms=7&to=preview", act: async (b) => { await prep(LONG_NAME)(b); await ready(b); }, probe: "({ title: document.querySelector('[data-js=preview-title]').textContent, h: Math.round(document.querySelector('[data-js=preview-title]').getBoundingClientRect().height) })", clip: ".pv-head" },
  { name: "preview-close", url: "/__dev/skip?rooms=7&to=preview", act: async (b) => { await ready(b); await b.evaluate("document.querySelector('[data-js=preview-close-toggle]').click()"); await sleep(200); }, probe: "({ open: !document.querySelector('[data-js=preview-close]').hidden, btn: document.querySelector('[data-js=preview-close-toggle]').hidden })" },
  { name: "preview-target", url: "/__dev/skip?rooms=7&to=book", act: async (b) => { await until(b, active("screen-report")); await b.evaluate("document.querySelector('[data-js=book-chapter][data-chapter=star] [data-js=book-chapter-btn]').click()"); await ready(b); await sleep(300); }, probe: `({ target: document.querySelector('.is-target')?.dataset.chapter || document.querySelector('.is-target')?.className, anim: ${ANIM} })`, clip: ".first-lines__item.is-target" },
  { name: "preview-target-cross", url: "/__dev/skip?rooms=7&to=book", act: async (b) => { await until(b, active("screen-report")); await b.evaluate("document.querySelector('[data-js=book-chapter][data-chapter=cross] [data-js=book-chapter-btn]').click()"); await ready(b); await sleep(300); }, probe: `({ target: document.querySelector('.is-target')?.className, anim: ${ANIM} })`, clip: ".pv-leaf.is-target" },
  // 목차 18-5 상태
  { name: "toc-0", url: "/__dev/skip?rooms=0&to=book", act: (b) => until(b, active("screen-report")), probe: "({ band: !document.querySelector('[data-js=book-preview-band]').hidden, buy: !document.querySelector('[data-js=book-buy-row]').hidden })" },
  { name: "toc-3", url: "/__dev/skip?rooms=3&to=book", act: (b) => until(b, active("screen-report")), probe: "(() => { const x = document.querySelector('[data-js=book-buy]'); const cs = getComputedStyle(x); return { band: !document.querySelector('[data-js=book-preview-band]').hidden, buy: !document.querySelector('[data-js=book-buy-row]').hidden, buyText: x.textContent.trim(), fs: cs.fontSize, deco: cs.textDecorationLine, h: Math.round(x.getBoundingClientRect().height), w: Math.round(x.getBoundingClientRect().width), y: Math.round(x.getBoundingClientRect().top + scrollY), docH: document.documentElement.scrollHeight }; })()", clip: "[data-js=book-buy-row]" },
  { name: "toc-3-locked", url: "/__dev/skip?rooms=3&to=book", act: async (b) => { await until(b, active("screen-report")); await b.evaluate("document.querySelector('[data-js=book-chapter][data-chapter=star] [data-js=book-chapter-btn]').click()"); await sleep(250); }, probe: `({ scr: document.querySelector('.screen.is-active').id, target: document.querySelector('.chapter-row.is-target')?.dataset.chapter, toast: document.querySelector('[data-js=toast]').textContent, anim: ${ANIM}, rowTop: Math.round(document.querySelector('[data-js=book-chapter][data-chapter=star]').getBoundingClientRect().top) })`, clip: "[data-js=book-chapter][data-chapter=star]" },
  { name: "toc-7", url: "/__dev/skip?rooms=7&to=book", act: (b) => until(b, active("screen-report")), probe: "({ band: !document.querySelector('[data-js=book-preview-band]').hidden, buy: !document.querySelector('[data-js=book-buy-row]').hidden, interest: !document.querySelector('[data-js=book-interest]')?.hidden })", clip: "[data-js=book-preview-band]" },
  { name: "toc-7-paid", url: "/__dev/skip?rooms=7&paid=1&to=book", act: (b) => until(b, active("screen-report")), probe: "({ band: !document.querySelector('[data-js=book-preview-band]').hidden, buy: !document.querySelector('[data-js=book-buy-row]').hidden })" },
  // 입구 카드
  { name: "hub-3", url: "/__dev/skip?rooms=3&to=hub", act: (b) => until(b, active("screen-hub")), probe: "({ state: document.querySelector('[data-js=hub-book]').dataset.state, go: document.querySelector('[data-js=hub-book-go]').textContent, price: /3,900|\\d+원/.test(document.querySelector('[data-js=hub-book]').textContent) })", clip: "[data-js=hub-book]" },
  { name: "hub-7", url: "/__dev/skip?rooms=7&to=hub", act: (b) => until(b, active("screen-hub")), probe: "({ state: document.querySelector('[data-js=hub-book]').dataset.state, go: document.querySelector('[data-js=hub-book-go]').textContent, price: /3,900|\\d+원/.test(document.querySelector('[data-js=hub-book]').textContent) })", clip: "[data-js=hub-book]" },
  { name: "hub-7-paid", url: "/__dev/skip?rooms=7&paid=1&to=hub", act: (b) => until(b, active("screen-hub")), probe: "({ state: document.querySelector('[data-js=hub-book]').dataset.state, go: document.querySelector('[data-js=hub-book-go]').textContent })", clip: "[data-js=hub-book]" },
  // 나의 이야기
  { name: "story-7", url: "/__dev/skip?rooms=7", act: async (b) => { await until(b, active("screen-story")); await until(b, "!!document.querySelector('[data-js=map-slot-story] [data-js=map-card]')", 6000).catch(() => {}); await sleep(400); }, probe: `({ prim: ${PRIM("screen-story")}, map: document.querySelector('[data-js=map-slot-story] [data-js=map-card]')?.dataset.state })`, clip: "[data-js=story-preview]" },
  { name: "story-7-paid", url: "/__dev/skip?rooms=7&paid=1", act: async (b) => { await until(b, active("screen-story")); await sleep(800); }, probe: `({ prim: ${PRIM("screen-story")}, map: document.querySelector('[data-js=map-slot-story] [data-js=map-card]')?.dataset.state })` },
  { name: "story-3", url: "/__dev/skip?rooms=3", act: async (b) => { await until(b, active("screen-story")); await sleep(800); }, probe: `({ prim: ${PRIM("screen-story")} })` },
  // 결제 전 "받는 것"
  { name: "pay-from-preview", url: "/__dev/skip?rooms=7&to=preview", act: async (b) => { await ready(b); await b.evaluate("document.querySelector('[data-js=preview-go]').click()"); await until(b, active("screen-deeper")); await sleep(300); }, probe: `(() => { const li = document.querySelector('.pay-list__item--new'); return { newRow: li && li.textContent.replace(/\\s+/g, ' ').trim(), liH: li && Math.round(li.getBoundingClientRect().height), back: !document.querySelector('[data-js=pay-back-preview]').hidden, prim: ${PRIM("screen-deeper")} }; })()`, clip: ".pay-list__item--new" },
  { name: "pay-1", url: "/__dev/skip?rooms=1&to=deeper", act: async (b) => { await until(b, active("screen-deeper")); await sleep(300); }, probe: "(() => { const li = document.querySelector('.pay-list__item--new'); return { newRow: li && li.textContent.replace(/\\s+/g, ' ').trim(), liH: li && Math.round(li.getBoundingClientRect().height), state: !!li?.querySelector('.pay-list__state') }; })()", clip: ".pay-list__item--new" },
  // 새 장 6쪽 (결제한 탭)
  ...["table.cross-table", ".cross-axis", "dl.cross-ends", "[data-sec=lens]", "[data-sec=pair]", "[data-sec=close]"].map((sel, i) => ({ name: `cross-${i + 1}`, url: "/__dev/skip?rooms=7&paid=1&to=book", fixed: true, act: openCross(), show: showCross(sel), probe: i === 0 ? CROSS : null })),
  // 대체 경로: 일곱 방 같은 원형 → 고른 결 · 한결같은 목소리 · D 없음
  ...["table.cross-table", "[data-sec=even]", "[data-sec=same]"].map((sel, i) => ({ name: `cross-alt-${i}`, url: "/__dev/skip?rooms=7&paid=1&to=book", fixed: true, act: openCross(prep(SAME_ARCH)), show: showCross(sel), probe: i === 0 ? CROSS : null })),
  // 방 3개: 아직 지나지 않은 방 줄 · 끝 안내
  ...["table.cross-table", "[data-js=cross-note]"].map((sel, i) => ({ name: `cross-3-${i}`, url: "/__dev/skip?rooms=3&paid=1&to=book", fixed: true, act: openCross(), show: showCross(sel), probe: i === 0 ? CROSS : null })),
];

(async () => {
  const report = { when: new Date().toISOString(), widths: {}, low: {} };
  for (const width of [360, 480]) {
    const b = await launch({ port: 9430 + width / 120, width, height: 800, reduced: true });
    const W = (report.widths[width] = { states: {}, worst: [] });
    for (const st of STATES) {
      try {
        const { ov, probe, rows, small, fails } = await measure(b, width, st, OUT);
        W.states[st.name] = { overflow: ov, texts: rows.length, small: small.length, fails, probe };
        W.worst.push(...rows.filter((r) => !r.excluded).map((r) => ({ ...r, state: st.name })));
        console.log(`${width} ${st.name}: 넘침 ${ov.scroll}px·${ov.n}개, 글자 ${rows.length}, 11px 미만 ${small.length}, 대비 미달 ${fails.length}`);
        if (probe) console.log(`    살핌 ${JSON.stringify(probe)}`);
        fails.slice(0, 6).forEach((f) => console.log(`    미달 ${f.ratio}<${f.need} ${f.fs}px ${f.sel} "${f.text}"`));
      } catch (e) { console.log(`${width} ${st.name}: 오류 ${e.message}`); W.states[st.name] = { error: e.message }; }
    }
    W.worst.sort((a, b) => a.ratio / a.need - b.ratio / b.need);
    W.worst = W.worst.slice(0, 15);
    if (b.log.errors.length) console.log(`  콘솔 오류 ${b.log.errors.length}: ${b.log.errors.slice(0, 3).join(" | ")}`);
    await b.close();
  }
  // 낮은 화면 360×640: 미리보기 첫 화면에 무엇이 보이나 · 새 장 쪽(기본·대체·방 3개)
  for (const [width, height] of [[360, 640], [480, 800]]) {
    const b = await launch({ port: 9450 + width / 120, width, height, reduced: true });
    const L = (report.low[`${width}x${height}`] = {});
    try {
      await b.goto(ORIGIN + "/__dev/skip?rooms=7&to=preview"); await sleep(500); await ready(b); await b.evaluate("scrollTo(0, 0)"); await sleep(300);
      L.first = await b.evaluate(`(() => { const H = innerHeight; const vis = (e) => { const r = e.getBoundingClientRect(); return r.top < H && r.bottom > 0; }; const cut = (e) => { const r = e.getBoundingClientRect(); return r.top < H && r.bottom > H; };
        const rows = [...document.querySelectorAll('#screen-preview .pv-toc__item, #screen-preview .pv-toc__part')]; return { seen: rows.filter(vis).filter((e) => !cut(e)).map((e) => e.dataset.chapter || 'part'), cut: rows.filter(cut).map((e) => e.dataset.chapter || 'part'), price: /3,900/.test([...document.querySelectorAll('#screen-preview *')].filter((e) => e.children.length === 0 && vis(e)).map((e) => e.textContent).join(' ')) }; })()`);
      const s = await b.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, `${width}x${height}-preview-first.png`), Buffer.from(s.data, "base64"));
      for (const [nm, url, pre] of [["cross", "/__dev/skip?rooms=7&paid=1&to=book", null], ["cross-alt", "/__dev/skip?rooms=7&paid=1&to=book", prep(SAME_ARCH)], ["cross-3", "/__dev/skip?rooms=3&paid=1&to=book", null]]) {
        await b.goto(ORIGIN + url); await sleep(500); await openCross(pre)(b);
        L[nm] = await b.evaluate(CROSS);
        await b.evaluate(showCross("table.cross-table")); await sleep(150);
        const c = await b.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, `${width}x${height}-${nm}-table.png`), Buffer.from(c.data, "base64"));
      }
    } catch (e) { L.error = e.message; }
    console.log(`${width}x${height} ${JSON.stringify(L)}`);
    await b.close();
  }
  fs.writeFileSync(path.join(OUT, "look-18.json"), JSON.stringify(report, null, 1));
  for (const [w, W] of Object.entries(report.widths)) console.log(`${w} 가장 낮은 대비: ` + W.worst.slice(0, 6).map((r) => `${r.ratio}/${r.need} ${r.sel}(${r.state})`).join(" · "));
})();
