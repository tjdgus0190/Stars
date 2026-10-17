# PROGRESS-18 (18단계: 상품성·전환 개선)

번호는 늘 "확인 N" / "결정 N"으로 앞말을 붙여 쓴다(검수 2차 권장 3).

## J2 developer — 2026-10-18

- **시작 커밋(18단계 시작 직전 코드, 18-12의 14 성능 기준):** `3dface52597118607426d21457fec5f94baa935a`
- 지킬 것: index.html·style.css·design 문서 안 고침(designer). 커밋·push 안 함. 모의 서버 8788 test만(8787 금지).

| # | 할 일 | 상태 |
|---|---|---|
| a | apply-17·check-17 `--stage 18`, copy-18/items.json (164항목·21묶음, 빈 book-cross.js 키), README 18단계 절 | done |
| b | firstLine → data-book-sample.js(결정 117)·도구 지우기·check-17 경로·build-dist ① 허용 이름 하나 | done — 169개 옮김(유료 원본 169줄 삭제만, 다른 값 불변 확인), 한 번 쓴 move-first.js 지움, copy-17 items firstLine 경로 → data-book-sample.js(check-17 실패 0), build-dist ① `(free\|sample)`·가짜 data-book-fake.js는 실패 확인, make-volume 불일치 0(방 분량에서 첫 줄 빠짐) |
| c | book-cross.js 키 구조·함수 FILES cross·arch-core.js·18-2 규칙·240만 조합 시험·make-volume·app.js 14장 | done — book.js crossPick·crossChapter·crossTable·crossVolume, netlify/functions/book.js FILES cross(12개), map.js가 arch-core.js를 읽음, cross.test.js(240만 조합 누락 0), make-volume V.cross·avg.cross·대조 3000건, app.js 새 장 목차 줄·그리기·쪽 나눔 |
| e | 관심사 순서(18-8) | done — book.js interestOrder·bookOrder, 목차·미리보기 목차·받는 것·장 끝 다음 장·시기별 흐름 영역 순서, 안내 줄 |
| f | 이벤트 값(18-11) | done — so_book step preview·chapter cross, so_pay view from preview·toc·other(#deeper 첫 화면 포함) |
| g | 18-9 시험·문서 기대값 | done — book.test 12개, e2e-book 14장·새 장, e2e-pay 12장·A1(목차+토스트)·A1b·받는 것 알약, e2e-flow 6/6 미리보기 카드, e2e-pay J off 목록, HANDOFF 5장, 주석 11장 → 12장(app.js·book.js·함수) |
| d | 미리보기 화면·18-5 상태표·openCover 분기·#preview·offStrip (J1 마크업 끝 뒤) | done — lockedRoad 한 분기, gateBook(#preview), 입구 카드 all/owned, 나의 이야기 카드, offStrip 4 template. e2e-book 96/0 |
| h | J1 마크업·스타일 연결, tests.md, HANDOFF | done — design 「18단계 (J1)」 8절 1~5 연결(키 이름은 data.js 키 끝 목록대로: tagPaid·legendMain/Sub·markMain/Sub·bookLinkPaid), tests.md 「18단계」 절, HANDOFF 4·5장 |
| t | 시험 전체 | done (아래 J2 끝) |

## 메모

**(a) 끝 — copywriter 시작 가능** (2026-10-18). 첫 묶음: `cross-lens` (`node tools/strange-oracle/check-17.js --stage 18`이 다음 묶음·자리 값을 찍음, 사용법 copy-17/README.md 「18단계」 절)
- 방 2~7개 모든 조합 2,396,736개를 돌려 164 열쇠가 모두 나옴 → 뺀 열쇠 0 (cross.test.js에서 다시 봄). n=7 가중 비율: 한 목소리 5.0% · 두 갈래 43.2% · 굵은 줄기 29.7% · 여러 갈래 22.2% (planner 추정과 같음)
- 키 구조(book-cross.js): shape.<one|two|trunk|many>.<주 원형> · common.<축>.<주 원형> · split.<축> · even.<주 원형> · lens.<방> · pair.<주>-<홀로 다른 방 원형> · same.<주 원형> · close.<주 원형>
- {axis} = 2쪽 공통 축 C, 3쪽 차이 축 D, 그 밖 칸은 C. 분량은 원본 글자 그대로(자리 값 꼴 포함) 센다
- `arch-core.js`: off 빌드에도 넣되(test 모의 서버가 dist에서 내주도록) off 화면에서는 부르지 않는다(책·지도를 열 때만 받음)

**data.js 키 끝** (developer, 2026-10-18) — copywriter는 아래 키의 [초안]을 채운다. 이 뒤 developer가 data.js를 고칠 땐 직전에 다시 읽고 작은 Edit로만.
- `hub.book.goPreview`·`goReopen` · `book.cross.markSub` · `story.bookLinkPaid`·`story.preview.{eyebrow,title,desc,go}` · `pay.backPreview`·`pay.what.crossWait`
- `book.toc.{needCross,previewBand,previewBandSub,buyNow({price}),lockedToast}` · `book.parts.cross` · `book.chapter.blurbs.cross`
- `book.cross.{axis(=지도 축 이름, 확정값), secs.{voices,common,split,even,lens,pair,same,close}, caption({n}), table.{room,arch,common,split,pending,scale}, legendMain({arch}), legendSub({sub}), markMain, avg({v}), high, low, join, notes.more}`
- `book.preview.{title({who}), lede, tocTitle, tagFree, tagPaid, vol({n}{m}), sampleTitle, sampleTag, firstTitle, firstRest({n}), crossRest, closeOpen, diffTitle, diff.{freeHead,bookHead,free[4],book[6]{name,line}}, onceTitle, once({price}), onceCode, go({price}), linksAria, toToc, toStory}`
- `book.interest.sibyl.{love,relation,work,self}` · `book.interest.rune.{love,work,self}` (룬에는 관계 주제가 없어 7줄)
- 18-9 표의 사실 맞추기(`hub.book.desc` 가격 빼기·`pay.what.free`·`pay.refund.body`·FAQ 4·주석 11장)는 copywriter 몫이라 developer는 손대지 않음

## J1 designer — 2026-10-18

- 지킬 것: index.html·style.css·design 문서·이 칸만. app.js·data*.js·book.js 안 고침. 커밋 안 함. 8788만.
- [x] 1. 기획 18-1~18-14·결정 117~119·17단계 디자인 절·지금 마크업(목차·결제 전·입구 카드·나의 이야기) 읽음
- [x] 2. index.html 마크업: preview-tpl(#screen-preview) · toc18-tpl(띠·관심사 줄·작은 글자 버튼) · cross-tpl(목차 줄 + 새 장 6쪽·대체 2쪽·대조표) · story-preview-tpl · pay-tpl "받는 것" 새 장 견본 줄·상태 글자·미리보기로 돌아가기 링크. 모두 pay:on 안
- [x] 3. style.css 끝 「(18단계 J1)」 블록: 미리보기·대조표·막대·새 장 6쪽·목차 띠/관심사 줄/작은 글자 버튼/잠긴 장 강조·입구 카드 all·나의 이야기 카드·받는 것 상태 글자
- [x] 4. 360·480 견본 측정(template을 꺼내 8상태): 넘침 0 · 11px 미만 0 · 새 요소 대비 미달 0 · 제목 단계 건너뜀 0 · 대조표 360 높이 390px(쪽 한 unit). 대조표 열 너비·머리 줄바꿈 고침
- [x] 5. design/strange-oracle.md 「18단계 (J1)」 절(미리보기·샘플·대조표·새 장 6쪽·목차 조각·카드 상태·받는 것·developer 요청·data.js 키·길이 제한)
- [x] 6. build-dist 통과 → 8788 test 재시작 → e2e-book 60/0 · e2e-pay 68/0 · e2e-flow reduced 127/0
- **J1 마크업 끝** (2026-10-18) — developer (d)·(h) 시작 가능. 연결할 것은 design 「18단계 (J1)」 8절

## J3 copywriter — 2026-10-18

- 지킬 것: 유료 문장은 apply-17 `--stage 18`으로만 book-cross.js에. 공개 파일·index.html·포트 안 건드림. 커밋 안 함.
- cross-lens 7 · 2,408자 checked (4쪽 방 렌즈, 방 소개 무료 문구와 사실 대조: 일간·이름 소리·달의 집·정오 태양 데칸·260일 문양·그날 던진 돌·그날 뽑은 신탁. 룬·시빌라는 "그날의 물음에 답한 목소리")
- cross-shape-one·two·trunk·many 32 · 10,512자 checked (방 2~7개 공통, 방 수는 {n}만)
- cross-common-act·talk·heart·order·free 40 · 9,474자 checked
- cross-split 5 · 2,260자 checked
- cross-pair-1~7 56 · 15,330자 checked (두 원형 모두 "쓸 수 있는 힘"으로, 깎는 말 0. "{room}만"→"{room}은"으로 바꿔 홀로 다른 방이 하나뿐이라고 단정하지 않음)
- cross-even 8 · 2,233자 / cross-same 8 · 3,244자 checked (대체 문장. same은 n≤5에서도 맞게 룬·시빌라 언급 뺌)
- cross-close 8 · 2,263자 checked
- **새 장 유료 본문·대체 문장 끝** — 164/164 checked, 합 47,724자(목표 약 5.1만의 94%), check 실패 0. 확인 목록 8건은 모두 note(수 낱말·당연하게/유연하게·문제=풀 일 등)
- 다음(대기): (h) done 뒤 data.js [초안] UI·미리보기·관심사 줄·카드 문구 → 18-9 → 기록 → clean-draft·sync-text·make-volume·build-dist

**J2 끝** (developer, 2026-10-18) — 시험: 단위 168 · check-17 0 · check-17 --stage 18 0 · make-volume 0 · build-dist 통과 · e2e saju 41 · book 96 · pay 69 · map 80 · utm 29 · flow reduced 127 · motion 128 · off-diff-18 off 20화면 차이 0. 첫 화면 파일 목록 같음·새 파일 요청 0, 전송 바이트 +5.8%(off) — 운영자·QA 판단(tests.md 「18단계 · 성능」). 커밋 안 함.
- data.js [초안] 0 (UI·미리보기·관심사 줄·카드·토스트·받는 것 상태 글자). 길이 때문에 바꾼 것: secs.close "서 있을 곳, 고를 곳"(16자 제한), toc.buyNow "책 전체 열기 · {price}원"(18자), blurbs.cross·story.preview.desc 짧게. 장 이름 확정 「겹치는 곳, 갈리는 곳」
- 확인 123: hub.book.desc 가격 뺌, pay.tocLocked "결제하면 열려요" → "책에서 열려요"(1~6/7 목차 잠긴 장 줄마다 보여 걸림). FAQ 4는 가격 남김(운영자 판단)
- 18-9: pay.what.free·refund.body·FAQ 4(12장)·주석, legal refund 제1조·terms 제2조의2·privacy 제4조의3. grep 남은 것: data.js 952 단계 이력 주석, index.html 3594 주석(손대지 않음)
- reports/copy 18단계 절, specs/selling 18단계 한 줄
- clean-draft(index.html [초안] 0) → sync-text(changed 4, meta 4) → make-volume(불일치 0, avg.cross 1,919) → build-dist(유료 지문 0, cross 148 포함, 통과) → 단위 시험 10개 전부 fail 0 (cross 13·book 17·pay 25·map 40 등). e2e는 서버를 건드리지 않아 미실행
- **J3 끝** (2026-10-18)
