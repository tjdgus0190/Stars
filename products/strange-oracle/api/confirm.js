// Vercel 함수 /api/confirm — POST {paymentKey, orderId, amount} → 토스 승인(멱등) → {receipt, receiptUrl, report}
// 로직은 _lib/core.js. 키는 환경 변수에서만 읽는다.
module.exports = require("./_lib/core.js").handler("confirm");
