// 전설 릴스 「저승의 신들을 이긴 쌍둥이」 촐킨의 방 (2026-11-13). 공용 틀 legend-ep.html?ep=tzolkin.
// 근거: 키체 마야의 『포폴 부』 — 공놀이 소리가 시끄럽다며 지하 세계 시발바의 신들이 쌍둥이 후나푸·스발랑케를 부름, 아버지 대도 돌아오지 못한 곳,
//       첫 시험 '어둠의 집'에서 횃불과 시가를 아침까지 그대로 두라 하자 횃불엔 붉은 깃털, 시가 끝엔 반딧불이를 붙여 하나도 태우지 않음,
//       칼·얼음·재규어의 집 등을 꾀로 넘고 마지막에 공놀이와 마술로 신들을 속여 시발바를 꺾은 뒤 하나는 해, 하나는 달이 되어 하늘로 오름.
//       후나푸(키체어 Junajpu)는 260일 달력의 날 이름 아즈푸(Ajpu, 유카텍어 아하우)와 같은 이름. 과테말라 고원에서는 지금도 '날을 지키는 이(아즈키흐)'가 날을 셈.
// 머리가 잘리는 장면 등 잔혹한 부분은 쓰지 않는다. 그림: 메트로폴리탄·클리블랜드 미술관 CC0 마야 유물(CREDITS.md). 반딧불이·날 바퀴는 직접 그림.
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.8, b3: 10.0, b4: 13.2, b5: 16.4, b6: 19.6, b7: 22.8, b8: 26.0, b9: 29.2, b10: 32.4, b11: 35.6, q: 38.8, end: 42.8, dur: 48 };
  const A = (f, w, h) => ({ img: `legend/art/${f}.jpg`, w, h });
  const VM = A("tz-vessel-myth", 1650, 2200), BB = A("tz-ballgame-bowl", 2051, 2200), BP = A("tz-ballplayer", 1471, 2200), MG = A("tz-maizegod", 2200, 1318), VM2 = A("tz-vessel-myth2", 1627, 2200);
  const CD = A("tz-cylinder-deities", 2161, 2200), ST = A("tz-stela", 1506, 2200), RR = A("tz-relief-ruler", 2178, 2200), JG = A("tz-jaguar", 2200, 1226);
  const OBJ = "sepia(0.25) contrast(1.3) brightness(0.68) saturate(1.1)";
  const S = (o, x) => Object.assign({}, o, x);
  // 260일 달력: 스무 날 바퀴(바깥) + 열세 숫자 바퀴(안). 스무 번째 날 아즈푸가 금빛으로
  const ring = (n, r, cls) => Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return `<circle class="${cls}${cls === "d20" && i === 19 ? " ajpu" : ""}" cx="${(280 + r * Math.cos(a)).toFixed(1)}" cy="${(260 + r * Math.sin(a)).toFixed(1)}" r="${cls === "d20" ? 15 : 9}" />`; }).join("");
  const WHEEL = `<div class="halo"></div><svg viewBox="0 0 560 520"><g class="g20"><circle cx="280" cy="260" r="230" fill="none" stroke="oklch(0.75 0.1 60 / 0.6)" stroke-width="4" />${ring(20, 205, "d20")}</g>
    <g class="g13"><circle cx="280" cy="260" r="140" fill="none" stroke="oklch(0.75 0.1 160 / 0.6)" stroke-width="3" />${ring(13, 120, "d13")}</g>
    <circle class="sun" cx="280" cy="260" r="46" /></svg>`;
  const FLIES = `<div class="halo"></div><svg viewBox="0 0 560 520">${Array.from({ length: 14 }, (_, k) => `<circle class="fly" cx="${(140 + ((k * 97) % 300)).toFixed(0)}" cy="${(120 + ((k * 61) % 280)).toFixed(0)}" r="${5 + (k % 3) * 2}" />`).join("")}
    <path d="M150 390L410 330" stroke="#5a3a22" stroke-width="18" stroke-linecap="round" /><circle class="fly" cx="414" cy="329" r="11" />
    <path d="M160 440L420 420" stroke="#6b4a2a" stroke-width="22" stroke-linecap="round" /><path class="feather" d="M420 420C470 380 500 400 520 430C490 450 460 450 420 420Z" /></svg>`;
  const E = {
    room: "tzolkin",
    T,
    eyebrow: "촐킨의 방의 전설",
    caps: [
      [0, T.b1, "저승의 신들을<br>속여 이긴 쌍둥이가<br><em>해와 달</em>이 되었다", "hook"],
      [T.b1, T.b2, "마야의 신화 『포폴 부』<br>공놀이를 좋아한 쌍둥이<br><em>후나푸와 스발랑케</em>"],
      [T.b2, T.b3, "공 차는 소리가<br>시끄럽다며 지하 세계<br><em class=\"red\">시발바</em>의 신들이 불렀죠"],
      [T.b3, T.b4, "그곳은<br>아버지 대에도<br><em class=\"red hit\">아무도 돌아오지 못한</em> 곳"],
      [T.b4, T.b5, "첫 시험은 '어둠의 집'<br>“아침까지 횃불과 시가를<br><em>그대로 두어라</em>”"],
      [T.b5, T.b6, "쌍둥이는<br>횃불엔 붉은 깃털을<br>시가엔 <em class=\"hit\">반딧불이</em>를 붙였어요"],
      [T.b6, T.b7, "밤새 타는 것처럼 보였지만<br>아침에 보니<br><em class=\"hit\">하나도 줄지 않았죠</em>"],
      [T.b7, T.b8, "칼의 집, 얼음의 집<br>재규어의 집…<br>쌍둥이는 <em>꾀로</em> 넘었어요"],
      [T.b8, T.b9, "마지막엔 신들을<br>공놀이와 마술로 속여<br><em class=\"red hit\">시발바를 꺾었대요</em>"],
      [T.b9, T.b10, "그리고 하늘로 올라<br>하나는 <em class=\"hit\">해</em>가<br>하나는 <em class=\"hit\">달</em>이 되었어요"],
      [T.b10, T.b11, "후나푸의 이름은<br>260일 달력 촐킨의<br>스무 번째 날<br><em class=\"hit\">'아즈푸'</em>로 남았대요"],
      [T.b11, T.q, "과테말라 고원에선 지금도<br><em>날을 지키는 이</em>가<br>그 날들을 세어요"],
      [T.q, T.end, "당신은<br><em>해</em> 쪽일까요<br><em>달</em> 쪽일까요?"],
    ],
    h2: { t: T.h2, size: 70, html: "<br><br><br>그 이름은 <em class=\"red\">지금도 달력에</em>" },
    shots: [
      S(VM2, { t0: 0, t1: T.b1, a: [0.5, 0.45, 1.5], b: [0.5, 0.42, 1.9], grade: OBJ }),
      S(MG, { t0: T.b1, t1: T.b2, a: [0.25, 0.5, 1.0], b: [0.75, 0.5, 1.0], grade: OBJ, cut: "whip" }),
      S(BB, { t0: T.b2, t1: T.b3, a: [0.5, 0.55, 1.1], b: [0.5, 0.6, 1.5], grade: OBJ, cut: "flash" }),
      S(RR, { t0: T.b3, t1: T.b4, a: [0.5, 0.5, 1.1], b: [0.5, 0.45, 1.5], grade: OBJ + " brightness(0.8)", cut: "flash" }),
      S(VM, { t0: T.b4, t1: T.b5, a: [0.5, 0.5, 1.4], b: [0.5, 0.55, 1.8], grade: OBJ + " brightness(0.6)", cut: "whip" }),
      S(VM, { t0: T.b5, t1: T.b7, a: [0.5, 0.5, 1.2], b: [0.5, 0.5, 1.3], grade: "brightness(0.22) blur(5px)" }),
      S(JG, { t0: T.b7, t1: T.b8, a: [0.3, 0.5, 1.0], b: [0.7, 0.5, 1.0], grade: OBJ, cut: "whip" }),
      S(CD, { t0: T.b8, t1: T.b9, a: [0.5, 0.5, 1.3], b: [0.5, 0.45, 1.8], grade: OBJ, cut: "flash" }),
      S(MG, { t0: T.b9, t1: T.b10, a: [0.5, 0.5, 1.0], b: [0.5, 0.5, 1.15], grade: "brightness(0.25) blur(5px)" }),
      S(ST, { t0: T.b10, t1: T.b11, a: [0.5, 0.5, 1.1], b: [0.5, 0.5, 1.2], grade: "brightness(0.25) blur(5px)" }),
      S(ST, { t0: T.b11, t1: T.q, a: [0.5, 0.35, 1.2], b: [0.5, 0.25, 1.6], grade: OBJ, cut: "flash" }),
      S(BP, { t0: T.q, t1: null, a: [0.5, 0.4, 1.1], b: [0.5, 0.4, 1.25], grade: "brightness(0.4) blur(3px)" }),
    ],
    gold: [[T.b6, T.b7], [T.b9, T.b11]],
    red: [[T.b2 + 0.2, T.b4], [T.b8, T.b9]],
    leaks: [T.b1, T.b6, T.b9, T.b11],
    white: [T.b6 + 0.35, T.b9 + 0.4, T.b10 + 0.4],
    redHits: [T.b3 + 0.35, T.b8 + 0.35],
    meteors: { t0: T.b9, n: 10 },
    prop: { html: FLIES, t0: T.b5, t1: T.b7, cls: "big" },
    ask: { choices: ["해", "달"], line: "댓글로 골라 주세요" },
    end: { room: "<b>Ⅴ</b> 촐킨의 방", pitch: "태어난 날의 기호와 숫자로<br>당신의 리듬을 읽어요", cta: "프로필 링크에서 다섯 번째 문", next: "다음 전설 — 팔자를 따지러 간 사내" },
    after: ({ stage, anim, $ }) => {
      stage.querySelectorAll(".stone .fly").forEach((f, k) => anim(f, [`fly-glow ${0.8 + (k % 4) * 0.25}s ease-in-out ${T.b5 + 0.4 + (k % 5) * 0.12}s infinite`]));
      // 해와 달(9) 뒤에 날 바퀴(10): 두 번째 물건은 직접 붙인다
      const w = $("div", "stone big wheel2", WHEEL);
      stage.querySelector(".stone").after(w);
      anim(w, [`stone-in 1.1s cubic-bezier(0.3, 0, 0.3, 1) ${T.b10 + 0.1}s both`, `hide 0.5s ease-in ${T.b11 - 0.2}s forwards`]);
      anim(w.querySelector(".g20"), [`spin 24s linear ${T.b10}s infinite`]);
      anim(w.querySelector(".g13"), [`spin-r 18s linear ${T.b10}s infinite`]);
      anim(w.querySelector(".ajpu"), [`dk-on 0.6s ease-out ${T.b10 + 1.2}s forwards`]);
      const sm = $("div", "sunmoon", `<i class="s"></i><i class="m"></i>`);
      stage.querySelector(".grade").after(sm);
      anim(sm, [`show 0.6s ease-out ${T.b9 + 0.3}s both`, `hide 0.5s ease-in ${T.b10 - 0.1}s forwards`]);
      anim(sm.querySelector(".s"), [`rise-s 2.4s cubic-bezier(0.3, 0, 0.2, 1) ${T.b9 + 0.3}s both`]);
      anim(sm.querySelector(".m"), [`rise-m 2.4s cubic-bezier(0.3, 0, 0.2, 1) ${T.b9 + 0.6}s both`]);
    },
    sound: {
      key: 67,
      chords: [[0, [36, 43, 48, 51]], [T.b2, [35, 42, 47, 50]], [T.b5, [36, 43, 48, 51, 55]], [T.b8, [35, 42, 47, 50]], [T.b9, [36, 43, 52, 55]], [T.q, [36, 43, 50, 55]]],
      tense: [[T.b2, T.b5], [T.b7, T.b9]],
      sfx: [
        ["drums", T.b1 + 0.2, 8, 0.3], ["thump", T.b2 + 0.3, 0.7], ["boom", T.b2 + 0.35, 0.7, 48], ["boom", T.b3 + 0.35, 0.9, 42], ["wind", T.b3, T.b5, 0.6],
        ["fire", T.b4, T.b5 + 1, 0.4], ["arp", T.b5 + 0.4, [79, 84, 86, 91, 96], 0.18, 0.03], ["arp", T.b6 + 0.4, [67, 72, 76, 79], 0.1, 0.05],
        ["drums", T.b7 + 0.1, 10, 0.28], ["riser", T.b7 + 1, T.b8 + 0.3, 0.3], ["boom", T.b8 + 0.35, 1.1, 44], ["shatter", T.b8 + 0.35, 0.4],
        ["arp", T.b9 + 0.4, [60, 64, 67, 72, 76, 79], 0.1, 0.05], ["boom", T.b9 + 0.4, 0.6, 55], ["tick", T.b10 + 0.2, 10], ["bell", T.b10 + 1.2, 79, 0.08], ["wind", T.b11, T.q + 0.5, 0.5],
      ],
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = E; else window.EPISODE = E;
})();
