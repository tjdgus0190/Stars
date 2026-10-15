# 14단계 F4-B2 진행표 (developer: 유료 원본 이동·Ⅰ 만신 장·함수 book·pay.mode·모의 서버·netlify·build-dist·시험)

범위: specs/strange-oracle.md 14-4·14-5·14-7(B2 항목), 운영자 결정 91~94, 「운영자가 결정할 것」 기본값. 계획서 specs/proposal-strange-oracle-payment-postype.md.

| # | 일 | 상태 |
|---|---|---|
| 1 | 진행표 만들기, 문서 읽기 | 완료 |
| 2 | 유료 원본 이동: data-book-*.js → api/_paid/book/book-*.js, 여는/닫는 글 → data-book-free.js, bond → book-match.js, 무손실 검사 | 완료(문자열 6427·문장 14803·글자 612081 같음, bond 주석 52줄 보존) |
| 3 | 옛 파일 삭제(api/_paid/*.js, _lib/core.js, config/confirm/report.js, move-book.js, 제품 data-book-*.js, api.test.js) | 완료(git rm) |
| 4 | 책에 Ⅰ 만신 장(BOOK_ROOMS, 책 한 줄), 12장/유료 10장 | 완료(코드, index.html에 만신 목차 줄·장 틀 복제 — designer 확인) |
| 5 | pay.mode·pay.verify·pay.stores 설정, 결제 전 화면·열람 코드 흐름, off에서 결제·책 DOM 0 | 완료(코드) |
| 6 | 함수 netlify/functions/book.js(허용 목록 10, IP 10분 카운트, no-store), make-pass.js | 완료 |
| 7 | 모의 서버: --mode test, api/book 흉내, /__dev/skip?rooms=7&paid=1, legacy=1 | 완료 |
| 8 | netlify.toml, build-dist 새 검사(지문 누출 0, off 아니면 실패, api 없음), ads.txt·Ads.check 정리 | 완료(지문 4636개 0건, 누출·test 모드 음성 시험 실패 확인) |
| 9 | 시험: 단위·e2e-flow(reduced·motion)·e2e-book·e2e-saju·새 e2e-pay, 성능 측정 | 완료(단위 63·saju 41·book 54·flow 127/128·pay 29, 성능 측정 — 미달 항목 있음) |
| 10 | 문서: HANDOFF 1·4·5장, tests.md | 완료 |

## 메모
- 이동 도구는 스크래치(move-paid.js, 한 번만). 결과는 tests.md 「14단계 · 유료 원본 이동」에 옮김.
- 결정: bond는 book-match.js 안 BOOK_MATCH.bond(원문 텍스트·주석 그대로, spec 14-4 표 "옛 bond 포함").
- make-volume.js: core.js 대신 book.js buildReport + 유료 원본, 만신 50칸(일간×묶음) 추가. 3000건 불일치 0.
- http-check.js(옛 Vercel·토스 API 점검) 지움.
- 성능(perf.js): 첫 화면 ① 9초대(기준 3초 미달, 원인 미확인), 방 전환 312/1612ms(근소 미달), 쪽 넘김 reduced 6ms 통과·animation 886ms(끝점 정의 차이 가능). 의식 연출 미측정.
- e2e-flow reduced 10-1 한 번 흔들림(3회 중 1).
