// 낯선 점술관 — 로컬 모의 서버 = 시험 페이지 (Node 내장 모듈만, 계정·키·설치 없음). spec 14-5 (결정 89·93·94)
//
// 사용:
//   node tools/build-dist.js                               (dist 모드일 때 먼저)
//   node tools/strange-oracle/mock-server.js [--src] [--port 8787] [--mode off|test] [--host 0.0.0.0]
//     기본(dist 모드): 정적 = dist/public → 실제 배포 모양 그대로
//     --src         : 정적 = 저장소 루트 (고치면서 바로 보기). 제품 안 api/ 경로는 정적으로 내주지 않는다
//     --mode off    : (기본) 배포판과 같다. 결제·책 화면 없음. /api/book은 503
//     --mode test   : 시험 페이지. data.js의 pay.mode를 **응답할 때만** "test"로 바꾼다(파일은 고치지 않음).
//                     /api/book은 함수 netlify/functions/book.js의 handle()을 그대로 불러 흉내 낸다(PASS_MODE=test).
//                     유료 원본 products/strange-oracle/api/_paid/book/에서 읽는다(함수 묶음과 같은 원본, 배포 폴더에는 없음).
//                     모의 열람 코드는 시작할 때 새로 만들어 터미널에만 찍는다(파일·저장소에 쓰지 않음).
//     --host        : 같은 와이파이의 휴대폰으로 볼 때만 0.0.0.0. 외부 공개 주소에는 올리지 않는다.
//   열기: http://127.0.0.1:8787/products/strange-oracle/
//
// 시험 지름길(이 모의 서버에만 있다, 배포 폴더·본 페이지에는 없다):
//   /__dev/skip                 → 일곱 방을 고정 표본 결과로 마친 상태로 "나의 이야기"(#story)
//   /__dev/skip?rooms=3         → 새 순서(14-1)의 앞 세 방(만신·오검·별)만 마친 상태
//   /__dev/skip?legacy=1        → 옛 상태: 13단계 순서 오검~룬(5방) 마침, 만신 미완 (rooms=N이면 옛 순서 앞 N개, 최대 6)
//   /__dev/skip?paid=1          → (test) 시험 열람 상태: sessionStorage strange-oracle-pass에 모의 코드. paid=0(기본)은 결제 전
//   /__dev/skip?to=book         → 책 목차로 도착 (to=hub 등 다른 화면도 가능, 기본 story)
//   예: /__dev/skip?rooms=7&paid=1&to=book  → 일곱 방 마침 + 결제한 상태로 책 12장이 모두 열림 (결정 89 "별도 시험 페이지")
//   시험용 가짜 프로필(이름 "테스트", 1995-03-25 14:37)을 이 탭의 sessionStorage에만 넣는다
// (15단계, spec 15-6) test 모드에는 모의 페이앱(tools/strange-oracle/mock-pay.js)이 붙는다:
//   /api/pay/* = 함수 pay.js handle() + 메모리 저장소(Blobs 대신), /api/book = 함수 book.js handle() + 같은 저장소(Blobs pass/ 확인)
//   /__dev/payapp-lite.js(가짜 SDK, 이동·팝업) · /__dev/payapp/checkout(가짜 결제창) · /__dev/pay-switch · /__dev/pay-store
//   data.js 응답에서 pay.payapp.sdk(공식 주소) → /__dev/payapp-lite.js, 빈 pay.payapp.userid → 모의 값
// 요청 본문은 찍지 않는다. 주소·상태 코드만 한 줄씩 출력한다.
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..", "..");
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};
const SRC = process.argv.includes("--src");
const PORT = Number(arg("--port", 8787));
const HOST = arg("--host", "127.0.0.1");
const MODE = arg("--mode", "off") === "test" ? "test" : "off";
const STATIC = SRC ? ROOT : path.join(ROOT, "dist", "public");
const PAID = path.join(ROOT, "products", "strange-oracle", "api", "_paid", "book");
const Book = require(path.join(ROOT, "netlify", "functions", "book.js"));
const PayCode = require(path.join(ROOT, "products", "strange-oracle", "paycode.js"));
if (!fs.existsSync(STATIC)) {
  console.error(`폴더가 없습니다: ${STATIC}\n먼저 node tools/build-dist.js 를 실행하거나 --src 를 붙이세요.`);
  process.exit(1);
}
const MOCK_PASS = PayCode.Pass.make(); // 시작할 때마다 새로
const PAYMOCK = MODE === "test" ? require("./mock-pay.js").createPayMock({ port: PORT }) : null;
const ENV = { PASS_MODE: MODE === "test" ? "test" : "", BOOK_PASS_HASHES: MODE === "test" ? Book.hashOf(MOCK_PASS) : "" };
const bookEnv = () => (PAYMOCK ? Object.assign({}, ENV, { PASS_SECRET: PAYMOCK.payEnv().PASS_SECRET }) : ENV);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8", ".md": "text/plain; charset=utf-8",
};
const notFound = (res) => res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("없는 파일");
const PAY_RE = /(\bpay:\s*\{\s*mode:\s*)"off"/;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch (e) {
    return notFound(res);
  }
  const log = (status) => console.log(`${req.method} ${url.pathname} ${status}`);
  // 함수 book 흉내 (본문은 읽기만, 찍지 않음)
  if (rel === "/api/book") {
    let body = "";
    let big = false;
    req.on("data", (c) => {
      body += c;
      if (body.length > 4096) big = true;
    });
    req.on("end", async () => {
      const r = await Book.handle({ method: req.method, body: big ? "x".repeat(600) : body, ip: req.socket.remoteAddress }, bookEnv(), PAID, Date.now(), PAYMOCK ? PAYMOCK.store : null);
      res.writeHead(r.status, r.headers).end(r.body);
      log(r.status);
    });
    return;
  }
  if (PAYMOCK && PAYMOCK.route(req, res, rel, url, log)) return;
  if (rel === "/api" || rel.startsWith("/api/")) {
    log(404);
    return notFound(res);
  }
  if (rel === "/__dev/skip") {
    const legacy = url.searchParams.get("legacy") === "1";
    const n = Math.min(legacy ? 6 : 7, Math.max(0, Number(url.searchParams.get("rooms") || (legacy ? 5 : 7)) | 0));
    const toQ = url.searchParams.get("to") || "";
    const to = toQ === "book" ? "report" : /^[a-z-]+$/.test(toQ) ? toQ : "story";
    const paid = url.searchParams.get("paid") === "1" && MODE === "test";
    const P = "/products/strange-oracle/";
    const html = `<!DOCTYPE html><meta charset="utf-8"><title>시험 지름길</title>
${["data.js", "data-saju.js", "saju.js", "data-ogham.js", "data-stars.js", "data-decans.js", "data-tzolkin.js", "data-runes.js", "data-oracles.js"].map((f) => `<script src="${P}${f}"></script>`).join("\n")}
<script>
var R = ${legacy ? '["ogham","star","decan","tzolkin","rune","sibyl"]' : '["saju","ogham","star","decan","tzolkin","rune","sibyl"]'}.slice(0, ${n}), v = {};
if (R.indexOf("saju") > -1) v.saju = { code: 532, archetype: SAJU.stems[Saju.decodeCode(532).S1].archetype };
if (R.indexOf("ogham") > -1) v.ogham = { ogham: 2, archetype: OGHAM[2].archetype };
if (R.indexOf("star") > -1) v.star = { nak: 4, west: 0, sunRashi: 11, moonRashi: 1, archetype: NAKSHATRAS[4].archetype };
if (R.indexOf("decan") > -1) v.decan = { decan: 10, when: null, archetype: DECANS[10].archetype };
if (R.indexOf("tzolkin") > -1) v.tzolkin = { number: 4, sign: 19, archetype: TZOLKIN_SIGNS[19].archetype };
if (R.indexOf("rune") > -1) v.rune = { picks: [RUNES[0].code, RUNES[5].code, RUNES[10].code], topic: "me", archetype: RUNES[10].archetype };
if (R.indexOf("sibyl") > -1) v.sibyl = { sors: 12, topic: "love", archetype: ORACLES[12].archetype };
sessionStorage.clear();
sessionStorage.setItem("strange-oracle", JSON.stringify({ profile: { name: "테스트", birth: { y: 1995, m: 3, d: 25 }, time: { h: 14, m: 37 } }, visits: v }));
${paid ? `sessionStorage.setItem("strange-oracle-pass", ${JSON.stringify(MOCK_PASS)});` : ""}
location.replace("${P}#${to}");
</script>`;
    res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" }).end(html);
    return log(200);
  }
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
    // test: 제품 data.js의 pay.mode만 응답에서 "test"로 (파일은 그대로)
    if (MODE === "test" && /[\\/]products[\\/]strange-oracle[\\/]data\.js$/.test(file)) data = Buffer.from(PAYMOCK.transformDataJs(String(data).replace(PAY_RE, '$1"test"')));
    // (14-6) 배포처(Netlify)처럼 글자 파일은 압축해서 보낸다 → 성능 측정이 실제 전송량(압축 후)과 맞는다
    const type = TYPES[path.extname(file)] || "application/octet-stream";
    const head = { "Content-Type": type, "Cache-Control": "no-store", Vary: "Accept-Encoding" };
    if (/^(text\/|application\/json|image\/svg)/.test(type) && /gzip/.test(req.headers["accept-encoding"] || "")) {
      data = zlib.gzipSync(data, { level: 6 });
      head["Content-Encoding"] = "gzip";
    }
    res.writeHead(200, head);
    res.end(data);
  });
});
server.listen(PORT, HOST, () => {
  console.log(`모의 서버 (${SRC ? "원본 폴더" : "dist"} · mode=${MODE})`);
  console.log(`  정적: ${STATIC}`);
  console.log(`  열기: http://127.0.0.1:${PORT}/products/strange-oracle/`);
  if (MODE === "test") console.log(`  모의 열람 코드(이 실행에서만 유효): ${PayCode.Pass.pretty(MOCK_PASS)}`);
});
module.exports = server;
