# 15단계 G1 디자인 진행표 (designer)

| # | 할 일 | 상태 |
|---|---|---|
| 1 | CLAUDE.md·designer.md·HANDOFF·기획 15단계(15-2·15-4~15-7·15-9) 읽기 | 완료 |
| 2 | 기존 pay-tpl 마크업·.pay-* 스타일·app.js의 template 꺼내기 방식 파악(읽기만) | 완료 |
| 3 | index.html 결제 전 화면 정리: 3 결제 방법·판매자, 가격 단위 삭제, 3,900원 결제하기 <button>, newTab 삭제, 이미 열려 있음, 판매자 정보 줄 | 완료 |
| 4 | index.html 새 화면: #screen-paycheck(data-state 8), #screen-paypopup, 코드 카드 dialog, 목차 pay-toc-tpl, clear-warn-pay | 완료 |
| 5 | style.css 15단계 블록(파일 끝) | 완료 |
| 6 | 가짜 결제창 견본 tools/strange-oracle/payapp-checkout.sample.html (단추 12개) | 완료 |
| 7 | design/strange-oracle.md 「15단계」 절(0~11) | 완료 |
| 8 | 점검: 360px 넘침 0(전 화면·상태, headless Edge 정적), 1~6 버튼 위, 중복 id 0, 태그 짝, CSS 괄호 짝 | 완료 |
| 9 | 보고 | 완료 |

- 임시: 옛 훅 pay-price-unit·pay-store-name 빈 hidden span을 남김(app.js 4126·4127이 찾음). G3가 지운다.
- 앱 JS로 test 모드를 실제로 돌린 확인은 하지 않았다(G2가 모의 서버 작업 중이라 건드리지 않음). 미확인 → G3·G5.
