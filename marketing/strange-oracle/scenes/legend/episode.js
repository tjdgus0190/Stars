// 전설 릴스 공용 조립기 (2026-11-13). 편마다 legend/ep/<편>.js 설정 하나(window.EPISODE)로 장면을 만든다.
// 설정은 소리 스크립트(render/sound-legend.js)도 같은 파일을 읽어 시각을 맞춘다. 모든 움직임은 CSS 애니메이션 시작 시각으로만 정한다. 무작위 값 없음.
// 설정 키: T(시각표) · eyebrow · caps[[시작, 끝, html, 종류]] · h2{t, html} · shots[Paint 장면] · gold/red[[켜기, 끄기]] · leaks[] · white[] · redHits[]
//          bubbles{t, out, items[[이름, 말, x, y, 색조]]} · prop{html, t0, t1, cls} · meteors{t0, n} · heave(t) · ask{choices, line} · end{room, pitch, next}
(function () {
  const E = window.EPISODE;
  const T = E.T;
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const world = stage.querySelector(".world");
  const grade = stage.querySelector(".grade");

  // ── 흔들림·번쩍
  const WHITE = [0.02].concat(E.white || []);
  const RED = (E.h2 ? [E.h2.t] : []).concat(E.redHits || []);
  anim(world, [`push ${T.dur}s linear 0s both`].concat(WHITE.concat(RED).map((t) => `shake 0.45s linear ${t}s`)));
  anim(stage.querySelector(".flash"), WHITE.concat([T.end + 1.1]).map((t) => `flashes 0.6s ease-out ${t}s`));
  anim(stage.querySelector(".redflash"), RED.map((t) => `flashes 0.7s ease-out ${t}s`));

  // ── 명화 장면
  Paint.shots(stage.querySelector(".paint"), E.shots);
  const tint = (el, list, o) => {
    if (!list || !list.length) return;
    el.style.setProperty("--o", o);
    anim(el, list.flatMap(([a, b]) => [`tint-on 0.5s ease-out ${a}s forwards`, `tint-off 0.4s ease-in ${b}s forwards`])); // 뒤 애니메이션이 앞을 덮으므로 모두 forwards
  };
  tint(stage.querySelector(".tint.gold"), E.gold, 0.65);
  tint(stage.querySelector(".tint.red"), E.red, 0.85);
  anim(stage.querySelector(".leak"), (E.leaks || []).map((t) => `leak 0.9s ease-out ${t - 0.2}s`));

  // ── 떨어지는 불티·별똥(선택)
  if (E.meteors) {
    const met = stage.querySelector(".meteors");
    for (let k = 0; k < (E.meteors.n || 16); k++) {
      const m = $("i");
      Object.assign(m.style, { left: ((k * 157) % 900) - 120 + "px", top: ((k * 89) % 500) + "px", height: 160 + (k % 4) * 60 + "px" });
      anim(m, [`fall ${0.9 + (k % 3) * 0.25}s cubic-bezier(0.5, 0, 0.9, 0.6) ${E.meteors.t0 + 0.2 + (k % 8) * 0.32}s both`]);
      met.append(m);
    }
  }

  // ── 가운데 물건(선택): 어둠 위에 떨어져 내려앉음
  if (E.prop) {
    const p = stage.querySelector(".stone");
    p.innerHTML = E.prop.html;
    if (E.prop.cls) p.classList.add(E.prop.cls);
    anim(p, [`stone-in 1.1s cubic-bezier(0.3, 0, 0.3, 1) ${E.prop.t0 + 0.1}s both`, `hide 0.5s ease-in ${E.prop.t1 - 0.2}s forwards`]);
    const svg = p.querySelector("svg");
    if (svg) anim(svg, [`stone-float 3s ease-in-out ${E.prop.t0 + 1.2}s infinite`]);
    const halo = p.querySelector(".halo");
    if (halo) anim(halo, [`halo-pulse 2s ease-in-out ${E.prop.t0 + 1.0}s infinite`]);
    grade.after(anim($("div", "shade-stone"), [`show 0.5s ease-out ${E.prop.t0}s both`, `hide 0.5s ease-in ${E.prop.t1 - 0.2}s forwards`]));
  }

  // ── 말풍선(선택)
  if (E.bubbles) {
    const bubbles = stage.querySelector(".bubbles");
    E.bubbles.items.forEach(([who, txt, x, y, h], k) => {
      const b = $("div", "bub", `<i></i><span><small>${who}</small>${txt}</span>`);
      Object.assign(b.style, { left: x + "px", top: y + "px" });
      b.querySelector("i").style.setProperty("--av", `linear-gradient(135deg, oklch(0.75 0.12 ${h}), oklch(0.55 0.14 ${h + 40}))`);
      anim(b, [`bub-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${E.bubbles.t + k * 0.6}s both`, `bub-out 0.3s ease-in ${E.bubbles.out - 0.1}s forwards`]);
      bubbles.append(b);
    });
  }
  // ── 화면 깨짐(선택): 한 점에서 뻗는 금
  if (E.crack) {
    const [cx, cy] = E.crack.at || [540, 1000];
    const paths = [];
    for (let k = 0; k < 11; k++) {
      const a0 = (k / 11) * Math.PI * 2 + 0.3;
      let x = cx, y = cy, d = `M${x} ${y}`;
      for (let s2 = 1; s2 <= 5; s2++) { const r = 110 + ((k * 37 + s2 * 13) % 60), aa = a0 + (((k + s2) % 3) - 1) * 0.22; x += Math.cos(aa) * r; y += Math.sin(aa) * r; d += `L${x.toFixed(0)} ${y.toFixed(0)}`; }
      paths.push(`<path d="${d}" />`);
    }
    const crack = stage.querySelector(".crack");
    crack.innerHTML = `<svg viewBox="0 0 1080 1920">${paths.join("")}</svg>`;
    crack.querySelectorAll("path").forEach((p2, k) => anim(p2, [`crack 0.28s cubic-bezier(0.1, 0.9, 0.3, 1) ${E.crack.t + (k % 4) * 0.02}s forwards`]));
    anim(crack, [`hide 0.5s ease-in ${E.crack.out}s forwards`]);
  }
  if (E.heave != null) grade.after(anim($("div", "heave"), [`heave 1.6s ease-out ${E.heave}s both`]));

  // ── 자막
  const caps = stage.querySelector(".caps");
  E.caps.forEach(([a, b, html, cls], k) => {
    const c = $("p", "cap" + (cls ? " " + cls : ""), html);
    c.dataset.cap = "";
    const list = k === 0 ? [] : [`cap-in 0.5s var(--ease-out) ${a}s both`];
    if (k === 0) c.style.opacity = 1; // 첫 프레임(피드 미리보기)부터 첫 문장이 보이게
    if (b != null) list.push(`cap-out 0.35s ease-in ${b - 0.35}s forwards`);
    anim(c, list);
    c.querySelectorAll("em.hit").forEach((h) => anim(h, [`word-hit 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${a + 0.3}s both`]));
    caps.append(c);
  });
  if (E.h2) {
    const h2 = $("p", "cap h2", E.h2.html);
    Object.assign(h2.style, { top: "0px", fontSize: (E.h2.size || 80) + "px", lineHeight: "104px" }); // 첫 문장(80px·1.3)과 같은 줄 간격이어야 넷째 줄에 정확히 놓인다
    anim(h2, [`cap-in 0.3s var(--ease-out) ${E.h2.t}s both`, `cap-out 0.35s ease-in ${T.b1 - 0.35}s forwards`]);
    h2.querySelectorAll("em").forEach((m) => anim(m, [`word-hit 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${E.h2.t + 0.05}s both`]));
    caps.append(h2);
  }
  caps.before(anim($("p", "eyebrow", `STRANGE ORACLE · <span>${E.eyebrow}</span>`), [`hide 0.4s ease-in ${T.end}s forwards`]));

  // ── 질문 + 끝 화면(낯선 점술관)
  grade.after(anim($("div", "endshade"), [`show 0.8s ease-out ${T.q - 0.2}s both`]));
  const ask = $("div", "ask");
  E.ask.choices.forEach((t, k) => ask.append(anim($("b", k ? "no" : "", t), [`pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) ${T.q + 0.6 + k * 0.3}s both`])));
  stage.append(anim(ask, [`hide 0.4s ease-in ${T.end - 0.4}s forwards`]));
  stage.append(anim($("p", "askline", E.ask.line), [`cap-in 0.6s var(--ease-out) ${T.q + 1.4}s both`, `hide 0.4s ease-in ${T.end - 0.4}s forwards`]));
  const end = $("div", "endcard", `<p class="e1">이 전설이 잠든 곳</p>
    <p class="e2">${E.end.room}</p>
    <p class="logo e3">낯선 점술관</p>
    <p class="e4">STRANGE ORACLE</p>
    <p class="e5">${E.end.pitch}</p>
    <p class="e6">${E.end.cta || "프로필 링크에서 문 열기"}</p>
    <p class="e7">${E.end.next || ""}</p>`);
  [["e1", 0.2], ["e2", 0.6], ["e3", 1.1], ["e4", 1.5], ["e5", 2.1], ["e6", 2.8], ["e7", 3.4]].forEach(([c, d]) => anim(end.querySelector("." + c), [`cap-in 0.7s var(--ease-out) ${T.end + d}s both`]));
  anim(end.querySelector(".e3"), [`big-in 0.9s var(--ease-out) ${T.end + 1.1}s both`, `logo-shimmer 1.8s ease-in-out ${T.end + 1.6}s both`]);
  stage.append(end);
  if (E.after) E.after({ stage, anim, $, T }); // 편마다 덧붙이는 연출(예: 뿔잔의 룬)
})();
