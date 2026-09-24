// 낯선 점술관 — 화면 동작. 문구는 모두 data.js(TEXT)에서 가져온다.
// 개인정보: 이름·생년월일·시각은 이 파일 안에서만 쓰이고 저장·전송하지 않는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = window.TEXT;

  // ───────── 문구 도우미 ─────────
  const get = (path) => path.split(".").reduce((o, k) => o?.[k], T);

  // "{who}의 룬" 같은 자리에 값을 채운다
  const fill = (str, vars = {}) => str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

  // 받침 유무에 따라 조사 선택: josa("얼음", "이/가") → "얼음이"
  function josa(word, pair) {
    const [withFinal, without] = pair.split("/");
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
    return word + (hasFinal ? withFinal : without);
  }

  const whoOf = (name) => (name ? fill(T.common.youWithName, { name: esc(name) }) : T.common.you);

  function applyText() {
    document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = get(el.dataset.t)));
    document.querySelectorAll("[data-h]").forEach((el) => (el.innerHTML = get(el.dataset.h)));
    document.querySelectorAll("[data-ph]").forEach((el) => (el.placeholder = get(el.dataset.ph)));
    document.querySelectorAll("[data-aria]").forEach((el) => el.setAttribute("aria-label", get(el.dataset.aria)));
    document.querySelectorAll("[data-list]").forEach((el) => {
      el.innerHTML = get(el.dataset.list).map((p) => `<p>${p}</p>`).join("");
    });
    document.title = T.meta.title;
    $('meta[name="description"]').content = T.meta.description;
  }
  applyText();

  // ───────── 배경 별하늘 ─────────
  (function sky() {
    const c = $("#sky");
    const ctx = c.getContext("2d");
    let stars = [];
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 5000) }, () => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: Math.random() * 1.3 + 0.2,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.0015 + 0.0005,
      }));
    }
    function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(s.p + t * s.s));
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
  })();

  // ───────── 공용 도우미 ─────────
  function pickDistinct(n, max) {
    const picked = new Set();
    const buf = new Uint32Array(1);
    while (picked.size < n) {
      crypto.getRandomValues(buf);
      picked.add(buf[0] % max);
    }
    return [...picked];
  }

  function revealCards(root) {
    const cards = root.querySelectorAll(".card");
    if (!("IntersectionObserver" in window)) return cards.forEach((c) => c.classList.add("shown"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("shown");
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.15 }
    );
    cards.forEach((c, i) => {
      c.style.transitionDelay = `${Math.min(i, 3) * 0.15}s`;
      io.observe(c);
    });
  }

  // ───────── 화면 전환 ─────────
  const onEnter = {};
  function go(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(`#screen-${name}`).classList.add("active");
    scrollTo({ top: 0 });
    onEnter[name]?.();
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (t) go(t.dataset.go);
  });

  // ───────── 한글 이름 → 로마자 → 룬 ─────────
  const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  const JONG = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

  function romanize(text) {
    let out = "";
    for (const ch of text) {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code >= 0 && code <= 11171) {
        out += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)] + JONG[code % 28];
      } else if (/[a-z]/i.test(ch)) {
        out += ch.toLowerCase();
      }
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

  // ───────── 룬의 방 ─────────
  const RT = T.rune;
  const rune = { topic: "me", name: "", picks: [], flipped: 0 };

  $("#rune-topics").innerHTML = Object.entries(RT.topics)
    .map(([key, t], i) => `<button class="chip${i === 0 ? " active" : ""}" data-topic="${key}">${t.label}</button>`)
    .join("");
  $("#rune-topics").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#rune-topics .chip").forEach((c) => c.classList.toggle("active", c === chip));
    rune.topic = chip.dataset.topic;
  });

  const pouch = $("#pouch");
  const ringFill = $("#ring-fill");
  const RING = 352;
  const HOLD_MS = 1800;
  let progress = 0;
  let holding = false;
  let lastT = 0;
  let casting = false;

  onEnter["rune-ritual"] = () => {
    rune.name = $("#rune-name").value.trim();
    rune.flipped = 0;
    progress = 0;
    casting = false;
    ringFill.style.strokeDashoffset = RING;
    pouch.className = "pouch";
    pouch.hidden = false;
    $("#stones").hidden = true;
    $("#norn-hint").hidden = true;
    $("#ritual-guide").innerHTML = RT.ritual.hold;
  };

  function tick(t) {
    const dt = lastT ? t - lastT : 16;
    lastT = t;
    progress = Math.max(0, Math.min(1, progress + (holding ? dt / HOLD_MS : -dt / (HOLD_MS / 2))));
    ringFill.style.strokeDashoffset = RING * (1 - progress);
    if (progress >= 1) return cast();
    if (holding || progress > 0) requestAnimationFrame(tick);
    else lastT = 0;
  }

  function startHold(e) {
    if (casting) return;
    e.preventDefault();
    if (!holding && progress === 0) {
      lastT = 0;
      requestAnimationFrame(tick);
    }
    holding = true;
    pouch.classList.add("shaking");
    navigator.vibrate?.(30);
  }
  function endHold() {
    holding = false;
    pouch.classList.remove("shaking");
  }
  pouch.addEventListener("pointerdown", startHold);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => pouch.addEventListener(ev, endHold));
  pouch.addEventListener("contextmenu", (e) => e.preventDefault());
  pouch.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) startHold(e);
  });
  pouch.addEventListener("keyup", endHold);

  function cast() {
    casting = true;
    holding = false;
    lastT = 0;
    navigator.vibrate?.([40, 60, 40]);
    rune.picks = pickDistinct(3, RUNES.length).map((i) => RUNES[i]);
    pouch.classList.remove("shaking");
    pouch.classList.add("spilled");

    setTimeout(() => {
      pouch.hidden = true;
      const stones = $("#stones");
      stones.innerHTML = rune.picks
        .map(
          (r, i) => `
          <button class="stone${i === 0 ? " next" : ""}" data-i="${i}" aria-label="${fill(RT.ritual.stoneLabel, { norn: NORNS[i].name })}">
            <span class="stone-inner">
              <span class="stone-face stone-front"><span>${RT.nornLatin[i]}</span></span>
              <span class="stone-face stone-back"><span class="runic">${r.glyph}</span></span>
            </span>
          </button>`
        )
        .join("");
      stones.hidden = false;
      $("#ritual-guide").innerHTML = RT.ritual.fallen;
      showNornHint(0);
    }, 600);
  }

  function showNornHint(i) {
    const hint = $("#norn-hint");
    hint.hidden = false;
    hint.innerHTML = i < 3 ? `<b>${NORNS[i].name}</b> · ${NORNS[i].desc}` : RT.ritual.allRevealed;
  }

  $("#stones").addEventListener("click", (e) => {
    const stone = e.target.closest(".stone");
    if (!stone || Number(stone.dataset.i) !== rune.flipped) return;
    stone.classList.remove("next");
    stone.classList.add("flipped");
    navigator.vibrate?.(20);
    rune.flipped++;
    $(`#stones .stone[data-i="${rune.flipped}"]`)?.classList.add("next");
    showNornHint(rune.flipped);
    if (rune.flipped === 3) setTimeout(() => { renderRuneResult(); go("rune-result"); }, 1600);
  });

  function renderRuneResult() {
    const R = RT.result;
    const [past, now, next] = rune.picks;
    const topic = RT.topics[rune.topic];
    const who = whoOf(rune.name);
    const latinName = rune.name ? romanize(rune.name) : "";
    const nameRunes = latinName ? toRunes(latinName) : "";

    const readings = rune.picks
      .map(
        (r, i) => `
        <article class="card">
          <p class="label">${RT.nornLatin[i]} · ${NORNS[i].role}</p>
          <div class="reading-rune">
            <span class="runic">${r.glyph}</span>
            <div>
              <h3>${r.name} <span class="latin">${r.latin}</span></h3>
              <div class="meta">${fill(R.origin, { image: r.image, sound: r.sound })}</div>
              <div class="meta">${R.core} <b class="gold">${r.keyword}</b></div>
            </div>
          </div>
          <p class="story">${r.story}</p>
          <p class="you">${r.you}</p>
          <p class="advice">${r.advice}</p>
        </article>`
      )
      .join("");

    const aettList = [past, now, next].map((r) => `<b>${r.name}</b>(${R.aett[Math.floor(RUNES.indexOf(r) / 8)]})`).join(", ");

    const root = $("#rune-result");
    root.innerHTML = `
      <div class="result-hero">
        <p class="eyebrow">${R.eyebrow}</p>
        <div class="big-glyph runic">${past.glyph}${now.glyph}${next.glyph}</div>
        <h2>${fill(R.title, { who })}</h2>
        <p class="sub">${fill(R.asked, { topic: topic.label })}</p>
      </div>

      <article class="card">
        <p class="label">${R.threadLabel}</p>
        <p>${fill(R.thread, { who, past: past.keyword, now: now.keyword, next: josa(`'${next.keyword}'`, "이/가") })}</p>
        <p>${topic.lens}</p>
        <p class="you">${next.advice}</p>
      </article>

      ${readings}

      ${nameRunes ? `
      <article class="card">
        <p class="label">${R.nameLabel}</p>
        <h3>${R.nameTitle}</h3>
        <div class="name-runes runic">${nameRunes}</div>
        <p class="fact">${esc(rune.name)} → <span class="latin">${latinName.toUpperCase()}</span></p>
        <p class="fact">${R.nameFact}</p>
      </article>` : ""}

      <article class="card">
        <p class="label">${R.factLabel}</p>
        <p class="fact">${fill(R.fact, { list: aettList })}</p>
      </article>

      <div class="disclaimer-slot"></div>

      <div class="actions">
        <button class="primary" id="rune-share">${R.share}</button>
        <button class="secondary" data-go="rune-ritual">${R.retry}</button>
        <button class="secondary" data-go="star-intro">${R.other}</button>
      </div>`;
    Disclaimer.mount(root.querySelector(".disclaimer-slot"));

    $("#rune-share").onclick = async () => {
      const C = RT.card;
      const canvas = await ShareCard.render({
        eyebrow: C.eyebrow,
        glyph: `${past.glyph} ${now.glyph} ${next.glyph}`,
        title: `${past.name} · ${now.name} · ${next.name}`,
        subtitle: fill(C.subtitle, { keyword: next.keyword }),
        lines: [now.you],
        footer: C.footer,
        fonts: { serif: "'Gowun Batang', serif", glyph: "'Noto Sans Runic', 'Segoe UI Historic', sans-serif" },
        seed: RUNES.indexOf(now) + 1,
      });
      ShareCard.share(canvas, "my-runes.png", C.shareText);
    };
    revealCards(root);
  }

  // ───────── 별의 방 ─────────
  const ST = T.star;
  const NAK_SPAN = 360 / 27;
  const star = { name: "", year: 0, result: null };

  $("#star-time-unknown").addEventListener("change", (e) => {
    $("#star-time").disabled = e.target.checked;
  });

  const wheel = $("#wheel");
  (function buildWheel() {
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      wheel.appendChild(n);
      return n;
    };
    const pt = (deg, r) => [Math.sin((deg * Math.PI) / 180) * r, -Math.cos((deg * Math.PI) / 180) * r];
    el("circle", { r: 150, class: "ring" });
    el("circle", { r: 122, class: "ring" });
    el("circle", { r: 88, class: "ring" });
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pt(i * 30, 122);
      const [x2, y2] = pt(i * 30, 150);
      el("line", { x1, y1, x2, y2, class: "tick" });
      const [lx, ly] = pt(i * 30 + 15, 136);
      const label = el("text", {
        x: lx, y: ly, class: "rashi-label", "text-anchor": "middle", "dominant-baseline": "middle",
        transform: `rotate(${i * 30 + 15} ${lx} ${ly})`,
      });
      label.textContent = RASHIS[i].ko.replace("자리", "");
    }
    for (let i = 0; i < 27; i++) {
      const [x1, y1] = pt(i * NAK_SPAN, 88);
      const [x2, y2] = pt(i * NAK_SPAN, 122);
      el("line", { x1, y1, x2, y2, class: "tick" });
      const [dx, dy] = pt(i * NAK_SPAN + NAK_SPAN / 2, 105);
      el("circle", { cx: dx, cy: dy, r: 1.6, class: "nak-dot" });
    }
    wheel.moon = el("circle", { r: 7, class: "moon" });
    wheel.pt = pt;
  })();

  function showError(msg) {
    const err = $("#star-error");
    err.textContent = msg;
    err.hidden = false;
  }

  $("#star-go").addEventListener("click", () => {
    const dateVal = $("#star-date").value;
    const unknown = $("#star-time-unknown").checked;
    const timeVal = $("#star-time").value;
    $("#star-error").hidden = true;
    if (!dateVal) return showError(ST.errors.noDate);
    if (!unknown && !timeVal) return showError(ST.errors.noTime);
    const [y, m, d] = dateVal.split("-").map(Number);
    if (y < 1900 || y > 2100) return showError(ST.errors.range);

    const time = unknown ? null : { h: Number(timeVal.slice(0, 2)), m: Number(timeVal.slice(3, 5)) };
    star.name = $("#star-name").value.trim();
    star.year = y;
    star.result = Astro.birthChart(y, m, d, time);
    go("star-ritual");
  });

  onEnter["star-ritual"] = () => {
    const moonDeg = star.result.charts[0].moonSidereal;
    const [mx, my] = wheel.pt(moonDeg, 105);
    wheel.moon.setAttribute("cx", mx);
    wheel.moon.setAttribute("cy", my);

    // 달이 꼭대기 바늘 아래로 오도록 두 바퀴 돌린 뒤 멈춘다
    wheel.style.transition = "none";
    wheel.style.transform = "rotate(0deg)";
    void wheel.getBoundingClientRect();
    wheel.style.transition = "";
    wheel.style.transform = `rotate(${-720 - moonDeg}deg)`;

    const yearEl = $("#rewind-year");
    const from = new Date().getFullYear();
    const to = star.year;
    const DURATION = 3400;
    const t0 = performance.now();
    (function roll(t) {
      const k = Math.min(1, (t - t0) / DURATION);
      yearEl.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(roll);
    })(t0);

    const trivia = $("#star-trivia");
    const list = ST.ritual.trivia;
    let ti = Math.floor(Math.random() * list.length);
    trivia.textContent = list[ti];
    const timer = setInterval(() => {
      trivia.style.opacity = 0;
      setTimeout(() => {
        ti = (ti + 1) % list.length;
        trivia.textContent = list[ti];
        trivia.style.opacity = 1;
      }, 400);
    }, 2400);

    setTimeout(() => {
      clearInterval(timer);
      trivia.style.opacity = 1;
      if (star.result.charts.length > 1) go("star-choose");
      else {
        renderStarResult(star.result.charts[0]);
        go("star-result");
      }
    }, reduceMotion ? 1200 : 5200);
  };

  onEnter["star-choose"] = () => {
    $("#star-choices").innerHTML = star.result.charts
      .map((c, i) => {
        const n = NAKSHATRAS[c.nakshatra];
        return `
          <button class="choice" data-i="${i}">
            <p class="choice-when">${i === 0 ? ST.choose.early : ST.choose.late}</p>
            <h3>${n.name} · ${n.title}</h3>
            <p>“${n.traits[0]}”</p>
            <p>“${n.traits[1]}”</p>
          </button>`;
      })
      .join("");
  };
  $("#star-choices").addEventListener("click", (e) => {
    const c = e.target.closest(".choice");
    if (!c) return;
    renderStarResult(star.result.charts[Number(c.dataset.i)]);
    go("star-result");
  });

  function renderStarResult(chart) {
    const R = ST.result;
    const nak = NAKSHATRAS[chart.nakshatra];
    const planet = PLANETS[chart.nakshatra % 9];
    const west = RASHIS[chart.westernSign];
    const vedicSun = RASHIS[chart.sunRashi];
    const moonRashi = RASHIS[chart.moonRashi];
    const who = whoOf(star.name);
    const same = chart.westernSign === chart.sunRashi;

    const root = $("#star-result");
    root.innerHTML = `
      <div class="result-hero">
        <p class="eyebrow">${fill(R.eyebrow, { n: chart.nakshatra + 1 })}</p>
        <div class="big-glyph">☾</div>
        <h2>${nak.name}</h2>
        <p class="latin">${nak.sanskrit}</p>
        <p class="sub">${fill(R.born, { who, house: nak.title })}</p>
      </div>

      <article class="card">
        <p class="label">${R.youLabel}</p>
        <h3>${R.youTitle}</h3>
        <ul class="traits">
          ${nak.traits.map((t, i) => `<li><span>${t}</span><button class="me-too" data-i="${i}">${R.meToo}</button></li>`).join("")}
        </ul>
        <p class="me-count" id="me-count"></p>
      </article>

      <article class="card">
        <p class="label">${R.houseLabel}</p>
        <h3>${R.houseTitle}</h3>
        <p><b>${R.symbol}</b> · ${nak.symbol}</p>
        <p><b>${R.sky}</b> · ${nak.star}</p>
        <p><b>${R.deity}</b> · ${nak.deity}</p>
      </article>

      <article class="card">
        <p class="label">${R.shadowLabel}</p>
        <p class="story">${fill(R.shadow, { text: nak.shadow })}</p>
        <p class="advice">${nak.advice}</p>
      </article>

      <article class="card">
        <p class="label">${R.twistLabel}</p>
        <h3>${R.twistTitle}</h3>
        <div class="twist">
          ${same
            ? `<span class="to twist-same">${west.ko} = ${vedicSun.name}</span>`
            : `<span class="from">${west.ko}</span><span class="arrow">→</span><span class="to">${vedicSun.ko}</span>`}
        </div>
        <p class="fact">${same ? fill(R.twistSame, { sign: west.ko }) : fill(R.twistDiff, { sanskrit: vedicSun.name, sign: vedicSun.ko })}</p>
      </article>

      <article class="card">
        <p class="label">${R.mindLabel}</p>
        <h3>${fill(R.mindTitle, { sanskrit: moonRashi.name })}</h3>
        <p class="fact">${fill(R.mind, { who, sanskrit: moonRashi.name, sign: moonRashi.ko })}</p>
      </article>

      <article class="card">
        <p class="label">${R.planetLabel}</p>
        <h3>${fill(R.planetTitle, { planet: planet.name })}</h3>
        <p class="fact">${planet.desc}</p>
      </article>

      ${star.result.exact ? "" : `<p class="fact time-note">${R.timeNote}</p>`}

      <div class="disclaimer-slot"></div>

      <div class="actions">
        <button class="primary" id="star-share">${R.share}</button>
        <button class="secondary" data-go="star-intro">${R.retry}</button>
        <button class="secondary" data-go="rune-intro">${R.other}</button>
      </div>`;
    Disclaimer.mount(root.querySelector(".disclaimer-slot"));

    const hits = new Set();
    root.querySelector(".traits").addEventListener("click", (e) => {
      const b = e.target.closest(".me-too");
      if (!b) return;
      b.classList.toggle("on");
      b.classList.contains("on") ? hits.add(b.dataset.i) : hits.delete(b.dataset.i);
      $("#me-count").textContent = R.meCount[hits.size];
    });

    $("#star-share").onclick = async () => {
      const C = ST.card;
      const canvas = await ShareCard.render({
        eyebrow: C.eyebrow,
        glyph: "☾",
        title: fill(C.title, { house: nak.name }),
        subtitle: nak.title,
        lines: [nak.traits[0], fill(C.twist, { west: west.ko, vedic: vedicSun.ko })],
        footer: C.footer,
        fonts: { serif: "'Gowun Batang', serif" },
        seed: chart.nakshatra + 1,
      });
      ShareCard.share(canvas, "my-nakshatra.png", fill(C.shareText, { house: nak.name }));
    };
    revealCards(root);
  }
})();
