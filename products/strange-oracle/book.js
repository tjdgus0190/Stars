// 낯선 점술관 — 한 권의 책 조립 (13단계 spec 13-5). 문구 없음, 로직만.
// 휴면 서버 api/_lib/core.js의 hiddenEntry·fullRoom·pairCode·timelineStages·buildReport 순서 규칙을 그대로 옮긴 것이다.
// core.js는 고치지 않는다. 같은 결과 코드 → 같은 문단 배열 (tools/strange-oracle/book.test.js 동일성 시험).
// 입력은 결과 코드·원형·나이 구간(+ 궁합은 관계 유형·방 코드)뿐이다. 이름·생년월일 원문은 받지 않는다(6장).
// 문구 C = 지연 불러오기 파일 data-book-*.js의 전역(BOOK_OGHAM…BOOK_ARCH)을 contentFrom(window)로 묶은 것.
//   C = { open, deep, close, timeline, match, matchRooms, full: {방: […]}, hidden: {방: […]} } — 아직 안 불러온 칸은 비어 있다.
(function (root, factory) {
  const PayCode = typeof module === "object" && module.exports ? require("./paycode.js") : root.PayCode;
  const api = factory(PayCode);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BookCore = api;
})(typeof window !== "undefined" ? window : this, function (PayCode) {
  "use strict";
  const ARCH = PayCode.ARCHETYPES;
  const CHAPTER_ORDER = PayCode.CHAPTER_ORDER;
  const ROOM_GLOBAL = { ogham: "BOOK_OGHAM", star: "BOOK_STAR", decan: "BOOK_DECAN", tzolkin: "BOOK_TZOLKIN", rune: "BOOK_RUNE", sibyl: "BOOK_SIBYL" };

  function contentFrom(w) {
    const C = { full: {}, hidden: {} };
    for (const r of CHAPTER_ORDER) {
      const x = w[ROOM_GLOBAL[r]];
      if (x) [C.full[r], C.hidden[r]] = [x.full, x.hidden];
    }
    if (w.BOOK_FLOW) C.timeline = w.BOOK_FLOW;
    if (w.BOOK_MATCH) [C.match, C.matchRooms] = [w.BOOK_MATCH.pairs, w.BOOK_MATCH.rooms];
    if (w.BOOK_ARCH) [C.open, C.deep, C.close] = [w.BOOK_ARCH.open, w.BOOK_ARCH.deep, w.BOOK_ARCH.close];
    return C;
  }
  const byCode = (list) => Object.fromEntries((list || []).map((e) => [e.code, e]));
  const idx = (C, k) => (C["_" + k] && C["_" + k].src === C[k] ? C["_" + k].map : (C["_" + k] = { src: C[k], map: byCode(C[k]) }).map);

  const paras = (v) => (Array.isArray(v) ? v.slice() : v ? [v] : []);
  const insertAt = (arr, i, item) => [...arr.slice(0, i), item, ...arr.slice(i)];
  function hiddenEntry(C, room, codes) {
    const list = C.hidden[room];
    if (room === "rune") return list[codes.rune[1]];
    if (room === "tzolkin") return list[codes.tzolkin.sign];
    return list[codes[room]];
  }
  function fullRoom(C, room, codes) {
    const list = C.full[room];
    const h = hiddenEntry(C, room, codes);
    const hidden = { title: h.title, paragraphs: paras(h.body) };
    if (room === "rune") {
      const [past, now, next] = codes.rune.map((i) => list[i]);
      return {
        room,
        ch1Rest: [past, now, next].map((r) => r.identity.rest.slice()),
        ch2: [past.past.lede, ...past.past.body, ...insertAt(now.now.body, 1, now.now.quote), next.shadow.hook],
        ch3: [next.shadow.lede, ...insertAt(next.shadow.body, 1, next.shadow.quote), next.advice.hook],
        ch4: [next.advice.lede, ...next.advice.body],
        topics: Object.assign({}, next.advice.topics),
        hidden,
      };
    }
    const e = list[room === "tzolkin" ? codes.tzolkin.sign : codes[room]];
    const eb = e.event.body;
    const ch2 = insertAt(eb, Math.min(2, eb.length), e.event.quote);
    const out = {
      room,
      ch1Rest: e.identity.rest.slice(),
      ch2: [e.event.lede, ...ch2.filter((p) => p != null), e.shadow.hook],
      ch3: [e.shadow.lede, ...insertAt(e.shadow.body, 1, e.shadow.quote), e.advice.hook],
      ch4: [e.advice.lede, ...e.advice.body],
      hidden,
    };
    if (room === "sibyl") out.topics = Object.assign({}, e.topics);
    return out;
  }
  function pairCode(a, b) {
    return ARCH.indexOf(a) <= ARCH.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
  }
  function timelineStages(C, arch, band) {
    const start = Math.min(band, 4);
    const T = idx(C, "timeline");
    return [start, start + 1, start + 2].map((b) => {
      const e = T[`${arch}-b${b + 1}`];
      return { band: b, now: b === band, past: b < band, label: e.label, work: e.work, relation: e.relation, learn: e.learn, move: e.move, keyword: e.keyword };
    });
  }

  // ── 장 하나씩 (브라우저는 연 장만 조립한다) ──
  const openChapter = (C, me) => ({ id: "open", paragraphs: paras(idx(C, "open")[me].body) });
  const deepChapter = (C, me) => {
    const d = idx(C, "deep")[me];
    return { id: "deep", strength: paras(d.strength), shadow: paras(d.shadow), growth: paras(d.growth) };
  };
  const closeChapter = (C, me) => ({ id: "close", paragraphs: paras(idx(C, "close")[me].body) });
  const timelineChapter = (C, me, band) => ({ id: "timeline", stages: timelineStages(C, me, band).map(({ keyword, ...s }) => s) });
  const mapChapter = (C, me) => ({ id: "match", me, you: null, map: ARCH.map((other) => ({ other, summary: idx(C, "match")[pairCode(me, other)].summary })) });

  // 궁합 (13-4). bond·opts 없이 부르면 core.js와 같은 모양(동일성 시험용).
  // opts = { type: lover|friend|work|family, mine: {ogham, decan, tzSign}, partner: {ogham, decan, tzSign}, peeks: [{ room: 방 이름, name: 상대 결과 이름, key }…] (M5, 공개 data) }
  // 순서: summary → M1 장면 → M2(유형에 맞는 문단) → sides → M3 → M5 → M4(방별 관계, 변형) → M1 함께 해 볼 한 가지
  const ROOM_CODE = { ogham: "ogham", decan: "decan", tzolkin: "tzSign" };
  function matchChapter(C, codes, bond, opts) {
    const me = codes.arch;
    const you = codes.partner;
    const pair = pairCode(me, you);
    const m = idx(C, "match")[pair];
    const type = opts && opts.type;
    const B = bond && type ? bond : null;
    const over = (slot) => (B && type !== "lover" && B[slot] && B[slot][type] && B[slot][type][pair]) || null;
    const sideOf = (a) => (over("sidesOverride") && over("sidesOverride")[a]) || m.sides[a];
    const sides = me === you ? [sideOf(me)] : [sideOf(me), sideOf(you)];
    let body = paras(m.body);
    if (B) {
      const use = (B.pairUse && B.pairUse[pair]) || {};
      const fix = (B.pairOverride && B.pairOverride[pair]) || {};
      body = body
        .map((t, i) => ({ t: fix[i] != null ? fix[i] : t, i }))
        .filter(({ i }) => !(use.skip || []).includes(i) && (type === "lover" || !(use.lover || []).includes(i)))
        .map(({ t }) => t);
    }
    const rel = [["ogham", codes.relOgham], ["decan", codes.relDecan], ["tzolkin", codes.relTzolkin]]
      .filter(([, g]) => g != null)
      .map(([room, g]) => {
        const e = idx(C, "matchRooms")[`${room}-g${g}`];
        let text = e.text;
        if (B && opts.mine && opts.partner) {
          const k = ROOM_CODE[room];
          const v = (Number(opts.mine[k]) + Number(opts.partner[k])) % 3;
          const alt = B.roomVariants && B.roomVariants[`${room}-g${g}`] && B.roomVariants[`${room}-g${g}`][v];
          if (v !== 0 && alt) text = alt;
        }
        return { room, grade: g, label: e.label, text };
      });
    const summary = over("summaryOverride") || m.summary;
    if (!B) return { id: "match", me, you, summary, paragraphs: body.concat(sides), rooms: rel };
    const first = (B.first && B.first[type] && B.first[type][you]) || {};
    const role = B.role && B.role[type] && B.role[type][me];
    const peeks = (opts.peeks || []).map((x) => String(B.peekLine || "").replace(/\{(room|name|key)\}/g, (_, k) => x[k]));
    const lead = [first.scene].concat(body, sides, [role], peeks).filter((t) => typeof t === "string" && t);
    return { id: "match", me, you, type, summary, paragraphs: lead, rooms: rel, end: first.together || null };
  }

  // core.js buildReport와 같은 순서·모양 (동일성 시험이 이것을 core.js 것과 비교한다)
  function buildReport(C, codes) {
    const me = codes.arch;
    const rooms = CHAPTER_ORDER.filter((r) => codes[r] != null);
    const chapters = [];
    chapters.push(openChapter(C, me));
    chapters.push({ id: "rooms", rooms: rooms.map((room) => fullRoom(C, room, codes)) });
    const stages = timelineStages(C, me, codes.band);
    chapters.push({ id: "timeline", stages: stages.map(({ keyword, ...s }) => s) });
    chapters.push(codes.partner ? matchChapter(C, codes) : mapChapter(C, me));
    chapters.push(deepChapter(C, me));
    chapters.push(closeChapter(C, me));
    const card = { keyword: stages.find((s) => s.now).keyword, closeLine: idx(C, "close")[me].cardLine };
    return { chapters, card, codes };
  }

  return { contentFrom, hiddenEntry, fullRoom, pairCode, timelineStages, openChapter, deepChapter, closeChapter, timelineChapter, mapChapter, matchChapter, buildReport, ARCH };
});
