// (12단계 D2) common/ads.js·common/analytics.js 단위 시험. 실제 구글 요청 없음 (가짜 DOM·가짜 googletag·가짜 gtag).
// 실행: node --test "tools/strange-oracle/*.test.js"
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC_ADS = fs.readFileSync(path.join(__dirname, "..", "..", "common", "ads.js"), "utf8");
const SRC_GA = fs.readFileSync(path.join(__dirname, "..", "..", "common", "analytics.js"), "utf8");
const SECRETS = ["김서윤", "1995", "03-25", "14:30", "이준호", "내 일이 잘 풀릴까", "SO7-ABCD-EFGH", "so_20261001_x9", "PAYKEY_TEST_1", "ORDER_TEST_1"];

function el(tag) {
  const cls = new Set();
  return {
    tagName: tag, attrs: {}, children: [], style: {}, text: "",
    classList: { add: (c) => cls.add(c), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c) },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    appendChild(c) { this.children.push(c); return c; },
    set textContent(v) { this.children = []; this.text = v; },
    get textContent() { return this.text; },
  };
}
function env(search = "") {
  const head = el("head");
  const slots = [];
  const root = {
    querySelectorAll(sel) {
      if (sel === "[data-ad]") return slots;
      return slots.filter((s) => s.classList.contains("is-filled"));
    },
  };
  const addSlot = (name) => { const s = el("div"); s.attrs["data-ad"] = name; slots.push(s); return s; };
  const win = { location: { search, origin: "http://127.0.0.1:8788", pathname: "/products/strange-oracle/index.html" } };
  const warns = [];
  const ctx = { window: win, document: { head, createElement: el }, console: { warn: (...a) => warns.push(a.join(" ")), log() {} }, setTimeout, clearTimeout, Date, Promise, Object, Array, String, Number, Boolean, JSON, encodeURIComponent };
  vm.runInNewContext(SRC_ADS + ";" + SRC_GA, ctx);
  return { win, head, root, addSlot, warns, ctx, scripts: () => head.children.filter((c) => c.tagName === "script").map((c) => c.src) };
}
const GOOD = { adsenseClient: "ca-pub-1234567890123456", rewardedUnit: "/1234567/so_unlock", label: "광고", slots: { hub: { net: "adsense", id: "1234567890" }, "result-end": { net: "adsense", id: "2234567890" }, "story-end": { net: "adfit", id: "DAN-xxxx" } } };
const EMPTY = { adsenseClient: "", rewardedUnit: "", slots: { hub: { net: "adsense", id: "" } } };

// 가짜 googletag: mode = granted | closed | empty | null | never | throw
function stubGpt(e, mode) {
  const calls = [];
  const handlers = {};
  const slot = { addService() { return slot; } };
  e.win.googletag = {
    cmd: { push: (f) => setTimeout(f, 0) },
    enums: { OutOfPageFormat: { REWARDED: 4 } },
    pubads: () => ({ addEventListener: (n, h) => (handlers[n] = handlers[n] || []).push(h) }),
    defineOutOfPageSlot: (...a) => { calls.push(["define", ...a]); if (mode === "throw") throw new Error("x"); return mode === "null" ? null : slot; },
    enableServices: () => calls.push(["enable"]),
    destroySlots: () => calls.push(["destroy"]),
    display: (s) => {
      calls.push(["display"]);
      const fire = (n, ev) => (handlers[n] || []).forEach((h) => h(Object.assign({ slot: s }, ev)));
      setTimeout(() => {
        if (mode === "empty") return fire("slotRenderEnded", { isEmpty: true });
        if (mode === "never") return;
        fire("rewardedSlotReady", { makeRewardedVisible: () => calls.push(["visible"]) });
        if (mode === "granted") fire("rewardedSlotGranted", {});
        fire("rewardedSlotClosed", {});
      }, 5);
    },
  };
  return calls;
}
const loadScripts = (e, ok = true) => e.head.children.filter((c) => c.tagName === "script").forEach((s) => (ok ? s.onload && s.onload() : s.onerror && s.onerror()));

test("ads: ID 모두 빈 값 → init false, script 0개, 채움 0, 보상형 unavailable", async () => {
  const e = env();
  assert.strictEqual(e.win.Ads.init(EMPTY), false);
  e.addSlot("hub");
  assert.strictEqual(e.win.Ads.fill(e.root), 0);
  assert.strictEqual(await e.win.Ads.rewarded({ slot: "room-unlock", room: "rune" }), "unavailable");
  assert.deepStrictEqual(e.scripts(), []);
  assert.strictEqual(e.win.Ads.anyConfigured(EMPTY), false);
});

test("ads: 주소에 ?가 있으면 (결제 복귀) 설정이 있어도 아무것도 안 함", async () => {
  const e = env("?pay=success&paymentKey=PAYKEY_TEST_1&orderId=ORDER_TEST_1&amount=5900");
  assert.strictEqual(e.win.Ads.init(GOOD), false);
  e.addSlot("hub");
  assert.strictEqual(e.win.Ads.fill(e.root), 0);
  assert.strictEqual(await e.win.Ads.rewarded({ slot: "room-unlock", room: "rune" }), "unavailable");
  assert.deepStrictEqual(e.scripts(), []);
});

test("ads: 배너 — 한 화면 최대 2개, adfit은 채우지 않음, 애드센스 스크립트 1번, 라벨·is-filled", () => {
  const e = env();
  assert.strictEqual(e.win.Ads.init(GOOD), true);
  const a = e.addSlot("hub"), b = e.addSlot("result-end"), c = e.addSlot("story-end");
  assert.strictEqual(e.win.Ads.fill(e.root), 2);
  assert.ok(a.classList.contains("is-filled") && b.classList.contains("is-filled") && !c.classList.contains("is-filled"));
  assert.strictEqual(a.children[0].className, "ad-slot__label");
  assert.strictEqual(a.children[0].text, "광고");
  assert.strictEqual(e.win.adsbygoogle.length, 2);
  assert.deepStrictEqual(e.scripts(), ["https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"]);
  const e2 = env();
  e2.win.Ads.init(GOOD);
  e2.addSlot("story-end");
  assert.strictEqual(e2.win.Ads.fill(e2.root), 0);
  assert.ok(e2.warns.some((w) => w.includes("애드핏")));
  assert.deepStrictEqual(e2.scripts(), []);
});

test("ads: 배너 스크립트 오류면 접힘(높이 0)", async () => {
  const e = env();
  e.win.Ads.init(GOOD);
  const a = e.addSlot("hub");
  e.win.Ads.fill(e.root);
  loadScripts(e, false);
  await new Promise((r) => setTimeout(r, 5));
  assert.ok(!a.classList.contains("is-filled"));
  assert.strictEqual(a.children.length, 0);
});

test("ads: 모양이 틀린 ID는 쓰지 않음, check가 bad로 알려 줌", () => {
  const bad = { adsenseClient: "pub-123", rewardedUnit: "so_unlock", slots: { hub: { net: "adsense", id: "abc" }, x: { net: "other", id: "1" } } };
  const e = env();
  assert.strictEqual(e.win.Ads.init(bad), false);
  const c = e.win.Ads.check(bad);
  assert.deepStrictEqual([...c.bad].sort(), ["ads.adsenseClient", "ads.rewardedUnit", "ads.slots.hub.id", "ads.slots.x.net"].sort());
  assert.strictEqual(e.win.Ads.check(EMPTY).bad.length, 0);
});

for (const [mode, want] of [["granted", "granted"], ["closed", "closed"], ["empty", "unavailable"], ["null", "unavailable"], ["throw", "unavailable"], ["never", "unavailable"]]) {
  test(`ads: 보상형 가짜 googletag ${mode} → ${want}`, async () => {
    const e = env();
    e.win.Ads.init(Object.assign({}, GOOD, { timeoutMs: 80 }));
    const calls = stubGpt(e, mode);
    const p = e.win.Ads.rewarded({ slot: "room-unlock", room: "rune" });
    // (12단계 QA 권장) 진행 중에 다른 요청이 오면 그 요청은 열지 않는다 — 광고 한 편으로 두 방이 열리지 않게
    assert.strictEqual(await e.win.Ads.rewarded({ slot: "room-unlock", room: "star" }), "closed", "진행 중 두 번째 요청은 closed");
    assert.strictEqual(await p, want);
    assert.deepStrictEqual(e.scripts(), ["https://securepubads.g.doubleclick.net/tag/js/gpt.js"]);
    assert.deepStrictEqual(calls[0], ["define", "/1234567/so_unlock", 4]);
    const all = JSON.stringify(calls);
    SECRETS.forEach((s) => assert.ok(!all.includes(s)));
  });
}

test("ads: gpt.js를 못 받으면 unavailable", async () => {
  const e = env();
  e.win.Ads.init(Object.assign({}, GOOD, { timeoutMs: 5000 }));
  const p = e.win.Ads.rewarded({ slot: "room-unlock", room: "rune" });
  loadScripts(e, false);
  assert.strictEqual(await p, "unavailable");
});

test("analytics: ID 빈 값 → script 0개, track null", () => {
  const e = env();
  assert.strictEqual(e.win.Analytics.init({ ga4: "", events: { so_visit: {} } }), false);
  assert.strictEqual(e.win.Analytics.track("so_visit", {}), null);
  assert.deepStrictEqual(e.scripts(), []);
  assert.strictEqual(e.win.dataLayer, undefined);
});

test("analytics: 주소에 ?가 있으면 init·track 모두 안 함", () => {
  const e = env("?pay=success&paymentKey=PAYKEY_TEST_1&orderId=ORDER_TEST_1");
  assert.strictEqual(e.win.Analytics.init({ ga4: "G-TEST12345", events: { so_visit: {} } }), false);
  assert.strictEqual(e.win.Analytics.track("so_visit", {}), null);
  assert.deepStrictEqual(e.scripts(), []);
});

test("analytics: config 값 고정, 허용 목록 밖 이벤트·속성·값은 버림, 입력값·코드 0건", () => {
  const e = env();
  const events = { so_visit: {}, so_result: { room: ["rune", "star"], archetype: ["warrior"] }, so_resume: { step: ["made", "used", "failed"] } };
  assert.strictEqual(e.win.Analytics.init({ ga4: "G-TEST12345", title: "낯선 점술관", events }), true);
  assert.deepStrictEqual(e.scripts(), ["https://www.googletagmanager.com/gtag/js?id=G-TEST12345"]);
  const cfg = [...e.win.dataLayer].map((a) => [...a]).find((a) => a[0] === "config");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(cfg[2])), { send_page_view: false, page_location: "http://127.0.0.1:8788/products/strange-oracle/index.html", page_title: "낯선 점술관", allow_google_signals: false, allow_ad_personalization_signals: false });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(e.win.Analytics.track("so_result", { room: "rune", archetype: "warrior", name: "김서윤", birth: "1995-03-25", nak: 4 }))), { room: "rune", archetype: "warrior" });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(e.win.Analytics.track("so_result", { room: "김서윤", archetype: "warrior" }))), { archetype: "warrior" });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(e.win.Analytics.track("so_resume", { step: "made", code: "SO7-ABCD-EFGH" }))), { step: "made" });
  assert.strictEqual(e.win.Analytics.track("page_view", { page_location: "x" }), null);
  assert.strictEqual(e.win.Analytics.track("so_unknown", { room: "rune" }), null);
  assert.strictEqual(e.win.Analytics.track("constructor", {}), null);
  e.win.location.search = "?orderId=ORDER_TEST_1";
  assert.strictEqual(e.win.Analytics.track("so_visit", {}), null, "도중에 ?가 생기면 보내지 않음");
  const all = JSON.stringify([...e.win.dataLayer].map((a) => [...a]));
  SECRETS.forEach((s) => assert.ok(!all.includes(s), s));
  assert.ok(![...e.win.dataLayer].some((a) => a[0] === "event" && /^(page_view|scroll|form_|view_search_results)/.test(a[1])));
  assert.strictEqual(e.win.Analytics.init({ ga4: "G-TEST12345", events }), false, "두 번째 init(=config 다시 부르기) 없음");
  assert.strictEqual([...e.win.dataLayer].filter((a) => a[0] === "config").length, 1);
});

test("analytics: 모양이 틀린 측정 ID는 불러오지 않음", () => {
  const e = env();
  assert.strictEqual(e.win.Analytics.init({ ga4: "UA-12345-1", events: {} }), false);
  assert.deepStrictEqual(e.scripts(), []);
});

// ── (광고 측정) 캠페인 utm 허용 목록 — 제안서 strange-oracle-ads 8장 4번 ──
const UTM_ALLOW = {
  utm_source: ["instagram", "tiktok", "kakao", "x", "google"],
  utm_medium: ["paid_social", "organic", "share", "cpc"],
  utm_campaign: ["ad1_seven_doors", "ad2_manshin", "ad3_book", "ad4_busted", "ad5_saju_only", "ad6_untold", "ig_profile", "x_profile", "gads_main", "kakao_share"],
  utm_content: ["ad1_seven_doors", "ad2_manshin", "ad3_book", "ad4_busted", "ad5_saju_only", "ad6_untold", "ig_profile", "ig_story_book", "x_profile", "x_pinned", "gads_main", "kakao_main", "kakao_saju", "kakao_ogham", "kakao_star", "kakao_decan", "kakao_tzolkin", "kakao_rune", "kakao_sibyl"],
};
const UTM_IGNORE = ["fbclid", "ttclid"];

test("analytics utm: 허용 키·값만 정해진 순서로 남긴다", () => {
  const c = env().win.Analytics.campaign;
  assert.strictEqual(c("?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad1_seven_doors&utm_content=ad1_seven_doors", UTM_ALLOW, UTM_IGNORE), "utm_source=instagram&utm_medium=paid_social&utm_campaign=ad1_seven_doors&utm_content=ad1_seven_doors");
  assert.strictEqual(c("?utm_content=ad2_manshin&utm_medium=organic&utm_source=tiktok", UTM_ALLOW, UTM_IGNORE), "utm_source=tiktok&utm_medium=organic&utm_content=ad2_manshin", "순서 고정");
  assert.strictEqual(c("?utm_source=instagram", UTM_ALLOW, UTM_IGNORE), "utm_source=instagram");
  assert.strictEqual(c("?utm_source=instagram&utm_medium=paid_social&fbclid=IwAR_x.y-z", UTM_ALLOW, UTM_IGNORE), "utm_source=instagram&utm_medium=paid_social", "클릭 ID는 값 없이 버림");
  assert.strictEqual(c("?ttclid=E.C.P.abc&utm_source=tiktok", UTM_ALLOW, UTM_IGNORE), "utm_source=tiktok");
});

test("analytics utm: 거부 — 목록 밖 값·다른 키·섞인 쿼리·source 없음", () => {
  const c = env().win.Analytics.campaign;
  ["", "?", "?utm_source=facebook", "?utm_source=instagram&utm_medium=email", "?utm_source=instagram&utm_term=saju",
    "?utm_source=instagram&name=김서윤", "?utm_source=instagram&birth=1995-03-25", "?pay=success&utm_source=instagram",
    "?utm_medium=paid_social", "?utm_source=instagram&utm_source=tiktok", "?utm_source", "?utm_source=", "?utm_source=instagram&",
    "?constructor=x&utm_source=instagram", "?__proto__=x", "?utm_source=hasOwnProperty",
  ].forEach((q) => assert.strictEqual(c(q, UTM_ALLOW, UTM_IGNORE), "", q));
  assert.strictEqual(c("?utm_source=instagram&fbclid=x", UTM_ALLOW), "", "무시 목록이 없으면 클릭 ID도 섞인 쿼리");
  assert.strictEqual(c("?utm_source=instagram", null), "", "허용 목록 없음");
  assert.strictEqual(c("?utm_source=facebook", UTM_ALLOW, ["utm_source"]), "", "utm 키는 무시 목록에 넣어도 검사");
});

test("analytics utm: 대소문자·인코딩", () => {
  const c = env().win.Analytics.campaign;
  ["?utm_source=Instagram", "?UTM_SOURCE=instagram", "?utm_source=INSTAGRAM", "?utm_source=instagram%20", "?utm_source=insta+gram",
    "?utm_source=instagram%00", "?utm_source=%E0%A4", "?utm_source=%", "?utm_source=instagram%26name%3Dx", "?utm_source=instagram#x"].forEach((q) => assert.strictEqual(c(q, UTM_ALLOW, UTM_IGNORE), "", q));
  assert.strictEqual(c("?utm_source=%69nstagram", UTM_ALLOW, UTM_IGNORE), "utm_source=instagram", "디코드 뒤 목록 값과 같으면 목록 값 그대로");
  assert.strictEqual(c("?utm%5Fsource=tiktok", UTM_ALLOW, UTM_IGNORE), "utm_source=tiktok");
  assert.strictEqual(c("?utm_source=bad_but_listed", { utm_source: ["bad_but_listed", "Bad Value"] }), "utm_source=bad_but_listed");
  assert.strictEqual(c("?utm_source=Bad%20Value", { utm_source: ["Bad Value"] }), "", "목록에 있어도 소문자·숫자·밑줄 모양이 아니면 거부");
});

test("analytics utm: init — 허용이면 page_location에 utm만, 거부면 query 없는 주소, 입력값 0건", () => {
  const events = { so_visit: {} };
  let e = env();
  assert.strictEqual(e.win.Analytics.init({ ga4: "G-TEST12345", title: "낯선 점술관", events, utm: { search: "?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad1_seven_doors&fbclid=SECRETCLICK", allow: UTM_ALLOW, ignore: UTM_IGNORE } }), true);
  let cfg = [...e.win.dataLayer].map((a) => [...a]).find((a) => a[0] === "config");
  assert.strictEqual(cfg[2].page_location, "http://127.0.0.1:8788/products/strange-oracle/index.html?utm_source=instagram&utm_medium=paid_social&utm_campaign=ad1_seven_doors");
  assert.ok(!JSON.stringify([...e.win.dataLayer].map((a) => [...a])).includes("SECRETCLICK"));
  e = env();
  e.win.Analytics.init({ ga4: "G-TEST12345", events, utm: { search: "?utm_source=instagram&name=%EA%B9%80%EC%84%9C%EC%9C%A4&birth=1995-03-25", allow: UTM_ALLOW, ignore: UTM_IGNORE } });
  cfg = [...e.win.dataLayer].map((a) => [...a]).find((a) => a[0] === "config");
  assert.strictEqual(cfg[2].page_location, "http://127.0.0.1:8788/products/strange-oracle/index.html");
  const all = JSON.stringify([...e.win.dataLayer].map((a) => [...a]));
  ["김서윤", "1995", "name", "birth", "utm_"].forEach((s) => assert.ok(!all.includes(s), s));
  e = env("?utm_source=instagram");
  assert.strictEqual(e.win.Analytics.init({ ga4: "G-TEST12345", events, utm: { search: "?utm_source=instagram", allow: UTM_ALLOW } }), false, "주소창에 query가 남아 있으면 여전히 시작하지 않음(제품이 먼저 지운다)");
});
