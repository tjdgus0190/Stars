# 광고 영상 렌더 (낯선 점술관 · 한국판)

developer 작성, 2026-10-17. 장면은 `../scenes/`(designer), 내용은 `../storyboard.md`.

## 실행
저장소 루트에서 (Windows, 헤드리스 Edge·ffmpeg 필요, 설치할 패키지 없음):

```
node --experimental-websocket marketing/strange-oracle/render/render.js all          # mp4 두 개
node --experimental-websocket marketing/strange-oracle/render/render.js ad1          # 1안만 (ad2 = 2안만)
node --experimental-websocket marketing/strange-oracle/render/render.js all --check  # #safe 확인 컷만
```
- 정적 서버: 스크립트가 `tools/serve.js`를 저장소 루트로 **포트 8790**에 띄우고 끝나면 끈다(`--port N`으로 바꿀 수 있음, 8787·8788은 거부).
- Edge 경로가 다르면 환경 변수 `EDGE_PATH`. CDP 드라이버는 `tools/strange-oracle/cdp.js`(디버깅 포트 9350).
- 걸리는 시간: 이 PC에서 1안 약 4분, 2안 약 2.5분.

## 하는 일
1. 뷰포트 1080x1920 · deviceScaleFactor 1 · mobile 아님. 움직임 줄이기(prefers-reduced-motion)는 켜지 않는다.
2. 장면을 열고 `document.fonts.ready`를 기다린 뒤 `html.is-paused`로 모든 애니메이션을 멈춘다.
3. 프레임 n마다 `document.getAnimations()` 전부를 `pause()` + `currentTime = n*1000/30` → 글꼴 대기 + rAF 두 번 → `Page.captureScreenshot`(PNG).
4. 프레임 PNG는 운영체제 임시 폴더(`%TEMP%/so-render-<안>-*`)에 두고, 인코딩이 끝나면(실패해도) 지운다.
5. ffmpeg: `libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30`, BT.709 표시, `+faststart`, 소리 트랙 없음(`-an`).
6. `--check`: 주소에 `#safe`를 붙여(초록 안전 박스·주황 글자 칸·붉은 비울 곳) 0초부터 1초 간격 + 마지막 프레임을 `../out/check/`에 찍고, 보이는 자막(`data-cap`)의 줄 수를 `../out/check/check.json`에 적는다. 3줄 이상이면 콘솔에 표시.

## 결과 (`../out/`)
| 파일 | 길이 | 프레임 | 크기(2026-10-17 렌더) |
|---|---|---|---|
| `ad1-seven-doors-ko.mp4` | 15.000초 | 450 | 1,417,275 B (약 1.4MB) |
| `ad2-manshin-ko.mp4` | 9.000초 | 270 | 1,094,966 B (약 1.1MB) |

공통: H.264 High, 1080x1920, yuv420p, 30fps, bt709, 무음(오디오 스트림 없음). 플랫폼에서 음악을 붙일 때 소리 없는 영상으로 올려도 된다.

## 주의
- 글꼴은 jsdelivr에서 받는다(네트워크 필요). 한자는 이 PC의 바탕체 계열로 대신 그려진다 — 다른 PC에서 렌더하면 한자 모양이 달라질 수 있다(scenes/README 3번).
- 자막·장면을 바꾸면 다시 `all`과 `--check`를 돌린다.

## 광고 링크의 utm (GA4 캠페인 구분)
광고 관리자 링크 칸에는 아래 값만 붙인다. 목록 밖 값·다른 키가 있으면(대소문자도 구분) 캠페인 값은 버려지고(방문은 쿼리 없는 주소로 기록) 주소창에서도 지워진다. 플랫폼이 붙이는 클릭 ID(fbclid·ttclid)는 값을 보내지 않고 버리며 캠페인 값은 그대로 남는다. 목록은 `products/strange-oracle/app.js`의 `CAMPAIGN`(분석 설정)에 있고 규칙은 `docs/common.md` analytics.js.

| 키 | 허용 값 |
|---|---|
| utm_source | `instagram` · `tiktok` |
| utm_medium | `paid_social` · `organic` |
| utm_campaign | `ad1_seven_doors` · `ad2_manshin` |
| utm_content | `ad1_seven_doors` · `ad2_manshin` |

예: `https://<제품 주소>/?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad1_seven_doors&utm_content=ad1_seven_doors`
