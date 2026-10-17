// 배포용 폴더(dist/) 만들기. 공개해도 되는 파일만 public/에 복사한다.
// 사용: node tools/build-dist.js      (Netlify도 저장소 루트 netlify.toml의 [build] command로 이것을 그대로 부른다, 결정 93)
// 결과 (14단계 F4-B2):
//   dist/public/   정적 사이트 전체 (index.html → 제품으로 이동, common/, products/<slug>/). netlify.toml publish = "dist/public"
//   유료 원본 products/<slug>/api/_paid/book/은 public/에 넣지 않는다. 함수 netlify/functions/book.js의 묶음(included_files)으로만 서버에 올라간다.
//   본 페이지 = dist/public + 함수 하나(book).
// 내부 문서(specs, reports, design, agents, CLAUDE.md)와 제품 폴더의 meta.json·tests.md·api/는 넣지 않는다.
// 하나라도 어기면 빌드 실패(exit 1) → Netlify 배포도 멈춘다:
//   ① dist/public에 api/·_paid·__dev·옛 data-book-*.js(data-book-free.js·data-book-sample.js 말고)·legal/refund.html·_로 시작하는 폴더 없음
//      (18-7) data-book-sample.js = 방 장 첫 줄 공개 맛보기(결정 117). 허용은 이 이름 하나만 더한다 — 다른 data-book-*.js는 지금처럼 막는다
//   ② 유료 문장 지문 누출 0: api/_paid/book/의 유료 파일마다 지문(문장 조각)을 뽑아 dist/public 전체에서 찾는다
//   ③ 배포판 pay.mode = "off" (결정 94)
//   ④ 첫 화면(index.html이 정적으로 부르는 파일)이 data-book-*.js를 부르지 않음
//   ⑤ site.url·GA4 ID 모양
//   ⑥ (15단계) pay.payapp.sdk = 페이앱 공식 주소   ⑦ live 가드: pay.mode live인데 payapp.userid·pay.contact가 비었거나 pay 문구·legal에 ◯◯
//   ⑧ dist/public 텍스트에 linkkey·linkval·PASS_SECRET·PAYAPP_·PAY_DEBUG·__dev 0건
//   ⑨ (15단계 QA 1차 필수 1) 결제 표지: 제품 HTML(index.html·legal/*.html)의 <!-- pay:on -->/<!-- pay:off --> 짝이 맞고, 배포판에 표지가 남지 않음.
//      pay.mode off → pay:on 구획(legal 결제 문단·목차 줄, index.html 결제 template)을 걷어 내고 legal/refund.html을 넣지 않는다.
//      pay.mode live → pay:off 구획을 걷어 내고 legal/refund.html을 넣는다(⑦ live 가드: refund.html 있음, privacy·terms에 pay:on 구획 있음, 배포판 legal ◯◯ 0).
//      처리 함수는 tools/pay-sections.js (모의 서버 --mode test도 같은 함수로 legal·index를 test 판으로 내준다)
//   (16단계 16-8) 친구 궁합 지도
//   ⑩ 배포판 map.mode = "off" (운영자가 H7 live 때 ③처럼 함께 푼다)
//   ⑪ 지도 표지: 제품 HTML의 <!-- map:on -->/<!-- map:off --> 짝이 맞고 배포판에 표지가 남지 않음. off면 map:on 구획 0, map.js·data-map.js 0, 지도 template id 0
//   ⑫ friend-map/ 폴더가 배포 폴더에 없음. 배포판 텍스트에 지도 서버 칸·설정 이름(MAP_WORDS)·모의 지도 길 0건
//   ⑬ live 가드(⑩을 풀어도 남음): map.mode live인데 map.api가 https://로 시작하지 않거나, site.url이 비었거나,
//      legal privacy에 map:on 구획이 없거나, data-map.js·privacy 지도 구획에 ◯◯가 남으면 실패
//   ② 유료 문장 지문 검사에 data-map.js(원본)도 넣는다
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PRODUCTS = ["strange-oracle"]; // 배포할 제품
const HOME = "strange-oracle"; // dist 첫 화면이 이동할 제품
const PRODUCT_EXCLUDE = new Set(["meta.json", "tests.md", "api", "pay.json", "refund.html", "friend-map"]); // refund.html: legal/ 안 환불 정책(13단계 은퇴, 14-3 legal은 F5) · friend-map: 16단계 지도 Worker 원본(배포 폴더 밖, 가드 ⑫는 H3)
const PUBLIC = path.join(DIST, "public");
const PAYAPP_SDK = "https://lite.payapp.kr/public/api/v2/payapp-lite.js"; // (15-7) 페이앱 공식 SDK 주소 (결정 98: 최신 판, 버전 고정 대상 아님)
const SECRET_WORDS = ["linkkey", "linkval", "PASS_SECRET", "PAYAPP_", "PAY_DEBUG", "__dev"]; // (15-7) dist/public 텍스트에 0건이어야 하는 낱말
const og = require("./og-tags.js");
const PaySec = require("./pay-sections.js");
const MapSec = PaySec.map; // (16단계) 지도 표지 map:on/off
const MODES = {}; // slug → pay.mode
const MAP_MODES = {}; // slug → map.mode (16단계)
const MAP_FILES = ["map.js", "data-map.js"]; // 지도 파일: map.mode off면 배포 폴더에 넣지 않는다(⑪)
const MAP_WORDS = ["key_hash", "del_hash", "MAP_MODE", "ALLOWED_ORIGIN", "/__dev/map"]; // ⑫ 배포판 텍스트 0건
const MAP_IDS = ["map-tpl", "screen-map", "map-card", "map-key-dialog", "map-slot-"]; // ⑪ off 배포판 index.html에 0건
const fails = [];

const readData = (slug) => {
  const w = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "products", slug, "data.js"), "utf8"), { window: w });
  return w.TEXT || {};
};

// (10단계 10-2) 서비스 주소: 제품 data.js 맨 위 site.url 한 줄. 모양이 틀리면 아무것도 만들지 않고 멈춘다.
const SITE = {};
for (const slug of PRODUCTS) {
  const url = og.readSiteUrl(fs.readFileSync(path.join(ROOT, "products", slug, "data.js"), "utf8"));
  const problem = og.siteUrlProblem(url);
  if (problem) {
    console.error(`오류: products/${slug}/data.js — ${problem} (지금 값: "${url}")`);
    process.exit(1);
  }
  SITE[slug] = url;
}
// (12단계 12-5) 분석 ID: 빈 값은 경고만, 모양이 틀리면 실패. 광고 ID 검사(Ads.check)와 ads.txt는 14-2 광고 제거로 은퇴했다(common/ads.js 파일은 저장소에 남김)
{
  const parts = { window: { location: { search: "" } }, document: {}, console };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "common", "analytics.js"), "utf8"), parts);
  const { Analytics } = parts.window;
  for (const slug of PRODUCTS) {
    const T = readData(slug);
    const ga4 = String((T.analytics && T.analytics.ga4) || "").trim();
    if (!ga4) console.log(`  경고: products/${slug}/data.js의 analytics.ga4가 비어 있음 — 분석 스크립트를 불러오지 않고 동작합니다`);
    else if (!Analytics.configured(ga4)) {
      console.error(`오류: products/${slug}/data.js — analytics.ga4 모양이 틀림 (GA4 "G-…")`);
      process.exit(1);
    }
    // ③ (14-4, 결정 94) 배포판은 결제 화면을 숨긴다. pay.mode가 "off"가 아니면 실패.
    //    live로 바꿀 때(운영자, specs 54·39·62번과 계획서 live 조건을 마친 뒤): 아래 조건을 "off" 또는 "live"를 허용하도록 함께 고친다. "test"는 언제나 실패여야 한다.
    const mode = T.pay ? T.pay.mode : "off";
    MODES[slug] = mode;
    if (mode !== "off") fails.push(`③ products/${slug}/data.js pay.mode = "${mode}" (배포판은 "off"만)`);
    // ⑥ (15단계 15-7) 페이앱 SDK 주소는 공식 주소 그대로(모의 주소가 섞이지 않게). off에서도 본다
    const pa = (T.pay && T.pay.payapp) || {};
    if (pa.sdk !== PAYAPP_SDK) fails.push(`⑥ products/${slug}/data.js pay.payapp.sdk가 공식 주소가 아님 ("${pa.sdk}")`);
    // ⑩ (16-8) 배포판은 친구 지도를 끈다. ⑬ live 가드는 ⑩을 풀어도 남는다
    const mapMode = T.map && T.map.mode ? String(T.map.mode) : "off";
    MAP_MODES[slug] = mapMode;
    if (mapMode !== "off") fails.push(`⑩ products/${slug}/data.js map.mode = "${mapMode}" (배포판은 "off"만)`);
    if (mapMode === "live") {
      if (!/^https:\/\//.test(String(T.map.api || ""))) fails.push(`⑬ live: products/${slug}/data.js map.api가 https://로 시작하지 않음`);
      if (!SITE[slug]) fails.push(`⑬ live: products/${slug}/data.js site.url이 비어 있음 (초대 링크 주소)`);
      const dm = path.join(ROOT, "products", slug, "data-map.js");
      if (!fs.existsSync(dm) || fs.readFileSync(dm, "utf8").includes("◯◯")) fails.push(`⑬ live: products/${slug}/data-map.js가 없거나 ◯◯가 남음`);
      const pv = path.join(ROOT, "products", slug, "legal", "privacy.html");
      const pvHtml = fs.existsSync(pv) ? fs.readFileSync(pv, "utf8") : "";
      if (MapSec.count(pvHtml, "on") === 0) fails.push(`⑬ live: products/${slug}/legal/privacy.html에 map:on 지도 구획이 없음`);
      else if ((pvHtml.match(/<!--\s*map:on\s*-->[\s\S]*?<!--\s*\/map:on\s*-->/g) || []).some((sec) => sec.includes("◯◯"))) fails.push(`⑬ live: products/${slug}/legal/privacy.html 지도 구획에 ◯◯가 남음`);
    }
    // ⑦ live 가드(검수 권장 5): 위 ③ off 가드를 운영자가 풀어도 남는다. live인데 운영자 값이 비었거나 ◯◯가 남으면 실패
    if (mode === "live") {
      if (!String(pa.userid || "").trim()) fails.push(`⑦ live: products/${slug}/data.js pay.payapp.userid가 비어 있음`);
      if (!String(T.pay.contact || "").trim()) fails.push(`⑦ live: products/${slug}/data.js pay.contact(문의처)가 비어 있음`);
      if (JSON.stringify(T.pay).includes("◯◯")) fails.push(`⑦ live: products/${slug}/data.js pay.* 문구에 ◯◯가 남음`);
      const legal = path.join(ROOT, "products", slug, "legal");
      if (fs.existsSync(legal))
        for (const f of fs.readdirSync(legal).filter((n) => /\.html$/.test(n)))
          if (fs.readFileSync(path.join(legal, f), "utf8").includes("◯◯")) fails.push(`⑦ live: products/${slug}/legal/${f}에 ◯◯가 남음`);
    }
  }
}

function copyDir(src, dest, exclude = new Set()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to, exclude);
    else fs.copyFileSync(from, to);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
// (14-2·14-7의 7) 광고는 걷어 냈다: common/ads.js는 저장소에 남기되 배포 폴더에는 넣지 않는다
const COMMON_EXCLUDE = new Set(["ads.js"]);
copyDir(path.join(ROOT, "common"), path.join(PUBLIC, "common"), COMMON_EXCLUDE);
for (const slug of PRODUCTS) copyDir(path.join(ROOT, "products", slug), path.join(PUBLIC, "products", slug), PRODUCT_EXCLUDE);
// ⑨ (15단계 QA 1차 필수 1) 결제 표지 처리. live면 legal/refund.html을 넣는다(off·test는 넣지 않음 — test는 배포 금지 ③, 시험 페이지에서는 모의 서버가 내준다)
for (const slug of PRODUCTS) {
  const mode = MODES[slug];
  const src = path.join(ROOT, "products", slug);
  const dst = path.join(PUBLIC, "products", slug);
  const refundSrc = path.join(src, "legal", "refund.html");
  if (mode === "live" && fs.existsSync(refundSrc)) fs.copyFileSync(refundSrc, path.join(dst, "legal", "refund.html"));
  const pages = ["index.html"].concat(fs.existsSync(path.join(dst, "legal")) ? fs.readdirSync(path.join(dst, "legal")).filter((n) => /\.html$/.test(n)).map((n) => "legal/" + n) : []);
  for (const rel of pages) {
    const f = path.join(dst, rel);
    const html = fs.readFileSync(f, "utf8");
    const bad = PaySec.problem(html);
    if (bad) fails.push(`⑨ products/${slug}/${rel} 결제 표지 ${bad}`);
    const mapBad = MapSec.problem(html);
    if (mapBad) fails.push(`⑪ products/${slug}/${rel} 지도 표지 ${mapBad}`);
    const out = MapSec.strip(PaySec.strip(html, mode), MAP_MODES[slug]);
    if (/<!--\s*\/?pay:(on|off)\s*-->/.test(out)) fails.push(`⑨ public/products/${slug}/${rel}에 결제 표지가 남음`);
    if (MapSec.left(out)) fails.push(`⑪ public/products/${slug}/${rel}에 지도 표지가 남음`);
    fs.writeFileSync(f, out);
  }
  // ⑪ (16-8) 지도가 꺼진 판: 지도 파일·지도 template·자리가 배포 폴더에 없다
  if (!MapSec.isOn(MAP_MODES[slug])) {
    for (const n of MAP_FILES) fs.rmSync(path.join(dst, n), { force: true });
    const idx = fs.readFileSync(path.join(dst, "index.html"), "utf8");
    for (const id of MAP_IDS) if (idx.includes(`data-js="${id}`) || idx.includes(`id="${id}`)) fails.push(`⑪ off: public/products/${slug}/index.html에 지도 요소 ${id} 남음`);
    for (const n of MAP_FILES) if (fs.existsSync(path.join(dst, n))) fails.push(`⑪ off: public/products/${slug}/${n} 있음`);
  }
  if (mode === "off" && /data-js="pay-(toc-)?tpl"/.test(fs.readFileSync(path.join(dst, "index.html"), "utf8"))) fails.push(`⑨ off: public/products/${slug}/index.html에 결제 template이 남음`);
  // ⑦ live 가드 추가: refund.html이 배포 폴더에 있는가 · privacy·terms에 pay:on 구획이 있는가 · 배포판 legal에 ◯◯ 0
  if (mode === "live") {
    if (!fs.existsSync(path.join(dst, "legal", "refund.html"))) fails.push(`⑦ live: public/products/${slug}/legal/refund.html 없음`);
    for (const n of ["privacy.html", "terms.html"]) {
      const s = path.join(src, "legal", n);
      if (!fs.existsSync(s) || PaySec.count(fs.readFileSync(s, "utf8"), "on") === 0) fails.push(`⑦ live: products/${slug}/legal/${n}에 pay:on 결제 구획이 없음`);
    }
    for (const rel of pages.filter((r) => r.startsWith("legal/")))
      if (fs.readFileSync(path.join(dst, rel), "utf8").includes("◯◯")) fails.push(`⑦ live: public/products/${slug}/${rel}에 ◯◯가 남음`);
  }
}
// 제품 index.html 복사본: og:image 절대 경로, og:url·canonical 추가 (site.url이 있을 때만)
for (const slug of PRODUCTS) {
  const file = path.join(PUBLIC, "products", slug, "index.html");
  if (SITE[slug]) fs.writeFileSync(file, og.injectOg(fs.readFileSync(file, "utf8"), SITE[slug]));
  else console.log(`  경고: products/${slug}/data.js의 site.url이 비어 있어 og:url·canonical을 넣지 않았고 og:image는 상대 경로입니다 (배포 전에 채울 것)`);
}
// 루트 이동 페이지: 제품과 같은 title·description(+ site.url이 있으면 og 태그·canonical)
fs.writeFileSync(path.join(PUBLIC, "index.html"), og.rootPage(HOME, og.readHead(fs.readFileSync(path.join(ROOT, "products", HOME, "index.html"), "utf8")), SITE[HOME]));

let count = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : count++;
})(DIST);
console.log(`dist/ 생성 완료 — 파일 ${count}개`);

// 중간 공유본 점검: 아직 [초안]이 남은 파일을 알려 준다 (정식 배포 전에는 0이어야 한다)
for (const slug of PRODUCTS) {
  const dir = path.join(PUBLIC, "products", slug);
  const left = fs.readdirSync(dir).filter((f) => /\.(js|html)$/.test(f))
    .map((f) => [f, (fs.readFileSync(path.join(dir, f), "utf8").match(/\[초안\]/g) || []).length])
    .filter(([, n]) => n);
  console.log(left.length ? `  [초안] 남음 (중간 공유본): ${left.map(([f, n]) => `${f} ${n}`).join(", ")}` : "  [초안] 없음");
}

// ① 폴더·파일 모양
const publicTexts = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    const rel = path.relative(PUBLIC, p).split(path.sep).join("/");
    if (e.isDirectory()) {
      if (e.name === "api" || e.name === "_paid" || e.name === "__dev") fails.push(`① public/${rel}/ 있음`);
      else if (e.name.startsWith("_")) fails.push(`① _로 시작하는 폴더 public/${rel}/`);
      walk(p);
    } else {
      if (/(^|\/)legal\/refund\.html$/.test(rel) && !Object.values(MODES).includes("live")) fails.push(`① public/${rel} 있음 (live에서만 넣는다)`);
      if (/(^|\/)data-book-(?!(free|sample)\.js$)[^/]*\.js$/.test(rel) || /(^|\/)book-[a-z]+\.js$/.test(rel)) fails.push(`① 옛 책 파일·유료 파일 public/${rel}`);
      if (/__dev/.test(rel)) fails.push(`① public/${rel}`);
      if (/(^|\/)ads\.js$/.test(rel)) fails.push(`① 광고 부품 public/${rel} (14-7의 7)`);
      if (/(^|\/)friend-map\//.test(rel)) fails.push(`⑫ 지도 서버 원본 public/${rel}`);
      if (/\.(js|html|css|json|txt|md|svg|xml)$/.test(e.name)) {
        const t = fs.readFileSync(p, "utf8");
        publicTexts.push(t);
        for (const w of SECRET_WORDS) if (t.includes(w)) fails.push(`⑧ public/${rel}에 "${w}" 있음`); // (15-7) 결제 비밀값 이름·모의 길 0건
        for (const w of MAP_WORDS) if (t.includes(w)) fails.push(`⑫ public/${rel}에 "${w}" 있음`); // (16-8) 지도 서버 칸·설정 이름·모의 지도 길 0건
      }
    }
  }
})(PUBLIC);

// ② 유료 문장 지문 누출 0 (14-7의 9). 지문 = 유료 파일의 문자열(30자 이상)마다 가운데 최대 60자(따옴표·역슬래시·줄바꿈 없는 조각). 파일마다 20개 이상이어야 검사로 인정.
//    60자인 까닭: 24자로는 방 문구와 우연히 겹치는 구절(예: "…정작 당신을 챙겨 주는 사람은 드물 때가 있어요")이 누출로 잡혔다(2026-10-15 실측 6건, 모두 문장 재사용)
//    공개 방 문구(data-*.js)에 **글자 그대로 같은 문자열**로 이미 있는 것(방 결과의 떡밥 hook 등, 책 장이 그대로 다시 쓰는 무료 문장)은 지문에서 뺀다(13단계와 같은 규칙)
for (const slug of PRODUCTS) {
  const paid = path.join(ROOT, "products", slug, "api", "_paid", "book");
  if (!fs.existsSync(paid)) continue;
  const freeSet = new Set();
  const pubDir = path.join(PUBLIC, "products", slug);
  for (const f of fs.readdirSync(pubDir).filter((n) => /^data[^/]*.js$/.test(n))) {
    const w = {};
    try {
      vm.runInNewContext(fs.readFileSync(path.join(pubDir, f), "utf8"), { window: w });
    } catch (e) {
      continue;
    }
    (function grab(v) {
      if (typeof v === "string") freeSet.add(v);
      else if (v && typeof v === "object") Object.values(v).forEach(grab);
    })(w);
  }
  let same = 0;
  // (16-8) 지도 문구 원본(data-map.js)도 지문 검사에 넣는다(off 배포판에는 없는 파일이라 원본을 읽는다)
  const dmSrc = path.join(ROOT, "products", slug, "data-map.js");
  const big = publicTexts.concat(fs.existsSync(dmSrc) ? [fs.readFileSync(dmSrc, "utf8")] : []).join("\n\u0000\n");
  let total = 0, hits = 0;
  const per = [];
  for (const f of fs.readdirSync(paid).filter((n) => /\.js$/.test(n)).sort()) {
    const w = {};
    vm.runInNewContext(fs.readFileSync(path.join(paid, f), "utf8"), { window: w });
    const prints = new Set();
    let texts = 0; // 빈칸이 아닌 문자열 수 (17단계 book-yeon.js는 문구를 넣기 전 키만 있다)
    (function collect(v, k) {
      if (typeof v === "string" && k !== "code" && v.trim()) texts++;
      if (typeof v === "string") {
        if (k === "code" || v.length < 30) return;
        if (freeSet.has(v)) return void same++;
        const L = Math.min(60, v.length);
        const mid = Math.floor((v.length - L) / 2);
        const s = v.slice(mid, mid + L);
        if (!/["'\\\n\r{}<>]/.test(s)) prints.add(s);
      } else if (Array.isArray(v)) v.forEach((x) => collect(x, k));
      else if (v && typeof v === "object") Object.entries(v).forEach(([kk, x]) => collect(x, kk));
    })(w, "");
    // 문구가 하나도 없는 원본(키 구조만, 17단계 book-yeon.js 문구 전)은 새는 것이 없으니 실패로 세지 않고 알린다. 문구가 하나라도 생기면 20개 기준을 그대로 적용
    if (prints.size < 20 && texts === 0) console.log(`  (알림) ${f}: 문구 전 빈 원본 — 지문 0개, 문구를 넣으면 지문 검사 대상`);
    else if (prints.size < 20) fails.push(`② ${slug}/api/_paid/book/${f} 지문 ${prints.size}개(20개 미만)`);
    let h = 0;
    for (const s of prints)
      if (big.includes(s)) {
        h++;
        if (h <= 2) fails.push(`② 누출: ${f} ← "${s}"`);
      }
    total += prints.size;
    hits += h;
    per.push(`${f.replace(/^book-|\.js$/g, "")} ${prints.size}`);
  }
  console.log(`  유료 문장 지문 ${total}개 (${per.join(" · ")}) → dist/public 텍스트 파일 ${publicTexts.length}개에서 ${hits}건 (공개 방 문구와 글자 그대로 같은 문자열 ${same}개는 뺌)`);
}

// ④ 첫 화면이 책 파일을 부르지 않음
for (const slug of PRODUCTS) {
  const html = fs.readFileSync(path.join(PUBLIC, "products", slug, "index.html"), "utf8");
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  refs.filter((u) => /data-book-|\/api\//.test(u)).forEach((u) => fails.push(`④ index.html이 ${u}를 부름`));
}

// ⑫ friend-map 폴더 없음
for (const slug of PRODUCTS) if (fs.existsSync(path.join(PUBLIC, "products", slug, "friend-map"))) fails.push(`⑫ public/products/${slug}/friend-map/ 있음`);

if (fails.length) {
  console.error("  실패: 배포 점검 — " + fails.slice(0, 15).join(" | "));
  process.exitCode = 1;
} else console.log("  배포 점검 통과 (pay.mode off · map.mode off · 지도 표지 처리(off: 지도 template·자리·map.js·data-map.js 없음) · friend-map·지도 서버 칸 이름 0건 · 결제 표지 처리(off: legal 결제 문단·결제 template·refund.html 없음) · 페이앱 SDK 공식 주소 · 결제 비밀값 이름·__dev 0건 · api/·_paid·__dev·옛 책 파일·ads.js 없음 · 유료 문장 지문 0건 · 첫 화면 책 파일 0) — 공개 폴더: dist/public, 함수: netlify/functions/book.js");
