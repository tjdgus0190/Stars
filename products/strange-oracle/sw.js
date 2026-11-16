// 낯선 점술관 앱(홈 화면에 추가) 서비스 워커 — 주소 /sw.js(netlify.toml 200 rewrite)로 내려 사이트 전체를 범위로 둔다. (2026-11-16 운영자: PWA·웹 푸시 시험)
// 하는 일: ① 홈 화면 앱으로 설치될 수 있게 ② 인터넷이 끊겼을 때 화면 이동이면 짧은 안내 ③ 웹 푸시(빈 알림)를 받으면 그날 안내자로 알림을 만들어 보여 준다.
// 저장하는 것: 없음(캐시도 쓰지 않는다). 개인정보·입력값을 다루지 않는다. 알림 문구는 공개 문구 파일(data-nav.js·data-dex.js)과 오늘의 안내자 순서(stardust.js)에서.
self.window = self; // 문구 파일들은 window.X = … 꼴이라 서비스 워커에서도 읽히게
try { importScripts("/products/strange-oracle/data-nav.js", "/products/strange-oracle/data-dex.js", "/products/strange-oracle/stardust.js"); } catch (e) { /* 문구 없이도 기본 알림은 뜬다 */ }
const OFFLINE = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>낯선 점술관</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#080717;color:#efe6cf;font-family:serif;text-align:center;padding:24px">
<div><p style="font-size:20px;margin:0 0 8px">문 너머가 잠시 보이지 않아요</p><p style="opacity:.75;margin:0">인터넷에 다시 이어지면 안내자들이 기다리고 있을게요.</p></div></body></html>`;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // 화면 이동만
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
// 받침에 따라 이/가
const iga = (w) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? "이" : "가"; };
self.addEventListener("push", (e) => {
  const T = (self.NAV && self.NAV.pwa && self.NAV.pwa.push && self.NAV.pwa.push.note) || {};
  let title = T.fallbackTitle || "낯선 점술관", body = T.fallbackBody || "";
  try {
    const room = self.Dust.guideOf();
    const g = self.DEX.guides.find((x) => x.room === room);
    if (g) { title = String(T.title).replace("{name}", g.name).replace("{iga}", iga(g.name)); body = (g.today && g.today.intro) || body; }
  } catch (x) { /* 기본 문구 */ }
  e.waitUntil(self.registration.showNotification(title, { body, icon: "/products/strange-oracle/img/app/icon-192.png", badge: "/products/strange-oracle/img/app/icon-192.png", tag: "so-today", data: { url: T.url || "/today/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/today/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const w = list.find((c) => "focus" in c);
    if (w) { w.navigate(url).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
