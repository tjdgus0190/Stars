// 아주 작은 CDP 드라이버 (헤드리스 Edge, 설치 없음). node --experimental-websocket 로 실행
// 6단계 시험용: 요청 본문(postData)까지 기록한다. 스크린샷은 tools/strange-oracle/out/ 에 저장.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const EDGE = process.env.EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const SP = path.join(require("os").tmpdir(), "strange-oracle-e2e"); // 공백 없는 경로 (Edge 인자에 공백이 있으면 실행이 멈춘다)
fs.mkdirSync(SP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch({ port = 9333, reduced = false, width = 360, height = 800, shimRaf = false } = {}) {
  const prof = path.join(SP, `edgeprof-${port}`);
  fs.rmSync(prof, { recursive: true, force: true });
  const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.find((t) => t.type === "page")) break; } catch (e) {}
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const waiters = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiters.has(msg.id)) { const w = waiters.get(msg.id); waiters.delete(msg.id); msg.error ? w.rej(new Error(msg.error.message)) : w.res(msg.result); }
    else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waiters.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const log = { console: [], errors: [], requests: [], bodies: [] };
  listeners.push((m) => {
    if (m.method === "Runtime.consoleAPICalled") log.console.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`);
    if (m.method === "Runtime.exceptionThrown") log.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") log.errors.push(`[log] ${m.params.entry.text} ${m.params.entry.url || ""}`);
    if (m.method === "Network.requestWillBeSent") { log.requests.push(m.params.request.method + " " + m.params.request.url); log.bodies.push({ url: m.params.request.url, body: m.params.request.postData || "" }); }
  });
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true });
  if (reduced) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (shimRaf) await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 16); window.cancelAnimationFrame = (i) => clearTimeout(i);" });

  async function evaluate(expr) {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error("eval: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async function goto(url) {
    // #해시만 다른 주소는 같은 문서라 다시 읽히지 않는다 → 해시를 떼고 새로 읽은 뒤 해시를 붙인다
    const cur = await evaluate("location.href").catch(() => "");
    if (cur && url.split("#")[0] === cur.split("#")[0] && url.includes("#")) {
      await evaluate(`history.replaceState(null, "", ${JSON.stringify(url)})`);
      const re = new Promise((r) => { const l = (m) => { if (m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); });
      await send("Page.reload", {});
      await Promise.race([re, sleep(8000)]);
      return sleep(600);
    }
    const loaded = new Promise((r) => { const l = (m) => { if (m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); });
    await send("Page.navigate", { url });
    await Promise.race([loaded, sleep(8000)]); // 같은 문서의 #해시 이동은 load 이벤트가 없다
    await sleep(600);
  }
  async function shot(file, full = false) {
    let clip;
    if (full) {
      const h = await evaluate("Math.min(document.documentElement.scrollHeight, 16000)");
      await send("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: 1, mobile: true });
      await sleep(300);
    }
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(path.join(SP, file), Buffer.from(r.data, "base64"));
    if (full) { await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true }); await sleep(200); }
  }
  async function close() { try { await send("Browser.close"); } catch (e) {} ws.close(); proc.kill(); }
  return { send, evaluate, goto, shot, close, log, sleep };
}
module.exports = { launch, sleep };
