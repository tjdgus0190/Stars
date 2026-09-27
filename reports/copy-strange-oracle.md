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
