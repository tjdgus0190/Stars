// 안내 페이지·무료 도구 동작 (2026-11-13). 문구는 data-guide.js(window.GUIDE), 계산은 이미 검증된 saju.js(만세력)·astro.js(나크샤트라)를 그대로 쓴다.
// 개인정보(6장): 입력값은 이 페이지의 메모리에서만 계산하고 주소·쿠키·localStorage·sessionStorage·분석 이벤트·서버에 넣지 않는다.
//   분석 이벤트는 페이지 이름과 도구 이름만(허용 목록으로 강제, common/analytics.js).
(function () {
  const G = window.GUIDE;
  const CONF = window.GUIDE_PAGE || {}; // gen-guide.js가 페이지마다 넣는 { page, kind: "page"|"tool", ga4 }
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] == null ? "" : o[k]));
  const LG = window.LEGENDS; // 전설 기록 페이지에만 있다
  const PAGES = Object.keys(G.pages).concat(Object.keys(G.tools), Object.keys(G.apps || {}), LG ? ["legends"].concat(Object.keys(LG.list)) : []);
  const TOOLS = Object.keys(G.tools);

  // ── (v1-E) 콘텐츠별 바깥 광고: 착지 주소마다 캠페인 이름 c_<짧은 주소>(예: /rune-draw/ → c_rune_draw, /legends/rune-poisoned-horn/ → c_legends_rune_poisoned_horn)
  //   목록은 marketing/strange-oracle/ads-v1-landing.md와 같다. 값은 소문자·숫자·밑줄만(common/analytics.js가 모양을 다시 본다)
  const slugOf = (p) => "c_" + String(p).replace(/^\/|\/$/g, "").replace(/[\/-]/g, "_");
  const landPaths = [].concat(Object.values(G.pages), Object.values(G.tools), Object.values(G.apps || {})).map((d) => d.path)
    .concat(window.LEGENDS ? [window.LEGENDS.hub.path].concat(Object.values(window.LEGENDS.list).map((d) => d.path)) : ["/legends/"]);
  const LAND = ["#meta_id"].concat(landPaths.map(slugOf), ["reel_sibyl", "reel_rune", "reel_ogham", "reel_star", "reel_decan", "reel_tzolkin", "reel_saju", "ig_profile", "x_profile", "gads_main", "ad10_guides", "ad11_saju", "ad12_today", "ad13_talk", "kakao_channel", "ch_welcome", "ch_menu_today", "ch_menu_doors", "ch_menu_talk", "ch_menu_dust", "ch_menu_ny", "ch_auto"]); // (2026-11-14) 카카오톡 채널(환영 메시지·채팅방 메뉴·자동응답) // (2026-11-14) ad10_guides = 10안 「일곱 안내자」(처음 화면 착지)
  const CAMPAIGN = {
    utm_source: ["instagram", "tiktok", "kakao", "x", "google", "meta", "facebook", "fb", "ig", "threads", "naver", "youtube"],
    utm_medium: ["paid_social", "organic", "share", "cpc", "paid", "social", "cpm"],
    utm_campaign: LAND,
    utm_content: LAND,
  };
  // ── 분석(허용 목록 밖은 버림). query는 시작할 때 지운다(입력값은 애초에 주소에 없다)
  const A = window.Analytics;
  let on = false;
  if (A && CONF.ga4) {
    const search = location.search;
    if (search) history.replaceState(null, "", location.pathname + location.hash);
    on = A.init({ ga4: CONF.ga4, title: document.title, events: { so_guide_view: { page: PAGES }, so_guide_cta: { page: PAGES }, so_tool_result: { tool: TOOLS }, so_talk: { room: ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"], step: ["answer"] }, so_dust: { step: ["start", "done"] }, so_auth: { step: ["login", "fail", "logout"] }, so_pwa: { step: ["ask_app", "ask_web", "get_click", "install_click", "prompt_accept", "prompt_dismiss", "installed", "open_outside", "first_open", "open", "push_on", "push_off", "push_ask", "push_later"] } }, utm: { search, allow: CAMPAIGN, ignore: ["fbclid", "ttclid", "gclid"] } });
    if (on) A.track("so_guide_view", { page: CONF.page });
    const cookie = $("[data-js=cookie-line]");
    if (cookie && A.configured(CONF.ga4)) cookie.hidden = false;
  }
  const track = (n, p) => { if (on) A.track(n, p); };
  // (2026-11-15) 카카오 로그인 복귀(auth.html → 이 페이지 #login…): 로그인 단계 이름만 기록(6장 예외 3). 실패면 주소 조각만 지운다
  if (/^#login(-ch0?)?$/.test(location.hash)) track("so_auth", { step: "login" });
  if (location.hash === "#login-fail") { track("so_auth", { step: "fail" }); history.replaceState(null, "", location.pathname); }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-js=to-room]")) track("so_guide_cta", { page: CONF.page }); });


  // ── (v1-F) 처음 화면: 오늘의 신탁 카드에 오늘 담당 안내자(초상·이름)
  if (CONF.kind === "home") {
    const D = window.Dust, X = window.DEX, card = $("[data-js=home-today]");
    if (D && X && card && G.home) {
      const room = D.guideOf(), g = X.guides.find((x) => x.room === room);
      if (g) {
        card.style.setProperty("--art", `url('/products/strange-oracle/img/guide/${room}.webp')`);
        card.dataset.room = room;
        const sub = $("[data-js=home-today-sub]", card);
        if (sub) sub.textContent = fill(G.home.features.today.sub, { name: g.name });
      }
    }
    // (v1-G·2026-11-14 운영자) 처음 화면에서 체험 콘텐츠 카드를 누르면 카카오 로그인 안내(로그인해야 들어간다). 점술 안내·무료 도구는 누구나
    const LG = G.home.login;
    const loggedIn = () => { try { const x = JSON.parse(localStorage.getItem("strange-oracle-login") || "null"); return Boolean(x && /^[0-9a-f]{32}$/.test(x.sid) && x.exp > Date.now()); } catch (e) { return false; } };
    if (LG) document.addEventListener("click", (e) => {
      const a = e.target.closest(".gfeat[href]"); // (2026-11-14) 체험 콘텐츠 카드만 — 점술 안내·무료 도구는 누구나
      if (!a || loggedIn() || e.metaKey || e.ctrlKey || (LG.free || []).includes(a.getAttribute("href"))) return; // 로그인 없이 여는 카드(첫 번째 문·새해·오늘의 신탁)
      e.preventDefault();
      const href = a.getAttribute("href");
      const box = document.createElement("div");
      box.className = "glogin";
      box.innerHTML = `<div class="glogin__scrim" data-js="login-skip"></div><div class="glogin__card" role="dialog" aria-modal="true" aria-labelledby="glogin-h"><h2 id="glogin-h">${esc(LG.title)}</h2><p>${esc(LG.body)}</p>
        <button class="gbtn gbtn--kakao" type="button" data-js="login-go">${esc(LG.go)}</button><button class="glink" type="button" data-js="login-skip">${esc(LG.close)}</button><small>${esc(LG.note)}</small></div>`;
      document.body.append(box);
      box.querySelector("[data-js=login-go]").focus();
      box.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-js=login-skip]")) { box.remove(); return; }
        if (ev.target.closest("[data-js=login-go]")) {
          const b = new Uint8Array(16); crypto.getRandomValues(b);
          const st = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
          const from = { "/talk/": "talk", "/today/": "today", "/dex/": "dex", "/stardust/": "stardust", "/me/": "me", "/products/strange-oracle/": "hub", "/products/strange-oracle/#ny-hub": "ny" }[href] || "home"; // (2026-11-14) 누른 카드로 바로 이어진다: 일곱 개의 문 → 입구, 신년운세 배너 → 새해의 회랑
          try { sessionStorage.setItem("strange-oracle-kakao", JSON.stringify({ s: st, mode: "login", from, prod: "book" })); } catch (x) { location.href = href; return; }
          location.href = "/api/auth/kakao/start?state=" + st;
        }
      });
      document.addEventListener("keydown", function esc1(ev) { if (ev.key === "Escape") { box.remove(); document.removeEventListener("keydown", esc1); } });
    });
    return;
  }

  // ───────── (v1-C) 점술관의 하루: 오늘의 신탁 · 안내자 도감 · 별가루 ─────────
  // 별가루 계산·저장은 stardust.js(window.Dust). 이 기기 localStorage에 번호·이름만 둔다(입력값 없음)
  if (CONF.kind === "app") {
    const D = window.Dust, NV = (window.NAV && window.NAV.dust) || {}, COST = NV.cost || {};
    const box = $("[data-js=app]");
    const P = G.apps[CONF.page];
    if (!D || !box) return;
    const ROOM_URL = "/products/strange-oracle/";

    // ── (v1-D) 카카오 로그인 표·충전한 별가루 (입구 app.js와 같은 저장 키). 로그인 표는 무작위 값(입력값 아님)
    const LOGIN_KEY = "strange-oracle-login", KAKAO_KEY = "strange-oracle-kakao";
    const readLogin = () => { try { const x = JSON.parse(localStorage.getItem(LOGIN_KEY) || "null"); return x && /^[0-9a-f]{32}$/.test(x.sid) && x.exp > Date.now() ? x : null; } catch (e) { return null; } };
    const dropLogin = () => { try { localStorage.removeItem(LOGIN_KEY); } catch (e) { /* 무시 */ } };
    const hex32 = () => { const b = new Uint8Array(16); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); };
    const post = async (url, body) => {
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", credentials: "omit" }); let j = null; try { j = await r.json(); } catch (e) { j = null; }
        // 계정 별가루가 바뀌면 위 띠 잔액도 함께(nav.js)
        if (url === "/api/auth/dust" && r.status === 200 && j && Number.isInteger(j.bal)) { try { document.dispatchEvent(new CustomEvent("dust:acct", { detail: { bal: j.bal } })); } catch (e) { /* 무시 */ } }
        return { status: r.status, j };
      } catch (e) { return { status: 0, j: null }; }
    };
    // 카카오 로그인 시작: 돌아오면 입구가 표를 받아(로그인 유지) 이 별가루 페이지로 다시 보낸다
    const kakaoLogin = (from = "stardust", ch = false) => {
      const st = hex32();
      try { sessionStorage.setItem(KAKAO_KEY, JSON.stringify(Object.assign({ s: st, mode: "login", from, prod: "book" }, ch ? { ch: true } : {}))); } catch (e) { return; }
      location.href = "/api/auth/kakao/start?state=" + st + (ch ? "&ch=1" : ""); // ch: 카카오톡 채널 추가 상태를 묻는 추가 동의(이 버튼을 누를 때만)
    };
    let paidBal = null; // 카카오 계정 별가루(서버 값, 화면 메모리만)
    let onExpired = () => {}; // 로그인이 끝났을 때(401) — 로그인 안내로
    const loadPaid = async () => {
      const lg = readLogin();
      if (!lg) { paidBal = null; return null; }
      // (2026-11-15 성능) 위 띠(nav.js)가 막 받아 둔 잔액이 있으면 그걸 쓴다(처음 한 번만)
      const first = window.SO_ACCT_FIRST;
      window.SO_ACCT_FIRST = null;
      const pre = first ? await first : null;
      const r = pre && pre.sid === lg.sid && pre.status !== 0 ? pre : await post("/api/auth/dust", { sid: lg.sid });
      if (r.status === 401) { dropLogin(); paidBal = null; onExpired(); return null; }
      paidBal = r.status === 200 && r.j && Number.isInteger(r.j.bal) ? r.j.bal : null;
      acctOnce = r.j && Array.isArray(r.j.once) ? r.j.once : [];
      acctView = r.j || null;
      // (2026-11-14) 이 기기에 남은 예전 도감 카드(방을 끝까지 지난 기록)를 계정 도감으로 옮겨 적는다
      if (acctView && Array.isArray(acctView.rooms)) {
        let local = [];
        try { const st = D.state(); local = [...new Set([].concat(st.rooms || [], st.cards || []))]; } catch (e) { local = []; }
        for (const room of local.filter((x) => !acctView.rooms.includes(x))) {
          const w = await post("/api/auth/dust", { sid: lg.sid, room });
          if (w.status === 200 && w.j && Array.isArray(w.j.rooms)) acctView = w.j;
        }
      }
      // (2026-11-14 운영자) 별가루는 로그인한 계정에만: 첫 로그인 10(계정에 한 번, 서버가 센다)
      if (paidBal != null && !acctOnce.includes("first")) await earnAcct("first");
      acctEvt();
      return paidBal;
    };
    let acctOnce = [], acctView = null;
    const acctEvt = () => { try { document.dispatchEvent(new CustomEvent("dust:acct", { detail: { bal: paidBal } })); } catch (e) { /* 무시 */ } };
    // 계정에 별가루 받기(first·oracle·seal) → 받은 양 알림
    const earnAcct = async (kind) => {
      const lg = readLogin();
      if (!lg) return 0;
      const r = await post("/api/auth/dust", { sid: lg.sid, earn: kind });
      if (r.status === 401) { dropLogin(); paidBal = null; return 0; }
      if (r.status !== 200 || !r.j) return 0;
      paidBal = r.j.bal;
      acctOnce = r.j.once || acctOnce;
      acctView = r.j;
      if (r.j.added) { try { document.dispatchEvent(new CustomEvent("dust:gain", { detail: { kind, amt: r.j.added } })); } catch (e) { /* 무시 */ } }
      acctEvt();
      return r.j.added || 0;
    };
    // 계정 별가루 쓰기(extra 3 · story 10) → true | { need }
    const useAcct = async (what) => {
      const lg = readLogin();
      if (!lg) return { login: true };
      const r = await post("/api/auth/dust", { sid: lg.sid, use: what });
      if (r.status === 401) { dropLogin(); paidBal = null; return { login: true }; }
      if (r.status === 402) return { need: (r.j && r.j.need) || 0 };
      if (r.status !== 200 || !r.j) return { fail: true };
      paidBal = r.j.bal;
      acctEvt();
      return true;
    };
    const acct = () => (paidBal == null ? 0 : paidBal);
    // (2026-11-16 운영자 "열리고 닫히는 게 딱딱") 창이 닫힐 때 스르륵 — is-leave를 붙이고 잠깐 기다린 뒤 지운다. 움직임 줄이기 설정이면 바로
    const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const leave = (el, ms = 280) => new Promise((ok) => { if (!el || calm) return ok(); el.classList.add("is-leave"); setTimeout(ok, ms); });
    // (2026-11-16 운영자) 충전 칸을 별가루 페이지와 심층상담(아래에서 올라오는 창)이 함께 쓴다. root 안의 [data-js=dust-shop]에 그린다
    //   opts: { to: "dust"|"talk" 결제 뒤 돌아갈 곳, from: 로그인 출발 페이지, beforePay(), onCredited(응답) }
    function makeShop(root, opts = {}) {
      // ── 충전 (운영 규칙 7장): 결제 전에 받는 것·가격·환불·판매자를 보이고, 동의 체크 뒤에만 결제창
      const SA = G.apps.stardust.app, S = SA.shop || {};
      const shopOn = SA.shopMode === "live" || SA.shopMode === "test";
      const PEND_KEY = "strange-oracle-dustpay"; // 이 탭 sessionStorage: 결제 요청 번호 R(무작위)·상품·받은 결제 코드
      const readPend = () => { try { const x = JSON.parse(sessionStorage.getItem(PEND_KEY) || "null"); return x && /^[0-9a-f]{32}$/.test(x.r) && S.packs.some((k) => k.prod === x.prod) ? x : null; } catch (e) { return null; } };
      const writePend = (x) => { try { if (x) sessionStorage.setItem(PEND_KEY, JSON.stringify(x)); else sessionStorage.removeItem(PEND_KEY); } catch (e) { /* 무시 */ } };
      let pick = null, shopMsg = "", shopBusy = false, showRetry = false;
      const won = (n) => Number(n).toLocaleString("ko-KR");
      function drawShop() {
        const el = root.querySelector("[data-js=dust-shop]");
        if (!el || !shopOn) return;
        const lg = readLogin();
        let h = `<section class="gshop"><h2>${esc(S.head)}</h2><p class="gnote">${esc(S.lead)}</p>`;
        if (!lg) {
          h += `<div class="gactions"><button class="gbtn gbtn--kakao" type="button" data-js="dust-login">${esc(S.login)}</button></div><p class="gnote gcenter">${esc(S.loginNote)}</p>`;
        } else {
          const k = S.packs.find((x) => x.prod === pick);
          // (2026-11-14) 상점처럼: 묶음마다 카드(결정 아이콘 무더기 · ×개수 · 덤 · 이름 · 값)
          const DI = (n) => `<img src="/products/strange-oracle/img/stardust.webp" alt="" class="gpack__i${n}">`;
          h += `<ul class="gpacks">${S.packs.map((x, i) => `<li><button type="button" class="gpack" data-js="dust-pack" data-prod="${x.prod}" aria-pressed="${pick === x.prod}"><span class="gpack__art">${[...Array(i + 1)].map((_, j) => DI(j)).join("")}<b class="gpack__qty">×${x.base || x.n}</b>${x.bonus ? `<em class="gpack__bonus">${esc(fill(S.bonus, { n: x.bonus }))}</em>` : ""}</span><span class="gpack__name">${esc(fill(S.packName || S.pack, { n: x.base || x.n }))}</span><span class="gpack__price">${esc(fill(S.price, { price: won(x.price) }))}</span></button></li>`).join("")}</ul>
            <p class="gsummary">${esc(S.summary)}</p>
            <details class="gfold"><summary>${esc(S.more)}</summary><ul class="gsources">${S.terms.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p class="gnote"><a href="/products/strange-oracle/legal/terms.html#s2-4">${esc(S.termsLink)}</a></p></details>
            <label class="gcheck"><input type="checkbox" data-js="dust-agree" />${esc(S.agree)}</label>
            <div class="gactions"><button class="gbtn" type="button" data-js="dust-buy"${shopBusy ? " disabled" : ""}>${esc(k ? fill(S.buy, { price: won(k.price), n: k.n }) : S.pick)}</button></div>`;
        }
        h += `<p class="gnote gcenter" data-js="dust-msg" role="status">${esc(shopMsg)}</p>${showRetry ? `<div class="gactions"><button class="gbtn ghost" type="button" data-js="dust-retry">${esc(S.retry)}</button></div>` : ""}</section>`;
        el.innerHTML = h;
      }
      const say = (m, retry) => { shopMsg = m || ""; showRetry = Boolean(retry); drawShop(); };
      // 결제창 설정은 입구와 같은 data.js(결제대행 아이디·SDK 주소)에서 — 누를 때만 받는다
      let cfg = null;
      const loadCfg = () => cfg || (cfg = new Promise((ok, no) => {
        if (window.TEXT) return ok(window.TEXT);
        const sc = document.createElement("script");
        sc.src = "/products/strange-oracle/data.js";
        sc.onload = () => (window.TEXT ? ok(window.TEXT) : no(new Error("cfg")));
        sc.onerror = () => { cfg = null; no(new Error("cfg")); };
        document.head.append(sc);
      }));
      const loadSdk = (src) => new Promise((ok, no) => {
        if (window.PayApp) return ok();
        const sc = document.createElement("script");
        sc.src = src;
        sc.onload = () => (window.PayApp ? ok() : no(new Error("sdk")));
        sc.onerror = () => no(new Error("sdk"));
        document.head.append(sc);
      });
      async function startBuy() {
        const k = S.packs.find((x) => x.prod === pick);
        if (!k || shopBusy) return;
        shopBusy = true;
        const r = hex32();
        writePend({ r, prod: k.prod }); // 결제창을 열기 전에 저장(돌아와서 이 번호로 확인)
        try {
          const T = await loadCfg();
          const PAY = T.pay || {}, PA = PAY.payapp || {};
          if (PAY.mode !== "live" && PAY.mode !== "test") throw new Error("off");
          await loadSdk(PA.sdk);
          const o = location.origin; // 결제 통보·복귀는 이 페이지를 내준 배포의 함수로(시험 배포에서도 새 상품을 아는 함수가 받게)
          const P = window.PayApp;
          P.setDefault("userid", PA.userid);
          P.setDefault("shopname", PA.shopname || "");
          const v = { goodname: k.goodname, price: String(k.price), feedbackurl: `${o}/api/pay/feedback`, returnurl: `${o}/api/pay/return?to=${opts.to === "talk" ? "talk" : "dust"}`, var1: r, var2: k.tag, openpaytype: PA.openpaytype, checkretry: "y", smsuse: "n", skip_cstpage: "y", redirectpay: "1" };
          Object.keys(v).forEach((x) => P.setParam(x, v[x]));
          if (typeof P.setTarget === "function") P.setTarget("_self");
          track("so_dust", { step: "start" });
          if (opts.beforePay) opts.beforePay(); // (2026-11-16) 심층상담: 돌아와서 이어 갈 방·적던 질문을 이 탭에 잠깐
          P.payrequest();
        } catch (e) {
          shopBusy = false;
          writePend(null);
          say(e && e.message === "off" ? S.off : S.sdkFail);
        }
      }
      // 돌아와서: R로 결제 확인(2초마다 30초) → 결제 코드 → 카카오 계정에 충전(한 번만)
      async function settle() {
        const pend = readPend();
        if (!pend) return;
        const lg = readLogin();
        if (!lg) return say(S.session);
        say(S.waiting);
        let code = pend.pass || null;
        for (let i = 0; !code && i < 15; i++) {
          const r = await post("/api/pay/status", { r: pend.r });
          if (r.status === 200 && r.j && r.j.state === "paid" && r.j.pass) { code = r.j.pass; break; }
          if (r.status === 200 && r.j && r.j.state === "cancelled") { writePend(null); return say(S.cancelled); }
          await new Promise((ok) => setTimeout(ok, 2000));
        }
        if (!code) return say(S.late, true);
        writePend({ r: pend.r, prod: pend.prod, pass: code });
        const c = await post("/api/auth/dust", { sid: lg.sid, pass: code });
        if (c.status === 200 && c.j) {
          writePend(null);
          paidBal = c.j.bal;
          acctEvt();
          if (opts.onCredited) opts.onCredited(c.j);
          if (c.j.state === "credited") track("so_dust", { step: "done" });
          return say(c.j.state === "already" ? S.already : fill(S.credited, { n: c.j.n }));
        }
        if (c.status === 401) { dropLogin(); return say(S.session); }
        if (c.status === 409) { writePend(null); return say(S.used); }
        say(S.late, true);
      }
      root.addEventListener("click", (e) => {
        const t = e.target;
        if (t.closest("[data-js=dust-login]")) return kakaoLogin(opts.from || "stardust");
        const pk = t.closest("[data-js=dust-pack]");
        if (pk) { const ag = root.querySelector("[data-js=dust-agree]"); const keep = ag && ag.checked; pick = pk.dataset.prod; shopMsg = ""; drawShop(); const ag2 = root.querySelector("[data-js=dust-agree]"); if (ag2) ag2.checked = keep; return; }
        if (t.closest("[data-js=dust-retry]")) return settle();
        if (t.closest("[data-js=dust-buy]")) {
          if (!pick) return say(S.pick);
          if (!root.querySelector("[data-js=dust-agree]").checked) return say(S.agreeNudge);
          return startBuy();
        }
      });
      return { draw: drawShop, settle, pending: () => Boolean(readPend()), on: shopOn };
    }


    // ── (v1-F) 안내자 그림(아치 문 + 실루엣 + 방 명화)·방 데이터 불러오기
    const DEXG = () => (window.DEX && window.DEX.guides) || [];
    const guide = (room) => DEXG().find((g) => g.room === room);
    const IMG = (room) => `/products/strange-oracle/img/dex/dex-${room}.webp`;
    // (2026-11-14) 아치 문 안은 안내자 초상(img/guide/, 어둡게 다듬은 그림). 작은 얼굴(xs)은 눈높이(FACE_Y, 그림 높이 비율)에 맞춰 확대
    // 받침에 맞춘 조사(이/가)
    const iga = (w) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? "이" : "가"; };
    const PORT = (room) => `/products/strange-oracle/img/guide/${room}.webp`;
    const FACE_Y = { saju: 0.23, ogham: 0.34, star: 0.35, decan: 0.28, tzolkin: 0.5, rune: 0.2, sibyl: 0.22 };
    const arch = (room, cls = "") => `<span class="garch ${cls}" style="--art:url('${PORT(room)}');--fy:${Math.round(Math.min(1, Math.max(0, 2 * (FACE_Y[room] || 0.3) - 0.5)) * 100)}%" aria-hidden="true"></span>`;
    const ROOM_DATA = {
      saju: ["data-saju.js", () => window.SAJU && window.SAJU.stems],
      ogham: ["data-ogham.js", () => window.OGHAM],
      star: ["data-stars.js", () => window.NAKSHATRAS],
      decan: ["data-decans.js", () => window.DECANS],
      tzolkin: ["data-tzolkin.js", () => window.TZOLKIN_SIGNS],
      rune: ["data-runes.js", () => window.RUNES],
      sibyl: ["data-oracles.js", () => window.ORACLES],
    };
    const loading = {};
    const loadRoom = (room) => loading[room] || (loading[room] = new Promise((ok, no) => {
      const [file, get] = ROOM_DATA[room];
      if (get()) return ok(get());
      const sc = document.createElement("script");
      sc.src = "/products/strange-oracle/" + file;
      sc.onload = () => (get() ? ok(get()) : no(new Error("data")));
      sc.onerror = () => { delete loading[room]; no(new Error("data")); };
      document.head.append(sc);
    }));
    // 방 항목 하나 → 화면 조각 (무료 칸만: 제목·핵심 문장·기호)
    const itemView = (room, list, i) => {
      const x = list[i] || {};
      const kw = Array.isArray(x.keywords) ? x.keywords.slice(0, 3) : x.keyword ? [x.keyword] : [];
      const act = x.advice && x.advice.title ? x.advice.title : "";
      // (2026-11-14) 오늘의 결(조언 문단)·전승 이야기 — 정적 파일에 있는 무료 문구만 쓴다
      const sm = x.summary, flow = Array.isArray(sm) ? sm[1] || sm[0] : sm && typeof sm === "object" ? sm.now : "";
      const lore = x.fact || (x.identity && x.identity.lede) || "";
      const base = { kw, act, key: x.key, flow: flow || "", lore };
      if (room === "saju") return Object.assign(base, { mark: x.hanja, name: x.name, sub: x.title });
      if (room === "ogham") return Object.assign(base, { mark: x.glyph, name: `${x.name} · ${x.latin}`, sub: x.title, rune: true });
      if (room === "star") return Object.assign(base, { mark: i + 1, name: x.name, sub: x.title, num: true });
      if (room === "decan") return Object.assign(base, { mark: i + 1, name: `${x.sign} ${G.ui.decanPart.replace("{n}", x.part)}`, sub: x.title, num: true });
      if (room === "tzolkin") return Object.assign(base, { mark: i + 1, name: x.name, sub: x.title, num: true });
      if (room === "rune") return Object.assign(base, { mark: x.glyph, name: `${x.name} · ${x.latin}`, sub: x.keyword, kw: [], rune: true });
      return Object.assign(base, { quote: x.line, name: x.title });
    };
    const ACT = (P && P.app && P.app.act) || "";
    const readCard = (room, v, head) => `<article class="gread" style="--art:url('${IMG(room)}')">${head ? `<small class="gread__head">${esc(head)}</small>` : ""}
      ${v.quote ? `<blockquote class="gscroll">${esc(v.quote)}</blockquote>` : `<span class="gread__mark${v.num ? " num" : ""}${v.rune ? " rune" : ""}">${esc(v.mark)}</span>`}
      <b>${esc(v.name)}</b>${v.sub ? `<em>${esc(v.sub)}</em>` : ""}${v.kw.length ? `<span class="gread__kw">${v.kw.map((k) => `<i>${esc(k)}</i>`).join("")}</span>` : ""}<p>${esc(v.key)}</p>${v.flow && P.app && P.app.flowHead ? `<h3 class="gread__h">${esc(P.app.flowHead)}</h3><p>${esc(v.flow)}</p>` : ""}${v.act && ACT ? `<p class="gread__act"><small>${esc(ACT)}</small>${esc(v.act)}</p>` : ""}${v.lore && P.app && P.app.loreHead ? `<details class="gread__lore"><summary>${esc(P.app.loreHead)}</summary><p>${esc(v.lore)}</p></details>` : ""}</article>`;

    // ── (2026-11-14 운영자) 체험 콘텐츠는 카카오 로그인 뒤: 로그인 표가 없으면 안내만 보인다(아래 설명·자주 묻는 질문은 그대로)
    const GATE = window.NAV && window.NAV.gate && window.NAV.gate.on ? window.NAV.gate : null;
    const showGate = () => {
      const T = Object.assign({ title: GATE.title, body: GATE.body }, (GATE.pages || {})[CONF.page] || {});
      const art = CONF.page === "stardust" ? `<img class="ggate__dust" src="/products/strange-oracle/img/stardust.webp" alt="" width="96" height="96">` : ["saju", "sibyl", "rune"].map((r) => arch(r, "garch--sm")).join("");
      box.innerHTML = `<div class="ggate"><div class="ggate__arches" aria-hidden="true">${art}</div><h2>${esc(T.title)}</h2><p>${esc(T.body)}</p><button class="gbtn gbtn--kakao" type="button" data-js="gate-login">${esc(GATE.go)}</button><small>${esc(GATE.note)}</small></div>`;
      document.documentElement.classList.remove("room-open", "sheet-open");
    };
    if (GATE) box.addEventListener("click", (e) => { if (e.target.closest("[data-js=gate-login]")) kakaoLogin(CONF.page); });
    const GATE_ON = GATE && !(GATE.free || []).includes(CONF.page); // (2026-11-14) 오늘의 신탁은 로그인 없이(출석 별가루·다른 안내자는 로그인 뒤)
    if (GATE_ON && !readLogin()) { showGate(); return; }
    onExpired = () => { if (GATE_ON) showGate(); };

    if (CONF.page === "today") {
      const A = P.app;
      const pickAny = (room) => window.Calc.pickOracle((ROOM_DATA[room][1]() || []).length || 1);
      // (2026-11-16 맞춤 1단계) 그 방에서 받은 내 결과가 있으면 오늘의 신탁을 내 결과로 읽는다(이 탭 기록 · 카카오에 저장한 기록). 결과 번호만 쓴다
      const I = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
      let mine = {};
      try { mine = (JSON.parse(sessionStorage.getItem("strange-oracle") || "null") || {}).visits || {}; } catch (e) { mine = {}; }
      const lg0 = readLogin();
      const mineReady = lg0 && lg0.consent === true
        ? post("/api/auth/me", { sid: lg0.sid }).then((r) => { const v = r.status === 200 && r.j && r.j.data && r.j.data.v; if (v && typeof v === "object") mine = Object.assign({}, v, mine); }).catch(() => {})
        : Promise.resolve();
      const myIdx = (room) => {
        const v = mine[room];
        if (!v) return null;
        if (room === "saju") return I(v.code, 1, 5000) ? Math.floor((v.code - 1) / 500) : null;
        if (room === "ogham") return I(v.ogham, 0, 19) ? v.ogham : null;
        if (room === "star") return I(v.nak, 0, 26) ? v.nak : null;
        if (room === "decan") return I(v.decan, 0, 35) ? v.decan : null;
        if (room === "tzolkin") return I(v.sign, 0, 19) ? v.sign : null;
        if (room === "sibyl") return I(v.sors, 0, 31) ? v.sors : null;
        if (room === "rune" && Array.isArray(v.picks) && v.picks.length) { const L = ROOM_DATA.rune[1]() || []; const day = Number(D.kstDay().slice(-2)) || 0; const i = L.findIndex((x) => x.code === v.picks[day % v.picks.length]); return i >= 0 ? i : null; }
        return null;
      };
      const pick = (room) => { const i = myIdx(room); return i == null ? pickAny(room) : i; };
      const mineLine = (room, idx) => (myIdx(room) === idx ? `<p class="gnote gcenter gmine">${esc(fill(A.mineNote, { room: guide(room).roomName }))}</p>` : "");
      const [, mm, dd] = D.kstDay().split("-").map(Number);
      const nextRoom = D.TODAY_ORDER[(D.TODAY_ORDER.indexOf(D.guideOf()) + 1) % 7];
      let busy = false, msg = "", fresh = ""; // fresh: 방금 받은 카드(main · 방 이름) — 그 카드만 스르륵 떠오른다
      const draw = () => {
        const room = D.guideOf(), g = guide(room), st = D.state();
        const o = st.oracle && st.oracle.day === D.kstDay() && st.oracle.room === room ? st.oracle : null;
        let h = `<section class="gtoday-hero" style="--art:url('${IMG(room)}')">${arch(room, "garch--lg")}
          <p class="gchip">${esc(A.chip)} · ${esc(fill(A.dateFmt, { m: mm, d: dd }))}</p><h2>${esc(g.name)}</h2><p class="gtoday-hero__epi">${esc(g.epithet)}</p>
          <p class="gtoday-hero__intro">${esc(g.today.intro)}</p>`;
        if (!o) h += `<p class="gnote gcenter gmine">${esc(mine[room] ? fill(A.mineHint, { name: g.name, iga: iga(g.name), room: g.roomName }) : fill(A.notMineHint, { room: g.roomName }))}</p>`;
        if (!o) h += `<button class="gbtn" type="button" data-js="today-open"${busy ? " disabled" : ""}>${esc(g.today.open)}</button><small class="gnote gcenter">${esc(readLogin() ? A.reward : A.rewardLogin)}</small>${readLogin() ? "" : `<button class="glink" type="button" data-js="today-login">${esc(A.login)}</button>`}`;
        h += `</section>`;
        if (o) {
          const list = ROOM_DATA[room][1]();
          if (list) h += readCard(room, itemView(room, list, o.idx), fill(A.receivedHead, { name: g.name })).replace('class="gread"', `class="gread${fresh === "main" ? " is-new" : ""}" data-js="read-${room}"`) + mineLine(room, o.idx);
          // (2026-11-14 로그인 벽 완화) 로그인 없이 받은 사람: 출석 별가루·다른 안내자는 로그인 뒤
          if (!readLogin()) h += `<div class="gactions gcol"><small class="gnote gcenter">${esc(A.rewardLogin)}</small><button class="gbtn gbtn--kakao" type="button" data-js="today-login">${esc(A.login)}</button></div>`;
          const others = D.TODAY_ORDER.filter((r) => r !== room);
          const got = o.extra || [];
          const need = readLogin() ? (COST.extra || 0) - acct() : 0, noLogin = !readLogin();
          h += got.map((x) => { const l = ROOM_DATA[x.room][1](); return l ? readCard(x.room, itemView(x.room, l, x.idx), fill(A.receivedHead, { name: guide(x.room).name })).replace('class="gread"', `class="gread${fresh === x.room ? " is-new" : ""}" data-js="read-${x.room}"`) + mineLine(x.room, x.idx) : ""; }).join("");
          h += `<section class="gothers"><h2>${esc(A.othersHead)}</h2><p class="gnote">${esc(fill(A.othersNote, { cost: COST.extra }))}${need > 0 ? " · " + esc(fill(A.othersShort, { need })) : ""}</p>
            <ul class="gpickrow">${others.map((r) => { const done = got.some((x) => x.room === r); return `<li><button type="button" data-js="today-extra" data-room="${r}"${done || need > 0 || busy || noLogin ? " disabled" : ""}${done ? ' aria-pressed="true"' : ""}>${arch(r, "garch--sm")}<span>${esc(guide(r).name)}</span></button></li>`; }).join("")}</ul></section>`;
          h += `<p class="gnote gcenter">${esc(fill(A.tomorrow, { name: guide(nextRoom).name, iga: iga(guide(nextRoom).name) }))}</p><div class="gactions"><a class="gbtn ghost" href="${ROOM_URL}" data-js="to-room">${esc(fill(A.toRoom, { room: g.roomName }))}</a></div>`;
        }
        if (msg) h += `<p class="gerror" role="alert">${esc(msg)}</p>`;
        box.innerHTML = h;
        if (fresh) { const c = box.querySelector(`[data-js=read-${fresh === "main" ? room : fresh}]`); fresh = ""; if (c) c.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" }); }
      };
      box.addEventListener("click", async (e) => {
        if (e.target.closest("[data-js=today-login]")) return kakaoLogin("today");
        const openB = e.target.closest("[data-js=today-open]"), ex = e.target.closest("[data-js=today-extra]");
        if ((!openB && !ex) || busy) return;
        busy = true; msg = "";
        try {
          if (openB) {
            const room = D.guideOf();
            await Promise.all([loadRoom(room), mineReady]);
            D.oracleToday(pick);
            fresh = "main";
            // (2026-11-14) 카카오 로그인한 채 받으면 별가루를 계정에 쌓는다(하루 한 번, 서버가 센다) — 책·신년운세에도 쓸 수 있게. 아니면 이 기기에
            // (2026-11-14 운영자) 출석 별가루 +5는 카카오 로그인한 계정에만(하루 한 번, 서버가 센다)
            await earnAcct("oracle");
            track("so_tool_result", { tool: "today" });
          } else {
            const room = ex.dataset.room;
            if (!readLogin()) { busy = false; return kakaoLogin("today"); }
            await Promise.all([loadRoom(room), mineReady]);
            const u = await useAcct("extra");
            if (u === true) { D.oracleExtra(room, pick, 0); fresh = room; }
            else if (u.login) { busy = false; return kakaoLogin("today"); }
            else if (u.need) msg = fill(A.othersShort, { need: u.need });
            else msg = A.fail;
          }
        } catch (x) { msg = A.fail; }
        busy = false;
        draw();
      });
      document.addEventListener("dust:change", () => { if (!busy) draw(); });
      // 이미 받은 날이면 그 방 파일들을 불러와 다시 그린다
      const st0 = D.state();
      if (st0.oracle && st0.oracle.day === D.kstDay() && st0.oracle.room) {
        Promise.all([st0.oracle.room].concat((st0.oracle.extra || []).map((x) => x.room)).map((r) => loadRoom(r).catch(() => null))).then(draw);
      }
      draw();
      loadPaid().then(() => { if (!busy) draw(); });
      mineReady.then(() => { if (!busy) draw(); }); // 카카오에 저장한 결과가 오면 안내 한 줄을 다시
    }

    if (CONF.page === "dex") {
      const X = window.DEX, U = X.ui;
      let openRoom = null;
      const draw = () => {
        // (2026-11-14) 카드·펼친 이야기는 카카오 계정 기록(방 완주를 서버가 안다)
        const st = { cards: (acctView && acctView.rooms) || [], open: (acctView && acctView.stories) || [] };
        const all = st.cards.length === X.guides.length;
        const cards = X.guides.map((g) => {
          const has = st.cards.includes(g.room);
          return `<li><button type="button" class="gdexcard${has ? "" : " is-locked"}" data-js="dex-card" data-room="${g.room}">${arch(g.room, "garch--md")}<small>${esc(g.roomName)}</small><b>${esc(has ? g.name : U.locked)}</b>${has ? `<span>${esc(g.epithet)}</span>` : `<span>${esc(fill(U.lockedHint, { room: g.roomName }))}</span>`}</button></li>`;
        }).join("");
        const sealNote = all ? (readLogin() ? (acctOnce.includes("seal") ? U.sealGot : U.sealWorking) : U.sealLogin) : U.sealReward;
        let h = `<div class="gseal${all ? " is-open" : ""}"><b>${esc(U.sealHead)} · ${esc(fill(U.count, { n: st.cards.length }))}</b>${all ? `<p>${esc(U.sealText)}</p>` : ""}<small>${esc(sealNote)}</small>${all && !readLogin() ? `<button class="glink" type="button" data-js="dex-login">${esc(U.login)}</button>` : ""}</div><ul class="gdexgrid">${cards}</ul>`;
        if (openRoom) {
          const g = guide(openRoom), has = st.cards.includes(g.room), open = st.open.includes(g.room), need = readLogin() ? (COST.story || 0) - acct() : 0;
          const tr = Object.entries(U.traitHeads).map(([k, hd]) => `<dt>${esc(hd)}</dt><dd>${esc(g.traits[k])}</dd>`).join("");
          h += `<div class="gsheet" role="dialog" aria-modal="true" aria-label="${esc(g.name)}"><div class="gsheet__scrim" data-js="dex-close"></div><div class="gsheet__body" style="--art:url('${IMG(g.room)}')">
            <button class="gsheet__x" type="button" data-js="dex-close" aria-label="${esc(G.home.login.close)}">×</button>${arch(g.room, "garch--lg")}
            <small class="gchip">${esc(g.roomName)} · ${esc(g.place)}</small><h2>${esc(has ? g.name : U.locked)}</h2>`;
          if (has) {
            h += `<p class="gtoday-hero__epi">${esc(g.epithet)}</p><q class="gline">${esc(g.line)}</q><dl class="gkv">${tr}</dl>
              <div class="gcard__secret${open ? "" : " is-shut"}"><h3>${esc(U.secretHead)}</h3>${open ? `<p>${esc(g.secret)}</p>` : `<button class="gbtn ghost" type="button" data-js="dex-open" data-room="${g.room}"${need > 0 ? " disabled" : ""}>${esc(fill(U.secretOpen, { cost: COST.story }))}</button>${need > 0 ? `<p class="gnote">${esc(fill(U.secretShort, { need }))}</p>` : ""}${readLogin() ? "" : `<p class="gnote">${esc(U.secretLogin)}</p>`}`}</div>`;
          } else {
            h += `<p class="gnote gcenter">${esc(fill(U.lockedHint, { room: g.roomName }))}</p><div class="gactions"><a class="gbtn" href="${ROOM_URL}" data-js="to-room">${esc(fill(U.toRoom, { room: g.roomName }))}</a></div>`;
          }
          h += `</div></div>`;
        }
        box.innerHTML = h;
        document.documentElement.classList.toggle("sheet-open", Boolean(openRoom));
      };
      const closeDex = () => { if (!openRoom) return; const sh = box.querySelector(".gsheet"); openRoom = null; return leave(sh).then(draw); };
      window.addEventListener("popstate", () => { if (openRoom) closeDex(); });
      box.addEventListener("click", (e) => {
        const c = e.target.closest("[data-js=dex-card]");
        if (c) { openRoom = c.dataset.room; history.pushState({ soDex: openRoom }, ""); return draw(); } // (2026-11-16) 휴대폰 뒤로 가기 = 시트 닫기
        if (e.target.closest("[data-js=dex-close]")) { if (!openRoom) return; if (history.state && history.state.soDex) return history.back(); return closeDex(); }
        if (e.target.closest("[data-js=dex-login]")) return kakaoLogin("dex");
        const b = e.target.closest("[data-js=dex-open]");
        if (b) {
          if (!readLogin()) return kakaoLogin("dex");
          b.disabled = true;
          const lg = readLogin();
          post("/api/auth/dust", { sid: lg.sid, use: "story", room: b.dataset.room }).then((r) => { if (r.status === 200 && r.j) { paidBal = r.j.bal; acctView = r.j; acctEvt(); } draw(); });
        }
      });
      // 일곱 장을 모두 모으면 금빛 봉인 별가루 +30(계정에 한 번)
      const sealCheck = async () => {
        if (acctView && (acctView.rooms || []).length === X.guides.length && readLogin() && !acctOnce.includes("seal")) { await earnAcct("seal"); draw(); }
      };
      loadPaid().then(() => { draw(); sealCheck(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openRoom) { openRoom = null; draw(); } });
      document.addEventListener("dust:change", draw);
      draw();
    }

    // ── 안내자와 면담 (v1-D 함수 · v1-F 방 화면). talkMode "off"면 아무것도 보내지 않는다.
    //   보내는 것: 방 이름 · 그 방 결과 번호(이 탭 sessionStorage의 방 기록에서 번호만) · 질문 글 · 앞선 문답 3개(· 충전분이면 로그인 표). 이름·생일은 보내지 않는다
    //   문답은 이 화면 메모리에만 두고 저장하지 않는다
    if (CONF.page === "talk") {
      const A = P.app, X = window.DEX, E = A.errors, SU = A.setup || {}, COSTQ = COST.talk || 10;
      const on = P.talkMode === "test" || P.talkMode === "live";
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // ── 기록: 입구 방 기록(같은 탭 sessionStorage "strange-oracle") + 면담 기록(이 탭 sessionStorage "strange-oracle-talk")
      //   면담 기록에 두는 것: 방별 결과 번호(입력값 아님)와 문답. 탭을 닫으면 사라지고 「대화 지우기」로 바로 지운다(운영 규칙 6장 sessionStorage 예외)
      //   생년월일·이름은 결과 번호를 계산하는 동안만 이 화면 메모리에 두고 저장·전송하지 않는다
      let tab = {};
      try { tab = JSON.parse(sessionStorage.getItem("strange-oracle") || "null") || {}; } catch (e) { tab = {}; }
      const TKEY = "strange-oracle-talk";
      const blankT = () => ({ v: 1, r: {}, chat: {} });
      let TS = blankT();
      try { const x = JSON.parse(sessionStorage.getItem(TKEY) || "null"); if (x && x.v === 1 && x.r && x.chat) TS = x; } catch (e) { TS = blankT(); }
      const saveT = () => { try { sessionStorage.setItem(TKEY, JSON.stringify(TS)); } catch (e) { /* 이 화면에서만 */ } };
      const I = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
      // 입구 방 기록(visits 모양) → 보내는 결과 번호
      const fromVisit = (room, v) => {
        if (!v) return null;
        if (room === "saju" && I(v.code, 1, 5000)) return { s: Math.floor((v.code - 1) / 500) };
        if (room === "ogham" && I(v.ogham, 0, 19)) return { i: v.ogham };
        if (room === "star" && I(v.nak, 0, 26)) return { i: v.nak };
        if (room === "decan" && I(v.decan, 0, 35)) return { i: v.decan };
        if (room === "tzolkin" && I(v.number, 1, 13) && I(v.sign, 0, 19)) return { n: v.number, s: v.sign };
        if (room === "rune" && Array.isArray(v.picks) && v.picks.length === 3 && v.picks.every((c) => /^[a-z]{2,12}$/.test(c))) return { p: v.picks.slice() };
        if (room === "sibyl" && I(v.sors, 0, 31)) return { i: v.sors };
        return null;
      };
      const okR = (room, r) => {
        if (!r || typeof r !== "object") return null;
        if (room === "saju") return I(r.s, 0, 9) ? r : null;
        if (room === "tzolkin") return I(r.n, 1, 13) && I(r.s, 0, 19) ? r : null;
        if (room === "rune") return Array.isArray(r.p) && r.p.length === 3 && r.p.every((c) => /^[a-z]{2,12}$/.test(c)) ? r : null;
        return I(r.i, 0, { ogham: 19, star: 26, decan: 35, sibyl: 31 }[room] || 0) ? r : null;
      };
      const resultOf = (room) => okR(room, TS.r[room]) || fromVisit(room, (tab.visits || {})[room]);
      const chatOf = (room) => (Array.isArray(TS.chat[room]) ? TS.chat[room] : (TS.chat[room] = []));
      // 결과 이름(화면 표시용) — 방 데이터 파일이 오면 채운다
      const resultName = (room, r) => {
        const L = ROOM_DATA[room][1]();
        if (!L || !r) return "";
        if (room === "saju") return L[r.s] ? `${L[r.s].hanja} ${L[r.s].name}` : "";
        if (room === "tzolkin") return L[r.s] ? `${r.n} ${L[r.s].name}` : "";
        if (room === "rune") return r.p.map((c) => (L.find((x) => x.code === c) || {}).name || "").filter(Boolean).join(" · ");
        if (room === "decan") return L[r.i] ? `${L[r.i].sign} ${G.ui.decanPart.replace("{n}", L[r.i].part)}` : "";
        if (room === "sibyl") return L[r.i] ? L[r.i].title : "";
        return L[r.i] ? L[r.i].name : "";
      };
      // ── 결과 번호 계산(브라우저 안에서만). 필요한 계산 파일은 그때 불러온다
      const ASTRONOMY = { src: "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js", integrity: "sha384-LTVHvxfbG3XHla4Lu0C0s9U18B2sBOuzJIeOoVHm2t05SOOORvMbBMEVjXrGau9g" };
      const scripts = {};
      const need = (src, attrs) => scripts[src] || (scripts[src] = new Promise((ok, no) => {
        const sc = document.createElement("script");
        Object.assign(sc, { src, async: false }, attrs || {});
        sc.onload = ok;
        sc.onerror = () => { delete scripts[src]; no(new Error("lib")); };
        document.head.append(sc);
      }));
      const PB = "/products/strange-oracle/";
      const calc = () => (window.Calc ? Promise.resolve() : need(PB + "calc.js"));
      const astro = () => (window.Astro ? Promise.resolve() : need(ASTRONOMY.src, { integrity: ASTRONOMY.integrity, crossOrigin: "anonymous" }).then(() => need(PB + "astro.js")));
      const NEEDS = { saju: "birth", ogham: "name", star: "birth", decan: "birth", tzolkin: "birth", rune: "draw", sibyl: "draw" };
      async function computeR(room, pf) {
        const b = pf && pf.birth, t = pf && pf.time;
        if (room === "ogham") { await calc(); const r = pf && pf.name ? window.Calc.ogham(pf.name) : null; return r ? { i: r.index } : null; }
        if (room === "rune") { await calc(); await loadRoom("rune"); const L = window.RUNES, got = []; while (got.length < 3) { const c = L[window.Calc.pickOracle(L.length)].code; if (!got.includes(c)) got.push(c); } return { p: got }; }
        if (room === "sibyl") { await calc(); await loadRoom("sibyl"); return { i: window.Calc.pickOracle(window.ORACLES.length) }; }
        if (!b || !I(b.y, 1900, 2099) || !I(b.m, 1, 12) || !I(b.d, 1, 31)) return null;
        if (room === "saju") {
          if (!window.Saju) { await need(PB + "data-saju.js"); await need(PB + "saju.js"); }
          await window.Saju.loadLunar();
          const r = window.Saju.compute({ y: b.y, m: b.m, d: b.d, time: t ? { h: t.h, mi: t.m } : null, gender: "none" });
          return I(r.dayStem, 0, 9) ? { s: r.dayStem } : null;
        }
        if (room === "tzolkin") { await calc(); const r = window.Calc.tzolkin(b.y, b.m, b.d); return r ? { n: r.number, s: r.sign } : null; }
        await astro();
        if (room === "star") { const r = window.Astro.birthChart(b.y, b.m, b.d, t ? { h: t.h, m: t.m } : null); const c = r && r.charts && r.charts[0]; return c && I(c.nakshatra, 0, 26) ? { i: c.nakshatra } : null; }
        if (room === "decan") {
          await calc();
          const r = window.Calc.decan(b.y, b.m, b.d);
          if (!r) return null;
          let i = r.noon ? r.noon.index : null;
          if (t && r.candidates && r.candidates.length) { const mn = t.h * 60 + t.m; const c = r.candidates.find((x) => mn >= x.startMin && mn < x.endMin); if (c) i = c.decan.index; }
          return I(i, 0, 35) ? { i } : null;
        }
        return null;
      }
      // 기록 출처: 이 탭(입구에서 넣은 정보) · 카카오 계정(저장 동의한 기록)
      const tabProfile = () => { const p = tab.profile || {}; return p.birth || p.name ? { birth: p.birth || null, time: p.time || null, name: p.name || "" } : null; };
      const hasFor = (room, pf) => pf && (NEEDS[room] === "name" ? Boolean(pf.name) : NEEDS[room] === "birth" ? Boolean(pf.birth) : true);

      let cur = null; // 고른 안내자(방 안에 있을 때)
      let busy = false, enterAt = 0, setupMsg = "", formOpen = false; // enterAt: 방에 들어온 시각 — 들어오는 동안 다시 그려도 스르륵이 끊기지 않게
      const skipped = {}; // 결과 없이 이야기하기로 한 방(이 화면 메모리)
      const lobby = () => `<p class="gnote gcenter">${esc(on ? A.pick : A.closed)}</p><ul class="gdoorpick">${X.guides.map((g) => `<li><button type="button" data-js="talk-pick" data-room="${g.room}">${arch(g.room, "garch--door")}<b>${esc(g.name)}</b><small>${esc(g.roomName)}</small>${chatOf(g.room).length ? `<em class="gdoorpick__dot">${esc(A.continued)}</em>` : ""}</button></li>`).join("")}</ul>`;
      const balLine = () => (paidBal != null ? fill(A.balance, { n: paidBal }) : A.loginToTalk);
      const say = (who, text, extra = "") => `<div class="gsay gsay--${who}${extra}">${who === "guide" ? arch(cur.room, "garch--xs") : ""}<p>${esc(text)}</p></div>`;
      // (2026-11-14 운영자) 안내자의 답은 문단마다 말풍선 하나(3~4개). 빈 줄로 나눈다. 너무 많으면 뒤를 마지막 풍선에 모은다
      const partsOf = (text) => { const p = String(text).split(/\n\s*\n+/).map((x) => x.trim()).filter(Boolean); return p.length > 5 ? p.slice(0, 4).concat(p.slice(4).join("\n\n")) : p.length ? p : [String(text)]; };
      const sayGuide = (text) => partsOf(text).map((x, i) => say("guide", x, i ? " gsay--cont" : "")).join("");
      // 면담 전 설정: 어떤 기록으로 볼지
      const setupCard = (g) => {
        const nd = NEEDS[g.room], tp = tabProfile(), lg = readLogin();
        const btn = (js, label, extra = "") => `<button type="button" class="gsetup__btn" data-js="${js}"${extra}>${esc(label)}</button>`;
        let h = `<div class="gsetup" data-js="talk-setup"><p class="gsetup__lead">${esc(fill(nd === "draw" ? SU.leadDraw : SU.lead, { name: g.name, iga: iga(g.name) }))}</p><div class="gsetup__btns">`;
        if (nd === "draw") h += btn("setup-draw", g.room === "rune" ? SU.drawRune : SU.drawSibyl, ' data-primary="1"');
        else {
          if (hasFor(g.room, tp)) h += btn("setup-tab", SU.fromTab, ' data-primary="1"');
          if (!lg) h += btn("setup-kakao", SU.loginKakao); // (2026-11-15) 로그인 전: 로그인하고 불러오기
          else if (lg.consent === true) h += btn("setup-kakao", SU.fromKakao); // 저장한 기록이 있는 계정만
          h += btn("setup-form", nd === "name" ? SU.typeName : SU.typeBirth);
        }
        h += btn("setup-skip", SU.skip) + `</div>`;
        if (formOpen && nd !== "draw") {
          h += nd === "name"
            ? `<form class="gsetup__form" data-js="setup-form-box" novalidate autocomplete="off"><label>${esc(SU.nameLabel)}<input name="name" maxlength="20" autocomplete="off" /></label><button class="gbtn" type="submit">${esc(SU.go)}</button></form>`
            : `<form class="gsetup__form" data-js="setup-form-box" novalidate autocomplete="off"><div class="gsetup__row"><label>${esc(SU.y)}<input name="y" inputmode="numeric" maxlength="4" /></label><label>${esc(SU.m)}<input name="m" inputmode="numeric" maxlength="2" /></label><label>${esc(SU.d)}<input name="d" inputmode="numeric" maxlength="2" /></label></div>
               <div class="gsetup__row"><label>${esc(SU.h)}<input name="h" inputmode="numeric" maxlength="2" placeholder="${esc(SU.optional)}" /></label><label>${esc(SU.mi)}<input name="mi" inputmode="numeric" maxlength="2" placeholder="${esc(SU.optional)}" /></label></div><button class="gbtn" type="submit">${esc(SU.go)}</button></form>`;
        }
        h += `<p class="gsetup__note">${esc(SU.privacy)}</p>${setupMsg ? `<p class="gerror" role="alert">${esc(setupMsg)}</p>` : ""}</div>`;
        return h;
      };
      const roomNote = (g) => {
        const r = resultOf(g.room);
        if (r) { const nm = resultName(g.room, r); return `<p class="groom__note">${esc(fill(SU.using, { room: g.roomName, result: nm || SU.yours }))} <button type="button" class="glink" data-js="setup-change">${esc(SU.change)}</button></p>`; }
        if (skipped[g.room]) return `<p class="groom__note">${esc(fill(A.unknown, { room: g.roomName }))} <button type="button" class="glink" data-js="setup-change">${esc(SU.change)}</button></p>`;
        return setupCard(g);
      };
      // 입력칸 위 한 줄: 가진 별가루(카카오 계정) · 모자라면 충전 · 로그인 전이면 로그인 단추
      const testFree = () => Boolean(acctView && acctView.talkFree); // (2026-11-15) 시험 배포: 심층상담에 별가루를 쓰지 않음
      // (2026-11-16 운영자) 충전은 이 화면 안에서(아래에서 올라오는 창) — 별가루 페이지로 넘어가지 않는다. 한 번 물을 만큼만 남으면 미리 알린다
      const metaHtml = (need) => {
        if (paidBal == null) return `<span>${esc(A.loginToTalk)}</span><button type="button" class="glink" data-js="talk-login">${esc(A.login)}</button>`;
        const low = !testFree() && need <= 0 && paidBal < COSTQ * 2;
        const charge = (t) => `<button type="button" class="glink" data-js="talk-charge">${esc(t)}</button>`;
        return `<span>${esc(testFree() ? A.testFree || "" : balLine())}${low ? " · " + esc(A.lowOne) : ""}</span>${need > 0 ? charge(fill(A.short, { need })) : low ? charge(A.charge) : `<span>${esc(A.privacy)}</span>`}`;
      };
      // (2026-11-16 운영자) 손님과의 사이: 그 방 문을 지나온 계정(도감 카드)이면 단골, 아니면 첫 만남 — 서버도 같은 기록으로 정한다
      const ORDER = X.guides.map((x) => x.room);
      const known = (r) => Boolean(acctView && Array.isArray(acctView.rooms) && acctView.rooms.includes(r));
      const bondTag = (r) => (paidBal == null ? "" : known(r)
        ? `<em class="gbond is-known">${esc((acctView.rooms || []).length >= 7 ? A.bondSeal : A.bondKnown)}</em>`
        : `<button type="button" class="gbond is-new" data-js="door-show">${esc(A.bondNew)}</button>`);
      if (!TS.door) TS.door = {};
      const doorCard = (g) => {
        if (paidBal == null || known(g.room) || TS.door[g.room]) return "";
        const done = Object.keys(tab.visits || {}), next = ORDER.find((r) => !done.includes(r));
        const direct = next === g.room;
        return `<section class="gdoor" data-js="door-card"><b>${esc(fill(A.doorHead, { room: g.roomName }))}</b><p>${esc(fill(A.doorBody, { name: g.name, iga: iga(g.name) }))}</p><ul>${A.doorPoints.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="gdoor__btns"><a class="gbtn" href="${ROOM_URL}${direct ? "#" + g.room : ""}">${esc(direct ? fill(A.doorGo, { room: g.roomName }) : A.doorGoHub)}</a><button type="button" class="glink" data-js="door-later">${esc(A.doorLater)}</button></div>${direct ? "" : `<small>${esc(A.doorOrder)}</small>`}</section>`;
      };
      const room = () => {
        const g = cur, hist = chatOf(g.room);
        const need = paidBal == null || testFree() ? 0 : COSTQ - paidBal;
        const ready = Boolean(resultOf(g.room)) || skipped[g.room];
        const age = Date.now() - enterAt;
        return `<div class="groom${age < 420 ? " is-enter" : ""}" role="dialog" aria-modal="true" aria-label="${esc(g.name)}" style="--art:url('${IMG(g.room)}');--ed:-${Math.max(0, age)}ms">
          <header class="groom__top"><button type="button" class="groom__back" data-js="talk-leave" aria-label="${esc(A.leave)}">←</button>${arch(g.room, "garch--xs")}<span class="groom__who"><b>${esc(g.name)}</b>${bondTag(g.room)}<small><i></i>${esc(A.status)} · ${esc(g.roomName)}</small></span>${hist.length ? `<button type="button" class="glink groom__clear" data-js="talk-clear">${esc(A.clearChat)}</button>` : ""}</header>
          <div class="groom__log" data-js="talk-log">${say("guide", g.line)}${doorCard(g)}${roomNote(g)}${syncCard()}${hist.length && g.hadHist ? `<p class="groom__note">${esc(sync === "on" ? SY.kept : A.kept)}</p>` : ""}
            ${hist.map((h) => say("me", h.q) + sayGuide(h.a)).join("")}</div>
          <form class="groom__bar" data-js="talk-form" novalidate autocomplete="off">
            <p class="groom__meta">${metaHtml(need)}</p>
            <p class="gerror" data-js="talk-error" role="alert" hidden></p>
            <div class="groom__row"><textarea name="q" rows="1" maxlength="300" placeholder="${esc(ready ? A.placeholder : SU.first)}" aria-label="${esc(A.placeholder)}"${ready ? "" : " disabled"}></textarea><button type="submit" class="groom__send${need > 0 ? " is-short" : ""}"${busy || !ready || paidBal == null ? " disabled" : ""} aria-label="${esc(fill(A.ask, { cost: COSTQ }))}"><span>✦${COSTQ}</span></button></div>
          </form></div>`;
      };
      const draw = () => {
        box.innerHTML = lobby() + (on && cur ? room() : "");
        document.documentElement.classList.toggle("room-open", Boolean(on && cur));
        const log = box.querySelector("[data-js=talk-log]");
        if (log) log.scrollTop = log.scrollHeight;
      };
      // 방 안의 잔액 줄·보내기 버튼만 새로 (대화는 그대로 두어 깜빡이지 않게)
      const refresh = () => {
        if (busy || !cur) return;
        const bar = box.querySelector(".groom__bar");
        if (!bar) return;
        const need = paidBal == null || testFree() ? 0 : COSTQ - paidBal;
        const ready = Boolean(resultOf(cur.room)) || skipped[cur.room];
        bar.querySelector(".groom__meta").innerHTML = metaHtml(need);
        const sb = bar.querySelector(".groom__send");
        sb.disabled = !ready || paidBal == null; // (2026-11-17 운영자) 별가루가 모자라도 누를 수 있다 → 누르면 충전 창
        sb.classList.toggle("is-short", need > 0);
      };
      const err = (m) => { const e = box.querySelector("[data-js=talk-error]"); if (e) { e.textContent = m; e.hidden = !m; } };
      const typeOut = (el, text) => new Promise((ok) => {
        if (reduce) { el.textContent = text; return ok(); }
        let i = 0;
        const step = () => { i = Math.min(text.length, i + 3); el.textContent = text.slice(0, i); const log = box.querySelector("[data-js=talk-log]"); if (log) log.scrollTop = log.scrollHeight; if (i < text.length) setTimeout(step, 20); else ok(); };
        step();
      });
      const enter = (roomName) => {
        cur = X.guides.find((x) => x.room === roomName) || null;
        if (cur) cur.hadHist = chatOf(roomName).length > 0; // (2026-11-15) 들어올 때 이미 대화가 있었을 때만 "지난 대화" 안내
        enterAt = Date.now(); setupMsg = ""; formOpen = false;
        if (cur && !(history.state && history.state.soRoom === roomName)) history.pushState({ soRoom: roomName }, ""); // (2026-11-16) 휴대폰 뒤로 가기 = 방 나가기
        draw();
        loadRoom(roomName).then(() => { if (cur && cur.room === roomName && !busy) { const t = box.querySelector(".groom textarea"); const keep = t ? t.value : ""; draw(); const t2 = box.querySelector(".groom textarea"); if (t2) t2.value = keep; } }).catch(() => {});
        const t = box.querySelector(".groom textarea"); if (t && !t.disabled) t.focus({ preventScroll: true });
      };
      const setR = (room, r) => { TS.r[room] = r; saveT(); setupMsg = ""; formOpen = false; draw(); };
      const tryProfile = async (pf) => {
        const room0 = cur.room;
        let r = null;
        try { r = await computeR(room0, pf); } catch (x) { r = null; }
        if (!cur || cur.room !== room0) return;
        if (r) setR(room0, r); else { setupMsg = SU.cant; draw(); }
      };
      // ── (2026-11-16 운영자) 카카오 계정에 대화 보관: 동의한 계정만. 들어올 때 계정의 대화를 받아 이 탭 기록에 합치고, 답을 받을 때마다 한 턴씩 덧붙인다
      //   계정에 있는 방은 계정 것이 우선(다른 기기에서 이어진 대화), 이 탭에만 있는 방은 보관을 켤 때 한 번 올린다. talkSync "off"면 아무것도 보내지 않는다
      const SYNC = P.talkSync === "live" || (P.talkSync === "test" && !((((window.NAV || {}).pwa || {}).prodHosts) || ["strange-oracle.com", "www.strange-oracle.com"]).includes(location.hostname));
      const SY = A.sync || {};
      let sync = null; // null 모름·꺼짐(서버 없음) | "off" 아직 동의 안 함 | "on"
      let syncMsg = "";
      const syncUp = () => { const up = {}; for (const g of X.guides) { const l = chatOf(g.room); if (l.length) up[g.room] = l.slice(-30).map((h) => ({ q: String(h.q).slice(0, 300), a: String(h.a).slice(0, 1600) })); } return up; };
      const syncLoad = async () => {
        const lg = readLogin();
        if (!SYNC || !lg) { sync = null; return; }
        const r = await post("/api/auth/chat", { sid: lg.sid });
        if (r.status !== 200 || !r.j) { sync = null; return; }
        sync = r.j.on ? "on" : "off";
        if (sync !== "on") return;
        const acct = r.j.chat || {};
        let changed = false;
        const up = {};
        for (const g of X.guides) {
          const a = Array.isArray(acct[g.room]) ? acct[g.room].filter((h) => h && typeof h.q === "string" && typeof h.a === "string") : [];
          if (a.length) { if (JSON.stringify(a) !== JSON.stringify(chatOf(g.room))) { TS.chat[g.room] = a.slice(-30); changed = true; } }
          else if (chatOf(g.room).length) up[g.room] = syncUp()[g.room];
        }
        if (changed) saveT();
        if (Object.keys(up).length) post("/api/auth/chat", { sid: lg.sid, put: up });
      };
      const syncAdd = (room, h) => { const lg = readLogin(); if (sync !== "on" || !lg) return; post("/api/auth/chat", { sid: lg.sid, room, add: h }).then((r) => { if (r.status === 409) sync = "off"; }); };
      const syncCard = () => {
        if (!SYNC || paidBal == null || sync !== "off" || TS.syncNo) return syncMsg ? `<p class="groom__note" role="status">${esc(syncMsg)}</p>` : "";
        return `<section class="gsync" data-js="sync-card"><b>${esc(SY.head)}</b><p>${esc(SY.body)}</p><p class="gsync__short">${esc(SY.short)}</p>
          <details class="gsync__more"><summary>${esc(SY.more)}</summary><ul>${(SY.detail || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>
          <label class="gsync__agree"><input type="checkbox" data-js="sync-agree"> <span>${esc(SY.agree)}</span></label>
          <div class="gsync__btns"><button type="button" class="gbtn" data-js="sync-yes" disabled>${esc(SY.yes)}</button><button type="button" class="glink" data-js="sync-no">${esc(SY.no)}</button></div>${syncMsg ? `<p class="gerror" role="alert">${esc(syncMsg)}</p>` : ""}</section>`;
      };
      // ── (2026-11-16) 화면 안 충전 창: 별가루 페이지와 같은 충전 칸(makeShop). 결제창에 다녀오면 이 방·적던 질문으로 돌아온다
      const RES_KEY = "strange-oracle-talk-resume"; // 이 탭 sessionStorage: 결제 뒤 다시 열 방 이름 · 적던 질문(대화 기록과 같은 6장 sessionStorage 예외)
      const sheet = document.createElement("div");
      sheet.className = "gsheet gsheet--charge";
      sheet.hidden = true;
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", A.chargeHead || "");
      sheet.innerHTML = `<div class="gsheet__scrim" data-js="charge-close"></div><div class="gsheet__body"><button class="gsheet__x" type="button" data-js="charge-close" aria-label="${esc(G.home.login.close)}">×</button><p class="gcharge__lead">${esc(A.chargeLead || "")}</p><div data-js="dust-shop"></div></div>`;
      document.body.append(sheet);
      // 휴대폰 뒤로 가기·앱의 ←·Esc가 같은 길로: 기록 칸이 있으면 history.back() → popstate가 닫는다
      const closeRoom = async () => { if (!cur) return; await leave(box.querySelector(".groom"), 300); cur = null; draw(); };
      const leaveRoom = () => { if (history.state && history.state.soRoom) history.back(); else closeRoom(); };
      const closeCharge = () => { if (sheet.hidden) return; if (history.state && history.state.soSheet) history.back(); else closeChargeNow(); };
      window.addEventListener("popstate", () => {
        if (!sheet.hidden) { closeChargeNow(); return; }
        if (cur) { if (busy) { history.pushState({ soRoom: cur.room }, ""); return; } closeRoom(); } // 답을 받는 중이면 방에 머문다
      });
      const closeChargeNow = async () => {
        if (sheet.hidden) return;
        await leave(sheet, 260);
        sheet.hidden = true;
        sheet.classList.remove("is-leave");
        const t = box.querySelector(".groom textarea");
        if (t && !t.disabled) t.focus({ preventScroll: true });
      };
      const shop = makeShop(sheet, {
        to: "talk",
        from: "talk",
        beforePay: () => { try { const t = box.querySelector(".groom textarea"); sessionStorage.setItem(RES_KEY, JSON.stringify({ room: cur ? cur.room : "", q: t ? t.value.slice(0, 300) : "", skip: Boolean(cur && skipped[cur.room]) })); } catch (x) { /* 이 화면에서만 */ } },
        onCredited: () => { refresh(); setTimeout(closeCharge, 1600); },
      });
      const openCharge = () => { if (!shop.on) { location.href = "/stardust/"; return; } if (!(history.state && history.state.soSheet)) history.pushState({ soRoom: cur ? cur.room : "", soSheet: 1 }, ""); sheet.hidden = false; shop.draw(); const x = sheet.querySelector(".gsheet__x"); if (x) x.focus({ preventScroll: true }); };
      sheet.addEventListener("click", (e) => { if (e.target.closest("[data-js=charge-close]")) closeCharge(); });
      box.addEventListener("click", async (e) => {
        if (e.target.closest("[data-js=talk-charge]")) return openCharge();
        if (cur && e.target.closest("[data-js=door-later]")) { TS.door[cur.room] = true; saveT(); return draw(); }
        if (cur && e.target.closest("[data-js=door-show]")) { delete TS.door[cur.room]; saveT(); draw(); const c = box.querySelector("[data-js=door-card]"); if (c) c.scrollIntoView({ block: "nearest" }); return; }
        const b = e.target.closest("[data-js=talk-pick]");
        if (b && !busy) { if (on) enter(b.dataset.room); return; }
        if (e.target.closest("[data-js=talk-leave]") && !busy) { leaveRoom(); return; }
        if (!cur || busy) return;
        if (e.target.closest("[data-js=talk-login]")) { try { sessionStorage.setItem("strange-oracle-talk-back", cur.room); } catch (x) { /* 무시 */ } return kakaoLogin("talk"); }
        if (e.target.closest("[data-js=talk-clear]")) {
          if (!window.confirm(sync === "on" ? SY.clearAsk : A.clearAsk)) return;
          if (sync === "on" && readLogin()) post("/api/auth/chat", { sid: readLogin().sid, room: cur.room, clear: true });
          TS.chat[cur.room] = []; delete TS.r[cur.room]; saveT(); draw(); return;
        }
        if (e.target.closest("[data-js=sync-no]")) { TS.syncNo = true; saveT(); syncMsg = ""; return draw(); }
        if (e.target.closest("[data-js=sync-yes]")) {
          const ag = box.querySelector("[data-js=sync-agree]"), lg = readLogin();
          if (!ag || !ag.checked || !lg) return;
          const r = await post("/api/auth/chat", { sid: lg.sid, consent: true });
          if (r.status === 401) { dropLogin(); paidBal = null; syncMsg = ""; return draw(); }
          if (r.status !== 200) { syncMsg = SY.fail; return draw(); }
          sync = "on"; syncMsg = SY.done;
          track("so_talk", { room: cur.room, step: "sync_on" });
          const up = syncUp();
          if (Object.keys(up).length) await post("/api/auth/chat", { sid: lg.sid, put: up });
          return draw();
        }
        if (e.target.closest("[data-js=setup-change]")) { delete TS.r[cur.room]; delete skipped[cur.room]; saveT(); draw(); return; }
        if (e.target.closest("[data-js=setup-skip]")) { skipped[cur.room] = true; draw(); return; }
        if (e.target.closest("[data-js=setup-form]")) { formOpen = !formOpen; setupMsg = ""; draw(); const f = box.querySelector("[data-js=setup-form-box] input"); if (f) f.focus(); return; }
        if (e.target.closest("[data-js=setup-draw]")) { setupMsg = SU.working; draw(); return tryProfile({}); }
        if (e.target.closest("[data-js=setup-tab]")) { setupMsg = SU.working; draw(); return tryProfile(tabProfile()); }
        if (e.target.closest("[data-js=setup-kakao]")) {
          const lg = readLogin();
          if (!lg) { try { sessionStorage.setItem("strange-oracle-talk-back", cur.room); } catch (x) { /* 무시 */ } return kakaoLogin("talk"); }
          setupMsg = SU.working; draw();
          const r = await post("/api/auth/me", { sid: lg.sid });
          if (r.status === 401) { dropLogin(); setupMsg = A.sessionEnd; return draw(); }
          const dt = r.status === 200 && r.j && r.j.data;
          if (!dt) { setupMsg = SU.noSaved; return draw(); }
          const fv = fromVisit(cur.room, (dt.v || {})[cur.room]);
          if (fv) return setR(cur.room, fv);
          const pp = dt.p || {};
          return tryProfile({ birth: pp.birth || null, time: pp.time || null, name: pp.name || "" });
        }
      });
      box.addEventListener("submit", async (e) => {
        const sf = e.target.closest("[data-js=setup-form-box]");
        if (sf) {
          e.preventDefault();
          const v = (k) => (sf.elements[k] ? sf.elements[k].value.trim() : "");
          if (NEEDS[cur.room] === "name") { const nm = v("name"); if (!nm) { setupMsg = SU.cant; return draw(); } return tryProfile({ name: nm }); }
          const n = (k) => (v(k) === "" ? null : Number(v(k)));
          const y = n("y"), m = n("m"), d = n("d"), h = n("h"), mi = n("mi");
          const okDate = I(y, 1900, 2099) && I(m, 1, 12) && I(d, 1, 31) && new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d;
          const okTime = h == null || (I(h, 0, 23) && (mi == null || I(mi, 0, 59)));
          if (!okDate || !okTime) { setupMsg = SU.badDate; return draw(); }
          return tryProfile({ birth: { y, m, d }, time: h == null ? null : { h, m: mi == null ? 0 : mi } });
        }
        if (!e.target.closest("[data-js=talk-form]")) return;
        e.preventDefault();
        if (!on || !cur || busy) return;
        if (readLogin() && paidBal != null && paidBal < COSTQ && !testFree()) return openCharge(); // (2026-11-17 운영자) 별가루가 모자라면 보내기 = 충전 창(적던 질문은 그대로)
        const ta = e.target.elements.q, q = ta.value.trim();
        if (!q) return err(E.empty);
        if (q.length > 300) return err(E.long);
        busy = true; // 먼저 잠근다(별가루가 바뀌며 화면을 다시 그리지 않게)
        // 무료로 모은 별가루를 먼저 쓰고, 모자라면 카카오 계정의 충전한 별가루(서버가 차감)
        // (2026-11-14) 별가루는 카카오 계정에만 — 면담은 계정 별가루에서 서버가 차감
        const lg = readLogin();
        const paid = Boolean(lg && paidBal != null && (paidBal >= COSTQ || testFree()));
        if (!paid) { busy = false; if (lg && paidBal != null) { openCharge(); return; } draw(); return; } // (2026-11-17 운영자) 별가루가 모자라면 보내기 → 충전 창(적던 질문은 그대로)
        const g = cur, roomName = g.room, hist = chatOf(roomName);
        const logBox = box.querySelector("[data-js=talk-log]");
        logBox.insertAdjacentHTML("beforeend", say("me", q, " is-new") + `<div class="gsay gsay--guide is-wait is-new" data-js="talk-wait">${arch(roomName, "garch--xs")}<p><span class="gdots" aria-label="${esc(fill(A.typing, { name: g.name, iga: iga(g.name) }))}"><i></i><i></i><i></i></span></p></div>`);
        logBox.scrollTop = logBox.scrollHeight;
        e.target.querySelector("button[type=submit]").disabled = true;
        ta.value = ""; ta.style.height = "auto";
        let res = null, data = null;
        try {
          const body = { room: roomName, r: resultOf(roomName), q, hist: hist.slice(-3) };
          // (2026-11-16 맞춤 1단계) 다른 방에서 받은 결과 번호(입력값 아님)와 이 탭에서 앞서 물었던 질문(답 없이 8개까지) — 저장하지 않고 이번 답에만 쓴다
          const rs = {};
          for (const g2 of X.guides) { if (g2.room === roomName) continue; const r2 = resultOf(g2.room); if (r2) rs[g2.room] = r2; }
          if (Object.keys(rs).length) body.rs = rs;
          const past = hist.slice(0, -3).slice(-8).map((h) => String(h.q).trim().slice(0, 120)).filter(Boolean);
          if (past.length) body.past = past;
          if (paid) body.sid = lg.sid;
          res = await fetch("/api/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          data = await res.json();
        } catch (x) { res = null; }
        const wait = box.querySelector("[data-js=talk-wait]");
        if (res && res.ok && data && typeof data.a === "string") {
          if (Number.isInteger(data.paid)) { paidBal = data.paid; acctEvt(); }
          const a = data.a.slice(0, 1600);
          hist.push({ q, a });
          if (hist.length > 30) hist.splice(0, hist.length - 30);
          saveT();
          syncAdd(roomName, { q: q.slice(0, 300), a });
          track("so_talk", { room: roomName, step: "answer" });
          if (wait) {
            const parts = partsOf(a);
            wait.classList.remove("is-wait"); wait.removeAttribute("data-js");
            await typeOut(wait.querySelector("p"), parts[0]);
            // 다음 풍선: 잠깐 말을 고르는 점 → 한 풍선씩
            for (const part of parts.slice(1)) {
              const lb = box.querySelector("[data-js=talk-log]");
              if (!lb) break;
              lb.insertAdjacentHTML("beforeend", `<div class="gsay gsay--guide gsay--cont is-wait is-new" data-js="talk-wait">${arch(roomName, "garch--xs")}<p><span class="gdots"><i></i><i></i><i></i></span></p></div>`);
              lb.scrollTop = lb.scrollHeight;
              const w = lb.querySelector("[data-js=talk-wait]");
              if (!reduce) await new Promise((ok) => setTimeout(ok, 650));
              w.classList.remove("is-wait"); w.removeAttribute("data-js");
              await typeOut(w.querySelector("p"), part);
            }
          }
          busy = false;
          if (!box.querySelector("[data-js=talk-clear]") && cur && cur.room === roomName) { const t = box.querySelector(".groom textarea"); const keep = t ? t.value : ""; draw(); const t2 = box.querySelector(".groom textarea"); if (t2) t2.value = keep; }
          // (2026-11-17 운영자) 위기 답: 안내자 말에는 번호가 없고, 말풍선 밖 작은 줄로 109를 단다
          if (data.crisis && A.crisisNote && cur && cur.room === roomName) { const lb = box.querySelector("[data-js=talk-log]"); if (lb) { lb.insertAdjacentHTML("beforeend", `<p class="groom__crisis" role="note">${esc(A.crisisNote)}</p>`); lb.scrollTop = lb.scrollHeight; } }
          refresh();
        } else {
          busy = false;
          const code = data && data.error;
          if (code === "session") { dropLogin(); paidBal = null; }
          if (code === "dust") await loadPaid();
          draw();
          if (code === "dust") { const t0 = box.querySelector(".groom textarea"); if (t0) t0.value = q; openCharge(); return; } // 그새 모자라졌으면 충전 창
          err(code === "session" ? A.sessionEnd : code === "off" ? E.off : code === "budget" ? E.budget : code === "rate" ? E.rate : E.fail);
          const t = box.querySelector(".groom textarea"); if (t) t.value = q;
        }
      });
      box.addEventListener("change", (e) => { if (e.target.matches && e.target.matches("[data-js=sync-agree]")) { const y = box.querySelector("[data-js=sync-yes]"); if (y) y.disabled = !e.target.checked; } });
      box.addEventListener("input", (e) => { if (e.target.name === "q") { e.target.style.height = "auto"; e.target.style.height = Math.min(120, e.target.scrollHeight) + "px"; } });
      // (2026-11-14 운영자) Enter는 줄바꿈. 보내기는 보내기 단추(PC에서는 Ctrl·Cmd + Enter도)
      box.addEventListener("keydown", (e) => { if (e.target.name === "q" && e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); } });
      document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; if (!sheet.hidden) { closeCharge(); return; } if (cur && !busy) leaveRoom(); });
      loadPaid().then(async () => {
        refresh();
        await syncLoad().catch(() => { sync = null; });
        if (busy) return;
        if (cur) { const t = box.querySelector(".groom textarea"); const keep = t ? t.value : ""; cur.hadHist = chatOf(cur.room).length > 0; draw(); const t2 = box.querySelector(".groom textarea"); if (t2) t2.value = keep; } else draw();
      });
      document.addEventListener("dust:change", refresh);
      draw();
      // 충전 결제에서 돌아온 경우(#paid 또는 확인 중인 결제): 그 방·적던 질문을 다시 열고 충전 창에서 결제를 확인한다
      if (location.hash === "#paid" || shop.pending()) {
        let res = null;
        try { res = JSON.parse(sessionStorage.getItem(RES_KEY) || "null"); sessionStorage.removeItem(RES_KEY); } catch (x) { res = null; }
        if (location.hash === "#paid") history.replaceState(null, "", location.pathname);
        if (on && res && X.guides.some((g) => g.room === res.room)) {
          if (res.skip === true) skipped[res.room] = true; // 결과 없이 이야기하던 방이면 그대로
          enter(res.room);
          const t = box.querySelector(".groom textarea");
          if (t && typeof res.q === "string") t.value = res.q.slice(0, 300);
        }
        sheet.hidden = false;
        shop.draw();
        shop.settle();
      }
      // 카카오 로그인하고 돌아온 경우(#login): 고르던 방을 다시 연다
      if (/^#login/.test(location.hash)) {
        let back = "";
        try { back = sessionStorage.getItem("strange-oracle-talk-back") || ""; sessionStorage.removeItem("strange-oracle-talk-back"); } catch (x) { back = ""; }
        history.replaceState(null, "", location.pathname);
        if (on && X.guides.some((g) => g.room === back)) enter(back);
      }
    }

    // ── (2026-11-16 운영자) 나의 이야기: 지금까지 쌓은 서사 + 별가루 + 맨 아래 로그아웃
    //   보이는 것: 계정에 있는 것(별가루·지나온 방·숨은 이야기·오늘의 신탁 날짜·열어 둔 책)과 결과 이름(이 탭 기록 또는 카카오에 저장한 기록). 입력값(이름·생일)은 보이지 않는다
    if (CONF.page === "me") {
      const M = P.app;
      const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
      const I = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
      // 방 기록(visits 모양) → 결과 이름(공개 방 문구에서)
      const nameOf = (room, v) => {
        if (!v) return "";
        const L = ROOM_DATA[room] ? ROOM_DATA[room][1]() : null;
        if (!L) return "";
        if (room === "saju" && I(v.code, 1, 5000)) { const x = L[Math.floor((v.code - 1) / 500)]; return x ? `${x.hanja} ${x.name}` : ""; }
        if (room === "ogham" && I(v.ogham, 0, 19)) return (L[v.ogham] || {}).name || "";
        if (room === "star" && I(v.nak, 0, 26)) return (L[v.nak] || {}).name || "";
        if (room === "decan" && I(v.decan, 0, 35)) { const x = L[v.decan]; return x ? `${x.sign} ${G.ui.decanPart.replace("{n}", x.part)}` : ""; }
        if (room === "tzolkin" && I(v.number, 1, 13) && I(v.sign, 0, 19)) { const x = L[v.sign]; return x ? `${v.number} ${x.name}` : ""; }
        if (room === "rune" && Array.isArray(v.picks)) return v.picks.map((c) => (L.find((x) => x.code === c) || {}).name || "").filter(Boolean).join(" · ");
        if (room === "sibyl" && I(v.sors, 0, 31)) return (L[v.sors] || {}).title || "";
        return "";
      };
      let tabV = {};
      try { tabV = (JSON.parse(sessionStorage.getItem("strange-oracle") || "null") || {}).visits || {}; } catch (e) { tabV = {}; }
      const kst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const row = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
      const draw = (me, visits) => {
        const av = acctView || {}, cards = Array.isArray(av.rooms) ? av.rooms : [], stories = Array.isArray(av.stories) ? av.stories : [];
        const rooms = ROOMS.filter((r) => cards.includes(r) || (visits[r] && nameOf(r, visits[r]))); // 지나온 문 = 계정 도감 + 결과가 있는 방(이 탭·저장 기록)
        const passes = (me && Array.isArray(me.passes)) ? me.passes : [];
        const hasBook = passes.some((p) => /^SOP/i.test(String(p))), hasNy = passes.some((p) => /^SNY/i.test(String(p)));
        const seal = cards.length >= 7 || (Array.isArray(av.once) && av.once.includes("seal"));
        const named = ROOMS.filter((r) => rooms.includes(r) && nameOf(r, visits[r]));
        let h = `<section class="gme-doors"><div class="gme-doors__arches">${ROOMS.map((r) => `<span class="gme-door${rooms.includes(r) ? " is-on" : ""}">${arch(r, "garch--sm")}</span>`).join("")}</div>
          <h2>${esc(M.doorsHead)} <b>${esc(fill(M.doorsCount, { n: rooms.length }))}</b></h2>${seal ? `<p class="gme-seal">${esc(M.sealOpen)}</p>` : ""}
          ${rooms.length ? "" : `<p class="gnote gcenter">${esc(M.doorsNone)}</p><div class="gactions"><a class="gbtn" href="${ROOM_URL}">${esc(M.doorsGo)}</a></div>`}</section>`;
        // 안내자들이 읽어 준 당신 — 지나온 방마다 결과 이름(있을 때)
        if (rooms.length) {
          h += `<section class="gme-story"><h2>${esc(M.storyHead)}</h2><ol>${ROOMS.map((r) => {
            const g = guide(r) || { name: r, roomName: r };
            const on = rooms.includes(r), nm = on ? nameOf(r, visits[r]) : "";
            return `<li class="${on ? "is-on" : "is-off"}">${arch(r, "garch--xs")}<span><small>${esc(g.name)} · ${esc(g.roomName)}</small><b>${esc(on ? nm || "✓" : M.storyLocked)}</b></span></li>`;
          }).join("")}</ol>${named.length ? "" : `<p class="gnote">${esc(M.storyNone)}</p>`}</section>`;
        }
        // 별가루
        h += `<section class="gme-dust"><img src="/products/strange-oracle/img/stardust.webp" alt="" width="56" height="56"><span><small>${esc(M.dustHead)}</small><b>${paidBal == null ? 0 : paidBal}</b></span><a class="gbtn" href="/stardust/">${esc(M.dustCharge)}</a></section>`;
        // 쌓아 온 것
        const today = av.today === kst();
        h += `<section class="gme-rec"><h2>${esc(M.recHead)}</h2><dl class="gkv">
          ${row(M.cards, `<a href="/dex/">${esc(fill(M.countOf, { n: cards.length, m: 7 }))}</a>`)}
          ${row(M.stories, esc(fill(M.countOf, { n: stories.length, m: 7 })))}
          ${row(M.today, today ? esc(M.todayDone) : `${esc(M.todayNot)} · <a href="/today/">${esc(M.todayGo)}</a>`)}
          ${row(M.books, hasBook || hasNy ? [hasBook ? `<a href="${ROOM_URL}#report">${esc(M.book)}</a>` : "", hasNy ? `<a href="${ROOM_URL}#ny-hub">${esc(M.ny)}</a>` : ""].filter(Boolean).join(" · ") : esc(M.booksNone))}
          ${row(M.saved, esc(me && me.data ? M.savedYes : M.savedNo))}
          ${syncOn === null ? "" : row(M.syncHead, syncOn ? `${esc(M.syncOn)} · <button type="button" class="glink" data-js="me-sync-off">${esc(M.syncStop)}</button>` : esc(syncMsgMe || M.syncOff))}
        </dl></section>`;
        // 로그아웃
        h += `<section class="gme-out"><h2>${esc(M.logoutHead)}</h2><p class="gnote">${esc(M.logoutNote)}</p><div class="gactions"><button class="gbtn ghost" type="button" data-js="me-logout">${esc(M.logout)}</button></div></section>`;
        box.innerHTML = h;
      };
      box.innerHTML = `<p class="gnote gcenter">${esc(M.loading)}</p>`;
      const SYNC_ME = ((m) => m === "live" || (m === "test" && !((((window.NAV || {}).pwa || {}).prodHosts) || ["strange-oracle.com", "www.strange-oracle.com"]).includes(location.hostname)))((G.apps.talk || {}).talkSync); // (2026-11-16) 대화 보관이 켜져 있을 때만 줄을 보인다
      let syncOn = null, syncMsgMe = "", lastMe = null, lastVisits = {};
      box.addEventListener("click", async (e) => {
        if (e.target.closest("[data-js=me-sync-off]")) {
          if (!window.confirm(M.syncStopAsk)) return;
          const lg = readLogin();
          if (!lg) return;
          const r = await post("/api/auth/chat", { sid: lg.sid, consent: false });
          if (r.status !== 200) { window.alert(M.fail); return; }
          syncOn = false; syncMsgMe = M.syncStopped;
          try { sessionStorage.removeItem("strange-oracle-talk"); } catch (x) { /* 무시 */ }
          draw(lastMe, lastVisits);
          return;
        }
        if (!e.target.closest("[data-js=me-logout]")) return;
        if (!window.confirm(M.logoutAsk)) return;
        const lg = readLogin();
        if (lg) await post("/api/auth/logout", { sid: lg.sid }); // 서버의 로그인 표도 지운다(실패해도 이 기기에서는 로그아웃)
        dropLogin();
        try { sessionStorage.removeItem("strange-oracle-talk-resume"); if (syncOn) sessionStorage.removeItem("strange-oracle-talk"); } catch (x) { /* 무시 */ } // 계정에서 받아 온 대화는 이 기기에 남기지 않는다
        track("so_auth", { step: "logout" });
        location.href = "/";
      });
      (async () => {
        const lg = readLogin();
        await loadPaid();
        if (!readLogin()) return; // 로그인이 끝났으면 onExpired가 로그인 안내를 보인다
        const r = await post("/api/auth/me", { sid: lg.sid });
        if (r.status === 401) { dropLogin(); onExpired(); return; }
        const me = r.status === 200 ? r.j : null;
        const visits = Object.assign({}, (me && me.data && me.data.v) || {}, tabV); // 이 탭 기록이 더 새것
        const need = ROOMS.filter((x) => visits[x]);
        await Promise.all(need.map((x) => loadRoom(x).catch(() => null)));
        if (!me && r.status !== 200) { box.innerHTML = `<p class="gerror gcenter">${esc(M.fail)}</p>`; return; }
        if (SYNC_ME) { const c = await post("/api/auth/chat", { sid: lg.sid }); syncOn = c.status === 200 && c.j ? Boolean(c.j.on) : null; }
        lastMe = me; lastVisits = visits;
        draw(me, visits);
      })();
    }

    if (CONF.page === "stardust") {
      const A = P.app;
      // (v1-F) 한 장짜리: 잔액 카드 → 모으는 법·쓰는 곳(짧은 두 칸) → 충전
      const draw = () => {
        const st = D.state();
        const mini = (head, list, sign) => `<section class="gmini"><h2>${esc(head)}</h2><ul>${list.map((x) => `<li><span>${esc(x.label)}${x.note ? `<small>${esc(x.note)}</small>` : ""}</span><b>${sign}${esc(String(x.amt).replace(/^\+/, ""))}</b></li>`).join("")}</ul></section>`;
        // (2026-11-14) 별가루는 카카오 계정에만 — 로그인 전이면 0과 로그인 안내
        box.innerHTML = `<div class="gwallet"><small>${esc(A.balance)}</small><b><img class="gwallet__i" src="/products/strange-oracle/img/stardust.webp" alt=""> <span data-js="dust-total">${paidBal || 0}</span></b></div>
          <div class="gminis">${mini(A.waysHead, A.ways.filter((x) => x.kind !== "channel" || ((window.NAV && window.NAV.channel) || {}).reward), "+")}${mini(A.usesHead, A.uses, "−")}</div>${backTo() ? `<div class="gactions"><a class="gbtn ghost" href="/products/strange-oracle/" data-js="dust-back">${esc((A.shop || {}).back || "")}</a></div>` : ""}
          ${chBox()}<div data-js="dust-shop"></div>`;
        drawShop();
      };
      // (2026-11-14 운영자) 카카오톡 채널 친구 추가 → 별가루 10(계정에 한 번, 카카오 확인)
      const CH = A.channel || {}, CH_URL = (window.NAV && window.NAV.channel && window.NAV.channel.url) || "", CH_REWARD = Boolean(window.NAV && window.NAV.channel && window.NAV.channel.reward), CH_SHOW = Boolean(window.NAV && window.NAV.channel && window.NAV.channel.show); // (2026-11-15 운영자) 보상 보류 · 사업자등록 전까지 채널 숨김
      let chMsg = { "#login-ch": "ok", "#login-ch0": "no" }[location.hash] || "";
      const chBox = () => {
        if (!CH_SHOW || !/^https:\/\/pf\.kakao\.com\/_[A-Za-z0-9]+\/?$/.test(CH_URL)) return "";
        const got = acctOnce.includes("channel");
        if (!CH_REWARD) return `<section class="gchannel"><h2>${esc(CH.headPlain)}</h2><p class="gnote">${esc(CH.lead)}</p><div class="gactions"><a class="gbtn ghost" href="${esc(CH_URL.replace(/\/$/, ""))}" target="_blank" rel="noopener" data-js="ch-add">${esc(CH.addPlain)}</a></div></section>`;
        return `<section class="gchannel"><h2>${esc(CH.head)}</h2><p class="gnote">${esc(CH.lead)}</p>${chMsg === "no" && !got ? `<p class="gerror" role="status">${esc(CH.no)}</p>` : ""}
          ${got ? `<p class="gnote gcenter" role="status">${esc(chMsg === "ok" ? fill(CH.ok, { n: 10 }) : CH.got)}</p>` : `<div class="gactions gcol"><a class="gbtn ghost" href="${esc(CH_URL.replace(/\/$/, "") + "/friend")}" target="_blank" rel="noopener" data-js="ch-add">${esc(CH.add)}</a><button class="gbtn gbtn--kakao" type="button" data-js="ch-claim">${esc(CH.claim)}</button></div><small class="gnote">${esc(CH.note)}</small>`}</section>`;
      };
      box.addEventListener("click", (e) => { if (CH_REWARD && e.target.closest("[data-js=ch-claim]")) kakaoLogin("stardust", true); });
      // 일곱 방 결제 화면에서 「별가루 충전하러 가기」로 왔으면 돌아가는 단추(이 탭 sessionStorage "strange-oracle-dust-back")
      const backTo = () => { try { return sessionStorage.getItem("strange-oracle-dust-back") || ""; } catch (e) { return ""; } };
      const shop = makeShop(box, { to: "dust", from: "stardust", onCredited: () => draw() });
      const drawShop = shop.draw, settle = shop.settle, readPend = shop.pending, shopOn = shop.on;
      if (shopOn) loadPaid().then(() => { draw(); if (location.hash === "#paid" || readPend()) settle(); if (/^#(paid|login|login-ch0?)$/.test(location.hash)) history.replaceState(null, "", location.pathname); if (chMsg === "ok" && acctOnce.includes("channel")) { try { document.dispatchEvent(new CustomEvent("dust:gain", { detail: { kind: "channel", amt: 10 } })); } catch (e) { /* 무시 */ } } });
      document.addEventListener("dust:change", draw);
      draw();
    }
    return;
  }

  if (CONF.kind !== "tool") return;
  const T = G.tools[CONF.page];
  const form = $("[data-js=tool-form]");
  const out = $("[data-js=tool-result]");
  const err = $("[data-js=tool-error]");
  const showErr = (msg) => { err.textContent = msg; err.hidden = !msg; };
  const num = (name) => { const v = form.elements[name].value.trim(); return v === "" ? NaN : Number(v); };
  const noTime = form.elements.notime; // 날짜만 받는 도구에는 없다
  const syncTime = () => { if (noTime) ["h", "mi"].forEach((n) => { form.elements[n].disabled = noTime.checked; }); };
  if (noTime) noTime.addEventListener("change", syncTime);
  syncTime();
  const validYmd = (y, m, d) => {
    if (![y, m, d].every(Number.isInteger)) return false;
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  };
  const readTime = () => {
    if (noTime.checked) return { time: null };
    const h = num("h"), mi = num("mi");
    if (!(Number.isInteger(h) && h >= 0 && h < 24 && Number.isInteger(mi) && mi >= 0 && mi < 60)) return { bad: true };
    return { time: { h, mi } };
  };
  const ctaHtml = (c) => `<div class="gcta"><h2>${esc(c.head)}</h2><p>${esc(c.body)}</p><a class="gbtn" href="/products/strange-oracle/" data-js="to-room">${esc(c.btn)}</a></div>`;
  const again = () => `<div class="gactions"><button class="gbtn ghost" type="button" data-js="again">${esc(T.form.again)}</button></div>`;
  out.addEventListener("click", (e) => {
    if (!e.target.closest("[data-js=again]")) return;
    if (form.dataset.kind === "draw") { form.requestSubmit(); return; } // 뽑기는 바로 다시 뽑는다
    form.reset();
    syncTime();
    out.hidden = true;
    out.innerHTML = "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  // 천문 계산(나크샤트라·데칸): 누를 때 한 번만 불러온다 (Astronomy Engine 판 고정 + integrity)
  const ASTRONOMY = { src: "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js", integrity: "sha384-LTVHvxfbG3XHla4Lu0C0s9U18B2sBOuzJIeOoVHm2t05SOOORvMbBMEVjXrGau9g" };
  let ready = null;
  const loadAstro = () => ready || (ready = new Promise((ok, no) => {
    if (window.Astronomy && window.Astro) return ok();
    const s = document.createElement("script");
    Object.assign(s, { src: ASTRONOMY.src, integrity: ASTRONOMY.integrity, crossOrigin: "anonymous", async: false });
    s.onload = () => {
      const a = document.createElement("script");
      a.src = "/products/strange-oracle/astro.js";
      a.onload = ok;
      a.onerror = no;
      document.head.append(a);
    };
    s.onerror = () => { ready = null; no(new Error("astronomy")); };
    document.head.append(s);
  }));
  const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const readDate = () => {
    const y = num("y"), m = num("m"), d = num("d");
    if (Number.isInteger(y) && (y < 1900 || y > 2099)) return { err: T.errors.range };
    if (!validYmd(y, m, d)) return { err: T.errors.date };
    return { y, m, d };
  };
  const shown = () => { out.hidden = false; out.scrollIntoView({ behavior: "smooth", block: "start" }); track("so_tool_result", { tool: CONF.page }); if (window.Dust) window.Dust.earn("tool"); };

  // ───────── 무료 만세력 ─────────
  if (CONF.page === "manse") {
    const S = window.Saju;
    const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
    const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
    const EL = ["wood", "fire", "earth", "metal", "water"];
    const calSync = () => { form.elements.leap.closest("label").hidden = form.elements.cal.value !== "lunar"; };
    form.querySelectorAll("input[name=cal]").forEach((r) => r.addEventListener("change", calSync));
    calSync();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showErr("");
      let y = num("y"), m = num("m"), d = num("d");
      const lunar = form.elements.cal.value === "lunar", leap = lunar && form.elements.leap.checked;
      if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2099) return showErr(Number.isInteger(y) && (y < 1900 || y > 2099) ? T.errors.range : T.errors.date);
      if (!lunar && !validYmd(y, m, d)) return showErr(T.errors.date);
      const tm = readTime();
      if (tm.bad) return showErr(T.errors.time);
      try { await S.loadLunar(); } catch (x) { return showErr(T.errors.lib); }
      let note = "";
      if (lunar) {
        try {
          const L = window.Lunar.fromYmd(y, leap ? -m : m, d);
          if (L.getYear() !== y || Math.abs(L.getMonth()) !== m || L.getDay() !== d || (leap && L.getMonth() > 0)) throw new Error("no such day");
          const sol = L.getSolar();
          note = fill(T.result.lunarNote, { y, m, d, leap: leap ? T.result.leapMark : "", sy: sol.getYear(), sm: sol.getMonth(), sd: sol.getDay() });
          y = sol.getYear(); m = sol.getMonth(); d = sol.getDay();
        } catch (x) { return showErr(T.errors.lunar); }
        if (y < 1900 || y > 2099) return showErr(T.errors.range);
      }
      let r;
      try { r = S.compute({ y, m, d, time: tm.time, gender: "none" }); } catch (x) { return showErr(T.errors.date); }
      const R = T.result;
      const cell = (p, kind) => {
        if (!p) return `<div class="gch empty"><b>${esc(R.empty)}</b><i>&nbsp;</i></div>`;
        const idx = kind === "stem" ? p.stem : p.branch;
        const el = EL[kind === "stem" ? STEM_EL[idx] : BRANCH_EL[idx]];
        return `<div class="gch${kind === "stem" && p === r.pillars.day ? " is-day" : ""}" data-el="${el}"><b>${esc(p.hanja[kind === "stem" ? 0 : 1])}</b><i>${esc(p.ko[kind === "stem" ? 0 : 1])}</i></div>`;
      };
      const cols = ["hour", "day", "month", "year"].map((k) => `<div class="gpillar"><small>${esc(R.cols[k])}</small>${cell(r.pillars[k], "stem")}${cell(r.pillars[k], "branch")}</div>`).join("");
      const stem = (window.SAJU && window.SAJU.stems[r.dayStem]) || {};
      const max = Math.max(1, ...Object.values(r.elements));
      const bars = EL.map((k) => `<li data-el="${k}"><span>${esc(R.elementNames[k])}</span><i><u style="width:${((r.elements[k] / max) * 100).toFixed(0)}%"></u></i><b>${r.elements[k]}</b></li>`).join("");
      const notes = [note, r.flags.timeUnknown ? R.timeUnknown : "", r.flags.jieDay ? fill(R.jieDay, { jie: r.flags.jieDay.jie }) : ""].filter(Boolean);
      out.innerHTML = `<h2>${esc(R.head)}</h2>${notes.map((n) => `<p class="gnote">${esc(n)}</p>`).join("")}<div class="gpillars" style="margin-top:12px">${cols}</div>
        <div class="gdm"><h3>${esc(R.dayMaster)} · ${esc(r.dayStemHanja)}</h3><b>${esc(stem.name || r.dayStemKo)}</b><em>${esc(stem.title || "")}</em>${stem.key ? `<p>${esc(stem.key)}</p>` : ""}</div>
        <div class="gels"><h3>${esc(R.elements)}</h3><ul class="gbars">${bars}</ul></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 나크샤트라 계산기 ─────────
  if (CONF.page === "nakshatra") {
    const NAK = window.NAKSHATRAS, RASHI = window.RASHIS;
    const R = T.result;
    const rashi = (i) => `${RASHI[i].ko} · ${RASHI[i].name}`;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showErr("");
      const y = num("y"), m = num("m"), d = num("d");
      if (Number.isInteger(y) && (y < 1900 || y > 2099)) return showErr(T.errors.range);
      if (!validYmd(y, m, d)) return showErr(T.errors.date);
      const tm = readTime();
      if (tm.bad) return showErr(T.errors.time);
      try { await loadAstro(); } catch (x) { return showErr(T.errors.lib); }
      const res = window.Astro.birthChart(y, m, d, tm.time ? { h: tm.time.h, m: tm.time.mi } : null); // astro.js는 분을 m으로 받는다
      let html = `<h2>${esc(R.head)}</h2>`;
      if (res.exact) {
        const c = res.charts[0], n = NAK[c.nakshatra];
        html += `<div class="gnak"><p class="num">${esc(fill(R.nth, { n: c.nakshatra + 1 }))} · ${esc(fill(R.pada, { n: c.pada }))}</p><b>${esc(n.name)}</b><em>${esc(n.title)}</em><p>${esc(n.key)}</p></div>
          <dl class="gkv"><dt>${esc(R.symbol)}</dt><dd>${esc(n.symbol)}</dd><dt>${esc(R.deity)}</dt><dd>${esc(n.deity.split(" — ")[0])}</dd>
          <dt>${esc(R.moonRashi)}</dt><dd>${esc(rashi(c.moonRashi))}</dd><dt>${esc(R.sunVedic)}</dt><dd>${esc(rashi(c.sunRashi))}</dd><dt>${esc(R.sunWestern)}</dt><dd>${esc(R.westernSigns[c.westernSign])}</dd></dl>
          ${c.sunRashi !== c.westernSign ? `<p class="gnote" style="margin-top:10px">${esc(R.diff)}</p>` : ""}`;
      } else {
        const list = res.candidates.length ? res.candidates : [{ chart: res.noon, startMin: 0, endMin: 1440 }];
        html += `<p class="gnote">${esc(R.candidatesHead)}</p><ul class="gcands">${list.map((cd) => { const n = NAK[cd.chart.nakshatra];
          return `<li><small>${esc(fill(R.range, { a: hm(cd.startMin), b: hm(cd.endMin) }))} · ${esc(fill(R.nth, { n: cd.chart.nakshatra + 1 }))}</small><b>${esc(n.name)}</b><span>${esc(n.title)}</span></li>`; }).join("")}</ul>
          <dl class="gkv"><dt>${esc(R.sunVedic)}</dt><dd>${esc(rashi(res.noon.sunRashi))}</dd><dt>${esc(R.sunWestern)}</dt><dd>${esc(R.westernSigns[res.noon.westernSign])}</dd></dl>`;
      }
      out.innerHTML = html + ctaHtml(R.cta) + again();
      shown();
    });
  }

  // ───────── 마야 탄생일 (촐킨) ─────────
  if (CONF.page === "tzolkin") {
    const R = T.result;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showErr("");
      const dt = readDate();
      if (dt.err) return showErr(dt.err);
      const r = window.Calc.tzolkin(dt.y, dt.m, dt.d);
      const sg = window.TZOLKIN_SIGNS[r.sign], nb = window.TZOLKIN_NUMBERS[r.number - 1];
      out.innerHTML = `<h2>${esc(R.head)}</h2><div class="gnak gday"><svg class="gmaya" viewBox="0 0 24 24" aria-hidden="true"><use href="#maya-${r.number}" /></svg><b>${esc(fill(R.dayName, { n: r.number, name: sg.name }))}</b><p class="num">${esc(r.number)} ${esc(sg.latin)}</p></div>
        <div class="gdm"><h3>${esc(R.sign)} · ${esc(sg.latin)}</h3><b>${esc(sg.name)}</b><em>${esc(sg.title)}</em><p>${esc(sg.key)}</p></div>
        <div class="gdm"><h3>${esc(R.number)} · ${esc(r.number)}</h3><b>${esc(nb.title)}</b><p style="margin-top:8px !important">${esc(nb.text)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 이집트 데칸 ─────────
  if (CONF.page === "decan") {
    const R = T.result, D = window.DECANS;
    const where = (i) => fill(R.where, { sign: D[i].sign, part: R.parts[D[i].part - 1] || "" });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showErr("");
      const dt = readDate();
      if (dt.err) return showErr(dt.err);
      try { await loadAstro(); } catch (x) { return showErr(T.errors.lib); }
      const r = window.Calc.decan(dt.y, dt.m, dt.d);
      if (!r) return showErr(T.errors.date);
      let html = `<h2>${esc(R.head)}</h2>`;
      if (!r.candidates.length) {
        const i = r.noon.index, x = D[i];
        html += `<div class="gnak"><p class="num">${esc(fill(R.nth, { n: i + 1 }))}</p><b>${esc(where(i))}</b><em>${esc(x.title)}</em><p>${esc(x.key)}</p></div>`;
      } else {
        html += `<p class="gnote">${esc(R.candidatesHead)}</p><ul class="gcands">${r.candidates.map((c) => { const i = c.decan.index;
          return `<li><small>${esc(fill(R.range, { a: hm(c.startMin), b: hm(c.endMin) }))} · ${esc(fill(R.nth, { n: i + 1 }))}</small><b>${esc(where(i))}</b><span>${esc(D[i].title)}</span></li>`; }).join("")}</ul>`;
      }
      out.innerHTML = html + ctaHtml(R.cta) + again();
      shown();
    });
  }

  // ───────── 이름 오검 ─────────
  if (CONF.page === "nameOgham") {
    const R = T.result, O = window.OGHAM;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showErr("");
      const name = form.elements.name.value.trim();
      if (name.length > 20) return showErr(T.errors.long);
      const r = name ? window.Calc.ogham(name) : null;
      if (!r) return showErr(T.errors.name);
      const x = O[r.index];
      const stave = r.letters.map((i) => `<li><svg viewBox="0 0 40 80" aria-hidden="true"><use href="#ogham-${O[i].code}" /></svg><span>${esc(O[i].sound)}</span></li>`).join("");
      out.innerHTML = `<h2>${esc(R.head)}</h2><ol class="gstave" aria-label="${esc(r.glyphs)}">${stave}</ol><p class="gnote gcenter">${esc(fill(R.latin, { latin: r.latin }))}</p>
        <div class="gnak" style="margin-top:18px"><p class="num">${esc(R.letter)}</p><svg class="gogham" viewBox="0 0 40 80" aria-hidden="true"><use href="#ogham-${x.code}" /></svg><b>${esc(x.name)} · ${esc(x.latin)}</b><em>${esc(x.title)}</em><p>${esc(x.key)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 룬 한 개 뽑기 ─────────
  if (CONF.page === "runeDraw") {
    const R = T.result, RU = window.RUNES;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const x = RU[window.Calc.pickOracle(RU.length)];
      out.innerHTML = `<h2>${esc(R.head)}</h2><div class="gnak"><span class="grune">${esc(x.glyph)}</span><b>${esc(x.name)} · ${esc(x.latin)}</b><em>${esc(x.keyword)}</em><p class="gnote gcenter">${esc(fill(R.image, { image: x.image }))}</p><p>${esc(x.key)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 시빌라 한 줄 신탁 ─────────
  // 적은 고민은 길이만 본다. 뽑기에 쓰지 않고, 어디에도 넣지 않는다(화면 밖으로 나가지 않음)
  if (CONF.page === "sibyl") {
    const R = T.result, OR = window.ORACLES;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showErr("");
      if (form.elements.question.value.length > 100) return showErr(T.errors.long);
      const x = OR[window.Calc.pickOracle(OR.length)];
      out.innerHTML = `<h2>${esc(R.head)}</h2><blockquote class="gscroll">${esc(x.line)}</blockquote><div class="gdm"><b>${esc(x.title)}</b><p style="margin-top:8px !important">${esc(x.key)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }
})();
