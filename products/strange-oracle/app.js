// 낯선 점술관 — 화면 동작.
// 문구는 모두 data.js(TEXT)·data-runes.js(RUNES)·data-stars.js(NAKSHATRAS·RASHIS·PLANETS)
// ·data-ogham.js(OGHAM)·data-decans.js(DECANS)·data-tzolkin.js(TZOLKIN_SIGNS·TZOLKIN_NUMBERS)·data-oracles.js(ORACLES·ORACLE_TOPICS)에서 가져온다.
// ·data-saju.js(SAJU, 만신의 방).
// 계산: astro.js(별), calc.js(오검·데칸·촐킨·시빌라 뽑기, 한글 로마자), saju.js(만신의 방, lunar-javascript).
// (14단계 14-6) 방 문구 파일과 계산 라이브러리는 첫 화면에서 받지 않는다. 그 방 화면으로 갈 때(go) 받고,
//   입구가 그려진 뒤 한가할 때 다음 방 파일을 미리 받는다. 이 탭에 마친 방이 있으면 그 방 파일을 모두 받은 뒤 화면을 그린다.
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
  // ───────── (14-6) 방 파일 지연 불러오기 ─────────
  // 같은 출처 파일과 jsdelivr(버전 고정 + SRI)만. 같은 파일은 한 번만 받고, 실패하면 다음 시도에서 다시 받는다.
  const ASTRONOMY = { src: "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js", integrity: "sha384-LTVHvxfbG3XHla4Lu0C0s9U18B2sBOuzJIeOoVHm2t05SOOORvMbBMEVjXrGau9g" };
  const ROOM_FILES = {
    saju: ["data-saju.js", "saju.js"],
    ogham: ["data-ogham.js"],
    star: ["data-stars.js", ASTRONOMY, "astro.js"],
    decan: ["data-decans.js", ASTRONOMY, "astro.js"],
    tzolkin: ["data-tzolkin.js"],
    rune: ["data-runes.js"],
    sibyl: ["data-oracles.js"],
  };
  const scriptLoads = {};
  function loadScript(f) {
    const src = typeof f === "string" ? f : f.src;
    if (!scriptLoads[src])
      scriptLoads[src] = new Promise((res, rej) => {
        const el = document.createElement("script");
        el.src = src;
        el.async = false; // 받은 순서대로 실행 (astronomy-engine → astro.js)
        if (f.integrity) {
          el.integrity = f.integrity;
          el.crossOrigin = "anonymous";
        }
        el.onload = res;
        el.onerror = () => {
          delete scriptLoads[src];
          el.remove();
          rej(new Error("load " + src));
        };
        document.head.append(el);
      });
    return scriptLoads[src];
  }
  const roomLoads = {};
  let onRoomLoaded = null; // main()의 bindData (방 문구 전역을 다시 묶는다)
  const roomReady = {};
  // 방 파일을 받는다. 만신의 방은 lunar-javascript도 받아 본다(실패해도 방 파일은 열림 — 계산할 때 다시 시도)
  function ensureRoom(room) {
    if (!ROOM_FILES[room]) return Promise.resolve();
    if (!roomLoads[room])
      roomLoads[room] = Promise.all(ROOM_FILES[room].map(loadScript)).then(() => {
        roomReady[room] = true;
        if (onRoomLoaded) onRoomLoaded(room);
      }, (e) => {
        delete roomLoads[room];
        throw e;
      });
    return roomLoads[room];
  }
  const ensureRooms = (rooms) => Promise.all(rooms.filter(Boolean).map(ensureRoom));
  const idle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 2000));
  // 이 탭에 저장된 마친 방(또는 지름길로 들어온 방) → 그 파일을 모두 받은 뒤 화면을 그린다
  let savedRooms = [];
  try {
    const raw = JSON.parse(window.sessionStorage.getItem("strange-oracle") || "null");
    savedRooms = raw && raw.visits && typeof raw.visits === "object" ? Object.keys(raw.visits).filter((r) => ROOM_FILES[r]) : [];
  } catch (e) {
    savedRooms = [];
  }
  ensureRooms(savedRooms).then(main, main);

  function main() {
  const T = window.TEXT;
  // 방 문구(방 파일을 받기 전에는 undefined. 받은 뒤 bindData가 다시 묶는다)
  let RUNES, NAKS, RASHIS, PLANETS, OGHAM, DECANS, TZ_SIGNS, TZ_NUMBERS, ORACLES, ORACLE_TOPICS, SAJU, Saju, Astro;
  let RUNE_BY_CODE = {};
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
  // paycode.js 한 곳에서 읽는다 (spec 14-1): Ⅰ만신 Ⅱ오검 Ⅲ별 Ⅳ데칸 Ⅴ촐킨 Ⅵ룬 Ⅶ시빌라
  const CHAPTER_ORDER = window.PayCode.CHAPTER_ORDER;
  const OPEN_ROOMS = CHAPTER_ORDER; // 일곱 방 모두 출시 (세션 진행 잠금은 아래 isUnlocked — 다른 축)
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  // (14단계 14-4) 결제 모드: data.js pay.mode. off(본 페이지, 결정 94) = 책·결제 요소를 DOM에서 모두 걷어 낸다. test(시험 페이지)·live = 책 + 결제 전 화면
  const PAY = T.pay || {};
  const PAY_MODE = PAY.mode === "test" || PAY.mode === "live" ? PAY.mode : "off";
  const BOOK_ON = PAY_MODE !== "off";
  const PASS_KEY = "strange-oracle-pass"; // 확인된 열람 코드(탭을 닫으면 사라짐). 이어가기 코드에는 넣지 않는다
  // 1~39 로마 숫자 (신탁 번호 I~XXXII)
  const roman = (n) => "X".repeat(Math.floor(n / 10)) + ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][n % 10];
  const chapterOf = (room) => CHAPTER_ORDER.indexOf(room) + 1;
  // (14-1) 강제 순서: 열 수 있는 방 = 마친 방 + "순서상 첫 번째로 마치지 않은 방" 하나.
  //   옛 상태(오검~룬 마침, 만신 미완)도 막다른 곳 없이 Ⅰ 만신 → Ⅶ 시빌라로 이어진다.
  const isDone = (room) => Boolean(state.visits[room]);
  const nextRoom = () => CHAPTER_ORDER.find((r) => !isDone(r)) || null;
  const isUnlocked = (room) => isDone(room) || room === nextRoom();
  const MOON_SVG = '<svg viewBox="0 0 40 40"><path d="M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z" fill="currentColor"/></svg>';
  const ROOM_ICON = {
    saju: '<svg viewBox="0 0 40 40"><use href="#icon-saju" /></svg>',
    rune: '<svg viewBox="0 0 40 60"><use href="#rune-raidho" /></svg>',
    star: MOON_SVG,
    ogham: '<svg viewBox="0 0 40 80"><use href="#ogham-beith" /></svg>',
    decan: '<svg viewBox="0 0 40 40"><use href="#icon-decan" /></svg>',
    tzolkin: '<svg viewBox="0 0 40 40"><use href="#icon-tzolkin" /></svg>',
    sibyl: '<svg viewBox="0 0 40 40"><use href="#icon-sibyl" /></svg>',
  };
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
    saju: { bgTop: "#080717", bgBottom: "#2a1a0e", accent: "#f2a585", text: "#f5f2e9", muted: "#c8bca8" }, // (14단계) --room-h 25 · 단청 주홍 (designer 확인)
  };
  const SIBYL_TOPIC_KEYS = Object.keys(T.sibyl.topics);

  // ───────── 저장 (sessionStorage, 이 탭 한정) ─────────
  const STORE_KEY = "strange-oracle";
  const UNLOCK_KEY = "strange-oracle-unlock"; // 12·13단계 광고 잠금 표시 칸(은퇴). 옛 탭에 남아 있으면 "내 정보 지우기"에서 지운다
  // (8단계) 인트로가 없어져 started 칸은 쓰지 않는다. 새 세션 = 마친 방이 없음 → 입구부터
  const emptyState = () => ({ profile: {}, visits: {} });
  function validVisit(room, v) {
    if (!v || !ARCHETYPES.includes(v.archetype)) return false;
    // (14단계) 만신의 방: 결과 코드(1~5000, Saju.encodeCode)만. 원국 8글자·성별·대운은 저장하지 않는다
    if (room === "saju") return Number.isInteger(v.code) && v.code >= 1 && v.code <= 5000 && Boolean(SAJU && SAJU.stems[Saju.decodeCode(v.code).S1]);
    if (room === "rune") return Array.isArray(v.picks) && v.picks.length === 3 && v.picks.every((c) => RUNE_BY_CODE[c]) && T.rune.topics[v.topic];
    // (10단계) 이어가기 코드로 복원한 별의 방: 나크샤트라 번호만 있고 서양 별자리·해/달 라시는 없다(restored)
    if (room === "star") return Number.isInteger(v.nak) && NAKS[v.nak] && (v.restored === true || (RASHIS[v.west] && RASHIS[v.sunRashi] && RASHIS[v.moonRashi]));
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
      if (s.restored === true) out.restored = true; // 이어가기 코드로 불러온 세션 표시(참·거짓뿐, 코드 글자는 저장하지 않는다)
      return out;
    } catch (e) {
      return emptyState();
    }
  }
  // 방 문구 전역을 다시 묶는다 (ensureRoom이 파일을 받은 뒤 부른다)
  function bindData(room) {
    RUNES = window.RUNES;
    NAKS = window.NAKSHATRAS;
    RASHIS = window.RASHIS;
    PLANETS = window.PLANETS;
    OGHAM = window.OGHAM;
    DECANS = window.DECANS;
    TZ_SIGNS = window.TZOLKIN_SIGNS;
    TZ_NUMBERS = window.TZOLKIN_NUMBERS;
    ORACLES = window.ORACLES;
    ORACLE_TOPICS = window.ORACLE_TOPICS;
    Astro = window.Astro;
    Saju = window.Saju;
    RUNE_BY_CODE = RUNES ? Object.fromEntries(RUNES.map((r, i) => [r.code, Object.assign({ index: i }, r)])) : {};
    if (window.SAJU && SAJU !== window.SAJU) {
      SAJU = window.SAJU;
      mergeSajuText();
    }
    // 받은 방의 화면에만 문구를 다시 채운다 (이미 그린 다른 방 결과의 안내자 대사·{who} 치환을 덮지 않도록)
    if (room && screens) $$(`section[data-room="${room}"]`).forEach((sec) => applyText(sec));
  }
  let screens = null; // 아래 "화면 전환"에서 채운다 (bindData가 먼저 불릴 수 있어 let)
  bindData();
  onRoomLoaded = bindData;
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
      window.sessionStorage.removeItem(UNLOCK_KEY); // (12단계) 광고로 연 방 표시도 지운다 (13단계: 연 장 표시 book-* 포함)
      window.sessionStorage.removeItem("strange-oracle-bookmark"); // (13단계) 이어 읽기 장 id·쪽 번호
      window.sessionStorage.removeItem("strange-oracle-receipt"); // 12단계까지의 영수증 코드 칸
      window.sessionStorage.removeItem(PASS_KEY); // (14-4) 열람 코드도 "내 정보 지우기"로 함께 지운다
    } catch (e) {
      /* 무시 */
    }
    state = emptyState();
    Object.keys(editing).forEach((k) => (editing[k] = false));
    $$("input[data-js], textarea[data-js]").forEach((el) => (el.type === "checkbox" || el.type === "radio" ? (el.checked = false) : (el.value = "")));
    if (typeof readSet !== "undefined") readSet.clear();
    resetSibyl();
    [js("star-hour"), js("star-minute"), js("saju-hour"), js("saju-minute")].forEach((el) => (el.disabled = false));
    closeResume(); // 펼쳐 둔 이어가기 코드 표시·입력 칸을 닫고 비운다 (입력 칸 값은 위에서 이미 비움)
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

  // (11단계 H3) 흔들리는 원형 한 줄: 마친 방 1~5개일 때만. N = 6 − 지금 마친 방 수. 결제 상태와 무관
  function renderSway(el) {
    if (!el) return;
    const n = filledRooms().length;
    const a = currentArchetype();
    const on = Boolean(a) && n > 0 && n < CHAPTER_ORDER.length;
    el.textContent = on ? fill(T.result.archetypeSway, { arch: T.archetypes[a].name, n: CHAPTER_ORDER.length - n }) : "";
    show(el, on);
  }

  // ───────── 정적 문구 채우기 ─────────
  function applyText(scope = document) {
    $$("[data-t]", scope).forEach((el) => (el.textContent = get(el.dataset.t) ?? ""));
    $$("[data-h]", scope).forEach((el) => (el.innerHTML = get(el.dataset.h) ?? ""));
    $$("[data-ph]", scope).forEach((el) => (el.placeholder = get(el.dataset.ph) ?? ""));
    $$("[data-aria]", scope).forEach((el) => el.setAttribute("aria-label", get(el.dataset.aria) ?? ""));
    $$("[data-list]", scope).forEach((el) => (el.innerHTML = (get(el.dataset.list) || []).map((p) => `<p>${p}</p>`).join("")));
    if (scope !== document) {
      if (RASHIS) jsAll("rashi-label", scope).forEach((el, i) => (el.textContent = RASHIS[i].ko.replace("자리", "")));
      if (TZ_SIGNS) jsAll("tzolkin-sign-label", scope).forEach((el, i) => (el.textContent = TZ_SIGNS[i].latin.toUpperCase()));
      return;
    }
    // 장 번호는 CHAPTER_ORDER에서 (마크업 data-n은 예비값)
    jsAll("room-chapter-num").forEach((el) => {
      const room = el.closest("[data-room]")?.dataset.room;
      el.textContent = fill(T.storyChapter, { n: CHAPTER_ORDER.includes(room) ? chapterOf(room) : el.dataset.n });
    });
    if (RASHIS) jsAll("rashi-label").forEach((el, i) => (el.textContent = RASHIS[i].ko.replace("자리", "")));
    // 촐킨 톱니 카르투슈 20개: 유카텍 이름 대문자 (SVG text)
    if (TZ_SIGNS) jsAll("tzolkin-sign-label").forEach((el, i) => (el.textContent = TZ_SIGNS[i].latin.toUpperCase()));
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
  screens = {};
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
    show(js("book-toc-open"), reading && js("book-reader").dataset.view !== "toc"); // (13단계) 목차 버튼은 장 표지·장 안에서만
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
  const TRANSIENT_TO = (name) => /-(ritual|choose)$/.test(name);
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
    if (name === "unseal" || (name === "deeper" && !BOOK_ON)) name = "report"; // 은퇴한 영수증 화면 → 책 목차 (off면 report도 없어 아래에서 멈춤)
    if (!screens[name]) return; // 책 안 목차 이동 등 화면이 아닌 해시
    if (sig) sig.end();
    if (TRANSIENT_TO(name)) name = "hub";
    const room = roomOfScreen(name);
    if (CHAPTER_ORDER.includes(room) && name === `${room}-result` && isDone(room)) RENDER[room](state.visits[room], false);
    go(name, { instant: true, fromPop: true });
  });

  function go(name, opts = {}) {
    const want = roomOfScreen(name);
    if (want && ROOM_FILES[want] && !roomReady[want]) {
      body.classList.add("is-loading");
      return ensureRoom(want).then(() => {
        body.classList.remove("is-loading");
        go(name, opts);
      }, () => {
        body.classList.remove("is-loading");
        toast(T.toast.loadFail || "");
      });
    }
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
      ShareButtons.reset(); // 링크 복사 완료 줄은 화면을 옮기면 닫는다
      body.dataset.room = next.dataset.room;
      setTopbar(name);
      window.scrollTo(0, 0);
      enter[name]?.();
      if (/-input$/.test(name)) syncNotice(next);
      if (name === "saju-intro") sajuGateOpen();
      onScreen(name, next); // 화면 이벤트(GA4)
      if (name === "hub" || /-result$/.test(name)) prefetchNext();
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
    else if (name === "result-next-door" || name === "story-half-next") openNextDoor(t);
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
    saju: '<svg class="sig" viewBox="0 0 40 40"><use href="#icon-saju" /></svg>',
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
    if (room === "saju") {
      const st = SAJU.stems[Saju.decodeCode(c.saju).S1];
      return { title: strip(st.title), key: strip(st.key) };
    }
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
    // 여섯 문 상태 class
    const stateOf = (room) => (isDone(room) ? "is-visited" : room === next ? "is-next" : "is-locked");
    for (const room of OPEN_ROOMS) {
      const door = js(`hub-door-${room}`);
      const st = stateOf(room);
      ["is-visited", "is-next", "is-locked"].forEach((c) => door.classList.toggle(c, c === st));
      if (st === "is-locked") door.setAttribute("aria-disabled", "true");
      else door.removeAttribute("aria-disabled");
      const badge = js("hub-door-badge", door); // Ⅰ 대문에는 배지가 없다(번호는 door__num)
      if (badge) badge.textContent = fill(T.hub.badge, { n: chapterOf(room) });
    }
    // 진행 + 지금까지의 이야기 (1방 이상)
    show(js("hub-sofar"), n > 0);
    const prog = js("hub-progress");
    prog.style.setProperty("--n", n);
    prog.setAttribute("aria-valuenow", String(n));
    js("hub-progress-count").textContent = fill(T.hub.progress.count, { n, total: CHAPTER_ORDER.length });
    const a = currentArchetype();
    js("hub-archetype").textContent = a ? T.archetypes[a].name : "";
    renderSway(js("hub-archetype-sway"));
    // (11단계 H5) 3/6이면 "나의 이야기" 링크 글자만 중간 결말용으로 (요소 수 그대로)
    const storyLabel = js("hub-story-label");
    storyLabel.dataset.t = n === 3 ? "hub.sofar.half" : "hub.sofar.all";
    storyLabel.textContent = get(storyLabel.dataset.t) ?? "";
    const codes = myRoomCodes();
    // 마친 방만 줄로 (아직 안 연 방의 "?" 줄은 입구에서 보이지 않아 10단계에서 만들지 않는다)
    js("hub-sofar-list").innerHTML = filled.map((room) => {
      const num = `<span aria-hidden="true">${ROMAN[chapterOf(room) - 1]} · </span>`;
      const h = headOf(room, codes);
      return `<li class="so-far__item is-done" data-room="${room}"><button class="so-far__line" type="button" data-js="sofar-line" data-room="${room}" data-go="${room}-result">
            <span class="so-far__mark" aria-hidden="true">${SIG[room]}</span>
            <span class="so-far__text"><span class="so-far__room">${num}${esc(T.rooms[room].name)} · <b data-js="sofar-result">${esc(h.title)}</b></span><span class="so-far__key" data-js="sofar-key">${esc(clip(h.key))}</span></span>
            <span class="so-far__go" aria-hidden="true">›</span>
          </button></li>`;
    }).join("");
    // (10단계) 이어가기 코드: 0방 = 넣기 링크, 1방 이상 = 만들기 링크(so-far 안). 3방일 때만 절반 한 줄. 복원 직후 한 줄
    show(js("resume-enter"), n === 0);
    show(js("hub-half"), n === 3);
    show(js("resume-restored"), justRestored && n > 0);
    renderBookCard();
  }
  enter.hub = renderHub;
  leave.hub = () => {
    justRestored = false;
    closeResume();
  };

  // ───────── (10단계 10-1 b) 이어가기 코드 ─────────
  // 코드 글자는 이 함수들 안의 지역 값과 화면(resume-code 글자·입력 칸)에만 있다. state·sessionStorage·localStorage·쿠키·주소·네트워크·분석·공유 카드·console에 넣지 않는다.
  // 만들기: 버튼을 누른 순간에만 계산. 입구를 떠나거나 "내 정보 지우기"를 누르면 화면의 코드도 지운다.
  // 넣기: <form>이 아니다(제출·주소 변화 없음). Enter와 확인 버튼을 JS로만 처리하고, 복원이 끝나면 입력 칸을 비운다.
  const Resume = window.PayCode.Resume;
  let justRestored = false;
  const resumeEl = {
    enterToggle: js("resume-enter-toggle"), enterPanel: js("resume-enter-panel"), input: js("resume-input"), error: js("resume-error"),
    makeToggle: js("resume-make-toggle"), makePanel: js("resume-make-panel"), code: js("resume-code"), copied: js("resume-copied"),
  };
  function setPanel(toggle, panel, open) {
    toggle.setAttribute("aria-expanded", String(open));
    show(panel, open);
    // 패널 위 끝이 상단 막대 바로 아래에 오게 (경고와 복사 버튼이 한 화면에 함께 보이도록)
    if (open) window.scrollTo(0, Math.max(0, panel.getBoundingClientRect().top + window.scrollY - js("topbar").getBoundingClientRect().height - 12));
  }
  function resumeError(msg) {
    delete resumeEl.error.dataset.kind;
    resumeEl.error.textContent = msg;
    show(resumeEl.error, Boolean(msg));
    if (msg) resumeEl.input.setAttribute("aria-invalid", "true");
    else resumeEl.input.removeAttribute("aria-invalid");
  }
  function closeResume() {
    setPanel(resumeEl.enterToggle, resumeEl.enterPanel, false);
    setPanel(resumeEl.makeToggle, resumeEl.makePanel, false);
    resumeEl.input.value = "";
    resumeEl.code.textContent = "";
    show(resumeEl.copied, false);
    resumeError("");
  }
  // 지금 방문 기록 → 이어가기 코드에 담을 값 (결과 번호와 주제 키뿐)
  function resumeCodes() {
    const v = state.visits;
    return Object.assign(myRoomCodes(), { saju: v.saju ? v.saju.code : null, runeTopic: v.rune ? v.rune.topic : null, sibylTopic: v.sibyl ? v.sibyl.topic : null });
  }
  resumeEl.makeToggle.addEventListener("click", () => {
    const open = resumeEl.makeToggle.getAttribute("aria-expanded") !== "true";
    show(resumeEl.copied, false);
    let code = "";
    if (open) {
      try {
        code = Resume.pretty(Resume.encode(resumeCodes()));
      } catch (e) {
        return; // 순서가 어긋난 옛 기록 등: 코드를 만들지 않는다
      }
    }
    resumeEl.code.textContent = code;
    if (code) track("so_resume", { step: "made" }); // 코드 값은 보내지 않는다
    setPanel(resumeEl.makeToggle, resumeEl.makePanel, open);
    if (open) js("resume-copy").focus({ preventScroll: true });
  });
  js("resume-copy").addEventListener("click", async () => {
    const ok = await ShareButtons.copyText(resumeEl.code.textContent);
    show(resumeEl.copied, ok); // 클립보드가 막힌 브라우저: 코드는 이미 고를 수 있는 글자라 그대로 둔다
  });
  resumeEl.enterToggle.addEventListener("click", () => {
    const open = resumeEl.enterToggle.getAttribute("aria-expanded") !== "true";
    setPanel(resumeEl.enterToggle, resumeEl.enterPanel, open);
    if (open) resumeEl.input.focus({ preventScroll: true });
  });
  // 결과 번호 → 방문 기록. 원형 태그는 공개 데이터에서 다시 찾는다. 데이터에 없는 번호면 null
  function visitsFromCodes(c) {
    const v = {};
    if (c.saju != null) v.saju = SAJU && Saju.decodeCode(c.saju) && { code: c.saju, archetype: SAJU.stems[Saju.decodeCode(c.saju).S1].archetype };
    if (c.ogham != null) v.ogham = OGHAM[c.ogham] && { ogham: c.ogham, archetype: OGHAM[c.ogham].archetype };
    if (c.star != null) v.star = NAKS[c.star] && { nak: c.star, restored: true, archetype: NAKS[c.star].archetype };
    if (c.decan != null) v.decan = DECANS[c.decan] && { decan: c.decan, when: null, archetype: DECANS[c.decan].archetype };
    if (c.tzolkin) v.tzolkin = TZ_SIGNS[c.tzolkin.sign] && { number: c.tzolkin.number, sign: c.tzolkin.sign, archetype: TZ_SIGNS[c.tzolkin.sign].archetype };
    if (c.rune) v.rune = c.rune.every((i) => RUNES[i]) ? { picks: c.rune.map((i) => RUNES[i].code), topic: c.runeTopic, archetype: RUNES[c.rune[2]].archetype } : null;
    if (c.sibyl != null) v.sibyl = ORACLES[c.sibyl] && { sors: c.sibyl, topic: c.sibylTopic, archetype: ORACLES[c.sibyl].archetype };
    return Object.keys(v).every((room) => validVisit(room, v[room])) ? v : null;
  }
  async function restoreFromCode() {
    if (filledRooms().length) return; // 넣기는 마친 방이 없을 때만
    if (BOOK_ON && window.PayCode.Pass.looksPass(resumeEl.input.value)) {
      resumeError(T.resume.errors.pass); // (14-4) 열람 코드는 책에서 넣는다. 서버 요청 없음
      resumeEl.error.dataset.kind = "pass"; // 시험용 표시 (문구 칸이 비어 있어도 어느 안내인지 알 수 있게)
      return resumeEl.input.focus();
    }
    const r = Resume.decode(resumeEl.input.value);
    if (r.codes) {
      // (14-6) 복원할 방 파일을 모두 받은 뒤 그린다
      try {
        await ensureRooms(CHAPTER_ORDER.filter((room) => r.codes[room] != null));
      } catch (e) {
        return toast(T.toast.loadFail || "");
      }
    }
    const visits = r.codes ? visitsFromCodes(r.codes) : null;
    if (!visits) {
      track("so_resume", { step: "failed" });
      resumeError(T.resume.errors[r.error || "shape"]);
      return resumeEl.input.focus();
    }
    state = { profile: {}, visits, restored: true };
    track("so_resume", { step: "used" });
    save();
    closeResume(); // 입력 칸을 비운다
    justRestored = true;
    renderHub();
    window.scrollTo(0, 0);
  }
  js("resume-go").addEventListener("click", restoreFromCode);
  resumeEl.input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    restoreFromCode();
  });
  resumeEl.input.addEventListener("input", () => resumeError(""));
  // 복원 상태 안내 한 줄(마크업의 별의 방 견본을 틀로 쓴다). text = 문구, room = 다시 입력할 방
  const restoreTpl = js("restore-note");
  function restoreNote(text, room) {
    const el = restoreTpl.cloneNode(true);
    el.classList.remove("is-hidden");
    el.firstElementChild.removeAttribute("data-t");
    el.firstElementChild.textContent = text;
    const btn = js("restore-reinput", el);
    btn.dataset.room = room;
    btn.dataset.go = `${room}-input`;
    return el;
  }
  // 다시 입력: 그 방 입력 화면을 입력칸이 보이는 상태로 (문서 click 위임보다 먼저 실행된다)
  document.addEventListener("click", (e) => {
    const b = e.target.closest('[data-js="restore-reinput"]');
    if (b && b.dataset.room in editing) editing[b.dataset.room] = true;
  }, true);

  // ───────── 입력 화면 공통 ─────────
  const editing = { saju: false, rune: false, star: false, ogham: false, decan: false, tzolkin: false };
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
  // (13단계) 방 결과의 책 한 줄: 결제 상태와 무관하게 떡밥(hook) + "책에서 이 방의 장 열기 →"(그 장 표지로). 옛 "여섯 문 끝…" 줄은 숨김
  function updateBookLines() {
    if (!BOOK_ON) return; // off: 책 한 줄은 DOM에서 걷어 냈다
    jsAll("result-book-line").forEach((el) => {
      show(el, true);
      el.dataset.state = "open";
      show(js("book-line-note", el), false);
      show(js("result-book-link", el), true);
      js("book-line-link-label", el).textContent = T.room.bookLink;
    });
  }
  function renderBookLine(scr, hook) {
    if (!BOOK_ON) return;
    js("book-line-hook", scr).innerHTML = hook || "";
    updateBookLines();
  }

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
    setTurn("rune", scr, fill(R.thread, {
      who: esc(who), past: past.keyword, now: now.keyword,
      next: `'${next.keyword}'${particle(next.keyword, "이/가")}`,
    }));

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
      // 라벨이 "영문 · 한글" 모양이면 영문 부분에만 lang="en" (10-7)
      const label = esc(R.nameLabel).replace(/^([\x20-\x7e]*[A-Za-z][\x20-\x7e]*?)( · )/, '<span lang="en">$1</span>$2');
      parts.push(`<aside class="inset inset--name" data-js="rune-name-runes" data-reveal>
            <p class="inset__label">${label}</p>
            <p class="name-runes runic" data-js="rune-name-glyphs">${toRunes(latin)}</p>
            <p class="inset__fact"><span data-js="rune-name-source">${esc(name)}</span> → <span class="latin" data-js="rune-name-latin">${esc(latin.toUpperCase())}</span></p>
            <p class="inset__fact">${R.nameFact}</p>
          </aside>`);
    }
    renderReading(scr, parts, "");
    // (10단계) 복원 상태: 이름을 룬으로 새긴 인셋은 이름이 있어야 그릴 수 있다 → 그 자리에 안내 한 줄 (룬은 다시 던지지 않으므로 이름은 오검의 방에서 다시 넣는다)
    if (state.restored && !name) js("reading-body", scr).append(restoreNote(T.resume.needName, "ogham"));
    renderBookLine(scr, now.now.hook);

    const list = [past, now, next].map((r) => fill(R.factItem, { name: r.name, aett: R.aett[Math.floor(r.index / 8)] })).join(", ");
    js("fact-text", scr).innerHTML = fill(R.fact, { list });
    Disclaimer.mount(js("disclaimer-slot", scr));
    renderArchetypeLine(scr, next.archetype, next.archetypeWhy);
    renderPassage(scr);
  }

  enter["rune-result"] = () => {
    const scr = screens["rune-result"];
    renderSway(js("result-archetype-sway", scr));
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
    // (10단계) 이어가기 코드로 복원한 결과(v.restored): 서양 별자리·해/달 라시·시각 안내는 생일이 있어야 그릴 수 있다.
    // → 반전 카드의 그 부분과 '마음' 사실 줄을 숨기고(빈칸·틀린 값으로 채우지 않는다) 안내 한 줄 + 다시 입력 링크를 보인다
    const restored = v.restored === true;
    const west = restored ? null : RASHIS[v.west];
    const sun = restored ? null : RASHIS[v.sunRashi];
    const moon = restored ? null : RASHIS[v.moonRashi];
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
    const turn = js("result-turn", scr);
    const note = js("result-time-note", scr);
    [$('[data-t="star.result.twistEyebrow"]', turn), $('[data-t="star.result.twistTitle"]', turn), js("twist-from", scr).parentElement, js("turn-text", scr)].forEach((el) => show(el, !restored));
    show(js("restore-note", scr), restored);
    if (restored) {
      js("twist-from", scr).textContent = js("twist-to", scr).textContent = note.textContent = "";
      setTurn("star", scr, "", true); // 복원 상태: 단락이 숨어 있으므로 잠금 UI도 내지 않는다 (12-1)
      show(note, false);
    } else {
      js("twist-from", scr).textContent = west.ko;
      js("twist-to", scr).textContent = sun.ko;
      setTurn("star", scr, same ? fill(R.twistSame, { sign: west.ko }) : fill(R.twistDiff, { sanskrit: sun.name, sign: sun.ko }));
      show(note, !v.exact);
      note.textContent = v.when ? fill(R.timeNoteChosen, { when: v.when }) : R.timeNoteNoon;
    }

    // 핵심 풀이: lede → body 앞 단락 → 사실 목록 → 해석 안내 (8-1)
    const F = R.facts;
    const facts = [
      [F.symbol, nak.symbol], [F.sky, nak.star], [F.deity, nak.deity], [F.planet, planet.name],
      [F.mind, restored ? "" : fill(R.mindValue, { sanskrit: moon.name, sign: moon.ko })],
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
    renderSway(js("result-archetype-sway", scr));
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
    setTurn("ogham", scr, (letters ? fill(R.turnLead, { count: letters.letters.length, latin: esc(e.latin) }) + " " : "") + e.turn);
    // (10단계) 복원 상태: 이름 글자 줄은 이름이 있어야 그릴 수 있다 → 그 자리에 안내 한 줄 + 다시 입력
    js("restore-note", scr)?.remove();
    if (state.restored && !name) latinEl.after(restoreNote(T.resume.needName, "ogham"));

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
    setTurn("decan", scr, e.turn);
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
    setTurn("tzolkin", scr, num.text);
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
    setTurn("sibyl", scr, o.turn);
    entryReading(scr, o, [], R.interpretNote);
    finishResult(scr, "sibyl", o, R);
  }
  js("result-retry", screens["sibyl-result"]).addEventListener("click", () => go("sibyl-input"));

  // 결과 화면 들어올 때 (네 방 공통: 룬·별과 같음)
  ["ogham", "decan", "tzolkin", "sibyl"].forEach((room) => {
    enter[`${room}-result`] = () => {
      const scr = screens[`${room}-result`];
      renderSway(js("result-archetype-sway", scr));
      replay(js("result-capture", scr));
      watchReveal(scr);
    };
  });

  // ═════════ (14단계 14-1) Ⅰ 만신의 방 ═════════
  // 화면: saju-intro(① 대문) → saju-input(② 채비: 이름·생년월일·시각·성별 + 6장 고지) → saju-ritual(③ rice → rung, ④ gongsu) → saju-result
  // 개인정보(6장): 네 값은 state.profile(sessionStorage, 이 탭)에만. 성별은 profile.gender("m"|"f"|"x")이고 "내 정보 지우기" 대상이다.
  //   이어가기 코드·분석 이벤트·공유 카드·URL·서버 요청에는 성별·원국 8글자·대운을 넣지 않는다.
  //   visits.saju에는 결과 코드(Saju.encodeCode, 1~5000)와 원형만 둔다. 원국 표·대운은 화면을 그릴 때 profile로 다시 계산한다.
  // 문구: 원본은 data-saju.js(SAJU.text) 하나다. 마크업의 data-t 키(saju.*·guides.saju·bridges.saju·privacy.noticeProfile)로 길만 잇는다.
  const GENDER_OF = { m: "male", f: "female", x: "none" };
  const SAJU_GROUP_KEY = { bigeop: "bigyeop", siksang: "siksang", jaeseong: "jaeseong", gwanseong: "gwanseong", inseong: "inseong" }; // saju.js 묶음 이름 → data-saju.js groups 키
  const SAJU_PILLARS = ["year", "month", "day", "hour"];
  const SAJU_STEP_MS = 360; // 글자 사이 (design 14단계 3절)
  const SAJU_INK_MS = 560; // 글자 하나가 번지는 시간
  function mergeSajuText() {
    const X = SAJU.text;
    const I = X.input || {};
    const R = X.result || {};
    const pl = R.pillarLabelsLong || []; // [시주, 일주, 월주, 년주] (오른쪽→왼쪽 표기 순)
    T.guides.saju = X.guide;
    T.bridges.saju = X.bridge;
    T.privacy.noticeProfile = I.notice;
    if (!T.privacy.noticeReuse) T.privacy.noticeReuse = I.noticeReuse;
    const G = I.genderOptions || {};
    const RS = X.ritualSteps || {};
    const rice = RS.rice || {};
    const gongsu = RS.gongsu || {};
    const H = R.headings || {};
    T.saju = {
      intro: X.intro,
      input: Object.assign({}, I, { dateLabel: I.birthLabel, dateWhy: I.birthWhy, genderM: G.male, genderF: G.female, genderX: G.none }),
      ritual: { bellLabel: rice.bellLabel, hint: rice.hint, hourUnknown: rice.unknownHour, done: rice.done, call: gongsu.call, callSub: gongsu.callSub, go: gongsu.next },
      pillars: { hour: pl[0], day: pl[1], month: pl[2], year: pl[3], unknown: R.unknownCell },
      elements: R.elementNames || {},
      result: Object.assign({}, R, {
        boardTitle: R.pillarsTitle, selfNote: R.pillarsHint, hourNote: R.sixNote, restoredBoard: R.restoredPillars,
        ohaengTitle: R.elementsTitle, s4Ask: R.daeunNone, s4Edit: R.daeunNoneLink,
        s1Title: H.s1, s4Title: H.s4, s5Title: H.s5,
      }),
      errors: X.errors || {},
      loading: X.loading || {},
      card: X.card || {},
    };
  }
  // (14-1) 뒤의 방 입력 고지: 이 탭에 이미 넣은 값이 있으면 "이미 넣은 값을 씁니다" 한 줄. "내 정보 지우기" 뒤에는 원래 고지
  function syncNotice(scr) {
    const room = scr.dataset.room;
    if (room === "saju" || room === "sibyl") return;
    const span = $('[data-js="privacy-notice"] [data-t]', scr);
    if (!span) return;
    const p = state.profile;
    const reuse = Boolean(p.name || p.birth) && T.privacy.noticeReuse;
    span.textContent = reuse || (get(span.dataset.t) ?? "");
  }

  const sajuIntro = screens["saju-intro"];
  const sajuInput = screens["saju-input"];
  const sajuRitual = screens["saju-ritual"];
  const sajuResult = screens["saju-result"];
  let sajuCalc = null; // Saju.compute 결과 (메모리만)
  let sajuView = null;
  let sajuBusy = false;

  // ① 대문: 들어올 때 닫힌 문이 0.6초 뒤 열린다. 화면을 누르면 바로 열림. 움직임 줄이기면 처음부터 열림
  function sajuGateOpen() {
    const g = js("saju-gate", sajuIntro);
    g.classList.toggle("is-closed", !reduceMotion);
    if (!reduceMotion) later(() => g.classList.remove("is-closed"), 600);
  }
  sajuIntro.addEventListener("click", () => js("saju-gate", sajuIntro).classList.remove("is-closed"));

  // ② 채비
  const sf = {
    name: js("saju-name"), y: js("saju-year"), m: js("saju-month"), d: js("saju-day"),
    h: js("saju-hour"), mi: js("saju-minute"), unknown: js("saju-time-unknown"),
  };
  const sajuGender = jsAll("saju-gender-opt", sajuInput);
  digitsOnly(sf.y, sf.m);
  digitsOnly(sf.m, sf.d);
  digitsOnly(sf.d, sf.h);
  digitsOnly(sf.h, sf.mi);
  digitsOnly(sf.mi);
  js("saju-form").addEventListener("submit", (e) => e.preventDefault());
  function sajuErr(k, msg) {
    js(`saju-${k}-field`).classList.toggle("is-error", Boolean(msg));
    const e = js(`saju-${k}-error`);
    e.textContent = msg || "";
    show(e, Boolean(msg));
  }
  const syncUnknown = () => [sf.h, sf.mi].forEach((el) => {
    el.disabled = sf.unknown.checked;
    if (sf.unknown.checked) el.value = "";
  });
  sf.unknown.addEventListener("change", () => {
    syncUnknown();
    sajuErr("time", "");
  });
  sf.name.addEventListener("input", () => sajuErr("name", ""));
  [sf.y, sf.m, sf.d].forEach((el) => el.addEventListener("input", () => sajuErr("date", "")));
  [sf.h, sf.mi].forEach((el) => el.addEventListener("input", () => sajuErr("time", "")));
  sajuGender.forEach((r) => r.addEventListener("change", () => sajuErr("gender", "")));
  enter["saju-input"] = () => {
    const p = state.profile;
    show(js("saved-info", sajuInput), false);
    ["name", "date", "time", "gender"].forEach((k) => sajuErr(k, ""));
    sf.name.value = p.name || "";
    sf.y.value = p.birth ? p.birth.y : "";
    sf.m.value = p.birth ? p.birth.m : "";
    sf.d.value = p.birth ? p.birth.d : "";
    sf.unknown.checked = p.time === null;
    sf.h.value = p.time ? p.time.h : "";
    sf.mi.value = p.time ? pad2(p.time.m) : "";
    syncUnknown();
    sajuGender.forEach((r) => (r.checked = r.value === p.gender));
  };
  function readSaju() {
    const E = T.saju.errors;
    const name = sf.name.value.trim();
    const y = Number(sf.y.value), m = Number(sf.m.value), d = Number(sf.d.value);
    const errs = {};
    if (!name || [...name].length > 10) errs.name = E.name;
    if (!(sf.y.value.length === 4 && Calc.validDate(y, m, d))) errs.date = E.birth;
    else if (y < 1930 || Date.UTC(y, m - 1, d) > Date.now()) errs.date = E.birthRange;
    let time = null;
    if (!sf.unknown.checked) {
      const h = Number(sf.h.value), mi = sf.mi.value === "" ? 0 : Number(sf.mi.value);
      if (sf.h.value === "" || h > 23 || mi > 59) errs.time = E.time;
      else time = { h, m: mi };
    }
    const g = (sajuGender.find((r) => r.checked) || {}).value;
    if (!GENDER_OF[g]) errs.gender = E.gender;
    ["name", "date", "time", "gender"].forEach((k) => sajuErr(k, errs[k]));
    const first = ["name", "date", "time", "gender"].find((k) => errs[k]);
    if (first) {
      ({ name: sf.name, date: sf.y, time: sf.h, gender: sajuGender[0] })[first].focus();
      return null;
    }
    return { name, birth: { y, m, d }, time, gender: g };
  }
  js("saju-input-go").addEventListener("click", () => {
    const v = readSaju();
    if (!v) return;
    Object.assign(state.profile, v); // 6장 예외: 이 탭의 sessionStorage profile에만 (고지는 버튼 바로 위 privacy-notice)
    save();
    editing.saju = false;
    startSaju();
  });
  function calcFromProfile() {
    const p = state.profile;
    if (!p.birth || p.time === undefined || !Saju || !Saju.isLunarReady()) return null;
    try {
      return Saju.compute({ y: p.birth.y, m: p.birth.m, d: p.birth.d, time: p.time ? { h: p.time.h, mi: p.time.m } : null, gender: GENDER_OF[p.gender] || "none" });
    } catch (e) {
      return null;
    }
  }
  // 만세력(lunar-javascript)을 받아 계산한 뒤 의식으로. 받지 못하면 안내 한 줄 + 같은 버튼으로 다시 시도(막다른 곳 없음)
  async function startSaju() {
    if (sajuBusy) return;
    sajuBusy = true;
    const btns = [js("saju-input-go"), js("saju-intro-go")];
    btns.forEach((b) => (b.classList.add("is-loading"), b.setAttribute("aria-busy", "true")));
    try {
      await Saju.loadLunar();
      sajuCalc = calcFromProfile();
    } catch (e) {
      sajuCalc = null;
    } finally {
      sajuBusy = false;
      btns.forEach((b) => (b.classList.remove("is-loading"), b.removeAttribute("aria-busy")));
    }
    if (!sajuCalc) {
      const L = T.saju.loading;
      return toast([L.fail, L.retry].filter(Boolean).join(T.common.sep));
    }
    go("saju-ritual");
  }

  // 원국 칸 채우기 (쌀 위 = 글자만, 결과 = 글자 + 독음·오행)
  function paintPillars(list, c, withSmall) {
    SAJU_PILLARS.forEach((k) => {
      const li = $(`[data-pillar="${k}"]`, list);
      const p = c.pillars[k];
      li.classList.toggle("is-unknown", !p);
      const chars = $$(".wonguk__char", li);
      [["stem", p && p.stem], ["branch", p && p.branch]].forEach(([kind, i], n) => {
        const el = chars[n];
        if (!p) {
          el.removeAttribute("data-el");
          el.innerHTML = "";
          return;
        }
        const elName = Saju.ELEMENTS[(kind === "stem" ? Saju.STEM_EL : Saju.BRANCH_EL)[i]];
        const ko = (kind === "stem" ? Saju.STEM_KO : Saju.BRANCH_KO)[i];
        const elLabel = T.saju.elements[elName];
        el.dataset.el = elName;
        el.innerHTML = `<b>${(kind === "stem" ? Saju.STEMS : Saju.BRANCHES)[i]}</b>` + (withSmall ? `<small>${esc(elLabel ? ko + T.common.sep + elLabel : ko)}</small>` : "");
      });
    });
  }

  // ③ 쌀점과 방울 → ④ 공수
  enter["saju-ritual"] = () => {
    const c = sajuCalc;
    sajuRitual.dataset.stage = "rice";
    if (!c) return;
    paintPillars(js("saju-ritual-pillars", sajuRitual), c, false);
    show(js("saju-hour-unknown", sajuRitual), false);
    js("saju-ritual-hint", sajuRitual).textContent = T.saju.ritual.hint || "";
    const st = SAJU.stems[c.dayStem];
    js("saju-gongsu-stem", sajuRitual).textContent = st.hanja;
    js("saju-gongsu-call", sajuRitual).textContent = fill(T.saju.ritual.call || "", { name: st.name, stem: st.name });
  };
  js("saju-bell", sajuRitual).addEventListener("click", () => {
    if (sajuRitual.dataset.stage !== "rice" || !sajuCalc) return;
    buzz(30);
    sajuRitual.dataset.stage = "rung";
    js("saju-ritual-hint", sajuRitual).textContent = "";
    const n = sajuCalc.pillars.hour ? 8 : 6;
    show(js("saju-hour-unknown", sajuRitual), !sajuCalc.pillars.hour);
    later(() => {
      sajuRitual.dataset.stage = "gongsu";
      js("saju-gongsu-go", sajuRitual).focus({ preventScroll: true });
    }, reduceMotion ? 0 : (n - 1) * SAJU_STEP_MS + SAJU_INK_MS + 200);
  });
  js("saju-gongsu-go", sajuRitual).addEventListener("click", () => {
    if (!sajuCalc) return;
    renderSaju({ code: sajuCalc.code }, true);
    go("saju-result");
  });

  // 결과 (14-1 결과 화면 순서)
  const sajuParas = (list) => (Array.isArray(list) ? list : [list]).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
  function renderSaju(v, fresh) {
    const scr = sajuResult;
    const R = T.saju.result;
    let calc = sajuCalc && sajuCalc.code === v.code ? sajuCalc : calcFromProfile();
    if (calc && calc.code !== v.code) calc = null; // 프로필이 바뀌었거나(다른 방에서 고침) 이어가기 코드로 복원한 방 → 원국 없이
    const sel = calc ? calc.select : Saju.decodeCode(v.code);
    const st = SAJU.stems[sel.S1];
    if (fresh) {
      state.visits.saju = { code: v.code, archetype: st.archetype };
      save();
    }
    sajuView = { sel, st, calc };
    renderGuideText(scr, "saju");
    js("saju-stem-seal", scr).dataset.el = Saju.ELEMENTS[Saju.STEM_EL[sel.S1]];
    js("saju-stem-hanja", scr).textContent = st.hanja;
    js("result-title", scr).textContent = strip(st.title);
    js("result-key", scr).innerHTML = st.key;
    js("result-meta", scr).textContent = strip(fill(R.meta, { who: whoOf(state.profile.name || "") }));

    // 한지 판: 원국 표·경우별 안내·오행 막대 (복원이면 표·막대 대신 한 줄)
    js("saju-board", scr).classList.toggle("is-restored", !calc);
    js("saju-wonguk", scr).hidden = !calc;
    js("saju-ohaeng", scr).hidden = !calc;
    show(js("saju-restored-note", scr), !calc);
    show(js("saju-hour-note", scr), Boolean(calc && !calc.pillars.hour));
    const jd = calc && calc.flags.jieDay;
    const jn = js("saju-jeolip-note", scr);
    jn.textContent = jd ? fill(jd.year ? R.jieqiYear : R.jieqiMonth, { alt: jd.month.after.hanja, altYear: jd.year ? jd.year.after.hanja : "" }) : "";
    show(jn, Boolean(jd));
    if (calc) {
      paintPillars(js("saju-wonguk", scr), calc, true);
      jsAll("saju-ohaeng-row", scr).forEach((row) => {
        const el = row.dataset.el;
        const n = calc.elements[el];
        row.style.setProperty("--n", n);
        row.classList.toggle("is-empty", n === 0);
        row.classList.toggle("is-most", el === sel.S2a);
        row.classList.toggle("is-least", el === sel.S2b.element);
        js("saju-ohaeng-count", row).textContent = String(n);
      });
    }

    // 풀이 S1 → S2a → S2b → S3 → S4
    js("saju-s1-body", scr).innerHTML = sajuParas(st.body);
    js("saju-s2a-body", scr).innerHTML = sajuParas(SAJU.elements.many[sel.S2a]);
    js("saju-s2b-body", scr).innerHTML = sajuParas(SAJU.elements[sel.S2b.kind][sel.S2b.element]);
    const H = R.headings || {};
    const elName = (el) => T.saju.elements[el] || "";
    const grp = SAJU.groups[SAJU_GROUP_KEY[sel.S3]];
    const head = (key, t) => {
      const el = $(`[data-t="saju.result.${key}"], [data-js="saju-${key}"]`, scr);
      el.removeAttribute("data-t");
      el.dataset.js = `saju-${key}`;
      el.textContent = t || "";
    };
    head("s2aTitle", fill(H.s2a, { element: elName(sel.S2a) }));
    head("s3Title", fill(H.s3, { group: grp.name }));
    js("saju-s2b-title", scr).textContent = fill(sel.S2b.kind === "empty" ? H.s2bEmpty : H.s2b, { element: elName(sel.S2b.element) });
    js("saju-s3-body", scr).innerHTML = sajuParas(grp.text);
    const dw = calc && calc.daewoon;
    show(js("saju-s4", scr), Boolean(dw));
    show(js("saju-s4-ask", scr), !dw);
    js("saju-s4-body", scr).innerHTML = dw ? sajuParas(fill(SAJU.daeun[dw.direction], { age: fill(dw.approx ? R.daeunAgeApprox : R.daeunAge, { n: dw.startAge }) })) : "";
    const ask = $('[data-t="saju.result.s4Ask"], [data-js="saju-s4-ask-text"]', scr);
    ask.removeAttribute("data-t");
    ask.dataset.js = "saju-s4-ask-text";
    ask.textContent = (calc ? R.daeunNone : R.restoredDaeun) || "";

    renderArchetypeLine(scr, st.archetype, st.archetypeWhy);
    renderSway(js("result-archetype-sway", scr));
    js("saju-s5", scr).textContent = strip(st.gongsu); // S5 만신의 공수(안내자 close 자리)
    renderBookLine(scr, st.event && st.event.hook);
    Disclaimer.mount(js("disclaimer-slot", scr));
    renderPassage(scr);
  }
  const sajuEdit = (focusGender) => {
    editing.saju = true;
    go("saju-input");
    if (focusGender) setTimeout(() => sajuGender[0].focus(), 400);
  };
  js("result-retry", sajuResult).addEventListener("click", () => sajuEdit(false));
  js("saju-s4-edit", sajuResult).addEventListener("click", () => sajuEdit(true));
  // 공유 카드: 일간 이름·한자·결과 이름·원형만 (원국 8글자·성별·이름·생일·대운 없음, 14-1·design 9절)
  function buildSajuCard() {
    const { st } = sajuView;
    const C = T.saju.card;
    return {
      file: C.file, text: strip(fill(C.shareText, { name: st.title })),
      opts: {
        theme: CARD_THEME.saju, eyebrow: strip(C.eyebrow || ""), seed: 71 + SAJU.stems.indexOf(st),
        title: strip(st.title), subtitle: `${st.name} ${st.hanja}`,
        lines: [strip(st.key)],
        badges: [strip(C.badge || ""), T.archetypes[st.archetype].name],
        guideSignature: { name: T.guides.saju.name, line: strip(T.guides.saju.signature) },
      },
    };
  }

  // ═════════ (8단계 U3) 방 시작 화면: 필요한 값이 프로필에 있으면 입력 화면을 건너뛰고 바로 의식 ═════════
  // 입력칸이 있는 방은 오검(이름)·별(생년월일·시각)·데칸·촐킨(생년월일). 룬 주제·시빌라 질문은 방의 본질이라 입력 화면을 그대로 둔다
  function savedValueOf(room) {
    const p = state.profile;
    if (room === "saju")
      return p.name && p.birth && p.time !== undefined && GENDER_OF[p.gender]
        ? [p.name, fill(T.common.date, p.birth), p.time ? fill(T.common.time, { h: p.time.h, mm: pad2(p.time.m) }) : T.common.timeUnknown].join(T.common.sep)
        : null;
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
    if (room === "saju") return startSaju();
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
    saju: renderSaju,
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
    if (room === "saju") {
      const st = SAJU.stems[Saju.decodeCode(v.code).S1];
      return `${st.name} ${st.hanja}`;
    }
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
    if (room === "saju") return SAJU.stems[Saju.decodeCode(v.code).S1].summary;
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
    // (11단계 H5) 마친 방이 정확히 3개: 중간 맺음 → 남은 세 칸 → 다음 문(주 버튼 하나). 공유 버튼은 보조로 내린다
    const half = n === 3;
    storyScr.classList.toggle("is-half", half);
    show(js("story-half", storyScr), half);
    const halfNext = js("story-half-next", storyScr);
    halfNext.classList.remove("is-opening");
    // (14단계) 중간 맺음의 다음 문 = 순서상 첫 미완 방 (마크업 견본은 옛 순서의 촐킨)
    const hn = nextRoom();
    if (hn) {
      halfNext.dataset.room = hn;
      halfNext.dataset.go = `${hn}-intro`;
      $(".next-door__glyph", halfNext).innerHTML = SIG[hn];
      $(".next-door__num", halfNext).textContent = ROMAN[chapterOf(hn) - 1];
      const nm = $(".next-door__name", halfNext);
      nm.removeAttribute("data-t");
      nm.textContent = T.rooms[hn].name;
    }
    const shareBtn = js("story-share", storyScr);
    shareBtn.classList.toggle("btn--primary", !half);
    shareBtn.classList.toggle("btn--secondary", half);
    // (13단계) 결말 뒤 "책 목차 열기" 한 줄 버튼. 마친 방이 없으면 숨김
    show(js("story-book", storyScr), n > 0);

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

  // ═════════ (10단계 10-2) 링크 복사·카카오톡 자리 (common/share-buttons.js) ═════════
  // 서비스 주소는 이 값 하나만 쓴다: data.js site.url, 비어 있으면 지금 주소(쿼리·해시 없음). 입력값·결과 코드는 넣지 않는다.
  // 카카오톡: kakao.jsKey·sdkUrl이 비어 있으면 버튼을 만들지 않고 SDK도 부르지 않는다. 공유 내용은 제목·설명·og-image·주소뿐
  const SITE_URL = ShareButtons.siteUrl(T.site.url);
  ShareButtons.init({
    url: SITE_URL,
    kakao: { jsKey: T.kakao.jsKey, sdkUrl: T.kakao.sdkUrl, label: T.share.kakao, title: T.meta.title, description: T.meta.description, imageUrl: new URL("og-image.png", SITE_URL).href, onFail: () => toast(T.toast.shareFail) },
  });

  // ═════════ 공유 카드 ═════════
  async function shareCard(btn, build) {
    if (btn.classList.contains("is-loading")) return;
    btn.classList.add("is-loading");
    try {
      const { opts, file, text } = build();
      // (10단계 10-2) 공유 글 끝에 표시용 주소를 붙이고, 공유 시트에는 url도 넘긴다. 카드 하단 주소 줄은 site.url을 넣었을 때만
      const showUrl = ShareButtons.displayUrl(SITE_URL);
      const canvas = await ShareCard.render(Object.assign({ fonts: FONTS, footer: T.card.footer, footerY: 1630, footerUrl: T.site.url ? showUrl : "" }, opts));
      const how = await ShareCard.share(canvas, file, `${text} ${showUrl}`, SITE_URL);
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
        // 복원한 결과에는 서양 별자리·해 라시가 없다 → 반전 알약을 뺀다
        badges: (v.restored ? [] : [v.west === v.sunRashi ? fill(C.twistSame, { sign: west.ko }) : fill(C.twist, { west: west.ko, vedic: sun.ko })]).concat([C.badge]),
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
  const CARD_BUILD = { saju: buildSajuCard, rune: buildRuneCard, star: buildStarCard, ogham: buildOghamCard, decan: buildDecanCard, tzolkin: buildTzolkinCard, sibyl: buildSibylCard };
  ["result-share", "result-share-top"].forEach((name) => {
    CHAPTER_ORDER.forEach((room) => js(name, screens[`${room}-result`]).addEventListener("click", (e) => shareCard(e.currentTarget, CARD_BUILD[room])));
  });
  ["story-share", "story-share-top"].forEach((name) => js(name, storyScr).addEventListener("click", (e) => {
    if (filledRooms().length) shareCard(e.currentTarget, buildStoryCard);
  }));

  // ═════════ (13단계) 광고로 여는 책: 목차 · 장 표지 · 장 안 (spec 13-1~13-8, design 「13단계」) ═════════
  // 결정 75: 책은 팔지 않는다. 가격·결제창·영수증 코드·토스 로더는 화면에서 은퇴했다. 휴면 서버(api/)는 부르지 않는다.
  // paycode.js는 이어가기 코드(PayCode.Resume)와 원형·방 순서 표 때문에 그대로 쓴다.
  // 개인정보 (CLAUDE.md 6장, spec 13-4·13-8):
  //  - 책은 이 브라우저에서 결과 코드·원형·나이 구간만으로 조립한다(book.js). 장 문구 파일(data-book-*.js)은 방·주제 단위 이름으로만,
  //    같은 출처 정적 <script>로 받는다(결과 번호·query 없음). 잠긴 장의 문장은 DOM에 넣지 않는다.
  //  - 궁합 상대의 이름·생년월일·관계 유형은 궁합 표지 입력칸과 이 함수들의 지역 값에만 둔다(sessionStorage에도 넣지 않음).
  //    다른 장·목차로 가면 입력칸을 비운다. 분석 이벤트에는 장 id·단계만.
  //  - sessionStorage: 광고로 연 장 표시 "book-<장 id>":1 (strange-oracle-unlock 칸), 이어 읽기 "<장 id>:<쪽>" (strange-oracle-bookmark). 문장·입력값 없음.
  //  - 시기별 흐름 표지의 생년월일은 6장 예외대로 profile에 넣는다(기존 고지·내 정보 지우기를 따름).
  const reportScr = screens.report;
  const BookCore = window.BookCore;
  const BV = window.BOOK_VOLUME;
  const READ_PER_MIN = 500; // 읽는 속도 분당 500자 (spec 8단계 가정)
  const comma = (n) => Number(n).toLocaleString("ko-KR");
  const OLD_RECEIPT_KEY = "strange-oracle-receipt"; // 12단계까지 영수증 코드 칸. 남아 있으면 지우고 목차로 보낸다(13-4)
  // (14단계 F4-B2) 책 12장 = 여는 글 + 방 7장(Ⅰ 만신 포함) + 시기별 흐름·궁합·원형 심층 + 닫는 글. 유료는 여는 글·닫는 글을 뺀 10장.
  //  - 여는 글·닫는 글: 공개 정적 파일 data-book-free.js (무료 맛보기)
  //  - 유료 10장: 함수 book(POST /api/book, 본문 { pass, file } 두 칸뿐)이 열람 코드를 확인한 뒤 JSON으로 준다. 받은 값은 같은 전역(BOOK_SAJU…)에 둔다.
  //    결과 코드·입력값은 보내지 않는다(6장). file 이름은 장 단위 고정 문자열(허용 목록 10개).
  const BOOK_ROOMS = CHAPTER_ORDER;
  const BOOK_IDS = ["open", ...BOOK_ROOMS, "flow", "match", "deep", "close"];
  const PART0 = new Set(["open", "close"]); // 여는 글·닫는 글 (부 번호 없음)
  const PAID_IDS = new Set([...BOOK_ROOMS, "flow", "match", "deep"]);
  const PAID_FILE = Object.assign(Object.fromEntries(BOOK_ROOMS.map((r) => [r, r])), { flow: "flow", match: "match", deep: "arch" });
  const PAID_GLOBAL = Object.assign(Object.fromEntries(BOOK_ROOMS.map((r) => [r, `BOOK_${r.toUpperCase()}`])), { flow: "BOOK_FLOW", match: "BOOK_MATCH", arch: "BOOK_ARCH" });
  const FREE_FILE = "data-book-free.js";
  const BOOK_API = "/api/book";
  let memPass = "";
  const readPass = () => {
    try {
      return window.PayCode.Pass.normalize(window.sessionStorage.getItem(PASS_KEY) || "");
    } catch (e) {
      return "";
    }
  };
  const writePass = (p) => {
    try {
      if (p) window.sessionStorage.setItem(PASS_KEY, p);
      else window.sessionStorage.removeItem(PASS_KEY);
    } catch (e) {
      /* 저장이 막힌 브라우저: 이 화면에서만 */
    }
    memPass = p || "";
  };
  const passNow = () => readPass() || memPass;
  // 함수 book 부르기 → { ok, data } 또는 { kind: fail | wait | offline }. 본문은 pass·file 두 칸뿐, 응답은 저장하지 않는다(no-store)
  async function callBook(pass, file) {
    try {
      const r = await fetch(BOOK_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pass, file }), cache: "no-store", credentials: "omit" });
      if (r.status === 200) {
        const j = await r.json();
        return j && j.file === file && j.data ? { ok: true, data: j.data } : { kind: "offline" };
      }
      return { kind: r.status === 401 || r.status === 400 ? "fail" : r.status === 429 ? "wait" : "offline" };
    } catch (e) {
      return { kind: "offline" };
    }
  }
  const paidLoading = {};
  function loadPaid(file) {
    if (window[PAID_GLOBAL[file]]) return Promise.resolve();
    if (!paidLoading[file])
      paidLoading[file] = callBook(passNow(), file).then((r) => {
        delete paidLoading[file];
        if (!r.ok) {
          if (r.kind === "fail") writePass(""); // 코드가 더는 통하지 않음(폐기 등) → 결제 전 상태로
          throw new Error(r.kind);
        }
        window[PAID_GLOBAL[file]] = r.data;
      });
    return paidLoading[file];
  }
  const sajuHiddenTitle = (c) => strip(SAJU.groups[Object.keys(SAJU.groups)[BookCore.sajuGroup(c.saju)]].hiddenTitle || "");

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
  // 마크업의 모양 견본을 틀로 떼어 두고 견본 글자는 지운다
  const tpl = {
    stage: js("report-timeline").firstElementChild.cloneNode(true),
    matchRoom: js("report-match-rooms").firstElementChild.cloneNode(true),
  };
  const matchEnd = document.createElement("div"); // 궁합 마지막 문단(M1 함께 해 볼 한 가지): 방별 관계 목록 뒤
  matchEnd.className = "report-part__body prose";
  matchEnd.dataset.js = "report-match-end";
  js("report-match-rooms").after(matchEnd);
  function clearSource() {
    ["report-timeline", "report-match-rooms", "report-open", "report-close", "report-match", "report-match-end", "report-deep-strength", "report-deep-shadow", "report-deep-growth", "report-evidence"]
      .forEach((n) => (js(n).textContent = ""));
    [...js("report-match-pair").children].forEach((s, i) => i !== 1 && (s.textContent = ""));
    jsAll("book-room").forEach((el) => {
      show(el, false);
      ["book-ch1", "book-ch2", "book-ch3", "book-ch4", "book-hidden"].forEach((k) => (js(k, el).textContent = ""));
    });
  }

  // ── 브라우저 쪽 계산: 나이 구간·상대 원형·관계 등급 (spec 6-2, 13-4)
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
      saju: v.saju ? v.saju.code : null, // (14단계) 결과 코드만
    };
  }


  // ── 장 문구 파일 지연 불러오기 (같은 파일은 한 번만. 실패하면 다음 시도에서 다시)
  const loading = {};
  function loadFile(f) {
    if (!loading[f])
      loading[f] = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = f;
        s.onload = res;
        s.onerror = () => {
          delete loading[f];
          s.remove();
          rej(new Error("load"));
        };
        document.head.append(s);
      });
    return loading[f];
  }
  const loadState = {}; // 장 id → loading | ok | fail
  function fetchChapter(id) {
    if (loadState[id] === "ok") return Promise.resolve(true);
    loadState[id] = "loading";
    syncOpenBtn();
    // (14-6) 궁합·시기별 흐름은 상대·나의 오검·데칸·촐킨을 계산하므로 그 방 파일(데칸은 astronomy-engine)도 받는다
    const needs = id === "match" || id === "flow" ? [ensureRooms(["ogham", "decan", "tzolkin"])] : [];
    const get = PART0.has(id) ? loadFile(FREE_FILE) : loadPaid(PAID_FILE[id]);
    return Promise.all([get].concat(needs)).then(() => true, () => false).then((ok) => {
      loadState[id] = ok ? "ok" : "fail";
      if (coverId === id) syncOpenBtn();
      return ok;
    });
  }

  // ── 장 상태 (13-2)
  const roomsDone = () => filledRooms().length;
  const available = (id) => (CHAPTER_ORDER.includes(id) ? isDone(id) : id === "close" ? roomsDone() === CHAPTER_ORDER.length : roomsDone() > 0);
  // (14-4) 유료 10장은 열람 코드가 확인된 탭에서만 열린다. 7/7 전에 사도 되고, 지나지 않은 방의 장은 그 방을 지나면 열린다(59번)
  const isOpen = (id) => !PAID_IDS.has(id) || Boolean(passNow());
  const readSet = new Set(); // 이 화면에서 끝까지 읽은 장 (메모리만)
  const chapterState = (id) => (!available(id) ? "need-room" : !isOpen(id) ? "can-open" : readSet.has(id) ? "read" : "opened");
  const chapterName = (id) =>
    CHAPTER_ORDER.includes(id) ? fill(T.topbar.room, { num: ROMAN[chapterOf(id) - 1], name: T.rooms[id].name })
      : id === "open" ? T.book.toc.open : id === "close" ? T.book.toc.close : T.book.parts[id === "flow" ? "timeline" : id];
  const needLine = (id) => (id === "close" ? T.book.toc.needAll : fill(T.book.toc.needRoom, { room: chapterName(CHAPTER_ORDER.includes(id) ? id : CHAPTER_ORDER[0]) }));
  function myCodes() {
    const b = state.profile.birth;
    return Object.assign(myRoomCodes(), { arch: currentArchetype(), band: b ? ageBand(b) : null });
  }
  // 분량: data-volume.js 숫자(글자 수). 아직 모르는 칸(상대·나이 구간)은 표의 값으로
  function chapterChars(id) {
    const c = myCodes();
    const a = c.arch;
    if (CHAPTER_ORDER.includes(id)) {
      const x = c[id];
      if (x == null) return BV.avg[id];
      if (id === "saju") return BV.room.saju[BookCore.sajuStem(x) * 5 + BookCore.sajuGroup(x)];
      return id === "rune" ? BV.rune.base + BV.rune.past[x[0]] + BV.rune.now[x[1]] + BV.rune.next[x[2]] : id === "tzolkin" ? BV.room.tzolkin[x.sign] : BV.room[id][x];
    }
    if (id === "flow") return a && c.band != null ? BV.timeline[a][c.band] : BV.avg.timeline;
    if (id === "match") return a ? BV.map[a] : BV.avg.map;
    return a ? BV[id][a] : BV.avg[id];
  }
  const minutes = (n) => Math.max(1, Math.ceil(n / READ_PER_MIN));
  const volumeLabel = (n) => fill(T.book.chapter.volume, { n: comma(Math.round(n / 100) * 100), m: minutes(n) });

  // ── 이어 읽기 (sessionStorage "strange-oracle-bookmark" = "<장 id>:<쪽>", 결정 53 칸을 13-1 형식으로)
  const BOOKMARK_KEY = "strange-oracle-bookmark";
  const readBookmark = () => {
    try {
      const m = /^([a-z]+):(\d{1,4})$/.exec(window.sessionStorage.getItem(BOOKMARK_KEY) || "");
      return m && BOOK_IDS.includes(m[1]) && Number(m[2]) > 0 ? { id: m[1], page: Number(m[2]) } : null;
    } catch (e) {
      return null;
    }
  };
  const writeBookmark = (id, n) => {
    try {
      if (id && n) window.sessionStorage.setItem(BOOKMARK_KEY, `${id}:${n}`);
      else window.sessionStorage.removeItem(BOOKMARK_KEY);
    } catch (e) {
      /* 저장이 막힌 브라우저: 이어 읽기 없이 */
    }
  };

  // ── 입구 책 카드 · 방 결과 책 한 줄 · 나의 이야기 버튼 (가격 0, 13-1)
  function renderBookCard() {
    if (!BOOK_ON) return;
    const n = roomsDone();
    const card = js("hub-book");
    card.dataset.state = n === 0 ? "none" : n === CHAPTER_ORDER.length ? "all" : "some";
    $$("i", js("hub-book-lock")).forEach((pip, i) => pip.classList.toggle("is-on", i < n));
    js("hub-book-hint").textContent = n === 0 ? T.hub.book.state0 : n === CHAPTER_ORDER.length ? T.hub.book.stateAll : fill(T.hub.book.stateSome, { n: BOOK_IDS.filter(available).length });
  }
  let coverNext = null; // 책 화면에 들어가자마자 열 장 표지 (방 결과 링크)
  const goBook = (id) => {
    if (!BOOK_ON) return;
    coverNext = id || null;
    go("report");
  };
  js("hub-book-go").addEventListener("click", () => goBook(null));
  js("story-book-link").addEventListener("click", () => goBook(null));
  CHAPTER_ORDER.forEach((room) => js("result-book-link", screens[`${room}-result`]).addEventListener("click", () => goBook(isDone(room) ? room : null)));

  // ═════════ 목차 (data-view="toc") ═════════
  const reader = js("book-reader");
  const cover = js("chapter-cover");
  let coverId = null; // 지금 표지(또는 장 안)의 장 id
  let curChapter = null; // 지금 쪽으로 펼친 장 id
  let matchInput = null; // 궁합 상대(메모리만): { type, p } 또는 { map: true }
  function setView(v) {
    finishTurn();
    reader.dataset.view = v;
    show(js("book-toc-open"), currentName === "report" && v !== "toc");
    if (v !== "pages") js("read-label").textContent = "";
    body.classList.toggle("is-reading", currentName === "report" && v === "pages");
  }
  function renderToc() {
    const n = roomsDone();
    const a = currentArchetype();
    const c = myCodes();
    const arch = js("book-home-arch");
    arch.textContent = a ? T.archetypes[a].name : "";
    arch.hidden = !a;
    js("book-home-lede").textContent = n === CHAPTER_ORDER.length ? T.book.toc.ledeAll : n ? fill(T.book.toc.lede, { n }) : T.hub.book.state0;
    jsAll("book-chapter").forEach((li) => {
      const id = li.dataset.chapter;
      const st = chapterState(id);
      li.dataset.state = st;
      if (CHAPTER_ORDER.includes(id)) js("book-chapter-sub", li).textContent = isDone(id) ? headOf(id, c).title : "";
      js("book-chapter-state", li).textContent = st === "need-room" ? needLine(id) : st === "can-open" ? PAY.tocLocked || "" : st === "read" ? T.book.toc.reread : T.book.toc.opened;
      js("book-chapter-time", li).textContent = fill(T.book.time, { n: minutes(chapterChars(id)) });
    });
    const bm = readBookmark();
    const ok = Boolean(bm && available(bm.id));
    show(js("book-resume"), ok);
    if (ok) js("book-resume-text").textContent = fill(T.book.toc.resume, { chapter: chapterName(bm.id), page: bm.page });
    Disclaimer.mount(js("disclaimer-slot", reportScr));
  }
  function showToc() {
    clearForms();
    coverId = null;
    setView("toc");
    renderToc();
    loadFile(FREE_FILE).catch(() => {}); // 목차를 처음 열 때 여는 글·닫는 글 (무료 맛보기)
    window.scrollTo(0, 0);
    track("so_book", { step: "toc" });
  }
  enter.report = () => {
    const id = coverNext;
    coverNext = null;
    if (id && available(id)) openCover(id);
    else showToc();
  };
  leave.report = () => {
    finishTurn();
    clearForms();
    matchInput = null;
  };
  jsAll("book-chapter-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const li = btn.closest("[data-js=book-chapter]");
      if (li.dataset.state === "need-room") return toast(js("book-chapter-state", li).textContent); // 안내만 (강제 순서 그대로)
      if (li.dataset.state === "can-open") return goPay(); // (14-4) 결제 전 → 결제 전 화면
      openCover(li.dataset.chapter);
    })
  );
  js("book-resume").addEventListener("click", () => resume());
  js("book-toc-open").addEventListener("click", () => showToc());
  js("book-cover-toc").addEventListener("click", () => showToc());
  js("chapter-end-toc").addEventListener("click", () => showToc());

  // ═════════ 장 표지 (data-view="cover") ═════════
  const mY = js("book-match-year"), mM = js("book-match-month"), mD = js("book-match-day"), mName = js("book-match-name");
  const fY = js("book-flow-year"), fM = js("book-flow-month"), fD = js("book-flow-day");
  digitsOnly(mY, mM);
  digitsOnly(mM, mD);
  digitsOnly(mD);
  digitsOnly(fY, fM);
  digitsOnly(fM, fD);
  digitsOnly(fD);
  const typeInputs = jsAll("book-match-type-input");
  function setErr(el, msg) {
    el.textContent = msg || "";
    show(el, Boolean(msg));
  }
  function clearForms() {
    [mName, mY, mM, mD, fY, fM, fD].forEach((el) => (el.value = ""));
    typeInputs.forEach((r) => (r.checked = false));
    js("book-match-type").removeAttribute("aria-invalid");
    setErr(js("book-match-error"), "");
    setErr(js("book-flow-error"), "");
  }
  typeInputs.forEach((r) => r.addEventListener("change", () => js("book-match-type").removeAttribute("aria-invalid")));
  function setCoverState(st) {
    cover.dataset.state = st;
    syncOpenBtn();
  }
  function syncOpenBtn() {
    const b = js("book-chapter-open");
    const f = loadState[coverId] === "loading";
    b.classList.toggle("is-fetching", f);
    b.disabled = f;
    if (f) b.setAttribute("aria-busy", "true");
    else b.removeAttribute("aria-busy");
  }
  const needsFlowDate = (id) => id === "flow" && !state.profile.birth;
  function openCover(id, keep) {
    if (!available(id)) return showToc();
    if (!isOpen(id)) return goPay();
    if (!keep || coverId !== id) {
      clearForms();
      matchInput = null;
    }
    coverId = id;
    setView("cover");
    cover.dataset.chapter = id;
    const room = CHAPTER_ORDER.includes(id);
    const c = myCodes();
    js("chapter-cover-part").textContent = room ? T.book.part1.num : PART0.has(id) ? "" : T.book.part2.num;
    const mark = $(`[data-js=book-chapter][data-chapter="${id}"] .chapter-row__mark`, reportScr);
    js("chapter-cover-mark").innerHTML = room && mark ? mark.innerHTML : "";
    js("chapter-cover-title").textContent = chapterName(id);
    const h = room ? headOf(id, c) : null;
    const res = js("chapter-cover-result"), key = js("chapter-cover-key"), hid = js("chapter-cover-hidden-row");
    res.textContent = h ? h.title : "";
    key.textContent = h ? h.key : "";
    res.hidden = key.hidden = !h;
    hid.hidden = true; // 숨은 장 제목(결정 65 공개 떡밥)은 그 방 파일이 오면 채운다
    js("chapter-cover-volume").textContent = volumeLabel(chapterChars(id));
    const flowForm = js("book-flow-date");
    flowForm.hidden = !needsFlowDate(id);
    cover.classList.toggle("has-form", needsFlowDate(id));
    setCoverState("open"); // (14-2) 광고 잠금 은퇴: 열 수 있는 장은 곧바로 열림
    window.scrollTo(0, 0);
    track("so_book", { step: "cover", chapter: id });
    // 표지를 여는 순간 받기 시작한다(광고를 보는 동안 받음, 13-5)
    fetchChapter(id).then((ok) => {
      if (coverId !== id) return;
      if (ok && room) {
        const C = BookCore.contentFrom(window);
        const e = BookCore.hiddenEntry(C, id, c);
        js("chapter-cover-hidden").textContent = e ? (id === "saju" ? sajuHiddenTitle(c) : e.title) : "";
        hid.hidden = !e;
      }
      if (!ok && cover.dataset.state === "open" && reader.dataset.view === "cover") setCoverState("fail");
    });
  }
  // 입력 확인 (광고 전에, 13-1). 궁합: 상대 이름·생년월일·관계 유형 / 시기별 흐름: 이 탭에 생년월일이 없을 때만
  function prepare(id, noPartner) {
    if (id === "match") {
      if (noPartner) return (matchInput = { map: true });
      const E = T.book.match.errors;
      const name = mName.value.trim();
      const y = Number(mY.value), m = Number(mM.value), d = Number(mD.value);
      const type = (typeInputs.find((r) => r.checked) || {}).value || null;
      const typeBox = js("book-match-type");
      if (type) typeBox.removeAttribute("aria-invalid");
      let msg = "";
      let p = null;
      if (!name) msg = E.name;
      else if (!(mY.value.length === 4 && Calc.validDate(y, m, d))) msg = E.date;
      else if (!(p = partnerOf(name, { y, m, d }))) msg = E.name;
      else if (!type) {
        msg = E.type;
        typeBox.setAttribute("aria-invalid", "true");
      }
      setErr(js("book-match-error"), msg);
      if (msg) {
        (!name || !p ? mName : !type ? typeInputs[0] : mY).focus();
        return null;
      }
      return (matchInput = { type, p });
    }
    if (needsFlowDate(id)) {
      const y = Number(fY.value), m = Number(fM.value), d = Number(fD.value);
      const ok = fY.value.length === 4 && Calc.validDate(y, m, d);
      setErr(js("book-flow-error"), ok ? "" : T.book.flow.error);
      if (!ok) {
        fY.focus();
        return null;
      }
      state.profile.birth = { y, m, d }; // 6장 예외: 이 탭의 profile에만 (고지는 입력칸 아래 book-flow-notice)
      save();
    }
    return {};
  }
  async function openNow(noPartner) {
    const id = coverId;
    if (!id || !isOpen(id) || cover.dataset.state === "waiting") return;
    const pre = prepare(id, noPartner);
    if (!pre) return;
    const ok = await fetchChapter(id);
    if (coverId !== id) return;
    if (!ok) return setCoverState("fail");
    readChapter(id, pre, 0);
  }
  js("book-chapter-open").addEventListener("click", () => openNow(false));
  js("book-match-nopartner").addEventListener("click", () => openNow(true));
  js("book-load-retry").addEventListener("click", () => {
    const id = coverId;
    fetchChapter(id).then((ok) => coverId === id && ok && setCoverState("open"));
  });
  // 이어 읽기: 같은 탭에서만. 궁합은 상대 정보가 메모리에서 사라졌으므로 표지(입력)로, 복원한 탭 등 열림 표시가 없으면 표지로
  async function resume() {
    const bm = readBookmark();
    if (!bm || !available(bm.id)) return;
    if (bm.id === "match" || needsFlowDate(bm.id) || !isOpen(bm.id)) return openCover(bm.id);
    openCover(bm.id);
    const ok = await fetchChapter(bm.id);
    if (ok && coverId === bm.id && reader.dataset.view === "cover") readChapter(bm.id, {}, bm.page - 1);
  }

  // ═════════ 장 원본 채우기 (book-source에는 지금 연 장 하나만) ═════════
  // 4장 근거: 결과 코드 + 무료 데이터
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
  // 룬·시빌라 넷째 장 끝 "고른 주제" 단락: 이 탭에 같은 결과가 남아 있을 때만
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
  // 방별 장 Ⅰ장 앞부분: 방에서 본 핵심 풀이를 결과 코드로 공개 data에서 다시 조립 (identity.lede + body + ch1Rest)
  function bookCh1(room, c, rest) {
    if (room === "saju") {
      // (14단계) Ⅰ 만신 장 Ⅰ장 = data-saju.js stems[일간].identity(title·lede) + body(S1) + 유료 identity.rest (book-saju.js 머리 주석)
      const st = SAJU.stems[BookCore.sajuStem(c.saju)];
      return [{ text: strip(st.identity.title), sub: true }].concat([st.identity.lede, ...st.body, ...(rest || [])].map((t) => ({ text: strip(t) })));
    }
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
  // 궁합 M5: 상대의 오검·데칸·촐킨 공개 결과 이름 + key
  const peeksOf = (p) => [
    { room: T.rooms.ogham.name, name: strip(OGHAM[p.ogham].title), key: strip(OGHAM[p.ogham].key) },
    { room: T.rooms.decan.name, name: strip(DECANS[p.decan].title), key: strip(DECANS[p.decan].key) },
    { room: T.rooms.tzolkin.name, name: strip(TZ_SIGNS[p.tzSign].name), key: strip(TZ_SIGNS[p.tzSign].key) },
  ];
  function renderChapter(id, pre) {
    clearSource();
    const C = BookCore.contentFrom(window);
    const c = myCodes();
    const me = c.arch;
    const R = T.report;
    if (id === "open" || id === "close") paras(js(id === "open" ? "report-open" : "report-close"), (id === "open" ? BookCore.openChapter : BookCore.closeChapter)(C, me).paragraphs);
    else if (id === "deep") {
      const d = BookCore.deepChapter(C, me);
      paras(js("report-deep-strength"), d.strength);
      paras(js("report-deep-shadow"), d.shadow);
      paras(js("report-deep-growth"), d.growth);
      js("report-evidence").innerHTML = evidenceFromCodes(c);
    } else if (id === "flow") {
      const tl = js("report-timeline");
      BookCore.timelineChapter(C, me, c.band).stages.forEach((s) => {
        const el = tpl.stage.cloneNode(true);
        textIn(el);
        el.classList.toggle("is-now", s.now);
        js("timeline-age", el).textContent = fill(s.now ? R.stageNow : s.past ? R.stagePast : R.stageNext, { label: s.label });
        ["work", "relation", "learn", "move"].forEach((k) => (js(`timeline-${k}`, el).textContent = s[k]));
        tl.append(el);
      });
    } else if (id === "match") {
      const pair = js("report-match-pair").children;
      pair[0].textContent = T.archetypes[me].name;
      let m;
      if (pre.p) {
        const mine = mineForRelation(state.profile.birth || null);
        const codes = Object.assign({ arch: me, partner: pre.p.arch }, relations(mine, pre.p));
        m = BookCore.matchChapter(C, codes, C.bond, { type: pre.type, mine, partner: pre.p, peeks: peeksOf(pre.p) });
      } else m = BookCore.mapChapter(C, me);
      pair[2].textContent = m.you ? T.archetypes[m.you].name : R.mapYou;
      const bodyEl = js("report-match");
      paras(bodyEl, m.you ? [m.summary].concat(m.paragraphs) : []);
      show(bodyEl, Boolean(m.you));
      const list = js("report-match-rooms");
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
      paras(matchEnd, m.end ? [m.end] : []);
    } else {
      const el = $(`[data-js=book-room][data-room="${id}"]`, src);
      const fr = BookCore.fullRoom(C, id, c);
      show(el, true);
      const h = headOf(id, c);
      js("book-room-result", el).textContent = h.title;
      js("book-room-key", el).textContent = h.key;
      rich(js("book-ch1", el), bookCh1(id, c, fr.ch1Rest));
      paras(js("book-ch2", el), fr.ch2);
      paras(js("book-ch3", el), fr.ch3);
      const tail = topicTail(fr, c);
      paras(js("book-ch4", el), tail ? fr.ch4.concat(tail) : fr.ch4);
      paras(js("book-hidden", el), [id === "saju" ? sajuHiddenTitle(c) : fr.hidden.title].concat(fr.hidden.paragraphs));
    }
    // 장 끝 쪽: 다음 장(열 수 있는 다음 장, 잠겼으면 그 장 표지) + 목차로
    const next = BOOK_IDS.slice(BOOK_IDS.indexOf(id) + 1).find(available) || null;
    js("chapter-end-name").textContent = chapterName(id);
    const nb = js("chapter-end-next");
    nb.dataset.next = next || "";
    nb.classList.toggle("is-hidden", !next);
    js("chapter-end-next-name").textContent = next ? chapterName(next) : "";
    const ns = js("chapter-end-next-state");
    ns.textContent = next && !isOpen(next) ? PAY.tocLocked || "" : "";
  }
  js("chapter-end-next").addEventListener("click", (e) => {
    const next = e.currentTarget.dataset.next;
    if (!next || !available(next)) return showToc();
    if (next === "match" || needsFlowDate(next) || !isOpen(next)) return openCover(next);
    openCover(next);
    fetchChapter(next).then((ok) => ok && coverId === next && reader.dataset.view === "cover" && readChapter(next, {}, 0));
  });
  function readChapter(id, pre, page) {
    renderChapter(id, pre);
    curChapter = id;
    coverId = id;
    book = null;
    paginate();
    setView("pages");
    setPage(Math.min(Math.max(0, page || 0), book.pages.length - 1), { focus: true });
    track("so_book", { step: "read", chapter: id });
  }

  // ═════════ (결정 53) 책을 넘기는 리더: book-source → 쪽 나누기 → 넘기기. 13단계부터 장 하나가 작은 책 ═════════
  // 장은 늘 새 쪽에서 시작. 단락은 넘치면 문장 끝(없으면 어절 경계)에서 나눠 다음 쪽 .is-cont로. unit은 통째로 다음 쪽.
  // 장 끝 쪽(chapter-end)은 복제하지 않고 옮겨 쓴다(훅·이벤트 그대로). 다시 나누기 전 source로 되돌린다.
  const bookStage = js("book-stage");
  const pagesBox = js("book-pages");
  const src = js("book-source");
  const srcEnd = [js("chapter-end", src)];
  const TURN_SAFETY = 700; // animationend가 오지 않을 때의 안전장치 (--turn-dur 520ms)
  let book = null; // { pages: [{ el, part, chap, label }], chapStart, chapLen, key }
  let cur = 0;
  let turning = false;
  let turnDone = null;
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
  const visible = (n) => n && !n.classList.contains("is-hidden");
  const parasOf = (box) => (visible(box) ? [...box.children].filter((p) => p.textContent.trim()).map((p) => ({ kind: "p", node: stripHooks(p.cloneNode(true)) })) : []);
  const wrapUnit = (parent, child) => {
    const w = parent.cloneNode(false);
    w.append(child.cloneNode(true));
    return stripHooks(w);
  };
  const unitsOf = (list) => (visible(list) ? [...list.children].map((li) => ({ kind: "unit", node: wrapUnit(list, li) })) : []);

  // 지금 연 장 하나 → 쪽 묶음 목록 (방별 장은 Ⅰ~Ⅳ장·숨은 장마다 새 쪽) + 장 끝 쪽
  function bookChapters() {
    const B = T.book;
    const R = T.report;
    const CN = T.result.chapterNames;
    const id = curChapter;
    const name = chapterName(id);
    const C = [];
    const openBlk = (node) => ({ kind: "open", node });
    const one = (key, title, blocks, extra) => C.push(Object.assign({ key, part: id, label: name, run: [name], start: true, blocks: [openBlk(chOpening(title)), ...blocks] }, extra || {}));
    if (id === "open") one("open", R.parts.open, parasOf(js("report-open", src)));
    else if (id === "close") one("close", R.parts.close, parasOf(js("report-close", src)));
    else if (id === "flow") {
      const stages = unitsOf(js("report-timeline", src)).map((u) => Object.assign(u, { kind: "stage" }));
      one("flow", B.parts.timeline, stages, { stages: true, run: [B.part2.num, B.parts.timeline] });
    } else if (id === "match") {
      one("match", B.parts.match, [{ kind: "unit", node: stripHooks(js("report-match-pair", src).cloneNode(true)) }, ...parasOf(js("report-match", src)), ...unitsOf(js("report-match-rooms", src)), ...parasOf(matchEnd)], { run: [B.part2.num, B.parts.match] });
    } else if (id === "deep") {
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
      const ev = js("report-evidence", src);
      one("deep", B.parts.deep, deep.concat(ev.children.length ? [{ kind: "unit", node: stripHooks(ev.cloneNode(true)) }] : []), { run: [B.part2.num, B.parts.deep] });
    } else {
      const r = $(`[data-js=book-room][data-room="${id}"]`, src);
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
    }
    C.push({ key: "end", part: id, label: name, run: [name], cls: "book-page--end", blocks: srcEnd.map((node) => ({ kind: "unit", node })) });
    return C;
  }

  const over = (bd) => bd.scrollHeight > bd.clientHeight + 1;
  function newPage(ch, first) {
    const p = mk("article", "book-page" + (ch.cls ? " " + ch.cls : "") + (first && ch.firstCls ? " " + ch.firstCls : ""));
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
    // (11단계 F1 ①) 들어가는 범위 안의 마지막 문장 끝에서 자른다. 문장 끝이 없으면(한 문장이 남은 칸보다 김) 어절 경계 — 개수는 F1STAT.wordCut
    let k = lo;
    while (k > 0 && !SENT_END.test(words.slice(0, k).join("").trimEnd())) k--;
    // 장 머리만 있는 쪽에서 문장 끝으로 잘라 50자 미만만 남으면, 그 조각도 남기지 않고 단락째 다음 쪽(장 표제지)
    const direct = node.parentElement === bd;
    const headPage = direct && [...bd.children].every((c) => c === node || isHead(c));
    if (k > 0 && headPage && [...words.slice(0, k).join("").replace(/s+/g, " ").trim()].length < SHORT_END) k = 0;
    if (k === 0) {
      // (11단계 C5 필수 5) 문장 끝이 남은 칸 안에 없으면 어절 경계로 자르지 않고 단락째 다음 쪽(장 첫 쪽도 예외 없음).
      // 이 쪽에 장 머리만 남으면 그 쪽은 장 표제지(.is-solo)가 된다. 빈 쪽에서도 첫 문장이 안 들어가는 극단만 어절 경계(F1STAT.wordCut)
      const others = [...bd.children].filter((c) => c !== node);
      if (direct && others.length) {
        node.textContent = text;
        node.remove();
        // 이 쪽에 남는 글이 장 머리 + 50자 미만 단락뿐이면 그 짧은 단락도 함께 다음 쪽으로(F1STAT.carry → place가 새 쪽 맨 앞에 담는다)
        const rest0 = others.filter((c) => !isHead(c));
        if (rest0.length && others.some(isHead) && bodyChars(bd) < SHORT_END) {
          rest0.forEach((c) => c.remove());
          F1STAT.carry = rest0;
        }
        if (onlyHeads(bd)) bd.parentElement.classList.add("is-solo"); // 장 표제지 (머리만, 50자 미만 단락·어절 경계 대신)
        return [node, false];
      }
      k = lo;
      F1STAT.wordCut++;
    }
    node.textContent = words.slice(0, k).join("").trimEnd();
    const rest = node.cloneNode(false);
    rest.textContent = words.slice(k).join("");
    return [rest, true];
  }
  const SENT_END = /[.?!…][”’"')\]」』]*$/;
  const F1STAT = { wordCut: 0, longStage: 0 }; // tests.md 보고용 (쪽 나누기마다 새로 센다)
  const isHead = (c) => c.classList.contains("book-opening");
  const onlyHeads = (bd) => [...bd.children].every(isHead);
  // 본문 글자 수 (공백 포함, 머리 장식 제외, 연속 공백은 하나로)
  const bodyChars = (bd) => {
    const c = bd.cloneNode(true);
    c.querySelectorAll(".book-opening").forEach((o) => o.remove());
    return [...c.textContent.replace(/\s+/g, " ").trim()].length;
  };
  // 빈 쪽 하나에 통째로 들어가는 단락인가 / 이 쪽에 남은 줄 수
  const lineH = (n) => parseFloat(getComputedStyle(n).lineHeight) || 30;
  const roomOf = (bd) => {
    const cs = getComputedStyle(bd);
    return bd.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  };
  const fitsEmpty = (node, bd) => node.getBoundingClientRect().height + (parseFloat(getComputedStyle(node).marginTop) || 0) <= roomOf(bd);
  const linesLeft = (node, bd) => {
    const r = bd.getBoundingClientRect();
    const bottom = r.top + bd.clientHeight - parseFloat(getComputedStyle(bd).paddingBottom);
    return Math.floor((bottom - node.getBoundingClientRect().top) / lineH(node));
  };
  // 시기별 흐름 구간 하나 → [나이 + 일 + 관계] / [나이(이어서) + 배움 + 이동]
  function splitStage(node) {
    const li = node.firstElementChild;
    const age = li && li.querySelector(".timeline__age");
    const dl = li && li.querySelector(".timeline__areas");
    if (!age || !dl || dl.children.length < 4) return null;
    const kids = [...dl.children];
    const half = (list, cont) => {
      const w = node.cloneNode(false);
      const l = li.cloneNode(false);
      const a = age.cloneNode(true);
      if (cont) {
        a.classList.add("is-cont");
        a.textContent = age.textContent + T.common.sep + T.book.timelineCont;
      }
      const d = dl.cloneNode(false);
      list.forEach((k) => d.append(k.cloneNode(true)));
      l.append(a, d);
      w.append(l);
      return w;
    };
    return [half(kids.slice(0, 2)), half(kids.slice(2), true)];
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
  // (11단계 F1 ②, R53-2 대체) 장의 마지막 쪽 글이 50자 미만이면 앞 쪽의 마지막 블록(단락 또는 나뉜 단락의 조각)을 함께 넘긴다.
  // 여전히 50자 미만이면 한 블록 더. 앞 쪽이 장 머리만 남게 되거나, 넘긴 뒤 마지막 쪽이 넘치면 멈춘다(되돌림)
  const SHORT_END = 50;
  function fixShortEnd(pages, from) {
    for (let guard = 0; guard < 6; guard++) {
      if (pages.length - from < 2) return;
      const lastBd = js("book-page-body", pages[pages.length - 1].el);
      if (bodyChars(lastBd) >= SHORT_END) return;
      const prevBd = js("book-page-body", pages[pages.length - 2].el);
      const blk = prevBd.lastElementChild;
      if (!blk || isHead(blk)) return;
      const left = [...prevBd.children].filter((c) => c !== blk);
      if (!left.length || left.every(isHead)) return;
      const first = lastBd.firstElementChild;
      if (first && first.matches("p.is-cont") && blk.tagName === "P" && !blk.children.length && !first.children.length) {
        // 같은 단락의 앞 조각 + 뒤 조각 → 한 단락으로 합쳐 마지막 쪽에
        const [oldText, oldCls] = [first.textContent, first.className];
        first.textContent = blk.textContent.trimEnd() + " " + first.textContent;
        first.className = blk.className;
        blk.remove();
        if (over(lastBd)) {
          [first.textContent, first.className] = [oldText, oldCls];
          prevBd.append(blk);
          return;
        }
      } else {
        lastBd.prepend(blk);
        if (over(lastBd)) {
          prevBd.append(blk);
          if (!moveTail(blk, lastBd)) return; // 통째로는 넘치면 끝 문장부터 하나씩만 함께 넘긴다
        }
      }
    }
  }
  // 앞 쪽 단락의 끝 문장들을 마지막 쪽 맨 앞으로(문장 끝에서만 자른다). 마지막 쪽이 50자 이상이 되거나 넘치기 직전까지
  function moveTail(blk, lastBd) {
    if (blk.tagName !== "P" || blk.children.length) return false;
    const text = blk.textContent;
    const sents = text.match(/[^]*?[.?!…]+[”’"')]」』]*(?:s+|$)/g);
    if (!sents || sents.join("") !== text || sents.length < 2) return false;
    const first = lastBd.firstElementChild;
    const join = Boolean(first && first.matches("p.is-cont") && !first.children.length); // 마지막 쪽이 blk의 뒷조각으로 시작
    const orig = join ? first.textContent : "";
    let frag = join ? first : null;
    let k = sents.length;
    const set = (n) => {
      blk.textContent = sents.slice(0, n).join("").trimEnd();
      const tail = sents.slice(n).join("").trimEnd();
      frag.textContent = join ? (tail ? tail + " " + orig : orig) : tail;
    };
    let moved = false;
    while (k > 1 && bodyChars(lastBd) < SHORT_END) {
      if (!frag) {
        frag = blk.cloneNode(false);
        frag.classList.add("is-cont");
        frag.classList.remove("has-dropcap");
        lastBd.prepend(frag);
      }
      set(k - 1);
      if (over(lastBd)) {
        set(k);
        break;
      }
      k--;
      moved = true;
    }
    if (!moved) {
      blk.textContent = text;
      if (frag && !join) frag.remove();
      else if (join) first.textContent = orig;
    }
    return moved;
  }

  function paginate() {
    const t0 = performance.now();
    F1STAT.wordCut = 0;
    F1STAT.longStage = 0;
    srcEnd.forEach((n) => src.append(n)); // 옮겨 쓴 장 끝 쪽을 원본 자리로
    pagesBox.textContent = "";
    const view = reader.dataset.view;
    reader.dataset.view = "pages"; // 재려면 무대가 보여야 한다 (같은 작업 안에서 되돌리므로 화면에 그려지지 않음)
    const pages = [];
    const chapStart = {};
    const chapLen = {};
    bookChapters().forEach((ch) => {
      chapStart[ch.key] = pages.length;
      let bd = null;
      const start = () => {
        const first = pages.length === chapStart[ch.key];
        const page = newPage(ch, first);
        if (ch.start && first) page.classList.add("is-chapter-start");
        bd = js("book-page-body", page);
        pages.push({ el: page, part: ch.part, chap: ch.key, label: ch.label });
      };
      // (F1 ③) 구간 하나를 이 쪽에: 통째 → 아니면 2 + 2(앞 반쪽이 이 쪽, 뒤 반쪽은 새 쪽). 아무것도 못 놓으면 false
      const fitStage = (node) => {
        bd.append(node);
        if (!over(bd)) return true;
        node.remove();
        const h = splitStage(node);
        if (!h) return false;
        bd.append(h[0]);
        if (over(bd)) {
          h[0].remove();
          return false;
        }
        start();
        bd.append(h[1]);
        if (!over(bd)) return true;
        h[1].remove();
        flowStage(node, 2, true);
        return true;
      };
      // (F1 ③ 아주 긴 항목) 항목을 차례로 담고, 넘치는 항목은 그 안에서 문장 끝으로 나눠 뒷부분을 다음 쪽 첫 항목으로.
      // 쪽마다 앞 항목의 뒷부분 + 다음 항목이 함께 보이게 한다. from = 시작 항목 번호, cont = 나이 제목에 "이어서"
      const flowStage = (node, from, cont) => {
        F1STAT.longStage++;
        const li = node.firstElementChild;
        const age = li.querySelector(".timeline__age");
        const dl = li.querySelector(".timeline__areas");
        let box = null;
        const open = (c) => {
          const w = node.cloneNode(false);
          const l = li.cloneNode(false);
          const a = age.cloneNode(true);
          if (c) {
            a.classList.add("is-cont");
            a.textContent = age.textContent + T.common.sep + T.book.timelineCont;
          }
          box = dl.cloneNode(false);
          l.append(a, box);
          w.append(l);
          bd.append(w);
        };
        // 이 쪽 마지막 항목의 끝 문장 하나를 떼어 다음 쪽 첫 항목(is-cont)으로. 한 문장뿐이면 allowWhole일 때 통째로
        const pairTail = (allowWhole) => {
          const prev = box.lastElementChild;
          const pdd = prev && prev.querySelector("dd");
          const ptext = pdd && !pdd.children.length ? pdd.textContent : "";
          const sents = ptext.match(/[^]*?[.?!…]+[”’"')\]」』]*(?:\s+|$)/g);
          if (sents && sents.join("") === ptext && sents.length >= 2) {
            pdd.textContent = sents.slice(0, -1).join("").trimEnd();
            const tail = prev.cloneNode(false);
            tail.classList.add("is-cont");
            const d = pdd.cloneNode(false);
            d.textContent = sents[sents.length - 1].trimEnd();
            tail.append(d);
            return tail;
          }
          if (allowWhole && box.children.length >= 3) {
            prev.remove();
            return prev;
          }
          return null;
        };
        open(cont);
        const q = [...dl.children].slice(from).map((x) => x.cloneNode(true));
        while (q.length) {
          const it = q.shift();
          box.append(it);
          if (!over(bd)) continue;
          // (C4 요청) 구간의 마지막 항목이 넘치면 그 뒷부분이 홀로 한 쪽이 된다 → 앞 항목의 끝 문장 하나를 함께 다음 쪽으로 보내
          // 다음 쪽에 항목이 둘 보이게 한다(앞 쪽 항목 수는 그대로). 앞 항목이 한 문장뿐이면 이 쪽에 셋 이상일 때만 통째로 보낸다
          if (!q.length && box.children.length >= 2 && !it.paired) {
            it.remove();
            it.paired = true; // 한 번만 (다음 쪽에서 또 넘치면 아래 보통 나누기)
            const tail = pairTail(box.children.length >= 2);
            if (tail) {
              start();
              open(true);
              box.append(tail);
              q.unshift(it);
              continue;
            }
            box.append(it);
          }
          const dd = it.querySelector("dd");
          const [rest, cut] = dd && !dd.children.length ? splitPara(dd, bd) : [null, false];
          if (cut && rest) {
            const r = it.cloneNode(false);
            r.classList.add("is-cont");
            r.append(rest);
            q.unshift(r);
            start();
            open(true);
            continue;
          }
          if (rest && !rest.parentNode) it.append(rest);
          if (box.children.length > 1) {
            it.remove();
            q.unshift(it);
            start();
            open(true);
          }
        }
      };
      const placeStage = (node) => {
        if (!onlyHeads(bd)) start(); // 구간마다 새 쪽 (부 표제 쪽에서는 이어 담기를 먼저 해 본다)
        if (fitStage(node)) return;
        if (bd.children.length) {
          bd.parentElement.classList.add("is-solo"); // 첫 구간이 안 들어감 → 부 표제 쪽은 가운데 정렬 표제지
          start();
          if (fitStage(node)) return;
        }
        flowStage(node, 0, false); // 아주 긴 항목: 빈 쪽에도 두 항목이 안 들어감
      };
      const place = (node, kind) => {
        bd.append(node);
        if (!over(bd)) return;
        if (kind === "p" && !node.children.length) {
          // (F1 ①) 단락 끝에서만 넘긴다: 빈 쪽 하나에 들어가는 단락이면 통째로 다음 쪽. 남은 칸이 3줄 미만이어도 다음 쪽에서 시작.
          // 장 머리만 있는 쪽에서는 넘기지 않고 이 쪽에서 시작한다(머리만 남는 쪽 금지)
          const others = [...bd.children].filter((c) => c !== node);
          // 넘기면 이 쪽 글이 50자 미만으로 남는 경우(장 머리 + 짧은 단락)는 넘기지 않고 이 쪽에서 문장 끝으로 나눈다(F1 ②와 같은 기준)
          const keep = bodyChars(bd) - [...node.textContent.replace(/s+/g, " ").trim()].length;
          if (others.length && !others.every(isHead) && keep >= SHORT_END && (fitsEmpty(node, bd) || linesLeft(node, bd) < 3)) {
            node.remove();
            start();
            place(node, "p");
            return;
          }
          const [rest, cont] = splitPara(node, bd);
          if (!rest) return;
          start();
          if (F1STAT.carry) {
            F1STAT.carry.forEach((c) => bd.append(c));
            F1STAT.carry = null;
          }
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
        if (b.kind === "stage") return placeStage(b.node);
        if (b.kind === "p" && afterOpen) b.node.classList.add("has-dropcap");
        afterOpen = b.kind === "open";
        place(b.node, b.kind);
      });
      if (ch.start && !ch.stages) fixShortEnd(pages, chapStart[ch.key]);
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
    reader.dataset.view = view;
    book = { pages, chapStart, chapLen, partStart, partEnd, key: sizeKey() };
    reader.dataset.pagedMs = Math.round(performance.now() - t0); // 점검용 (e2e: 쪽 나누기 시간)
    reader.dataset.wordCut = F1STAT.wordCut; // 점검용 (F1: 어절 경계로 넘긴 곳 수 · 아주 긴 시기별 항목 수)
    reader.dataset.longStage = F1STAT.longStage;
  }

  function relayout() {
    if (currentName !== "report" || reader.dataset.view !== "pages" || !curChapter) {
      if (book) book.key = ""; // 장 안으로 돌아올 때 다시 나눈다
      return;
    }
    finishTurn();
    const pg = book && book.pages[cur];
    const anchor = pg ? { chap: pg.chap, off: cur - book.chapStart[pg.chap] } : null;
    paginate();
    let i = 0;
    if (anchor && anchor.chap in book.chapStart) i = book.chapStart[anchor.chap] + Math.min(anchor.off, book.chapLen[anchor.chap] - 1);
    setPage(i, { quiet: true });
  }
  // 다시 나누기: 크기(가로·세로) 변화, 글꼴 도착. 150ms 디바운스
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
    bookStage.classList.toggle("is-first", false); // 첫 쪽의 "이전" = 장 표지 (13-1)
    bookStage.classList.toggle("is-last", i === total - 1);
    js("book-prev").disabled = false;
    js("book-next").disabled = i === total - 1;
    js("book-track-fill").style.setProperty("--p", ((i + 1) / total).toFixed(4));
    if (!reading) return;
    js("read-label").textContent = fill(T.book.chapter.readLabel, { chapter: pg.label, n: i + 1, total });
    writeBookmark(curChapter, i + 1);
    if (!quiet) js("book-live").textContent = fill(T.book.live, { n: i + 1, total, chapter: pg.label });
    if (focus) pg.el.focus({ preventScroll: true });
    if (i === total - 1 && !readSet.has(curChapter)) {
      readSet.add(curChapter);
      track("so_book", { step: "done", chapter: curChapter });
    }
  }
  const backToCover = () => {
    finishTurn();
    openCover(curChapter, true);
  };

  // 한 쪽 넘기기: 넘기는 동안 들어온 입력은 버린다. 움직임 줄이기는 turn class 없이 is-current만
  function finishTurn() {
    if (turnDone) turnDone();
  }
  function turn(dir) {
    if (!book || turning || reader.dataset.view !== "pages") return;
    const to = cur + dir;
    if (to < 0) return backToCover();
    if (to >= book.pages.length) return;
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

  // ── 책 카드(기존 소장 카드, share-card.js frame "keepsake"). 원형·여섯 문양만 — 상대·이름·생일·코드 없음
  const ROOM_GLYPH = {
    rune: () => ({ path: symbolPath("rune-raidho"), vw: 40, vh: 60 }),
    star: () => ({ path: "M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z", vw: 40, vh: 40, fill: true }),
    ogham: () => ({ path: symbolPath("ogham-beith"), vw: 40, vh: 80 }),
    decan: () => ({ path: symbolPath("icon-decan"), vw: 40, vh: 40 }),
    tzolkin: () => ({ path: symbolPath("icon-tzolkin"), vw: 40, vh: 40 }),
    sibyl: () => ({ path: symbolPath("icon-sibyl"), vw: 40, vh: 40 }),
  };
  function buildKeepsakeCard() {
    const C = BookCore.contentFrom(window);
    const c = myCodes();
    const K = T.keepsake;
    const me = T.archetypes[c.arch].name;
    const keyword = c.band != null && C.timeline ? BookCore.timelineStages(C, c.arch, c.band).find((s) => s.now).keyword : "";
    const close = (C.close || []).find((e) => e.code === c.arch);
    return {
      file: K.file, text: strip(K.shareText),
      opts: {
        theme: Object.assign({}, CARD_THEME.story, { wax: "#7c2a22", waxRim: "#9a3a2c" }), frame: "keepsake", seed: 211,
        topBadge: strip(K.badge),
        title: me, titleSize: 96,
        pair: { text: strip(K.map) },
        keyword,
        roomGrid: { cells: CHAPTER_ORDER.map((room) => Object.assign(ROOM_GLYPH[room](), { color: CARD_THEME[room].accent, done: c[room] != null })) },
        closeLine: { text: close ? close.cardLine : "", maxLines: 2 },
      },
    };
  }
  js("report-share").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!currentArchetype()) return;
    try {
      await Promise.all([loadFile(FREE_FILE), isOpen("flow") ? loadPaid("flow") : null]); // 시기별 흐름 낱말은 결제한 탭에서만, 아니면 빈칸
    } catch (err) {
      return toast(T.toast.shareFail);
    }
    shareCard(btn, buildKeepsakeCard);
  });

  // ── 시작: 마크업 견본 비우기, 옛 영수증 칸 정리 (주소의 query는 시작할 때 지운다 — 광고·분석은 그 뒤에만)
  function bookBoot() {
    if (!BOOK_ON) return offStrip();
    clearSource();
    updateBookLines();
  }
  // (14-4 off, 결정 94) 본 페이지: 결제 화면·열람 코드 칸·책(목차·장·여는/닫는 글)·방 결과의 책 한 줄·입구 책 카드·나의 이야기 책 버튼·FAQ 책 문답을
  // DOM에서 걷어 낸다(숨김이 아니라 제거 → DOM 0개). pay-tpl template은 꺼내지 않고 지운다. "준비 중" 같은 문구도 없다
  function offStrip() {
    const gone = [reportScr, js("pay-tpl"), js("hub-book"), js("story-book"), ...jsAll("result-book-line")];
    const faq = $('[data-t="hub.faq.items.4.q"]');
    if (faq) gone.push(faq.closest(".faq__item"));
    gone.forEach((el) => el && el.remove());
    delete screens.report;
  }

  // ═════════ (14단계 14-4) 결제 전 화면 (test·live에서만 template에서 꺼냄) ═════════
  // 순서 고정: 1 받는 것 → 2 가격 → 3 구매처 → 4 열람 방법 → 5 환불·청약철회 → 6 동의 → 7 구매하러 가기 → 8 열람 코드 넣기.
  // 결제 SDK·토스 로더·영수증 코드(SO1)는 없다. 열람 코드 칸은 이어가기 칸 규칙(제출 폼 아님, name 없음, autocomplete off, console·주소·분석에 넣지 않음).
  let payScr = null;
  function goPay() {
    if (payScr) go("deeper");
  }
  if (BOOK_ON) {
    const tplEl = js("pay-tpl");
    tplEl.after(tplEl.content.cloneNode(true));
    tplEl.remove();
    payScr = js("screen-deeper");
    screens.deeper = payScr;
    applyText(payScr);
    const pass = { input: js("pass-input", payScr), err: js("pass-error", payScr), status: js("pass-status", payScr), panel: js("pass-panel", payScr), toggle: js("pass-toggle", payScr), go: js("pass-go", payScr) };
    const agree = js("pay-agree", payScr), buy = js("pay-buy", payScr);
    const store = (PAY.stores && PAY.stores.ko) || {};
    const syncBuy = () => buy.setAttribute("aria-disabled", String(!store.url || !agree.checked));
    const passMsg = (kind) => {
      pass.err.dataset.kind = kind || "";
      pass.err.textContent = kind ? PAY.pass.errors[kind] || "" : "";
      show(pass.err, Boolean(kind)); // 문구 칸이 비어 있어도(F5 전) 자리는 보인다
    };
    enter.deeper = () => {
      const list = js("pay-chapters", payScr);
      list.textContent = "";
      let sum = 0;
      [...PAID_IDS].forEach((id) => {
        const n = chapterChars(id);
        sum += n;
        const li = document.createElement("li");
        li.className = "pay-list__item";
        const a = document.createElement("span");
        a.className = "pay-list__name";
        a.textContent = chapterName(id);
        const b = document.createElement("span");
        b.className = "pay-list__vol";
        b.textContent = fill(PAY.what.item || "", { n: comma(Math.round(n / 100) * 100) });
        li.append(a, b);
        list.append(li);
      });
      js("pay-total", payScr).textContent = fill(PAY.what.total || "", { n: (Math.round(sum / 1000) / 10).toLocaleString("ko-KR") });
      js("pay-price", payScr).textContent = fill(PAY.price.text || "", { price: comma(PAY.amount) });
      js("pay-price-unit", payScr).textContent = PAY.price.unit || "";
      js("pay-store-name", payScr).textContent = store.name || "";
      show(js("pay-test-band", payScr), PAY_MODE === "test");
      show(js("pay-refund-link", payScr), false); // legal/refund.html은 13단계에 은퇴해 배포 폴더에 없다 → 링크 숨김 (14-3 legal은 F5)
      buy.href = store.url || "#";
      show(js("pay-store-empty", payScr), !store.url);
      syncBuy();
      passMsg("");
      show(pass.status, false);
      window.scrollTo(0, 0);
      track("so_pay", { step: "view" });
    };
    leave.deeper = () => {
      pass.input.value = "";
      passMsg("");
    };
    agree.addEventListener("change", syncBuy);
    buy.addEventListener("click", (e) => {
      if (buy.getAttribute("aria-disabled") === "true") return e.preventDefault();
      track("so_pay", { step: "store" });
    });
    if (PAY.verify === "none") js("pass-enter", payScr).remove();
    else {
      pass.toggle.addEventListener("click", () => {
        const open = pass.toggle.getAttribute("aria-expanded") !== "true";
        pass.toggle.setAttribute("aria-expanded", String(open));
        show(pass.panel, open);
        if (open) pass.input.focus();
      });
      let busy = false;
      const submit = async () => {
        if (busy) return;
        const r = window.PayCode.Pass.check(pass.input.value);
        if (r.error) return passMsg(r.error); // receipt(SO1) · resume(SOG) · shape — 서버에 묻지 않는다
        busy = true;
        pass.go.disabled = true;
        passMsg("");
        const res = await callBook(r.pass, "arch");
        busy = false;
        pass.go.disabled = false;
        if (!res.ok) {
          track("so_pay", { step: "pass_fail" });
          return passMsg(res.kind);
        }
        writePass(r.pass);
        window.BOOK_ARCH = res.data;
        pass.input.value = "";
        track("so_pay", { step: "pass_ok" });
        toast(PAY.pass.ok || "");
        go("report");
      };
      pass.go.addEventListener("click", submit);
      pass.input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        submit();
      });
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

  // ═════════ GA4 (common/analytics.js) — (14-2) 광고는 걷어 냈다. common/ads.js는 저장소에 그대로 두고 부르지 않는다 ═════════
  // 분석은 주소에 query가 없을 때만 시작한다(시작할 때 query를 지운 뒤, 부품도 스스로 다시 확인).
  // 분석 이벤트 값은 아래 허용 목록 안의 낱말뿐이다: 방 이름, 원형 코드, 단계·방법 이름. 입력값·세부 번호·코드·성별은 실릴 자리가 없다(6장).
  const EVENTS = {
    so_visit: {},
    so_room_view: { room: CHAPTER_ORDER },
    so_result: { room: CHAPTER_ORDER, archetype: ARCHETYPES },
    so_story: { step: ["3of6", "6of6"] },
    so_share: { room: CHAPTER_ORDER, method: ["image", "link", "kakao"] },
    so_resume: { step: ["made", "used", "failed"] },
    so_book: { step: ["toc", "cover", "read", "done"], chapter: BOOK_IDS }, // (13단계 13-8) 옛 preview·pay_click은 뺌
    so_pay: { step: ["view", "store", "pass_ok", "pass_fail"] }, // (14-4) 단계 이름만. 코드·결과 코드 없음 (off에서는 부르지 않음)
  };
  let booted = false;
  let externalOn = false;
  function startExternal() {
    if (!booted || externalOn || location.search) return;
    externalOn = true;
    if (Analytics.init({ ga4: T.analytics.ga4, title: T.meta.title, events: EVENTS })) track("so_visit");
  }
  function track(name, props) {
    if (externalOn) Analytics.track(name, props);
  }
  const storySent = new Set();
  function onScreen(name, scr) {
    if (!externalOn) return;
    const room = roomOfScreen(name);
    if (CHAPTER_ORDER.includes(room) && name === `${room}-intro`) track("so_room_view", { room });
    if (CHAPTER_ORDER.includes(room) && name === `${room}-result` && state.visits[room]) track("so_result", { room, archetype: state.visits[room].archetype });
    if (name === "story") {
      const n = filledRooms().length;
      [["3of6", n >= 3], ["6of6", n === CHAPTER_ORDER.length]].forEach(([step, ok]) => {
        if (!ok || storySent.has(step)) return;
        storySent.add(step);
        track("so_story", { step });
      });
    }
  }

  // 입구: 쿠키 한 줄(GA4 ID가 있을 때만)
  js("cookie-line").hidden = !Analytics.configured(T.analytics.ga4);

  // 공유 이벤트: 방법만 (공유 글·주소·카드 내용은 보내지 않는다)
  const shareRoom = () => {
    const room = roomOfScreen(currentName);
    return CHAPTER_ORDER.includes(room) ? { room } : {};
  };
  ["result-share", "result-share-top"].forEach((n) => CHAPTER_ORDER.forEach((room) => js(n, screens[`${room}-result`]).addEventListener("click", () => track("so_share", { room, method: "image" }))));
  ["story-share", "story-share-top"].forEach((n) => js(n, storyScr).addEventListener("click", () => track("so_share", { method: "image" })));
  document.addEventListener("click", (e) => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('[data-js="share-link-copy"]')) track("so_share", Object.assign(shareRoom(), { method: "link" }));
    else if (t.closest('[data-js="share-kakao-slot"] button')) track("so_share", Object.assign(shareRoom(), { method: "kakao" }));
  });

  // 흐름 풀이 한 단락(turn-text)은 늘 무료로 보인다 (14-2)
  function setTurn(room, scr, html) {
    js("turn-text", js("result-turn", scr)).innerHTML = html;
  }

  // (14-6) 다음 방 파일 미리 받기: 입구·결과 화면이 그려진 뒤 한가할 때. 만신의 방이면 만세력 라이브러리도
  function prefetchNext() {
    const room = nextRoom();
    if (!room) return;
    idle(() => {
      ensureRoom(room).then(() => room === "saju" && Saju.loadLunar().catch(() => {}), () => {});
    });
  }

  // ═════════ 시작 ═════════
  applyText();
  // (8단계) 새 세션(이 탭에 마친 방이 없음)은 주소와 상관없이 입구부터 (spec 8-2, 7-2 딥링크 무시).
  // 같은 탭(새로고침·뒤로 가기): 주소 해시의 화면 이름으로 — 방 이름(#rune)이나 방 화면(#rune-result)은 문지기 규칙대로, 의식·결제 화면은 입구로
  const hash = location.hash.replace("#", "");
  const hashRoom = roomOfScreen(hash) || (CHAPTER_ORDER.includes(hash) ? hash : null);
  let first = "hub";
  // (13단계) 옛 결제·책 주소(#deeper·#unseal·#report)와 옛 영수증 칸으로 오면 책 목차로
  let oldReceipt = false;
  try {
    oldReceipt = Boolean(window.sessionStorage.getItem(OLD_RECEIPT_KEY));
    window.sessionStorage.removeItem(OLD_RECEIPT_KEY);
  } catch (e) {
    /* 저장소 없음 */
  }
  if (BOOK_ON && (["report", "deeper", "unseal"].includes(hash) || oldReceipt)) first = hash === "deeper" ? "deeper" : "report";
  else if (filledRooms().length && hash) {
    if (hash === "story") first = "story";
    else if (CHAPTER_ORDER.includes(hash)) first = roomTarget(hash);
    else if (CHAPTER_ORDER.includes(hashRoom) && !TRANSIENT_TO(hash)) first = hash === `${hashRoom}-result` && isDone(hashRoom) ? roomTarget(hashRoom) : hash;
  }
  renderHub();
  setTopbar("hub");
  if (state.visits.saju && Saju) Saju.loadLunar().catch(() => {}); // 원국 표는 생일이 있을 때만 다시 그린다
  // (12단계 12-4, 13단계) 주소의 query(fbclid·utm_*·옛 결제 복귀 ?pay= 등)는 시작할 때 모두 지운다 → 그 뒤에만 광고·분석을 켠다.
  // 결제는 은퇴했으므로 ?pay=… 값은 읽지도 보내지도 않는다.
  bookBoot();
  if (location.search) history.replaceState(history.state, "", location.pathname + location.hash);
  go(first, { instant: true, replace: true });
  booted = true;
  startExternal();

  // 테스트·점검용으로 바깥에서 읽을 수 있게 둔다 (입력값은 내보내지 않음)
  // render*는 저장 없이(fresh=false) 결과 틀만 다시 그린다
  window.StrangeOracle = {
    go, currentArchetype, filledRooms, nextRoom, isUnlocked,
    renderRune: (v) => renderRune(v, false), renderStar: (v) => renderStar(v, false),
    renderOgham: (v) => renderOgham(v, false), renderDecan: (v) => renderDecan(v, false),
    renderTzolkin: (v) => renderTzolkin(v, false), renderSibyl: (v) => renderSibyl(v, false, ""),
    renderSaju: (v) => renderSaju(v, false), ensureRooms,
  };
  }
})();
