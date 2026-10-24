# CREDITS — strange-oracle

## 글꼴 (jsdelivr의 Fontsource 배포본, 버전 고정 + SRI sha384)
Google Fonts는 쓰지 않는다 (2026-09-25 교체). 라이선스는 각 패키지 안 LICENSE 파일로 다시 확인함.
| 글꼴 | 용도 | 불러오는 주소 | 라이선스 |
|---|---|---|---|
| Gowun Batang 400·700 | 한국어 본문·제목·버튼 | https://cdn.jsdelivr.net/npm/@fontsource/gowun-batang@5.3.0/400.css, 700.css | SIL Open Font License 1.1 (Copyright 2021 The Gowun Batang Project Authors) |
| Cinzel 500·700 | 영문 장식 문구 (eyebrow, 로마 숫자, 연도) | https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.3.0/500.css, 700.css | SIL Open Font License 1.1 (Copyright 2020 The Cinzel Project Authors) |
| Noto Sans Runic 400 | 룬 기호 표시 전용 (한국어 글꼴 개수에 세지 않음, 운영자 결정) | https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-runic@5.3.0/400.css | SIL Open Font License 1.1 (Copyright 2022 The Noto Project Authors) |
- Fontsource: https://fontsource.org , npm `@fontsource/*`. 각 CSS는 같은 패키지의 files/*.woff2를 불러온다.

## 이미지
- 별하늘 배경, 룬 주머니, 룬 돌, 별 바퀴: CSS·SVG·Canvas로 코드에서 직접 그림. 외부 이미지 없음.
- og-image.png(1200x630): 2026-10-16 다시 만듦(14단계, 일곱 방). tools/strange-oracle/make-og.js가 index.html의 일곱 문 상징·장식선 SVG(디자인 담당 직접 제작)와 제품 글꼴(Gowun Batang·Cinzel)로 그려 헤드리스 브라우저로 찍는다. 외부 이미지 없음.
- 룬 글자와 ☾ 기호: 유니코드 문자. 룬 획(SVG)·별 바퀴·원형 문장: 디자인 담당이 코드로 직접 그림.
- 공유 카드(1080x1920)의 돌·아치·초승달: common/share-card.js와 app.js가 canvas로 직접 그림.
- (9단계) 방의 안내자 실루엣 SVG 6개(오검 필경사의 손·별 점성가의 손가락·데칸 해시계 관리인의 손·촐킨 석판·룬 예언자의 망토와 손·시빌라 옆모습과 손): 디자인 담당이 index.html 안에 코드로 직접 그림. 외부 이미지·참고 그림 없음.
- (결정 53) 책 리더의 낡은 종이(바랜 색·얼룩·어두운 가장자리·제본 홈 그림자)와 가죽 표지(결·금박 테두리·모서리 쇠): style.css의 CSS 그라데이션·그림자만으로 직접 만듦. 이미지 파일 없음. 장식선(i-fleuron SVG)은 디자인 담당이 index.html 안에 코드로 직접 그림.
- (16단계) 친구 지도 아이콘 24개(map-i01~i24: 초승달·해·별·불꽃·잎·물결·산·열쇠·깃털·물고기·고양이·구름·번개·꽃·나무·소용돌이·닻·나침반·종·등불·모래시계·수정·나비·물방울)와 오각형 지도 선: 디자인 담당이 index.html 안에 SVG 선 그림으로 직접 그림(2026-10-17). 외부 이미지·아이콘 세트·참고 그림 없음.
- (17단계) 일곱 문 Ⅱ~Ⅶ의 방별 무늬(자작나무 띠·오검 획, 별 점선 테, 별시계 눈금·바늘, 계단식 돌 아치·점막대 숫자, 비대칭 돌머리·물결, 동굴 입·파문)와 인연의 장·첫 줄·마음 한 줄 장식: 디자인 담당이 style.css·SVG로 직접 그림(2026-10-17). 외부 이미지 없음.

## 계산 방법
- 달·태양 위치, 장동, ΔT: 외부 라이브러리 Astronomy Engine 2.1.19 (아래) 사용.
- 라히리 아야남샤(서양·베다 황도 차이): 직접 계산.
  - 정의점: 1956-03-21 0시 TT에 평균 아야남샤 23.245524743° — Swiss Ephemeris(Astrodienst) `sweph.h` 아야남샤 표의 Lahiri 정의값을 숫자로만 참고 (인도 역법개혁위원회 1956 기준). Swiss Ephemeris 코드는 제품에 넣지 않았다.
  - 세차: IAU 2006 일반 세차 공식 (Capitaine, Wallace & Chapront 2003; IERS Conventions 2010 식 5.40).
- 검증 참고(제품에 포함 안 됨): Jean Meeus, *Astronomical Algorithms* 2판 예제 22.a·25.b·47.a (PyMeeus로 재현값 확인), Swiss Ephemeris 2.10.03(npm `sweph`, 테스트 때만 임시 폴더에 설치).

## 문구
- 룬 24자, 나크샤트라 27개, 행성·라시 설명, 화면 문구: 직접 작성 (data.js, data-runes.js, data-stars.js). 신화·상징 정보는 널리 알려진 전승을 쉬운 말로 풀어 씀.

## 외부 라이브러리
| 이름 | 버전 | 용도 | 라이선스 | 불러오는 주소 |
|---|---|---|---|---|
| Astronomy Engine (Don Cross) | 2.1.19 | 달·태양 황경, 장동, ΔT | MIT | https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js (SRI sha384 고정) |
- 출처: https://github.com/cosinekitty/astronomy , npm `astronomy-engine`.

| lunar-javascript (6tail) | 1.7.7 | 만신의 방(saju.js) 만세력: 간지·절기 시각·일진 | MIT (npm 레지스트리 package.json `license`) | https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/lunar.js (SRI sha384-CkiJVUh8zHLFNZYeiszeRw7KEWYDIf1yIZ+jVnZt+omUzQLv2ilCE94w1VItn8uH, 방 문을 누를 때 지연 로드) |
- 출처: https://github.com/6tail/lunar-javascript , npm `lunar-javascript`. 파일 크기 435,942바이트(gzip 112,997).
- saju.js의 시간대 표(서머타임·UTC+8:30)는 IANA tz database 2026c(Asia/Seoul)의 전환점을 숫자로 옮겨 적은 것(퍼블릭 도메인 데이터).

| @netlify/blobs (Netlify) | 11.1.4 | 결제 기록 저장(서버 함수 pay·book 전용, 배포 화면에는 없음) | MIT (node_modules/@netlify/blobs/package.json `license`) | npm, 루트 package.json·package-lock.json에 고정 (CDN으로 불러오지 않음) |
- 출처: https://github.com/netlify/blobs , npm `@netlify/blobs`. 함께 묶이는 전이 의존성은 package-lock.json의 고정 버전을 따른다.

## 2단계 계산 방법 (calc.js)
- 촐킨(마야 260일력): 외부 라이브러리 없이 날짜 산술로 직접 계산.
  - 상관 계수: **GMT(Goodman–Martinez–Thompson) 584283** — 장주기 0.0.0.0.0 = 율리우스 적일 584283. 출처: Wikipedia "Mesoamerican Long Count calendar" (https://en.wikipedia.org/wiki/Mesoamerican_Long_Count_calendar — "The generally accepted correlation constant is the Modified Thompson 2, 'Goodman–Martinez–Thompson', or GMT correlation of 584,283 days", 2026-09-27 조회), Wikipedia "Maya calendar" (https://en.wikipedia.org/wiki/Maya_calendar). 운영자 결정 25번으로 확정.
  - 그레고리력 → 율리우스 적일: Fliegel & Van Flandern (1968), *Communications of the ACM* 11(10)의 정수 공식.
  - 문양 이름 순서(Imix … Ajaw): Wikipedia "Tzolkʼin" (https://en.wikipedia.org/wiki/Tzolk%CA%BCin).
- 데칸: 태양 열대 황경은 위 Astronomy Engine(astro.js `sunLongitude`) 재사용. 검증 참고(제품에 포함 안 됨): 미 해군천문대(USNO) Astronomical Applications API 절기 시각 (https://aa.usno.navy.mil/api/seasons).
- 오검: 오검 20자(feda) 순서와 유니코드(U+1681~U+1694)는 Unicode 표준 Ogham 블록. 한글 → 로마자 → 오검 대응과 선택 규칙("오검 둘레 걷기")은 직접 만든 규칙(tests.md 「2단계 계산」).
- 시빌라: 브라우저 내장 `crypto.getRandomValues`.

## 2단계 콘텐츠 자료 (data-ogham.js · data-decans.js · data-tzolkin.js · data-oracles.js)
- 문구는 모두 문구 담당이 직접 썼다(외부 문장 가져오지 않음). 시빌라 신탁 문장(line)은 이 서비스가 새로 지은 문장이며 고대 문헌 인용이 아니다.
- 오검 20자 이름(Beith … Idad)·네 무리(aicme) 이름: 중세 아일랜드 문헌에 전하는 이름. 뜻(facts.meaning)·후대 나무(facts.tree) 은 Wikipedia "Ogham"(https://en.wikipedia.org/wiki/Ogham) 표를 참고해 적었다.
- 촐킨 스무 문양 이름: 유카텍(Imix … Ajaw, 표기는 디자인 담당 마크업과 같게)·키체(Imox … Ajpu). Wikipedia "Tzolkʼin" 기준으로 적었으나 키체 표기와 뜻 초안은 **원문 대조 미확인**.
- 데칸 이집트 이름(facts.egyptian): Wikipedia "Decan"(https://en.wikipedia.org/wiki/Decan) "Names of the Decans" 표의 Greco-Egyptian names 열. 출처는 Budge(1904) pp.304–308 · Gundel(1936). 2026-09-28 Wikipedia 원문(wikitext)과 36칸을 한 칸씩 기계 대조해 모두 일치 확인.
- 데칸 다스리는 별(facts.ruler): 헬레니즘 점성술의 칼데아 순서(화성·태양·금성·수성·달·토성·목성 반복)로 채움.
- 공유 카드의 껍질·해시계·마야 숫자·카르투슈·월계관·양피지: common/share-card.js가 canvas로 직접 그림(외부 이미지 없음).

## 카카오 로그인 버튼 (21단계, 2026-10-22)
- 카카오 말풍선 기호는 카카오 로그인 디자인 가이드(개발 담당s.kakao.com)의 색·모양 규칙(#FEE500 바탕, 검은 말풍선)을 따라 인라인 SVG로 그렸다. 카카오 상표이며 카카오 로그인 버튼 용도로만 쓴다(가이드 준수 여부는 운영자가 카카오 앱 검수 때 함께 확인 — 미확인).
