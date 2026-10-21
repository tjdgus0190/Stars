// (19단계 19-7의 7) build-dist ⑮(기획서 19-5의 「⑭」) GA4 privacy 빈칸 가드 — 세 경우.
// 저장소 파일은 고치지 않는다: 원본 privacy를 배포판처럼 걷어 낸(off) 사본을 임시 폴더에 두고 build-dist와 같은 함수를 돌린다.
// 실행: node --test tools/strange-oracle/ga4-guard.test.js
"use strict";
const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { ga4PrivacyFile } = require(path.join(ROOT, "tools", "ga4-guard.js"));
const PaySec = require(path.join(ROOT, "tools", "pay-sections.js"));
const SRC = path.join(ROOT, "products", "strange-oracle", "legal", "privacy.html");
const ID = "G-4J5SVQV3B1";

function offCopy(hasBlanks) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "so-ga4-"));
  let html = PaySec.map.strip(PaySec.strip(fs.readFileSync(SRC, "utf8"), "off"), "off");
  if (hasBlanks) html += "\n<p>테스트 ◯◯ 빈칸</p>";
  const f = path.join(dir, "privacy.html");
  fs.writeFileSync(f, html);
  return f;
}

test("ID 있음 + 배포판 privacy에 ◯◯ → 실패", () => {
  const bad = ga4PrivacyFile(ID, offCopy(true));
  assert.ok(bad && /◯◯ \d+줄/.test(bad), bad);
});
test("ID 있음 + 빈칸 없는 사본 → 통과", () => {
  assert.strictEqual(ga4PrivacyFile(ID, offCopy(false)), null);
});
test("ID 비어 있음 → 검사하지 않음(◯◯가 있어도 통과)", () => {
  assert.strictEqual(ga4PrivacyFile("", offCopy(true)), null);
  assert.strictEqual(ga4PrivacyFile("  ", offCopy(true)), null);
});
