// 22단계 e2e: 방 결과 아래 "이 방의 나머지 이야기"(결정 134). 모의 서버 test(가짜 페이앱), 실제 결제 0.
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
// 실행: node tools/strange-oracle/e2e-rest.js   → 결과 tools/strange-oracle/out/e2e-rest.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const PAID = path.join(__dirname, "..", "..", "products", "strange-oracle", "api", "_paid", "book");
const out = [];
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); };
// 유료 원본에서 한 문장(공개 파일·결제 전 화면에 있으면 안 됨)
const paidLine = (file, global, pick) => {
  const w = {};
  new Function("window", fs.readFileSync(path.join(PAID, file), "utf8"))(w);
  return pick(w[global]);
};

(async () => {
  await fetch(`${TEST}/__dev/pay-switch?limits=reset&win=redirect&sdk=ok&store=ok&env=ok`);
  await fetch(`${TEST}/__dev/pay-store?clear=1`);
  const b = await launch({ port: 9682, reduced: true, width: 360, height: 700 });
  const { sleep } = b;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(100); } return false; };
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const rest = () => ev("(() => { const x = document.querySelector('.screen.is-active [data-js=room-rest]'); return x ? { state: x.dataset.state, text: x.innerText, ps: x.querySelectorAll('.room-rest__body p').length, empty: [...x.querySelectorAll('.room-rest__body p')].filter((p) => !p.textContent.trim()).length } : null; })()");
  const skip = async (to, paid = 0) => {
    await b.goto(`${TEST}/__dev/skip?rooms=7&to=${to}&paid=${paid}`);
    await waitFor(`document.querySelector('.screen.is-active')?.id === 'screen-${to}'`);
    await sleep(400);
  };

  // 1. 만신: 무료 — [이어서 읽기] → 함수 book(saju, 코드 없이) → 펼침
  await skip("saju-result");
  let r = await rest();
  check("A1 만신 결과: 나머지 이야기 칸 free · 가격 없음 · [이어서 읽기 · 무료]", r && r.state === "free" && !/[0-9],[0-9]{3}\s*원/.test(r.text) && (await ev("!!document.querySelector('.screen.is-active [data-js=room-rest-read]')")), r && r.state);
  const n0 = b.log.bodies.length;
  await click(".screen.is-active [data-js=room-rest-read]");
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  const sajuReq = b.log.bodies.slice(n0).filter((x) => /\/api\/book/.test(x.url));
  check("A2 펼침: Ⅱ~Ⅳ장·숨은 장 문단(빈 문단 0) · 요청 본문 = pass·file 두 칸, file=saju", r && r.state === "open" && r.ps >= 8 && r.empty === 0 && sajuReq.length === 1 && Object.keys(JSON.parse(sajuReq[0].body)).sort().join() === "file,pass" && JSON.parse(sajuReq[0].body).file === "saju", `${r && r.ps}문단 · ${sajuReq.map((x) => x.body.replace(/"pass":"[^"]*"/, '"pass":"…"')).join(" | ")}`);

  // 2. 오검: 결제 전 잠김 — 장 이름·분량·결제 버튼, 유료 문장 0
  const ogLine = paidLine("book-ogham.js", "BOOK_OGHAM", (x) => x.full[2].event.body[0]);
  const n1 = b.log.bodies.length;
  await skip("ogham-result");
  r = await rest();
  const html = await ev("document.documentElement.outerHTML");
  check("B1 오검 결과(결제 전): locked · 잠긴 줄 5개 · 9,900원 · [모두 열기]·[이미 샀어요]", r && r.state === "locked" && (await ev("document.querySelectorAll('.screen.is-active .room-rest__lock').length")) === 5 && /9,900원/.test(r.text) && (await ev("!!document.querySelector('.screen.is-active [data-js=room-rest-buy]') && !!document.querySelector('.screen.is-active [data-js=room-rest-have]')")), r && r.state);
  check("B2 결제 전 화면에 유료 문장 0 · 함수 book 요청 0", !html.includes(ogLine.slice(0, 30)) && !b.log.bodies.slice(n1).some((x) => /\/api\/book/.test(x.url)));
  await click(".screen.is-active [data-js=room-rest-have]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  await sleep(300);
  check("B3 [이미 샀어요] → 결제 전 화면 · 코드 넣기 칸 펼침", (await ev("document.querySelector('.screen.is-active')?.id")) === "screen-deeper" && (await ev("document.querySelector('[data-js=pass-toggle]')?.getAttribute('aria-expanded')")) === "true");

  // 3. 오검에서 결제 → 가짜 페이앱 → 돌아오면 오검 결과로, 나머지가 바로 열림 + 코드 카드
  await skip("ogham-result");
  await click(".screen.is-active [data-js=room-rest-buy]");
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-deeper'");
  check("C1 [모두 열기] → 결제 전 화면(받는 것·가격·환불 고지 먼저) · 방 이름만 sessionStorage", (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === "ogham");
  await ev("(() => { const a = document.querySelector('[data-js=pay-agree]'); if (!a.checked) a.click(); })()");
  await click("[data-js=pay-buy]");
  await waitFor("location.pathname === '/__dev/payapp/checkout' && !!document.querySelector('[data-act]')", 8000);
  await ev("document.querySelector('[data-act=complete]').click()");
  const back = await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-ogham-result' && document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'", 30000);
  r = await rest();
  check("C2 결제 뒤 오검 결과로 돌아옴 · 나머지 이야기 open(빈 문단 0) · 코드 카드 열림", back && r && r.ps >= 8 && r.empty === 0 && (await ev("!!document.querySelector('[data-js=pay-code-dialog]')?.open")), r && `${r.state} ${r.ps}`);
  check("C3 펼친 글에 유료 문장 있음 · payroom 지워짐", (await ev("document.querySelector('.screen.is-active [data-js=room-rest]').innerText")).includes(ogLine.slice(0, 30)) && (await ev("sessionStorage.getItem('strange-oracle-payroom')")) === null);

  // 4. 결제한 탭: 룬(세 돌 소제목)·시빌라 바로 열림
  await skip("rune-result", 1);
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  check("D1 룬(결제한 탭): 바로 open · 돌 소제목 · 빈 문단 0", r && r.state === "open" && (await ev("document.querySelectorAll('.screen.is-active .room-rest__sub').length")) >= 1 && r.empty === 0, r && r.state);
  await skip("sibyl-result", 1);
  await waitFor("document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state === 'open'");
  r = await rest();
  check("D2 시빌라(결제한 탭): 바로 open · Ⅱ~Ⅳ장·숨은 장", r && r.state === "open" && r.ps >= 6 && r.empty === 0);

  // 5. 함수 book이 응답하지 않으면 그 칸만 안내 + [다시 불러오기], 나머지 화면은 그대로
  await b.send("Network.setBlockedURLs", { urls: ["*/api/book"] }); // 함수 book이 응답하지 않는 상태
  await skip("star-result", 1);
  await waitFor("['fail','locked'].includes(document.querySelector('.screen.is-active [data-js=room-rest]')?.dataset.state)", 8000);
  r = await rest();
  await b.send("Network.setBlockedURLs", { urls: [] });
  check("E1 함수 book 장애: 칸만 안내(fail 또는 locked) · 방 결과 본문은 그대로", r && ["fail", "locked"].includes(r.state) && (await ev("document.querySelector('.screen.is-active [data-js=reading-body]')?.innerText.length > 200")), r && r.state);
  check("E2 콘솔 오류 0", b.log.errors.filter((e) => !/favicon|40[0-9]|50[0-9]|net::|fonts/.test(e)).length === 0, b.log.errors.slice(0, 2).join(" | "));

  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-rest.txt"), out.join("\n") + "\n");
  const fail = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - fail} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("CRASH " + (e && e.stack)); process.exit(1); });
