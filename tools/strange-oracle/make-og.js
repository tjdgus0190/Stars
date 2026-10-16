// og-image.png(1200x630) 만들기 — 10단계 10-2. 직접 그린 SVG(제품 index.html의 여섯 문 상징 <symbol>)를 헤드리스 Edge로 찍는다.
// AI·외부 이미지 없음. 글꼴은 제품 화면이 쓰는 것(Gowun Batang·Cinzel, jsdelivr fontsource) 그대로. 설치 없음.
// 배치: design/strange-oracle.md 「10단계 · og-image.png 배치」 표. 글자: data.js og.title·og.sub, 제품 이름 hub.logo (앞의 "[초안] "은 떼고 그린다).
// 실행: node --experimental-websocket tools/strange-oracle/make-og.js     (저장소 루트를 잠깐 정적 서버로 띄운다. 다른 서버 필요 없음)
// 결과: products/strange-oracle/og-image.png 덮어씀. og 문구를 고치면 다시 실행한다. 주소는 그리지 않는다.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { launch } = require("./cdp.js");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "products", "strange-oracle", "og-image.png");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

// 페이지 안에서 실행: 화면 맨 위에 1200x630 SVG를 덮는다
const DRAW = `(async () => {
  const clean = (s) => String(s || "").replace(/^\\[초안\\]\\s*/, "");
  const name = clean(TEXT.hub.logo), title = clean(TEXT.og.title), sub = clean(TEXT.og.sub);
  await Promise.all([document.fonts.load('700 64px "Gowun Batang"', name + title), document.fonts.load('400 34px "Gowun Batang"', sub), document.fonts.load('500 18px "Cinzel"', "IVX")]);
  await document.fonts.ready;
  const BG = "#080717", HI = "oklch(0.84 0.07 85)", BRONZE = "oklch(0.66 0.075 75)", TEXTC = "#f5f2e9", MUTED = "#b8b8ce";
  // 별 점: 고정 난수(같은 그림이 다시 나온다). 글자 뒤 가운데 띠(y 360~500)는 성기게
  let seed = 20260930;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let stars = "";
  for (let i = 0, n = 0; n < 40 && i < 400; i++) {
    const x = 20 + rnd() * 1160, y = 14 + rnd() * 602, r = 0.5 + rnd(), o = 0.3 + rnd() * 0.6;
    const band = y > 360 && y < 500 && x > 120 && x < 1080;
    const art = y > 170 && y < 320 && x > 250 && x < 950;
    if (art || (band && rnd() > 0.2)) continue;
    stars += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(2) + '" fill="#f5f2e9" opacity="' + o.toFixed(2) + '"/>';
    n++;
  }
  // (14단계) 일곱 문 상징 (Ⅰ 만신 · Ⅱ 오검 · Ⅲ 별 · Ⅳ 데칸 · Ⅴ 촐킨 · Ⅵ 룬 · Ⅶ 시빌라): 원 88px, 간격 28px, 중심 y 236, 가운데 정렬
  const SYM = [["icon-saju", 44, 44], ["ogham-beith", 26, 52], ["icon-star", 44, 44], ["icon-decan", 44, 44], ["icon-tzolkin", 44, 44], ["rune-raidho", 30, 45], ["icon-sibyl", 44, 44]];
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  let doors = "";
  SYM.forEach(([id, w, h], i) => {
    const cx = 600 + (i - (SYM.length - 1) / 2) * 116, cy = 236;
    doors += '<circle cx="' + cx + '" cy="' + cy + '" r="43.25" fill="url(#og-glow)" stroke="' + BRONZE + '" stroke-width="1.5"/>'
      + '<use href="#' + id + '" x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h + '" style="color:' + HI + ';fill:none;stroke:' + HI + ';stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"/>'
      + '<text x="' + cx + '" y="308" text-anchor="middle" font-family="Cinzel, serif" font-weight="500" font-size="18" fill="' + BRONZE + '">' + ROMAN[i] + '</text>';
  });
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const box = document.createElement("div");
  box.id = "og-canvas";
  box.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:630px;z-index:2147483647;background:" + BG;
  box.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" style="display:block">'
    + '<defs><radialGradient id="og-bg" cx="0.1" cy="0" r="0.62"><stop offset="0" stop-color="#2b1d52"/><stop offset="0.5" stop-color="#15102f"/><stop offset="1" stop-color="' + BG + '"/></radialGradient>'
    + '<radialGradient id="og-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ebc573" stop-opacity="0.16"/><stop offset="1" stop-color="#ebc573" stop-opacity="0.02"/></radialGradient></defs>'
    + '<rect width="1200" height="630" fill="' + BG + '"/><rect width="1200" height="630" fill="url(#og-bg)"/>' + stars
    + '<text x="600" y="118" text-anchor="middle" font-family="\\'Gowun Batang\\', serif" font-weight="700" font-size="44" fill="' + HI + '">' + esc(name) + '</text>'
    + doors
    + '<text id="og-title" x="600" y="410" text-anchor="middle" font-family="\\'Gowun Batang\\', serif" font-weight="700" font-size="64" fill="' + TEXTC + '">' + esc(title) + '</text>'
    + '<text id="og-sub" x="600" y="478" text-anchor="middle" font-family="\\'Gowun Batang\\', serif" font-weight="400" font-size="34" fill="' + MUTED + '">' + esc(sub) + '</text>'
    + '<use href="#i-fleuron" x="480" y="533" width="240" height="30" style="color:' + BRONZE + '"/>'
    + '</svg>';
  document.documentElement.style.overflow = "hidden"; // 스크롤 막대가 찍히지 않게
  document.body.append(box);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const w = (id) => Math.round(document.getElementById(id).getBBox().width);
  return { name, title, sub, titleW: w("og-title"), subW: w("og-sub"), fonts: [document.fonts.check('700 64px "Gowun Batang"', title), document.fonts.check('500 18px "Cinzel"', "IV")] };
})()`;

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const b = await launch({ port: 9620, reduced: true, width: 1200, height: 630 });
  try {
    await b.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
    await b.goto(`http://127.0.0.1:${port}/products/strange-oracle/index.html`);
    const info = await b.evaluate(DRAW);
    await b.sleep(300);
    const shot = await b.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
    const png = Buffer.from(shot.data, "base64");
    const size = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (size[0] !== 1200 || size[1] !== 630) throw new Error("크기가 1200x630이 아님: " + size.join("x"));
    if (info.titleW > 1024 || info.subW > 952) throw new Error(`글자가 너무 길다 (제목 ${info.titleW}/1024px, 부제 ${info.subW}/952px)`);
    if (!info.fonts.every(Boolean)) throw new Error("글꼴을 불러오지 못했다 (jsdelivr 연결 확인)");
    fs.writeFileSync(OUT, png);
    console.log(`og-image.png 저장 — ${size.join("x")}, ${Math.round(png.length / 1024)}KB, 제목 "${info.title}"(${info.titleW}px) 부제 "${info.sub}"(${info.subW}px)`);
  } finally {
    await b.close();
    server.close();
  }
})().catch((e) => { console.error("실패:", e.message); process.exit(1); });
