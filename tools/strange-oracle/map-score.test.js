// 16단계 친구 지도 — 점수 공식(16-4)과 배치(16-3의 2) 단위 시험. map.js의 순수 계산 부분을 그대로 불러 쓴다.
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const C = require(path.join(__dirname, "..", "..", "products", "strange-oracle", "map.js"));

const N = C.CODES.length; // 64
const pairs = [];
for (let i = 0; i < N; i++) for (let j = i; j < N; j++) pairs.push([C.CODES[i], C.CODES[j]]);

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("코드 64개 · 쌍 2,080개 · 점수 40~99 · 결정적 · 대칭", () => {
  assert.strictEqual(N, 64);
  assert.strictEqual(pairs.length, 2080);
  for (const [a, b] of pairs) {
    const x = C.match(a, b);
    const y = C.match(b, a);
    assert.strictEqual(x.score, y.score);
    assert.deepStrictEqual(x.axes, y.axes);
    assert.deepStrictEqual(C.match(a, b), x);
    assert.ok(x.score >= 40 && x.score <= 99, `범위 ${x.score}`);
    x.axes.forEach((s) => assert.ok(s >= 0 && s <= 100));
  }
});

test("쏠림 기준 1: 같은 raw 묶음 최대 ≤ 3%", () => {
  const cnt = {};
  pairs.forEach(([a, b]) => (cnt[C.rawOf(a, b)] = (cnt[C.rawOf(a, b)] || 0) + 1));
  const max = Math.max(...Object.values(cnt));
  assert.ok(max / pairs.length <= 0.03, `${((max / pairs.length) * 100).toFixed(2)}%`);
});

test("쏠림 기준 2: 10점 구간(40대~90대) 각각 12~22%", () => {
  const bins = [0, 0, 0, 0, 0, 0];
  pairs.forEach(([a, b]) => bins[Math.floor(C.match(a, b).score / 10) - 4]++);
  bins.forEach((n, i) => assert.ok(n / pairs.length >= 0.12 && n / pairs.length <= 0.22, `${40 + i * 10}대 ${((n / pairs.length) * 100).toFixed(1)}%`));
});

test("쏠림 기준 3: 코드마다 64개 상대 점수 폭 ≥ 35", () => {
  for (const a of C.CODES) {
    const s = C.CODES.map((b) => C.match(a, b).score);
    assert.ok(Math.max(...s) - Math.min(...s) >= 35, `${a.main}/${a.sub} 폭 ${Math.max(...s) - Math.min(...s)}`);
  }
});

test("쏠림 기준 4: 주 원형이 같고 보조만 다른 두 코드의 점수 줄이 완전히 같은 경우 0/224", () => {
  let same = 0, total = 0;
  for (const m of C.ARCH)
    for (let i = 0; i < 8; i++)
      for (let j = i + 1; j < 8; j++) {
        total++;
        const a = { main: m, sub: C.ARCH[i] }, b = { main: m, sub: C.ARCH[j] };
        if (C.CODES.every((o) => C.match(a, o).score === C.match(b, o).score)) same++;
      }
  assert.strictEqual(total, 224);
  assert.strictEqual(same, 0);
});

test("쏠림 기준 5: 다섯 축 각각이 '가장 높은 축'인 쌍 ≥ 8%", () => {
  const tops = [0, 0, 0, 0, 0];
  pairs.forEach(([a, b]) => tops[C.match(a, b).top]++);
  tops.forEach((n, k) => assert.ok(n / pairs.length >= 0.08, `${C.AXES[k]} ${((n / pairs.length) * 100).toFixed(1)}%`));
});

test("주·보조 원형: 2위 없으면 보조 = 주, 동점이면 앞선 장", () => {
  assert.deepStrictEqual(C.archPair(Array(7).fill("sage")), { main: "sage", sub: "sage" });
  assert.deepStrictEqual(C.archPair(["rebel", "sage", "sage", "rebel", "lover", "lover", "ruler"]), { main: "rebel", sub: "sage" });
  assert.strictEqual(C.archPair([]), null);
});

// 배치: 무작위 30명 × 시드 1~20 (주인·친구 코드는 64개 중 무작위)
function sample(seed, n = 30) {
  const rnd = mulberry32(seed);
  const pick = () => C.CODES[Math.floor(rnd() * N)];
  const owner = pick();
  const items = [];
  for (let i = 0; i < n; i++) {
    const f = pick();
    const m = C.match(owner, f);
    items.push({ rid: `s${seed}f${i}x${Math.floor(rnd() * 1e9).toString(36)}`, joined: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}`, score: m.score, top: m.top });
  }
  return items;
}
const stackedOf = (placed) => placed.filter((p, i) => placed.some((q, j) => j < i && Math.hypot(p.x - q.x, p.y - q.y) < C.GEO.d)).length;

test("배치: 시드 1~20 × 30명 — 겹친 채 ≤ 3, 오각형 밖 0, 거리 순서 뒤집힘 0, 결정적", () => {
  let total = 0, worst = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const items = sample(seed);
    const placed = C.place(items);
    assert.deepStrictEqual(C.place(items.slice().reverse()), placed, "입력 순서와 무관하게 같은 그림");
    const st = stackedOf(placed);
    total += st;
    worst = Math.max(worst, st);
    assert.ok(st <= 3, `시드 ${seed} 겹침 ${st}`);
    placed.forEach((p) => assert.ok(C.insidePentagon(p, C.GEO.d), `시드 ${seed} 오각형 밖 ${p.rid}`));
    for (let i = 1; i < placed.length; i++) assert.ok(placed[i].r >= placed[i - 1].r - 1e-9, `시드 ${seed} 거리 순서 뒤집힘 ${i}`);
    for (let i = 1; i < placed.length; i++) assert.ok(placed[i].score <= placed[i - 1].score, "순위 = 점수 높은 순");
  }
  console.log(`  배치 측정: 겹친 채 합계 ${total}/600, 시드당 최악 ${worst}`);
});

test("배치: 같은 코드 친구 10명 이상(같은 점수)이면 겹침이 생겨도 모두 오각형 안", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ rid: `same${i}`, joined: "2026-10-17", score: 99, top: 2 }));
  const placed = C.place(items);
  placed.forEach((p) => assert.ok(C.insidePentagon(p, C.GEO.d)));
  assert.strictEqual(placed.length, 30);
});

test("별명 검사: 실명·이름 포함·성 뺀 이름·생일 숫자·전화·주소·길이", () => {
  const ctx = { name: "김민지", birth: { y: 1995, m: 3, d: 25 } };
  assert.strictEqual(C.nickProblem("김민지", ctx), "name");
  assert.strictEqual(C.nickProblem("김 민-지짱", ctx), "name");
  assert.strictEqual(C.nickProblem("민지", ctx), "name");
  assert.strictEqual(C.nickProblem("별민지별", ctx), "name");
  assert.strictEqual(C.nickProblem("별0325", ctx), "birth");
  assert.strictEqual(C.nickProblem("토끼325", ctx), "birth");
  assert.strictEqual(C.nickProblem("1995곰", ctx), "birth");
  assert.strictEqual(C.nickProblem("폰0101234", {}), "phone");
  assert.strictEqual(C.nickProblem("www곰", {}), "link");
  assert.strictEqual(C.nickProblem("a<b", {}), "char");
  assert.strictEqual(C.nickProblem("아홉글자별명입니다", {}), "length");
  assert.strictEqual(C.nickProblem("   ", {}), "length");
  assert.strictEqual(C.nickProblem("별빛토끼", ctx), null);
  assert.strictEqual(C.nickProblem("민", ctx), null);
  assert.strictEqual(C.nickProblem("별빛토끼", {}), null);
});

test("만 나이 · 생년월일 읽기 · 키 표준형", () => {
  const today = new Date(2026, 9, 17);
  assert.strictEqual(C.ageOf({ y: 2012, m: 10, d: 17 }, today), 14);
  assert.strictEqual(C.ageOf({ y: 2012, m: 10, d: 18 }, today), 13);
  assert.deepStrictEqual(C.parseBirth("1995.03.21"), { y: 1995, m: 3, d: 21 });
  assert.deepStrictEqual(C.parseBirth("19950321"), { y: 1995, m: 3, d: 21 });
  assert.strictEqual(C.parseBirth("1995.02.30"), null);
  const k = "SOM-7Q4M-2XD9-FHAT-K3PW-9RNE-B6Z0-AA";
  const c = C.canon(k, "SOM");
  assert.ok(c && c.length === 26);
  assert.strictEqual(C.canon(k.toLowerCase().replace(/0/g, "o"), "SOM"), c);
  assert.strictEqual(C.canon("SOP-1234", "SOM"), null);
  assert.strictEqual(C.prefixOf(" sop-…"), "SOP");
});
