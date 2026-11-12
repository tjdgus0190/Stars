// 전설 릴스 「아무도 믿지 않은 예언」(카산드라) 조립 (2026-11-12). 32초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다. 무작위 값 없음.
// 근거: 아폴론이 예언의 힘을 주었으나 카산드라가 거절하자 아무도 믿지 않게 하는 저주를 내림(아폴로도로스 『비블리오테케』 3.12.5, 아이스킬로스 『아가멤논』 1202~1212행),
//       목마를 들이지 말라고 경고했으나 트로이 사람들이 믿지 않음(베르길리우스 『아이네이스』 2권 246~247행). "카산드라"는 오늘날 옳은 경고를 해도 믿어 주지 않는 사람을 가리키는 말로 쓰인다.
// 화면에 피·죽음 없음(성벽 탑이 넘어지는 실루엣까지). 비웃는 댓글은 지어낸 트로이 사람들의 말(실존 인물·특정 집단 아님).
(function () {
  const T = { h2: 1.1, b1: 2.6, b2: 4.4, b3: 6.4, b4: 8.2, curse: 10.0, b6: 12.2, b7: 14.6, b8: 17.0, b9: 19.0, b10: 21.4, b11: 23.6, q: 26.6, brand: 29.8, dur: 32 };
  const CAPS = [
    [0, T.b1, "그녀의 예언은<br><em>전부 맞았다</em>", "hook"],
    [T.h2, T.b1, "그런데 <em class=\"red hit\">아무도</em><br><em class=\"red hit\">안 믿었다</em>", "h2"],
    [T.b1, T.b2, "트로이의 공주<br><em>카산드라</em>"],
    [T.b2, T.b3, "태양신 아폴론이 반해<br>그녀에게<br><em>미래를 보는 눈</em>을 줬어요"],
    [T.b3, T.b4, "그런데 그녀가<br>아폴론을<br><em class=\"red hit\">거절</em>하자"],
    [T.b4, T.curse, "신은 그 힘을<br>빼앗지 않았어요<br>대신…"],
    [T.curse, T.b6, "<em class=\"red\">아무도 믿지 못하게</em><br>저주를 걸었죠", "glitchy"],
    [T.b6, T.b7, "그녀가 외쳤어요<br>“저 목마 안에<br><em class=\"hit\">군대가 있어!</em>”"],
    [T.b7, T.b8, "사람들은<br><em class=\"red hit\">비웃었어요</em>"],
    [T.b8, T.b9, "그날 밤<br>목마의 문이<br><em class=\"red hit\">열렸어요</em>"],
    [T.b9, T.b10, "트로이는<br><em class=\"red hit\">하룻밤 만에</em><br>무너졌어요"],
    [T.b10, T.b11, "그녀는<br>전부 알고 있었어요<br><em class=\"hit\">처음부터</em>"],
    [T.b11, T.q, "그래서 지금도<br>이런 사람을<br><em>카산드라</em>라고 불러요"],
    [T.q, null, "당신이 트로이에 있었다면<br>그녀를 <em>믿었을까요?</em>"],
  ];
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const world = stage.querySelector(".world");
  const show = (el, a, b, inName = "show 0.4s ease-out", outName = "hide 0.4s ease-in") => anim(el, [`${inName} ${a}s both`].concat(b != null ? [`${outName} ${b}s forwards`] : []));

  // ── 화면 전체: 한 방마다 흔들림 + 번쩍
  const WHITE = [0.02, T.h2, T.b3 + 0.35, T.b6 + 0.35];
  const RED = [T.curse, T.b8 + 0.35, T.b9 + 0.1, T.b9 + 0.7];
  anim(world, [`push ${T.dur}s linear 0s both`].concat(WHITE.concat(RED).map((t) => `shake 0.45s linear ${t}s`)));
  anim(stage.querySelector(".flash"), WHITE.map((t) => `flashes 0.45s ease-out ${t}s`));
  anim(stage.querySelector(".redflash"), RED.map((t) => `flashes 0.7s ease-out ${t}s`));

  // ── 별
  const sky = stage.querySelector(".sky");
  for (let k = 0; k < 80; k++) {
    const s = $("i");
    Object.assign(s.style, { left: ((k * 389) % 1080) + "px", top: ((k * 211) % 1250) + "px" });
    anim(s, [`tw ${2 + (k % 5) * 0.7}s ease-in-out ${-(k % 7) * 0.5}s infinite`]);
    sky.append(s);
  }

  // ── 카산드라의 얼굴: 0초부터 큰 눈으로 노려봄 → 저주 때 눈이 붉게 → 목마 장면에서 성벽 위로 작아짐 → "전부 알고 있었어요"에 다시 크게
  const face = stage.querySelector(".face");
  const almond = (cx, cy) => `M${cx - 70} ${cy}Q${cx} ${cy - 46} ${cx + 70} ${cy}Q${cx} ${cy + 46} ${cx - 70} ${cy}Z`;
  face.innerHTML = `<svg viewBox="0 0 640 760"><path class="hood" d="M320 20C190 20 110 120 104 250C100 330 120 380 108 440C70 560 40 660 20 760H620C600 660 570 560 532 440C520 380 540 330 536 250C530 120 450 20 320 20Z" />
    <path class="skin" d="M190 300C190 420 250 500 320 500C390 500 450 420 450 300C450 200 395 140 320 140C245 140 190 200 190 300Z" />
    <g class="eyes"><path class="eye" d="${almond(250, 320)}" /><path class="eye" d="${almond(390, 320)}" /><circle class="pupil" cx="250" cy="320" r="17" /><circle class="pupil" cx="390" cy="320" r="17" />
    <path class="eye r" d="${almond(250, 320)}" /><path class="eye r" d="${almond(390, 320)}" /></g></svg>`;
  const eyes = face.querySelector(".eyes");
  eyes.style.transformBox = "fill-box";
  eyes.style.transformOrigin = "50% 50%";
  anim(eyes, [`blink 0.22s ease-in-out 1.9s`, `blink 0.22s ease-in-out ${T.b4 + 0.6}s`, `blink 0.22s ease-in-out ${T.b10 + 1.2}s`]);
  face.querySelectorAll(".eye.r").forEach((e) => anim(e, [`show 0.25s ease-out ${T.curse}s both`, `hide 0.6s ease-in ${T.b10}s forwards`]));
  anim(face, [`stare ${T.b1}s cubic-bezier(0.2, 0.7, 0.3, 1) 0s both`, `face-away 0.8s var(--ease-in-out) ${T.b6}s forwards`, `face-back 0.9s var(--ease-out) ${T.b10}s forwards`, `dim 0.6s ease-in ${T.b11}s forwards`]);

  // ── 화면 깨짐(1.1초): 한 점에서 뻗는 금
  const C = [600, 760];
  const crackPaths = [];
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + 0.3;
    let x = C[0], y = C[1], d = `M${x} ${y}`;
    for (let s = 1; s <= 5; s++) {
      const r = 110 + ((k * 37 + s * 13) % 60), aa = a + (((k + s) % 3) - 1) * 0.22;
      x += Math.cos(aa) * r; y += Math.sin(aa) * r;
      d += `L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    crackPaths.push(`<path d="${d}" />`);
  }
  for (let k = 0; k < 3; k++) crackPaths.push(`<path d="M${C[0]} ${C[1] - 60 - k * 70}${Array.from({ length: 12 }, (_, s) => { const a = (s / 11) * Math.PI * 2; return `${s ? "L" : "M"}${(C[0] + Math.cos(a) * (70 + k * 80)).toFixed(0)} ${(C[1] + Math.sin(a) * (70 + k * 80)).toFixed(0)}`; }).join("")}" />`);
  const crack = stage.querySelector(".crack");
  crack.innerHTML = `<svg viewBox="0 0 1080 1920">${crackPaths.join("")}</svg>`;
  crack.querySelectorAll("path").forEach((p, k) => anim(p, [`crack 0.28s cubic-bezier(0.1, 0.9, 0.3, 1) ${T.h2 + (k % 4) * 0.02}s forwards`]));
  anim(crack, [`hide 0.4s ease-in ${T.b1 - 0.2}s forwards`]);

  // ── 아폴론의 해(선물) → 저주의 붉은 고리
  const [sun, sunR] = stage.querySelectorAll(".sun");
  anim(sun, [`sun-in 0.8s var(--ease-out) ${T.b2}s both`, `hide 0.3s ease-in ${T.curse}s forwards`]);
  anim(sunR, [`show 0.2s ease-out ${T.curse}s both`, `hide 0.5s ease-in ${T.b6}s forwards`]);
  stage.querySelectorAll(".sun .rays").forEach((r) => anim(r, [`spin 14s linear 0s infinite`]));

  // ── 트로이 성벽(탑 다섯) · 목마
  const city = stage.querySelector(".city");
  const towers = [[60, 120], [250, 80], [470, 150], [700, 90], [900, 130]];
  city.innerHTML = `<svg viewBox="0 0 1080 300"><path class="wall" d="M0 300V150H1080V300Z" />${towers.map(([x, h], k) => `<path class="wall tw t${k}" d="M${x} 152V${150 - h}h20v-26h24v26h22v-26h24v26h20V152Z" />`).join("")}</svg>`;
  show(city, T.b6, T.b10 + 0.6, "show 0.5s ease-out");
  city.querySelectorAll(".tw").forEach((t, k) => anim(t, [`${k % 2 ? "fall-r" : "fall-l"} 0.9s cubic-bezier(0.5, 0, 0.8, 0.6) ${T.b9 + 0.1 + k * 0.15}s forwards`]));
  const horse = stage.querySelector(".horse");
  horse.innerHTML = `<svg viewBox="0 0 420 540"><path class="hb" d="M300 40l40-20 30 40-10 90h-50v120H90l-30 50v40h300v-40l-30-50V170Z" />
    <path class="hb" d="M60 300h300v60H60Z" /><rect class="inner" x="150" y="190" width="120" height="100" /><path class="door" d="M150 190h120v100H150Z" />
    <path class="hb" d="M90 360v110M150 360v110M270 360v110M330 360v110" stroke-width="22" /><circle class="wheel" cx="110" cy="490" r="30" /><circle class="wheel" cx="310" cy="490" r="30" /></svg>`;
  anim(horse, [`roll-in 1.0s cubic-bezier(0.2, 0.8, 0.3, 1) ${T.b6 + 0.3}s both`, `hide 0.5s ease-in ${T.b10}s forwards`]);
  anim(horse.querySelector(".door"), [`door 0.6s cubic-bezier(0.5, 0, 0.3, 1) ${T.b8 + 0.3}s forwards`]);
  anim(horse.querySelector(".inner"), [`show 0.3s ease-out ${T.b8 + 0.3}s both`]);
  anim(stage.querySelector(".burn"), [`skyred 1.2s ease-out ${T.b8 + 0.4}s both`, `hide 1s ease-in ${T.b11}s forwards`]);

  // ── 비웃는 댓글이 쏟아짐
  const BUB = [
    ["트로이 주민", "또 시작이네 ㅋㅋ", 150, 690, 280],
    ["성문지기", "선물을 왜 의심함?", 470, 820, 40],
    ["빵집 아저씨", "공주님 오늘도 피곤하신 듯", 90, 950, 150],
    ["어부", "목마 너무 예쁜데?", 430, 1080, 210],
    ["시장 상인", "ㅋㅋㅋ 믿는 사람 있음?", 160, 1180, 330],
  ];
  const bubbles = stage.querySelector(".bubbles");
  BUB.forEach(([who, txt, x, y, h], k) => {
    const b = $("div", "bub", `<i></i><span><small>${who}</small>${txt}</span>`);
    Object.assign(b.style, { left: x + "px", top: y + "px" });
    b.querySelector("i").style.setProperty("--av", `linear-gradient(135deg, oklch(0.75 0.12 ${h}), oklch(0.55 0.14 ${h + 40}))`);
    anim(b, [`bub-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${T.b7 + 0.25 + k * 0.32}s both`, `bub-out 0.3s ease-in ${T.b8 - 0.1}s forwards`]);
    bubbles.append(b);
  });

  // ── 불티(무너질 때)
  const embers = stage.querySelector(".embers");
  for (let k = 0; k < 60; k++) {
    const e = $("i");
    Object.assign(e.style, { left: ((k * 97) % 1080) + "px", top: "1240px" });
    e.style.setProperty("--s", 5 + (k % 4) * 3 + "px");
    e.style.setProperty("--dx", ((k * 41) % 200) - 100 + "px");
    e.style.setProperty("--dy", -500 - ((k * 61) % 600) + "px");
    anim(e, [`ember ${1.8 + (k % 5) * 0.35}s ease-out ${T.b8 + 0.5 + (k % 24) * 0.17}s 1 both`]);
    embers.append(e);
  }

  // ── 사전 카드
  show(stage.querySelector(".dict"), T.b11 + 0.4, T.q - 0.2, "pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2)", "cap-out 0.3s ease-in");

  // ── 자막
  const caps = stage.querySelector(".caps");
  CAPS.forEach(([a, b, html, cls], k) => {
    const c = $("p", "cap" + (cls ? " " + cls : ""), html);
    c.dataset.cap = "";
    const list = k === 0 ? [] : [`cap-in 0.35s var(--ease-out) ${a}s both`];
    if (k === 0) c.style.opacity = 1; // 첫 프레임(피드 미리보기)부터 결론 문장이 보이게
    if (cls === "glitchy") list.push(`glitch 0.5s steps(1) ${a + 0.05}s 2`);
    if (b != null) list.push(`cap-out 0.25s ease-in ${b - 0.25}s forwards`);
    anim(c, list);
    c.querySelectorAll("em.hit").forEach((h) => anim(h, [`word-hit 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${a + (k === 1 ? 0.05 : 0.3)}s both`]));
    caps.append(c);
  });
  caps.before($("p", "eyebrow", `GREEK MYTH · <span>그리스 신화</span>`));

  // ── 질문: 믿는다 / 비웃는다 + 친구 태그 + 다음 편
  const ask = $("div", "ask");
  [["믿는다", ""], ["비웃는다", "no"]].forEach(([t, c], k) => ask.append(anim($("b", c, t), [`pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) ${T.q + 0.5 + k * 0.2}s both`])));
  stage.append(ask);
  stage.append(anim($("p", "askline", "맞는 말만 하는데 아무도 안 믿어 주는<br>친구가 있다면 태그해 주세요"), [`cap-in 0.5s var(--ease-out) ${T.q + 1.2}s both`]));
  const brand = $("div", "brand", `<p>문 너머의 기록 · <b>낯선 점술관</b></p><p>다음 전설 — 바람이 불면 사라지는 예언</p>`);
  stage.append(anim(brand, [`cap-in 0.6s var(--ease-out) ${T.brand}s both`]));
})();
