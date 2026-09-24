# 공통 부품 사용 설명서

제품의 index.html에서 상대 경로로 불러온다: `<script src="../../common/<파일>"></script>`
배포할 때는 `common/` 폴더가 제품 폴더와 같은 위치 관계로 함께 올라가야 한다.

| 파일 | 상태 | 쓰는 제품 |
|---|---|---|
| share-card.js | 있음 | strange-oracle |
| disclaimer.js | 있음 | strange-oracle |
| base.css, share-buttons.js, ads.js, affiliate.js, analytics.js | 아직 없음 | - |

---

## share-card.js
결과를 1080x1920(스토리 비율) PNG로 그리고 공유한다. 모바일은 기기 공유 시트, 지원하지 않으면 파일 다운로드.

```js
const canvas = await ShareCard.render({
  eyebrow: "작은 윗줄 문구",
  glyph: "☾",            // 큰 상징 문자 (선택). 4글자 이상이면 작게 그린다
  title: "큰 제목",
  subtitle: "강조색 부제",   // 선택
  lines: ["본문 문단", "..."], // 넘치면 잘린다
  footer: "맨 아래 문구",
  theme: { bgTop, bgBottom, accent, text, muted }, // 선택, 기본은 밤하늘 남색 + 금색
  fonts: { serif: "'Gowun Batang', serif", glyph: "..." }, // 페이지에 로드된 글꼴 이름
  seed: 3,               // 배경 별 배치를 고정하는 숫자 (선택)
});
const how = await ShareCard.share(canvas, "파일이름.png", "공유 시 함께 보낼 문구");
// how: "shared" | "cancelled" | "downloaded"
```
- 글꼴은 `document.fonts.ready`를 기다린 뒤 그린다. 웹폰트를 CSS로 먼저 불러 두어야 한다.
- 개인정보: 이미지는 브라우저 안에서만 만들어진다. 이름 등 입력값을 넣을지는 제품이 정한다.

## disclaimer.js
운세·사주·타로 결과 하단에 CLAUDE.md 8장의 면책 문구를 넣는다. 문구는 부품 안에 고정돼 있다.

```js
Disclaimer.mount(document.querySelector(".disclaimer-slot"));
// → <p class="disclaimer">재미로 보는 콘텐츠이며, 중요한 결정의 근거로 삼지 마세요.</p>
```
- 스타일은 제품 CSS의 `.disclaimer`로 준다.
