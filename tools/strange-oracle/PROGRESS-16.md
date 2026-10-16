# 16단계 진행표 — H2 서버 쪽 (developer)

기준: specs/strange-oracle.md 16-5·16-6·16-7, 16-9의 11·12·15·16, 기획 검수 2차 권장 2~4.
화면 쪽(map.js·data-map.js·app.js·index.html·style.css·data.js `map`·build-dist 가드 ⑩~⑬·e2e-map)은 H3 몫.

| # | 할 일 | 상태 |
|---|---|---|
| 1 | 진행표 | 완료 |
| 2 | friend-map/schema.sql (표 세 개 + 색인, 칸 늘리지 않음) | 완료 |
| 3 | friend-map/words.js (별명 금칙어) | 완료 |
| 4 | friend-map/core.js (검사·다섯 경로·만료·상한·CORS, 저장소·시계 주입) | 완료 |
| 5 | friend-map/worker.js (fetch·scheduled·D1 어댑터, bind만, 로그 없음) | 완료 |
| 6 | friend-map/wrangler.toml (자리만, ID·키 없음) | 완료 |
| 7 | tools/strange-oracle/mock-map.js + mock-server.js 연결 (스위치·map-store·지름길 join·birth) | 완료 |
| 8 | tools/strange-oracle/map.test.js (메모리 + node:sqlite D1 흉내 두 어댑터) | 완료 |
| 9 | build-dist: friend-map 복사 제외 한 줄(가드 ⑫는 H3) | 완료 |
| 10 | HANDOFF 3장 운영자 배포 순서, tests.md 16단계 메모 | 완료 |
| 11 | 기존 단위·e2e(saju·book·pay·flow) 실패 0 확인 | 완료 (단위 129 · e2e-saju 41 · book 54 · flow reduced 127 · pay 67, 모두 실패 0) |

## 정한 것
- 권장 4: 삭제 동작(`leave`·`map`·`friend`)도 `erases`를 1 올린다. 막지는 않는다(상한에 걸려도 받음). `rekey`·`reinvite`·`close`만 상한에 막힌다.
- 메서드가 POST·OPTIONS가 아니면 400(`method`). 기획서 오류 목록 밖 코드를 늘리지 않으려고.
- 초대 ID 모양이 틀리면(22자 base64url 아님) 404(없는 초대와 같은 응답).
- 참여 순서: 닫힘 409 → 시간당 10회 429 → 30명 409. 시간 창 계수는 참여가 성공했을 때만 올린다.

## H3에 넘길 메모
- build-dist 가드 ⑫(`friend-map/` 없음, `key_hash`·`del_hash`·`MAP_MODE`·`ALLOWED_ORIGIN`·`/__dev/map` 0건)는 H3. 복사 제외(PRODUCT_EXCLUDE에 friend-map)만 H2에서 넣었다.
- 권장 2(같은 코드 10명 이상 표본에서 겹침 선택 목록이 뜨고 모두 고를 수 있음)는 e2e-map 3 또는 H5에 넣는다.
- data.js `map`은 `mode`·`api`를 중괄호 안 첫 줄들(안쪽 중괄호보다 앞)에 둘 것 — 모의 서버가 응답에서만 `mode`→test, `api`→/__dev/map으로 바꾸는 정규식이 그 모양을 전제한다.
