// 로컬 미리보기 서버 (설치 필요 없음). 같은 와이파이의 휴대폰에서도 열 수 있다.
// 사용: node tools/serve.js [폴더=dist] [포트=5173]
// 종료: Ctrl+C
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..", process.argv[2] || "dist");
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
