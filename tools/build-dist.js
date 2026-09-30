// 배포용 폴더(dist/) 만들기. 공개해도 되는 파일만 public/에 복사한다.
// 사용: node tools/build-dist.js
// 결과 (dist/ = Vercel 프로젝트 루트, 6단계 유료 리포트 이후):
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
const PRODUCT_EXCLUDE = new Set(["meta.json", "tests.md", "api"]);
const PUBLIC = path.join(DIST, "public");
const API_PRODUCT = "strange-oracle"; // dist/api/에 함수를 올릴 제품 (한 프로젝트에 하나)
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
// 결제 함수가 있다는 표시(pay.json). 브라우저는 이것이 true일 때만 /api/config를 묻는다(순수 정적 서버에서 404 콘솔 오류가 나지 않게).
// 결제 없이 순수 정적 호스팅에 올릴 때: node tools/build-dist.js --static → pay.json이 false로 남고 dist/api·vercel.json을 만들지 않는다
const STATIC_ONLY = process.argv.includes("--static");
if (!STATIC_ONLY) fs.writeFileSync(path.join(PUBLIC, "products", API_PRODUCT, "pay.json"), JSON.stringify({ api: true }) + "\n");
// 서버리스 함수: 제품 폴더 api/ → dist/api/, 공유 부호화 파일 paycode.js는 _lib/ 안에 한 벌 더
const apiSrc = path.join(ROOT, "products", API_PRODUCT, "api");
if (!STATIC_ONLY) {
  copyDir(apiSrc, path.join(DIST, "api"));
  fs.copyFileSync(path.join(ROOT, "products", API_PRODUCT, "paycode.js"), path.join(DIST, "api", "_lib", "paycode.js"));
  fs.writeFileSync(
    path.join(DIST, "vercel.json"),
    JSON.stringify({ $schema: "https://openapi.vercel.sh/vercel.json", outputDirectory: "public", headers: [{ source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] }] }, null, 2) + "\n"
  );
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

// 유료 문구 누출 점검(D-4): public/ 아래에 api 폴더가 없고, _paid의 문장이 공개 파일 어디에도 없어야 한다
{
  const paidStrings = new Set();
  // 문구 칸만 모은다(code 같은 열쇠 칸은 공개 데이터와 겹칠 수 있어 뺀다)
  const collect = (v) => (typeof v === "string" ? v.length >= 12 && paidStrings.add(v) : Array.isArray(v) ? v.forEach(collect) : v && typeof v === "object" && Object.entries(v).forEach(([k, x]) => k !== "code" && collect(x)));
  for (const f of fs.readdirSync(path.join(apiSrc, "_paid"))) collect(require(path.join(apiSrc, "_paid", f)));
  // (7단계) 방별 온전한 이야기(full-*.js)는 원래 무료였던 결과 문구를 옮긴 것이라, 처음부터 무료 칸(key 핵심 문장·summary 요약)과
  // 같은 문장으로 쓰인 것이 있다(예: 룬 now.body 첫 단락 = key). 그 문장은 무료 화면에 원래 보이는 문장이므로 누출로 치지 않고 따로 센다.
  const freeText = [];
  const vm = require("vm");
  const pubDir = path.join(apiSrc, "..");
  for (const f of fs.readdirSync(pubDir).filter((n) => /^data-.*\.js$/.test(n))) {
    const w = {};
    vm.runInNewContext(fs.readFileSync(path.join(pubDir, f), "utf8"), { window: w });
    const grab = (v, k) => (typeof v === "string" ? (k === "key" || k === "summary") && freeText.push(v) : Array.isArray(v) ? v.forEach((x) => grab(x, k)) : v && typeof v === "object" && Object.entries(v).forEach(([kk, x]) => grab(x, k === "summary" ? k : kk)));
    Object.values(w).forEach((v) => grab(v, ""));
  }
  const dup = [...paidStrings].filter((s) => freeText.some((t) => t.includes(s)));
  dup.forEach((s) => paidStrings.delete(s));
  console.log(`  유료 문장 가운데 무료 칸(key·summary)과 원래 같은 문장 ${dup.length}개 — 누출 대조에서 뺌 (copywriter 판단용 목록: tests.md 7단계)`);
  const leaks = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name === "api" || e.name.startsWith("_")) leaks.push(p); walk(p); continue; }
      if (!/.(html|js|css|json|md|txt)$/.test(e.name)) continue;
      const text = fs.readFileSync(p, "utf8");
      for (const s of paidStrings) if (text.includes(s)) { leaks.push(p + " ← " + s.slice(0, 20)); break; }
    }
  })(PUBLIC);
  console.log(leaks.length ? "  경고: 공개 폴더에 서버 전용 내용이 있음 — " + leaks.join(", ") : `  public/에 유료 문구 0건 (유료 문장 ${paidStrings.size}개 대조, api/·_paid는 dist/api/에만)`);
  const paidLeft = fs.readdirSync(path.join(apiSrc, "_paid")).map((f) => [f, (fs.readFileSync(path.join(apiSrc, "_paid", f), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n").match(/\[초안\]/g) || []).length]).filter(([, n]) => n);
  console.log(paidLeft.length ? "  유료 문구 [초안] 남음: " + paidLeft.map(([f, n]) => f + " " + n).join(", ") : "  유료 문구 [초안] 없음");
  if (leaks.length) process.exitCode = 1;
}
