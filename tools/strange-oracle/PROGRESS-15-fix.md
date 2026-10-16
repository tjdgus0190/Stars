# 15단계 QA 1차 수정 (developer, 2026-10-16)

근거: reports/qa-strange-oracle.md 「15단계 QA (G6 1차, 2026-10-16)」 필수 1·2, 권장 2·4

| # | 할 일 | 상태 |
|---|---|---|
| 1 | tools/pay-sections.js: pay:on/pay:off 표지 걷어 내기(build-dist·모의 서버 공용) | 완료 |
| 2 | legal privacy·terms: 결제 문단 주석 풀고 pay:on, 제1조·목차 짝 문장 pay:off/pay:on | 완료 |
| 3 | index.html pay-tpl·pay-toc-tpl(+앞 주석)을 pay:on 표지로 감쌈 | 완료 |
| 4 | build-dist: mode별 표지 처리, live면 refund.html 복사, ⑦ live 가드 2건 추가, ⑨ 표지 짝·남은 표지 0 | 완료 |
| 5 | mock-server: test면 제품 HTML을 원본에서 읽어 test 처리, refund.html 제공 | 완료 |
| 6 | e2e-pay: K(test legal 3링크 200·결제 문단 보임) / J6~J7(off 결제 문단 0·refund 404·template 0), I8 글꼴 CDN 따로 기록 | 완료 |
| 7 | CREDITS.md @netlify/blobs | 완료 |
| 8 | HANDOFF 3-6 live 절차 | 완료 |
| 9 | 시험: build-dist, 단위, e2e-saju·book·pay·flow reduced·motion | 완료 (메인 세션: e2e-pay 변수 이름 겹침·legal 머리 주석 표지 글자 고침, 단위 89·pay 67·saju 41·book 54·flow 127/128) |
