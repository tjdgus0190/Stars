// 낯선 점술관 — 함수 book (Netlify Functions v2). 로직은 netlify/lib/book.js(handle·respond), 여기는 연결만.
// 주소: /api/book (config.path). 유료 원본은 netlify.toml [functions] included_files로 함수 묶음에만 들어간다.
import { getStore } from "@netlify/blobs";
import Book from "../lib/book.js";
import Pay from "../lib/pay.js";

export default (req, context) => Book.respond(req, context, () => getStore({ name: Pay.STORE_NAME, consistency: "strong" }));

export const config = { path: "/api/book" };
