// 17단계 문구 검사 (spec 17-4·17-6·17-13의 1). 사용법: tools/strange-oracle/copy-17/README.md
//   node tools/strange-oracle/check-17.js          새 항목 검사 → 통과 = checked, 실패 = written. 성별어는 기존 무료·유료 전체도 본다
//   node tools/strange-oracle/check-17.js --old    기존 문장에 걸린 금지·확인 목록을 하나씩 찍는다(보고만, 고치지 않는 원칙 17-1)
// 끝에 남은 묶음 파일 수(copy-17/out)와 다음에 할 묶음을 찍는다. 실패가 하나라도 있으면 exit 1.
// 금지 목록 = 걸리면 실패. 확인 목록 = 사람이 보고 판단을 items.json note에 적는다(묶음 JSON의 "notes"로 넣을 수 있음). note가 없으면 실패로 센다.
// (18단계 J2-a) --stage 18: copy-18/items.json(새 장 164항목, 원본 api/_paid/book/book-cross.js)을 본다. 17-4 목록 전체 + 결정 116 건강어 + 18-4 목록
//   + 자리 값 이름(그 칸 vars만) + 자리 값 뒤 글자 허용 목록(18-2, 정규식은 spec 18-4 표 그대로, 검수 2차 조건 1로 둘째 정규식에서 '의'를 뺌)
//   + 축 이름 대조(data.js book.cross.axis = data-map.js map.axis) + 길이 + 끝맺음. 성별어 전체 검사는 단계와 관계없이 같다.
"use strict";
const fs = require("fs");
const path = require("path");
const L = require("./copy-17/lib.js");

// ok = 오탐 제외 규칙: 이 정규식에 맞는 부분을 글에서 지운 뒤 검사한다 (예: 피로연·골치 아픈·약 3분)
const W = (word, re, ok) => ({ word, re: re || new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), ok });
// ── 금지 목록 (17-4 표 왼쪽 열). 성별어는 따로(전체 검사)
const FAIL = [
  ...["반드시", "무조건", "틀림없이", "100%", "운명의 상대", "천생연분", "결혼한다"].map((w) => W(w)),
  ...["올해", "내년", "내후년", "이번 달", "다음 달"].map((w) => W(w)),
  W("○○년(숫자)", /\d{4}\s?년/), W("○월(숫자)", /\d{1,2}\s?월/), W("○살(숫자)", /\d+\s?살/), W("○세(숫자)", /\d+\s?세/),
  ...["이별", "헤어지", "영영", "놓치면", "후회할", "늦기 전에", "마지막 기회", "영원히 혼자", "평생 혼자", "버림받", "배신당"].map((w) => W(w)),
  ...["모르면 후회", "지금 아니면", "서두르세요", "피해야", "최악"].map((w) => W(w)),
  ...["스킨십", "키스", "섹시", "몸매", "침대", "입술", "안기고", "안아", "포옹", "유혹", "관능", "야한", "하룻밤", "밤을 함께"].map((w) => W(w)),
  ...["바람피", "바람을 피", "외도", "집착"].map((w) => W(w)),
  // 건강(8장): 11단계 묶음 1 기록(reports/copy-strange-oracle.md)의 고친 낱말 + (17단계 I5 QA 1차 권장 3) 넓힌 목록
  ...["병원", "질병", "몸살", "두통", "건강", "수명", "치료", "진단", "통증", "우울증", "불면"].map((w) => W(w)),
  //   (결정 116) 8장(건강·질병 예측, 죽음·사고 예언)에 직접 닿는 말만 실패. 일상어(스트레스·컨디션·피로·다이어트·체중)는 넣지 않고, 아프·아픈은 확인 목록
  ...["수술", "임신", "약국", "약사", "투병", "입원", "처방"].map((w) => W(w)),
  W("병(단독)", /(^|[^가-힣])병(?=(이|에|을|으로|과|도|든)?([^가-힣]|$))|병들|병에 걸|병이 나/, /병\s?\(丙\)/), // 물병자리·병아리·병화(丙火)는 낱말 경계로 안 걸림
  W("약(단독)", /(^|[^가-힣])약(?=(을|이|은|으로|도)?([^가-힣]|$))/, /(^|[^가-힣])약\s*(\{|\d)/), // 약속·약간·약해·계약은 안 걸림, "약 3분"·"약 {n}자"는 제외
  W("다치", /다치|다쳐/, /마음(이|을)?\s?(다치|다쳐)/),
  W("죽음·죽는다", /죽음|죽는다|죽게 되|죽을 (거예요|것|운|수도)|숨지|목숨을 잃/), // "죽을 끓여"(음식)는 안 걸림
  W("사고(일)", /교통사고|사고 위험|사고(를 당|가 나|가 날|를 조심|를 겪|가 생기|를 피|를 내)/), // 사고방식·사고력은 안 걸림
];
// 성별어 (17-4의 1·2). 오탐 제외: 알아내·찾아내의 "아내", 이성적, 원형·형태·형편의 "형", 당신부터·자신부터·신부름의 "신부"(검수 2차 권장 1)
const GENDER = [
  ...["그녀", "남친", "여친", "남자친구", "여자친구", "남편", "와이프", "신랑", "오빠", "언니", "누나", "남자", "여자", "남성", "여성", "이성에게", "이성의"].map((w) => W(w)),
  W("아내", /(^|[^가-힣])아내/),
  W("그이", /(^|[^가-힣])그이(?!상|후|전|외)/),
  W("신부", /(?<![당자])신부(?!터|름)/),
  W("형", /(^|[\s"'“‘(])형(?=이|은|한테|에게|랑)/),
];
// ── 확인 목록 (17-4 표 오른쪽 열 + 경고형 끝맺음)
const CONFIRM = [
  W("운명", /운명(?!의 상대)/),
  W("한 살 단위 수 낱말", /(스물|서른|마흔|쉰)(하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|한 살|두 살|세 살|네 살)/),
  ...["떠나", "끝나", "상처받", "외로", "혼자 남"].map((w) => W(w)),
  W("경고형 끝맺음", /(해야 해요|해야 합니다|하지 마세요|하지 마십시오|하면 안 돼요)/),
  ...["몸", "살결", "숨결", "체온"].map((w) => W(w)),
  ...["결혼", "출산", "아이를 낳"].map((w) => W(w)),
  ...["연상", "연하", "나이 차", "키 큰", "잘생", "예쁜", "직업", "연봉", "돈 많"].map((w) => W(w)),
  ...["띠", "혈액형", "서울", "경상", "전라", "충청", "강원", "제주", "사투리", "지방 출신"].map((w) => W(w)), W("혈액형 글자", /(^|[^A-Za-z])[ABO]{1,2}형/),
  ...["아프", "아픈"].map((w) => W(w)), // (결정 116) 원래 자리(확인 목록)로 되돌림
];
// ── (18단계 18-4) 새 장 검사 단어 목록 (17-4 목록 전체에 더함)
const FAIL18 = [
  ...["적중", "정확히 맞", "틀림없", "증명", "검증된", "과학적", "정밀 진단", "확실히 맞"].map((w) => W(w)), // 정확도 과장
  ...["틀렸", "가짜 당신", "거짓"].map((w) => W(w)), // 오류·모순 틀
  ...["버리세요", "고쳐야 할 원형"].map((w) => W(w)), // 원형 깎기
  // 자리 값 뒤 글자 (허용 목록, 18-2): 바로 뒤에는 '의'·띄어쓰기·문장부호(. , ! ? ·)·'」'만
  W("자리 값 뒤 글자", /\{(arch|sub|other|axis)\}(?![의」\s.,!?·])/),
  W("「자리 값」 뒤 조사", /「\{(arch|sub|other|axis)\}」(?=[은는이가와과을를로도랑]|이에|예요|라는|이라)/),
];
const CONFIRM18 = [
  ...["정확", "맞혔", "맞춘", "확실", "객관", "통계", "데이터", "입증", "일치"].map((w) => W(w)),
  ...["모순", "충돌", "어긋", "진짜 당신"].map((w) => W(w)),
  ...["단점", "약점", "부족", "모자라", "나쁜", "문제", "고쳐"].map((w) => W(w)),
];
const VARS18 = ["arch", "sub", "other", "axis", "room", "high", "low", "n"]; // 18-2 문장 조립 규칙: 이 여덟 자리 값만
if (L.STAGE === 18) {
  FAIL.push(...FAIL18);
  CONFIRM.push(...CONFIRM18);
}
const hits = (list, t) => list.filter((x) => x.re.test(x.ok ? t.replace(new RegExp(x.ok.source, "g"), " ") : t)).map((x) => ({ word: x.word }));
function scan(text) {
  const t = String(text);
  return { fail: hits(FAIL, t).concat(hits(GENDER, t)), gender: hits(GENDER, t), confirm: hits(CONFIRM, t) };
}
const END_OK = /[.!?…]["'”’)\]]*$/;

// 기존 문장 전체(무료 data*.js + 유료 원본, 새 항목 칸 빼고)
function oldStrings() {
  const out = [];
  const walk = (file, v, p) => {
    if (typeof v === "string") { if (v.trim()) out.push({ file, path: p, text: v }); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(file, x, p + "." + i));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "code" && k !== "firstLine" && k !== "heartLine") walk(file, x, p ? p + "." + k : k);
  };
  // 새 항목 원본(인연의 장 book-yeon.js·새 장 book-cross.js)은 items.json 항목으로 본다(기존 문장 아님)
  for (const f of fs.readdirSync(L.PROD).filter((n) => /^data.*\.js$/.test(n) && n !== "data-volume.js")) walk(f, L.readWin(path.join(L.PROD, f)), "");
  for (const f of fs.readdirSync(L.PAID).filter((n) => /^book-.*\.js$/.test(n) && n !== "book-yeon.js" && n !== "book-cross.js")) walk("api/_paid/book/" + f, L.readWin(path.join(L.PAID, f)), "");
  return out;
}

function main() {
  const showOld = process.argv.includes("--old");
  const items = L.loadItems();
  const cache = {};
  const fails = [], confirms = [];
  const sum = {};
  for (const it of items) {
    const v = L.valueOf(it, cache);
    const t = L.textOf(v).trim();
    const s = (sum[it.kind] = sum[it.kind] || { n: 0, todo: 0, written: 0, checked: 0, chars: 0, target: 0 });
    s.n++;
    s.target += it.target;
    if (v === undefined) { fails.push(`${it.id}: 원본에 키 없음 (apply-17 --init)`); continue; }
    if (!t) { it.status = "todo"; s.todo++; continue; }
    const n = L.len(t);
    s.chars += n;
    const r = scan(t);
    const why = [];
    if (r.fail.length) why.push(`금지어 ${r.fail.map((h) => h.word).join("·")}`);
    if (n < it.min || n > it.max) why.push(`글자 ${n}자 (범위 ${it.min}~${it.max})`);
    if (!END_OK.test(t)) why.push("끝 부호 없음");
    if (L.STAGE === 18) {
      // 자리 값 이름: 18-2의 여덟 개 가운데 그 칸에서 값이 있는 것(it.vars)만
      const used = [...t.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
      const badVar = used.filter((x) => !VARS18.includes(x) || !(it.vars || VARS18).includes(x));
      if (badVar.length) why.push(`이 칸에서 못 쓰는 자리 값 {${[...new Set(badVar)].join("}·{")}} (쓸 수 있는 것: ${(it.vars || VARS18).map((x) => `{${x}}`).join(" ")})`);
    }
    if (r.confirm.length) {
      confirms.push(`${it.id}: ${r.confirm.map((h) => h.word).join("·")}${it.note ? ` — note: ${it.note}` : " — note 없음"}`);
      if (!it.note) why.push("확인 목록에 걸렸는데 note 없음");
    }
    if (why.length) { fails.push(`${it.id}: ${why.join(" / ")}`); it.status = "written"; s.written++; }
    else { it.status = "checked"; s.checked++; }
  }
  L.saveItems(items);

  // 성별어: 기존 무료·유료 전체 (판단을 적은 것은 gender-judged.json: [{ file, path, word, note }])
  const judged = fs.existsSync(L.JUDGED) ? JSON.parse(fs.readFileSync(L.JUDGED, "utf8")) : [];
  const isJudged = (f, p, w) => judged.some((j) => j.file === f && j.path === p && j.word === w && j.note);
  const old = oldStrings();
  const gFail = [], gJudged = [];
  let oldFail = 0, oldConfirm = 0;
  const oldLines = [];
  for (const o of old) {
    const r = scan(o.text);
    for (const g of r.gender) (isJudged(o.file, o.path, g.word) ? gJudged : gFail).push(`${o.file} ${o.path}: ${g.word} — "${o.text.slice(Math.max(0, o.text.search(GENDER.find((x) => x.word === g.word).re) - 12)).slice(0, 40)}…"`);
    const f = r.fail.filter((h) => !r.gender.some((g) => g.word === h.word));
    oldFail += f.length;
    oldConfirm += r.confirm.length;
    if (showOld && (f.length || r.confirm.length)) oldLines.push(`${o.file} ${o.path}: 금지 ${f.map((h) => h.word).join("·") || "-"} / 확인 ${r.confirm.map((h) => h.word).join("·") || "-"}`);
  }

  // (18단계) 축 이름 대조: 책(data.js book.cross.axis)과 지도(data-map.js map.axis)가 같은 말 (18-2 대조표)
  const axisFails = [];
  if (L.STAGE === 18) {
    const T = L.readWin(path.join(L.PROD, "data.js")).TEXT || {};
    const TM = fs.existsSync(path.join(L.PROD, "data-map.js")) ? L.readWin(path.join(L.PROD, "data-map.js")).TEXT_MAP || {} : {};
    const a = (T.book && T.book.cross && T.book.cross.axis) || {};
    for (const k of L.AXES) if (String(a[k] || "").replace(/^\[초안\]\s*/, "") !== String((TM.axis || {})[k] || "")) axisFails.push(`축 이름 ${k}: data.js book.cross.axis "${a[k] || ""}" ≠ data-map.js axis "${(TM.axis || {})[k] || ""}"`);
  }

  console.log(L.STAGE === 18 ? "== check-17 --stage 18 (18단계 새 장 문구 검사) ==" : "== check-17 (17단계 문구 검사) ==");
  for (const [k, s] of Object.entries(sum)) console.log(`  ${k.padEnd(16)} ${String(s.n).padStart(3)}항목 · todo ${s.todo} · written ${s.written} · checked ${s.checked} · ${s.chars.toLocaleString()} / 목표 약 ${s.target.toLocaleString()}자`);
  if (fails.length) { console.log(`\n[실패 · 새 항목 ${fails.length}]`); fails.forEach((x) => console.log("  ✗ " + x)); }
  if (axisFails.length) { console.log(`\n[실패 · 축 이름 대조 ${axisFails.length}]`); axisFails.forEach((x) => console.log("  ✗ " + x)); }
  if (confirms.length) { console.log(`\n[확인 목록 · 사람이 볼 것 ${confirms.length}]`); confirms.forEach((x) => console.log("  ? " + x)); }
  console.log(`\n[성별어 · 기존 무료·유료 전체] 실패 ${gFail.length} · 판단됨 ${gJudged.length} (판단은 copy-17/gender-judged.json)`);
  gFail.forEach((x) => console.log("  ✗ " + x));
  console.log(`[기존 문장 · 보고만] 금지 목록 ${oldFail}건 · 확인 목록 ${oldConfirm}건${showOld ? "" : " (--old로 하나씩)"}`);
  oldLines.forEach((x) => console.log("  · " + x));

  const left = fs.existsSync(L.OUT) ? fs.readdirSync(L.OUT).filter((n) => n.endsWith(".json")) : [];
  const OUTREL = L.STAGE === 18 ? "copy-18/out" : "copy-17/out";
  const ST = L.STAGE === 18 ? " --stage 18" : "";
  console.log(`\n남은 묶음 파일(${OUTREL}, 아직 apply 안 함): ${left.length}개${left.length ? ` → 먼저: node tools/strange-oracle/apply-17.js${ST} ` + left[0].replace(/\.json$/, "") : ""}`);
  const nextBatch = items.find((x) => x.status === "todo" && !left.includes(x.batch + ".json"));
  if (nextBatch) {
    const b = items.filter((x) => x.batch === nextBatch.batch);
    const todo = b.filter((x) => x.status === "todo");
    console.log(`다음 묶음: ${nextBatch.batch} (${todo.length}/${b.length}항목 todo · ${nextBatch.kind} · 말투 ${nextBatch.voice} · ${nextBatch.min}~${nextBatch.max}자${nextBatch.review ? " · QA 전부 읽기" : ""}${nextBatch.by ? " · 고르는 값 " + nextBatch.by : ""})`);
    if (nextBatch.vars) console.log(`  자리 값: ${nextBatch.vars.map((x) => `{${x}}`).join(" ")} (뒤 글자는 '의'·띄어쓰기·. , ! ? ··」만, 18-2)${nextBatch.hint ? " · " + nextBatch.hint : ""}`);
    console.log(`  쓸 파일: tools/strange-oracle/${OUTREL}/${nextBatch.batch}.json  →  { "items": { ${todo.slice(0, 2).map((x) => `"${x.id}": "…"`).join(", ")}${todo.length > 2 ? ", …" : ""} }, "notes": {} }`);
  } else if (!left.length) console.log("다음 묶음: 없음 (모두 written 이상). 끝나면 make-volume → build-dist");
  const bad = fails.length + gFail.length + axisFails.length;
  console.log(bad ? `\n결과: 실패 ${bad}건` : "\n결과: 실패 0");
  process.exit(bad ? 1 : 0);
}

module.exports = { scan, FAIL, GENDER, CONFIRM, FAIL18, CONFIRM18, VARS18 };
if (require.main === module) main();
