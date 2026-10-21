# PROGRESS-19 (19단계: 운영자 요청 묶음)

번호는 늘 "확인 N" / "결정 N"으로 앞말을 붙여 쓴다.

## K2 developer — 2026-10-18

- **시작 커밋:** `93626833dc788c1408101a2023f421aee3fc61f8`
- 지킬 것: index.html·style.css의 마크업·스타일은 designer 몫(19-2 표의 면책 자리·스크립트 줄 삭제만 developer). marketing/ 안 고침. 커밋·push 안 함. 모의 서버 8788만(8787 금지, 8789 안 건드림). 비밀값 0.

| # | 할 일 | 상태 |
|---|---|---|
| s | meta.json status "개발"(확인 135) | done |
| a | 가격 5,900원(19-1) | done — 19-1 표의 developer 칸 전부(data.js·index.html 정적 글·주석·pay.js PRICE·refund·terms·시험 9개·HANDOFF·tests.md), 틀린 금액 목록에 "3900" 더함, e2e-pay off 정규식 3,900|5,900 |
| b | 면책 제거(19-2)·docs/common.md 표 | done — app.js Mount 5곳·넘김 2곳, app-book.js·map.js, index.html 스크립트 줄·disclaimer-slot 9·map-disclaimer 2·주석, style-book.css `.preview .disclaimer-slot` 한 줄(style.css 쪽은 K1이 이미 지움), docs/common.md 표. common/disclaimer.js 그대로. terms 제3조는 K3 |
| e | GA4 ID·cdp.js 막기·모의 서버 G-TEST12345·실행기 출력·build-dist ⑭ | todo |
| f | 페이앱 userid·shopname(19-6)·mock-pay | done — data.js userid·shopname, mock-pay transformDataJs 어떤 userid든 MOCK_USERID, pay.test 배포판 시험에 두 값·비밀 키 없음 |
| k | data.js 새 키 [초안] → "data.js 키 끝" | done (메모 첫 줄) |
| c | 동의 화면 19-3 연결 (K1 마크업 끝 뒤) | todo |
| d | 바로 가기 띠 19-4·so_tab (K1 마크업 끝 뒤) | todo |
| g | 시험 기대값·tests.md·HANDOFF | todo |
| t | 시험 전체 | todo |

## 메모

**data.js 키 끝** (developer K2, 2026-10-18) — copywriter(K3)는 아래 키의 [초안]을 채운다. 이 뒤 developer가 data*.js를 고칠 땐 직전에 다시 읽고 작은 Edit로만.
- data.js `hub.tabs.aria·share·story·book`(칸 이름 5자 안), `map.tab`(5자 안), `map.tabLocked`(토스트, 30자 안)
- data-map.js `consent.summary`({main}·{sub} 자리, 보내는 항목·보관 기간), `consent.more`·`consent.less`, `consent.purposeLabel`·`consent.purpose`, `consent.agree`(새 뜻으로 바꿈)
- 값만 바꾼 것(문구 아님): data.js `analytics.ga4` = G-4J5SVQV3B1, `pay.amount` 5900·`pay.buy`·FAQ 4 가격, `pay.payapp.userid`·`shopname`

## K1 designer — 2026-10-18

- 지킬 것: index.html·style.css·design 문서·이 칸만. JS·data*.js·marketing/ 안 고침. 커밋 안 함. 8788만 재시작(8787·8789 안 건드림).
- 시작: spec 19-2·19-3·19-4·19-7의 5·19-8, 검수 2차, 지금 마크업(입구·동의 화면·면책 자리) 읽음.
- 입구 바로 가기 띠 마크업(nav.hub-tabs, 칸 4개·완료 줄·pay:on/map:on 구획) 넣음.
- 동의 화면 마크업: 요약 줄·체크·details 자세히 보기(목적 줄 + 기존 고지 7 = 8항목) 넣음.
- style.css 끝 「(19단계 K1)」 블록: 띠(1~4칸·안전 영역·숨김·움직임 줄이기·토스트 올림), 동의 화면 접기 모양, 면책 빠진 자리 여백.
- design 문서 「19단계 (K1)」 0~8절. 시험: build-dist(⑭만 실패, 기대대로) → 8788 test 재시작 → e2e-flow reduced 126/1(GA 기대값) · e2e-map 77/3(접힘 1·면책 2 기대값). 띠 탓 실패 0.

**K1 마크업 끝**
