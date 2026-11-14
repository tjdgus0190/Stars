// 전체 메뉴(☰ → 아이콘 칸 시트) · 아래 탭 바 · 별가루 잔액 (2026-11-13 v1-F). 문구·링크는 data-nav.js(window.NAV), 아이콘은 nav-icons.js, 모양은 nav.css.
// - 안내·도구·하루 페이지·처음 화면: gen-guide.js가 메뉴·탭 바 HTML을 미리 써 둔다(검색 엔진이 링크를 읽게) → 여닫기·현재 위치만 붙인다.
// - 입구(index.html): 메뉴가 없으면 window.NAV로 그리고, 위 띠(.topbar__inner) 맨 앞에 ☰ 버튼을 끼운다. 아래 탭 바도 그린다(입구의 나의 이야기·신년운세 띠는 그 위로).
// 입력값·분석 이벤트를 쓰지 않는다. stardust.js(window.Dust)가 있으면 잔액을 보이고, 얻을 때 짧은 알림을 띄운다.
(function () {
  const N = window.NAV;
  const ICONS = window.NAV_ICONS || {};
  const html = document.documentElement;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ico = (name) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.door || ""}</svg>`;

  // 지금 주소와 같은 링크 (짧은 주소·긴 주소 모두)
  const here = location.pathname.replace(/index\.html$/, "");
  const sameAs = (href) => {
    if (/^https?:/.test(href)) return false;
    if (href === here || href === here + "/" || href + "/" === here) return true;
    const m = here.match(/\/products\/strange-oracle\/guide\/([a-z0-9/-]+?)\/$/);
    return !!m && href === `/${m[1]}/`;
  };

  function build() {
    if (!N) return null;
    const aside = document.createElement("aside");
    aside.className = "sidenav";
    aside.id = "sidenav";
    aside.setAttribute("aria-label", N.open);
    aside.innerHTML = `<div class="sidenav__head"><a class="sidenav__brand" href="${esc(N.home || "/")}"><b>${esc(N.brand)}</b><small>${esc(N.brandSub)}</small></a>
      <button class="sidenav__close" type="button" data-nav="close" aria-label="${esc(N.close)}">${ico("close")}</button></div>` +
      N.groups.map((g) => `<nav class="sidenav__group" aria-label="${esc(g.head)}"><h2>${esc(g.head)}</h2><ul class="sidenav__tiles">${g.items.map((it) =>
        `<li><a href="${esc(it.href)}" title="${esc(it.label)}"${it.ext ? ' target="_blank" rel="noopener"' : ""}>${ico(it.icon)}<span>${esc(it.short || it.label)}</span></a></li>`).join("")}</ul>${g.items.filter((it) => it.disclose).map((it) => `<p class="sidenav__notice">${esc(it.disclose)}</p>`).join("")}</nav>`).join("");
    document.body.append(aside);
    return aside;
  }

  const aside = document.getElementById("sidenav") || build();
  if (!aside) return;
  // (2026-11-14 운영자) 입구(일곱 개의 문)에도 같은 아래 탭 바 — 페이지들은 gen-guide.js가 미리 써 둔다
  if (N && N.tabs && !document.querySelector(".tabbar")) {
    const tb = document.createElement("nav");
    tb.className = "tabbar";
    tb.setAttribute("aria-label", N.tabsLabel || "");
    tb.innerHTML = N.tabs.map((t) => `<a href="${esc(t.href)}">${ico(t.icon)}<span>${esc(t.label)}</span></a>`).join("");
    document.body.append(tb);
    document.body.classList.add("has-tabbar");
  }
  // (2026-11-14 운영자) 입구의 「내 정보 지우기」는 위 막대 대신 메뉴 맨 아래에 (6장: 언제든 누를 수 있게 — ☰는 입구 모든 화면에 있다)
  const clr = document.querySelector(".topbar [data-js=clear-open]");
  if (clr) {
    const foot = document.createElement("div");
    foot.className = "sidenav__foot";
    clr.classList.remove("topbar__clear");
    clr.classList.add("sidenav__clear");
    foot.append(clr);
    aside.append(foot);
  }
  aside.querySelectorAll("a[href]").forEach((a) => { if (sameAs(a.getAttribute("href"))) a.setAttribute("aria-current", "page"); });
  document.querySelectorAll(".tabbar a[href]").forEach((a) => { if (sameAs(a.getAttribute("href"))) a.setAttribute("aria-current", "page"); });
  let scrim = document.querySelector(".sidenav-scrim");
  if (!scrim) {
    scrim = document.createElement("div");
    scrim.className = "sidenav-scrim";
    scrim.dataset.nav = "close";
    document.body.append(scrim);
  }
  // 입구: 위 띠 맨 앞에 ☰
  let toggle = document.querySelector("[data-nav=open]");
  if (!toggle && N) {
    const bar = document.querySelector(".topbar__inner");
    if (bar) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "nav-toggle";
      toggle.dataset.nav = "open";
      toggle.setAttribute("aria-label", N.open);
      toggle.innerHTML = ico("menu");
      bar.prepend(toggle);
      bar.classList.add("has-nav");
    }
  }
  if (toggle) {
    toggle.setAttribute("aria-controls", "sidenav");
    toggle.setAttribute("aria-expanded", "false");
  }

  // ── 별가루: 위 띠(페이지) 또는 메뉴 머리(입구)에 잔액 + 얻을 때 알림 (문구 NAV.dust)
  const D = window.Dust, T = N && N.dust;
  if (D && T) {
    const badge = document.createElement("a");
    badge.className = "dust-badge";
    badge.href = T.href;
    const slot = document.querySelector("[data-js=dust-slot]");
    if (slot) slot.replaceWith(badge);
    else { const head = aside.querySelector(".sidenav__head"); head.insertBefore(badge, head.querySelector(".sidenav__close")); }
    // (2026-11-14 운영자) 별가루는 카카오 계정에만 — 하루 페이지가 계정 잔액을 받으면 dust:acct로 알린다(로그인 전 0)
    let acct = 0;
    const paint = () => { const n = acct; badge.innerHTML = `<img src="/products/strange-oracle/img/stardust.webp" alt="" width="18" height="18"><b>${n}</b>`; badge.setAttribute("aria-label", T.badgeLabel.replace("{n}", n)); };
    document.addEventListener("dust:change", paint);
    let heard = false;
    document.addEventListener("dust:acct", (e) => { heard = true; acct = (e.detail && Number.isInteger(e.detail.bal)) ? e.detail.bal : 0; paint(); });
    // (2026-11-14) 어느 화면에서든 로그인해 있으면 계정 잔액을 직접 받아 온다(충전 뒤 홈·입구로 옮겨도 그대로). 로그인 표는 무작위 값
    try {
      const lg = JSON.parse(localStorage.getItem("strange-oracle-login") || "null");
      if (lg && /^[0-9a-f]{32}$/.test(lg.sid) && lg.exp > Date.now()) {
        fetch("/api/auth/dust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: lg.sid }), cache: "no-store", credentials: "omit" })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => { if (!heard && j && Number.isInteger(j.bal)) { acct = j.bal; paint(); } })
          .catch(() => {});
      }
    } catch (e) { /* 무시 */ }
    let box = null, timer = 0;
    document.addEventListener("dust:gain", (e) => {
      const { kind, amt, capped } = e.detail || {};
      if (!box) { box = document.createElement("div"); box.className = "dust-toast"; box.setAttribute("role", "status"); document.body.append(box); }
      box.innerHTML = `<img src="/products/strange-oracle/img/stardust.webp" alt="" width="18" height="18" style="vertical-align:-4px"> <b>${esc(T.gain.replace("{n}", amt))}</b> <span>${esc((T.why && T.why[kind]) || "")}</span>${capped ? `<small>${esc(T.capped)}</small>` : ""}`;
      box.classList.remove("is-on");
      void box.offsetWidth;
      box.classList.add("is-on");
      clearTimeout(timer);
      timer = setTimeout(() => box.classList.remove("is-on"), 2600);
    });
    paint();
    D.visit();
  }

  const setHidden = () => {
    const open = html.classList.contains("nav-open");
    aside.setAttribute("aria-hidden", open ? "false" : "true");
    if ("inert" in aside) aside.inert = !open;
  };
  const open = () => {
    html.classList.add("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    setHidden();
    const first = aside.querySelector(".sidenav__close") || aside.querySelector("a[href]");
    if (first) first.focus({ preventScroll: true });
  };
  const close = (refocus) => {
    if (!html.classList.contains("nav-open")) return;
    html.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    setHidden();
    if (refocus && toggle) toggle.focus({ preventScroll: true });
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-nav]");
    if (t && t.dataset.nav === "open") open();
    else if (t && t.dataset.nav === "close") close(true);
    else if (e.target.closest(".sidenav a, .sidenav__clear")) close(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
  setHidden();
})();
