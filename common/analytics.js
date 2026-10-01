// 분석 부품: GA4(gtag) (CLAUDE.md 3장 구글 예외·6장). 사용법: docs/common.md "analytics.js"
// - 측정 ID가 비었거나 모양이 틀리면 gtag.js를 불러오지 않고 track은 아무 일도 하지 않는다.
// - 주소에 ?가 있는 동안(결제 복귀 등)은 불러오지도 보내지도 않는다.
// - 제품이 init에 넘긴 허용 목록(이벤트 → 속성 → 허용 값 목록) 밖의 이벤트·속성·값은 버린다 (6장을 코드로 강제).
//   값은 목록 안의 문자열만 지나간다 → 이름·생일·질문·코드 같은 입력값은 구조적으로 실릴 수 없다.
// - 자동 page_view 끔(send_page_view:false), config는 한 번만(화면 이동 때 다시 부르지 않음), page_location은 ?·# 뒤를 뺀 주소,
//   구글 신호·광고 맞춤 신호 끔. GA4 '향상된 측정'은 운영자가 GA4 데이터 스트림 설정에서 꺼야 한다(코드만으로 막히는지 미확인).
(function () {
  const GTAG_URL = "https://www.googletagmanager.com/gtag/js";
  const FORMAT = /^G-[A-Z0-9]{4,16}$/;
  let schema = null; // init에 성공했을 때만
  const configured = (id) => typeof id === "string" && FORMAT.test(id.trim());

  // 허용 목록 정리: 들어온 속성 가운데 목록에 있고 값이 허용 값 목록 안에 있는 것만 남긴다
  function clean(rules, name, props) {
    const allowed = Object.prototype.hasOwnProperty.call(rules || {}, name) ? rules[name] : null;
    if (!allowed) return null;
    const out = {};
    for (const [k, v] of Object.entries(props || {})) {
      const list = Object.prototype.hasOwnProperty.call(allowed, k) ? allowed[k] : null;
      if (Array.isArray(list) && typeof v === "string" && list.includes(v)) out[k] = v;
    }
    return out;
  }

  // 시작: app이 주소의 query를 지운 뒤에 부른다. opts = { ga4, title, events: { 이벤트: { 속성: [허용 값…] } } }
  function init(opts) {
    opts = opts || {};
    if (schema || window.location.search || !configured(opts.ga4)) return false;
    const id = opts.ga4.trim();
    schema = opts.events || {};
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: false,
      page_location: window.location.origin + window.location.pathname,
      page_title: String(opts.title || ""),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const s = document.createElement("script");
    s.async = true;
    s.src = `${GTAG_URL}?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
    return true;
  }

  // 반환: 실제로 보낸 속성 묶음, 보내지 않았으면 null
  function track(name, props) {
    if (!schema || window.location.search || typeof window.gtag !== "function") return null;
    const p = clean(schema, name, props);
    if (!p) return null;
    window.gtag("event", name, p);
    return p;
  }

  window.Analytics = { init, track, clean, configured, FORMAT };
})();
