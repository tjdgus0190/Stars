// 별가루(재화) — 무료로 얻는 몫의 장부 (2026-11-13, 정식판 v1-C · specs/proposal-strange-oracle-v1.md 8-2 운영자 확정 수치).
// 화면 문구는 data-nav.js(NAV.dust). 이 파일은 계산과 저장만 한다.
//
// 저장: 이 기기 localStorage "strange-oracle-dust" 하나. 담는 것은 잔액·오늘 얻은 양·횟수·완주한 방 이름·연속 방문 날짜·도감 카드 이름뿐이다.
//   이름·생년월일·질문 같은 입력값은 넣지 않는다(운영 규칙 6장). 저장이 막힌 브라우저에서는 이 탭 안에서만 센다.
// 규칙(하루 = 한국 시간 날짜):
//   first   처음 들어오면 10 (하루 상한과 따로, 한 번)
//   oracle  오늘의 신탁 5 (하루 1번)
//   tool    무료 도구 결과 2 (하루 5번)
//   share   결과 공유 5 (하루 2번)
//   room    방 처음 완주 5 (방마다 한 번) — 도감 카드도 이때 열린다
//   streak  연속 7일 방문 10 (7일마다)
//   무료로 얻는 양은 하루 최대 30(first 빼고). 넘치는 몫은 버린다.
// 쓰기: 도감 숨은 이야기 펼치기·오늘의 신탁 한 줄 더 (값은 NAV.dust.cost). 면담 차감은 서버가 한다(v1-D).
(function () {
  const KEY = "strange-oracle-dust";
  const DAY_CAP = 30;
  const RULES = { oracle: { amt: 5, max: 1 }, tool: { amt: 2, max: 5 }, share: { amt: 5, max: 2 }, room: { amt: 5 }, streak: { amt: 10 }, first: { amt: 10 } };
  const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
  const kstDay = (t = Date.now()) => new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const dayNum = (d) => Math.round(Date.parse(d + "T00:00:00Z") / 86400000);

  let mem = null; // localStorage가 막혔을 때
  const blank = () => ({ v: 1, bal: 0, day: "", got: 0, n: {}, rooms: [], cards: [], open: [], seen: "", run: 0, first: false, oracle: null });
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = mem; }
    if (!s || s.v !== 1) s = mem || blank();
    const today = kstDay();
    if (s.day !== today) { s.day = today; s.got = 0; s.n = {}; }
    return s;
  }
  function save(s) {
    mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 이 탭에서만 센다 */ }
    try { document.dispatchEvent(new CustomEvent("dust:change", { detail: { bal: s.bal } })); } catch (e) {}
  }
  const gain = (s, kind, amt, capped) => {
    const room = capped ? Math.max(0, DAY_CAP - s.got) : amt;
    const g = Math.min(amt, room);
    if (g <= 0) return 0;
    s.bal += g;
    if (capped) s.got += g;
    try { document.dispatchEvent(new CustomEvent("dust:gain", { detail: { kind, amt: g, capped: g < amt } })); } catch (e) {}
    return g;
  };

  // 방문: 첫 방문 덤, 연속 방문 세기
  function visit() {
    const s = load();
    let g = 0;
    if (!s.first) { s.first = true; g += gain(s, "first", RULES.first.amt, false); }
    if (s.seen !== s.day) {
      s.run = s.seen && dayNum(s.day) - dayNum(s.seen) === 1 ? s.run + 1 : 1;
      s.seen = s.day;
      if (s.run > 0 && s.run % 7 === 0) g += gain(s, "streak", RULES.streak.amt, true);
    }
    save(s);
    return g;
  }

  // 얻기. kind = oracle | tool | share | room(key = 방 이름)
  function earn(kind, key) {
    const s = load();
    const r = RULES[kind];
    if (!r) return 0;
    let g = 0;
    if (kind === "room") {
      if (!ROOMS.includes(key) || s.rooms.includes(key)) return 0;
      s.rooms.push(key);
      if (!s.cards.includes(key)) s.cards.push(key);
      g = gain(s, kind, r.amt, true);
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

  // 오늘의 신탁: 하루 한 번 뽑은 번호를 기억(같은 날 다시 와도 같은 줄). more = 한 줄 더 받은 번호들
  function oracleToday(pick) {
    const s = load();
    if (!s.oracle || s.oracle.day !== s.day) { s.oracle = { day: s.day, idx: pick(), more: [] }; save(s); }
    return s.oracle;
  }
  function oracleMore(pick, cost) {
    const s = load();
    if (!s.oracle || s.oracle.day !== s.day || s.bal < cost) return null;
    s.bal -= cost;
    s.oracle.more.push(pick());
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
    return { bal: s.bal, got: s.got, cap: DAY_CAP, left: Math.max(0, DAY_CAP - s.got), n: Object.assign({}, s.n), rooms: s.rooms.slice(), cards: s.cards.slice(), open: s.open.slice(), run: s.run, oracle: s.oracle };
  };
  // 이 기기의 별가루 기록 지우기
  function clear() { mem = null; try { localStorage.removeItem(KEY); } catch (e) {} save(blank()); }

  window.Dust = { RULES, DAY_CAP, ROOMS, visit, earn, spend, oracleToday, oracleMore, openStory, state, clear, kstDay };
})();
