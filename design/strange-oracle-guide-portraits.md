# 낯선 점술관 — 일곱 안내자 초상 생성 프롬프트 (2026-11-14)

운영자가 이미지 생성 서비스(ChatGPT 이미지·Midjourney·Adobe Firefly 등)로 직접 만든다. 에이전트는 받은 파일을 다듬어 화면에 넣는다.

## 방향 (2026-11-14 수정 — 운영자: 첫 시안이 실사풍이라 AI 티가 나고 화면과 안 어울림)
- 화풍: 실사·유화풍을 버리고 **평면 일러스트**로. 점술관 화면(밤빛 남색 + 가는 금선 아이콘 + 아치 문)과 같은 결이 되도록, 오래된 타로 카드처럼 **또렷한 외곽선 + 몇 가지 색만 칠한 평면 채색 + 종이 질감**.
- AI 티를 줄이는 법: 반짝이는 피부·영화 조명·빛 입자·심도(배경 흐림)·과한 디테일을 금지어로 넣고, 색 수를 제한하고, 손은 소매 속이나 소품 쥔 모양으로 단순하게.
- 구도: 정면에 가깝게 가운데, 가슴 위 반신, 배경은 단색 남색. 작은 크기(아치 문 70px)에서도 머리 모양·소품 윤곽으로 누구인지 알아보게.
- 시안 A(추천): 평면 구아슈 타로 카드풍. 시안 B: 남색 바탕에 금선만으로 그린 판화풍(지금 아이콘과 가장 가깝지만 덜 화사).
- 성별 구성: 여 4(만신·베다·룬·시빌라) · 남 3(데칸·촐킨·오검은 중성적인 청년). 존중하는 차림, 노출 없는 차림.

## 공통 문단 A — 평면 타로 카드풍 (추천, 매 프롬프트 끝에 붙임)
```
Flat hand-drawn illustration in the style of a vintage tarot card, front-facing bust from the chest up, centered, symmetrical, face in the upper third. Clean confident dark-indigo outlines of even width, flat matte colors with almost no shading, a limited palette of only five colors: midnight indigo, antique gold, cream, and the accent color named above plus one muted secondary. Simple stylized face with almond eyes, small nose and small mouth, gentle and pretty but not realistic. Hands simple or hidden in sleeves. Subtle paper grain texture, slightly imperfect brush edges. Plain flat midnight-indigo background with a thin gold arch line behind the head. No photorealism, no 3D, no glossy skin, no cinematic lighting, no glow, no light particles, no bokeh, no depth of field, no gradients, no text, no letters, no watermark, no frame, modest clothing.
```

## 공통 문단 B — 금선 판화풍 (대안)
```
Elegant engraved line illustration, front-facing bust from the chest up, centered and symmetrical. Drawn only with fine antique-gold lines on a flat midnight-indigo background, like gold ink on dark paper, with small flat fills of one accent color (named above) and cream. Stylized graceful face with simple features, not realistic. Decorative Art Nouveau line patterns on the clothing, simple hands. No shading gradients, no photorealism, no 3D, no glow, no light particles, no text, no letters, no watermark, no frame, modest clothing.
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
- Midjourney는 `--style raw --stylize 50 --ar 3:4`로 화려함을 낮춘다. ChatGPT는 "simple flat illustration, not realistic"을 맨 앞에 한 번 더 쓴다.
- 만신의 "rice grains float"는 빛 입자처럼 나오면 지운다.
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
