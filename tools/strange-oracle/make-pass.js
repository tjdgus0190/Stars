// 열람 코드(SOP) 만들기 — 운영자용 (spec 14-4, 계획서 7장 6). 배포하지 않는다. 파일을 쓰지 않고 터미널에만 찍는다.
// 사용: node tools/strange-oracle/make-pass.js [개수, 기본 1]
//   찍히는 것: 코드(판매글 유료 구간에 넣는다)와 해시(Netlify 환경 변수 BOOK_PASS_HASHES에 쉼표로 이어 넣는다).
//   이미 넣은 해시에 새 해시를 덧붙이면 옛 회차 코드도 계속 열린다(계획서 안 2). 회차를 폐기하려면 그 해시를 지운다.
// 코드·해시를 저장소·문서·커밋 메시지에 적지 않는다(CLAUDE.md 10장). 시험용 코드는 모의 서버가 시작할 때 따로 만든다.
"use strict";
const path = require("path");
const PayCode = require(path.join(__dirname, "..", "..", "products", "strange-oracle", "paycode.js"));
const { hashOf } = require(path.join(__dirname, "..", "..", "netlify", "lib", "book.js"));

const n = Math.max(1, Math.min(50, Number(process.argv[2]) | 0 || 1));
const hashes = [];
for (let i = 0; i < n; i++) {
  const code = PayCode.Pass.make();
  if (PayCode.Pass.normalize(code) !== code) throw new Error("코드 모양 오류");
  const h = hashOf(code);
  hashes.push(h);
  console.log(`코드 ${i + 1}: ${PayCode.Pass.pretty(code)}`);
  console.log(`해시 ${i + 1}: ${h}`);
}
console.log("\nNetlify 환경 변수 (기존 값이 있으면 쉼표로 이어 붙인다):");
console.log(`BOOK_PASS_HASHES=${hashes.join(",")}`);
console.log("PASS_MODE=live   (live 조건을 모두 마친 뒤에만. 비워 두면 함수는 모든 요청에 503)");
