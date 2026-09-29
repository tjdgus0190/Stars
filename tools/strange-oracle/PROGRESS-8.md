# 8단계 기능 구현 진행 기록 (developer, 이어받기용)
- [x] 3a. 문구 이동 (scratchpad s8/move8.js, 되돌릴 때는 git): 공개 data-*.js의 identity 뒤 단락 → full-*.js `identity.rest`, event.lede(룬 past.lede) → full-*.js `event.lede`/`past.lede`.
  합계 599,312자 전후 동일, 병합 대조 일치, HTML 0. content-work/paid-template/ 복사함. 공개 파일 머리에 8단계 안내 2줄.
  자른 항목: 오검 ruis · 별 22개 · 데칸 decan-1·9·25·31·32 · 촐킨 imix · 시빌라 0 · 룬 24개 전부(돌마다 첫 단락만, 평균 67자).
  무료 핵심 풀이 평균(lede+남은 body): 오검 621 · 별 681 · 데칸 648 · 촐킨 625 · 시빌라 411.
- [x] 3b. core.js fullRoom(ch1Rest·ch2 앞 lede·hidden 방 안, 별도 hidden 장 삭제) + confirm 6방 검증(400 incomplete)
- [x] data.js 8단계 [초안] 키 추가 (topbar.home/room, room.saved, ritual.skipHint, rooms.*.short, hub.cta/journey/sofar/book/faq/clearNote, result.readingTitle/bookLine/shareSub/retryLink, deeper.*, book.*)
- [~] 1. app.js: 이동 블록 교체 끝(setTopbar·history record/popstate·playSigil·openRoom·renderHub·headOf). 남은 것: renderBookCard·receipt-toggle, 인트로 코드·BACK·intro-receipt 삭제, 부팅
- [x] 2. 상징 떠오름 playSigil (문·주 버튼·다음 방 문·지금까지 줄=flash). 
- [x] 3c. 방 결과: renderReading·entryReading·책 한 줄(updateBookLines)·U4 waitResult·U3 startRoom/room-saved. 남은 것: 결제 6/6 잠금(deeper)
- [x] 1 마무리: renderBookCard·receipt-toggle·인트로/BACK 삭제·부팅(새 세션=입구, 같은 탭 해시=화면 이름)
- [x] 3d. 미리보기 6/6 잠금(deeper-gate, updatePayButton), startPay allDone, VOL 8단계 실측(room 새 문장·free 핵심 풀이)
- [x] 4. 책 리더: renderReport(제1부 bookCh1 + ch1Rest, identity.close 제외), 목차 시간·9칸 진행률(updateBook)·bookmark(strange-oracle-bookmark, 부 id만)·목차 시트·책 안 앵커 가로채기·jumpTo
- [x] 5a. mock-server 두 개(8787 mock·8788 off) 끄고 다시 켬(백그라운드). build-dist 누출 0(유료 문장 5,629개). e2e-flow.js 8단계로 새로 작성: reduced 58/0, motion 59/0
- [x] 5b. api.test.js 17/17 (새: 8-1 6방 confirm 400·옛 코드 재열람, 책 순서·hidden 방 안·close 없음, VOL.room 실측 ±3%, 공개 파일 rest·lede 없음·750자 규칙, git e996e59 대비 이동 손실 0)
- [x] 5c. e2e-paid.js 8단계로 갱신: reduced 93/0, motion 93/0. http-check.js(6방 코드·incomplete) 23/0. e2e-flow 재실행 58/0·59/0. build-dist 누출 0.
- [x] 5d. tests.md 8단계 절 추가, meta.json status → "개발". mock-server 두 개 끔.
- [x] 전체 완료 (2026-09-29). 남은 판단: copywriter [초안] 키, story.paid.lead·list(“새 문장만” 문구가 사실과 달라짐), designer 확인(별 맞아요 인셋을 공감 카드 안에 JS로 넣음, 사실 목록 li 모양)
- 이전 메모: 브라우저로 콘솔 에러 확인 → 시험 갱신(api.test·e2e-flow·e2e-paid) → build-dist 누출 검사 → tests.md
- [ ] 5. 시험·tests.md
