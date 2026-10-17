// 16단계 H3: 친구 궁합 지도 화면 e2e (spec 16-7 e2e 1~9, 16-9 합격 1~10·13·14 중 화면 쪽). 헤드리스 Edge(cdp.js), 브라우저 두 개(주인 A · 친구 B = 다른 기기).
// 준비: node tools/build-dist.js ; node tools/strange-oracle/mock-server.js --port 8788 --mode test
//       off(배포판) 확인용 서버는 이 시험이 직접 띄우고 끈다: mock-server.js --port 8792 --mode off
// 실행: node tools/strange-oracle/e2e-map.js   → 결과 tools/strange-oracle/out/e2e-map.txt (약 2분)
// e2e는 127.0.0.1로 연다(모의 지도 서버 ALLOWED_ORIGIN). 시작할 때 /__dev/map-switch?limits=reset, /__dev/map-store?clear=1
// A 브라우저는 data.js 응답에서 GA4 ID를 시험값으로 바꾸고 구글 스크립트 요청은 막는다 → dataLayer로 분석 인자를 검사한다(6장).
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const C = require("../../products/strange-oracle/map.js");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const OFF = "http://127.0.0.1:8792";
const P = "/products/strange-oracle/index.html";
const out = [];
const check = (name, ok, extra = "") => {
  const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`;
  out.push(l);
  console.log(l);
};
const sw = (q) => fetch(`${TEST}/__dev/map-switch?${q}`).then((r) => r.json());
const store = () => fetch(`${TEST}/__dev/map-store`).then((r) => r.json());
const SEND_KEYS = { create: "icon,main,nick,sub", join: "icon,invite,main,nick,sub", peek: "invite", view: "key" };
const ERASE_KEYS = ["act,key", "act,key,rid", "act,del"];

async function browser(port, ga) {
  const b = await launch({ port, reduced: true, width: 360, height: 640 });
  const { sleep, send } = b;
  const ev = async (expr) => {
    for (let i = 0; i < 20; i++) {
      try {
        return await b.evaluate(expr);
      } catch (e) {
        if (!/context|destroyed|navigat|Cannot find/i.test(e.message)) throw e;
        await sleep(150);
      }
    }
    return b.evaluate(expr);
  };
  const intercept = { failMapJs: false };
  b.on(async (m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId, request, responseStatusCode } = m.params;
    try {
      if (/googletagmanager|google-analytics/.test(request.url)) return send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
      if (/\/map\.js$/.test(request.url) && intercept.failMapJs) return send("Fetch.failRequest", { requestId, errorReason: "ConnectionRefused" });
      if (ga && /\/data\.js$/.test(request.url) && responseStatusCode) {
        const r = await send("Fetch.getResponseBody", { requestId });
        const t = (r.base64Encoded ? Buffer.from(r.body, "base64").toString("utf8") : r.body).replace(/analytics:\s*\{\s*ga4:\s*""/, 'analytics: { ga4: "G-E2EMAP0001"');
        return send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/javascript; charset=utf-8" }], body: Buffer.from(t).toString("base64") });
      }
      send("Fetch.continueRequest", { requestId });
    } catch (e) {
      send("Fetch.continueRequest", { requestId }).catch(() => {});
    }
  });
  // 분석 인자 기록: 페이지마다 dataLayer가 새로 생기므로 push를 console.debug("DL …")로도 남긴다(console 검사와 같은 기록)
  if (ga) await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.dataLayer = []; window.dataLayer.push = function () { try { console.debug('DL ' + JSON.stringify(Array.from(arguments[0] || []))); } catch (e) {} return Array.prototype.push.apply(this, arguments); };" });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*googletagmanager*" }, { urlPattern: "*google-analytics*" }, { urlPattern: "*/map.js" }, { urlPattern: "*/data.js", requestStage: "Response" }] });
  const waitFor = async (expr, ms = 8000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try {
        if (await b.evaluate(expr)) return true;
      } catch (e) {
        /* 다시 */
      }
      await sleep(80);
    }
    return false;
  };
  const q = (sel) => JSON.stringify(sel);
  const click = (sel) => ev(`(() => { const el = document.querySelector(${q(sel)}); if (!el) throw new Error("no " + ${q(sel)}); el.click(); return true; })()`);
  const text = (sel) => ev(`(document.querySelector(${q(sel)}) || {}).textContent || ""`);
  const visible = (sel) => ev(`(() => { const el = document.querySelector(${q(sel)}); return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; })()`);
  const active = () => ev("document.querySelector('.screen.is-active')?.id");
  const skip = async (qs) => {
    await b.goto(`${TEST}/__dev/skip?${qs}`);
    return waitFor("!!document.querySelector('.screen.is-active')", 8000);
  };
  const mapReqs = () => b.log.bodies.filter((r) => /\/__dev\/map\//.test(r.url));
  const api = (p, body) => ev(`fetch('/__dev/map/${p}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ${q(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }))`);
  const setNick = (v) => ev(`(() => { const el = document.querySelector('#screen-map-consent [data-js=map-nick]'); el.value = ${q(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  const sendOff = () => ev("document.querySelector('[data-js=map-send]').disabled");
  const confirmOk = async () => {
    await waitFor("document.querySelector('[data-js=map-confirm-dialog]')?.open");
    await click("[data-js=map-confirm-ok]");
    await sleep(500);
  };
  const key = async (k) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: k === "Escape" ? 27 : 0 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: k === "Escape" ? 27 : 0 });
  };
  return Object.assign(b, { ev, waitFor, click, text, visible, active, skip, mapReqs, api, setNick, sendOff, confirmOk, key, intercept });
}
const card = (where = "story") => `[data-js=map-slot-${where}] [data-js=map-card]`;
const cardState = (b, where = "story") => b.ev(`document.querySelector(${JSON.stringify(card(where))})?.dataset.state`);

(async () => {
  await sw("limits=reset&down=0&slow=0&clock=0&cap=default");
  await fetch(`${TEST}/__dev/map-store?clear=1`);
  const A = await browser(9641, true);
  const B = await browser(9642, false);
  const { sleep } = A;
  const keyOf = () => A.ev("localStorage.getItem('strange-oracle-mapkey')");
  try {
    // ── 7(합격 7). 첫 화면: 지도 파일·지도 요청 0
    await A.goto(TEST + P);
    await A.ev("sessionStorage.clear(); localStorage.clear()");
    await A.goto(TEST + P);
    await sleep(800);
    check("합격7 첫 화면 지도 파일(map.js·data-map.js)·지도 요청 0", A.log.requests.filter((r) => /map\.js|\/__dev\/map/.test(r)).length === 0);
    check("입구에 열람 키 없으면 지도 요소 0", (await A.ev("document.querySelectorAll('[data-js=map-slot-hub] > *').length")) === 0);

    // ── 1. 주인: 7/7 → 만들기 → 동의 → 키 카드 → localStorage 키 하나
    await A.skip("rooms=7");
    check("1 결말 아래 지도 카드(나의 이야기 자리) create", await A.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'create'`));
    check("1 중복 id 0(카드 복제 꼬리)", (await A.ev("(() => { const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); return ids.length - new Set(ids).size; })()")) === 0);
    await A.click(`${card()} [data-js=map-create]`);
    check("1 동의 화면", await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-map-consent'"));
    check("합격9 별명 칸 비어 있음 · 동의 체크 꺼짐 · 아이콘 선택 없음", await A.ev("document.querySelector('[data-js=map-nick]').value === '' && !document.querySelector('[data-js=map-agree]').checked && !document.querySelector('input[name=map-icon]:checked')"));
    check("합격9 고지 6항목 + 선택 사항 줄 보임", await A.ev("[...document.querySelectorAll('#screen-map-consent .map-notice dt')].filter((e) => e.getClientRects().length).length === 6 && !!document.querySelector('#screen-map-consent .map-optional').getClientRects().length"));
    check("합격9 보내는 원형 이름 두 개 표시", /전사|현자|연인|반항아|돌봄이|탐험가|창조자|통치자/.test(await A.text("[data-js=map-send-arch]")));
    await A.setNick("별빛토끼");
    await A.click("input[name=map-icon][value=i05]");
    check("1 동의 체크 전 [보내기] 꺼짐", await A.sendOff());
    await A.click("[data-js=map-agree]");
    check("1 동의 뒤 [보내기] 켜짐", !(await A.sendOff()));
    await A.click("[data-js=map-send]");
    check("1 키 카드 열림", await A.waitFor("document.querySelector('[data-js=map-key-dialog]')?.open"));
    const ownerKey = await A.text("[data-js=map-key-value]");
    const inviteUrl = await A.text("[data-js=map-invite-url]");
    const invite = (inviteUrl.split("#join=")[1] || "").trim();
    check("1 열람 키 SOM 모양 · 초대 링크 #join=22자", /^SOM(-[0-9A-Z]{1,4}){7}$/.test(ownerKey) && C.INVITE_RE.test(invite), inviteUrl.replace(invite, "…"));
    check("1 [지도 보러 가기] 체크 전 꺼짐", await A.ev("document.querySelector('[data-js=map-key-close]').disabled"));
    await A.key("Escape");
    await sleep(300);
    check("1 체크 전 Esc로 닫히지 않음", await A.ev("document.querySelector('[data-js=map-key-dialog]').open"));
    await A.click("[data-js=map-key-ack]");
    await A.click("[data-js=map-key-close]");
    check("1 지도 화면(친구 0명 empty)", await A.waitFor("document.querySelector('#screen-map')?.dataset.state === 'empty' && document.querySelector('.screen.is-active')?.id === 'screen-map'"));
    check("1 localStorage는 strange-oracle-mapkey 하나 = SOM 키", await A.ev(`Object.keys(localStorage).join() === 'strange-oracle-mapkey' && localStorage.getItem('strange-oracle-mapkey') === ${JSON.stringify(ownerKey)}`));

    // ── 2·9. 친구: #join= → 초대 띠 → 3/7 참여 불가 → 7/7 → 동의(별명 막기) → 결과·삭제 코드
    await B.goto(TEST + P);
    const h0 = await B.ev("history.length");
    await B.goto(inviteUrl);
    check("2 초대 띠 invited + 주인 별명", await B.waitFor("document.querySelector('[data-js=map-invite]')?.dataset.state === 'invited'") && (await B.text("[data-js=map-invite]")).includes("별빛토끼"));
    check("9 #join 뒤 주소에 해시 없음 · history 길이 +1(새 기록 없음) · 입구", (await B.ev("location.hash")) === "" && (await B.ev("history.length")) === h0 + 1 && (await B.active()) === "screen-hub");
    check("2 초대 ID는 sessionStorage join에만", (await B.ev("JSON.parse(sessionStorage.getItem('strange-oracle-map')||'{}').join")) === invite);
    await B.skip(`rooms=3&join=${invite}`);
    check("2 3/7: 참여 불가 안내(locked-join) + [다음 방으로]", await B.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'locked-join'`) && (await B.visible(`${card()} [data-js=map-card-next]`)));
    await B.skip(`rooms=7&join=${invite}`);
    check("2 7/7: 참여 카드(join)", await B.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'join'`));
    await B.click(`${card()} [data-js=map-join]`);
    check("2 친구 동의 화면(role friend)", await B.waitFor("document.querySelector('#screen-map-consent.is-active')?.dataset.role === 'friend'"));
    await B.click("input[name=map-icon][value=i11]");
    await B.click("[data-js=map-agree]");
    const joinsBefore = B.mapReqs().filter((r) => /\/join$/.test(r.url)).length;
    for (const [nick, kind] of [["테스트", "name"], ["테스트곰", "name"], ["스트별", "name"], ["별0325", "birth"], ["곰325", "birth"]]) {
      await B.setNick(nick);
      const err = await B.text("[data-js=map-nick-error]");
      check(`9 별명 "${nick}" 막힘(${kind}) · [보내기] 꺼짐 · 안내`, (await B.sendOff()) && (await B.visible("[data-js=map-nick-error]")) && err.length > 0);
    }
    check("9 막힌 별명은 지도 요청 0", B.mapReqs().filter((r) => /\/join$/.test(r.url)).length === joinsBefore);
    await B.setNick("달빛여우");
    await B.click("[data-js=map-send]");
    check("2 친구 결과 카드", await B.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-map-friend'"));
    const delCode = await B.text("[data-js=map-del-value]");
    const friendScore = await B.text("#screen-map-friend [data-js=map-match-score]");
    check("2 삭제 코드 SOD · 점수 40~99", /^SOD(-[0-9A-Z]{1,4}){7}$/.test(delCode) && +friendScore >= 40 && +friendScore <= 99, friendScore);
    check("2 삭제 코드는 sessionStorage del에만, localStorage 0", (await B.ev("JSON.parse(sessionStorage.getItem('strange-oracle-map')||'{}').del")) === delCode && (await B.ev("localStorage.length")) === 0);
    check("2 친구 카드 아래 면책 문구", (await B.text("[data-js=map-friend-disclaimer]")).includes("재미로 보는 콘텐츠"));

    // ── 3·4. 주인 지도: 아이콘·순위·팝업, 점수 같음, 새로고침 두 번 좌표 같음
    const openMap = async () => {
      await A.goto(TEST + P);
      await A.waitFor("!!document.querySelector('[data-js=map-hub-link]')");
      await A.click("[data-js=map-hub-link]");
      return A.waitFor("['ready','empty','notfound','down'].includes(document.querySelector('#screen-map')?.dataset.state) && document.querySelector('.screen.is-active')?.id === 'screen-map'", 10000);
    };
    check("3 입구 작은 링크로 지도 다시 열기(이동·새로고침 뒤 localStorage 키)", await openMap());
    check("3 친구 아이콘 1 · 순위 1 · 인원 1", (await A.ev("document.querySelectorAll('[data-js=map-node]').length")) === 1 && (await A.ev("document.querySelectorAll('[data-js=map-rank-row]').length")) === 1 && (await A.text("[data-js=map-count]")) === "1");
    check("3 순위 점수 = 친구 카드 점수", (await A.text("[data-js=map-rank-row] .map-rank__score")) === friendScore, friendScore);
    await A.click("[data-js=map-rank-row]");
    await A.waitFor("document.querySelector('[data-js=map-pop-dialog]')?.open");
    check("3 팝업: 점수·다섯 축·한 줄 자리·[이 친구 지우기]", (await A.text("[data-js=map-pop-dialog] [data-js=map-match-score]")) === friendScore && (await A.ev("[...document.querySelectorAll('[data-js=map-pop-dialog] [data-js=map-bar-val]')].filter((e) => /^\\d+$/.test(e.textContent)).length")) === 5 && (await A.ev("!!document.querySelector('[data-js=map-pop-dialog] [data-js=map-match-pairline]')")) && (await A.visible("[data-js=map-pop-erase]")));
    check("13 상세 궁합 줄: test·결제 전 → 가격 없는 한 줄만", (await A.visible("[data-js=map-pop-dialog] [data-js=map-deep-free]")) && !(await A.visible("[data-js=map-pop-dialog] [data-js=map-deep-paid]")));
    check("13 지도·팝업·순위·친구 카드에 가격·결제 버튼·광고 0", !(await A.ev("[...document.querySelectorAll('#screen-map, [data-js=map-pop-dialog]')].some((s) => /\\d[\\d,]*\\s*원(?!형)/.test(s.textContent) || s.querySelector('[data-js*=pay], [data-js*=ad-], .ad-slot, ins'))")) && !(await B.ev("/\\d[\\d,]*\\s*원(?!형)/.test(document.querySelector('#screen-map-friend').textContent) || !!document.querySelector('#screen-map-friend [data-js*=pay], #screen-map-friend .ad-slot')")));
    await A.click("[data-js=map-pop-close]");
    check("합격 지도 아래 면책 문구", (await A.text("[data-js=map-disclaimer]")).includes("재미로 보는 콘텐츠"));
    const coords = () => A.ev("[...document.querySelectorAll('[data-js=map-node]')].map((n) => n.dataset.id + n.style.getPropertyValue('--x') + ',' + n.style.getPropertyValue('--y')).join('|')");
    const c1 = await coords();
    await openMap();
    const c2 = await coords();
    await openMap();
    const c3 = await coords();
    check("합격4 새로고침 두 번 좌표 같음", c1 && c1 === c2 && c2 === c3, c1);

    // ── 4. 지우기·관리
    await B.click("[data-js=map-leave]");
    await B.confirmOk();
    check("4 친구 [내 기록 지우기] → 저장소에서 즉시 사라짐", (await store()).friends.length === 0);
    await openMap();
    check("4 주인 지도에서 사라짐(empty)", (await A.ev("document.querySelector('#screen-map').dataset.state")) === "empty");
    const j2 = await B.api("join", { invite, nick: "구름곰", icon: "i12", main: "sage", sub: "lover" });
    await openMap();
    await A.click("[data-js=map-rank-row]");
    await A.waitFor("document.querySelector('[data-js=map-pop-dialog]')?.open");
    await A.click("[data-js=map-pop-erase]");
    await A.confirmOk();
    check("4 주인 친구 지우기 → 저장소에서 즉시 사라짐", j2.status === 200 && (await store()).friends.length === 0);
    await A.click("[data-js=map-invite-close]");
    await A.confirmOk();
    check("4 초대 닫기 → peek 404 · 참여 409", (await B.api("peek", { invite })).status === 404 && (await B.api("join", { invite, nick: "닫힘곰", icon: "i01", main: "rebel", sub: "rebel" })).status === 409);
    await B.goto(TEST + P);
    await B.ev("sessionStorage.removeItem('strange-oracle-map')");
    await B.goto(inviteUrl);
    check("4 닫힌 초대 링크 → 띠 closed(이유 없음), 평소 입구", await B.waitFor("document.querySelector('[data-js=map-invite]')?.dataset.state === 'closed'") && (await B.active()) === "screen-hub");
    check("4 초대 닫은 지도: 복사·공유 숨고 닫힘 한 줄", await A.ev("document.querySelector('[data-js=map-invite-box]').classList.contains('is-closed')"));
    await A.click("[data-js=map-invite-rotate]");
    await A.confirmOk();
    const invite2 = (await store()).maps[0].invite;
    check("4 초대 링크 바꾸기 → 옛 링크 참여 불가 · 새 링크 참여 가능", invite2 !== invite && (await B.api("peek", { invite })).status === 404 && (await B.api("join", { invite: invite2, nick: "새곰", icon: "i02", main: "ruler", sub: "sage" })).status === 200);
    await A.click("[data-js=map-key-rotate]");
    await A.confirmOk();
    await A.waitFor("document.querySelector('[data-js=map-key-dialog]')?.open");
    const newKey = await A.text("[data-js=map-key-value]");
    await A.click("[data-js=map-key-ack]");
    await A.click("[data-js=map-key-close]");
    check("4 열람 키 바꾸기 → 옛 키 404 · localStorage 교체", newKey !== ownerKey && (await keyOf()) === newKey && (await B.api("view", { key: ownerKey })).status === 404 && (await B.api("view", { key: newKey })).status === 200);
    await A.click("[data-js=map-forget]");
    await A.confirmOk();
    check("4 이 기기에서 지도 잊기 → localStorage 0", (await A.ev("localStorage.length")) === 0);
    // 지워진 지도의 삭제 코드 → "찾지 못했어요"
    const m2 = await B.api("create", { nick: "지울지도", icon: "i07", main: "warrior", sub: "warrior" });
    const f2 = await B.api("join", { invite: m2.data.invite, nick: "지울친구", icon: "i08", main: "lover", sub: "lover" });
    await B.api("erase", { key: m2.data.key, act: "map" });
    await B.skip("rooms=7");
    await B.waitFor(`!!document.querySelector(${JSON.stringify(card())})`);
    await B.click(`${card()} [data-js=map-del-toggle]`);
    await B.ev(`document.querySelector(${JSON.stringify(card() + " [data-js=map-del-input]")}).value = ${JSON.stringify(f2.data.del)}`);
    await B.click(`${card()} [data-js=map-del-go]`);
    await B.waitFor(`document.querySelector(${JSON.stringify(card() + " [data-js=map-del-error]")}).textContent.length > 0`);
    const delErr = await B.text(`${card()} [data-js=map-del-error]`);
    check("4 지워진 지도의 삭제 코드 → '찾지 못했어요' 문장", delErr.includes("찾지 못했어요"), delErr);
    await B.ev(`document.querySelector(${JSON.stringify(card() + " [data-js=map-del-input]")}).value = "SOP-ABCD"`);
    await B.click(`${card()} [data-js=map-del-go]`);
    check("4 삭제 코드 칸에 SOP → 책 열람 코드 안내(요청 없음)", (await B.text(`${card()} [data-js=map-del-error]`)).includes("열람 코드"));

    // ── 5. 만료(+91일, 주인이 열지 않음) · 31번째 409 · 11번째 429
    await fetch(`${TEST}/__dev/map-store?clear=1`);
    await A.skip("rooms=7");
    await A.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'create'`);
    await A.click(`${card()} [data-js=map-create]`);
    await A.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-map-consent'");
    await A.setNick("만료곰");
    await A.click("input[name=map-icon][value=i03]");
    await A.click("[data-js=map-agree]");
    await A.click("[data-js=map-send]");
    await A.waitFor("document.querySelector('[data-js=map-key-dialog]')?.open");
    await A.click("[data-js=map-key-ack]");
    await A.click("[data-js=map-key-close]");
    const inv3 = (await store()).maps[0].invite;
    await B.api("join", { invite: inv3, nick: "친구곰", icon: "i09", main: "creator", sub: "sage" });
    await sw("clock=+91d");
    await openMap();
    const st5 = await store();
    check("5 친구만 참여·주인이 열지 않은 채 +91일 → 지도 notfound · 저장소 비어 있음", (await A.ev("document.querySelector('#screen-map').dataset.state")) === "notfound" && st5.maps.length === 0 && st5.friends.length === 0);
    await sw("clock=0");
    await A.click("#screen-map [data-js=map-forget]");
    await A.confirmOk();
    const big = await B.api("create", { nick: "가득", icon: "i10", main: "explorer", sub: "rebel" });
    const joinMany = async (inv, n, code) => {
      const res = [];
      for (let i = 0; i < n; i++) {
        if (i % 10 === 0) await sw("limits=reset");
        res.push((await B.api("join", { invite: inv, nick: `친구${i + 1}`, icon: `i${String((i % 24) + 1).padStart(2, "0")}`, main: code.main, sub: code.sub })).status);
      }
      return res;
    };
    const r30 = await joinMany(big.data.invite, 30, { main: "explorer", sub: "rebel" });
    await sw("limits=reset");
    const j31 = await B.api("join", { invite: big.data.invite, nick: "서른하나", icon: "i01", main: "sage", sub: "sage" });
    const vbig = await B.api("view", { key: big.data.key });
    await B.api("erase", { key: big.data.key, act: "friend", rid: vbig.data.friends[0].rid });
    const j31b = await B.api("join", { invite: big.data.invite, nick: "서른하나", icon: "i01", main: "sage", sub: "sage" });
    check("5 30명 뒤 31번째 409, 한 명 지운 뒤 참여 가능", r30.every((s) => s === 200) && j31.status === 409 && j31.data.error === "full" && j31b.status === 200);
    await sw("limits=reset");
    const h = await B.api("create", { nick: "시간", icon: "i11", main: "ruler", sub: "ruler" });
    const r11 = [];
    for (let i = 0; i < 11; i++) r11.push((await B.api("join", { invite: h.data.invite, nick: `시${i}`, icon: "i02", main: "lover", sub: "sage" })).status);
    check("5 한 시간 11번째 참여 429", r11.slice(0, 10).every((s) => s === 200) && r11[10] === 429, r11.join(","));

    // ── 3·검수 권장 2: 30명 지도(같은 코드 친구 10명 이상) — 오각형 안·넘침 없음·겹침 선택 목록·모두 고를 수 있음
    await sw("limits=reset");
    const same = await B.api("create", { nick: "같은결", icon: "i14", main: "lover", sub: "caregiver" });
    await joinMany(same.data.invite, 30, { main: "lover", sub: "caregiver" });
    await A.ev(`localStorage.setItem('strange-oracle-mapkey', ${JSON.stringify(same.data.key)})`);
    await openMap();
    await sleep(500);
    const nodes = await A.ev("[...document.querySelectorAll('[data-js=map-node]')].map((n) => ({ id: n.dataset.id, x: +n.style.getPropertyValue('--x'), y: +n.style.getPropertyValue('--y') }))");
    check("3 30명: 아이콘 30 · 모두 오각형 안", nodes.length === 30 && nodes.every((p) => C.insidePentagon(p, 16)));
    check("3 360×640 가로 넘침 없음 · 순위가 지도 아래", (await A.ev("document.documentElement.scrollWidth <= 360")) && (await A.ev("document.querySelector('[data-js=map-rank]').getBoundingClientRect().top > document.querySelector('[data-js=map-stage]').getBoundingClientRect().bottom")));
    const labels = await A.ev("[...document.querySelectorAll('[data-js=map-node]')].filter((n) => !n.classList.contains('is-label-hidden')).length");
    check("3 이름표: 겹치지 않는 것만 보임(순위에는 30명 모두)", labels > 0 && labels <= 30 && (await A.ev("document.querySelectorAll('[data-js=map-rank-row]').length")) === 30, `${labels}/30`);
    const target = await A.ev(`(() => {
      const ns = [...document.querySelectorAll('[data-js=map-node]')];
      const cs = ns.map((n) => { const r = n.querySelector('.map-ico').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
      for (let i = 0; i < ns.length; i++) {
        const hits = cs.filter((c) => Math.hypot(c.x - cs[i].x, c.y - cs[i].y) <= cs[i].w / 2 + 6).length;
        const top = document.elementFromPoint(cs[i].x, cs[i].y);
        if (hits >= 2 && top && top.closest('[data-js=map-node]')) return { x: cs[i].x, y: cs[i].y, hits };
      }
      return null;
    })()`);
    let pickOk = false, pickRows = 0, allPick = false;
    if (target) {
      await A.ev(`window.scrollTo(0, 0)`);
      const t2 = await A.ev(`(() => { const t = ${JSON.stringify(target)}; return t; })()`);
      await A.send("Input.dispatchMouseEvent", { type: "mousePressed", x: t2.x, y: t2.y, button: "left", clickCount: 1 });
      await A.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: t2.x, y: t2.y, button: "left", clickCount: 1 });
      pickOk = await A.waitFor("document.querySelector('[data-js=map-pick-dialog]')?.open", 3000);
      pickRows = await A.ev("document.querySelectorAll('[data-js=map-pick-row]').length");
      const ids = await A.ev("[...document.querySelectorAll('[data-js=map-pick-row]')].map((r) => r.dataset.id)");
      allPick = ids.length >= 2;
      for (let i = 0; i < ids.length; i++) {
        if (i > 0) await A.ev(`(() => { const d = document.querySelector('[data-js=map-pick-dialog]'); if (!d.open) d.showModal(); })()`);
        await A.click(`[data-js=map-pick-row][data-id="${ids[i]}"]`);
        const ok = await A.waitFor("document.querySelector('[data-js=map-pop-dialog]')?.open", 2000);
        const nm = await A.text("[data-js=map-pop-dialog] [data-js=map-match-name]");
        const want = await A.ev(`document.querySelector('[data-js=map-rank-row][data-id="${ids[i]}"] .map-rank__name').textContent`);
        if (!ok || nm !== want) allPick = false;
        await A.click("[data-js=map-pop-close]");
        await sleep(150);
      }
    }
    check("검수 권장2 같은 코드 30명: 겹친 곳을 누르면 선택 목록 · 모두 고를 수 있음", Boolean(target) && pickOk && allPick, target ? `한 곳 ${target.hits}명 · 목록 ${pickRows}줄` : "겹친 곳 없음");
    await A.ev("localStorage.clear()");

    // ── 6. down·slow: 지도만 쉼, 나머지 정상 / 지도 파일 못 받음
    await A.ev(`localStorage.setItem('strange-oracle-mapkey', ${JSON.stringify(same.data.key)})`);
    await sw("down=1");
    await openMap();
    check("6 down: 지도 화면 쉼 안내", (await A.ev("document.querySelector('#screen-map').dataset.state")) === "down" && (await A.visible("#screen-map .map-down")));
    await A.ev("StrangeOracle.go('hub')");
    await sleep(500);
    const hubOk = (await A.active()) === "screen-hub";
    await A.ev("StrangeOracle.go('rune-result')");
    await sleep(500);
    const roomOk = (await A.active()) === "screen-rune-result";
    await A.ev("StrangeOracle.go('story')");
    await sleep(800);
    check("6 down: 입구·방 결과·나의 이야기 정상", hubOk && roomOk && (await A.active()) === "screen-story");
    await B.skip(`rooms=7&join=${same.data.invite}`);
    await B.ev("StrangeOracle.go('hub')");
    check("6 down: 초대 띠 = 지도 쉼(방은 그대로)", await B.waitFor("document.querySelector('[data-js=map-invite]')?.dataset.state === 'down'"));
    await sw("down=0&slow=0");
    await A.ev("localStorage.clear()");
    // slow=9000: 보내기 8초 시간 초과 → unsure + [다시 보내기], 자동 재전송 없음
    await B.skip(`rooms=7&join=${h.data.invite}`);
    await sw("limits=reset");
    await B.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'join'`);
    await B.click(`${card()} [data-js=map-join]`);
    await B.waitFor("document.querySelector('.screen.is-active')?.id === 'screen-map-consent'");
    await B.setNick("느린곰");
    await B.click("input[name=map-icon][value=i04]");
    await B.click("[data-js=map-agree]");
    await sw("slow=9000");
    const nJoin = B.mapReqs().filter((r) => /\/join$/.test(r.url)).length;
    await B.click("[data-js=map-send]");
    const unsure = await B.waitFor("document.querySelector('#screen-map-consent').dataset.state === 'unsure'", 12000);
    await sleep(2000);
    check("6 slow 9초: 8초 뒤 unsure + [다시 보내기], 자동 재전송 없음", unsure && (await B.text("[data-js=map-send]")).length > 0 && B.mapReqs().filter((r) => /\/join$/.test(r.url)).length === nJoin + 1);
    await sw("slow=0");
    // 지도 파일 자체를 못 받음 → 그 자리에 한 줄만
    B.intercept.failMapJs = true;
    await B.goto(TEST + P);
    await B.ev("sessionStorage.clear()");
    await B.skip("rooms=7");
    await sleep(800);
    check("6 지도 파일 못 받음: 나의 이야기 자리에 map.down 한 줄, 나의 이야기 정상", (await B.active()) === "screen-story" && (await B.text("[data-js=map-slot-story]")).includes("쉬고"));
    B.intercept.failMapJs = false;

    // ── 7·10. 만 14세 미만: 막힘, 요청 0 / 생년월일 없으면 한 번 묻고(메모리만) 막힘
    await B.goto(TEST + P);
    await B.ev("sessionStorage.clear()");
    await B.skip("rooms=7&birth=2013-01-01");
    await B.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'create'`);
    const n7 = B.mapReqs().length;
    await B.click(`${card()} [data-js=map-create]`);
    await sleep(300);
    check("7 만 13세 → 막힘(young) · 지도 요청 0", (await cardState(B)) === "young" && B.mapReqs().length === n7);
    await B.ev("(() => { const s = JSON.parse(sessionStorage.getItem('strange-oracle')); delete s.profile.birth; sessionStorage.setItem('strange-oracle', JSON.stringify(s)); })()");
    await B.goto(TEST + P);
    await B.ev("StrangeOracle.go('story')");
    await B.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'create'`);
    await B.click(`${card()} [data-js=map-create]`);
    const askOk = await B.waitFor(`document.querySelector(${JSON.stringify(card())})?.dataset.state === 'birth'`);
    await B.ev(`document.querySelector(${JSON.stringify(card() + " [data-js=map-birth-input]")}).value = '2015.05.05'`);
    await B.click(`${card()} [data-js=map-birth-go]`);
    await sleep(300);
    check("10 생년월일 없으면 한 번 묻기 → 만 11세 막힘 · 요청 0 · 저장 0", askOk && (await cardState(B)) === "young" && B.mapReqs().length === n7 && !(await B.ev("sessionStorage.getItem('strange-oracle').includes('2015')")));

    // ── 8. off 배포판: 지도 DOM 0, 지도 요청 0, #join=… 평소 입구
    const off = spawn(process.execPath, [path.join(__dirname, "mock-server.js"), "--port", "8792", "--mode", "off"], { stdio: "ignore" });
    await sleep(1500);
    try {
      const n0 = A.log.requests.length;
      await A.goto(OFF + P);
      await sleep(600);
      check("8 off: 지도 DOM 0 · map:on 표지 0", (await A.ev("document.querySelectorAll('[data-js^=map], [data-js^=clear-map], .map-slot').length")) === 0 && !(await A.ev("document.documentElement.outerHTML.includes('map:on')")));
      await A.goto(`${OFF}${P}#join=${invite2}`);
      await sleep(600);
      check("8 off: #join=… → 평소 입구 · 해시 지움", (await A.active()) === "screen-hub" && (await A.ev("location.hash")) === "");
      await A.goto(`${OFF}/__dev/skip?rooms=7`);
      await sleep(900);
      check("8 off: 나의 이야기(7/7)에 지도 카드 0 · 막다른 곳 없음", (await A.active()) === "screen-story" && (await A.ev("document.querySelectorAll('[data-js=map-card]').length")) === 0);
      check("8 off: 지도 파일·지도 서버 요청 0", A.log.requests.slice(n0).filter((r) => /map\.js|\/__dev\/map|workers\.dev/.test(r)).length === 0);
    } finally {
      off.kill();
    }

    // ── 6장 검사 (두 브라우저 전부)
    const all = A.log.bodies.concat(B.log.bodies);
    const mapB = all.filter((r) => /\/__dev\/map\/[a-z]+$/.test(r.url));
    const badShape = mapB.filter((r) => {
      const p = r.url.split("/").pop();
      let o;
      try {
        o = JSON.parse(r.body);
      } catch (e) {
        return true;
      }
      const ks = Object.keys(o).sort().join();
      return p === "erase" ? !ERASE_KEYS.includes(ks) : SEND_KEYS[p] !== ks;
    });
    check("6장 지도 요청 본문 칸 = 16-5의 1 표(보내는 칸 외 0)", mapB.length > 10 && badShape.length === 0, `${mapB.length}건${badShape.length ? " · 틀림 " + badShape[0].url : ""}`);
    const INPUTS = ["테스트", "1995", "0325", "03-25", "1437", "14:37", "\"gender\"", "SOP-", "SOG-", "picks", "sors", "\"nak\"", "\"love\""];
    const urls = A.log.requests.concat(B.log.requests).filter((u) => !/\/__dev\/skip\?/.test(u)).join("\n"); // 지름길 주소(시험 도구)는 뺀다
    const bodies = all.map((r) => r.body).join("\n");
    const hitIn = (t) => INPUTS.filter((w) => t.includes(w));
    check("6장 입력값·코드·방 세부가 요청 URL·본문에 0", hitIn(urls).length === 0 && hitIn(bodies).length === 0, hitIn(urls + bodies).join(","));
    const stRaw = await store();
    // 무작위 ID·해시·시각 칸은 우연히 "1995"·"1437" 같은 숫자를 품을 수 있어 입력값 검색에서 뺀다(사람이 넣은 칸 nick·icon·main·sub만 본다). SOM-·SOD- 원문 검사는 전체에
    const st = JSON.stringify(stRaw, (k, v) => (/^(id|invite|rid|map_id|created|active|joined)$|_hash$|^hour_/.test(k) ? "" : v));
    const stAll = JSON.stringify(stRaw);
    check("6장 /__dev/map-store에 입력값·키·코드 원문 0", hitIn(st).length === 0 && !/SOM-|SOD-/.test(stAll), hitIn(st).join(","));
    check("6장 요청 URL에 열람 키·삭제 코드·초대 ID 0", !/SOM-|SOD-/.test(urls) && !urls.split("\n").some((u) => u.includes(invite) || u.includes(invite2)));
    const dlLines = A.log.console.filter((l) => /^debug: DL /.test(l)).map((l) => l.replace(/^debug: DL /, ""));
    const dl = dlLines.join("\n");
    const events = dlLines.map((l) => JSON.parse(l)).filter((a) => a[0] === "event");
    const mapEv = events.filter((a) => /^map_/.test(a[1]));
    const secrets = ["별빛토끼", "만료곰", "달빛여우", "i05", "i03", invite, invite2, ownerKey, newKey, delCode, "SOM-", "SOD-"];
    check("6장 분석: map_* 행동 이름만(매개변수 없음) · 별명·아이콘·초대 ID·키 0", mapEv.length >= 3 && mapEv.every((a) => !a[2] || Object.keys(a[2]).every((k) => /^(send_to|event_callback|transport_type)$/.test(k))) && !secrets.some((s) => dl.includes(s)), mapEv.map((a) => a[1]).join(","));
    const cons = A.log.console.concat(B.log.console).filter((l) => !/^debug: DL /.test(l)).join("\n");
    check("6장 console에 키·삭제 코드·별명 0", !/SOM-|SOD-/.test(cons) && !["별빛토끼", "달빛여우", "만료곰"].some((s) => cons.includes(s)));
    check("6장 쿠키 0 · 주소에 키·코드 0", (await A.ev("document.cookie")) === "" && !/SOM|SOD/.test(await A.ev("location.href")));
    check("콘솔 오류 0", A.log.errors.concat(B.log.errors).filter((e) => !/googletagmanager|google-analytics|ERR_BLOCKED|ERR_CONNECTION_REFUSED|Failed to load resource|load http.*map\.js/.test(e)).length === 0, A.log.errors.concat(B.log.errors).slice(0, 3).join(" | "));
  } catch (e) {
    check("예외 없이 끝까지", false, e.stack);
  } finally {
    await sw("limits=reset&down=0&slow=0&clock=0&cap=default").catch(() => {});
    await A.close();
    await B.close();
    fs.mkdirSync(OUT, { recursive: true });
    const fails = out.filter((l) => l.startsWith("FAIL")).length;
    out.push(`\n합계: ${out.length - fails} 통과 / ${fails} 실패`);
    fs.writeFileSync(path.join(OUT, "e2e-map.txt"), out.join("\n") + "\n");
    console.log(`\n합계: ${out.length - fails - 1 + 1} 통과 / ${fails} 실패`);
    process.exit(fails ? 1 : 0);
  }
})();
