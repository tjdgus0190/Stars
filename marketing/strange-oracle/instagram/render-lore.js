// 「문 너머의 기록」 그림 이야기 캐러셀 찍기 (2026-11-01). 저장소 루트에서: node --experimental-websocket marketing/strange-oracle/instagram/render-lore.js [편 ...]
// lore.html?ep=<편>&p=<쪽>을 1080x1350으로 열어 → out/lore/<편>-<쪽 두 자리>.jpg(품질 92, 인스타그램 그대로 올림). 배경은 render-ig2.js가 찍어 둔 out/v2/bg/ 그림을 쓴다.
// tools/serve.js를 포트 8797에 띄웠다가 끈다. 리눅스는 EDGE_PATH에 Chromium.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { launch, sleep } = require("../../../tools/strange-oracle/cdp.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT = path.join(__dirname, "out", "lore");
const PORT = 8798;
const ROOMS = ["star"]; // 만든 편(lore.js EP)
const pick = process.argv.slice(2).filter((x) => ROOMS.includes(x));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn(process.execPath, [path.join(ROOT, "tools", "serve.js"), ".", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  let b;
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram/lore.css`)).ok) break; } catch (e) {}
      await sleep(100);
    }
    b = await launch({ port: 9363, width: 1080, height: 1350 });
    await b.send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1350, deviceScaleFactor: 1, mobile: false });
    const base = `http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram/lore.html`;
    for (const room of pick.length ? pick : ROOMS) {
      let total = 1;
      for (let p = 0; p < total; p++) {
        await b.goto(`${base}?ep=${room}&p=${p}`);
        await b.evaluate("(async () => { for (let k = 0; k < 100 && !window.__ready; k++) await new Promise((r) => setTimeout(r, 50)); await window.__ready; const bg = getComputedStyle(document.getElementById('page')).backgroundImage.match(/url\\(\"?([^\")]+)/); if (bg) await new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = bg[1]; }); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()");
        total = await b.evaluate("window.__total");
        const over = await b.evaluate("window.__overflow");
        const r = await b.send("Page.captureScreenshot", { format: "jpeg", quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1350, scale: 1 } });
        const f = path.join(OUT, `${room}-${String(p + 1).padStart(2, "0")}.jpg`);
        fs.writeFileSync(f, Buffer.from(r.data, "base64"));
        console.log(`→ lore/${path.basename(f)}${over > 0 ? `  ⚠ 아래로 ${over}px 넘침` : ""}`);
      }
    }
    const errs = b.log.errors.filter((e) => !/favicon/.test(e));
    if (errs.length) console.log("오류:", errs.slice(0, 5).join(" | "));
  } finally {
    if (b) b.close();
    srv.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
