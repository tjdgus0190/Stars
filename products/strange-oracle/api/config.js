// Vercel 함수 /api/config — GET  → {enabled, mode, clientKey, price} (결제 켜짐 여부. 꺼져 있으면 enabled:false)
// 로직은 _lib/core.js. 키는 환경 변수에서만 읽는다.
module.exports = require("./_lib/core.js").handler("config");
