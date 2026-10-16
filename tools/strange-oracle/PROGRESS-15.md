# 15단계 G2 (developer, 서버 쪽) 진행표
기준: specs/strange-oracle.md 15-1·15-3·15-6·15-7·15-8, 기획 검수 3차 권장 1(결제완료 ②에서 cancel/이 있으면 mul/·pass/를 cancelled로 고쳐 씀).
고치지 않는 것: index.html, style.css, app.js, data*.js, design 문서(G1·G3 몫).

| # | 할 일 | 상태 |
|---|---|---|
| 1 | 진행표 | 완료 |
| 2 | package.json·package-lock.json (@netlify/blobs 11.1.4 고정, node>=22.12), 조건부 쓰기 onlyIfNew·onlyIfMatch 있음(setJSON → {modified}, if-none-match:*) | 완료 |
| 3 | netlify/functions/pay.js (feedback·status·return), v1 형식 + connectLambda | 완료 |
| 4 | netlify/functions/book.js 수정 (Blobs pass/ paid + cancel/ 마지막 방어선, async) | 완료 |
| 5 | netlify.toml /api/pay/* | 완료 |
| 6 | mock-server.js (가짜 SDK·결제창·통보·메모리 저장소·스위치·pay-store) — mock-pay.js·mem-store.js로 나눔 | 완료 |
| 7 | pay.test.js 새로, book.test.js 갱신(옛 pay.test.js의 함수 book 시험을 옮김) | 완료 (pay 25 · book 17) |
| 8 | 단위 시험 + e2e 4종 실행, G3 넘길 목록 | 완료 |

## 결과 (2026-10-16)
- 단위 89/89 (pay.test 25, book.test 17 포함). e2e-saju 41, e2e-book 54, e2e-flow reduced 127·motion 128, e2e-pay 29, 모두 실패 0 (app.js는 아직 14단계판).
- 모의 서버 HTTP 연기 시험 28항목 통과(가짜 SDK 이동·팝업·실패, 결제창 단추 12개, 스위치, pay-store 휴대폰·R 0건). 헤드리스 Edge로 가짜 SDK(이동) → 결제창 → [결제 완료] → 303 → 제품 페이지 확인.
- Blobs 조건부 쓰기: @netlify/blobs 11.1.4 setJSON(key, v, { onlyIfNew | onlyIfMatch }) → { modified, etag }. 결제완료의 mul/·pass/ 첫 쓰기와 cancel/ 쓰기에 onlyIfNew를 추가 방어로 씀.

## G3에 넘길 것
- 함수 응답 모양·상태 코드: reports가 아니라 G2 보고서(운영자 보고)에 표로 적음. 요약: status 200 {state:"paid",pass}|{state:"cancelled"}|{state:"pending"}, 400 {error:"bad"}, 429 {error:"busy"}+Retry-After, 503 {error:"off"|"store"}, 405. book 403 {error:"cancelled"}, 503 {error:"store"|"off"}.
- data.js 모양 약속: pay.payapp에 `sdk: "https://lite.payapp.kr/public/api/v2/payapp-lite.js"`, `userid: ""` (모의 서버가 이 모양을 찾아 응답에서만 바꾼다).
- 가짜 결제창 견본: tools/strange-oracle/payapp-mock.html이 생기면 자동으로 씀(data-field·data-act 계약은 mock-pay.js 머리 주석).
- e2e-pay는 G3이 새 화면에 맞춰 다시 쓴다(지금은 옛 화면 기준으로 통과).
