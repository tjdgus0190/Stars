// 방 소개 릴스 장면 조립 (2026-10-26). 주소 ?room=saju|ogham|star|decan|tzolkin|rune|sibyl. 대본은 reel-data.js.
// 모든 움직임은 CSS 애니메이션의 시작 시각(animation-delay)으로만 정한다 → 렌더 도구가 currentTime으로 프레임을 고른다. 무작위 값 없음.
(function () {
  const ROOM = new URLSearchParams(location.search).get("room") || "saju";
  const R = window.REELS[ROOM];
  const T = { hook0: 0, hook1: 2.4, title: 4.8, say: [7.2, 10.6, 14.0, 17.2], bridge: 20.4, end: 22.8, dur: 25 };
  const SIG = {
    saju: ["M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5", "M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6Z", "M15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6"],
    ogham: ["M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20"],
    star: ["M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z"],
    decan: ["M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30"],
    tzolkin: ["M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5"],
    rune: ["M14 3V37M14 14L28 5M14 23L28 14"],
    sibyl: ["M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20"],
  };
  const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const svg = (paths, vb = "0 0 40 40") => `<svg viewBox="${vb}">${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  // 나타났다(in) 사라짐(out). out 생략이면 끝까지 남음
  const win = (el, inName, at, out, inDur = 0.55) => anim(el, [`${inName} ${inDur}s var(--ease-out) ${at}s both`].concat(out != null ? [`out-up 0.35s ease-in ${out - 0.35}s forwards`] : []));

  const stage = document.querySelector(".stage");
  stage.dataset.room = ROOM;
  stage.dataset.duration = String(T.dur);
  const world = stage.querySelector(".world");
  const HITS = [T.hook0 + 0.1, T.hook1 + 0.1, T.title + 0.15, T.bridge + 0.1];
  const SAYS = T.say.map((t) => t + 0.1);
  const HARD = ROOM === "saju"; // 만신: 말이 바뀔 때마다 쾅
  anim(world, HITS.map((t) => `shake 0.55s linear ${t + 0.2}s`).concat(HARD ? SAYS.map((t) => `shake-soft 0.4s linear ${t + 0.2}s`) : []));
  const flash = stage.querySelector(".flash");
  anim(flash, HITS.map((t) => `flash 0.45s ease-out ${t + 0.2}s`).concat(SAYS.map((t) => `flash-soft 0.4s ease-out ${t + 0.2}s`)));

  // ── 상징 무대 ──
  const motif = world.querySelector(".motif");
  const ring = (n, R0, opts = {}) => {
    const r = $("div", "ring " + (opts.dir === -1 ? "spin-r" : "spin"));
    r.style.setProperty("--spin", (opts.spin || 25) + "s");
    r.style.setProperty("--turn", (opts.turn || 90) + "deg");
    for (let i = 0; i < n; i++) {
      const t = $("i", "tick" + (opts.cls ? " " + opts.cls : "") + (opts.major && i % opts.major === 0 ? " is-major" : ""), opts.glyphs ? opts.glyphs[i] : "");
      t.style.setProperty("--r", (i * 360) / n + "deg");
      t.style.setProperty("--R", R0 + "px");
      if (opts.lightAt != null) anim(t, [`tick-on 0.5s ease-out ${opts.lightAt + i * (opts.step || 0.05)}s both`]);
      r.append(t);
    }
    motif.append(r);
    return r;
  };
  const circle = (d) => { const c = $("div", "circle"); c.style.width = c.style.height = d + "px"; motif.append(c); return c; };

  if (ROOM === "saju") {
    ring(10, 380, { cls: "glyph", glyphs: "甲乙丙丁戊己庚辛壬癸".split(""), lightAt: T.hook1 + 0.2, step: 0.12, turn: 60 });
    circle(650);
    const p = $("div", "pillars");
    ["시", "날", "달", "해"].forEach((l, i) => p.append(win($("div", "lbl", l), "in-fade", T.say[0] + 0.1 * i, T.say[2])));
    const top = ["丙", "甲", "辛", "庚"], bot = ["寅", "戌", "巳", "午"];
    const tiles = [];
    top.concat(bot).forEach((h, k) => {
      const tl = $("div", "tile" + (k === 1 ? " is-day" : ""), h);
      const at = T.say[0] + 0.25 + k * 0.16;
      const list = [`in-slam 0.45s var(--ease-out) ${at}s both`];
      if (k === 1) list.push(`day-up 0.7s var(--ease-out) ${T.say[1] + 0.2}s forwards`);
      else list.push(`dim-tile 0.5s ease-out ${T.say[1] + 0.2}s forwards`);
      list.push(`out-fade 0.4s ease-in ${T.say[2] - 0.4}s forwards`);
      anim(tl, list);
      tiles.push(tl);
    });
    tiles.forEach((t) => p.append(t));
    motif.append(p);
  } else if (ROOM === "ogham") {
    const st = win($("div", "stem"), "in-fade", T.hook0 + 0.2);
    motif.append(st);
    // 획(오검 글자처럼 줄기 오른쪽·왼쪽·가로질러)이 하나씩 새겨진다
    const marks = [[1, 1], [1, 2], [1, 3], [-1, 1], [-1, 2], [0, 3], [1, 4], [-1, 3], [0, 2], [1, 5], [-1, 4], [0, 4], [1, 2], [-1, 5], [0, 5]];
    marks.forEach(([side, len], i) => {
      const n = $("div", "notch");
      const w = 70 + len * 28;
      n.style.width = w + "px";
      n.style.top = -270 + i * 38 + "px";
      n.style.left = side === 1 ? "6px" : side === -1 ? -6 - w + "px" : -w / 2 + "px";
      if (side === 0) n.style.transform = "rotate(-18deg)";
      win(n, "in-slam", T.hook1 + 0.1 + i * 0.28, undefined, 0.35);
      motif.append(n);
    });
    ring(20, 360, { major: 5, lightAt: T.say[0], step: 0.08, turn: 70 });
  } else if (ROOM === "star") {
    ring(27, 360, { cls: "dot", lightAt: T.hook1 + 0.15, step: 0.07, turn: 100, spin: 25 });
    circle(560);
    const moon = $("div", "emblem moon", svg(SIG.star));
    moon.style.opacity = "0.85";
    moon.style.transform = "scale(0.62)";
    motif.append(moon);
  } else if (ROOM === "decan") {
    ring(36, 380, { major: 3, lightAt: T.hook1 + 0.1, step: 0.05, turn: 120 });
    ring(12, 300, { turn: -40, cls: "", spin: 25 });
    circle(600);
    const h = $("div", "hand");
    anim(h, [`hand-move 25s linear 0s both`]);
    motif.append(h);
  } else if (ROOM === "tzolkin") {
    ring(20, 380, { major: 5, lightAt: T.hook1 + 0.1, step: 0.07, turn: 130 });
    ring(13, 250, { dir: -1, lightAt: T.hook1 + 0.5, step: 0.1, turn: 200 });
    circle(640);
    circle(420);
    const sun = $("div", "emblem", svg(SIG.tzolkin));
    sun.style.opacity = "0.5";
    sun.style.transform = "scale(0.55)";
    motif.append(sun);
  } else if (ROOM === "rune") {
    ring(24, 380, { lightAt: T.hook0 + 0.3, step: 0.06, turn: 80 });
    circle(620);
    const RUNE = {
      fehu: ["M14 3V37M14 14L28 5M14 23L28 14"],
      isa: ["M20 4V36"],
      dagaz: ["M8 6L32 34V6L8 34Z"],
    };
    [["fehu", -220], ["isa", 0], ["dagaz", 220]].forEach(([k, x], i) => {
      const s = $("div", "stone", svg(RUNE[k]));
      s.style.left = x + "px";
      anim(s, [`in-slam 0.5s var(--ease-out) ${T.hook1 + 0.15 + i * 0.55}s both`, `out-fade 0.4s ease-in ${T.say[0] - 0.4}s forwards`, `in-slam 0.5s var(--ease-out) ${T.say[2] + 0.2 + i * 0.4}s both`, `out-fade 0.4s ease-in ${T.bridge - 0.4}s forwards`]);
      motif.append(s);
    });
  } else if (ROOM === "sibyl") {
    ring(32, 380, { cls: "dot", lightAt: T.say[1] + 0.2, step: 0.05, turn: 60 });
    circle(600);
    const flame = $("div", "emblem", svg(SIG.sibyl));
    anim(flame, [`in-fade 1s ease-out ${T.hook0 + 0.3}s both`, `out-fade 0.4s ease-in ${T.say[2] - 0.4}s forwards`]);
    flame.style.transform = "scale(0.7)";
    motif.append(flame);
    const sc = $("div", "scroll", R.oracle);
    anim(sc, [`unroll 0.9s var(--ease-out) ${T.say[2] + 0.2}s both`, `out-fade 0.4s ease-in ${T.bridge - 0.4}s forwards`]);
    motif.append(sc);
  }
  // 상징 무대 전체: 방 이름 순간 커졌다가, 이야기 동안 살짝 위로·작게, 다른 방 순간 사라짐
  anim(motif, [`motif-dim 0.8s ease-out 0s both`, `motif-full 0.5s ease-out ${T.title}s forwards`, `out-fade 0.5s ease-in ${T.bridge}s forwards`]);
  motif.querySelectorAll(".ring").forEach((r) => (r.style.animation += ", " + SAYS.map((t) => `pulse 0.6s var(--ease-out) ${t + 0.15}s`).join(", ")));

  // 큰 문장: 방 이름 순간 획이 그려진다
  const em = $("div", "emblem", svg(SIG[ROOM]));
  em.style.top = "640px"; em.style.left = "540px"; em.style.position = "absolute";
  anim(em, [`in-slam 0.6s var(--ease-out) ${T.title + 0.1}s both`, `out-up 0.4s ease-in ${T.say[0] - 0.1}s forwards`]);
  em.querySelectorAll("path").forEach((p, i) => anim(p, [`draw 1.1s ease-out ${T.title + 0.15 + i * 0.15}s both`]));
  world.append(em);

  // ── 글자 ──
  const hook0 = $("p", "t hook", R.hook[0]);
  win(hook0, "in-slam", T.hook0 + 0.1, T.hook1, 0.6);
  const hook1 = $("p", "t hook", R.hook[1]);
  win(hook1, "in-slam", T.hook1 + 0.1, T.title, 0.6);
  world.append(hook0, hook1);

  const title = $("div", "t title");
  title.style.opacity = "1";
  const te = win($("p", "title__eyebrow", R.eyebrow), "in-fade", T.title + 0.3, T.say[0]);
  const tn = win($("p", "title__name", `<i>${R.num}</i>${R.name}`), "in-slam", T.title + 0.2, T.say[0], 0.6);
  const to = win($("p", "title__origin", R.origin), "in-rise", T.title + 0.6, T.say[0]);
  title.append(te, tn, to);
  world.append(title);

  const guide = $("div", "guide", `<svg viewBox="0 0 48 64"><use href="#guide-${ROOM}"/></svg><span>안내자 <b>${R.guide}</b></span>`);
  win(guide, "in-fade", T.say[0], T.bridge, 0.5);
  world.append(guide);

  R.say.forEach((html, i) => {
    const s = $("p", "t say", html);
    win(s, HARD ? "in-slam" : "in-rise", T.say[i] + 0.1, i < 3 ? T.say[i + 1] : T.bridge, HARD ? 0.5 : 0.5);
    world.append(s);
  });

  // 다른 방: 일곱 문장이 차례로 켜짐(이 방 먼저)
  const seven = $("div", "seven");
  const order = [ROOM].concat(ORDER.filter((r) => r !== ROOM));
  ORDER.forEach((r) => {
    const sp = $("span", r === ROOM ? "is-me" : "", svg(SIG[r]));
    anim(sp, [`seven-on 0.6s var(--ease-out) ${T.bridge + 0.2 + order.indexOf(r) * 0.22}s both`]);
    seven.append(sp);
  });
  win(seven, "in-fade", T.bridge, T.end, 0.3);
  world.append(seven);
  const br = $("p", "t say say--bridge", R.bridge);
  br.style.top = "800px";
  win(br, "in-slam", T.bridge + 0.15, T.end, 0.6);
  world.append(br);

  // 끝 화면
  const end = $("div", "end");
  end.append($("p", "end__eyebrow", "SEVEN ORACLES · ONE STORY"), $("p", "logo end__logo", "낯선 점술관"), $("p", "end__lead", window.REELS.end.lead), $("p", "end__cta", window.REELS.end.cta));
  win(end, "in-fade", T.end, undefined, 0.5);
  world.append(end);
})();
