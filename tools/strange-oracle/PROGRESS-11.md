# 11단계 묶음 1 C2 (developer) 진행표

재개 시 체크 안 된 항목부터 이어간다.
pay.earlyPurchase: 11-3(묶음 2)에 속함 → 이번에 넣지 않음.

- [x] 0. 스펙·디자인 인계 읽기
- [x] 1. F2 ORDER_NAME + _paid "리포트" 23곳 (close 8 "이 리포트를→이 책을", deep 1 "이번 리포트는→이번 책은", hidden-tzolkin 4 "무료 리포트→무료 결과", open 10 "이 리포트→이 책"+조사). 늘먼저 이미 0. full-decan:463 "더 깊은 이야기를 꺼내놓게"는 일반 표현이라 그대로(copywriter 판단)
- [x] 9a. F5 privacy.html 제2조 문장+목록 2줄 수정 완료 (tests.md 목록 기록은 12에서)
- [x] 2. F3 bookVolume()+volumeLabel(), deeper 3곳·book-total·report-meta, VOL 표 삭제, deeper.readTime·toc.total 키 삭제, book-topic-note
- [x] 3. F4 failKind 표(cancel/decline/error)+unconfirmed/network, pay.contact(data.js 맨 위 pay 묶음으로 이동), build-dist 경고
- [x] 4. 11-5: story-paid 통째 숨김, 6/6 bookNote, hub-faq-paid 숨김, 곧 열려요 키·disabled 삭제. (주의: off FAQ 답 합계 278자 <300 → copywriter)
- [x] 5. H3 renderSway (결과 6곳 enter + 입구)
- [x] 6. H4 bridges 5개 [초안] 질문
- [x] 7. H5 is-half, story-share secondary, story-half-next=openNextDoor, hub-story-label
- [x] 8. F1 완료, 후 측정 113/115/109(800) 172/165/169(640) — 쪽 수 줄지 않음(보고)
- [x] 9. F5 목록 tests.md
- [x] 10. e2e 갱신
- [x] 11. build 0건 누출, 단위 30/0, flow 126/0, paid 132/0
- [x] 12. tests.md 기록

## F1 전 측정 (page-count.js, src 8790, _paid "리포트" 수정 후·app.js 수정 전)
- 360x800: 표본1 warrior 111쪽 / 표본2 sage 108쪽 / 표본3 caregiver 109쪽. 50자 미만 본문 쪽 6/8/5, 시기별 흐름 항목 1개 쪽 8/6/6, 문장 중간 넘김 39/40/50
- 360x640: 156 / 152 / 155쪽. 50자 미만 4/10/8
