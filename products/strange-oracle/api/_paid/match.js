// ═══════════════════════════════════════════════════════════════════════
// 유료 리포트 문구 — 3장 원형 궁합 (순서 없는 쌍 36). 서버 전용(Vercel 함수가 require). 로직 없음.
// 이 파일은 공개 정적 파일로 내려가면 안 된다 (tools/build-dist.js가 dist/api/로만 복사, spec 6-4·D-4).
// 브라우저 코드(index.html·app.js·data*.js)에 이 문장을 옮겨 적지 않는다.
//
//   code      원형-원형 (warrior sage lover rebel caregiver explorer creator ruler 순서로 앞선 것이 앞)
//   summary   요약 (150자). 상대를 넣지 않은 사람에게는 나를 포함한 8쌍의 summary만 모아 "궁합 지도"로 보여 준다
//   body      두 사람을 "두 원형"으로 부르는 중립 시점 본문, 문단 배열 (합계 800자). 등급·"최악"·"피해야 할" 없음
//   sides     원형 코드별 "○○ 쪽에서" 문단 (각 200자). 서버가 사용자 쪽을 앞에 놓는다. 같은 원형끼리는 하나
//   마지막 문단(sides 뒤)은 없고, 각 sides 문단이 "이렇게 하면 잘 맞는다"로 끝나게 쓴다
//
// 공통 규칙 (spec 6-2, CLAUDE.md 8장 — 유료일수록 더 엄격히)
//   평문만 쓴다(HTML 태그 없음. 브라우저가 textContent로 넣는다). 문단 = 배열의 문자열 하나.
//   "반드시", "~하게 됩니다" 같은 단정 금지 → "~하기 쉬워요", "~할 수 있어요". 건강·죽음·사고·투자·도박, 이별·실패를 겁주는 예언,
//   결혼·출산 시기 짚기 금지. 마지막 문단은 실행 가능한 긍정적 조언으로 닫는다.
//   "N자" = 공백 포함 최대 글자 수(칸 합계). 모든 [초안]은 copywriter가 실제 문구로 바꾼다 ([초안] 0개 전에는 QA로 넘기지 않음).
//   code·archetype·pair·band·room·grade 칸은 서버가 고르는 열쇠라 바꾸지 말 것.
// 한 항목 = "  {" 로 시작해 "  }," 로 끝나는 한 덩어리 (분할·재조립 도구가 이 모양에 기댄다. 들여쓰기를 바꾸지 말 것)
// ═══════════════════════════════════════════════════════════════════════
const window = module.exports; // data-*.js와 같은 "window.이름 = [" 모양을 지키려는 별칭 (Node에서는 module.exports)

window.PAID_MATCH = [
  {
    code: "warrior-warrior",
    summary: "[초안] 전사 × 전사 요약 (150자)",
    body: [
      "[초안] 전사 × 전사 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사끼리 · 각자의 쪽에서 (200자)",
    },
  },
  {
    code: "warrior-sage",
    summary: "[초안] 전사 × 현자 요약 (150자)",
    body: [
      "[초안] 전사 × 현자 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사 쪽에서 (200자)",
      sage: "[초안] 현자 쪽에서 (200자)",
    },
  },
  {
    code: "warrior-lover",
    summary: "[초안] 전사 × 연인 요약 (150자)",
    body: [
      "[초안] 전사 × 연인 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사 쪽에서 (200자)",
      lover: "[초안] 연인 쪽에서 (200자)",
    },
  },
  {
    code: "warrior-rebel",
    summary: "[초안] 전사 × 반항아 요약 (150자)",
    body: [
      "[초안] 전사 × 반항아 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사 쪽에서 (200자)",
      rebel: "[초안] 반항아 쪽에서 (200자)",
    },
  },
  {
    code: "warrior-caregiver",
    summary: "[초안] 전사 × 돌봄이 요약 (150자)",
    body: [
      "[초안] 전사 × 돌봄이 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사 쪽에서 (200자)",
      caregiver: "[초안] 돌봄이 쪽에서 (200자)",
    },
  },
  {
    code: "warrior-explorer",
    summary: "[초안] 전사 × 탐험가 요약 (150자)",
    body: [
      "[초안] 전사 × 탐험가 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사 쪽에서 (200자)",
      explorer: "[초안] 탐험가 쪽에서 (200자)",
    },
  },
  {
    code: "warrior-creator",
    summary: "[초안] 전사 × 창조자 요약 (150자)",
    body: [
      "[초안] 전사 × 창조자 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사 쪽에서 (200자)",
      creator: "[초안] 창조자 쪽에서 (200자)",
    },
  },
  {
    code: "warrior-ruler",
    summary: "[초안] 전사 × 통치자 요약 (150자)",
    body: [
      "[초안] 전사 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      warrior: "[초안] 전사 쪽에서 (200자)",
      ruler: "[초안] 통치자 쪽에서 (200자)",
    },
  },
  {
    code: "sage-sage",
    summary: "[초안] 현자 × 현자 요약 (150자)",
    body: [
      "[초안] 현자 × 현자 본문 (합계 800자)",
    ],
    sides: {
      sage: "[초안] 현자끼리 · 각자의 쪽에서 (200자)",
    },
  },
  {
    code: "sage-lover",
    summary: "[초안] 현자 × 연인 요약 (150자)",
    body: [
      "[초안] 현자 × 연인 본문 (합계 800자)",
    ],
    sides: {
      sage: "[초안] 현자 쪽에서 (200자)",
      lover: "[초안] 연인 쪽에서 (200자)",
    },
  },
  {
    code: "sage-rebel",
    summary: "[초안] 현자 × 반항아 요약 (150자)",
    body: [
      "[초안] 현자 × 반항아 본문 (합계 800자)",
    ],
    sides: {
      sage: "[초안] 현자 쪽에서 (200자)",
      rebel: "[초안] 반항아 쪽에서 (200자)",
    },
  },
  {
    code: "sage-caregiver",
    summary: "[초안] 현자 × 돌봄이 요약 (150자)",
    body: [
      "[초안] 현자 × 돌봄이 본문 (합계 800자)",
    ],
    sides: {
      sage: "[초안] 현자 쪽에서 (200자)",
      caregiver: "[초안] 돌봄이 쪽에서 (200자)",
    },
  },
  {
    code: "sage-explorer",
    summary: "[초안] 현자 × 탐험가 요약 (150자)",
    body: [
      "[초안] 현자 × 탐험가 본문 (합계 800자)",
    ],
    sides: {
      sage: "[초안] 현자 쪽에서 (200자)",
      explorer: "[초안] 탐험가 쪽에서 (200자)",
    },
  },
  {
    code: "sage-creator",
    summary: "[초안] 현자 × 창조자 요약 (150자)",
    body: [
      "[초안] 현자 × 창조자 본문 (합계 800자)",
    ],
    sides: {
      sage: "[초안] 현자 쪽에서 (200자)",
      creator: "[초안] 창조자 쪽에서 (200자)",
    },
  },
  {
    code: "sage-ruler",
    summary: "[초안] 현자 × 통치자 요약 (150자)",
    body: [
      "[초안] 현자 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      sage: "[초안] 현자 쪽에서 (200자)",
      ruler: "[초안] 통치자 쪽에서 (200자)",
    },
  },
  {
    code: "lover-lover",
    summary: "[초안] 연인 × 연인 요약 (150자)",
    body: [
      "[초안] 연인 × 연인 본문 (합계 800자)",
    ],
    sides: {
      lover: "[초안] 연인끼리 · 각자의 쪽에서 (200자)",
    },
  },
  {
    code: "lover-rebel",
    summary: "[초안] 연인 × 반항아 요약 (150자)",
    body: [
      "[초안] 연인 × 반항아 본문 (합계 800자)",
    ],
    sides: {
      lover: "[초안] 연인 쪽에서 (200자)",
      rebel: "[초안] 반항아 쪽에서 (200자)",
    },
  },
  {
    code: "lover-caregiver",
    summary: "[초안] 연인 × 돌봄이 요약 (150자)",
    body: [
      "[초안] 연인 × 돌봄이 본문 (합계 800자)",
    ],
    sides: {
      lover: "[초안] 연인 쪽에서 (200자)",
      caregiver: "[초안] 돌봄이 쪽에서 (200자)",
    },
  },
  {
    code: "lover-explorer",
    summary: "[초안] 연인 × 탐험가 요약 (150자)",
    body: [
      "[초안] 연인 × 탐험가 본문 (합계 800자)",
    ],
    sides: {
      lover: "[초안] 연인 쪽에서 (200자)",
      explorer: "[초안] 탐험가 쪽에서 (200자)",
    },
  },
  {
    code: "lover-creator",
    summary: "[초안] 연인 × 창조자 요약 (150자)",
    body: [
      "[초안] 연인 × 창조자 본문 (합계 800자)",
    ],
    sides: {
      lover: "[초안] 연인 쪽에서 (200자)",
      creator: "[초안] 창조자 쪽에서 (200자)",
    },
  },
  {
    code: "lover-ruler",
    summary: "[초안] 연인 × 통치자 요약 (150자)",
    body: [
      "[초안] 연인 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      lover: "[초안] 연인 쪽에서 (200자)",
      ruler: "[초안] 통치자 쪽에서 (200자)",
    },
  },
  {
    code: "rebel-rebel",
    summary: "[초안] 반항아 × 반항아 요약 (150자)",
    body: [
      "[초안] 반항아 × 반항아 본문 (합계 800자)",
    ],
    sides: {
      rebel: "[초안] 반항아끼리 · 각자의 쪽에서 (200자)",
    },
  },
  {
    code: "rebel-caregiver",
    summary: "[초안] 반항아 × 돌봄이 요약 (150자)",
    body: [
      "[초안] 반항아 × 돌봄이 본문 (합계 800자)",
    ],
    sides: {
      rebel: "[초안] 반항아 쪽에서 (200자)",
      caregiver: "[초안] 돌봄이 쪽에서 (200자)",
    },
  },
  {
    code: "rebel-explorer",
    summary: "[초안] 반항아 × 탐험가 요약 (150자)",
    body: [
      "[초안] 반항아 × 탐험가 본문 (합계 800자)",
    ],
    sides: {
      rebel: "[초안] 반항아 쪽에서 (200자)",
      explorer: "[초안] 탐험가 쪽에서 (200자)",
    },
  },
  {
    code: "rebel-creator",
    summary: "[초안] 반항아 × 창조자 요약 (150자)",
    body: [
      "[초안] 반항아 × 창조자 본문 (합계 800자)",
    ],
    sides: {
      rebel: "[초안] 반항아 쪽에서 (200자)",
      creator: "[초안] 창조자 쪽에서 (200자)",
    },
  },
  {
    code: "rebel-ruler",
    summary: "[초안] 반항아 × 통치자 요약 (150자)",
    body: [
      "[초안] 반항아 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      rebel: "[초안] 반항아 쪽에서 (200자)",
      ruler: "[초안] 통치자 쪽에서 (200자)",
    },
  },
  {
    code: "caregiver-caregiver",
    summary: "[초안] 돌봄이 × 돌봄이 요약 (150자)",
    body: [
      "[초안] 돌봄이 × 돌봄이 본문 (합계 800자)",
    ],
    sides: {
      caregiver: "[초안] 돌봄이끼리 · 각자의 쪽에서 (200자)",
    },
  },
  {
    code: "caregiver-explorer",
    summary: "[초안] 돌봄이 × 탐험가 요약 (150자)",
    body: [
      "[초안] 돌봄이 × 탐험가 본문 (합계 800자)",
    ],
    sides: {
      caregiver: "[초안] 돌봄이 쪽에서 (200자)",
      explorer: "[초안] 탐험가 쪽에서 (200자)",
    },
  },
  {
    code: "caregiver-creator",
    summary: "[초안] 돌봄이 × 창조자 요약 (150자)",
    body: [
      "[초안] 돌봄이 × 창조자 본문 (합계 800자)",
    ],
    sides: {
      caregiver: "[초안] 돌봄이 쪽에서 (200자)",
      creator: "[초안] 창조자 쪽에서 (200자)",
    },
  },
  {
    code: "caregiver-ruler",
    summary: "[초안] 돌봄이 × 통치자 요약 (150자)",
    body: [
      "[초안] 돌봄이 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      caregiver: "[초안] 돌봄이 쪽에서 (200자)",
      ruler: "[초안] 통치자 쪽에서 (200자)",
    },
  },
  {
    code: "explorer-explorer",
    summary: "[초안] 탐험가 × 탐험가 요약 (150자)",
    body: [
      "[초안] 탐험가 × 탐험가 본문 (합계 800자)",
    ],
    sides: {
      explorer: "[초안] 탐험가끼리 · 각자의 쪽에서 (200자)",
    },
  },
  {
    code: "explorer-creator",
    summary: "[초안] 탐험가 × 창조자 요약 (150자)",
    body: [
      "[초안] 탐험가 × 창조자 본문 (합계 800자)",
    ],
    sides: {
      explorer: "[초안] 탐험가 쪽에서 (200자)",
      creator: "[초안] 창조자 쪽에서 (200자)",
    },
  },
  {
    code: "explorer-ruler",
    summary: "[초안] 탐험가 × 통치자 요약 (150자)",
    body: [
      "[초안] 탐험가 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      explorer: "[초안] 탐험가 쪽에서 (200자)",
      ruler: "[초안] 통치자 쪽에서 (200자)",
    },
  },
  {
    code: "creator-creator",
    summary: "[초안] 창조자 × 창조자 요약 (150자)",
    body: [
      "[초안] 창조자 × 창조자 본문 (합계 800자)",
    ],
    sides: {
      creator: "[초안] 창조자끼리 · 각자의 쪽에서 (200자)",
    },
  },
  {
    code: "creator-ruler",
    summary: "[초안] 창조자 × 통치자 요약 (150자)",
    body: [
      "[초안] 창조자 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      creator: "[초안] 창조자 쪽에서 (200자)",
      ruler: "[초안] 통치자 쪽에서 (200자)",
    },
  },
  {
    code: "ruler-ruler",
    summary: "[초안] 통치자 × 통치자 요약 (150자)",
    body: [
      "[초안] 통치자 × 통치자 본문 (합계 800자)",
    ],
    sides: {
      ruler: "[초안] 통치자끼리 · 각자의 쪽에서 (200자)",
    },
  },
];
