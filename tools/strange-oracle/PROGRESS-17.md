# PROGRESS-17 (I2 developer: (a) 문구 도구 · (b) 구조)

범위: specs 17-14 I2의 (a)(b)만. (c) 성능 (d) 작은 일 (e) I1 연결은 다음 작업.
지킬 것: index.html·style.css·design 문서 안 고침. 커밋 안 함. 모의 서버 8788 test만.

| # | 할 일 | 상태 |
|---|---|---|
| 1 | 코드 조사 (book.js·app.js 책·make-volume·함수 book·build-dist·map.js 주보조·ageBand·이어가기 코드) | done |
| 2 | (b) book-yeon.js 키 구조 (빈칸, apply-17 --init이 만듦) | done |
| 3 | (b) netlify/functions/book.js FILES yeon | done |
| 4 | (b) book.js: archPair·ageOf·bandOf·isTeen·yeonChapter·yeonTable·yeonVolume, fullRoom firstLine·heartLine | done |
| 5 | (b) app.js 13장(유료 11장)·yeonCtx·인연의 장 그리기·목차 줄 임시 복제, firstLine·heartLine 그리기, data.js book.yeon 키 | done |
| 6 | (b) make-volume V.yeon + 판별 대조 | done |
| 7 | (b) build-dist 지문 검사 book-yeon 포함(문구 전 빈 원본은 알림) | done |
| 8 | (a) items.json 484·apply-17·check-17·copy-17/README | done |
| 9 | 단위 시험 yeon.test.js + book.test.js 11개 허용 목록 · e2e-book 13장·인연의 장 · e2e-pay 11장 | done (단위 151 통과, e2e-book 58) |
| 10 | 모의 서버 재시작(8788 test), e2e saju 41·book 58·flow reduced 127·motion 128·map 77·pay 67, 실패 0 | done |

## 메모
- 원본 파일은 CRLF·LF가 섞여 있다. 고칠 때 Edit 도구를 쓴다(문자열 치환 스크립트가 줄끝 때문에 못 찾은 적 있음).
- 여러 결과를 엮는 장은 룬뿐(과거·지금·다음). firstLine·heartLine = "지금" 자리 결과 것(book.js fullRoom). 다른 방은 결과 하나.
- heartLine 자리 = Ⅱ장 마지막 줄(shadow.hook 떡밥) 바로 앞 p.book-heart-line. firstLine = Ⅰ장 맨 앞 p.book-first-line. (designer I1 상자 모양 대기)
- 이어가기 코드: SOG2는 saju 칸(1~5000)으로 일간을 되찾음(sajuStem = (code-1)/500). SOG1은 만신 없음 → 계절 쪽 noSaju. 둘 다 생년월일 없음 → notime.
- items.json 484항목(인연의 장 146 + heartLine 169 + firstLine 169), 묶음 51개. 첫 묶음 yeon-pull.
- check-17 지금: 성별어 기존 6건 실패(시빌라 여성 예언자 2·별 여성의 자궁 1·오검 언니 1·별 숨은 장 아내 2) → copywriter I3 성별어 단계.

# I2 (c)(d)(e) developer — 2026-10-17

| # | 할 일 | 상태 |
|---|---|---|
| e0 | data.js 키: book.yeon.secs.{pull,habit,meet,pulse,same,scene,when,season,teenKnow,teenFriend,teenPlace}·seasons.{wood..water}·notes.{more,noAge,noSaju}·bands·bandNow·bandNext, book.heartLabel, pay.what.newBadge (옛 pages·notes.sameMore는 secs·notes.more로 이름 바꿈, book.js note 값도 more) | done |

**data.js 끝** (developer) — 이 뒤로 developer는 data.js를 고치지 않는다. copywriter는 위 키의 [초안]을 채운다.
| c0 | (c) 기준 측정 (perf.js 5회+CLS로 고침): ①+② 3.26초 · ① 3.15초 · CLS 0.001 · ①까지 340KB | done |

# I3 copywriter — 2026-10-17

| # | 할 일 | 상태 |
|---|---|---|
| i3-1 | 문구 묶음 (copy-17) | 51묶음 484항목 전부 checked |
| i3-2 | 성별어 6건 · 장 수 9곳 · data.js [초안] · 떡밥 8 · 정리 · 보고 | done (check-17 실패 0, build-dist 통과, 단위 151) |
| c1 | 시도 1 글꼴: dist 사본에서 jsdelivr 글꼴 6줄을 모두 뺀 상한 시험 → 3.45초(줄지 않음). 글꼴 파일은 style.css·app.js 뒤(2.08초~)에 받기 시작해 ① 경로에 없음 → 바꾸지 않음 | done |
| c2 | 시도 2·3 style.css: style.css를 통째로 비운 상한 시험(모양 없음) → 2.92초. 나눠도 최선 약 0.3초, 실제 나눔(층 순서 유지)으론 3.0 두 번 못 맞춤 → 하지 않음(designer 파일) | done |
| c3 | 원인 추적: 첫 Layout 1회 890ms(객체 342개, CPU 4배). 로드 뒤 다시 배치는 0.4~1.8ms → 첫 배치만 비쌈(글꼴 대체·글자 모양 캐시 첫 계산 추정, 미확인). 시도 4 template 상한 = 첫 UpdateLayoutTree 131ms, 시도 5 CLS 이미 0.001 → 하지 않음 | done |
| d1 | QA16 권장5: worker.js 본문 읽기 오류 → core readError → 503 {error:"db"}(Origin 확인 뒤, CORS 포함) + map.test.js 단위 시험(503·403) | done |
| d2 | QA16 권장2: map.js peekJoin(fresh) — 참여 카드를 누르면 peek를 다시 물어 쉼이면 카드에 down(동의 전). e2e-map 검사 1줄 | done |
| d3 | QA16 권장1: e2e-map B 브라우저도 GA 시험값, dataLayer(두 브라우저)·localStorage(중간·끝)에서 INPUTS 검색, B map_join·map_leave 검사 | done |
| d4 | HANDOFF 3-8 옛 결제 주석: index.html 책 한 줄 주석 6곳×3줄, app.js 책 머리 주석 3줄(광고·토스 표현 정리) | done |
| d5 | HANDOFF 3-8 data.js 오류 키: resume.errors.receipt → notResume (data.js 한 줄 Edit, app.js 대응표, e2e-flow 기대값) | done |
| e1 | (e) app.js: yeon-tpl article 복제로 인연의 장 그리기(쪽 번호 다시 매김·미성년판 1~3쪽 자리·4·5·6쪽 지움·시기 칸 li·계절 이름 data-el·안내 hidden 풀기), 책 쪽 나눔(쪽 머리·칸·안내 = unit), 첫 줄·마음 한 줄 = 견본 복제(마음 한 줄 Ⅰ장 끝, 룬은 '지금' 묶음 끝, unit), 결제 전 목록 .pay-list__item--new + .pay-list__new, e2e-book 검사 갱신·추가 → 59/0 | done |
| e2 | e2e-map 77 vs 78: 파일 합계(out/e2e-map.txt)는 77이 맞고, 화면 console 합계 식(out.length - fails - 1 + 1)이 바로 위에서 넣은 합계 줄까지 세어 1 많게 찍힘 → 식 고침. 이번 검사 3개 더해 80 | done |
| e3 | e2e-pay 17-5 받는 것 인연의 장 줄·새 장 알약 검사 1개 → 68 | done |
| e4 | 성능 2회차(I2 끝): ①+② 3.23초 · CLS 0.002 · 방 전환 미리 받음 372ms(경계 넘음) · 쪽 넘김 433ms. tests.md 「17단계」 절, HANDOFF 갱신 | done |
| 끝 | 시험: 단위 151 · saju 41 · book 59 · pay 68 · map 80 · flow reduced 127 · motion 128 · make-volume 불일치 0 · build-dist 통과. 커밋 안 함 | done |
| i3-3 | 말투 카드 7장·대조, HANDOFF 3-8 2건(sage-creator 덮어쓰기 1 추가), selling 한 줄 | done (화면 문구 수정 0, 오검 격식 운영자 확인) |

# 결정 114 · I4 developer 요청 — 2026-10-17

| # | 할 일 | 상태 |
|---|---|---|
| j1 | 결정 114: book.js isTeen·TEEN_UNDER·alt-teen 경로 지움(19세 미만도 base+b1), app.js yeonCtx teen·SLOT teen 지움, data.js secs.teen* 3키, book-yeon.js alt.teen 통째로(29항목 11,779자), items.json 29항목·lib.js 묶음 4개, make-volume 다시(불일치 0), yeon.test 19세 미만 시험 바꿈 → 단위 151/0 | done |
| j2 | I4 요청 1: 원인 = fixShortEnd가 쪽 머리 unit(.yeon-sec__head 감싼 section)을 머리로 안 봐, 마지막 쪽 50자 미만일 때 앞 쪽 단락을 통째로 넘김 → 쪽 머리만 남음. isSecHead·headish 더함(fixShortEnd 멈춤 + 끝 문장만 넘기기 moveTail, splitPara 단락째 넘김 금지, place keep). 오타 /s+/g 2곳 → \s+, moveTail 문장 정규식 \]·\s 빠짐도 고침. e2e-book I4-1(360·480·360) → 60/0 | done |
| j3 | I4 요청 2(선택) 시기 칸: 360px에서 머리 22 + 칸 324 + 칸 324 = 670px > 쪽 595px → 나눠도 2쪽 그대로(빈칸이 다음 쪽으로 옮겨갈 뿐, 한 칸 글이 두 쪽으로 갈림) → 하지 않음 | done |
| 끝 | 시험: 단위 151/0 · saju 41 · book 60 · pay 68 · map 80(끝에 map-switch reset) · flow reduced 127 · motion 128 · make-volume 불일치 0 · build-dist 통과 · check-17 실패 0. 커밋 안 함 | done |

# I5 qa-reviewer — 2026-10-17

| # | 할 일 | 상태 |
|---|---|---|
| q0 | 문서 읽기 | done |
| q1 | 모의 서버 8788 test 재시작 · 단위 155/0 · check-17 실패 0 · make-volume 불일치 0 · build-dist 통과 · saju 41 · book 60 · utm 29 | done |
| q2 | e2e-pay · map · flow (백그라운드) | doing |
| q3 | 사람 눈: 전부 읽기 77 + 떡밥 8 + 무작위 40(시드 17) 읽음. 필수 후보 heartLine.tzolkin.manik "내민 손을 잡아 보세요"(스킨십, 애매→금지). 건강어 목록 11개뿐, 넓힌 grep 0건 | done |
| q4 | 장 수 11장(legal 3·data.js·index.html)·환불 "새로 더해진 장" 확인, 10장 0. teen 잔여: index.html 3059 + app.js 2796 주석(새로 찾음, 권장). book 요청 {pass,file}. [초안] 0. utm 코드·privacy 4조의2 대조 일치, analytics.js 쓰는 제품 strange-oracle뿐 | done |
| q5 | 광고 영상: ffprobe 2개 규격 맞음, --check 다시 26컷(3줄 자막 0), 대표 컷 6장 눈으로 안전 박스 안, 원국 丙寅·甲戌·辛巳·庚午 = saju.js, 외부 주소 jsdelivr @fontsource 5개뿐 | done |
| q6 | flow motion 128/0. reports/qa 「17단계 (I5) QA 1차」 판정 수정 필요(필수 1: heartLine.tzolkin.manik → copywriter). meta.json 그대로 | done |
