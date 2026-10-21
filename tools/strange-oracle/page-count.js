// 11단계 F1: 책 쪽 수·짧은 쪽·시기별 흐름 쪽·표제만 있는 쪽·문장 중간 넘김을 잰다 (표본 영수증 3개, 360×800·360×640)
// 준비: mock 서버 (예: node tools/strange-oracle/mock-server.js --src --port 8790)
// 실행: node --experimental-websocket tools/strange-oracle/page-count.js [base url]
// 결과는 콘솔 JSON 한 줄씩. e2e-paid.js도 같은 measure 식(BOOK_METRICS)을 쓴다.
const { launch } = require("./cdp.js");
const BASE = process.argv[2] || "http://127.0.0.1:8790/products/strange-oracle/index.html";
// 쪽 하나하나를 종류로 나눠 잰다. 본문 쪽 = 표지·목차·뒷면지·부 표제지(가운데)·봉인 쪽 제외
const BOOK_METRICS = `(() => {
  const pages = [...document.querySelectorAll('[data-js=book-pages] [data-js=book-page]')];
  const END = /[.?!…。][”’"')\\]」』]*$/;
  const info = pages.map((p) => {
    const bd = p.querySelector('[data-js=book-page-body]');
    const special = /book-page--(front|toc|end|half|seal)/.test(p.className) || p.classList.contains('is-solo');
    const clone = bd.cloneNode(true);
    clone.querySelectorAll('.book-opening').forEach((o) => o.remove());
    const text = clone.textContent.replace(/\\s+/g, ' ').trim();
    const items = bd.querySelectorAll('.timeline__areas > div').length;
    const contItems = bd.querySelectorAll('.timeline__areas > div.is-cont').length;
    const full = items === 1 && bd.scrollHeight >= bd.clientHeight - 40;
    const first = bd.firstElementChild;
    const lastP = [...bd.querySelectorAll('p, dd')].pop();
    return { contItems, head: !!bd.querySelector('.book-opening'), full, n: Number(p.dataset.page), special, chars: [...text].length, headOnly: !special && text.length === 0, items, cont: !!(first && first.matches('p.is-cont')), lastText: lastP ? lastP.textContent.trim() : '' };
  });
  const body = info.filter((x) => !x.special);
  let headRun = 0, headPairs = 0;
  info.forEach((x) => { headRun = x.headOnly ? headRun + 1 : 0; if (headRun >= 2) headPairs++; });
  const midCut = info.filter((x, i) => x.cont && i > 0 && !END.test(info[i - 1].lastText)).map((x) => x.n + (info[x.n - 2].head ? '(장 첫 쪽 뒤, 앞 쪽 ' + info[x.n - 2].chars + '자)' : ''));
  const tl = info.filter((x) => x.items > 0);
  return { pages: pages.length, solo: pages.filter((p) => p.classList.contains('is-solo') && !p.classList.contains('book-page--part-open')).length, body: body.length, under50: body.filter((x) => x.chars < 50).map((x) => x.n + ':' + x.chars), headPairs, midCut, tlPages: tl.length, tlBad: tl.filter((x) => x.items < 2 && !(x.contItems === x.items && x.chars >= 50)).map((x) => x.n + ':' + x.chars + '자'), tlUnder2: tl.filter((x) => x.items < 2).map((x) => x.n + ':' + x.items + '/' + x.chars + '자') };
})()`;
module.exports = { BOOK_METRICS };

if (require.main === module) (async () => {
  const b = await launch({ port: 9640, reduced: true });
  const { evaluate: ev, sleep } = b;
  // 원형이 다른 표본 3개 (방 결과 번호도 서로 다르게, 상대 있음/없음 섞음)
  const SAMPLES = [
    { arch: "warrior", band: 1, partner: null, ogham: 2, star: 4, decan: 10, tzolkin: { number: 4, sign: 19 }, rune: [0, 5, 10], sibyl: 12, relOgham: null, relDecan: null, relTzolkin: null },
    { arch: "sage", band: 3, partner: "lover", ogham: 7, star: 15, decan: 22, tzolkin: { number: 9, sign: 3 }, rune: [8, 2, 17], sibyl: 4, relOgham: 1, relDecan: 2, relTzolkin: 0 },
    { arch: "caregiver", band: 5, partner: null, ogham: 15, star: 26, decan: 33, tzolkin: { number: 13, sign: 11 }, rune: [21, 14, 6], sibyl: 30, relOgham: null, relDecan: null, relTzolkin: null },
  ];
  await b.goto(BASE);
  await sleep(500);
  const archs = await ev("PayCode.ARCHETYPES");
  for (const [i, s] of SAMPLES.entries()) {
    if (!archs.includes(s.arch)) s.arch = archs[i * 3 % archs.length];
    if (s.partner && !archs.includes(s.partner)) s.partner = archs[(i * 3 + 1) % archs.length];
    const orderId = await ev(`PayCode.encode(${JSON.stringify(s)})`);
    await b.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
    await ev("sessionStorage.clear()");
    await b.goto(`${BASE}?pay=success&paymentKey=mock_pc${i}${Date.now()}&orderId=${orderId}&amount=5900`);
    const t0 = Date.now();
    while (Date.now() - t0 < 10000 && (await ev("document.querySelector('.screen.is-active')?.id")) !== "screen-report") await sleep(150);
    await ev("document.fonts.ready.then(() => true)");
    await sleep(800);
    const m800 = await ev(BOOK_METRICS);
    await b.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
    await sleep(800);
    const m640 = await ev(BOOK_METRICS);
    if (process.env.PCDEBUG) for (const u of m640.under50) { const n = parseInt(u); console.log(await ev(`[${n - 1}, ${n}].map(k => { const p = document.querySelector('[data-js=book-pages] [data-js=book-page][data-page=' + '"' + k + '"]'); return k + ' ' + p.className + ' | ' + [...p.querySelector('[data-js=book-page-body]').children].map(c => c.tagName + '.' + c.className + '[' + c.textContent.trim().slice(0, 25) + ']').join(' ; '); }).join(' || ')`)); }
    console.log(JSON.stringify({ sample: i + 1, arch: s.arch, "360x800": m800, "360x640": m640 }));
  }
  await b.close();
})();
