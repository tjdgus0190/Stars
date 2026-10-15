// 14단계 F4-A 단위 시험: 만신의 방 만세력 계산(products/strange-oracle/saju.js) 대조·경계 (기획서 14-1 검증 1~6, 14-7의 3)
// 대조값은 saju-ref.json(수집 날짜·출처 적힘)만 읽는다. 시험 중 외부 요청 없음.
// 라이브러리는 jsdelivr와 같은 파일 vendor/lunar.js(배포하지 않음)를 쓰고, SRI 해시가 같은지 먼저 본다.
// 실행: node --test "tools/strange-oracle/*.test.js"   기록: out/saju-report.txt
"use strict";
const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
const S = require(path.join(PROD, "saju.js"));
const VENDOR = path.join(__dirname, "vendor", "lunar.js");
const L = S.useLibrary(require(VENDOR));
const REF = require("./saju-ref.json");
const REPORT = [];
const log = (s) => REPORT.push(s);
const MIN = 60000;

const JIE = { 小寒: "소한", XIAO_HAN: "소한", 立春: "입춘", LI_CHUN: "입춘", 惊蛰: "경칩", 清明: "청명", 立夏: "입하", 芒种: "망종", 小暑: "소서", 立秋: "입추", 白露: "백로", 寒露: "한로", 立冬: "입동", 大雪: "대설", DA_XUE: "대설" };
const JIE_ORDER = ["소한", "입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설"];
const JIE_BRANCH = { 소한: "丑", 입춘: "寅", 경칩: "卯", 청명: "辰", 입하: "巳", 망종: "午", 소서: "未", 입추: "申", 백로: "酉", 한로: "戌", 입동: "亥", 대설: "子" };
const p2 = (n) => String(n).padStart(2, "0");

// 라이브러리 절기표에서 그해 12절의 UTC 시각 (라이브러리 시각은 UTC+8)
function jieOfYear(y) {
  const out = {};
  for (const mm of [3, 10]) {
    const tb = L.Solar.fromYmd(y, mm, 1).getLunar().getJieQiTable();
    for (const k in tb) {
      const s = tb[k];
      if (!JIE[k] || s.getYear() !== y) continue;
      out[JIE[k]] = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - 8 * 60 * MIN;
    }
  }
  assert.strictEqual(Object.keys(out).length, 12, "12절 " + y);
  return out;
}
// UTC → 한국 시계(그 시각의 법정 시간대)
function toClock(utc) {
  const t = new Date(utc + S.krOffsetAt(utc) * MIN);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
}
const fmt = (c) => `${c.y}-${p2(c.m)}-${p2(c.d)} ${p2(c.h)}:${p2(c.mi)}${c.s !== undefined ? ":" + p2(c.s) : ""}`;
const at = (c, gender = "none") => S.compute({ y: c.y, m: c.m, d: c.d, time: { h: c.h, mi: c.mi }, gender });

test("0. vendor/lunar.js = SRI 해시 (jsdelivr lunar-javascript@1.7.7)", () => {
  const h = "sha384-" + crypto.createHash("sha384").update(fs.readFileSync(VENDOR)).digest("base64");
  assert.strictEqual(h, S.LUNAR_SRI);
  assert.ok(S.LUNAR_URL.endsWith("lunar-javascript@1.7.7/lunar.js"));
});

test("1. 일진 120일 = 한국천문연구원 음양력 정보", () => {
  assert.strictEqual(REF.iljin.length, 120);
  const bad = [];
  for (const r of REF.iljin) {
    const [y, m, d] = r.date.split("-").map(Number);
    for (const time of [null, { h: 12, mi: 0 }]) {
      const got = S.compute({ y, m, d, time, gender: "none" }).pillars.day.hanja;
      if (got !== r.iljin) bad.push(`${r.date} ${time ? "12:00" : "모름"} 천문연 ${r.iljin} 계산 ${got}`);
    }
  }
  log(`[1] 일진 대조 120일(시각 모름·정오 두 번씩) 불일치 ${bad.length}`);
  assert.deepStrictEqual(bad, []);
});

test("2. 절입 시각: 라이브러리(UTC로 바꾼 값) vs 대조값, 2분 이하", () => {
  const rows = [];
  let compared = 0, maxDiff = 0;
  for (let y = 1950; y <= 2030; y += 10) {
    const lib = jieOfYear(y);
    const ref = REF.jie[y];
    for (const n of JIE_ORDER) {
      const c = toClock(lib[n]);
      if (!ref || !ref[n]) { rows.push(`${y} ${n} 라이브러리(한국 시계) ${fmt(c)} | 대조값 없음`); continue; }
      const [dd, hm] = ref[n].split(" ");
      const [ry, rm, rd] = dd.split("-").map(Number), [rh, rmi] = hm.split(":").map(Number);
      const refUtc = S.clockToUtc(ry, rm, rd, rh, rmi);
      const diff = (lib[n] - refUtc) / MIN; // 대조값은 분 단위
      compared++;
      maxDiff = Math.max(maxDiff, Math.abs(diff));
      rows.push(`${y} ${n} 라이브러리 ${fmt(c)} | 대조 ${ref[n]} | 차이 ${diff.toFixed(2)}분`);
      assert.ok(Math.abs(diff) <= 2, `${y} ${n} 차이 ${diff}`);
    }
  }
  // 서머타임·UTC+8:30 기간의 해: 입춘 + 망종 (대조값은 모두 없음 → 라이브러리 값만 기록)
  for (const y of [1948, 1949, 1950, 1951, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1987, 1988]) {
    const lib = jieOfYear(y);
    for (const n of ["입춘", "망종"]) rows.push(`${y} ${n} 라이브러리 ${fmt(toClock(lib[n]))} (UTC+${S.krOffsetAt(lib[n]) / 60}) | 대조값 없음`);
  }
  log(`[2] 절입 대조 ${compared}개, 최대 차이 ${maxDiff.toFixed(2)}분\n` + rows.join("\n"));
  assert.strictEqual(compared, 48);
});

test("3. 경계: 절입 1분 전·뒤 출생의 월주(입춘이면 년주도)가 바뀐다", () => {
  let n = 0;
  const years = [];
  for (let y = 1950; y <= 2030; y += 10) years.push([y, JIE_ORDER]);
  for (const y of [1948, 1949, 1950, 1951, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1987, 1988]) years.push([y, ["입춘", "망종"]]);
  for (const [y, names] of years) {
    const lib = jieOfYear(y);
    for (const name of names) {
      const floorMin = Math.floor(lib[name] / MIN) * MIN;
      const before = at(toClock(floorMin - MIN)), after = at(toClock(floorMin + MIN));
      assert.notStrictEqual(before.pillars.month.hanja, after.pillars.month.hanja, `${y} ${name} 월주`);
      assert.strictEqual(after.pillars.month.hanja[1], JIE_BRANCH[name], `${y} ${name} 월지`);
      if (name === "입춘") {
        assert.notStrictEqual(before.pillars.year.hanja, after.pillars.year.hanja, `${y} 입춘 년주`);
        const yi = (((y - 4) % 60) + 60) % 60;
        assert.strictEqual(after.pillars.year.hanja, S.STEMS[yi % 10] + S.BRANCHES[yi % 12]);
      } else {
        assert.strictEqual(before.pillars.year.hanja, after.pillars.year.hanja, `${y} ${name} 년주 그대로`);
      }
      n++;
    }
  }
  log(`[3] 경계 표본 ${n}개 절 × 앞뒤 2명 = ${n * 2}명, 불일치 0`);
  assert.strictEqual(n, 108 + 28);
});

test("4. 시주: 오서둔 10행과 한국 시계 경계 7개", () => {
  const ZI_STEM = { 甲: "甲", 己: "甲", 乙: "丙", 庚: "丙", 丙: "戊", 辛: "戊", 丁: "庚", 壬: "庚", 戊: "壬", 癸: "壬" }; // 손 계산 표
  const seen = new Set();
  for (let d = 1; d <= 10; d++) {
    // 한국 시계 01:00 = 지방시 00:30 (조자시, 그날)
    const r = at({ y: 2024, m: 3, d, h: 1, mi: 0 });
    const ds = r.pillars.day.hanja[0];
    seen.add(ds);
    assert.strictEqual(r.pillars.hour.hanja, ZI_STEM[ds] + "子", "子시 " + ds);
    for (let k = 0; k < 12; k++) { // 같은 날 12시진: 천간이 子시부터 하나씩
      const lmtH = (2 * k) % 24; // 지방시 0,2,4…22시 → 한국 시계 +30분
      const rr = at({ y: 2024, m: 3, d, h: lmtH, mi: 30 + 1 }); // 지방시 lmtH:01
      const si = (S.STEMS.indexOf(ZI_STEM[ds]) + k) % 10;
      if (k === 0) continue; // 한국 0:31 = 지방시 0:01, 위에서 봄
      assert.strictEqual(rr.pillars.hour.hanja, S.STEMS[si] + S.BRANCHES[k], `${ds} ${k}`);
    }
  }
  assert.strictEqual(seen.size, 10);
  // 기대값은 처리 순서 4·5와 라이브러리 규칙(야자시 천간 = 다음 날 일간 기준)으로 미리 적은 값 (tests.md와 같음)
  // 2024-03-09 일진 壬申, 03-10 癸酉, 03-11 甲戌
  const EXP = [
    ["23:29", "癸酉", "癸亥"], ["23:30", "癸酉", "甲子"], ["00:00", "壬申", "壬子"], ["00:29", "壬申", "壬子"],
    ["00:30", "癸酉", "壬子"], ["01:29", "癸酉", "壬子"], ["01:30", "癸酉", "癸丑"],
  ];
  for (const [hm, day, hour] of EXP) {
    const [h, mi] = hm.split(":").map(Number);
    const r = at({ y: 2024, m: 3, d: 10, h, mi });
    assert.strictEqual(r.pillars.day.hanja + r.pillars.hour.hanja, day + hour, hm);
  }
  log(`[4] 오서둔 10행 × 12시진 + 한국 시계 경계 7개 불일치 0`);
});

test("5. 대운: 방향 4조합 + 대운수 10개 (절입까지 날수 ÷ 3)", () => {
  // 방향 4조합: 1984 甲子(양), 1985 乙丑(음)
  const dir = (y, g) => S.compute({ y, m: 7, d: 1, time: { h: 12, mi: 0 }, gender: g }).daewoon.direction;
  assert.strictEqual(dir(1984, "male"), "forward");
  assert.strictEqual(dir(1984, "female"), "backward");
  assert.strictEqual(dir(1985, "male"), "backward");
  assert.strictEqual(dir(1985, "female"), "forward");
  const rows = [];
  const samples = [[1950, 3, 20, 8, 0, "male"], [1958, 7, 1, 10, 0, "female"], [1966, 9, 15, 3, 10, "male"], [1975, 12, 25, 18, 0, "female"], [1983, 2, 1, 6, 30, "male"],
    [1987, 6, 1, 12, 0, "female"], [1994, 4, 10, 21, 45, "male"], [2001, 11, 7, 9, 0, "female"], [2012, 8, 20, 14, 5, "male"], [2023, 1, 30, 23, 50, "female"]];
  for (const [y, m, d, h, mi, g] of samples) {
    const r = S.compute({ y, m, d, time: { h, mi }, gender: g });
    // 손 계산: 그해·앞뒤 해 절입 목록에서 출생 직후(순행)·직전(역행) 절을 찾는다
    const birth = S.clockToUtc(y, m, d, h, mi);
    const all = [y - 1, y, y + 1].flatMap((yy) => Object.values(jieOfYear(yy))).sort((a, b) => a - b);
    const yang = S.STEMS.indexOf(r.pillars.year.hanja[0]) % 2 === 0;
    const fwd = (yang && g === "male") || (!yang && g === "female");
    const target = fwd ? all.find((t) => t > birth) : all.filter((t) => t <= birth).pop();
    const days = Math.abs(target - birth) / 86400000;
    const age = Math.min(10, Math.max(1, Math.round(days / 3)));
    assert.strictEqual(r.daewoon.direction, fwd ? "forward" : "backward");
    assert.strictEqual(r.daewoon.startAge, age, `${y}-${m}-${d}`);
    rows.push(`${y}-${p2(m)}-${p2(d)} ${p2(h)}:${p2(mi)} ${g === "male" ? "남" : "여"} 연간 ${r.pillars.year.hanja[0]}(${yang ? "양" : "음"}) ${fwd ? "순행" : "역행"} 절 ${r.daewoon.jie} 날수 ${days.toFixed(2)} ÷3 = ${(days / 3).toFixed(2)} → ${age}세`);
  }
  assert.strictEqual(S.compute({ y: 1990, m: 1, d: 1, time: null, gender: "none" }).daewoon, null);
  log("[5] 대운 방향 4조합 통과, 대운수 표본\n" + rows.join("\n"));
});

test("6. 서머타임·UTC+8:30: 1단계 변환이 tzdb(Intl)와 같고, 지방시는 두 번 보정되지 않는다", () => {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", timeZoneName: "longOffset" });
  const intlOff = (u) => { const v = f.formatToParts(new Date(u)).find((p) => p.type === "timeZoneName").value.match(/([+-])(\d\d):(\d\d)/); return (v[1] === "-" ? -1 : 1) * (+v[2] * 60 + +v[3]); };
  for (let u = Date.UTC(1930, 0, 1); u < Date.UTC(2031, 0, 1); u += 86400000 / 2) assert.strictEqual(S.krOffsetAt(u), intlOff(u), new Date(u).toISOString());
  for (const [t] of S.KR_OFFSETS) for (const e of [-MIN, 0, MIN]) assert.strictEqual(S.krOffsetAt(t + e), intlOff(t + e));
  // 기간마다 시작 날·중간·끝 날 (한국 시계 12:00) → 지방시 = 시계 − (법정 차이 − 8:30)
  const periods = [
    ["1948 서머타임", [1948, 6, 1], [1948, 7, 20], [1948, 9, 12], 600],
    ["1949 서머타임", [1949, 4, 3], [1949, 6, 30], [1949, 9, 10], 600],
    ["1950 서머타임", [1950, 4, 1], [1950, 6, 30], [1950, 9, 9], 600],
    ["1951 서머타임", [1951, 5, 6], [1951, 7, 20], [1951, 9, 8], 600],
    ["UTC+8:30", [1954, 3, 21], [1958, 1, 15], [1961, 8, 9], 510],
    ["1955 서머타임", [1955, 5, 5], [1955, 7, 1], [1955, 9, 8], 570],
    ["1956 서머타임", [1956, 5, 20], [1956, 7, 20], [1956, 9, 29], 570],
    ["1957 서머타임", [1957, 5, 5], [1957, 7, 20], [1957, 9, 21], 570],
    ["1958 서머타임", [1958, 5, 4], [1958, 7, 20], [1958, 9, 20], 570],
    ["1959 서머타임", [1959, 5, 3], [1959, 7, 20], [1959, 9, 19], 570],
    ["1960 서머타임", [1960, 5, 1], [1960, 7, 20], [1960, 9, 17], 570],
    ["1987 서머타임", [1987, 5, 10], [1987, 7, 20], [1987, 10, 10], 600],
    ["1988 서머타임", [1988, 5, 8], [1988, 7, 20], [1988, 10, 8], 600],
  ];
  const rows = [];
  for (const [name, ...rest] of periods) {
    const off = rest.pop();
    for (const [y, m, d] of rest) {
      const u = S.clockToUtc(y, m, d, 12, 0);
      assert.strictEqual(u, Date.UTC(y, m - 1, d, 12, 0) - off * MIN, `${name} ${y}-${m}-${d}`);
      const lmt = S.dayHourAt(u, true).lmt;
      const expectMin = 12 * 60 - (off - 510);
      assert.strictEqual(lmt.h * 60 + lmt.mi, expectMin, `${name} 지방시`);
      if (off === 510) assert.strictEqual(lmt.h * 60 + lmt.mi, 12 * 60, "UTC+8:30 기간: 시계 = 지방시(두 번 보정 없음)");
    }
    rows.push(`${name}: 시계 12:00 → UTC+${off / 60} → 지방시 ${p2(Math.floor((720 - (off - 510)) / 60))}:${p2((720 - (off - 510)) % 60)} (3표본)`);
  }
  // 없는 시각·두 번 있는 시각
  assert.strictEqual(S.clockToUtc(1987, 5, 10, 2, 30), Date.UTC(1987, 4, 10, 2, 30) - 540 * MIN);
  assert.strictEqual(S.clockToUtc(1987, 10, 11, 2, 30), Date.UTC(1987, 9, 11, 2, 30) - 600 * MIN);
  log("[6] 시간대 표 = tzdb(1930~2030, 12시간 간격 + 전환점 ±1분)\n" + rows.join("\n"));
});

test("7. 경우별 플래그: 시각 모름·절입일·밝히지 않음·00:00~00:29", () => {
  const u = S.compute({ y: 1995, m: 8, d: 20, time: null, gender: "female" });
  assert.strictEqual(u.pillars.hour, null);
  assert.strictEqual(u.charCount, 6);
  assert.strictEqual(Object.values(u.elements).reduce((a, b) => a + b), 6);
  assert.strictEqual(Object.values(u.groups).reduce((a, b) => a + b), 5);
  assert.strictEqual(u.flags.timeUnknown, true);
  assert.strictEqual(u.flags.jieDay, null);
  assert.strictEqual(u.daewoon.approx, true);
  // 절입일 + 시각 모름: 2020-03-05 경칩(한국 시계 11:57) → 월주 절입 전, 다른 값 안내
  const j = S.compute({ y: 2020, m: 3, d: 5, time: null, gender: "none" });
  assert.strictEqual(j.flags.jieDay.month.before.hanja, j.pillars.month.hanja);
  assert.strictEqual(j.pillars.month.hanja, "戊寅");
  assert.strictEqual(j.flags.jieDay.month.after.hanja, "己卯");
  assert.strictEqual(j.flags.jieDay.year, null);
  // 입춘일: 년주도
  const lc = S.compute({ y: 2020, m: 2, d: 4, time: null, gender: "none" });
  assert.strictEqual(lc.pillars.year.hanja, "己亥");
  assert.strictEqual(lc.flags.jieDay.year.after.hanja, "庚子");
  assert.strictEqual(lc.daewoon, null);
  assert.strictEqual(lc.flags.genderGiven, false);
  // 00:00~00:29는 일주 전날
  for (const mi of [0, 15, 29]) {
    const r = at({ y: 2000, m: 1, d: 1, h: 0, mi });
    assert.strictEqual(r.pillars.day.hanja, "丁巳"); // 1999-12-31 천문연 일진
  }
  assert.strictEqual(at({ y: 2000, m: 1, d: 1, h: 0, mi: 30 }).pillars.day.hanja, "戊午");
  // 결정적, 코드 왕복
  const a = JSON.stringify(at({ y: 1977, m: 4, d: 5, h: 9, mi: 9 }, "male")), b = JSON.stringify(at({ y: 1977, m: 4, d: 5, h: 9, mi: 9 }, "male"));
  assert.strictEqual(a, b);
  for (let n = 1; n <= 5000; n++) assert.strictEqual(S.encodeCode(S.decodeCode(n)), n);
  assert.strictEqual(S.decodeCode(0), null);
  assert.strictEqual(S.decodeCode(5001), null);
  // 성별만 다르면 code는 같다
  const g = ["male", "female", "none"].map((x) => at({ y: 1990, m: 5, d: 15, h: 14, mi: 30 }, x).code);
  assert.ok(g.every((c) => c === g[0]));
});

test("8. 동률 규칙", () => {
  const base = { dayStem: 0, groups: [1, 2, 2, 1, 1], daewoon: null, timeKnown: true };
  // 많은 오행 동률(목·금 2) + 월지 酉(금) → 금
  let s = S.selectModules({ ...base, elements: [2, 1, 1, 2, 2], monthBranch: 9 });
  assert.strictEqual(s.S2a, "metal");
  // 월지 午(화)가 동률 밖 → 목화토금수 순 첫째(목)
  s = S.selectModules({ ...base, elements: [2, 1, 1, 2, 2], monthBranch: 6 });
  assert.strictEqual(s.S2a, "wood");
  assert.deepStrictEqual(s.S2b, { kind: "few", element: "fire" });
  // 비어 있는 오행 동률 → 순서 첫째, empty
  s = S.selectModules({ ...base, elements: [0, 4, 0, 4, 0], monthBranch: 0 });
  assert.deepStrictEqual(s.S2b, { kind: "empty", element: "wood" });
  assert.strictEqual(s.S2a, "fire"); // 월지 子(수)는 동률 밖 → 순서 첫째 화
  // 십신 동률 → 비겁 식상 재성 관성 인성 순
  assert.strictEqual(s.S3, "siksang");
});

test("9. S1~S5 분포 (무작위 생일 1,000명, 결정적 난수)", () => {
  let seed = 20261015;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const cnt = { S1: {}, S2a: {}, S2b: {}, S3: {}, S4: {}, code: new Set() };
  const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
  let tieMany = 0, sameManyFew = 0;
  for (let i = 0; i < 1000; i++) {
    const t0 = Date.UTC(1940, 0, 1), t1 = Date.UTC(2015, 11, 31);
    const dt = new Date(t0 + Math.floor(rnd() * (t1 - t0) / 86400000) * 86400000);
    const known = rnd() < 0.8;
    const g = ["male", "female", "none"][Math.floor(rnd() * 3)];
    const r = S.compute({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), time: known ? { h: Math.floor(rnd() * 24), mi: Math.floor(rnd() * 60) } : null, gender: g });
    const e = Object.values(r.elements);
    if (e.filter((x) => x === Math.max(...e)).length > 1) tieMany++;
    if (r.select.S2a === r.select.S2b.element) sameManyFew++;
    inc(cnt.S1, S.STEM_KO[r.select.S1]); inc(cnt.S2a, r.select.S2a); inc(cnt.S2b, r.select.S2b.kind + ":" + r.select.S2b.element);
    inc(cnt.S3, r.select.S3); inc(cnt.S4, r.select.S4 || "없음"); cnt.code.add(r.code);
  }
  assert.strictEqual(sameManyFew, 0);
  const pct = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / 10).toFixed(1)}%`).join(", ");
  log(`[9] S1~S5 분포 1,000명(1940~2015 고르게, 시각 앎 80%, 성별 3등분, 난수 씨앗 20261015)\n` +
    `S1 일간: ${pct(cnt.S1)}\nS2a 많은 오행: ${pct(cnt.S2a)}\nS2b 적은/비어 있는: ${pct(cnt.S2b)}\nS3 우세 묶음: ${pct(cnt.S3)}\nS4 대운: ${pct(cnt.S4)}\n` +
    `많은 오행 동률 발생 ${(tieMany / 10).toFixed(1)}%, 많은=적은 0건, 서로 다른 code ${cnt.code.size}개 / 5000`);
});

test.after(() => {
  const out = path.join(__dirname, "out", "saju-report.txt");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, REPORT.join("\n\n") + "\n");
});
