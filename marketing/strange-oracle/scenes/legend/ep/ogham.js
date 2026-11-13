// 전설 릴스 「사라진 왕비와 네 개의 막대」 오검의 방 (2026-11-13). 공용 틀 legend-ep.html?ep=ogham.
// 근거: 『에탄의 구애』(Tochmarc Étaíne) 3부 — 요정의 왕 미디르가 대왕 에오하이와 내기 게임(피드헬)을 벌여 마지막 판에 이겨 왕비 에탄을 원함,
//       군사로 막은 궁전에서 왕비를 안고 백조 두 마리가 되어 지붕 창으로 날아감 → 드루이드 달란이 주목나무 막대 넷에 오검을 새겨 점을 쳐
//       왕비가 요정의 언덕 브리 레이스에 있음을 알아냄 → 왕이 언덕을 파헤쳐 되찾음. 뒤의 바꿔치기 이야기는 쓰지 않는다.
// 그림: 메트로폴리탄·클리블랜드 미술관 CC0(CREDITS.md). 오검 막대는 직접 그림.
(function () {
  const T = { h2: 1.2, b1: 3.6, b2: 6.8, b3: 10.0, b4: 13.2, b5: 16.4, b6: 19.6, b7: 22.8, b8: 26.0, b9: 29.2, b10: 32.4, b11: 35.6, q: 38.8, end: 42.8, dur: 48 };
  const A = (f, w, h) => ({ img: `legend/art/${f}.jpg`, w, h });
  const MAB = A("ogham-mab-turner", 2200, 1807), TREE = A("ogham-tree-doyle", 2200, 1339), FQ = A("ogham-fairyqueen-turner", 2200, 1603), YEW = A("ogham-yew", 1411, 2200);
  const BOARD = A("ogham-board", 2148, 2200), HEAD = A("ogham-celtic-head", 1885, 2200), SWAN = A("ogham-swans-hollar", 2200, 1544);
  const ENG = "sepia(0.55) contrast(1.3) brightness(0.92)", OBJ = "sepia(0.35) contrast(1.35) brightness(0.62)";
  const S = (o, x) => Object.assign({}, o, x);
  // 주목나무 막대 넷 + 오검 획(가운데 줄기선을 가로지르는 짧은 획들)
  const NOTCH = [[1, 3, 5], [2, 4], [1, 2, 3, 4], [3, 5]];
  const WANDS = `<div class="halo"></div><svg viewBox="0 0 560 520"><defs><linearGradient id="yw" x1="0" x2="1"><stop offset="0" stop-color="#5a3a22" /><stop offset="0.5" stop-color="#9c6b3e" /><stop offset="1" stop-color="#4a2e1a" /></linearGradient></defs>
    ${[0, 1, 2, 3].map((k) => { const x = 130 + k * 100, r = (k - 1.5) * 5;
      return `<g transform="rotate(${r} ${x} 260)"><rect x="${x - 16}" y="40" width="32" height="440" rx="14" fill="url(#yw)" stroke="#2e1c10" stroke-width="3" /><path class="og" d="M${x} 70V450" />${NOTCH[k].map((n, j) => `<path class="og" d="M${x - (j % 2 ? 22 : 0)} ${80 + n * 60}H${x + (j % 2 ? 0 : 22)}" />`).join("")}</g>`; }).join("")}</svg>`;
  const E = {
    room: "ogham",
    T,
    eyebrow: "오검의 방의 전설",
    caps: [
      [0, T.b1, "왕비가 백조가 되어<br>지붕 너머로<br><em>사라졌다</em>", "hook"],
      [T.b1, T.b2, "아일랜드의 대왕<br>에오하이에게는<br>아름다운 왕비 <em>에탄</em>이 있었어요"],
      [T.b2, T.b3, "어느 날 낯선 사내가<br>나타나 왕에게<br><em>내기 게임</em>을 청했어요"],
      [T.b3, T.b4, "마지막 판의 내기는<br>'이긴 쪽이 원하는 것'<br>왕은 <em class=\"red hit\">졌어요</em>"],
      [T.b4, T.b5, "사내는 요정의 왕 <em>미디르</em><br>그가 원한 건<br><em class=\"hit\">왕비</em>였어요"],
      [T.b5, T.b6, "왕은 궁전을<br>군사로 겹겹이<br>막았지만…"],
      [T.b6, T.b7, "미디르는 왕비를 안고<br><em class=\"hit\">백조 두 마리</em>가 되어<br>지붕 너머로 날아갔어요"],
      [T.b7, T.b8, "왕은 온 나라를<br>뒤졌지만<br><em class=\"red\">찾지 못했죠</em>"],
      [T.b8, T.b9, "그때 드루이드가<br><em>주목나무 막대 네 개</em>를<br>깎았어요"],
      [T.b9, T.b10, "막대에<br><em class=\"hit\">오검 글자</em>를 새기고<br>점을 치자"],
      [T.b10, T.b11, "막대가 가리킨 곳은<br>요정의 언덕<br><em class=\"hit\">브리 레이스</em>"],
      [T.b11, T.q, "왕은 그 언덕을 파헤쳐<br><em class=\"hit\">왕비를 되찾았대요</em>"],
      [T.q, T.end, "당신이 왕이었다면<br>마지막 판, <em>걸었을까요?</em>"],
    ],
    h2: { t: T.h2, html: "<br><br><br>답은 <em class=\"red\">막대 네 개</em>" },
    shots: [
      S(MAB, { t0: 0, t1: T.b1, a: [0.45, 0.45, 1.3], b: [0.4, 0.4, 1.6], grade: "saturate(1.15) contrast(1.15) brightness(0.85)" }),
      S(HEAD, { t0: T.b1, t1: T.b2, a: [0.5, 0.35, 1.2], b: [0.5, 0.3, 1.5], grade: OBJ, cut: "whip" }),
      S(BOARD, { t0: T.b2, t1: T.b3, a: [0.5, 0.5, 1.0], b: [0.5, 0.5, 1.3], grade: "contrast(1.2) brightness(0.75)", cut: "flash" }),
      S(BOARD, { t0: T.b3, t1: T.b4, a: [0.5, 0.5, 1.8], b: [0.5, 0.5, 2.4], grade: "contrast(1.25) brightness(0.65)", cut: "flash" }),
      S(TREE, { t0: T.b4, t1: T.b5, a: [0.3, 0.5, 1.0], b: [0.55, 0.45, 1.15], grade: "saturate(1.1) contrast(1.1)", cut: "whip" }),
      S(FQ, { t0: T.b5, t1: T.b6, a: [0.5, 0.5, 1.0], b: [0.4, 0.5, 1.2], grade: ENG }),
      S(SWAN, { t0: T.b6, t1: T.b7, a: [0.45, 0.6, 1.0], b: [0.6, 0.25, 1.3], grade: ENG, cut: "flash" }),
      S(MAB, { t0: T.b7, t1: T.b8, a: [0.6, 0.5, 1.2], b: [0.5, 0.5, 1.0], grade: "saturate(0.7) contrast(1.1) brightness(0.55)" }),
      S(YEW, { t0: T.b8, t1: T.b9, a: [0.5, 0.4, 1.1], b: [0.5, 0.3, 1.5], grade: "saturate(1.1) contrast(1.1) brightness(0.9)", cut: "whip" }),
      S(YEW, { t0: T.b9, t1: T.b10, a: [0.5, 0.4, 1.1], b: [0.5, 0.4, 1.2], grade: "brightness(0.3) blur(4px)" }),
      S(TREE, { t0: T.b10, t1: T.b11, a: [0.5, 0.6, 1.4], b: [0.45, 0.4, 1.9], grade: "saturate(1.1) contrast(1.1)", cut: "flash" }),
      S(MAB, { t0: T.b11, t1: T.q, a: [0.4, 0.4, 1.0], b: [0.4, 0.4, 1.25], grade: "saturate(1.15) contrast(1.15)" }),
      S(MAB, { t0: T.q, t1: null, a: [0.45, 0.45, 1.1], b: [0.45, 0.45, 1.25], grade: "brightness(0.45) blur(3px)" }),
    ],
    gold: [[T.b4, T.b5], [T.b9, T.b10], [T.b11, T.q]],
    red: [[T.b3 + 0.2, T.b4], [T.b7, T.b8]],
    leaks: [T.b1, T.b4, T.b6, T.b10, T.b11],
    white: [T.b6 + 0.35, T.b9 + 0.6, T.b10 + 0.35],
    redHits: [T.b3 + 0.5],
    prop: { html: WANDS, t0: T.b9, t1: T.b10 + 0.2, cls: "big" },
    ask: { choices: ["건다", "안 건다"], line: "댓글로 골라 주세요" },
    end: { room: "<b>Ⅱ</b> 오검의 방", pitch: "이름의 소리를 따라<br>스무 나무 글자 중 하나를 새겨 드려요", cta: "프로필 링크에서 두 번째 문", next: "다음 전설 — 별이 나쁘다는 말에 앞당긴 대관식" },
    after: ({ stage, anim }) => {
      stage.querySelectorAll(".stone .og").forEach((p, k) => anim(p, [`carve-h 0.3s cubic-bezier(0.5, 0, 0.3, 1) ${T.b9 + 0.8 + k * 0.12}s forwards`]));
    },
    sound: {
      key: 74,
      chords: [[0, [38, 45, 50, 54]], [T.b3, [38, 44, 50, 53]], [T.b4, [38, 45, 50, 53]], [T.b8, [38, 45, 50, 54, 57]], [T.b11, [38, 45, 54, 57]], [T.q, [38, 45, 52, 57]]],
      tense: [[T.b2, T.b4], [T.b5, T.b6 + 0.4]],
      sfx: [
        ["wind", 0, T.b1, 0.6], ["bell", T.b1 + 0.3, 62, 0.06],
        ["tick", T.b2 + 0.4, 10], ["boom", T.b3 + 0.5, 0.9, 46], ["arp", T.b4 + 0.3, [74, 78, 81, 86], 0.15, 0.04],
        ["drums", T.b5 + 0.2, 8, 0.35], ["whoosh", T.b6, 0.8, 0.4], ["arp", T.b6 + 0.35, [86, 90, 93, 98], 0.08, 0.04], ["boom", T.b6 + 0.35, 0.8, 50],
        ["wind", T.b7 - 0.2, T.b8 + 0.5, 0.9], ["chisel", T.b8 + 0.4, 0.6, -0.2], ["chisel", T.b8 + 0.9, 0.6, 0.2],
        ["chisel", T.b9 + 0.8, 0.5, -0.3], ["chisel", T.b9 + 1.1, 0.5, -0.1], ["chisel", T.b9 + 1.4, 0.5, 0.1], ["chisel", T.b9 + 1.7, 0.5, 0.3], ["riser", T.b9 + 1.0, T.b10, 0.25],
        ["boom", T.b10 + 0.35, 0.9, 48], ["bell", T.b10 + 0.4, 81, 0.07], ["boom", T.b11 + 0.4, 0.7, 52], ["arp", T.b11 + 0.5, [62, 66, 69, 74, 78], 0.1, 0.05],
      ],
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = E; else window.EPISODE = E;
})();
