# 출처·라이선스: 낯선 점술관 광고 영상 (marketing/strange-oracle/)

| 항목 | 내용 | 라이선스 |
|---|---|---|
| 장면 그림 | CSS·인라인 SVG로 직접 제작(designer, scenes/). 그림 파일·AI 생성물·실사·사람 모습 없음 | 자체 제작 |
| 글꼴 | Gowun Batang 400·700, Cinzel 500·700 — @fontsource 5.3.0, jsdelivr에서 버전 고정(SRI) | SIL Open Font License 1.1 |
| 한자 글꼴 | Noto Serif KR 700 — @fontsource/noto-serif-kr 5.3.1, jsdelivr에서 버전 고정(SRI sha384), https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-kr@5.3.1/700.css . Gowun Batang에 없는 한자(丙寅甲戌辛巳庚午乙丁戊己壬癸)에만 쓰임. 시스템 글꼴은 쓰지 않음 | SIL Open Font License 1.1 |
| 소리(1안 소리판 `out/ad1-seven-doors-ko-sound.mp4`·`.wav`) | 직접 합성(`render/sound-ad1.js`, developer 2026-10-18). 사인·삼각파·노이즈를 스크립트가 PCM으로 계산하고 ffmpeg로 라우드니스만 맞춤. 외부 음원·샘플·음악 파일·AI 생성 서비스 없음 | 자체 제작 |
| 소리(3안 소리판 `out/ad3-book-ko-sound.mp4`) | 직접 합성(`render/sound-ad3.js`, 2026-10-21). 사인파 종소리·노이즈를 스크립트가 계산, ffmpeg loudnorm. 외부 음원 없음 | 자체 제작 |
| 인스타그램 자료(`instagram/out/*.png`) | CSS·인라인 SVG로 직접 제작(`instagram/ig.html`·`ig.css`, 2026-10-21). 제품 방 아이콘과 같은 선. 그림 파일·AI 생성물·실사 없음. 글꼴은 위와 같음 | 자체 제작 |
| 음악·효과음(그 밖) | 1안 무음 원본·2안은 소리 없음. 업로드 때 플랫폼 라이브러리 음악을 쓰면 그 플랫폼 약관을 따른다 | — |
| 3D판 장면(`scenes/gl/`, `*-3d.html`, 2026-10-24) | 별·성운·금빛 먼지·천문 고리·둥근 바닥·일곱 문·메달·책을 three.js 도형·셰이더·캔버스 글자로 직접 그림. 그림 파일·외부 모델·실사·사람 모습 없음 | 자체 제작 |
| three.js | 0.160.0, jsdelivr에서 버전 고정 https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js (영상 렌더에만 쓰고 결과물에는 그림만 남음) | MIT (Copyright © 2010-2024 three.js authors) |
| 렌더 도구 | Microsoft Edge(헤드리스), FFmpeg(libx264) — 렌더에만 쓰고 결과물에 포함되지 않음 | — |
