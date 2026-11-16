// 낯선 점술관 설치 페이지 (2026-11-16 운영자). 문구: data-nav.js NAV.pwa.page · 아이콘: nav-icons.js
// 휴대폰·브라우저마다 「홈 화면에 추가」 길이 다르다:
//   - 안드로이드 크롬·엣지·삼성 인터넷 등: 브라우저가 주는 설치 창(beforeinstallprompt)을 버튼 한 번으로 연다
//   - 아이폰 사파리: 웹이 설치 창을 직접 열 수 있는 방법이 없다(애플이 열어 두지 않음) → 공유 버튼을 가리키는 3단계 안내
//   - 인스타그램·카카오톡 등 앱 안 브라우저: 설치가 안 된다 → 바깥 브라우저(크롬·사파리)로 이 페이지를 다시 연다
// 저장하는 것 없음. 개인정보·입력값을 다루지 않는다.
(function () {
  "use strict";
  const C = (window.NAV && window.NAV.pwa) || {}, P = C.page || {};
  const ICONS = window.NAV_ICONS || {};
  const box = document.querySelector("[data-js=ins]");
  if (!box || !P.name) return;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ico = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;
  const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M5 11v9h14v-9"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4 10-10"/></svg>';
  const DOTS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';
  const OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>';
  const KEBAB = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>';

  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const kakao = /KAKAOTALK/i.test(ua);
  const inapp = kakao || /Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|Line\/|DaumApps|everytimeApp|Threads|Barcelona/i.test(ua);
  const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  const HOME = "/";

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  let deferred = window.SO_INSTALL || null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", () => done());

  // 이미 홈 화면 앱으로 열었으면 바로 점술관으로
  if (standalone) { location.replace(HOME); return; }

  const feats = (P.features || []).map((f) => `<li>${ico(f.icon)}<div><b>${esc(f.head)}</b><span>${esc(f.body)}</span></div></li>`).join("");
  box.innerHTML = `<div class="ins-icon"><img src="${esc(C.icon)}" alt="" width="132" height="132"></div>
    <small class="ins-eyebrow">${esc(P.eyebrow)}</small><h1>${esc(P.name)}</h1><p class="ins-lead">${esc(P.lead)}</p>
    <ul class="ins-feats">${feats}</ul>
    <div class="ins-cta" data-js="cta">
      <button class="ins-btn" type="button" data-js="add">${PLUS.replace("<svg", '<svg class="ico"')}${esc(inapp ? P.inapp.btn : P.add)}</button>
      <p class="ins-note">${esc(inapp ? P.inapp.note : P.note)}</p>
      <a class="ins-web" href="${HOME}">${esc(P.web)}</a>
    </div>`;
  document.title = P.title || P.name;

  // 단계 안내 창
  const guide = (G, icons, point) => {
    let g = document.querySelector(".ins-guide");
    if (!g) { g = document.createElement("div"); g.className = "ins-guide"; document.body.append(g); }
    g.hidden = false;
    g.classList.toggle("is-down", point === "down");
    g.innerHTML = `<div class="ins-guide__scrim" data-js="g-close"></div><div class="ins-guide__card" role="dialog" aria-modal="true" aria-label="${esc(G.title)}"><h2>${esc(G.title)}</h2>
      <ol>${G.steps.map((s, i) => `<li><span>${esc(s)}</span>${icons[i] || ""}</li>`).join("")}</ol>
      <button class="ins-guide__close" type="button" data-js="g-close">${esc(G.close)}</button></div>${point ? `<span class="ins-point${point === "down" ? " is-down" : ""}" aria-hidden="true">${point === "down" ? "↓" : "↑"}</span>` : ""}`;
    g.onclick = (e) => { if (e.target.closest("[data-js=g-close]")) g.hidden = true; };
  };
  const done = () => {
    const cta = box.querySelector("[data-js=cta]");
    if (!cta) return;
    cta.innerHTML = `<div class="ins-done"><b>${esc(P.done.title)}</b><p>${esc(P.done.body)}</p></div><a class="ins-btn" href="${HOME}" style="margin-top:14px">${esc(P.done.go)}</a>`;
  };
  // 앱 안 브라우저 → 바깥 브라우저로 이 페이지를 다시 연다
  const openOutside = () => {
    const url = location.origin + "/install/";
    if (kakao) { location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(url); return; }
    if (android) { location.href = `intent://${location.host}/install/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`; return; }
    if (ios) {
      // 최근 iOS의 사파리 열기 주소. 앱이 막으면 아무 일도 없으니, 잠시 뒤에도 이 화면이면 메뉴 안내를 보인다
      const t0 = Date.now();
      location.href = "x-safari-" + url;
      setTimeout(() => { if (!document.hidden && Date.now() - t0 < 4000) guide(P.guideInapp, [DOTS, OPEN, PLUS], "up"); }, 1200);
      return;
    }
    guide(P.guideInapp, [DOTS, OPEN, PLUS], "up");
  };
  box.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-js=add]");
    if (!b) return;
    if (inapp) return openOutside();
    if (deferred) {
      b.disabled = true;
      try {
        deferred.prompt();
        const r = await deferred.userChoice;
        deferred = null;
        if (r && r.outcome === "accepted") return done();
      } catch (x) { /* 아래 안내로 */ }
      b.disabled = false;
      return;
    }
    if (ios) return guide(P.guideIos, [SHARE, PLUS, CHECK], "down"); // 사파리 공유 버튼은 보통 화면 아래
    guide(P.guideAndroid, [KEBAB, PLUS, CHECK], "up");
  });
})();
