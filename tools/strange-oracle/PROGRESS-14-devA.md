# 14단계 F4-A 진행표 (developer, 만세력 계산·검증만)

범위: specs/strange-oracle.md 14-1 시각 처리 1~8, 검증 1~6, 14-7의 3번. 화면 연결·순서·결제·광고는 F4-B.

| # | 일 | 상태 |
|---|---|---|
| 1 | 진행표 만들기 | 완료 |
| 2 | lunar-javascript 1.7.7 받기, SRI 해시, 전역 이름·시간대·子시 설정 확인 | 완료 |
| 3 | products/strange-oracle/saju.js (계산 + 지연 불러오기 함수) | 완료 |
| 4 | tools/strange-oracle/saju.test.js (대조값·경계 표본) | 완료 (10개 통과) |
| 5 | 천문연 대조값 웹 확인 (못 하면 "대조값 없음") | 완료 (일진 직접, 절입 2차 출처 4해) |
| 6 | S1~S5 코드 분포 측정 | 완료 |
| 7 | tests.md 「14단계 · 만세력 대조」 기록, CREDITS.md | 완료 |
| 8 | 전체 단위 시험 통과 | 완료 (61개 통과) |

## 메모
- 2 완료: vendor/lunar.js 435,942바이트(gzip 112,997), SRI sha384-CkiJVUh8zHLFNZYeiszeRw7KEWYDIf1yIZ+jVnZt+omUzQLv2ilCE94w1VItn8uH, MIT. 전역: UMD로 window에 Solar·Lunar·EightChar 등 22개를 직접 붙임(네임스페이스 없음).
  - 절기 시각: ShouXingUtil.qiAccurate 계열이 `- dtT + ONE_THIRD`(1/3일=8시간) → UTC+8(베이징 시각). 2024 입춘 16:27:07.
  - 子시: EightChar.setSect(1|2), 기본 2. sect2 = 23시대 일주 당일. 시주 천간은 sect와 무관하게 다음 날 일간 기준(_computeTime이 dayGanIndexExact 사용).
- 5 진행: saju-ref.json 수집 — 일진 120개(천문연 /life/solc 직접), 절입 2000·2010·2020·2030(2차 출처 month2k), 1950~1990 대조값 없음.
- 서머타임 표: Node 24.21 ICU tzdb 2026c Asia/Seoul 전환점에서 뽑음.
