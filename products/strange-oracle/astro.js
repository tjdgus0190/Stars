// 베다 점성술 계산: 태어난 순간의 달·태양 위치 → 나크샤트라(27개 달의 집), 라시(12궁)
//
// 천체 위치는 직접 계산하지 않고 오픈소스 라이브러리 Astronomy Engine(MIT, v2.1.19)을 쓴다.
// index.html에서 이 파일보다 먼저 jsdelivr로 불러온다 (전역 변수 Astronomy).
//  - 달: Astronomy.EclipticGeoMoon — 지구 중심, 참 황도·참 춘분점 기준(세차+장동 반영) 경도
//  - 태양: Astronomy.SunPosition — 지구 중심, 참 황도·참 춘분점 기준 겉보기 경도(광행차 포함)
//  - 장동(Δψ): Astronomy.e_tilt (IAU 2000B)
//  - 라이브러리 정확도 명세: ±1 각분(0.0167°) 이내 (README). 검증 결과는 tests.md.
//
// 시간 처리: 입력은 한국 시간(UTC+9)으로 보고 UTC로 바꾼다. UTC→지구시(TT) 변환(ΔT)은 라이브러리가 한다.
// 1987~88년 한국 서머타임은 반영하지 않는다 (tests.md 참고).
(function () {
  const A = window.Astronomy;
  const norm = (d) => ((d % 360) + 360) % 360;

  // 한국 시간(KST, UTC+9) 기준 날짜·시각 → 율리우스일(UT)
  function julianDayKST(y, m, d, hh, mm) {
    const ms = Date.UTC(y, m - 1, d, hh - 9, mm);
    return ms / 86400000 + 2440587.5;
  }

  // 율리우스일(UT) → 라이브러리 시각 객체 (J2000 기준 UT 일수)
  const toTime = (jd) => A.MakeTime(jd - 2451545.0);

  // 달의 참 황경(열대 황도, 참 춘분점 기준), 도
  function moonLongitude(jd) {
    return norm(A.EclipticGeoMoon(toTime(jd)).lon);
  }

  // 태양의 겉보기 황경(열대 황도, 참 춘분점 기준), 도
  function sunLongitude(jd) {
    return norm(A.SunPosition(toTime(jd)).elon);
  }

  // 라히리(Chitrapaksha) 아야남샤: 열대 황도와 베다(항성) 황도의 차이.
  // 정의: 1956-03-21 0시(TT, JD 2435553.5)에 평균 아야남샤 23.245524743°
  //   (Swiss Ephemeris의 SE_SIDM_LAHIRI 정의값 23.250182778 − 0.004658035, 즉 인도 역법개혁위원회의 23°15'00.658"에서 장동을 뺀 값)
  // 그 뒤로는 IAU 2006 일반 세차(황경 방향, Capitaine·Wallace·Chapront 2003; IERS Conventions 2010 식 5.40)만큼 커진다.
  // 달·태양 경도가 참 춘분점 기준이므로 같은 기준을 맞추려고 장동 Δψ를 더한 "참 아야남샤"를 돌려준다.
  const LAHIRI_T0_TT = 2435553.5;
  const LAHIRI_MEAN_AT_T0 = 23.250182778 - 0.004658035;
  function precessionLongitudeArcsec(t) {
    // t: J2000(TT)부터의 율리우스 세기
    return ((((-0.0000000383 * t - 0.000023857) * t + 0.00007964) * t + 1.1054348) * t + 5028.796195) * t;
  }
  function ayanamsa(jd) {
    const time = toTime(jd);
    const t = time.tt / 36525;
    const t0 = (LAHIRI_T0_TT - 2451545.0) / 36525;
    const mean = LAHIRI_MEAN_AT_T0 + (precessionLongitudeArcsec(t) - precessionLongitudeArcsec(t0)) / 3600;
    return mean + A.e_tilt(time).dpsi / 3600;
  }

  const NAK_SPAN = 360 / 27;

  function chartAt(jd) {
    const ay = ayanamsa(jd);
    const moonSid = norm(moonLongitude(jd) - ay);
    const sunTrop = sunLongitude(jd);
    const sunSid = norm(sunTrop - ay);
    const nakIndex = Math.floor(moonSid / NAK_SPAN);
    return {
      moonSidereal: moonSid,
      nakshatra: nakIndex,
      pada: Math.floor((moonSid - nakIndex * NAK_SPAN) / (NAK_SPAN / 4)) + 1,
      moonRashi: Math.floor(moonSid / 30),
      sunRashi: Math.floor(sunSid / 30),
      westernSign: Math.floor(sunTrop / 30),
    };
  }

  // 항성 달 경도(라히리)
  const moonSiderealAt = (jd) => norm(moonLongitude(jd) - ayanamsa(jd));

  // 태어난 시각을 모를 때: 그날(한국 시간 0:00 ~ 다음 날 0:00) 달이 거친 나크샤트라를 모두 찾는다.
  // 달은 하루에 약 12~15° 움직이고 한 집은 13.33°라, 하루에 경계를 최대 2번 넘는다 → 후보 최대 3개.
  // 경계 시각은 이분법으로 1초 이내까지 좁힌다. 달은 지구에서 볼 때 거꾸로 가지 않으므로
  // "그날 0시 경도에서 얼마나 더 갔는가"가 시간에 따라 계속 커진다는 점을 이용한다.
  // 각 후보의 결과(chart)는 그 후보 시간 구간의 한가운데 시각으로 계산한다.
  // 후보: { chart, startMin, endMin, share }  (분 단위, 0~1440. share = 하루 중 비율)
  const DAY_MIN = 1440;
  function dayCandidates(y, m, d) {
    const jd0 = julianDayKST(y, m, d, 0, 0);
    const jd1 = jd0 + 1;
    const lon0 = moonSiderealAt(jd0);
    const advance = (jd) => norm(moonSiderealAt(jd) - lon0); // 0시부터 달이 간 거리(도)
    const total = advance(jd1);
    const startNak = Math.floor(lon0 / NAK_SPAN);
    const cuts = []; // 경계를 넘는 시각(jd)
    for (let k = 1; k <= 3; k++) {
      const need = norm((startNak + k) * NAK_SPAN - lon0); // 다음 경계까지 남은 거리
      if (need > total || need === 0) break;
      let lo = cuts.length ? cuts[cuts.length - 1] : jd0;
      let hi = jd1;
      for (let i = 0; i < 40 && hi - lo > 1 / 86400; i++) {
        const mid = (lo + hi) / 2;
        if (advance(mid) < need) lo = mid;
        else hi = mid;
      }
      cuts.push(hi);
    }
    const edges = [jd0, ...cuts, jd1];
    const list = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const startMin = Math.round((edges[i] - jd0) * DAY_MIN);
      const endMin = Math.round((edges[i + 1] - jd0) * DAY_MIN);
      if (endMin <= startMin) continue; // 1분도 안 되는 구간은 뺀다(반올림 결과)
      list.push({ chart: chartAt((edges[i] + edges[i + 1]) / 2), startMin, endMin, share: (endMin - startMin) / DAY_MIN });
    }
    return list;
  }

  // 결과 계산.
  //  - 시각을 알면: { exact: true, charts: [그 시각], candidates: [] }
  //  - 모르면: 그날 후보를 모두 찾는다. 1개면 정오 값 1개(후보 화면 없이 바로 결과),
  //    2~3개면 charts = 후보별 결과, candidates = 시간 구간·비율과 함께 (사용자가 고른다).
  //    noon = 의식 화면에서 바퀴가 멈출 위치(그날 정오의 달).
  function birthChart(y, m, d, time) {
    if (time) {
      const c = chartAt(julianDayKST(y, m, d, time.h, time.m));
      return { exact: true, charts: [c], candidates: [], noon: c };
    }
    const noon = chartAt(julianDayKST(y, m, d, 12, 0));
    const candidates = dayCandidates(y, m, d);
    if (candidates.length <= 1) return { exact: false, charts: [noon], candidates: [], noon };
    return { exact: false, charts: candidates.map((c) => c.chart), candidates, noon };
  }

  window.Astro = { birthChart, dayCandidates, moonLongitude, sunLongitude, ayanamsa, julianDayKST };
})();
