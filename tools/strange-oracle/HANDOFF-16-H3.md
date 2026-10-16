# 16단계 H2 → H3 인계 (서버 약속, 2026-10-17)

## 경로별 요청·응답 (모두 POST, JSON 1KB 이하, 칸은 정확히 이것만)
| 경로 | 요청 | 200 응답 |
|---|---|---|
| `/create` | `{nick, icon, main, sub}` | `{invite, key:"SOM-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX", created}` |
| `/join` | `{invite, nick, icon, main, sub}` | `{rid, del:"SOD-…", joined}` |
| `/peek` | `{invite}` | `{nick, icon, main, sub}` |
| `/view` | `{key}` | `{invite, nick, icon, main, sub, open, created, active, friends:[{rid, nick, icon, main, sub, joined}]}` (참여 순) |
| `/erase` 주인 | `{key, act: map·close·rekey·reinvite}` 또는 `{key, act:"friend", rid}` | rekey → `{key}`, reinvite → `{invite}`, 나머지 `{ok:true}` |
| `/erase` 친구 | `{del, act:"leave"}` | `{ok:true}` |

- `icon`: i01~i24 / `main`·`sub`: warrior·sage·lover·rebel·caregiver·explorer·creator·ruler
- 별명: 서버가 앞뒤 공백 제거 + NFC 정리 뒤 저장
- 키 표준형 문자 `0123456789ABCDEFGHJKMNPQRS`, 해시 = SHA-256("SOM" + 표준형). 표본은 tests.md

## 상태 코드 (본문은 늘 `{"error": 코드}` 한 칸, OPTIONS는 204)
| 상태 | 코드 | 언제 |
|---|---|---|
| 400 | `bad_request` | 칸·모양 틀림 |
| 400 | `nick` | 별명 걸러짐 |
| 400 | `method` | POST·OPTIONS 아님 |
| 403 | `origin` | 출처 다름 / Origin 없음 |
| 404 | `not_found` | 모두 같은 응답. peek는 닫힘·찼음도 404 |
| 409 | `closed` / `full` | join만 |
| 413 | `too_big` | 본문 1KB 초과 |
| 429 | `rate` | `Retry-After` = 다음 정시까지 초 |
| 503 | `off` / `quota` / `db` | 설정 덜 됨·모의 down / 하루 상한 / 저장소 오류 |

## 모의 서버
- 지도 요청: `POST /__dev/map/<경로>`. test 모드에서는 data.js 응답에서만 `map.mode`→"test", `map.api`→"/__dev/map"으로 바꾼다. data.js `map` 객체 안에서 `mode`·`api`를 안쪽 중괄호보다 앞에 둘 것.
- `ALLOWED_ORIGIN` = `http://127.0.0.1:<포트>` → e2e는 127.0.0.1로 연다(localhost면 403).
- `/__dev/map-switch?down=1|0&slow=<ms>&clock=+91d|+3h|0&cap=<n>|default&limits=reset` (clock은 지정값, 누적 아님)
- `/__dev/map-store(?clear=1)`: maps·friends·quota 행. e2e 시작 때 `limits=reset`·`clear=1`
- 지름길 `/__dev/skip?rooms=7&join=<22자>&birth=YYYY-MM-DD` (join → sessionStorage `strange-oracle-map`에 `{"join": …}`)

## H3 할 일 (H2 메모)
- build-dist 가드 ⑩~⑬, 특히 ⑫(friend-map 폴더·`key_hash`·`/__dev/map` 0건). PRODUCT_EXCLUDE에 friend-map은 H2가 넣었다.
- e2e-map, map-score.test.js(배치 측정 mulberry32, 시드 1~20)
- 검수 2차 권장 2: 같은 코드 친구 10명 이상 표본에서 겹침 선택 목록이 뜨고 모두 고를 수 있는지
- HANDOFF 1·4장
