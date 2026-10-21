// 19-5 (a)·검수 2차 권장 2: cdp.js 구글 막기가 브라우저 2개·팝업(window.open)·새 탭(_blank·a target=_blank)·iframe에 모두 걸리는지 본다.
// 실행: node --experimental-websocket tools/strange-oracle/guard-google.js  (127.0.0.1:8795에 작은 서버를 잠시 띄움, 구글 주소는 가짜 ID)
const http = require("http");
const { launch, sleep, googleCount } = require("./cdp.js");
const page = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST12345"></script><script>fetch("https://www.google-analytics.com/g/collect?v=2").catch(()=>{});</script><iframe src="/f"></iframe>`;
const srv = http.createServer((q, r) => r.end(q.url === "/f" ? `<script>fetch("https://region1.google-analytics.com/g/collect").catch(()=>{})</script>` : page)).listen(8795, "127.0.0.1");
(async () => {
  const A = await launch({ port: 9771 });
  const B = await launch({ port: 9772 });
  await A.goto("http://127.0.0.1:8795/");
  await B.goto("http://127.0.0.1:8795/");
  await A.send("Runtime.evaluate", { userGesture: true, expression: "window.open('http://127.0.0.1:8795/pop', 'p', 'popup'); 1" });
  await sleep(1500);
  await A.send("Runtime.evaluate", { userGesture: true, expression: "window.open('http://127.0.0.1:8795/tab', '_blank'); 1" });
  await sleep(1500);
  await A.send("Runtime.evaluate", { userGesture: true, expression: "(() => { const a = document.createElement('a'); a.href = 'http://127.0.0.1:8795/link'; a.target = '_blank'; document.body.append(a); a.click(); return 1; })()" });
  await sleep(1500);
  const c = googleCount();
  console.log(c.leaked === 0 && c.extra >= 3 && c.blocked >= 9 ? "PASS" : "FAIL", "구글 막기:", JSON.stringify(c));
  if (c.leaked !== 0) process.exitCode = 1;
  await A.close(); await B.close(); srv.close();
})();
