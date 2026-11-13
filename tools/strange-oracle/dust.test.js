// (2026-11-13 v1-C·v1-F) stardust.js 규칙 단위 시험 — 가짜 localStorage·시계로 첫 방문 덤, 오늘의 신탁(하루 1번·담당 순환), 도감 카드, 날 바뀜, 쓰기.
// 실행: node tools/strange-oracle/dust.test.js
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

// 1. (v1-F 운영자 2026-11-13) 무료로 모으는 길은 둘뿐: 첫 방문 10(한 번) · 오늘의 신탁 5(하루 1번)
let w = world("2026-11-13T03:00:00Z");
check("첫 방문 +10, 다시 방문해도 0", w.D.visit() === 10 && w.D.visit() === 0 && w.D.state().bal === 10);
check("오늘의 신탁 +5, 같은 날 두 번째 0", w.D.earn("oracle") === 5 && w.D.earn("oracle") === 0);
check("무료 도구·결과 나누기는 0", w.D.earn("tool") === 0 && w.D.earn("share") === 0);
check("방 완주: 별가루 0, 도감 카드만 열림", w.D.earn("room", "saju") === 0 && w.D.state().cards.includes("saju") && w.D.state().rooms.includes("saju"));
check("같은 방 두 번은 아무것도 없음", w.D.earn("room", "saju") === 0 && w.D.state().rooms.filter((r) => r === "saju").length === 1);
check("모르는 방 이름은 무시", w.D.earn("room", "<script>") === 0 && !w.D.state().rooms.includes("<script>"));
check("잔액 = 10 + 5", w.D.state().bal === 15, w.D.state().bal);
check("카드 열림 알림(dust:card)", w.events.some((e) => e.type === "dust:card" && e.detail.room === "saju"));

// 2. 날 바뀜 → 오늘 몫 초기화, 잔액 유지
w.advance(1);
w.D.visit();
check("다음 날: 오늘 모은 양 0부터 · 신탁 다시 +5 · 잔액 유지", w.D.state().got === 0 && w.D.earn("oracle") === 5 && w.D.state().bal === 20);
let w2 = world("2026-11-13T14:59:00Z");
w2.D.visit(); w2.D.earn("oracle");
w2.advance(1 / 1440); // 1분 뒤 = KST 0:00
check("한국 자정에 날이 바뀜", w2.D.earn("oracle") === 5);

// 3. 오늘의 신탁 담당: 2026-11-13 만신 → 시빌라 → 오검 → 베다 → 데칸 → 촐킨 → 룬 → 다시 만신
const order = ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].map((d) => w.D.guideOf(d)).join();
check("담당 순서", order === "saju,sibyl,ogham,star,decan,tzolkin,rune,saju", order);
check("기준일 이전도 순환(11-12 = 룬)", w.D.guideOf("2026-11-12") === "rune");
let w3 = world("2026-11-13T03:00:00Z");
const pick = (() => { let i = 0; return () => (i++ % 32); })();
const o = w3.D.oracleToday(pick);
check("오늘 받는 신탁 = 오늘 담당(만신)", o.room === "saju" && o.day === "2026-11-13");
check("같은 날 다시 와도 같은 번호", w3.D.oracleToday(pick).idx === o.idx);
w3.advance(1);
check("다음 날 담당은 시빌라", w3.D.oracleToday(pick).room === "sibyl");

// 4. 쓰기
let w4 = world("2026-11-13T03:00:00Z");
w4.D.visit();
check("모자라면 못 씀(잔액 그대로)", w4.D.spend(11) === false && w4.D.state().bal === 10);
check("숨은 이야기: 카드 없으면 못 펼침", w4.D.openStory("saju", 10) === false && w4.D.state().bal === 10);
w4.D.earn("room", "saju");
check("숨은 이야기: 카드 있으면 10 쓰고 펼침, 두 번째는 무료", w4.D.openStory("saju", 10) === true && w4.D.state().bal === 0 && w4.D.openStory("saju", 10) === true && w4.D.state().bal === 0);
w4.D.refund(10);
check("다른 안내자: 오늘 신탁 받기 전에는 못 받음", w4.D.oracleExtra("rune", pick, 3) === null && w4.D.state().bal === 10);
w4.D.oracleToday(pick);
check("다른 안내자: 오늘 담당(만신)은 고를 수 없음", w4.D.oracleExtra("saju", pick, 3) === null);
check("다른 안내자: 3 쓰고 룬의 신탁 하나 더", (w4.D.oracleExtra("rune", pick, 3) || {}).extra.length === 1 && w4.D.state().bal === 7);
check("다른 안내자: 같은 안내자는 하루 한 번", w4.D.oracleExtra("rune", pick, 3) === null && w4.D.state().bal === 7);
check("다른 안내자: 모르는 방 이름은 무시", w4.D.oracleExtra("<x>", pick, 3) === null);
w4.D.oracleExtra("ogham", pick, 3); w4.D.oracleExtra("star", pick, 3);
check("다른 안내자: 모자라면 null", w4.D.oracleExtra("decan", pick, 3) === null && w4.D.state().bal === 1);

// 5. 저장 칸: 정해진 이름뿐, 입력값·연속 방문 칸 없음
const saved = JSON.parse(w4.store["strange-oracle-dust"]);
check("저장 칸 = bal,cards,day,first,got,n,oracle,open,rooms,v", Object.keys(saved).sort().join() === "bal,cards,day,first,got,n,open,oracle,rooms,v", Object.keys(saved).sort().join());
w4.D.clear();
check("지우기 → 잔액 0·카드 0", w4.D.state().bal === 0 && w4.D.state().cards.length === 0);
// 예전 기록(연속 방문 칸)은 읽을 때 지운다
let w5 = world("2026-11-13T03:00:00Z");
w5.store["strange-oracle-dust"] = JSON.stringify({ v: 1, bal: 30, day: "2026-11-12", got: 0, n: {}, rooms: [], cards: [], open: [], seen: "2026-11-12", run: 3, first: true, oracle: null });
w5.D.visit();
const s5 = JSON.parse(w5.store["strange-oracle-dust"]);
check("예전 기록의 seen·run은 지우고 잔액은 유지", !("seen" in s5) && !("run" in s5) && s5.bal === 30);

console.log(`${pass} PASS / ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
