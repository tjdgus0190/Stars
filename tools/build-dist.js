// 배포용 폴더(dist/) 만들기. 공개해도 되는 파일만 복사한다.
// 사용: node tools/build-dist.js
// 결과: dist/index.html(첫 화면 → 제품으로 이동), dist/common/, dist/products/<slug>/
// 내부 문서(specs, reports, design, agents, CLAUDE.md)와 제품 폴더의 meta.json·tests.md는 넣지 않는다.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PRODUCTS = ["strange-oracle"]; // 배포할 제품
const HOME = "strange-oracle"; // dist 첫 화면이 이동할 제품
const PRODUCT_EXCLUDE = new Set(["meta.json", "tests.md"]);

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
copyDir(path.join(ROOT, "common"), path.join(DIST, "common"));
for (const slug of PRODUCTS) {
  copyDir(path.join(ROOT, "products", slug), path.join(DIST, "products", slug), PRODUCT_EXCLUDE);
}

fs.writeFileSync(
  path.join(DIST, "index.html"),
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
  const dir = path.join(DIST, "products", slug);
  const left = fs.readdirSync(dir).filter((f) => /\.(js|html)$/.test(f))
    .map((f) => [f, (fs.readFileSync(path.join(dir, f), "utf8").match(/\[초안\]/g) || []).length])
    .filter(([, n]) => n);
  console.log(left.length ? `  [초안] 남음 (중간 공유본): ${left.map(([f, n]) => `${f} ${n}`).join(", ")}` : "  [초안] 없음");
}
