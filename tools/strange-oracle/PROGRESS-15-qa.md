# 15단계 G6 QA 진행표 (qa-reviewer, 2026-10-16)

| # | 항목 | 상태 | 메모 |
|---|---|---|---|
| 1 | 문서 읽기 | 완료 | |
| 2 | pay.js 검토 | 완료 | 통과. 권장: debug 로그가 인증 전에 찍힘 |
| 3 | book.js·toml·package·lock | 완료 | 통과 |
| 4 | 6장 | 완료 | 통과 (e2e I1~I7, 모의 서버 로그 휴대폰 번호 0) |
| 5 | 7장 | 완료 | 고지·B안 통과. live 가드는 사본으로 A~F 시험해 통과. **legal 결제 문단이 test에서 안 보이고 refund 404 → 수정 필요** |
| 6 | 11장 | 완료 | build 통과. **CREDITS에 @netlify/blobs 없음 → 수정 필요** |
| 7 | 단위 | 완료 | 89/0 |
| 8 | e2e | 완료 | saju 41, book 54, flow 127·128, pay 62, 모두 실패 0 |
| 9 | I8 글꼴 CORS | 완료 | 재현 안 됨. jsdelivr ACAO 있음. 요청 중단·일시 오류 추정, 배포를 막지 않음 |
| 10 | off 배포판 | 완료 | J1~J5 통과 |
| 11 | 보고서 | 완료 | reports/qa-strange-oracle.md 「15단계 QA (G6 1차)」, 판정 수정 필요 |
