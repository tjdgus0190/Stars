// (2026-10-25) 시빌라 질문 읽기: Calc.sibylAsk(묻는 꼴·고민 갈래) + data.js sibyl.ask 문구 검사(금지어·성별어·글 자리)
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { FAIL, GENDER } = require("./punch-words.js");

const P = path.join(__dirname, "..", "..", "products", "strange-oracle");
const win = { crypto: require("crypto").webcrypto };
const ctx = vm.createContext({ window: win, crypto: win.crypto, Uint32Array, Math, Date, String, Number, Array, Object });
for (const f of ["calc.js", "data.js"]) vm.runInContext(fs.readFileSync(path.join(P, f), "utf8"), ctx);
const Calc = win.Calc;
const A = (win.TEXT || ctx.TEXT || vm.runInContext("typeof TEXT !== 'undefined' ? TEXT : null", ctx)).sibyl.ask;

test("묻는 꼴·고민 갈래 찾기", () => {
  const cases = [
    ["이번 시험, 준비한 만큼 해낼 수 있을까요?", "can", "exam"],
    ["이직할지 남을지 고민돼요", "choice", "work"],
    ["그 사람한테 연락이 올까요?", "can", "contact"],
    ["전 남친이랑 다시 만날 수 있을까", "can", "reunite"],
    ["코인 지금 사도 될까요", "can", "money"],
    ["엄마랑 언제쯤 화해할 수 있을까", "when", "family"],
    ["요즘 왜 이렇게 불안하지", "why", "self"],
    ["짝사랑하는 사람한테 어떻게 다가가요", "how", "love"],
    ["병원 가 봐야 할까요", "can", "body"],
    ["유학 갈지 말지", "choice", "move"],
    ["우리 고양이 이름 뭐로 하지", "plain", null],
  ];
  const ask = (q) => JSON.parse(JSON.stringify(Calc.sibylAsk(q, A))); // vm 안에서 만든 객체라 JSON으로 옮겨 비교
  for (const [q, form, concern] of cases) assert.deepStrictEqual(ask(q), { form, concern }, q);
  assert.deepStrictEqual(ask(""), { form: null, concern: null });
});

test("풀이 문구: 금지어·성별어 0, 글 자리는 {key}·{line}·{lens}만", () => {
  const texts = [A.plain, A.other.text, A.other.act, ...A.forms.map((f) => f.text), ...A.concerns.flatMap((c) => [c.text, c.act])];
  for (const t of texts) {
    for (const w of [...FAIL, ...GENDER]) {
      const s = w.ok ? t.replace(new RegExp(w.ok.source, "g"), "") : t;
      assert.ok(!w.re.test(s), `금지 "${w.word}": ${t}`);
    }
    for (const m of t.match(/\{[^}]+\}/g) || []) assert.ok(/^\{(key|line|lens)\}$|^\{(key|line)\|[^/{}]+\/[^/{}]+\}$/.test(m), `모르는 자리 ${m}: ${t}`);
  }
  assert.ok(A.concerns.every((c) => c.text.includes("{line}") || c.text.includes("{key}")), "갈래 문장마다 신탁 열쇠말이나 두루마리를 엮는다");
});
