// 14단계 F4-B1 단위 시험: SOG2/SOG1 왕복·legacy·순서 거부·성별 없음, 원형 분포(1,000명), 만신 결과 조합 빈칸 0·분량.
// 실행: node --test "tools/strange-oracle/*.test.js"
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const PROD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
const PayCode = require(path.join(PROD, "paycode.js"));
const Saju = require(path.join(PROD, "saju.js"));
Saju.useLibrary(require("./vendor/lunar.js"));
const R = PayCode.Resume;
const W = {};
for (const f of ["data-saju.js", "data-ogham.js", "data-stars.js", "data-decans.js", "data-tzolkin.js", "data-runes.js", "data-oracles.js"]) vm.runInNewContext(fs.readFileSync(path.join(PROD, f), "utf8"), { window: W });
// 결정적 난수 (시험 재현용)
let seed = 20261015;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (n) => Math.floor(rnd() * n);
const ORDER = PayCode.CHAPTER_ORDER;
function randomCodes(n, legacy) {
  const order = legacy ? PayCode.LEGACY_ORDER : ORDER;
  const c = { saju: null, ogham: null, star: null, decan: null, tzolkin: null, rune: null, sibyl: null, runeTopic: null, sibylTopic: null };
  for (const room of order.slice(0, n)) {
    if (room === "saju") c.saju = 1 + pick(5000);
    if (room === "ogham") c.ogham = pick(20);
    if (room === "star") c.star = pick(27);
    if (room === "decan") c.decan = pick(36);
    if (room === "tzolkin") c.tzolkin = { number: 1 + pick(13), sign: pick(20) };
    if (room === "rune") {
      const a = pick(24), b = (a + 1 + pick(23)) % 24;
      let x = pick(24);
      while (x === a || x === b) x = (x + 1) % 24;
      c.rune = [a, b, x];
      c.runeTopic = R.RUNE_TOPICS[pick(4)];
    }
    if (room === "sibyl") {
      c.sibyl = pick(32);
      c.sibylTopic = R.SIBYL_TOPICS[pick(5)];
    }
  }
  return c;
}

test("CHAPTER_ORDER = 만신 → 오검 → 별 → 데칸 → 촐킨 → 룬 → 시빌라", () => {
  assert.deepStrictEqual([...ORDER], ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]);
});

test("SOG2: 새 상태 1~7방 왕복 (17자, 같은 결과면 같은 코드)", () => {
  for (let n = 1; n <= 7; n++)
    for (let k = 0; k < 50; k++) {
      const c = randomCodes(n, false);
      const code = R.encode(c);
      assert.match(code, /^SOG2[0-9A-Z]{13}$/);
      assert.strictEqual(code.length, 17);
      assert.deepStrictEqual(R.decode(code).codes, c);
      assert.strictEqual(R.encode(c), code);
    }
});

test("SOG2: 옛 상태(saju=0 + 오검부터) 1~6방 왕복", () => {
  for (let n = 1; n <= 6; n++) {
    const c = randomCodes(n, true);
    assert.deepStrictEqual(R.decode(R.encode(c)).codes, c);
  }
});

test("SOG2: 순서 어긋남 거부 (만신+오검 빠짐+별 / 만신 없음+오검 빠짐+별)", () => {
  assert.throws(() => R.encode({ saju: 5, star: 1 }));
  assert.throws(() => R.encode({ star: 1 }));
  assert.throws(() => R.encode({ saju: 5, ogham: 1, decan: 3 }));
});

test("SOG1: 옛 코드 해독 → 만신 없음, 옛 순서만 받음", () => {
  const A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const mk = (d) => {
    let n = 0n;
    for (const [name, radix] of R.LEGACY.FIELDS) n = n * BigInt(radix) + BigInt(d[name] || 0);
    let p = "";
    for (let i = 0; i < 10; i++) { p = A[Number(n % 32n)] + p; n /= 32n; }
    let s = 0;
    for (let i = 0; i < p.length; i++) s += (2 * i + 1) * A.indexOf(p[i]);
    return "SOG1" + p + A[s % 32];
  };
  const ok = R.decode(mk({ ogham: 3, star: 5, decan: 7 }));
  assert.strictEqual(ok.codes.saju, null);
  assert.deepStrictEqual([ok.codes.ogham, ok.codes.star, ok.codes.decan], [2, 4, 6]);
  assert.strictEqual(R.decode(mk({ ogham: 3, decan: 7 })).error, "order"); // 오검 + 별 빠짐 + 데칸
  assert.strictEqual(R.decode(mk({ star: 2 })).error, "order");
  const good = mk({ ogham: 3, star: 5 });
  assert.strictEqual(R.decode(good.slice(0, 14) + (good[14] === "0" ? "1" : "0")).error, "shape");
});

test("이어가기 코드에 성별·대운이 없다: 성별만 다른 세 사람의 코드가 같다", () => {
  const codes = ["male", "female", "none"].map((gender) => {
    const c = Saju.compute({ y: 1990, m: 7, d: 14, time: { h: 9, mi: 5 }, gender });
    return R.encode({ saju: c.code });
  });
  assert.strictEqual(new Set(codes).size, 1);
  assert.ok(!Object.keys(R.decode(codes[0]).codes).some((k) => /gender|daewoon|direction/.test(k)));
});

// 원형: 일곱 방 태그 최빈값, 동률이면 앞 방 (app.js currentArchetype과 같은 규칙)
function archetypeOf(tags) {
  const t = {};
  tags.forEach((a, i) => { if (!a) return; (t[a] = t[a] || { n: 0, first: i }).n++; });
  return Object.entries(t).sort((x, y) => y[1].n - x[1].n || x[1].first - y[1].first)[0][0];
}
test("원형 분포 1,000명 (1/7·2/7·7/7) — tests.md 기록용, 25% 넘는 원형은 planner 보고(실패 아님)", () => {
  const D = { "1/7": {}, "2/7": {}, "7/7": {} };
  for (let i = 0; i < 1000; i++) {
    const y = 1950 + pick(60), m = 1 + pick(12), d = 1 + pick(28);
    const known = rnd() < 0.7;
    const c = Saju.compute({ y, m, d, time: known ? { h: pick(24), mi: pick(60) } : null, gender: "none" });
    const tags = [
      W.SAJU.stems[c.dayStem].archetype,
      W.OGHAM[pick(20)].archetype, W.NAKSHATRAS[pick(27)].archetype, W.DECANS[pick(36)].archetype,
      W.TZOLKIN_SIGNS[pick(20)].archetype, W.RUNES[pick(24)].archetype, W.ORACLES[pick(32)].archetype,
    ];
    for (const [k, n] of [["1/7", 1], ["2/7", 2], ["7/7", 7]]) {
      const a = archetypeOf(tags.slice(0, n));
      D[k][a] = (D[k][a] || 0) + 1;
    }
  }
  const lines = Object.entries(D).map(([k, v]) => k + " " + Object.entries(v).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${(n / 10).toFixed(1)}%`).join(", "));
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", "saju-archetype-dist.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  assert.strictEqual(Object.values(D["7/7"]).reduce((a, b) => a + b, 0), 1000);
});

test("만신 결과 조합 전부: 빈칸·undefined·{자리} 0, 결정적, 분량 기록", () => {
  const S = W.SAJU;
  const GK = { bigeop: "bigyeop", siksang: "siksang", jaeseong: "jaeseong", gwanseong: "gwanseong", inseong: "inseong" };
  const R2 = S.text.result;
  const strip = (h) => String(h).replace(/<[^>]*>/g, "");
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  let n = 0, min = 1e9, max = 0, bad = [];
  for (let s1 = 0; s1 < 10; s1++)
    for (const many of Saju.ELEMENTS)
      for (const few of Saju.ELEMENTS) {
        if (few === many) continue; // 많은 오행과 적은 오행이 같을 수 없음
        for (const kind of ["few", "empty"])
          for (const g of Saju.GROUPS)
            for (const dw of ["forward", "backward", null])
              for (const timeKnown of [true, false]) {
                const st = S.stems[s1];
                const parts = [st.title, st.key, ...st.body, S.elements.many[many], S.elements[kind][few], S.groups[GK[g]].text,
                  dw ? fill(S.daeun[dw], { age: fill(timeKnown ? R2.daeunAge : R2.daeunAgeApprox, { n: 4 }) }) : R2.daeunNone, st.gongsu, st.archetypeWhy];
                const text = parts.map(strip).join("\n");
                if (parts.some((p) => !p) || /undefined|NaN|\{\w+\}/.test(text)) bad.push(`${s1}/${many}/${few}/${kind}/${g}/${dw}`);
                const len = [...st.body, ...parts.slice(2 + st.body.length, 2 + st.body.length + 5)].map(strip).join("").length; // S1~S5 본문
                min = Math.min(min, len);
                max = Math.max(max, len);
                n++;
              }
      }
  const line = `조합 ${n}개 (일간 10 × 많은 5 × 적은 4(같은 오행 제외) × 비어 있음 2 × 우세 5 × 대운 3 × 시각 2), S1~S5 본문 ${min}~${max}자`;
  fs.writeFileSync(path.join(__dirname, "out", "saju-combos.txt"), line + "\n");
  console.log(line);
  assert.deepStrictEqual(bad.slice(0, 5), []);
  assert.strictEqual(n, 10 * 5 * 4 * 2 * 5 * 3 * 2);
});
