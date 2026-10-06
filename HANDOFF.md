# 인계 문서 (2026-10-06)

다른 세션(Claude Code 클라우드 세션 등)에서 이 저장소 작업을 이어 갈 때 먼저 읽는 문서다.
규칙은 **CLAUDE.md**가 기준이고, 이 문서는 현재 상태와 일하는 요령만 적는다. 둘이 다르면 CLAUDE.md가 이긴다.

## 1. 지금 상태 한눈에
- 제품은 하나다: `products/strange-oracle` "낯선 점술관". 세계의 여섯 점술 방(오검 → 별 → 데칸 → 촐킨 → 룬 → 시빌라)을 돌고 결과를 모아 "나의 이야기"와 "한 권의 책"으로 엮는다.
- meta.json status는 "검수통과"다. 가장 최근 QA는 **13단계 "광고로 여는 책" 배포 가능**이다(reports/qa-strange-oracle.md 맨 끝).
- **수익 구조(운영자 결정 69~82)**
  - 결제는 없다. 운영자에게 사업자등록이 없어 결제를 화면에서 걷어 냈다.
  - 무료판에 배너를 단다.
  - 방마다 "흐름 풀이" 한 단락과 책의 장 9개를 **보상형 광고 한 편으로 연다**(장 하나에 광고 하나).
  - 광고 키가 아직 없어서, 지금은 누르면 "지금은 보여 드릴 광고가 없어 그냥 열었어요"와 함께 바로 열린다(data.js `ads.lockAlways: true`).
- **배포:** 운영자가 Netlify에 `dist/public` 폴더를 끌어다 올린다. 에이전트는 배포·push·계정 작업을 하지 않는다(CLAUDE.md 10장).
- **서버 결제 코드:** `api/`, `api/_lib/core.js`, 토스 연동은 저장소에 휴면으로 남아 있고 배포 폴더에는 들어가지 않는다. `paycode.js`는 이어가기 코드가 쓰므로 살아 있다.

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
node tools/build-dist.js                       # dist/public 생성 + 점검([초안] 0, 첫 화면 책 문장 0, api·refund 없음)
node --test "tools/strange-oracle/*.test.js"    # 단위 시험 (glob을 따옴표로 감쌀 것. 폴더만 주면 Node 24에서 실패)
node tools/strange-oracle/mock-server.js --port 8788 --mode off   # e2e가 쓰는 서버 (백그라운드로 띄운다)
node tools/strange-oracle/e2e-book.js
node tools/strange-oracle/e2e-flow.js reduced   # motion도 있음
node tools/strange-oracle/e2e-ads.js            # 가짜 광고·분석 ID를 실행 중에만 넣고 구글 요청을 가로챈다. 실제 구글 전송 0
```
- 마지막으로 확인한 수치: 단위 51, e2e-book 60, e2e-flow reduced 126, motion 127, e2e-ads 55, 모두 실패 0.
- **화면 시험 브라우저:** e2e는 tools/strange-oracle/cdp.js로 헤드리스 **Microsoft Edge**를 띄운다. 경로는 `EDGE_PATH` 환경 변수이고, 없으면 윈도우 기본 경로를 쓴다. 리눅스 클라우드에서는 Chrome·Chromium 경로를 `EDGE_PATH`에 넣어야 할 수 있다(미확인).
- **시험 지름길(모의 서버에만 있음, 배포 폴더에는 없음):** `http://127.0.0.1:<포트>/__dev/skip`은 여섯 방을 마친 상태로 시작한다. `?rooms=3`이나 `?to=hub`도 쓸 수 있다.
- **모의 서버 재시작:** 서버는 시작할 때 파일을 읽어 둔다. 문구·코드를 고친 뒤에는 build-dist를 다시 하고 서버를 재시작한다.

## 5. 문구를 고칠 때 지켜야 할 순서
- **책 본문의 원본은 `api/_paid/*.js`다.** 공개 파일 `data-book-*.js`는 거기서 만든다.
  - 고치는 순서: 원본 수정 → `node tools/strange-oracle/move-book.js`(무손실 검사 포함) → `node tools/strange-oracle/make-volume.js`(분량 표, 불일치 0이어야 함).
  - data-book-*.js를 직접 고치면 다음 move-book 실행 때 덮인다.
- **궁합 다양화 문구는 `data-book-bond.js`다.** 원본에서 만드는 파일이 아니므로 직접 고친다(관계 유형 4개: lover·friend·work·family).
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
