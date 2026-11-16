// 낯선 점술관 — 함수 push: 웹 푸시 알림 받기·끄기·열쇠·시험 알림 (Functions v2). 로직은 netlify/lib/push.js, 여기는 연결만.
// 주소: /api/push/key · /api/push/subscribe · /api/push/unsubscribe · /api/push/test. PUSH_MODE가 없으면 503(off) — 운영자가 CLAUDE.md 예외(specs/claude-md-push.md)를 붙인 뒤 넣는다.
import { getStore } from "@netlify/blobs";
import Push from "../lib/push.js";

export default (req, context) => Push.respond(req, context, () => getStore({ name: Push.STORE_NAME, consistency: "strong" }));

export const config = { path: ["/api/push/key", "/api/push/subscribe", "/api/push/unsubscribe", "/api/push/test"] };
