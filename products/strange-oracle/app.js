// 낯선 점술관 — 화면 동작.
// 문구는 모두 data.js(TEXT)·data-runes.js(RUNES)·data-stars.js(NAKSHATRAS·RASHIS·PLANETS)에서 가져온다.
// 요소는 id 또는 data-js로 찾는다(class 이름에 기능을 걸지 않음). 상태는 is-* class를 붙였다 뗀다.
//
// 개인정보 (CLAUDE.md 6장 sessionStorage 예외):
//  - 이 탭의 sessionStorage 한 칸("strange-oracle")에만 저장한다. 탭을 닫으면 사라진다.
//  - 저장하는 값: profile = 이름, 생년월일, 태어난 시각(모르면 null) / visits = 방마다 결과 유형 코드와 원형 태그
//  - 처음 저장하기 전 입력칸 아래에 "이 기기의 이 탭에만 잠시 보관되며 어디에도 전송되지 않는다" 안내를 보인다.
//  - "내 정보 지우기"(모든 화면 상단) → 확인 대화상자 → 모두 지움.
//  - 네트워크 전송·localStorage·쿠키·URL에는 어떤 입력값도 넣지 않는다. (URL 해시는 읽기만 하고, 방 이름만 쓴다)
(function () {
  "use strict";
  const T = window.TEXT;
  const RUNES = window.RUNES;
  const NAKS = window.NAKSHATRAS;
  const RASHIS = window.RASHIS;
  const PLANETS = window.PLANETS;
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
  const CHAPTER_ORDER = ["ogham", "star", "decan", "tzolkin", "sibyl", "rune"];
  const OPEN_ROOMS = ["rune", "star"]; // 1단계에 열린 방
  // 방을 마치면 이어지는 방 2곳 (기획서 "방 간 이동(떡밥) 설계")
  const LINKS = {
    ogham: ["sibyl", "decan"], star: ["tzolkin", "ogham"], decan: ["rune", "star"],
    tzolkin: ["decan", "sibyl"], sibyl: ["rune", "tzolkin"], rune: ["ogham", "star"],
  };
  const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
  const chapterOf = (room) => CHAPTER_ORDER.indexOf(room) + 1;
  const MOON_SVG = '<svg viewBox="0 0 40 40"><path d="M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z" fill="currentColor"/></svg>';
  const ROOM_ICON = { rune: '<svg viewBox="0 0 40 60"><use href="#rune-raidho" /></svg>', star: MOON_SVG };
  const RUNE_BY_CODE = Object.fromEntries(RUNES.map((r, i) => [r.code, Object.assign({ index: i }, r)]));
  const ARCHETYPES = Object.keys(T.archetypes);
  const FONTS = { serif: "'Gowun Batang', serif", latin: "'Cinzel', 'Gowun Batang', serif", glyph: "'Noto Sans Runic', 'Segoe UI Historic', sans-serif" };
  const CARD_THEME = {
    rune: { bgTop: "#080717", bgBottom: "#042234", accent: "#93d5f5", text: "#f5f2e9", muted: "#b8b8ce" },
    star: { bgTop: "#080717", bgBottom: "#221838", accent: "#cec1fa", text: "#f5f2e9", muted: "#b8b8ce" },
    story: { bgTop: "#080717", bgBottom: "#261a3a", accent: "#ebc573", text: "#f5f2e9", muted: "#b8b8ce" },
  };

  // ───────── 저장 (sessionStorage, 이 탭 한정) ─────────
  const STORE_KEY = "strange-oracle";
  const emptyState = () => ({ profile: {}, visits: {} });
  function validVisit(room, v) {
    if (!v || !ARCHETYPES.includes(v.archetype)) return false;
    if (room === "rune") return Array.isArray(v.picks) && v.picks.length === 3 && v.picks.every((c) => RUNE_BY_CODE[c]) && T.rune.topics[v.topic];
    if (room === "star") return Number.isInteger(v.nak) && NAKS[v.nak] && RASHIS[v.west] && RASHIS[v.sunRashi] && RASHIS[v.moonRashi];
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
    editing.rune = editing.star = false;
    $$("input[data-js]").forEach((el) => (el.type === "checkbox" ? (el.checked = false) : (el.value = "")));
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
    jsAll("room-chapter-num").forEach((el) => (el.textContent = fill(T.storyChapter, { n: el.dataset.n })));
    jsAll("rashi-label").forEach((el, i) => (el.textContent = RASHIS[i].ko.replace("자리", "")));
    js("hub-closed").innerHTML = CHAPTER_ORDER.filter((r) => !OPEN_ROOMS.includes(r))
      .map((r) => `<li class="closed-room"><span class="closed-room__num" aria-hidden="true">${ROMAN[chapterOf(r) - 1]}</span><span class="closed-room__name">${T.rooms[r].name}</span><span class="closed-room__origin">${T.rooms[r].origin}</span></li>`)
      .join("");
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
  const READING = new Set(["rune-result", "star-result"]);
  // 뒤로 버튼: [목적지, 문구 키]
  const BACK = {
    "rune-intro": ["hub", "toHub"], "rune-input": ["rune-intro", "toIntro"], "rune-ritual": ["rune-input", "toInput"], "rune-result": ["hub", "toHub"],
    "star-intro": ["hub", "toHub"], "star-input": ["star-intro", "toIntro"], "star-ritual": ["star-input", "toInput"], "star-choose": ["star-input", "toInput"],
    "star-result": ["hub", "toHub"], story: ["hub", "toHub"],
  };

  function setTopbar(name) {
    const back = js("topbar-back");
    const b = BACK[name];
    show(back, Boolean(b));
    if (b) {
      back.textContent = T.topbar.back[b[1]];
      back.dataset.target = b[0];
    }
    const reading = READING.has(name);
    body.classList.toggle("is-reading", reading);
    js("topbar").classList.toggle("is-reading", reading);
  }

  function go(name, opts = {}) {
    const next = screens[name];
    if (!next) return;
    const prevName = currentName;
    const prev = screens[prevName];
    clearTimeout(swapTimer);
    pending.forEach(clearTimeout);
    pending = [];
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
    if (prev && prev !== next && !reduceMotion && !opts.instant) {
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      swapTimer = setTimeout(reveal, 320);
    } else reveal();
  }

  // 포털 문: 누른 곳에서 빛이 번지며 빨려 들어간다 (450ms 뒤 화면 전환, 800ms 뒤 정리)
  function enterDoor(door, e) {
    if (reduceMotion) return go(door.dataset.go);
    const warp = js("warp");
    const x = e && e.clientX ? (e.clientX / innerWidth) * 100 : 50;
    const y = e && e.clientY ? (e.clientY / innerHeight) * 100 : 45;
    warp.style.setProperty("--warp-x", `${x.toFixed(1)}%`);
    warp.style.setProperty("--warp-y", `${y.toFixed(1)}%`);
    warp.dataset.room = door.dataset.room;
    door.classList.add("is-entering");
    warp.classList.remove("is-active");
    void warp.offsetWidth;
    warp.classList.add("is-active");
    setTimeout(() => go(door.dataset.go), 450);
    setTimeout(() => {
      door.classList.remove("is-entering");
      warp.classList.remove("is-active");
    }, 800);
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (!t) return;
    if ((t.dataset.js || "").startsWith("hub-door-")) enterDoor(t, e);
    else go(t.dataset.go);
  });
  js("topbar-back").addEventListener("click", (e) => go(e.currentTarget.dataset.target || "hub"));

  // ───────── 스크롤: 별 시차(--scroll) + 읽기 진행률 ─────────
  let scrollQueued = false;
  addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        if (!reduceMotion) root.style.setProperty("--scroll", Math.round(window.scrollY));
        if (READING.has(currentName)) updateReading();
      });
    },
    { passive: true }
  );

  // 장(result-chapter)마다 화면 위 35% 선을 기준으로 지나간 장·읽는 중인 장과 그 안의 진행률을 계산한다
  function updateReading() {
    const scr = screens[currentName];
    const chapters = jsAll("result-chapter", scr);
    const segs = jsAll("read-progress-seg");
    const line = innerHeight * 0.35;
    let cur = 0;
    chapters.forEach((ch, i) => {
      const r = ch.getBoundingClientRect();
      let f = 0;
      if (r.bottom <= line) f = 1;
      else if (r.top < line) f = (line - r.top) / r.height;
      if (r.top < line) cur = i;
      segs[i].classList.toggle("is-done", f >= 1);
      segs[i].style.setProperty("--fill", f.toFixed(3));
    });
    js("read-label").innerHTML =
      esc(fill(T.topbar.readLabel, { num: ROMAN[cur], name: T.result.chapterNames[cur] })) +
      ` <span class="topbar__count">${esc(fill(T.topbar.readCount, { i: cur + 1, total: chapters.length }))}</span>`;
  }

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
    const targets = [...jsAll("result-chapter", scr), ...$$("[data-reveal]", scr), ...jsAll("story-chapters", scr), ...jsAll("story-chapter", scr)];
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

  // ───────── 0. 허브 ─────────
  function renderHub() {
    for (const room of OPEN_ROOMS) {
      const door = js(`hub-door-${room}`);
      door.classList.toggle("is-visited", Boolean(state.visits[room]));
      js("hub-door-badge", door).textContent = fill(T.hub.badge, { n: chapterOf(room) });
    }
    const filled = filledRooms();
    const teaser = js("hub-story");
    show(teaser, filled.length > 0);
    $$(".arch-mark", js("hub-story-marks")).forEach((m, i) => m.classList.toggle("is-done", Boolean(state.visits[CHAPTER_ORDER[i]])));
    js("hub-story-title").textContent = fill(T.hub.storyTitle, { n: filled.length });
    const a = currentArchetype();
    js("hub-story-desc").textContent = a ? fill(T.hub.storyDesc, { archetype: T.archetypes[a].name }) : "";
  }
  enter.hub = renderHub;

  // ───────── 입력 화면 공통 ─────────
  const editing = { rune: false, star: false };
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
    js("rune-ritual-guide").innerHTML = T.rune.ritual.hold;
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
      js("rune-ritual-guide").innerHTML = T.rune.ritual.fallen;
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
      later(() => {
        renderRune({ picks: rune.picks, topic: rune.topic }, true);
        go("rune-result");
      }, reduceMotion ? 700 : 1600);
    }
  });

  // ───────── 결과 본문 조립 ─────────
  // parts: 문자열(단락) 또는 { lede | sub:{glyph,text} | quote | html }
  function prose(parts) {
    return parts
      .filter((p) => p && (typeof p !== "string" || p.trim()))
      .map((p) => {
        if (typeof p === "string") return `<p data-reveal>${p}</p>`;
        if (p.lede) return `<p class="prose__lede" data-reveal>${p.lede}</p>`;
        if (p.sub) return `<h3 class="prose__sub" data-reveal><span class="prose__sub-glyph runic" aria-hidden="true">${p.sub.glyph}</span><span>${p.sub.text}</span></h3>`;
        if (p.quote) return `<blockquote class="pull-quote" data-reveal data-js="chapter-quote">${p.quote}</blockquote>`;
        if (p.html) return p.html;
        return "";
      })
      .join("");
  }
  const insertAt = (arr, i, item) => [...arr.slice(0, i), item, ...arr.slice(i)];

  // 장 4개 채우기: chapters = [{ title, html, hook }]
  function fillChapters(scr, chapters) {
    resetReveal(scr);
    const secs = jsAll("result-chapter", scr);
    const tocTitles = jsAll("toc-title", scr);
    let total = 0;
    chapters.forEach((c, i) => {
      const sec = secs[i];
      js("chapter-title", sec).textContent = strip(c.title);
      tocTitles[i].textContent = strip(c.title);
      js("chapter-body", sec).innerHTML = c.html;
      const hook = js("chapter-hook", sec);
      if (hook) {
        hook.innerHTML = c.hook || "";
        show(hook, Boolean(c.hook));
      }
      const min = minutesOf(c.html + (c.hook || ""));
      total += min;
      js("chapter-time", sec).textContent = fill(T.common.minutes, { n: min });
    });
    js("result-length", scr).textContent = fill(T.result.length, { n: total });
  }

  function renderNextRooms(scr, from) {
    const linked = LINKS[from].filter((r) => OPEN_ROOMS.includes(r) && r !== from);
    const cands = linked.length ? linked : OPEN_ROOMS.filter((r) => r !== from);
    const order = [...cands.filter((r) => !state.visits[r]), ...cands.filter((r) => state.visits[r])].slice(0, 2);
    js("next-rooms", scr).innerHTML = order
      .map((r) => {
        const hook = (T.next[from] && T.next[from][r]) || "";
        const chapter = fill(T.result.nextChapter, { n: chapterOf(r), chapter: T.rooms[r].chapterName });
        return `<button class="next-room" type="button" data-room="${r}" data-go="${r}-intro" data-js="next-room">
            <span class="next-room__glyph" aria-hidden="true">${ROOM_ICON[r]}</span>
            <span class="next-room__text">
              <span class="next-room__name">${T.rooms[r].name} <span class="next-room__chapter">${chapter}</span></span>
              <span class="next-room__hook">${hook}</span>
            </span>
            <span class="next-room__arrow" aria-hidden="true">→</span>
          </button>`;
      })
      .join("");
    js("result-go-story", scr).textContent = fill(T.result.goStory, { n: filledRooms().length });
  }

  function renderArchetypeLine(scr, code, why) {
    js("result-archetype-name", scr).textContent = T.archetypes[code].name;
    js("result-archetype-why", scr).innerHTML = why;
  }

  // ───────── 룬 결과 ─────────
  // v = { picks: [code × 3], topic }. fresh=true면 방금 던진 결과 → 저장(같은 방은 덮어씀)
  let runeView = null;
  function renderRune(v, fresh) {
    const scr = screens["rune-result"];
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

    // 첫째 장: 세 룬의 정체
    const norns = T.rune.norns;
    let ch1 = [{ lede: fill(R.ch1Lede, { past: past.name, now: now.name, next: next.name }) }];
    [past, now, next].forEach((r, i) => {
      ch1.push({ sub: { glyph: r.glyph, text: fill(R.ch1Sub, { norn: norns[i].name, name: r.name }) } });
      ch1 = ch1.concat(r.identity);
    });
    if (name) {
      const latin = romanize(name);
      ch1.push({
        html: `<aside class="inset inset--name" data-js="rune-name-runes" data-reveal>
            <p class="inset__label">${R.nameLabel}</p>
            <p class="name-runes runic" data-js="rune-name-glyphs">${toRunes(latin)}</p>
            <p class="inset__fact"><span data-js="rune-name-source">${esc(name)}</span> → <span class="latin" data-js="rune-name-latin">${esc(latin.toUpperCase())}</span></p>
            <p class="inset__fact">${R.nameFact}</p>
          </aside>`,
      });
    }
    // 둘째 장: 지나온 자리의 장면 → 지금 자리의 장면 (인용은 지금 자리 첫 단락 뒤)
    const ch2 = [{ lede: past.past.lede }, ...past.past.body, ...insertAt(now.now.body, 1, { quote: now.now.quote })];
    // 셋째 장: 다가올 자리의 그림자
    const ch3 = [{ lede: next.shadow.lede }, ...insertAt(next.shadow.body, 1, { quote: next.shadow.quote })];
    // 넷째 장: 다가올 자리의 다음 걸음 + 고른 주제 한 단락
    const ch4 = [{ lede: next.advice.lede }, ...next.advice.body, `${topic.lens} ${next.advice.topics[v.topic] || ""}`];

    fillChapters(scr, [
      { title: R.ch1Title, html: prose(ch1), hook: now.now.hook },
      { title: now.now.title, html: prose(ch2), hook: next.shadow.hook },
      { title: next.shadow.title, html: prose(ch3), hook: next.advice.hook },
      { title: next.advice.title, html: prose(ch4) },
    ]);

    const list = [past, now, next].map((r) => fill(R.factItem, { name: r.name, aett: R.aett[Math.floor(r.index / 8)] })).join(", ");
    js("fact-text", scr).innerHTML = fill(R.fact, { list });
    Disclaimer.mount(js("disclaimer-slot", scr));
    renderArchetypeLine(scr, next.archetype, next.archetypeWhy);
    renderNextRooms(scr, "rune");
  }

  enter["rune-result"] = () => {
    const scr = screens["rune-result"];
    replay(js("result-capture", scr));
    watchReveal(scr);
    updateReading();
  };
  js("result-retry", screens["rune-result"]).addEventListener("click", () => go("rune-ritual"));

  // ───────── 한글 이름 → 로마자 → 룬 (이름 인셋) ─────────
  const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  const JONG = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
  function romanize(text) {
    let out = "";
    for (const ch of text) {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code >= 0 && code <= 11171) out += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)] + JONG[code % 28];
      else if (/[a-z]/i.test(ch)) out += ch.toLowerCase();
    }
    return out;
  }
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
    const hasBirth = Boolean(p.birth);
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

    later(() => starRitual.classList.add("is-landed"), reduceMotion ? 0 : 4400);
    later(() => {
      if (starCalc.candidates.length > 1) go("star-choose");
      else {
        const c = starCalc.charts[0];
        renderStar(starVisit(c, starCalc.exact, null), true);
        go("star-result");
      }
    }, reduceMotion ? 1200 : 5200);
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

    // 첫째 장: 정체 (사실 목록 포함)
    const F = R.facts;
    const facts = [
      [F.symbol, nak.symbol], [F.sky, nak.star], [F.deity, nak.deity], [F.planet, planet.name],
      [F.mind, fill(R.mindValue, { sanskrit: moon.name, sign: moon.ko })],
    ];
    const factList = `<dl class="fact-list" data-js="star-facts" data-reveal>${facts
      .map(([dt, dd]) => `<div class="fact-list__row"><dt>${dt}</dt><dd>${dd}</dd></div>`)
      .join("")}</dl>`;
    const ch1 = [{ lede: nak.identity.lede }, { html: factList }, ...nak.identity.body, R.interpretNote];
    // 둘째 장: 사건 (첫 단락 뒤에 맞아요 인셋, 둘째 단락 뒤에 인용)
    const traits = `<aside class="inset inset--traits" data-js="star-traits" data-reveal>
        <p class="inset__label">${R.traitsLabel}</p>
        <ul class="trait-list">${nak.traits
          .map((t, i) => `<li class="trait"><span class="trait__text">${t}</span><button class="trait__btn" type="button" aria-pressed="false" data-js="star-trait" data-i="${i}">${R.meToo}</button></li>`)
          .join("")}</ul>
        <p class="inset__count" data-js="star-trait-count" aria-live="polite"></p>
      </aside>`;
    const eb = nak.event.body;
    const ch2 = [{ lede: nak.event.lede }, eb[0], { html: traits }, eb[1], { quote: nak.event.quote }, ...eb.slice(2)];
    const ch3 = [{ lede: nak.shadow.lede }, ...insertAt(nak.shadow.body, 1, { quote: nak.shadow.quote })];
    const ch4 = [{ lede: nak.advice.lede }, ...nak.advice.body];
    fillChapters(scr, [
      { title: nak.identity.title, html: prose(ch1), hook: nak.event.hook },
      { title: nak.event.title, html: prose(ch2), hook: nak.shadow.hook },
      { title: nak.shadow.title, html: prose(ch3), hook: nak.advice.hook },
      { title: nak.advice.title, html: prose(ch4) },
    ]);

    js("fact-text", scr).innerHTML = nak.fact || R.factFallback;
    Disclaimer.mount(js("disclaimer-slot", scr));
    renderArchetypeLine(scr, nak.archetype, nak.archetypeWhy);
    renderNextRooms(scr, "star");
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
    updateReading();
  };
  js("result-retry", screens["star-result"]).addEventListener("click", () => {
    editing.star = true;
    go("star-input");
  });

  // ═════════ 5. 나의 이야기 ═════════
  const storyScr = screens.story;
  function runeSummary(v) {
    const [p, n, x] = v.picks.map((c) => RUNE_BY_CODE[c]);
    return T.story.runeSummary.map((tpl) => fill(tpl, { past: p.summary.past, now: n.summary.now, next: x.summary.next }));
  }
  function visitType(room) {
    const v = state.visits[room];
    if (room === "rune") {
      const [p, n, x] = v.picks.map((c) => RUNE_BY_CODE[c]);
      return fill(T.story.evidenceRuneType, { past: p.name, now: n.name, next: x.name });
    }
    return NAKS[v.nak].name;
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
      .map((room) => `<li class="evidence__item" data-room="${room}"><span class="evidence__glyph${room === "rune" ? " runic" : ""}" aria-hidden="true">${T.rooms[room].glyph}</span><span class="evidence__room">${T.rooms[room].name}</span><span class="evidence__type">${visitType(room)}</span><span class="evidence__tag">${T.archetypes[state.visits[room].archetype].name}</span></li>`)
      .join("");
    show(js("story-empty", storyScr), n === 0);
    show(js("story-share-top", storyScr), n > 0);
    show(js("story-share", storyScr), n > 0);

    // 등뼈: 1~6장 고정 순서
    resetReveal(storyScr);
    jsAll("story-chapter", storyScr).forEach((li, i) => {
      const room = CHAPTER_ORDER[i];
      const done = Boolean(state.visits[room]);
      const open = OPEN_ROOMS.includes(room);
      li.classList.toggle("is-done", done);
      li.classList.toggle("is-available", !done && open);
      li.classList.toggle("is-upcoming", !done && !open);
      if (done || open) li.dataset.room = room;
      else delete li.dataset.room;
      const R = T.rooms[room];
      const label = `<p class="spine-item__label">${fill(S.chapterLabel, { n: i + 1, chapter: R.chapterName })}</p>`;
      let html;
      if (done) {
        const summary = room === "rune" ? runeSummary(state.visits.rune) : NAKS[state.visits.star.nak].summary;
        html = `${label}<p class="spine-item__room">${R.name} <span class="spine-item__type" data-js="story-chapter-type">${visitType(room)}</span></p>
          <div class="spine-item__summary" data-js="story-chapter-summary">${summary.map((p) => `<p>${p}</p>`).join("")}</div>
          <button class="btn btn--text spine-item__reread" type="button" data-js="story-chapter-reread" data-room="${room}">${S.reread}</button>`;
      } else if (open) {
        html = `${label}<p class="spine-item__room">${R.name}</p><p class="spine-item__teaser">${fill(S.teaserAvailable, { room: R.name })}</p>
          <button class="btn btn--secondary btn--small spine-item__go" type="button" data-go="${room}-intro" data-js="story-chapter-go">${fill(S.go, { room: R.name })}</button>`;
      } else {
        html = `${label}<p class="spine-item__room">${R.name}</p><p class="spine-item__teaser">${S.teaserUpcoming}</p>`;
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
    if (room === "rune") renderRune(state.visits.rune, false);
    else renderStar(state.visits.star, false);
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
  ["result-share", "result-share-top"].forEach((name) => {
    js(name, screens["rune-result"]).addEventListener("click", (e) => shareCard(e.currentTarget, buildRuneCard));
    js(name, screens["star-result"]).addEventListener("click", (e) => shareCard(e.currentTarget, buildStarCard));
  });
  ["story-share", "story-share-top"].forEach((name) => js(name, storyScr).addEventListener("click", (e) => {
    if (filledRooms().length) shareCard(e.currentTarget, buildStoryCard);
  }));

  // ═════════ 시작 ═════════
  applyText();
  renderHub();
  setTopbar("hub");
  // 방 주소로 바로 들어온 경우(예: index.html#rune): 허브를 거치지 않고 그 방 시작 화면. URL에는 방 이름만 있다
  const START = { rune: "rune-intro", star: "star-intro", story: "story" };
  const hash = location.hash.replace("#", "");
  if (START[hash]) go(START[hash], { instant: true });
  else enter.hub();

  // 테스트·점검용으로 바깥에서 읽을 수 있게 둔다 (입력값은 내보내지 않음)
  // renderRune/renderStar는 저장 없이(fresh=false) 결과 틀만 다시 그린다
  window.StrangeOracle = { go, currentArchetype, filledRooms, renderRune: (v) => renderRune(v, false), renderStar: (v) => renderStar(v, false) };
})();
