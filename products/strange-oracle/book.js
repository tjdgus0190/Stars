// 낯선 점술관 — 한 권의 책 조립 (13단계 spec 13-5). 문구 없음, 로직만.
// 13단계 휴면 서버 core.js(F4-B2에서 지움)의 hiddenEntry·fullRoom·pairCode·timelineStages·buildReport 순서 규칙을 옮긴 것이다.
// (14단계 F4-B2) 문구 원본: 여는 글·닫는 글 = 공개 data-book-free.js(BOOK_FREE), 유료 12장(책 14장) = api/_paid/book/book-*.js를
//   함수 book이 열람 코드 확인 뒤 JSON으로 주면 app.js가 같은 전역 이름(BOOK_SAJU…BOOK_ARCH·BOOK_YEON·BOOK_CROSS)에 넣는다. 첫 줄 = data-book-sample.js
// 입력은 결과 코드·원형·나이 구간(+ 궁합은 관계 유형·방 코드)뿐이다. 이름·생년월일 원문은 받지 않는다(6장).
// 문구 C = 전역(BOOK_FREE·BOOK_SAJU…BOOK_ARCH)을 contentFrom(window)로 묶은 것.
//   C = { open, deep, close, timeline, match, matchRooms, bond, full: {방: […]}, hidden: {방: […]} } — 아직 안 받은 칸은 비어 있다.
// 만신(saju) 결과 코드(1~5000, saju.js encodeCode)에서 일간 = (code-1)/500의 몫, 우세 십신 묶음 = ((code-1)/2의 몫) % 5 (saju.js 없이 계산).
(function (root, factory) {
  const PayCode = typeof module === "object" && module.exports ? require("./paycode.js") : root.PayCode;
  const api = factory(PayCode);
  if (typeof module === "object" && module.exports) module.exports = Object.assign(api, require("./app-book.js").core);
  else root.BookCore = api;
})(typeof window !== "undefined" ? window : this, function (PayCode) {
  "use strict";
  const ARCH = PayCode.ARCHETYPES;
  const CHAPTER_ORDER = PayCode.CHAPTER_ORDER;
  const ROOM_GLOBAL = { saju: "BOOK_SAJU", ogham: "BOOK_OGHAM", star: "BOOK_STAR", decan: "BOOK_DECAN", tzolkin: "BOOK_TZOLKIN", rune: "BOOK_RUNE", sibyl: "BOOK_SIBYL" };

  function contentFrom(w) {
    const C = { full: {}, hidden: {} };
    for (const r of CHAPTER_ORDER) {
      const x = w[ROOM_GLOBAL[r]];
      if (x) [C.full[r], C.hidden[r]] = [x.full, x.hidden];
    }
    if (w.BOOK_FLOW) C.timeline = w.BOOK_FLOW;
    if (w.BOOK_MATCH) [C.match, C.matchRooms, C.bond] = [w.BOOK_MATCH.pairs, w.BOOK_MATCH.rooms, w.BOOK_MATCH.bond];
    if (w.BOOK_FREE) [C.open, C.close] = [w.BOOK_FREE.open, w.BOOK_FREE.close];
    if (w.BOOK_ARCH) C.deep = w.BOOK_ARCH.deep;
    if (w.BOOK_YEON) C.yeon = w.BOOK_YEON;
    if (w.BOOK_CROSS) C.cross = w.BOOK_CROSS;
    if (w.BOOK_SAMPLE) C.sample = w.BOOK_SAMPLE;
    return C;
  }
  const byCode = (list) => Object.fromEntries((list || []).map((e) => [e.code, e]));
  const idx = (C, k) => (C["_" + k] && C["_" + k].src === C[k] ? C["_" + k].map : (C["_" + k] = { src: C[k], map: byCode(C[k]) }).map);

  const paras = (v) => (Array.isArray(v) ? v.slice() : v ? [v] : []);
  const insertAt = (arr, i, item) => [...arr.slice(0, i), item, ...arr.slice(i)];
  const sajuStem = (code) => Math.floor((code - 1) / 500);
  const sajuGroup = (code) => Math.floor((code - 1) / 2) % 5;
  function hiddenEntry(C, room, codes) {
    const list = C.hidden[room];
    if (room === "saju") return list[sajuGroup(codes.saju)];
    if (room === "rune") return list[codes.rune[1]];
    if (room === "tzolkin") return list[codes.tzolkin.sign];
    return list[codes[room]];
  }
  // (18-6) 첫 줄 = BOOK_SAMPLE[방][i] (full과 같은 순서). 아직 안 받았으면 빈칸
  const firstOf = (C, room, i) => {
    const e = C.sample && C.sample[room] && C.sample[room][i];
    return (e && e.firstLine) || "";
  };
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
        firstLine: firstOf(C, room, codes.rune[1]), // (17-3) 여러 결과를 엮는 장(룬뿐) = "지금" 자리 결과 하나의 firstLine·heartLine
        heartLine: now.heartLine || "",
      };
    }
    const ei = room === "tzolkin" ? codes.tzolkin.sign : room === "saju" ? sajuStem(codes.saju) : codes[room];
    const e = list[ei];
    const eb = e.event.body;
    const ch2 = insertAt(eb, Math.min(2, eb.length), e.event.quote);
    const out = {
      room,
      ch1Rest: e.identity.rest.slice(),
      ch2: [e.event.lede, ...ch2.filter((p) => p != null), e.shadow.hook],
      ch3: [e.shadow.lede, ...insertAt(e.shadow.body, 1, e.shadow.quote), e.advice.hook],
      ch4: [e.advice.lede, ...e.advice.body],
      hidden,
      firstLine: firstOf(C, room, ei), // (17-3) 장 첫 쪽 맨 앞 한 문장. 빈칸이면 그리지 않는다
      heartLine: e.heartLine || "", // (17-3) 장 가운데 한 장면 = identity 뒤·shadow 앞(Ⅰ장 끝, 룬은 "지금" 묶음 끝. app.js가 aside.book-heart로 그림)
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

  // ═════════ (17단계 17-2) 인연의 장 — 고르기는 모두 이 브라우저 안에서. 서버로는 { file: "yeon", pass }만 간다 ═════════
  // 주·보조 원형: 장 순서대로 놓인 원형 목록(빈 칸은 null)에서 횟수 많은 순, 동점이면 앞선 장, 2위가 없으면 보조 = 주.
  //   지도(map.js Core.archPair, 16-2의 2)와 같은 규칙이다(yeon.test.js가 두 함수 결과를 대조). 주 원형은 app.js currentArchetype과 같다.
  function archPair(list) {
    const tally = {};
    list.forEach((a, i) => {
      if (!ARCH.includes(a)) return;
      const t = (tally[a] = tally[a] || { count: 0, first: i });
      t.count += 1;
    });
    const ranked = Object.entries(tally).sort((x, y) => y[1].count - x[1].count || x[1].first - y[1].first).map((e) => e[0]);
    return ranked.length ? { main: ranked[0], sub: ranked[1] || ranked[0] } : null;
  }
  // 만 나이 (today 기준, 생일 당일부터 한 살 더). 생년월일·나이는 보내지 않고 저장하지 않는다(6장, 17-2)
  function ageOf(b, today) {
    const t = today || new Date();
    let age = t.getFullYear() - b.y;
    if (t.getMonth() + 1 < b.m || (t.getMonth() + 1 === b.m && t.getDate() < b.d)) age--;
    return age;
  }
  // 나이 구간 b1(24세 이하) b2(25~29) … b7(50세 이상) = 0~6 (6-2, 시기별 흐름과 같은 구간)
  //   결정 114: 만 19세 미만판을 두지 않는다. 19세 미만도 b1(19~24세 문장)을 받는다
  const bandOf = (age) => (age <= 24 ? 0 : Math.min(6, Math.floor((age - 25) / 5) + 1));
  // (17-2) 인연의 장 고르기·분량(yeonChapter·yeonTable·yeonVolume·yeonChars·ELEMENT_OF_STEM)도 app-book.js (책 화면 전용, 결정 120 때 옮김)
  // (18단계) 새 장 고르기·관심사 순서·firstLineOf = app-book.js (브라우저는 그 파일이 BookCore에 더함)
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

  return { archPair, ageOf, bandOf, sajuStem, sajuGroup, contentFrom, hiddenEntry, fullRoom, pairCode, timelineStages, openChapter, deepChapter, closeChapter, timelineChapter, mapChapter, matchChapter, buildReport, ARCH };
});
