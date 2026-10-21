// 아주 작은 CDP 드라이버 (헤드리스 Edge, 설치 없음). node --experimental-websocket 로 실행
// 6단계 시험용: 요청 본문(postData)까지 기록한다. 스크린샷은 tools/strange-oracle/out/ 에 저장.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const EDGE = process.env.EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const SP = path.join(require("os").tmpdir(), "strange-oracle-e2e"); // 공백 없는 경로 (Edge 인자에 공백이 있으면 실행이 멈춘다)
fs.mkdirSync(SP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 19-5 (a)·(c): 시험이 실제 GA4로 기록을 보내지 않게, 모든 브라우저·모든 대상(첫 탭·새 탭·결제창 팝업·iframe·worker)에서
// 구글 분석 주소를 Network.setBlockedURLs로 막는다. 끄는 옵션은 없다. 브라우저 단위 연결에서 Target.setAutoAttach(flatten,
// waitForDebuggerOnStart)로 새 대상이 첫 요청을 보내기 전에 막기를 건 뒤 풀어 준다. 이름 풀이도 막아 두 겹으로 둔다.
// 판정: 구글 주소 requestWillBeSent 가운데 막힘(blockedReason inspector 또는 ERR_BLOCKED_BY_CLIENT)으로 실패한 것 = 막은 요청,
// 그렇지 않은 것 = 막지 않고 나간 요청(이름 풀이 막기에 걸렸어도 셈). 프로세스가 끝날 때 한 줄로 찍고, 나간 요청이 있으면 실패 코드.
// 시험함(2026-10-18): 브라우저 2개 + window.open 팝업 + _blank 새 탭 + a target=_blank + iframe → 나간 0. 알려진 틈: CDP Target.createTarget에
// 주소를 바로 주면 첫 문서의 요청 하나가 막기 전에 나갈 수 있다(이름 풀이 막기에 걸림) → 새 탭은 about:blank로 만든 뒤 옮긴다(지금 실행기 중 createTarget을 쓰는 곳 없음).
const GOOGLE_BLOCK = ['*googletagmanager.com*', '*google-analytics.com*'];
const GOOGLE_RE = /^[a-z]+:\/\/([^/]*\.)?(googletagmanager|google-analytics)\.com[:/]/i;
const G = { browsers: 0, targets: 0, extra: 0, blocked: 0, leaked: [], pending: new Map() };
process.on('exit', () => {
  const leaked = G.leaked.length + G.pending.size;
  console.log(`막은 구글 요청 ${G.blocked}건 · 막지 않고 나간 구글 요청 ${leaked}건 (브라우저 ${G.browsers}개 · 막기 건 대상 ${G.targets}개, 그 가운데 새 탭·팝업·iframe·worker ${G.extra}개)`);
  if (leaked) { console.log('  나간 구글 요청: ' + G.leaked.concat([...G.pending.values()]).join(' | ')); process.exitCode = 1; }
});
async function guardBrowser(port, mainId) {
  const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const waiters = new Map();
  const seen = new Set();
  const where = new Map(); // sessionId → 대상 종류·주소(나간 요청 보고용)
  const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; waiters.set(i, res); ws.send(JSON.stringify(Object.assign({ id: i, method, params }, sessionId ? { sessionId } : {}))); });
  const NET = new Set(['page', 'iframe', 'worker', 'shared_worker', 'service_worker', 'other']);
  const NEST = new Set(['tab', 'browser']); // 탭 대상 안의 page를 다시 붙잡는다(새 탭·팝업)
  async function arm(sessionId, info) {
    if (NET.has(info.type)) {
      await send('Network.enable', {}, sessionId);
      await send('Network.setBlockedURLs', { urls: GOOGLE_BLOCK }, sessionId);
      await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId);
    }
    else if (NEST.has(info.type)) await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId);
    await send('Runtime.runIfWaitingForDebugger', {}, sessionId);
  }
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiters.has(msg.id)) { const w = waiters.get(msg.id); waiters.delete(msg.id); return w(msg); }
    const p = msg.params || {};
    if (msg.method === 'Target.attachedToTarget') {
      const t = p.targetInfo;
      if (process.env.CDP_GUARD_DEBUG) console.log('[guard]', t.type, t.targetId.slice(0, 6), t.url, p.waitingForDebugger);
      where.set(p.sessionId, t.type + ' ' + t.url);
      if (!seen.has(t.targetId) && NET.has(t.type) && !/^chrome-extension:/.test(t.url)) { seen.add(t.targetId); G.targets++; if (t.targetId !== mainId) G.extra++; }
      arm(p.sessionId, t);
    } else if (msg.method === 'Network.requestWillBeSent' && GOOGLE_RE.test(p.request.url)) {
      G.pending.set(msg.sessionId + ':' + p.requestId, p.request.url);
    } else if (msg.method === 'Network.loadingFailed') {
      const k = msg.sessionId + ':' + p.requestId;
      if (!G.pending.has(k)) return;
      const url = G.pending.get(k);
      G.pending.delete(k);
      if (p.blockedReason === 'inspector' || /ERR_BLOCKED_BY_CLIENT/.test(p.errorText || '')) G.blocked++;
      else G.leaked.push(url + ' (' + (p.errorText || '') + ' · ' + where.get(msg.sessionId) + ')');
    } else if (msg.method === 'Network.responseReceived' || msg.method === 'Network.loadingFinished') {
      const k = msg.sessionId + ':' + p.requestId;
      if (G.pending.has(k)) { G.leaked.push(G.pending.get(k)); G.pending.delete(k); }
    }
  };
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  if (!seen.has(mainId)) await send('Target.attachToTarget', { targetId: mainId, flatten: true });
  for (let i = 0; i < 25 && !seen.has(mainId); i++) await sleep(40);
  G.browsers++;
  return ws;
}

async function launch({ port = 9333, reduced = false, width = 360, height = 800, shimRaf = false } = {}) {
  const prof = path.join(SP, `edgeprof-${port}`);
  fs.rmSync(prof, { recursive: true, force: true });
  const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--host-resolver-rules=MAP *.googletagmanager.com ~NOTFOUND, MAP googletagmanager.com ~NOTFOUND, MAP *.google-analytics.com ~NOTFOUND, MAP google-analytics.com ~NOTFOUND", `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.find((t) => t.type === "page")) break; } catch (e) {}
  }
  const page = targets.find((t) => t.type === "page");
  const guard = await guardBrowser(port, page.id); // 19-5 (a): 첫 요청 전에 모든 대상에 구글 막기
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
  await send("Network.setBlockedURLs", { urls: GOOGLE_BLOCK }); // 첫 탭 연결에도 같은 막기(두 연결 모두)
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
  async function close() { try { await send("Browser.close"); } catch (e) {} ws.close(); try { guard.close(); } catch (e) {} proc.kill(); }
  return { send, evaluate, goto, shot, close, log, sleep, on: (fn) => listeners.push(fn) };
}
module.exports = { launch, sleep, googleCount: () => ({ blocked: G.blocked, leaked: G.leaked.length + G.pending.size, targets: G.targets, extra: G.extra }) };
