# 16단계 H3 (화면 쪽) 진행표 — developer

- [x] 0. 문서 읽기 (spec 16, design 16, HANDOFF-16-H3)
- [x] 1. data.js `map` + data-map.js 키 구조([초안])
- [x] 2. map.js (점수·배치·흐름·요청·별명 막기·14세)
- [x] 3. app.js (template 붙이기·#join 가로채기·지연 불러오기·clearAll·저장)
- [x] 4. build-dist ⑩~⑬ + map:on 표지 (pay-sections 넓힘)
- [x] 5. map-score.test.js
- [x] 6. e2e-map.js
- [x] 7. 기존 시험 전부 (단위·saju·book·pay·flow reduced/motion)
- [x] 8. tests.md 「16단계 화면 쪽」, HANDOFF 1·4장

## 메모
- map-score.test 11개 통과. 측정: raw 묶음 최대 1.88%, 구간 16.2~17.3%, 폭 최소 44, 4번 0/224, 최고축 12.4~28.2%, 같은 코드 97~99, 배치 겹침 0/600 (프로필 표·비율 고치지 않음)
- map.js = 순수 계산(Node module.exports) + mount(ctx) 화면. data-map.js = window.TEXT_MAP → app.js가 T.map에 합침(data.js 값 우선)
- data.js map: mode·api·maxFriends·down·hubLink·clear.* / hub.faq.map[2]
- 완료(2026-10-17): 단위 140, e2e-map 78, saju 41, book 54·pay 67(지도 down=1), flow 127/128. build-dist ⑩⑬ 가드 실패 확인 후 data.js 되돌림
