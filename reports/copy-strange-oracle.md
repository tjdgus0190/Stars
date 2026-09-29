# 카피 변경 기록: strange-oracle

작성: copywriter, 2026-09-27 (9장 6단계 개발 — 문구). CLAUDE.md 8장, agents/copywriter.md, specs/strange-oracle.md·selling-strange-oracle.md, design/strange-oracle.md "텍스트 길이 제한"을 기준으로 작업했다.

담당 범위: products/strange-oracle/data.js 전체 문자열, index.html `<head>`의 title·description·og:title·og:description. data-runes.js·data-stars.js(룬·나크샤트라 본문)와 content-work/는 다른 copywriter 담당이라 건드리지 않았다.

## 작업 개요
- data.js에 남아 있던 [초안] 표시(그리드 점검 결과 121개)를 모두 실제 서비스 문구로 교체했다. 세션이 한 번 끊겼다가 재개됐는데, 재개 시점에는 운영자 쪽에서 이미 [초안] 0개 버전을 커밋해 둔 상태였다. 이번 재개 작업에서는 그 커밋본을 다시 읽어 (1) 길이 제한 재점검, (2) 금지 표현 재점검, (3) index.html head 동기화, (4) `node --check`, (5) 이 보고서 작성을 마무리했다.
- 파일 맨 위 설명 주석의 "[초안]" 언급도 "자리표시"로 바꿔 파일 전체에서 "[초안]" 문자열이 0개가 되도록 했다.
- 원형 8종(전사·현자·연인·반항아·돌봄이·탐험가·창조자·통치자)은 모두 "장점 한 가지 + 균형을 위한 사소한 약점 한 가지 + 공통 마무리 문장" 구조로 통일해, 특정 원형만 유독 좋거나 나쁘게 읽히지 않도록 했다.
- 허브 소개 글(hub.about)은 4문단·약 300자 이상으로, "룬 점"·"베다 점성술"·"나크샤트라"·"켈트 오검" 등 검색 키워드를 자연스럽게 2~3회 넣었다.
- 방 떡밥 문구(next.rune.star, next.star.rune)는 specs/selling-strange-oracle.md의 떡밥 문장 후보를 그대로 반영해 "다른 방이 궁금해지는" 스토리텔링 톤을 유지했다.
- 유료 안내 카드(story.paid)는 "3,900원 · 곧 열려요" 톤을 유지했고, "지금 결제" 같은 표현은 쓰지 않았다. 버튼 문구도 비활성 상태를 뜻하는 "곧 열려요"로 통일.
- 공유 카드 footer는 아직 배포 주소가 없어 "낯선 점술관"만 남기고, 실제 주소는 배포 시 developer가 붙이도록 주석으로 남겼다(주소를 지어내지 않음).

## UI 문구(data.js) 주요 변경 전/후

| 위치 | 변경 전([초안]) | 변경 후 |
|---|---|---|
| topbar.clear | `[초안] 내 정보 지우기` | `내 정보 지우기` |
| privacy.noticeName | `[초안] 입력한 이름은 이 기기의 이 탭에만...` | `이름은 이 기기의 이 탭에만 잠시 보관되고, 어디로도 전송되지 않아요. 탭을 닫으면 사라지며, 위 "내 정보 지우기"로 언제든 지울 수 있어요.` |
| dialog.title | `[초안] 내 정보를 지울까요?` | `내 정보를 지울까요?` |
| toast.cleared | `[초안] 모두 지웠어요. 입구로 돌아갈게요` | `모두 지웠어요. 입구로 돌아갈게요` |
| rooms.sibyl.name | `[초안] 시빌라 신탁의 방` | `시빌라 신탁의 방` (닫힌 방 목록 9자 제한에 정확히 맞춤) |
| hub.logo | `[초안] 낯선 점술관` | `낯선 점술관` |
| hub.lead | `[초안] 사주도 타로도 아닌...여섯 개의 낯선 문 너머...` (2줄 합계 44자, 40자 제한 초과) | `사주도 타로도 아닌, 처음 듣는 이야기<br />여섯 낯선 문 너머, 당신이 있어요` (합계 정확히 40자로 압축) |
| hub.doors.rune.desc | `[초안] 세 개의 돌이 읽는 과거·현재·미래` (19자, 18자 제한 초과) | `돌 셋이 읽는 과거·현재·미래` (16자) |
| hub.doors.star.origin | `[초안] 인도 · 베다 점성술` (11자, 10자 제한 초과) | `인도 · 베다` (7자) |
| hub.about (소개 글) | `[초안]` 4문단, 검색 키워드 노출 약함 | 4문단 유지, "룬 점"·"베다 점성술"·"나크샤트라"·"켈트 오검" 키워드를 자연스럽게 배치. 300자 이상 |
| next.rune.star / next.star.rune | `[초안]` 임시 떡밥 문장 | selling-strange-oracle.md의 떡밥 문장 후보를 최종 반영 (각 50자 이내) |
| result.share | `[초안] 결과 카드 저장 · 공유하기` (15자, 14자 권장 초과) | `결과 카드 저장·공유하기` (13자) |
| rune.result.ch1Title | `[초안] 세 개의 돌은 어디서 왔나` | `세 개의 돌은 어디서 왔나` (14자, 목차 16자 제한 이내) |
| archetypes.warrior.desc | `[초안] ... (120~200자)` 지시문만 있던 상태 | "전사는 도전과 돌파의 원형이에요. 지켜야 할 게 생기면 망설임 없이 먼저 나서고... 가끔은 숨 고르는 순간도 필요해요." (약 157자, 장점+약점 균형) |
| archetypes.sage/lover/rebel/caregiver/explorer/creator/ruler.desc | 동일 지시문만 있던 상태 8종 | 원형마다 다른 강점·다른 약점으로 8종 모두 새로 작성 (120~200자, 서로 겹치지 않게) |
| archetypes.*.line | `[초안]` | 각 원형 대표 문장 8종 확정 (예: 전사 "지킬 것이 생기면 먼저 앞에 서는 사람.") |
| story.paid.list[0~3] | `[초안]` 목차 4줄 | "인생 서사 심화 — 방마다 새 사건 2~3개" 등 4줄 확정 (각 24자 이내) |
| story.paid.price/status/go | `[초안] 3,900원` / `[초안] 곧 열려요` | `3,900원` / `곧 열려요` (톤 유지, "지금 결제" 미사용) |
| story.share | `[초안] 나의 이야기 카드 저장 · 공유하기` (19자, 14자 제한 초과) | `이야기 카드 저장·공유` (12자) |
| card.footer | `[초안] 낯선 점술관 · 주소는 배포 때 확정` | `낯선 점술관` (실제 주소는 미확정이라 지어내지 않고, 배포 시 developer가 붙이도록 주석에 남김) |
| card.story.hook | `[초안] 나는 지금 {n}/6장짜리 이야기예요 — 당신은요?` | 동일 문장으로 확정 (specs/selling-strange-oracle.md 공유 카드 훅 후보 반영) |
| index.html og:description | `사주도 타로도 아닌, 아주 먼 곳의 방식으로 나를 읽어 보세요.` (meta.description과 불일치) | `바이킹의 룬 점, 인도의 베다 점성술. 사주도 타로도 아닌 아주 먼 곳의 방식으로 나를 읽어 보는 무료 운세.` (data.js TEXT.meta.description과 동일하게 맞춤) |

※ 이 외에도 privacy.noticeBirth, dialog.text/confirm/cancel, toast.saved/shareFail, rooms 6개의 name·origin, hub.eyebrow/doorsAria/badge/storyTitle/storyDesc/closedTitle/closedNote/aboutTitle, result.chapterNames·chapterLabels·factEyebrow·archetypeLabel·nextTitle·nextChapter·goStory, rune·star 각 방의 intro/input/ritual/result/card 전 항목, story.title/lead/archetype.*/empty.*/teaserAvailable/teaserUpcoming/go/reread/paid.eyebrow·title·lead 등 총 121곳의 [초안] 표시를 모두 실제 문구로 교체했다(전체 목록은 위 표가 대표 사례이며, 나머지는 data.js diff 참조).

## 길이 제한 점검 결과
- design/strange-oracle.md "텍스트 길이 제한" 표의 항목을 data.js 값과 대조했다. 위 표에 적은 hub.lead·hub.doors.rune.desc·hub.doors.star.origin·result.share·story.share는 애초 초안 문구가 제한을 넘어서 줄인 사례다.
- rooms.sibyl.name("시빌라 신탁의 방", 9자)은 닫힌 방 목록 제한(9자)에 정확히 맞아떨어진다. 이 방은 1단계에서 "닫힌 방" 목록에만 노출되고 허브 문(5자 제한)·떡밥 카드(6자 제한) 자리에는 아직 쓰이지 않으므로 문제 없다. 2단계(오검) 이후 이 이름이 열린 문이나 떡밥 카드에 쓰일 일은 없다(오검이 먼저 열림, specs 참조).
- 나머지 항목은 모두 제한 이내로 확인했다(허브 로고 6자/8자 한도, 배지·알약류, 오류 문구, 노른 안내, 원형 이름 2~3자/4자 한도 등).

## 못 지킨 곳 / designer 확인이 필요한 곳
- **star.result.meta**: 템플릿이 `{who}이 태어난 순간의 달 · 나의 이야기 2장`이고 comment 제한은 28자다. `{who}`는 이름을 넣으면 `common.youWithName`("{name}님")을 거치는데, 이름 입력 최대 길이가 10자라 이론상 `{who}`가 최대 11자까지 늘어날 수 있다. 이 경우 전체 길이가 약 34자로 28자 제한을 넘는다. 실제로 이름을 10자 꽉 채워 넣는 경우는 드물어 평소에는 문제가 없지만, 화면이 깨지지 않는지는 designer의 확인이 필요하다. (rune.result.meta는 `{who}`를 쓰지 않아 이 문제가 없다.)
- 그 외에는 위 "길이 제한 점검 결과"에서 확인한 대로 모든 문구가 제한 이내다.

## node --check 결과
- `node --check "products/strange-oracle/data.js"` 실행, 오류 없이 통과.

---

## 완료한 것
- data.js의 [초안] 표시 121개(파일 맨 위 설명 주석 속 언급 포함)를 모두 실제 서비스 문구로 교체·확인(현재 [초안] 0개, grep으로 재확인).
- 원형 8종을 서로 다른 강점·약점으로 균형 있게 새로 작성.
- index.html `<head>`의 og:description을 data.js TEXT.meta.description과 동일하게 맞춤(title·description·og:title은 이미 일치 확인).
- 길이 제한·금지 표현 재점검, `node --check` 통과 확인.

## 만들거나 수정한 파일
- products/strange-oracle/data.js (문자열 값만 수정, 키 이름·구조·로직 변경 없음)
- products/strange-oracle/index.html (`<head>`의 og:description 한 줄만 수정)
- reports/copy-strange-oracle.md (신규 작성)

## 운영자가 확인·판단할 것
- star.result.meta의 이름 10자 최대 입력 시 28자 제한 초과 가능성(designer 화면 확인 필요, 위 "못 지킨 곳" 참조).
- card.footer에 실제 서비스 주소가 아직 없어 "낯선 점술관"만 남겨 뒀다. 배포 주소가 정해지면 developer가 이어 붙일 것.

## 다음 단계 제안
- 9장 7단계(개발 — UI 점검)로 넘어가 designer가 이번 문구 반영 화면을 실제로 확인.
- 이번 데이터.js 변경분을 포함해 8단계 QA(qa-reviewer) 진행.
- SNS 홍보 문구는 1-D 단계(마케팅 자산)에서 별도로 작성 예정이라 이번 보고서에는 포함하지 않음.

---

# 2단계 추가 기록 (네 방 UI 문구 — 오검·데칸·촐킨·시빌라)

작성: copywriter, 2026-09-28. content-work/BRIEF2.md 지시서와 design/strange-oracle.md "2단계" 섹션을 기준으로 작업했다.

## 담당 범위
- `products/strange-oracle/data.js`: `TEXT.ogham`, `decan`, `tzolkin`, `sibyl`(버튼·안내·제목류), `hub.doors.*`·허브 소개 글 셋째 문단, `privacy.noticeQuestion`, `next.*`(떡밥 11개 + 예비 6개), `meta`의 [초안] 표시([초안]) 100곳(발생 횟수 합계 135회, 중복 줄 포함)을 실제 문구로 교체.
- `products/strange-oracle/data-tzolkin.js`: `window.TZOLKIN_NUMBERS` 13개 항목(title·text)만 작성. `TZOLKIN_SIGNS`는 다른 담당(content-work) 몫이라 손대지 않음.
- `products/strange-oracle/data-oracles.js`: `window.ORACLE_TOPICS` 5개 `lens`만 작성. `ORACLES` 배열은 다른 담당 몫이라 손대지 않음.
- `products/strange-oracle/index.html`: `<head>`의 `<title>`·`<meta name="description">`·`og:title`·`og:description` 4곳만 수정(모두 data.js `TEXT.meta`와 동일 문장으로 맞춤). 본문(`<body>`)의 [초안]은 지시서 범위 밖이라 손대지 않음(아래 "확인할 것" 참고).
- `content-work/*.js`(오검·데칸·촐킨·시빌라 결과 본문)와 룬·별의 방 기존 문구는 건드리지 않았다.

## 주요 작업 내용
- 데이터가 이미 완성 문장을 담고 있던 곳(예: `hub.doors.ogham.desc`, `rune.norns` 스타일과 맞춘 방 소개·오류·의식 안내 대부분)은 "[초안] " 접두만 제거했다.
- 실제로 새로 써야 했던 곳:
  - **hub.about 셋째 문단**: 기존 "지금 열린 두 방" 기준 문장을 지우고, 여섯 방이 각각 무엇을 입력받고 무엇을 보여 주는지 한 문단으로 소개하도록 새로 썼다(전체 소개 글 4문단 합계 619자, 300~900자 권장 범위 안).
  - **next.\*** (오검↔시빌라·데칸, 별↔촐킨·오검, 데칸↔룬·별, 촐킨↔데칸·시빌라, 시빌라↔룬·촐킨, 룬↔오검 및 예비 6개): 다른 방 결과를 전제하지 않고 어느 방에서 들어와도 통하도록 "봤으니/읽었으니 ~도 볼까요?" 형태의 초대 문장으로 통일. 모두 50자 이내.
  - **오검·데칸·촐킨·시빌라 intro.lore**(각 방 2문단): BRIEF2.md 문화 메모를 근거로 새로 작성했다. 오검은 중세 문헌·비문 사실을 먼저 말한 뒤 이 방의 연출(이름→글자)을 안내, 데칸은 36데칸·덴데라 천장, 촐킨은 "지금도 지키는 살아 있는 전통"을 명시, 시빌라는 소르테스·시빌라의 책 전승과 "이 방이 새로 지은 문장"이라는 구분을 유지했다. 모두 120자 이내.
  - **decan.ritual.trivia[1], [2]**: 이집트 밤 시간 열두 칸 구분, 헬레니즘 시대 황도 12자리 결합을 상식으로 새로 작성(각 60자 이내).
  - **TZOLKIN_NUMBERS 13개**: 1~13 각 숫자를 "하나의 매듭에서 다음 매듭으로" 이어지는 순환 서사로 썼다. 문양(20개)과 무관한 공통 레이어라 문양 언급은 하지 않았고, 8장 금지 항목(죽음·질병·투자 등)과 "반드시" 단정을 피했다. title 8~11자(16자 이내), text 140~153자(180자 이내).
  - **ORACLE_TOPICS 5개 lens**: 시험·사랑·일·관계·나 자신 각 주제로 신탁을 소개하는 도입 문장 5개를 새로 씀(31~33자, 60자 이내).

## 문화 고증 관련 메모 (미확인 포함)
- 오검 facts.meaning/tree(글자별 뜻·나무 해석)은 이번에 다루지 않았다(다른 담당의 data-ogham.js 몫). BRIEF2.md가 지적한 "학계 의견이 갈리는 뜻"·"그레이브스의 나무 달력 창작" 여부는 내가 새로 쓴 lore 문단에는 등장하지 않으므로 이번 결과물에는 해당 리스크가 없다.
- 데칸 facts.egyptian(이집트 이름의 확인되지 않은 값) 역시 이번 담당 범위(data.js UI 문구)에는 등장하지 않는다.
- 촐킨 관련 문구(intro.lore, TZOLKIN_NUMBERS)에서 "2012 종말"·"고대 문명의 예언" 같은 표현은 쓰지 않았고, "지금도 과테말라 키체 마야의 '날 지킴이'가 지키는 살아 있는 전통"이라는 존중 표현을 넣었다. **미확인**: "날 지킴이"(아크키이)라는 한글 표기와 "살아 있는 전통"이라는 서술은 BRIEF2.md 문화 메모를 그대로 따른 것으로, 원문 표기의 정확한 로마자·발음은 별도 검증하지 않았다.
- 시빌라 lore에서 "시빌라의 책을 국가 위기 때 열어 보았다"는 서술은 BRIEF2.md에 있는 내용을 그대로 반영했다. **미확인**: 그 외 로마사 세부 사실(구체적 연도 등)은 다루지 않았고 별도로 찾아보지 않았다.

## 길이 제한 점검
- data.js 새 문구 전량과 TZOLKIN_NUMBERS·ORACLE_TOPICS를 Node 스크립트로 글자 수(공백 포함) 계산해 각 항목의 주석상 제한(허브 문 10/16자, next 50자, lore 120자, ritual 안내 2줄×16자, 데칸/시빌라 각종 60~90자, TZOLKIN_NUMBERS title 16자/text 180자, ORACLE_TOPICS lens 60자 등)을 넘지 않는지 확인했다. 초과 항목 없음.
- hub.doors 중 decan·tzolkin·sibyl의 origin은 기존 개발자 placeholder 문구("이집트 · 서른여섯 별" 등)가 10자 제한을 이미 넘어서 있어(11~12자), 각각 "이집트 · 별자리"(9자)·"마야 · 촐킨"(7자)·"로마 · 신탁"(7자)으로 줄여 다시 썼다.

## 남은 [초안] 개수
- `products/strange-oracle/data.js`: 0 (파일 맨 위 설명 주석의 "[초안]" 언급도 함께 고쳐 파일 전체 0으로 만듦).
- `products/strange-oracle/data-tzolkin.js`의 `TZOLKIN_NUMBERS` 구간: 0. (파일 전체로는 `TZOLKIN_SIGNS`에 담당 밖 [초안]이 남아 있어 `grep -c`가 601로 나온다 — 이는 다른 담당자의 몫이다.)
- `products/strange-oracle/data-oracles.js`의 `ORACLE_TOPICS` 구간: 0. (파일 전체는 `ORACLES` 배열에 담당 밖 [초안]이 남아 있다 — 다른 담당자의 몫.)
- `products/strange-oracle/index.html`의 `<head>`(title·description·og:title·og:description): 0.

## 운영자가 확인·판단할 것
- **index.html 본문(<body>)에는 여전히 [초안] 표시가 약 221곳 남아 있다.** 지시서가 "index.html은 title·meta·og만 수정"이라고 범위를 못 박아 그 부분만 고쳤다. design/strange-oracle.md 782번째 줄 근처 주석("마크업의 [초안] 글자는 길이 견본")을 보면, 이 body 안 [초안]들은 `data-t` 속성이 실행 시 JS로 덮어써지는 자리의 "길이 견본"이며, 정적 미리보기(is-static-preview) 전용으로 보인다. 즉 실제 서비스 화면에서는 data.js의 실제 문구로 대체되어 보이지 않을 가능성이 높지만, developer가 이 부분을 확인·정리(또는 static preview 갱신)해야 "출시 화면에 [초안] 표시가 남으면 안 된다"(CLAUDE.md 3장)를 완전히 충족한다.
- decan/tzolkin/sibyl의 hub.doors.origin을 원래 placeholder 문구에서 줄여 새로 썼다(위 "길이 제한 점검" 참조). 원래 의도한 문구와 다를 수 있으니 designer/운영자 확인 바람.

## 다음 단계 제안
- developer가 index.html body의 정적 미리보기 [초안] 표시를 정리하거나, 실제 런타임에서 JS가 100% 덮어쓰는지 확인.
- designer가 이번에 새로 쓴 hub.doors.origin(단축본), next.* 떡밥 11+6개, 각 방 lore 2문단을 실제 360px 화면에서 줄바꿈·잘림 여부 확인(2단계 UI 점검 단계).
- 네 방 결과 본문(content-work/*.js, data-ogham.js, data-decans.js, TZOLKIN_SIGNS, ORACLES)의 다른 담당 작업이 끝나면, TZOLKIN_NUMBERS·ORACLE_TOPICS와의 톤 일관성(사건 위주 서술, 8장 금지 표현)을 qa-reviewer 단계에서 함께 점검.

---

# 7단계 추가 기록 (인트로·허브·다리·수렴 결말·유료 목차 문구)

작성: copywriter, 2026-09-29. 9장 7단계(개발 — 문구) 지시에 따라, 7단계 개편(방 순서 고정 Ⅰ오검→Ⅱ별→Ⅲ데칸→Ⅳ촐킨→Ⅴ룬→Ⅵ시빌라→나의 이야기, 방별 온전한 이야기를 유료로 이동)으로 새로 생긴 [초안] 34곳을 실제 문구로 교체했다.

## 담당 범위
- `products/strange-oracle/data.js`의 `intro.*`, `finale.*`, `bridges.<room>`, `hub.doors.<room>.reads`·`doorLocked`·`progress.label`, `result.sealed.*`·`bridgeTitle`·`nextDoor.*`·`deeperLink`, `sibyl.result.retry`/`retryNote`, `toast.locked`, `story.teaserLocked`, `deeper.toc.rooms`·`teaser.rooms`, `report.parts.rooms`, `disclosure.items`, `story.paid.list[0]`만 수정. 다른 항목·다른 파일은 손대지 않았다.

## 주요 작업 내용
- **인트로**: "여러 문화의 점을 하나로 엮어, 당신이라는 사람을 한 편의 이야기로 그려요"로 확정(운영자 문안 그대로, 44자 제한 이내).
- **허브 문 한 줄 소개(reads)**: 각 방이 무엇을 읽는지 짧고 궁금하게 — 오검 "나의 뿌리", 별 "지금의 속마음", 데칸 "잠들어 있는 재능", 촐킨 "다가올 순환", 룬 "과거·현재·미래", 시빌라 "오늘 묻고 싶은 것" (모두 12자 제한 이내).
- **이야기 다리(bridges)**: Ⅰ→Ⅵ→나의 이야기 순서로, 앞 방이 밝힌 것에서 다음 방이 궁금한 이유로 자연스럽게 이어지도록 새로 썼다. 결과 본문 문장은 재사용하지 않고 서사만 이었다. 길이는 122~130자로 모두 100~200자 범위 안(스크립트로 실측 확인).
- **수렴 결말(finale)**: "여섯 문을 모두 지나 / 나의 이야기 / 여섯 장이 모였어요" 등 담백하게 정리하고, lead는 "뿌리에서 오늘의 질문까지, 여섯 문이 남긴 조각이 한 사람의 이야기로 이어졌어요."로 확정.
- **봉인 블록(result.sealed)·다음 문(nextDoor)**: 장 이름만 안내하고 결과 내용을 미리 드러내지 않도록 유지("이 방의 남은 장은 봉인되어 있어요" / "사건, 그 뒷이야기"). 잠금·다음 문 문구에 불안 조장 표현 없음(8장 준수).
- **시빌라 다시 받기**: "다른 신탁 받기" 버튼과 "받은 신탁은 무를 수 없어요. 다른 주제로 새로 물을 수 있어요." 안내로, 되돌릴 수 없음과 새 주제로 다시 물을 수 있다는 점을 함께 명시(운영자 지시 그대로, 40자 이내).
- **유료 "방별 온전한 이야기"**: 여는 글 바로 뒤에 놓이는 항목이라 report.parts.rooms·deeper.toc.rooms·story.paid.list[0]·disclosure.items 네 곳 모두 같은 이름("방별 온전한 이야기")으로 통일했다.
- **disclosure.items**: 원래 초안 문구(스크립트 실측 약 92자)가 70자 제한을 넘어서, "여는 글·방별 온전한 이야기({rooms}곳)·1장 숨은 장·2장 흐름·3장 {match}·4장 심층·닫는 글·소장카드"(66자)로 압축했다. "(3구간)"·"시기별"·"원형" 등 수식어를 줄였지만 8개 구성 항목은 모두 남겼다. 상세 항목명은 deeper.toc·report.parts에서 온전히 보여 주므로 이 한 줄은 결제 전 "받는 것" 요약으로만 기능한다.

## 길이 제한 점검
- Node 스크립트로 bridges 6개(100~200자)와 disclosure.items(70자 이내)를 실측했다. 나머지 항목은 모두 기존 [초안] 문구의 글자 수를 유지하며 접두만 제거했거나(주석 제한 이내 확인), reads·retry 등은 직접 세어 제한 이내를 확인했다.

## 남은 [초안] 개수
- `products/strange-oracle/data.js`: 0 (`grep -c "\[초안\]"` 재확인).
- `node --check products/strange-oracle/data.js`: 통과.

## 완료한 것
- 7단계에서 새로 생긴 [초안] 34곳(intro·finale·bridges·hub.doors.reads 등)을 모두 실제 문구로 교체.
- bridges 6개·disclosure.items 길이를 스크립트로 실측해 제한 준수 확인, `node --check` 통과.

## 만들거나 수정한 파일
- products/strange-oracle/data.js (문자열 값만 수정, 키 이름·구조·로직 변경 없음)
- reports/copy-strange-oracle.md (이 항목 추가)

## 운영자가 확인·판단할 것
- disclosure.items를 70자 제한에 맞추며 "(3구간)"·"시기별"·"원형" 등 일부 수식어를 뺐다. 결제 전 고지로 충분히 명확한지 한 번 확인 바람(상세 항목은 deeper 미리보기·report 화면에 별도로 전부 나온다).

## 다음 단계 제안
- 9장 7단계(개발 — UI 점검)에서 designer가 인트로·허브 문·다리·수렴 결말 화면을 360px 기준으로 확인.
- 이후 8단계 QA(qa-reviewer)에서 8장 금지 표현·면책 문구·잠금 흐름을 함께 재검수.

---

# 8단계 (흐름 다듬기: 입구 첫 화면·한 권의 책·방 안 무료 화면)

## 완료한 것
- 8단계에서 새로 생긴 [초안] 87곳(topbar·room.saved·ritual·rooms.short·hub.cta/journey/sofar/book/faq/clearNote·result.readingTitle 등·deeper 미리보기·book 리더)을 모두 실제 문구로 교체. `grep -c "\[초안\]"` 0, `node --check` 통과.
- `story.paid.lead`·`story.paid.list[0,1]`이 7단계 모델("무료로 본 내용을 다시 싣지 않고 새 문장만")을 그대로 두고 있어 8단계 모델(방마다 네 장 전체를 포함한 한 권의 책)과 어긋나 있던 것을 함께 고쳤다. lead는 "여섯 문을 모두 지나면, 방마다 온전한 이야기와 시기별 흐름·궁합·원형 심층까지 한 권의 책으로 만나요."로, list는 "방별 온전한 이야기 — 네 장 전체" / "방마다 숨은 장 — 새로운 사건 하나"로 교체했다(이 문구는 [초안] 태그가 없어 grep 대상에는 안 잡히지만 운영자 지시로 함께 수정).
- **FAQ(hub.faq)**: 기존 긴 소개 글(hub.about) 대신 6문답으로 스캔하기 쉽게 구성. 무엇을 보는지·결과 읽는 법·순서가 있는 이유·개인정보(브라우저 안에서만 계산, 전송 없음)·무료·유료 구분·신뢰도(재미 콘텐츠, 결정 근거 아님)를 모두 담았다. 답 합계 371자로 광고 심사 기준(300자 이상) 충족(Node로 실측).
- **여정 칩(hub.journey.chips)**: "방마다 2~3분"을 "방마다 2~3분 남짓"으로 바꿔 정확한 약속이 아닌 근사 표현으로 다듬었다(지시사항 준수). 세 번째 칩 "끝에 나의 이야기 한 편"(13자)이 12자 제한을 넘어 "한 편의 이야기로"(9자)로 줄였다.
- **retryLink**·**book.toc.flow**: 초안 문구가 각각 스크린리더 10자·목차 22자 제한을 넘어 "정보 바꿔 보기"(8자)·"나의 흐름 — 흐름·궁합·원형"(16자)로 축약했다. 나머지는 기존 [초안] 문구가 이미 자연스럽고 제한 안이라 접두만 제거했다.
- 톤: 8장(비하·공포·단정 금지)·7장(광고 클릭유도 금지) 위반 문구 없음을 훑어 확인. 기존 완성 문구(존댓말·우주적·따뜻한 톤)와 어울리도록 새 문구를 맞췄다.

## 길이 제한 점검
- Node로 FAQ 답 6개 합계(371자)와 각 항목 글자 수를 실측했다. journey.chips·retryLink·book.toc.flow는 직접 세어 제한을 넘는 3곳만 축약했다. 나머지는 주석에 적힌 제한 안에 있음을 확인 후 태그만 제거했다.

## 남은 [초안] 개수
- `products/strange-oracle/data.js`: 0 (`grep -c "\[초안\]"` 확인).
- `node --check products/strange-oracle/data.js`: 통과.

## 만들거나 수정한 파일
- products/strange-oracle/data.js (문자열 값만 수정, 키 이름·구조·로직 변경 없음)
- reports/copy-strange-oracle.md (이 항목 추가)

## 운영자가 확인·판단할 것
- hub.journey.chips의 "방마다 2~3분 남짓"은 QA 실측 전 근사 표현이다. 7단계 실측 값과 크게 다르면 QA 단계에서 재확정 필요.
- FAQ 답변 중 "무엇을 보나요?" 항목은 여섯 방을 뿌리·속마음·재능·흐름·질문 다섯 갈래로 압축 요약했다(스캔 가능성 우선). 여섯 방 모두를 낱낱이 나열하길 원하면 문구를 늘려야 한다.

## 다음 단계 제안
- 9장 7단계(개발 — UI 점검)에서 designer가 입구 첫 화면(여정 칩·FAQ·한 권의 책 카드)과 책 리더 화면을 360px 기준으로 확인.
- 이후 8단계 QA(qa-reviewer)에서 8장 금지 표현·면책 문구·결제 전 고지(disclosure)·잠금 흐름을 함께 재검수.
