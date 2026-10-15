# 14단계 F4-B1 진행표 (developer: 만신의 방 화면·순서·광고 제거·지연 불러오기·시험)

범위: specs/strange-oracle.md 14-1(화면·순서·SOG2/SOG1), 14-2(광고 제거), 14-6(지연 불러오기), 14-7 중 B1 항목. 결제(pay.mode)·api/book·netlify·build-dist 유료 검사는 F4-B2.

| # | 일 | 상태 |
|---|---|---|
| 1 | 진행표 만들기, 문서 읽기 | 완료 |
| 2 | app.js 구조 파악 | 완료 |
| 3 | 순서 재배치: CHAPTER_ORDER, 다음 방 규칙, 나의 이야기 7장, 원형 | 완료(코드) |
| 4 | SOG2 만들기/해독, SOG1 해독(옛 순서) | 완료(코드) |
| 5 | 만신의 방 화면 연결, 숨은 장 제목 하나로 | 완료(코드) |
| 6 | 광고 제거 | 완료(코드) |
| 7 | 지연 불러오기 | 완료(코드) |
| 8 | 시험: saju-b1.test.js·e2e-saju.js 새로, e2e-flow 일부 갱신(78 통과, 나머지 남음), e2e-book 미갱신, e2e-ads 은퇴 | 진행 중 |
| 9 | 전체 통과, tests.md 기록, 보고 | 대기 |

## 메모
- 패치 스크립트(스크래치): patch-html-data.js(index.html·data.js·book-saju title), patch-app.js + saju-room.js(app.js). 원래 app.js는 git에 있음.
- data-saju.js에 없는 키(F5): saju.ritual.*(bell·bellLabel·hourUnknown·go·call), saju.elements 이름(목·화…), result.s1~s4Title·s2bEmptyTitle·s2bFewTitle, input.genderM/F/X·yearAria 등, toast.loadFail
- 책: Ⅰ 만신 장은 BOOK_ROOMS에서 뺌(F4-B2). 만신 결과의 책 한 줄 숨김.
- 남은 일: e2e-flow 10-1(SOG1→SOG2 기대값)·H5 3/6·카카오 자리 수·seed 목록, e2e-book 5건, motion 모드 미실행, 360×640 고지 24px 가려짐(designer)
