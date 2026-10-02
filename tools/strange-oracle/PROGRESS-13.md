# 13단계 E3 (developer) 진행표

재개 시 체크 안 된 항목부터 이어간다.

- [x] 0. 스펙 13-1~13-9·검수 메모·디자인 인계 읽기
- [x] 1. tools/strange-oracle/move-book.js → data-book-*.js (무손실 시험 포함)
- [x] 2. 브라우저 조립(book.js) = core.js buildReport (동일성 시험)
- [x] 3. app.js: 결제 JS 제거, 책 UI(목차·표지·쪽·궁합·흐름 날짜·장 끝)
- [x] 4. data.js 새 키 [초안], analytics 화이트리스트
- [x] 5. build-dist (정적 기본, 유출 검사 재정의, refund 제거), docs/common.md
- [x] 6. 단위 시험 + e2e-book(e2e-paid 대체), e2e-flow/e2e-ads 갱신
- [x] 7. 전체 시험 0 FAIL, 다양성 측정, tests.md 기록
- e2e-book.js 60 PASS / 0 FAIL (2026-10-03), e2e-paid.js 삭제
