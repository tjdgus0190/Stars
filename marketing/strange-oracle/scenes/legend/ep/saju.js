// 전설 릴스 「팔자를 따지러 간 사내」 만신의 방 (2026-11-13). 공용 틀 legend-ep.html?ep=saju.
// 근거: 한국 구비 설화 「구복여행」(한국민족문화대백과사전 '구복여행' 항목 등). 복 없는 팔자라는 말을 들은 총각이 이유를 물으러 서천서역국으로 떠남 →
//       가는 길에 처녀(혼인을 못 함), 노인(나무에 열매가 안 열림), 이무기(천 년을 닦아도 용이 못 됨)에게 질문을 부탁받음 → 세 가지만 묻게 하자 자기 질문을 버림 →
//       이무기는 여의주를 하나 버려야 용이 된다 하여 총각에게 주고, 나무 밑의 금을 나누고, 처녀와 혼인해 복을 누림. 판본마다 인물·순서가 달라 가장 흔한 줄거리로.
// 그림: 메트로폴리탄·클리블랜드 미술관 CC0 조선 그림(CREDITS.md). 여의주는 직접 그림.
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.8, b3: 10.0, b4: 13.2, b5: 16.4, b6: 19.6, b7: 22.8, b8: 26.0, b9: 29.2, b10: 32.4, b11: 35.6, q: 38.8, end: 42.8, dur: 48 };
  const A = (f, w, h) => ({ img: `legend/art/${f}.jpg`, w, h });
  const MG2 = A("saju-mountaingod2", 2200, 1870), MG = A("saju-mountaingod", 1543, 2200), ND = A("saju-ninedragon", 1052, 2200), SN = A("saju-snowscape", 2200, 1752);
  const PV = A("saju-pavilion", 553, 900), DE = A("saju-deer", 928, 2000);
  const INK = "sepia(0.25) contrast(1.15) brightness(0.9)", COL = "saturate(1.15) contrast(1.12) brightness(0.92)";
  const S = (o, x) => Object.assign({}, o, x);
  const PEARL = `<div class="halo"></div><svg viewBox="0 0 560 520"><defs><radialGradient id="pg" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fffbe8" /><stop offset="0.45" stop-color="#f2cf7a" /><stop offset="1" stop-color="#9a6a1e" /></radialGradient></defs>
    <circle cx="280" cy="260" r="150" fill="url(#pg)" /><path class="swirl" d="M180 250C200 170 300 150 350 210C390 260 340 330 280 320C230 312 230 250 280 250" fill="none" stroke="#fff6d8" stroke-width="10" stroke-linecap="round" opacity="0.7" />
    ${[0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return `<path class="flame" d="M${(280 + 175 * Math.cos(a)).toFixed(0)} ${(260 + 175 * Math.sin(a)).toFixed(0)}l${(30 * Math.cos(a)).toFixed(0)} ${(30 * Math.sin(a)).toFixed(0)}" />`; }).join("")}</svg>`;
  const E = {
    room: "saju",
    T,
    eyebrow: "만신의 방의 전설",
    caps: [
      [0, T.b1, "팔자에 복이 없다는<br>말을 들은 사내가<br><em>하늘에 따지러 갔다</em>", "hook"],
      [T.b1, T.b2, "옛날 한 총각은<br>아무리 일해도<br><em>가난을 벗지 못했어요</em>"],
      [T.b2, T.b3, "“자네 팔자엔<br>복이<br><em class=\"red hit\">한 톨도 없네</em>”"],
      [T.b3, T.b4, "총각은 짐을 꾸렸어요<br>“서천서역국에 가서<br><em>왜인지 물어보겠소</em>”"],
      [T.b4, T.b5, "가는 길에 묵은 집<br>처녀가 부탁했어요<br>“나는 왜 <em>혼인을 못 하는지</em>”"],
      [T.b5, T.b6, "어느 노인은<br>“우리 집 나무엔 왜<br><em>열매가 안 열리는지</em>”"],
      [T.b6, T.b7, "강을 건네준 이무기는<br>“천 년을 닦았는데<br>왜 <em class=\"hit\">용이 못 되는지</em>”"],
      [T.b7, T.b8, "마침내 만난 산신령<br>“묻는 건 <em class=\"red hit\">세 가지</em>만<br>들어주겠다”"],
      [T.b8, T.b9, "자기 질문까지 넷<br>총각은 잠시 망설이다<br><em class=\"hit\">자기 질문을 버렸어요</em>"],
      [T.b9, T.b10, "돌아오는 길<br>“여의주를 하나 버려야<br>용이 된다”<br>이무기는 그 하나를 <em class=\"hit\">총각에게</em>"],
      [T.b10, T.b11, "노인은 나무 밑에서 나온<br><em class=\"hit\">금</em>을 나눠 주고<br>처녀는 <em class=\"hit\">그와 혼인했대요</em>"],
      [T.b11, T.q, "복이 없다던 팔자<br>남의 복을 찾아 주다<br><em>제 복을 얻은 거예요</em>"],
      [T.q, T.end, "당신이라면 마지막 질문<br><em>누구에게 쓸까요?</em>"],
    ],
    h2: { t: T.h2, html: "<br><br><br>그리고 <em class=\"red\">질문을 버렸다</em>" },
    shots: [
      S(MG2, { t0: 0, t1: T.b1, a: [0.5, 0.3, 1.35], b: [0.5, 0.28, 1.8], grade: COL }),
      S(SN, { t0: T.b1, t1: T.b2, a: [0.3, 0.6, 1.0], b: [0.6, 0.55, 1.15], grade: INK + " brightness(0.8)", cut: "whip" }),
      S(MG, { t0: T.b2, t1: T.b3, a: [0.55, 0.4, 1.3], b: [0.6, 0.35, 1.8], grade: COL + " brightness(0.75)", cut: "flash" }),
      S(SN, { t0: T.b3, t1: T.b4, a: [0.8, 0.5, 1.0], b: [0.2, 0.45, 1.0], grade: INK }),
      S(PV, { t0: T.b4, t1: T.b5, a: [0.5, 0.6, 1.0], b: [0.5, 0.45, 1.25], grade: INK, cut: "whip" }),
      S(DE, { t0: T.b5, t1: T.b6, a: [0.5, 0.6, 1.0], b: [0.5, 0.3, 1.15], grade: COL, cut: "whip" }),
      S(ND, { t0: T.b6, t1: T.b7, a: [0.5, 0.7, 1.05], b: [0.5, 0.3, 1.05], grade: INK, cut: "flash" }),
      S(MG2, { t0: T.b7, t1: T.b8, a: [0.5, 0.5, 1.0], b: [0.5, 0.35, 1.3], grade: COL, cut: "flash" }),
      S(MG2, { t0: T.b8, t1: T.b9, a: [0.5, 0.25, 2.0], b: [0.5, 0.22, 2.5], grade: COL + " brightness(0.8)" }),
      S(ND, { t0: T.b9, t1: T.b10, a: [0.5, 0.5, 1.1], b: [0.5, 0.5, 1.2], grade: "brightness(0.25) blur(5px)" }),
      S(DE, { t0: T.b10, t1: T.b11, a: [0.5, 0.75, 1.1], b: [0.5, 0.6, 1.3], grade: COL, cut: "flash" }),
      S(MG, { t0: T.b11, t1: T.q, a: [0.5, 0.5, 1.0], b: [0.5, 0.4, 1.25], grade: COL, cut: "whip" }),
      S(SN, { t0: T.q, t1: null, a: [0.5, 0.5, 1.1], b: [0.5, 0.5, 1.25], grade: "brightness(0.4) blur(3px)" }),
    ],
    gold: [[T.b7, T.b8], [T.b9, T.q]],
    red: [[T.b2, T.b3], [T.b8 - 0.2, T.b8 + 1.6]],
    leaks: [T.b1, T.b4, T.b7, T.b10, T.b11],
    white: [T.b7 + 0.35, T.b9 + 0.6, T.b10 + 0.35],
    redHits: [T.b2 + 0.4],
    prop: { html: PEARL, t0: T.b9, t1: T.b10 + 0.2, cls: "big" },
    ask: { choices: ["내 질문", "남의 질문"], line: "댓글로 골라 주세요" },
    end: { room: "<b>Ⅰ</b> 만신의 방", pitch: "태어난 해·달·날·시 여덟 글자로<br>타고난 그릇을 읽어 드려요", cta: "프로필 링크에서 첫 번째 문", next: "문 너머의 기록 · 일곱 방의 전설" },
    after: ({ stage, anim }) => {
      anim(stage.querySelector(".stone .swirl"), [`spin 6s linear ${T.b9}s infinite`]);
      stage.querySelectorAll(".stone .flame").forEach((f, k) => anim(f, [`fly-glow 0.9s ease-in-out ${T.b9 + 0.6 + k * 0.1}s infinite`]));
    },
    sound: {
      key: 74,
      chords: [[0, [38, 45, 50, 53]], [T.b2, [37, 44, 49, 52]], [T.b3, [38, 45, 50, 53]], [T.b7, [38, 45, 50, 54, 57]], [T.b8, [37, 44, 50, 53]], [T.b9, [38, 45, 54, 57]], [T.q, [38, 45, 52, 57]]],
      tense: [[T.b7, T.b9]],
      sfx: [
        ["wind", T.b1, T.b2 + 0.5, 0.6], ["boom", T.b2 + 0.4, 0.9, 46], ["drums", T.b3 + 0.2, 8, 0.25], ["wind", T.b3, T.b4 + 0.4, 0.5],
        ["bell", T.b4 + 0.3, 69, 0.06], ["bell", T.b5 + 0.3, 66, 0.06], ["water", T.b6 - 0.1, 3, 0.35], ["boom", T.b6 + 0.4, 0.6, 50],
        ["arp", T.b7 + 0.35, [62, 66, 69, 74], 0.12, 0.05], ["tick", T.b8 + 0.4, 10], ["riser", T.b8 + 0.6, T.b9 + 0.3, 0.25],
        ["boom", T.b9 + 0.6, 0.9, 48], ["arp", T.b9 + 0.6, [74, 78, 81, 86, 90, 93], 0.08, 0.05], ["arp", T.b10 + 0.4, [69, 74, 78, 81], 0.15, 0.05], ["arp", T.b11 + 0.4, [62, 66, 69, 74, 78, 81], 0.1, 0.05],
      ],
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = E; else window.EPISODE = E;
})();
