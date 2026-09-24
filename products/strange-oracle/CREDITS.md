# CREDITS — strange-oracle

## 글꼴 (Google Fonts로 불러옴)
| 글꼴 | 용도 | 라이선스 |
|---|---|---|
| Gowun Batang | 본문·제목 한글 | SIL Open Font License 1.1 |
| Cinzel | 영문 장식 문구 | SIL Open Font License 1.1 |
| Noto Sans Runic | 룬 문자 | SIL Open Font License 1.1 |

## 이미지
- 별하늘 배경, 룬 주머니, 룬 돌, 별 바퀴: CSS·SVG·Canvas로 코드에서 직접 그림. 외부 이미지 없음.
- og-image.png: 제품 화면 요소로 직접 만들어 캡처.
- 룬 글자와 ☾ 기호: 유니코드 문자.

## 계산 방법
- 달·태양 위치, 장동, ΔT: 외부 라이브러리 Astronomy Engine 2.1.19 (아래) 사용.
- 라히리 아야남샤(서양·베다 황도 차이): 직접 계산.
  - 정의점: 1956-03-21 0시 TT에 평균 아야남샤 23.245524743° — Swiss Ephemeris(Astrodienst) `sweph.h` 아야남샤 표의 Lahiri 정의값을 숫자로만 참고 (인도 역법개혁위원회 1956 기준). Swiss Ephemeris 코드는 제품에 넣지 않았다.
  - 세차: IAU 2006 일반 세차 공식 (Capitaine, Wallace & Chapront 2003; IERS Conventions 2010 식 5.40).
- 검증 참고(제품에 포함 안 됨): Jean Meeus, *Astronomical Algorithms* 2판 예제 22.a·25.b·47.a (PyMeeus로 재현값 확인), Swiss Ephemeris 2.10.03(npm `sweph`, 테스트 때만 임시 폴더에 설치).

## 문구
- 룬 24자, 나크샤트라 27개, 행성·라시 설명, 화면 문구: 직접 작성. 신화·상징 정보는 널리 알려진 전승을 쉬운 말로 풀어 씀.

## 외부 라이브러리
| 이름 | 버전 | 용도 | 라이선스 | 불러오는 주소 |
|---|---|---|---|---|
| Astronomy Engine (Don Cross) | 2.1.19 | 달·태양 황경, 장동, ΔT | MIT | https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js (SRI sha384 고정) |
- 출처: https://github.com/cosinekitty/astronomy , npm `astronomy-engine`.
