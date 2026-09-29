// Vercel 함수 /api/report — POST {receipt} → 토스 조회로 완료·금액 확인 → {receipt, receiptUrl, report}
// 로직은 _lib/core.js. 키는 환경 변수에서만 읽는다.
module.exports = require("./_lib/core.js").handler("report");
