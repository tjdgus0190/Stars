# 공통 부품 사용 설명서

제품의 index.html에서 상대 경로로 불러온다: `<script src="../../common/<파일>"></script>`
배포할 때는 `common/` 폴더가 제품 폴더와 같은 위치 관계로 함께 올라가야 한다.

| 파일 | 상태 | 쓰는 제품 |
|---|---|---|
| base.css | 있음 (designer, 사용법은 docs/design-system.md) | strange-oracle |
| share-card.js | 있음 (2026-09-25 옵션 추가, 2026-09-28 그림 블록·소장판 옵션 추가) | strange-oracle |
| disclaimer.js | 있음 | 없음(strange-oracle 19단계에서 뺌, 결정 123 · CLAUDE.md 8장 예외) |
| share-buttons.js | 있음 (2026-09-30, 링크 복사 + 카카오톡 자리) | strange-oracle |
| ads.js | 있음 (2026-10-01, 배너 채우기 + 보상형) | strange-oracle |
| analytics.js | 있음 (2026-10-01, GA4 허용 목록 · 2026-10-17 utm 허용 목록) | strange-oracle |
| affiliate.js | 아직 없음 | - |

---

## 글꼴 불러오기 (모든 제품 공통 규칙)
CLAUDE.md 3장: 글꼴도 cdnjs·jsdelivr에서 버전을 고정해 불러온다. Google Fonts 주소는 쓰지 않는다.
jsdelivr의 Fontsource 배포본을 쓰고, 가능하면 SRI(integrity)를 붙인다.

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/gowun-batang@5.3.0/400.css"
      integrity="sha384-UmN2JKCN3ZzGKhUCbF72zmj7SCKSsgzpBPRTuYCs90jUI3LUOfltMKpFi9ZWIfoL" crossorigin="anonymous" />
```
- 버전 확인: `npm view @fontsource/<이름> version`. 굵기마다 CSS 파일이 따로 있다(400.css, 700.css …).
- SRI 값: CSS 파일을 받아 SHA-384를 base64로 계산 (`sha384-…`). 버전을 바꾸면 값도 다시 계산한다.
- CSS 안의 글꼴 파일(`./files/*.woff2`)은 같은 패키지에서 불린다. 한글 글꼴은 unicode-range로 잘게 나뉘어 필요한 조각만 받는다.
- 2026-09-25 확인한 버전(strange-oracle): gowun-batang 5.3.0, cinzel 5.3.0, noto-sans-runic 5.3.0 (SRI 값은 products/strange-oracle/index.html).

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
  fonts: { serif: "'Gowun Batang', serif", glyph: "...", latin: "'Cinzel', serif" }, // 페이지에 로드된 글꼴 이름
  seed: 3,               // 배경 별 배치를 고정하는 숫자 (선택)

  // ── 2026-09-25 추가 옵션 (모두 선택. 안 넘기면 예전과 똑같이 그린다)
  art: { height: 390, draw(ctx, { x, y, w, theme }) {} }, // 제품이 직접 그리는 그림. x=가운데, y=블록 위쪽
  stones: [{ path: "M13 4V56…", label: "URÐR" }],        // 돌 가로 배치(각 240x290). path = SVG 경로(viewBox 40x60)를 획으로 그림. 3개면 가운데 돌이 20px 위
  progress: { done: [2, 6], total: 6, label: "2 / 6장" },  // 아치 진행 행(각 110x150). done = 채운 번호 배열(1부터) 또는 [true,false,…]
  lead: "제목 위 작은 줄",                                  // 40px, muted
  titleSize: 150, titleColor: "accent", titleGlow: true,   // 제목 크기(기본 92)·색("accent"면 강조색)·빛
  hook: "본문 아래 강조색 한 줄",                            // 40px, accent
  badges: ["나의 이야기 6장 · 과거·현재·미래"],              // 테두리 알약(32px), 여러 개면 세로로
  footerY: 1630,                                            // footer 위치(기본 1700 = H-220). 주면 본문 아래 안전선도 그 위로 올라간다

  // ── 2026-09-28 추가 옵션 (모두 선택. 안 넘기면 그리지 않는다). 그림 블록 아래 라벨: label(글자), labelColor("accent"면 강조색, 기본 muted), Cinzel 34px
  bark: { path: "M20 76V4M20 40H34", label: "BEITH" },     // 흰 자작나무 껍질(200x400) + 획. path = SVG 경로(viewBox 40x80), 획 두께 14px·강조색 빛. ink = 획 색(기본 #3a2a1a)
  sundial: { index: 10, label: "DECAN 11 / 36", labelColor: "accent" }, // 해시계(지름 400): 36칸·12궁 경계·집 칸(index 0~35, 12시에서 시계 방향)·그림자·해
  dayGlyph: { number: 4, sign: "AJAW", label: "160 / 260", labelColor: "accent" }, // 마야 막대·점 숫자(1~13, 높이 150, numberColor 기본 #ebc573) + 카르투슈(340x110, Cinzel 56px)
  laurel: { numeral: "XIV", label: "SORS" },               // 월계관(지름 380, leafColor 기본 #8fb58a) + 가운데 로마 숫자(Cinzel 110px, 강조색)
  parchment: { text: "신탁 문장" },                         // 양피지 띠(900x300) 위 글자(46px, color 기본 #4a2a14, 최대 maxLines=4줄). lines 다음 자리에 그린다

  // ── 2026-09-28 6단계 추가 옵션 (유료 소장판 카드용, 모두 선택. 안 넘기면 그리지 않는다)
  frame: "keepsake",                                        // 기존 이중 테두리 안쪽 금선 두 겹 + 네 모서리 밀랍 인장(지름 72px, 갈라진 모습). theme.wax·waxRim으로 밀랍색 변경 가능
  topBadge: "소장판",                                        // 제목 위 알약(32px). lead 다음·title 앞
  pair: { left: "전사", right: "연인", mark: "×" },          // 제목 아래 쌍 한 줄(56px, 기호는 강조색 latin 글꼴). 상대가 없으면 { text: "여덟 원형의 지도" }
  keyword: "지금 구간 한 줄",                                 // 40px 강조색, 한 줄(넘으면 말줄임)
  roomGrid: { cells: [{ path: "M12 56V4…", vw: 40, vh: 60, fill: false, color: "#93d5f5", done: true }] }, // 3열 칸(120px). done이면 방 색 글리프, 아니면 흐린 테두리
  closeLine: { text: "닫는 글 한 문장", size: 44, maxLines: 2 }, // 최대 2줄, 넘으면 말줄임

  // ── 2026-09-29 9단계 추가 옵션 (안내자 서명, 선택. 안 넘기면 그리지 않는다)
  guideSignature: { name: "룬", line: "바람이 돌을 고르게 두세요." }, // 흐름의 맨 마지막 줄. "{line}" — {name} 모양, line·따옴표는 muted, "— 이름"만 강조색(30px, 넘치면 26px까지 줄임. 최대 폭 820px를 넘어도 줄이지 않으니 문장을 줄여서 다시 넘길 것)
});
const how = await ShareCard.share(canvas, "파일이름.png", "공유 시 함께 보낼 문구");
// how: "shared" | "cancelled" | "downloaded"
```
- 그리는 순서(위→아래): eyebrow → glyph → art → bark → sundial → dayGlyph → laurel → stones → progress → lead → topBadge → title → subtitle → pair → keyword → roomGrid → closeLine → lines → parchment → hook → badges → guideSignature. 전체를 안전 영역(y 260 ~ 1600) 가운데에 놓고, 넘치면 **아래쪽 줄부터 버린다**.
- 글꼴은 `document.fonts.ready`를 기다린 뒤 그린다. 웹폰트를 CSS로 먼저 불러 두어야 한다.
- 개인정보: 이미지는 브라우저 안에서만 만들어진다. 이름 등 입력값을 넣을지는 제품이 정한다.
- 변경 이력: 2026-09-25 옵션 추가. 쓰는 제품을 grep으로 확인(strange-oracle뿐). 기존 옵션만 쓰면 결과가 같다.
- 2026-09-28 (6단계 유료 리포트): frame:"keepsake"·topBadge·pair·keyword·roomGrid·closeLine 추가. 새 블록 함수와 선택 옵션만 더했고 기존 옵션의 순서·기본값은 그대로(기존 카드는 새 옵션을 넘기지 않으므로 결과가 같다). 쓰는 제품 grep 결과 strange-oracle뿐. 유료 소장판에는 이름·생일·영수증 코드를 넣지 않는다(제품 규칙).
- 2026-09-28: bark·sundial·dayGlyph·laurel·parchment 추가(새 블록 함수만 더하고 기존 블록·순서·기본값은 그대로). 쓰는 제품 grep 결과 strange-oracle뿐, 룬·별·나의 이야기 카드 이미지가 만들어지는 것을 헤드리스 Edge로 확인(이전 이미지와 픽셀 비교는 하지 않음).
- 2026-09-29 (9단계 방의 안내자): guideSignature 옵션 추가. badges 다음, 흐름의 맨 마지막 줄에만 그리고 안 넘기면 기존과 똑같이 그린다(기존 옵션·순서·기본값 그대로). 쓰는 제품 grep 결과 strange-oracle뿐, 여섯 방 결과 카드에서 안내자 이름·서명 문장을 넘겨 확인(나의 이야기·유료 소장판 카드는 넘기지 않음).

- 2026-09-30 (10단계 공유 고리): 선택 옵션 `footerUrl: "example.com/products/…"`(표시용 주소, https:// 뗀 글자)와 `ShareCard.share(canvas, 파일, 문구, url)`의 넷째 인자 `url`(선택) 추가.
  - `footerUrl`을 넘기면 footer 줄을 40px 올리고 그 아래(원래 footer 자리)에 주소 한 줄을 그린다(본문 sans 28px, 불투명도 0.8, 44자를 넘으면 24px, 그래도 가로 900px를 넘으면 그리지 않고 footer도 그대로). 본문 아래 안전선도 40px 올라간다.
  - 안 넘기거나 빈 글자면 예전과 똑같이 그린다. `url`을 안 넘기면 `navigator.share`에 예전처럼 files·text만 넘긴다. 기존 옵션·순서·기본값 그대로.
  - 쓰는 제품 grep 결과 strange-oracle뿐. site.url이 빈 상태(footerUrl "")에서 방 카드가 만들어지는 것을 헤드리스 Edge로 확인. 주소 줄이 실제로 그려진 모습과 기기 공유 시트에서 files+url을 함께 넘겼을 때의 동작은 미확인.

## share-buttons.js
링크 복사와 카카오톡 공유 자리. 문구는 넣지 않는다(제품 마크업·data.js). 요소는 data-js로만 찾는다.

```html
<button type="button" data-js="share-link-copy">링크 복사</button>
<span data-js="share-kakao-slot"></span>                       <!-- 빈 자리. 키가 없으면 비어 있는 채로 둔다 -->
<p class="is-hidden" data-js="share-link-status" role="status">
  <span data-js="share-link-msg">주소를 복사했어요</span>       <!-- 복사 성공 -->
  <span class="is-hidden" data-js="share-link-url"></span>      <!-- 클립보드가 막혔을 때 주소를 글자로 -->
</p>
```
```js
const url = ShareButtons.siteUrl(TEXT.site.url); // 설정값, 비어 있으면 location.origin + pathname. 쿼리·해시는 항상 뺀다
ShareButtons.init({
  url,
  kakao: { jsKey: "", sdkUrl: "", label: "카카오톡으로 보내기", title, description, imageUrl, onFail() {} }, // 선택
  onCopy(ok) {},   // 선택
});
ShareButtons.displayUrl(url);   // "https://" 뗀 표시용 글자
await ShareButtons.copyText(글자); // 클립보드 쓰기 → true/false (버튼을 누른 동작 안에서만)
ShareButtons.reset();            // 완료 줄 모두 닫기 (화면을 옮길 때)
```
- 링크 복사: `share-link-copy`를 누르면 주소를 클립보드에 넣고, 그 버튼에서 위로 올라가며 처음 만나는 `share-link-status`를 연다. 성공이면 `share-link-msg`, 막혔으면 `share-link-url`에 주소를 넣어 보인다. 버튼이 여러 곳에 있어도 init은 한 번만 부른다.
- 카카오톡: `jsKey`와 `sdkUrl`이 **둘 다** 있을 때만 `share-kakao-slot` 안에 `<button class="text-link">`를 넣는다. 하나라도 비면 버튼도 SDK 요청도 없다. SDK는 버튼을 누른 순간에만 불러온다. 공유 내용은 title·description·imageUrl·주소뿐.
  - SDK 주소는 운영자 결정(strange-oracle 기획서 32번) 전이라 넣지 않았다. **키·주소를 넣은 뒤의 실제 공유 동작은 미확인**(빈 키 분기까지만 시험). 키는 운영자가 넣는다.
- 개인정보: 주소에 입력값·결과 코드를 넣지 않는다(쿼리·해시를 뺀다). 이 부품은 입력값을 받지 않는다.

## ads.js
배너 광고 채우기와 보상형 광고(구글 애드센스·애드 매니저). CLAUDE.md 3장 구글 예외에 따라 구글 공식 주소에서만, 이 부품을 통해서만 불러온다.

```js
// 설정은 제품 data.js 맨 위 한 곳 (ID는 운영자가 넣는다, 에이전트가 지어내지 않는다)
TEXT.ads = {
  adsenseClient: "",                                   // "ca-pub-숫자"
  slots: { hub: { net: "adsense", id: "" }, "result-end": { net: "adsense", id: "" } }, // 자리 이름 = 마크업 data-ad 값
  rewardedUnit: "",                                    // 애드 매니저 보상형 광고단위 "/네트워크코드/광고단위"
  label: "광고",                                       // 채워진 배너 위 작은 표시
};
Ads.init(TEXT.ads);           // 주소의 query를 지운 뒤에 부른다. 반환 true = 켜짐
Ads.fill(화면요소);            // 그 안의 [data-ad] 자리를 채운다(화면에 들어갈 때마다). 한 번에 최대 2개
const r = await Ads.rewarded({ slot: "room-unlock", room }); // "granted" | "unavailable" | "closed", 거절하지 않음
Ads.rewardedConfigured(TEXT.ads) / Ads.bannerConfigured(...) / Ads.anyConfigured(...) // 잠금 UI·쿠키 줄을 낼지
Ads.check(TEXT.ads)           // { empty: [...], bad: [...] } (build-dist가 씀)
```
- 마크업: `<div class="ad-slot" data-js="ad-slot" data-ad="hub"></div>`. 채우면 `.is-filled` + 맨 앞 `span.ad-slot__label` + `ins.adsbygoogle`. `data-ad-status="unfilled"`나 스크립트 오류면 `.is-filled`를 빼고 비워 높이 0.
- 자리 규칙(7장): 결과 문구 바로 위아래·버튼 바로 옆에 자리를 두지 않는다. 새 자리는 designer가 마크업에 만든다(부품은 있는 자리만 채움). 자동 광고는 애드센스 계정에서 끈다.
- 보상형: 버튼을 누른 뒤에만 `securepubads.g.doubleclick.net/tag/js/gpt.js`를 불러와 `defineOutOfPageSlot(광고단위, OutOfPageFormat.REWARDED)`. `rewardedSlotReady` → 보이기, `rewardedSlotGranted` → granted, `rewardedSlotClosed`(받기 전) → closed, `slotRenderEnded`의 `isEmpty`·null 슬롯·스크립트 오류·8초 안에 준비 안 됨 → unavailable. 요청은 겹치지 않는다(진행 중이면 같은 Promise).
- 빈 ID·모양이 틀린 ID: 아무것도 불러오지 않는다. 주소에 `?`가 있는 동안: init·fill·rewarded 모두 아무것도 안 함(rewarded는 unavailable).
- `net:"adfit"`: 운영자 결정(strange-oracle 41번) 전에는 채우지 않고 콘솔 경고만.
- 개인정보: 이 부품은 사용자 입력값을 받지 않는다.

## analytics.js
GA4(gtag). 허용 목록 밖의 이벤트·속성·값은 버린다(6장을 코드로 강제).

```js
Analytics.init({
  ga4: TEXT.analytics.ga4,          // "G-…", 비거나 틀리면 아무것도 안 함
  title: "고정 제품명",              // page_title
  events: { so_result: { room: ["rune", ...], archetype: ["warrior", ...] }, so_visit: {} }, // 이벤트 → 속성 → 허용 값 목록
  utm: { search: bootSearch, allow: { utm_source: ["instagram", ...], ... }, ignore: ["fbclid", "ttclid"] }, // (선택) 캠페인 구분
});
Analytics.track("so_result", { room: "rune", archetype: "warrior" }); // 보낸 속성 묶음 또는 null
```
- config: `send_page_view:false`, `page_location`은 origin+pathname(`?`·`#` 없음), `allow_google_signals:false`, `allow_ad_personalization_signals:false`. config는 init 한 번뿐(화면 이동 때 다시 부르지 않음).
- 값은 목록 안의 문자열만 지나간다 → 이름·생일·질문·코드 같은 입력값은 실릴 수 없다. 세부 결과 번호도 목록에 넣지 않는다.
- GA4 '향상된 측정'은 운영자가 데이터 스트림 설정에서 끈다(코드만으로 막히는지 미확인).
- 빈 ID: gtag.js를 불러오지 않고 track은 null. 주소에 `?`가 있는 동안: init·track 모두 아무것도 안 함.
- 캠페인 구분(utm, 2026-10-17): 제품은 시작할 때 `location.search`를 따로 받아 두고(`bootSearch`) 주소창의 query를 지운 뒤 init에 `utm.search`로 넘긴다.
  - 허용 키는 `utm_source`·`utm_medium`·`utm_campaign`·`utm_content` 넷뿐(부품에 고정). 값 목록(`utm.allow`)은 제품이 정한다(설정이므로 data.js가 아니라 app.js. strange-oracle은 `CAMPAIGN`). 값 모양은 소문자·숫자·밑줄 1~40자만.
  - 키·값이 모두 목록과 **정확히**(대소문자 구분, % 디코드 뒤) 같고 `utm_source`가 있을 때만 `page_location` = origin+pathname+`?utm_source=…&utm_medium=…&utm_campaign=…&utm_content=…`(이 순서, 있는 것만).
  - 다른 키·목록 밖 값·같은 키 두 번·빈 값·깨진 인코딩이 하나라도 있으면 캠페인 값을 모두 버리고 query 없는 주소로 보낸다(방문은 기록). 입력값이 주소에 섞여 들어와도 분석에는 가지 않는다(6장).
  - `utm.ignore`의 키(광고 플랫폼이 붙이는 클릭 ID: fbclid·ttclid)는 값을 보지 않고 버린다. 섞인 쿼리로 치지 않는다. utm 키는 ignore에 넣어도 검사한다.
  - 공유 링크에 utm이 남지 않게 제품이 시작할 때 주소창 query를 지운다(strange-oracle은 원래부터 지움 → page_view 전에 이미 없음).
  - 시험: `tools/strange-oracle/ads.test.js`(analytics utm 4건), `tools/strange-oracle/e2e-utm.js`.
- 이 부품을 쓰는 제품은 개인정보처리방침에 구글 애널리틱스·쿠키·국외 이전 안내를 넣고, 입구에 쿠키 한 줄을 둔다(strange-oracle 12-5 참고).

## disclaimer.js
운세·사주·타로 결과 하단에 CLAUDE.md 8장의 면책 문구를 넣는다. 문구는 부품 안에 고정돼 있다.

```js
Disclaimer.mount(document.querySelector(".disclaimer-slot"));
// → <p class="disclaimer">재미로 보는 콘텐츠이며, 중요한 결정의 근거로 삼지 마세요.</p>
```
- 스타일은 제품 CSS의 `.disclaimer`로 준다.

## sessionStorage로 입력값 이어 쓰기 (부품 아님, 제품별 구현 규칙)
CLAUDE.md 6장 예외. 지금은 strange-oracle의 app.js 안에만 있다(쓰는 제품이 하나라 common/으로 빼지 않음). 두 번째 제품이 필요해지면 common/으로 옮긴다.
- 키 하나(`<slug>`)에 JSON으로. localStorage·쿠키·URL 금지.
- 처음 저장하기 전 입력칸 바로 아래에 "이 기기의 이 탭에만 잠시 보관되며 어디에도 전송되지 않는다" 안내.
- 모든 화면 상단 "내 정보 지우기" → 확인 대화상자 → `sessionStorage.removeItem`.

### 2026-10-25 추가 (낯선 점술관이 처음 씀, 다른 제품은 아직 안 씀)
- **share-card.js** `deluxe: true` — 성운 배경·방 색 빛·모서리 장식 테·인용 부호 붙은 큰 본문·아래 금빛 로고 묶음. `footer`는 로고 글자, `cta`는 로고 위 한 줄. 고급판에서는 알약(badges)·안내자 서명(guideSignature)을 그리지 않고, 넘치면 사이 간격부터 줄여 본문 줄이 잘리지 않게 한다. `emblem: { paths: [viewBox 40 path…], label }` — 이중 원 안의 문장 그림 블록. 둘 다 안 넘기면 예전과 똑같이 그린다.
- **share-buttons.js** 카카오 설정에 `button`(버튼 이름), `imageWidth`·`imageHeight`, `content(slot)`(누른 자리에 맞춘 `{ title, description, imageUrl, url }`, 빠진 칸은 기본값)을 더할 수 있다. 안 넘기면 예전과 같다. 입력값은 넣지 않는다(6장).
