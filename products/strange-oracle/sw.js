// 낯선 점술관 앱(홈 화면에 추가) 서비스 워커 — 주소 /sw.js(netlify.toml 200 rewrite)로 내려 사이트 전체를 범위로 둔다. (2026-11-16 운영자: PWA 시험)
// 하는 일: 홈 화면 앱으로 설치될 수 있게 하는 것과, 인터넷이 끊겼을 때 화면 이동이면 짧은 안내만 보여 주는 것. 다른 요청(함수·결제·로그인·그림)은 손대지 않고 그대로 보낸다.
// 저장하는 것: 없음(캐시도 쓰지 않는다 — 예전 화면이 남아 헷갈리지 않게). 개인정보·입력값을 다루지 않는다.
const OFFLINE = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>낯선 점술관</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#080717;color:#efe6cf;font-family:serif;text-align:center;padding:24px">
<div><p style="font-size:20px;margin:0 0 8px">문 너머가 잠시 보이지 않아요</p><p style="opacity:.75;margin:0">인터넷에 다시 이어지면 안내자들이 기다리고 있을게요.</p></div></body></html>`;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // 화면 이동만
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
