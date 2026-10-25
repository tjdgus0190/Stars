// 2단계 네 방(오검·데칸·촐킨·시빌라)의 계산 로직. 화면 문구는 없다 (문구는 data*.js).
// 전역 window.Calc로 노출한다. 데칸은 astro.js(window.Astro)의 태양 황경을 쓰므로 astro.js 다음에 불러온다.
// 처리 방식과 검증 기록: tests.md 「2단계 계산」.
(function () {
  // ───────── 오검 (1장) ─────────
  // 오검 20자(feda) 순서: B L F S N / H D T C Q / M G NG Z R / A O U E I
  // 유니코드 U+1681(ᚁ Beith) ~ U+1694(ᚔ Idad). index 0~19.
  const OGHAM_GLYPHS = Array.from({ length: 20 }, (_, i) => String.fromCharCode(0x1681 + i));
  const O = { b: 0, l: 1, f: 2, s: 3, n: 4, h: 5, d: 6, t: 7, c: 8, q: 9, m: 10, g: 11, ng: 12, z: 13, r: 14, a: 15, o: 16, u: 17, e: 18, i: 19 };

  // 한글 → 로마자 (제품 안의 유일한 표. 룬의 방 이름 인셋도 Calc.romanize로 이 표를 쓴다)
  const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  const JONG = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

  // 소리 하나 = 오검 글자 하나. 두 글자로 적는 소리(된소리·ng·ch 등)를 먼저 본다.
  // 오검에 없는 소리는 가장 가까운 글자로: p→B(옛 아일랜드어 표기 관행), k→C, j·ch→Z(치찰·파찰음),
  // w·v→F(ᚃ의 본래 소리 /w/), y→I, x→C+S, 된소리 kk→Q(ᚊ, 단단한 k 계열), tt·pp·ss·jj→T·B·S·Z.
  const DIGRAPH = { ng: [O.ng], kk: [O.q], tt: [O.t], pp: [O.b], ss: [O.s], jj: [O.z], ch: [O.z], ph: [O.f], th: [O.t] };
  const SINGLE = {
    a: [O.a], b: [O.b], c: [O.c], d: [O.d], e: [O.e], f: [O.f], g: [O.g], h: [O.h], i: [O.i], j: [O.z], k: [O.c],
    l: [O.l], m: [O.m], n: [O.n], o: [O.o], p: [O.b], q: [O.q], r: [O.r], s: [O.s], t: [O.t], u: [O.u], v: [O.f],
    w: [O.f], x: [O.c, O.s], y: [O.i], z: [O.z],
  };
  // 로마자 조각 하나 → 오검 index 배열. 조각 경계를 넘어 두 글자 소리를 만들지 않는다
  // (예: "한"+"글" = han|geul 에서 n+g를 ng로 읽지 않도록 한글은 초성·중성·종성을 따로 넘긴다).
  function latinToOgham(part) {
    const out = [];
    for (let i = 0; i < part.length; i++) {
      const two = DIGRAPH[part.slice(i, i + 2)];
      if (two) { out.push(...two); i++; continue; }
      const one = SINGLE[part[i]];
      if (one) out.push(...one);
    }
    return out;
  }

  // 이름 → { latin, letters }. 한글 음절과 영문 글자만 쓰고 나머지(공백·숫자·낱자모 등)는 건너뛴다.
  function nameToOgham(name) {
    let latin = "";
    const letters = [];
    let run = ""; // 이어지는 영문 글자 묶음
    const flush = () => { if (run) { letters.push(...latinToOgham(run)); run = ""; } };
    for (const ch of String(name || "")) {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code >= 0 && code <= 11171) {
        flush();
        const parts = [CHO[Math.floor(code / 588)], JUNG[Math.floor((code % 588) / 28)], JONG[code % 28]];
        latin += parts.join("");
        parts.forEach((p) => letters.push(...latinToOgham(p)));
      } else if (/[a-z]/i.test(ch)) {
        latin += ch.toLowerCase();
        run += ch.toLowerCase();
      } else flush();
    }
    flush();
    return { latin, letters };
  }

  // 선택 규칙 ("오검 둘레 걷기"): 20자를 원으로 늘어놓고(ᚁ=1번 … ᚔ=20번),
  // 이름에 새긴 글자마다 그 글자의 번호만큼 앞으로 걸어간다. 마지막에 멈춘 자리의 글자가 결과.
  //   index = (번호 합 − 1) mod 20   (번호 = letters의 index + 1)
  // 이름 전체의 모든 소리가 똑같이 한 번씩 영향을 주므로 성씨 하나가 결과를 정하지 못한다.
  // 로마자로 옮길 글자가 없으면 null.
  function ogham(name) {
    const { latin, letters } = nameToOgham(name);
    if (!letters.length) return null;
    const sum = letters.reduce((s, i) => s + i + 1, 0);
    const index = (sum - 1) % 20;
    return { index, glyph: OGHAM_GLYPHS[index], letters, glyphs: letters.map((i) => OGHAM_GLYPHS[i]).join(""), latin, sum };
  }

  // 이름 → 로마자 한 줄 (룬의 방 이름 인셋용). 계산은 nameToOgham과 같다
  const romanize = (text) => nameToOgham(text).latin;

  // ───────── 데칸 (3장) ─────────
  // 태양의 열대 황경(참 춘분점 기준, astro.js sunLongitude)을 10°씩 36칸으로 나눈다.
  // index 0 = 양자리 0~10°, 1 = 양자리 10~20°, … 35 = 물고기자리 20~30°. sign = ⌊index/3⌋ (0=양자리), part = index mod 3 (0~2번째 데칸).
  // 태어난 시각은 받지 않는다. 한국 시간 그날 0:00과 23:59의 칸이 같으면 정오 값 1개,
  // 다르면(태양은 하루 약 1°라 경계는 최대 1번) 경계 시각을 이분법으로 1초 안까지 찾아 후보 2개를 돌려준다.
  // 후보 형태는 베다의 방 Astro.dayCandidates와 같다: 시간 구간(분, 0~1440)과 하루 중 비율(share).
  const DAY_MIN = 1440;
  const norm = (d) => ((d % 360) + 360) % 360;
  function decanInfo(lon) {
    const index = Math.floor(norm(lon) / 10);
    return { index, sign: Math.floor(index / 3), part: index % 3, longitude: norm(lon) };
  }
  function decan(y, m, d) {
    if (!validDate(y, m, d)) return null;
    const A = window.Astro;
    const jd0 = A.julianDayKST(y, m, d, 0, 0);
    const jdLast = A.julianDayKST(y, m, d, 23, 59);
    const noon = decanInfo(A.sunLongitude(A.julianDayKST(y, m, d, 12, 0)));
    const i0 = decanInfo(A.sunLongitude(jd0)).index;
    const i1 = decanInfo(A.sunLongitude(jdLast)).index;
    if (i0 === i1) return { decans: [noon], candidates: [], noon };
    // 0시에서 태양이 간 거리가 경계까지 남은 거리에 닿는 순간 (태양은 지구에서 볼 때 거꾸로 가지 않는다)
    const lon0 = A.sunLongitude(jd0);
    const need = norm((i0 + 1) * 10 - lon0);
    let lo = jd0, hi = jdLast;
    for (let k = 0; k < 40 && hi - lo > 1 / 86400; k++) {
      const mid = (lo + hi) / 2;
      if (norm(A.sunLongitude(mid) - lon0) < need) lo = mid;
      else hi = mid;
    }
    const cutMin = Math.round((hi - jd0) * DAY_MIN);
    const mid1 = decanInfo(A.sunLongitude((jd0 + hi) / 2));
    const mid2 = decanInfo(A.sunLongitude((hi + jd0 + 1) / 2));
    const candidates = [
      { decan: mid1, startMin: 0, endMin: cutMin, share: cutMin / DAY_MIN },
      { decan: mid2, startMin: cutMin, endMin: DAY_MIN, share: (DAY_MIN - cutMin) / DAY_MIN },
    ];
    return { decans: candidates.map((c) => c.decan), candidates, noon };
  }

  // ───────── 촐킨 (4장) ─────────
  // 순수 날짜 산술. 그레고리력 날짜 → 율리우스 적일(JDN, 정오 기준 정수) → 장주기 일수 = JDN − 584283 (GMT 상관 계수)
  // → 260일 주기 위치. 장주기 0.0.0.0.0 = 4 Ajaw이므로:
  //   dayIndex = (일수 + 159) mod 260   (0 = 1 Imix, 259 = 13 Ajaw)
  //   number = dayIndex mod 13 + 1 (1~13),  sign = dayIndex mod 20 (0=Imix … 19=Ajaw)
  // 날짜 하루 단위로만 본다(시각·시간대 무관: 한국 날짜 그대로).
  const GMT = 584283;
  function jdn(y, m, d) {
    // Fliegel & Van Flandern(1968) 그레고리력 → JDN
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  const mod = (a, n) => ((a % n) + n) % n;
  function tzolkin(y, m, d) {
    if (!validDate(y, m, d)) return null;
    const longCount = jdn(y, m, d) - GMT;
    const dayIndex = mod(longCount + 159, 260);
    return { number: (dayIndex % 13) + 1, sign: dayIndex % 20, dayIndex, jdn: jdn(y, m, d), longCount };
  }

  // ───────── 시빌라 (5장) ─────────
  // 암호학적 난수(crypto.getRandomValues)로 0 ~ n−1 정수 하나. 나머지 연산 치우침을 없애려고 범위 밖 값은 버리고 다시 뽑는다.
  function pickOracle(n = 32) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % n;
  }

  // (2026-10-25) 시빌라 질문 읽기: 적은 질문 글에서 "묻는 꼴"(form)과 "고민 갈래"(concern)를 찾는다. 이 브라우저 안에서만 쓰고 어디에도 보내지 않는다(6장).
  //   rules = data.js sibyl.ask { forms: [{ id, words: [...] }], concerns: [{ id, words: [...] }] } — 앞에 있는 것이 먼저 맞는다(돈·몸을 맨 앞에 둔다)
  //   띄어쓰기를 지운 글에서 낱말을 찾으므로 "다시 만나"·"다시만나" 둘 다 맞는다. 맞는 갈래가 없으면 concern = null
  function sibylAsk(question, rules) {
    const q = String(question || "").toLowerCase().replace(/\s+/g, "");
    if (!q || !rules) return { form: null, concern: null };
    const hit = (list) => (list || []).find((x) => (x.words || []).some((w) => w && q.includes(String(w).toLowerCase().replace(/\s+/g, ""))));
    const f = hit(rules.forms);
    const c = hit(rules.concerns);
    return { form: f ? f.id : "plain", concern: c ? c.id : null };
  }

  // 날짜 검사: 정수, 실제로 있는 날짜, 1900~2100년
  function validDate(y, m, d) {
    if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2100) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  window.Calc = { ogham, nameToOgham, romanize, OGHAM_GLYPHS, decan, tzolkin, jdn, pickOracle, sibylAsk, validDate };
})();
