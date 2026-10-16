# 15단계 G3 (developer, 화면 쪽) 진행표
기준: specs 15-2·15-4·15-5·15-7·15-8, design 「15단계」 7·9절, PROGRESS-15.md(G2).
고치지 않는 것: netlify/functions/*(G2), style.css(디자인), legal 문단(G4).

| # | 할 일 | 상태 |
|---|---|---|
| 1 | 진행표 | 완료 |
| 2 | data.js pay.* 키 구조(stores·verify·price.unit·newTab·store 삭제, payapp·method·새 키 자리) | 완료 |
| 3 | index.html 임시 hidden span 2개 삭제 | 완료 |
| 4 | app.js: R·SDK 지연·결제 확인 8상태·묻기 규칙·팝업 신호·코드 카드·목차 코드 보기·clearAll·취소·429·503·off 걷어 내기 | 완료(시험 전) |
| 5 | 가짜 결제창 연결(payapp-mock.html = 견본 + G2 계약 이름) | 완료 |
| 6 | build-dist live 가드·linkkey 등 0건·SDK 공식 주소 | 완료(live 가드 수동 시험 통과) |
| 7 | netlify.toml Node 버전 | 완료(함수 런타임 미확인) |
| 8 | e2e-pay 다시 쓰기, 전체 시험 | 완료 (e2e-pay 62·나머지 모두 통과) |
| 9 | tests.md 「15단계」, HANDOFF 1·3·4·5 | 완료 |
