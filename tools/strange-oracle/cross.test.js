// 18단계 단위 시험: 새 장 「겹치는 곳, 갈리는 곳」 고르기(18-2·18-3) · 분량(18-9) · 관심사 순서(18-8) · 첫 줄 옮기기(18-6) · 문구 도구 --stage 18(18-4·18-10)
// 실행: node --test "tools/strange-oracle/*.test.js"  (방 2~7개 모든 조합 약 240만 개를 도는 시험이 있어 이 파일만 30~60초 걸린다)
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..", "..");
const PROD = path.join(ROOT, "products", "strange-oracle");
const Book = require(path.join(PROD, "book.js"));
const K = require(path.join(PROD, "arch-core.js"));
const MapCore = require(path.join(PROD, "map.js"));
const L = require("./copy-17/lib.js");
const Check = require("./check-17.js");
const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const ARCH = K.ARCH;
const START = "3dface52597118607426d21457fec5f94baa935a"; // 18단계 시작 커밋 (PROGRESS-18)
const list = (archs) => archs.map((arch, i) => ({ room: ROOMS[i], arch }));
const pick = (archs) => Book.crossPick(list(archs), K);

test("arch-core.js: map.js가 같은 상수를 읽는다(숫자 그대로, 16-4의 1)", () => {
  assert.strictEqual(MapCore.PROFILE, K.PROFILE);
  assert.deepStrictEqual(MapCore.AXES, ["act", "talk", "heart", "order", "free"]);
  assert.deepStrictEqual(K.PROFILE.warrior, [4, 1, 1, 2, 2]);
  assert.deepStrictEqual(K.PROFILE.ruler, [3, 1, 1, 4, 0]);
  const old = execFileSync("git", ["show", `${START}:products/strange-oracle/map.js`], { cwd: ROOT, encoding: "utf8" });
  const m = /const PROFILE = (\{[\s\S]*?\});/.exec(old);
  assert.ok(m, "옛 map.js PROFILE");
  assert.strictEqual(JSON.stringify(vm.runInNewContext(`(${m[1]})`)), JSON.stringify(K.PROFILE), "18단계 전 map.js PROFILE과 같음");
});

test("18-2 모양 표 경계: n=2·3·4·7, 2·2·3, 3·3·1, 모두 다름, 모두 같음", () => {
  const [W, S, Lv, Rb, C, E, Cr, Ru] = ARCH;
  assert.strictEqual(pick([W]), null, "방 1개 → 열리지 않음");
  assert.strictEqual(pick([W, W]).shape, "one", "n=2 같음 → k = n");
  assert.strictEqual(pick([W, S]).shape, "many", "n=2 다름 → k = k2 = 1");
  assert.strictEqual(pick([W, W, S]).shape, "trunk", "n=3 2·1 → k=2, n≤4");
  assert.strictEqual(pick([W, S, Lv]).shape, "many");
  assert.strictEqual(pick([W, W, S, S]).shape, "two", "n=4 2·2");
  assert.strictEqual(pick([W, W, S, Lv]).shape, "trunk", "n=4 2·1·1");
  assert.strictEqual(pick([W, W, S, Lv, Rb]).shape, "many", "n=5 2·1·1·1");
  assert.strictEqual(pick([W, W, S, S, Lv, Lv, Lv]).shape, "trunk", "2·2·3 → M=lover k=3, k2=2");
  assert.strictEqual(pick([W, W, S, S, Lv, Lv, Lv]).main, "lover");
  assert.strictEqual(pick([W, W, W, S, S, S, Lv]).shape, "two", "3·3·1 → 두 갈래가 먼저");
  assert.strictEqual(pick([W, S, Lv, Rb, C, E, Cr]).shape, "many", "모두 다름");
  assert.strictEqual(pick(Array(7).fill(Ru)).shape, "one", "모두 같음");
  assert.strictEqual(pick([W, W, W, W, S, Lv, Rb]).shape, "one", "k ≥ 4");
  assert.strictEqual(pick([W, W, W, S, Lv, Rb, C]).shape, "trunk", "k = 3");
  assert.strictEqual(pick([W, W, S, Lv, Rb, C, E]).shape, "many", "k = 2, n > 4");
});

test("18-2 C·D·O 동점 규칙과 「고른 결」·「한결같은 목소리」 경로", () => {
  // 모두 같음: 폭 0 → D 없음(고른 결), O 없음(한결같은 목소리). C = 평균 최대(warrior act 4)
  const same = pick(Array(5).fill("warrior"));
  assert.strictEqual(same.split, null);
  assert.strictEqual(same.odd, null);
  assert.strictEqual(same.common, "act");
  const ch = Book.crossChapter({ cross: L.emptyCross() }, same);
  assert.deepStrictEqual(ch.pages.map((p) => p.key), ["shape", "common", "even", "same", "close"]);
  assert.strictEqual(ch.pages[4].note, "more", "방 5개 → 끝 한 줄");
  // C 동점: creator [2,3,2,2,2] + sage [1,4,1,3,1] → talk 합 7(최대). explorer[2,3,1,0,4] + rebel[3,2,1,0,4]: act 5, talk 5, free 8 → free
  assert.strictEqual(pick(["creator", "sage"]).common, "talk");
  assert.strictEqual(pick(["explorer", "rebel"]).common, "free");
  // C 동점 → 폭 작은 축: warrior[4,1,1,2,2] + ruler[3,1,1,4,0] → act 7·order 6 → act / lover[1,2,4,1,2]+caregiver[1,1,4,3,0] → heart 8
  // 동점 만들기: sage[1,4,1,3,1] + ruler[3,1,1,4,0]: act 4, talk 5, heart 2, order 7, free 1 → order. warrior + sage: act 5(폭 3), talk 5(폭 3), order 5(폭 1) → order(폭 작음)
  assert.strictEqual(pick(["warrior", "sage"]).common, "order", "합 동점(act·talk·order 5) → 폭 작은 order");
  // 폭과 합이 모두 같으면 AXES 순서: creator 둘 → act 4·talk 6·… → talk. lover + creator: act 3(폭1) talk 5(폭1) heart 6(폭2) → heart
  assert.strictEqual(pick(["lover", "creator"]).common, "heart");
  // D: C를 뺀 폭 최대(2 이상), 동점이면 AXES 순서. warrior + sage: C=order, 폭 act 3·talk 3·heart 0·free 1 → act(앞선 축)
  const ws = pick(["warrior", "sage"]);
  assert.strictEqual(ws.split, "act");
  assert.deepStrictEqual([ws.high, ws.low], [["saju"], ["ogham"]]);
  // 원형은 다르나 모든 축의 폭이 2 미만 → 고른 결(D 없음), O는 있음
  const close = pick(["creator", "explorer"]); // [2,3,2,2,2] vs [2,3,1,0,4]: heart 1, order 2 → 폭 2 있음
  assert.ok(close.split);
  const even = pick(["warrior", "creator"]); // [4,1,1,2,2] vs [2,3,2,2,2]: 폭 2·2·1·0·0 → C? act 6 talk 4 heart 3 order 4 free 4 → C=act, 남은 폭 talk 2 → D=talk
  assert.strictEqual(even.split, "talk");
  const flat = pick(["sage", "creator"]); // [1,4,1,3,1] vs [2,3,2,2,2]: 폭 모두 1 → D 없음
  assert.strictEqual(flat.split, null);
  assert.strictEqual(flat.odd, "ogham");
  assert.deepStrictEqual(Book.crossChapter({ cross: L.emptyCross() }, flat).pages.map((p) => p.key), ["shape", "common", "even", "lens", "pair", "close"]);
  // O: 프로필이 M과 가장 먼 방, 동점이면 앞선 장. M = warrior(3번), 다른 방 rebel·sage: |warrior−sage| = 3+3+0+1+1 = 8, |warrior−rebel| = 1+1+0+2+2 = 6 → sage
  const o = pick(["warrior", "rebel", "warrior", "sage", "warrior"]);
  assert.strictEqual(o.main, "warrior");
  assert.strictEqual(o.odd, "decan");
  assert.strictEqual(o.other, "sage");
  // O 동점(같은 원형 둘) → 앞선 장
  assert.strictEqual(pick(["warrior", "warrior", "sage", "sage", "warrior"]).odd, "star");
});

test("보조 원형 = 지도(map.js archPair)·인연의 장(book.js archPair) 규칙과 같음", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let t = 0; t < 3000; t++) {
    const n = 2 + Math.floor(rnd() * 6);
    const archs = Array.from({ length: n }, () => ARCH[Math.floor(rnd() * 8)]);
    const p = pick(archs);
    const m = MapCore.archPair(archs);
    const y = Book.archPair(archs);
    assert.deepStrictEqual([p.main, p.sub], [m.main, m.sub]);
    assert.deepStrictEqual([p.main, p.sub], [y.main, y.sub]);
  }
});

test("성별·나이·생년월일을 쓰지 않는다: 입력은 방별 원형뿐 (같은 원형 목록이면 같은 장)", () => {
  const a = Book.crossPick([{ room: "saju", arch: "lover", gender: "M", birth: { y: 1990 } }, { room: "ogham", arch: "sage" }], K);
  const b = Book.crossPick([{ room: "saju", arch: "lover", gender: "F", birth: { y: 2001 } }, { room: "ogham", arch: "sage" }], K);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(Book.crossPick.length, 2);
});

test("이어가기 코드로 돌아온 탭: 방별 원형만 있으면(별의 방 restored 포함) 같은 장", () => {
  const live = Book.crossPick([{ room: "saju", arch: "ruler" }, { room: "star", arch: "sage" }, { room: "rune", arch: "ruler" }], K);
  const restored = Book.crossPick([{ room: "saju", arch: "ruler", code: 532 }, { room: "star", arch: "sage", restored: true }, { room: "rune", arch: "ruler" }], K);
  assert.deepStrictEqual(live, restored);
});

test("18-12의 3: 방 2~7개 모든 조합(약 240만)에서 문장이 없는 열쇠 0 · 나오지 않는 열쇠 0 (강제 순서: 앞에서부터 이어진 방)", () => {
  const all = new Set(L.buildCrossItems().map((x) => x.id));
  assert.strictEqual(all.size, 164);
  const seen = new Set();
  const X = L.emptyCross();
  let combos = 0, missing = 0;
  for (let n = 2; n <= 7; n++) {
    const R = ROOMS.slice(0, n);
    const idx = new Array(n).fill(0);
    const lst = R.map((room) => ({ room, arch: ARCH[0] }));
    for (;;) {
      const p = Book.crossPick(lst, K);
      const ch = Book.crossChapter({ cross: X }, p);
      for (const pg of ch.pages) if (pg.text === undefined) missing++;
      seen.add(`cross.shape.${p.shape}.${p.main}`);
      seen.add(`cross.common.${p.common}.${p.main}`);
      seen.add(p.split ? `cross.split.${p.split}` : `cross.even.${p.main}`);
      if (p.odd) {
        seen.add(`cross.lens.${p.odd}`);
        seen.add(`cross.pair.${p.main}-${p.other}`);
      } else seen.add(`cross.same.${p.main}`);
      seen.add(`cross.close.${p.main}`);
      combos++;
      let i = 0;
      while (i < n && ++idx[i] === 8) idx[i++] = 0;
      if (i === n) break;
      for (let j = 0; j <= i && j < n; j++) lst[j].arch = ARCH[idx[j]];
    }
  }
  assert.strictEqual(combos, 8 ** 2 + 8 ** 3 + 8 ** 4 + 8 ** 5 + 8 ** 6 + 8 ** 7);
  assert.strictEqual(missing, 0, "문장이 없는 열쇠");
  assert.deepStrictEqual([...all].filter((k) => !seen.has(k)), [], "나오지 않는 열쇠");
  assert.deepStrictEqual([...seen].filter((k) => !all.has(k)), [], "items.json에 없는 열쇠");
});

test("18-9 분량: 새 장 표 값(crossVolume) = 그 사람 경로의 조립 글자 수(기본·고른 결·한결같은 목소리)", () => {
  const X = L.emptyCross();
  // 칸마다 다른 길이의 가짜 문장(시험 안에서만)으로 경로마다 맞는지 본다
  let k = 0;
  (function fill(o) {
    for (const key of Object.keys(o)) if (typeof o[key] === "object") fill(o[key]); else o[key] = "가".repeat(10 + (k++ % 97));
  })(X);
  const V = Book.crossTable(X);
  for (const archs of [["warrior", "sage", "lover", "rebel", "caregiver", "explorer", "creator"], Array(4).fill("sage"), ["sage", "creator"], ["warrior", "warrior", "sage"]]) {
    const p = pick(archs);
    const ch = Book.crossChapter({ cross: X }, p);
    assert.strictEqual(Book.crossVolume(V, p), Book.crossChars(ch), archs.join());
  }
  // data-volume.js에 cross 표와 avg.cross가 있다 (make-volume)
  const w = {};
  vm.runInNewContext(fs.readFileSync(path.join(PROD, "data-volume.js"), "utf8"), { window: w });
  assert.ok(w.BOOK_VOLUME.cross && w.BOOK_VOLUME.cross.pair && "avg" in w.BOOK_VOLUME && "cross" in w.BOOK_VOLUME.avg);
  assert.strictEqual(JSON.stringify(w.BOOK_VOLUME.cross), JSON.stringify(Book.crossTable(L.crossData())), "data-volume.js가 낡음 → make-volume");
});

test("18-8 관심사: 표 4 × 둘째 관심사, 주제 없음 → 지금 순서, money → 일, 시빌라 우선, 영역 순서", () => {
  const O = (sibyl, rune) => Book.interestOrder({ sibyl, rune });
  assert.deepStrictEqual(O(null, null).part2, ["flow", "year", "yeon", "match", "deep"]);
  assert.strictEqual(O(null, null).changed, false);
  assert.deepStrictEqual(O("love").part2, ["yeon", "match", "flow", "year", "deep"]);
  assert.deepStrictEqual(O("relation").part2, ["match", "yeon", "flow", "year", "deep"]);
  assert.deepStrictEqual(O("work").part2, ["flow", "year", "deep", "yeon", "match"]);
  assert.deepStrictEqual(O("exam").part2, ["flow", "year", "deep", "yeon", "match"]);
  assert.deepStrictEqual(O("self").part2, ["deep", "flow", "year", "yeon", "match"]);
  assert.deepStrictEqual(O(null, "money").part2, O(null, "work").part2, "룬 money → 일");
  assert.deepStrictEqual(O(null, "money").first, { room: "rune", interest: "work" });
  assert.deepStrictEqual(O(null, "me").part2, ["deep", "flow", "year", "yeon", "match"]);
  assert.deepStrictEqual(O("love", "work").part2, ["yeon", "flow", "year", "match", "deep"], "기획서 예: 사랑 + 일");
  assert.deepStrictEqual(O("love", "me").part2, ["yeon", "deep", "match", "flow", "year"]);
  assert.deepStrictEqual(O("love", "love").part2, ["yeon", "match", "flow", "year", "deep"], "둘째가 같으면 그대로");
  assert.deepStrictEqual(O("relation", "love").part2, ["match", "yeon", "flow", "year", "deep"], "둘째 맨 앞 장이 앞 두 칸 안 → 그대로");
  assert.deepStrictEqual(O("work", "love").part2, ["flow", "year", "yeon", "deep", "match"]);
  assert.deepStrictEqual(O("self", "work").part2, ["deep", "flow", "year", "yeon", "match"]);
  assert.strictEqual(O("love", "work").first.room, "sibyl", "시빌라 우선");
  // 4 × 4 모든 짝: 다섯 장(20단계 year 포함)이 한 번씩, 새 장은 늘 제2부 맨 앞
  for (const a of [null, "love", "relation", "work", "self"]) for (const r of [null, "love", "work", "money", "me"]) {
    const o = O(a, r);
    assert.deepStrictEqual([...o.part2].sort(), ["deep", "flow", "match", "year", "yeon"]);
    const full = Book.bookOrder(ROOMS, { sibyl: a, rune: r });
    assert.deepStrictEqual(full.slice(0, 9), ["open", ...ROOMS, "cross"]);
    assert.strictEqual(full[14], "close");
    assert.strictEqual(o.part2[o.part2.indexOf("flow") + 1], "year", "(20단계) 2027년의 흐름은 늘 시기별 흐름 바로 뒤");
  }
  assert.deepStrictEqual(O("love").areas, ["relation", "work", "learn", "move"]);
  assert.deepStrictEqual(O("relation").areas, ["relation", "work", "learn", "move"]);
  assert.deepStrictEqual(O(null, "money").areas, ["work", "learn", "relation", "move"]);
  assert.deepStrictEqual(O("self").areas, ["work", "relation", "learn", "move"]);
  assert.deepStrictEqual(O(null, null).areas, ["work", "relation", "learn", "move"]);
});

test("18-8 안내 줄: 관심사 이름으로(주제 이름 '돈' 0), 물은 방 × 관심사 키가 data.js에 있음", () => {
  const w = {};
  vm.runInNewContext(fs.readFileSync(path.join(PROD, "data.js"), "utf8"), { window: w });
  const I = w.TEXT.book.interest;
  for (const [room, map] of Object.entries(Book.INTEREST_OF)) for (const interest of new Set(Object.values(map))) {
    assert.ok(typeof I[room][interest] === "string" && I[room][interest].length > 0, `${room}.${interest}`);
    assert.ok(!/돈|재물|money/.test(I[room][interest]), `${room}.${interest}에 주제 이름 돈`);
    assert.ok([...I[room][interest].replace(/^\[초안\]\s*/, "")].length <= 60, `${room}.${interest} 60자`);
  }
});

test("18-6 첫 줄: data-book-sample.js 169개 = 18단계 전 유료 원본 firstLine과 글자 그대로 · 유료 원본에 firstLine 키 0", () => {
  const S = L.sampleData();
  let n = 0;
  for (const r of ROOMS) {
    const old = execFileSync("git", ["show", `${START}:products/strange-oracle/api/_paid/book/book-${r}.js`], { cwd: ROOT, encoding: "utf8" });
    const w = {};
    vm.runInNewContext(old, { window: w });
    const full = w[`BOOK_${r.toUpperCase()}`].full;
    assert.strictEqual(JSON.stringify(S[r].map((x) => x.code)), JSON.stringify(full.map((e) => e.code)), `${r} code 순서`);
    S[r].forEach((x, i) => assert.strictEqual(x.firstLine, full[i].firstLine, `${r} ${x.code}`));
    n += S[r].length;
    const now = L.roomData(r);
    assert.ok(now.full.every((e) => !("firstLine" in e)), `${r} 유료 원본에 firstLine 남음`);
    assert.ok(!fs.readFileSync(path.join(L.PAID, `book-${r}.js`), "utf8").includes('"firstLine"'));
  }
  assert.strictEqual(n, 169);
  // 책 장 첫 쪽에는 지금처럼 그려진다: fullRoom이 공개 파일에서 읽는다
  const C = { full: { ogham: L.roomData("ogham").full }, hidden: { ogham: L.roomData("ogham").hidden }, sample: S };
  assert.strictEqual(Book.fullRoom(C, "ogham", { ogham: 3 }).firstLine, S.ogham[3].firstLine);
  const Cr = { full: { rune: L.roomData("rune").full }, hidden: { rune: L.roomData("rune").hidden }, sample: S };
  assert.strictEqual(Book.fullRoom(Cr, "rune", { rune: [1, 5, 9] }).firstLine, S.rune[5].firstLine, "룬 = 지금 자리");
  assert.strictEqual(Book.firstLineOf({ sample: S }, "saju", { saju: 1201 }), S.saju[2].firstLine, "만신 = 일간");
  assert.strictEqual(Book.fullRoom({ full: C.full, hidden: C.hidden }, "ogham", { ogham: 3 }).firstLine, "", "맛보기 파일을 아직 안 받았으면 빈칸");
});

test("18-4 check-17 --stage 18 목록: 정확도 과장·오류 틀·원형 깎기 금지, 자리 값 뒤 글자 허용 목록(검수 2차 조건 1)", () => {
  const f = (t) => Check.FAIL18.filter((x) => x.re.test(t)).map((x) => x.word);
  const c = (t) => Check.CONFIRM18.filter((x) => x.re.test(t)).map((x) => x.word);
  for (const t of ["여러 방이 적중했어요.", "틀림없이 당신은", "증명했어요", "과학적으로", "어느 체계가 틀렸다", "가짜 당신", "그 면은 버리세요"]) assert.ok(f(t).length, t);
  for (const t of ["{arch}로 가요", "{arch}예요", "{arch}랑", "{arch}라는", "「{arch}」는", "「{axis}」이라", "{sub}와", "{other}를"]) assert.ok(f(t).length, t);
  for (const t of ["{arch}의 결.", "「{arch}」의 결", "「{axis}」 쪽", "{arch}, 그리고", "{arch}·{sub}.", "「{arch}」.", "{room}으로", "{high}은 이렇게", "{arch}!"]) assert.deepStrictEqual(f(t), [], t);
  assert.ok(c("정확한 답").length && c("모순처럼 보여도").length && c("약점이 아니라").length);
  assert.deepStrictEqual(Check.VARS18, ["arch", "sub", "other", "axis", "room", "high", "low", "n"]);
});

test("18-10 copy-18/items.json: 164항목·kind 8개·QA 전부 읽기 108·묶음마다 같은 kind", () => {
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, "copy-18", "items.json"), "utf8"));
  assert.strictEqual(items.length, 164);
  const kinds = {};
  items.forEach((x) => (kinds[x.kind] = (kinds[x.kind] || 0) + 1));
  assert.deepStrictEqual(kinds, { "cross.lens": 7, "cross.shape": 32, "cross.common": 40, "cross.split": 5, "cross.pair": 56, "cross.even": 8, "cross.same": 8, "cross.close": 8 });
  assert.strictEqual(items.filter((x) => x.review === "all").length, 108, "5쪽 56 + 3쪽 5 + 4쪽 7 + 대체 16 + 6쪽 8 + 1쪽 두 갈래·여러 갈래 16");
  const byBatch = {};
  items.forEach((x) => (byBatch[x.batch] = byBatch[x.batch] || new Set()).add(x.kind));
  assert.ok(Object.values(byBatch).every((s) => s.size === 1));
  assert.ok(items.every((x) => !("text" in x)), "유료 원문 칸 없음");
  assert.ok(items.filter((x) => x.kind === "cross.split").every((x) => x.max === Math.round(450 * 1.15) + 90));
});
