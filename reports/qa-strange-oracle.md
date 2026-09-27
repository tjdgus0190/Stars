# QA 보고서: strange-oracle (2026-09-27, 1차 검수)

검수 범위: 1단계 중 1-A · 1-B · 1-C1 · 1-C2 (허브, 룬의 방, 별의 방, 나의 이야기). 1-D 마케팅 자산(promo/, marketing/)은 아직 만들어지지 않았으므로 범위 밖(폴더 부재 확인함).

## 판정: 배포 가능

## 검수 방법 요약
- 문서: CLAUDE.md, agents/qa-reviewer.md, specs/strange-oracle.md, design/strange-oracle.md(UI 점검 포함), products/strange-oracle/tests.md, CREDITS.md, reports/copy-strange-oracle.md 전체 읽음.
- P6(금지 콘텐츠): (1) 죽/사망/사고/병/질병/건강/투자/주식/코인/로또/도박/반드시/100%/적중/소름/공식 검사 등 grep → 걸린 문장 전부 문맥과 함께 읽어 판정, (2) 룬 3개(페후·하갈라즈·알기즈)·나크샤트라 3개(아슈위니·바라니·슈라바나) 전문 정독으로 톤·4장 구조·긍정 마무리 확인, (3) 스크립트(advice-check.js)로 룬 24개·나크샤트라 27개 advice(넷째 장) 마지막 단락을 전부 추출해 훑음 — 51개 전부 실행 가능한 긍정 조언으로 끝남.
- 글자 수 한도: 운영자 제공 limits.js를 data-runes.js·data-stars.js에 실행 → "한도 초과 없음".
- 동작 확인: 헤드리스 Edge(CDP 드라이버, scratchpad/cdp.js 재사용)로 직접 시나리오를 구동해 스크린샷·콘솔 로그·네트워크 로그를 확인함(아래 R8 상세 참조). scratchpad/f-rune.html·f-star.html·flow-harness.html은 운영자·designer가 만든 결과물(flow-rune2.png 등)을 대조용으로만 읽었고, 내 자체 검증은 scratchpad/qa-edge*.js로 새로 작성해 index.html을 직접 구동했다(제품 코드는 건드리지 않음).
- 제품 코드·문구는 전혀 수정하지 않았음. 만든 파일은 모두 scratchpad 안(qa-edge*.js, qa-r*.png, advice-check.js)과 이 보고서, meta.json뿐.

## 결과표
| 번호 | 항목 | 결과 | 근거 | 비고 |
|---|---|---|---|---|
| P1 | 개인정보 | 통과 | app.js:72-112(sessionStorage 한 칸만 사용, load/save/clearAll), app.js 1-10 주석, index.html의 privacy-notice·saved-info·clear-dialog 마크업. `grep fetch(\|XMLHttpRequest\|sendBeacon\|localStorage\|document.cookie` app.js·astro.js·index.html → 주석 한 줄 외 0건 | 헤드리스로 "내 정보 지우기" 실행 후 `sessionStorage.getItem('strange-oracle')` → null 확인(qa-r6). 공유 클릭 시 네트워크 요청 0건 확인(qa-edge4) |
| P2 | 비밀정보 | 통과 | `grep -niE "password|secret|api[_-]?key|access[_-]?token"` app.js·astro.js·data.js·index.html·style.css → 0건. SRI 무결성 해시(sha384)만 있고 실제 키는 없음 | |
| P3 | 제휴 표기 | 해당 없음 | `grep -rni coupang` 전체 0건. specs 운영자 결정 5번대로 이번 제품은 쿠팡 파트너스 미사용 | |
| P4 | 광고 배치 | 통과 | index.html의 `data-ad="hub/result-mid/result-end/story-end"` — 결과 화면 스크롤 전체 기준 2개(result-mid+result-end), 허브 1개, 나의 이야기 1개. "눌러주세요" 류 문구 0건. 1단계는 ads.js 미연결(레이아웃만, specs "이번에 만들지 않을 것"과 일치) | |
| P5 | 면책 문구 | 통과 | common/disclaimer.js(CLAUDE.md 8장 문구와 완전히 동일), app.js:670,983에서 룬·별 결과 화면에 Disclaimer.mount 호출 | |
| P6 | 금지 콘텐츠 | 통과 | 위 "검수 방법 요약" 참조. [초안] 리터럴 0건(`grep -rn "\[초안\]"` 전체 0건). "죽음" 언급은 나크샤트라 바라니 항목에서 신화 속 야마 신 설명(신화적 서술, 사용자에 대한 예언 아님)으로 한정, 회피형 표현 없음 | 아래 "권장 사항"에 "반드시" 표현 관련 관찰 기록(위반은 아님) |
| P7 | 저작권 | 통과 | CREDITS.md — 글꼴 3종(jsdelivr fontsource, OFL 1.1, 버전·주소·SRI 명시), Astronomy Engine 2.1.19(MIT, 주소·SRI), 라히리 아야남샤 계산 출처(Swiss Ephemeris 정의값+IAU 2006 세차), 이미지(CSS/SVG/Canvas 직접 제작, 외부 이미지 없음), 문구 출처 모두 기록됨 | |
| P8 | 동작 | 통과 | 헤드리스 Edge로 아래 흐름을 전부 구동, 콘솔 에러 0건: 허브→룬 시작→입력→의식→결과→공유→나의 이야기, 허브→별 시작→입력→의식→결과→공유→나의 이야기, 잘못된 날짜 2건, 내 정보 지우기. 공유 카드는 canvas를 직접 가로채 1080×1920 PNG로 저장해 육안 확인(qa-r12 별, qa-r14 룬, qa-r13 나의 이야기) — 레이아웃·안전영역·글자 정상, 룬 SVG 획 3종 모두 서로 다르게 렌더링됨 | 결과 유형 "전체 도달"은 24종 SVG 심볼-데이터 이름 일치를 코드로 확인(index.html symbol 24개 = data-runes.js code 24개), 27개 나크샤트라는 tests.md T5/S1에서 이미 전수 확인됨 |
| R1 | 360px/480px 레이아웃 | 통과 | 360px: 허브·룬 결과(10자 이름)·별 입력(오류)·지운 뒤 허브 스크린샷 확인. 480px: 이번 검수에서 새로 촬영(qa-r8 허브, qa-r9 별 결과 전체) — 두 경우 모두 가운데 정렬, 잘림·겹침 없음. design.md UI 점검에서 "미확인"으로 남아 있던 480px을 이번에 해소함 | |
| R2 | 이미지 200KB 이하 | 통과 | og-image.png 95,176바이트(93KB). 그 외 래스터 이미지 없음(CREDITS.md, CSS/SVG/Canvas만 사용) | og-image.png은 CLAUDE.md 4장 필수 파일명이 PNG로 지정되어 있어 예외로 봄 |
| R3 | title/description/og/og-image | 통과 | index.html 7-12줄, data.js TEXT.meta와 문자열 일치(copy 보고서에서 이미 동기화 확인, 이번에 재대조) | |
| R4 | 소개 글 300자 이상 | 통과 | hub.about 4문단, 태그 제외 659자(직접 스크립트로 셈) | |
| R5 | tests.md 케이스 3개 이상·자릿수 일치 | 통과(단서 있음) | tests.md에 M1-M4, A1, S1, T3-T5, K1-K1b, R1, B1-B2 등 20개 이상 케이스. 달·태양·장동은 검증된 라이브러리(Astronomy Engine) 사용이라 CLAUDE.md 3장상 "직접 구현 시 자릿수 일치" 규정 대상이 아니고, 라이브러리 정확도 명세(60″)로 대조함 | 라히리 아야남샤(직접 구현분)는 Meeus 교과서에 해당 예제가 없어 Swiss Ephemeris(검증된 별도 오픈소스 구현체)와 1″ 이내로 대조함 — 교과서 대조는 아니지만 합리적 대체 검증으로 판단. 운영자가 이 판단에 동의하는지 확인 권장 |
| R6 | 기획서 범위 초과 없음 | 통과 | OPEN_ROOMS=["rune","star"]만 열림, products/strange-oracle/promo·marketing/strange-oracle 폴더 없음(`ls` 확인), 결제/PG 관련 코드 0건(주석 1건 "1단계: 결제 없음"만) | |
| R7 | design.md UI 점검 기록·통과 | 통과 | design/strange-oracle.md "UI 점검(2026-09-27, 1차)" 판정 통과. 남은 조건("움직임 줄이기 켬/끔 재캡처")은 flow-rune2.png(21:04, style.css 최종 수정 21:01 이후 촬영)로 해소된 것으로 보임 — 룬 획·장 머리 모두 정상 렌더링 확인 | |
| R8 | 예외 상황 | 통과 | 시각 모름 후보 2개(1995-03-15)·3개(1995-03-17): tests.md T4/T4b/B2에서 헤드리스로 이미 검증됨(재확인 취지로 결과값만 대조, 코드 재실행은 안 함). 잘못된 날짜 2/30·1899년: 이번에 직접 구동 → 오류 문구 표시, 입력 화면 유지, 크래시 없음(qa-r3, qa-r4). 이름 10자: 룬 결과 제목 정상 표시(qa-r1), 별 결과 캡처 카드 메타(28자 제한, 10자 이름이면 33자로 초과하는 것을 copy 보고서가 지적한 건)는 실제로는 `text-wrap:balance`로 두 줄에 고르게 꺾여 레이아웃이 깨지지 않음을 확인(qa-r7) — copy 보고서의 "확인 필요"를 이번에 해소. 이름 없음: 제목이 "당신의 세 개의 룬"으로 정상 전환, 이름 룬 인셋 자체가 DOM에 생성되지 않음(app.js:646-649, 정상 동작). 내 정보 지우기: sessionStorage 삭제, 허브 이동, 토스트 표시, 입력값 초기화 모두 확인(qa-r6) | |

## 수정 필요 항목 상세
없음.

## 권장 사항
1. **"반드시" 표현**: data-runes.js·data-stars.js의 넷째 장(다음) 조언에 "폭풍은 반드시 지나갑니다", "결실은 반드시 옵니다" 등 격려성 문장에 "반드시"가 여러 번 쓰였다. CLAUDE.md 8장의 "반드시 ~한다처럼 단정하지 않는다" 규정은 문면상 "나이·시기별 흐름(예지형)" 콘텐츠에 걸려 있고, 이번 1단계 룬·나크샤트라 콘텐츠는 나이대 예지가 아니라 일반적 격려 문장이라 위반으로 보지는 않았다. 다만 6단계 유료 리포트(나이·시기별 흐름)를 쓸 때는 이 표현 습관을 그대로 가져가지 않도록 copywriter가 유의할 것을 권한다.
2. **R5 단서**: 라히리 아야남샤 자체 구현분의 검증 기준(Swiss Ephemeris 대조)이 CLAUDE.md 3장이 말하는 "교과서 예제 값 대조"의 정신에 부합하는지는 판단이 갈릴 수 있는 부분이라, 운영자가 tests.md의 해당 근거(정의점 출처, IAU 2006 세차식)를 한 번 훑어보길 권한다.
3. **share-buttons.js 미존재**: docs/common.md 기준 아직 프로젝트 전체에 share-buttons.js가 없다(strange-oracle도 share-card.js의 자체 share() 함수만 사용). 위반은 아니지만(spec에 이 부품이 필요하다는 언급 없음), 다음 제품에서 카카오톡 공유 등을 붙일 때 공통화가 필요하면 참고할 것.
4. **UI 점검 잔여 확인 항목**: design.md UI 점검이 "확인 안 됨"으로 남긴 것 중 480px과 공유 카드 안전영역은 이번 QA에서 직접 확인해 해소했다(위 R1·P8 참조). "나의 이야기 방 0개 화면"은 이번 QA에서 별도로 스크린샷 촬영은 하지 않았음(코드상 `.is-empty` 분기와 `공유 버튼 숨김` 로직은 app.js에서 확인했으나 렌더링 결과 캡처는 안 함) — 운영자가 실제 기기로 한 번 보는 것을 권장.

## 확인하지 못한 것과 이유
- "나의 이야기" 방 0개(첫 방문) 화면의 실제 렌더링 스크린샷 — 코드 로직만 확인, 시간 관계상 캡처는 생략. 배포를 막을 사안은 아니라고 판단했으나 운영자 확인을 권장.
- M2(태양 겉appent 황경)의 Meeus 책 인쇄값 원문 대조 — tests.md에도 "미확인"으로 이미 명시돼 있고, 이번 QA에서 새로 확인할 방법이 없어 그대로 남김.
- 실제 기기(터치스크린, 모바일 브라우저별 공유 시트)에서의 동작 — 헤드리스 Edge와 PC 에뮬레이션으로만 확인했다. navigator.share가 없는 환경(헤드리스)에서는 항상 "다운로드" 경로로 빠지므로, 실기기의 공유 시트 자체는 못 봤다.
- 검색 키워드 실제 검색량, 광고 심사 통과 여부 등은 QA 항목이 아니라 원래도 확인 대상이 아님.

## 운영자가 브라우저로 직접 확인할 것
- "나의 이야기" 방 0개 화면(허브에서 다른 방을 거치지 않고 바로 나의 이야기로 들어갔을 때).
- 실제 모바일 기기에서 카카오톡 등 공유 시트 동작, 저사양 기기에서의 애니메이션 성능(design.md "developer 요청 12"와 동일 사안, 이번 QA 범위 밖).
- 이 보고서의 스크린샷은 모두 `scratchpad/qa-r*.png`에 있으니 참고 가능(제품 폴더에는 없음).

---
## 완료한 것
- CLAUDE.md·agents/qa-reviewer.md 기준 P1~P8(필수)·R1~R8(권장) 전 항목 검수.
- data-runes.js·data-stars.js 글자 수 한도 검사(스크립트), 금지 콘텐츠 grep + 표본 정독(6개 항목 전문) + advice 51개 전수 훑기.
- 헤드리스 Edge로 정상 흐름 2종(룬·별) + 예외 흐름 6종(이름10자, 이름없음, 날짜오류 2건, 정상흐름 후 지우기, 공유카드 3종) 직접 구동·검증.
- 이전 design.md UI 점검에서 "미확인"으로 남았던 480px 레이아웃과 공유 카드 안전영역을 이번에 확인해 해소.

## 만들거나 수정한 파일
- reports/qa-strange-oracle.md (신규)
- products/strange-oracle/meta.json (status: 개발 → 검수통과)
- (제품 코드·문구는 수정하지 않음. scratchpad 안에 qa-edge*.js 6개, advice-check.js, qa-r*.png 14개를 만들었으나 이는 제품 폴더 밖의 임시 검수 도구/증빙임)

## 운영자가 확인·판단할 것
- 위 "권장 사항" 1~4번, "확인하지 못한 것과 이유", "운영자가 브라우저로 직접 확인할 것" 참조.
- 배포 가능 판정이지만, 이번 제품은 1단계(룬·별 두 방)만의 범위이며 오검·시빌라·촐킨·데칸은 여전히 "봉인된 방"으로 남아 있다는 점을 배포 공지에 참고할 것.

## 다음 단계 제안
- meta.json status를 "검수통과"로 바꿨으니, CLAUDE.md 11장 배포 가능 기준(og-image.png·소개글·면책문구·CREDITS.md 모두 존재, 이번에 확인함)을 최종 확인 후 운영자가 배포 진행.
- 1-D(프로모션 페이지·마케팅 영상) 착수 시 이번 화면을 소재로 쓰면 되며, 완료 후 별도 QA가 필요함(이번 보고서 범위 밖).
