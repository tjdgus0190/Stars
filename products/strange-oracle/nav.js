// 사이드바(메뉴) 동작 (2026-11-13). 문구·링크는 data-nav.js(window.NAV), 모양은 nav.css.
// - 안내·도구 페이지: gen-guide.js가 사이드바 HTML을 미리 써 둔다(검색 엔진이 링크를 읽게) → 여닫기만 붙인다.
// - 입구(index.html): 사이드바가 없으면 window.NAV로 그리고, 위 띠(.topbar__inner) 맨 앞에 ☰ 버튼을 끼운다.
// 입력값·분석 이벤트를 쓰지 않는다. (2026-11-13 v1-C) stardust.js(window.Dust)가 있으면 사이드바 머리에 별가루 잔액을 보이고, 얻을 때 짧은 알림을 띄운다.
(function () {
  const N = window.NAV;
  const html = document.documentElement;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  // 지금 주소와 같은 링크에 aria-current (짧은 주소·긴 주소 모두)
  const here = location.pathname.replace(/index\.html$/, "");
  const sameAs = (href) => {
    if (/^https?:/.test(href)) return false;
    if (href === here) return true;
    const m = here.match(/\/products\/strange-oracle\/guide\/([a-z0-9/-]+?)\/$/);
    return !!m && href === `/${m[1]}/`;
  };

  function build() {
    if (!N) return null;
    const aside = document.createElement("aside");
    aside.className = "sidenav";
    aside.id = "sidenav";
    aside.setAttribute("aria-label", N.open);
    aside.innerHTML = `<div class="sidenav__head"><a class="sidenav__brand" href="/products/strange-oracle/"><b>${esc(N.brand)}</b><small>${esc(N.brandSub)}</small></a>
      <button class="sidenav__close" type="button" data-nav="close" aria-label="${esc(N.close)}">×</button></div>` +
      N.groups.map((g) => `<nav class="sidenav__group" aria-label="${esc(g.head)}"><h2>${esc(g.head)}</h2><ul>${g.items.map((it) =>
        `<li><a href="${esc(it.href)}"${it.ext ? ' target="_blank" rel="noopener"' : ""}>${esc(it.label)}${it.ext ? '<span class="ext">↗</span>' : ""}${it.note ? `<small>${esc(it.note)}</small>` : ""}</a></li>`).join("")}</ul></nav>`).join("");
    document.body.append(aside);
    return aside;
  }

  let aside = document.getElementById("sidenav") || build();
  if (!aside) return;
  aside.querySelectorAll("a[href]").forEach((a) => { if (sameAs(a.getAttribute("href"))) a.setAttribute("aria-current", "page"); });
  let scrim = document.querySelector(".sidenav-scrim");
  if (!scrim) {
    scrim = document.createElement("div");
    scrim.className = "sidenav-scrim";
    scrim.dataset.nav = "close";
    document.body.append(scrim);
  }
  // 입구: 위 띠 맨 앞에 버튼
  let toggle = document.querySelector("[data-nav=open]");
  if (!toggle && N) {
    const bar = document.querySelector(".topbar__inner");
    if (bar) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "nav-toggle";
      toggle.dataset.nav = "open";
      toggle.setAttribute("aria-label", N.open);
      toggle.innerHTML = ICON;
      bar.prepend(toggle);
      bar.classList.add("has-nav");
    }
  }
  if (toggle) {
    toggle.setAttribute("aria-controls", "sidenav");
    toggle.setAttribute("aria-expanded", "false");
  }

  // ── 별가루: 사이드바 머리 잔액 + 얻을 때 알림 (문구 NAV.dust)
  const D = window.Dust, T = N && N.dust;
  if (D && T) {
    const head = aside.querySelector(".sidenav__head");
    const badge = document.createElement("a");
    badge.className = "dust-badge";
    badge.href = T.href;
    head.insertBefore(badge, head.querySelector(".sidenav__close"));
    const paint = () => { const st = D.state(); badge.innerHTML = `<i aria-hidden="true">✦</i><b>${st.bal}</b><small>${esc(T.unit)}</small>`; badge.setAttribute("aria-label", T.badgeLabel.replace("{n}", st.bal)); };
    document.addEventListener("dust:change", paint);
    let box = null, timer = 0;
    document.addEventListener("dust:gain", (e) => {
      const { kind, amt, capped } = e.detail || {};
      if (!box) { box = document.createElement("div"); box.className = "dust-toast"; box.setAttribute("role", "status"); document.body.append(box); }
      box.innerHTML = `<i aria-hidden="true">✦</i> <b>${esc(T.gain.replace("{n}", amt))}</b> <span>${esc((T.why && T.why[kind]) || "")}</span>${capped ? `<small>${esc(T.capped)}</small>` : ""}`;
      box.classList.remove("is-on");
      void box.offsetWidth;
      box.classList.add("is-on");
      clearTimeout(timer);
      timer = setTimeout(() => box.classList.remove("is-on"), 2600);
    });
    paint();
    D.visit();
  }

  const wide = window.matchMedia("(min-width: 1180px)");
  const setHidden = () => {
    const open = html.classList.contains("nav-open") || wide.matches;
    aside.setAttribute("aria-hidden", open ? "false" : "true");
    if ("inert" in aside) aside.inert = !open;
  };
  const open = () => {
    html.classList.add("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    setHidden();
    const first = aside.querySelector("a[href]");
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
    else if (e.target.closest(".sidenav a")) close(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
  if (wide.addEventListener) wide.addEventListener("change", setHidden);
  setHidden();
})();
