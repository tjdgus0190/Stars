// 낯선 점술관 — 함수 pay (Netlify Functions v2). 로직은 netlify/lib/pay.js(handle·respond), 여기는 연결만.
// 주소: /api/pay/feedback · /api/pay/status · /api/pay/return (config.path). 결제 기록 저장소 "strange-oracle-pay"는 strong 일관성으로 연다.
import { getStore } from "@netlify/blobs";
import Pay from "../lib/pay.js";

export default (req, context) => Pay.respond(req, context, () => getStore({ name: Pay.STORE_NAME, consistency: "strong" }));

export const config = { path: ["/api/pay/feedback", "/api/pay/status", "/api/pay/return"] };
