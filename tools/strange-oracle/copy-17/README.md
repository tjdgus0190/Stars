# 17단계 문구 도구 (copywriter용)

유료 문장 원본은 `products/strange-oracle/api/_paid/book/`에만 있다. 이 폴더(items.json·README)에는 문장 원문을 두지 않는다.
묶음 파일(`out/<묶음>.json`)에는 apply 전까지 유료 문장이 잠시 머문다. 저장소 비공개 전제(62번)가 필요하다. `tools/`는 배포하지 않는다.

## 한 묶음 = Write 한 번 + 명령 두 개
1. `node tools/strange-oracle/check-17.js`를 실행한다. 끝에 **다음 묶음** id, 항목 id, 글자 범위, 말투가 찍힌다.
2. `tools/strange-oracle/copy-17/out/<묶음 id>.json` 하나를 Write로 쓴다.
   ```json
   { "items": { "yeon.pull.warrior": "문장…", "yeon.pull.sage": "문장…" },
     "notes": { "yeon.pull.sage": "확인 목록 '떠나': 여행을 떠나는 장면이라 이별 아님" } }
   ```
   - 값은 문자열 하나다. 단락을 나누려면 문자열 배열로 쓴다.
   - `notes`는 쓰지 않아도 된다. 확인 목록에 걸린 항목은 note가 있어야 통과한다.
3. `node tools/strange-oracle/apply-17.js <묶음 id>`로 원본에 넣는다. status가 written이 되고, 묶음 파일은 지워진다.
   - 원본의 다른 문장이 바뀌면 되돌리고 멈춘다.
4. `node tools/strange-oracle/check-17.js`로 검사한다. 통과하면 checked, 실패하면 written으로 남고 이유가 찍힌다.
   - 고칠 때는 같은 id만 다시 묶음 파일로 써서 apply한다.

끊겼다가 다시 시작할 때도 1번 명령 하나면 된다. **남은 묶음 파일**이 있으면 그것부터 apply한다.

## 순서 (17-6)
yeon-pull → yeon-mirror → yeon-meet → yeon-twist → yeon-scene → yeon-time-b1 … b7 → yeon-season
→ yeon-alt-same → yeon-alt-notime (만 19세 미만판 묶음 4개는 결정 114로 뺌)
→ heart-<방>-<n> (saju, ogham, star, decan, tzolkin, rune, sibyl) → first-<방>-<n>

모두 47묶음, 455항목이다(결정 114로 만 19세 미만판 4묶음 29항목을 뺌). 무료 떡밥 8줄(data-book-free.js)과 data.js `book.yeon.*` 화면 문구는 이 도구 밖이다. 직접 고친다.

## 항목 (items.json)
| 칸 | 뜻 |
|---|---|
| id | `yeon.<쪽>.<원형>`, `yeon.time.<원형>-b<1~7>`, `yeon.season.<오행>`, `yeon.alt.<same·notime>.<원형>`, `heartLine.<방>.<결과 코드>`, `firstLine.<방>.<결과 코드>` |
| kind | `yeon.<쪽>` · `yeon.alt.<same·notime>` · `heartLine` · `firstLine` (옛 `shadow.hook`·`advice.hook`과 다름) |
| voice | `book` = 책의 화자. 방 이름 = 그 방 안내자 말투(9-1, 말투 카드) |
| min·max·target | 글자 수(공백 포함) 범위와 목표 |
| review | `all` = QA가 전부 읽는 항목(17-13의 7) |
| by | 고르는 값이 주 원형이 아닌 것(보조 원형, 만신 일간 오행) |
| status | todo → written(apply) → checked(check 통과) |
| note | 확인 목록 판단, 룬 "지금 자리" 같은 메모 |

- 룬 firstLine·heartLine은 "지금" 자리에 놓였을 때를 겨냥해 쓴다(17-3).
- `yeon.time.*-b1`(24세 이하, 19~24세)은 연애를 전제하지 않고 친구·배움의 자리로 쓴다.

## check-17이 보는 것
- **금지 목록:** 17-4 표 왼쪽 열 + 건강어. 걸리면 실패한다.
  - 성별어는 기존 무료·유료 전체도 본다. 독자나 상대를 가리키지 않는 역사·상징 설명(예: 시빌라 "여성 예언자")은 고치지 않는다. `gender-judged.json`에 `[{ "file", "path", "word", "note" }]`로 판단을 적으면 실패에서 빠진다(검수 2차 권장 2).
  - 오탐 제외: 알아내·찾아내의 "아내", 이성적, 원형·형태의 "형"(호칭 꼴만 건다), 당신부터·자신부터의 "신부"(권장 1).
- **확인 목록:** 17-4 표 오른쪽 열과 경고형 끝맺음(`~해야 해요`·`~하지 마세요`)이다. 목록만 낸다. 새 항목은 note가 있어야 통과한다.
- **글자 수, 끝 부호**(. ! ? …)
- 기존 문장의 금지·확인 목록 걸림은 개수만 보고한다(`--old`로 하나씩). 기존 문장은 고치지 않는다(17-1).
- 실행 가능한 긍정 조언으로 끝나는지는 스크립트가 볼 수 없다. 사람이 본다.

## 다 끝나면
`node tools/strange-oracle/make-volume.js`(불일치 0) → `node tools/build-dist.js`(유료 지문 누출 0, book-yeon 포함)
→ `node --test "tools/strange-oracle/*.test.js"`

## 18단계 새 장 「겹치는 곳, 갈리는 곳」 (`--stage 18`, spec 18-10)
같은 두 도구에 `--stage 18`만 붙인다. 진행 폴더는 `tools/strange-oracle/copy-18/`(items.json·out/), 원본은 `api/_paid/book/book-cross.js`다.
1. `node tools/strange-oracle/check-17.js --stage 18` → 다음 묶음 id·항목 id·글자 범위·**쓸 수 있는 자리 값**이 찍힌다.
2. `tools/strange-oracle/copy-18/out/<묶음 id>.json` 하나를 Write로 쓴다(모양은 17단계와 같음).
3. `node tools/strange-oracle/apply-17.js --stage 18 <묶음 id>` → book-cross.js에 넣고 written, 묶음 파일 지움.
4. `node tools/strange-oracle/check-17.js --stage 18` → 통과하면 checked.

- 순서: cross-lens → cross-shape-one·two·trunk·many → cross-common-act·talk·heart·order·free → cross-split → cross-pair-1~7 → cross-even → cross-same → cross-close (21묶음, 164항목).
- id: `cross.lens.<방>` · `cross.shape.<one|two|trunk|many>.<주 원형>` · `cross.common.<축>.<주 원형>` · `cross.split.<축>` · `cross.pair.<주 원형>-<홀로 다른 방 원형>` · `cross.even.<주 원형>` · `cross.same.<주 원형>` · `cross.close.<주 원형>`.
  - 모양: one 한 목소리 · two 두 갈래 · trunk 굵은 줄기 · many 여러 갈래. 축: act 발걸음 · talk 대화 · heart 마음 · order 약속 · free 새로움.
- 자리 값은 `{arch}`(주)·`{sub}`(보조)·`{other}`(홀로 다른 방 원형)·`{axis}`(2쪽 공통 축, 3쪽 차이 축, 그 밖 칸은 공통 축)·`{room}`(홀로 다른 방)·`{high}`·`{low}`(3쪽 방 이름들)·`{n}`(마친 방 수)만. 칸마다 쓸 수 있는 것은 items.json `vars`(check가 찍음).
  - `{arch}`·`{sub}`·`{other}`·`{axis}` 바로 뒤에는 `의`·띄어쓰기·`. , ! ? ·`·`」`만. 「」로 감쌌으면 `」` 뒤는 띄어쓰기 + 명사 또는 문장부호. (`{room}`·`{high}`·`{low}`는 방 이름이 "방"으로 끝나 조사를 붙여도 된다.)
  - 1·2·6쪽은 방 2~7개에 같은 항목을 쓴다. 방 수는 `{n}`으로만.
- 검사: 17-4 목록 + 결정 116 건강어 + 18-4 목록(정확도 과장·오류 틀·원형 깎기) + 자리 값 + 축 이름 대조(data.js `book.cross.axis` = data-map.js `axis`).
- 방 2~7개 모든 조합(약 240만)에서 164 열쇠가 모두 나온다(cross.test.js). 뺀 열쇠는 없다.
