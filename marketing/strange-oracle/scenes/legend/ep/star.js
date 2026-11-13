// 전설 릴스 「하루 앞당긴 대관식」 베다의 방 (2026-11-13). 공용 틀 legend-ep.html?ep=star.
// 근거: 발미키 『라마야나』 아요디야 편 4장(다샤라타 왕이 "점성가들이 말하길 내 탄생 별(나크샤트라)이 해·화성·라후 같은 흉한 별에 둘러싸였다.
//       오늘 달은 푸나르바수에 있고 내일은 푸쉬야에 든다. 마음이 바뀌기 전에 내일 푸쉬야에 왕위를 받으라"고 라마를 서두름),
//       7~18장(그날 밤 둘째 왕비 카이케이가 예전에 받은 소원 두 가지로 자기 아들의 즉위와 라마의 14년 숲 추방을 요구), 이후 라마는 14년 뒤 돌아와 즉위.
// 왕의 슬픔과 죽음 부분은 쓰지 않는다. 그림: 클리블랜드·메트로폴리탄 미술관 CC0(라마야나 세밀화, CREDITS.md). 별자리 바퀴는 직접 그림.
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.8, b3: 10.0, b4: 13.2, b5: 16.4, b6: 19.6, b7: 22.8, b8: 26.0, b9: 29.2, b10: 32.4, b11: 35.6, q: 38.8, end: 42.8, dur: 48 };
  const A = (f, w, h) => ({ img: `legend/art/${f}.jpg`, w, h });
  const DK = A("star-dasharatha-kaikeyi", 2200, 1541), KR = A("star-kaikeyi-reminds", 2200, 1370), PAL = A("star-birth-palace", 2200, 1635), PRO = A("star-procession", 2200, 1545);
  const FOR = A("star-forest", 1609, 2200), BRO = A("star-brothers", 2200, 1557), ENT = A("star-enthroned", 1508, 2200);
  const MIN = "saturate(1.15) contrast(1.12) brightness(0.92)";
  const S = (o, x) => Object.assign({}, o, x);
  // 달의 스물일곱 집 바퀴: 흉한 별 셋이 한 집에 몰리고, 푸쉬야(여덟째 집)가 금빛으로 켜진다
  const pt = (i, r) => { const a = -Math.PI / 2 + (i / 27) * Math.PI * 2; return [280 + r * Math.cos(a), 260 + r * Math.sin(a)]; };
  const WHEEL = `<div class="halo"></div><svg viewBox="0 0 560 520">
    <circle cx="280" cy="260" r="220" fill="none" stroke="oklch(0.8 0.08 290 / 0.5)" stroke-width="3" /><circle cx="280" cy="260" r="160" fill="none" stroke="oklch(0.8 0.08 290 / 0.3)" stroke-width="2" />
    ${Array.from({ length: 27 }, (_, i) => { const [x, y] = pt(i, 190); return `<circle class="nk${i === 7 ? " pushya" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 7 ? 14 : 9}" />`; }).join("")}
    ${[0, 1, 2].map((k) => { const [x, y] = pt(20 + k * 0.6, 135); return `<circle class="bad" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" />`; }).join("")}
    <path class="moon2" d="M280 220A40 40 0 1 0 280 300A32 32 0 1 1 280 220Z" /></svg>`;
  const E = {
    room: "star",
    T,
    eyebrow: "베다의 방의 전설",
    caps: [
      [0, T.b1, "별이 나쁘다는 말에<br>왕은 대관식을<br><em>하루 앞당겼다</em>", "hook"],
      [T.b1, T.b2, "고대 인도 아요디야<br>늙은 왕 <em>다샤라타</em>에게는<br>맏아들 <em>라마</em>가 있었어요"],
      [T.b2, T.b3, "어느 날 점성가가 말했어요<br>“왕의 별자리에<br><em class=\"red hit\">흉한 별</em>들이 몰려듭니다”"],
      [T.b3, T.b4, "“그리고 내일, 달은<br>가장 길한 집<br><em class=\"hit\">푸쉬야</em>에 듭니다”"],
      [T.b4, T.b5, "왕은 서둘렀어요<br>“내 마음이 바뀌기 전에<br><em class=\"hit\">내일 왕위를 물려주마</em>”"],
      [T.b5, T.b6, "온 도시가<br>등불을 켜고<br>대관식을 준비했죠"],
      [T.b6, T.b7, "그런데 그날 밤<br>둘째 왕비 <em>카이케이</em>가<br>왕을 찾아왔어요"],
      [T.b7, T.b8, "“예전에 약속한<br>소원 두 가지를<br><em class=\"hit\">지금 쓰겠어요</em>”"],
      [T.b8, T.b9, "“내 아들을 왕으로<br>그리고 라마는<br><em class=\"red hit\">14년 동안 숲으로</em>”"],
      [T.b9, T.b10, "다음 날 아침<br>왕관 대신<br>라마는 <em class=\"hit\">숲으로 떠났어요</em>"],
      [T.b10, T.b11, "가장 좋다던 그날이<br>가장 긴 <em>이별</em>의 날이<br>된 거예요"],
      [T.b11, T.q, "14년 뒤<br>라마는 돌아와<br><em class=\"hit\">왕좌에 올랐대요</em>"],
      [T.q, T.end, "당신이 왕이었다면<br>별의 경고에<br><em>어떻게 했을까요?</em>"],
    ],
    h2: { t: T.h2, html: "<br><br><br>그날 밤, <em class=\"red\">뒤집혔다</em>" },
    shots: [
      S(DK, { t0: 0, t1: T.b1, a: [0.4, 0.45, 1.25], b: [0.3, 0.45, 1.6], grade: MIN }),
      S(PAL, { t0: T.b1, t1: T.b2, a: [0.3, 0.4, 1.0], b: [0.7, 0.4, 1.1], grade: MIN, cut: "whip" }),
      S(PAL, { t0: T.b2, t1: T.b4, a: [0.5, 0.5, 1.2], b: [0.5, 0.5, 1.3], grade: "brightness(0.25) saturate(0.6) blur(5px)" }),
      S(DK, { t0: T.b4, t1: T.b5, a: [0.28, 0.45, 1.5], b: [0.25, 0.42, 2.0], grade: MIN, cut: "flash" }),
      S(PRO, { t0: T.b5, t1: T.b6, a: [0.2, 0.5, 1.0], b: [0.7, 0.45, 1.05], grade: MIN, cut: "whip" }),
      S(DK, { t0: T.b6, t1: T.b7, a: [0.55, 0.5, 1.4], b: [0.5, 0.48, 1.8], grade: MIN + " brightness(0.75)", cut: "flash" }),
      S(KR, { t0: T.b7, t1: T.b8, a: [0.72, 0.5, 1.3], b: [0.78, 0.45, 1.8], grade: MIN, cut: "flash" }),
      S(DK, { t0: T.b8, t1: T.b9, a: [0.5, 0.5, 2.0], b: [0.5, 0.5, 2.6], grade: MIN + " brightness(0.7)", cut: "flash" }),
      S(FOR, { t0: T.b9, t1: T.b10, a: [0.5, 0.45, 1.1], b: [0.45, 0.5, 1.4], grade: MIN, cut: "whip" }),
      S(BRO, { t0: T.b10, t1: T.b11, a: [0.2, 0.5, 1.0], b: [0.8, 0.5, 1.0], grade: MIN + " brightness(0.8)" }),
      S(ENT, { t0: T.b11, t1: T.q, a: [0.5, 0.5, 1.05], b: [0.5, 0.42, 1.4], grade: MIN, cut: "flash" }),
      S(ENT, { t0: T.q, t1: null, a: [0.5, 0.45, 1.1], b: [0.5, 0.45, 1.25], grade: "brightness(0.45) blur(3px)" }),
    ],
    gold: [[T.b3, T.b4], [T.b5, T.b6], [T.b11, T.q]],
    red: [[T.b8, T.b9]],
    leaks: [T.b1, T.b5, T.b9, T.b11],
    white: [T.b3 + 0.4, T.b4 + 0.35, T.b11 + 0.35],
    redHits: [T.b2 + 0.4, T.b8 + 0.35],
    prop: { html: WHEEL, t0: T.b2, t1: T.b4, cls: "big" },
    ask: { choices: ["서두른다", "기다린다"], line: "댓글로 골라 주세요" },
    end: { room: "<b>Ⅲ</b> 베다의 방", pitch: "태어난 밤 달이 머문 집으로<br>마음의 결을 읽어요", cta: "프로필 링크에서 세 번째 문", next: "다음 전설 — 태어날 순간을 고른 별판" },
    after: ({ stage, anim }) => {
      stage.querySelectorAll(".stone .bad").forEach((b, k) => anim(b, [`bad-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) ${T.b2 + 1.0 + k * 0.3}s both`, `bad-pulse 0.9s ease-in-out ${T.b2 + 2.0}s infinite`]));
      anim(stage.querySelector(".stone .pushya"), [`pushya-on 0.8s ease-out ${T.b3 + 0.5}s both`]);
      anim(stage.querySelector(".stone .moon2"), [`moon-go 1.6s cubic-bezier(0.4, 0, 0.2, 1) ${T.b3 + 0.2}s both`]);
    },
    sound: {
      key: 69,
      chords: [[0, [38, 45, 50, 57]], [T.b2, [37, 44, 50, 53]], [T.b3, [38, 45, 50, 54, 57]], [T.b6, [36, 43, 51, 55]], [T.b9, [38, 45, 50, 53]], [T.b11, [38, 45, 54, 57]], [T.q, [38, 45, 52, 57]]],
      tense: [[T.b6, T.b9]],
      sfx: [
        ["bell", T.b1 + 0.3, 62, 0.06], ["tick", T.b2 + 0.3, 6], ["boom", T.b2 + 1.0, 0.5, 52], ["boom", T.b2 + 1.3, 0.5, 50], ["boom", T.b2 + 1.6, 0.6, 46],
        ["arp", T.b3 + 0.5, [74, 78, 81, 86, 90], 0.1, 0.05], ["drums", T.b4 + 0.2, 6, 0.3], ["arp", T.b5 + 0.3, [69, 73, 76, 81], 0.25, 0.04],
        ["wind", T.b6 - 0.2, T.b8, 0.6], ["boom", T.b6 + 0.4, 0.6, 48], ["riser", T.b7 + 0.3, T.b8 + 0.3, 0.3], ["boom", T.b8 + 0.35, 1.1, 42], ["shatter", T.b8 + 0.35, 0.4],
        ["whoosh", T.b9, 0.6, 0.3], ["wind", T.b9, T.b11, 0.7], ["boom", T.b11 + 0.35, 0.7, 52], ["arp", T.b11 + 0.4, [62, 66, 69, 74, 78, 81], 0.1, 0.05],
      ],
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = E; else window.EPISODE = E;
})();
