// 낯선 점술관 — 서버리스 함수 book (spec 14-4, 결정 85·93). 하는 일은 하나: 열람 코드 확인 → 유료 장 파일 하나를 JSON으로 준다.
// 받는 것: POST 본문 { pass, file } 두 칸뿐. 이름·생년월일·시각·성별·결과 코드는 받지 않는다(CLAUDE.md 6장, 3장 서버리스 예외보다 좁다).
//   file은 허용 목록 12개 중 하나(정확히 같은 문자열, 17단계에 yeon = 인연의 장, 18단계에 cross = 새 장을 더함). 목록 밖 값(경로 문자 포함)은 파일을 읽지 않고 거부한다.
//   파일 이름은 허용 목록의 고정 문자열로만 만든다(입력값을 경로에 붙이지 않음).
// 코드 확인(spec 15-3 "함수 book 수정"): ① 코드를 정규화(대문자, 공백·하이픈 제거)한 뒤 SHA-256(hex)이 환경 변수 BOOK_PASS_HASHES(쉼표로 나눈 목록)에 있으면 통과.
//   ② 아니면 Netlify Blobs pass/<ph>(ph = HMAC(PASS_SECRET, "hash:"+코드), 함수 pay가 씀)가 paid이고 cancel/<그 mul_no>가 없으면 통과(마지막 방어선).
//      cancelled면 403 { error: "cancelled" }. Blobs 읽기 실패는 503(틀린 시도로 세지 않음). PASS_SECRET이 비었거나 32바이트 미만이면 ②는 건너뛴다.
//      ①로 통과한 수동 코드는 Blobs를 읽지 않는다.
//   코드 원문·해시는 저장소에 쓰지 않는다. 운영자가 tools/strange-oracle/make-pass.js로 만들어 Netlify 환경 변수에 넣는다.
//   PASS_MODE 환경 변수가 "live" 또는 "test"가 아니면(비어 있으면) 모두 503 → 1차 배포판(pay.mode off)에서는 아무것도 주지 않는다.
// 틀린 코드 반복: 이 함수 인스턴스 메모리에서 접속 IP별로 10분 동안 틀린 횟수를 세고, 10회를 넘으면 그 10분이 끝날 때까지 429.
//   IP는 메모리의 Map 키로만 쓰고 저장·기록하지 않는다(인스턴스가 바뀌면 사라짐). 개인정보처리방침 결제 문단에 적을 것(copywriter F5).
// 모든 응답에 Cache-Control: no-store. 요청 본문·코드는 console에 찍지 않는다.
// 유료 파일: products/strange-oracle/api/_paid/book/book-<file>.js — netlify.toml [functions] included_files로 함수 묶음에만 들어간다.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const Pay = require("./pay.js");

const FILES = Object.freeze({
  saju: "BOOK_SAJU", ogham: "BOOK_OGHAM", star: "BOOK_STAR", decan: "BOOK_DECAN", tzolkin: "BOOK_TZOLKIN",
  rune: "BOOK_RUNE", sibyl: "BOOK_SIBYL", flow: "BOOK_FLOW", match: "BOOK_MATCH", arch: "BOOK_ARCH",
  yeon: "BOOK_YEON", // (17-2) 인연의 장. 본문 칸은 그대로 { file, pass } 두 칸
  cross: "BOOK_CROSS", // (18-2) 새 장 「겹치는 곳, 갈리는 곳」. 파일을 통째로 준다(원형·축·방 목록을 받는 칸 없음)
});
const ALLOW = Object.freeze(Object.keys(FILES));
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 10;
const MAX_BODY = 512;
const PAID_REL = path.join("products", "strange-oracle", "api", "_paid", "book");

const normalize = (s) => String(s || "").toUpperCase().replace(/[\s-]+/g, "");
const hashOf = (code) => crypto.createHash("sha256").update(normalize(code)).digest("hex");
const SHAPE = /^SOP[0-9A-HJKMNP-TV-Z]{13}$/; // SOP + 무작위 12자 + 검사 1자 (Crockford Base32, 검사 글자 계산은 paycode.js Pass)

// 유료 폴더 찾기: Netlify 함수 묶음 안 상대 경로(included_files는 저장소 기준 경로를 유지) — 실제 위치는 미확인이라 후보를 차례로 본다
function paidDir() {
  const roots = [process.env.LAMBDA_TASK_ROOT, process.cwd(), path.resolve(__dirname, "..", "..")].filter(Boolean);
  for (const r of roots) {
    const d = path.join(r, PAID_REL);
    if (fs.existsSync(d)) return d;
  }
  return null;
}
const cache = {};
function readPaid(dir, file) {
  const key = dir + "|" + file;
  if (!cache[key]) {
    const text = fs.readFileSync(path.join(dir, `book-${file}.js`), "utf8");
    const w = {};
    vm.runInNewContext(text, { window: w });
    cache[key] = JSON.stringify({ file, data: w[FILES[file]] });
  }
  return cache[key];
}

const fails = new Map(); // ip → { n, since }
function blocked(ip, now) {
  const f = fails.get(ip);
  if (!f) return false;
  if (now - f.since > WINDOW_MS) {
    fails.delete(ip);
    return false;
  }
  return f.n >= MAX_FAILS;
}
function addFail(ip, now) {
  const f = fails.get(ip);
  if (!f || now - f.since > WINDOW_MS) fails.set(ip, { n: 1, since: now });
  else f.n++;
  if (fails.size > 5000) for (const [k, v] of fails) if (now - v.since > WINDOW_MS) fails.delete(k); // 메모리 정리
}

// 핵심 (모의 서버도 이것을 그대로 부른다). req = { method, body(문자열), ip }, env = { PASS_MODE, BOOK_PASS_HASHES, PASS_SECRET }, dir = 유료 폴더
// store = 함수 pay와 같은 모양의 기록 저장소(없으면 ②를 건너뜀). 15단계부터 async(Blobs 읽기)
async function handle(req, env, dir, now = Date.now(), store = null) {
  const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  const send = (status, obj) => ({ status, headers: H, body: typeof obj === "string" ? obj : JSON.stringify(obj) });
  if (req.method !== "POST") return send(405, { error: "method" });
  if (env.PASS_MODE !== "live" && env.PASS_MODE !== "test") return send(503, { error: "off" });
  const ip = String(req.ip || "unknown");
  if (blocked(ip, now)) return send(429, { error: "wait" });
  const raw = String(req.body || "");
  if (raw.length > MAX_BODY) return send(400, { error: "bad" });
  let b;
  try {
    b = JSON.parse(raw);
  } catch (e) {
    return send(400, { error: "bad" });
  }
  if (!b || typeof b !== "object" || Array.isArray(b)) return send(400, { error: "bad" });
  const keys = Object.keys(b).sort();
  if (keys.length !== 2 || keys[0] !== "file" || keys[1] !== "pass") return send(400, { error: "bad" }); // 두 칸뿐
  if (typeof b.file !== "string" || !ALLOW.includes(b.file)) return send(400, { error: "file" }); // 파일을 읽지 않고 거부
  if (typeof b.pass !== "string") return send(400, { error: "bad" });
  if (b.file === "saju") {
    if (!dir) return send(500, { error: "server" });
    try {
      return send(200, readPaid(dir, b.file));
    } catch (e) {
      return send(500, { error: "server" });
    }
  }
  if (!SHAPE.test(normalize(b.pass))) {
    addFail(ip, now);
    return send(401, { error: "pass" });
  }
  const valid = String(env.BOOK_PASS_HASHES || "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^[0-9a-f]{64}$/.test(s));
  const h = hashOf(b.pass);
  if (!valid.some((v) => v.length === h.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(h)))) {
    if (!store || !Pay.secretOk(env.PASS_SECRET)) {
      addFail(ip, now);
      return send(401, { error: "pass" });
    }
    let st;
    try {
      st = await Pay.passState(store, env.PASS_SECRET, normalize(b.pass));
    } catch (e) {
      return send(503, { error: "store" });
    }
    if (st === "cancelled") return send(403, { error: "cancelled" });
    if (st !== "paid") {
      addFail(ip, now);
      return send(401, { error: "pass" });
    }
  }
  if (!dir) return send(500, { error: "server" });
  try {
    return send(200, readPaid(dir, b.file));
  } catch (e) {
    return send(500, { error: "server" });
  }
}

// Netlify 함수 (v1 형식). 주소: /.netlify/functions/book, netlify.toml에서 /api/book으로 잇는다
async function handler(event) {
  const hd = event.headers || {};
  const ip = hd["x-nf-client-connection-ip"] || String(hd["x-forwarded-for"] || "").split(",")[0].trim();
  const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body;
  const r = await handle({ method: event.httpMethod, body, ip }, process.env, paidDir(), Date.now(), Pay.blobStore(event));
  return { statusCode: r.status, headers: r.headers, body: r.body };
}

module.exports = { handler, handle, normalize, hashOf, ALLOW, FILES, _fails: fails };
