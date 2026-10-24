// 분석 부품: GA4(gtag) (운영 규칙 3장 구글 예외·6장). 사용법: docs/common.md "analytics.js"
// - 측정 ID가 비었거나 모양이 틀리면 gtag.js를 불러오지 않고 track은 아무 일도 하지 않는다.
// - 주소에 ?가 있는 동안(결제 복귀 등)은 불러오지도 보내지도 않는다. 제품은 시작할 때 query를 지운 뒤 init을 부른다.
// - 캠페인 구분(2026-10-17, 제안서 strange-oracle-ads 8장 4번): 제품이 지우기 전의 query를 opts.utm.search로 넘기면
//   utm_source·utm_medium·utm_campaign·utm_content 네 키가 제품이 정한 값 목록(opts.utm.allow)에 정확히 맞을 때만
//   page_location에 그 값만 붙인다. 다른 키(무시 목록 opts.utm.ignore 제외)·목록 밖 값·같은 키 두 번·깨진 인코딩이 하나라도 있으면
//   캠페인 값을 모두 버리고 query 없는 주소로 보낸다(방문은 기록). 무시 목록의 키(광고 플랫폼 클릭 ID)는 값을 읽지도 보내지도 않는다.
// - 제품이 init에 넘긴 허용 목록(이벤트 → 속성 → 허용 값 목록) 밖의 이벤트·속성·값은 버린다 (6장을 코드로 강제).
//   값은 목록 안의 문자열만 지나간다 → 이름·생일·질문·코드 같은 입력값은 구조적으로 실릴 수 없다.
// - 자동 page_view 끔(send_page_view:false), config는 한 번만(화면 이동 때 다시 부르지 않음), page_location은 ?·# 뒤를 뺀 주소(+허용 utm만),
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

  // 캠페인 utm: search("?a=b&…") 가운데 허용된 utm만 정해진 순서로 "utm_source=…&…" 문자열로. 하나라도 어긋나면 ""
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  const UTM_VALUE = /^[a-z0-9_]{1,40}$/; // 목록에 넣을 수 있는 값 모양 (소문자·숫자·밑줄)
  function campaign(search, allow, ignore) {
    if (typeof search !== "string" || !search || search === "?") return "";
    if (!allow || typeof allow !== "object") return "";
    const skip = Array.isArray(ignore) ? ignore : [];
    const got = {};
    for (const part of search.replace(/^\?/, "").split("&")) {
      const eq = part.indexOf("=");
      let k, v;
      try {
        k = decodeURIComponent(eq < 0 ? part : part.slice(0, eq));
        v = eq < 0 ? null : decodeURIComponent(part.slice(eq + 1));
      } catch (e) {
        return ""; // 깨진 % 인코딩
      }
      if (skip.includes(k) && !UTM_KEYS.includes(k)) continue; // 클릭 ID: 값은 보지 않고 버린다
      if (!UTM_KEYS.includes(k) || v === null || Object.prototype.hasOwnProperty.call(got, k)) return "";
      const list = Object.prototype.hasOwnProperty.call(allow, k) ? allow[k] : null;
      if (!Array.isArray(list) || !UTM_VALUE.test(v) || !list.includes(v)) return "";
      got[k] = v;
    }
    if (!got.utm_source) return "";
    return UTM_KEYS.filter((k) => got[k]).map((k) => `${k}=${got[k]}`).join("&");
  }

  // 시작: app이 주소의 query를 지운 뒤에 부른다. opts = { ga4, title, events: { 이벤트: { 속성: [허용 값…] } }, utm: { search, allow, ignore } }
  function init(opts) {
    opts = opts || {};
    if (schema || window.location.search || !configured(opts.ga4)) return false;
    const id = opts.ga4.trim();
    schema = opts.events || {};
    const utm = opts.utm ? campaign(opts.utm.search, opts.utm.allow, opts.utm.ignore) : "";
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: false,
      page_location: window.location.origin + window.location.pathname + (utm ? "?" + utm : ""),
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

  window.Analytics = { init, track, clean, configured, campaign, FORMAT, UTM_KEYS };
})();
