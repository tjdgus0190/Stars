// 14단계 F4-B2 단위 시험: 함수 book(netlify/functions/book.js) · 열람 코드 모양(paycode.js Pass) · make-pass · 배포 설정.
// 실행: node --test "tools/strange-oracle/*.test.js"
// 시험 코드는 이 실행 안에서만 만들고 버린다(파일·저장소에 쓰지 않음).
"use strict";
const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const PROD = path.join(ROOT, "products", "strange-oracle");
const PAID = path.join(PROD, "api", "_paid", "book");
const Book = require(path.join(ROOT, "netlify", "functions", "book.js"));
const { Pass } = require(path.join(PROD, "paycode.js"));

const CODE = Pass.make();
const ENV = { PASS_MODE: "test", BOOK_PASS_HASHES: Book.hashOf(CODE) };
let ipN = 0;
const call = (body, opts = {}) => {
  const r = Book.handle({ method: opts.method || "POST", body: typeof body === "string" ? body : JSON.stringify(body), ip: opts.ip || `10.0.0.${++ipN}` }, opts.env || ENV, PAID, opts.now);
  return Object.assign(r, { json: r.body ? JSON.parse(r.body) : null });
};

test("허용 목록은 정확히 10개, 유료 원본 파일과 1:1", () => {
  assert.deepStrictEqual([...Book.ALLOW].sort(), ["arch", "decan", "flow", "match", "ogham", "rune", "saju", "sibyl", "star", "tzolkin"]);
  assert.deepStrictEqual(fs.readdirSync(PAID).filter((f) => f.endsWith(".js")).map((f) => f.replace(/^book-|\.js$/g, "")).sort(), [...Book.ALLOW].sort());
});

test("맞는 코드 + 허용 file → 200, 그 장의 값, no-store", () => {
  for (const file of Book.ALLOW) {
    const r = call({ pass: Pass.pretty(CODE).toLowerCase(), file });
    assert.strictEqual(r.status, 200, file);
    assert.strictEqual(r.headers["Cache-Control"], "no-store");
    assert.strictEqual(r.json.file, file);
    assert.ok(r.json.data && typeof r.json.data === "object", file);
  }
  assert.ok(call({ pass: CODE, file: "match" }).json.data.bond.first, "궁합 다양화 모듈(bond) 포함");
});

test("허용 목록 밖 file은 파일을 읽지 않고 400 (../x, book-ogham, 대문자, 배열)", () => {
  for (const file of ["../x", "book-ogham", "OGHAM", "ogham.js", "../../../etc/passwd", "", "open", "close", ["ogham"], null])
    assert.strictEqual(call({ pass: CODE, file }).status, 400, JSON.stringify(file));
});

test("두 칸뿐: 칸이 더 있거나 모자라면 400 (이름·결과 코드를 실어도 받지 않음)", () => {
  assert.strictEqual(call({ pass: CODE, file: "arch", name: "김서윤" }).status, 400);
  assert.strictEqual(call({ pass: CODE, file: "arch", codes: 532 }).status, 400);
  assert.strictEqual(call({ pass: CODE }).status, 400);
  assert.strictEqual(call("not json").status, 400);
  assert.strictEqual(call("x".repeat(600)).status, 400);
  assert.strictEqual(call({ pass: CODE, file: "arch" }, { method: "GET" }).status, 405);
});

test("틀린 코드 → 401, 같은 IP 10분 안 10회 넘으면 429(맞는 코드도), 10분 뒤 풀림", () => {
  const ip = "10.9.9.9";
  const now = 1_000_000;
  const wrong = Pass.make();
  for (let i = 0; i < 10; i++) assert.strictEqual(call({ pass: wrong, file: "arch" }, { ip, now: now + i }).status, 401, `틀림 ${i + 1}`);
  assert.strictEqual(call({ pass: CODE, file: "arch" }, { ip, now: now + 20 }).status, 429);
  assert.strictEqual(call({ pass: "SOP-모양틀림", file: "arch" }, { ip: "10.9.9.8", now }).status, 401);
  assert.strictEqual(call({ pass: CODE, file: "arch" }, { ip, now: now + 10 * 60 * 1000 + 1 }).status, 200);
  assert.strictEqual(call({ pass: CODE, file: "arch" }, { ip: "10.9.9.7", now }).status, 200, "다른 IP는 영향 없음");
});

test("PASS_MODE가 비었거나 해시가 없으면 아무것도 주지 않음 (배포판 안전)", () => {
  assert.strictEqual(call({ pass: CODE, file: "arch" }, { env: {} }).status, 503);
  assert.strictEqual(call({ pass: CODE, file: "arch" }, { env: { PASS_MODE: "live", BOOK_PASS_HASHES: "" } }).status, 401);
  assert.strictEqual(call({ pass: CODE, file: "arch" }, { env: { PASS_MODE: "live", BOOK_PASS_HASHES: `${Book.hashOf(Pass.make())},${ENV.BOOK_PASS_HASHES}` } }).status, 200, "여러 회차 해시");
});

test("Netlify handler 형식: statusCode·headers·body, 본문 base64도 받음", async () => {
  process.env.PASS_MODE = "test";
  process.env.BOOK_PASS_HASHES = ENV.BOOK_PASS_HASHES;
  try {
    const r = await Book.handler({ httpMethod: "POST", headers: { "x-nf-client-connection-ip": "10.1.1.1" }, isBase64Encoded: true, body: Buffer.from(JSON.stringify({ pass: CODE, file: "flow" })).toString("base64") });
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.headers["Cache-Control"], "no-store");
    assert.strictEqual(JSON.parse(r.body).file, "flow");
  } finally {
    delete process.env.PASS_MODE;
    delete process.env.BOOK_PASS_HASHES;
  }
});

test("열람 코드 모양: SOP+12+검사 1자, 표기·소문자·헷갈리는 글자, SO1·SOG는 따로", () => {
  for (let i = 0; i < 200; i++) {
    const c = Pass.make();
    assert.match(c, /^SOP[0-9A-HJKMNP-TV-Z]{13}$/);
    assert.strictEqual(Pass.normalize(Pass.pretty(c).toLowerCase()), c);
    assert.deepStrictEqual(Pass.check(` ${Pass.pretty(c)} `), { pass: c });
    const bad = c.slice(0, 8) + (c[8] === "0" ? "1" : "0") + c.slice(9); // 한 글자 바뀜 → 검사 글자가 잡는다
    assert.strictEqual(Pass.check(bad).error, "shape");
  }
  assert.strictEqual(Pass.check("SO1-ABCD-EFGH").error, "receipt");
  assert.strictEqual(Pass.check("SOG2-ABCD-EFGH-JKMN").error, "resume");
  assert.strictEqual(Pass.check("").error, "shape");
  assert.ok(Pass.looksPass("sop-1234") && !Pass.looksPass("SOG2"));
});

test("make-pass: 코드·해시만 터미널에, 해시 = 함수가 쓰는 해시, 파일을 쓰지 않음", () => {
  const before = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  const out = execFileSync(process.execPath, [path.join(__dirname, "make-pass.js"), "2"], { encoding: "utf8" });
  const codes = [...out.matchAll(/코드 \d: (SOP-\S+)/g)].map((m) => m[1]);
  const hashes = [...out.matchAll(/해시 \d: ([0-9a-f]{64})/g)].map((m) => m[1]);
  assert.strictEqual(codes.length, 2);
  codes.forEach((c, i) => assert.strictEqual(Book.hashOf(c), hashes[i]));
  assert.ok(out.includes(`BOOK_PASS_HASHES=${hashes.join(",")}`));
  assert.strictEqual(execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }), before);
});

test("netlify.toml: build-dist·dist/public·함수 폴더·included_files는 유료 원본만", () => {
  const t = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
  assert.match(t, /command = "node tools\/build-dist\.js"/);
  assert.match(t, /publish = "dist\/public"/);
  assert.match(t, /directory = "netlify\/functions"/);
  assert.deepStrictEqual([...t.matchAll(/included_files = \[([^\]]*)\]/g)].map((m) => m[1].trim()), ['"products/strange-oracle/api/_paid/book/**"']);
  assert.ok(fs.existsSync(path.join(ROOT, "netlify", "functions", "book.js")));
});

test("data.js 배포판 설정: pay.mode off · verify code · 3,900원", () => {
  const w = {};
  require("vm").runInNewContext(fs.readFileSync(path.join(PROD, "data.js"), "utf8"), { window: w });
  assert.strictEqual(w.TEXT.pay.mode, "off");
  assert.strictEqual(w.TEXT.pay.verify, "code");
  assert.strictEqual(w.TEXT.pay.amount, 3900);
  assert.match(fs.readFileSync(path.join(PROD, "data.js"), "utf8"), /\bpay:\s*\{\s*mode:\s*"off"/, "모의 서버가 찾는 모양(첫 줄 mode)");
});
