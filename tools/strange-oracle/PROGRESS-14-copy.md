# 14단계 copywriter 진행표 (F1·F3)

기준: specs/strange-oracle.md 「14단계」 14-1(결과 설계 S1~S5·8장 표·금지어), 14-4(Ⅰ 장 분량), 운영자 결정 83~94.
방식: 항목마다 `content-work/out-14/<항목>.json`에 Write 한 번 → `node content-work/apply-14.js`가 합쳐
`products/strange-oracle/data-saju.js`와 `products/strange-oracle/api/_paid/book/book-saju.js`를 만들고 분량·금지어를 검사한다.
끊기면 아래 표에서 "미완"인 항목부터 이어서 쓴다. 이미 쓴 json은 다시 쓰지 않는다.

## 키 구조 (apply-14.js가 만드는 모양)
- data-saju.js: `window.SAJU = { text, stems[10], elements:{many,few,empty}, groups, daeun }`
  - stems[i]: code, hanja, name, title, key, keywords[3], archetype, archetypeWhy, body[](S1), gongsu(S5), summary[], identity{title,lede}, event{hook,title}, shadow{title}, advice{title}
  - elements.many/few/empty: { wood, fire, earth, metal, water } 각 문자열(S2a/S2b)
  - groups: { bigyeop, siksang, jaeseong, gwanseong, inseong } 각 { name, gloss, text(S3) }
  - daeun: { forward, backward } (S4, {age} 치환)
- book-saju.js: `window.BOOK_SAJU = { full[10], hidden[5] }` (data-book-ogham.js와 같은 모양)
  - full[i]: code, identity{rest[]}, event{lede,body[],quote}, shadow{hook,lede,body[],quote}, advice{hook,lede,body[]}
  - hidden[j]: code "saju-<group>", title, body[]

## 진행표
| 항목 | 파일 | 내용 | 상태 |
|---|---|---|---|
| F1 | specs/selling-strange-oracle.md | 만신의 방 셀링 포인트 덧붙임 | 완료 |
| text | out-14/text.json | 의식·화면 문구 | 완료 |
| stems-1 | out-14/stems-1.json | 갑·을 (S1·S5·짧은 칸·summary) | 완료 |
| stems-2 | out-14/stems-2.json | 병·정 | 완료 |
| stems-3 | out-14/stems-3.json | 무·기 | 완료 |
| stems-4 | out-14/stems-4.json | 경·신 | 완료 |
| stems-5 | out-14/stems-5.json | 임·계 | 완료 |
| modules | out-14/modules.json | S2a·S2b·S3·S4 | 완료 |
| book-1 | out-14/book-1.json | Ⅰ 장 갑·을 | 완료 |
| book-2 | out-14/book-2.json | Ⅰ 장 병·정 | 완료 |
| book-3 | out-14/book-3.json | Ⅰ 장 무·기 | 완료 |
| book-4 | out-14/book-4.json | Ⅰ 장 경·신 | 완료 |
| book-5 | out-14/book-5.json | Ⅰ 장 임·계 | 완료 |
| book-hidden | out-14/book-hidden.json | 숨은 장 5묶음 | 완료 |
| apply | content-work/apply-14.js | 합치기·분량·금지어 | 완료 |

## 메모
- stems-1~5: 분량 보충으로 일간마다 S1에 "기운이 살아나는 때" 단락 1개를 끼워 넣었다(배움 단락 뒤, 이미 json에 반영됨). 다시 넣지 말 것.
- 무료 S1~S5 합계 28,545자, 한 결과 3,090~3,616자 (apply-14.js --check 기준).
- book-1: 분량 보충 단락을 이미 끼워 넣음(갑 3,118 · 을 3,010). book-2~5는 rest 3·event 6·shadow 5·advice 6 단락으로 쓴다.
- 최종(apply-14.js): S1~S5 28,567 · 한 결과 3,089~3,616 · Ⅰ 장 32,885(숨은 장 3,813 포함) · 금지어 0건. data-saju.js·book-saju.js 생성 완료.
