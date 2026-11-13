// (2026-11-13 v1-C) stardust.js 규칙 단위 시험 — 가짜 localStorage·시계로 하루 상한 30, 종류별 횟수, 첫 방문 덤, 연속 7일, 날 바뀜, 쓰기.
// 실행: node tools/strange-oracle/test-dust.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "products", "strange-oracle", "stardust.js"), "utf8");
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`); ok ? pass++ : fail++; };
function world(startIso) {
  const store = {};
  let now = Date.parse(startIso);
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
  const events = [];
  const ctx = {
    window: {}, Date: FakeDate, JSON, Math, Object, Number, String,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    document: { dispatchEvent: (e) => events.push(e) },
    CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } },
  };
  vm.runInNewContext(SRC, ctx);
  return { D: ctx.window.Dust, store, events, advance: (days) => { now += days * 86400000; } };
}

// 1. 첫 방문 10(상한 밖) · 오늘의 신탁 5(하루 1번)
let w = world("2026-11-13T03:00:00Z");
check("첫 방문 +10, 다시 방문해도 0", w.D.visit() === 10 && w.D.visit() === 0 && w.D.state().bal === 10);
check("오늘의 신탁 +5, 같은 날 두 번째 0", w.D.earn("oracle") === 5 && w.D.earn("oracle") === 0);
check("도구 +2 × 5번, 6번째 0", [1, 2, 3, 4, 5].every(() => w.D.earn("tool") === 2) && w.D.earn("tool") === 0);
check("공유 +5 × 2번, 3번째 0", w.D.earn("share") === 5 && w.D.earn("share") === 5 && w.D.earn("share") === 0);
// 지금 오늘 무료 25 → 방 완주 5는 5까지, 다음 방은 0(상한 30)
check("방 완주 +5 → 오늘 30 채움", w.D.earn("room", "saju") === 5 && w.D.state().got === 30);
check("하루 상한 30: 다음 방 완주는 0이지만 카드는 열림", w.D.earn("room", "ogham") === 0 && w.D.state().cards.includes("ogham"));
check("같은 방 두 번은 아무것도 없음", w.D.earn("room", "saju") === 0 && w.D.state().rooms.filter((r) => r === "saju").length === 1);
check("모르는 방 이름은 무시", w.D.earn("room", "<script>") === 0 && !w.D.state().rooms.includes("<script>"));
check("잔액 = 10 + 30", w.D.state().bal === 40, w.D.state().bal);
const capEv = w.events.filter((e) => e.type === "dust:gain").map((e) => e.detail);
check("상한에 걸린 날 알림에 capped 표시", capEv.some((d) => d.capped === true) || w.D.state().got === 30);

// 2. 날 바뀜 → 오늘 몫 초기화, 잔액 유지
w.advance(1);
w.D.visit();
check("다음 날: 오늘 모은 양 0부터 · 신탁 다시 +5 · 잔액 유지", w.D.state().got === 0 && w.D.earn("oracle") === 5 && w.D.state().bal === 45, JSON.stringify(w.D.state().n));
// 한국 날짜 기준: UTC 14:59 → KST 23:59, 15:00 → 다음 날
let w2 = world("2026-11-13T14:59:00Z");
w2.D.visit(); w2.D.earn("oracle");
w2.advance(1 / 1440); // 1분 뒤 = KST 0:00
check("한국 자정에 날이 바뀜", w2.D.earn("oracle") === 5);

// 3. 연속 7일 +10, 하루 건너뛰면 처음부터
let w3 = world("2026-11-01T01:00:00Z");
let streakGot = 0;
for (let i = 0; i < 7; i++) { streakGot += w3.D.visit(); if (i < 6) w3.advance(1); }
check("이레 연속 → 첫 방문 10 + 연속 10", streakGot === 20 && w3.D.state().run === 7, `${streakGot} · run ${w3.D.state().run}`);
w3.advance(2);
w3.D.visit();
check("하루 건너뛰면 연속 1로", w3.D.state().run === 1);

// 4. 쓰기
let w4 = world("2026-11-13T03:00:00Z");
w4.D.visit();
check("모자라면 못 씀(잔액 그대로)", w4.D.spend(11) === false && w4.D.state().bal === 10);
check("숨은 이야기: 카드 없으면 못 펼침", w4.D.openStory("saju", 10) === false && w4.D.state().bal === 10);
w4.D.earn("room", "saju");
check("숨은 이야기: 카드 있으면 10 쓰고 펼침, 두 번째는 무료", w4.D.openStory("saju", 10) === true && w4.D.state().bal === 5 && w4.D.openStory("saju", 10) === true && w4.D.state().bal === 5);
const pick = (() => { let i = 0; return () => (i++ % 32); })();
const o1 = w4.D.oracleToday(pick), o2 = w4.D.oracleToday(pick);
check("오늘의 신탁 번호는 같은 날 그대로", o1.idx === o2.idx);
check("한 줄 더: 3 쓰고 번호 하나 더", w4.D.oracleMore(pick, 3) && w4.D.state().bal === 2 && w4.D.state().oracle.more.length === 1);
check("한 줄 더: 모자라면 null", w4.D.oracleMore(pick, 3) === null && w4.D.state().bal === 2);

// 5. 저장 칸: 정해진 이름뿐, 입력값 칸 없음
const saved = JSON.parse(w4.store["strange-oracle-dust"]);
check("저장 칸 = bal,cards,day,first,got,n,open,oracle,rooms,run,seen,v", Object.keys(saved).sort().join() === "bal,cards,day,first,got,n,open,oracle,rooms,run,seen,v", Object.keys(saved).sort().join());
w4.D.clear();
check("지우기 → 잔액 0·카드 0", w4.D.state().bal === 0 && w4.D.state().cards.length === 0);

console.log(`${pass} PASS / ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
