// 표지 구획 처리 — tools/build-dist.js와 tools/strange-oracle/mock-server.js가 함께 쓴다 (15단계 QA 1차 필수 1, 16단계 16-8)
//   <!-- pay:on -->…<!-- /pay:on -->   결제를 켠 판(test·live)에만 싣는 구획 (legal 결제 문단·목차 줄, index.html 결제 template)
//   <!-- pay:off -->…<!-- /pay:off --> 결제가 꺼진 판(off)에만 싣는 구획 (예: legal 제1조 "결제 없음" 문장)
//   <!-- map:on -->…<!-- /map:on -->   (16단계) 친구 지도를 켠 판(test·live)에만 싣는 구획 (index.html 지도 template·자리·FAQ 문답·clear 선택 칸, legal 지도 조항)
//   <!-- map:off -->…<!-- /map:off --> (16단계) 지도가 꺼진 판에만 싣는 구획(필요할 때)
// strip(html, mode): off면 <이름>:on 구획을, test·live면 <이름>:off 구획을 걷어 내고 남은 표지 주석도 지운다. 원본 파일은 고치지 않는다.
// module.exports = 결제 표지(pay) 함수들 + sections(이름) + map(지도 표지)
"use strict";

function sections(name) {
  const ON = new RegExp(String.raw`<!--\s*${name}:on\s*-->[\s\S]*?<!--\s*\/${name}:on\s*-->`, "g");
  const OFF = new RegExp(String.raw`<!--\s*${name}:off\s*-->[\s\S]*?<!--\s*\/${name}:off\s*-->`, "g");
  const MARK = new RegExp(String.raw`<!--\s*\/?${name}:(?:on|off)\s*-->`, "g");
  const isOn = (mode) => mode === "test" || mode === "live";
  const strip = (html, mode) => String(html).replace(isOn(mode) ? OFF : ON, "").replace(MARK, "");
  const count = (html, kind) => (String(html).match(kind === "off" ? OFF : ON) || []).length;
  const left = (html) => new RegExp(MARK.source).test(String(html)); // 표지가 남았는가
  // 표지 짝 검사: 여는 표지와 닫는 표지가 번갈아 나오고(겹침 없음) 짝이 맞아야 한다. 문제가 있으면 설명 문자열, 없으면 ""
  function problem(html) {
    const re = new RegExp(String.raw`<!--\s*(\/?)${name}:(on|off)\s*-->`, "g");
    let open = null;
    for (const m of String(html).matchAll(re)) {
      if (!m[1]) {
        if (open) return `${name}:${open} 안에 ${name}:${m[2]}가 겹침`;
        open = m[2];
      } else {
        if (open !== m[2]) return `/${name}:${m[2]} 짝이 없음`;
        open = null;
      }
    }
    return open ? `${name}:${open}가 닫히지 않음` : "";
  }
  return { strip, count, problem, isOn, left };
}

// 제품 안 HTML 파일(index.html, legal/*.html)이 표지 처리 대상인지 (제품 폴더 기준 상대 경로)
const isPageHtml = (rel) => /^(index\.html|legal\/[a-z-]+\.html)$/.test(rel);

const pay = sections("pay");
module.exports = { strip: pay.strip, count: pay.count, problem: pay.problem, isOn: pay.isOn, isPageHtml, sections, map: sections("map") };
