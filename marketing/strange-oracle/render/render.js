// 광고 영상 렌더: 장면 HTML(../scenes/) → 프레임 PNG(임시 폴더) → ffmpeg H.264 mp4(../out/)
// 사용법·결과는 README.md. 실행: node --experimental-websocket marketing/strange-oracle/render/render.js [ad1|ad2|all] [--check] [--port 8790] [--cdp 9350]
// - 헤드리스 Edge (tools/strange-oracle/cdp.js 재사용), 뷰포트 1080x1920 · 배율 1 · mobile 아님, 움직임 줄이기 설정 켜지 않음
// - document.fonts.ready 뒤 모든 애니메이션을 멈추고 프레임 n마다 currentTime = n*1000/30 으로 고정해 캡처
// - --check: 주소에 #safe를 붙여 1초 간격 확인 컷(+마지막 프레임)을 ../out/check/에 찍고, 자막 줄 수를 check.json에 적는다
// - 정적 서버는 tools/serve.js를 저장소 루트로, 포트 8790(기본)에 띄우고 끝나면 끈다
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { launch, sleep } = require("../../../tools/strange-oracle/cdp.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT = path.resolve(__dirname, "..", "out");
const CHECK = path.join(OUT, "check");
const FPS = 30;
const W = 1080;
const H = 1920;
const ADS = {
  ad1: { scene: "ad1-seven-doors.html", out: "ad1-seven-doors-ko.mp4", frames: 450 },
  ad2: { scene: "ad2-manshin.html", out: "ad2-manshin-ko.mp4", frames: 270 },
  ad3: { scene: "ad3-book.html", out: "ad3-book-ko.mp4", frames: 450 }, // (2026-10-21) 「한 권의 책」 15초
  ad1x: { scene: "ad1-seven-doors-3d.html", out: "ad1-seven-doors-3d-ko.mp4", frames: 450 }, // (2026-10-24) 1안 3D판(WebGL 층 scenes/gl/)
  ad3x: { scene: "ad3-book-3d.html", out: "ad3-book-3d-ko.mp4", frames: 450 }, // (2026-10-24) 3안 3D판
  ad2x: { scene: "ad2-manshin-3d.html", out: "ad2-manshin-3d-ko.mp4", frames: 270 }, // (2026-10-24) 2안 배경 3D판
  ad4x: { scene: "ad4-busted-3d.html", out: "ad4-busted-3d-ko.mp4", frames: 450 }, // (2026-10-24) 4안 「들켰죠」 (글자까지 WebGL, 후처리)
  ad5x: { scene: "ad5-saju-only-3d.html", out: "ad5-saju-only-3d-ko.mp4", frames: 450 }, // (2026-10-25) 5안 「언제까지 사주만」
  ad6x: { scene: "ad6-untold-3d.html", out: "ad6-untold-3d-ko.mp4", frames: 450 }, // (2026-10-25) 6안 「사주가 알려주지 않은 이야기」
  ad7: { scene: "ad7-season.html", out: "ad7-season-ko.mp4", frames: 450 }, // (2026-10-27) 7안 「첫 계절의 값」 15초
  "reel-saju": { scene: "reel-room.html?room=saju", out: "reel-saju-ko.mp4", frames: 750 }, // (2026-10-26) 방 소개 릴스 25초
  "reel-ogham": { scene: "reel-room.html?room=ogham", out: "reel-ogham-ko.mp4", frames: 750 }, // (2026-10-26) 방 소개 릴스 25초
  "reel-star": { scene: "reel-room.html?room=star", out: "reel-star-ko.mp4", frames: 750 }, // (2026-10-26) 방 소개 릴스 25초
  "reel-decan": { scene: "reel-room.html?room=decan", out: "reel-decan-ko.mp4", frames: 750 }, // (2026-10-26) 방 소개 릴스 25초
  "reel-tzolkin": { scene: "reel-room.html?room=tzolkin", out: "reel-tzolkin-ko.mp4", frames: 750 }, // (2026-10-26) 방 소개 릴스 25초
  "reel-rune": { scene: "reel-room.html?room=rune", out: "reel-rune-ko.mp4", frames: 750 }, // (2026-10-26) 방 소개 릴스 25초
  "reel-sibyl": { scene: "reel-room.html?room=sibyl", out: "reel-sibyl-ko.mp4", frames: 750 }, // (2026-10-26) 방 소개 릴스 25초
};

const args = process.argv.slice(2);
const which = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a)) || "all";
const checkOnly = args.includes("--check");
const PORT = Number(args[args.indexOf("--port") + 1]) || 8790;
if (PORT === 8787 || PORT === 8788) throw new Error("포트 8787·8788은 쓰지 않는다 (8790 권장)");
const list = which === "all" ? Object.keys(ADS) : [which];
if (!list.every((k) => ADS[k])) throw new Error(`알 수 없는 안: ${which} (ad1 | ad2 | ad3 | ad1x | ad2x | ad3x | ad4x | ad5x | ad6x | reel-<방> | all)`);

async function waitServer() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/marketing/strange-oracle/scenes/common.css`)).ok) return; } catch (e) {}
    await sleep(100);
  }
  throw new Error("정적 서버가 뜨지 않음");
}

// 장면 준비: 글꼴을 기다리고 모든 애니메이션을 멈춘다
async function prepare(b, url) {
  await b.goto(url);
  const info = await b.evaluate(`(async () => {
    await document.fonts.ready;
    document.documentElement.classList.add("is-paused");
    if (window.__ready3d) await window.__ready3d; // (3D판) WebGL 층 준비(글꼴로 그린 글자 포함)
    const fonts = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight);
    const st = document.querySelector(".stage");
    return { fonts, anims: document.getAnimations().length, duration: Number(st.dataset.duration), fps: Number(st.dataset.fps),
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] };
  })()`);
  return info;
}
async function seek(b, n) {
  await b.evaluate(`(async () => {
    const t = ${n} * 1000 / ${FPS};
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
    if (window.__seek3d) window.__seek3d(t / 1000); // (3D판) 같은 시각으로 WebGL 한 장
    await document.fonts.ready; // 뒤 장면에서 처음 쓰는 글꼴이 있으면 그 글꼴까지
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  })()`);
}
async function capture(b, file) {
  const r = await b.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
}
// 보이는 자막(data-cap)의 줄 수: offsetHeight(변형 영향 없음) / line-height
const CAPS = `(() => [...document.querySelectorAll("[data-cap]")].map((el) => {
  const cs = getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  return { cap: el.dataset.cap, opacity: Number(cs.opacity), lines: Math.round(el.offsetHeight / lh), text: el.textContent.trim() };
}).filter((c) => c.opacity > 0.01))()`;

const errs = (b) => b.log.errors.filter((e) => !/favicon.ico/.test(e)); // 정적 서버의 favicon 404는 장면과 무관
async function renderAd(b, key) {
  const ad = ADS[key];
  const base = `http://127.0.0.1:${PORT}/marketing/strange-oracle/scenes/${ad.scene}`;
  if (checkOnly) {
    const info = await prepare(b, base + "#safe");
    fs.mkdirSync(CHECK, { recursive: true });
    const marks = [];
    for (let s = 0; s * FPS < ad.frames; s++) marks.push(s * FPS);
    marks.push(ad.frames - 1);
    const rows = [];
    for (const n of marks) {
      await seek(b, n);
      const name = `${key}-safe-${String(n).padStart(3, "0")}f-${(n / FPS).toFixed(2)}s.png`;
      await capture(b, path.join(CHECK, name));
      rows.push({ frame: n, sec: +(n / FPS).toFixed(3), file: name, caps: await b.evaluate(CAPS) });
    }
    return { key, info, rows, errors: errs(b) };
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `so-render-${key}-`));
  try {
    const info = await prepare(b, base);
    if (info.duration * FPS !== ad.frames) throw new Error(`${key}: 장면 길이 ${info.duration}초 ≠ ${ad.frames}프레임`);
    const t0 = Date.now();
    for (let n = 0; n < ad.frames; n++) {
      await seek(b, n);
      await capture(b, path.join(tmp, `f${String(n).padStart(4, "0")}.png`));
      if (n % 90 === 0) console.log(`  ${key} ${n}/${ad.frames}`);
    }
    fs.mkdirSync(OUT, { recursive: true });
    const out = path.join(OUT, ad.out);
    const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(tmp, "f%04d.png"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
      "-movflags", "+faststart", "-an", out], { stdio: "inherit" });
    if (ff.status !== 0) throw new Error("ffmpeg 실패");
    return { key, info, out, sec: (Date.now() - t0) / 1000, errors: errs(b) };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true }); // 프레임 PNG 임시 파일은 지운다
  }
}

(async () => {
  const srv = spawn(process.execPath, [path.join(ROOT, "tools", "serve.js"), ".", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  let b;
  try {
    await waitServer();
    b = await launch({ port: Number(args[args.indexOf("--cdp") + 1]) || 9350, width: W, height: H });
    await b.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const results = [];
    for (const key of list) {
      b.log.errors.length = 0;
      const r = await renderAd(b, key);
      results.push(r);
      console.log(`${key}: 글꼴 ${r.info.fonts.length}종(${[...new Set(r.info.fonts)].join(", ")}) · 애니메이션 ${r.info.anims}개 · 문서 ${r.info.scroll.join("x")} · 오류 ${r.errors.length}`);
      if (r.out) console.log(`  → ${path.relative(ROOT, r.out)} (${r.sec.toFixed(0)}초 걸림)`);
      if (r.rows) {
        const bad = r.rows.flatMap((row) => row.caps.filter((c) => c.lines > 2).map((c) => `${row.sec}s ${c.cap} ${c.lines}줄`));
        console.log(`  확인 컷 ${r.rows.length}장 → out/check/ · 3줄 이상 자막: ${bad.length ? bad.join(", ") : "없음"}`);
      }
      if (r.errors.length) console.log("  오류:", r.errors.join(" | "));
    }
    if (checkOnly) fs.writeFileSync(path.join(CHECK, "check.json"), JSON.stringify(results.map(({ key, info, rows, errors }) => ({ key, info, errors, rows })), null, 2));
  } finally {
    if (b) await b.close();
    srv.kill();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
