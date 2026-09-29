// 낯선 점술관 6단계 — 로컬 모의 서버 (Node 내장 모듈만, 계정·키·설치 없음)
// 정적 파일 + /api/* 함수(Vercel 함수와 같은 파일)를 한 서버에서 띄운다. Vercel CLI(vercel dev)는 로그인이 필요해 쓰지 않는다.
//
// 사용:
//   node tools/build-dist.js                               (dist 모드일 때 먼저)
//   node tools/strange-oracle/mock-server.js [--src] [--port 8787] [--mode mock|off]
//     기본(dist 모드): 정적 = dist/public, 함수 = dist/api   → 실제 배포 모양 그대로 (D-4 점검은 이 모드로)
//     --src         : 정적 = 저장소 루트, 함수 = products/strange-oracle/api (고치면서 바로 보기)
//                     pay.json은 {"api":true}로 바꿔 내려 주고, 제품 폴더 안 api/ 경로는 정적으로 내주지 않는다
//   열기: http://127.0.0.1:8787/products/strange-oracle/
//
// Vercel 흉내: /api/<이름>은 api/<이름>.js가 있고 이름이 밑줄·점으로 시작하지 않을 때만 함수로 실행, 그 밖(/api/_lib/…, /api/_paid/…)은 404.
// PAY_MODE는 --mode 값(기본 mock). mock은 TOSS_SECRET_KEY가 비어 있어야 켜진다(core.js 안전장치).
// 요청 본문은 찍지 않는다. 주소·상태 코드만 한 줄씩 출력한다.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};
const SRC = process.argv.includes("--src");
const PORT = Number(arg("--port", 8787));
process.env.PAY_MODE = arg("--mode", process.env.PAY_MODE || "mock");
const STATIC = SRC ? ROOT : path.join(ROOT, "dist", "public");
const API = SRC ? path.join(ROOT, "products", "strange-oracle", "api") : path.join(ROOT, "dist", "api");
if (!fs.existsSync(STATIC) || !fs.existsSync(API)) {
  console.error(`폴더가 없습니다: ${STATIC} / ${API}\n먼저 node tools/build-dist.js 를 실행하거나 --src 를 붙이세요.`);
  process.exit(1);
}
if (process.env.PAY_MODE === "mock" && process.env.TOSS_SECRET_KEY) console.warn("주의: TOSS_SECRET_KEY가 있어 mock 모드가 꺼집니다.");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8", ".md": "text/plain; charset=utf-8",
};
const handlers = {};
function handlerFor(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return null; // 밑줄·점으로 시작하는 파일은 함수가 아니다 (Vercel 규칙)
  const file = path.join(API, name + ".js");
  if (!fs.existsSync(file)) return null;
  return (handlers[name] = handlers[name] || require(file));
}
const notFound = (res) => res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("없는 파일");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch (e) {
    return notFound(res);
  }
  const log = (status) => console.log(`${req.method} ${url.pathname} ${status}`);
  // 함수
  if (rel === "/api" || rel.startsWith("/api/")) {
    const name = rel.slice(5);
    const h = handlerFor(name);
    if (!h) {
      log(404);
      return notFound(res);
    }
    await h(req, res);
    return log(res.statusCode);
  }
  // 원본 폴더 모드: 제품 안 api/ 폴더는 정적으로 내주지 않는다 (배포에서는 build-dist가 public 밖으로 뺀다)
  if (SRC && /\/api(\/|$)/.test(rel)) {
    log(404);
    return notFound(res);
  }
  if (SRC && rel === "/products/strange-oracle/pay.json") {
    res.writeHead(200, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" }).end('{ "api": true }\n');
    return log(200);
  }
  let file = path.join(STATIC, rel);
  if (!file.startsWith(STATIC)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!rel.endsWith("/")) return res.writeHead(301, { Location: rel + "/" + url.search }).end();
    file = path.join(file, "index.html");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      log(404);
      return notFound(res);
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`모의 서버 (${SRC ? "원본 폴더" : "dist"} · PAY_MODE=${process.env.PAY_MODE})`);
  console.log(`  정적: ${STATIC}`);
  console.log(`  함수: ${API}`);
  console.log(`  열기: http://127.0.0.1:${PORT}/products/strange-oracle/`);
});
module.exports = server;
