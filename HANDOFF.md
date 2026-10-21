# 인계 문서 (2026-10-17 갱신, 17단계 I2)

다른 세션(Claude Code 클라우드 세션 등)에서 이 저장소 작업을 이어 갈 때 먼저 읽는 문서다.
규칙은 **CLAUDE.md**가 기준이고, 이 문서는 현재 상태와 일하는 요령만 적는다. 둘이 다르면 CLAUDE.md가 이긴다.

## 1. 지금 상태 한눈에
- 제품은 하나다: `products/strange-oracle` "낯선 점술관". 일곱 점술 방(Ⅰ 만신 → 오검 → 별 → 데칸 → 촐킨 → 룬 → 시빌라, 결정 91)을 돌고 결과를 모아 "나의 이야기"와 "한 권의 책"(13장, 17단계에 「인연의 장」 더함)으로 엮는다.
- **17단계(UI 다듬기·리포트 고도화, specs 17단계)**: I1(디자인)·I2(developer: 문구 도구 items.json·apply-17·check-17, book-yeon.js 키 구조·인연의 장 고르기(브라우저만)·make-volume, yeon-tpl 연결·첫 줄·마음 한 줄·결제 전 새 장 줄, 성능 측정, 17-9 작은 일)이 끝났다. 진행 기록은 `tools/strange-oracle/PROGRESS-17.md`, 결과는 tests.md 「17단계」. 지금 I3(copywriter: 유료 원본 book-yeon·heartLine·firstLine, data.js `book.yeon.*`·`book.heartLabel`·`pay.what.newBadge` [초안], index.html [초안] 정리)가 진행 중 → I4(UI 점검) → I5(QA).
  - 성능 17-10: 첫 화면 ①+② 5회 중앙값 3.26·3.23초로 3.0초 미달(CLS 0.002). 시도와 원인은 tests.md 「17단계 · 성능」. 기본값 92번대로 배포는 막지 않는다.
- **16단계(친구 궁합 지도, 결정 84·95·103, specs 16단계)**: H1(디자인)·H2(서버 friend-map)·H3(화면 map.js·data-map.js 키 구조·app.js 연결·build-dist ⑩~⑬·시험)이 끝났다. 다음은 H4(copywriter: data-map.js·data.js `map.*`·`hub.faq.map` 문구, legal 지도 구획, index.html `[초안]` 정리) → H5(UI 점검) → H6(QA). H7(Cloudflare·live)은 운영자 몫이다.
  - **본 페이지는 `map.mode = "off"`**: 지도 template·자리·FAQ 문답·clear 선택 칸이 index.html `<!-- map:on -->` 구획 안에 있고 build-dist가 걷어 낸다. map.js·data-map.js도 배포 폴더에 없다. `#join=` 주소는 해시만 지우고 무시한다.
  - 시험 페이지(모의 서버 `--mode test`)에서는 data.js 응답의 `map.mode`→test, `map.api`→`/__dev/map`이고, 지도 파일은 원본에서 내준다. 지도 파일은 결말·나의 이야기(지도 카드 자리)·입구 링크·`#join=`에서만 불러온다(첫 화면 요청 0).
  - 저장: localStorage `strange-oracle-mapkey`(주인 열람 키 하나) · sessionStorage `strange-oracle-map`(join·joined·del). 점수·배치·별명 막기·만 14세 확인은 map.js 안(브라우저)에서만.
- 14단계(일곱 번째 방·결제 복귀)는 F7 QA까지 마쳤고, 지금은 **15단계(페이앱 결제)** 개발 중이다. G1(디자인)·G2(서버)·G3(화면)이 끝났고 다음은 G4(copywriter 문구·legal 결제 문단·index.html [초안] 정리) → G5(UI 점검) → G6(QA)이다. G7(실결제·live)은 운영자 몫이다(specs 15-9).
- **수익 구조(14단계, 결정 85·94)**
  - 광고는 걷어 냈다(14-2). GA4 분석만 남는다(ID가 비면 아무것도 불러오지 않음).
  - 책 12장 가운데 유료 10장을 5,900원에 판다(19단계, 옛 3,900원). **15단계부터 페이앱 결제(개인판매자)**다(결정 96~100, specs 15단계). 여는 글·닫는 글은 무료. 옛 외부 플랫폼(포스타입) 구매처·`pay.stores`·`pay.verify`는 지웠다.
  - **결제 흐름(15-1·15-2):** 결제 전 화면 동의 → [결제하기]를 누르면 무작위 값 R(32자 16진수)을 sessionStorage `strange-oracle-payreq`(최근 3개)에 둔 **뒤에야** 페이앱 SDK를 불러 결제창을 연다(R은 `var1`) → 페이앱이 함수 `pay`(`/api/pay/feedback`)로 통보 → Netlify Blobs에 결제번호·상태·코드 해시만 기록 → `/api/pay/return`이 303으로 `#paid`에 돌려보냄 → 화면이 `/api/pay/status`에 R만 보내 열람 코드 P를 받고 `strange-oracle-pass`에 넣음 → 책이 열리고 코드 카드가 뜬다.
  - 결제 확인 화면 `#screen-paycheck`는 8상태(wait·checking·late·cancelled·noreq·busy·offline·sdkfail). 한 회차 30초·2초 간격·최대 17회, 회차는 하나만. 팝업 결제창이면 팝업이 원래 탭에 `postMessage({type:"so-paid"})`만 보내고 원래 탭이 묻는다.
  - 열람 코드는 다른 기기에서 "이미 샀어요 · 열람 코드 넣기"로 다시 연다. 코드를 잃으면 운영자가 `make-pass.js`로 수동 코드를 준다(15-5).
  - **본 페이지(배포판)는 `pay.mode = "off"`**: 결제 화면·책이 DOM에 없다. 결제는 시험 페이지(모의 서버 `--mode test`)에서만 시험한다. live 전환은 운영자 몫(specs 54·39·62번, 계획서 7장).
- **배포(결정 93, 14-5): GitHub 연결 Netlify.** 저장소 루트 `netlify.toml`이 `node tools/build-dist.js`로 `dist/public`을 만들고, 함수 두 개(`netlify/functions/book.js`, 15단계 `pay.js`)를 붙인다. 결제 기록은 Netlify Blobs 저장소 `strange-oracle-pay`. `@netlify/blobs` 11.1.4는 루트 package.json에 고정, Node 22.12 이상이 필요해 netlify.toml에 `NODE_VERSION = "22"`를 두었다(함수 실행 환경이 이 값을 따르는지는 미확인, 3장).
  - **배포 브랜치 흐름:** Netlify 운영 브랜치는 `release`다. **에이전트는 `main`에만 커밋하고 `release`는 만지지 않는다**(만들기·병합·push 모두 안 함). QA 판정이 "배포 가능"일 때만 **운영자가** `main`을 `release`에 병합하고 push한다 → Netlify가 빌드·배포한다. `main` 브랜치 배포·미리보기 배포는 끈다(14-5 운영자 설정 7가지).
  - GitHub 연결 첫 push 전에 저장소가 **비공개**인지 운영자가 확인한다(유료 원본이 저장소에 있음, 62번).
  - 에이전트는 배포·push·계정 작업을 하지 않는다(CLAUDE.md 10장).
- **유료 원본:** `products/strange-oracle/api/_paid/book/` 한 곳뿐이다. 공개 폴더에 들어가지 않고 함수 묶음(`included_files`)으로만 서버에 간다. 옛 토스 api·core.js·move-book은 지웠다(F4-B2). `paycode.js`는 이어가기 코드(SOG)와 열람 코드 모양(SOP)에 쓴다.

## 2. 문서 지도 (결정의 출처)
| 무엇 | 어디 |
|---|---|
| 기획·운영자 결정 1~82, 단계별 기획(6~13단계) | specs/strange-oracle.md ("운영자 결정 …" 절과 "## N단계" 절, 맨 끝 "운영자가 결정할 것") |
| 제안서(운영자 선택 전) | specs/proposal-strange-oracle-*.md |
| 디자인 명세·UI 점검 | design/strange-oracle.md |
| 기획 검수 / QA / 문구 기록 | reports/spec-review-strange-oracle.md, reports/qa-strange-oracle.md, reports/copy-strange-oracle.md |
| 시험 기록·표본 정의 | products/strange-oracle/tests.md |
| 단계별 개발 진행표 | tools/strange-oracle/PROGRESS-*.md |
| 역할별 지침 | agents/*.md (planner, designer, developer, copywriter, qa-reviewer) |
| 공통 부품 사용법 | docs/common.md |

## 3. 운영자가 아직 정하거나 넣어야 할 것
1. **법적 고지 ◯◯ 빈칸:** 문의 이메일, 개인정보 보호책임자 성명·연락처, GA4 보관 기간(개월), 국외 이전 세부(legal/terms.html, legal/privacy.html). 운영자 이름은 "SHA Studio", 시행일은 2026-10-03이다.
2. **배포 주소:** data.js `site.url`에 넣는다. 형식은 제품 페이지 전체 주소이고 "/"로 끝난다(예: `https://도메인/products/strange-oracle/`). 비어 있으면 build-dist가 경고한다.
3. **광고·분석 ID** (data.js 맨 위 `ads`, `analytics`)
   - GA4 `G-…`: 운영자는 GA4에서 "향상된 측정"을 반드시 꺼야 한다.
   - 애드센스 `ca-pub-…`와 배너 광고단위 3개(+ 책 목차 `book-toc`): 자동 광고는 끈다.
   - 애드 매니저 보상형 광고단위 `/네트워크코드/이름`
   - 애드센스 승인에는 자기 도메인이 필요할 가능성이 크다(미확인).
4. **카카오 애드핏·쿠팡 파트너스:** CLAUDE.md 3장 예외가 아직 구글뿐이라 쓸 수 없다. 운영자가 허용해야 하고, 쿠팡용 `affiliate.js`는 아직 없다.
5. **판단 대기**
   - 관계 유형만 바꿨을 때 궁합 문장 차이는 약 24%다. 더 키우려면 쌍 본문도 유형별로 써야 한다.
   - 판매가 없어졌으니 통신판매업 표시를 빼도 되는지는 법률 판단이다(운영자가 결정할 것 45번).
   - 쿠키·행태정보 고지가 법적으로 충분한지는 미확인이다(43번).
   - 간편 로그인(카카오 등)은 CLAUDE.md 3·6장 개정 전까지 보류한다(37번).
6. **페이앱 결제 live 전(15단계 G7, 15-6·15-7)**
   - 페이앱 가맹·업종 확인(64번)·결제수단 설정. data.js `pay.payapp.userid`·`shopname`, `pay.contact`(문의처), 판매자 정보 줄 `pay.seller.*`의 ◯◯, legal 3종의 ◯◯를 채운다(주석 안 메모의 ◯◯도 지운다 — ⑦은 원본 legal 전체를 본다). 비거나 ◯◯가 남으면 live 빌드가 멈춘다(build-dist ⑦).
   - `pay.payapp.openpaytype`의 간편결제 코드 목록(지금 `card,kakaopay,naverpay,smilepay,applepay,payco`)이 페이앱 개발 문서와 맞는지 확인한다(미확인, 72번). 휴대폰·가상계좌·계좌이체 코드는 넣지 않는다.
   - **Netlify 환경 변수(이름만, 값은 저장소·문서에 쓰지 않는다):** `PASS_MODE`(live), `PAYAPP_USERID`, `PAYAPP_LINKKEY`, `PAYAPP_LINKVAL`, `PASS_SECRET`(무작위 32바이트 이상, 한 번 정하면 바꾸지 않음), `BOOK_PASS_HASHES`(수동 코드), `SITE_URL`(return이 돌려보낼 제품 페이지 주소), `PAY_DEBUG_FIELDS`(실결제 시험 ⑦ 동안만 1).
   - 첫 배포 뒤 Netlify 화면에서 함수 `pay`·`book`의 Node 런타임이 22 이상인지 확인한다(미확인). 아니면 런타임 지정을 운영자가 Netlify 화면에서 고른다.
   - 실결제 1건 + 취소(15-6 ①~⑧, 특히 ⑥ returnurl 본문에 linkkey·linkval이 없는지). 결과는 tests.md 「15단계 · 실결제」에 날짜와 통과 여부만.
   - 그 뒤 data.js `pay.mode`를 live로, build-dist ③ off 가드를 live 허용으로 함께 고친다(⑦ live 가드는 남긴다).
   - **legal 결제 문단·refund.html(15단계 QA 1차 필수 1):** 주석을 풀 일은 없다. legal 결제 문단·목차 줄은 `<!-- pay:on -->…<!-- /pay:on -->`, 결제가 꺼진 판의 짝 문장(제1조 "결제 없음" 등)은 `<!-- pay:off -->…<!-- /pay:off -->` 표지 안에 있고, build-dist가 `pay.mode`대로 한쪽을 걷어 낸다(`tools/pay-sections.js`, off는 index.html 결제 template도 걷어 냄). `legal/refund.html`은 **mode live일 때 build-dist가 배포 폴더에 자동으로 넣는다**(off에서는 빠짐). live 빌드 뒤 확인: ① `dist/public/products/strange-oracle/legal/refund.html`이 있다 ② privacy·terms에 제4조의3·제2조의2가 보이고 "결제를 받지 않으므로"가 없다 ③ build-dist ⑦이 refund.html 없음·pay:on 구획 없음·배포판 legal ◯◯를 잡는다. 시험 페이지(모의 서버 `--mode test`)는 같은 함수로 결제 문단과 refund.html을 내준다.
7. **친구 궁합 지도 서버 배포(16단계 H7, specs 16-5의 6·16-10, 운영자만 — CLAUDE.md 10장)**
   - 코드: `products/strange-oracle/friend-map/`(core.js·worker.js·words.js·schema.sql·wrangler.toml). 이 폴더는 build-dist가 배포 폴더에 넣지 않는다. 에이전트는 운영 중인 D1을 읽거나 고치지 않는다.
   - wrangler는 저장소에 설치하지 않고 운영자 PC에서 `npx wrangler@4.151.1`로 쓴다(2026-10-17 npm 최신으로 확인한 버전. `.wrangler/` 폴더가 생기면 커밋하지 않는다). 아래 명령은 모두 `products/strange-oracle/friend-map/` 폴더에서 실행한다.
   1. Cloudflare 가입(결제 수단 없이 Workers Free, 74번). 무료 요금제에서 Cron Trigger·Rate Limiting을 쓸 수 있는지, 한도 초과 때 과금이 없는지 확인한다(미확인).
   2. `npx wrangler@4.151.1 login`
   3. `npx wrangler@4.151.1 d1 create strange-oracle-map` (위치 힌트는 75번 결정대로, 예: `--location apac`) → 출력된 `database_id`를 wrangler.toml의 `database_id = ""`에 넣는다(비밀값은 아니지만 16-9의 15대로 저장소에는 커밋하지 않는다 — 배포하는 PC의 작업 사본에서만 채우고, `map.test.js`가 저장소의 빈 값을 확인한다).
   4. `npx wrangler@4.151.1 d1 execute strange-oracle-map --remote --file=schema.sql` (표 maps·friends·quota)
   5. wrangler.toml `[vars]`: `ALLOWED_ORIGIN`에 본 사이트 출처 하나(예: `https://도메인`, 경로·끝 `/` 없이), `MAP_MODE = "live"`. 둘 중 하나라도 비거나 live가 아니면 Worker는 모든 요청에 503을 준다. (저장소의 wrangler.toml은 빈 값·off로 둔다 — 배포 때만 바꾸거나 `--var`로 넘긴다.)
   6. Cron: wrangler.toml `[triggers] crons = ["17 3 * * *"]`(하루 한 번 만료 정리)가 배포와 함께 등록된다. 무료에서 안 되면 읽을 때 정리만으로도 만료 지도는 404·삭제된다(처리방침 문구 확인).
   7. 로그: `[observability] enabled = false`를 유지한다. Cloudflare 화면에서도 Workers Logs·Logpush가 꺼졌는지 본다.
   8. (선택) Rate Limiting이 무료로 되면 wrangler.toml 맨 아래 `[[ratelimits]]` 주석을 풀고 `namespace_id`(운영자가 정하는 정수)를 넣는다.
   9. `npx wrangler@4.151.1 deploy` → 나온 Worker 주소(`https://….workers.dev`)를 data.js `map.api`에 넣는다(비밀값 아님).
   10. 실제 Worker로 한 바퀴(만들기·참여·보기·지우기, 다른 출처·Origin 없음 403) 확인 → `map.mode` live와 build-dist ⑩ 해제(16-8) → `release` 병합·push.
   - API 토큰·계정 ID는 저장소·문서에 쓰지 않는다. 비밀 환경 변수는 0개다(해시는 비밀값 없이 SHA-256).
8. **배포를 막지 않는 정리 4건**(QA 13단계 권장)
   - ~~옛 결제 주석~~ (17단계 I2에서 정리)
   - 궁합 엿보기 문장에 "당신은…"이 섞이는 것(data-book-bond.js `peekLine`)
   - 반항아×전사 본문의 일 예시가 비동료 유형에도 나오는 것
   - ~~data.js 오류 문구 키 이름 `receipt`~~ (17단계 I2: `resume.errors.notResume`)

## 4. 빌드·시험
```
node tools/build-dist.js                       # dist/public 생성 + 점검(pay.mode off · map.mode off(⑩~⑬) · 유료 문장 지문 누출 0(data-map.js 포함) · api/_paid/__dev·friend-map 없음 · 첫 화면 책 파일 0). 실패하면 exit 1 → Netlify 배포도 멈춤
node --test "tools/strange-oracle/*.test.js"    # 단위 시험 (glob을 따옴표로 감쌀 것. 폴더만 주면 Node 24에서 실패)
node tools/strange-oracle/mock-server.js --port 8788 --mode test  # 시험 페이지 = e2e가 쓰는 서버 (백그라운드). off는 배포판과 같음
node tools/strange-oracle/e2e-saju.js
node tools/strange-oracle/e2e-book.js           # 결제한 탭으로 책 14장(인연의 장·새 장 포함) + (18단계) 미리보기·잠긴 장 네 길·상태표·#preview·관심사·이벤트 값
node tools/strange-oracle/e2e-flow.js reduced   # motion도 있음
node tools/strange-oracle/e2e-map.js            # 16단계 친구 지도(브라우저 둘 = 주인·친구, 약 2분) + off 배포판 DOM 0 (off 서버 8792를 스스로 띄우고 끔)
node tools/strange-oracle/e2e-pay.js            # 15단계 결제 흐름(test, 이동·팝업, 약 4~5분) + off 배포판 DOM 0 (off 서버 8791을 스스로 띄우고 끔)
node tools/strange-oracle/perf.js               # 14-6·17-10 성능 (몇 분 걸림, 첫 화면 5회+CLS). --first면 첫 화면만
node tools/strange-oracle/off-diff-18.js        # (18단계) 시작 커밋과 지금 코드의 첫 화면 파일·바이트, off 화면 글자·DOM 대조 (준비는 파일 머리 설명)
node tools/strange-oracle/make-pass.js 1        # 운영자용: 열람 코드·해시를 터미널에만 찍음 (저장소·문서에 적지 말 것)
```
- 마지막으로 확인한 수치(2026-10-18 18단계 J2): 단위 168(cross.test.js 13 포함, 240만 조합 시험이 30~60초), e2e-saju 41, e2e-book 96, e2e-pay 69, e2e-map 80, e2e-utm 29, e2e-flow reduced 127·motion 128, make-volume 불일치 0, build-dist 통과, off-diff-18 off 화면 20개 차이 0, 모두 실패 0.
- 그 전 수치(2026-10-17 17단계 I2): 단위 151, e2e-saju 41, e2e-book 59, e2e-pay 68, e2e-map 80, e2e-flow reduced 127·motion 128, make-volume 불일치 0, build-dist 통과, 모두 실패 0. (e2e-map 화면 합계가 예전에 1 많게(78) 찍히던 식을 고침 — 파일 합계 77이 맞았다.) e2e-pay·e2e-map은 따로따로 돌리고, 끊으면 `/__dev/map-switch?down=0&limits=reset`.
- 그 전 수치(2026-10-17 16단계 H3): 단위 140(map-score 11 포함), e2e-map 78, e2e-saju 41, e2e-book 54·e2e-pay 67(둘 다 지도 `down=1` 상태로), e2e-flow reduced 127, motion 128, 모두 실패 0.
- **친구 지도 시험(16단계, 모의 서버 test에만):** 지도 요청 `POST /__dev/map/<create|join|peek|view|erase>`, 스위치 `/__dev/map-switch?down=1|0&slow=<ms>&clock=+91d|0&cap=<n>|default&limits=reset`, 저장소 보기 `/__dev/map-store`(`?clear=1`), 지름길 `/__dev/skip?rooms=7&join=<22자>&birth=YYYY-MM-DD`. e2e는 **127.0.0.1**로 연다(localhost면 403). 모의 서버는 map.js·data-map.js를 원본에서 읽으므로 그 두 파일은 고쳐도 재시작이 필요 없지만, app.js·data.js는 build-dist 뒤 재시작해야 한다.
- 그 전 수치(2026-10-16 15단계 G3): 단위 89, e2e-saju 41, e2e-book 54, e2e-flow reduced 127, motion 128, e2e-pay 62, 모두 실패 0. e2e-ads는 은퇴(광고 제거). 성능은 tests.md 「14단계 · 성능」(첫 화면 등 미달 항목 있음).
- **결제 시험(15단계, 모의 서버 test에만):** 가짜 SDK `/__dev/payapp-lite.js`(data.js 응답에서만 SDK 주소·userid를 바꿈), 가짜 결제창 `/__dev/payapp/checkout`(모양 = `tools/strange-oracle/payapp-mock.html`, designer 견본 `payapp-checkout.sample.html`과 단추 이름만 다름), 스위치 `/__dev/pay-switch?win=redirect|popup&sdk=ok|fail&store=ok|fail-read|fail-write&env=…&late=<ms>&limits=reset`, 저장소 보기 `/__dev/pay-store`(`?clear=1`). e2e 시작 때 `limits=reset`·`clear=1`을 부른다.
- **화면 시험 브라우저:** e2e는 tools/strange-oracle/cdp.js로 헤드리스 **Microsoft Edge**를 띄운다. 경로는 `EDGE_PATH` 환경 변수이고, 없으면 윈도우 기본 경로를 쓴다. 리눅스 클라우드에서는 Chrome·Chromium 경로를 `EDGE_PATH`에 넣어야 할 수 있다(미확인).
- **시험 페이지 = 모의 서버 지름길(모의 서버에만 있음, 배포 폴더·본 페이지에는 없음, 결정 89):** `http://127.0.0.1:<포트>/__dev/skip`은 일곱 방을 마친 상태로 시작한다. `?rooms=N`(새 순서 앞 N개), `?paid=1`(시험 열람 상태, test 모드에서만), `?to=book`(목차)·`?to=hub`, `?legacy=1`(옛 상태). 예: `/__dev/skip?rooms=7&paid=1&to=book` = 12장 모두 열림. 모의 열람 코드는 서버를 켤 때마다 새로 만들어 터미널에만 찍는다.
- **모의 서버 재시작:** 문구·코드를 고친 뒤에는 build-dist를 다시 하고 서버를 재시작한다(test 모드는 data.js의 pay.mode를 응답할 때만 test로 바꾸고 파일은 고치지 않는다). 포트 8787은 쓰지 않는다.

## 5. 문구를 고칠 때 지켜야 할 순서
- **책 유료 문장의 유일한 원본은 `products/strange-oracle/api/_paid/book/book-*.js`다(14-4).** 방별 장 7개(`book-saju`…`book-sibyl`), `book-flow`(시기별 흐름), `book-match`(궁합 + 궁합 다양화 `bond`, 관계 유형 4개: lover·friend·work·family), `book-arch`(원형 심층), `book-yeon`(17단계 인연의 장), `book-cross`(18단계 새 장 「겹치는 곳, 갈리는 곳」, 164항목). 함수 book 허용 목록 12개.
  - (18단계 18-6, 결정 117) **방 장 첫 줄(firstLine) 169개는 공개 맛보기 `products/strange-oracle/data-book-sample.js`로 옮겼다.** 유료 원본에는 firstLine 키가 없다(원본 한 벌). 첫 줄을 고칠 때는 이 파일에서 고친다(`apply-17.js`의 `first-<방>-<n>` 묶음도 이 파일에 넣는다). 미리보기와 책 장 첫 쪽이 같은 값을 쓴다.
  - (18단계) 새 장 문구는 `node tools/strange-oracle/apply-17.js --stage 18 <묶음>` → `node tools/strange-oracle/check-17.js --stage 18`(진행 폴더 `tools/strange-oracle/copy-18/`, 사용법 copy-17/README.md 「18단계」 절). 고르기 규칙(18-2)은 브라우저 `book.js crossPick`, 원형 상수는 `arch-core.js`(지도와 공용, 첫 화면 밖).
  - 고치는 순서: 원본 수정 → `node tools/strange-oracle/make-volume.js`(분량 표 data-volume.js, 불일치 0) → `node tools/build-dist.js`(유료 문장 누출 0이어야 함).
  - 여는 글·닫는 글(무료 맛보기)은 공개 `products/strange-oracle/data-book-free.js`에서 고친다.
  - 유료 문장을 제품 폴더의 다른 파일(data.js 등)에 옮겨 적지 않는다(CLAUDE.md 7장). build-dist 지문 검사가 막는다.
  - 옛 `data-book-*.js`·`move-book.js`·`api/_paid/*.js`(옛 원본)는 F4-B2에서 지웠다(git 기록에는 남음).
- **화면 문구는 data.js에 있다.** 디자이너가 마크업에 `[초안]` 견본을 넣는다. 그래서 copywriter가 문구를 넣은 뒤에는 **index.html 정리가 꼭 필요하다**: data-t 요소는 확정 문구로 채우고, 남은 `[초안]`은 가장 안쪽 요소만 비운다. 이 정리를 빠뜨려 QA에서 떨어진 적이 있다. 빌드에 "[초안] 없음"이 떠야 한다.
- **결제 화면 문구(15단계)는 data.js `pay.*`에 있다.** G3가 키 구조를 15-7대로 바꾸고 새 문구는 `[초안]`(designer 견본 문장)으로 자리만 두었다. G4 copywriter가 채우고 index.html `[초안]`도 정리한다. 결제창 상품명·표지(`pay.payapp.goodname`·`tag`)는 문구가 아니라 설정이다(tag는 함수가 비교하니 바꾸지 않는다).
- **8장 콘텐츠 규칙이 엄격하다.** 건강 표현 26곳과 단정 표현 19곳을 걷어 낸 이력이 있다(reports/copy-strange-oracle.md). 새 문구에도 금지어 검색을 한다.

## 6. 일하는 방식 (지금까지 효과가 있었던 것)
- 흐름은 CLAUDE.md 9장 순서를 따른다: 기획 → 기획 검수 → 디자인 → 개발 → 문구 → UI 점검 → QA. 운영자 결정은 기획서에 "운영자 결정 N"으로 먼저 적는다. 재검수는 최대 3회다.
- **에이전트는 적게 쓴다.** 세션 한도가 자주 찼다. 동시에 최대 2개, 한 에이전트에 도구 호출 예산을 정해 준다. 짧은 문구 몇 줄 같은 작은 일은 에이전트 없이 직접 한다.
- **긴 개발 작업은 진행표(tools/strange-oracle/PROGRESS-N.md)를 먼저 만들게 한다.** 서버 과부하(529)나 한도로 끊겨도 이어서 할 수 있다.
- **커밋:** 단계마다 커밋하고, 커밋 메시지는 한국어로 쓴다. push는 운영자가 한다.

## 7. 다음에 할 만한 일
- 운영자가 ID·주소·◯◯ 값을 주면 data.js·legal에 넣고 build-dist로 검사한 뒤 `dist/public`을 다시 만든다.
- 위 3-6의 정리 4건.
- 출시 뒤 GA4 숫자(완주율, 장 열기 수)를 보고 다음 다듬기를 제안한다(specs/proposal-…).
