// 전설 릴스 「아무도 믿지 않은 예언」(카산드라) 조립 (2026-11-12). 32초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다. 무작위 값 없음.
// 근거: 아폴론이 예언의 힘을 주었으나 카산드라가 거절하자 아무도 믿지 않게 하는 저주를 내림(아폴로도로스 『비블리오테케』 3.12.5, 아이스킬로스 『아가멤논』 1202~1212행),
//       목마를 들이지 말라고 경고했으나 트로이 사람들이 믿지 않음(베르길리우스 『아이네이스』 2권 246~247행). "카산드라"는 오늘날 옳은 경고를 해도 믿어 주지 않는 사람을 가리키는 말로 쓰인다.
// 그림: 메트로폴리탄 미술관 공개 작품(CC0)만. 화면에 피·죽음 없음. 비웃는 댓글은 지어낸 트로이 사람들의 말(실존 인물·특정 집단 아님).
(function () {
  // (2026-11-13 운영자 "글자·연출이 너무 빨리 지나가 읽기 어렵다") 장면마다 2.6~3.6초로 늘림, 끝에 낯선 점술관·시빌라 신탁의 방 끝 화면(41~47초)
  const T = { h2: 1.2, b1: 3.6, b2: 6.2, b3: 9.4, b4: 12.0, curse: 14.6, b6: 17.6, b7: 20.8, b8: 24.4, b9: 27.2, b10: 30.2, b11: 33.0, q: 36.6, end: 41.0, dur: 47 };
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
    [T.q, T.end, "당신이 트로이에 있었다면<br>그녀를 <em>믿었을까요?</em>"],
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

  // ── 명화 장면(메트로폴리탄 미술관 CC0, art/). 카메라는 그림 안의 비율 좌표 [fx, fy, 배율]로 시작→끝
  const ENG = "sepia(0.55) contrast(1.3) brightness(0.92)"; // 동판화를 오래된 금빛 종이처럼
  const M = { img: "legend/art/cassandra-mortimer.jpg", w: 2001, h: 2200 }, L = { img: "legend/art/cassandra-legat.jpg", w: 1689, h: 2200 };
  const H = { img: "legend/art/horse-bonasone.jpg", w: 2200, h: 1402 }, A = { img: "legend/art/apollo-lairesse.jpg", w: 2091, h: 2200 }, F = { img: "legend/art/fleet-lorrain.jpg", w: 2200, h: 1528 };
  const EYE = [0.5, 0.375]; // 두 눈 사이(첫 프레임에서 잰 자리)
  Paint.shots(stage.querySelector(".paint"), [
    Object.assign({}, M, { t0: 0, t1: T.b1, a: [0.5, 0.5, 1.3], b: [...EYE, 1.75], cy: 0.56, grade: ENG }),
    Object.assign({}, L, { t0: T.b1, t1: T.b2, a: [0.5, 0.3, 1.45], b: [0.5, 0.36, 1.08], grade: ENG, cut: "flash" }),
    Object.assign({}, A, { t0: T.b2, t1: T.b4, a: [0.42, 0.4, 1.05], b: [0.21, 0.19, 2.8], cy: 0.55, grade: "saturate(1.15) contrast(1.12) brightness(0.95)", cut: "whip" }),
    Object.assign({}, M, { t0: T.b4, t1: T.b6, a: [...EYE, 2.0], b: [...EYE, 3.3], cy: 0.56, grade: ENG, cut: "flash", ease: "cubic-bezier(0.4, 0, 0.2, 1)" }),
    Object.assign({}, H, { t0: T.b6, t1: T.b8, a: [0.8, 0.55, 1.2], b: [0.3, 0.3, 1.2], grade: ENG, cut: "whip" }),
    Object.assign({}, H, { t0: T.b8, t1: T.b9, a: [0.27, 0.17, 2.1], b: [0.27, 0.15, 2.8], grade: ENG + " brightness(0.8)", cut: "flash" }),
    Object.assign({}, F, { t0: T.b9, t1: T.b10, a: [0.55, 0.55, 1.05], b: [0.6, 0.62, 1.45], grade: "sepia(0.35) saturate(1.7) hue-rotate(-18deg) contrast(1.35) brightness(0.72)", cut: "flash" }),
    Object.assign({}, M, { t0: T.b10, t1: T.b11, a: [...EYE, 1.5], b: [...EYE, 2.2], cy: 0.56, grade: ENG }),
    Object.assign({}, L, { t0: T.b11, t1: T.q, a: [0.5, 0.4, 1.1], b: [0.5, 0.45, 1.25], grade: ENG + " brightness(0.55)" }),
    Object.assign({}, M, { t0: T.q, t1: null, a: [0.5, 0.5, 1.15], b: [0.5, 0.5, 1.3], grade: ENG + " brightness(0.42) blur(3px)" }),
  ]);
  // 색 겹: 아폴론·"처음부터"는 금빛, 저주·문이 열림·무너짐은 붉게
  const gold = stage.querySelector(".tint.gold"), red = stage.querySelector(".tint.red");
  gold.style.setProperty("--o", 0.7);
  anim(gold, [`tint-on 0.6s ease-out ${T.b2}s both`, `tint-off 0.3s ease-in ${T.b4}s forwards`, `tint-on 0.6s ease-out ${T.b10}s`, `tint-off 0.4s ease-in ${T.b11}s forwards`]);
  red.style.setProperty("--o", 0.9);
  anim(red, [`tint-on 0.15s ease-out ${T.curse}s both`, `tint-off 0.3s ease-in ${T.b6}s forwards`, `tint-on 0.3s ease-out ${T.b8 + 0.3}s`, `tint-off 0.5s ease-in ${T.b10}s forwards`]);
  anim(stage.querySelector(".leak"), [T.b2, T.b6, T.b10].map((t) => `leak 0.9s ease-out ${t - 0.2}s`));

  // ── 화면 깨짐(1.1초): 한 점에서 뻗는 금
  const C = [540, 1075]; // 그녀의 두 눈 사이에서 금이 뻗는다
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

  anim(stage.querySelector(".burn"), [`skyred 1.0s ease-out ${T.b9}s both`, `hide 1s ease-in ${T.b10}s forwards`]);

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
    anim(b, [`bub-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${T.b7 + 0.3 + k * 0.55}s both`, `bub-out 0.3s ease-in ${T.b8 - 0.1}s forwards`]);
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
    anim(e, [`ember ${1.8 + (k % 5) * 0.35}s ease-out ${T.b8 + 0.5 + (k % 24) * 0.25}s 1 both`]);
    embers.append(e);
  }

  // ── 사전 카드
  show(stage.querySelector(".dict"), T.b11 + 0.4, T.q - 0.2, "pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2)", "cap-out 0.3s ease-in");

  // ── 자막
  const caps = stage.querySelector(".caps");
  CAPS.forEach(([a, b, html, cls], k) => {
    const c = $("p", "cap" + (cls ? " " + cls : ""), html);
    c.dataset.cap = "";
    const list = k === 0 ? [] : [`cap-in 0.5s var(--ease-out) ${a}s both`];
    if (k === 0) c.style.opacity = 1; // 첫 프레임(피드 미리보기)부터 결론 문장이 보이게
    if (cls === "glitchy") list.push(`glitch 0.5s steps(1) ${a + 0.05}s 2`);
    if (b != null) list.push(`cap-out 0.35s ease-in ${b - 0.35}s forwards`);
    anim(c, list);
    c.querySelectorAll("em.hit").forEach((h) => anim(h, [`word-hit 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${a + (k === 1 ? 0.05 : 0.3)}s both`]));
    caps.append(c);
  });
  // 위 작은 줄: 어느 방의 전설인지 끝까지 보이게
  caps.before(anim($("p", "eyebrow", `STRANGE ORACLE · <span>시빌라 신탁의 방의 전설</span>`), [`hide 0.4s ease-in ${T.end}s forwards`]));

  // ── 질문: 믿는다 / 비웃는다 + 친구 태그
  const ask = $("div", "ask");
  [["믿는다", ""], ["비웃는다", "no"]].forEach(([t, c], k) => ask.append(anim($("b", c, t), [`pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) ${T.q + 0.6 + k * 0.3}s both`])));
  stage.append(anim(ask, [`hide 0.4s ease-in ${T.end - 0.4}s forwards`]));
  stage.append(anim($("p", "askline", "맞는 말만 하는데 아무도 안 믿어 주는<br>친구가 있다면 태그해 주세요"), [`cap-in 0.6s var(--ease-out) ${T.q + 1.4}s both`, `hide 0.4s ease-in ${T.end - 0.4}s forwards`]));

  // ── 끝 화면: 이 전설이 사는 방 + 낯선 점술관을 크게
  const shade = $("div", "endshade");
  stage.querySelector(".grade").after(anim(shade, [`show 0.8s ease-out ${T.q - 0.2}s both`]));
  shade.style.setProperty("--o", 1);
  const end = $("div", "endcard", `<p class="e1">이 전설이 잠든 곳</p>
    <p class="e2"><b>Ⅶ</b> 시빌라 신탁의 방</p>
    <p class="logo e3">낯선 점술관</p>
    <p class="e4">STRANGE ORACLE</p>
    <p class="e5">일곱 문화의 점술이<br>같은 나를 읽어요</p>
    <p class="e6">프로필 링크에서 일곱 번째 문</p>
    <p class="e7">다음 전설 — 마야가 예언한 '세상이 끝나는 날'</p>`);
  [["e1", 0.2], ["e2", 0.6], ["e3", 1.1], ["e4", 1.5], ["e5", 2.1], ["e6", 2.8], ["e7", 3.4]].forEach(([c, d]) => anim(end.querySelector("." + c), [`cap-in 0.7s var(--ease-out) ${T.end + d}s both`]));
  anim(end.querySelector(".e3"), [`big-in 0.9s var(--ease-out) ${T.end + 1.1}s both`, `logo-shimmer 1.8s ease-in-out ${T.end + 1.6}s both`]);
  stage.append(end);
  anim(stage.querySelector(".flash"), WHITE.concat([T.end + 1.1]).map((t) => `flashes 0.6s ease-out ${t}s`));
})();
