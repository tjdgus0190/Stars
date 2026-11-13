// 전설 릴스 「예언서가 부른 검은 돌」(시빌라 신탁의 방) 조립 (2026-11-13). 51초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다. 무작위 값 없음.
// 근거: 리비우스 『로마사』 29권 10장(돌비가 잦자 예언서를 펼쳐 "외적이 이탈리아에 쳐들어오면 이다산의 어머니를 로마로 모셔 오면 몰아낼 수 있다"는 구절을 찾음),
//       11장(바다 건너 페시누스의 신성한 돌을 받아 옴), 14장(오스티아에서 여인들이 맞이함, 그 가운데 평판이 의심받던 클라우디아 퀸타),
//       오비디우스 『축제력』 4권 291~344행(얕은 강어귀에 배가 걸려 아무리 끌어도 움직이지 않자 클라우디아가 "결백하다면 따라오소서" 기도하고 허리띠로 끌어 움직임),
//       리비우스 30권 19~20장(기원전 203년 카르타고의 장군이 본국으로 불려 감). 검은 돌이었다는 묘사는 후대 기록(아르노비우스)에 전해 "전해요"로 쓴다.
// 장군 이름(한니발)은 쓰지 않는다(운영자 확인 2026-11-13). 비웃는 말풍선은 지어낸 군중의 말(특정 인물·집단 아님).
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.6, b3: 9.6, b4: 12.8, b5: 16.2, b6: 19.2, b7: 22.6, b8: 25.8, b9: 29.4, b10: 32.8, b11: 35.8, b12: 38.8, q: 41.8, end: 45.6, dur: 51 };
  const CAPS = [
    [0, T.b1, "예언서 한 줄 때문에<br>로마는 바다 건너<br><em>돌 하나</em>를 모셔 왔다", "hook"],
    [T.h2, T.b1, "", "none"],
    [T.b1, T.b2, "기원전 204년<br>카르타고의 장군이<br><em>14년째</em> 이탈리아를 휩쓸던 때"],
    [T.b2, T.b3, "그해, 하늘에서<br><em class=\"red hit\">돌비</em>가 쏟아졌어요"],
    [T.b3, T.b4, "로마는 깊이 봉해 둔<br>그 책을 펼쳤어요<br><em class=\"hit\">시빌라 예언서</em>"],
    [T.b4, T.b5, "“외적을 몰아내려면<br>이다산의 어머니 여신을<br><em>로마로 모셔 오라</em>”", "quote"],
    [T.b5, T.b6, "로마는 바다 건너<br>여신을 모시러 갔어요<br>그런데 그 여신은…"],
    [T.b6, T.b7, "하늘에서 떨어진<br><em class=\"hit\">검은 돌</em>이었다고 전해요"],
    [T.b7, T.b8, "그런데 강어귀에서<br>배가 <em class=\"red hit\">멈춰 버렸어요</em><br>아무리 끌어도 꿈쩍 않았죠"],
    [T.b8, T.b9, "그때 나선 건<br>'행실이 나쁘다'는<br>소문에 시달리던 여인<br><em>클라우디아</em>"],
    [T.b9, T.b10, "“제가 결백하다면<br>여신이여, 따라오소서”<br>허리띠로 끌자<br><em class=\"hit\">배가 움직였어요</em>"],
    [T.b10, T.b11, "이듬해<br>14년을 버틴 장군은<br><em class=\"red hit\">본국으로 불려 갔어요</em>"],
    [T.b11, T.b12, "로마는 그 돌을<br>신전에 모시고<br>해마다 <em>축제</em>를 열었대요"],
    [T.b12, T.q, "예언서 한 줄이<br>한 나라의 운명을<br><em class=\"hit\">바꾼 거예요</em>"],
    [T.q, T.end, "당신이 로마 원로원이었다면<br><em>어떻게 했을까요?</em>"],
  ];
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const world = stage.querySelector(".world");

  // ── 화면 전체: 한 방마다 흔들림 + 번쩍
  const WHITE = [0.02, T.b3 + 0.35, T.b6 + 0.9, T.b9 + 2.0, T.b12 + 0.35];
  const RED = [T.h2, T.b2 + 0.5, T.b2 + 1.3, T.b7 + 0.35, T.b10 + 0.35];
  anim(world, [`push ${T.dur}s linear 0s both`].concat(WHITE.concat(RED).map((t) => `shake 0.45s linear ${t}s`)));
  anim(stage.querySelector(".flash"), WHITE.concat([T.end + 1.1]).map((t) => `flashes 0.6s ease-out ${t}s`));
  anim(stage.querySelector(".redflash"), RED.map((t) => `flashes 0.7s ease-out ${t}s`));

  // ── 명화 장면 (메트로폴리탄·클리블랜드 미술관 CC0, art/)
  const ENG = "sepia(0.55) contrast(1.3) brightness(0.92)";
  const D = { img: "legend/art/sibyl-drost.jpg", w: 1739, h: 2200 }, U = { img: "legend/art/sibyl-ugo.jpg", w: 1790, h: 2200 };
  const P = { img: "legend/art/temple-panini.jpg", w: 1713, h: 2200 }, HD = { img: "legend/art/hannibal-desprez.jpg", w: 2200, h: 1295 };
  const G = { img: "legend/art/hannibal-gois.jpg", w: 1744, h: 2200 }, F = { img: "legend/art/fleet-lorrain.jpg", w: 2200, h: 1528 };
  const DROST = "brightness(1.75) contrast(1.15) saturate(1.1)";
  const S = (o, x) => Object.assign({}, o, x);
  Paint.shots(stage.querySelector(".paint"), [
    S(D, { t0: 0, t1: T.b1, a: [0.45, 0.36, 1.25], b: [0.45, 0.33, 1.7], cy: 0.56, grade: DROST }),
    S(HD, { t0: T.b1, t1: T.b2, a: [0.2, 0.5, 1.0], b: [0.75, 0.5, 1.0], grade: ENG, cut: "whip" }),
    S(F, { t0: T.b2, t1: T.b3, a: [0.5, 0.25, 1.15], b: [0.55, 0.3, 1.35], grade: "sepia(0.4) saturate(1.4) hue-rotate(-15deg) contrast(1.3) brightness(0.6)", cut: "flash" }),
    S(U, { t0: T.b3, t1: T.b4, a: [0.45, 0.3, 1.2], b: [0.6, 0.28, 1.9], grade: ENG, cut: "flash" }),
    S(D, { t0: T.b4, t1: T.b5, a: [0.45, 0.33, 1.6], b: [0.45, 0.3, 2.3], cy: 0.58, grade: DROST + " brightness(0.8)" }),
    S(F, { t0: T.b5, t1: T.b6, a: [0.25, 0.4, 1.0], b: [0.55, 0.45, 1.2], grade: "saturate(1.1) contrast(1.1)", cut: "whip" }),
    S(F, { t0: T.b6, t1: T.b7, a: [0.5, 0.3, 1.1], b: [0.5, 0.3, 1.2], grade: "brightness(0.35) saturate(0.6) blur(4px)" }),
    S(F, { t0: T.b7, t1: T.b8, a: [0.52, 0.5, 2.0], b: [0.55, 0.52, 2.4], grade: "sepia(0.2) contrast(1.25) brightness(0.8)", cut: "flash" }),
    S(F, { t0: T.b8, t1: T.b9, a: [0.72, 0.82, 2.4], b: [0.68, 0.8, 3.0], grade: "contrast(1.15) brightness(0.9)", cut: "whip" }),
    S(F, { t0: T.b9, t1: T.b10, a: [0.55, 0.55, 1.6], b: [0.45, 0.5, 1.25], grade: "saturate(1.2) contrast(1.15) brightness(1.05)" }),
    S(G, { t0: T.b10, t1: T.b11, a: [0.3, 0.5, 1.15], b: [0.22, 0.45, 1.5], grade: ENG, cut: "flash" }),
    S(P, { t0: T.b11, t1: T.b12, a: [0.5, 0.15, 1.15], b: [0.5, 0.6, 1.0], grade: "saturate(1.1) contrast(1.1)", cut: "whip" }),
    S(D, { t0: T.b12, t1: T.q, a: [0.45, 0.33, 1.4], b: [0.45, 0.33, 1.9], cy: 0.56, grade: DROST }),
    S(D, { t0: T.q, t1: null, a: [0.45, 0.4, 1.1], b: [0.45, 0.4, 1.25], grade: DROST + " brightness(0.5) blur(3px)" }),
  ]);
  const gold = stage.querySelector(".tint.gold"), red = stage.querySelector(".tint.red");
  gold.style.setProperty("--o", 0.65);
  anim(gold, [`tint-on 0.6s ease-out ${T.b3}s both`, `tint-off 0.4s ease-in ${T.b5}s forwards`, `tint-on 0.5s ease-out ${T.b9 + 1.9}s`, `tint-off 0.5s ease-in ${T.b10}s forwards`, `tint-on 0.6s ease-out ${T.b11}s`, `tint-off 0.4s ease-in ${T.q}s forwards`]);
  red.style.setProperty("--o", 0.85);
  anim(red, [`tint-on 0.3s ease-out ${T.b2 + 0.3}s both`, `tint-off 0.4s ease-in ${T.b3}s forwards`, `tint-on 0.3s ease-out ${T.b10}s`, `tint-off 0.4s ease-in ${T.b11}s forwards`]);
  anim(stage.querySelector(".leak"), [T.b3, T.b5, T.b9 + 2.0, T.b11].map((t) => `leak 0.9s ease-out ${t - 0.2}s`));

  // ── 돌비 (6.6~9.6)
  const met = stage.querySelector(".meteors");
  for (let k = 0; k < 16; k++) {
    const m = $("i");
    Object.assign(m.style, { left: ((k * 157) % 900) - 120 + "px", top: ((k * 89) % 500) + "px", height: 160 + (k % 4) * 60 + "px" });
    anim(m, [`fall ${0.9 + (k % 3) * 0.25}s cubic-bezier(0.5, 0, 0.9, 0.6) ${T.b2 + 0.2 + (k % 8) * 0.32}s both`]);
    met.append(m);
  }

  // ── 하늘에서 떨어진 검은 돌 (19.2~22.6): 바위 결은 SVG 잡음 + 빛으로
  const stone = stage.querySelector(".stone");
  stone.innerHTML = `<div class="halo"></div><svg viewBox="0 0 560 520"><defs>
    <filter id="rock" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="5" seed="7" result="n" />
      <feDiffuseLighting in="n" surfaceScale="6" lighting-color="#c9b48a" result="l"><feDistantLight azimuth="225" elevation="38" /></feDiffuseLighting>
      <feComposite in="l" in2="SourceGraphic" operator="in" result="lit" /><feBlend in="lit" in2="SourceGraphic" mode="multiply" /></filter>
    <radialGradient id="rg" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#4a4038" /><stop offset="0.55" stop-color="#1c1814" /><stop offset="1" stop-color="#070605" /></radialGradient></defs>
    <path d="M120 120C170 50 290 30 370 70C450 100 520 170 515 260C512 340 470 420 380 470C300 510 190 500 120 440C60 390 30 320 45 240C55 190 80 160 120 120Z" fill="url(#rg)" filter="url(#rock)" />
    <path d="M150 140C200 95 270 85 330 105" fill="none" stroke="oklch(0.85 0.1 80 / 0.45)" stroke-width="6" stroke-linecap="round" /></svg>`;
  anim(stone, [`stone-in 1.1s cubic-bezier(0.3, 0, 0.3, 1) ${T.b6 + 0.1}s both`, `hide 0.5s ease-in ${T.b7 - 0.2}s forwards`]);
  anim(stone.querySelector("svg"), [`stone-float 3s ease-in-out ${T.b6 + 1.2}s infinite`]);
  anim(stone.querySelector(".halo"), [`halo-pulse 2s ease-in-out ${T.b6 + 1.0}s infinite`]);
  const shadeS = $("div", "shade-stone");
  stage.querySelector(".grade").after(anim(shadeS, [`show 0.5s ease-out ${T.b6}s both`, `hide 0.5s ease-in ${T.b7 - 0.2}s forwards`]));

  // ── 비웃는 사람들 (25.8~29.4)
  const BUB = [
    ["강가의 사내", "저 여자가 뭘 하겠다고?", 120, 720, 280],
    ["뱃사공", "장정 백 명도 못 했는데 ㅋㅋ", 400, 860, 40],
    ["구경꾼", "소문 다 들었는데…", 150, 1000, 150],
  ];
  const bubbles = stage.querySelector(".bubbles");
  BUB.forEach(([who, txt, x, y, h], k) => {
    const b = $("div", "bub", `<i></i><span><small>${who}</small>${txt}</span>`);
    Object.assign(b.style, { left: x + "px", top: y + "px" });
    b.querySelector("i").style.setProperty("--av", `linear-gradient(135deg, oklch(0.75 0.12 ${h}), oklch(0.55 0.14 ${h + 40}))`);
    anim(b, [`bub-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${T.b8 + 0.8 + k * 0.6}s both`, `bub-out 0.3s ease-in ${T.b9 - 0.1}s forwards`]);
    bubbles.append(b);
  });
  // 배가 움직이는 순간 금빛 물결
  const heave = $("div", "heave");
  stage.querySelector(".grade").after(anim(heave, [`heave 1.6s ease-out ${T.b9 + 2.0}s both`]));

  // ── 자막
  const caps = stage.querySelector(".caps");
  CAPS.forEach(([a, b, html, cls], k) => {
    if (cls === "none") return;
    const c = $("p", "cap" + (cls ? " " + cls : ""), html);
    c.dataset.cap = "";
    const list = k === 0 ? [] : [`cap-in 0.5s var(--ease-out) ${a}s both`];
    if (k === 0) c.style.opacity = 1;
    if (b != null) list.push(`cap-out 0.35s ease-in ${b - 0.35}s forwards`);
    anim(c, list);
    c.querySelectorAll("em.hit").forEach((h) => anim(h, [`word-hit 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${a + 0.3}s both`]));
    caps.append(c);
  });
  // 1.2초 한 방: 첫 문장 아래에 "그리고 적이 떠났다"
  const h2 = $("p", "cap h2", "<br><br><br>그리고 <em class=\"red hit\">적이 떠났다</em>");
  h2.style.top = "0px";
  h2.style.fontSize = "80px";
  h2.style.lineHeight = "1.3";
  anim(h2, [`cap-in 0.3s var(--ease-out) ${T.h2}s both`, `cap-out 0.35s ease-in ${T.b1 - 0.35}s forwards`]);
  anim(h2.querySelector("em"), [`word-hit 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${T.h2 + 0.05}s both`]);
  caps.append(h2);
  caps.before(anim($("p", "eyebrow", `STRANGE ORACLE · <span>시빌라 신탁의 방의 전설</span>`), [`hide 0.4s ease-in ${T.end}s forwards`]));

  // ── 질문 + 끝 화면
  const shade = $("div", "endshade");
  stage.querySelector(".grade").after(anim(shade, [`show 0.8s ease-out ${T.q - 0.2}s both`]));
  const ask = $("div", "ask");
  [["돌을 모셔 온다", ""], ["군대를 더 보낸다", "no"]].forEach(([t, c], k) => ask.append(anim($("b", c, t), [`pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) ${T.q + 0.6 + k * 0.3}s both`])));
  stage.append(anim(ask, [`hide 0.4s ease-in ${T.end - 0.4}s forwards`]));
  stage.append(anim($("p", "askline", "당신의 선택을 댓글로 남겨 주세요"), [`cap-in 0.6s var(--ease-out) ${T.q + 1.4}s both`, `hide 0.4s ease-in ${T.end - 0.4}s forwards`]));
  const end = $("div", "endcard", `<p class="e1">이 전설이 잠든 곳</p>
    <p class="e2"><b>Ⅶ</b> 시빌라 신탁의 방</p>
    <p class="logo e3">낯선 점술관</p>
    <p class="e4">STRANGE ORACLE</p>
    <p class="e5">고민 하나를 적으면<br>시빌라의 신탁 한 줄이 내려요</p>
    <p class="e6">프로필 링크에서 일곱 번째 문</p>
    <p class="e7">다음 전설 — 독이 든 술잔에 룬을 새기자</p>`);
  [["e1", 0.2], ["e2", 0.6], ["e3", 1.1], ["e4", 1.5], ["e5", 2.1], ["e6", 2.8], ["e7", 3.4]].forEach(([c, d]) => anim(end.querySelector("." + c), [`cap-in 0.7s var(--ease-out) ${T.end + d}s both`]));
  anim(end.querySelector(".e3"), [`big-in 0.9s var(--ease-out) ${T.end + 1.1}s both`, `logo-shimmer 1.8s ease-in-out ${T.end + 1.6}s both`]);
  stage.append(end);
})();
