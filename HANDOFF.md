# 인계 문서 (2026-10-16 갱신, 15단계 G3)

다른 세션(Claude Code 클라우드 세션 등)에서 이 저장소 작업을 이어 갈 때 먼저 읽는 문서다.
규칙은 **CLAUDE.md**가 기준이고, 이 문서는 현재 상태와 일하는 요령만 적는다. 둘이 다르면 CLAUDE.md가 이긴다.

## 1. 지금 상태 한눈에
- 제품은 하나다: `products/strange-oracle` "낯선 점술관". 일곱 점술 방(Ⅰ 만신 → 오검 → 별 → 데칸 → 촐킨 → 룬 → 시빌라, 결정 91)을 돌고 결과를 모아 "나의 이야기"와 "한 권의 책"(12장)으로 엮는다.
- 14단계(일곱 번째 방·결제 복귀)는 F7 QA까지 마쳤고, 지금은 **15단계(페이앱 결제)** 개발 중이다. G1(디자인)·G2(서버)·G3(화면)이 끝났고 다음은 G4(copywriter 문구·legal 결제 문단·index.html [초안] 정리) → G5(UI 점검) → G6(QA)이다. G7(실결제·live)은 운영자 몫이다(specs 15-9).
- **수익 구조(14단계, 결정 85·94)**
  - 광고는 걷어 냈다(14-2). GA4 분석만 남는다(ID가 비면 아무것도 불러오지 않음).
  - 책 12장 가운데 유료 10장을 3,900원에 판다. **15단계부터 페이앱 결제(개인판매자)**다(결정 96~100, specs 15단계). 여는 글·닫는 글은 무료. 옛 외부 플랫폼(포스타입) 구매처·`pay.stores`·`pay.verify`는 지웠다.
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
7. **배포를 막지 않는 정리 4건**(QA 13단계 권장)
   - 옛 결제 주석
   - 궁합 엿보기 문장에 "당신은…"이 섞이는 것(data-book-bond.js `peekLine`)
   - 반항아×전사 본문의 일 예시가 비동료 유형에도 나오는 것
   - data.js 오류 문구 키 이름 `receipt`

## 4. 빌드·시험
```
node tools/build-dist.js                       # dist/public 생성 + 점검(pay.mode off · 유료 문장 지문 누출 0 · api/_paid/__dev 없음 · 첫 화면 책 파일 0). 실패하면 exit 1 → Netlify 배포도 멈춤
node --test "tools/strange-oracle/*.test.js"    # 단위 시험 (glob을 따옴표로 감쌀 것. 폴더만 주면 Node 24에서 실패)
node tools/strange-oracle/mock-server.js --port 8788 --mode test  # 시험 페이지 = e2e가 쓰는 서버 (백그라운드). off는 배포판과 같음
node tools/strange-oracle/e2e-saju.js
node tools/strange-oracle/e2e-book.js           # 결제한 탭으로 책 12장
node tools/strange-oracle/e2e-flow.js reduced   # motion도 있음
node tools/strange-oracle/e2e-pay.js            # 15단계 결제 흐름(test, 이동·팝업, 약 4~5분) + off 배포판 DOM 0 (off 서버 8791을 스스로 띄우고 끔)
node tools/strange-oracle/perf.js               # 14-6 성능 (몇 분 걸림)
node tools/strange-oracle/make-pass.js 1        # 운영자용: 열람 코드·해시를 터미널에만 찍음 (저장소·문서에 적지 말 것)
```
- 마지막으로 확인한 수치(2026-10-16 15단계 G3): 단위 89, e2e-saju 41, e2e-book 54, e2e-flow reduced 127, motion 128, e2e-pay 62, 모두 실패 0. e2e-ads는 은퇴(광고 제거). 성능은 tests.md 「14단계 · 성능」(첫 화면 등 미달 항목 있음).
- **결제 시험(15단계, 모의 서버 test에만):** 가짜 SDK `/__dev/payapp-lite.js`(data.js 응답에서만 SDK 주소·userid를 바꿈), 가짜 결제창 `/__dev/payapp/checkout`(모양 = `tools/strange-oracle/payapp-mock.html`, designer 견본 `payapp-checkout.sample.html`과 단추 이름만 다름), 스위치 `/__dev/pay-switch?win=redirect|popup&sdk=ok|fail&store=ok|fail-read|fail-write&env=…&late=<ms>&limits=reset`, 저장소 보기 `/__dev/pay-store`(`?clear=1`). e2e 시작 때 `limits=reset`·`clear=1`을 부른다.
- **화면 시험 브라우저:** e2e는 tools/strange-oracle/cdp.js로 헤드리스 **Microsoft Edge**를 띄운다. 경로는 `EDGE_PATH` 환경 변수이고, 없으면 윈도우 기본 경로를 쓴다. 리눅스 클라우드에서는 Chrome·Chromium 경로를 `EDGE_PATH`에 넣어야 할 수 있다(미확인).
- **시험 페이지 = 모의 서버 지름길(모의 서버에만 있음, 배포 폴더·본 페이지에는 없음, 결정 89):** `http://127.0.0.1:<포트>/__dev/skip`은 일곱 방을 마친 상태로 시작한다. `?rooms=N`(새 순서 앞 N개), `?paid=1`(시험 열람 상태, test 모드에서만), `?to=book`(목차)·`?to=hub`, `?legacy=1`(옛 상태). 예: `/__dev/skip?rooms=7&paid=1&to=book` = 12장 모두 열림. 모의 열람 코드는 서버를 켤 때마다 새로 만들어 터미널에만 찍는다.
- **모의 서버 재시작:** 문구·코드를 고친 뒤에는 build-dist를 다시 하고 서버를 재시작한다(test 모드는 data.js의 pay.mode를 응답할 때만 test로 바꾸고 파일은 고치지 않는다). 포트 8787은 쓰지 않는다.

## 5. 문구를 고칠 때 지켜야 할 순서
- **책 유료 문장의 유일한 원본은 `products/strange-oracle/api/_paid/book/book-*.js`다(14-4).** 방별 장 7개(`book-saju`…`book-sibyl`), `book-flow`(시기별 흐름), `book-match`(궁합 + 궁합 다양화 `bond`, 관계 유형 4개: lover·friend·work·family), `book-arch`(원형 심층).
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
