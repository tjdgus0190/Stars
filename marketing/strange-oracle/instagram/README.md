# 인스타그램 자료 (낯선 점술관, 2026-10-21)

원본은 `ig.html`·`ig.css`(CSS·SVG 직접 제작), PNG는 저장소 루트에서 다시 찍는다:
```
node --experimental-websocket marketing/strange-oracle/instagram/render-ig.js
```
(리눅스에서는 `EDGE_PATH`에 Chrome·Chromium 경로. 결과 `out/`)

## 파일과 쓰는 곳
| 파일 | 크기 | 쓰는 곳 |
|---|---|---|
| `out/profile-1080.png` | 1080×1080 | 프로필 사진. 원으로 잘려도 무늬가 남게 글자를 넣지 않았다(일곱 방 문장 + 가운데 문) |
| `out/intro-post-1080x1350.png` | 1080×1350 (4:5) | 첫 고정 게시물 = 소개 배너. 일곱 방 목록과 "프로필 링크에서 첫 번째 문 열기" |
| `out/story-book-1080x1920.png` | 1080×1920 | 스토리·릴스 표지(한 권의 책 홍보). 위 250px·아래 340px는 비워 둠 |
| `out/highlight-rooms.png` · `highlight-book.png` · `highlight-guide.png` | 1080×1920 | 하이라이트 커버(가운데 원만 보임). 이름 예: 「일곱 방」「한 권의 책」「안내」 |
| `../out/ad3-book-ko-sound.mp4` | 15초 9:16 | 릴스·광고 영상 3안 「한 권의 책」(소리 있음). 무음판 `ad3-book-ko.mp4` |

## 프로필 소개 글 (150자 안, 그대로 붙여 넣기)
```
사주에서 룬까지, 일곱 점술이 본 나
한국 만신 · 켈트 오검 · 베다 · 이집트 데칸 · 마야 촐킨 · 룬 · 시빌라
일곱 문화의 점술, 끝에서 나의 이야기 한 편
👇 첫 번째 문 열기
```
- 이름 칸: `낯선 점술관 | 일곱 점술 운세`(검색에 걸리게 "운세"를 이름 칸에 둔다)
- 링크: `https://<제품 주소>/?utm_source=instagram&utm_medium=organic&utm_campaign=ig_profile&utm_content=ig_profile`
- 스토리 링크 스티커: `...&utm_campaign=ig_profile&utm_content=ig_story_book`
- 3안 광고: `?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad3_book&utm_content=ad3_book`
- 허용 값 목록은 `products/strange-oracle/app.js` `CAMPAIGN`(render/README 표와 같음). 목록 밖 값은 GA4에서 버려진다.

## 3안 「한 권의 책」 자막 (CLAUDE.md 8장 점검)
| 자리 | 시간(초) | 문구 |
|---|---|---|
| S1 | 0.1~3.9 | 사주에서 룬까지, 일곱 점술이 본 나 |
| S2 | 4.05~7.4 | 그 이야기를 한 권의 책으로 |
| S3 | 7.6~11.5 | 사주부터 2027년까지, 나에 대한 열다섯 장 |
| S4 | 11.7~ | 만신의 장부터 펼쳐 읽어요 |
| S5 | 12.3~ | 오늘 밤, 첫 번째 문 열기 |
| N1 | 12.8~ | 책 전체 9,900원 · 한 번 결제 |
- 정확도 과장·불안 자극·건강·투자 표현 없음. "열다섯 장"은 책 목차(여는 글·일곱 방·새 장·시기별 흐름·2027년의 흐름·인연의 장·궁합·원형 심층·닫는 글) 수와 같다(20단계). 면책 문구는 결정 123(8장 예외)대로 넣지 않았다.
- 목차 장면의 장 이름은 data.js `rooms.*.name`·`book.parts`와 같은 글자다.
