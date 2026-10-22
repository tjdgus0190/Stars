// 낯선 점술관 — 함수 auth (Netlify Functions v2, spec 21단계). 로직은 netlify/lib/auth.js, 여기는 연결만.
// 주소: /api/auth/kakao/start · /api/auth/kakao/callback · /api/auth/claim. 기록은 결제와 같은 저장소(strong).
import { getStore } from "@netlify/blobs";
import Auth from "../lib/auth.js";
import Pay from "../lib/pay.js";

export default (req, context) => Auth.respond(req, context, () => getStore({ name: Pay.STORE_NAME, consistency: "strong" }));

export const config = { path: ["/api/auth/kakao/start", "/api/auth/kakao/callback", "/api/auth/claim"] };
