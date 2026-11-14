# 낯선 점술관 — 일곱 안내자 초상 생성 프롬프트 (2026-11-14)

운영자가 이미지 생성 서비스(ChatGPT 이미지·Midjourney·Adobe Firefly 등)로 직접 만든다. 에이전트는 받은 파일을 다듬어 화면에 넣는다.

## 방향
- 화풍: 점술관 화면(밤빛 남보라 + 금선, 방마다 깔린 고전 명화)과 맞도록 **유화 질감의 반실사 초상 + 아르누보풍 금선 장식**. 아이돌식 애니메이션·귀여운 캐릭터 화풍은 쓰지 않는다(명화 배경과 부딪힘).
- 구도: 가슴 위 반신, 얼굴이 위쪽 1/3 가운데. 세로 3:4. 배경은 거의 검은 남색(장면 없음) → 아치 문·도감 카드·면담 머리에 그대로 들어간다.
- 일곱 명이 한 세트로 보이도록 공통 문단을 매번 그대로 붙인다. 방마다 강조색 하나(data-dex.js hue와 같은 계열).
- 성별 구성: 여 4(만신·베다·룬·시빌라) · 남 3(데칸·촐킨·오검은 중성적인 청년).
- 문화 표현은 존중하는 차림으로, 우스꽝스럽거나 과장된 고정관념은 피한다. 노출 없는 차림(광고 심사).

## 공통 문단 (매 프롬프트 끝에 붙임)
```
Painterly semi-realistic portrait, bust from the chest up, facing the viewer at a slight three-quarter angle, face centered in the upper third of the frame. Beautiful, graceful, refined features, calm and mysterious expression, natural skin texture. Night lighting: deep indigo and violet shadows, a warm candle-gold rim light tracing the hair and shoulders, a few softly glowing gold dust particles. Classical oil-painting texture combined with Art Nouveau elegance, fine antique-gold line ornaments on the clothing. Background: plain near-black midnight indigo with a soft vignette, no scenery. Vertical 3:4 composition. No text, no letters, no logo, no watermark, no frame or border, no weapons, no blood, not cartoon, not chibi, not childish, modest clothing.
```

## 1. 만신 (사주 · 강조색 주홍)
```
A Korean shaman woman (mudang) of the Joseon era, ageless and dignified, about thirty-five, serene eyes and a gentle knowing smile. Glossy black hair parted in the center and wrapped into a braided crown, a slender gold hairpin (binyeo) with a small trembling ornament. She wears a flowing vermilion-red ceremonial shaman robe over a white hanbok jacket with a crisp white collar band and a deep blue sash. In one hand an open folding fan painted with the sun and moon, in the other a cluster of small brass shaman bells with red, blue and yellow ribbon tassels. A few grains of white rice float like tiny stars around her. Accent color: vermilion red.
```

## 2. 오검 (켈트 오검 · 강조색 이끼 초록)
```
A young Celtic scribe of early medieval Ireland, androgynous and gentle, soft-spoken, attentive calm eyes, faint freckles. Long wavy chestnut hair with a thin circlet of silver birch leaves. A moss-green wool cloak fastened with a bronze ring brooch over a cream linen tunic with fine interlace embroidery. Holds a tall birch-wood staff with short straight notches carved along one edge. Faint morning mist and a few birch leaves drifting in the dark. Accent color: moss green.
```

## 3. 베다 (나크샤트라 · 강조색 보라와 은)
```
A young Indian star-keeper woman, warm and cheerful, kind smiling eyes softly lined with kohl, lips parted as if humming a song. Dark hair parted in the center with a small maang tikka pendant, a tiny bindi, gold jhumka earrings, jasmine flowers tucked behind one ear. A sheer deep-violet dupatta embroidered with tiny silver stars drapes over her head and shoulders. One hand raised near her shoulder, gently counting on her fingers. A thin crescent moon and faint constellations glow behind her. Accent color: deep violet with silver.
```

## 4. 데칸 (이집트 데칸 · 강조색 호박금과 청금)
```
A young timekeeper of ancient Alexandria, a calm and precise young man with a composed, patient gaze, warm brown skin, eyes lined with kohl. Straight black chin-length hair with blunt bangs and a thin gold fillet. A white pleated linen garment with a broad beaded collar of lapis blue and gold. Holds a reed pen and a small papyrus sheet marked with rows of star dots. A faint golden sun disk and the thin shadow line of a sundial behind him. Accent color: amber gold and lapis blue.
```

## 5. 촐킨 (마야 촐킨 · 강조색 옥빛과 주황)
```
A Maya day-keeper priest, a stoic man of few words with strong, handsome, calm features, warm brown skin and a steady gaze. Long straight black hair, a tall headdress of iridescent green quetzal feathers rising above a carved jade disk on his forehead, jade ear spools, a necklace of jade beads with a carved jade pendant. A woven cotton mantle with geometric patterns in orange and cream. Faint carved stone glyphs and moss half-visible in the darkness behind him. Accent color: jade green with warm orange.
```

## 6. 룬 (북유럽 룬 · 강조색 강철 파랑)
```
A young Norse rune-caster woman on a windy fjord cliff at night, lively and bold, a confident grin and bright eyes. Long ash-blonde hair in two loose braids with small bronze beads, loose strands blown sideways by a strong sea wind. A steel-blue wool cloak with a soft grey fur collar and a simple woven trim. Holds up a smooth palm-sized river stone carved with one simple angular symbol that glows faintly. Fine sea spray and cold blue moonlight around her. Accent color: steel blue.
```

## 7. 시빌라 (시빌라 신탁 · 강조색 진홍)
```
An ancient Italian oracle priestess, ethereal and mysterious, eyes half-closed as if listening to a distant echo, a faint serene smile. Dark wavy hair under a sheer ivory veil, a delicate gold laurel wreath. A deep crimson and ivory draped Greek chiton. Holds a partly unrolled old scroll against her chest. Thin wisps of incense smoke curl around her, faint candlelight glows from the mouth of a cave behind her. Accent color: deep crimson.
```

## 만드는 법
- 만신을 먼저 여러 장 뽑아 마음에 드는 한 장을 정한 뒤, 나머지 여섯은 그 그림을 화풍 기준으로 쓴다.
  - ChatGPT: 같은 대화에서 "앞의 만신 그림과 같은 화풍·조명·구도로" 한 줄을 앞에 붙인다.
  - Midjourney: 고른 그림 주소를 `--sref <주소>`로 붙이고 `--ar 3:4`. 프롬프트에 화가 이름은 넣지 않는다.
- 룬 돌의 글자는 생성기가 엉뚱하게 그리는 일이 많다. 흐릿하면 그대로 두면 에이전트가 ᚱ(라이도)로 다듬는다.
- 받을 파일: PNG(또는 JPG) 세로 3:4, 가로 1024px 이상, 파일 이름 saju·ogham·star·decan·tzolkin·rune·sibyl.

## 넣는 곳 (에이전트)
- 아치 문(처음 화면 오늘의 신탁·면담 문 고르기·오늘의 신탁 큰 아치·다른 안내자 작은 아치), 도감 카드·펼침 시트, 면담 방 머리·말풍선 옆 작은 얼굴.
- WebP로 바꿔 한 장 200KB 이하(작은 얼굴용 축소본 따로). 방 명화 배경(dex-*.webp)은 면담 방 뒤 배경으로 그대로 쓴다.
- 입구 방 화면의 작은 선 실루엣(방 강조색 선 그림)은 그대로 두거나 함께 바꾼다 — 운영자 선택.

## 출시 전 운영자 확인
- 쓴 서비스·요금제가 상업적 이용을 허락하는지(예: Midjourney는 유료 요금제). 서비스 이름·날짜·라이선스를 CREDITS.md에 적는다(8장).
- 생성형 인공지능으로 만든 그림이라는 고지를 둘지, 둔다면 어디에 둘지(지금 ⑯ 예외는 약관·방침·면담 입구 한 줄뿐).
