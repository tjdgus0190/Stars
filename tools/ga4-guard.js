// (19단계 19-5, 확인 133) GA4 privacy 빈칸 가드. build-dist가 부르고, 단위 시험(tools/strange-oracle/ga4-guard.test.js)도 같은 함수를 쓴다.
// GA4 측정 ID가 차 있으면, 배포판으로 걷어 낸 뒤의 legal/privacy.html에 ◯◯가 하나라도 남아 있을 때 실패한다(off·live 모두).
// ID가 비어 있으면 검사하지 않는다(분석 스크립트를 부르지 않으므로). 운영자가 빈칸을 채워야 GA4가 든 배포판을 만들 수 있다 — 값을 지어내지 않는다.
// 기획서 19-5는 이 가드를 「⑭」라 부른다. build-dist에는 18단계 ⑭(책 전용 파일)가 이미 있어 메시지에는 「⑮(19-5 ⑭)」로 쓴다.
"use strict";
const fs = require("fs");

function ga4PrivacyProblem(ga4, privacyHtml) {
  if (!String(ga4 || "").trim()) return null;
  if (privacyHtml == null) return "배포판 legal/privacy.html이 없음";
  const lines = String(privacyHtml).split(/\r?\n/);
  const at = lines.map((l, i) => (l.includes("◯◯") ? i + 1 : 0)).filter(Boolean);
  if (!at.length) return null;
  return `GA4 ID가 있는데 배포판 privacy.html에 ◯◯ ${at.length}줄 남음(${at.slice(0, 8).join("·")}줄) — 운영자가 확인 133 빈칸(머리말·문의처·GA 보관 기간·국외 이전 세부·책임자 성명·연락처)을 채워야 함`;
}
function ga4PrivacyFile(ga4, file) {
  return ga4PrivacyProblem(ga4, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
}
module.exports = { ga4PrivacyProblem, ga4PrivacyFile };
