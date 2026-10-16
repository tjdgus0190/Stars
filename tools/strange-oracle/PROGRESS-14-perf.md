# 14단계 성능 최적화 진행표 (14-6, developer, 2026-10-15~16)

운영자 요청: "버벅이지 않게 최적화". 기준: specs/strange-oracle.md 14-6. 기록: products/strange-oracle/tests.md 「14단계 · 성능」.
고치지 않는 파일: data-saju.js, legal/, api/_paid/ (data.js는 F5 커밋 뒤 수정 가능하나 문구는 그대로). index.html은 스크립트·링크 태그·성능 속성만.

| # | 할 일 | 상태 |
|---|---|---|
| 1 | 측정 방법 점검 (perf.js 첫 화면 끝점·시작점, 모의 서버 압축, 쪽 넘김 끝점) | 끝 |
| 2 | 첫 화면 원인 찾기 (자원별 시간·긴 작업, 추적) | 끝 |
| 3 | 원인 고치기 (gzip 모의 서버, defer, 입구 아래쪽 content-visibility, 움직임 줄이기 방 전환 200→100ms) | 끝 — 첫 화면은 여전히 미달(약 4.8초) |
| 4 | 쪽 넘김 고치기 (--turn-dur 520→380ms, 측정점) | 끝 — 434ms 통과 |
| 5 | e2e-flow 10-1 마친 방 복원 4/7 간헐 실패 | 끝 (원인: 시험이 150ms만 기다림, 복원은 방 파일을 받은 뒤 그림) |
| 5b | (추가 요청) mergeSajuText ritual.bell 빠짐 → 방울 아래 글자 빈칸 | 끝 |
| 6 | 다시 측정 → tests.md 전후 표 | 끝 |
| 7 | 회귀: 단위 63·e2e-saju 41·e2e-book 54·e2e-pay 29 통과, e2e-flow reduced 125/127·motion 126/128 (실패 2건은 F5 FAQ 구매 문답 — 시험 기대값 낡음, 이번 변경과 무관) | 끝 |

## 기록
- 측정 문제 1: perf.js 첫 화면이 `goto(P)`로 다 읽은 뒤 같은 문서에서 `#hub`로만 옮겨(다시 읽지 않음) "첫 읽기 + goto의 load 대기(최대 8초) + 600ms"를 쟀다 → 9초의 대부분이 이 대기. 새 브라우저 첫 탐색 + 페이지 안 rAF로 바꿈.
- 측정 문제 2: 모의 서버가 압축하지 않아 1MB(index 321KB, style 293KB, app 213KB…)를 1.6Mbps로 받았다. Netlify처럼 gzip으로 보냄(Content-Encoding gzip, 글자 파일만).
- 실제 원인 1: 스크립트 10개가 body 끝에 있어 321KB HTML을 다 받은 뒤에야 받기 시작(4.36초). head + defer로 옮김 → 0.2초에 받기 시작, 실행 순서 같음.
- 실제 원인 2: style.css가 온 뒤 첫 배치(Layout)가 CPU 4배에서 1.2~1.5초(CPU 1배에서도 0.57초). 객체 476개, 대부분 입구 아래쪽 글(지금까지·책 안내·FAQ·바닥글 숨기면 0.57→0.30초). 글꼴·text-wrap 영향은 작았음. → content-visibility:auto (designer 확인 필요).
- 쪽 넘김: 다음 쪽은 넘김 시작부터 밑에 비치고(is-under), 넘김이 끝나면 is-current. 기준 "다음 쪽이 보일 때" = is-current로 재고, 비침·애니메이션 끝도 함께 적음. 넘김 520ms로는 0.45초 기준을 넘을 수 없어 380ms로.
- 10-1 4/7: 복원(restoreFromCode)은 방 파일을 모두 받은 뒤 그리는데 시험은 누른 뒤 150ms만 기다림 → 방이 많을수록 받기가 늦어 실패. 앱: 받는 동안 body.is-loading(로딩 표시, 14-6 "로딩 한 줄") + 두 번 눌림 방지. 시험: is-loading이 끝날 때까지 기다림.
- 글꼴 CSS media="print" 시험: ① 3.34초로 줄지 않아 되돌림.
- 남은 일(제안): 첫 화면 첫 배치 약 0.95초 원인 미확인(designer와 입구 위쪽 구조·CSS 점검), e2e-flow 2건 기대값을 test 모드 FAQ 구매 문답에 맞게 갱신(F7), 실제 휴대폰 측정.
