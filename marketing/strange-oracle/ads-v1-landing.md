# 콘텐츠별 바깥 광고 착지표 (정식판 v1-E, 2026-11-13)

운영자 결정 D5: 사이트 안 광고는 켜지 않고, **바깥 광고(메타·구글 등)를 콘텐츠마다 따로** 집행한다.
아래 주소를 광고의 착지 주소(랜딩 URL)로 그대로 쓰면, 구글 애널리틱스에서 콘텐츠별로 방문·결과 도달을 나눠 볼 수 있다.

## 규칙
- `utm_campaign`은 `c_` + 짧은 주소(`/`·`-`는 `_`). 목록에 없는 값은 분석에서 버려진다(이름 같은 입력값이 섞여 들어오지 않게).
- `utm_content`에는 소재 이름(아래 「소재」 열의 `reel_…`) 또는 메타가 자동으로 붙이는 숫자 광고 번호를 쓸 수 있다.
- `utm_source`: instagram · facebook · meta · tiktok · kakao · x · google · naver · youtube · threads 가운데 하나. `utm_medium`: paid_social · cpc · cpm · paid · social · organic · share.
- 광고 문구는 운영 규칙 8장을 따른다: "100% 적중"·공포·건강·투자 표현 금지, 실존 인물 언급 금지.
- 입구(`/products/strange-oracle/`)로 보내는 기존 광고 1~9안의 값(`ad1_seven_doors` 등)은 그대로 쓴다(입구 app.js 목록).

## 착지표

| 콘텐츠 | 착지 주소 (https://strange-oracle.com 뒤에 붙임) | 한 줄 후킹(안) | 소재 |
|---|---|---|---|
| 무료 만세력 | `/manse/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_manse` | 내 사주 여덟 글자, 생일만 넣으면 바로 | 만신 편 릴스 `reel_saju` |
| 나크샤트라 계산기 | `/nakshatra/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_nakshatra` | 태어난 밤, 달은 스물일곱 집 가운데 어디에 있었을까 | 베다 편 `reel_star` |
| 마야 탄생일 | `/tzolkin/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_tzolkin` | 마야 달력에서 내 생일의 이름은? | 촐킨 편 `reel_tzolkin` |
| 이집트 데칸 | `/decan/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_decan` | 같은 별자리인데 왜 다를까 — 서른여섯 데칸 | 데칸 편 `reel_decan` |
| 이름 오검 | `/name-ogham/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_name_ogham` | 내 이름을 켈트 나무 문자로 새기면 | 오검 편 `reel_ogham` |
| 룬 한 개 뽑기 | `/rune-draw/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_rune_draw` | 오늘, 주머니에서 나온 룬 하나 | 룬 편 `reel_rune` |
| 시빌라 한 줄 신탁 | `/sibyl/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_sibyl` | 고민 하나에 두루마리 한 줄 | 시빌라 편 `reel_sibyl` |
| 오늘의 신탁 | `/today/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_today` | 하루 한 줄, 매일 열리는 두루마리 | 시빌라 편 `reel_sibyl` |
| 안내자 도감 | `/dex/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_dex` | 일곱 안내자, 각자의 숨은 이야기 | (새 소재 필요: 도감 카드 넘기기) |
| 전설 기록 목록 | `/legends/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends` | 점술이 역사를 움직인 일곱 가지 순간 | 전설 릴스 7편 아무거나 |
| 전설: 예언서가 부른 검은 돌 | `/legends/sibyl-black-stone/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends_sibyl_black_stone&utm_content=reel_sibyl` | 예언서 한 줄이 한니발을 몰아냈다 | `reel_sibyl` |
| 전설: 독이 든 술잔에 룬을 새기다 | `/legends/rune-poisoned-horn/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends_rune_poisoned_horn&utm_content=reel_rune` | 잔에 룬을 새기자, 잔이 깨졌다 | `reel_rune` |
| 전설: 사라진 왕비와 네 개의 막대 | `/legends/ogham-lost-queen/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends_ogham_lost_queen&utm_content=reel_ogham` | 백조가 된 왕비를 찾은 나무 막대 넷 | `reel_ogham` |
| 전설: 하루 앞당긴 대관식 | `/legends/vedic-coronation/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends_vedic_coronation&utm_content=reel_star` | 별이 나쁘다는 말에 왕은 대관식을 서둘렀다 | `reel_star` |
| 전설: 태어날 순간을 고른 별판 | `/legends/decan-birth-moment/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends_decan_birth_moment&utm_content=reel_decan` | 한 점성가가 아기가 태어날 '순간'을 골랐다 | `reel_decan` |
| 전설: 저승의 신들을 이긴 쌍둥이 | `/legends/maya-hero-twins/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends_maya_hero_twins&utm_content=reel_tzolkin` | 저승을 꾀로 이긴 쌍둥이, 해와 달이 되다 | `reel_tzolkin` |
| 전설: 팔자를 따지러 간 사내 | `/legends/saju-ask-heaven/?utm_source=instagram&utm_medium=paid_social&utm_campaign=c_legends_saju_ask_heaven&utm_content=reel_saju` | 복 없는 팔자, 하늘에 따지러 갔다 | `reel_saju` |
| 점술 안내 7개 | `/saju/` `/vedic/` `/rune/` `/ogham/` `/egypt/` `/maya/` `/oracle/` + `?utm_source=…&utm_medium=…&utm_campaign=c_saju` 등 | 검색 광고(구글·네이버) 착지에 맞음 | 검색 광고 문구 |
| 안내자와 면담 | `/talk/?…&utm_campaign=c_talk` | (면담을 켠 뒤에만 집행) | — |

- 메타 광고에서 `utm_content={{ad.id}}`처럼 동적 값을 쓰면 숫자 광고 번호가 들어가며, 그대로 받는다.
- 다른 소스로 바꿀 때는 `utm_source`·`utm_medium`만 바꾼다(예: 구글 검색 `utm_source=google&utm_medium=cpc`).
- 착지 주소는 끝의 `/`까지 그대로 쓴다(없어도 `/` 붙은 주소로 넘어가지만 한 번 더 이동한다).

## 운영자가 할 것
- 광고 계정·결제·집행은 운영자가 한다(에이전트는 하지 않음).
- 「안내자 도감」 소재는 아직 없다. 필요하면 요청해 주세요.
