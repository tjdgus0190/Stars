// 낯선 점술관 6단계 — 로컬 모의 서버 (Node 내장 모듈만, 계정·키·설치 없음)
// 정적 파일 + /api/* 함수(Vercel 함수와 같은 파일)를 한 서버에서 띄운다. Vercel CLI(vercel dev)는 로그인이 필요해 쓰지 않는다.
//
// 사용:
//   node tools/build-dist.js                               (dist 모드일 때 먼저)
//   node tools/strange-oracle/mock-server.js [--src] [--port 8787] [--mode mock|off]
//     기본(dist 모드): 정적 = dist/public, 함수 = dist/api   → 실제 배포 모양 그대로 (D-4 점검은 이 모드로)
//     --src         : 정적 = 저장소 루트, 함수 = products/strange-oracle/api (고치면서 바로 보기)
//                     제품 폴더 안 api/ 경로는 정적으로 내주지 않는다 (13단계: 화면은 /api를 부르지 않음)
//   열기: http://127.0.0.1:8787/products/strange-oracle/
//   시험 지름길: http://127.0.0.1:8787/__dev/skip  (여섯 방을 마친 상태로 나의 이야기, ?rooms=3·?to=hub 가능)
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
// (13단계) 배포 폴더는 정적 전용이라 dist/api가 없다 → 함수 폴더가 없으면 /api/*는 모두 404 (정적 호스팅과 같음)
if (!fs.existsSync(STATIC)) {
  console.error(`폴더가 없습니다: ${STATIC}\n먼저 node tools/build-dist.js 를 실행하거나 --src 를 붙이세요.`);
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
  if (!fs.existsSync(API)) return null;
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
  // 시험 전용 지름길(이 모의 서버에만 있다, 배포 폴더에는 없다): 방을 돌지 않고 앞의 N개 방을 마친 상태로 바로 연다
  //   /__dev/skip            → 여섯 방 모두 마친 상태로 "나의 이야기"(#story)
  //   /__dev/skip?rooms=3    → 앞 세 방(오검·별·데칸)만 마친 상태
  //   /__dev/skip?to=hub     → 도착 화면을 입구 등 다른 화면으로 (기본 story)
  //   시험용 가짜 프로필(이름 "테스트", 1995-03-25 14:37)을 이 탭의 sessionStorage에만 넣는다
  if (rel === "/__dev/skip") {
    const n = Math.min(6, Math.max(0, Number(url.searchParams.get("rooms") || 6) | 0));
    const to = /^[a-z-]+$/.test(url.searchParams.get("to") || "") ? url.searchParams.get("to") : "story";
    const P = "/products/strange-oracle/";
    const html = `<!DOCTYPE html><meta charset="utf-8"><title>시험 지름길</title>
${["data.js", "data-ogham.js", "data-stars.js", "data-decans.js", "data-tzolkin.js", "data-runes.js", "data-oracles.js"].map((f) => `<script src="${P}${f}"></script>`).join("\n")}
<script>
var R = ["ogham","star","decan","tzolkin","rune","sibyl"].slice(0, ${n}), v = {};
if (R.indexOf("ogham") > -1) v.ogham = { ogham: 2, archetype: OGHAM[2].archetype };
if (R.indexOf("star") > -1) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: NAKSHATRAS[4].archetype };
if (R.indexOf("decan") > -1) v.decan = { decan: 10, when: null, archetype: DECANS[10].archetype };
if (R.indexOf("tzolkin") > -1) v.tzolkin = { number: 4, sign: 19, archetype: TZOLKIN_SIGNS[19].archetype };
if (R.indexOf("rune") > -1) v.rune = { picks: [RUNES[0].code, RUNES[5].code, RUNES[10].code], topic: "me", archetype: RUNES[10].archetype };
if (R.indexOf("sibyl") > -1) v.sibyl = { sors: 12, topic: "love", archetype: ORACLES[12].archetype };
sessionStorage.clear();
sessionStorage.setItem("strange-oracle", JSON.stringify({ profile: { name: "테스트", birth: { y: 1995, m: 3, d: 25 }, time: { h: 14, min: 37 } }, visits: v }));
location.replace("${P}#${to}");
</script>`;
    res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" }).end(html);
    return log(200);
  }
  // 원본 폴더 모드: 제품 안 api/ 폴더는 정적으로 내주지 않는다 (배포에서는 build-dist가 public 밖으로 뺀다)
  if (SRC && /\/api(\/|$)/.test(rel)) {
    log(404);
    return notFound(res);
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
