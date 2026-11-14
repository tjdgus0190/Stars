// 별가루(재화) — 무료로 얻는 몫의 장부 (2026-11-13, 정식판 v1-C · specs/proposal-strange-oracle-v1.md 8-2 운영자 확정 수치).
// 화면 문구는 data-nav.js(NAV.dust). 이 파일은 계산과 저장만 한다.
//
// 저장: 이 기기 localStorage "strange-oracle-dust" 하나. 담는 것은 잔액·오늘 얻은 양·횟수·완주한 방 이름·도감 카드 이름·오늘의 신탁(방 이름·번호)뿐이다.
//   이름·생년월일·질문 같은 입력값은 넣지 않는다(운영 규칙 6장). 저장이 막힌 브라우저에서는 이 탭 안에서만 센다.
// 규칙(하루 = 한국 시간 날짜) — (2026-11-13 운영자 수정) 무료로 모으는 길은 둘뿐:
//   first   처음 들어오면 10 (한 번)
//   oracle  오늘의 신탁 5 (하루 1번)
//   room    방을 처음 끝까지 지나면 도감 카드만 열린다(별가루 없음). 도구·공유·연속 방문은 별가루를 주지 않는다
//   DAY_CAP(하루 최대 30, first 빼고)은 안전장치로만 남긴다 — 지금 규칙으로는 하루 5가 최대
// 오늘의 신탁: 날마다 담당 안내자가 바뀐다(TODAY_ORDER, 2026-11-13 = 만신 → 다음 날 시빌라 …). 별가루로 다른 안내자 한 명에게 더 받을 수 있다
// 쓰기: 도감 숨은 이야기 펼치기·다른 안내자의 오늘의 신탁·면담 질문 (값은 NAV.dust.cost). 면담이 실패하면 돌려준다(refund).
//   ※ 무료 몫은 이 기기에 있으므로 서버가 따로 하루 질문 수와 월 비용 상한을 건다(netlify/lib/talk.js).
(function () {
  const KEY = "strange-oracle-dust";
  const DAY_CAP = 30;
  // (2026-11-14 운영자) 별가루는 카카오 로그인한 계정에만 준다(netlify/lib/dust.js earn) → 이 기기 장부는 별가루를 주지 않고 카드·오늘의 신탁 기록만 둔다
const RULES = { oracle: { amt: 0, max: 1 }, room: { amt: 0 }, first: { amt: 0 } };
  const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
  const TODAY_ORDER = ["saju", "sibyl", "ogham", "star", "decan", "tzolkin", "rune"]; // 오늘의 신탁 담당 순서
  const TODAY_ANCHOR = "2026-11-13"; // 이 날 = 만신
  const kstDay = (t = Date.now()) => new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const dayNum = (d) => Math.round(Date.parse(d + "T00:00:00Z") / 86400000);

  let mem = null; // localStorage가 막혔을 때
  const blank = () => ({ v: 1, bal: 0, day: "", got: 0, n: {}, rooms: [], cards: [], open: [], first: false, oracle: null });
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = mem; }
    if (!s || s.v !== 1) s = mem || blank();
    const today = kstDay();
    if (s.day !== today) { s.day = today; s.got = 0; s.n = {}; }
    delete s.seen; delete s.run; // (v1-F) 연속 방문은 세지 않는다 — 예전 기록에서 지운다
    return s;
  }
  function save(s) {
    mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 이 탭에서만 센다 */ }
    try { document.dispatchEvent(new CustomEvent("dust:change", { detail: { bal: s.bal } })); } catch (e) {}
  }
  const gain = (s, kind, amt, capped) => {
    if (!(amt > 0)) return 0;
    const room = capped ? Math.max(0, DAY_CAP - s.got) : amt;
    const g = Math.min(amt, room);
    if (g <= 0) return 0;
    s.bal += g;
    if (capped) s.got += g;
    try { document.dispatchEvent(new CustomEvent("dust:gain", { detail: { kind, amt: g, capped: g < amt } })); } catch (e) {}
    return g;
  };

  // 방문: 첫 방문 덤(한 번)
  function visit() {
    const s = load();
    let g = 0;
    if (!s.first) { s.first = true; g += gain(s, "first", RULES.first.amt, false); }
    save(s);
    return g;
  }

  // 얻기. kind = oracle | room(key = 방 이름 — 도감 카드만). 그 밖의 kind(예전 tool·share)는 0
  function earn(kind, key) {
    const s = load();
    const r = RULES[kind];
    if (!r) return 0;
    let g = 0;
    if (kind === "room") {
      if (!ROOMS.includes(key) || s.rooms.includes(key)) return 0;
      s.rooms.push(key);
      if (!s.cards.includes(key)) s.cards.push(key);
      g = r.amt ? gain(s, kind, r.amt, true) : 0;
      try { document.dispatchEvent(new CustomEvent("dust:card", { detail: { room: key } })); } catch (e) {}
    } else {
      const used = s.n[kind] || 0;
      if (used >= r.max) return 0;
      s.n[kind] = used + 1;
      g = gain(s, kind, r.amt, true);
    }
    save(s);
    return g;
  }

  // 쓰기(이 기기에서 끝나는 쓰임만). 모자라면 false
  function spend(amt) {
    const s = load();
    if (!(amt > 0) || s.bal < amt) return false;
    s.bal -= amt;
    save(s);
    return true;
  }

  // 돌려주기(면담 실패 등 — 쓴 만큼만, 오늘 무료 몫에는 세지 않는다)
  function refund(amt) {
    const s = load();
    if (!(amt > 0)) return;
    s.bal += amt;
    save(s);
  }

  // 오늘의 신탁: 오늘 담당 안내자(guideOf) + 그 방 항목 번호를 하루 동안 기억(같은 날 다시 와도 같은 신탁).
  //   extra = 별가루로 더 받은 다른 안내자들의 신탁 [{ room, idx }]. pick(room) → 그 방 항목 번호
  const guideOf = (day = kstDay()) => TODAY_ORDER[(((dayNum(day) - dayNum(TODAY_ANCHOR)) % 7) + 7) % 7];
  function oracleToday(pick) {
    const s = load();
    if (!s.oracle || s.oracle.day !== s.day || !s.oracle.room) { const room = guideOf(s.day); s.oracle = { day: s.day, room, idx: pick(room), extra: [] }; save(s); }
    return s.oracle;
  }
  function oracleExtra(room, pick, cost) {
    const s = load();
    if (!s.oracle || s.oracle.day !== s.day || !ROOMS.includes(room) || room === s.oracle.room || s.oracle.extra.some((x) => x.room === room) || s.bal < cost) return null;
    s.bal -= cost;
    s.oracle.extra.push({ room, idx: pick(room) });
    save(s);
    return s.oracle;
  }
  function openStory(room, cost) {
    const s = load();
    if (!s.cards.includes(room)) return false;
    if (s.open.includes(room)) return true;
    if (s.bal < cost) return false;
    s.bal -= cost;
    s.open.push(room);
    save(s);
    return true;
  }

  const state = () => {
    const s = load();
    return { bal: s.bal, got: s.got, cap: DAY_CAP, left: Math.max(0, DAY_CAP - s.got), n: Object.assign({}, s.n), rooms: s.rooms.slice(), cards: s.cards.slice(), open: s.open.slice(), oracle: s.oracle };
  };
  // 이 기기의 별가루 기록 지우기
  function clear() { mem = null; try { localStorage.removeItem(KEY); } catch (e) {} save(blank()); }

  window.Dust = { RULES, DAY_CAP, ROOMS, TODAY_ORDER, guideOf, visit, earn, spend, refund, oracleToday, oracleExtra, openStory, state, clear, kstDay };
})();
