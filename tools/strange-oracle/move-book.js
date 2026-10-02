// 13단계 (spec 13-5): 옛 유료 문장 api/_paid/*.js → 공개 지연 불러오기 파일 products/strange-oracle/data-book-*.js
// 사용: node tools/strange-oracle/move-book.js          (옮기고 바로 무손실 검사, 실패하면 exit 1)
//       node tools/strange-oracle/move-book.js --check  (쓰지 않고 지금 파일이 원본과 같은지만)
// 다시 돌려도 된다(원본이 바뀌었을 때 다시 옮김). 단, 옮긴 뒤 copywriter가 data-book-*.js를 직접 고쳤다면
// 다시 돌리면 그 수정이 원본 내용으로 덮인다 — 그때는 원본(api/_paid)에도 같은 수정을 넣고 돌리거나 돌리지 않는다.
// 문장 손질 0: 원본 모듈을 require로 읽어 같은 값을 JSON으로 그대로 적는다. data-book-bond.js(새 문구)는 건드리지 않는다.
// 파일 나눔: 방 단위(결과 번호를 파일 이름에 넣지 않음 — 요청 경로로 결과·생일을 좁힐 수 없게).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const PROD = path.resolve(__dirname, "..", "..", "products", "strange-oracle");
const PAID = path.join(PROD, "api", "_paid");
const ROOMS = ["ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const need = (f, k) => {
  const p = path.join(PAID, f);
  delete require.cache[require.resolve(p)];
  return require(p)[k];
};

// 공개 파일 = { 파일 이름: { 전역 이름, 내용, 원본 목록, 설명 } }
function plan() {
  const out = {};
  for (const r of ROOMS) {
    const U = r.toUpperCase();
    out[`data-book-${r}.js`] = {
      global: `BOOK_${U}`,
      value: { full: need(`full-${r}.js`, `PAID_FULL_${U}`), hidden: need(`hidden-${r}.js`, `PAID_HIDDEN_${U}`) },
      from: [`full-${r}.js`, `hidden-${r}.js`],
      what: `책 제1부 ${r} 장: 그 방 모든 결과의 full(Ⅰ장 나머지·Ⅱ·Ⅲ·Ⅳ장) + hidden(숨은 장). 그 방 장 표지를 열 때 불러온다`,
    };
  }
  out["data-book-flow.js"] = { global: "BOOK_FLOW", value: need("timeline.js", "PAID_TIMELINE"), from: ["timeline.js"], what: "시기별 흐름 (원형 8 × 나이 구간 7 = 56). 시기별 흐름 표지를 열 때 불러온다" };
  out["data-book-match.js"] = {
    global: "BOOK_MATCH",
    value: { pairs: need("match.js", "PAID_MATCH"), rooms: need("match-rooms.js", "PAID_MATCH_ROOMS") },
    from: ["match.js", "match-rooms.js"],
    what: "궁합: 원형 쌍 36(pairs) + 방별 관계 10(rooms). 궁합 표지를 열 때 data-book-bond.js와 함께 불러온다. 쌍 본문 문단 쓰임·덮어쓰기는 data-book-bond.js에",
  };
  out["data-book-arch.js"] = {
    global: "BOOK_ARCH",
    value: { open: need("open.js", "PAID_OPEN"), deep: need("deep.js", "PAID_DEEP"), close: need("close.js", "PAID_CLOSE") },
    from: ["open.js", "deep.js", "close.js"],
    what: "여는 글·원형 심층·닫는 글 (원형 8씩). 목차를 처음 열 때 불러온다",
  };
  return out;
}

function render(file, p) {
  return [
    "// ═══════════════════════════════════════════════════════════════════════",
    `// 한 권의 책 문구 — ${p.what}.`,
    "// 문구만, 로직 없음 (CLAUDE.md 3장). 13단계 결정 80: 팔지 않는 무료 책이라 공개 정적 파일로 둔다(장 표지를 열 때만 지연 불러오기).",
    `// 처음 내용은 api/_paid/${p.from.join(", api/_paid/")}를 tools/strange-oracle/move-book.js로 글자 손실 0으로 옮긴 것이다.`,
    "// 이후 문구 수정은 이 파일에서 한다 (api/_paid는 휴면 서버용으로 동결).",
    "// 평문만(HTML 없음, 화면에는 textContent로 넣는다).",
    "// ═══════════════════════════════════════════════════════════════════════",
    `window.${p.global} = ${JSON.stringify(p.value, null, 2)};`,
    "",
  ].join("\n");
}

// 문장 세기: 마침표·물음표·느낌표·말줄임 뒤(닫는 따옴표 포함) 또는 문자열 끝
const sentences = (s) => (String(s).match(/[^.?!…]+(?:[.?!…]+[”’"')\]」』]*|$)/g) || []).map((x) => x.trim()).filter(Boolean);
function tally(v, acc = { strings: 0, chars: 0, sentences: 0 }) {
  if (typeof v === "string") {
    acc.strings++;
    acc.chars += [...v].length;
    acc.sentences += sentences(v).length;
  } else if (Array.isArray(v)) v.forEach((x) => tally(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => tally(x, acc));
  return acc;
}
function loadPublic(file, global) {
  const w = {};
  vm.runInNewContext(fs.readFileSync(path.join(PROD, file), "utf8"), { window: w });
  return w[global];
}

function check(P) {
  const rows = [];
  let ok = true;
  const total = { src: { strings: 0, chars: 0, sentences: 0 }, pub: { strings: 0, chars: 0, sentences: 0 } };
  for (const [file, p] of Object.entries(P)) {
    let pub;
    let same = true;
    try {
      pub = loadPublic(file, p.global);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(pub)), JSON.parse(JSON.stringify(p.value))); // vm 영역 객체라 JSON으로 같은 영역에 옮겨 비교
    } catch (e) {
      same = false;
    }
    const a = tally(p.value);
    const b = pub ? tally(pub) : { strings: 0, chars: 0, sentences: 0 };
    const good = same && a.strings === b.strings && a.chars === b.chars && a.sentences === b.sentences;
    ok = ok && good;
    ["strings", "chars", "sentences"].forEach((k) => ((total.src[k] += a[k]), (total.pub[k] += b[k])));
    rows.push(`${good ? "같음" : "다름"}  ${file.padEnd(22)} 문자열 ${a.strings}/${b.strings} · 문장 ${a.sentences}/${b.sentences} · 글자 ${a.chars}/${b.chars}  (원본/공개)`);
  }
  // 원본 파일 전부가 한 번씩 옮겨졌는지 (빠뜨린 파일 없음)
  const used = Object.values(P).flatMap((p) => p.from).sort();
  const all = fs.readdirSync(PAID).filter((f) => f.endsWith(".js")).sort();
  const covered = JSON.stringify(used) === JSON.stringify(all);
  ok = ok && covered;
  rows.push(`원본 파일 ${all.length}개 중 옮긴 파일 ${used.length}개 ${covered ? "(전부)" : "(빠짐: " + all.filter((f) => !used.includes(f)).join(",") + ")"}`);
  rows.push(`합계: 문자열 ${total.src.strings}/${total.pub.strings} · 문장 ${total.src.sentences}/${total.pub.sentences} · 글자 ${total.src.chars}/${total.pub.chars}`);
  return { ok, rows, total };
}

if (require.main === module) {
  const P = plan();
  if (!process.argv.includes("--check")) for (const [file, p] of Object.entries(P)) fs.writeFileSync(path.join(PROD, file), render(file, p));
  const r = check(P);
  r.rows.forEach((l) => console.log(l));
  console.log(r.ok ? "무손실 확인: 원본 = 공개 파일 (deepEqual · 문장 수 · 글자 수)" : "실패: 원본과 공개 파일이 다르다");
  process.exit(r.ok ? 0 : 1);
}
module.exports = { plan, check, sentences, tally };
