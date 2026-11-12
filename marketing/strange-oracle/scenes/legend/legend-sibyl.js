// 전설 릴스 1화 「예언서를 불태운 노파」 조립 (2026-11-12). 32초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다.
// 근거(storyboard.md 「전설 릴스」): 로마 왕에게 무녀가 예언서 아홉 권을 팔러 옴 → 거절할 때마다 세 권씩 불태우고 같은 값 → 왕이 남은 세 권을 처음 값에 삼
// → 로마가 신전에 두고 위기 때 열어 봄 → 기원전 83년 카피톨리움 신전 화재로 사라짐(전해요). 왕 이름·값의 액수는 판본마다 달라 쓰지 않는다.
(function () {
  const T = { b1: 2.9, b2: 5.0, b3: 7.6, b4: 9.4, toss1: 10.0, b5: 12.0, b6: 14.0, toss2: 14.4, b7: 16.2, b8: 18.8, buy: 19.3, b9: 21.4, b10: 23.6, b11: 25.9, fire: 26.5, q: 28.6, brand: 30.2, dur: 32 };
  const CAPS = [
    [0, T.b1, "왕이 거절할 때마다<br>노파는 예언서를<br><em>불태웠다</em>", "hook"],
    [T.b1, T.b2, "옛 로마,<br>낯선 노파가<br>왕을 찾아왔어요"],
    [T.b2, T.b3, "손에는 예언서 <em>아홉 권</em>.<br>값은 터무니없이<br>비쌌죠"],
    [T.b3, T.b4, "왕은 웃으며<br><em>거절</em>했어요"],
    [T.b4, T.b5, "그러자 노파는<br>세 권을<br><em class=\"hit\">불에 던졌어요</em>"],
    [T.b5, T.b6, "그리고<br><em>같은 값</em>을<br>다시 불렀죠"],
    [T.b6, T.b7, "또 거절.<br>또 <em class=\"hit\">세 권</em>."],
    [T.b7, T.b8, "남은 건 세 권.<br>값은…<br><em>처음 그대로</em>"],
    [T.b8, T.b9, "왕은 결국<br><em class=\"hit\">그 값을 다 주고</em><br>샀어요"],
    [T.b9, T.b10, "그 노파는<br>미래를 읽는 무녀<br><em>시빌라</em>였대요"],
    [T.b10, T.b11, "로마는 세 권을<br>신전 깊이 숨기고<br>위기 때만 <em>펼쳐 봤대요</em>"],
    [T.b11, T.q, "그런데 기원전 83년<br>신전에 큰불이 나<br>세 권마저<br><em class=\"hit\">재가 됐다고</em> 전해요"],
    [T.q, null, "당신이 왕이었다면<br><em>몇 권째</em>에 샀을까요?"],
  ];
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const world = stage.querySelector(".world");
  const BOOM = [T.toss1 + 0.5, T.toss2 + 0.5, T.buy, T.fire];

  // ── 화면 전체: 천천히 다가가기 + 불길이 치솟을 때 흔들림
  anim(world, [`push ${T.dur}s linear 0s both`].concat(BOOM.map((t) => `shake 0.5s linear ${t}s`)));
  anim(stage.querySelector(".flash"), BOOM.map((t) => `flashes 0.6s ease-out ${t}s`));
  anim(stage.querySelector(".glow"), [T.toss1 + 0.5, T.toss2 + 0.5].map((t) => `glowflare 1.4s ease-out ${t}s`));

  // ── 화로 불꽃: 네 갈래가 서로 다른 박자로 흔들림, 두루마리가 들어갈 때 치솟음
  const flames = stage.querySelector(".flames");
  [[-80, 130, 230, 0.9], [-30, 170, 300, 1.3], [40, 150, 260, 1.1], [-130, 100, 170, 0.75], [90, 110, 190, 0.85]].forEach(([x, w, h, d], k) => {
    const f = $("i");
    Object.assign(f.style, { left: x - w / 2 + 25 + "px", width: w + "px", height: h + "px" });
    anim(f, [`flick ${d}s ease-in-out ${-k * 0.37}s infinite`]);
    flames.append(f);
  });
  anim(flames, [T.toss1 + 0.5, T.toss2 + 0.5].map((t) => `flare 1.5s cubic-bezier(0.2, 0.8, 0.3, 1) ${t}s`));

  // ── 불티: 화로에서 위로 (번호로 정한 길이·흔들림). 불길이 치솟을 때 한 무리 더
  const embers = stage.querySelector(".embers");
  const ember = (x, y, s, dx, dy, dur, delay, inf) => {
    const e = $("i");
    Object.assign(e.style, { left: x + "px", top: y + "px" });
    e.style.setProperty("--s", s + "px");
    e.style.setProperty("--dx", dx + "px");
    e.style.setProperty("--dy", dy + "px");
    anim(e, [`ember ${dur}s ease-out ${delay}s ${inf ? "infinite" : "1 both"}`]);
    embers.append(e);
  };
  for (let k = 0; k < 28; k++) ember(470 + ((k * 53) % 140), 1080, 4 + (k % 4) * 2, ((k * 37) % 160) - 80, -380 - ((k * 71) % 420), 2.2 + (k % 5) * 0.45, -((k * 0.61) % 3.4), true);
  [T.toss1 + 0.5, T.toss2 + 0.5].forEach((t, j) => { for (let k = 0; k < 26; k++) ember(540, 1060, 5 + (k % 3) * 3, Math.round(Math.cos(k * 0.9 + j) * (180 + (k * 23) % 260)), -300 - ((k * 89) % 700), 1.4 + (k % 4) * 0.3, t + (k % 5) * 0.03, false); });
  for (let k = 0; k < 60; k++) ember(((k * 97) % 1080), 1500, 6 + (k % 4) * 3, ((k * 41) % 200) - 100, -900 - ((k * 61) % 700), 1.8 + (k % 5) * 0.35, T.fire + 0.2 + (k % 20) * 0.12, false);

  // ── 노파: 두건 그림자, 눈만 빛남. 시빌라라고 밝힐 때 금빛 테두리
  const fig = stage.querySelector(".figure");
  fig.innerHTML = `<svg viewBox="0 0 300 480"><path class="body" d="M150 20C95 20 62 70 60 128C58 170 70 196 64 230C40 300 22 380 10 470H290C278 380 262 300 238 230C232 196 244 170 240 128C238 70 205 20 150 20ZM150 70C120 70 104 100 104 134C104 172 124 196 150 196C176 196 196 172 196 134C196 100 180 70 150 70Z" fill-rule="evenodd" /><path class="body" d="M104 134C104 172 124 196 150 196C176 196 196 172 196 134C196 100 180 70 150 70C120 70 104 100 104 134Z" style="fill:oklch(0.05 0.01 320)" /><circle class="eye" cx="133" cy="138" r="6" /><circle class="eye" cx="167" cy="138" r="6" /><path class="body" d="M238 250C262 260 282 300 272 330L248 318" /></svg>`;
  anim(fig, [`fig-in 0.9s var(--ease-out) ${T.b1 + 0.1}s both`, `rim 1.2s ease-out ${T.b9 + 0.2}s forwards`, `dim 0.8s ease-in ${T.b10}s forwards`]);
  fig.querySelectorAll(".eye").forEach((e) => anim(e, [`eyes 1.6s ease-in-out ${T.b1 + 0.9}s 1 both`, `eyes 1.4s ease-in-out ${T.b4 + 0.2}s 1`, `eyes 2.2s ease-in-out ${T.b9 + 0.1}s 1 forwards`]));

  // ── 두루마리 아홉 권: 왼쪽 셋 → 첫 불, 오른쪽 셋 → 둘째 불, 가운데 셋이 남아 금빛 → 신전으로 → 큰불
  const sc = stage.querySelector(".scrolls");
  const BX = 540, BY = 1090;
  const X0 = 326, GAP = 64;
  const items = [];
  for (let i = 0; i < 9; i++) {
    const x = X0 + i * GAP + (i >= 3 ? 14 : 0) + (i >= 6 ? 14 : 0), y = 790 + Math.abs(i - 4) * 8;
    const s = $("div", "scroll", `<div class="pp"></div><div class="rod t"></div><div class="rod b"></div><div class="seal"></div>`);
    Object.assign(s.style, { left: x + "px", top: y + "px" });
    s.style.setProperty("--dx", BX - x + "px");
    s.style.setProperty("--dy", BY - y + "px");
    s.style.setProperty("--tx", (540 - x) * 0.55 + "px");
    s.style.setProperty("--ty", "-40px");
    const appear = `scroll-in 0.45s var(--ease-out) ${T.b2 + 0.15 + i * 0.09}s both`;
    const bob = `bob ${2.4 + (i % 3) * 0.3}s ease-in-out ${-i * 0.4}s infinite`;
    const list = [appear];
    if (i < 3) list.push(`toss 0.9s cubic-bezier(0.45, 0, 0.7, 1) ${T.toss1 + i * 0.07}s forwards`);
    else if (i >= 6) list.push(`toss 0.9s cubic-bezier(0.45, 0, 0.7, 1) ${T.toss2 + (i - 6) * 0.07}s forwards`);
    else list.push(`goldglow 1.2s ease-out ${T.buy}s forwards`, `totemple 1.4s var(--ease-in-out) ${T.b10 + 0.1}s forwards`, `burnaway 1.6s ease-in ${T.fire + 0.3}s forwards`);
    anim(s, list);
    items.push(s);
    sc.append(s);
  }

  // ── 뒤의 큰 숫자 9 → 6 → 3
  const big = stage.querySelector(".bignum");
  [[9, T.b2 + 0.2, T.toss1 + 0.55], [6, T.toss1 + 0.6, T.toss2 + 0.55], [3, T.toss2 + 0.6, T.b10]].forEach(([n, a, b]) => {
    big.append(anim($("b", "", n), [`big-in 0.6s var(--ease-out) ${a}s both`, `num-out 0.4s ease-in ${b}s forwards`]));
  });

  // ── 계기판: 예언서 N권 · 값(그대로)
  const hud = stage.querySelector(".hud");
  const p1 = $("div", "pill", `예언서 <span class="n"></span>권`);
  const n = p1.querySelector(".n");
  [[9, T.b2 + 0.9, T.toss1 + 0.55], [6, T.toss1 + 0.6, T.toss2 + 0.55], [3, T.toss2 + 0.6, null]].forEach(([v, a, b]) => {
    n.append(anim($("b", "", v), [`num-in 0.45s var(--ease-out) ${a}s both`].concat(b ? [`num-out 0.25s ease-in ${b}s forwards`] : [])));
  });
  const p2 = $("div", "pill", `<span class="coin"></span>값 그대로`);
  anim(p1, [`pill-in 0.5s var(--ease-out) ${T.b2 + 0.8}s both`, `cap-out 0.4s ease-in ${T.b9}s forwards`]);
  anim(p2, [`pill-in 0.5s var(--ease-out) ${T.b2 + 1.0}s both`, `pulse 0.6s ease-out ${T.b5 + 0.3}s`, `pulse 0.6s ease-out ${T.b7 + 0.6}s`, `cap-out 0.4s ease-in ${T.b9}s forwards`]);
  hud.append(p1, p2);

  // ── 신전 (세 권이 들어가는 곳)
  const temple = stage.querySelector(".temple");
  temple.innerHTML = `<svg viewBox="0 0 900 620"><path d="M60 170L450 30L840 170Z" /><path d="M40 170H860M60 200H840" />${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${110 + k * 136}" y="215" width="44" height="330" rx="6" />`).join("")}<path d="M30 560H870M10 600H890" /></svg>`;
  anim(temple, [`temple-in 1s var(--ease-out) ${T.b10}s both`, `cap-out 1s ease-in ${T.fire + 0.6}s forwards`]);

  // ── 큰불: 아래에서 화면을 채우고, 질문 때 잦아든다
  const inf = stage.querySelector(".inferno");
  anim(inf, [`rise-fire 1.4s cubic-bezier(0.3, 0, 0.2, 1) ${T.fire}s both`, `fall-fire 1.2s ease-in-out ${T.q}s forwards`]);
  inf.querySelectorAll("i").forEach((f, k) => anim(f, [`flick ${0.8 + k * 0.25}s ease-in-out ${-k * 0.3}s infinite`, `cap-out 0.6s ease-in ${T.q}s forwards`]));
  anim(stage.querySelector(".brazier"), [`dim 1s ease-in ${T.b10}s forwards`]);

  // ── 자막
  const caps = stage.querySelector(".caps");
  CAPS.forEach(([a, b, html, cls], k) => {
    const c = $("p", "cap" + (cls ? " " + cls : ""), html);
    c.dataset.cap = "";
    const list = k === 0 ? [] : [`cap-in 0.45s var(--ease-out) ${a}s both`];
    if (k === 0) c.style.opacity = 1; // 첫 프레임(피드 미리보기)부터 결론 문장이 보이게
    if (b != null) list.push(`cap-out 0.3s ease-in ${b - 0.3}s forwards`);
    anim(c, list);
    c.querySelectorAll("em.hit").forEach((h) => anim(h, [`word-hit 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${k === 0 ? 0.35 : a + 0.35}s both`]));
    caps.append(c);
  });
  const eb = $("p", "eyebrow", `ROME · <span>로마의 전설</span>`);
  stage.querySelector(".caps").before(eb);

  // ── 질문: 9 · 6 · 3 + 댓글 + 다음 편
  const ask = $("div", "ask");
  [9, 6, 3].forEach((v, k) => ask.append(anim($("b", "", `<span>${v}<small>권째</small></span>`), [`pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) ${T.q + 0.5 + k * 0.18}s both`])));
  stage.append(ask);
  stage.append(anim($("p", "askline", "댓글로 숫자 하나만 남겨 주세요"), [`cap-in 0.5s var(--ease-out) ${T.q + 1.3}s both`]));
  const brand = $("div", "brand", `<p>문 너머의 기록 · <b>낯선 점술관</b></p><p>다음 전설 — 지혜를 위해 한쪽 눈을 내준 신</p>`);
  stage.append(anim(brand, [`cap-in 0.6s var(--ease-out) ${T.brand}s both`]));
})();
