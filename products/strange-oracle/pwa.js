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
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  // 설치 창을 설치 페이지에서 쓸 수 있게 미리 받아 둔다(안드로이드 크롬 등)
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); window.SO_INSTALL = e; document.dispatchEvent(new CustomEvent("so:installable")); });

  const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
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
