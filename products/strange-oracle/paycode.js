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

  const api = { encode, decode, normalize, groups, pretty, roomsOf, ARCHETYPES, ROOMS, CHAPTER_ORDER, FIELDS, LEN };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PayCode = api;
})(typeof window !== "undefined" ? window : globalThis);
