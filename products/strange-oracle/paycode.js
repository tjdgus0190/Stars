// 영수증 코드(= 토스 주문번호 orderId) 부호화·해독. 문구 없음, 개인정보 없음.
// 브라우저(app.js, window.PayCode)와 서버(api/_lib, require)가 이 파일 하나를 함께 쓴다.
// 이름·생년월일·태어난 시각·시빌라 질문·상대 정보는 여기에 들어오지 않는다. 결과 코드(번호)만 담는다.
//
// 모양: "SO1" + 결과 코드 12자 + 무작위 14자 + 검사 1자 = 30자 (영문 대문자·숫자만, 토스 orderId 6~64자 규칙 안)
//   글자표 = Crockford Base32 "0123456789ABCDEFGHJKMNPQRSTVWXYZ" (I·L·O·U 없음. 입력 때 O→0, I·L→1로 고쳐 읽는다)
//   결과 코드 12자 = 아래 FIELDS를 혼합 기수(mixed radix)로 한 정수로 묶어 32진수 12자리(앞을 0으로 채움)
//   무작위 14자 = crypto.getRandomValues, 5비트 × 14 = 70비트
//   검사 1자 = "SO1" 뒤 26자의 홀수 가중 합 mod 32 (한 글자 오타는 항상, 이웃 두 글자 뒤바뀜은 대부분 서버에 묻기 전에 잡는다)
// 필드 표는 products/strange-oracle/tests.md 「6단계 · 영수증 코드 부호화」에 있다. 순서·기수를 바꾸면 기존 코드가 모두 깨진다.
(function (root) {
  "use strict";
  const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const PREFIX = "SO1";
  const PAYLOAD_LEN = 12;
  const RANDOM_LEN = 14;
  const LEN = PREFIX.length + PAYLOAD_LEN + RANDOM_LEN + 1;
  const ARCHETYPES = ["warrior", "sage", "lover", "rebel", "caregiver", "explorer", "creator", "ruler"];
  // 나의 이야기 장 순서 Ⅰ~Ⅵ (spec 7-1, 결정 39). 브라우저(app.js)와 서버(api/_lib/core.js)가 이 배열 하나만 쓴다.
  // 부호화(FIELDS)와는 무관하다 — 이 배열을 바꿔도 기존 영수증 코드는 그대로 해독된다.
  const CHAPTER_ORDER = Object.freeze(["ogham", "star", "decan", "tzolkin", "rune", "sibyl"]);
  const ROOMS = CHAPTER_ORDER;
  // [이름, 기수]. 값 0 = 없음(방에 안 감·상대 없음·관계 없음), 1 이상 = 실제 값 + 1
  const FIELDS = [
    ["rune", 24 * 24 * 24 + 1], // 룬 세 개(과거·현재·미래) 번호 0~23 → p0*576 + p1*24 + p2 + 1
    ["star", 27 + 1], // 나크샤트라 0~26
    ["ogham", 20 + 1], // 오검 0~19
    ["decan", 36 + 1], // 데칸 0~35
    ["tzolkin", 13 * 20 + 1], // 촐킨 (숫자 1~13, 문양 0~19) → (숫자-1)*20 + 문양 + 1
    ["sibyl", 32 + 1], // 신탁 0~31
    ["arch", 8], // 내 원형 0~7 (필수)
    ["band", 7], // 나이 구간 b1~b7 → 0~6 (필수)
    ["partner", 8 + 1], // 상대 원형 0~7
    ["relOgham", 3 + 1], // 오검 관계 등급 0~2
    ["relDecan", 4 + 1], // 데칸 관계 등급 0~3
    ["relTzolkin", 3 + 1], // 촐킨 관계 등급 0~2
  ];

  const val = (ch) => ALPHA.indexOf(ch);
  function checkChar(body) {
    let s = 0;
    for (let i = 0; i < body.length; i++) s += (2 * i + 1) * val(body[i]); // 홀수 가중치: 한 글자 바뀜은 항상 잡힌다
    return ALPHA[s % 32];
  }
  // 사람이 적은 코드 → 원래 모양 (대문자, 하이픈·공백 제거, 헷갈리는 글자 고침). 모양이 아니면 ""
  function normalize(input) {
    let s = String(input || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (!/^S[O0]1/.test(s)) return "";
    s = PREFIX + s.slice(3).replace(/O/g, "0").replace(/[IL]/g, "1");
    if (s.length !== LEN || /[^0-9A-Z]/.test(s) || [...s.slice(3)].some((c) => val(c) < 0)) return "";
    return s;
  }
  function randomChars(n) {
    const buf = new Uint8Array(n);
    (root.crypto || require("crypto").webcrypto).getRandomValues(buf);
    return Array.from(buf, (b) => ALPHA[b & 31]).join("");
  }

  // codes: { rune:[i,i,i]|null, star, ogham, decan, sibyl: 번호|null, tzolkin:{number,sign}|null,
  //          arch:"warrior"…, band:0~6, partner:"sage"…|null, relOgham, relDecan, relTzolkin: 등급|null }
  function toDigits(c) {
    const opt = (v) => (v == null ? 0 : v + 1);
    return {
      rune: c.rune ? c.rune[0] * 576 + c.rune[1] * 24 + c.rune[2] + 1 : 0,
      star: opt(c.star), ogham: opt(c.ogham), decan: opt(c.decan),
      tzolkin: c.tzolkin ? (c.tzolkin.number - 1) * 20 + c.tzolkin.sign + 1 : 0,
      sibyl: opt(c.sibyl),
      arch: ARCHETYPES.indexOf(c.arch), band: c.band,
      partner: c.partner ? ARCHETYPES.indexOf(c.partner) + 1 : 0,
      relOgham: opt(c.relOgham), relDecan: opt(c.relDecan), relTzolkin: opt(c.relTzolkin),
    };
  }
  function fromDigits(d) {
    const opt = (v) => (v === 0 ? null : v - 1);
    const r = d.rune - 1;
    const tz = d.tzolkin - 1;
    return {
      rune: d.rune ? [Math.floor(r / 576), Math.floor(r / 24) % 24, r % 24] : null,
      star: opt(d.star), ogham: opt(d.ogham), decan: opt(d.decan),
      tzolkin: d.tzolkin ? { number: Math.floor(tz / 20) + 1, sign: tz % 20 } : null,
      sibyl: opt(d.sibyl),
      arch: ARCHETYPES[d.arch], band: d.band,
      partner: d.partner ? ARCHETYPES[d.partner - 1] : null,
      relOgham: opt(d.relOgham), relDecan: opt(d.relDecan), relTzolkin: opt(d.relTzolkin),
    };
  }
  const roomsOf = (c) => ROOMS.filter((r) => c[r] != null);

  function encode(codes, random) {
    const d = toDigits(codes);
    let n = 0n;
    for (const [name, radix] of FIELDS) {
      const v = d[name];
      if (!Number.isInteger(v) || v < 0 || v >= radix) throw new Error("PayCode: 범위 밖 " + name);
      n = n * BigInt(radix) + BigInt(v);
    }
    if (!roomsOf(codes).length) throw new Error("PayCode: 방이 하나도 없음");
    let payload = "";
    for (let i = 0; i < PAYLOAD_LEN; i++) {
      payload = ALPHA[Number(n % 32n)] + payload;
      n /= 32n;
    }
    const rnd = random || randomChars(RANDOM_LEN);
    if (rnd.length !== RANDOM_LEN || [...rnd].some((ch) => val(ch) < 0)) throw new Error("PayCode: 무작위 부분 모양");
    const body = PREFIX + payload + rnd;
    return body + checkChar(body.slice(3));
  }
  // 해독: 모양·검사 글자·범위가 맞으면 codes, 아니면 null (서버는 이것만 믿지 않고 토스 결제 기록과 함께 본다)
  function decode(input) {
    const s = normalize(input);
    if (!s) return null;
    if (checkChar(s.slice(3, LEN - 1)) !== s[LEN - 1]) return null;
    let n = 0n;
    for (const ch of s.slice(3, 3 + PAYLOAD_LEN)) n = n * 32n + BigInt(val(ch));
    const d = {};
    for (let i = FIELDS.length - 1; i >= 0; i--) {
      const [name, radix] = FIELDS[i];
      d[name] = Number(n % BigInt(radix));
      n /= BigInt(radix);
    }
    if (n !== 0n) return null; // 기수 곱을 넘는 값 = 위조·오타
    const codes = fromDigits(d);
    if (!roomsOf(codes).length) return null;
    // 관계 등급은 상대가 있을 때만 의미가 있다
    if (!codes.partner && (codes.relOgham != null || codes.relDecan != null || codes.relTzolkin != null)) return null;
    return codes;
  }
  // 화면 표시용: 4자씩 묶음 배열
  const groups = (code) => String(code).match(/.{1,4}/g) || [];
  const pretty = (code) => groups(code).join("-");

  // ═════════ 이어가기 코드 (10단계, spec 10-1 b) ═════════
  // 모양: "SOG1" + 결과 코드 10자 + 검사 1자 = 15자. 같은 글자표·혼합 기수·검사 글자 방식. 무작위 부분 없음(같은 결과면 같은 코드).
  // 담는 것: 마친 방의 결과 번호(위 FIELDS의 방 여섯 칸과 같은 값 범위) + 룬 주제·시빌라 주제 번호. 그 밖에는 아무것도 없다
  //   (이름·생년월일·시각·질문·나이 구간·원형·상대·영수증·결제 여부 없음). 서버는 이 코드를 받지 않는다(브라우저 화면 전용).
  // 이 코드로 태어난 날을 거의 알아낼 수 있으므로 입력값에 준해 다룬다: 저장·전송·기록(console) 금지. 이 파일은 계산만 한다.
  // 필드 표는 tests.md 「10단계 · 이어가기 코드」. 순서·기수·주제 배열 순서를 바꾸면 기존 코드가 모두 깨진다.
  const R_PREFIX = "SOG1";
  const R_PAYLOAD_LEN = 10;
  const R_LEN = R_PREFIX.length + R_PAYLOAD_LEN + 1;
  const RUNE_TOPICS = Object.freeze(["me", "love", "work", "money"]); // data.js rune.topics의 키 (문구 아님)
  const SIBYL_TOPICS = Object.freeze(["exam", "love", "work", "relation", "self"]); // data.js sibyl.topics의 키
  const R_FIELDS = [
    ["ogham", 20 + 1], ["star", 27 + 1], ["decan", 36 + 1], ["tzolkin", 13 * 20 + 1],
    ["rune", 24 * 24 * 24 + 1], ["runeTopic", RUNE_TOPICS.length + 1],
    ["sibyl", 32 + 1], ["sibylTopic", SIBYL_TOPICS.length + 1],
  ];
  const looksResume = (input) => /^S[O0]G/.test(String(input || "").toUpperCase().replace(/[^0-9A-Z]/g, ""));
  const looksReceipt = (input) => /^S[O0][1IL]/.test(String(input || "").toUpperCase().replace(/[^0-9A-Z]/g, ""));
  // 강제 순서(결정 37): 값이 있는 방은 Ⅰ부터 빠짐없이 이어져야 한다
  const inOrder = (c) => {
    const has = CHAPTER_ORDER.map((r) => c[r] != null);
    return has[0] && has.every((h, i) => !h || i === 0 || has[i - 1]);
  };
  // codes: { ogham, star, decan, sibyl: 번호|null, tzolkin:{number,sign}|null, rune:[i,i,i]|null, runeTopic, sibylTopic: 주제 키|null }
  function resumeEncode(c) {
    if (!inOrder(c)) throw new Error("ResumeCode: 방 순서");
    const d = toDigits(Object.assign({ arch: ARCHETYPES[0], band: 0 }, c));
    d.runeTopic = c.rune ? RUNE_TOPICS.indexOf(c.runeTopic) + 1 : 0;
    d.sibylTopic = c.sibyl != null ? SIBYL_TOPICS.indexOf(c.sibylTopic) + 1 : 0;
    if ((c.rune && !d.runeTopic) || (c.sibyl != null && !d.sibylTopic)) throw new Error("ResumeCode: 주제");
    let n = 0n;
    for (const [name, radix] of R_FIELDS) {
      const v = d[name];
      if (!Number.isInteger(v) || v < 0 || v >= radix) throw new Error("ResumeCode: 범위 밖 " + name);
      n = n * BigInt(radix) + BigInt(v);
    }
    let payload = "";
    for (let i = 0; i < R_PAYLOAD_LEN; i++) {
      payload = ALPHA[Number(n % 32n)] + payload;
      n /= 32n;
    }
    return R_PREFIX + payload + checkChar(payload);
  }
  // 해독: { codes } 또는 { error: "receipt"(영수증 코드를 넣음) | "shape"(모양·검사 글자·범위) | "order"(방 순서) }
  function resumeDecode(input) {
    if (looksReceipt(input)) return { error: "receipt" };
    let s = String(input || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (!/^S[O0]G[1IL]/.test(s)) return { error: "shape" };
    s = R_PREFIX + s.slice(4).replace(/O/g, "0").replace(/[IL]/g, "1");
    if (s.length !== R_LEN || [...s.slice(4)].some((ch) => val(ch) < 0)) return { error: "shape" };
    const payload = s.slice(4, R_LEN - 1);
    if (checkChar(payload) !== s[R_LEN - 1]) return { error: "shape" };
    let n = 0n;
    for (const ch of payload) n = n * 32n + BigInt(val(ch));
    const d = {};
    for (let i = R_FIELDS.length - 1; i >= 0; i--) {
      const [name, radix] = R_FIELDS[i];
      d[name] = Number(n % BigInt(radix));
      n /= BigInt(radix);
    }
    if (n !== 0n) return { error: "shape" };
    const all = fromDigits(Object.assign({ arch: 0, band: 0, partner: 0, relOgham: 0, relDecan: 0, relTzolkin: 0 }, d));
    const codes = {
      ogham: all.ogham, star: all.star, decan: all.decan, tzolkin: all.tzolkin, rune: all.rune, sibyl: all.sibyl,
      runeTopic: d.runeTopic ? RUNE_TOPICS[d.runeTopic - 1] : null,
      sibylTopic: d.sibylTopic ? SIBYL_TOPICS[d.sibylTopic - 1] : null,
    };
    // 주제는 그 방이 있을 때만, 룬 세 돌은 서로 달라야 한다(앱이 만들 수 없는 값 = 오타·위조)
    if (Boolean(codes.rune) !== Boolean(codes.runeTopic) || (codes.sibyl != null) !== Boolean(codes.sibylTopic)) return { error: "shape" };
    if (codes.rune && new Set(codes.rune).size !== 3) return { error: "shape" };
    if (!roomsOf(codes).length) return { error: "shape" };
    if (!inOrder(codes)) return { error: "order" };
    return { codes };
  }
  const Resume = { encode: resumeEncode, decode: resumeDecode, looksResume, looksReceipt, pretty, PREFIX: R_PREFIX, LEN: R_LEN, FIELDS: R_FIELDS, RUNE_TOPICS, SIBYL_TOPICS };

  const api = { encode, decode, normalize, groups, pretty, roomsOf, ARCHETYPES, ROOMS, CHAPTER_ORDER, FIELDS, LEN, Resume };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PayCode = api;
})(typeof window !== "undefined" ? window : globalThis);
