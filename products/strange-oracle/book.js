// 낯선 점술관 — 한 권의 책 조립 (13단계 spec 13-5). 문구 없음, 로직만.
// 13단계 휴면 서버 core.js(F4-B2에서 지움)의 hiddenEntry·fullRoom·pairCode·timelineStages·buildReport 순서 규칙을 옮긴 것이다.
// (14단계 F4-B2) 문구 원본: 여는 글·닫는 글 = 공개 data-book-free.js(BOOK_FREE), 유료 12장(17단계 인연의 장, 18단계 새 장 포함, 책 14장) = api/_paid/book/book-*.js를
//   함수 book이 열람 코드 확인 뒤 JSON으로 주면 app.js가 같은 전역 이름(BOOK_SAJU…BOOK_ARCH·BOOK_YEON·BOOK_CROSS)에 넣는다.
//   (18-6, 결정 117) 방 장 첫 줄 = 공개 data-book-sample.js(BOOK_SAMPLE, 결제 전 맛보기)
// 입력은 결과 코드·원형·나이 구간(+ 궁합은 관계 유형·방 코드)뿐이다. 이름·생년월일 원문은 받지 않는다(6장).
// 문구 C = 전역(BOOK_FREE·BOOK_SAJU…BOOK_ARCH)을 contentFrom(window)로 묶은 것.
//   C = { open, deep, close, timeline, match, matchRooms, bond, full: {방: […]}, hidden: {방: […]} } — 아직 안 받은 칸은 비어 있다.
// 만신(saju) 결과 코드(1~5000, saju.js encodeCode)에서 일간 = (code-1)/500의 몫, 우세 십신 묶음 = ((code-1)/2의 몫) % 5 (saju.js 없이 계산).
(function (root, factory) {
  const PayCode = typeof module === "object" && module.exports ? require("./paycode.js") : root.PayCode;
  const api = factory(PayCode);
  if (typeof module === "object" && module.exports) module.exports = api;
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
    if (w.BOOK_CROSS) C.cross = w.BOOK_CROSS; // (18단계) 새 장
    if (w.BOOK_SAMPLE) C.sample = w.BOOK_SAMPLE; // (18-6, 결정 117) 방 장 첫 줄 = 공개 맛보기 data-book-sample.js
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
  // (18-6) 첫 줄: 공개 data-book-sample.js(BOOK_SAMPLE[방][i], full과 같은 순서·code). 아직 안 받았으면 빈칸(그리지 않음)
  const firstOf = (C, room, i) => {
    const e = C.sample && C.sample[room] && C.sample[room][i];
    return (e && e.firstLine) || "";
  };
  // 미리보기 「일곱 장의 첫 줄」: 방 결과 코드 → 그 장 첫 줄(공개 맛보기). 룬은 "지금" 자리 결과
  const firstLineOf = (C, room, codes) => firstOf(C, room, room === "rune" ? codes.rune[1] : room === "tzolkin" ? codes.tzolkin.sign : room === "saju" ? sajuStem(codes.saju) : codes[room]);
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
      firstLine: firstOf(C, room, ei), // (17-3) 장 첫 쪽 맨 앞 한 문장. 빈칸이면 그리지 않는다 (18-6부터 공개 맛보기 파일에서)
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
  const ELEMENT_OF_STEM = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"]; // saju.js STEM_EL·ELEMENTS와 같음(갑을=목 … 임계=수)
  // ctx = { arch: 주 원형, sub: 보조 원형, allDone: 일곱 방 다 마침, band: 0~6|null(나이 모름), stem: 만신 일간 0~9|null(만신 미방문) }
  // 돌려주는 모양: { id, variant: base, pages: [{ key, text, note, bands }] } — key·note는 data.js book.yeon 키 이름(화면 틀 문구는 data.js)
  //   빠진 경우(17-2 표): 보조 = 주 → same(+ 일곱 방 전이면 note more) · 나이 모름 → notime + note noAge(b1 문장을 쓰지 않음)
  //   만신 미방문 → 계절 쪽 text 없이 note noSaju · 나이와 관계없이 모두 같은 판(결정 114)
  function yeonChapter(C, ctx) {
    const Y = C.yeon;
    const a = ctx.arch;
    const season = (src) => (ctx.stem == null ? { key: "season", text: null, note: "noSaju" } : { key: "season", text: src[ELEMENT_OF_STEM[ctx.stem]], note: null });
    const same = !ctx.sub || ctx.sub === a;
    const time = ctx.band == null
      ? { key: "time", text: Y.alt.notime[a], note: "noAge" }
      : { key: "time", text: null, note: null, bands: [ctx.band, ctx.band + 1].filter((b) => b <= 6).map((b) => ({ band: b, now: b === ctx.band, text: Y.time[a + "-b" + (b + 1)] })) };
    return { id: "yeon", variant: "base", pages: [
      { key: "pull", text: Y.pull[a], note: null },
      { key: "mirror", text: Y.mirror[a], note: null },
      { key: "meet", text: Y.meet[a], note: null },
      same ? { key: "same", text: Y.alt.same[a], note: ctx.allDone ? null : "more" } : { key: "twist", text: Y.twist[ctx.sub], note: null },
      { key: "scene", text: Y.scene[a], note: null },
      time,
      season(Y.season),
    ] };
  }
  // 분량: yeonTable(BOOK_YEON) = 칸마다 글자 수(make-volume → data-volume.js의 yeon), yeonVolume(표, ctx) = 그 사람이 실제로 받는 판의 글자 수
  //   (17-5 "받는 것", 검수 2차 권장 5). yeonChars(yeonChapter 결과)와 같아야 한다(make-volume·yeon.test.js 대조)
  const textLen = (v) => [...(Array.isArray(v) ? v.join("") : typeof v === "string" ? v : "")].length;
  function yeonTable(Y) {
    const m = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, textLen(v)]));
    return { pull: m(Y.pull), mirror: m(Y.mirror), meet: m(Y.meet), twist: m(Y.twist), scene: m(Y.scene), time: m(Y.time), season: m(Y.season),
      same: m(Y.alt.same), notime: m(Y.alt.notime) };
  }
  function yeonVolume(V, ctx) {
    const a = ctx.arch;
    if (!V || !a) return 0;
    const season = (t) => (ctx.stem == null ? 0 : t[ELEMENT_OF_STEM[ctx.stem]]);
    const same = !ctx.sub || ctx.sub === a;
    const time = ctx.band == null ? V.notime[a] : [ctx.band, ctx.band + 1].filter((b) => b <= 6).reduce((n, b) => n + V.time[a + "-b" + (b + 1)], 0);
    return V.pull[a] + V.mirror[a] + V.meet[a] + (same ? V.same[a] : V.twist[ctx.sub]) + V.scene[a] + time + season(V.season);
  }
  const yeonChars = (ch) => ch.pages.reduce((n, p) => n + textLen(p.text) + (p.bands || []).reduce((s, x) => s + textLen(x.text), 0), 0);

  // ═════════ (18단계 18-2) 새 장 「겹치는 곳, 갈리는 곳」 — 고르기는 모두 이 브라우저 안에서. 서버로는 { file: "cross", pass }만 간다 ═════════
  // 입력 list = 마친 방만, 장 순서대로 [{ room, arch }] (방별 원형 state.visits[room].archetype 하나만. 세부 번호·나이·성별·생년월일은 쓰지 않는다)
  // core = arch-core.js(ARCH·AXES·PROFILE). 브라우저는 app.js가 arch-core.js를 받은 뒤에만 부른다(첫 화면 요청 0)
  const coreOf = () => (typeof module === "object" && module.exports ? require("./arch-core.js") : typeof window !== "undefined" ? window.ArchCore : null);
  const CROSS_SHAPES = ["one", "two", "trunk", "many"]; // 한 목소리 · 두 갈래 · 굵은 줄기 · 여러 갈래 (18-2 모양 표 순서)
  // 돌려주는 값: { n, main(M), sub(S), k, k2, shape, common(C 축), split(D 축|null), high:[방], low:[방], odd(O 방|null), other(X 원형|null) }
  function crossPick(list, core) {
    const K = core || coreOf();
    const R = (list || []).filter((x) => x && K.ARCH.includes(x.arch));
    const n = R.length;
    if (n < 2) return null; // 열림 조건: 마친 방 2개 이상(확인 119)
    const tally = {};
    R.forEach((x, i) => {
      const t = (tally[x.arch] = tally[x.arch] || { count: 0, first: i });
      t.count += 1;
    });
    const ranked = Object.entries(tally).sort((x, y) => y[1].count - x[1].count || x[1].first - y[1].first); // 횟수 순, 동점이면 앞선 장 (archPair와 같음)
    const M = ranked[0][0], S = ranked[1] ? ranked[1][0] : M;
    const k = ranked[0][1].count, k2 = ranked[1] ? ranked[1][1].count : 0;
    const shape = k >= 4 || k === n ? "one" : k === k2 && k2 >= 2 ? "two" : k >= 3 || (k === 2 && n <= 4) ? "trunk" : "many";
    const P = K.PROFILE;
    const vals = K.AXES.map((_, a) => R.map((x) => P[x.arch][a]));
    const sum = vals.map((v) => v.reduce((s, x) => s + x, 0)); // 평균 비교 = 합 비교 (같은 n)
    const span = vals.map((v) => Math.max(...v) - Math.min(...v));
    // C: 평균 최대 → 폭 작은 축 → AXES 순서
    let C = 0;
    for (let a = 1; a < K.AXES.length; a++) if (sum[a] > sum[C] || (sum[a] === sum[C] && span[a] < span[C])) C = a;
    // D: C를 뺀 축 가운데 폭 최대(2 이상만) → AXES 순서
    let D = -1;
    for (let a = 0; a < K.AXES.length; a++) if (a !== C && span[a] >= 2 && (D < 0 || span[a] > span[D])) D = a;
    const hi = D < 0 ? 0 : Math.max(...vals[D]), lo = D < 0 ? 0 : Math.min(...vals[D]);
    const high = D < 0 ? [] : R.filter((x, i) => vals[D][i] === hi).map((x) => x.room); // D가 가장 높은 방들 {high}
    const low = D < 0 ? [] : R.filter((x, i) => vals[D][i] === lo).map((x) => x.room); // 가장 낮은 방들 {low}
    // O: 원형이 M이 아닌 방 가운데 프로필이 M과 가장 먼 방(다섯 축 차의 절댓값 합), 동점이면 앞선 장
    let odd = null, best = -1;
    R.forEach((x) => {
      if (x.arch === M) return;
      const d = P[x.arch].reduce((s, v, a) => s + Math.abs(v - P[M][a]), 0);
      if (d > best) [best, odd] = [d, x];
    });
    return { n, main: M, sub: S, k, k2, shape, common: K.AXES[C], split: D < 0 ? null : K.AXES[D], high, low, odd: odd ? odd.room : null, other: odd ? odd.arch : null };
  }
  // 쪽 목록 (18-2 쪽 구성 표·18-3 빠진 경우 표). key = 쪽 칸 이름(data.js book.cross.pages 키와 같음), text = 원본 항목 하나 통째로(자리 값은 app.js가 채움)
  //   vars = 이 쪽 자리 값에 넣을 코드: arch(M)·sub(S)·other(X)·axis(2쪽 C / 3쪽 D)·room(O)·high·low(방 목록)·n
  //   note "more" = 방 2~6개일 때 장 끝 한 줄(UI 문구)
  function crossChapter(C, pick) {
    const X = C.cross;
    const p = pick;
    const vars = { arch: p.main, sub: p.sub, other: p.other, room: p.odd, high: p.high, low: p.low, n: p.n };
    const pages = [
      { key: "shape", text: X.shape[p.shape][p.main], vars: Object.assign({}, vars, { axis: p.common }) },
      { key: "common", text: X.common[p.common][p.main], vars: Object.assign({}, vars, { axis: p.common }) },
      p.split ? { key: "split", text: X.split[p.split], vars: Object.assign({}, vars, { axis: p.split }) } : { key: "even", text: X.even[p.main], vars: Object.assign({}, vars, { axis: p.common }) },
    ];
    if (p.odd) pages.push({ key: "lens", text: X.lens[p.odd], vars: Object.assign({}, vars, { axis: p.common }) }, { key: "pair", text: X.pair[`${p.main}-${p.other}`], vars: Object.assign({}, vars, { axis: p.common }) });
    else pages.push({ key: "same", text: X.same[p.main], vars: Object.assign({}, vars, { axis: p.common }) });
    pages.push({ key: "close", text: X.close[p.main], vars: Object.assign({}, vars, { axis: p.common }), note: p.n < 7 ? "more" : null });
    return { id: "cross", variant: (p.split ? "split" : "even") + "-" + (p.odd ? "odd" : "same"), shape: p.shape, pages };
  }
  // 분량: crossTable(BOOK_CROSS) = 칸마다 글자 수(make-volume → data-volume.js의 cross), crossVolume(표, pick) = 그 사람이 받는 판의 글자 수
  //   (원본 글자 그대로 센다 — 자리 값은 원본에 적힌 꼴 그대로. crossChars(crossChapter 결과)와 같아야 한다, make-volume·cross.test.js 대조)
  function crossTable(X) {
    const m = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, textLen(v)]));
    const m2 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, m(v)]));
    return { shape: m2(X.shape), common: m2(X.common), split: m(X.split), even: m(X.even), lens: m(X.lens), pair: m(X.pair), same: m(X.same), close: m(X.close) };
  }
  function crossVolume(V, p) {
    if (!V || !p) return 0;
    return V.shape[p.shape][p.main] + V.common[p.common][p.main] + (p.split ? V.split[p.split] : V.even[p.main]) + (p.odd ? V.lens[p.odd] + V.pair[`${p.main}-${p.other}`] : V.same[p.main]) + V.close[p.main];
  }
  const crossChars = (ch) => ch.pages.reduce((n, pg) => n + textLen(pg.text), 0);

  // ═════════ (18단계 18-8, 확인 124) 관심사 순서 — 입력은 이미 있는 주제 값 둘뿐(시빌라 visits.sibyl.topic, 룬 visits.rune.topic). 브라우저 안에서만 ═════════
  // 관심사 4개: love 사랑 · relation 관계 · work 일 · self 나 (룬 money는 "일", 재물을 앞세우지 않는다)
  const INTEREST_OF = {
    sibyl: { love: "love", relation: "relation", work: "work", exam: "work", self: "self" },
    rune: { love: "love", work: "work", money: "work", me: "self" },
  };
  const PART2_DEFAULT = ["flow", "yeon", "match", "deep"]; // 새 장(cross) 뒤 제2부 지금 순서
  const PART2_BY = { love: ["yeon", "match", "flow", "deep"], relation: ["match", "yeon", "flow", "deep"], work: ["flow", "deep", "yeon", "match"], self: ["deep", "flow", "yeon", "match"] };
  const FLOW_AREAS = { none: ["work", "relation", "learn", "move"], love: ["relation", "work", "learn", "move"], relation: ["relation", "work", "learn", "move"], work: ["work", "learn", "relation", "move"], self: ["work", "relation", "learn", "move"] };
  // topics = { sibyl: 주제|null, rune: 주제|null } → { first: {room, interest}|null, second, part2: [제2부 4장, 새 장 뒤], areas: 시기별 흐름 영역 순서, changed: 지금 순서와 다른가 }
  //   우선순위: 시빌라(마지막 방의 오늘의 질문) → 룬. 둘째 관심사 줄의 맨 앞 장이 첫째 줄 앞 두 칸 안에 없으면 그 장을 둘째 칸으로
  function interestOrder(topics) {
    const t = topics || {};
    const got = ["sibyl", "rune"].map((room) => ({ room, interest: (INTEREST_OF[room] || {})[t[room]] || null })).filter((x) => x.interest);
    const first = got[0] || null;
    const second = got[1] || null;
    let part2 = first ? PART2_BY[first.interest].slice() : PART2_DEFAULT.slice();
    if (first && second && second.interest !== first.interest) {
      const lead = PART2_BY[second.interest][0];
      if (part2.indexOf(lead) > 1) part2 = [part2[0], lead, ...part2.slice(1).filter((x) => x !== lead)];
    }
    return { first, second, part2, areas: FLOW_AREAS[first ? first.interest : "none"].slice(), changed: part2.join() !== PART2_DEFAULT.join() };
  }
  // 책 전체 장 순서(목차·미리보기 목차·"받는 것"·장 끝 "다음 장"이 같이 쓴다): 여는 글 → 방 7장(고정) → 새 장(제2부 맨 앞, 고정) → 관심사 순서 4장 → 닫는 글
  const bookOrder = (rooms, topics) => ["open", ...rooms, "cross", ...interestOrder(topics).part2, "close"];

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

  return { archPair, ageOf, bandOf, ELEMENT_OF_STEM, yeonChapter, yeonTable, yeonVolume, yeonChars, CROSS_SHAPES, crossPick, crossChapter, crossTable, crossVolume, crossChars, INTEREST_OF, interestOrder, bookOrder, firstLineOf, sajuStem, sajuGroup, contentFrom, hiddenEntry, fullRoom, pairCode, timelineStages, openChapter, deepChapter, closeChapter, timelineChapter, mapChapter, matchChapter, buildReport, ARCH };
});
