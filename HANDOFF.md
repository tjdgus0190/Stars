# 인계 문서 (2026-10-15 갱신, 14단계 F4-B2)

다른 세션(Claude Code 클라우드 세션 등)에서 이 저장소 작업을 이어 갈 때 먼저 읽는 문서다.
규칙은 **CLAUDE.md**가 기준이고, 이 문서는 현재 상태와 일하는 요령만 적는다. 둘이 다르면 CLAUDE.md가 이긴다.

## 1. 지금 상태 한눈에
- 제품은 하나다: `products/strange-oracle` "낯선 점술관". 일곱 점술 방(Ⅰ 만신 → 오검 → 별 → 데칸 → 촐킨 → 룬 → 시빌라, 결정 91)을 돌고 결과를 모아 "나의 이야기"와 "한 권의 책"(12장)으로 엮는다.
- 14단계(일곱 번째 방·결제 복귀) 개발 중이다. F4(developer)는 B1·B2까지 끝났고 다음은 F5(copywriter 문구) → F6(UI 점검) → F7(QA)이다. 13단계판은 배포하지 않았다(결정 92).
- **수익 구조(14단계, 결정 85·94)**
  - 광고는 걷어 냈다(14-2). GA4 분석만 남는다(ID가 비면 아무것도 불러오지 않음).
  - 책 12장 가운데 유료 10장을 3,900원에 판다(외부 플랫폼 + 열람 코드, specs/proposal-strange-oracle-payment-postype.md). 여는 글·닫는 글은 무료.
  - **본 페이지(배포판)는 `pay.mode = "off"`**: 결제 화면·책이 DOM에 없다. 결제는 시험 페이지(모의 서버 `--mode test`)에서만 시험한다. live 전환은 운영자 몫(specs 54·39·62번, 계획서 7장).
- **배포(결정 93, 14-5): GitHub 연결 Netlify.** 저장소 루트 `netlify.toml`이 `node tools/build-dist.js`로 `dist/public`을 만들고, 함수 하나(`netlify/functions/book.js`)를 붙인다. 본 페이지 = `dist/public` + 함수 `book`.
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
6. **배포를 막지 않는 정리 4건**(QA 13단계 권장)
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
node tools/strange-oracle/e2e-pay.js            # 결제 흐름(test) + off 배포판 DOM 0 (off 서버 8791을 스스로 띄우고 끔)
node tools/strange-oracle/perf.js               # 14-6 성능 (몇 분 걸림)
node tools/strange-oracle/make-pass.js 1        # 운영자용: 열람 코드·해시를 터미널에만 찍음 (저장소·문서에 적지 말 것)
```
- 마지막으로 확인한 수치(2026-10-15 F4-B2): 단위 63, e2e-saju 41, e2e-book 54, e2e-flow reduced 127, motion 128, e2e-pay 29, 모두 실패 0. e2e-ads는 은퇴(광고 제거). 성능은 tests.md 「14단계 · 성능」(첫 화면 등 미달 항목 있음).
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
