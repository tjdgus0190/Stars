// (2026-11-22) 자동 게시 전설 캐러셀 찍기. 저장소 루트에서:
//   EDGE_PATH=tools/strange-oracle/chromium.sh node --experimental-websocket marketing/strange-oracle/instagram/render-tale.js <편> [출력 폴더]
// tale.html?id=<편>&p=<쪽>을 1080x1350으로 열어 → <출력 폴더 또는 out/tale>/<편>-<쪽 두 자리>.jpg (JPEG 품질 90 — 인스타그램 API는 JPEG만 받는다)
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { launch, sleep } = require("../../../tools/strange-oracle/cdp.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const id = String(process.argv[2] || "").replace(/[^a-z0-9-]/g, "");
if (!id || !fs.existsSync(path.join(__dirname, "tales", `${id}.js`))) throw new Error(`tales/${id}.js가 없음`);
const OUT = path.resolve(process.argv[3] || path.join(__dirname, "out", "tale"));
const PORT = 8799;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn(process.execPath, [path.join(ROOT, "tools", "serve.js"), ".", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  let b;
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram/tale.css`)).ok) break; } catch (e) {} await sleep(100); }
    b = await launch({ port: 9364, width: 1080, height: 1350 });
    await b.send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1350, deviceScaleFactor: 1, mobile: false });
    const files = [];
    let pages = 1;
    for (let p = 1; p <= pages; p++) {
      await b.goto(`http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram/tale.html?id=${id}&p=${p}`);
      const info = JSON.parse(await b.evaluate(`(async () => { await document.fonts.ready; const imgs = [...document.querySelectorAll('.bg')].map((e) => getComputedStyle(e).backgroundImage.slice(5, -2));
        const ok = await Promise.all(imgs.map((u) => new Promise((r) => { const im = new Image(); im.onload = () => r(im.naturalWidth > 0); im.onerror = () => r(false); im.src = u; })));
        return JSON.stringify({ pages: window.TALE_PAGES, imgs: ok, over: [...document.querySelectorAll('.text,.hook,.ask')].some((e) => e.getBoundingClientRect().top < 120) }); })()`));
      pages = info.pages;
      if (info.imgs.includes(false)) throw new Error(`${p}쪽 그림을 못 불러옴`);
      if (info.over) console.warn(`주의: ${p}쪽 글이 너무 길어 위쪽까지 올라감 — 줄일 것`);
      await sleep(150);
      const shot = await b.send("Page.captureScreenshot", { format: "jpeg", quality: 90, clip: { x: 0, y: 0, width: 1080, height: 1350, scale: 1 } });
      const f = path.join(OUT, `${id}-${String(p).padStart(2, "0")}.jpg`);
      fs.writeFileSync(f, Buffer.from(shot.data, "base64"));
      files.push(path.relative(ROOT, f));
    }
    console.log(JSON.stringify({ id, pages, files }));
  } finally {
    if (b) await b.close();
    srv.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
