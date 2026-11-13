// 낯선 점술관 — 함수 talk: 안내자 면담 (Functions v2). 로직은 netlify/lib/talk.js(handle·respond), 여기는 연결만.
// 주소: /api/talk (config.path). TALK_MODE·ANTHROPIC_API_KEY·TALK_MONTHLY_USD가 없으면 503(off) — 운영자가 CLAUDE.md 예외를 붙인 뒤 넣는다.
import { getStore } from "@netlify/blobs";
import Talk from "../lib/talk.js";

export default (req, context) => Talk.respond(req, context, () => getStore({ name: Talk.STORE_NAME, consistency: "strong" }));

export const config = { path: "/api/talk" };
