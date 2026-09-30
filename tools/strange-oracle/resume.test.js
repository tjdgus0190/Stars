// 10단계 단위 시험: 이어가기 코드(paycode.js Resume) + 배포본 og 태그(tools/og-tags.js). Node 내장 node:test, 설치 없음.
// 실행: node --test "tools/strange-oracle/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const P = path.join(ROOT, "products", "strange-oracle");
const PayCode = require(path.join(P, "paycode.js"));
const og = require(path.join(ROOT, "tools", "og-tags.js"));
const R = PayCode.Resume;
const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const FULL = { ogham: 2, star: 4, decan: 10, tzolkin: { number: 4, sign: 19 }, rune: [0, 5, 10], sibyl: 12, runeTopic: "me", sibylTopic: "love" };
const EMPTY = { ogham: null, star: null, decan: null, tzolkin: null, rune: null, sibyl: null, runeTopic: null, sibylTopic: null };
// 마친 방 n개(Ⅰ부터)만 남긴 결과
const upTo = (n, from = FULL) => {
  const c = Object.assign({}, EMPTY);
  PayCode.CHAPTER_ORDER.slice(0, n).forEach((room) => {
    c[room] = from[room];
    if (room === "rune") c.runeTopic = from.runeTopic;
    if (room === "sibyl") c.sibylTopic = from.sibylTopic;
  });
  return c;
};
// 시험용: 필드 값(자릿수)으로 코드를 직접 짠다 (앱이 만들 수 없는 조합을 만들기 위해). 검사 글자는 paycode.js와 같은 식
function craft(digits) {
  let n = 0n;
  for (const [name, radix] of R.FIELDS) n = n * BigInt(radix) + BigInt(digits[name] || 0);
  let payload = "";
  for (let i = 0; i < 10; i++) { payload = ALPHA[Number(n % 32n)] + payload; n /= 32n; }
  let s = 0;
  for (let i = 0; i < payload.length; i++) s += (2 * i + 1) * ALPHA.indexOf(payload[i]);
  return R.PREFIX + payload + ALPHA[s % 32];
}

test("이어가기 코드: 마친 방 1~6개 왕복 (같은 방·같은 값으로 되돌아온다)", () => {
  for (let n = 1; n <= 6; n++) {
    const codes = upTo(n);
    const code = R.encode(codes);
    assert.match(code, /^SOG1[0-9A-HJKMNP-TV-Z]{11}$/, `모양 ${n}`);
    assert.deepEqual(R.decode(code), { codes }, `왕복 ${n}`);
    assert.deepEqual(PayCode.roomsOf(R.decode(code).codes), PayCode.CHAPTER_ORDER.slice(0, n));
  }
});

test("이어가기 코드: 범위 끝 값도 왕복, 길이 15자(20자 이내), 4자씩 묶음", () => {
  const max = { ogham: 19, star: 26, decan: 35, tzolkin: { number: 13, sign: 19 }, rune: [23, 22, 21], sibyl: 31, runeTopic: "money", sibylTopic: "self" };
  const min = { ogham: 0, star: 0, decan: 0, tzolkin: { number: 1, sign: 0 }, rune: [0, 1, 2], sibyl: 0, runeTopic: "me", sibylTopic: "exam" };
  for (const c of [max, min]) assert.deepEqual(R.decode(R.encode(c)).codes, c);
  assert.equal(R.encode(max).length, 15);
  assert.equal(R.LEN, 15);
  assert.match(R.pretty(R.encode(max)), /^SOG1-.{4}-.{4}-.{3}$/);
});

test("이어가기 코드: 무작위 부분 없음 — 같은 결과면 언제나 같은 코드", () => {
  assert.equal(R.encode(upTo(3)), R.encode(upTo(3)));
  assert.equal(R.encode(FULL), R.encode(JSON.parse(JSON.stringify(FULL))));
  assert.notEqual(R.encode(upTo(3)), R.encode(upTo(4)));
});

test("이어가기 코드: 담는 필드는 방 결과 여섯 + 주제 둘뿐 (이름·생일·나이 구간·원형·상대·결제 없음)", () => {
  assert.deepEqual(R.FIELDS.map(([n]) => n), ["ogham", "star", "decan", "tzolkin", "rune", "runeTopic", "sibyl", "sibylTopic"]);
  assert.deepEqual(Object.keys(R.decode(R.encode(FULL)).codes).sort(), ["decan", "ogham", "rune", "runeTopic", "sibyl", "sibylTopic", "star", "tzolkin"]);
  // 넘겨준 다른 값(이름·생일·원형·나이 구간·상대·별의 부가 값·데칸 when)은 코드에 영향을 주지 않는다
  const noisy = Object.assign({}, FULL, { name: "김서윤", birth: { y: 1995, m: 3, d: 21 }, time: { h: 7, m: 30 }, arch: "sage", band: 3, partner: "lover", west: 0, sunRashi: 11, moonRashi: 1, when: "0:00~6:00", question: "비밀" });
  assert.equal(R.encode(noisy), R.encode(FULL));
  // 방 결과 값 범위는 영수증 코드(FIELDS)의 방 여섯 칸과 같다
  const pay = Object.fromEntries(PayCode.FIELDS);
  for (const room of PayCode.CHAPTER_ORDER) assert.equal(Object.fromEntries(R.FIELDS)[room], pay[room], room);
});

test("이어가기 코드: 한 글자 오타는 모두 거부 (검사 글자)", () => {
  const code = R.encode(FULL);
  let tried = 0;
  for (let i = 4; i < code.length; i++) {
    for (const ch of ALPHA) {
      if (ch === code[i]) continue;
      const bad = code.slice(0, i) + ch + code.slice(i + 1);
      assert.deepEqual(R.decode(bad), { error: "shape" }, bad);
      tried++;
    }
  }
  assert.equal(tried, 11 * 31);
  assert.deepEqual(R.decode(code.slice(0, -1)), { error: "shape" }); // 길이 모자람
  assert.deepEqual(R.decode(code + "0"), { error: "shape" });
  assert.deepEqual(R.decode(""), { error: "shape" });
  assert.deepEqual(R.decode("안녕하세요"), { error: "shape" });
});

test("이어가기 코드: 사람이 옮겨 적은 모양 고쳐 읽기 (소문자·하이픈·공백, O→0, I·L→1)", () => {
  const code = R.encode(FULL);
  assert.deepEqual(R.decode(R.pretty(code).toLowerCase()).codes, FULL);
  assert.deepEqual(R.decode(" " + code.match(/.{1,4}/g).join(" ") + " ").codes, FULL);
  assert.deepEqual(R.decode("S0G" + "L" + code.slice(4).replace(/0/g, "O").replace(/1/g, "I")).codes, FULL);
});

test("이어가기 코드: 강제 순서 — Ⅰ부터 빠짐없이 이어지지 않으면 거부", () => {
  // Ⅰ·Ⅲ (별이 빠짐): 모양·검사 글자는 맞지만 순서가 틀리다
  assert.deepEqual(R.decode(craft({ ogham: 3, decan: 11 })), { error: "order" });
  // Ⅰ 없이 Ⅱ만
  assert.deepEqual(R.decode(craft({ star: 5 })), { error: "order" });
  // Ⅰ~Ⅳ + Ⅵ (룬이 빠짐)
  assert.deepEqual(R.decode(craft({ ogham: 3, star: 5, decan: 11, tzolkin: 80, sibyl: 13, sibylTopic: 2 })), { error: "order" });
  // 같은 방식으로 짠 올바른 코드는 통과 (시험 도우미가 맞는지 확인)
  assert.deepEqual(R.decode(craft({ ogham: 3, star: 5, decan: 11 })).codes, upTo(3));
  // 앱 쪽에서도 순서가 어긋난 결과로는 코드를 만들지 않는다
  assert.throws(() => R.encode(Object.assign({}, EMPTY, { ogham: 2, decan: 10 })), /순서/);
  assert.throws(() => R.encode(EMPTY), /순서/);
});

test("이어가기 코드: 앱이 만들 수 없는 값은 거부 (주제 짝 안 맞음·같은 돌 두 번·방 없음)", () => {
  const five = { ogham: 3, star: 5, decan: 11, tzolkin: 80 };
  assert.deepEqual(R.decode(craft(Object.assign({}, five, { rune: 0 * 576 + 5 * 24 + 10 + 1 }))), { error: "shape" }); // 룬은 있는데 주제 없음
  assert.deepEqual(R.decode(craft(Object.assign({}, five, { runeTopic: 1 }))), { error: "shape" }); // 주제만 있고 룬 없음
  assert.deepEqual(R.decode(craft(Object.assign({}, five, { rune: 5 * 576 + 5 * 24 + 10 + 1, runeTopic: 1 }))), { error: "shape" }); // 같은 돌 두 번
  assert.deepEqual(R.decode(craft({})), { error: "shape" });
  assert.throws(() => R.encode(Object.assign({}, FULL, { runeTopic: "없는주제" })), /주제/);
  assert.throws(() => R.encode(Object.assign({}, FULL, { ogham: 20 })), /범위/);
});

test("이어가기 코드 ↔ 영수증 코드: 서로의 접두어를 거부한다 (유료 내용을 열지 않는다)", () => {
  const receipt = PayCode.encode({ rune: [3, 7, 11], star: 5, ogham: 2, decan: 10, tzolkin: { number: 4, sign: 19 }, sibyl: 12, arch: "sage", band: 2, partner: null, relOgham: null, relDecan: null, relTzolkin: null });
  assert.deepEqual(R.decode(receipt), { error: "receipt" });
  assert.deepEqual(R.decode(PayCode.pretty(receipt).toLowerCase()), { error: "receipt" });
  assert.equal(R.looksReceipt(receipt), true);
  assert.equal(R.looksResume(receipt), false);
  const resume = R.encode(FULL);
  assert.equal(R.looksResume(R.pretty(resume).toLowerCase()), true);
  assert.equal(R.looksReceipt(resume), false);
  // 영수증 쪽 해독기는 이어가기 코드를 코드로 보지 않는다 → 서버에 보낼 값이 만들어지지 않는다
  assert.equal(PayCode.normalize(resume), "");
  assert.equal(PayCode.decode(resume), null);
  assert.equal(PayCode.decode(R.pretty(resume)), null);
});

test("og 태그: site.url 모양 검사", () => {
  assert.equal(og.siteUrlProblem(""), null);
  assert.equal(og.siteUrlProblem("https://example.com/products/strange-oracle/"), null);
  assert.equal(og.siteUrlProblem("https://example.com/"), null);
  for (const bad of ["http://example.com/", "example.com/", "https://example.com", "https://example.com/products/strange-oracle", "https://example.com/?a=1/", "https://example.com/#x/", "https://exa mple.com/", "//example.com/"])
    assert.equal(typeof og.siteUrlProblem(bad), "string", bad);
});

test("og 태그: 제품 원본에는 site.url 빈 값·og:image 상대 경로·og:url 없음, 설정 읽기", () => {
  const html = fs.readFileSync(path.join(P, "index.html"), "utf8");
  assert.equal(og.readSiteUrl(fs.readFileSync(path.join(P, "data.js"), "utf8")), "");
  assert.equal(og.readHead(html).ogImage, "og-image.png");
  assert.ok(!/og:url|rel="canonical"/.test(html));
  assert.equal(og.injectOg(html, ""), html); // 빈 값이면 그대로
  assert.equal(og.readSiteUrl('window.TEXT = { site: { url: " https://a.example/x/ " } };'), "https://a.example/x/");
});

test("og 태그: site.url을 넣으면 제품 쪽·루트 이동 쪽 모두 og:url·canonical·og:image가 그 주소로 시작", () => {
  const SITE = "https://example.com/products/strange-oracle/";
  const html = fs.readFileSync(path.join(P, "index.html"), "utf8");
  const out = og.injectOg(html, SITE);
  assert.ok(out.includes(`<meta property="og:image" content="${SITE}og-image.png" />`));
  assert.ok(out.includes(`<meta property="og:url" content="${SITE}" />`));
  assert.ok(out.includes(`<link rel="canonical" href="${SITE}" />`));
  assert.equal(out.split('property="og:image"').length, 2);
  assert.equal(out.replace(/\r?\n[ \t]*<meta property="og:url"[^\n]*\r?\n[ \t]*<link rel="canonical"[^\n]*/, "").replace(SITE + "og-image.png", "og-image.png"), html); // 그 밖의 글자는 그대로
  const head = og.readHead(html);
  const root = og.rootPage("strange-oracle", head, SITE);
  for (const s of [`<title>${head.title}</title>`, `property="og:title" content="${head.ogTitle}"`, `property="og:image" content="${SITE}og-image.png"`, `property="og:url" content="${SITE}"`, `rel="canonical" href="${SITE}"`, 'url=products/strange-oracle/'])
    assert.ok(root.includes(s), s);
  const bare = og.rootPage("strange-oracle", head, "");
  assert.ok(bare.includes(`<title>${head.title}</title>`) && bare.includes('name="description"') && !/og:|canonical/.test(bare));
});

test("10-4: title·description·og·meta.json 키워드의 방 순서 = CHAPTER_ORDER (오검 → 별(베다) → 데칸 → 촐킨 → 룬 → 시빌라)", () => {
  const head = og.readHead(fs.readFileSync(path.join(P, "index.html"), "utf8"));
  const words = ["오검", "베다", "데칸", "촐킨", "룬", "시빌라"];
  const inOrder = (s) => words.map((w) => s.indexOf(w)).every((x, i, a) => x >= 0 && (i === 0 || a[i - 1] < x));
  for (const k of ["title", "description", "ogTitle", "ogDescription"]) assert.ok(inOrder(head[k]), k + ": " + head[k]);
  assert.equal(head.title, head.ogTitle);
  assert.equal(head.description, head.ogDescription);
  assert.ok(head.title.length <= 60 && head.description.length >= 80 && head.description.length <= 110, `${head.title.length}/${head.description.length}`);
  const kw = JSON.parse(fs.readFileSync(path.join(P, "meta.json"), "utf8")).keywords.join(" | ");
  assert.ok(inOrder(kw), kw);
  assert.deepEqual(PayCode.CHAPTER_ORDER, ["ogham", "star", "decan", "tzolkin", "rune", "sibyl"]);
});
