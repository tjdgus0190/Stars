// 인스타그램 2판 PNG 찍기 (2026-10-25). 저장소 루트에서: node --experimental-websocket marketing/strange-oracle/instagram/render-ig2.js
// 1) bg3d.html로 3D 배경 → out/v2/bg/
// 2) ig2.html#<판>을 판 크기 뷰포트로 열어 → out/v2/<판>.png. tools/serve.js를 포트 8796에 띄웠다가 끈다. 리눅스는 EDGE_PATH에 Chromium.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { launch, sleep } = require("../../../tools/strange-oracle/cdp.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT = path.join(__dirname, "out", "v2");
const BG = path.join(OUT, "bg");
const PORT = 8796;
const BGS = {
  "ring-profile": "type=ring&w=1080&h=1080&cy=0.5&s=1.55",
  "ring-cover": "type=ring&w=1080&h=1350&cy=0.52&s=0.98",
  "ring-reel": "type=ring&w=1080&h=1920&cy=0.62&s=1.1",
  "mirror-reel": "type=mirror&w=1080&h=1920&cy=0.6&s=1.15",
  "ring-cta": "type=ring&w=1080&h=1350&cy=0.53&s=1.0&dim=0.75&t=7",
  "ring-story": "type=ring&w=1080&h=1920&cy=0.56&s=1.05",
  "void-a": "type=void&w=1080&h=1350&cy=0.45",
  "void-b": "type=void&w=1080&h=1350&cy=0.62&t=9",
  "void-r": "type=void&w=1080&h=1350&cy=0.5&hue=red&dim=0.8",
  "void-st": "type=void&w=1080&h=1920&cy=0.5",
  mirror: "type=mirror&w=1080&h=1350&cy=0.5",
  "mirror-st": "type=mirror&w=1080&h=1920&cy=0.5&s=1.25",
};
const SQ = [1080, 1080], PT = [1080, 1350], ST = [1080, 1920];
const CARDS = [
  ["profile", SQ],
  ...[1, 2, 3, 4, 5].map((i) => [`intro-${i}`, PT]),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`lines-${i}`, PT]),
  ...[1, 2, 3, 4].map((i) => [`paid-${i}`, PT]),
  ["reel-4", ST], ["reel-1", ST], ["reel-3", ST],
  ["hl-rooms", ST], ["hl-book", ST], ["hl-guide", ST],
  ["story-open", ST], ["story-busted", ST],
];

async function shot(b, url, w, h, file, wait) {
  await b.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await b.goto(url);
  await b.evaluate(wait);
  const r = await b.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
}

(async () => {
  fs.mkdirSync(BG, { recursive: true });
  const srv = spawn(process.execPath, [path.join(ROOT, "tools", "serve.js"), ".", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  let b;
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram/ig2.css`)).ok) break; } catch (e) {}
      await sleep(100);
    }
    b = await launch({ port: 9361, width: 1080, height: 1920 });
    const base = `http://127.0.0.1:${PORT}/marketing/strange-oracle/instagram`;
    for (const [name, q] of Object.entries(BGS)) {
      const u = new URLSearchParams(q);
      await shot(b, `${base}/bg3d.html?${q}`, +u.get("w"), +u.get("h"), path.join(BG, `${name}.png`),
        "(async () => { for (let k = 0; k < 100 && !window.__ready3d; k++) await new Promise((r) => setTimeout(r, 100)); await window.__ready3d; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()");
      console.log(`  배경 ${name}`);
    }
    for (const [id, [w, h]] of CARDS) {
      await shot(b, `${base}/ig2.html?k=${id}#${id}`, w, h, path.join(OUT, `${id}.png`),
        "(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('.card:target')].map((c) => new Promise((r) => { const m = /url\\(\"?([^\")]+)\"?\\)/.exec(getComputedStyle(c).backgroundImage); if (!m) return r(); const i = new Image(); i.onload = i.onerror = r; i.src = m[1]; }))); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()");
      console.log(`→ v2/${id}.png (${w}x${h})`);
    }
    const errs = b.log.errors.filter((e) => !/favicon/.test(e));
    if (errs.length) console.log("오류:", errs.slice(0, 5).join(" | "));
  } finally {
    if (b) b.close();
    srv.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
