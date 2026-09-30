# 결정 53 책 리더 구현 진행 (developer)

- [x] 1 쪽 나누기
- [x] 2 이동(버튼·가장자리·스와이프·키·목차·표지·이어 읽기)
- [x] 3 넘김 연출
- [x] 4 (영수증: 1쪽 면지·뒷면지로 옮김) 공유·영수증 유지
- [x] 5 (read-progress 마크업·updateBook·jumpToHash·book-room-next 코드·견본 3쪽 삭제) 은퇴 코드·견본 삭제
- [ ] 6 테스트

계획: source 채우기는 그대로 → paginate()가 source를 블록(open/p/unit)으로 훑어 book-pages에 실제 쪽을 만들며 body.scrollHeight로 잰다.
특수 노드(receipt·book-toc·disclaimer·actions·receipt-end·page-end)는 복제 없이 옮기고, 다시 나누기 전 source로 되돌린다.
- app.js 코드 작성 완료. e2e-paid 갱신(쪽 수·이전/다음·키·스와이프·목차·이어 읽기·640 다시 나누기·쪽 안 스크롤 없음·단락 누락 0).
- 중간 실행: node --test "tools/strange-oracle/*.test.js" 17/17 (디렉터리 인자는 Node 24에서 MODULE_NOT_FOUND), e2e-paid reduced 106/0, motion 106/0. 114쪽(360×800), 쪽 나누기 398ms.
- [부분] 6 테스트: tests.md 기록함. 도구 실행 권한 확인(classifier)이 계속 오류라 중단.
- 남은 것: 마지막 build-dist → mock 재시작 → 네 가지 재실행, e2e-flow reduced, tests.md 기록

## UI 점검 요청 R53-1~3 반영 (developer, 2026-09-30)
- R53-1: splitUnit에서 `.timeline__age`를 다음 자식(dl)의 첫 항목(dt+dd)과 한 unit으로 묶음(KEEP_WITH_NEXT). 나머지 항목은 같은 껍데기의 dl로.
- R53-2: 장 끝 쪽이 이어진 단락 한 줄뿐이면 fixWidow가 앞 쪽 단락 끝 한 줄 분량 어절을 함께 넘김. 앞 조각이 1~2줄이면 단락째 다음 쪽으로.
- R53-3: 원인은 CSS — `.book-page__body > p { text-indent:1em }`이 p.match-pair에 걸려 flex 알약(span)에 상속. style.css에 `.book-page__body > p.match-pair { text-indent:0 }`.
- e2e-paid에 R53-1·R53-2 검사 2건 추가. 결과: build-dist [초안] 없음·public/ 유료 0건, node --test 17/0, e2e-paid reduced 108/0, motion 108/0, e2e-flow reduced 65/0. 360×800 113쪽(쪽 나누기 약 300ms).
