// 낯선 점술관 — 화면 동작.
// 문구는 모두 data.js(TEXT)·data-runes.js(RUNES)·data-stars.js(NAKSHATRAS·RASHIS·PLANETS)
// ·data-ogham.js(OGHAM)·data-decans.js(DECANS)·data-tzolkin.js(TZOLKIN_SIGNS·TZOLKIN_NUMBERS)·data-oracles.js(ORACLES·ORACLE_TOPICS)에서 가져온다.
// 계산: astro.js(별), calc.js(오검·데칸·촐킨·시빌라 뽑기, 한글 로마자).
// 요소는 id 또는 data-js로 찾는다(class 이름에 기능을 걸지 않음). 상태는 is-* class를 붙였다 뗀다.
//
// 개인정보 (CLAUDE.md 6장 sessionStorage 예외):
//  - 이 탭의 sessionStorage 한 칸("strange-oracle")에만 저장한다. 탭을 닫으면 사라진다.
//  - 저장하는 값: profile = 이름, 생년월일, 태어난 시각(모르면 null, 묻지 않았으면 없음) / visits = 방마다 결과 유형 코드와 원형 태그
//  - 시빌라 신탁의 방 질문(자유 입력)은 어디에도 저장하지 않는다(sessionStorage 포함). 이 스크립트 안 변수와 화면에만 있다.
//    공유 카드·나의 이야기·URL에도 넣지 않는다. 오검 로마자·오검 글자 줄도 저장하지 않고 이름에서 매번 계산한다.
//  - 처음 저장하기 전 입력칸 아래에 "이 기기의 이 탭에만 잠시 보관되며 어디에도 전송되지 않는다" 안내를 보인다.
//  - "내 정보 지우기"(모든 화면 상단) → 확인 대화상자 → 모두 지움.
//  - 네트워크 전송·localStorage·쿠키·URL에는 어떤 입력값도 넣지 않는다. (8단계 U1: URL 해시에는 화면 이름만 쓴다 — history.pushState)
(function () {
  "use strict";
  const T = window.TEXT;
  const RUNES = window.RUNES;
  const NAKS = window.NAKSHATRAS;
  const RASHIS = window.RASHIS;
  const PLANETS = window.PLANETS;
  const OGHAM = window.OGHAM;
  const DECANS = window.DECANS;
  const TZ_SIGNS = window.TZOLKIN_SIGNS;
  const TZ_NUMBERS = window.TZOLKIN_NUMBERS;
  const ORACLES = window.ORACLES;
  const ORACLE_TOPICS = window.ORACLE_TOPICS;
  const Calc = window.Calc;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const body = document.body;

  // ───────── 요소 찾기 ─────────
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const js = (name, scope) => $(`[data-js="${name}"]`, scope);
  const jsAll = (name, scope) => $$(`[data-js="${name}"]`, scope);
  const show = (el, on = true) => el && el.classList.toggle("is-hidden", !on);

  // ───────── 문구 도우미 ─────────
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), T);
  // "{who}의 룬" 같은 자리에 값을 채운다
  const fill = (str, vars = {}) => String(str ?? "").replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const strip = (html) => String(html).replace(/<[^>]*>/g, "");
  // 받침 유무로 조사 고르기: particle("얼음", "이/가") → "이"
  function particle(word, pair) {
    const [withFinal, without] = pair.split("/");
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    return code >= 0 && code <= 11171 && code % 28 !== 0 ? withFinal : without;
  }
  const whoOf = (name) => (name ? fill(T.common.youWithName, { name }) : T.common.you);
  const minutesOf = (html) => Math.max(1, Math.round(strip(html).replace(/\s+/g, " ").length / 450));
  const pad2 = (n) => String(n).padStart(2, "0");
  const hhmm = (min) => `${Math.floor(min / 60)}:${pad2(min % 60)}`;
  // 진동 (기존 동작). 사용자가 화면을 한 번이라도 누른 뒤에만 부른다 (그 전에는 브라우저가 막고 콘솔에 경고를 남김)
  const buzz = (pattern) => {
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(pattern);
  };

  // ───────── 방 구성 (기획서 고정값) ─────────
  // 나의 이야기 장 순서 (방문 순서와 무관). 동점일 때도 이 순서로 앞선 장이 이긴다
  // paycode.js(브라우저·서버 공용) 한 곳에서 읽는다 (spec 7-1): Ⅰ오검 Ⅱ별 Ⅲ데칸 Ⅳ촐킨 Ⅴ룬 Ⅵ시빌라
  const CHAPTER_ORDER = window.PayCode.CHAPTER_ORDER;
  const OPEN_ROOMS = CHAPTER_ORDER; // 2단계: 여섯 방 모두 출시됨 (출시 범위. 세션 진행 잠금은 아래 isUnlocked — 다른 축)
  const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
  // 1~39 로마 숫자 (신탁 번호 I~XXXII)
  const roman = (n) => "X".repeat(Math.floor(n / 10)) + ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][n % 10];
  const chapterOf = (room) => CHAPTER_ORDER.indexOf(room) + 1;
  // (7단계) 강제 순차 진행 (spec 7-2): 문 N은 문 N-1의 결과까지 마쳐야(state.visits[room]) 열린다
  const isDone = (room) => Boolean(state.visits[room]);
  const isUnlocked = (room) => CHAPTER_ORDER.slice(0, CHAPTER_ORDER.indexOf(room)).every(isDone);
  const nextRoom = () => CHAPTER_ORDER.find((r) => !isDone(r)) || null;
  const MOON_SVG = '<svg viewBox="0 0 40 40"><path d="M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z" fill="currentColor"/></svg>';
  const ROOM_ICON = {
    rune: '<svg viewBox="0 0 40 60"><use href="#rune-raidho" /></svg>',
    star: MOON_SVG,
    ogham: '<svg viewBox="0 0 40 80"><use href="#ogham-beith" /></svg>',
    decan: '<svg viewBox="0 0 40 40"><use href="#icon-decan" /></svg>',
    tzolkin: '<svg viewBox="0 0 40 40"><use href="#icon-tzolkin" /></svg>',
    sibyl: '<svg viewBox="0 0 40 40"><use href="#icon-sibyl" /></svg>',
  };
  const RUNE_BY_CODE = Object.fromEntries(RUNES.map((r, i) => [r.code, Object.assign({ index: i }, r)]));
  const ARCHETYPES = Object.keys(T.archetypes);
  const FONTS = { serif: "'Gowun Batang', serif", latin: "'Cinzel', 'Gowun Batang', serif", glyph: "'Noto Sans Runic', 'Segoe UI Historic', sans-serif" };
  const CARD_THEME = {
    rune: { bgTop: "#080717", bgBottom: "#042234", accent: "#93d5f5", text: "#f5f2e9", muted: "#b8b8ce" },
    star: { bgTop: "#080717", bgBottom: "#221838", accent: "#cec1fa", text: "#f5f2e9", muted: "#b8b8ce" },
    story: { bgTop: "#080717", bgBottom: "#261a3a", accent: "#ebc573", text: "#f5f2e9", muted: "#b8b8ce" },
    // (2단계) design/strange-oracle.md "공유 카드 레이아웃" 표
    ogham: { bgTop: "#080717", bgBottom: "#002a17", accent: "#a3dbad", text: "#f5f2e9", muted: "#b8b8ce" },
    decan: { bgTop: "#080717", bgBottom: "#2e1706", accent: "#fcbc7c", text: "#f5f2e9", muted: "#b8b8ce" },
    tzolkin: { bgTop: "#080717", bgBottom: "#00282a", accent: "#80ded7", text: "#f5f2e9", muted: "#b8b8ce" },
    sibyl: { bgTop: "#080717", bgBottom: "#2c1026", accent: "#fab8a8", text: "#f5f2e9", muted: "#b8b8ce" },
  };
  const SIBYL_TOPIC_KEYS = Object.keys(T.sibyl.topics);

  // ───────── 저장 (sessionStorage, 이 탭 한정) ─────────
  const STORE_KEY = "strange-oracle";
  // (8단계) 인트로가 없어져 started 칸은 쓰지 않는다. 새 세션 = 마친 방이 없음 → 입구부터
  const emptyState = () => ({ profile: {}, visits: {} });
  function validVisit(room, v) {
    if (!v || !ARCHETYPES.includes(v.archetype)) return false;
    if (room === "rune") return Array.isArray(v.picks) && v.picks.length === 3 && v.picks.every((c) => RUNE_BY_CODE[c]) && T.rune.topics[v.topic];
    if (room === "star") return Number.isInteger(v.nak) && NAKS[v.nak] && RASHIS[v.west] && RASHIS[v.sunRashi] && RASHIS[v.moonRashi];
    if (room === "ogham") return Number.isInteger(v.ogham) && Boolean(OGHAM[v.ogham]);
    if (room === "decan") return Number.isInteger(v.decan) && Boolean(DECANS[v.decan]);
    if (room === "tzolkin") return Number.isInteger(v.number) && v.number >= 1 && v.number <= 13 && Number.isInteger(v.sign) && Boolean(TZ_SIGNS[v.sign]);
    if (room === "sibyl") return Number.isInteger(v.sors) && Boolean(ORACLES[v.sors]) && SIBYL_TOPIC_KEYS.includes(v.topic);
    return false;
  }
  function load() {
    try {
      const raw = window.sessionStorage.getItem(STORE_KEY);
      const s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== "object") return emptyState();
      const out = emptyState();
      if (s.profile && typeof s.profile === "object") out.profile = s.profile;
      for (const room of OPEN_ROOMS) if (s.visits && validVisit(room, s.visits[room])) out.visits[room] = s.visits[room];
      return out;
    } catch (e) {
      return emptyState();
    }
  }
  let state = load();
  function save() {
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 저장이 막힌 브라우저: 이 화면 안에서만 기억한다 */
    }
  }
  function clearAll() {
    try {
      window.sessionStorage.removeItem(STORE_KEY);
    } catch (e) {
      /* 무시 */
    }
    state = emptyState();
    Object.keys(editing).forEach((k) => (editing[k] = false));
    $$("input[data-js], textarea[data-js]").forEach((el) => (el.type === "checkbox" ? (el.checked = false) : (el.value = "")));
    resetSibyl();
    [js("star-hour"), js("star-minute")].forEach((el) => (el.disabled = false));
  }
  const filledRooms = () => CHAPTER_ORDER.filter((r) => state.visits[r]);

  // 원형 합산: 방마다 태그 하나(같은 방을 다시 하면 덮어씀). 가장 많이 나온 원형, 동점이면 더 앞선 장의 원형
  function currentArchetype() {
    const tally = {};
    CHAPTER_ORDER.forEach((room, idx) => {
      const v = state.visits[room];
      if (!v) return;
      const t = (tally[v.archetype] = tally[v.archetype] || { count: 0, first: idx });
      t.count += 1;
    });
    const ranked = Object.entries(tally).sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first);
    return ranked.length ? ranked[0][0] : null;
  }

  // ───────── 정적 문구 채우기 ─────────
  function applyText() {
    $$("[data-t]").forEach((el) => (el.textContent = get(el.dataset.t) ?? ""));
    $$("[data-h]").forEach((el) => (el.innerHTML = get(el.dataset.h) ?? ""));
    $$("[data-ph]").forEach((el) => (el.placeholder = get(el.dataset.ph) ?? ""));
    $$("[data-aria]").forEach((el) => el.setAttribute("aria-label", get(el.dataset.aria) ?? ""));
    $$("[data-list]").forEach((el) => (el.innerHTML = (get(el.dataset.list) || []).map((p) => `<p>${p}</p>`).join("")));
    // 장 번호는 CHAPTER_ORDER에서 (마크업 data-n은 예비값)
    jsAll("room-chapter-num").forEach((el) => {
      const room = el.closest("[data-room]")?.dataset.room;
      el.textContent = fill(T.storyChapter, { n: CHAPTER_ORDER.includes(room) ? chapterOf(room) : el.dataset.n });
    });
    jsAll("rashi-label").forEach((el, i) => (el.textContent = RASHIS[i].ko.replace("자리", "")));
    // 촐킨 톱니 카르투슈 20개: 유카텍 이름 대문자 (SVG text)
    jsAll("tzolkin-sign-label").forEach((el, i) => (el.textContent = TZ_SIGNS[i].latin.toUpperCase()));
    js("story-paid-list").innerHTML = T.story.paid.list.map((li) => `<li>${li}</li>`).join("");
    document.title = T.meta.title;
    const desc = $('meta[name="description"]');
    if (desc) desc.content = T.meta.description;
  }

  // ───────── 배경 별 반짝임 (canvas#sky) ─────────
  (function sky() {
    const c = document.getElementById("sky");
    const ctx = c.getContext("2d");
    let stars = [];
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 5000) }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        r: Math.random() * 1.3 + 0.2, p: Math.random() * Math.PI * 2, s: Math.random() * 0.0015 + 0.0005,
      }));
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(s.p + t * s.s));
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function frame(t) {
      // 긴 글을 읽는 동안에는 다시 그리지 않는다 (배경 정지)
      if (!body.classList.contains("is-reading")) draw(t);
      requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    if (!reduceMotion) requestAnimationFrame(frame);
  })();

  // ───────── 토스트 ─────────
  let toastTimer = 0;
  function toast(text) {
    const el = js("toast");
    el.textContent = text;
    el.classList.add("is-active");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-active"), 2500);
  }

  // ───────── 화면 전환 ─────────
  const screens = {};
  $$('section[id^="screen-"]').forEach((s) => (screens[s.id.slice(7)] = s));
  let currentName = "hub";
  let swapTimer = 0;
  let pending = []; // 화면에 묶인 타이머 (화면을 떠나면 모두 취소)
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    pending.push(id);
    return id;
  };
  const enter = {};
  const leave = {};
  let skipArmed = null; // (8단계 U4) 기다리는 의식에서 화면을 누르면 부를 함수
  // (8단계) 뒤로 버튼(BACK 표)은 없어지고, 모든 화면 상단 왼쪽의 "입구" 버튼 하나(topbar-home)로 통일한다 (U2).
  // 방 안의 한 단계 뒤로는 휴대폰·브라우저 뒤로 가기가 맡는다 (U1, 아래 history).
  // 방 화면: 상단 가운데 "III 데칸의 방 3/6" (.is-room). 읽기 진행률(9칸)은 책(#report)에서만 (U10)
  const roomOfScreen = (name) => (screens[name] ? screens[name].dataset.room : null);
  function setTopbar(name) {
    const room = roomOfScreen(name);
    const inRoom = CHAPTER_ORDER.includes(room);
    const reading = name === "report";
    show(js("topbar-home"), name !== "hub");
    show(js("book-toc-open"), reading);
    const bar = js("topbar");
    bar.classList.toggle("is-room", inRoom);
    bar.classList.toggle("is-reading", reading);
    body.classList.toggle("is-reading", reading);
    const label = js("read-label");
    if (inRoom) {
      const n = chapterOf(room);
      label.innerHTML = esc(fill(T.topbar.room, { num: ROMAN[n - 1], name: T.rooms[room].name })) +
        ` <span class="topbar__count">${esc(fill(T.topbar.readCount, { i: n, total: CHAPTER_ORDER.length }))}</span>`;
    } else if (!reading) label.textContent = "";
  }

  // (7단계) 방 화면으로 가는 모든 길의 문지기: 잠긴 방 → 입구(현재 진행 지점), 룬을 마쳤으면 다시 던지기 대신 결과 다시보기
  function gate(name) {
    const room = roomOfScreen(name);
    if (!CHAPTER_ORDER.includes(room)) return name;
    if (isDone(room)) {
      if (room === "rune" && name !== "rune-result") {
        RENDER.rune(state.visits.rune, false);
        return "rune-result";
      }
      return name;
    }
    if (!isUnlocked(room)) {
      toast(T.toast.locked);
      return "hub";
    }
    return name === `${room}-result` ? `${room}-intro` : name; // 아직 결과가 없는 방의 결과 화면 → 그 방 시작
  }
  // 방 하나를 연다: 마친 방 = 저장된 결과 다시보기, 아니면 그 방 시작 화면 (잠겼으면 gate가 입구로)
  function roomTarget(room) {
    if (!isDone(room)) return `${room}-intro`;
    RENDER[room](state.visits[room], false);
    return `${room}-result`;
  }

  // ───────── (8단계 U1) 브라우저 기록: 화면 전환마다 pushState(해시 = 화면 이름), popstate에서 go() ─────────
  // 의식·후보·봉인 해제로 갈 때와 그 화면을 떠날 때는 replaceState → 뒤로 가기가 의식을 다시 틀지 않는다 (결과 → 뒤로 = 방 시작 또는 입구).
  // 입구에서 뒤로 가기는 브라우저 기본 동작. 해시에는 화면 이름만 들어간다 (입력값 없음)
  const TRANSIENT_TO = (name) => /-(ritual|choose)$/.test(name) || name === "unseal";
  const TRANSIENT_FROM = (name) => TRANSIENT_TO(name) || name === "finale";
  const urlOf = (name) => (name === "hub" ? location.pathname + location.search : `#${name}`);
  function record(name, prevName, opts) {
    if (!window.history || !history.pushState) return;
    const st = { so: name };
    try {
      if (opts.fromPop) {
        if (!history.state || history.state.so !== name) history.replaceState(st, "", urlOf(name)); // 문지기가 목적지를 바꾼 경우
      } else if (opts.replace || TRANSIENT_TO(name) || TRANSIENT_FROM(prevName)) history.replaceState(st, "", urlOf(name));
      else if (prevName !== name) history.pushState(st, "", urlOf(name));
    } catch (e) {
      /* file:// 등 기록을 못 쓰는 환경: 화면 전환만 */
    }
  }
  addEventListener("popstate", (e) => {
    let name = (e.state && e.state.so) || location.hash.replace("#", "") || "hub";
    if (!screens[name]) return; // 책 안 목차 이동 등 화면이 아닌 해시
    if (sig) sig.end();
    if (TRANSIENT_TO(name)) name = "hub";
    const room = roomOfScreen(name);
    if (name === "report" && !reportView) name = "hub";
    else if (CHAPTER_ORDER.includes(room) && name === `${room}-result` && isDone(room)) RENDER[room](state.visits[room], false);
    go(name, { instant: true, fromPop: true });
  });

  function go(name, opts = {}) {
    name = gate(name);
    const next = screens[name];
    if (!next) return;
    const prevName = currentName;
    const prev = screens[prevName];
    record(name, prevName, opts);
    clearTimeout(swapTimer);
    pending.forEach(clearTimeout);
    pending = [];
    skipArmed = null;
    jsAll("ritual-skip").forEach((h) => h.classList.remove("is-visible"));
    if (prevName !== name) leave[prevName]?.();
    $$(".screen.is-leaving").forEach((s) => s.classList.remove("is-leaving"));
    const reveal = () => {
      if (prev && prev !== next) prev.classList.remove("is-leaving", "is-active");
      next.classList.remove("is-active");
      void next.offsetWidth; // 등장 애니메이션을 처음부터 다시
      next.classList.add("is-active");
      currentName = name;
      body.dataset.room = next.dataset.room;
      setTopbar(name);
      window.scrollTo(0, 0);
      enter[name]?.();
    };
    currentName = name; // 전환 중에 다시 불려도 이전 화면 기준으로 기록하지 않게
    if (prev && prev !== next && !reduceMotion && !opts.instant) {
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      swapTimer = setTimeout(reveal, 320);
    } else reveal();
  }

  // ───────── (8단계, 8-3) 문이 열릴 때 방의 상징이 떠오른다 ─────────
  // 처음 여는 방: 약 1.2초(0~250 문짝, 150~650 획 그리기, 650~1000 가운데로 떠오름·방 색, 1000 화면 전환, 1000~1200 엠블럼 자리에 착지).
  // 마친 방 다시 보기: .is-flash 약 0.5초(획 없음). 누르면 .is-skipped로 바로 착지(200ms). 움직임 줄이기: 가운데 페이드 400ms, 진동 없음.
  // 전환 타이머는 go()의 pending과 따로 둔다 (go가 부르는 순간 지워지면 안 됨)
  const sigil = js("sigil-rise");
  let sig = null;
  function playSigil(room, fromEl, target, flash, openCls = "is-entering") {
    if (sig) return;
    const r = fromEl ? fromEl.getBoundingClientRect() : null;
    const fx = r && r.width ? r.left + r.width / 2 : innerWidth / 2;
    const fy = r && r.height ? r.top + r.height / 2 : innerHeight * 0.4;
    sigil.dataset.room = room;
    sigil.style.setProperty("--from-x", `${Math.round(fx)}px`);
    sigil.style.setProperty("--from-y", `${Math.round(fy)}px`);
    sigil.style.removeProperty("--to-x");
    sigil.style.removeProperty("--to-y");
    sigil.classList.remove("is-hidden", "is-playing", "is-skipped", "is-flash");
    void sigil.offsetWidth;
    if (fromEl) fromEl.classList.add(openCls);
    if (!reduceMotion) buzz(20);
    const total = reduceMotion ? 400 : flash ? 500 : 1200;
    const swapAt = reduceMotion ? 200 : flash ? 250 : 1000;
    sigil.classList.add(flash && !reduceMotion ? "is-flash" : "is-playing");
    const s = { swapped: false, emblem: null, t: [] };
    s.swap = () => {
      if (s.swapped) return;
      s.swapped = true;
      go(target, { instant: true });
      const em = js("room-emblem", screens[currentName]);
      if (em && !flash && !reduceMotion) {
        em.classList.add("is-awaiting");
        const b = em.getBoundingClientRect();
        sigil.style.setProperty("--to-x", `${Math.round(b.left + b.width / 2)}px`);
        sigil.style.setProperty("--to-y", `${Math.round(b.top + b.height / 2)}px`);
        s.emblem = em;
      }
    };
    s.end = () => {
      s.t.forEach(clearTimeout);
      s.swap();
      sigil.classList.add("is-hidden");
      sigil.classList.remove("is-playing", "is-skipped", "is-flash");
      if (s.emblem) s.emblem.classList.remove("is-awaiting");
      if (fromEl) fromEl.classList.remove(openCls);
      sig = null;
    };
    s.skip = () => {
      if (reduceMotion || flash || !sigil.classList.contains("is-playing")) return;
      s.t.forEach(clearTimeout);
      s.swap();
      sigil.classList.replace("is-playing", "is-skipped");
      s.t = [setTimeout(s.end, 200)];
    };
    s.t = [setTimeout(s.swap, swapAt), setTimeout(s.end, total)];
    sig = s;
  }
  sigil.addEventListener("click", () => sig && sig.skip());

  // 방 하나 열기 (입구 주 버튼·문·지금까지의 이야기 줄·미리보기 "다음 문 열기"). 잠긴 방은 흔들림 + 안내 (disabled 대신 aria-disabled)
  function openRoom(room, fromEl, isDoor) {
    if (!CHAPTER_ORDER.includes(room)) return;
    if (!isDone(room) && !isUnlocked(room)) {
      if (isDoor) {
        fromEl.classList.remove("is-denied");
        void fromEl.offsetWidth;
        fromEl.classList.add("is-denied");
        setTimeout(() => fromEl.classList.remove("is-denied"), 320);
      }
      toast(T.toast.locked);
      return;
    }
    const done = isDone(room);
    playSigil(room, fromEl, roomTarget(room), done);
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (!t) return;
    const name = t.dataset.js || "";
    if (name.startsWith("hub-door-") || name === "sofar-line" || (name === "hub-cta" && CHAPTER_ORDER.includes(t.dataset.room))) openRoom(t.dataset.room, t, name.startsWith("hub-door-"));
    else if (name === "result-next-door") openNextDoor(t);
    else if (/-intro-go$/.test(name)) startRoom(t.dataset.go);
    else go(t.dataset.go);
  });

  // ───────── 스크롤: 별 시차(--scroll) + 책 읽기 진행률 ─────────
  let scrollQueued = false;
  addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        if (!reduceMotion) root.style.setProperty("--scroll", Math.round(window.scrollY));
      });
    },
    { passive: true }
  );

  // ───────── 등장 효과: .js-reveal + 처음 보일 때 .is-in (한 번) ─────────
  // 장(section)은 화면보다 훨씬 길어 비율(threshold) 대신 "화면 아래 12% 위로 들어오면"으로 판단한다
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        }),
        { threshold: 0, rootMargin: "0px 0px -12% 0px" }
      )
    : null;
  function watchReveal(scr) {
    scr.classList.add("js-reveal");
    const targets = [...$$("[data-reveal]", scr), ...jsAll("story-chapters", scr), ...jsAll("story-chapter", scr)];
    targets.forEach((t) => (io ? io.observe(t) : t.classList.add("is-in")));
  }
  function resetReveal(scr) {
    $$(".is-in", scr).forEach((el) => {
      el.classList.remove("is-in");
      io?.unobserve(el);
    });
  }
  function replay(el) {
    el.classList.remove("is-revealed");
    void el.getBoundingClientRect();
    el.classList.add("is-revealed");
  }

  // ───────── 내 정보 지우기 ─────────
  const dialog = js("clear-dialog");
  js("clear-open").addEventListener("click", () => (dialog.showModal ? dialog.showModal() : dialog.setAttribute("open", "")));
  js("clear-cancel").addEventListener("click", () => dialog.close());
  js("clear-confirm").addEventListener("click", () => {
    clearAll();
    dialog.close();
    toast(T.toast.cleared);
    renderHub();
    go("hub");
  });

  // ───────── 0. 입구 (8단계: 새 세션의 첫 화면, spec 8-2) ─────────
  const SIG = {
    ogham: '<svg class="sig sig--tall" viewBox="0 0 40 80"><use href="#ogham-beith" /></svg>',
    star: '<svg class="sig" viewBox="0 0 40 40"><use href="#icon-star" /></svg>',
    decan: '<svg class="sig" viewBox="0 0 40 40"><use href="#icon-decan" /></svg>',
    tzolkin: '<svg class="sig" viewBox="0 0 40 40"><use href="#icon-tzolkin" /></svg>',
    rune: '<svg class="sig sig--rune" viewBox="0 0 40 60"><use href="#rune-raidho" /></svg>',
    sibyl: '<svg class="sig" viewBox="0 0 40 40"><use href="#icon-sibyl" /></svg>',
  };
  const clip = (s, n = 60) => ([...s].length > n ? [...s].slice(0, n - 1).join("") + "…" : s);
  // 결과 이름·핵심 한 줄 (공개 data). c = 결과 코드 모양(영수증 코드와 같음: 룬은 돌 번호 3개, 촐킨은 {number, sign})
  function headOf(room, c) {
    if (room === "rune") {
      const rs = c.rune.map((i) => RUNES[i]);
      return { title: rs.map((r) => r.name).join(" · "), key: strip(rs[1].key) };
    }
    if (room === "star") return { title: strip(NAKS[c.star].name), key: strip(NAKS[c.star].key) };
    if (room === "ogham") return { title: strip(OGHAM[c.ogham].title), key: strip(OGHAM[c.ogham].key) };
    if (room === "decan") return { title: strip(DECANS[c.decan].title), key: strip(DECANS[c.decan].key) };
    if (room === "tzolkin") return { title: strip(fill(T.tzolkin.result.title, { number: c.tzolkin.number, name: TZ_SIGNS[c.tzolkin.sign].name })), key: strip(TZ_SIGNS[c.tzolkin.sign].key) };
    return { title: strip(ORACLES[c.sibyl].title), key: strip(ORACLES[c.sibyl].key) };
  }
  function renderHub() {
    const next = nextRoom();
    const filled = filledRooms();
    const n = filled.length;
    // 주 버튼 하나: 처음 / 진행 중(다음 문) / 6/6(나의 이야기)
    const cta = js("hub-cta");
    const H = T.hub.cta;
    show(js("hub-cta-num"), Boolean(next));
    if (next) {
      cta.dataset.room = next;
      cta.dataset.go = `${next}-intro`;
      js("hub-cta-num").textContent = ROMAN[chapterOf(next) - 1];
      js("hub-cta-label").textContent = n === 0 ? H.first : fill(H.next, { room: T.rooms[next].name });
    } else {
      delete cta.dataset.room;
      cta.dataset.go = "story";
      js("hub-cta-label").textContent = H.story;
    }
    // 여정 줄과 여섯 문: 같은 상태 class
    const stateOf = (room) => (isDone(room) ? "is-visited" : room === next ? "is-next" : "is-locked");
    jsAll("journey-step").forEach((li) => {
      const st = stateOf(li.dataset.room);
      ["is-visited", "is-next", "is-locked"].forEach((c) => li.classList.toggle(c, c === st));
    });
    for (const room of OPEN_ROOMS) {
      const door = js(`hub-door-${room}`);
      const st = stateOf(room);
      ["is-visited", "is-next", "is-locked"].forEach((c) => door.classList.toggle(c, c === st));
      if (st === "is-locked") door.setAttribute("aria-disabled", "true");
      else door.removeAttribute("aria-disabled");
      js("hub-door-badge", door).textContent = fill(T.hub.badge, { n: chapterOf(room) });
    }
    // 진행 + 지금까지의 이야기 (1방 이상)
    show(js("hub-sofar"), n > 0);
    const prog = js("hub-progress");
    prog.style.setProperty("--n", n);
    prog.setAttribute("aria-valuenow", String(n));
    js("hub-progress-count").textContent = fill(T.hub.progress.count, { n, total: CHAPTER_ORDER.length });
    const a = currentArchetype();
    js("hub-archetype").textContent = a ? T.archetypes[a].name : "";
    const codes = myRoomCodes();
    const S = T.hub.sofar;
    js("hub-sofar-list").innerHTML = CHAPTER_ORDER.map((room, i) => {
      const num = `<span aria-hidden="true">${ROMAN[i]} · </span>`;
      if (isDone(room)) {
        const h = headOf(room, codes);
        return `<li class="so-far__item is-done" data-room="${room}"><button class="so-far__line" type="button" data-js="sofar-line" data-room="${room}" data-go="${room}-result">
            <span class="so-far__mark" aria-hidden="true">${SIG[room]}</span>
            <span class="so-far__text"><span class="so-far__room">${num}${esc(T.rooms[room].name)} · <b data-js="sofar-result">${esc(h.title)}</b></span><span class="so-far__key" data-js="sofar-key">${esc(clip(h.key))}</span></span>
            <span class="so-far__go" aria-hidden="true">›</span>
          </button></li>`;
      }
      return `<li class="so-far__item is-upcoming" data-room="${room}"><span class="so-far__line">
          <span class="so-far__mark" aria-hidden="true">?</span>
          <span class="so-far__text"><span class="so-far__room">${num}${esc(T.rooms[room].name)}</span><span class="so-far__key">${esc(S.upcoming)}</span></span>
        </span></li>`;
    }).join("");
    renderBookCard();
  }
  enter.hub = renderHub;

  // ───────── 입력 화면 공통 ─────────
  const editing = { rune: false, star: false, ogham: false, decan: false, tzolkin: false };
  function digitsOnly(el, next) {
    el.addEventListener("input", () => {
      const clean = el.value.replace(/\D/g, "");
      if (clean !== el.value) el.value = clean;
      if (next && el.value.length >= el.maxLength) next.focus();
    });
  }

  // ═════════ 룬의 방 ═════════
  const rune = { topic: "me", picks: [], flipped: 0, progress: 0, holding: false, casting: false, lastT: 0, raf: 0 };
  const runeInput = screens["rune-input"];

  enter["rune-input"] = () => {
    const name = state.profile.name;
    const useSaved = Boolean(name) && !editing.rune;
    show(js("saved-info", runeInput), useSaved);
    if (useSaved) js("saved-info-value", runeInput).textContent = name;
    show(js("rune-name-field"), !useSaved);
    show(js("privacy-notice", runeInput), !useSaved);
    if (!useSaved) js("rune-name").value = name || "";
  };
  js("saved-info-edit", runeInput).addEventListener("click", () => {
    editing.rune = true;
    enter["rune-input"]();
    js("rune-name").focus();
  });
  js("rune-topics").addEventListener("click", (e) => {
    const chip = e.target.closest('[data-js="rune-topic"]');
    if (!chip) return;
    jsAll("rune-topic").forEach((c) => {
      const on = c === chip;
      c.classList.toggle("is-selected", on);
      c.setAttribute("aria-checked", String(on));
    });
    rune.topic = chip.dataset.topic;
  });
  js("rune-input-go").addEventListener("click", () => {
    if (!js("rune-name-field").classList.contains("is-hidden")) {
      const name = js("rune-name").value.trim().slice(0, 10);
      if (name) state.profile.name = name;
      else delete state.profile.name;
      save();
    }
    editing.rune = false;
    go("rune-ritual");
  });

  // 의식: 주머니 길게 누르기 → 쏟기 → 돌 3개 뒤집기
  const HOLD_MS = reduceMotion ? 600 : 1800;
  const cast = js("rune-cast");
  const pouch = js("rune-pouch");
  const cloth = js("rune-cloth");
  const stones = jsAll("rune-stone");
  const setProgress = (p) => cast.style.setProperty("--progress", p.toFixed(3));

  function nornHint(i) {
    const n = T.rune.norns[i];
    js("rune-norn-hint").innerHTML = i < 3 ? fill(T.rune.ritual.nornHint, { name: n.name, desc: n.desc }) : T.rune.ritual.allRevealed;
  }
  enter["rune-ritual"] = () => {
    Object.assign(rune, { picks: [], flipped: 0, progress: 0, holding: false, casting: false, lastT: 0 });
    setProgress(0);
    show(cast, true);
    pouch.classList.remove("is-shaking", "is-spilled");
    show(cloth, false);
    cloth.classList.remove("is-cast");
    stones.forEach((s, i) => {
      s.classList.remove("is-next", "is-flipped");
      s.setAttribute("aria-label", fill(T.rune.ritual.stoneLabel, { norn: T.rune.norns[i].name }));
    });
    js("rune-norn-hint").textContent = "";
  };
  leave["rune-ritual"] = () => {
    rune.holding = false;
    cancelAnimationFrame(rune.raf);
  };

  function tick(t) {
    const dt = rune.lastT ? t - rune.lastT : 16;
    rune.lastT = t;
    rune.progress = Math.max(0, Math.min(1, rune.progress + (rune.holding ? dt / HOLD_MS : -dt / (HOLD_MS / 2))));
    setProgress(rune.progress);
    if (rune.progress >= 1) return castStones();
    if (rune.holding || rune.progress > 0) rune.raf = requestAnimationFrame(tick);
    else rune.lastT = 0;
  }
  function startHold(e) {
    if (rune.casting) return;
    e.preventDefault();
    if (!rune.holding && rune.progress === 0) {
      rune.lastT = 0;
      rune.raf = requestAnimationFrame(tick);
    }
    rune.holding = true;
    pouch.classList.add("is-shaking");
    buzz(30);
  }
  function endHold() {
    rune.holding = false;
    pouch.classList.remove("is-shaking");
  }
  pouch.addEventListener("pointerdown", startHold);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => pouch.addEventListener(ev, endHold));
  pouch.addEventListener("contextmenu", (e) => e.preventDefault());
  pouch.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) startHold(e);
  });
  pouch.addEventListener("keyup", endHold);

  // 암호학적 난수로 서로 다른 n개
  function pickDistinct(n, max) {
    const picked = [];
    const buf = new Uint32Array(1);
    while (picked.length < n) {
      crypto.getRandomValues(buf);
      const v = buf[0] % max;
      if (!picked.includes(v)) picked.push(v);
    }
    return picked;
  }

  function castStones() {
    rune.casting = true;
    rune.holding = false;
    rune.lastT = 0;
    buzz([40, 60, 40]);
    rune.picks = pickDistinct(3, RUNES.length).map((i) => RUNES[i].code);
    pouch.classList.remove("is-shaking");
    pouch.classList.add("is-spilled");
    later(() => {
      show(cast, false);
      jsAll("rune-stone-glyph").forEach((u, i) => u.setAttribute("href", `#rune-${rune.picks[i]}`));
      show(cloth, true);
      cloth.classList.add("is-cast");
      stones[0].classList.add("is-next");
      nornHint(0);
      stones[0].focus({ preventScroll: true });
    }, reduceMotion ? 150 : 700);
  }

  js("rune-stones").addEventListener("click", (e) => {
    const stone = e.target.closest('[data-js="rune-stone"]');
    if (!stone || !rune.casting || Number(stone.dataset.i) !== rune.flipped) return;
    stone.classList.remove("is-next");
    stone.classList.add("is-flipped");
    buzz(20);
    rune.flipped += 1;
    stones[rune.flipped]?.classList.add("is-next");
    nornHint(rune.flipped);
    if (rune.flipped === 3) {
      waitResult(screens["rune-ritual"], waitMs("rune", reduceMotion ? 700 : 1600), () => {
        renderRune({ picks: rune.picks, topic: rune.topic }, true);
        go("rune-result");
      });
    }
  });

  // ───────── 결과 본문 조립 (8단계, spec 8-1: 방은 짧고 완결된 계시) ─────────
  // 핵심 풀이 한 덩어리(장 번호·제목 없음): identity.lede → body 앞 단락(공개 파일에 남은 것) → 사실 목록 → 해석 안내 한 줄.
  // identity.close(copywriter의 맺음 한 문장, 선택)는 아래 reading-close 칸에만 쓴다. 책에는 넣지 않는다 (R-1)
  const rLede = (t) => `<p class="reading__lede" data-reveal>${t}</p>`;
  const rP = (t) => `<p data-reveal>${t}</p>`;
  function factsUl(rows) {
    const shown = rows.filter(([, dd]) => dd);
    return shown.length ? `<ul class="reading__facts" data-reveal>${shown.map(([dt, dd]) => `<li><b>${dt}</b> ${dd}</li>`).join("")}</ul>` : "";
  }
  function renderReading(scr, parts, close) {
    resetReveal(scr);
    js("reading-body", scr).innerHTML = parts.filter(Boolean).join("");
    const c = js("reading-close", scr);
    c.innerHTML = close || "";
    show(c, Boolean(close));
  }
  // 책 한 줄 (방 안의 유일한 유료 신호, 결제 꺼짐이면 숨김): locked(6/6 전, 글자만) / ready(미리보기로) / owned(내 책의 이 방으로)
  const bookState = () => (Pay.enabled && readReceipt() ? "owned" : filledRooms().length === CHAPTER_ORDER.length ? "ready" : "locked");
  function updateBookLines() {
    const st = bookState();
    jsAll("result-book-line").forEach((el) => {
      show(el, Pay.enabled);
      el.dataset.state = st;
      show(js("result-book-link", el), st !== "locked");
      js("book-line-link-label", el).textContent = st === "owned" ? T.result.bookLine.owned : T.result.bookLine.ready;
    });
  }
  function renderBookLine(scr, hook) {
    js("book-line-hook", scr).innerHTML = hook || "";
    updateBookLines();
  }
  // 책 한 줄 링크: 결제 뒤에는 책을 열고 그 방 자리로, 아니면 미리보기
  let jumpTo = null;
  CHAPTER_ORDER.forEach((room) => js("result-book-link", screens[`${room}-result`]).addEventListener("click", (e) => {
    const code = readReceipt();
    if (bookState() === "owned" && code) {
      jumpTo = room;
      reopen(code, e.currentTarget, null);
    } else go("deeper");
  }));

  // (8단계 U4) 기다리는 의식: 시작 1초 뒤부터 아무 데나 누르면 바로 결과로 (힌트 ritual-skip). 같은 방을 다시 하면 기다림 절반
  const waitMs = (room, ms) => (isDone(room) ? Math.round(ms / 2) : ms);
  function waitResult(scr, ms, fn) {
    let fired = false;
    const run = () => {
      if (fired) return;
      fired = true;
      skipArmed = null;
      fn();
    };
    later(() => {
      skipArmed = run;
      const hint = js("ritual-skip", scr);
      if (hint) hint.classList.add("is-visible");
    }, Math.min(1000, ms));
    later(run, ms);
  }
  ["rune", "star", "decan", "tzolkin", "sibyl"].forEach((room) => screens[`${room}-ritual`].addEventListener("click", () => skipArmed && skipArmed()));

  // (7단계) 이야기 다리 + 다음 문: 다리 문구(bridges.<방>)와 문 목적지는 마크업에 고정. 여기서는 문 상태와 보조 링크 숫자만
  function renderPassage(scr) {
    js("result-next-door", scr).classList.remove("is-opening");
  }
  // 다음 문: 문짝이 열리며 그 안에서 다음 방의 상징이 떠오른다(8-3, 약 1.2초). 시빌라(Ⅵ)의 문은 수렴 결말(7-6, 650ms 뒤)
  function openNextDoor(btn) {
    if (btn.classList.contains("is-opening")) return;
    const to = btn.dataset.go;
    const room = to === "finale" ? nextRoom() : btn.dataset.room; // 마지막 문인데 비어 있는 장이 있으면 그 장부터
    if (CHAPTER_ORDER.includes(room)) return playSigil(room, btn, roomTarget(room), isDone(room), "is-opening");
    btn.classList.add("is-opening");
    later(() => go("finale"), 650);
  }

  function renderArchetypeLine(scr, code, why) {
    js("result-archetype-name", scr).textContent = T.archetypes[code].name;
    js("result-archetype-why", scr).innerHTML = why;
  }

  // (9단계) 결과 여는/닫는 말: 안내자 대사에 {who} 치환. 빈 값이면 .say 블록은 CSS(:has(.say__line:empty))가 숨긴다
  function renderGuideText(scr, room) {
    const g = T.guides && T.guides[room];
    if (!g) return;
    const who = whoOf(state.profile.name || "");
    const openLine = $(".say__line", js("guide-open", scr));
    const closeLine = $(".say__line", js("guide-close", scr));
    if (openLine) openLine.textContent = fill(g.open, { who });
    if (closeLine) closeLine.textContent = fill(g.close, { who });
  }

  // ───────── 룬 결과 ─────────
  // v = { picks: [code × 3], topic }. fresh=true면 방금 던진 결과 → 저장(같은 방은 덮어씀)
  let runeView = null;
  function renderRune(v, fresh) {
    const scr = screens["rune-result"];
    renderGuideText(scr, "rune");
    const R = T.rune.result;
    const [past, now, next] = v.picks.map((c) => RUNE_BY_CODE[c]);
    const topic = T.rune.topics[v.topic];
    const name = state.profile.name || "";
    const who = whoOf(name);
    runeView = { v, past, now, next };

    if (fresh) {
      state.visits.rune = { picks: v.picks, topic: v.topic, archetype: next.archetype };
      save();
    }

    // 캡처 카드
    jsAll("result-glyph", scr).forEach((u, i) => u.setAttribute("href", `#rune-${v.picks[i]}`));
    js("result-title", scr).textContent = fill(R.title, { who });
    js("result-names", scr).textContent = [past, now, next].map((r) => r.name).join(" · ");
    js("result-key", scr).innerHTML = now.key;
    js("result-meta", scr).textContent = strip(fill(R.meta, { topic: topic.label }));

    // 운명의 실
    jsAll("thread-word", scr).forEach((el, i) => (el.textContent = [past, now, next][i].keyword));
    js("turn-text", scr).innerHTML = fill(R.thread, {
      who: esc(who), past: past.keyword, now: now.keyword,
      next: `'${next.keyword}'${particle(next.keyword, "이/가")}`,
    });

    // 핵심 풀이: 세 돌마다 소제목 + 첫 단락 (둘째 단락부터·II장부터는 책, 서버 full-rune.js). 룬은 identity가 배열이라 맺음 문장 칸은 돌마다 identityClose(선택)
    const norns = T.rune.norns;
    const parts = [rLede(fill(R.ch1Lede, { past: past.name, now: now.name, next: next.name }))];
    [past, now, next].forEach((r, i) => {
      parts.push(`<h3 class="reading__sub" data-reveal><span class="prose__sub-glyph runic" aria-hidden="true">${r.glyph}</span><span>${fill(R.ch1Sub, { norn: norns[i].name, name: r.name })}</span></h3>`);
      parts.push(...r.identity.map(rP));
      if (r.identityClose) parts.push(rP(r.identityClose));
    });
    if (name) {
      const latin = Calc.romanize(name);
      parts.push(`<aside class="inset inset--name" data-js="rune-name-runes" data-reveal>
            <p class="inset__label">${R.nameLabel}</p>
            <p class="name-runes runic" data-js="rune-name-glyphs">${toRunes(latin)}</p>
            <p class="inset__fact"><span data-js="rune-name-source">${esc(name)}</span> → <span class="latin" data-js="rune-name-latin">${esc(latin.toUpperCase())}</span></p>
            <p class="inset__fact">${R.nameFact}</p>
          </aside>`);
    }
    renderReading(scr, parts, "");
    renderBookLine(scr, now.now.hook);

    const list = [past, now, next].map((r) => fill(R.factItem, { name: r.name, aett: R.aett[Math.floor(r.index / 8)] })).join(", ");
    js("fact-text", scr).innerHTML = fill(R.fact, { list });
    Disclaimer.mount(js("disclaimer-slot", scr));
    renderArchetypeLine(scr, next.archetype, next.archetypeWhy);
    renderPassage(scr);
  }

  enter["rune-result"] = () => {
    const scr = screens["rune-result"];
    replay(js("result-capture", scr));
    watchReveal(scr);
  };

  // ───────── 한글 이름 → 로마자(Calc.romanize, calc.js의 표 하나만 쓴다) → 룬 (이름 인셋) ─────────
  const LETTER_RUNE = {
    a: "ᚨ", b: "ᛒ", c: "ᚲ", d: "ᛞ", e: "ᛖ", f: "ᚠ", g: "ᚷ", h: "ᚺ", i: "ᛁ", j: "ᛃ", k: "ᚲ", l: "ᛚ", m: "ᛗ",
    n: "ᚾ", o: "ᛟ", p: "ᛈ", q: "ᚲ", r: "ᚱ", s: "ᛊ", t: "ᛏ", u: "ᚢ", v: "ᚹ", w: "ᚹ", x: "ᚲᛊ", y: "ᛃ", z: "ᛉ",
  };
  // 옛 룬 비문은 같은 글자를 두 번 연달아 새기지 않았다. 그 관습을 따른다.
  function toRunes(latin) {
    let out = "";
    for (let i = 0; i < latin.length; i++) {
      let r;
      if (latin[i] === "n" && latin[i + 1] === "g") { r = "ᛜ"; i++; }
      else if (latin[i] === "t" && latin[i + 1] === "h") { r = "ᚦ"; i++; }
      else r = LETTER_RUNE[latin[i]] || "";
      if (r && !out.endsWith(r)) out += r;
    }
    return out;
  }

  // ═════════ 별의 방 ═════════
  const starInput = screens["star-input"];
  const f = {
    name: js("star-name"), year: js("star-year"), month: js("star-month"), day: js("star-day"),
    hour: js("star-hour"), minute: js("star-minute"), unknown: js("star-time-unknown"),
  };
  digitsOnly(f.year, f.month);
  digitsOnly(f.month, f.day);
  digitsOnly(f.day);
  digitsOnly(f.hour, f.minute);
  digitsOnly(f.minute);
  f.unknown.addEventListener("change", () => {
    f.hour.disabled = f.minute.disabled = f.unknown.checked;
    setFieldError("star-time-field", "star-time-error", "");
  });

  function setFieldError(fieldName, errName, msg) {
    js(fieldName).classList.toggle("is-error", Boolean(msg));
    const err = js(errName);
    err.textContent = msg;
    show(err, Boolean(msg));
  }

  enter["star-input"] = () => {
    const p = state.profile;
    const hasName = Boolean(p.name);
    // 데칸·촐킨에서 날짜만 넣었으면(시각은 묻지 않음 → p.time 없음) 별의 방에서는 시각을 새로 묻는다
    const hasBirth = Boolean(p.birth) && p.time !== undefined;
    const useSaved = (hasName || hasBirth) && !editing.star;
    setFieldError("star-date-field", "star-error", "");
    setFieldError("star-time-field", "star-time-error", "");
    show(js("saved-info", starInput), useSaved);
    if (useSaved) {
      const parts = [];
      if (hasName) parts.push(p.name);
      if (hasBirth) {
        parts.push(fill(T.common.date, p.birth));
        parts.push(p.time ? fill(T.common.time, { h: p.time.h, mm: pad2(p.time.m) }) : T.common.timeUnknown);
      }
      js("saved-info-value", starInput).textContent = parts.join(T.common.sep);
    }
    const nameVisible = !(useSaved && hasName);
    const birthVisible = !(useSaved && hasBirth);
    show(js("star-name-field"), nameVisible);
    show(js("star-date-field"), birthVisible);
    show(js("star-time-field"), birthVisible);
    show(js("privacy-notice", starInput), nameVisible || birthVisible);
    // 입력칸을 보일 때는 저장된 값을 미리 채워 둔다 (다시 입력하기)
    f.name.value = p.name || "";
    if (p.birth) {
      f.year.value = p.birth.y;
      f.month.value = p.birth.m;
      f.day.value = p.birth.d;
      f.unknown.checked = p.time === null;
      f.hour.value = p.time ? p.time.h : "";
      f.minute.value = p.time ? pad2(p.time.m) : "";
    }
    f.hour.disabled = f.minute.disabled = f.unknown.checked;
  };
  js("saved-info-edit", starInput).addEventListener("click", () => {
    editing.star = true;
    enter["star-input"]();
    (js("star-name-field").classList.contains("is-hidden") ? f.year : f.name).focus();
  });

  // 입력 검사 → 저장 → 계산 → 의식
  let starCalc = null;
  js("star-input-go").addEventListener("click", () => {
    const p = state.profile;
    let name = p.name || "";
    let birth = p.birth;
    let time = p.time;
    if (!js("star-name-field").classList.contains("is-hidden")) name = f.name.value.trim().slice(0, 10);
    if (!js("star-date-field").classList.contains("is-hidden")) {
      const y = Number(f.year.value), m = Number(f.month.value), d = Number(f.day.value);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const okDate = f.year.value.length === 4 && y >= 1900 && y <= 2100 && m >= 1 && m <= 12 &&
        dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
      setFieldError("star-date-field", "star-error", okDate ? "" : T.star.errors.date);
      let okTime = true;
      if (f.unknown.checked) time = null;
      else {
        const h = f.hour.value === "" ? NaN : Number(f.hour.value);
        const mi = f.minute.value === "" ? 0 : Number(f.minute.value);
        okTime = h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
        time = { h, m: mi };
      }
      setFieldError("star-time-field", "star-time-error", okTime ? "" : T.star.errors.time);
      if (!okDate) return f.year.focus();
      if (!okTime) return f.hour.focus();
      birth = { y, m, d };
    }
    if (name) p.name = name;
    else delete p.name;
    p.birth = birth;
    p.time = time;
    save();
    editing.star = false;
    starCalc = Astro.birthChart(birth.y, birth.m, birth.d, time);
    go("star-ritual");
  });

  // 의식: 바퀴 되감기 약 5초 (JS 타이머 5.2초, 바퀴 착지 4.4초)
  const starRitual = screens["star-ritual"];
  let rollRaf = 0;
  enter["star-ritual"] = () => {
    if (!starCalc) return go("star-input", { instant: true });
    const target = starCalc.noon; // 바퀴가 멈출 위치: 시각을 알면 그 시각, 모르면 그날 정오의 달
    starRitual.classList.remove("is-running", "is-landed");
    js("star-dial").style.setProperty("--moon-deg", `${target.moonSidereal.toFixed(2)}deg`);
    jsAll("star-nak").forEach((g) => g.classList.toggle("is-home", Number(g.dataset.n) === target.nakshatra));
    void starRitual.offsetWidth;
    starRitual.classList.add("is-running");

    // 연도 되감기 (올해 → 태어난 해)
    const yearEl = js("star-rewind-year");
    const from = new Date().getFullYear();
    const to = state.profile.birth.y;
    if (reduceMotion) yearEl.textContent = to;
    else {
      const t0 = performance.now();
      const roll = (t) => {
        const k = Math.min(1, (t - t0) / 3400);
        yearEl.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) rollRaf = requestAnimationFrame(roll);
      };
      yearEl.textContent = from;
      rollRaf = requestAnimationFrame(roll);
    }

    // 상식 한 줄 (2.4초마다)
    const list = T.star.ritual.trivia;
    let ti = Math.floor(Math.random() * list.length);
    const trivia = js("star-trivia");
    trivia.textContent = list[ti];
    const rotate = () => {
      ti = (ti + 1) % list.length;
      trivia.textContent = list[ti];
      later(rotate, 2400);
    };
    later(rotate, 2400);

    const W = waitMs("star", reduceMotion ? 1200 : 5200);
    later(() => starRitual.classList.add("is-landed"), reduceMotion ? 0 : Math.round((W * 4400) / 5200));
    waitResult(starRitual, W, () => {
      if (starCalc.candidates.length > 1) go("star-choose");
      else {
        const c = starCalc.charts[0];
        renderStar(starVisit(c, starCalc.exact, null), true);
        go("star-result");
      }
    });
  };
  leave["star-ritual"] = () => {
    cancelAnimationFrame(rollRaf);
    starRitual.classList.remove("is-running", "is-landed");
  };

  const starVisit = (c, exact, when) => ({
    nak: c.nakshatra, west: c.westernSign, sunRashi: c.sunRashi, moonRashi: c.moonRashi, exact, when,
    archetype: NAKS[c.nakshatra].archetype,
  });

  // 후보 고르기 (시각 모름 + 그날 달이 집을 옮김: 2~3개)
  function partOfDay(c) {
    const P = T.star.choose.parts;
    if (c.share >= 0.6) return P.most;
    const mid = (c.startMin + c.endMin) / 2;
    if (mid < 360) return P.dawn;
    if (mid < 660) return P.morning;
    if (mid < 1020) return P.day;
    if (mid < 1260) return P.evening;
    return P.night;
  }
  const whenOf = (c) => fill(T.star.choose.when, { from: hhmm(c.startMin), to: hhmm(c.endMin), part: partOfDay(c) });
  enter["star-choose"] = () => {
    const scr = screens["star-choose"];
    const cands = starCalc.candidates;
    js("star-choose-lead", scr).textContent = T.star.choose.lead[cands.length] || T.star.choose.lead[2];
    jsAll("star-dayline-seg", scr).forEach((seg, i) => {
      show(seg, i < cands.length);
      if (cands[i]) seg.style.setProperty("--share", cands[i].share.toFixed(4));
    });
    jsAll("star-choice", scr).forEach((card, i) => {
      const c = cands[i];
      show(card, Boolean(c));
      card.classList.remove("is-selected");
      if (!c) return;
      const nak = NAKS[c.chart.nakshatra];
      const when = whenOf(c);
      js("star-choice-when", card).textContent = when;
      js("star-choice-name", card).textContent = fill(T.star.choose.name, { name: nak.name, house: nak.title });
      jsAll("star-choice-trait", card).forEach((el, k) => (el.textContent = fill(T.star.choose.trait, { text: nak.traits[k] || "" })));
      card.setAttribute("aria-label", fill(T.star.choose.cardAria, { n: i + 1, name: nak.name, when }));
    });
  };
  js("star-choices").addEventListener("click", (e) => {
    const card = e.target.closest('[data-js="star-choice"]');
    if (!card || !starCalc) return;
    const c = starCalc.candidates[Number(card.dataset.i)];
    if (!c) return;
    card.classList.add("is-selected");
    later(() => {
      renderStar(starVisit(c.chart, false, whenOf(c)), true);
      go("star-result");
    }, reduceMotion ? 0 : 260);
  });

  // ───────── 별 결과 ─────────
  // v = { nak, west, sunRashi, moonRashi, exact, when, archetype }
  let starView = null;
  function renderStar(v, fresh) {
    const scr = screens["star-result"];
    renderGuideText(scr, "star");
    const R = T.star.result;
    const nak = NAKS[v.nak];
    const planet = PLANETS[v.nak % 9];
    const west = RASHIS[v.west];
    const sun = RASHIS[v.sunRashi];
    const moon = RASHIS[v.moonRashi];
    const who = whoOf(state.profile.name || "");
    starView = { v, nak, west, sun };

    if (fresh) {
      state.visits.star = v;
      save();
    }

    js("result-nak-number", scr).textContent = fill(R.number, { n: v.nak + 1 });
    js("result-title", scr).textContent = nak.name;
    js("result-names", scr).textContent = nak.sanskrit;
    js("result-house", scr).textContent = nak.title;
    js("result-key", scr).innerHTML = nak.key;
    js("result-meta", scr).textContent = strip(fill(R.meta, { who }));

    const same = v.west === v.sunRashi;
    js("twist-from", scr).textContent = west.ko;
    js("twist-to", scr).textContent = sun.ko;
    js("turn-text", scr).innerHTML = same ? fill(R.twistSame, { sign: west.ko }) : fill(R.twistDiff, { sanskrit: sun.name, sign: sun.ko });
    const note = js("result-time-note", scr);
    show(note, !v.exact);
    note.textContent = v.when ? fill(R.timeNoteChosen, { when: v.when }) : R.timeNoteNoon;

    // 핵심 풀이: lede → body 앞 단락 → 사실 목록 → 해석 안내 (8-1)
    const F = R.facts;
    const facts = [
      [F.symbol, nak.symbol], [F.sky, nak.star], [F.deity, nak.deity], [F.planet, planet.name],
      [F.mind, fill(R.mindValue, { sanskrit: moon.name, sign: moon.ko })],
    ];
    renderReading(scr, [rLede(nak.identity.lede), ...nak.identity.body.map(rP), factsUl(facts), rP(R.interpretNote)], nak.identity.close);
    // 공감 카드 안 맞아요 인셋 (8-1 표 3번: 별은 traits)
    js("star-traits", scr)?.remove();
    js("result-turn", scr).insertAdjacentHTML("beforeend", `<aside class="inset inset--traits" data-js="star-traits">
        <p class="inset__label">${R.traitsLabel}</p>
        <ul class="trait-list">${nak.traits
          .map((t, i) => `<li class="trait"><span class="trait__text">${t}</span><button class="trait__btn" type="button" aria-pressed="false" data-js="star-trait" data-i="${i}">${R.meToo}</button></li>`)
          .join("")}</ul>
        <p class="inset__count" data-js="star-trait-count" aria-live="polite"></p>
      </aside>`);
    renderBookLine(scr, nak.event.hook);

    js("fact-text", scr).innerHTML = nak.fact || R.factFallback;
    Disclaimer.mount(js("disclaimer-slot", scr));
    renderArchetypeLine(scr, nak.archetype, nak.archetypeWhy);
    renderPassage(scr);
  }
  // 맞아요 누르기
  screens["star-result"].addEventListener("click", (e) => {
    const b = e.target.closest('[data-js="star-trait"]');
    if (!b) return;
    const on = !b.classList.contains("is-selected");
    b.classList.toggle("is-selected", on);
    b.setAttribute("aria-pressed", String(on));
    const n = jsAll("star-trait", screens["star-result"]).filter((x) => x.classList.contains("is-selected")).length;
    js("star-trait-count", screens["star-result"]).textContent = T.star.result.meCount[n] || "";
  });
  enter["star-result"] = () => {
    const scr = screens["star-result"];
    replay(js("result-capture", scr));
    watchReveal(scr);
  };
  js("result-retry", screens["star-result"]).addEventListener("click", () => {
    editing.star = true;
    go("star-input");
  });

  // ═════════ 2단계 네 방 공통 ═════════
  // 핵심 풀이 (별의 방과 같은 순서). e = 데이터 항목, facts = [[항목명, 값]]. II장부터는 책 (서버 full-<방>.js)
  function entryReading(scr, e, facts, interpretNote) {
    renderReading(scr, [rLede(e.identity.lede), ...e.identity.body.map(rP), factsUl(facts), rP(interpretNote)], e.identity.close);
    renderBookLine(scr, e.event.hook);
  }
  // 결과 아래쪽 공통: 상식 카드·고증 한 줄·면책·원형 한 줄·떡밥
  function finishResult(scr, room, e, R) {
    js("fact-text", scr).innerHTML = e.fact;
    js("result-source-note", scr).textContent = strip(R.sourceNote);
    Disclaimer.mount(js("disclaimer-slot", scr));
    renderArchetypeLine(scr, e.archetype, e.archetypeWhy);
    renderPassage(scr);
  }
  const metaLine = (R) => strip(fill(R.meta, { who: whoOf(state.profile.name || "") }));
  // 의식 화면 아래 상식 한 줄 (2.4초마다 바뀜, 화면을 떠나면 later 타이머와 함께 멈춤)
  function rotateTrivia(el, list) {
    let i = Math.floor(Math.random() * list.length);
    el.textContent = list[i];
    const next = () => {
      i = (i + 1) % list.length;
      el.textContent = list[i];
      later(next, 2400);
    };
    later(next, 2400);
  }

  // ═════════ 오검의 방 (1장) ═════════
  const oghamInput = screens["ogham-input"];
  const oghamName = js("ogham-name");
  const setOghamError = (msg) => setFieldError("ogham-name-field", "ogham-error", msg);
  enter["ogham-input"] = () => {
    const name = state.profile.name;
    // 저장된 이름이 있어도 오검으로 옮길 글자가 없으면(숫자만 등) 입력칸을 보인다
    const useSaved = Boolean(name) && Boolean(Calc.ogham(name)) && !editing.ogham;
    setOghamError("");
    show(js("saved-info", oghamInput), useSaved);
    if (useSaved) js("saved-info-value", oghamInput).textContent = name;
    show(js("ogham-name-field"), !useSaved);
    show(js("privacy-notice", oghamInput), !useSaved);
    if (!useSaved) oghamName.value = name || "";
  };
  js("saved-info-edit", oghamInput).addEventListener("click", () => {
    editing.ogham = true;
    enter["ogham-input"]();
    oghamName.focus();
  });
  // 입력칸 하나짜리 form이라 Enter를 누르면 브라우저가 제출(새로고침)하려 한다 → 버튼과 같게
  js("ogham-form").addEventListener("submit", (e) => {
    e.preventDefault();
    js("ogham-input-go").click();
  });
  let oghamCalc = null;
  js("ogham-input-go").addEventListener("click", () => {
    let name = state.profile.name || "";
    if (!js("ogham-name-field").classList.contains("is-hidden")) name = oghamName.value.trim().slice(0, 10);
    const r = name ? Calc.ogham(name) : null;
    if (!r) {
      setOghamError(T.ogham.errors.name);
      return oghamName.focus();
    }
    setOghamError("");
    state.profile.name = name;
    save();
    editing.ogham = false;
    oghamCalc = r;
    go("ogham-ritual");
  });

  // 의식: 껍질 위를 아래로 쓸어내린 비율 = --carve (최댓값 유지, 되돌아가지 않음). 누를 때마다 한 글자(움직임 줄이기면 한 번에 모두)
  const oghamRitual = screens["ogham-ritual"];
  const bark = js("ogham-bark");
  const og = { carve: 0, count: 1, done: false, drag: null, moved: false };
  function setCarve(v) {
    if (og.done) return;
    og.carve = Math.max(og.carve, Math.min(1, v));
    bark.style.setProperty("--carve", og.carve.toFixed(4));
    if (og.carve >= 0.9999) carved();
  }
  enter["ogham-ritual"] = () => {
    if (!oghamCalc) return go("ogham-input", { instant: true });
    const r = oghamCalc;
    const root = OGHAM[r.index];
    Object.assign(og, { carve: 0, count: r.letters.length, done: false, drag: null, moved: false });
    oghamRitual.classList.remove("is-carved");
    bark.style.setProperty("--carve", "0");
    bark.style.setProperty("--count", String(og.count));
    js("ogham-letters").innerHTML = r.letters
      .map((i, k) => `<li class="bark__letter" style="--k:${k}"><svg viewBox="0 0 40 80"><use href="#ogham-${OGHAM[i].code}" /></svg></li>`)
      .join("");
    js("ogham-root-glyph").setAttribute("href", `#ogham-${root.code}`);
    js("ogham-root-name").textContent = strip(fill(T.ogham.ritual.rootName, { latin: root.latin, name: root.name }));
    js("ogham-ritual-latin").textContent = r.letters.map((i) => OGHAM[i].sound).join(T.ogham.ritual.letterSep);
    js("ogham-ritual-hint").textContent = strip(T.ogham.ritual.hint);
  };
  leave["ogham-ritual"] = () => {
    og.drag = null;
    oghamRitual.classList.remove("is-carved");
  };
  bark.addEventListener("pointerdown", (e) => {
    if (og.done) return;
    og.drag = { y: e.clientY, from: og.carve, h: bark.getBoundingClientRect().height || 1 };
    og.moved = false;
    try {
      bark.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 캡처를 못 해도 껍질 위에서는 동작 */
    }
  });
  bark.addEventListener("pointermove", (e) => {
    if (!og.drag || og.done) return;
    const dy = e.clientY - og.drag.y;
    if (Math.abs(dy) > 6) og.moved = true;
    if (dy > 0) setCarve(og.drag.from + dy / og.drag.h);
  });
  ["pointerup", "pointercancel"].forEach((ev) => bark.addEventListener(ev, () => (og.drag = null)));
  bark.addEventListener("contextmenu", (e) => e.preventDefault());
  // 누르기(마우스 클릭·터치 탭·Enter·Space): 쓸어내린 직후의 클릭은 무시
  bark.addEventListener("click", () => {
    if (og.done) return;
    if (og.moved) {
      og.moved = false;
      return;
    }
    if (reduceMotion) return setCarve(1);
    const next = Math.min(og.count, Math.floor(og.carve * og.count + 1e-6) + 1);
    buzz(15);
    setCarve(next / og.count);
  });
  function carved() {
    og.done = true;
    og.drag = null;
    bark.style.setProperty("--carve", "1");
    oghamRitual.classList.add("is-carved");
    js("ogham-ritual-hint").textContent = strip(T.ogham.ritual.carvedHint);
    buzz([30, 50, 30]);
    const idx = oghamCalc.index;
    later(() => {
      renderOgham({ ogham: idx }, true);
      go("ogham-result");
    }, reduceMotion ? 1000 : 3400);
  }

  // 결과. v = { ogham: 0~19 }. 이름 가지 줄은 저장하지 않고 지금 이름에서 다시 계산(이름이 바뀌었으면 줄을 뺀다)
  let oghamView = null;
  function renderOgham(v, fresh) {
    const scr = screens["ogham-result"];
    renderGuideText(scr, "ogham");
    const R = T.ogham.result;
    const e = OGHAM[v.ogham];
    const name = state.profile.name || "";
    const mine = name ? Calc.ogham(name) : null;
    const letters = mine && mine.index === v.ogham ? mine : null;
    oghamView = { v, e };
    if (fresh) {
      state.visits.ogham = { ogham: v.ogham, archetype: e.archetype };
      save();
    }
    const LATIN = e.latin.toUpperCase();
    js("result-glyph", scr).setAttribute("href", `#ogham-${e.code}`);
    js("result-ogham-latin", scr).textContent = LATIN;
    js("result-title", scr).textContent = strip(e.title);
    js("result-names", scr).textContent = strip(fill(R.names, { LATIN, meaning: strip(e.facts.meaning) }));
    js("result-key", scr).innerHTML = e.key;
    js("result-meta", scr).textContent = metaLine(R);

    const lettersEl = js("ogham-name-letters", scr);
    const latinEl = js("ogham-name-latin", scr);
    show(lettersEl, Boolean(letters));
    show(latinEl, Boolean(letters));
    lettersEl.innerHTML = letters
      ? letters.letters.map((i) => `<li class="name-branch__letter"><svg viewBox="0 0 40 80"><use href="#ogham-${OGHAM[i].code}" /></svg><span>${OGHAM[i].sound}</span></li>`).join("")
      : "";
    latinEl.textContent = letters ? letters.latin.toUpperCase() : "";
    js("turn-text", scr).innerHTML = (letters ? fill(R.turnLead, { count: letters.letters.length, latin: esc(e.latin) }) + " " : "") + e.turn;

    const F = R.facts;
    entryReading(scr, e, [
      [F.latin, e.latin], [F.sound, e.sound], [F.aicme, T.ogham.aicme[e.aicme]], [F.meaning, e.facts.meaning], [F.tree, e.facts.tree],
    ], R.interpretNote);
    finishResult(scr, "ogham", e, R);
  }
  js("result-retry", screens["ogham-result"]).addEventListener("click", () => {
    editing.ogham = true;
    go("ogham-input");
  });

  // ═════════ 데칸·촐킨 공통 입력 (생년월일만, 시각은 받지 않음) ═════════
  function birthRoom(room, onGo) {
    const scr = screens[`${room}-input`];
    const fy = js(`${room}-year`), fm = js(`${room}-month`), fd = js(`${room}-day`);
    digitsOnly(fy, fm);
    digitsOnly(fm, fd);
    digitsOnly(fd);
    enter[`${room}-input`] = () => {
      const p = state.profile;
      const useSaved = Boolean(p.birth) && !editing[room];
      setFieldError(`${room}-date-field`, `${room}-error`, "");
      show(js("saved-info", scr), useSaved);
      if (useSaved) js("saved-info-value", scr).textContent = fill(T.common.date, p.birth);
      show(js(`${room}-date-field`), !useSaved);
      show(js("privacy-notice", scr), !useSaved);
      if (p.birth) {
        fy.value = p.birth.y;
        fm.value = p.birth.m;
        fd.value = p.birth.d;
      }
    };
    js("saved-info-edit", scr).addEventListener("click", () => {
      editing[room] = true;
      enter[`${room}-input`]();
      fy.focus();
    });
    js(`${room}-input-go`).addEventListener("click", () => {
      const p = state.profile;
      let birth = p.birth;
      if (!js(`${room}-date-field`).classList.contains("is-hidden")) {
        const y = Number(fy.value), m = Number(fm.value), d = Number(fd.value);
        const ok = fy.value.length === 4 && Calc.validDate(y, m, d);
        setFieldError(`${room}-date-field`, `${room}-error`, ok ? "" : T[room].errors.date);
        if (!ok) return fy.focus();
        birth = { y, m, d };
      }
      // 날짜가 바뀌면 전에 별의 방에서 받은 시각은 버린다 (별의 방에서 다시 묻는다)
      if (!p.birth || p.birth.y !== birth.y || p.birth.m !== birth.m || p.birth.d !== birth.d) delete p.time;
      p.birth = birth;
      save();
      editing[room] = false;
      onGo(birth);
    });
  }

  // ═════════ 데칸의 방 (3장) ═════════
  let decanCalc = null;
  birthRoom("decan", (b) => {
    decanCalc = Object.assign({ birth: b }, Calc.decan(b.y, b.m, b.d));
    go("decan-ritual");
  });
  const partName = (part0) => T.decan.partNames[part0];
  // 의식: 원반은 멈춰 있고 그림자만 열흘씩 똑딱 (4.4초 착지, 5.2초 뒤 결과. 움직임 줄이기 1.2초)
  const decanRitual = screens["decan-ritual"];
  enter["decan-ritual"] = () => {
    if (!decanCalc) return go("decan-input", { instant: true });
    const target = decanCalc.noon; // 경계일이면 정오의 칸에 먼저 멈추고 후보 고르기로
    decanRitual.classList.remove("is-running", "is-landed");
    js("decan-dial").style.setProperty("--decan-deg", `${target.index * 10 + 5}deg`);
    jsAll("decan-cell").forEach((g) => g.classList.toggle("is-home", Number(g.dataset.n) === target.index));
    js("decan-ritual-date").textContent = strip(fill(T.decan.ritual.date, decanCalc.birth));
    js("decan-ritual-name").textContent = strip(fill(T.decan.ritual.name, { sign: DECANS[target.index].sign, part: partName(target.part) }));
    rotateTrivia(js("decan-ritual-note"), T.decan.ritual.trivia);
    void decanRitual.offsetWidth;
    decanRitual.classList.add("is-running");
    const W = waitMs("decan", reduceMotion ? 1200 : 5200);
    later(() => decanRitual.classList.add("is-landed"), reduceMotion ? 0 : Math.round((W * 4400) / 5200));
    waitResult(decanRitual, W, () => {
      if (decanCalc.candidates.length > 1) go("decan-choose");
      else {
        renderDecan({ decan: target.index, when: null }, true);
        go("decan-result");
      }
    });
  };
  leave["decan-ritual"] = () => decanRitual.classList.remove("is-running", "is-landed");

  // 후보 고르기 (그날 태양이 데칸 경계를 넘음: 2개). 별의 방 후보 화면과 같은 방식
  const decanWhen = (c) => fill(T.decan.choose.when, { from: hhmm(c.startMin), to: hhmm(c.endMin), part: partOfDay(c) });
  enter["decan-choose"] = () => {
    if (!decanCalc || decanCalc.candidates.length < 2) return go("decan-input", { instant: true });
    const scr = screens["decan-choose"];
    const C = T.decan.choose;
    const cands = decanCalc.candidates;
    js("decan-choose-lead", scr).textContent = strip(fill(C.lead, { date: fill(C.date, decanCalc.birth), time: hhmm(cands[0].endMin) }));
    jsAll("decan-dayline-seg", scr).forEach((seg, i) => seg.style.setProperty("--share", cands[i].share.toFixed(4)));
    jsAll("decan-choice", scr).forEach((card, i) => {
      const c = cands[i];
      const e = DECANS[c.decan.index];
      const when = decanWhen(c);
      const name = strip(fill(C.name, { sign: e.sign, part: partName(c.decan.part) }));
      card.classList.remove("is-selected");
      js("decan-choice-when", card).textContent = when;
      js("decan-choice-name", card).textContent = name;
      jsAll("decan-choice-trait", card).forEach((el, k) => (el.textContent = strip(fill(C.trait, { text: e.traits[k] || "" }))));
      card.setAttribute("aria-label", strip(fill(C.cardAria, { n: i + 1, name, when })));
    });
  };
  js("decan-choices").addEventListener("click", (e) => {
    const card = e.target.closest('[data-js="decan-choice"]');
    if (!card || !decanCalc) return;
    const c = decanCalc.candidates[Number(card.dataset.i)];
    if (!c) return;
    card.classList.add("is-selected");
    later(() => {
      renderDecan({ decan: c.decan.index, when: decanWhen(c) }, true);
      go("decan-result");
    }, reduceMotion ? 0 : 260);
  });

  // 결과. v = { decan: 0~35, when: 후보를 골랐으면 시간 구간 글자, 아니면 null }
  let decanView = null;
  function renderDecan(v, fresh) {
    const scr = screens["decan-result"];
    renderGuideText(scr, "decan");
    const R = T.decan.result;
    const e = DECANS[v.decan];
    const n = v.decan + 1;
    const part = partName(e.part - 1);
    const from = (v.decan % 3) * 10;
    decanView = { v, e };
    if (fresh) {
      state.visits.decan = { decan: v.decan, when: v.when || null, archetype: e.archetype };
      save();
    }
    js("result-decan-dial", scr).style.setProperty("--decan-deg", `${v.decan * 10 + 5}deg`);
    js("result-decan-number", scr).textContent = fill(R.number, { n });
    js("result-title", scr).textContent = strip(e.title);
    js("result-names", scr).textContent = strip(fill(R.names, { n, sign: e.sign, from, to: from + 10 }));
    js("result-key", scr).innerHTML = e.key;
    js("result-meta", scr).textContent = metaLine(R);
    js("twist-from", scr).textContent = e.sign;
    js("twist-to", scr).textContent = strip(fill(R.twistTo, { part }));
    js("turn-text", scr).innerHTML = e.turn;
    const note = js("result-choice-note", scr);
    show(note, Boolean(v.when));
    note.textContent = v.when ? strip(fill(R.choiceNote, { when: v.when })) : "";
    const F = R.facts;
    entryReading(scr, e, [
      [F.sign, `${e.sign} · ${part}`], [F.degrees, fill(R.degrees, { sign: e.sign, from, to: from + 10 })],
      [F.ruler, e.facts.ruler], [F.egyptian, e.facts.egyptian],
    ], R.interpretNote);
    finishResult(scr, "decan", e, R);
  }
  js("result-retry", screens["decan-result"]).addEventListener("click", () => {
    editing.decan = true;
    go("decan-input");
  });

  // ═════════ 촐킨의 방 (4장) ═════════
  let tzCalc = null;
  birthRoom("tzolkin", (b) => {
    tzCalc = Calc.tzolkin(b.y, b.m, b.d);
    go("tzolkin-ritual");
  });
  // 의식: 맞물린 두 톱니가 반대로 돌다 멈춤 (4.2초 착지, 5.2초 뒤 결과. 움직임 줄이기 1.2초)
  const tzRitual = screens["tzolkin-ritual"];
  enter["tzolkin-ritual"] = () => {
    if (!tzCalc) return go("tzolkin-input", { instant: true });
    const { number, sign, dayIndex } = tzCalc;
    const s = TZ_SIGNS[sign];
    tzRitual.classList.remove("is-running", "is-landed");
    const gears = js("tzolkin-gears");
    gears.style.setProperty("--sign-deg", `${-sign * 18}deg`);
    gears.style.setProperty("--num-deg", `${((number - 1) * 27.6923).toFixed(4)}deg`);
    jsAll("tzolkin-sign").forEach((g) => g.classList.toggle("is-home", Number(g.dataset.n) === sign));
    jsAll("tzolkin-num").forEach((g) => g.classList.toggle("is-home", Number(g.dataset.n) === number));
    js("tzolkin-ritual-num").setAttribute("href", `#maya-${number}`);
    js("tzolkin-ritual-sign").textContent = strip(s.name);
    js("tzolkin-ritual-day").textContent = strip(fill(T.tzolkin.ritual.day, { number, name: s.name, LATIN: s.latin.toUpperCase() }));
    const tablet = js("tzolkin-tablet");
    tablet.style.setProperty("--col", String(sign));
    tablet.style.setProperty("--row", String(Math.floor(dayIndex / 20)));
    js("tzolkin-ritual-count").textContent = strip(fill(T.tzolkin.ritual.count, { n: dayIndex + 1 }));
    void tzRitual.offsetWidth;
    tzRitual.classList.add("is-running");
    const W = waitMs("tzolkin", reduceMotion ? 1200 : 5200);
    later(() => tzRitual.classList.add("is-landed"), reduceMotion ? 0 : Math.round((W * 4200) / 5200));
    waitResult(tzRitual, W, () => {
      renderTzolkin({ number, sign }, true);
      go("tzolkin-result");
    });
  };
  leave["tzolkin-ritual"] = () => tzRitual.classList.remove("is-running", "is-landed");

  // 숫자·문양으로 260일 순번(0~259) 되찾기 (저장에는 숫자·문양만 있다)
  const tzDayIndex = (number, sign) => {
    for (let d = sign; d < 260; d += 20) if (d % 13 === number - 1) return d;
    return 0;
  };
  // 결과. v = { number: 1~13, sign: 0~19 }. 네 장은 문양 기준, 반전 카드는 열세 숫자
  let tzView = null;
  function renderTzolkin(v, fresh) {
    const scr = screens["tzolkin-result"];
    renderGuideText(scr, "tzolkin");
    const R = T.tzolkin.result;
    const e = TZ_SIGNS[v.sign];
    const num = TZ_NUMBERS[v.number - 1];
    const day = tzDayIndex(v.number, v.sign) + 1;
    const LATIN = e.latin.toUpperCase();
    tzView = { v, e, day };
    if (fresh) {
      state.visits.tzolkin = { number: v.number, sign: v.sign, archetype: e.archetype };
      save();
    }
    js("result-maya-number", scr).setAttribute("href", `#maya-${v.number}`);
    js("result-sign-label", scr).textContent = LATIN;
    js("result-tzolkin-number", scr).textContent = fill(R.count, { n: day });
    js("result-title", scr).textContent = strip(fill(R.title, { number: v.number, name: e.name }));
    js("result-names", scr).textContent = strip(fill(R.names, { number: v.number, LATIN, meaning: strip(e.facts.meaning) }));
    js("result-key", scr).innerHTML = e.key;
    js("result-meta", scr).textContent = metaLine(R);
    js("tzolkin-number-title", scr).textContent = strip(fill(R.numberTitle, { n: v.number, title: num.title }));
    js("tzolkin-number-glyph", scr).setAttribute("href", `#maya-${v.number}`);
    js("tzolkin-sign-name", scr).textContent = strip(e.name);
    js("turn-text", scr).innerHTML = num.text;
    const F = R.facts;
    entryReading(scr, e, [
      [F.latin, e.latin], [F.kiche, e.facts.kiche], [F.meaning, e.facts.meaning],
      [F.order, fill(R.order, { n: v.sign + 1 })], [F.day, fill(R.day, { n: day })],
    ], R.interpretNote);
    finishResult(scr, "tzolkin", e, R);
  }
  js("result-retry", screens["tzolkin-result"]).addEventListener("click", () => {
    editing.tzolkin = true;
    go("tzolkin-input");
  });

  // ═════════ 시빌라 신탁의 방 (5장) ═════════
  // 질문(자유 입력)은 sib.question 변수와 화면 글자에만 있다. state(=sessionStorage)·공유 카드·URL에는 절대 넣지 않는다.
  const sib = { topic: "exam", question: "", pick: null, near: 0, drag: null, moved: false, done: false };
  const sibQ = js("sibyl-question");
  const sibCount = () => (js("sibyl-question-count").textContent = fill(T.sibyl.input.count, { n: sibQ.value.length }));
  sibQ.addEventListener("input", sibCount);
  function selectTopic(topic) {
    jsAll("sibyl-topic").forEach((c) => {
      const on = c.dataset.topic === topic;
      c.classList.toggle("is-selected", on);
      c.setAttribute("aria-checked", String(on));
    });
    sib.topic = topic;
  }
  js("sibyl-topics").addEventListener("click", (e) => {
    const chip = e.target.closest('[data-js="sibyl-topic"]');
    if (chip) selectTopic(chip.dataset.topic);
  });
  // 내 정보 지우기: 질문·뽑은 신탁도 잊는다
  function resetSibyl() {
    sib.question = "";
    sib.pick = null;
    selectTopic("exam");
    sibCount();
    js("sibyl-ritual-question").textContent = "";
    js("sibyl-result-question", screens["sibyl-result"]).textContent = "";
  }
  enter["sibyl-input"] = sibCount;
  js("sibyl-input-go").addEventListener("click", () => {
    sib.question = sibQ.value.replace(/\s+/g, " ").trim().slice(0, 60);
    sib.pick = Calc.pickOracle(ORACLES.length);
    go("sibyl-ritual");
  });

  // 의식: 두루마리를 아래로 끌기(172px = --near 1) → 0.8 이상에서 놓거나, 한 번 누르면 .is-warming → 4.4초 뒤 결과(움직임 줄이기 1초)
  const sibRitual = screens["sibyl-ritual"];
  const stage = js("sibyl-stage");
  const scroll = js("sibyl-scroll");
  const TRAVEL = 172;
  const setNear = (v) => {
    sib.near = Math.max(0, Math.min(1, v));
    stage.style.setProperty("--near", sib.near.toFixed(3));
  };
  enter["sibyl-ritual"] = () => {
    if (sib.pick == null) return go("sibyl-input", { instant: true });
    const o = ORACLES[sib.pick];
    Object.assign(sib, { near: 0, drag: null, moved: false, done: false });
    stage.classList.remove("is-dragging", "is-warming");
    setNear(0);
    js("sibyl-ritual-category").textContent = strip(T.sibyl.topics[sib.topic].label);
    js("sibyl-ritual-question").textContent = sib.question ? fill(T.sibyl.result.question, { q: sib.question }) : "";
    js("sibyl-scroll-num").textContent = fill(T.sibyl.ritual.num, { roman: roman(sib.pick + 1) });
    js("sibyl-scroll-text").textContent = strip(o.line);
    js("sibyl-ritual-hint").textContent = strip(T.sibyl.ritual.hint);
  };
  leave["sibyl-ritual"] = () => {
    sib.drag = null;
    stage.classList.remove("is-dragging", "is-warming");
  };
  scroll.addEventListener("pointerdown", (e) => {
    if (sib.done) return;
    sib.drag = { y: e.clientY, from: sib.near };
    sib.moved = false;
    stage.classList.add("is-dragging");
    try {
      scroll.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 무시 */
    }
  });
  scroll.addEventListener("pointermove", (e) => {
    if (!sib.drag || sib.done) return;
    const dy = e.clientY - sib.drag.y;
    if (Math.abs(dy) > 6) sib.moved = true;
    setNear(sib.drag.from + dy / TRAVEL);
  });
  const releaseScroll = () => {
    if (!sib.drag) return;
    sib.drag = null;
    stage.classList.remove("is-dragging");
    if (sib.done) return;
    if (sib.near >= 0.8) warm();
    else if (sib.moved) setNear(0); // 덜 끌었으면 제자리로 (CSS 0.3초)
  };
  scroll.addEventListener("pointerup", releaseScroll);
  scroll.addEventListener("pointercancel", releaseScroll);
  scroll.addEventListener("contextmenu", (e) => e.preventDefault());
  scroll.addEventListener("click", () => {
    if (sib.done) return;
    if (sib.moved) {
      sib.moved = false;
      return;
    }
    warm();
  });
  function warm() {
    sib.done = true;
    stage.classList.remove("is-dragging");
    setNear(1);
    stage.classList.add("is-warming");
    js("sibyl-ritual-hint").textContent = strip(T.sibyl.ritual.warmingHint);
    buzz([20, 40, 20]);
    const pick = sib.pick, topic = sib.topic, question = sib.question;
    waitResult(sibRitual, waitMs("sibyl", reduceMotion ? 1000 : 4400), () => {
      renderSibyl({ sors: pick, topic }, true, question);
      go("sibyl-result");
    });
  }

  // 결과. v = { sors: 0~31, topic }. question은 화면 표시용 인자일 뿐 저장·공유하지 않는다 ("전체 다시 보기"에서는 빈 글자)
  let sibylView = null;
  function renderSibyl(v, fresh, question = "") {
    const scr = screens["sibyl-result"];
    renderGuideText(scr, "sibyl");
    const R = T.sibyl.result;
    const o = ORACLES[v.sors];
    const rn = roman(v.sors + 1);
    const topic = strip(T.sibyl.topics[v.topic].label);
    sibylView = { v, o, rn, topic }; // 공유 카드용. 질문은 넣지 않는다
    if (fresh) {
      state.visits.sibyl = { sors: v.sors, topic: v.topic, archetype: o.archetype };
      save();
    }
    js("result-sors-number", scr).textContent = rn;
    js("result-title", scr).textContent = strip(o.title);
    js("result-names", scr).textContent = strip(fill(R.names, { roman: rn, topic }));
    js("result-key", scr).innerHTML = o.key;
    js("result-meta", scr).textContent = metaLine(R);
    js("sibyl-result-category", scr).textContent = topic;
    js("sibyl-result-question", scr).textContent = question ? fill(R.question, { q: question }) : "";
    js("sibyl-scroll-quote", scr).textContent = strip(o.line);
    js("turn-text", scr).innerHTML = o.turn;
    entryReading(scr, o, [], R.interpretNote);
    finishResult(scr, "sibyl", o, R);
  }
  js("result-retry", screens["sibyl-result"]).addEventListener("click", () => go("sibyl-input"));

  // 결과 화면 들어올 때 (네 방 공통: 룬·별과 같음)
  ["ogham", "decan", "tzolkin", "sibyl"].forEach((room) => {
    enter[`${room}-result`] = () => {
      const scr = screens[`${room}-result`];
      replay(js("result-capture", scr));
      watchReveal(scr);
    };
  });

  // ═════════ (8단계 U3) 방 시작 화면: 필요한 값이 프로필에 있으면 입력 화면을 건너뛰고 바로 의식 ═════════
  // 입력칸이 있는 방은 오검(이름)·별(생년월일·시각)·데칸·촐킨(생년월일). 룬 주제·시빌라 질문은 방의 본질이라 입력 화면을 그대로 둔다
  function savedValueOf(room) {
    const p = state.profile;
    if (room === "ogham") return p.name && Calc.ogham(p.name) ? p.name : null;
    if (room === "star")
      return p.birth && p.time !== undefined
        ? [fill(T.common.date, p.birth), p.time ? fill(T.common.time, { h: p.time.h, mm: pad2(p.time.m) }) : T.common.timeUnknown].join(T.common.sep)
        : null;
    if (room === "decan" || room === "tzolkin") return p.birth ? fill(T.common.date, p.birth) : null;
    return null;
  }
  CHAPTER_ORDER.filter((r) => r !== "rune" && r !== "sibyl").forEach((room) => {
    const scr = screens[`${room}-intro`];
    enter[`${room}-intro`] = () => {
      const v = savedValueOf(room);
      show(js("room-saved", scr), Boolean(v));
      js("room-saved-value", scr).textContent = v ? fill(T.room.saved.value, { value: v }) : "";
    };
    js("room-saved-edit", scr).addEventListener("click", () => {
      editing[room] = true;
      go(`${room}-input`);
    });
  });
  // 방 시작 버튼 (data-go = 입력 화면): 값이 있으면 입력 버튼과 같은 계산을 하고 바로 의식으로
  function startRoom(inputName) {
    const room = inputName.replace(/-input$/, "");
    if (!savedValueOf(room)) return go(inputName);
    editing[room] = false;
    const p = state.profile;
    if (room === "ogham") {
      oghamCalc = Calc.ogham(p.name);
      return go("ogham-ritual");
    }
    const b = p.birth;
    if (room === "star") {
      starCalc = Astro.birthChart(b.y, b.m, b.d, p.time);
      return go("star-ritual");
    }
    if (room === "decan") {
      decanCalc = Object.assign({ birth: b }, Calc.decan(b.y, b.m, b.d));
      return go("decan-ritual");
    }
    tzCalc = Calc.tzolkin(b.y, b.m, b.d);
    return go("tzolkin-ritual");
  }
  // "전체 다시 보기"·테스트용: 저장된 결과 코드로 결과를 다시 그린다 (fresh=false면 저장하지 않음)
  const RENDER = {
    rune: renderRune, star: renderStar, ogham: renderOgham, decan: renderDecan, tzolkin: renderTzolkin,
    sibyl: (v, fresh) => renderSibyl(v, fresh, ""),
  };

  // ═════════ 5. 나의 이야기 ═════════
  const storyScr = screens.story;
  function runeSummary(v) {
    const [p, n, x] = v.picks.map((c) => RUNE_BY_CODE[c]);
    return T.story.runeSummary.map((tpl) => fill(tpl, { past: p.summary.past, now: n.summary.now, next: x.summary.next }));
  }
  function visitType(room) {
    const v = state.visits[room];
    const E = T.story.evidenceType;
    if (room === "rune") {
      const [p, n, x] = v.picks.map((c) => RUNE_BY_CODE[c]);
      return fill(T.story.evidenceRuneType, { past: p.name, now: n.name, next: x.name });
    }
    if (room === "ogham") return fill(E.ogham, { latin: OGHAM[v.ogham].latin, name: OGHAM[v.ogham].name });
    if (room === "decan") return fill(E.decan, { sign: DECANS[v.decan].sign, part: T.decan.partNames[DECANS[v.decan].part - 1] });
    if (room === "tzolkin") return fill(E.tzolkin, { number: v.number, name: TZ_SIGNS[v.sign].name });
    if (room === "sibyl") return fill(E.sibyl, { roman: roman(v.sors + 1), title: ORACLES[v.sors].title });
    return NAKS[v.nak].name;
  }
  // 나의 이야기 요약 (문단 배열)
  function visitSummary(room) {
    const v = state.visits[room];
    if (room === "rune") return runeSummary(v);
    if (room === "ogham") return OGHAM[v.ogham].summary;
    if (room === "decan") return DECANS[v.decan].summary;
    if (room === "tzolkin") return TZ_SIGNS[v.sign].summary;
    if (room === "sibyl") return ORACLES[v.sors].summary;
    return NAKS[v.nak].summary;
  }
  function renderStory() {
    const filled = filledRooms();
    const n = filled.length;
    const S = T.story;
    js("story-title", storyScr).textContent = fill(S.title, { who: whoOf(state.profile.name || "") });
    $$(".arch-mark", js("story-progress", storyScr)).forEach((m, i) => m.classList.toggle("is-done", Boolean(state.visits[CHAPTER_ORDER[i]])));
    js("story-count", storyScr).innerHTML = fill(S.count, { n });

    const top = currentArchetype();
    const card = js("story-archetype", storyScr);
    card.classList.toggle("is-empty", n === 0);
    card.classList.toggle("is-complete", n === CHAPTER_ORDER.length);
    const A = top ? T.archetypes[top] : null;
    js("story-archetype-name", storyScr).textContent = A ? A.name : S.archetype.emptyName;
    js("story-archetype-status", storyScr).textContent =
      n === 0 ? S.archetype.emptyStatus
        : n === CHAPTER_ORDER.length ? fill(S.archetype.statusComplete, { name: A.name })
          : fill(S.archetype.status, { name: A.name, left: CHAPTER_ORDER.length - n });
    js("story-archetype-desc", storyScr).textContent = A ? A.desc : S.archetype.emptyDesc;
    js("story-evidence", storyScr).innerHTML = filled
      .map((room) => `<li class="evidence__item" data-room="${room}"><span class="evidence__glyph" aria-hidden="true">${ROOM_ICON[room]}</span><span class="evidence__room">${T.rooms[room].name}</span><span class="evidence__type">${visitType(room)}</span><span class="evidence__tag">${T.archetypes[state.visits[room].archetype].name}</span></li>`)
      .join("");
    show(js("story-empty", storyScr), n === 0);
    show(js("story-share-top", storyScr), n > 0);
    show(js("story-share", storyScr), n > 0);

    // 등뼈: 1~6장 고정 순서
    resetReveal(storyScr);
    jsAll("story-chapter", storyScr).forEach((li, i) => {
      const room = CHAPTER_ORDER[i];
      const done = Boolean(state.visits[room]);
      const locked = !done && !isUnlocked(room); // (7단계) 앞의 문을 지나야 열리는 장
      li.classList.toggle("is-done", done);
      li.classList.toggle("is-available", !done && !locked);
      li.classList.toggle("is-upcoming", locked);
      li.dataset.room = room;
      const R = T.rooms[room];
      const label = `<p class="spine-item__label">${fill(S.chapterLabel, { n: i + 1, chapter: R.chapterName })}</p>`;
      let html;
      if (done) {
        const summary = visitSummary(room);
        html = `${label}<p class="spine-item__room">${R.name} <span class="spine-item__type" data-js="story-chapter-type">${visitType(room)}</span></p>
          <div class="spine-item__summary" data-js="story-chapter-summary">${summary.map((p) => `<p>${p}</p>`).join("")}</div>
          <button class="btn btn--text spine-item__reread" type="button" data-js="story-chapter-reread" data-room="${room}">${S.reread}</button>`;
      } else if (locked) {
        html = `${label}<p class="spine-item__room">${R.name}</p><p class="spine-item__teaser">${fill(S.teaserLocked, { room: R.name })}</p>`;
      } else {
        html = `${label}<p class="spine-item__room">${R.name}</p><p class="spine-item__teaser">${fill(S.teaserAvailable, { room: R.name })}</p>
          <button class="btn btn--secondary btn--small spine-item__go" type="button" data-go="${room}-intro" data-js="story-chapter-go">${fill(S.go, { room: R.name })}</button>`;
      }
      js("story-chapter-body", li).innerHTML = html;
    });
  }
  enter.story = () => {
    renderStory();
    replay(js("story-progress", storyScr));
    replay(js("story-archetype", storyScr));
    watchReveal(storyScr);
  };
  // 전체 다시 보기: 저장된 결과 코드로 그 방 결과를 다시 그린다 (저장은 바꾸지 않음)
  storyScr.addEventListener("click", (e) => {
    const b = e.target.closest('[data-js="story-chapter-reread"]');
    if (!b) return;
    const room = b.dataset.room;
    if (!state.visits[room]) return;
    RENDER[room](state.visits[room], false);
    go(`${room}-result`);
  });

  // ═════════ 공유 카드 ═════════
  async function shareCard(btn, build) {
    if (btn.classList.contains("is-loading")) return;
    btn.classList.add("is-loading");
    try {
      const { opts, file, text } = build();
      const canvas = await ShareCard.render(Object.assign({ fonts: FONTS, footer: T.card.footer, footerY: 1630 }, opts));
      const how = await ShareCard.share(canvas, file, text);
      if (how === "downloaded") toast(T.toast.saved);
    } catch (err) {
      toast(T.toast.shareFail);
    } finally {
      btn.classList.remove("is-loading");
    }
  }
  const runePath = (code) => {
    const p = document.querySelector(`#rune-${code} path`);
    return p ? p.getAttribute("d") : "";
  };
  function buildRuneCard() {
    const { v, past, now, next } = runeView;
    const C = T.rune.card;
    return {
      file: C.file, text: C.shareText,
      opts: {
        theme: CARD_THEME.rune, eyebrow: C.eyebrow, seed: past.index + 1,
        stones: [past, now, next].map((r, i) => ({ path: runePath(v.picks[i]), label: T.rune.norns[i].latin })),
        title: [past, now, next].map((r) => r.name).join(" · "),
        subtitle: fill(C.subtitle, { keyword: next.keyword }),
        lines: [strip(now.key)],
        badges: [C.badge],
        guideSignature: { name: T.guides.rune.name, line: strip(T.guides.rune.signature) },
      },
    };
  }
  function buildStarCard() {
    const { v, nak, west, sun } = starView;
    const C = T.star.card;
    const number = fill(C.number, { n: v.nak + 1 });
    return {
      file: C.file, text: fill(C.shareText, { house: nak.name }),
      opts: {
        theme: CARD_THEME.star, eyebrow: C.eyebrow, seed: v.nak + 1,
        // 초승달(원 260 + 점선 궤도 300) + 번호
        art: {
          height: 390,
          draw(ctx, { x, y, theme }) {
            const cy = y + 150;
            ctx.save();
            ctx.setLineDash([4, 12]);
            ctx.strokeStyle = theme.accent;
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, cy, 150, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            // 초승달: 둥근 달에서 옆으로 비킨 원을 도려낸다 (따로 그린 뒤 빛과 함께 붙인다)
            const m = document.createElement("canvas");
            m.width = m.height = 240;
            const mc = m.getContext("2d");
            mc.fillStyle = theme.accent;
            mc.beginPath();
            mc.arc(120, 120, 110, 0, Math.PI * 2);
            mc.fill();
            mc.globalCompositeOperation = "destination-out";
            mc.beginPath();
            mc.arc(168, 94, 96, 0, Math.PI * 2);
            mc.fill();
            ctx.save();
            ctx.shadowColor = theme.accent;
            ctx.shadowBlur = 60;
            ctx.drawImage(m, x - 120, cy - 120);
            ctx.restore();
            ctx.save();
            ctx.fillStyle = theme.accent;
            ctx.font = `500 34px ${FONTS.latin}`;
            ctx.textAlign = "center";
            ctx.fillText(number, x, y + 370);
            ctx.restore();
          },
        },
        title: nak.name, titleSize: 110,
        subtitle: nak.title,
        lines: [strip(nak.key)],
        badges: [v.west === v.sunRashi ? fill(C.twistSame, { sign: west.ko }) : fill(C.twist, { west: west.ko, vedic: sun.ko }), C.badge],
        guideSignature: { name: T.guides.star.name, line: strip(T.guides.star.signature) },
      },
    };
  }
  function buildStoryCard() {
    const filled = filledRooms();
    const top = currentArchetype();
    const S = T.card.story;
    return {
      file: S.file, text: S.shareText,
      opts: {
        theme: CARD_THEME.story, eyebrow: S.eyebrow, seed: 11,
        progress: { done: filled.map(chapterOf), total: 6, label: fill(S.progress, { n: filled.length }) },
        lead: S.lead,
        title: T.archetypes[top].name, titleSize: 150, titleColor: "accent", titleGlow: true,
        lines: [strip(T.archetypes[top].line)],
        hook: fill(S.hook, { n: filled.length }),
      },
    };
  }
  // ── (2단계) 네 방 카드: common/share-card.js의 bark·sundial·dayGlyph·laurel·parchment 옵션 (design "공유 카드 레이아웃")
  const symbolPath = (id) => {
    const p = document.querySelector(`#${id} path`);
    return p ? p.getAttribute("d") : "";
  };
  function buildOghamCard() {
    const { e } = oghamView;
    const C = T.ogham.card;
    return {
      file: C.file, text: strip(fill(C.shareText, { latin: e.latin })),
      opts: {
        theme: CARD_THEME.ogham, eyebrow: strip(C.eyebrow), seed: 31 + OGHAM.indexOf(e),
        bark: { path: symbolPath(`ogham-${e.code}`), label: e.latin.toUpperCase() },
        title: strip(e.title), subtitle: strip(e.name),
        lines: [strip(e.key)],
        badges: [strip(C.badge)],
        guideSignature: { name: T.guides.ogham.name, line: strip(T.guides.ogham.signature) },
      },
    };
  }
  function buildDecanCard() {
    const { v, e } = decanView;
    const C = T.decan.card;
    return {
      file: C.file, text: strip(C.shareText),
      opts: {
        theme: CARD_THEME.decan, eyebrow: strip(C.eyebrow), seed: 71 + v.decan,
        sundial: { index: v.decan, label: fill(C.number, { n: v.decan + 1 }), labelColor: "accent" },
        title: strip(e.title), subtitle: strip(fill(T.decan.ritual.name, { sign: e.sign, part: partName(e.part - 1) })),
        lines: [strip(e.key)],
        badges: [strip(C.badge)],
        guideSignature: { name: T.guides.decan.name, line: strip(T.guides.decan.signature) },
      },
    };
  }
  function buildTzolkinCard() {
    const { v, e, day } = tzView;
    const C = T.tzolkin.card;
    const LATIN = e.latin.toUpperCase();
    return {
      file: C.file, text: strip(fill(C.shareText, { day: `${v.number} ${e.latin}` })),
      opts: {
        theme: CARD_THEME.tzolkin, eyebrow: strip(C.eyebrow), seed: 113 + v.sign,
        dayGlyph: { number: v.number, sign: LATIN, label: fill(C.count, { n: day }), labelColor: "accent" },
        title: strip(fill(T.tzolkin.result.title, { number: v.number, name: e.name })), subtitle: `${v.number} ${LATIN}`,
        lines: [strip(e.key)],
        badges: [strip(C.badge)],
        guideSignature: { name: T.guides.tzolkin.name, line: strip(T.guides.tzolkin.signature) },
      },
    };
  }
  // 시빌라 카드: 주제(카테고리)만. 사용자가 적은 질문은 넣지 않는다 (sibylView에도 질문이 없다)
  function buildSibylCard() {
    const { v, o, rn, topic } = sibylView;
    const C = T.sibyl.card;
    return {
      file: C.file, text: strip(C.shareText),
      opts: {
        theme: CARD_THEME.sibyl, eyebrow: strip(C.eyebrow), seed: 151 + v.sors,
        laurel: { numeral: rn, label: C.label },
        title: strip(o.title), subtitle: topic,
        parchment: { text: strip(o.line) },
        badges: [strip(C.badge)],
        guideSignature: { name: T.guides.sibyl.name, line: strip(T.guides.sibyl.signature) },
      },
    };
  }
  const CARD_BUILD = { rune: buildRuneCard, star: buildStarCard, ogham: buildOghamCard, decan: buildDecanCard, tzolkin: buildTzolkinCard, sibyl: buildSibylCard };
  ["result-share", "result-share-top"].forEach((name) => {
    CHAPTER_ORDER.forEach((room) => js(name, screens[`${room}-result`]).addEventListener("click", (e) => shareCard(e.currentTarget, CARD_BUILD[room])));
  });
  ["story-share", "story-share-top"].forEach((name) => js(name, storyScr).addEventListener("click", (e) => {
    if (filledRooms().length) shareCard(e.currentTarget, buildStoryCard);
  }));

  // ═════════ 6단계: 유료 리포트 "더 깊은 이야기" (spec 6-3·6-4, design 「6단계」) ═════════
  // 켜지는 조건: pay.json의 api가 true(Vercel 배포본) → /api/config가 enabled:true. 그 밖(순수 정적 서버·파일·off)은 전부 꺼짐이고,
  // 꺼져 있으면 새 요소는 .is-hidden 그대로, 세 화면(deeper·unseal·report)으로 가는 길이 없다 (D-9).
  // 개인정보 (CLAUDE.md 6장, spec 6-4):
  //  - 서버로 보내는 것: 결제 정보(paymentKey·orderId·amount)와 영수증 코드뿐. orderId 안에는 결과 코드 번호만 있다 (paycode.js).
  //  - 이름·생년월일·태어난 시각·시빌라 질문·상대 정보는 보내지 않는다. 나이는 구간 코드(b1~b7)로만, 상대는 원형·관계 등급 코드로만 바뀐다.
  //  - 상대의 이름·생년월일은 입력칸에만 있고 어디에도 저장하지 않는다(sessionStorage 포함). 코드를 만든 직후 입력칸을 비운다.
  //  - 이 화면에서 새로 넣은 내 생년월일도 저장하지 않고 이번 계산에만 쓴다 (프로필에 이미 있으면 그 값을 쓴다).
  //  - sessionStorage에는 영수증 코드만 따로 둔다(키 strange-oracle-receipt, 개인정보 아님). "내 정보 지우기"는 이것을 지우지 않는다.
  //  - 유료 문구는 메모리(reportView)에만 두고 어떤 저장소에도 넣지 않는다.
  const PAY_OFF = { enabled: false, mode: "off", clientKey: "", price: 3900, orderName: "" };
  let Pay = PAY_OFF;
  const RECEIPT_KEY = "strange-oracle-receipt";
  const TOSS_SDK = "https://js.tosspayments.com/v2/standard"; // 토스 공식 주소(CLAUDE.md 3장 예외). 결제 버튼을 누른 뒤에만 불러온다
  const deeperScr = screens.deeper;
  const unsealScr = screens.unseal;
  const reportScr = screens.report;
  // 예상 분량 (spec 6-2 표. 서버 문구 한도와 같게 유지 — D-11)
  // 결제 전 고지 분량: 완성된 유료 문구의 실측 평균(2026-09-29, 항목별 평균). 문구를 크게 바꾸면 다시 잰다
  // (8단계) room = 책 제1부 한 방의 새 문장 평균(Ⅰ장 나머지 ch1Rest + Ⅱ~Ⅳ장 + 숨은 장, 룬·시빌라는 주제 단락 1개 포함),
  // free = 방에서 이미 본 핵심 풀이 평균(lede + 공개 body, 룬은 세 돌 첫 단락 + 머리 문장). 2026-09-29 core.buildReport 전 항목(룬은 표본 1,300여 조합) 실측
  const VOL = {
    room: { ogham: 2873, star: 3013, decan: 3033, tzolkin: 2956, rune: 4044, sibyl: 2257 },
    free: { ogham: 621, star: 681, decan: 648, tzolkin: 625, rune: 274, sibyl: 411 },
    open: 280, stage: 490, summary: 130, matchBody: 680, side: 160, matchRoom: 300, deep: 1270, close: 280,
  };
  const READ_PER_MIN = 500; // 읽는 속도 분당 500자 (spec 8단계 가정)
  const comma = (n) => Number(n).toLocaleString("ko-KR");
  const readReceipt = () => {
    try {
      return PayCode.normalize(window.sessionStorage.getItem(RECEIPT_KEY) || "");
    } catch (e) {
      return "";
    }
  };
  const writeReceipt = (code) => {
    try {
      if (code) window.sessionStorage.setItem(RECEIPT_KEY, code);
      else window.sessionStorage.removeItem(RECEIPT_KEY);
    } catch (e) {
      /* 저장이 막힌 브라우저: 코드 카드로만 안내 */
    }
  };
  // data-t가 붙은 요소를 한 덩어리 안에서만 다시 채운다 (복제한 틀에 쓴다)
  const textIn = (el) => $$("[data-t]", el).forEach((x) => (x.textContent = get(x.dataset.t) ?? ""));
  const paras = (el, list) => {
    el.textContent = "";
    for (const t of list || []) {
      const p = document.createElement("p");
      p.textContent = t;
      el.append(p);
    }
  };

  // ── 마크업의 모양 견본을 틀로 떼어 두고, data-t 없는 초안 표시 견본 글자는 지운다 (design developer 요청 2·3)
  const tpl = {
    stage: js("report-timeline").firstElementChild.cloneNode(true),
    matchRoom: js("report-match-rooms").firstElementChild.cloneNode(true),
  };
  function clearPaidSamples() {
    ["report-timeline", "report-match-rooms", "report-open", "report-close", "report-match", "report-deep-strength", "report-deep-shadow", "report-deep-growth",
      "report-title", "report-meta", "receipt-code", "receipt-code-end", "unseal-error-code", "deeper-total", "deeper-items", "deeper-volume", "deeper-price", "deeper-saved-value"]
      .forEach((n) => (js(n).textContent = ""));
    [...js("report-match-pair").children].forEach((s, i) => i !== 1 && (s.textContent = ""));
    jsAll("deeper-toc-item").forEach((li) => ["toc-name", "toc-vol", "toc-teaser"].forEach((n) => (js(n, li).textContent = "")));
  }

  // ── 서버 호출 (같은 출처 /api/*). 본문에는 정해진 키만 담는다
  async function apiCall(name, body) {
    const ctl = "AbortController" in window ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 20000);
    try {
      const res = await fetch(`/api/${name}`, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        credentials: "omit",
        signal: ctl ? ctl.signal : undefined,
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        /* 빈 응답 */
      }
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: null };
    } finally {
      clearTimeout(timer);
    }
  }
  async function loadPayConfig() {
    try {
      const flag = await (await fetch("pay.json", { cache: "no-store" })).json();
      if (!flag || flag.api !== true) return;
      const r = await apiCall("config");
      const c = r.ok && r.data;
      if (c && c.enabled === true && ["mock", "test", "live"].includes(c.mode) && Number(c.price) > 0)
        Pay = { enabled: true, mode: c.mode, clientKey: String(c.clientKey || ""), price: Number(c.price), orderName: String(c.orderName || "") };
    } catch (e) {
      Pay = PAY_OFF; // 설정을 못 받으면 결제만 조용히 꺼진다
    }
  }
  const hasBlank = () => JSON.stringify([T.biz, T.deeper.disclosure]).includes("◯◯");

  // ── 진입점 상태 (입구 책 카드·나의 이야기·방 결과 책 한 줄)
  function applyPayUi() {
    const on = Pay.enabled;
    const owned = on && Boolean(readReceipt());
    const card = js("story-paid");
    card.classList.toggle("is-on", on);
    card.classList.toggle("is-owned", owned);
    js("story-paid-status").textContent = on ? T.story.paid.statusOn : T.story.paid.status;
    const goBtn = js("story-paid-go");
    goBtn.disabled = !on;
    goBtn.textContent = !on ? T.story.paid.go : owned ? T.story.paid.goOwned : T.story.paid.goOn;
    show(js("story-paid-reopen"), on);
    renderBookCard();
    updateBookLines();
    jsAll("pay-band").forEach((band) => {
      const mode = Pay.mode === "mock" || Pay.mode === "test" ? Pay.mode : null;
      show(band, Boolean(mode));
      if (!mode) return;
      band.dataset.mode = mode;
      const label = $("[data-t]", band);
      label.dataset.t = `pay.band.${mode}`;
      label.textContent = T.pay.band[mode];
    });
  }
  // (8단계, 8-2 5번) 입구 "한 권의 책" 카드: locked(6/6 전, 핍 N칸 + 미리보기) / ready(6/6, 3,900원) / owned(내 책 다시 펴기)
  function renderBookCard() {
    const box = js("hub-paid");
    show(box, Pay.enabled);
    if (!Pay.enabled) return;
    const n = filledRooms().length;
    const st = bookState();
    const card = js("hub-book");
    card.dataset.state = st;
    $$("i", js("hub-book-lock")).forEach((pip, i) => pip.classList.toggle("is-on", i < n));
    js("hub-book-hint").textContent = fill(T.hub.book.hint, { n });
    js("hub-book-go").textContent = fill(T.hub.book.go[st], { price: comma(Pay.price) });
  }
  js("hub-book-go").addEventListener("click", (e) => {
    const code = readReceipt();
    if (Pay.enabled && code) reopen(code, e.currentTarget, null);
    else if (Pay.enabled) go("deeper");
  });
  // 영수증 코드 입력은 접힌 글자 링크 (U9)
  js("receipt-toggle").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    const form = js("receipt-open", js("hub-paid"));
    show(form, open);
    if (open) js("receipt-open-input", form).focus();
  });
  js("story-paid-go").addEventListener("click", () => {
    if (!Pay.enabled) return;
    const code = readReceipt();
    if (code) reopen(code, js("story-paid-go"), null);
    else go("deeper");
  });

  // ── 브라우저 쪽 계산: 나이 구간·상대 원형·관계 등급 (spec 6-2)
  // 오늘 기준 만 나이 → b1(24세 이하) b2(25~29) … b7(50세 이상) = 0~6
  function ageBand(b) {
    const now = new Date();
    let age = now.getFullYear() - b.y;
    if (now.getMonth() + 1 < b.m || (now.getMonth() + 1 === b.m && now.getDate() < b.d)) age--;
    return age <= 24 ? 0 : Math.min(6, Math.floor((age - 25) / 5) + 1);
  }
  // 원형 합산(무료 방과 같은 규칙): 가장 많이 나온 원형, 동점이면 앞선 장
  function tallyArchetype(tags) {
    const tally = {};
    tags.forEach(([room, a]) => {
      const t = (tally[a] = tally[a] || { count: 0, first: CHAPTER_ORDER.indexOf(room) });
      t.count += 1;
    });
    return Object.entries(tally).sort((x, y) => y[1].count - x[1].count || x[1].first - y[1].first)[0][0];
  }
  // 상대: 이름 → 오검, 생년월일 → 데칸(한국 시간 정오, 후보 선택 없음)·촐킨. 별의 방은 시각이 필요해 뺀다
  function partnerOf(name, b) {
    const og = Calc.ogham(name);
    if (!og) return null;
    const decan = Calc.decan(b.y, b.m, b.d).noon.index;
    const tz = Calc.tzolkin(b.y, b.m, b.d);
    const arch = tallyArchetype([["ogham", OGHAM[og.index].archetype], ["decan", DECANS[decan].archetype], ["tzolkin", TZ_SIGNS[tz.sign].archetype]]);
    return { arch, ogham: og.index, decan, tzSign: tz.sign };
  }
  // 나의 오검·데칸·촐킨: 방문 기록 우선, 없으면 프로필 이름·이번 생년월일로 같은 방식 계산 (방문 기록에는 넣지 않는다)
  function mineForRelation(birth) {
    const v = state.visits;
    const og = v.ogham ? v.ogham.ogham : state.profile.name ? Calc.ogham(state.profile.name)?.index ?? null : null;
    const decan = v.decan ? v.decan.decan : birth ? Calc.decan(birth.y, birth.m, birth.d).noon.index : null;
    const tzSign = v.tzolkin ? v.tzolkin.sign : birth ? Calc.tzolkin(birth.y, birth.m, birth.d).sign : null;
    return { ogham: og, decan, tzSign };
  }
  function relations(mine, p) {
    const rel = { relOgham: null, relDecan: null, relTzolkin: null };
    if (mine.ogham != null) rel.relOgham = mine.ogham === p.ogham ? 0 : OGHAM[mine.ogham].aicme === OGHAM[p.ogham].aicme ? 1 : 2;
    if (mine.decan != null) {
      const s1 = Math.floor(mine.decan / 3), s2 = Math.floor(p.decan / 3);
      const e1 = s1 % 4, e2 = s2 % 4; // 0 불 · 1 흙 · 2 공기 · 3 물 (양자리부터 원소 순환)
      rel.relDecan = s1 === s2 ? 0 : e1 === e2 ? 1 : (e1 + e2) % 2 === 0 ? 2 : 3; // 2 = 불-공기, 흙-물
    }
    if (mine.tzSign != null) rel.relTzolkin = mine.tzSign === p.tzSign ? 0 : mine.tzSign % 4 === p.tzSign % 4 ? 1 : 2;
    return rel;
  }
  function myRoomCodes() {
    const v = state.visits;
    return {
      rune: v.rune ? v.rune.picks.map((c) => RUNE_BY_CODE[c].index) : null,
      star: v.star ? v.star.nak : null,
      ogham: v.ogham ? v.ogham.ogham : null,
      decan: v.decan ? v.decan.decan : null,
      tzolkin: v.tzolkin ? { number: v.tzolkin.number, sign: v.tzolkin.sign } : null,
      sibyl: v.sibyl ? v.sibyl.sors : null,
    };
  }

  // ── 6-P 미리보기 입력 읽기
  const dYear = js("deeper-year"), dMonth = js("deeper-month"), dDay = js("deeper-day");
  const pName = js("deeper-partner-name"), pYear = js("deeper-partner-year"), pMonth = js("deeper-partner-month"), pDay = js("deeper-partner-day");
  digitsOnly(dYear, dMonth);
  digitsOnly(dMonth, dDay);
  digitsOnly(dDay);
  digitsOnly(pYear, pMonth);
  digitsOnly(pMonth, pDay);
  digitsOnly(pDay);
  let deeperEditing = false;
  let payFailed = false;
  function readMyBirth(report) {
    const useSaved = Boolean(state.profile.birth) && !deeperEditing;
    if (useSaved) return state.profile.birth;
    const y = Number(dYear.value), m = Number(dMonth.value), d = Number(dDay.value);
    const ok = dYear.value.length === 4 && Calc.validDate(y, m, d);
    if (report) setFieldError("deeper-date-field", "deeper-date-error", ok ? "" : T.deeper.errors.date);
    return ok ? { y, m, d } : null;
  }
  // 상대: 넷 다 비었으면 none, 모두 맞으면 ok(+계산 결과), 아니면 오류 종류
  function readPartner(report) {
    const vals = [pName.value.trim(), pYear.value, pMonth.value, pDay.value];
    let out;
    if (vals.every((x) => !x)) out = { state: "none" };
    else {
      const y = Number(pYear.value), m = Number(pMonth.value), d = Number(pDay.value);
      const dateOk = pYear.value.length === 4 && Calc.validDate(y, m, d);
      if (!vals[0] || !dateOk) out = { state: "error", msg: T.deeper.errors.partnerBoth };
      else {
        const p = partnerOf(vals[0], { y, m, d });
        out = p ? { state: "ok", p } : { state: "error", msg: T.deeper.errors.partnerName };
      }
    }
    if (report) {
      const err = js("deeper-partner-error");
      err.textContent = out.state === "error" ? out.msg : "";
      show(err, out.state === "error");
    }
    return out;
  }
  const clearPartner = () => [pName, pYear, pMonth, pDay].forEach((el) => (el.value = ""));

  // 예상 분량·목차 (8단계: 여섯 방 한 권. 방마다 VOL 실측 평균, 6/6 전에는 들른 방 + 남은 방을 모두 넣어 "완성된 책" 기준)
  const bigNum = (n) => {
    const k = Math.round(n / 1000);
    const B = T.report.bigNum;
    const out = [];
    if (k >= 10) out.push(fill(B.man, { n: Math.floor(k / 10) }));
    if (k % 10 || k < 10) out.push(fill(B.chun, { n: k % 10 || k }));
    return out.join(B.sep);
  };
  function plan() {
    const rooms = CHAPTER_ORDER;
    const me = currentArchetype();
    const birth = readMyBirth(false);
    const partner = readPartner(false);
    const p = partner.state === "ok" ? partner.p : null;
    const rel = p ? relations(mineForRelation(birth), p) : null;
    const relCount = rel ? Object.values(rel).filter((g) => g != null).length : 0;
    const vol = {
      open: VOL.open,
      rooms: rooms.reduce((s, r) => s + VOL.room[r] + VOL.free[r], 0),
      timeline: VOL.stage * 3,
      match: p ? VOL.summary + VOL.matchBody + (p.arch === me ? 1 : 2) * VOL.side + relCount * VOL.matchRoom : VOL.summary * 8,
      deep: VOL.deep,
      close: VOL.close,
    };
    const total = Object.values(vol).reduce((a, b) => a + b, 0);
    const seen = rooms.reduce((s, r) => s + VOL.free[r], 0); // 방에서 이미 본 핵심 풀이
    return { rooms, me, birth, p, vol, total, fresh: total - seen };
  }
  function renderToc() {
    const P = plan();
    const Tt = T.deeper.toc;
    const meName = P.me ? T.archetypes[P.me].name : "";
    const band = P.birth ? Math.min(ageBand(P.birth), 4) : null;
    const names = {
      open: Tt.open,
      rooms: Tt.rooms,
      timeline: band == null ? T.report.parts.timeline : fill(Tt.timeline, { from: T.deeper.bands[band], to: T.deeper.bands[band + 2] }),
      match: P.p ? fill(Tt.match, { me: meName, with: particle(meName || "나", "과/와"), you: T.archetypes[P.p.arch].name }) : fill(Tt.matchMap, { me: meName, with: particle(meName || "나", "과/와") }),
      deep: fill(Tt.deep, { me: meName }),
      close: Tt.close,
    };
    const teaser = {
      open: T.deeper.teaser.open,
      rooms: T.deeper.teaser.rooms,
      timeline: T.deeper.teaser.timeline,
      match: P.p ? T.deeper.teaser.match : T.deeper.teaser.matchMap,
      deep: P.me ? T.deeper.teaser.archetype[P.me] : "",
      close: T.deeper.teaser.close,
    };
    jsAll("deeper-toc-item", deeperScr).forEach((li) => {
      const part = li.dataset.part;
      js("toc-name", li).textContent = names[part];
      js("toc-vol", li).textContent = fill(part === "close" ? Tt.volClose : Tt.vol, { n: comma(P.vol[part]) });
      js("toc-teaser", li).textContent = teaser[part];
    });
    js("deeper-total").textContent = fill(Tt.total, { n: comma(P.total) });
    const D = T.deeper.disclosure;
    js("deeper-items").textContent = fill(D.items, { rooms: P.rooms.length, match: P.p ? D.itemsMatch.partner : D.itemsMatch.map });
    js("deeper-volume").textContent = fill(D.volume, { n: bigNum(P.total), fresh: bigNum(P.fresh) });
    return P;
  }
  // 결제는 여섯 문을 모두 지난 뒤에만 (8-1). 그전에는 잠금 블록(핍 + N/6 + 다음 문 열기)만, 동의 체크·결제 버튼은 숨긴다
  const allDone = () => filledRooms().length === CHAPTER_ORDER.length;
  function updatePayButton() {
    const btn = js("deeper-pay");
    const status = js("deeper-pay-status");
    const blocked = Pay.mode === "live" && hasBlank();
    const ready = allDone();
    const n = filledRooms().length;
    show(js("deeper-gate"), !ready);
    show(js("deeper-consent-row"), ready);
    show(js("deeper-pay-cta"), ready);
    $$("i", js("deeper-gate")).forEach((pip, i) => pip.classList.toggle("is-on", i < n));
    js("deeper-gate-count").textContent = fill(T.deeper.gate.count, { n });
    show(btn, !blocked);
    const consent = js("deeper-consent").checked;
    btn.disabled = !consent || !ready || btn.classList.contains("is-loading");
    status.textContent = blocked ? T.deeper.blankLive : !ready ? T.deeper.needRoom : consent ? T.deeper.payReady : T.deeper.payHint;
  }
  js("deeper-gate-next").addEventListener("click", (e) => {
    const next = nextRoom();
    if (next) openRoom(next, e.currentTarget, false);
  });
  function renderDeeperInput() {
    const saved = Boolean(state.profile.birth) && !deeperEditing;
    show(js("deeper-saved"), saved);
    show(js("deeper-date-field"), !saved);
    if (state.profile.birth) {
      js("deeper-saved-value").textContent = fill(T.common.date, state.profile.birth);
      if (!dYear.value) [dYear.value, dMonth.value, dDay.value] = [state.profile.birth.y, state.profile.birth.m, state.profile.birth.d];
    }
    setFieldError("deeper-date-field", "deeper-date-error", "");
  }
  enter.deeper = () => {
    if (!Pay.enabled) return go("hub", { instant: true });
    deeperEditing = false;
    js("deeper-consent").checked = false;
    clearPartner();
    readPartner(true);
    show(js("pay-alert"), payFailed);
    payFailed = false;
    js("deeper-price").textContent = fill(T.deeper.disclosure.price, { price: comma(Pay.price) });
    show(js("deeper-vat"), Boolean(T.deeper.disclosure.vat));
    show(js("deeper-minor"), Boolean(T.deeper.disclosure.minor));
    renderDeeperInput();
    renderToc();
    updatePayButton();
  };
  js("deeper-saved-edit").addEventListener("click", () => {
    deeperEditing = true;
    renderDeeperInput();
    renderToc();
    dYear.focus();
  });
  [dYear, dMonth, dDay, pName, pYear, pMonth, pDay].forEach((el) => el.addEventListener("input", () => renderToc()));
  js("deeper-consent").addEventListener("change", updatePayButton);

  // ── 결제 (결제 버튼을 누른 뒤에만 토스 SDK를 불러온다)
  let sdkPromise = null;
  function loadTossSdk() {
    if (window.TossPayments) return Promise.resolve();
    if (!sdkPromise)
      sdkPromise = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = TOSS_SDK;
        s.onload = () => (window.TossPayments ? res() : rej(new Error("sdk")));
        s.onerror = () => {
          sdkPromise = null;
          s.remove();
          rej(new Error("sdk"));
        };
        document.head.append(s);
      });
    return sdkPromise;
  }
  const randomHex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
  async function startPay() {
    const btn = js("deeper-pay");
    if (!Pay.enabled || btn.disabled) return;
    show(js("pay-alert"), false);
    const birth = readMyBirth(true);
    if (!birth) return dYear.focus();
    const partner = readPartner(true);
    if (partner.state === "error") return pName.focus();
    const arch = currentArchetype();
    const rooms = myRoomCodes();
    if (!arch || !allDone()) return updatePayButton(); // 6/6 전에는 결제하지 않는다 (서버 confirm도 400)
    const p = partner.state === "ok" ? partner.p : null;
    const rel = p ? relations(mineForRelation(birth), p) : { relOgham: null, relDecan: null, relTzolkin: null };
    const orderId = PayCode.encode(Object.assign(rooms, { arch, band: ageBand(birth), partner: p ? p.arch : null }, rel));
    clearPartner(); // 상대 정보는 코드로 바뀐 뒤 바로 지운다
    const base = location.origin + location.pathname;
    if (Pay.mode === "mock") {
      // 모의 결제: 토스를 부르지 않고 successUrl 모양 그대로 돌아온다
      location.assign(`${base}?pay=success&paymentKey=mock_${randomHex(12)}&orderId=${orderId}&amount=${Pay.price}`);
      return;
    }
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    js("deeper-pay-status").textContent = T.deeper.payOpening;
    try {
      await loadTossSdk();
    } catch (e) {
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
      updatePayButton();
      js("deeper-pay-status").textContent = T.pay.sdkFail;
      return;
    }
    try {
      const tp = window.TossPayments(Pay.clientKey);
      const payment = tp.payment({ customerKey: window.TossPayments.ANONYMOUS });
      // customerName·customerEmail·전화번호는 보내지 않는다 (spec 6-4)
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: Pay.price },
        orderId,
        orderName: Pay.orderName,
        successUrl: `${base}?pay=success`,
        failUrl: `${base}?pay=fail`,
      });
    } catch (e) {
      // 결제창을 닫았거나 열지 못함: 오류 코드는 보여 주지 않는다
      show(js("pay-alert"), true);
    } finally {
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
      updatePayButton();
    }
  }
  js("deeper-pay").addEventListener("click", startPay);

  // ── 6-U 봉인 해제: 의식(약 3초)과 api/confirm을 함께. 둘 다 끝나야 리포트로 (건너뛰기 = 의식만 끝냄)
  let unsealRun = 0;
  let unsealSkip = () => {};
  let lastConfirm = null;
  const stripQuery = () => {
    if (location.search) history.replaceState(history.state, "", location.pathname + location.hash);
  };
  function startUnseal(body) {
    const run = ++unsealRun;
    lastConfirm = body;
    go("unseal", { instant: true });
    unsealScr.classList.remove("is-error", "is-running");
    show(js("unseal-error"), false);
    const ms = reduceMotion ? 0 : parseFloat(getComputedStyle(unsealScr).getPropertyValue("--unseal-ms")) || 3000;
    if (!reduceMotion) {
      void unsealScr.offsetWidth;
      unsealScr.classList.add("is-running");
    }
    let waited = ms === 0;
    let result = null;
    const finish = () => {
      if (run !== unsealRun || !waited || !result) return;
      unsealScr.classList.remove("is-running");
      if (result.ok && result.data && result.data.report) {
        writeReceipt(result.data.receipt);
        applyPayUi();
        showReport(result.data);
      } else {
        unsealScr.classList.add("is-error");
        js("unseal-error-code").textContent = PayCode.pretty(PayCode.normalize(body.orderId) || "");
        show(js("unseal-error"), true);
      }
    };
    setTimeout(() => {
      waited = true;
      finish();
    }, ms);
    unsealSkip = () => {
      waited = true;
      finish();
    };
    apiCall("confirm", body).then((r) => {
      result = r;
      finish();
    });
  }
  js("unseal-skip").addEventListener("click", () => unsealSkip());
  js("unseal-retry").addEventListener("click", () => lastConfirm && startUnseal(lastConfirm));

  // ── 영수증 코드로 다시 열기
  function reopenError(status) {
    const E = T.receipt.errors;
    return status === 400 ? E.format : status === 404 ? E.notFound : status === 410 ? E.canceled : E.network;
  }
  async function reopen(code, btn, errEl) {
    if (btn) btn.classList.add("is-loading");
    const r = await apiCall("report", { receipt: code });
    if (btn) btn.classList.remove("is-loading");
    if (r.ok && r.data && r.data.report) {
      writeReceipt(r.data.receipt);
      applyPayUi();
      showReport(r.data);
    } else if (errEl) {
      errEl.textContent = reopenError(r.status);
      show(errEl, true);
    } else toast(reopenError(r.status));
  }
  jsAll("receipt-open").forEach((form) => {
    const input = js("receipt-open-input", form);
    const err = js("receipt-open-error", form);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = PayCode.normalize(input.value);
      show(err, false);
      if (!code || !PayCode.decode(code)) {
        err.textContent = T.receipt.errors.format;
        show(err, true);
        return input.focus();
      }
      reopen(code, js("receipt-open-go", form), err);
    });
  });

  // ── 6-R 한 권의 책 그리기 (문단은 모두 textContent. 서버 문구에 HTML 없음)
  let reportView = null;
  const fillCode = (el, code) => {
    el.textContent = "";
    PayCode.groups(code).forEach((g) => {
      const s = document.createElement("span");
      s.textContent = g;
      el.append(s);
    });
  };
  const SKIP_KEYS = new Set(["id", "room", "me", "you", "other", "band", "grade", "now", "past", "label", "title", "topics"]);
  function charsOf(v) {
    if (typeof v === "string") return [...v].length;
    if (Array.isArray(v)) return v.reduce((a, x) => a + charsOf(x), 0);
    if (v && typeof v === "object") return Object.entries(v).reduce((a, [k, x]) => a + (SKIP_KEYS.has(k) ? 0 : charsOf(x)), 0);
    return 0;
  }
  // 4장 근거: 영수증 코드 속 결과 번호 + 무료 데이터 (새 탭에서도 이름·생일 없이 조립된다)
  function evidenceFromCodes(c) {
    const E = T.story.evidenceType;
    const rows = [];
    for (const room of CHAPTER_ORDER) {
      if (c[room] == null) continue;
      let type, arch;
      if (room === "rune") {
        const [p, n, x] = c.rune.map((i) => RUNES[i]);
        type = fill(T.story.evidenceRuneType, { past: p.name, now: n.name, next: x.name });
        arch = x.archetype;
      } else if (room === "star") [type, arch] = [NAKS[c.star].name, NAKS[c.star].archetype];
      else if (room === "ogham") [type, arch] = [fill(E.ogham, { latin: OGHAM[c.ogham].latin, name: OGHAM[c.ogham].name }), OGHAM[c.ogham].archetype];
      else if (room === "decan") [type, arch] = [fill(E.decan, { sign: DECANS[c.decan].sign, part: T.decan.partNames[DECANS[c.decan].part - 1] }), DECANS[c.decan].archetype];
      else if (room === "tzolkin") [type, arch] = [fill(E.tzolkin, { number: c.tzolkin.number, name: TZ_SIGNS[c.tzolkin.sign].name }), TZ_SIGNS[c.tzolkin.sign].archetype];
      else [type, arch] = [fill(E.sibyl, { roman: roman(c.sibyl + 1), title: ORACLES[c.sibyl].title }), ORACLES[c.sibyl].archetype];
      rows.push(`<li class="evidence__item" data-room="${room}"><span class="evidence__glyph" aria-hidden="true">${ROOM_ICON[room]}</span><span class="evidence__room">${esc(T.rooms[room].name)}</span><span class="evidence__type">${esc(strip(type))}</span><span class="evidence__tag">${esc(T.archetypes[arch].name)}</span></li>`);
    }
    return rows.join("");
  }
  // 룬·시빌라 넷째 장 끝 "고른 주제" 단락: 주제는 영수증 코드에 없어서, 이 탭에 같은 결과가 남아 있을 때만 붙인다 (없으면 생략)
  function topicTail(fr, c) {
    if (!fr.topics) return null;
    const v = state.visits[fr.room];
    if (!v) return null;
    if (fr.room === "rune") {
      const same = v.picks.every((code, i) => RUNE_BY_CODE[code].index === c.rune[i]);
      return same && fr.topics[v.topic] ? `${T.rune.topics[v.topic].lens} ${fr.topics[v.topic]}` : null;
    }
    return v.sors === c.sibyl && fr.topics[v.topic] ? `${ORACLE_TOPICS[v.topic].lens} ${fr.topics[v.topic]}` : null;
  }
  // 책 제1부 Ⅰ장 앞부분: 방에서 본 핵심 풀이를 영수증 코드 속 결과 코드로 공개 data에서 다시 조립한다 (개인 입력 없음 → 다른 기기에서도 같은 책).
  // identity.lede + 공개 body(+ 서버 ch1Rest). 사실 목록·해석 안내·맺음 문장(identity.close)은 방 화면 전용이라 넣지 않는다 (spec 8-1, R-1)
  function bookCh1(room, c, rest) {
    if (room === "rune") {
      const rs = c.rune.map((i) => RUNES[i]);
      const R = T.rune.result;
      const out = [{ text: strip(fill(R.ch1Lede, { past: rs[0].name, now: rs[1].name, next: rs[2].name })) }];
      rs.forEach((r, i) => {
        out.push({ text: strip(fill(R.ch1Sub, { norn: T.rune.norns[i].name, name: r.name })), sub: true });
        r.identity.concat((rest && rest[i]) || []).forEach((t) => out.push({ text: strip(t) }));
      });
      return out;
    }
    const e = room === "star" ? NAKS[c.star] : room === "ogham" ? OGHAM[c.ogham] : room === "decan" ? DECANS[c.decan] : room === "tzolkin" ? TZ_SIGNS[c.tzolkin.sign] : ORACLES[c.sibyl];
    return [e.identity.lede, ...e.identity.body, ...(rest || [])].map((t) => ({ text: strip(t) }));
  }
  const rich = (el, list) => {
    el.textContent = "";
    list.forEach((x) => {
      const p = document.createElement("p");
      if (x.sub) {
        const b = document.createElement("b");
        b.textContent = x.text;
        p.append(b);
      } else p.textContent = x.text;
      el.append(p);
    });
  };
  const bookPartName = (id) =>
    CHAPTER_ORDER.includes(id) ? fill(T.topbar.room, { num: ROMAN[chapterOf(id) - 1], name: T.rooms[id].name })
      : id === "open" ? T.topbar.bookOpen : id === "flow" ? T.topbar.bookFlow : T.topbar.bookClose;
  const minutes = (n) => Math.max(1, Math.round(n / READ_PER_MIN));
  function renderReport(data) {
    const rep = data.report;
    const c = rep.codes;
    const ch = Object.fromEntries(rep.chapters.map((x) => [x.id, x]));
    reportView = { receipt: data.receipt, rep };
    const R = T.report;
    fillCode(js("receipt-code"), data.receipt);
    fillCode(js("receipt-code-end"), data.receipt);
    const toss = js("receipt-toss");
    show(toss, Boolean(data.receiptUrl));
    toss.href = data.receiptUrl || "#";
    const me = T.archetypes[c.arch].name;
    paras(js("report-open"), ch.open.paragraphs);
    // 제1부: 방마다 머리(공개 data) → Ⅰ(공개 핵심 풀이 + ch1Rest) → Ⅱ → Ⅲ → Ⅳ(+주제 단락) → 숨은 장. 서버가 Ⅰ~Ⅵ 순서로 보낸다
    const byRoom = Object.fromEntries((ch.rooms ? ch.rooms.rooms : []).map((fr) => [fr.room, fr]));
    const vol = { open: charsOf(ch.open.paragraphs) };
    const present = CHAPTER_ORDER.filter((r) => byRoom[r]);
    jsAll("book-room").forEach((el) => {
      const room = el.dataset.room;
      const fr = byRoom[room];
      show(el, Boolean(fr));
      if (!fr) return;
      const h = headOf(room, c);
      js("book-room-result", el).textContent = h.title;
      js("book-room-key", el).textContent = h.key;
      const ch1 = bookCh1(room, c, fr.ch1Rest);
      rich(js("book-ch1", el), ch1);
      paras(js("book-ch2", el), fr.ch2);
      paras(js("book-ch3", el), fr.ch3);
      const tail = topicTail(fr, c);
      paras(js("book-ch4", el), tail ? fr.ch4.concat(tail) : fr.ch4);
      paras(js("book-hidden", el), [fr.hidden.title].concat(fr.hidden.paragraphs));
      vol[room] = ch1.reduce((a, x) => a + [...x.text].length, 0) + charsOf([fr.ch2, fr.ch3, fr.ch4, fr.hidden.paragraphs]) + (tail ? [...tail].length : 0);
    });
    // 2장
    const tl = js("report-timeline");
    tl.textContent = "";
    ch.timeline.stages.forEach((s) => {
      const el = tpl.stage.cloneNode(true);
      textIn(el);
      el.classList.toggle("is-now", s.now);
      js("timeline-age", el).textContent = fill(s.now ? R.stageNow : s.past ? R.stagePast : R.stageNext, { label: s.label });
      ["work", "relation", "learn", "move"].forEach((k) => (js(`timeline-${k}`, el).textContent = s[k]));
      tl.append(el);
    });
    // 3장
    const m = ch.match;
    const pair = js("report-match-pair").children;
    pair[0].textContent = me;
    pair[2].textContent = m.you ? T.archetypes[m.you].name : R.mapYou;
    const body = js("report-match");
    paras(body, m.you ? [m.summary].concat(m.paragraphs) : []);
    show(body, Boolean(m.you));
    const list = js("report-match-rooms");
    list.textContent = "";
    const rows = m.you ? m.rooms.map((r) => [`${T.rooms[r.room].name} · ${r.label}`, r.text]) : m.map.map((x) => [T.archetypes[x.other].name, x.summary]);
    rows.forEach(([label, text]) => {
      const li = tpl.matchRoom.cloneNode(true);
      const head = li.firstElementChild;
      head.removeAttribute("data-t");
      head.textContent = label;
      js("match-room-text", li).textContent = text;
      list.append(li);
    });
    show(list, rows.length > 0);
    // 4장
    paras(js("report-deep-strength"), ch.deep.strength);
    paras(js("report-deep-shadow"), ch.deep.shadow);
    paras(js("report-deep-growth"), ch.deep.growth);
    js("report-evidence").innerHTML = evidenceFromCodes(c);
    paras(js("report-close"), ch.close.paragraphs);
    Disclaimer.mount(js("disclaimer-slot", reportScr));
    // 목차: 부마다 읽는 시간, 없는 방은 숨김. 전체 분량
    vol.flow = charsOf([ch.timeline, ch.match, ch.deep]);
    vol.close = charsOf(ch.close.paragraphs);
    const total = Object.values(vol).reduce((a, b) => a + b, 0);
    js("book-total").textContent = fill(T.book.total, { n: bigNum(total), min: minutes(total) });
    jsAll("book-toc-item").forEach((li) => {
      const id = li.dataset.part;
      show(li, vol[id] != null);
      li.classList.remove("is-read", "is-current");
      if (vol[id] == null) return;
      js("book-toc-time", li).textContent = ""; // (결정 53) 시작 쪽 번호는 쪽 나누기(paginate) 뒤에
      const res = js("book-toc-result", li);
      if (res) res.textContent = headOf(id, c).title;
    });
    js("report-meta").textContent = fill(R.meta, { rooms: present.length, match: c.partner ? R.metaMatch.partner : R.metaMatch.map, n: comma(total) });
    js("report-title").textContent = fill(R.title, { me, n: present.length });
    book = null; // 새 내용: 다음 enter.report에서 쪽을 다시 나눈다 (표지부터)
    js("book-reader").dataset.view = "cover";
  }
  function showReport(data) {
    renderReport(data);
    go("report", { instant: true }); // enter.report → 쪽 나누기
    if (jumpTo) {
      const room = jumpTo; // 방의 책 한 줄 → 그 방의 첫 쪽으로 바로 (연출 없이)
      jumpTo = null;
      jumpToPart(room);
    } else showCover();
  }
  leave.report = () => {
    stripQuery();
    finishTurn();
    const sheet = js("book-toc-sheet");
    if (sheet.open) sheet.close();
  };

  // ═════════ (결정 53) 책을 넘기는 리더: book-source → 쪽 나누기 → 넘기기 ═════════
  // 설계: design/strange-oracle.md "책을 넘기는 리더 (결정 53)". source 채우기(renderReport)는 그대로 두고,
  // 여기서 source를 장(chapter) → 블록(open 머리 / p 단락 / unit 통째)으로 훑어 실제 쪽(book-page)에 넣으며 잰다.
  //  - 장은 늘 새 쪽에서 시작. 단락은 넘치면 어절 경계에서 이분 탐색으로 쪼개 뒷부분을 다음 쪽 .is-cont로.
  //  - unit은 통째로 다음 쪽. 빈 쪽보다 크면 자식 단위로 한 번 더 나눈다.
  //  - 면지 영수증·목차·뒷면지(면책·공유·영수증 끝)는 복제하지 않고 옮겨 쓴다(훅·이벤트 그대로). 다시 나누기 전 source로 되돌린다.
  // bookmark: sessionStorage "strange-oracle-bookmark"에 쪽 번호(숫자)만. 문장·개인정보는 넣지 않는다
  const BOOKMARK_KEY = "strange-oracle-bookmark";
  const readBookmark = () => {
    try {
      const v = window.sessionStorage.getItem(BOOKMARK_KEY) || "";
      return /^\d{1,4}$/.test(v) ? Number(v) : 0;
    } catch (e) {
      return 0;
    }
  };
  const writeBookmark = (n) => {
    try {
      if (n) window.sessionStorage.setItem(BOOKMARK_KEY, String(n));
      else window.sessionStorage.removeItem(BOOKMARK_KEY);
    } catch (e) {
      /* 저장이 막힌 브라우저: 이어 읽기 없이 */
    }
  };
  const reader = js("book-reader");
  const bookStage = js("book-stage");
  const pagesBox = js("book-pages");
  const src = js("book-source");
  const [srcReceipt, srcToc, ...srcEnd] = ["receipt", "book-toc", "disclaimer-slot", "book-end-actions", "receipt-end", "page-end"].map((k) => js(k, src));
  const tocList = js("book-toc-list", srcToc);
  const tocItems = jsAll("book-toc-item", tocList);
  const TURN_SAFETY = 700; // animationend가 오지 않을 때의 안전장치 (--turn-dur 520ms)
  let book = null; // { pages: [{ el, part, chap, label }], chapStart, chapLen, partStart, partEnd, key }
  let cur = 0;
  let turning = false;
  let turnDone = null;
  const seen = new Set();
  bookStage.setAttribute("aria-roledescription", T.book.stageRole);
  const sizeKey = () => `${innerWidth}x${innerHeight}`;

  const mk = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const stripHooks = (n) => {
    [n, ...n.querySelectorAll("[data-js], [id]")].forEach((x) => {
      x.removeAttribute("data-js");
      x.removeAttribute("id");
    });
    return n;
  };
  const ORN = '<svg class="book-opening__orn" viewBox="0 0 160 20" aria-hidden="true"><use href="#i-fleuron"/></svg>';
  const opening = (mod, inner) => mk("div", `book-opening book-opening--${mod}`, ORN + inner);
  const chOpening = (title, numeral) =>
    opening("ch", (numeral ? `<p class="book-opening__numeral" aria-hidden="true">${esc(numeral)}</p>` : "") + `<h3 class="book-opening__title">${esc(title)}</h3>`);
  const partOpening = (num, title) => opening("part", `<p class="book-opening__kicker">${esc(num)}</p><h2 class="book-opening__title">${esc(title)}</h2>`);
  const visible = (n) => n && !n.classList.contains("is-hidden");
  const parasOf = (box) => (visible(box) ? [...box.children].filter((p) => p.textContent.trim()).map((p) => ({ kind: "p", node: stripHooks(p.cloneNode(true)) })) : []);
  const wrapUnit = (parent, child) => {
    const w = parent.cloneNode(false);
    w.append(child.cloneNode(true));
    return stripHooks(w);
  };
  const unitsOf = (list) => (visible(list) ? [...list.children].map((li) => ({ kind: "unit", node: wrapUnit(list, li) })) : []);

  // 원본 → 장 목록 (순서: 면지 · 목차 · 여는 글 · 제1부 표제지 · 방마다 Ⅰ~Ⅳ장·숨은 장 · 제2부 표제지 · 흐름 · 궁합 · 심층 · 닫는 글 · 뒷면지)
  function bookChapters() {
    const B = T.book;
    const R = T.report;
    const CN = T.result.chapterNames;
    const C = [];
    const openBlk = (node) => ({ kind: "open", node });
    C.push({ key: "front", part: "", label: B.front.title, run: [B.front.title], cls: "book-page--front", blocks: [{ kind: "unit", node: srcReceipt }] });
    C.push({ key: "toc", part: "", label: B.toc.title, run: [B.toc.title], cls: "book-page--toc", blocks: [{ kind: "toc" }] });
    const openName = bookPartName("open");
    C.push({ key: "open", part: "open", label: openName, run: [openName], start: true, blocks: [openBlk(chOpening(R.parts.open)), ...parasOf(js("report-open", src))] });
    const rooms = jsAll("book-room", src).filter(visible);
    C.push({ key: "part1", part: "part1", label: B.part1.num, run: [B.part1.num], cls: "book-page--half", start: true, blocks: [openBlk(partOpening(B.part1.num, B.part1.title))] });
    rooms.forEach((r) => {
      const id = r.dataset.room;
      const name = bookPartName(id);
      const head = opening(
        "room",
        `<p class="book-opening__kicker"><span aria-hidden="true">${ROMAN[chapterOf(id) - 1]}</span> ${esc(T.rooms[id].name)}</p>` +
          `<h2 class="book-opening__title">${esc(js("book-room-result", r).textContent)}</h2>` +
          `<p class="book-opening__key">${esc(js("book-room-key", r).textContent)}</p>` +
          `<p class="book-opening__ch"><span class="book-opening__num" aria-hidden="true">I</span>${esc(CN[0])}</p>`
      );
      ["book-ch1", "book-ch2", "book-ch3", "book-ch4", "book-hidden"].forEach((k, i) => {
        const title = i < 4 ? CN[i] : B.hiddenChapter;
        const top = i === 0 ? head : chOpening(title, i < 4 ? ROMAN[i] : "");
        C.push({ key: `${id}-${i}`, part: id, room: id, label: name, run: [name, title], start: true, blocks: [openBlk(top), ...parasOf(js(k, r))] });
      });
    });
    const flowName = bookPartName("flow");
    const p2 = (key, title, blocks) => C.push({ key, part: "flow", label: flowName, run: [B.part2.num, title], start: true, blocks: [openBlk(chOpening(title)), ...blocks] });
    C.push({ key: "part2", part: "flow", label: flowName, run: [B.part2.num], cls: "book-page--half", start: true, blocks: [openBlk(partOpening(B.part2.num, B.part2.title))] });
    p2("timeline", B.parts.timeline, unitsOf(js("report-timeline", src)));
    p2("match", B.parts.match, [{ kind: "unit", node: stripHooks(js("report-match-pair", src).cloneNode(true)) }, ...parasOf(js("report-match", src)), ...unitsOf(js("report-match-rooms", src))]);
    const deep = [];
    ["report-deep-strength", "report-deep-shadow", "report-deep-growth"].forEach((k) => {
      const box = js(k, src);
      const blk = box.parentElement; // .deep-block: 제목 + 첫 단락은 한 덩어리, 나머지 단락은 쪼갤 수 있게
      const [first, ...rest] = parasOf(box);
      const w = blk.cloneNode(false);
      const prose = box.cloneNode(false);
      if (first) prose.append(first.node);
      w.append(blk.firstElementChild.cloneNode(true), prose);
      deep.push({ kind: "unit", node: stripHooks(w) }, ...rest);
    });
    p2("deep", B.parts.deep, deep.concat(unitsOf(js("report-evidence", src))));
    const closeName = bookPartName("close");
    C.push({ key: "close", part: "close", label: closeName, run: [closeName], start: true, blocks: [openBlk(chOpening(R.parts.close)), ...parasOf(js("report-close", src))] });
    C.push({ key: "end", part: "close", label: closeName, run: [closeName], cls: "book-page--end", blocks: srcEnd.map((node) => ({ kind: "unit", node })) });
    return C;
  }

  const over = (bd) => bd.scrollHeight > bd.clientHeight + 1;
  function newPage(ch) {
    const p = mk("article", "book-page" + (ch.cls ? " " + ch.cls : ""));
    p.dataset.js = "book-page";
    p.tabIndex = -1;
    if (ch.part) p.dataset.part = ch.part;
    if (ch.room) p.dataset.room = ch.room;
    const run = mk("header", "book-page__run", ch.run.map((x) => `<span>${esc(x)}</span>`).join('<span class="book-page__run-dot" aria-hidden="true">·</span>'));
    run.dataset.js = "book-page-run";
    const bd = mk("div", "book-page__body");
    bd.dataset.js = "book-page-body";
    const fo = mk("footer", "book-page__folio", '<span data-js="book-page-num"></span> / <span data-js="book-page-total"></span>');
    fo.dataset.js = "book-page-folio";
    p.append(run, bd, fo);
    p.style.contain = "layout size style"; // 재는 동안 쪽마다 배치를 가둬 빠르게 (그림자는 자르지 않도록 paint 제외). 다 재면 뗀다
    pagesBox.append(p);
    return p;
  }
  // 넘친 단락: 들어가는 만큼(어절 단위)만 남기고 나머지를 돌려준다. [나머지, 이어지는 단락인지]
  function splitPara(node, bd) {
    const text = node.textContent;
    const words = text.match(/\S+\s*/g) || [text];
    let lo = 0;
    let hi = words.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      node.textContent = words.slice(0, mid).join("");
      if (over(bd)) hi = mid - 1;
      else lo = mid;
    }
    if (lo === 0) {
      node.textContent = text;
      if (bd.children.length > 1) {
        node.remove();
        return [node, false]; // 한 어절도 안 들어감 → 단락째 다음 쪽
      }
      return [null, false]; // 빈 쪽에도 한 어절이 안 들어가는 극단: 그대로 둔다
    }
    node.textContent = words.slice(0, lo).join("").trimEnd();
    const rest = node.cloneNode(false);
    rest.textContent = words.slice(lo).join("");
    return [rest, true];
  }
  // 빈 쪽보다 큰 unit → 자식마다 같은 껍데기로 감싼 작은 unit들 (자식이 하나면 한 겹 더 들어간다)
  function splitUnit(n) {
    const kids = [...n.children];
    if (!kids.length) return null;
    if (kids.length === 1) {
      const inner = splitUnit(kids[0]);
      return inner && inner.map((c) => {
        const w = n.cloneNode(false);
        w.append(c);
        return w;
      });
    }
    const out = [];
    const wrap = (...cs) => {
      const w = n.cloneNode(false);
      cs.forEach((c) => w.append(c));
      out.push(w);
    };
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i];
      const nx = kids[i + 1];
      // (R53-1) 시기별 흐름 나이 제목은 다음 자식의 첫 항목(dt+dd)과 묶어 쪽 끝에 홀로 남지 않게
      if (c.matches(KEEP_WITH_NEXT) && nx && nx.children.length > 1) {
        const [first, ...rest] = [...nx.children];
        const head = nx.cloneNode(false);
        head.append(first.cloneNode(true));
        const tail = nx.cloneNode(false);
        rest.forEach((k) => tail.append(k.cloneNode(true)));
        wrap(c.cloneNode(true), head);
        wrap(tail);
        i++;
        continue;
      }
      wrap(c.cloneNode(true));
    }
    return out;
  }
  const KEEP_WITH_NEXT = ".timeline__age";
  // (R53-2) 장 끝 쪽이 앞 쪽에서 이어진 단락 한 줄뿐이면, 앞 쪽 단락 끝에서 한 줄 분량 어절을 함께 넘긴다 (앞 쪽은 2줄 이상 남김)
  function fixWidow(pages, from) {
    if (pages.length - from < 2) return;
    const bd = js("book-page-body", pages[pages.length - 1].el);
    const rest = bd.firstElementChild;
    if (bd.children.length !== 1 || !rest.matches("p.is-cont") || rest.children.length) return;
    const prev = js("book-page-body", pages[pages.length - 2].el).lastElementChild;
    if (!prev || prev.tagName !== "P" || prev.children.length) return;
    const lh = parseFloat(getComputedStyle(prev).lineHeight);
    const lines = (e) => Math.round(e.getBoundingClientRect().height / lh);
    if (!lh || lines(rest) > 1) return;
    const before = lines(prev);
    if (before < 3) {
      // 앞 쪽 조각도 1~2줄뿐: 한 줄을 넘기면 앞 쪽에 외톨이 줄이 남으므로 단락을 통째로 다음 쪽으로
      if (prev.parentElement.children.length < 2) return;
      rest.textContent = prev.textContent.trimEnd() + " " + rest.textContent;
      rest.className = prev.className;
      prev.remove();
      return;
    }
    const words = prev.textContent.match(/\S+\s*/g) || [];
    let k = words.length;
    while (k > 1 && lines(prev) > before - 1) {
      k--;
      prev.textContent = words.slice(0, k).join("").trimEnd();
    }
    rest.textContent = words.slice(k).join("").trimEnd() + " " + rest.textContent;
  }

  function paginate() {
    const t0 = performance.now();
    tocItems.forEach((li) => tocList.append(li)); // 옮겨 쓴 노드를 원본 자리로
    src.prepend(srcToc);
    src.prepend(srcReceipt);
    srcEnd.forEach((n) => src.append(n));
    pagesBox.textContent = "";
    tocItems.forEach((li) => (js("book-toc-time", li).textContent = fill(T.book.tocPage, { n: "000" }))); // 폭 자리 잡기
    const view = reader.dataset.view;
    reader.dataset.view = "pages"; // 재려면 무대가 보여야 한다 (같은 작업 안에서 되돌리므로 화면에 그려지지 않음)
    const pages = [];
    const chapStart = {};
    const chapLen = {};
    bookChapters().forEach((ch) => {
      chapStart[ch.key] = pages.length;
      let bd = null;
      const start = () => {
        const page = newPage(ch);
        if (ch.start && pages.length === chapStart[ch.key]) page.classList.add("is-chapter-start");
        bd = js("book-page-body", page);
        pages.push({ el: page, part: ch.part, chap: ch.key, label: ch.label });
      };
      const place = (node, kind) => {
        bd.append(node);
        if (!over(bd)) return;
        if (kind === "p" && !node.children.length) {
          const [rest, cont] = splitPara(node, bd);
          if (!rest) return;
          start();
          if (cont) {
            rest.classList.add("is-cont");
            rest.classList.remove("has-dropcap");
          }
          place(rest, "p");
          return;
        }
        if (bd.children.length > 1) {
          node.remove();
          start();
          place(node, kind);
          return;
        }
        const parts = kind === "unit" ? splitUnit(node) : null;
        if (parts) {
          node.remove();
          parts.forEach((x) => place(x, "unit"));
        }
      };
      start();
      let afterOpen = false;
      ch.blocks.forEach((b) => {
        if (b.kind === "toc") return placeToc(start, () => bd);
        if (b.kind === "p" && afterOpen) b.node.classList.add("has-dropcap");
        afterOpen = b.kind === "open";
        place(b.node, b.kind);
      });
      fixWidow(pages, chapStart[ch.key]);
      chapLen[ch.key] = pages.length - chapStart[ch.key];
    });
    const total = pages.length;
    pages.forEach((pg) => pg.el.style.removeProperty("contain"));
    const partStart = {};
    const partEnd = {};
    pages.forEach((pg, i) => {
      const n = i + 1;
      pg.el.dataset.page = n;
      pg.el.setAttribute("aria-label", fill(T.book.pageAria, { n, total }));
      js("book-page-num", pg.el).textContent = n;
      js("book-page-total", pg.el).textContent = total;
      if (pg.part && !(pg.part in partStart)) partStart[pg.part] = i;
      if (pg.part) partEnd[pg.part] = i;
    });
    tocItems.forEach((li) => (js("book-toc-time", li).textContent = li.dataset.part in partStart ? fill(T.book.tocPage, { n: partStart[li.dataset.part] + 1 }) : ""));
    reader.dataset.view = view;
    seen.clear();
    book = { pages, chapStart, chapLen, partStart, partEnd, key: sizeKey() };
    reader.dataset.pagedMs = Math.round(performance.now() - t0); // 점검용 (e2e: 쪽 나누기 시간)
  }
  // 목차 쪽: 넘치면 넘친 항목을 다음 쪽의 새 목록으로 옮긴다 (640 높이에서 2쪽)
  function placeToc(start, getBd) {
    getBd().append(srcToc);
    let list = tocList;
    while (over(getBd())) {
      const vis = [...list.children].filter(visible);
      if (vis.length < 2) break;
      const moved = [];
      while (over(getBd()) && vis.length > 1) {
        const li = vis.pop();
        li.remove();
        moved.unshift(li);
      }
      start();
      const nav = srcToc.cloneNode(false);
      nav.removeAttribute("id");
      nav.removeAttribute("data-js");
      nav.removeAttribute("aria-labelledby");
      list = tocList.cloneNode(false);
      list.removeAttribute("data-js");
      list.append(...moved);
      nav.append(list);
      getBd().append(nav);
    }
  }

  function relayout() {
    if (!reportView || currentName !== "report") {
      if (book) book.key = ""; // 책 화면으로 돌아올 때 다시 나눈다
      return;
    }
    finishTurn();
    const pg = book && book.pages[cur];
    const anchor = pg ? { chap: pg.chap, off: cur - book.chapStart[pg.chap] } : null;
    paginate();
    let i = 0;
    if (anchor && anchor.chap in book.chapStart) i = book.chapStart[anchor.chap] + Math.min(anchor.off, book.chapLen[anchor.chap] - 1);
    setPage(i, { quiet: true });
    if (reader.dataset.view === "cover") updateResume();
  }
  enter.report = () => {
    if (reportView && (!book || book.key !== sizeKey())) relayout();
  };
  // 다시 나누기: 크기(가로·세로) 변화, 글꼴 도착(본문 글꼴은 쓰일 때 내려받으므로 첫 나누기 뒤에 올 수 있다). 150ms 디바운스
  let resizeTimer = 0;
  const scheduleRelayout = (force) => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => book && (force || book.key !== sizeKey()) && relayout(), 150);
  };
  addEventListener("resize", () => scheduleRelayout(false));
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(() => scheduleRelayout(true));
    if (document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", () => scheduleRelayout(true));
  }

  function setPage(i, { focus = false, quiet = false } = {}) {
    if (!book) return;
    const P = book.pages;
    const total = P.length;
    i = Math.max(0, Math.min(total - 1, i));
    P.forEach((x, k) => x.el.classList.toggle("is-current", k === i));
    cur = i;
    const pg = P[i];
    const reading = reader.dataset.view === "pages";
    bookStage.classList.toggle("is-first", i === 0);
    bookStage.classList.toggle("is-last", i === total - 1);
    js("book-prev").disabled = i === 0;
    js("book-next").disabled = i === total - 1;
    js("book-track-fill").style.setProperty("--p", ((i + 1) / total).toFixed(4));
    js("read-label").textContent = reading ? pg.label : "";
    if (reading) {
      seen.add(i);
      writeBookmark(i + 1);
      if (!quiet) js("book-live").textContent = fill(T.book.live, { n: i + 1, total, chapter: pg.label });
      if (focus) pg.el.focus({ preventScroll: true });
    }
    tocItems.forEach((li) => {
      const p = li.dataset.part;
      li.classList.toggle("is-current", reading && p === pg.part);
      li.classList.toggle("is-read", p in book.partEnd && seen.has(book.partEnd[p]));
    });
  }
  function openBook(i) {
    if (!book) return;
    finishTurn();
    reader.dataset.view = "pages";
    setPage(i, { focus: true });
  }
  function showCover() {
    finishTurn();
    reader.dataset.view = "cover";
    js("read-label").textContent = "";
    updateResume();
  }
  function updateResume() {
    const mark = readBookmark();
    const resume = js("book-resume");
    const ok = Boolean(book) && mark > 1;
    show(resume, ok);
    if (!ok) return;
    const i = Math.min(mark, book.pages.length) - 1;
    js("book-resume-name", resume).textContent = book.pages[i].label;
    js("book-resume-page", resume).textContent = i + 1;
  }
  js("book-open-btn").addEventListener("click", () => openBook(0));
  js("book-resume").addEventListener("click", () => book && openBook(Math.min(readBookmark(), book.pages.length) - 1));
  function jumpToPart(part) {
    if (!book || !(part in book.partStart)) return;
    openBook(book.partStart[part]); // 멀리 뛰는 이동은 연출 없이 즉시
  }

  // 한 쪽 넘기기: 넘기는 동안 들어온 입력은 버린다. 움직임 줄이기는 turn class 없이 is-current만
  function finishTurn() {
    if (turnDone) turnDone();
  }
  function turn(dir) {
    if (!book || turning || reader.dataset.view !== "pages") return;
    const to = cur + dir;
    if (to < 0 || to >= book.pages.length) return;
    if (reduceMotion) return setPage(to);
    const a = book.pages[cur].el;
    const b = book.pages[to].el;
    const mover = dir > 0 ? a : b;
    const under = dir > 0 ? b : a;
    const name = dir > 0 ? "page-turn-away" : "page-turn-back";
    turning = true;
    bookStage.classList.add("is-turning");
    bookStage.classList.toggle("is-turning-prev", dir < 0);
    a.classList.remove("is-current");
    under.classList.add("is-under");
    mover.classList.add(dir > 0 ? "is-turn-next" : "is-turn-prev");
    let timer = 0;
    const onEnd = (e) => e.target === mover && e.animationName === name && turnDone && turnDone();
    turnDone = () => {
      turnDone = null;
      clearTimeout(timer);
      mover.removeEventListener("animationend", onEnd);
      [a, b].forEach((x) => x.classList.remove("is-under", "is-turn-next", "is-turn-prev"));
      bookStage.classList.remove("is-turning", "is-turning-prev");
      turning = false;
      setPage(to);
    };
    mover.addEventListener("animationend", onEnd);
    timer = setTimeout(() => turnDone && turnDone(), TURN_SAFETY);
  }
  js("book-prev").addEventListener("click", () => turn(-1));
  js("book-next").addEventListener("click", () => turn(1));
  // 가장자리 탭 · 좌우 스와이프(가로 40px 이상이고 가로 > 세로). 세로 움직임은 브라우저에 맡긴다(touch-action: pan-y)
  let swipedAt = 0;
  js("book-edge-prev").addEventListener("click", () => Date.now() - swipedAt > 400 && turn(-1));
  js("book-edge-next").addEventListener("click", () => Date.now() - swipedAt > 400 && turn(1));
  let down = null;
  bookStage.addEventListener("pointerdown", (e) => {
    if (e.isPrimary) down = { x: e.clientX, y: e.clientY };
  });
  bookStage.addEventListener("pointercancel", () => (down = null));
  bookStage.addEventListener("pointerup", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    down = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    swipedAt = Date.now();
    turn(dx < 0 ? 1 : -1);
  });
  document.addEventListener("keydown", (e) => {
    if (currentName !== "report" || reader.dataset.view !== "pages" || !book || e.altKey || e.ctrlKey || e.metaKey) return;
    if ($("dialog[open]")) return;
    const t = e.target instanceof Element ? e.target : body;
    if (t.closest("input, textarea, select, [contenteditable]")) return;
    const k = e.key;
    let act = null;
    if (k === "ArrowLeft" || k === "PageUp") act = () => turn(-1);
    else if (k === "ArrowRight" || k === "PageDown") act = () => turn(1);
    else if (k === " " && !t.closest("button, a")) act = () => turn(e.shiftKey ? -1 : 1);
    else if (k === "Home") act = () => !turning && setPage(0, { focus: true });
    else if (k === "End") act = () => !turning && setPage(book.pages.length - 1, { focus: true });
    if (!act) return;
    e.preventDefault();
    act();
  });

  // 목차(목차 쪽·상단 막대 시트): 링크 기본 이동을 막고 그 장의 시작 쪽으로 즉시
  const tocSheet = js("book-toc-sheet");
  const tocClick = (e) => {
    const a = e.target.closest("a");
    const li = a && a.closest("li[data-part]");
    if (!li) return;
    e.preventDefault();
    if (tocSheet.open) tocSheet.close();
    jumpToPart(li.dataset.part);
  };
  pagesBox.addEventListener("click", tocClick);
  tocSheet.addEventListener("click", tocClick);
  js("book-toc-open").addEventListener("click", () => {
    const list = js("book-toc-sheet-list");
    list.textContent = "";
    const ol = tocList.cloneNode(false);
    tocItems.forEach((li) => ol.append(li.cloneNode(true)));
    list.append(stripHooks(ol));
    if (tocSheet.showModal) tocSheet.showModal();
    else tocSheet.setAttribute("open", "");
  });
  js("book-toc-close").addEventListener("click", () => tocSheet.close());

  // 영수증 코드 복사·지우기
  function copyReceipt() {
    if (!reportView) return;
    const text = PayCode.pretty(reportView.receipt);
    const done = () => toast(T.receipt.copied);
    const fail = () => toast(T.receipt.copyFail);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  }
  js("receipt-copy").addEventListener("click", copyReceipt);
  js("receipt-copy-end").addEventListener("click", copyReceipt);
  js("receipt-forget").addEventListener("click", () => {
    writeReceipt("");
    writeBookmark("");
    applyPayUi();
    toast(T.receipt.forgot);
  });

  // ── 소장 카드 (share-card.js frame "keepsake"). 이름·생일·영수증 코드·유료 본문 긴 인용은 넣지 않는다
  const ROOM_GLYPH = {
    rune: () => ({ path: symbolPath("rune-raidho"), vw: 40, vh: 60 }),
    star: () => ({ path: "M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z", vw: 40, vh: 40, fill: true }),
    ogham: () => ({ path: symbolPath("ogham-beith"), vw: 40, vh: 80 }),
    decan: () => ({ path: symbolPath("icon-decan"), vw: 40, vh: 40 }),
    tzolkin: () => ({ path: symbolPath("icon-tzolkin"), vw: 40, vh: 40 }),
    sibyl: () => ({ path: symbolPath("icon-sibyl"), vw: 40, vh: 40 }),
  };
  function buildKeepsakeCard() {
    const { rep } = reportView;
    const c = rep.codes;
    const K = T.keepsake;
    const me = T.archetypes[c.arch].name;
    return {
      file: K.file, text: strip(K.shareText),
      opts: {
        theme: Object.assign({}, CARD_THEME.story, { wax: "#7c2a22", waxRim: "#9a3a2c" }), frame: "keepsake", seed: 211,
        topBadge: strip(K.badge),
        title: me, titleSize: 96,
        pair: c.partner ? { left: me, right: T.archetypes[c.partner].name, mark: "×" } : { text: strip(K.map) },
        keyword: rep.card.keyword,
        roomGrid: { cells: CHAPTER_ORDER.map((room) => Object.assign(ROOM_GLYPH[room](), { color: CARD_THEME[room].accent, done: c[room] != null })) },
        closeLine: { text: rep.card.closeLine, maxLines: 2 },
      },
    };
  }
  js("report-share").addEventListener("click", (e) => reportView && shareCard(e.currentTarget, buildKeepsakeCard));

  // ── 시작: 결제 설정 → 진입점, successUrl·failUrl로 돌아온 경우 처리
  async function paidBoot() {
    clearPaidSamples();
    const qs = new URLSearchParams(location.search);
    const ret = qs.get("pay");
    if (ret === "success") {
      // 정해진 세 값만 보낸다. 새로고침·뒤로 가기로 다시 와도 서버가 같은 리포트를 준다(멱등)
      startUnseal({ paymentKey: String(qs.get("paymentKey") || ""), orderId: String(qs.get("orderId") || ""), amount: Number(qs.get("amount")) });
    }
    await loadPayConfig();
    applyPayUi();
    if (ret === "fail") {
      stripQuery();
      if (Pay.enabled) {
        payFailed = true;
        go("deeper", { instant: true });
      }
    }
  }

  // ═════════ 7단계: 여섯 문이 모이는 결말 (spec 7-6) ═════════
  // 움직임: .is-running 동안 CSS 3D 연출(--finale-ms). 움직임 줄이기: base.css가 animation을 끄므로 .is-running = 정적 그리드,
  // 약 1.2초 뒤 class를 떼며 element.animate()로 opacity만 교차 페이드 → 카드. 아무 데나 누르면 건너뛰기
  const finaleScr = screens.finale;
  const FINALE_MS = 2600;
  const FADE_MS = 600;
  function endFinale() {
    if (!finaleScr.classList.contains("is-running")) return;
    if (!reduceMotion || !finaleScr.animate) return finaleScr.classList.remove("is-running");
    const shards = $$(".converge__shard", finaleScr);
    const grid = shards.map((el) => getComputedStyle(el).transform);
    finaleScr.classList.remove("is-running");
    const o = { duration: FADE_MS, easing: "ease-out" };
    shards.forEach((el, i) => el.animate([{ opacity: 1, transform: grid[i] }, { opacity: 0, transform: grid[i] }], o));
    $$(".converge__card, .finale__lead, .finale .btn", finaleScr).forEach((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], o));
  }
  enter.finale = () => {
    finaleScr.classList.remove("is-running");
    void finaleScr.offsetWidth;
    finaleScr.classList.add("is-running");
    later(endFinale, reduceMotion ? 1200 : FINALE_MS);
  };
  leave.finale = () => finaleScr.classList.remove("is-running");
  finaleScr.addEventListener("click", (e) => {
    if (!e.target.closest("[data-go]")) endFinale();
  });

  // ═════════ 시작 ═════════
  applyText();
  // (8단계) 새 세션(이 탭에 마친 방이 없음)은 주소와 상관없이 입구부터 (spec 8-2, 7-2 딥링크 무시).
  // 같은 탭(새로고침·뒤로 가기): 주소 해시의 화면 이름으로 — 방 이름(#rune)이나 방 화면(#rune-result)은 문지기 규칙대로, 의식·결제 화면은 입구로
  const hash = location.hash.replace("#", "");
  const hashRoom = roomOfScreen(hash) || (CHAPTER_ORDER.includes(hash) ? hash : null);
  let first = "hub";
  if (filledRooms().length && hash) {
    if (hash === "story") first = "story";
    else if (CHAPTER_ORDER.includes(hash)) first = roomTarget(hash);
    else if (CHAPTER_ORDER.includes(hashRoom) && !TRANSIENT_TO(hash)) first = hash === `${hashRoom}-result` && isDone(hashRoom) ? roomTarget(hashRoom) : hash;
  }
  renderHub();
  setTopbar("hub");
  go(first, { instant: true, replace: true });
  paidBoot();

  // 테스트·점검용으로 바깥에서 읽을 수 있게 둔다 (입력값은 내보내지 않음)
  // render*는 저장 없이(fresh=false) 결과 틀만 다시 그린다
  window.StrangeOracle = {
    go, currentArchetype, filledRooms, nextRoom, isUnlocked,
    renderRune: (v) => renderRune(v, false), renderStar: (v) => renderStar(v, false),
    renderOgham: (v) => renderOgham(v, false), renderDecan: (v) => renderDecan(v, false),
    renderTzolkin: (v) => renderTzolkin(v, false), renderSibyl: (v) => renderSibyl(v, false, ""),
  };
})();
