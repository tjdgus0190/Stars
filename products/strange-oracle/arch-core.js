// 낯선 점술관 — 원형 계산 상수 (18단계 18-2, 16-4의 1 원형 프로필 표). 문구가 아니라 계산 상수다(data 파일에 두지 않는다).
// 16단계에서는 map.js 안에 있었다. map이 꺼진 판에도 책의 새 장 「겹치는 곳, 갈리는 곳」이 같은 값을 쓰도록 이 파일로 옮겼다(숫자는 그대로).
// 읽는 곳: map.js(지도 점수·배치), book.js(새 장 고르기). 첫 화면에서는 부르지 않는다 — app.js가 책·지도를 열 때만 받는다(18-12의 14).
// 고칠 때는 tests.md 「16단계 · 점수 분포」에 적고 map-score.test.js·cross.test.js를 다시 돌린다.
(function (root) {
  "use strict";
  const ARCH = ["warrior", "sage", "lover", "rebel", "caregiver", "explorer", "creator", "ruler"];
  const AXES = ["act", "talk", "heart", "order", "free"];
  // 축마다 0~4: act 발걸음 · talk 대화 · heart 마음 · order 약속 · free 새로움 (축 이름 문구는 data.js book.cross.axis · data-map.js map.axis)
  const PROFILE = {
    warrior: [4, 1, 1, 2, 2],
    sage: [1, 4, 1, 3, 1],
    lover: [1, 2, 4, 1, 2],
    rebel: [3, 2, 1, 0, 4],
    caregiver: [1, 1, 4, 3, 0],
    explorer: [2, 3, 1, 0, 4],
    creator: [2, 3, 2, 2, 2],
    ruler: [3, 1, 1, 4, 0],
  };
  const ArchCore = { ARCH, AXES, PROFILE };
  if (typeof module === "object" && module.exports) module.exports = ArchCore;
  else root.ArchCore = ArchCore;
})(typeof window !== "undefined" ? window : this);
