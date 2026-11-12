// 전설 릴스 「세 여인이 새기는 운명」(룬 · 노른) 조립 (2026-11-12). 32초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다. 무작위 값 없음.
// 근거: 『고 에다』 「무녀의 예언」 20절(나무 아래 호수에서 온 세 처녀 우르드·베르단디·스쿨드가 나무판에 새기고, 사람의 자식들에게 삶과 몫을 정함),
//       『산문 에다』 「귈피의 속임」 15·16장(노른이 우르드의 샘물과 흙을 날마다 물푸레나무에 부어 가지가 썩지 않게 함, 아이가 태어날 때 노른이 와서 삶을 정함).
//       과거·현재·미래로 읽는 것은 이름 뜻(일어난 것·되어 가는 것·마땅히 올 것)에서 온 흔한 풀이라 화면에서는 "이미 일어난 일" 식으로만 쓴다.
(function () {
  const T = { b1: 2.9, b2: 5.2, w1: 7.6, w2: 9.6, w3: 11.6, b6: 13.8, b7: 16.4, b8: 18.8, b9: 21.0, pour: 21.4, b10: 23.4, b11: 25.8, q: 28.4, brand: 30.2, dur: 32 };
  const CAPS = [
    [0, T.b1, "당신이 태어난 밤<br>세 여인이 나무에<br><em>무언가를 새겼다</em>", "hook"],
    [T.b1, T.b2, "세상을 떠받치는<br>거대한 나무<br><em>이그드라실</em>"],
    [T.b2, T.w1, "그 뿌리 아래<br>샘가에<br><em>세 여인</em>이 살아요"],
    [T.w1, T.w2, "첫째 <em>우르드</em><br>이미 일어난 일"],
    [T.w2, T.w3, "둘째 <em>베르단디</em><br>지금 일어나는 일"],
    [T.w3, T.b6, "셋째 <em>스쿨드</em><br>앞으로 올 일"],
    [T.b6, T.b7, "아이가 태어날 때마다<br>셋은 나무에<br><em class=\"hit\">그 아이의 몫</em>을 새겼대요"],
    [T.b7, T.b8, "그 글자는<br>신들조차<br><em class=\"hit\">바꿀 수 없었다고</em> 해요"],
    [T.b8, T.b9, "그런데 셋이<br>날마다 하는 일이<br><em>하나 더</em> 있었어요"],
    [T.b9, T.b10, "샘물을 길어<br>나무에<br><em class=\"hit\">부어 주는 것</em>"],
    [T.b10, T.b11, "나무가 마르지 않게<br>세상이<br><em>계속 자라도록</em>"],
    [T.b11, T.q, "새긴 글자는 길이 되고<br>그 길을 걷는 건<br>언제나 <em class=\"hit\">당신</em>"],
    [T.q, null, "셋 중 한 명만<br>만날 수 있다면<br><em>누구</em>를 만날래요?"],
  ];
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const world = stage.querySelector(".world");

  // ── 화면 전체: 줄기에 바짝 붙어 시작 → 나무 전체로 물러남 → 천천히 다가감. 글자가 박힐 때·물이 닿을 때 살짝 흔들림
  world.style.transformOrigin = "50% 40%";
  const style = document.createElement("style");
  style.textContent = "@keyframes zoomout { from { transform: scale(1.32); } to { transform: scale(1); } } @keyframes push2 { from { transform: scale(1); } to { transform: scale(1.08); } }";
  document.head.append(style);
  const HITS = [T.b6 + 0.5, T.b6 + 1.0, T.b6 + 1.5, T.b7 + 0.35, T.pour + 0.9];
  anim(world, [`zoomout 1.8s cubic-bezier(0.65, 0, 0.35, 1) ${T.b1}s both`, `push2 ${T.dur - T.b1 - 1.8}s linear ${T.b1 + 1.8}s forwards`].concat(HITS.map((t) => `shake 0.4s linear ${t}s`)));
  stage.querySelector(".flash").style.background = "radial-gradient(circle at 50% 45%, oklch(0.9 0.1 170 / 0.6), transparent 70%)";
  anim(stage.querySelector(".flash"), HITS.map((t) => `flashes 0.5s ease-out ${t}s`));

  // ── 별 (고정 위치)
  const sky = stage.querySelector(".sky");
  for (let k = 0; k < 90; k++) {
    const s = $("i");
    Object.assign(s.style, { left: ((k * 389) % 1080) + "px", top: ((k * 211) % 1250) + "px" });
    anim(s, [`tw ${2 + (k % 5) * 0.7}s ease-in-out ${-(k % 7) * 0.5}s infinite`]);
    sky.append(s);
  }

  // ── 나무: 잎 무리(황금각 나선) · 가지 · 줄기 · 뿌리 · 새긴 룬 넷 · 물줄기 둘
  const leaves = [];
  for (let k = 0; k < 170; k++) {
    const a = k * 2.39996, rr = Math.sqrt(k / 170);
    const x = 540 + Math.cos(a) * rr * 540, y = 430 + Math.sin(a) * rr * 330;
    leaves.push(`<circle class="leaf lit" data-k="${k}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(16 + (k % 5) * 4).toFixed(0)}" />`);
  }
  const branches = [
    ["M540 700C520 560 430 470 300 380", 34], ["M540 700C560 560 650 470 790 370", 34], ["M540 680C540 540 540 420 545 250", 30],
    ["M300 380C240 340 180 330 110 330", 16], ["M300 380C290 300 250 240 200 200", 14], ["M790 370C850 330 910 320 980 330", 16], ["M790 370C800 290 850 230 900 190", 14],
    ["M545 250C500 200 450 180 400 160", 12], ["M545 250C590 200 640 180 690 150", 12],
  ];
  const RUNES = [
    ["M15 0V100M15 20L50 0M15 45L50 25", 470, 660], // 페후
    ["M30 0V100M30 40L5 5M30 40L55 5", 560, 680], // 알기즈
    ["M15 0V100M15 0L45 22L15 45L45 100", 470, 790], // 라이도
    ["M5 10V90L55 10V90L5 10Z", 560, 810], // 다가즈
  ];
  stage.querySelector(".tree").innerHTML = `<svg viewBox="0 0 1080 1920"><defs><linearGradient id="bark" x1="0" x2="1"><stop offset="0" stop-color="oklch(0.18 0.03 60)" /><stop offset="0.45" stop-color="oklch(0.34 0.05 60)" /><stop offset="1" stop-color="oklch(0.16 0.03 60)" /></linearGradient></defs>
    <g class="leaves">${leaves.join("")}</g>
    ${branches.map(([d, w]) => `<path class="branch" d="${d}" stroke-width="${w}" />`).join("")}
    <path class="trunk" d="M455 640C470 760 450 900 430 1040C410 1100 340 1140 250 1170C330 1175 400 1160 450 1130C470 1150 480 1175 470 1200C510 1180 525 1150 540 1130C555 1150 570 1180 610 1200C600 1175 610 1150 630 1130C680 1160 750 1175 830 1170C740 1140 670 1100 650 1040C630 900 610 760 625 640Z" />
    ${RUNES.map(([d, x, y], k) => `<path class="rn" data-k="${k}" d="${d}" transform="translate(${x} ${y}) scale(0.9)" />`).join("")}
    <path class="pour" d="M235 1050C250 800 420 760 500 860" /><path class="pour" d="M845 1050C830 800 660 760 580 860" />
  </svg>`;
  const tree = stage.querySelector(".tree");
  // 잎: 처음엔 어둡게, 물이 닿으면 줄기에서 먼 순서로 켜짐
  tree.querySelectorAll(".leaf").forEach((l) => {
    const k = +l.dataset.k;
    anim(l, [`leaf-on 0.8s ease-out ${T.pour + 1.0 + Math.sqrt(k / 170) * 1.4}s both`]);
  });
  // 룬: 첫 글자는 0초부터 빛남(미리보기), 나머지는 "몫을 새겼대요"에서 하나씩 새겨짐
  tree.querySelectorAll(".rn").forEach((r, k) => {
    if (k === 0) { r.style.strokeDashoffset = 0; anim(r, [`flashes 0.9s ease-out ${T.b6 + 0.3}s`]); return; }
    anim(r, [`carve 0.45s cubic-bezier(0.5, 0, 0.3, 1) ${T.b6 + 0.1 + k * 0.5}s forwards`]);
  });
  tree.querySelectorAll(".pour").forEach((p, k) => anim(p, [`pour 1.6s cubic-bezier(0.4, 0, 0.3, 1) ${T.pour + k * 0.12}s both`]));
  anim(tree.querySelector(".trunk"), [`trunk-glow 1.2s ease-out ${T.pour + 0.9}s forwards`]);

  // ── 세 여인 (우르드 · 베르단디 · 스쿨드)
  const women = stage.querySelector(".women");
  const BODY = `<svg viewBox="0 0 170 300"><path class="body" d="M85 10C52 10 34 40 33 76C32 100 39 116 35 136C21 178 12 228 4 296H166C158 228 149 178 135 136C131 116 138 100 137 76C136 40 118 10 85 10Z" /><path class="face" d="M60 80C60 104 72 118 85 118C98 118 110 104 110 80C110 60 100 44 85 44C70 44 60 60 60 80Z" /><circle class="eye" cx="76" cy="82" r="4" /><circle class="eye" cx="94" cy="82" r="4" /></svg>`;
  const W = [["우르드", "PAST", 215, T.w1], ["베르단디", "PRESENT", 540, T.w2], ["스쿨드", "FUTURE", 865, T.w3]];
  W.forEach(([nm, en, x, t]) => {
    const w = $("div", "norn-w", BODY + `<p class="tag"><b>${nm}</b><span>${en}</span></p>`);
    Object.assign(w.style, { left: x + "px", top: "965px", opacity: 0.55 });
    anim(w, [`w-lit 0.6s var(--ease-out) ${t}s forwards`, `w-rest 0.6s ease-out ${t + 1.9}s forwards`]);
    anim(w.querySelector(".tag"), [`cap-in 0.5s var(--ease-out) ${t + 0.1}s both`, `cap-out 0.5s ease-in ${T.b8}s forwards`]);
    women.append(w);
  });

  // ── 반딧불: 샘에서 천천히 오름 + 물이 닿으면 금빛 무리
  const embers = stage.querySelector(".embers");
  const mote = (x, y, s, dx, dy, dur, delay, inf, g) => {
    const e = $("i", g ? "g" : "");
    Object.assign(e.style, { left: x + "px", top: y + "px" });
    e.style.setProperty("--s", s + "px");
    e.style.setProperty("--dx", dx + "px");
    e.style.setProperty("--dy", dy + "px");
    anim(e, [`ember ${dur}s ease-out ${delay}s ${inf ? "infinite" : "1 both"}`]);
    embers.append(e);
  };
  for (let k = 0; k < 26; k++) mote(260 + ((k * 83) % 560), 1170, 4 + (k % 3) * 2, ((k * 37) % 120) - 60, -300 - ((k * 71) % 500), 4 + (k % 5) * 0.8, -((k * 0.83) % 5), true, false);
  for (let k = 0; k < 50; k++) mote(540 + Math.round(Math.cos(k * 1.3) * 60), 820, 5 + (k % 3) * 3, Math.round(Math.cos(k * 0.9) * (200 + (k * 29) % 300)), -200 - ((k * 89) % 650), 2 + (k % 4) * 0.4, T.pour + 1.0 + (k % 10) * 0.08, false, true);

  // ── 자막
  const caps = stage.querySelector(".caps");
  CAPS.forEach(([a, b, html, cls], k) => {
    const c = $("p", "cap" + (cls ? " " + cls : ""), html);
    c.dataset.cap = "";
    const list = k === 0 ? [] : [`cap-in 0.45s var(--ease-out) ${a}s both`];
    if (k === 0) c.style.opacity = 1; // 첫 프레임(피드 미리보기)부터 결론 문장이 보이게
    if (b != null) list.push(`cap-out 0.3s ease-in ${b - 0.3}s forwards`);
    anim(c, list);
    c.querySelectorAll("em.hit").forEach((h) => anim(h, [`word-hit 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${a + 0.35}s both`]));
    caps.append(c);
  });
  caps.before($("p", "eyebrow", `NORSE · <span>북유럽 신화</span>`));

  // ── 질문: 과거 · 지금 · 앞으로 + 댓글 + 다음 편
  const ask = $("div", "ask");
  ask.style.top = "700px";
  [["과거", "우르드"], ["지금", "베르단디"], ["앞으로", "스쿨드"]].forEach(([a, b], k) => ask.append(anim($("b", "", `<span>${a}<small>${b}</small></span>`), [`pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) ${T.q + 0.5 + k * 0.18}s both`])));
  stage.append(ask);
  anim(women, [`dim 0.8s ease-in ${T.q}s forwards`]);
  const line = $("p", "askline", "댓글로 한 명만 골라 주세요");
  line.style.top = "950px";
  stage.append(anim(line, [`cap-in 0.5s var(--ease-out) ${T.q + 1.3}s both`]));
  const brand = $("div", "brand", `<p>문 너머의 기록 · <b>낯선 점술관</b></p><p>다음 전설 — 나뭇가지 고리 하나로 군대를 멈춘 소년</p>`);
  brand.style.top = "1050px";
  stage.append(anim(brand, [`cap-in 0.6s var(--ease-out) ${T.brand}s both`]));
})();
