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
  const LAND = ["#meta_id"].concat(landPaths.map(slugOf), ["reel_sibyl", "reel_rune", "reel_ogham", "reel_star", "reel_decan", "reel_tzolkin", "reel_saju", "ig_profile", "x_profile", "gads_main"]);
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
    on = A.init({ ga4: CONF.ga4, title: document.title, events: { so_guide_view: { page: PAGES }, so_guide_cta: { page: PAGES }, so_tool_result: { tool: TOOLS }, so_talk: { room: ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"], step: ["answer"] }, so_dust: { step: ["start", "done"] } }, utm: { search, allow: CAMPAIGN, ignore: ["fbclid", "ttclid", "gclid"] } });
    if (on) A.track("so_guide_view", { page: CONF.page });
    const cookie = $("[data-js=cookie-line]");
    if (cookie && A.configured(CONF.ga4)) cookie.hidden = false;
  }
  const track = (n, p) => { if (on) A.track(n, p); };
  document.addEventListener("click", (e) => { if (e.target.closest("[data-js=to-room]")) track("so_guide_cta", { page: CONF.page }); });


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
      try { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", credentials: "omit" }); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { status: r.status, j }; } catch (e) { return { status: 0, j: null }; }
    };
    // 카카오 로그인 시작: 돌아오면 입구가 표를 받아(로그인 유지) 이 별가루 페이지로 다시 보낸다
    const kakaoLogin = () => {
      const st = hex32();
      try { sessionStorage.setItem(KAKAO_KEY, JSON.stringify({ s: st, mode: "login", from: "stardust", prod: "book" })); } catch (e) { return; }
      location.href = "/api/auth/kakao/start?state=" + st;
    };
    let paidBal = null; // 충전한 별가루(서버 값, 화면 메모리만)
    const loadPaid = async () => {
      const lg = readLogin();
      if (!lg) { paidBal = null; return null; }
      const r = await post("/api/auth/dust", { sid: lg.sid });
      if (r.status === 401) { dropLogin(); paidBal = null; return null; }
      paidBal = r.status === 200 && r.j && Number.isInteger(r.j.bal) ? r.j.bal : null;
      return paidBal;
    };

    if (CONF.page === "today") {
      const A = P.app, OR = window.ORACLES;
      const pick = () => window.Calc.pickOracle(OR.length);
      const draw = () => {
        const st = D.state();
        const o = st.oracle && st.oracle.day === D.kstDay() ? st.oracle : null;
        const [, mm, dd] = D.kstDay().split("-").map(Number);
        const head = fill(A.head, { date: fill(A.dateFmt, { m: mm, d: dd }) });
        const left = 7 - (st.run % 7); // 이레를 채운 날은 다음 이레까지 7
        const streak = `<p class="gnote gcenter">${esc(fill(A.streak, { n: st.run || 1 }))} · ${esc(fill(A.streakNext, { left }))}</p>`;
        if (!o) {
          box.innerHTML = `<div class="gtoday"><div class="gtoday__scroll is-closed" aria-hidden="true"></div><button class="gbtn" type="button" data-js="today-open">${esc(A.open)}</button>${streak}</div>`;
          return;
        }
        const x = OR[o.idx];
        const more = o.more.map((i) => `<blockquote class="gscroll gscroll--more"><small>${esc(A.moreHead)}</small>${esc(OR[i].line)}</blockquote>`).join("");
        const need = (COST.more || 0) - st.bal;
        box.innerHTML = `<div class="gtoday"><h2>${esc(head)}</h2><blockquote class="gscroll">${esc(x.line)}</blockquote><div class="gdm"><b>${esc(x.title)}</b><p style="margin-top:8px !important">${esc(x.key)}</p></div>${more}
          <div class="gactions"><button class="gbtn ghost" type="button" data-js="today-more"${need > 0 ? " disabled" : ""}>${esc(fill(A.more, { cost: COST.more }))}</button></div>${need > 0 ? `<p class="gnote gcenter">${esc(fill(A.moreShort, { need }))}</p>` : ""}
          ${streak}<p class="gnote gcenter">${esc(A.tomorrow)}</p><div class="gactions"><a class="gbtn" href="${ROOM_URL}" data-js="to-room">${esc(A.toRoom)}</a></div></div>`;
      };
      box.addEventListener("click", (e) => {
        if (e.target.closest("[data-js=today-open]")) { D.oracleToday(pick); D.earn("oracle"); draw(); track("so_tool_result", { tool: "today" }); }
        else if (e.target.closest("[data-js=today-more]")) { if (D.oracleMore(pick, COST.more)) draw(); }
      });
      document.addEventListener("dust:change", () => { if (!box.querySelector("[data-js=today-open]")) draw(); });
      draw();
    }

    if (CONF.page === "dex") {
      const X = window.DEX, U = X.ui;
      const draw = () => {
        const st = D.state();
        const cards = X.guides.map((g) => {
          const has = st.cards.includes(g.room), open = st.open.includes(g.room);
          const art = `<div class="gcard__art" style="--h:${g.art.hue};background-image:url('/products/strange-oracle/img/dex/${g.art.img}')"><svg class="gcard__fig" viewBox="0 0 48 64" aria-hidden="true"><use href="#guide-${g.room}" /></svg></div>`;
          if (!has) return `<li class="gcard is-locked">${art}<div class="gcard__body"><small>${esc(g.roomName)}</small><b>${esc(U.locked)}</b><p>${esc(fill(U.lockedHint, { room: g.roomName }))}</p><a class="gbtn ghost" href="${ROOM_URL}" data-js="to-room">${esc(fill(U.toRoom, { room: g.roomName }))}</a></div></li>`;
          const tr = Object.entries(U.traitHeads).map(([k, h]) => `<dt>${esc(h)}</dt><dd>${esc(g.traits[k])}</dd>`).join("");
          const need = (COST.story || 0) - st.bal;
          const secret = open
            ? `<div class="gcard__secret"><h3>${esc(U.secretHead)}</h3><p>${esc(g.secret)}</p></div>`
            : `<div class="gcard__secret is-shut"><h3>${esc(U.secretHead)}</h3><button class="gbtn ghost" type="button" data-js="dex-open" data-room="${g.room}"${need > 0 ? " disabled" : ""}>${esc(fill(U.secretOpen, { cost: COST.story }))}</button>${need > 0 ? `<p class="gnote">${esc(fill(U.secretShort, { need }))}</p>` : ""}</div>`;
          return `<li class="gcard">${art}<div class="gcard__body"><small>${esc(g.roomName)} · ${esc(g.place)}</small><b>${esc(g.name)}</b><em>${esc(g.epithet)}</em><q>${esc(g.line)}</q><dl class="gkv">${tr}</dl>${secret}</div></li>`;
        }).join("");
        const all = st.cards.length === X.guides.length;
        box.innerHTML = `<p class="gdex-count">${esc(fill(U.count, { n: st.cards.length }))}</p>
          <div class="gseal${all ? " is-open" : ""}"><b>${esc(U.sealHead)}</b><p>${esc(all ? U.sealText : U.sealHint)}</p></div><ul class="gcards">${cards}</ul>`;
      };
      box.addEventListener("click", (e) => { const b = e.target.closest("[data-js=dex-open]"); if (b && D.openStory(b.dataset.room, COST.story)) draw(); });
      document.addEventListener("dust:change", draw);
      draw();
    }


    // ── 안내자와 면담 (v1-D). talkMode "off"면 아무것도 보내지 않는다.
    //   보내는 것: 방 이름 · 그 방 결과 번호(이 탭 sessionStorage의 방 기록에서 번호만) · 질문 글 · 앞선 문답 3개. 이름·생일은 보내지 않는다
    //   문답은 이 화면 메모리에만 두고 저장하지 않는다
    if (CONF.page === "talk") {
      const A = P.app, X = window.DEX, E = A.errors, COSTQ = COST.talk || 10;
      const on = P.talkMode === "test" || P.talkMode === "live";
      let visits = {};
      try { visits = (JSON.parse(sessionStorage.getItem("strange-oracle") || "null") || {}).visits || {}; } catch (e) { visits = {}; }
      const I = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
      const resultOf = (room) => {
        const v = visits[room];
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
      let cur = null; // 고른 안내자
      let hist = []; // [{ q, a }]
      let busy = false;
      const fig = (room) => `<svg viewBox="0 0 48 64" aria-hidden="true"><use href="#guide-${room}" /></svg>`;
      const pickHtml = () => `<h2>${esc(A.pick)}</h2><ul class="gtalk-pick">${X.guides.map((g) => `<li><button type="button" data-js="talk-pick" data-room="${g.room}"${cur && cur.room === g.room ? ' aria-pressed="true"' : ""}>${fig(g.room)}<b>${esc(g.name)}</b><small>${esc(g.roomName)}</small></button></li>`).join("")}</ul>`;
      const draw = () => {
        if (!on) { box.innerHTML = pickHtml() + `<p class="gnote gcenter gtalk-closed">${esc(A.closed)}</p>`; return; }
        if (!cur) { box.innerHTML = pickHtml(); return; }
        const r = resultOf(cur.room);
        const st = D.state(), usePaid = st.bal < COSTQ && paidBal != null && paidBal >= COSTQ, need = usePaid ? 0 : COSTQ - st.bal;
        const log = hist.map((h) => `<div class="gsay gsay--me"><small>${esc(A.you)}</small><p>${esc(h.q)}</p></div><div class="gsay gsay--guide">${fig(cur.room)}<small>${esc(cur.name)}</small><p>${esc(h.a)}</p></div>`).join("");
        box.innerHTML = pickHtml() + `<div class="gtalk">
          <div class="gsay gsay--guide">${fig(cur.room)}<small>${esc(cur.name)}</small><p>${esc(cur.line)}</p></div>
          <p class="gnote gcenter">${esc(fill(r ? A.known : A.unknown, { room: cur.roomName }))}${r ? "" : ` <a href="/products/strange-oracle/" data-js="to-room">${esc(fill(A.toRoom, { room: cur.roomName }))}</a>`}</p>
          <div data-js="talk-log">${log}</div>
          <form class="gform gtalk-form" data-js="talk-form" novalidate autocomplete="off">
            <label class="gfield gfield--wide"><textarea name="q" rows="3" maxlength="300" placeholder="${esc(A.placeholder)}" aria-label="${esc(A.placeholder)}"></textarea></label>
            <p class="gnote">${esc(A.privacy)} <span data-js="talk-count">${esc(fill(A.count, { n: 0 }))}</span></p>
            <p class="gerror" data-js="talk-error" role="alert" hidden></p>
            <button class="gbtn" type="submit"${need > 0 || busy ? " disabled" : ""}>${esc(fill(A.ask, { cost: COSTQ }))}</button>
            <p class="gnote gcenter">${esc(paidBal != null ? fill(A.balancePaid, { n: st.bal, p: paidBal }) : fill(A.balance, { n: st.bal }))}${need > 0 ? " · " + esc(fill(A.short, { need })) : ""}</p>
          </form></div>`;
      };
      const err = (m) => { const e = box.querySelector("[data-js=talk-error]"); if (e) { e.textContent = m; e.hidden = !m; } };
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-js=talk-pick]");
        if (!b || busy) return;
        const g = X.guides.find((x) => x.room === b.dataset.room);
        if (!g || (cur && cur.room === g.room)) return;
        cur = g;
        hist = [];
        draw();
        if (on) { const t = box.querySelector("textarea"); if (t) t.focus({ preventScroll: true }); }
      });
      box.addEventListener("input", (e) => { if (e.target.name === "q") { const c = box.querySelector("[data-js=talk-count]"); if (c) c.textContent = fill(A.count, { n: e.target.value.length }); } });
      box.addEventListener("submit", async (e) => {
        if (!e.target.closest("[data-js=talk-form]")) return;
        e.preventDefault();
        if (!on || !cur || busy) return;
        const ta = e.target.elements.q, q = ta.value.trim();
        if (!q) return err(E.empty);
        if (q.length > 300) return err(E.long);
        busy = true; // 먼저 잠근다(별가루가 바뀌며 화면을 다시 그리지 않게)
        // 무료로 모은 별가루를 먼저 쓰고, 모자라면 카카오 계정의 충전한 별가루(서버가 차감)
        const lg = readLogin();
        const paid = D.state().bal < COSTQ && lg && paidBal != null && paidBal >= COSTQ;
        if (!paid && !D.spend(COSTQ)) { busy = false; draw(); return; }
        const room = cur.room;
        const logBox = box.querySelector("[data-js=talk-log]");
        logBox.insertAdjacentHTML("beforeend", `<div class="gsay gsay--me"><small>${esc(A.you)}</small><p>${esc(q)}</p></div><div class="gsay gsay--guide is-wait" data-js="talk-wait">${fig(room)}<small>${esc(cur.name)}</small><p>${esc(A.waiting)}</p></div>`);
        e.target.querySelector("button[type=submit]").disabled = true;
        ta.value = "";
        let res = null, data = null;
        try {
          const body = { room, r: resultOf(room), q, hist: hist.slice(-3) };
          if (paid) body.sid = lg.sid;
          res = await fetch("/api/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          data = await res.json();
        } catch (x) { res = null; }
        busy = false;
        if (cur.room !== room) return; // 그새 다른 안내자를 골랐다
        if (res && res.ok && data && typeof data.a === "string") {
          if (!paid && (data.crisis || data.declined)) D.refund(COSTQ); // 위기 안내·답하지 못한 물음은 별가루를 쓰지 않는다
          if (paid && Number.isInteger(data.paid)) paidBal = data.paid;
          hist.push({ q, a: data.a.slice(0, 600) });
          track("so_talk", { room, step: "answer" });
          draw();
        } else {
          if (!paid) D.refund(COSTQ);
          const code = data && data.error;
          if (code === "session") { dropLogin(); paidBal = null; }
          if (code === "dust") await loadPaid();
          draw();
          err(code === "session" ? A.sessionEnd : code === "off" ? E.off : code === "budget" ? E.budget : code === "rate" ? E.rate : E.fail);
          const t = box.querySelector("textarea"); if (t) t.value = q;
        }
        const last = box.querySelectorAll(".gsay");
        if (last.length) last[last.length - 1].scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      loadPaid().then(() => { if (!busy) { const t = box.querySelector("textarea"); const keep = t ? t.value : ""; draw(); const t2 = box.querySelector("textarea"); if (t2) t2.value = keep; } });
      document.addEventListener("dust:change", () => { if (!busy && cur) { const t = box.querySelector("textarea"); const keep = t ? t.value : ""; draw(); const t2 = box.querySelector("textarea"); if (t2) t2.value = keep; } });
      draw();
    }

    if (CONF.page === "stardust") {
      const A = P.app;
      const draw = () => {
        const st = D.state();
        const uses = A.uses.map((u) => `<li><span>${esc(u.label)}</span><b>${esc(u.amt)}</b></li>`).join("");
        const ways = A.ways.map((w) => `<li><span>${esc(w.label)}<small>${esc(w.note)}</small></span><b>${esc(w.amt)}</b></li>`).join("");
        box.innerHTML = `<div class="gdust"><small>${esc(A.balance)}</small><b><i aria-hidden="true">✦</i> ${st.bal}</b><p>${esc(fill(A.today, { got: st.got, cap: st.cap }))}</p><i class="gdust__bar"><u style="width:${Math.round((st.got / st.cap) * 100)}%"></u></i></div>
          <h2>${esc(A.waysHead)}</h2><ul class="grows">${ways}</ul><p class="gnote">${esc(A.capNote)}</p>
          <h2>${esc(A.usesHead)}</h2><ul class="grows">${uses}</ul>
          <div data-js="dust-shop"></div>
          <div class="gactions"><button class="gbtn ghost" type="button" data-js="dust-clear">${esc(A.clear)}</button></div><p class="gnote gcenter" data-js="dust-cleared" hidden>${esc(A.cleared)}</p>`;
        drawShop();
      };
      // ── 충전 (운영 규칙 7장): 결제 전에 받는 것·가격·환불·판매자를 보이고, 동의 체크 뒤에만 결제창
      const S = A.shop || {};
      const shopOn = A.shopMode === "live" || A.shopMode === "test";
      const PEND_KEY = "strange-oracle-dustpay"; // 이 탭 sessionStorage: 결제 요청 번호 R(무작위)·상품·받은 결제 코드
      const readPend = () => { try { const x = JSON.parse(sessionStorage.getItem(PEND_KEY) || "null"); return x && /^[0-9a-f]{32}$/.test(x.r) && S.packs.some((k) => k.prod === x.prod) ? x : null; } catch (e) { return null; } };
      const writePend = (x) => { try { if (x) sessionStorage.setItem(PEND_KEY, JSON.stringify(x)); else sessionStorage.removeItem(PEND_KEY); } catch (e) { /* 무시 */ } };
      let pick = null, shopMsg = "", shopBusy = false, showRetry = false;
      const won = (n) => Number(n).toLocaleString("ko-KR");
      function drawShop() {
        const el = box.querySelector("[data-js=dust-shop]");
        if (!el || !shopOn) return;
        const lg = readLogin();
        let h = `<h2>${esc(S.head)}</h2><p class="gnote">${esc(S.lead)}</p>`;
        if (!lg) {
          h += `<div class="gactions"><button class="gbtn" type="button" data-js="dust-login">${esc(S.login)}</button></div><p class="gnote gcenter">${esc(S.loginNote)}</p>`;
        } else {
          h += `<div class="gdust gdust--paid"><small>${esc(S.paidWhere)}</small><b><i aria-hidden="true">✦</i> ${paidBal == null ? "…" : paidBal}</b><p>${esc(fill(S.paidBal, { n: paidBal == null ? "…" : paidBal }))}</p></div>
            <ul class="gpacks">${S.packs.map((k) => `<li><button type="button" data-js="dust-pack" data-prod="${k.prod}"${pick === k.prod ? ' aria-pressed="true"' : ""}><b>${esc(fill(S.pack, { n: k.n }))}</b><small>${esc(fill(S.packTalk, { q: Math.floor(k.n / COST.talk || k.n / 10) }))}</small><span>${esc(fill(S.price, { price: won(k.price) }))}</span></button></li>`).join("")}</ul>
            <ul class="gsources">${S.terms.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
            <p class="gnote"><a href="/products/strange-oracle/legal/terms.html#s2-4">${esc(S.termsLink)}</a></p>
            <label class="gcheck"><input type="checkbox" data-js="dust-agree" />${esc(S.agree)}</label>
            <div class="gactions"><button class="gbtn" type="button" data-js="dust-buy"${shopBusy ? " disabled" : ""}>${esc(pick ? fill(S.buy, { price: won(S.packs.find((k) => k.prod === pick).price), n: S.packs.find((k) => k.prod === pick).n }) : S.pick)}</button></div>`;
        }
        h += `<p class="gnote gcenter" data-js="dust-msg" role="status">${esc(shopMsg)}</p>${showRetry ? `<div class="gactions"><button class="gbtn ghost" type="button" data-js="dust-retry">${esc(S.retry)}</button></div>` : ""}`;
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
          const v = { goodname: k.goodname, price: String(k.price), feedbackurl: `${o}/api/pay/feedback`, returnurl: `${o}/api/pay/return?to=dust`, var1: r, var2: k.tag, openpaytype: PA.openpaytype, checkretry: "y", smsuse: "n", skip_cstpage: "y", redirectpay: "1" };
          Object.keys(v).forEach((x) => P.setParam(x, v[x]));
          if (typeof P.setTarget === "function") P.setTarget("_self");
          track("so_dust", { step: "start" });
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
          if (c.j.state === "credited") track("so_dust", { step: "done" });
          return say(c.j.state === "already" ? S.already : fill(S.credited, { n: c.j.n }));
        }
        if (c.status === 401) { dropLogin(); return say(S.session); }
        if (c.status === 409) { writePend(null); return say(S.used); }
        say(S.late, true);
      }
      box.addEventListener("click", (e) => {
        const t = e.target;
        if (t.closest("[data-js=dust-login]")) return kakaoLogin();
        const pk = t.closest("[data-js=dust-pack]");
        if (pk) { pick = pk.dataset.prod; shopMsg = ""; return drawShop(); }
        if (t.closest("[data-js=dust-retry]")) return settle();
        if (t.closest("[data-js=dust-buy]")) {
          if (!pick) return say(S.pick);
          if (!box.querySelector("[data-js=dust-agree]").checked) return say(S.agreeNudge);
          return startBuy();
        }
      });
      if (shopOn) loadPaid().then(() => { drawShop(); if (location.hash === "#paid" || readPend()) settle(); if (/^#(paid|login)$/.test(location.hash)) history.replaceState(null, "", location.pathname); });
      box.addEventListener("click", (e) => {
        if (!e.target.closest("[data-js=dust-clear]")) return;
        if (!window.confirm(A.clearAsk)) return;
        D.clear();
        draw();
        box.querySelector("[data-js=dust-cleared]").hidden = false;
      });
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
