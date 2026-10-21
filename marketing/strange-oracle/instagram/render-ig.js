// 인스타그램 자료 PNG 찍기 (2026-10-21). 저장소 루트에서: node --experimental-websocket marketing/strange-oracle/instagram/render-ig.js
// tools/serve.js를 저장소 루트로 포트 8793에 띄우고, ig.html#<판>을 판 크기 뷰포트로 열어 PNG로 찍은 뒤 서버를 끈다. 결과는 ./out/
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { launch, sleep } = require("../../../tools/strange-oracle/cdp.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT = path.join(__dirname, "out");
const PORT = 8793;
const ARTS = [
  { id: "profile", w: 1080, h: 1080, file: "profile-1080.png" },
  { id: "intro", w: 1080, h: 1350, file: "intro-post-1080x1350.png" },
  { id: "story", w: 1080, h: 1920, file: "story-book-1080x1920.png" },
  { id: "hl-rooms", w: 1080, h: 1920, file: "highlight-rooms.png" },
  { id: "hl-book", w: 1080, h: 1920, file: "highlight-book.png" },
  { id: "hl-guide", w: 1080, h: 1920, file: "highlight-guide.png" },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn(process.execPath, [path.join(ROOT, "tools", "serve.js"), ".", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram/ig.css`)).ok) break; } catch (e) {}
      await sleep(100);
    }
    const b = await launch({ port: 9360, width: 1080, height: 1920 });
    for (const a of ARTS) {
      await b.send("Emulation.setDeviceMetricsOverride", { width: a.w, height: a.h, deviceScaleFactor: 1, mobile: false });
      await b.goto(`http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram/ig.html?k=${a.id}#${a.id}`);
      await b.evaluate("document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))");
      await sleep(300);
      const r = await b.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: a.w, height: a.h, scale: 1 } });
      fs.writeFileSync(path.join(OUT, a.file), Buffer.from(r.data, "base64"));
      console.log(`→ ${a.file} (${a.w}x${a.h})`);
    }
    b.close();
  } finally {
    srv.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
