// 18단계 off·성능 대조 (spec 18-7 합격, 18-12의 10·14). 18단계 시작 직전 코드(옛)와 지금 코드(새)를 같은 화면에서 견준다. 배포하지 않는다(tools/).
// 준비 (옛 = PROGRESS-18의 시작 커밋을 작업 폴더 밖에 풀어 build-dist):
//   git archive 3dface52597118607426d21457fec5f94baa935a | tar -x -C <옛 폴더>  →  node <옛 폴더>/tools/build-dist.js
//   node <옛 폴더>/tools/strange-oracle/mock-server.js --port 8793 --mode off     (옛 off)
//   node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8794 --mode off   (새 off)
//   (첫 화면 대조만 test로도: 옛 --mode test --port 8795, 새 = 8788 test)
// 실행: node --experimental-websocket tools/strange-oracle/off-diff-18.js [--old URL] [--new URL] [--first-only] [--tag 이름] [--stage19]
//   → out/off-diff-18[-이름].txt
// 보는 것
//  1 첫 화면(입구, 빈 탭, 캐시 끔): 부른 파일 목록과 파일마다 전송 바이트(encodedDataLength). 옛·새가 같아야 한다(줄어드는 것은 괜찮음)
//  2 (--first-only가 아니면) off 화면 대조: 입구·일곱 방(시작·결과)·나의 이야기를 0/7·1/7·3/7·7/7로 360×800에서 열어
//    보이는 글자(innerText)와 DOM(body outerHTML, 주석 뺌)이 같은지, 그리고 새 파일(data-book-sample.js·arch-core.js)·/api/book 요청 0
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const OLD = arg("--old", "http://127.0.0.1:8793");
const NEW = arg("--new", "http://127.0.0.1:8794");
const TAG = arg("--tag", "");
const FIRST_ONLY = process.argv.includes("--first-only");
// (19단계 19-7의 10) --stage19: 19단계에서 의도한 off 화면 차이(바로 가기 띠 · 쿠키 줄 보임 · 면책 자리·문구·스크립트 없음 · GA4 gtag.js 스크립트)를
// 옛·새 두 쪽에서 똑같이 걷어 낸 뒤 견준다. 걷어 낸 것은 화면마다 [옛 | 새] 개수로 적는다 → "남은 차이 0"이면 차이가 이 목록뿐이라는 뜻
const STAGE19 = process.argv.includes("--stage19");
const NORM19 = `(() => { const c = { tabs: 0, cookieShown: 0, disc: 0, discJs: 0, gtag: 0 };
  document.querySelectorAll('[data-js=hub-tabs]').forEach((e) => { c.tabs++; e.remove(); });
  const ck = document.querySelector('[data-js=cookie-line]'); if (ck && !ck.hidden) { c.cookieShown++; ck.hidden = true; }
  document.querySelectorAll('[data-js=disclaimer-slot], [data-js=map-disclaimer], [data-js=map-friend-disclaimer], .disclaimer').forEach((e) => { c.disc++; e.remove(); });
  document.querySelectorAll('script[src*="disclaimer.js"]').forEach((e) => { c.discJs++; e.remove(); });
  document.querySelectorAll('script[src*="googletagmanager.com"]').forEach((e) => { c.gtag++; e.remove(); });
  return c; })()`;
const P = "/products/strange-oracle/index.html";
const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const DATA = (() => { const w = {}; for (const f of ["data-saju.js", "data-ogham.js", "data-stars.js", "data-decans.js", "data-tzolkin.js", "data-runes.js", "data-oracles.js"]) require("vm").runInNewContext(fs.readFileSync(path.resolve(__dirname, "..", "..", "products", "strange-oracle", f), "utf8"), { window: w }); return w; })();
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
const PROFILE = { name: "김서윤", birth: { y: 1995, m: 3, d: 25 }, time: { h: 14, min: 37 } };
const lines = [];
const log = (s) => (lines.push(s), console.log(s));

async function firstScreen(base, port) {
  const b = await launch({ port, reduced: true, width: 360, height: 640 });
  await b.send("Network.setCacheDisabled", { cacheDisabled: true });
  const reqs = new Map(); // requestId → url
  const bytes = {};
  b.on((m) => {
    if (m.method === "Network.requestWillBeSent") reqs.set(m.params.requestId, m.params.request.url.replace(base, "").replace(/^https?:\/\/[^/]+/, (h) => h));
    if (m.method === "Network.loadingFinished" && reqs.has(m.params.requestId)) { const u = reqs.get(m.params.requestId); bytes[u] = (bytes[u] || 0) + m.params.encodedDataLength; }
  });
  await b.goto(base + P);
  await b.sleep(5000); // 한가할 때 미리 받기까지 지켜본다(옛·새 같은 조건)
  await b.close();
  return bytes;
}

async function screens(base, port) {
  const b = await launch({ port, reduced: true, width: 360, height: 800 });
  const out = {};
  const states = [[0, ["hub"]], [1, ["hub", "saju-result", "ogham-intro", "story"]], [3, ["hub", "saju-result", "ogham-result", "star-result", "decan-intro", "story"]], [7, ["hub", ...ORDER.map((r) => `${r}-result`), "story"]]];
  for (const [n, list] of states) {
    for (const scr of list) {
      await b.goto(base + P);
      await b.evaluate(`sessionStorage.clear(); sessionStorage.setItem('strange-oracle', ${JSON.stringify(JSON.stringify({ profile: PROFILE, visits: seedVisits(ORDER.slice(0, n)) }))}); true`);
      await b.goto(base + P + "#" + scr);
      await b.sleep(1500);
      const norm = STAGE19 ? await b.evaluate(NORM19) : null;
      out[`${n}/7 ${scr}`] = await b.evaluate(`JSON.stringify({ active: document.querySelector('.screen.is-active')?.id, text: document.querySelector('.screen.is-active')?.innerText || '', dom: document.body.outerHTML.replace(/<!--[\\s\\S]*?-->/g, '').replace(/\\s+/g, ' ') })`).then(JSON.parse); // 주석(마크업 설명)은 화면 DOM 노드가 아니라 뺀다
      if (norm) out[`${n}/7 ${scr}`].norm = norm;
    }
  }
  const req = b.log.requests.filter((r) => /data-book-sample|arch-core|app-book|style-book|\/api\/book|data-book-/.test(r)); // (결정 120) 책 전용 파일도
  await b.close();
  return { out, req };
}

(async () => {
  log(`== off-diff-18 ${new Date().toISOString().slice(0, 16)} · 옛 ${OLD} · 새 ${NEW} ==`);
  const fo = await firstScreen(OLD, 9641), fn = await firstScreen(NEW, 9642);
  const keys = [...new Set([...Object.keys(fo), ...Object.keys(fn)])].sort();
  let sumO = 0, sumN = 0, diff = 0;
  log("[1 첫 화면 파일·전송 바이트] 파일 | 옛 | 새");
  for (const k of keys) {
    const a = fo[k], c = fn[k];
    sumO += a || 0;
    sumN += c || 0;
    const same = a === c;
    if (!same) diff++;
    log(`  ${same ? " " : "≠"} ${k} | ${a == null ? "-" : a} | ${c == null ? "-" : c}`);
  }
  const onlyNew = keys.filter((k) => fo[k] == null && fn[k] != null);
  log(`  파일 수 옛 ${Object.keys(fo).length} · 새 ${Object.keys(fn).length} · 새에만 있는 파일 ${onlyNew.length}${onlyNew.length ? " (" + onlyNew.join(", ") + ")" : ""} · 합계 옛 ${sumO} · 새 ${sumN} (차 ${sumN - sumO}) · 다른 줄 ${diff}`);
  const okFirst = onlyNew.length === 0 && !keys.some((k) => /data-book-sample|arch-core|book-cross|app-book|style-book/.test(k) && fn[k] != null);
  log(`  주 기준(18-12의 14): 첫 화면 파일 목록 같음·새 파일 요청 0 → ${okFirst ? "PASS" : "FAIL"}`);
  const local = keys.filter((k) => k.startsWith("/"));
  const lo = local.reduce((n, k) => n + (fo[k] || 0), 0), ln = local.reduce((n, k) => n + (fn[k] || 0), 0);
  log(`  같은 출처 파일 전송 바이트: 옛 ${lo} · 새 ${ln} (차 ${ln - lo}, ${(((ln - lo) / lo) * 100).toFixed(1)}%) · 바뀌지 않은 파일도 응답 머리 때문에 몇십 바이트 흔들린다`);
  // (결정 120) 문구 규칙상 불가피한 몫(data.js·data-volume.js)을 뺀 나머지 차
  const dataKeys = local.filter((k) => /\/data(-volume)?\.js$/.test(k));
  const dd = dataKeys.reduce((n, k) => n + ((fn[k] || 0) - (fo[k] || 0)), 0);
  log(`  그중 data.js·data-volume.js 차 ${dd} · 나머지 같은 출처 파일 차 ${ln - lo - dd}`);
  if (!FIRST_ONLY) {
    const so = await screens(OLD, 9643), sn = await screens(NEW, 9644);
    log("[2 off 화면 대조 360×800] 상태 화면 | 보이는 글자 | DOM");
    let bad = 0;
    for (const k of Object.keys(so.out)) {
      const a = so.out[k], c = sn.out[k];
      const t = a.text === c.text, d = a.dom === c.dom;
      if (!t || !d || a.active !== c.active) bad++;
      let at = "";
      if (!d) { let i = 0; while (i < a.dom.length && a.dom[i] === c.dom[i]) i++; at = ` 첫 차이 @${i}: 옛 "${a.dom.slice(i - 40, i + 80)}" / 새 "${c.dom.slice(i - 40, i + 80)}"`; }
      log(`  ${t && d ? "같음" : "다름"} ${k} (${a.active}) | ${t ? "글자 같음" : "글자 다름"} | ${d ? "DOM 같음" : "DOM 다름" + at}${a.norm ? ` | 걷어 냄 옛 ${JSON.stringify(a.norm)} · 새 ${JSON.stringify(c.norm)}` : ""}`);
    }
    log(`  새 off 화면의 책 파일·새 파일 요청: ${sn.req.length}건${sn.req.length ? " " + sn.req.join(" ") : ""} (옛 ${so.req.length}건)`);
    log(`  결과(18-12의 10): 화면 ${Object.keys(so.out).length}개 중 다름 ${bad} · 새 파일 요청 ${sn.req.length} → ${bad === 0 && sn.req.length === 0 ? "PASS" : "FAIL"}`);
  }
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", `off-diff-18${TAG ? "-" + TAG : ""}.txt`), lines.join("\n") + "\n");
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
