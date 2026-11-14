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


    // ── (v1-F) 안내자 그림(아치 문 + 실루엣 + 방 명화)·방 데이터 불러오기
    const DEXG = () => (window.DEX && window.DEX.guides) || [];
    const guide = (room) => DEXG().find((g) => g.room === room);
    const IMG = (room) => `/products/strange-oracle/img/dex/dex-${room}.webp`;
    // (2026-11-14) 아치 문 안은 안내자 초상(img/guide/, 어둡게 다듬은 그림). 작은 얼굴(xs)은 눈높이(FACE_Y, 그림 높이 비율)에 맞춰 확대
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
      const base = { kw, act, key: x.key };
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
      <b>${esc(v.name)}</b>${v.sub ? `<em>${esc(v.sub)}</em>` : ""}${v.kw.length ? `<span class="gread__kw">${v.kw.map((k) => `<i>${esc(k)}</i>`).join("")}</span>` : ""}<p>${esc(v.key)}</p>${v.act && ACT ? `<p class="gread__act"><small>${esc(ACT)}</small>${esc(v.act)}</p>` : ""}</article>`;

    if (CONF.page === "today") {
      const A = P.app;
      const pick = (room) => window.Calc.pickOracle((ROOM_DATA[room][1]() || []).length || 1);
      const [, mm, dd] = D.kstDay().split("-").map(Number);
      const nextRoom = D.TODAY_ORDER[(D.TODAY_ORDER.indexOf(D.guideOf()) + 1) % 7];
      let busy = false, msg = "";
      const draw = () => {
        const room = D.guideOf(), g = guide(room), st = D.state();
        const o = st.oracle && st.oracle.day === D.kstDay() && st.oracle.room === room ? st.oracle : null;
        let h = `<section class="gtoday-hero" style="--art:url('${IMG(room)}')">${arch(room, "garch--lg")}
          <p class="gchip">${esc(A.chip)} · ${esc(fill(A.dateFmt, { m: mm, d: dd }))}</p><h2>${esc(g.name)}</h2><p class="gtoday-hero__epi">${esc(g.epithet)}</p>
          <p class="gtoday-hero__intro">${esc(g.today.intro)}</p>`;
        if (!o) h += `<button class="gbtn" type="button" data-js="today-open"${busy ? " disabled" : ""}>${esc(g.today.open)}</button><small class="gnote gcenter">${esc(A.reward)}</small>`;
        h += `</section>`;
        if (o) {
          const list = ROOM_DATA[room][1]();
          if (list) h += readCard(room, itemView(room, list, o.idx), fill(A.receivedHead, { name: g.name }));
          const others = D.TODAY_ORDER.filter((r) => r !== room);
          const got = o.extra || [];
          const need = (COST.extra || 0) - st.bal;
          h += got.map((x) => { const l = ROOM_DATA[x.room][1](); return l ? readCard(x.room, itemView(x.room, l, x.idx), fill(A.receivedHead, { name: guide(x.room).name })) : ""; }).join("");
          h += `<section class="gothers"><h2>${esc(A.othersHead)}</h2><p class="gnote">${esc(fill(A.othersNote, { cost: COST.extra }))}${need > 0 ? " · " + esc(fill(A.othersShort, { need })) : ""}</p>
            <ul class="gpickrow">${others.map((r) => { const done = got.some((x) => x.room === r); return `<li><button type="button" data-js="today-extra" data-room="${r}"${done || need > 0 || busy ? " disabled" : ""}${done ? ' aria-pressed="true"' : ""}>${arch(r, "garch--sm")}<span>${esc(guide(r).name)}</span></button></li>`; }).join("")}</ul></section>`;
          h += `<p class="gnote gcenter">${esc(fill(A.tomorrow, { name: guide(nextRoom).name }))}</p><div class="gactions"><a class="gbtn ghost" href="${ROOM_URL}" data-js="to-room">${esc(fill(A.toRoom, { room: g.roomName }))}</a></div>`;
        }
        if (msg) h += `<p class="gerror" role="alert">${esc(msg)}</p>`;
        box.innerHTML = h;
      };
      box.addEventListener("click", async (e) => {
        const openB = e.target.closest("[data-js=today-open]"), ex = e.target.closest("[data-js=today-extra]");
        if ((!openB && !ex) || busy) return;
        busy = true; msg = "";
        try {
          if (openB) {
            const room = D.guideOf();
            await loadRoom(room);
            D.oracleToday(pick);
            D.earn("oracle");
            track("so_tool_result", { tool: "today" });
          } else {
            const room = ex.dataset.room;
            await loadRoom(room);
            D.oracleExtra(room, pick, COST.extra);
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
    }

    if (CONF.page === "dex") {
      const X = window.DEX, U = X.ui;
      let openRoom = null;
      const draw = () => {
        const st = D.state();
        const all = st.cards.length === X.guides.length;
        const cards = X.guides.map((g) => {
          const has = st.cards.includes(g.room);
          return `<li><button type="button" class="gdexcard${has ? "" : " is-locked"}" data-js="dex-card" data-room="${g.room}">${arch(g.room, "garch--md")}<small>${esc(g.roomName)}</small><b>${esc(has ? g.name : U.locked)}</b>${has ? `<span>${esc(g.epithet)}</span>` : `<span>${esc(fill(U.lockedHint, { room: g.roomName }))}</span>`}</button></li>`;
        }).join("");
        let h = `<div class="gseal${all ? " is-open" : ""}"><b>${esc(U.sealHead)} · ${esc(fill(U.count, { n: st.cards.length }))}</b><p>${esc(all ? U.sealText : U.sealHint)}</p></div><ul class="gdexgrid">${cards}</ul>`;
        if (openRoom) {
          const g = guide(openRoom), has = st.cards.includes(g.room), open = st.open.includes(g.room), need = (COST.story || 0) - st.bal;
          const tr = Object.entries(U.traitHeads).map(([k, hd]) => `<dt>${esc(hd)}</dt><dd>${esc(g.traits[k])}</dd>`).join("");
          h += `<div class="gsheet" role="dialog" aria-modal="true" aria-label="${esc(g.name)}"><div class="gsheet__scrim" data-js="dex-close"></div><div class="gsheet__body" style="--art:url('${IMG(g.room)}')">
            <button class="gsheet__x" type="button" data-js="dex-close" aria-label="닫기">×</button>${arch(g.room, "garch--lg")}
            <small class="gchip">${esc(g.roomName)} · ${esc(g.place)}</small><h2>${esc(has ? g.name : U.locked)}</h2>`;
          if (has) {
            h += `<p class="gtoday-hero__epi">${esc(g.epithet)}</p><q class="gline">${esc(g.line)}</q><dl class="gkv">${tr}</dl>
              <div class="gcard__secret${open ? "" : " is-shut"}"><h3>${esc(U.secretHead)}</h3>${open ? `<p>${esc(g.secret)}</p>` : `<button class="gbtn ghost" type="button" data-js="dex-open" data-room="${g.room}"${need > 0 ? " disabled" : ""}>${esc(fill(U.secretOpen, { cost: COST.story }))}</button>${need > 0 ? `<p class="gnote">${esc(fill(U.secretShort, { need }))}</p>` : ""}`}</div>`;
          } else {
            h += `<p class="gnote gcenter">${esc(fill(U.lockedHint, { room: g.roomName }))}</p><div class="gactions"><a class="gbtn" href="${ROOM_URL}" data-js="to-room">${esc(fill(U.toRoom, { room: g.roomName }))}</a></div>`;
          }
          h += `</div></div>`;
        }
        box.innerHTML = h;
        document.documentElement.classList.toggle("sheet-open", Boolean(openRoom));
      };
      box.addEventListener("click", (e) => {
        const c = e.target.closest("[data-js=dex-card]");
        if (c) { openRoom = c.dataset.room; return draw(); }
        if (e.target.closest("[data-js=dex-close]")) { openRoom = null; return draw(); }
        const b = e.target.closest("[data-js=dex-open]");
        if (b && D.openStory(b.dataset.room, COST.story)) draw();
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openRoom) { openRoom = null; draw(); } });
      document.addEventListener("dust:change", draw);
      draw();
    }

    // ── 안내자와 면담 (v1-D 함수 · v1-F 방 화면). talkMode "off"면 아무것도 보내지 않는다.
    //   보내는 것: 방 이름 · 그 방 결과 번호(이 탭 sessionStorage의 방 기록에서 번호만) · 질문 글 · 앞선 문답 3개(· 충전분이면 로그인 표). 이름·생일은 보내지 않는다
    //   문답은 이 화면 메모리에만 두고 저장하지 않는다
    if (CONF.page === "talk") {
      const A = P.app, X = window.DEX, E = A.errors, COSTQ = COST.talk || 10;
      const on = P.talkMode === "test" || P.talkMode === "live";
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      let cur = null; // 고른 안내자(방 안에 있을 때)
      const hists = {}; // 방마다 [{ q, a }] — 메모리만
      let busy = false, entering = false;
      const lobby = () => `<p class="gnote gcenter">${esc(on ? A.pick : A.closed)}</p><ul class="gdoorpick">${X.guides.map((g) => `<li><button type="button" data-js="talk-pick" data-room="${g.room}">${arch(g.room, "garch--door")}<b>${esc(g.name)}</b><small>${esc(g.roomName)}</small></button></li>`).join("")}</ul>`;
      const balLine = () => { const st = D.state(); return paidBal != null ? fill(A.balancePaid, { n: st.bal, p: paidBal }) : fill(A.balance, { n: st.bal }); };
      const say = (who, text, extra = "") => `<div class="gsay gsay--${who}${extra}">${who === "guide" ? arch(cur.room, "garch--xs") : ""}<p>${esc(text)}</p></div>`;
      const room = () => {
        const g = cur, r = resultOf(g.room), hist = hists[g.room] || [];
        const st = D.state(), usePaid = st.bal < COSTQ && paidBal != null && paidBal >= COSTQ, need = usePaid ? 0 : COSTQ - st.bal;
        return `<div class="groom${entering ? " is-enter" : ""}" role="dialog" aria-modal="true" aria-label="${esc(g.name)}" style="--art:url('${IMG(g.room)}')">
          <header class="groom__top"><button type="button" class="groom__back" data-js="talk-leave" aria-label="${esc(A.leave)}">←</button>${arch(g.room, "garch--xs")}<span class="groom__who"><b>${esc(g.name)}</b><small><i></i>${esc(A.status)} · ${esc(g.roomName)}</small></span></header>
          <div class="groom__log" data-js="talk-log">${say("guide", g.line)}${r ? "" : `<p class="groom__note">${esc(fill(A.unknown, { room: g.roomName }))} <a href="${ROOM_URL}" data-js="to-room">${esc(fill(A.toRoom, { room: g.roomName }))}</a></p>`}${r ? `<p class="groom__note">${esc(fill(A.known, { room: g.roomName }))}</p>` : ""}
            ${hist.map((h) => say("me", h.q) + say("guide", h.a)).join("")}</div>
          <form class="groom__bar" data-js="talk-form" novalidate autocomplete="off">
            <p class="groom__meta"><span>${esc(balLine())}</span>${need > 0 ? `<a href="/stardust/">${esc(fill(A.short, { need }))}</a>` : `<span>${esc(A.privacy)}</span>`}</p>
            <p class="gerror" data-js="talk-error" role="alert" hidden></p>
            <div class="groom__row"><textarea name="q" rows="1" maxlength="300" placeholder="${esc(A.placeholder)}" aria-label="${esc(A.placeholder)}"></textarea><button type="submit" class="groom__send"${need > 0 || busy ? " disabled" : ""} aria-label="${esc(fill(A.ask, { cost: COSTQ }))}"><span>✦${COSTQ}</span></button></div>
          </form></div>`;
      };
      const draw = () => {
        box.innerHTML = lobby() + (on && cur ? room() : "");
        entering = false;
        document.documentElement.classList.toggle("room-open", Boolean(on && cur));
        const log = box.querySelector("[data-js=talk-log]");
        if (log) log.scrollTop = log.scrollHeight;
      };
      // 방 안의 잔액 줄·보내기 버튼만 새로 (대화는 그대로 두어 깜빡이지 않게)
      const refresh = () => {
        if (busy || !cur) return;
        const bar = box.querySelector(".groom__bar");
        if (!bar) return;
        const st = D.state(), usePaid = st.bal < COSTQ && paidBal != null && paidBal >= COSTQ, need = usePaid ? 0 : COSTQ - st.bal;
        bar.querySelector(".groom__meta").innerHTML = `<span>${esc(balLine())}</span>${need > 0 ? `<a href="/stardust/">${esc(fill(A.short, { need }))}</a>` : `<span>${esc(A.privacy)}</span>`}`;
        bar.querySelector(".groom__send").disabled = need > 0;
      };
      const err = (m) => { const e = box.querySelector("[data-js=talk-error]"); if (e) { e.textContent = m; e.hidden = !m; } };
      // 글자가 이어 나오는 답 (움직임 줄이기면 한 번에)
      const typeOut = (el, text) => new Promise((ok) => {
        if (reduce) { el.textContent = text; return ok(); }
        let i = 0;
        const step = () => { i = Math.min(text.length, i + 2); el.textContent = text.slice(0, i); const log = box.querySelector("[data-js=talk-log]"); if (log) log.scrollTop = log.scrollHeight; if (i < text.length) setTimeout(step, 22); else ok(); };
        step();
      });
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-js=talk-pick]");
        if (b && !busy) {
          if (!on) return;
          cur = X.guides.find((x) => x.room === b.dataset.room) || null;
          entering = true;
          draw();
          const t = box.querySelector(".groom textarea"); if (t) t.focus({ preventScroll: true });
          return;
        }
        if (e.target.closest("[data-js=talk-leave]") && !busy) { cur = null; draw(); }
      });
      box.addEventListener("input", (e) => { if (e.target.name === "q") { e.target.style.height = "auto"; e.target.style.height = Math.min(120, e.target.scrollHeight) + "px"; } });
      box.addEventListener("keydown", (e) => { if (e.target.name === "q" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); } });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && cur && !busy) { cur = null; draw(); } });
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
        const g = cur, roomName = g.room, hist = hists[roomName] || (hists[roomName] = []);
        const logBox = box.querySelector("[data-js=talk-log]");
        logBox.insertAdjacentHTML("beforeend", say("me", q, " is-new") + `<div class="gsay gsay--guide is-wait is-new" data-js="talk-wait">${arch(roomName, "garch--xs")}<p><span class="gdots" aria-label="${esc(fill(A.typing, { name: g.name }))}"><i></i><i></i><i></i></span></p></div>`);
        logBox.scrollTop = logBox.scrollHeight;
        e.target.querySelector("button[type=submit]").disabled = true;
        ta.value = ""; ta.style.height = "auto";
        let res = null, data = null;
        try {
          const body = { room: roomName, r: resultOf(roomName), q, hist: hist.slice(-3) };
          if (paid) body.sid = lg.sid;
          res = await fetch("/api/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          data = await res.json();
        } catch (x) { res = null; }
        const wait = box.querySelector("[data-js=talk-wait]");
        if (res && res.ok && data && typeof data.a === "string") {
          if (!paid && (data.crisis || data.declined)) D.refund(COSTQ); // 위기 안내·답하지 못한 물음은 별가루를 쓰지 않는다
          if (paid && Number.isInteger(data.paid)) paidBal = data.paid;
          const a = data.a.slice(0, 600);
          hist.push({ q, a });
          track("so_talk", { room: roomName, step: "answer" });
          if (wait) { wait.classList.remove("is-wait"); wait.removeAttribute("data-js"); await typeOut(wait.querySelector("p"), a); }
          busy = false;
          refresh();
        } else {
          busy = false;
          if (!paid) D.refund(COSTQ);
          const code = data && data.error;
          if (code === "session") { dropLogin(); paidBal = null; }
          if (code === "dust") await loadPaid();
          draw();
          err(code === "session" ? A.sessionEnd : code === "off" ? E.off : code === "budget" ? E.budget : code === "rate" ? E.rate : E.fail);
          const t = box.querySelector(".groom textarea"); if (t) t.value = q;
        }
      });
      loadPaid().then(refresh);
      document.addEventListener("dust:change", refresh);
      draw();
    }

    if (CONF.page === "stardust") {
      const A = P.app;
      // (v1-F) 한 장짜리: 잔액 카드 → 모으는 법·쓰는 곳(짧은 두 칸) → 충전 → 지우기
      const draw = () => {
        const st = D.state();
        const mini = (head, list, sign) => `<section class="gmini"><h2>${esc(head)}</h2><ul>${list.map((x) => `<li><span>${esc(x.label)}${x.note ? `<small>${esc(x.note)}</small>` : ""}</span><b>${sign}${esc(String(x.amt).replace(/^\+/, ""))}</b></li>`).join("")}</ul></section>`;
        box.innerHTML = `<div class="gwallet"><small>${esc(A.balance)}</small><b><i aria-hidden="true">✦</i> <span data-js="dust-total">${st.bal + (paidBal || 0)}</span></b>
            <p><span>${esc(A.free)} ${st.bal}</span>${paidBal != null ? `<span>${esc(A.paid)} ${paidBal}</span>` : ""}</p></div>
          <div class="gminis">${mini(A.waysHead, A.ways, "+")}${mini(A.usesHead, A.uses, "−")}</div>
          <div data-js="dust-shop"></div>
          <p class="gcenter"><button class="glink" type="button" data-js="dust-clear">${esc(A.clear)}</button></p><p class="gnote gcenter" data-js="dust-cleared" hidden>${esc(A.cleared)}</p>`;
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
        let h = `<section class="gshop"><h2>${esc(S.head)}</h2><p class="gnote">${esc(S.lead)}</p>`;
        if (!lg) {
          h += `<div class="gactions"><button class="gbtn gbtn--kakao" type="button" data-js="dust-login">${esc(S.login)}</button></div><p class="gnote gcenter">${esc(S.loginNote)}</p>`;
        } else {
          const k = S.packs.find((x) => x.prod === pick);
          h += `<ul class="gpacks">${S.packs.map((x) => `<li><button type="button" data-js="dust-pack" data-prod="${x.prod}" aria-pressed="${pick === x.prod}"><b><i aria-hidden="true">✦</i> ${x.n}</b><small>${esc(fill(S.packTalk, { q: Math.floor(x.n / (COST.talk || 10)) }))}</small><span>${esc(fill(S.price, { price: won(x.price) }))}</span></button></li>`).join("")}</ul>
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
          draw();
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
        if (pk) { const ag = box.querySelector("[data-js=dust-agree]"); const keep = ag && ag.checked; pick = pk.dataset.prod; shopMsg = ""; drawShop(); const ag2 = box.querySelector("[data-js=dust-agree]"); if (ag2) ag2.checked = keep; return; }
        if (t.closest("[data-js=dust-retry]")) return settle();
        if (t.closest("[data-js=dust-buy]")) {
          if (!pick) return say(S.pick);
          if (!box.querySelector("[data-js=dust-agree]").checked) return say(S.agreeNudge);
          return startBuy();
        }
      });
      if (shopOn) loadPaid().then(() => { draw(); if (location.hash === "#paid" || readPend()) settle(); if (/^#(paid|login)$/.test(location.hash)) history.replaceState(null, "", location.pathname); });
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
