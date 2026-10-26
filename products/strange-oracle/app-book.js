// 낯선 점술관 — 책·미리보기 전용 코드 (18단계, 운영자 결정 120 · 18-12의 14). 문구 없음(문구는 data.js).
// 첫 화면에서는 받지 않는다. app.js가 책 목차(#report)·미리보기(#preview)·결제 전 화면(#deeper)을 처음 열 때
//   arch-core.js · 이 파일 · style-book.css를 받고(받기 끝난 뒤 화면을 보인다) mount(ctx)를 한 번 부른다. off 배포판(결제 off)에서는 요청 0(build-dist가 넣지 않음).
// 이 파일을 못 받으면 책·미리보기·결제 전 화면만 열리지 않고(토스트) 나머지 화면은 그대로다.
// 두 몫:
//   core  = BookCore에 더하는 계산(새 장 고르기 crossPick·쪽 목록·분량, 관심사 순서). 브라우저 안에서만, 서버로는 { file: "cross", pass }만 간다.
//           Node 시험은 book.js가 require로 합쳐 읽는다(BookCore.crossPick 등 이름 그대로).
//   mount = 화면(새 장 대조표·쪽, 목차 조각, 잠긴 장 길, 미리보기 #screen-preview). app.js 안의 도우미를 ctx로 받는다.
(function (root) {
  "use strict";
  const textLen = (v) => [...(Array.isArray(v) ? v.join("") : typeof v === "string" ? v : "")].length;

  // ═════════ (17단계 17-2) 인연의 장 고르기·분량 — book.js에서 옮김(결정 120, 내용 그대로). 주·보조 원형(archPair)·나이 구간(bandOf)은 book.js ═════════
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

  // ═════════ (20단계 결정 130) 「2027년의 흐름」 — 열쇠는 만신 일간 하나(0~9, 브라우저 안). 만신 미방문(옛 탭)은 공통판 ═════════
  // ctx = { stem: 0~9|null }. 돌려주는 모양: { id, variant: stem|unknown, stem, pages: [{ key, text, items }] }
  //   쪽 = theme 한 해의 결(단락 여럿) · areas 네 갈래(items: work·relation·learn·move) · seasons 계절마다(items: spring·summer·autumn·winter) · one 이 해를 위한 한 가지
  const YEAR_AREAS = ["work", "relation", "learn", "move"];
  const YEAR_SEASONS = ["spring", "summer", "autumn", "winter"];
  function yearChapter(C, ctx) {
    const Y = C.year;
    const e = ctx.stem == null ? Y.unknown : Y.stems[ctx.stem];
    return { id: "year", variant: ctx.stem == null ? "unknown" : "stem", stem: ctx.stem == null ? null : ctx.stem, pages: [
      { key: "theme", text: e.theme },
      { key: "areas", items: YEAR_AREAS.map((k) => ({ key: k, text: e[k] })) },
      { key: "seasons", items: YEAR_SEASONS.map((k) => ({ key: k, text: e.seasons[k] })) },
      { key: "one", text: e.one },
    ] };
  }
  // 분량: yearTable(BOOK_YEAR) = 판마다 글자 수(make-volume → data-volume.js의 year, 0~9 + unknown), yearVolume(표, ctx) = 그 사람이 받는 판
  const yearEntryLen = (e) => textLen(e.theme) + YEAR_AREAS.reduce((n, k) => n + textLen(e[k]), 0) + YEAR_SEASONS.reduce((n, k) => n + textLen(e.seasons[k]), 0) + textLen(e.one);
  function yearTable(Y) {
    const t = { unknown: yearEntryLen(Y.unknown) };
    Y.stems.forEach((e, i) => (t[i] = yearEntryLen(e)));
    return t;
  }
  const yearVolume = (V, ctx) => (!V ? 0 : ctx.stem == null ? V.unknown : V[ctx.stem]);
  const yearChars = (ch) => ch.pages.reduce((n, p) => n + textLen(p.text) + (p.items || []).reduce((s, x) => s + textLen(x.text), 0), 0);

  // ═════════ (18단계 18-2) 새 장 「겹치는 곳, 갈리는 곳」 — 고르기는 모두 이 브라우저 안에서 ═════════
  // 입력 list = 마친 방만, 장 순서대로 [{ room, arch }] (방별 원형 state.visits[room].archetype 하나만. 세부 번호·나이·성별·생년월일은 쓰지 않는다)
  // core = arch-core.js(ARCH·AXES·PROFILE)
  const coreOf = () => (typeof module === "object" && module.exports ? require("./arch-core.js") : root.ArchCore);
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
  // 쪽 목록 (18-2 쪽 구성 표·18-3 빠진 경우 표). key = 쪽 칸 이름(data.js book.cross.pages 키와 같음), text = 원본 항목 하나 통째로(자리 값은 화면 쪽이 채움)
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
  //   (원본 글자 그대로 센다. crossChars(crossChapter 결과)와 같아야 한다, make-volume·cross.test.js 대조)
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
  const withYear = (list) => list.flatMap((x) => (x === "flow" ? ["flow", "year"] : [x])); // (20단계) 「2027년의 흐름」(year)은 어느 순서에서나 시기별 흐름 바로 뒤
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
    return { first, second, part2: withYear(part2), areas: FLOW_AREAS[first ? first.interest : "none"].slice(), changed: part2.join() !== PART2_DEFAULT.join() };
  }
  // 책 전체 장 순서(목차·미리보기 목차·"받는 것"·장 끝 "다음 장"이 같이 쓴다): 여는 글 → 방 7장(고정) → 새 장(제2부 맨 앞, 고정) → 관심사 순서 4장 → 닫는 글
  const bookOrder = (rooms, topics) => ["open", ...rooms, "cross", ...interestOrder(topics).part2, "close"];

  // (18-6) 미리보기 「일곱 장의 첫 줄」: 방 결과 코드 → 그 장 첫 줄(공개 맛보기 BOOK_SAMPLE). 룬은 "지금" 자리 결과, 만신은 일간(book.js sajuStem과 같은 식)
  function firstLineOf(C, room, codes) {
    const i = room === "rune" ? codes.rune[1] : room === "tzolkin" ? codes.tzolkin.sign : room === "saju" ? Math.floor((codes.saju - 1) / 500) : codes[room];
    const e = C.sample && C.sample[room] && C.sample[room][i];
    return (e && e.firstLine) || "";
  }

  const core = { ELEMENT_OF_STEM, yeonChapter, yeonTable, yeonVolume, yeonChars, YEAR_AREAS, YEAR_SEASONS, yearChapter, yearTable, yearVolume, yearChars, CROSS_SHAPES, crossPick, crossChapter, crossTable, crossVolume, crossChars, INTEREST_OF, interestOrder, bookOrder, firstLineOf };

  // ═════════ 화면 (브라우저만). x = app.js가 넘기는 도우미·상태 (app.js bookCtx 참고) ═════════
  function mount(x) {
    const { T, PAY, state, $, $$, js, jsAll, show, fill, strip, comma, toast, track, applyText, paras, textIn, BookCore, ROMAN, CHAPTER_ORDER, PAID_IDS } = x;
    const AC = root.ArchCore;

    // ── (18-2) 새 장 도우미: 자리 값 채우기 · 대조표(무료 값만) · 축 표지 · 방 표지. 미리보기 대조표도 같은 함수(유료 문장 0)
    const archName = (a) => (a && T.archetypes[a] ? T.archetypes[a].name : "");
    const axisName = (k) => ((T.book.cross || {}).axis || {})[k] || "";
    const roomList = (rs) => (rs || []).map((r) => T.rooms[r].name).join((T.book.cross || {}).join || "·");
    function crossFill(t, v) {
      const val = { arch: archName(v.arch), sub: archName(v.sub), other: archName(v.other), axis: axisName(v.axis), room: v.room ? T.rooms[v.room].name : "", high: roomList(v.high), low: roomList(v.low), n: String(v.n) };
      return String(t).replace(/\{(arch|sub|other|axis|room|high|low|n)\}/g, (m, k) => val[k]);
    }
    const axisIdx = (k) => AC.AXES.indexOf(k);
    const meter = (cell, v) => {
      const m = $(".axis-meter", cell);
      if (m) m.style.setProperty("--v", String(v));
      const num = $(".axis-meter__num", cell);
      if (num) num.textContent = String(v);
    };
    // 마친 방 줄의 칸: 원형 칸 + C·D 칸 (견본 줄이 "아직 지나지 않은 방" 모양이었거나, 아직 줄 → 마친 줄로 돌아올 때 다시 만든다 — design J4 권장)
    let rowCells = null;
    const doneCells = (tr) => {
      if (!rowCells) {
        const ok = $$("[data-js=cross-row]", x.crossTpl || document).find((r) => $(".cross-table__arch", r) && js("cross-c", r));
        rowCells = ok ? [...ok.querySelectorAll("td")].map((td) => td.cloneNode(true)) : [];
      }
      [...tr.querySelectorAll("td")].forEach((td) => td.remove());
      rowCells.forEach((td) => tr.append(td.cloneNode(true)));
    };
    // 대조표: 방마다 한 줄(번호·이름·결과 이름·원형), C·D 두 축만 막대(0~4) + 숫자. 주 원형 줄기 = .is-main + ◆ 표지 + 화면낭독기 글자(색만으로 구별하지 않음)
    function crossTable(box, pick) {
      const X = T.book.cross || {};
      const P = AC.PROFILE;
      const ci = axisIdx(pick.common), di = pick.split ? axisIdx(pick.split) : -1;
      const table = js("cross-table", box);
      if (!table) return;
      table.dataset.split = pick.split ? "yes" : "none";
      const cap = js("cross-caption", box);
      if (cap) cap.textContent = fill(X.caption || "", { n: pick.n });
      js("cross-c-name", box).textContent = axisName(pick.common);
      js("cross-d-name", box).textContent = pick.split ? axisName(pick.split) : "";
      jsAll("cross-row", table).forEach((tr) => {
        const room = tr.dataset.room;
        const v = state.visits[room];
        const th = $("th", tr);
        if (!v || !v.archetype) {
          // 아직 지나지 않은 방: 방 이름 칸 + "아직 지나지 않은 방" 한 칸
          tr.className = "cross-table__row is-pending";
          const res = js("cross-result", th);
          if (res) res.remove();
          [...tr.querySelectorAll("td")].forEach((td) => td.remove());
          const td = document.createElement("td");
          td.className = "cross-table__wait";
          td.colSpan = 3;
          td.textContent = (X.table || {}).pending || "";
          tr.append(td);
          return;
        }
        if (!$(".cross-table__arch", tr)) doneCells(tr);
        const main = v.archetype === pick.main;
        const sub = !main && pick.shape === "two" && v.archetype === pick.sub; // 두 갈래: 보조 원형 줄기 ◇ (design 「18단계 (J1)」 3절)
        tr.className = "cross-table__row" + (main ? " is-main" : sub ? " is-sub" : "");
        let res = js("cross-result", th);
        if (!res) {
          res = document.createElement("span");
          res.className = "cross-table__result";
          res.dataset.js = "cross-result";
          th.append(res);
        }
        res.textContent = strip(x.visitType(room));
        const archTd = $(".cross-table__arch", tr);
        if (archTd) {
          js("cross-arch", archTd).textContent = archName(v.archetype);
          const mark = js("cross-mark", archTd);
          if (mark) mark.textContent = main ? "◆" : sub ? "◇" : "";
          let sr = js("cross-mark-sr", archTd);
          if ((main || sub) && !sr) {
            sr = document.createElement("span");
            sr.className = "visually-hidden";
            sr.dataset.js = "cross-mark-sr";
            archTd.append(sr);
          }
          if (sr) main || sub ? (sr.textContent = (main ? X.markMain : X.markSub) || "") : sr.remove();
        }
        const c = js("cross-c", tr), d = js("cross-d", tr);
        if (c) meter(c, P[v.archetype][ci]);
        if (d) meter(d, di < 0 ? 0 : P[v.archetype][di]);
      });
      const lm = js("cross-legend-main", box), ls = js("cross-legend-sub", box), lsr = js("cross-legend-sub-row", box);
      if (lm) lm.textContent = fill(X.legendMain || "", { arch: archName(pick.main) });
      if (ls) ls.textContent = fill(X.legendSub || "", { sub: archName(pick.sub) });
      if (lsr) lsr.hidden = pick.shape !== "two" || pick.sub === pick.main; // ◇ 표지는 두 갈래에서만 줄에 붙는다
    }
    function crossAxisCommon(sec, pick) {
      const ci = axisIdx(pick.common);
      const vals = x.crossList().map((r) => AC.PROFILE[r.arch][ci]);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      js("cross-axis-common-name", sec).textContent = axisName(pick.common);
      const m = $(".axis-meter", js("cross-axis-common", sec));
      if (m) m.style.setProperty("--v", avg.toFixed(1));
      js("cross-axis-common-avg", sec).textContent = fill((T.book.cross || {}).avg || "", { v: avg.toFixed(1) });
    }
    function crossSplit(sec, pick) {
      js("cross-axis-split-name", sec).textContent = axisName(pick.split);
      js("cross-high", sec).textContent = roomList(pick.high);
      js("cross-low", sec).textContent = roomList(pick.low);
    }
    function crossLens(sec, pick) {
      const r = pick.odd;
      sec.dataset.room = r;
      const box = js("cross-room", sec);
      const use = $("use", box);
      if (use) use.setAttribute("href", r === "rune" ? "#rune-raidho" : `#icon-${r}`);
      const svg = $("svg", box);
      if (svg) {
        svg.setAttribute("viewBox", r === "rune" ? "0 0 40 60" : "0 0 40 40");
        svg.classList.toggle("sig--rune", r === "rune");
      }
      const num = $(".cross-room__num", box);
      if (num) num.textContent = ROMAN[x.chapterOf(r) - 1];
      js("cross-room-name", box).textContent = T.rooms[r].name;
      js("cross-room-arch", box).textContent = archName(pick.other);
    }
    // (18-2·18-3, design 「18단계 (J1)」 3절) 새 장: cross-tpl의 article을 복제해 쪽(section.cross-sec)마다 문장(유료 원본 항목 하나 통째로, 자리 값만 채움).
    //   그 사람에게 없는 쪽(대체 경로)은 section을 지운다
    function renderCross(C, crossBox) {
      const pick = x.crossPickNow();
      const ch = BookCore.crossChapter(C, pick);
      const art = x.crossTpl ? x.crossTpl.querySelector("article").cloneNode(true) : document.createElement("article");
      textIn(art);
      crossBox.dataset.variant = ch.variant;
      crossBox.dataset.shape = ch.shape;
      const SEC = { shape: "voices", common: "common", split: "split", even: "even", lens: "lens", pair: "pair", same: "same", close: "close" };
      const bySec = Object.fromEntries(ch.pages.map((pg) => [SEC[pg.key], pg]));
      // 쪽 번호는 견본 숫자 그대로 둔다(고른 결 = 3, 한결같은 목소리 = 4 — design 「18단계 (J1)」 4절)
      $$("[data-js=cross-sec]", art).forEach((sec) => {
        const pg = bySec[sec.dataset.sec];
        if (!pg) return sec.remove();
        sec.hidden = false;
        sec.dataset.page = pg.key;
        const body = $(".prose", sec);
        if (body) paras(body, [].concat(pg.text || []).filter(Boolean).map((t) => crossFill(t, pg.vars)));
        if (sec.dataset.sec === "voices") crossTable(sec, pick);
        if (sec.dataset.sec === "common") crossAxisCommon(sec, pick);
        if (sec.dataset.sec === "split") crossSplit(sec, pick);
        if (sec.dataset.sec === "lens") crossLens(sec, pick);
        if (sec.dataset.sec === "pair") {
          js("cross-pair-main", sec).textContent = T.archetypes[pick.main].name;
          js("cross-pair-other", sec).textContent = T.archetypes[pick.other].name;
        }
        $$("[data-js=cross-note]", sec).forEach((n) => (pg.note ? (n.hidden = false) : n.remove()));
      });
      crossBox.append(art);
    }

    // ── (18단계 J1 toc18-tpl, design 「18단계 (J1)」 4절) 목차 조각 셋: 맨 위 띠(7/7 결제 전) · 관심사 줄(순서가 바뀐 때) · 맨 아래 작은 글자 버튼(결제 전)
    const tocKit = (() => {
      const t = js("toc18-tpl");
      if (!t) return null;
      const frag = t.content.cloneNode(true);
      const band = $('[data-js="book-preview-band"]', frag), interest = $('[data-js="book-interest"]', frag), buy = $('[data-js="book-buy-row"]', frag);
      const nav = js("book-chapters");
      const head = $(".book-home__head", js("book-home"));
      if (head && band) head.after(band);
      if (nav && interest) nav.before(interest);
      if (nav && buy) nav.after(buy);
      t.remove();
      [band, interest, buy].forEach((el) => el && applyText(el));
      if (band) band.addEventListener("click", () => openPreview(null));
      if (buy) js("book-buy", buy).addEventListener("click", () => x.goPay("toc"));
      return { band, interest, buy };
    })();
    // 관심사 안내 한 줄: 순서가 바뀐 경우에만, 첫째 관심사를 물은 방 × 관심사 이름 (주제 이름 "돈"은 쓰지 않는다)
    const interestLine = (io) => (io.changed && io.first ? ((T.book.interest || {})[io.first.room] || {})[io.first.interest] || "" : "");
    // 제2부 줄 차례: 새 장 → 관심사 순서 4장 (줄 자체는 그대로, 차례만)
    function orderRows(list, rowOf) {
      const io = x.interestNow();
      ["cross", ...io.part2].forEach((id) => {
        const li = rowOf(id);
        if (li) list.append(li);
      });
      return io;
    }
    // (18-8) 제2부 순서 + 관심사 줄 · (18-5) 7/7 결제 전 맨 위 띠 · 결제 전 맨 아래 작은 글자 버튼 하나 (renderToc 끝에서)
    function toc(n) {
      const scr = x.reportScr;
      const flowRow = $('[data-js="book-chapter"][data-chapter="flow"]', scr);
      const io = flowRow ? orderRows(flowRow.parentElement, (id) => $(`[data-js="book-chapter"][data-chapter="${id}"]`, scr)) : x.interestNow();
      if (!tocKit) return;
      const line = interestLine(io);
      if (tocKit.interest) {
        js("book-interest-text", tocKit.interest).textContent = line;
        tocKit.interest.hidden = !line;
      }
      if (tocKit.band) tocKit.band.hidden = !x.previewOn();
      if (tocKit.buy) {
        tocKit.buy.hidden = Boolean(x.passNow()) || n === 0;
        const lab = $('[data-t="book.toc.buyNow"]', tocKit.buy) || js("book-buy", tocKit.buy);
        lab.textContent = fill(T.book.toc.buyNow || "", { price: comma(PAY.amount) });
      }
    }

    // ── (18-5 「잠긴 장으로 가는 길 — 한 규칙」) 결제 전에 유료 장에 닿는 네 길(목차 잠긴 장·방 결과 책 한 줄·장 끝 "다음 장"·이어 읽기)이
    //   모두 openCover의 이 분기 하나를 지난다. 1~6/7: 목차의 그 장 줄로 스크롤·강조 + 토스트(결제 전 화면으로 가지 않음) · 7/7: 미리보기의 그 장 샘플 자리
    // (운영자 지시 2026-10-21 「결제 유도 앞당기기」) 1~6/7에서도 잠긴 장을 누르면 결제 전 화면으로 간다(받는 것·가격·환불을 거기서 먼저 보여 줌).
    //   목차 강조 + 토스트는 결제 화면이 없을 때(결제 꺼짐)만 남는 대체 길이다
    let targetTimer = 0;
    function lockedRoad(id) {
      if (x.previewOn()) return openPreview(id);
      if (x.goPay("locked")) return;
      x.toToc();
      const scr = x.reportScr;
      const li = $(`[data-js="book-chapter"][data-chapter="${id}"]`, scr);
      if (li) {
        li.scrollIntoView({ block: "center", behavior: x.reduceMotion ? "auto" : "smooth" });
        $$(".chapter-row.is-target", scr).forEach((el) => el.classList.remove("is-target"));
        li.classList.add("is-target");
        clearTimeout(targetTimer);
        targetTimer = setTimeout(() => li.classList.remove("is-target"), 2000);
      }
      toast(T.book.toc.lockedToast || "");
    }

    // ═════════ (18단계 18-5) 내 책 미리 보기 #screen-preview — test·live에서만 template에서 꺼냄. 7/7 결제 전의 주 결제 지점 ═════════
    // 유료 문장 0: 여는 글·닫는 글(data-book-free.js)·첫 줄(data-book-sample.js, 결정 117)·대조표(방별 결과 이름·원형·축 값 = 무료 값)만.
    // 이 화면에서는 함수 book(/api/book)도 결제 SDK도 부르지 않는다. [책 전체 열기]는 결제하지 않고 결제 전 화면(#deeper, from preview)으로 간다.
    let previewScr = null;
    let previewTarget = null; // 잠긴 장으로 가는 길의 끝(그 장 샘플 자리)
    let previewTimer = 0;
    const t = js("preview-tpl");
    if (t) {
      t.after(t.content.cloneNode(true));
      t.remove();
      previewScr = js("screen-preview");
      x.screens.preview = previewScr;
      applyText(previewScr);
    }
    // (18-5) 주소 #preview로 직접: 결제한 탭 → 목차, 1~6/7 → 목차, 0/7 → 입구. 결제 뒤에는 미리보기로 가지 않는다
    const gate = (name) => {
      if (name !== "preview") return name;
      if (!previewScr || x.passNow()) return "report";
      return x.allDone() ? "preview" : x.roomsDone() ? "report" : "hub";
    };
    function openPreview(target) {
      if (!previewScr) return;
      previewTarget = target || null;
      if (x.current() === "preview") x.enter.preview();
      else x.go("preview");
    }
    const PV = () => T.book.preview || {};
    const round100 = (n) => comma(Math.round(n / 100) * 100);
    function renderPreview() {
      const scr = previewScr;
      const c = x.myCodes();
      const a = c.arch;
      const C = BookCore.contentFrom(root);
      show(js("preview-test-band", scr), x.PAY_MODE === "test");
      // 1 머리
      js("preview-title", scr).textContent = fill(PV().title || "", { who: x.whoOf(state.profile.name || "") });
      js("preview-arch", scr).textContent = archName(a);
      // 2 나에게 맞춘 전체 목차 (14장, 관심사 순서)
      const io = orderRows(js("preview-chapters-part2", scr), (id) => $(`[data-js="preview-chapter"][data-chapter="${id}"]`, scr));
      jsAll("preview-chapter", scr).forEach((li) => {
        const id = li.dataset.chapter;
        const free = !PAID_IDS.has(id);
        li.dataset.kind = free ? "free" : "paid";
        li.classList.remove("is-target");
        js("preview-chapter-tag", li).textContent = free ? PV().tagFree || "" : PV().tagPaid || "";
        const n = x.chapterChars(id);
        js("preview-chapter-vol", li).textContent = fill(PV().vol || "", { n: round100(n), m: x.minutes(n) });
        const sub = js("preview-chapter-sub", li);
        if (sub) sub.textContent = CHAPTER_ORDER.includes(id) ? (x.isDone(id) ? x.headOf(id, c).title : "") : id === "cross" ? T.book.chapter.blurbs.cross || "" : "";
      });
      const line = interestLine(io);
      js("preview-interest-text", scr).textContent = line;
      js("preview-interest", scr).hidden = !line;
      // 3 맛보기: 여는 글 전문 → 일곱 장의 첫 줄 → 대조표 미리 보기 → 닫는 글(접힘)
      const openEl = js("preview-open", scr);
      paras(openEl, BookCore.openChapter(C, a).paragraphs);
      if (openEl.firstElementChild) openEl.firstElementChild.className = "has-dropcap";
      jsAll("preview-first", scr).forEach((li) => {
        const room = li.dataset.room;
        li.classList.remove("is-target");
        js("preview-first-result", li).textContent = x.isDone(room) ? x.headOf(room, c).title : "";
        js("preview-first-text", li).textContent = x.isDone(room) ? BookCore.firstLineOf(C, room, c) : "";
        js("preview-first-rest", li).textContent = fill(PV().firstRest || "", { n: round100(x.chapterChars(room)) }); // 결제 전 화면 "받는 것"의 그 장 분량과 같은 값
      });
      const pc = js("preview-cross", scr);
      const pick = x.crossPickNow();
      if (pc && pick) crossTable(pc, pick);
      if (pc) pc.classList.remove("is-target");
      paras(js("preview-close", scr), BookCore.closeChapter(C, a).paragraphs);
      js("preview-close", scr).hidden = true;
      const fold = js("preview-close-toggle", scr);
      fold.hidden = false;
      fold.setAttribute("aria-expanded", "false");
      // 4 무료와 책의 차이 (무료 UI 문구)
      const D = PV().diff || {};
      const freeUl = js("preview-diff-free", scr), bookUl = js("preview-diff-book", scr);
      freeUl.textContent = "";
      (D.free || []).forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        freeUl.append(li);
      });
      bookUl.textContent = "";
      (D.book || []).forEach((d) => {
        const li = document.createElement("li");
        const b = document.createElement("b");
        b.textContent = d.name || "";
        const sp = document.createElement("span");
        sp.textContent = d.line || "";
        li.append(b, sp);
        bookUl.append(li);
      });
      // 5 한 번 결제 · 6 주 버튼 (가격은 이 자리에 한 번만)
      js("preview-once-price", scr).textContent = fill(PV().once || "", { price: comma(PAY.amount) });
      js("preview-go-label", scr).textContent = fill(PV().go || "", { price: comma(PAY.amount) });
    }
    // 길 끝: 방 장 = 「일곱 장의 첫 줄」의 그 방 줄 · 새 장 = 대조표 미리 보기 · 그 밖 제2부 장 = 미리보기 목차의 그 장 줄
    function previewScrollTo(id) {
      const scr = previewScr;
      const el = !id ? null : CHAPTER_ORDER.includes(id) ? $(`[data-js="preview-first"][data-chapter="${id}"]`, scr) : id === "cross" ? js("preview-cross", scr) : $(`[data-js="preview-chapter"][data-chapter="${id}"]`, scr);
      if (!el) return;
      el.classList.add("is-target");
      el.scrollIntoView({ block: "center", behavior: "auto" });
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => el.classList.remove("is-target"), 2000);
    }
    if (previewScr) {
      x.enter.preview = () => {
        const target = previewTarget;
        previewTarget = null;
        previewScr.dataset.state = "loading";
        Promise.all([x.loadFile(x.FREE_FILE), x.loadFile(x.SAMPLE_FILE), x.ensureRooms(x.filledRooms())]).then(() => {
          if (x.current() !== "preview") return;
          renderPreview();
          previewScr.dataset.state = "ready";
          if (target) previewScrollTo(target);
          else window.scrollTo(0, 0);
          track("so_book", { step: "preview" });
        }, () => toast(T.toast.loadFail || ""));
      };
      js("preview-close-toggle", previewScr).addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const bodyEl = js("preview-close", previewScr);
        btn.setAttribute("aria-expanded", "true");
        bodyEl.hidden = false;
        btn.hidden = true; // 한 번에 펼침(접기 없음) — 눌러도 아무 일 없는 버튼을 남기지 않는다
        bodyEl.tabIndex = -1;
        bodyEl.focus({ preventScroll: true });
      });
      js("preview-go", previewScr).addEventListener("click", () => x.goPay("preview"));
    }

    // (17-2) 인연의 장 그리기 (책 화면 전용이라 18단계 결정 120 때 app.js에서 옮김, 내용 그대로)
    function renderYeon(C, cx, yeonBox, yeonTpl) {
      // (17-2, design 「17단계」 5절) 인연의 장: yeon-tpl의 article을 복제해 쪽(section.yeon-sec)마다 이름(data.js book.yeon.secs)·본문·안내 한 줄(book.yeon.notes).
      //   문장 고르기는 BookCore.yeonChapter. 그 사람에게 없는 쪽은 section을 지우고, 남은 쪽 번호를 1부터 다시 매긴다
      const Y = T.book.yeon;
      const y = BookCore.yeonChapter(C, cx);
      const stemEl = cx.stem == null ? null : BookCore.ELEMENT_OF_STEM[cx.stem];
      yeonBox.dataset.variant = y.variant;
      const art = yeonTpl ? yeonTpl.querySelector("article").cloneNode(true) : document.createElement("article"); // 견본이 없으면(옛 마크업) 빈 장
      textIn(art);
      const SLOT = { pull: "pull", mirror: "habit", meet: "meet", twist: "pulse", same: "pulse", scene: "scene", time: "when", season: "season" };
      const NAME = { mirror: "habit", twist: "pulse", time: "when" }; // 쪽 이름 키(secs)가 문장 칸 이름과 다른 것
      const bySlot = Object.fromEntries(y.pages.map((pg) => [SLOT[pg.key], pg]));
      let num = 0;
      $$("[data-js=yeon-sec]", art).forEach((sec) => {
        const pg = bySlot[sec.dataset.sec];
        if (!pg) return sec.remove();
        sec.dataset.page = pg.key;
        $(".yeon-sec__num", sec).textContent = String(++num);
        const name = $(".yeon-sec__head [data-t]", sec);
        name.removeAttribute("data-t");
        name.textContent = Y.secs[NAME[pg.key] || pg.key] || "";
        const body = js(`yeon-${sec.dataset.sec}`, sec);
        if (body && body.classList.contains("prose")) paras(body, [].concat(pg.text || []).filter(Boolean)); // 시기 쪽(yeon-when)은 아래에서 칸으로
        if (sec.dataset.sec === "when") {
          const ol = js("yeon-when", sec);
          const li0 = ol.firstElementChild.cloneNode(true);
          ol.textContent = "";
          const rows = pg.bands ? pg.bands.map((x) => ({ age: fill(x.now ? Y.bandNow : Y.bandNext, { label: Y.bands[x.band] || "" }), text: x.text, now: x.now })) : [{ age: "", text: pg.text, now: true }];
          rows.forEach((x) => {
            const li = li0.cloneNode(true);
            li.classList.toggle("is-now", x.now);
            const age = js("yeon-when-age", li);
            age.textContent = x.age;
            if (!x.age) age.remove(); // 나이 모름: 구간 이름 없이 한 칸 + 안내(17-2)
            js("yeon-when-text", li).textContent = [].concat(x.text || []).join(" ");
            ol.append(li);
          });
        }
        if (sec.dataset.sec === "season") {
          const nm = js("yeon-season-name", sec);
          const el = stemEl;
          nm.removeAttribute("style");
          if (el) {
            nm.dataset.el = el; // style.css [data-el] → --el 오행 색
            nm.textContent = Y.seasons[el] || "";
          } else {
            nm.remove();
            js("yeon-season", sec).remove(); // 만신 안 지남: 본문 대신 안내만
          }
        }
        $$("[data-js=yeon-note]", sec).forEach((n) => {
          const on = pg.note && n.dataset.t === `book.yeon.notes.${pg.note}`;
          if (on) n.hidden = false;
          else n.remove();
        });
      });
      yeonBox.append(art);
    }

    // ── (20단계) 「2027년의 흐름」: 인연의 장과 같은 쪽 모양(section.yeon-sec)을 JS로 만든다. 쪽 = 한 해의 결 · 네 갈래 · 계절마다 · 이 해를 위한 한 가지
    //   문장 고르기는 BookCore.yearChapter(일간 판 / 공통판). 화면 틀 문구는 data.js book.year. 네 갈래 순서는 시기별 흐름과 같은 관심사 순서(18-8)
    function renderYear(C, cx, box) {
      const Y = T.book.year || {};
      const y = BookCore.yearChapter(C, cx);
      box.dataset.variant = y.variant;
      const el = (tag, cls, text) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
      };
      const art = el("article", "report-part book-part");
      art.dataset.part = "year";
      const areaOrder = x.interestNow().areas;
      y.pages.forEach((pg, i) => {
        const sec = el("section", "yeon-sec year-sec");
        sec.dataset.page = pg.key;
        const h = el("h3", "yeon-sec__head");
        h.append(el("span", "yeon-sec__num", String(i + 1)), el("span", null, (Y.secs || {})[pg.key] || ""));
        h.firstChild.setAttribute("aria-hidden", "true");
        sec.append(h);
        if (pg.key === "theme") {
          const head = el("p", "yeon-season__name year-ganji", y.stem == null ? Y.ganji || "" : fill(Y.ganjiStem || "", { stem: (Y.stems || [])[y.stem] || "" }));
          head.dataset.el = "fire"; // 정미년의 천간 丁 = 불 (style.css [data-el] → --el 색)
          sec.append(head, el("p", "yeon-sec__note year-span", Y.span || ""));
        }
        if (pg.text) {
          const prose = el("div", "prose");
          paras(prose, [].concat(pg.text).filter(Boolean));
          sec.append(prose);
        }
        if (pg.items) {
          const ol = el("ol", "yeon-when year-list");
          const items = pg.key === "areas" ? areaOrder.map((k) => pg.items.find((it) => it.key === k)).filter(Boolean) : pg.items;
          items.forEach((it) => {
            const li = el("li", "yeon-when__item");
            li.dataset.key = it.key;
            li.append(el("p", "yeon-when__age", ((pg.key === "areas" ? Y.areas : Y.seasons) || {})[it.key] || ""), el("p", "yeon-when__text", [].concat(it.text || []).join(" ")));
            ol.append(li);
          });
          sec.append(ol);
        }
        if (pg.key === "theme" && y.stem == null && (Y.notes || {}).noStem) sec.append(el("p", "yeon-sec__note", Y.notes.noStem));
        art.append(sec);
      });
      box.append(art);
    }

    // ── (18-8) 시기별 흐름: 영역 순서만 관심사대로 (문장은 그대로)
    function areas(el, list) {
      const dl = $(".timeline__areas", el);
      if (dl) list.forEach((k) => {
        const dd = js(`timeline-${k}`, el);
        if (dd && dd.parentElement.parentElement === dl) dl.append(dd.parentElement);
      });
    }

    // ── 결제 전 화면 "받는 것" (15-4 1번, 17-5·18-9). 목차와 같은 순서(18-8). 방 장 분량은 첫 줄(맛보기)을 뺀 값(make-volume)
    function payList(payScr, from) {
      const list = js("pay-chapters", payScr);
      list.textContent = "";
      let sum = 0;
      x.bookOrder().filter((id) => PAID_IDS.has(id)).forEach((id) => {
        const n = x.chapterChars(id);
        sum += n;
        const li = document.createElement("li");
        li.className = "pay-list__item";
        const a = document.createElement("span");
        a.className = "pay-list__name";
        a.textContent = x.chapterName(id);
        if (id === "cross") {
          // (18-9, design 「18단계 (J1)」) 새로 더해진 장 알약은 새 장에. 마친 방 1개 이하(아직 안 열림)면 평균 분량 + 상태 글자
          li.classList.add("pay-list__item--new");
          const nb = document.createElement("span");
          nb.className = "pay-list__new";
          nb.textContent = PAY.what.newBadge || "";
          if (nb.textContent) a.append(nb);
          if (!x.available("cross")) {
            const st = document.createElement("span");
            st.className = "pay-list__state";
            st.dataset.js = "pay-cross-state";
            st.textContent = PAY.what.crossWait || "";
            a.append(st);
          }
        }
        // (2026-10-26) 장마다 한 줄 설명: 방 장 = pay.roomSub, 그 밖 = book.chapter.blurbs. 궁합 줄은 강조
        const subText = x.CHAPTER_ORDER.includes(id) ? PAY.roomSub : ((T.book.chapter || {}).blurbs || {})[id];
        if (subText) {
          const sub = document.createElement("span");
          sub.className = "pay-list__sub";
          sub.textContent = subText;
          a.append(sub);
        }
        if (id === "match") li.classList.add("pay-list__item--hot");
        const b = document.createElement("span");
        b.className = "pay-list__vol";
        b.textContent = fill(PAY.what.item || "", { n: comma(Math.round(n / 100) * 100) });
        li.append(a, b);
        list.append(li);
      });
      js("pay-total", payScr).textContent = fill(PAY.what.total || "", { n: (Math.round(sum / 1000) / 10).toLocaleString("ko-KR") });
      const backPv = js("pay-back-preview", payScr);
      if (backPv) backPv.hidden = !(from === "preview" && x.previewOn()); // (18-5) 미리보기에서 왔을 때만 "미리보기로 돌아가기"
    }

    return { gate, openPreview, lockedRoad, toc, renderCross, renderYeon, renderYear, areas, payList };
  }

  const BookPlus = { core, mount };
  if (typeof module === "object" && module.exports) module.exports = BookPlus;
  else {
    if (root.BookCore) Object.assign(root.BookCore, core);
    root.BookPlus = BookPlus;
  }
})(typeof window !== "undefined" ? window : this);
