// 결제 표지 구획 처리 — tools/build-dist.js와 tools/strange-oracle/mock-server.js가 함께 쓴다 (15단계 QA 1차 필수 1)
//   <!-- pay:on -->…<!-- /pay:on -->   결제를 켠 판(test·live)에만 싣는 구획 (legal 결제 문단·목차 줄, index.html 결제 template)
//   <!-- pay:off -->…<!-- /pay:off --> 결제가 꺼진 판(off)에만 싣는 구획 (예: legal 제1조 "결제 없음" 문장)
// strip(html, mode): off면 pay:on 구획을, test·live면 pay:off 구획을 걷어 내고 남은 표지 주석도 지운다. 원본 파일은 고치지 않는다.
"use strict";
const ON = /<!--\s*pay:on\s*-->[\s\S]*?<!--\s*\/pay:on\s*-->/g;
const OFF = /<!--\s*pay:off\s*-->[\s\S]*?<!--\s*\/pay:off\s*-->/g;
const MARK = /<!--\s*\/?pay:(?:on|off)\s*-->/g;

const isOn = (mode) => mode === "test" || mode === "live";
const strip = (html, mode) => String(html).replace(isOn(mode) ? OFF : ON, "").replace(MARK, "");
const count = (html, kind) => (String(html).match(kind === "off" ? OFF : ON) || []).length;

// 표지 짝 검사: 여는 표지와 닫는 표지가 번갈아 나오고(겹침 없음) 짝이 맞아야 한다. 문제가 있으면 설명 문자열, 없으면 ""
function problem(html) {
  const re = /<!--\s*(\/?)pay:(on|off)\s*-->/g;
  let open = null;
  for (const m of String(html).matchAll(re)) {
    if (!m[1]) {
      if (open) return `pay:${open} 안에 pay:${m[2]}가 겹침`;
      open = m[2];
    } else {
      if (open !== m[2]) return `/pay:${m[2]} 짝이 없음`;
      open = null;
    }
  }
  return open ? `pay:${open}가 닫히지 않음` : "";
}

// 제품 안 HTML 파일(index.html, legal/*.html)이 표지 처리 대상인지 (제품 폴더 기준 상대 경로)
const isPageHtml = (rel) => /^(index\.html|legal\/[a-z-]+\.html)$/.test(rel);

module.exports = { strip, count, problem, isOn, isPageHtml };
