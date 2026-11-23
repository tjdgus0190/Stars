// 자동 게시 릴스 「크로이소스의 신탁」 시빌라의 방 (2026-11-23). 공용 틀 legend-ep.html?ep=p20261123-sibyl + legend/episode.js. 소리는 render/sound-legend.js가 이 파일을 읽는다.
// 근거(기록): 헤로도토스 『역사』 1권 — 1.46~48(사절들에게 떠난 지 백 일째 되는 날 「리디아 왕 크로이소스는 지금 무엇을 하는가」를 묻게 함, 그날 왕은 거북과 양고기를 잘라
//   청동 솥에 넣고 청동 뚜껑을 덮어 끓임, 델포이가 이를 맞힘 · 1.49 암피아라오스의 답도 맞았다고 여김 → 「델포이만」이라 쓰지 않음),
//   1.53(「페르시아로 군대를 보내면 대제국을 무너뜨리리라」), 1.75(할리스강을 건넘), 1.86~91(사르디스 함락, 「어느 제국인지 다시 물었어야 했다」).
//   화형 장면(1.86~87)은 쓰지 않는다 — 「왕좌를 잃었다」 수준.
// 그림: 기존 CC0(메트로폴리탄·클리블랜드, CREDITS.md). 청동 솥은 직접 그림.
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.8, b3: 10.0, b4: 13.6, b5: 16.8, b6: 19.6, b7: 22.6, b8: 25.8, b9: 29.4, b10: 32.4, b11: 36.0, q: 39.4, end: 43.2, dur: 48 };
  const A = (f, w, h) => ({ img: `legend/art/${f}.jpg`, w, h });
  const HORSE = A("horse-bonasone", 2200, 1402), FEAST = A("rune-feast-muller", 2200, 1970), TEMPLE = A("temple-panini", 1713, 2200);
  const GOIS = A("hannibal-gois", 1744, 2200), UGO = A("sibyl-ugo", 1790, 2200), DROST = A("sibyl-drost", 1739, 2200);
  const APOLLO = A("apollo-lairesse", 2091, 2200), FLEET = A("fleet-lorrain", 2200, 1528), TRIUMPH = A("hannibal-desprez", 2200, 1295);
  const ENG = "sepia(0.55) contrast(1.3) brightness(0.92)", DARK = "sepia(0.35) contrast(1.3) brightness(0.62)";
  const S = (o, x) => Object.assign({}, o, x);
  // 청동 솥(직접 그림): 세 발 솥 + 뚜껑 + 김
  const POT = `<div class="halo"></div><svg viewBox="0 0 560 560"><defs>
    <linearGradient id="bz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2b46a" /><stop offset="0.5" stop-color="#a8743a" /><stop offset="1" stop-color="#4a2e14" /></linearGradient>
    <linearGradient id="st" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f4ead2" stop-opacity="0.55" /><stop offset="1" stop-color="#f4ead2" stop-opacity="0" /></linearGradient></defs>
    <path d="M210 150C190 110 230 80 210 40M280 140C260 95 300 70 280 20M350 150C330 110 370 80 350 40" fill="none" stroke="url(#st)" stroke-width="14" stroke-linecap="round" />
    <path d="M150 470L120 540M410 470L440 540M280 490V550" stroke="#5a3a1a" stroke-width="18" stroke-linecap="round" />
    <path d="M90 250H470C470 400 390 490 280 490C170 490 90 400 90 250Z" fill="url(#bz)" stroke="#3a2410" stroke-width="5" />
    <path d="M120 300C200 320 360 320 440 300" fill="none" stroke="#f0cf8a" stroke-width="4" opacity="0.6" />
    <path d="M110 350C200 372 360 372 450 350" fill="none" stroke="#3a2410" stroke-width="3" opacity="0.5" />
    <ellipse cx="280" cy="250" rx="196" ry="34" fill="#c99350" stroke="#3a2410" stroke-width="5" />
    <path d="M110 238C150 190 410 190 450 238" fill="#b98545" stroke="#3a2410" stroke-width="5" />
    <circle cx="280" cy="192" r="16" fill="#e2b46a" stroke="#3a2410" stroke-width="4" />
    <path d="M86 262C50 262 50 310 92 312M474 262C510 262 510 310 468 312" fill="none" stroke="#7a4e22" stroke-width="12" /></svg>`;
  const E = {
    room: "sibyl",
    T,
    eyebrow: "시빌라의 방의 전설",
    caps: [
      [0, T.b1, "신탁은 맞았다<br><em class=\"red hit\">무너진 건</em><br>자기 나라였다", "hook"],
      [T.b1, T.b2, "기록에 따르면<br>기원전 6세기 리디아<br><em>세상에서 가장 부자인 왕</em>"],
      [T.b2, T.b3, "크로이소스 왕은<br>어느 신탁이 진짜인지<br><em class=\"hit\">시험해 보기로</em> 했어요"],
      [T.b3, T.b4, "사절들에게 일렀죠<br><em>떠난 지 백 일째 되는 날</em><br>「왕이 지금 뭘 하는지<br>맞혀 보라」"],
      [T.b4, T.b5, "그날 왕은 몰래<br><em class=\"hit\">거북과 양고기</em>를<br>청동 솥에 끓였어요"],
      [T.b5, T.b6, "델포이의 무녀가<br>그걸 <em class=\"hit\">정확히 맞혔어요</em>"],
      [T.b6, T.b7, "왕은 델포이를 믿고<br>물었어요<br><em>「페르시아와 싸우면?」</em>"],
      [T.b7, T.b8, "답은 수수께끼 한 줄<br>「싸우면<br><em class=\"hit\">대제국이 무너지리라</em>」"],
      [T.b8, T.b9, "왕은 강을 건넜어요<br>그런데—<br><em class=\"red hit\">무너진 건 자기 제국</em>"],
      [T.b9, T.b10, "수도는 함락되고<br>그는 <em>왕좌를 잃었어요</em>"],
      [T.b10, T.b11, "「왜 속였소?」<br>신탁의 대답—<br><em class=\"hit\">어느 제국인지<br>다시 물었어야지</em>"],
      [T.b11, T.q, "델포이에선<br>질문 하나에 답 한 줄<br>풀이는 <em>묻는 사람 몫</em>"],
      [T.q, T.end, "당신이라면<br><em>강을 건넜을까요?</em>"],
    ],
    h2: { t: T.h2, html: "<br><br><br>신탁을 <em class=\"red\">시험한 왕</em>" },
    shots: [
      S(HORSE, { t0: 0, t1: T.b1, a: [0.5, 0.45, 1.3], b: [0.45, 0.5, 1.6], grade: ENG + " brightness(0.85)" }),
      S(FEAST, { t0: T.b1, t1: T.b2, a: [0.3, 0.45, 1.05], b: [0.7, 0.4, 1.2], grade: ENG, cut: "whip" }),
      S(TEMPLE, { t0: T.b2, t1: T.b3, a: [0.5, 0.25, 1.2], b: [0.5, 0.4, 1.0], grade: "sepia(0.3) contrast(1.15) brightness(0.8)", cut: "flash" }),
      S(GOIS, { t0: T.b3, t1: T.b4, a: [0.5, 0.45, 1.1], b: [0.45, 0.4, 1.35], grade: ENG, cut: "whip" }),
      S(FEAST, { t0: T.b4, t1: T.b5, a: [0.5, 0.5, 1.2], b: [0.5, 0.5, 1.3], grade: ENG + " brightness(0.35) blur(3px)" }),
      S(UGO, { t0: T.b5, t1: T.b6, a: [0.6, 0.35, 1.3], b: [0.6, 0.3, 1.7], grade: "sepia(0.4) contrast(1.2) brightness(0.85)", cut: "flash" }),
      S(DROST, { t0: T.b6, t1: T.b7, a: [0.45, 0.3, 1.1], b: [0.45, 0.25, 1.4], grade: "contrast(1.2) brightness(1.05)", cut: "whip" }),
      S(APOLLO, { t0: T.b7, t1: T.b8, a: [0.45, 0.35, 1.05], b: [0.5, 0.3, 1.35], grade: "saturate(1.05) contrast(1.15) brightness(0.85)", cut: "flash" }),
      S(HORSE, { t0: T.b8, t1: T.b9, a: [0.3, 0.5, 1.2], b: [0.6, 0.45, 1.5], grade: ENG + " brightness(0.8)", cut: "whip" }),
      S(TRIUMPH, { t0: T.b9, t1: T.b10, a: [0.4, 0.5, 1.05], b: [0.6, 0.5, 1.25], grade: ENG, cut: "flash" }),
      S(DROST, { t0: T.b10, t1: T.b11, a: [0.45, 0.25, 1.5], b: [0.45, 0.25, 1.15], grade: "contrast(1.2) brightness(1.35)" }),
      S(UGO, { t0: T.b11, t1: T.q, a: [0.55, 0.3, 1.0], b: [0.55, 0.3, 1.25], grade: "sepia(0.4) contrast(1.2) brightness(0.8)", cut: "whip" }),
      S(FLEET, { t0: T.q, t1: null, a: [0.5, 0.5, 1.1], b: [0.5, 0.5, 1.25], grade: "brightness(0.45) blur(3px)" }),
    ],
    gold: [[T.b5, T.b6], [T.b7, T.b8]],
    red: [[T.b8 + 0.6, T.b9], [T.b10, T.b10 + 0.6]],
    leaks: [T.b1, T.b5, T.b9, T.b11],
    white: [T.b5 + 0.2, T.b8 + 0.9],
    redHits: [T.b8 + 0.95, T.b8 + 1.4],
    prop: { html: POT, t0: T.b4, t1: T.b5 + 0.4, cls: "big" },
    crack: { t: T.b8 + 0.95, out: T.b9 - 0.2, at: [540, 1000] },
    ask: { choices: [], line: "게시물 아래 투표로 골라 주세요" },
    end: { room: "<b>Ⅶ</b> 시빌라의 방", pitch: "질문 하나를 품고 신탁을 뽑으면<br>수수께끼 같은 한 줄이 답해요", cta: "프로필 링크에서 일곱 번째 문", next: "" },
    sound: {
      key: 74,
      chords: [[0, [38, 45, 50, 53]], [T.b2, [38, 45, 50, 53, 57]], [T.b6, [36, 43, 50, 55]], [T.b8, [34, 41, 50, 53]], [T.b10, [38, 45, 50, 53]], [T.q, [38, 45, 52, 57]]],
      tense: [[T.b7, T.b9]],
      sfx: [
        ["drums", T.b1 + 0.15, 8, 0.32], ["bell", T.b2 + 0.3, 69, 0.06],
        ["whoosh", T.b3 + 0.1, 0.5, 0.25], ["tick", T.b3 + 0.6, 10],
        ["fire", T.b4 - 0.1, T.b5, 0.6], ["boom", T.b4 + 0.3, 0.6, 60], ["water", T.b4 + 0.5, 2.4, 0.25],
        ["boom", T.b5 + 0.2, 0.9, 52], ["arp", T.b5 + 0.3, [62, 66, 69, 74], 0.1, 0.05],
        ["whoosh", T.b6 + 0.1, 0.5, 0.25], ["bell", T.b7 + 0.2, 81, 0.07], ["riser", T.b7 + 0.6, T.b8 + 0.9, 0.3],
        ["shatter", T.b8 + 0.95, 1.6], ["boom", T.b8 + 0.95, 1.3, 42], ["drums", T.b9 + 0.2, 6, 0.4],
        ["boom", T.b10 + 0.3, 0.8, 50], ["bell", T.b10 + 1.6, 86, 0.05], ["wind", T.b11 - 0.2, T.q + 1, 0.6],
      ],
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = E; else window.EPISODE = E;
})();
