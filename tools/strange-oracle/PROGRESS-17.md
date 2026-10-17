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
