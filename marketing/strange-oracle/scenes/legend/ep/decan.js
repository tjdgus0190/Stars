// 전설 릴스 「태어날 순간을 고른 별판」 데칸의 방 (2026-11-13). 공용 틀 legend-ep.html?ep=decan.
// 근거: 『알렉산드로스 로맨스』(위 칼리스테네스) 1권 1~12장 — 이집트의 마지막 파라오 넥타네보 2세는 마법과 점성술의 대가로, 적이 쳐들어오자 변장하고 마케도니아로 가
//       왕비 올림피아스의 점성가가 됨. 상아·흑단·금·은으로 만든 별판(바깥 고리 서른여섯 데칸, 그 안 열두 별자리, 가운데 해와 달)을 썼고,
//       해산 때 하늘을 보며 "아직"을 거듭하다 "지금"이라고 해 그 순간 천둥·번개 속에 알렉산드로스가 태어남. 전설은 그 점성가가 아이의 아버지였다고 함.
// 실존 인물(알렉산드로스)은 운영자 확인(2026-11-13). 점성가의 죽음 부분은 쓰지 않는다. 그림: 메트로폴리탄·클리블랜드 미술관 CC0(CREDITS.md). 별판은 직접 그림.
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.8, b3: 10.0, b4: 13.2, b5: 16.4, b6: 19.6, b7: 22.8, b8: 26.0, b9: 29.2, b10: 32.4, b11: 35.6, q: 38.8, end: 42.8, dur: 48 };
  const A = (f, w, h) => ({ img: `legend/art/${f}.jpg`, w, h });
  const REL = A("decan-nectanebo-relief", 1640, 920), HOR = A("decan-horus-nectanebo", 1649, 2200), CEIL = A("decan-ceiling", 1174, 1540), PYR = A("decan-pyramid-dauzats", 1698, 2200);
  const HEAD = A("decan-alexander-head", 1697, 2200), ENA = A("decan-alexander-enamel", 1760, 2200), BUST = A("decan-alexander-bust", 1340, 1844);
  const STONE = "sepia(0.4) contrast(1.35) brightness(0.62)", PAINT = "saturate(1.1) contrast(1.12) brightness(0.9)";
  const S = (o, x) => Object.assign({}, o, x);
  // 별판: 바깥 서른여섯 데칸 · 열두 별자리 · 가운데 해와 달 (상아·흑단·금)
  const ring = (n, r, cls, len) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; const x1 = 280 + r * Math.cos(a), y1 = 260 + r * Math.sin(a), x2 = 280 + (r - len) * Math.cos(a), y2 = 260 + (r - len) * Math.sin(a); return `<path class="${cls}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" />`; }).join("");
  const stars = Array.from({ length: 36 }, (_, i) => { const a = ((i + 0.5) / 36) * Math.PI * 2; return `<circle class="dk" cx="${(280 + 222 * Math.cos(a)).toFixed(1)}" cy="${(260 + 222 * Math.sin(a)).toFixed(1)}" r="5" />`; }).join("");
  const BOARD = `<div class="halo"></div><svg viewBox="0 0 560 520">
    <circle cx="280" cy="260" r="248" fill="#16100a" stroke="#c8a85f" stroke-width="8" /><circle cx="280" cy="260" r="200" fill="#e9dcc0" stroke="#c8a85f" stroke-width="5" />
    <g class="r1">${ring(36, 248, "tk", 48)}${stars}</g>
    <g class="r2">${ring(12, 200, "tk2", 70)}</g><circle cx="280" cy="260" r="130" fill="#1b130b" stroke="#c8a85f" stroke-width="5" />
    <circle class="sun" cx="245" cy="260" r="34" /><path class="moon3" d="M330 222A40 40 0 1 0 330 298A31 31 0 1 1 330 222Z" /></svg>`;
  const E = {
    room: "decan",
    T,
    eyebrow: "데칸의 방의 전설",
    caps: [
      [0, T.b1, "한 점성가가<br>아기가 태어날<br><em>'순간'</em>을 골랐다", "hook"],
      [T.b1, T.b2, "이집트의 마지막 파라오<br><em>넥타네보</em>는<br>마법과 점성술의 대가였어요"],
      [T.b2, T.b3, "적군이 쳐들어오자<br>그는 변장을 하고<br><em class=\"hit\">이집트를 떠났어요</em>"],
      [T.b3, T.b4, "그가 숨어든 곳은 마케도니아<br>왕비 <em>올림피아스</em>의<br>점성가가 되었죠"],
      [T.b4, T.b5, "그에게는<br>신비한 별판이 있었어요<br>바깥 고리엔 <em class=\"hit\">서른여섯 데칸</em>"],
      [T.b5, T.b6, "그 안에 <em>열두 별자리</em><br>가운데엔<br>해와 달"],
      [T.b6, T.b7, "왕비가 아이를 낳으려 할 때<br>그는 하늘을 보며<br><em class=\"red hit\">“아직입니다!”</em>"],
      [T.b7, T.b8, "“지금 태어나면 안 됩니다<br>조금만…<br>조금만 더…”"],
      [T.b8, T.b9, "그리고 별이<br>제자리에 오자<br><em class=\"hit\">“지금입니다!”</em>"],
      [T.b9, T.b10, "그 순간 천둥이 치고<br>땅이 흔들리며<br><em class=\"hit\">아이가 태어났어요</em>"],
      [T.b10, T.b11, "그 아이가 훗날<br>세상을 정복한<br><em>알렉산드로스 대왕</em>"],
      [T.b11, T.q, "그리고 전설은 덧붙여요<br>그 점성가가 사실<br><em class=\"red hit\">아이의 아버지</em>였다고"],
      [T.q, T.end, "태어난 순간이<br>운명을 정한다면<br><em>믿으시겠어요?</em>"],
    ],
    h2: { t: T.h2, size: 70, html: "<br><br><br>그 아기가 <em class=\"red\">알렉산드로스</em>" },
    shots: [
      S(CEIL, { t0: 0, t1: T.b1, a: [0.5, 0.75, 1.3], b: [0.5, 0.7, 1.6], grade: "sepia(0.35) contrast(1.25) brightness(0.85)" }),
      S(REL, { t0: T.b1, t1: T.b2, a: [0.35, 0.5, 1.0], b: [0.5, 0.5, 1.1], grade: STONE, cut: "whip" }),
      S(PYR, { t0: T.b2, t1: T.b3, a: [0.5, 0.6, 1.0], b: [0.4, 0.3, 1.3], grade: PAINT + " brightness(0.8)", cut: "flash" }),
      S(HOR, { t0: T.b3, t1: T.b4, a: [0.5, 0.6, 1.4], b: [0.55, 0.2, 1.6], grade: STONE, cut: "whip" }),
      S(CEIL, { t0: T.b4, t1: T.b6, a: [0.5, 0.5, 1.2], b: [0.5, 0.5, 1.3], grade: "brightness(0.25) blur(5px)" }),
      S(CEIL, { t0: T.b6, t1: T.b7, a: [0.3, 0.3, 1.6], b: [0.5, 0.35, 2.0], grade: "sepia(0.35) contrast(1.3) brightness(0.8)", cut: "flash" }),
      S(CEIL, { t0: T.b7, t1: T.b8, a: [0.6, 0.75, 2.0], b: [0.45, 0.75, 2.6], grade: "sepia(0.35) contrast(1.3) brightness(0.7)" }),
      S(HOR, { t0: T.b8, t1: T.b9, a: [0.55, 0.18, 2.0], b: [0.55, 0.16, 2.6], grade: STONE, cut: "flash" }),
      S(HEAD, { t0: T.b9, t1: T.b10, a: [0.5, 0.4, 1.1], b: [0.5, 0.36, 1.6], grade: STONE + " brightness(1.2)", cut: "flash" }),
      S(ENA, { t0: T.b10, t1: T.b11, a: [0.5, 0.5, 1.15], b: [0.5, 0.45, 1.5], grade: PAINT, cut: "whip" }),
      S(BUST, { t0: T.b11, t1: T.q, a: [0.5, 0.3, 1.1], b: [0.5, 0.22, 1.6], grade: STONE + " brightness(1.1)", cut: "flash" }),
      S(CEIL, { t0: T.q, t1: null, a: [0.5, 0.5, 1.1], b: [0.5, 0.5, 1.25], grade: "brightness(0.4) blur(3px)" }),
    ],
    gold: [[T.b4, T.b6], [T.b8, T.b11]],
    red: [[T.b6, T.b8], [T.b11, T.q]],
    leaks: [T.b1, T.b3, T.b8, T.b10],
    white: [T.b8 + 0.35, T.b9 + 0.1, T.b9 + 0.5],
    redHits: [T.b6 + 0.35, T.b11 + 0.35],
    meteors: { t0: T.b9 - 0.1, n: 12 },
    prop: { html: BOARD, t0: T.b4, t1: T.b6, cls: "big" },
    ask: { choices: ["믿는다", "안 믿는다"], line: "댓글로 골라 주세요" },
    end: { room: "<b>Ⅳ</b> 데칸의 방", pitch: "생일이 가리키는 별자리 속 자리<br>데칸으로 잠든 재능을 읽어요", cta: "프로필 링크에서 네 번째 문", next: "다음 전설 — 저승의 신들을 이긴 쌍둥이" },
    after: ({ stage, anim }) => {
      anim(stage.querySelector(".stone .r1"), [`spin 20s linear ${T.b4}s infinite`]);
      anim(stage.querySelector(".stone .r2"), [`spin-r 28s linear ${T.b4}s infinite`]);
      stage.querySelectorAll(".stone .dk").forEach((d, k) => anim(d, [`dk-on 0.3s ease-out ${T.b4 + 0.8 + k * 0.05}s forwards`]));
    },
    sound: {
      key: 72,
      chords: [[0, [36, 43, 48, 51]], [T.b4, [36, 43, 48, 52, 55]], [T.b6, [37, 44, 49, 52]], [T.b8, [36, 43, 52, 55]], [T.b11, [37, 44, 48, 51]], [T.q, [36, 43, 50, 55]]],
      tense: [[T.b6, T.b8 + 0.3]],
      sfx: [
        ["bell", T.b1 + 0.3, 60, 0.07], ["whoosh", T.b2, 0.6, 0.3], ["wind", T.b2, T.b3 + 0.5, 0.6], ["drums", T.b3 + 0.2, 6, 0.3],
        ["arp", T.b4 + 0.6, [72, 76, 79, 84, 88], 0.12, 0.05], ["arp", T.b5 + 0.4, [79, 84, 88, 91], 0.15, 0.04],
        ["boom", T.b6 + 0.35, 0.7, 50], ["tick", T.b6 + 0.6, 12], ["riser", T.b7, T.b8 + 0.3, 0.35],
        ["boom", T.b8 + 0.35, 1.1, 46], ["arp", T.b8 + 0.4, [72, 76, 79, 84], 0.06, 0.06],
        ["boom", T.b9 + 0.1, 1.2, 40], ["shatter", T.b9 + 0.1, 0.5], ["boom", T.b9 + 0.5, 0.9, 44], ["arp", T.b10 + 0.3, [60, 64, 67, 72, 76], 0.12, 0.05],
        ["boom", T.b11 + 0.35, 0.8, 48], ["bell", T.b11 + 0.4, 63, 0.08],
      ],
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = E; else window.EPISODE = E;
})();
