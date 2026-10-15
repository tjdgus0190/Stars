// 만신의 방 — 사주 명리 계산 (14단계 14-1). 화면 문구는 없다(문구는 data-saju.js).
//
// 만세력(간지·절기)은 직접 구현하지 않고 오픈소스 라이브러리 lunar-javascript 1.7.7(6tail, MIT)을 쓴다.
//  - 브라우저: loadLunar()가 jsdelivr에서 버전 고정 + SRI로 지연해서 불러온다(14-6). 라이브러리는 window에
//    Solar·Lunar·EightChar 등을 직접 붙인다(네임스페이스 없음).
//  - node 시험: Saju.useLibrary(require("tools/strange-oracle/vendor/lunar.js"))
//
// 라이브러리 원문으로 확인한 것 (tests.md 「14단계 · 만세력 대조」)
//  - 절기 시각은 UTC+8(중국 표준시)이다: ShouXingUtil.qiAccurate 계열이 "TT − ΔT + 1/3일(ONE_THIRD)"로 돌려준다.
//  - 子시 유파: EightChar.setSect(1|2), 기본값 2. sect 2 = 23:00~23:59 일주를 그날로 둔다.
//    시주 천간은 sect와 상관없이 "다음 날 일간" 기준이다(_computeTime이 dayGanIndexExact를 씀).
//
// 시각 처리 순서 (기획서 14-1, 1~8단계)
//  1. 한국 시계 → UTC 절대 시각. 시간대 표 KR_OFFSETS(IANA tzdb 2026c Asia/Seoul 전환점: UTC+9 기본,
//     1954-03-21~1961-08-09 UTC+8:30, 1948~51·1955~60·1987~88 서머타임 +1시간).
//     없는 시각(서머타임 시작 때 건너뛴 시각)은 바뀌기 전 시간대로, 두 번 있는 시각은 앞의 것(서머타임)으로 본다.
//  2. 년주·월주 = 절대 시각 비교. 출생 UTC를 UTC+8 시각으로 바꿔 라이브러리에 넣어, 라이브러리의
//     UTC+8 절입 시각과 같은 기준에서 비교한다(초 단위). 입춘 기준 연도 변경, 절(節) 기준 월 변경. 경도 보정 없음.
//  3. 일주·시주 = 지방시(UTC + 8시간 30분). UTC에서 바로 구하므로 1954~61년에도 두 번 보정되지 않는다.
//  4. 시 경계는 지방시 정시: 子 23:00~00:59, 丑 01:00~02:59 … (한국 시계 UTC+9로는 子 23:30~01:29)
//  5. 지방시 23시대(야자시)는 일주 그날, 00시대(조자시)는 새 날 → 한국 시계 00:00~00:29 출생은 일주가 전날, 시는 子.
//  6. 라이브러리 sect 2. 야자시 시주 천간은 라이브러리 규칙(다음 날 일간 기준, 오서둔).
//  7. 시각 모름: 삼주만. 한국 시계 그날 안에 절입이 있으면(절입일) 월주(입춘이면 년주도)는 절입 전 기준,
//     절입 뒤 값을 flags.jieDay에 함께 돌려준다. 그 밖에는 한국 시계 정오로 계산한다.
//  8. "이 방의 기준" 문구는 data-saju.js(화면). 대조 기관 이름은 화면에 쓰지 않는다.
(function (root) {
  "use strict";

  const LUNAR_URL = "https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/lunar.js";
  const LUNAR_SRI = "sha384-CkiJVUh8zHLFNZYeiszeRw7KEWYDIf1yIZ+jVnZt+omUzQLv2ilCE94w1VItn8uH";

  const STEMS = "甲乙丙丁戊己庚辛壬癸";
  const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  const STEM_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const BRANCH_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const ELEMENTS = ["wood", "fire", "earth", "metal", "water"]; // 목·화·토·금·수 (동률 순서도 이 순서)
  const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  const GROUPS = ["bigeop", "siksang", "jaeseong", "gwanseong", "inseong"]; // 비겁·식상·재성·관성·인성 (동률 순서)
  // 일간 → 원형 태그 [기획서 기본값, copywriter가 바꿀 수 있음]
  const ARCHETYPE_BY_STEM = ["ruler", "lover", "explorer", "creator", "ruler", "caregiver", "warrior", "rebel", "explorer", "sage"];

  // 한국 법정 시간대: [이 UTC 시각부터, UTC와의 차이(분)]. 첫 항목 이전은 UTC+9.
  // 출처: IANA tz database 2026c(Node 24.21 ICU 78.3) Asia/Seoul 1925~2030 전환점 전부.
  const KR_OFFSETS = [
    ["1948-05-31T15:00Z", 600], ["1948-09-12T14:00Z", 540],
    ["1949-04-02T15:00Z", 600], ["1949-09-10T14:00Z", 540],
    ["1950-03-31T15:00Z", 600], ["1950-09-09T14:00Z", 540],
    ["1951-05-05T15:00Z", 600], ["1951-09-08T14:00Z", 540],
    ["1954-03-20T15:00Z", 510],
    ["1955-05-04T15:30Z", 570], ["1955-09-08T14:30Z", 510],
    ["1956-05-19T15:30Z", 570], ["1956-09-29T14:30Z", 510],
    ["1957-05-04T15:30Z", 570], ["1957-09-21T14:30Z", 510],
    ["1958-05-03T15:30Z", 570], ["1958-09-20T14:30Z", 510],
    ["1959-05-02T15:30Z", 570], ["1959-09-19T14:30Z", 510],
    ["1960-04-30T15:30Z", 570], ["1960-09-17T14:30Z", 510],
    ["1961-08-09T15:30Z", 540],
    ["1987-05-09T17:00Z", 600], ["1987-10-10T17:00Z", 540],
    ["1988-05-07T17:00Z", 600], ["1988-10-08T17:00Z", 540],
  ].map(([t, off]) => [Date.parse(t), off]);

  const MIN = 60000, HOUR = 3600000, DAY = 86400000;
  const LMT_OFFSET = 8 * 60 + 30; // 지방시: 서울 경도 보정 관행값(UTC+8:30)
  const LIB_OFFSET = 8 * 60; // 라이브러리 절기 시각의 시간대(UTC+8)

  // ── 라이브러리 ──
  let L = null;
  let loading = null;
  function useLibrary(lib) { L = lib; return lib; }
  function lib() {
    if (L) return L;
    if (root && root.Solar && root.EightChar) return (L = root);
    throw new Error("lunar-javascript not loaded");
  }
  function isLunarReady() { return !!(L || (root && root.Solar && root.EightChar)); }
  // 브라우저에서 라이브러리를 한 번만 불러온다. 실패하면 다음 호출에서 다시 시도할 수 있다.
  function loadLunar() {
    if (isLunarReady()) return Promise.resolve(lib());
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = LUNAR_URL;
      s.integrity = LUNAR_SRI;
      s.crossOrigin = "anonymous";
      s.async = true;
      s.onload = () => { try { resolve(lib()); } catch (e) { loading = null; reject(e); } };
      s.onerror = () => { loading = null; s.remove(); reject(new Error("lunar-javascript load failed")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // ── 1단계: 한국 시계 ↔ UTC ──
  function krOffsetAt(utcMs) {
    let off = 540;
    for (const [t, o] of KR_OFFSETS) { if (utcMs >= t) off = o; else break; }
    return off;
  }
  function clockToUtc(y, m, d, h, mi) {
    const naive = Date.UTC(y, m - 1, d, h, mi);
    const found = [];
    for (const off of [540, 510, 570, 600]) {
      const u = naive - off * MIN;
      if (krOffsetAt(u) === off) found.push(u);
    }
    if (found.length) return Math.min(...found); // 두 번 있는 시각은 앞의 것
    return naive - krOffsetAt(naive - 12 * HOUR) * MIN; // 건너뛴 시각은 바뀌기 전 시간대로
  }
  // UTC → 지정 시간대의 달력 값
  function fields(utcMs, offMin) {
    const t = new Date(utcMs + offMin * MIN);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
  }
  const solarAt = (f) => lib().Solar.fromYmdHms(f.y, f.m, f.d, f.h, f.mi, f.s);
  const jieUtc = (jq) => { const s = jq.getSolar(); return Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - LIB_OFFSET * MIN; };

  function gz(str) {
    const stem = STEMS.indexOf(str[0]), branch = BRANCHES.indexOf(str[1]);
    if (stem < 0 || branch < 0) throw new Error("bad ganzhi " + str);
    return { stem, branch, hanja: str, ko: STEM_KO[stem] + BRANCH_KO[branch] };
  }

  // ── 2단계: 년주·월주(절대 시각) + 앞뒤 절입 ──
  function yearMonthAt(utcMs) {
    const lunar = solarAt(fields(utcMs, LIB_OFFSET)).getLunar();
    const ec = lunar.getEightChar();
    return {
      year: gz(ec.getYear()), month: gz(ec.getMonth()),
      prevJie: { name: lunar.getPrevJie(false).getName(), utc: jieUtc(lunar.getPrevJie(false)) },
      nextJie: { name: lunar.getNextJie(false).getName(), utc: jieUtc(lunar.getNextJie(false)) },
    };
  }

  // ── 3~6단계: 일주·시주(지방시, sect 2) ──
  function dayHourAt(utcMs, withHour) {
    const f = fields(utcMs, LMT_OFFSET);
    const ec = solarAt(f).getLunar().getEightChar();
    ec.setSect(2);
    return { day: gz(ec.getDay()), hour: withHour ? gz(ec.getTime()) : null, lmt: f };
  }

  function validDate(y, m, d) {
    if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2099) return false;
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  }

  // input: { y, m, d, time: {h, mi} | null, gender: "male" | "female" | "none" }
  function compute(input) {
    const { y, m, d } = input;
    const time = input.time || null;
    const gender = input.gender === "male" || input.gender === "female" ? input.gender : "none";
    if (!validDate(y, m, d)) throw new RangeError("invalid date");
    if (time && !(Number.isInteger(time.h) && Number.isInteger(time.mi) && time.h >= 0 && time.h < 24 && time.mi >= 0 && time.mi < 60)) throw new RangeError("invalid time");

    let refUtc, ym, jieDay = null;
    if (time) {
      refUtc = clockToUtc(y, m, d, time.h, time.mi);
      ym = yearMonthAt(refUtc);
    } else {
      // 7단계: 한국 시계 그날 안에 절입이 있는지 본다
      const start = clockToUtc(y, m, d, 0, 0);
      const nd = new Date(Date.UTC(y, m - 1, d + 1));
      const end = clockToUtc(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), 0, 0);
      const atStart = yearMonthAt(start);
      const jt = atStart.nextJie.utc;
      if (jt > start && jt < end) {
        refUtc = Math.min(clockToUtc(y, m, d, 12, 0), jt - MIN); // 절입 전 기준(정오와 절입 1분 전 중 이른 쪽)
        ym = yearMonthAt(refUtc);
        const after = yearMonthAt(jt + MIN);
        jieDay = {
          jie: atStart.nextJie.name,
          month: { before: ym.month, after: after.month },
          year: after.year.hanja !== ym.year.hanja ? { before: ym.year, after: after.year } : null,
        };
      } else {
        refUtc = clockToUtc(y, m, d, 12, 0);
        ym = yearMonthAt(refUtc);
      }
    }
    const dh = dayHourAt(refUtc, !!time);
    const pillars = { year: ym.year, month: ym.month, day: dh.day, hour: dh.hour };
    const dayStem = pillars.day.stem;

    // 오행 분포(겉 글자 8·6개, 지장간 없음)
    const chars = [];
    for (const k of ["year", "month", "day", "hour"]) {
      const p = pillars[k];
      if (!p) continue;
      chars.push({ pos: k, kind: "stem", el: STEM_EL[p.stem] }, { pos: k, kind: "branch", el: BRANCH_EL[p.branch] });
    }
    const elements = [0, 0, 0, 0, 0];
    chars.forEach((c) => elements[c.el]++);

    // 십신 다섯 묶음(일간 자신은 빼고 7·5글자)
    const de = STEM_EL[dayStem];
    const groups = [0, 0, 0, 0, 0];
    chars.forEach((c) => { if (!(c.pos === "day" && c.kind === "stem")) groups[(c.el - de + 5) % 5]++; });

    // 대운: 연간 양(甲丙戊庚壬)+남 또는 음+여 → 순행. 대운수 = 절입까지 날수 ÷ 3(반올림, 1~10)
    let daewoon = null;
    if (gender !== "none") {
      const yang = pillars.year.stem % 2 === 0;
      const forward = (yang && gender === "male") || (!yang && gender === "female");
      const days = (forward ? ym.nextJie.utc - refUtc : refUtc - ym.prevJie.utc) / DAY;
      daewoon = {
        direction: forward ? "forward" : "backward",
        days, startAgeExact: days / 3,
        startAge: Math.min(10, Math.max(1, Math.round(days / 3))),
        approx: !time,
        jie: forward ? ym.nextJie.name : ym.prevJie.name,
      };
    }

    const select = selectModules({ dayStem, elements, groups, monthBranch: pillars.month.branch, daewoon, timeKnown: !!time });
    return {
      pillars, dayStem, dayStemKo: STEM_KO[dayStem], dayStemHanja: STEMS[dayStem], dayElement: ELEMENTS[de],
      elements: Object.fromEntries(ELEMENTS.map((e, i) => [e, elements[i]])),
      groups: Object.fromEntries(GROUPS.map((g, i) => [g, groups[i]])),
      charCount: chars.length,
      daewoon,
      select,
      code: encodeCode(select),
      archetype: ARCHETYPE_BY_STEM[dayStem],
      flags: { timeUnknown: !time, jieDay, genderGiven: gender !== "none" },
    };
  }

  // 결과 조립용 선택값 (S1~S5, 동률 규칙 14-1)
  function selectModules({ dayStem, elements, groups, monthBranch, daewoon, timeKnown }) {
    const max = Math.max(...elements);
    const tiedMax = elements.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
    const mEl = BRANCH_EL[monthBranch];
    const many = tiedMax.includes(mEl) ? mEl : tiedMax[0];
    const zero = elements.indexOf(0);
    const min = Math.min(...elements);
    const few = zero >= 0 ? zero : elements.indexOf(min);
    const gmax = Math.max(...groups);
    const dominant = groups.indexOf(gmax);
    return {
      S1: dayStem,
      S2a: ELEMENTS[many],
      S2b: { kind: zero >= 0 ? "empty" : "few", element: ELEMENTS[few] },
      S3: GROUPS[dominant],
      S4: daewoon ? daewoon.direction : null,
      S5: dayStem,
      timeKnown: !!timeKnown,
    };
  }

  // 이어가기 코드 SOG2의 saju 칸 값: 0 = 없음, 1~5000
  // 일간 10 × 많은 5 × 적은 5 × 비어 있음 2 × 우세 5 × 시각 앎/모름 2. 대운 방향은 넣지 않는다(성별 노출 방지).
  function encodeCode(sel) {
    const many = ELEMENTS.indexOf(sel.S2a), few = ELEMENTS.indexOf(sel.S2b.element), g = GROUPS.indexOf(sel.S3);
    const empty = sel.S2b.kind === "empty" ? 1 : 0;
    return ((((sel.S1 * 5 + many) * 5 + few) * 2 + empty) * 5 + g) * 2 + (sel.timeKnown ? 1 : 0) + 1;
  }
  function decodeCode(n) {
    if (!Number.isInteger(n) || n < 1 || n > 5000) return null;
    let v = n - 1;
    const timeKnown = v % 2 === 1; v = Math.floor(v / 2);
    const g = v % 5; v = Math.floor(v / 5);
    const empty = v % 2; v = Math.floor(v / 2);
    const few = v % 5; v = Math.floor(v / 5);
    const many = v % 5; v = Math.floor(v / 5);
    return { S1: v, S2a: ELEMENTS[many], S2b: { kind: empty ? "empty" : "few", element: ELEMENTS[few] }, S3: GROUPS[g], S4: null, S5: v, timeKnown };
  }

  const api = {
    LUNAR_URL, LUNAR_SRI, STEMS, BRANCHES, STEM_KO, BRANCH_KO, ELEMENTS, STEM_EL, BRANCH_EL, GROUPS, ARCHETYPE_BY_STEM, KR_OFFSETS,
    loadLunar, isLunarReady, useLibrary,
    compute, selectModules, encodeCode, decodeCode,
    clockToUtc, krOffsetAt, yearMonthAt, dayHourAt,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Saju = api;
})(typeof window !== "undefined" ? window : globalThis);
