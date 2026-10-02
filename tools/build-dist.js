// 배포용 폴더(dist/) 만들기. 공개해도 되는 파일만 public/에 복사한다.
// 사용: node tools/build-dist.js
// 결과 (13단계부터 정적 전용):
//   dist/vercel.json               outputDirectory = "public" → 공개 정적 파일은 public/ 아래만
//   dist/public/                   정적 사이트 전체 (index.html → 제품으로 이동, common/, products/<slug>/)
//                                  결제 없이 순수 정적 호스팅에 올릴 때는 이 public/ 폴더만 올린다
//   dist/api/                      Vercel 함수(config·confirm·report) + _lib(로직) + _paid(유료 문구, 서버 전용)
//                                  제품 폴더의 api/는 public/에 넣지 않는다 (유료 문구가 공개 주소로 새지 않게, spec 6-4·D-4)
// 결제는 Vercel 환경 변수 PAY_MODE로 켠다. 넣지 않으면 off → 무료판과 똑같이 동작.
// 내부 문서(specs, reports, design, agents, CLAUDE.md)와 제품 폴더의 meta.json·tests.md는 넣지 않는다.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PRODUCTS = ["strange-oracle"]; // 배포할 제품
const HOME = "strange-oracle"; // dist 첫 화면이 이동할 제품
const PRODUCT_EXCLUDE = new Set(["meta.json", "tests.md", "api", "pay.json", "refund.html"]); // refund.html: legal/ 안 환불 정책(13단계 은퇴)
const PUBLIC = path.join(DIST, "public");
const og = require("./og-tags.js");

// (10단계 10-2) 서비스 주소: 제품 data.js 맨 위 site.url 한 줄. 모양이 틀리면 아무것도 만들지 않고 멈춘다.
// 비어 있으면 og:url·canonical을 넣지 않고 og:image는 상대 경로로 둔다. 고치는 것은 dist 안의 복사본뿐이다(제품 원본은 그대로).
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
// (12단계 12-6) 광고·분석 ID: 빈 값은 경고만(무료판은 ID 없이도 배포 가능), 모양이 틀리면 실패. 점검 규칙은 common/ads.js·analytics.js의 것을 그대로 쓴다
const ADS_TXT = {};
{
  const vm = require("vm");
  const parts = { window: { location: { search: "" } }, document: {}, console };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "common", "ads.js"), "utf8") + ";" + fs.readFileSync(path.join(ROOT, "common", "analytics.js"), "utf8"), parts);
  const { Ads, Analytics } = parts.window;
  for (const slug of PRODUCTS) {
    const w = {};
    try {
      vm.runInNewContext(fs.readFileSync(path.join(ROOT, "products", slug, "data.js"), "utf8"), { window: w });
    } catch (e) {
      continue;
    }
    const T = w.TEXT || {};
    if (!T.ads && !T.analytics) continue;
    const c = Ads.check(T.ads || {});
    const ga4 = String((T.analytics && T.analytics.ga4) || "").trim();
    if (!ga4) c.empty.push("analytics.ga4");
    else if (!Analytics.configured(ga4)) c.bad.push("analytics.ga4");
    if (c.bad.length) {
      console.error(`오류: products/${slug}/data.js — 광고·분석 ID 모양이 틀림: ${c.bad.join(", ")} (GA4 "G-…", 애드센스 "ca-pub-숫자", 자리 ID 숫자, 보상형 "/네트워크코드/광고단위")`);
      process.exit(1);
    }
    if (c.empty.length) console.log(`  경고: products/${slug}/data.js의 광고·분석 ID가 비어 있음 (${c.empty.join(", ")}) — 빈 것은 불러오지 않고 무료판 그대로 동작합니다`);
    const client = String((T.ads && T.ads.adsenseClient) || "").trim();
    if (client) ADS_TXT[slug] = `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
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
copyDir(path.join(ROOT, "common"), path.join(PUBLIC, "common"));
for (const slug of PRODUCTS) {
  copyDir(path.join(ROOT, "products", slug), path.join(PUBLIC, "products", slug), PRODUCT_EXCLUDE);
}
// (13단계 13-5) 정적 전용이 기본이다: dist/api·vercel.json을 만들지 않는다. 정적 호스트에 올릴 폴더 = dist/public.
// 휴면 서버(제품 폴더 api/)·pay.json·legal/refund.html은 배포에 넣지 않는다. --static 인자는 예전 습관용으로 받아 두기만 한다(같은 동작).
// 제품 index.html 복사본: og:image 절대 경로, og:url·canonical 추가 (site.url이 있을 때만)
for (const slug of PRODUCTS) {
  const file = path.join(PUBLIC, "products", slug, "index.html");
  if (SITE[slug]) fs.writeFileSync(file, og.injectOg(fs.readFileSync(file, "utf8"), SITE[slug]));
  else console.log(`  경고: products/${slug}/data.js의 site.url이 비어 있어 og:url·canonical을 넣지 않았고 og:image는 상대 경로입니다 (배포 전에 채울 것)`);
}
// 루트 이동 페이지: 제품과 같은 title·description(+ site.url이 있으면 og 태그·canonical)
// (12단계 12-4) 애드센스 게시자 ID가 있으면 사이트 루트(public/)에 ads.txt. 실제 호스팅 루트에 놓이는지는 운영자 확인
if (ADS_TXT[HOME]) {
  fs.writeFileSync(path.join(PUBLIC, "ads.txt"), ADS_TXT[HOME]);
  console.log("  ads.txt 만듦 (public/ads.txt)");
}
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

// (13단계 13-5) 책 문구 배포 점검 — 하나라도 실패하면 빌드 실패(exit 1)
//  ① 배포 폴더(dist/) 어디에도 api/·_paid·legal/refund.html 없음
//  ② index.html과 첫 화면이 정적으로 부르는 파일(index.html의 script·link 목록)에 data-book-*.js 문장 0건 (첫 화면 무게 보호)
//  ③ data-book-*.js 전부 존재, 각 파일 [초안] 0개
//  ④ 이름이 _로 시작하는 폴더 없음 (기존 D-4)
// 원본 api/_paid 문장 수 = data-book-*.js 문장 수 대조는 여기서 하지 않는다 → tools/strange-oracle/move-book.js(옮긴 직후 한 번)
{
  const vm = require("vm");
  const fails = [];
  const BOOK_FILES = ["arch", "flow", "match", "bond", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"].map((n) => `data-book-${n}.js`);
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(DIST, p).split(path.sep).join("/");
      if (e.isDirectory()) {
        if (e.name === "api" || e.name === "_paid") fails.push(`① ${rel}/ 있음`);
        else if (e.name.startsWith("_")) fails.push(`④ _로 시작하는 폴더 ${rel}/`);
        walk(p);
      } else if (/(^|\/)legal\/refund\.html$/.test(rel)) fails.push(`① ${rel} 있음`);
    }
  })(DIST);
  for (const slug of PRODUCTS) {
    const dir = path.join(PUBLIC, "products", slug);
    const book = fs.readdirSync(dir).filter((f) => /^data-book-.*\.js$/.test(f));
    if (!book.length) continue; // 책이 없는 제품
    BOOK_FILES.filter((f) => !book.includes(f)).forEach((f) => fails.push(`③ ${slug}/${f} 없음`));
    // 책 문장(12자 이상). 무료 칸(key·summary)과 원래 같은 문장은 첫 화면 공개 data에 처음부터 있으므로 뺀다(7단계부터 같은 규칙)
    const sentences = new Set();
    const collect = (v, k) => (typeof v === "string" ? k !== "code" && v.length >= 12 && sentences.add(v) : Array.isArray(v) ? v.forEach((x) => collect(x, k)) : v && typeof v === "object" && Object.entries(v).forEach(([kk, x]) => collect(x, kk)));
    for (const f of book) {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      const n = (text.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n").match(/\[초안\]/g) || []).length;
      if (n) fails.push(`③ ${slug}/${f} [초안] ${n}개`);
      const w = {};
      vm.runInNewContext(text, { window: w });
      Object.values(w).forEach((v) => collect(v, ""));
    }
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|data:|\/\/)/.test(u));
    refs.filter((u) => /data-book-/.test(u)).forEach((u) => fails.push(`② index.html이 ${u}를 부름`));
    const free = [];
    const grab = (v, k) => (typeof v === "string" ? (k === "key" || k === "summary") && free.push(v) : Array.isArray(v) ? v.forEach((x) => grab(x, k)) : v && typeof v === "object" && Object.entries(v).forEach(([kk, x]) => grab(x, k === "summary" ? k : kk)));
    const firstFiles = ["index.html", ...refs.map((u) => u.split("?")[0])];
    const firstText = {};
    for (const u of firstFiles) {
      const p = path.resolve(dir, u);
      if (!fs.existsSync(p)) continue;
      firstText[u] = fs.readFileSync(p, "utf8");
      if (/\/data[^/]*\.js$|^data[^/]*\.js$/.test(u)) {
        const w = {};
        try {
          vm.runInNewContext(firstText[u], { window: w });
          Object.values(w).forEach((v) => grab(v, ""));
        } catch (e) {
          /* 데이터 파일이 아니면 무시 */
        }
      }
    }
    const same = [...sentences].filter((s) => free.some((t) => t.includes(s)));
    same.forEach((s) => sentences.delete(s));
    let hits = 0;
    for (const [u, text] of Object.entries(firstText))
      for (const s of sentences)
        if (text.includes(s)) {
          hits++;
          fails.push(`② ${slug}/${u} ← "${s.slice(0, 20)}…"`);
          break;
        }
    console.log(`  첫 화면 파일 ${Object.keys(firstText).length}개에 책 문장 ${hits}건 (책 문장 ${sentences.size}개 대조, 무료 칸과 원래 같은 문장 ${same.length}개 뺌) · data-book-*.js ${book.length}개는 장을 열 때만`);
  }
  if (fails.length) {
    console.error("  실패: 책 문구 배포 점검 — " + fails.slice(0, 12).join(" | "));
    process.exitCode = 1;
  } else console.log("  책 문구 배포 점검 통과 (api/·_paid·refund.html 없음, 첫 화면 책 문장 0, data-book [초안] 0, _ 폴더 없음) — 정적 호스트에 올릴 폴더: dist/public");
}
