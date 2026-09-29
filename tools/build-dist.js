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

fs.writeFileSync(
  path.join(PUBLIC, "index.html"),
  `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=products/${HOME}/" />
  <title>이동 중…</title>
</head>
<body><a href="products/${HOME}/">바로가기</a></body>
</html>
`
);

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
