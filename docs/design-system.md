# 디자인 시스템 (common/base.css)

모든 제품은 `index.html`에서 base.css를 먼저, 제품 style.css를 나중에 불러온다.
```html
<link rel="stylesheet" href="../../common/base.css" />
<link rel="stylesheet" href="style.css" />
```
- 토큰(색·간격·글자) 값을 바꾸면 모든 제품이 영향을 받는다. **바꾸기 전에 운영자 확인** (designer.md).
- 제품 style.css는 토큰을 쓰고, 제품 전용 치수가 필요하면 파일 맨 위 `:root`에 이름을 붙여 한 곳에 둔다.
- JS는 상태 class만 붙였다 뗀다. 요소는 `data-js`로 찾는다.

| 제품 | 쓰는 것 |
|---|---|
| strange-oracle | 전체 (밤 테마 고정 `data-theme="night"`, 강조 hue: gold·ice·moon·jade, 공용 움직임·스크롤 등장) |

## 1. 색 (OKLCH, 동명도 팔레트)
- 같은 역할의 색은 명도(L)·채도(C)를 맞추고 hue만 바꾼다. 강조색은 `--accent-h` 하나만 바꾸면 명도는 그대로 색만 바뀐다.
- 테마: 기본은 밝은 테마, 기기 다크 모드면 어두운 테마. `<html data-theme="night">`는 어두운 테마 고정, `data-theme="light"`는 밝은 테마 고정.

| 토큰 | 역할 | 어두운 테마 | 밝은 테마 |
|---|---|---|---|
| `--c-bg` / `--c-bg-deep` | 바탕 | L 0.17 / 0.14 | L 0.985 / 0.96 |
| `--c-surface-1/2/3` | 카드 / 입력칸·강조 카드 / 누름 | L 0.215 / 0.26 / 0.31 | 1 / 0.955 / 0.92 |
| `--c-line` | 장식선 (대비 요구 없음) | L 0.40 | L 0.86 |
| `--c-line-strong` | 입력칸 테두리 등 UI 경계 (3:1 이상) | L 0.58 | L 0.62 |
| `--c-text-strong` / `--c-text` | 제목 / 본문 | L 0.96 / 0.91 (따뜻한 흰색) | L 0.20 / 0.25 |
| `--c-text-muted` / `--c-text-faint` | 보조 / 흐린 글자 (둘 다 본문 대비 4.5 이상) | L 0.79 / 0.70 | L 0.46 / 0.52 |
| `--accent` | 강조 (L·C 공통, hue만 다름) | L 0.84 C 0.10 | L 0.50 C 0.11 |
| `--accent-dim` / `-soft` / `-line` / `-glow` | 약한 강조 글자 / 14% 바탕 / 35% 선 / 55% 빛 | 자동 파생 | 자동 파생 |
| `--c-on-accent` | 강조 바탕 위 글자 | L 0.21 | L 0.99 |
| `--c-danger` | 오류 | L 0.80 hue 20 | L 0.50 hue 25 |

강조 hue 목록 (`--hue-*`): gold 85, ice 230, moon 295, forest 150, sand 65, jade 190, candle 35.
어두운 테마 대비(계산값): 본문/바탕 14.7, 보조/입력칸 8.1, 흐린/입력칸 5.8, 강조/입력칸 9.3~9.9, 버튼 글자/강조 10.6~11.1, 입력칸 테두리/입력칸 3.6.

강조색 바꾸기 (예: 방마다 다른 색):
```css
[data-room="rune"] { --accent-h: var(--hue-ice); --accent-c-scale: 0.8; }
```
`--accent` 파생값은 `:root`, `[data-accent]`, `[data-room]`에서 다시 계산되므로, 강조색을 바꾸려는 요소에는 `data-room` 또는 `data-accent` 속성을 붙인다.

## 2. 간격·모서리·글자·움직임
- 간격: `--space-1`(4) 2(8) 3(12) 4(16) 5(20) 6(24) 8(32) 10(40) 12(48) 16(64) 20(80). 화면 좌우 여백 `--gutter` 20px, 최대 폭 `--page-max` 480px.
- 모서리: `--radius-sm` 8, `-md` 12, `-lg` 16, `-xl` 24, `-pill`.
- 글꼴 변수: `--font-serif`, `--font-sans`, `--font-latin`, `--font-symbol` (제품이 덮어씀. 글꼴 파일은 제품이 jsdelivr에서 버전 고정으로 불러옴).
- 글자 크기(rem): `--fs-2xs` 12(영문 장식만) / `xs` 13 / `sm` 14 / `md` 16(입력칸 최소) / `read` 17(긴 글 본문) / `lg` 19 / `xl` 22 / `2xl` 28 / `3xl` 36 / `display` 44.
- 줄 간격: `--lh-tight` 1.3 / `--lh-ui` 1.55 / `--lh-read` 1.85(한국어 긴 글). 읽기 폭 `--measure` 34em.
- 터치: `--tap` 48px(주요 버튼), `--tap-min` 44px(작은 버튼).
- 움직임: `--dur-fast` 150ms / `base` 300ms / `slow` 700ms / `reveal` 650ms(한 번 등장) / `ritual` 1200ms, `--stagger` 90ms(차례로 나타날 때 간격).
- 이징: `--ease-out` (0.2,0.8,0.2,1) / `--ease-in-out` (0.6,0,0.3,1) / `--ease-reveal` (0.16,1,0.3,1) 빠르게 나와 천천히 멈춤 / `--ease-spring` (0.34,1.56,0.64,1) 살짝 튕김.
- `prefers-reduced-motion`이면 모든 애니메이션·전환이 즉시 끝나 최종 모습이 보인다. 계속 도는 장식은 제품 CSS에서 숨긴다.

## 2-1. 공용 움직임 (base.css)
- 원칙: transform·opacity 위주(모바일 성능). 긴 글 본문 뒤에서 계속 움직이는 효과 금지.
| 키프레임 | 용도 |
|---|---|
| `base-fade-up` | 16px 아래에서 떠오름 |
| `base-fade-in` | 투명 → 보임 |
| `base-draw` | SVG 선 그리기. 대상 path/circle에 `pathLength="1"`, CSS에 `stroke-dasharray: 1` |
| `base-pop` | 0.4배 → 1.15배 → 1배로 톡 나타남 (SVG 점이면 `transform-box: fill-box; transform-origin: center`) |

### 스크롤 등장 (한 번만)
부모에 `.js-reveal`(JS가 붙임)이 있을 때만 `[data-reveal]`이 숨어 있다가, 보이면 JS가 `.is-in`을 붙인다. JS가 없거나 움직임 줄이기면 처음부터 보인다.
```html
<section class="js-reveal">
  <p data-reveal>…</p>   <!-- IntersectionObserver로 처음 보일 때 .is-in (떼지 않음) -->
</section>
```

## 3. 상태 class
| class | 뜻 |
|---|---|
| `is-hidden` | 숨김 (`display:none !important`) |
| `is-active` | 현재 보이는 것 (토스트 등) |
| `is-selected` | 선택됨 (칩) |
| `is-error` | 오류 (`.field`) |
| `is-disabled` / `disabled` | 흐리게, 누를 수 없음 |
| `is-loading` | 버튼 안 원형 로딩 |
| `is-filled` | 광고 자리가 채워짐 (ads.js 전용) |
| `js-reveal` / `is-in` | 스크롤 등장 (부모 / 등장한 요소) |

## 4. 컴포넌트

### 긴 글 `.prose`
본문 17px, 줄 간격 1.85, 단락 사이 1.1em, `text-wrap: pretty`. `<b>`는 밝은 글자, `<em>`은 강조색 형광펜.
```html
<div class="prose"><p>…</p><p>…</p></div>
```

### 글자 `.eyebrow`
영문 대문자 작은 머리글 (강조 약한 색, 자간 넓게). 한국어 문장에는 쓰지 않는다.

### 버튼 `.btn`
| 변형 | 용도 |
|---|---|
| `.btn--primary` | 화면당 하나, 주요 행동 (강조색 바탕) |
| `.btn--secondary` | 보조 (테두리) |
| `.btn--ghost` | 취소 등 |
| `.btn--danger` | 되돌릴 수 없는 삭제 |
| `.btn--small` | 44px 작은 버튼 |
| `.btn--text` | 글자만, 터치 영역 44px |
| `.btn--block` | 폭 가득 |
```html
<button class="btn btn--primary btn--block" type="button" data-js="go">시작하기</button>
```

### 입력 `.field` / `.input` / `.chip` / `.check`
```html
<div class="field">
  <label class="field__label" for="name">이름 <span class="field__hint">(선택)</span></label>
  <input class="input" id="name" type="text" />
</div>
<fieldset class="field is-error">
  <legend class="field__label">태어난 날</legend>
  <div class="field__row">
    <input class="input input--num" inputmode="numeric" /> <span class="field__unit">년</span> …
  </div>
  <p class="field__error" role="alert">날짜를 확인해 주세요 (예: 1995년 3월 21일)</p>
</fieldset>
<div class="chip-group" role="radiogroup">
  <button class="chip is-selected" type="button" role="radio" aria-checked="true">요즘의 나</button>
</div>
<label class="check"><input type="checkbox" /> <span>태어난 시각을 몰라요</span></label>
```
- 입력칸 글자는 16px 이상(iOS 확대 방지). 날짜·숫자는 `inputmode="numeric"`.

### 카드 `.card`, 알림 `.notice`
개인정보 안내 등은 `.notice` + `.notice__icon`(SVG 18px).
```html
<p class="notice"><svg class="notice__icon">…</svg><span>이 기기의 이 탭에만 잠시 보관되며 어디에도 전송되지 않아요.</span></p>
```

### 면책 `.disclaimer`
common/disclaimer.js가 넣는 `<p class="disclaimer">`의 스타일.

### 장식 구분선 `.ornament`
```html
<div class="ornament" aria-hidden="true">✦</div>
```

### 광고 자리 `.ad-slot`
- ads.js만 쓴다. 비어 있으면 자리를 차지하지 않고, 채워지면 `.is-filled`(최소 높이 100px).
- 결과 문구·버튼과 `--space-12` 이상 떨어뜨리고, 광고를 버튼·콘텐츠처럼 꾸미지 않는다. 라벨이 필요하면 `.ad-slot__label`.
```html
<div class="ad-slot" data-js="ad-slot" data-ad="hub"></div>
```

### 토스트 `.toast`
```html
<p class="toast" data-js="toast" role="status" aria-live="polite"></p>  <!-- .is-active로 보임 -->
```

### 대화상자 `.dialog`
`<dialog>`를 JS가 `showModal()`/`close()`로 연다. 배경은 `--c-scrim`.
```html
<dialog class="dialog" data-js="confirm">
  <div class="dialog__body">
    <h2 class="dialog__title">내 정보를 지울까요?</h2>
    <p class="dialog__text">…</p>
    <div class="dialog__actions">
      <button class="btn btn--danger btn--block">모두 지우기</button>
      <button class="btn btn--ghost btn--block">그대로 두기</button>
    </div>
  </div>
</dialog>
```

### 도우미
`.visually-hidden`(화면에는 숨기고 읽기 프로그램에는 읽힘), `.page`(최대 480px 가운데 정렬 + 좌우 여백).
