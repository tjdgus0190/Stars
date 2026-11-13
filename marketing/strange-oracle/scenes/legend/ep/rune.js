// 전설 릴스 「독이 든 술잔에 룬을 새기자」 룬의 방 (2026-11-13). 공용 틀 legend-ep.html?ep=rune + legend/episode.js. 소리는 render/sound-legend.js가 이 파일을 읽는다.
// 근거: 『에길의 사가』 44장(아틀레이 섬 연회, 왕비와 집주인이 독을 탄 잔을 축복하는 척 건넴 → 에길이 칼로 손을 그어 뿔잔에 룬을 새기고 피를 발라 시를 읊자 뿔잔이 갈라지고 술이 쏟아짐),
//       타키투스 『게르마니아』 10장(표식을 새긴 나무 조각을 흰 천에 흩뿌려 점을 침). 집주인을 해친 뒷부분(죽음)은 쓰지 않는다.
// 그림: 메트로폴리탄·클리블랜드 미술관 CC0(CREDITS.md). 뿔잔은 직접 그림.
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.8, b3: 10.0, b4: 13.2, b5: 16.4, b6: 19.6, b7: 22.8, b8: 26.0, b9: 29.2, b10: 32.4, b11: 35.6, q: 38.8, end: 42.8, dur: 48 };
  const A = (f, w, h) => ({ img: `legend/art/${f}.jpg`, w, h });
  const GOB = A("rune-goblet-cole", 1846, 2200), FEAST = A("rune-feast-muller", 2200, 1970), DAM = A("rune-damocles", 2200, 1564), SW = A("rune-sword", 834, 2200);
  const BR = A("rune-bracteate", 951, 1023), DR = A("rune-dragon", 1809, 2200);
  const ENG = "sepia(0.55) contrast(1.3) brightness(0.92)", OBJ = "sepia(0.35) contrast(1.35) brightness(0.62)";
  const S = (o, x) => Object.assign({}, o, x);
  // 뿔잔(직접 그림): 상아빛 굽은 뿔 + 테 + 새겨질 룬 다섯
  const RUNES = ["M0 0V60M0 12L22 0M0 30L22 18", "M0 0V60M0 0L18 15L0 30L18 60", "M0 0V60M0 22L18 0M0 22L-18 0", "M0 0L20 60M20 0L0 60", "M0 0V60M0 0L16 14L0 28"];
  const HORN = `<div class="halo"></div><svg viewBox="0 0 560 520"><defs>
    <linearGradient id="iv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ead2" /><stop offset="0.55" stop-color="#d9c79f" /><stop offset="1" stop-color="#8f7a55" /></linearGradient>
    <filter id="grainH"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" /><feColorMatrix in="n" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.35 0" result="g" /><feComposite in="g" in2="SourceGraphic" operator="in" result="gi" /><feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="gi" /></feMerge></filter></defs>
    <path d="M40 120C120 150 260 200 360 210C420 214 470 200 520 170L540 330C480 360 420 370 350 360C240 345 120 260 40 120Z" fill="url(#iv)" stroke="#6b5838" stroke-width="4" filter="url(#grainH)" />
    <ellipse cx="530" cy="250" rx="22" ry="82" fill="#2a1d10" stroke="#c8a85f" stroke-width="10" />
    <path d="M200 205C215 240 230 290 240 330M300 216C310 255 318 300 322 352" fill="none" stroke="#a88a52" stroke-width="12" />
    ${RUNES.map((d, k) => `<path class="hr" d="${d}" transform="translate(${250 + k * 46 - (k > 2 ? 10 : 0)} ${238 + Math.abs(k - 2) * 6})" />`).join("")}</svg>`;
  const E = {
    room: "rune",
    T,
    eyebrow: "룬의 방의 전설",
    caps: [
      [0, T.b1, "독이 든 술잔에<br>룬을 새기자<br><em>잔이 산산조각 났다</em>", "hook"],
      [T.b1, T.b2, "10세기 노르웨이<br>왕과 왕비가 머무는<br><em>한 섬의 연회</em>"],
      [T.b2, T.b3, "손님으로 온<br>젊은 전사 <em>에길</em>에게<br>술이 끝없이 돌았어요"],
      [T.b3, T.b4, "왕비와 집주인은<br>잔에 몰래<br><em class=\"red hit\">독</em>을 탔어요"],
      [T.b4, T.b5, "집주인은 잔을<br>축복하는 척하며<br>에길에게 건넸죠"],
      [T.b5, T.b6, "에길은<br>뭔가 <em class=\"hit\">이상하다</em>는 걸<br>느꼈어요"],
      [T.b6, T.b7, "그는 칼을 꺼내<br>뿔잔에<br><em class=\"hit\">룬을 새겼어요</em>"],
      [T.b7, T.b8, "룬을 붉게 물들이고<br>시를 읊자—"],
      [T.b8, T.b9, "뿔잔이<br><em class=\"red hit\">산산조각 나며</em><br>독이 바닥에 쏟아졌어요"],
      [T.b9, T.b10, "룬은 그저 글자가 아니라<br>뜻을 새겨 넣는<br><em>힘</em>이었던 거예요"],
      [T.b10, T.b11, "북유럽 사람들은<br>표식을 새긴 나무 조각을<br>흩뿌려 <em>운명</em>을<br>물었다고 해요"],
      [T.b11, T.q, "당신 앞에 놓인 잔에도<br><em class=\"hit\">룬 하나</em>를<br>새길 수 있다면?"],
      [T.q, T.end, "당신이 에길이었다면<br>그 잔을 <em>어떻게 했을까요?</em>"],
    ],
    h2: { t: T.h2, html: "<br><br><br>그리고 그는 <em class=\"red\">살아남았다</em>" },
    shots: [
      S(GOB, { t0: 0, t1: T.b1, a: [0.5, 0.42, 1.25], b: [0.5, 0.36, 1.6], cy: 0.58, grade: "saturate(1.1) contrast(1.15) brightness(0.9)" }),
      S(FEAST, { t0: T.b1, t1: T.b2, a: [0.2, 0.45, 1.05], b: [0.75, 0.4, 1.15], grade: ENG, cut: "whip" }),
      S(SW, { t0: T.b2, t1: T.b3, a: [0.5, 0.15, 1.6], b: [0.5, 0.45, 1.6], grade: OBJ, cut: "flash" }),
      S(DAM, { t0: T.b3, t1: T.b4, a: [0.45, 0.45, 1.1], b: [0.55, 0.5, 1.5], grade: ENG, cut: "flash" }),
      S(BR, { t0: T.b4, t1: T.b5, a: [0.5, 0.5, 1.1], b: [0.5, 0.42, 1.5], grade: "contrast(1.2) brightness(0.8)", cut: "whip" }),
      S(DR, { t0: T.b5, t1: T.b6, a: [0.55, 0.3, 1.1], b: [0.6, 0.22, 1.5], grade: OBJ, cut: "flash" }),
      S(FEAST, { t0: T.b6, t1: T.b9, a: [0.5, 0.5, 1.2], b: [0.5, 0.5, 1.3], grade: ENG + " brightness(0.35) blur(3px)" }),
      S(GOB, { t0: T.b9, t1: T.b10, a: [0.5, 0.3, 1.5], b: [0.5, 0.4, 1.1], grade: "saturate(1.15) contrast(1.15)" }),
      S(BR, { t0: T.b10, t1: T.b11, a: [0.5, 0.5, 1.0], b: [0.45, 0.45, 1.25], grade: "contrast(1.2) brightness(0.85)", cut: "whip" }),
      S(GOB, { t0: T.b11, t1: T.q, a: [0.5, 0.35, 1.0], b: [0.5, 0.35, 1.2], grade: "saturate(1.1) contrast(1.15) brightness(0.85)" }),
      S(GOB, { t0: T.q, t1: null, a: [0.5, 0.4, 1.1], b: [0.5, 0.4, 1.25], grade: "brightness(0.45) blur(3px)" }),
    ],
    gold: [[T.b4, T.b5], [T.b9, T.b10]],
    red: [[T.b3 + 0.2, T.b4], [T.b8, T.b9]],
    leaks: [T.b1, T.b4, T.b9, T.b11],
    white: [T.b6 + 0.4, T.b9 + 0.35],
    redHits: [T.b3 + 0.35, T.b8 + 0.1, T.b8 + 0.6],
    prop: { html: HORN, t0: T.b6, t1: T.b8 + 0.5, cls: "big" },
    crack: { t: T.b8 + 0.05, out: T.b9 - 0.2, at: [540, 1010] },
    ask: { choices: ["그냥 마신다", "룬을 새긴다"], line: "댓글로 골라 주세요" },
    end: { room: "<b>Ⅵ</b> 룬의 방", pitch: "돌 세 개를 뽑으면<br>지나온 길·지금·다가올 것을 읽어요", cta: "프로필 링크에서 여섯 번째 문", next: "다음 전설 — 사라진 왕비와 네 개의 나무 막대" },
    after: ({ stage, anim }) => {
      // 뿔잔의 룬: 하나씩 금빛으로 새겨지고 → 붉게 → 잔이 깨질 때 튀며 사라짐
      stage.querySelectorAll(".stone .hr").forEach((r, k) => anim(r, [`carve-h 0.4s cubic-bezier(0.5, 0, 0.3, 1) ${T.b6 + 0.9 + k * 0.38}s forwards`, `redden 0.6s ease-out ${T.b7 + 0.3}s forwards`]));
      anim(stage.querySelector(".stone svg"), [`stone-float 3s ease-in-out ${T.b6 + 1.2}s infinite`, `burst 0.45s cubic-bezier(0.2, 0.8, 0.3, 1) ${T.b8 + 0.05}s forwards`]);
    },
    sound: {
      key: 76,
      chords: [[0, [40, 47, 52, 55]], [T.b3, [40, 46, 52, 55]], [T.b6, [38, 45, 50, 53]], [T.b9, [40, 47, 56, 59]], [T.q, [40, 47, 54, 59]]],
      tense: [[T.b5, T.b8]],
      sfx: [
        ["fire", T.b1 - 0.2, T.b3, 0.5], ["drums", T.b1 + 0.2, 6, 0.45],
        ["bell", T.b2 + 0.3, 52, 0.08], ["boom", T.b3 + 0.35, 0.8, 48], ["tick", T.b4 + 0.3, 8],
        ["whoosh", T.b5 + 0.1, 0.5, 0.25], ["riser", T.b5 + 0.6, T.b6, 0.15],
        ["boom", T.b6 + 0.4, 0.7, 55], ["chisel", T.b6 + 0.9, 0.7, -0.3], ["chisel", T.b6 + 1.28, 0.7, -0.1], ["chisel", T.b6 + 1.66, 0.7, 0.1], ["chisel", T.b6 + 2.04, 0.7, 0.2], ["chisel", T.b6 + 2.42, 0.7, 0.3],
        ["riser", T.b7 + 0.3, T.b8, 0.32], ["shatter", T.b8 + 0.05, 1.8], ["boom", T.b8 + 0.05, 1.2, 44], ["drop", T.b8 + 0.4, 0.4, -0.2], ["drop", T.b8 + 0.6, 0.3, 0.3],
        ["arp", T.b9 + 0.35, [64, 68, 71, 76, 80], 0.1, 0.05], ["wind", T.b10 - 0.2, T.b11 + 1, 0.7], ["bell", T.b11 + 0.4, 83, 0.05],
      ],
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = E; else window.EPISODE = E;
})();
