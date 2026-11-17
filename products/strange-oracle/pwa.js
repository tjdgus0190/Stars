// 앱처럼 홈 화면에 두기(PWA) — nav.js가 모든 페이지(처음 화면·입구·하루 페이지·안내 페이지)에서 불러온다. (2026-11-16 운영자: 시험 주소에서 먼저)
// 하는 일: ① 앱 정보 파일(manifest)·아이폰 아이콘을 붙이고 서비스 워커(/sw.js)를 등록 ② 처음 들어온 사람에게 한 번 「앱에서 둘러보기 / 웹으로 계속하기」를 묻는다.
// 저장: 이 기기 localStorage "strange-oracle-pwa" = "app"|"web"(물어봤다는 표시, 입력값 아님). 문구는 data-nav.js NAV.pwa
(function () {
  "use strict";
  const N = window.NAV, C = N && N.pwa;
  if (!C || C.mode === "off") return;
  if (C.mode === "test" && (C.prodHosts || []).includes(location.hostname)) return; // 시험: 운영 주소에서는 아무것도 하지 않는다
  const KEY = "strange-oracle-pwa";
  const head = document.head;
  const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); head.append(el); };
  if (!document.querySelector('link[rel="manifest"]')) {
    add("link", { rel: "manifest", href: "/manifest.webmanifest" });
    add("link", { rel: "apple-touch-icon", href: "/products/strange-oracle/img/app/apple-touch-icon.png" });
    add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    add("meta", { name: "mobile-web-app-capable", content: "yes" });
    add("meta", { name: "apple-mobile-web-app-title", content: "낯선 점술관" });
    add("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" });
    // (2026-11-16) 아이폰 실행 첫 화면(흰 화면 대신 아무것도 없는 어두운 바탕 → 바로 intro.js 연출, 2026-11-16 운영자). 기종별 화면 크기
    [[440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 2], [375, 667, 2]].forEach(([w, h, r]) => add("link", {
      rel: "apple-touch-startup-image",
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
      href: `/products/strange-oracle/img/app/splash/splash-${w * r}x${h * r}.png?v=2`, // v=2: 아이콘 없는 단색(옛 그림이 캐시에 남지 않게)
    }));
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  // 설치 창을 설치 페이지에서 쓸 수 있게 미리 받아 둔다(안드로이드 크롬 등)
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); window.SO_INSTALL = e; document.dispatchEvent(new CustomEvent("so:installable")); });

  const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;

  // ── (2026-11-16 운영자) 웹 푸시 「오늘의 신탁 알림」 카드: 오늘의 신탁·나의 이야기 페이지에. 서버(PUSH_MODE)가 꺼져 있으면(503) 아무것도 그리지 않는다
  //   저장: 이 기기 쪽에는 없음(브라우저가 알림 주소를 가진다). 서버에는 알림 주소·시각만(동의 화면에 적은 대로)
  const PU = C.push;
  const page = location.pathname.replace(/\/+$/, "/");
  const pushSpot = PU && (page === "/today/" || page === "/me/") ? document.querySelector("[data-js=app]") : null;
  const pushable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const iosDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const escP = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", credentials: "omit" });
  const keyBytes = (k) => { const s = atob(k.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((k.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
  async function pushCard() {
    if (!pushSpot) return;
    let key = "";
    try { const r = await fetch("/api/push/key", { cache: "no-store", credentials: "omit" }); if (r.status !== 200) return; key = (await r.json()).key || ""; } catch (e) { return; }
    if (!key) return;
    const card = document.createElement("section");
    card.className = "pwa-push";
    pushSpot.before(card);
    const reg = pushable ? await navigator.serviceWorker.ready.catch(() => null) : null;
    let sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
    let msg = "";
    const draw = (busy) => {
      const head = `<b class="pwa-push__head">${escP(PU.head)}</b>`;
      if (!pushable || (iosDevice && !standalone)) {
        card.innerHTML = head + `<p>${escP(PU.iosHint)}</p><a class="pwa-push__btn" href="${escP(C.install)}">${escP(PU.iosGo)}</a>`;
        return;
      }
      if (sub) {
        card.innerHTML = `<p class="pwa-push__on">${escP(msg || PU.status)}</p><div class="pwa-push__row"><button type="button" class="pwa-push__link" data-push="off">${escP(PU.off)}</button>${C.mode === "test" ? `<button type="button" class="pwa-push__link" data-push="test">${escP(PU.test)}</button>` : ""}</div>`;
        return;
      }
      if (Notification.permission === "denied") { card.innerHTML = head + `<p>${escP(PU.denied)}</p>`; return; }
      card.innerHTML = head + `<p>${escP(PU.body)}</p><details class="pwa-push__more"><summary>${escP(PU.more)}</summary><ul>${PU.detail.map((x) => `<li>${escP(x)}</li>`).join("")}</ul></details>
        <button type="button" class="pwa-push__btn" data-push="on"${busy ? " disabled" : ""}>${escP(busy ? PU.working : PU.on)}</button>${msg ? `<p class="pwa-push__msg">${escP(msg)}</p>` : ""}`;
    };
    draw();
    card.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-push]");
      if (!b || !reg) return;
      const act = b.dataset.push;
      msg = "";
      try {
        if (act === "on") {
          draw(true);
          const perm = await Notification.requestPermission();
          if (perm !== "granted") { draw(); return; }
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
          const r = await post("/api/push/subscribe", { endpoint: sub.endpoint });
          if (r.status !== 200) { await sub.unsubscribe().catch(() => {}); sub = null; msg = PU.fail; return draw(); }
          msg = PU.done;
          return draw();
        }
        if (act === "off" && sub) {
          await post("/api/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
          await sub.unsubscribe().catch(() => {});
          sub = null; msg = PU.offDone;
          return draw();
        }
        if (act === "test" && sub) { await post("/api/push/test", { endpoint: sub.endpoint }); msg = PU.testSent; return draw(); }
      } catch (x) { msg = PU.fail; sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null; draw(); }
    });
  }
  pushCard();

  // ── (2026-11-17 운영자) 웹으로 들어왔을 때 위 띠에 「앱 설치」 단추를 늘 둔다 → 설치 페이지. 홈 화면 앱·설치 페이지에서는 두지 않는다
  const GET = C.get;
  if (GET && !standalone && page !== C.install) {
    const spot = document.querySelector(".gtop__inner .dust-badge, .gtop__inner [data-js=dust-slot]") || document.querySelector(".topbar__end");
    if (spot) {
      const a = document.createElement("a");
      a.className = "pwa-get";
      a.href = C.install;
      a.setAttribute("aria-label", GET.label);
      a.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span>${escP(GET.text)}</span>`;
      if (spot.classList.contains("topbar__end")) spot.prepend(a); else spot.before(a);
    }
  }

  const A = C.ask;
  if (standalone || !A || location.pathname.replace(/\/+$/, "/") === C.install) return;
  let asked = "";
  try { asked = localStorage.getItem(KEY) || ""; } catch (e) { asked = "x"; }
  if (asked) return;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const mark = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* 이 화면에서만 */ } };
  const show = () => {
    if (document.querySelector(".pwa-ask")) return;
    const box = document.createElement("div");
    box.className = "pwa-ask";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", A.title);
    box.innerHTML = `<div class="pwa-ask__scrim" data-pwa="web"></div><div class="pwa-ask__card">
      <div class="pwa-ask__icon"><img src="${esc(C.icon)}" alt="" width="84" height="84"></div>
      <small class="pwa-ask__eyebrow">${esc(A.eyebrow)}</small><h2>${esc(A.title)}</h2><p>${esc(A.body)}</p>
      ${(A.points || []).length ? `<ul class="pwa-ask__points">${A.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<div class="pwa-ask__gap"></div>`}
      <a class="pwa-ask__app" href="${esc(C.install)}" data-pwa="app">${esc(A.app)}</a>
      <button class="pwa-ask__web" type="button" data-pwa="web">${esc(A.web)}</button></div>`;
    document.body.append(box);
    requestAnimationFrame(() => box.classList.add("is-on"));
    box.addEventListener("click", (e) => {
      const t = e.target.closest("[data-pwa]");
      if (!t) return;
      if (t.dataset.pwa === "app") { mark("app"); return; } // 링크로 설치 페이지에
      mark("web");
      box.classList.remove("is-on");
      setTimeout(() => box.remove(), 320);
    });
  };
  // 첫 화면이 자리 잡은 뒤 살짝 늦게
  const later = () => setTimeout(show, 900);
  if (document.readyState === "complete") later(); else window.addEventListener("load", later, { once: true });
})();
