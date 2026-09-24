// 베다 점성술 계산: 태어난 순간의 달·태양 위치 → 나크샤트라(27개 달의 집), 라시(12궁)
// 저정밀 천문 공식(Meeus 축약판) 사용. 오차는 달 약 0.3° 이내로, 재미용 서비스에 충분하다.
(function () {
  const rad = (d) => (d * Math.PI) / 180;
  const norm = (d) => ((d % 360) + 360) % 360;

  // 한국 시간(KST, UTC+9) 기준 날짜·시각 → 율리우스일
  function julianDayKST(y, m, d, hh, mm) {
    const ms = Date.UTC(y, m - 1, d, hh - 9, mm);
    return ms / 86400000 + 2440587.5;
  }

  function moonLongitude(jd) {
    const T = (jd - 2451545.0) / 36525;
    const L = 218.3164477 + 481267.88123421 * T;
    const D = rad(297.8501921 + 445267.1114034 * T);
    const M = rad(357.5291092 + 35999.0502909 * T);
    const Mp = rad(134.9633964 + 477198.8675055 * T);
    const F = rad(93.272095 + 483202.0175233 * T);
    const lon =
      L +
      6.289 * Math.sin(Mp) +
      1.274 * Math.sin(2 * D - Mp) +
      0.658 * Math.sin(2 * D) +
      0.214 * Math.sin(2 * Mp) -
      0.186 * Math.sin(M) -
      0.114 * Math.sin(2 * F) +
      0.059 * Math.sin(2 * D - 2 * Mp) +
      0.057 * Math.sin(2 * D - M - Mp) +
      0.053 * Math.sin(2 * D + Mp) +
      0.046 * Math.sin(2 * D - M) +
      0.041 * Math.sin(Mp - M) -
      0.035 * Math.sin(D) -
      0.031 * Math.sin(Mp + M);
    return norm(lon);
  }

  function sunLongitude(jd) {
    const T = (jd - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T;
    const M = rad(357.52911 + 35999.05029 * T);
    const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    return norm(L0 + C);
  }

  // 라히리 아야남샤: 서양(계절 기준) 황도와 베다(별 기준) 황도의 차이. 2000년 약 23.85°, 매년 조금씩 커진다.
  function ayanamsa(jd) {
    const T = (jd - 2451545.0) / 36525;
    return 23.853 + 1.3969 * T;
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

  // 태어난 시각을 모르면 그날 0시와 23시 59분을 모두 계산해, 나크샤트라가 바뀌는 날인지 알려준다.
  function birthChart(y, m, d, time) {
    if (time) return { exact: true, charts: [chartAt(julianDayKST(y, m, d, time.h, time.m))] };
    const start = chartAt(julianDayKST(y, m, d, 0, 0));
    const end = chartAt(julianDayKST(y, m, d, 23, 59));
    const noon = chartAt(julianDayKST(y, m, d, 12, 0));
    if (start.nakshatra === end.nakshatra) return { exact: false, charts: [noon] };
    return { exact: false, charts: [start, end] };
  }

  window.Astro = { birthChart, moonLongitude, sunLongitude, ayanamsa, julianDayKST };
})();
