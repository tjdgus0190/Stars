// 로컬 미리보기 서버 (설치 필요 없음). 같은 와이파이의 휴대폰에서도 열 수 있다.
// 사용: node tools/serve.js [폴더=dist/public] [포트=5173]  (결제 함수까지 보려면 tools/strange-oracle/mock-server.js)
// 종료: Ctrl+C
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

// 기본 폴더: dist/public (6단계부터 dist/는 Vercel 프로젝트이고 공개 정적 파일은 dist/public/에 있다)
const ROOT = path.resolve(__dirname, "..", process.argv[2] || (fs.existsSync(path.resolve(__dirname, "..", "dist", "public")) ? "dist/public" : "dist"));
const PORT = Number(process.argv[3]) || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

http
  .createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) return res.writeHead(403).end(); // 폴더 밖 접근 차단
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!rel.endsWith("/")) return res.writeHead(301, { Location: rel + "/" }).end();
      file = path.join(file, "index.html");
    }
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("없는 파일");
      // 19-5 (b): data.js 응답의 GA4 측정 ID를 시험 ID로 (미리보기에서 실제 ID로 방문이 나가지 않게, 파일은 그대로)
      if (path.basename(file) === "data.js") data = Buffer.from(String(data).replace(/(\banalytics:\s*\{\s*ga4:\s*)"[^"]+"/, '$1"G-TEST12345"'));
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(data);
    });
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`미리보기: ${ROOT}`);
    console.log(`  이 PC:   http://localhost:${PORT}/`);
    for (const list of Object.values(os.networkInterfaces()))
      for (const a of list || [])
        if (a.family === "IPv4" && !a.internal) console.log(`  휴대폰:  http://${a.address}:${PORT}/  (같은 와이파이)`);
  });
