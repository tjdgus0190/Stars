// 14단계 F4-B1 화면 시험: 만신의 방 흐름 · 순서(만신 → … → 시빌라) · 성별 차이 · SOG2/SOG1·legacy · 광고 0건 · 지연 불러오기.
// 준비: node tools/build-dist.js
//       node tools/strange-oracle/mock-server.js --port 8788 --mode off
// 실행: node tools/strange-oracle/e2e-saju.js
// 결과: 콘솔 PASS/FAIL + tools/strange-oracle/out/saju-result.txt
// 시험 입력값(이름·생일·시각)은 이 파일 안의 가짜 값이다. 만세력 lunar-javascript는 jsdelivr에서 받는다(네트워크 필요).
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const PayCode = require("../../products/strange-oracle/paycode.js");
const ORIGIN = "http://127.0.0.1:8788";
const BASE = ORIGIN + "/products/strange-oracle/index.html";
const SKIP = ORIGIN + "/__dev/skip";
const OUT = path.join(__dirname, "out");
const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const NAME = "가나다";
const out = [];
const check = (name, ok, extra = "") => {
  const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`;
  out.push(l);
  console.log(l);
};
// SOG1(10단계 옛 코드)을 만든다: 옛 필드 8개, 같은 글자표·검사 글자
function sog1(c) {
  const A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const d = { ogham: c.ogham + 1, star: c.star + 1, decan: 0, tzolkin: 0, rune: 0, runeTopic: 0, sibyl: 0, sibylTopic: 0 };
  let n = 0n;
  for (const [name, radix] of PayCode.Resume.LEGACY.FIELDS) n = n * BigInt(radix) + BigInt(d[name]);
  let p = "";
  for (let i = 0; i < 10; i++) {
    p = A[Number(n % 32n)] + p;
    n /= 32n;
  }
  let s = 0;
  for (let i = 0; i < p.length; i++) s += (2 * i + 1) * A.indexOf(p[i]);
  return "SOG1" + p + A[s % 32];
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch({ port: 9617, reduced: true, height: 640 });
  const { evaluate: ev, sleep, log } = b;
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no el " + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const waitFor = async (expr, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(40); } return false; };
  const waitScreen = (id, ms = 9000) => waitFor(`document.querySelector('.screen.is-active')?.id === ${JSON.stringify(id)} && document.querySelector('[data-js=sigil-rise]').classList.contains('is-hidden')`, ms);
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent || ''`);
  const fresh = async () => {
    await b.goto(BASE);
    await ev("sessionStorage.clear(); localStorage.clear()");
    await b.goto(BASE + "?r=" + Date.now());
    await waitScreen("screen-hub");
  };
  // 만신의 방 한 바퀴. gender = m|f|x, time = {h, mi} | null
  async function sajuRun(gender, time = { h: 14, mi: 37 }, y = 1995, m = 3, d = 25) {
    await click("[data-js=hub-cta]");
    await waitScreen("screen-saju-intro");
    await click("[data-js=saju-intro-go]");
    await waitScreen("screen-saju-input");
    await ev(`(() => { const s = (k, v) => { const i = document.querySelector('[data-js=' + k + ']'); i.value = v; i.dispatchEvent(new Event('input')); };
      s('saju-name', ${JSON.stringify(NAME)}); s('saju-year', '${y}'); s('saju-month', '${m}'); s('saju-day', '${d}');
      ${time ? `s('saju-hour', '${time.h}'); s('saju-minute', '${time.mi}');` : `const u = document.querySelector('[data-js=saju-time-unknown]'); u.checked = true; u.dispatchEvent(new Event('change'));`}
      document.querySelector('[data-js=saju-gender-opt][value=${gender}]').click(); })()`);
    await click("[data-js=saju-input-go]");
    const okR = await waitScreen("screen-saju-ritual", 20000);
    // (2026-10-28) 방울 의식: 누를 때마다 한 글자 → 글자 수(8 또는 6)만큼 누른다
    for (let i = 0; i < 8 && (await ev("document.querySelector('#screen-saju-ritual').dataset.stage")) === "rice"; i++) await click("[data-js=saju-bell]");
    await waitFor("document.querySelector('#screen-saju-ritual').dataset.stage === 'gongsu'", 6000);
    await click("[data-js=saju-gongsu-go]");
    return okR && (await waitScreen("screen-saju-result"));
  }
  const makeCode = async () => {
    await ev("StrangeOracle.go('hub')");
    await waitScreen("screen-hub");
    await click("[data-js=resume-make-toggle]");
    return (await txt("[data-js=resume-code]")).replace(/-/g, "");
  };
  const enterCode = async (code) => {
    await fresh();
    await click("[data-js=resume-enter-toggle]");
    await ev(`(() => { const i = document.querySelector('[data-js=resume-input]'); i.value = ${JSON.stringify(code)}; })()`);
    await click("[data-js=resume-go]");
    await waitFor("JSON.parse(sessionStorage.getItem('strange-oracle') || '{}').restored === true", 8000);
  };
  const visits = () => ev("JSON.parse(sessionStorage.getItem('strange-oracle') || '{}').visits || {}");
  const ctaRoom = () => ev("document.querySelector('[data-js=hub-cta]').dataset.room || ''");

  // ═══ 1. 첫 화면: 광고 0건, 방 파일은 아직 받지 않음, Ⅰ 대문이 맨 앞 ═══
  log.requests.length = 0;
  await fresh();
  const src = (await ev("document.documentElement.outerHTML")).replace(/<!--[\s\S]*?-->/g, ""); // 마크업 주석은 designer F6 정리 대상
  check("7: 첫 화면 소스에 adsbygoogle·googletag(광고)·ads.js·잠금 버튼 0건 (19-5: GA4 gtag.js의 googletagmanager는 허용)", !/adsbygoogle|googletag(?!manager)|common\/ads\.js|data-js="unlock|book-unlock/.test(src));
  const adCopy = (src.match(/[^>]{0,30}광고 한 편[^<]{0,10}/g) || []);
  check("7: 첫 화면 소스에 '광고 한 편' — 남은 곳은 data.js 문구(F5 copywriter)뿐", adCopy.every((t) => /책|열려요|열리고/.test(t)), adCopy.length + "곳(F5): " + adCopy.join(" / "));
  await sleep(300);
  const firstReq = log.requests.map((r) => (typeof r === "string" ? r : r.url || "")).join("\n");
  check("14-6: 첫 화면에 여섯 방 문구 파일·astronomy-engine 요청 없음", !/data-(runes|stars|ogham|decans|tzolkin|oracles)\.js|astronomy-engine/.test(firstReq));
  check("1: 주 버튼 = 만신(data-room=saju), Ⅰ 대문 문 보임", (await ctaRoom()) === "saju" && (await ev("!document.querySelector('[data-js=hub-door-saju]').hidden")));
  const doorStates = await ev(`${JSON.stringify(ORDER)}.map(r => r + ':' + ['is-visited','is-next','is-locked'].filter(c => document.querySelector('[data-js=hub-door-' + r + ']').classList.contains(c)).join(''))`);
  check("1: 문 상태 Ⅰ만 is-next, Ⅱ~Ⅶ 잠김", doorStates.join(" ") === "saju:is-next ogham:is-locked star:is-locked decan:is-locked tzolkin:is-locked rune:is-locked sibyl:is-locked", doorStates.join(" "));
  await click("[data-js=hub-door-ogham]");
  await sleep(400);
  check("1: Ⅰ 전에는 Ⅱ 오검에 못 들어감", (await ev("document.querySelector('.screen.is-active').id")) === "screen-hub");
  await waitFor("Boolean(window.SAJU)", 6000);
  check("14-6: 입구가 그려진 뒤 다음 방(만신) 파일을 미리 받음", await ev("Boolean(window.SAJU && window.Saju)"));

  // ═══ 2. 만신의 방 흐름 (남) ═══
  await click("[data-js=hub-cta]");
  await waitScreen("screen-saju-intro");
  await click("[data-js=saju-intro-go]");
  check("2: 채비 화면", await waitScreen("screen-saju-input"));
  const fit = await ev(`(() => { const s = document.querySelector('#screen-saju-input'); const go = s.querySelector('[data-js=saju-input-go]').getBoundingClientRect(); const n = s.querySelector('[data-js=privacy-notice]').getBoundingClientRect();
    return { goBottom: Math.round(go.bottom), noticeAbove: n.top < go.top, overlap: Math.max(0, Math.round(n.bottom - s.querySelector('.cta-dock').getBoundingClientRect().top)), noticeShown: n.height > 0, fields: ['saju-name-field','saju-date-field','saju-time-field','saju-gender-field'].every(k => s.querySelector('[data-js=' + k + ']').getBoundingClientRect().height > 0) }; })()`);
  check("2: 네 칸 + 고지(시작 버튼 위) 보임", fit.fields && fit.noticeShown && fit.noticeAbove, JSON.stringify(fit));
  check("2: 360×640 한 화면에 시작 버튼까지 (실측, F6 확인)", fit.goBottom <= 640, "버튼 아래 끝 " + fit.goBottom + "px");
  out.push(`INFO  고지 아래 끝이 sticky 버튼 띠(cta-dock)에 ${fit.overlap}px 가려짐 (360×640) — designer F6 확인 필요`);
  console.log(out[out.length - 1]);
  await click("[data-js=saju-input-go]");
  check("2: 빈 칸이면 오류 한 줄", (await ev("document.querySelector('[data-js=saju-name-error]').textContent.length > 0")));
  await ev("StrangeOracle.go('hub')");
  await waitScreen("screen-hub");
  check("2: 만신의 방 결과까지 (남, 14:37)", await sajuRun("m"));
  const res = await ev(`(() => { const s = document.querySelector('#screen-saju-result'); const t = s.innerText;
    return { undef: (t.match(/.{0,30}(undefined|NaN|\\{\\w+\\}).{0,10}/) || [''])[0], chars: [...s.querySelectorAll('[data-js=saju-wonguk] .wonguk__char b')].map(b => b.textContent).join(''),
      sum: [...s.querySelectorAll('[data-js=saju-ohaeng-count]')].reduce((a, b) => a + Number(b.textContent), 0), s4: !s.querySelector('[data-js=saju-s4]').classList.contains('is-hidden'),
      s1: s.querySelector('[data-js=saju-s1-body]').textContent.length, s5: s.querySelector('[data-js=saju-s5]').textContent.length, title: s.querySelector('[data-js=result-title]').textContent,
      next: s.querySelector('[data-js=result-next-door]').dataset.room, disc: !s.querySelector('[data-js=disclaimer-slot]') && !/재미로 보는 콘텐츠|중요한 결정의 근거/.test(s.textContent) }; })()`);
  check("4·5: 결과 빈칸·undefined 0, 원국 8글자, 오행 합 8, 대운 단락, S1·S5 채움, 면책 문구 0(19-2)", !res.undef && res.chars.length === 8 && res.sum === 8 && res.s4 && res.s1 > 500 && res.s5 > 50 && res.disc === true, JSON.stringify(res));
  check("떡밥: 다음 문 = Ⅱ 오검", res.next === "ogham");
  const st1 = await ev("JSON.parse(sessionStorage.getItem('strange-oracle'))");
  check("6장: visits.saju = 결과 코드·원형만, profile.gender = m", JSON.stringify(Object.keys(st1.visits.saju).sort()) === '["archetype","code"]' && st1.profile.gender === "m");
  await click("#screen-saju-result [data-js=result-next-door]");
  await waitScreen("screen-ogham-intro");
  check("2: 뒤의 오검 방은 이름을 다시 묻지 않음(저장 값 줄)", (await ev("!document.querySelector('#screen-ogham-intro [data-js=room-saved]').classList.contains('is-hidden')")) && (await txt("#screen-ogham-intro [data-js=room-saved-value]")).includes(NAME));
  await ev("StrangeOracle.go('ogham-input')");
  await waitScreen("screen-ogham-input");
  await ev("StrangeOracle.go('star-input')").catch(() => {});
  // 내 정보 지우기 → 성별 없음
  await click("[data-js=clear-open]");
  await click("[data-js=clear-confirm]");
  await sleep(300);
  const st2 = await ev("JSON.parse(sessionStorage.getItem('strange-oracle') || '{\"profile\":{}}')");
  check("2: 내 정보 지우기 뒤 profile.gender 없음", !st2.profile || st2.profile.gender === undefined);

  // ═══ 3. 경우별 표시 ═══
  await fresh();
  check("4: 시각 모름 + 밝히지 않음 결과", await sajuRun("x", null));
  const unk = await ev(`(() => { const s = document.querySelector('#screen-saju-result'); return { hourUnknown: s.querySelector('[data-pillar=hour]').classList.contains('is-unknown'), note: !s.querySelector('[data-js=saju-hour-note]').classList.contains('is-hidden'),
    sum: [...s.querySelectorAll('[data-js=saju-ohaeng-count]')].reduce((a, b) => a + Number(b.textContent), 0), ask: !s.querySelector('[data-js=saju-s4-ask]').classList.contains('is-hidden') && !!s.querySelector('[data-js=saju-s4-edit]'),
    s4: s.querySelector('[data-js=saju-s4]').classList.contains('is-hidden'), undef: /undefined|NaN/.test(s.innerText) }; })()`);
  check("4: 시각 모름 → 시주 모름·6글자 안내·오행 합 6, 밝히지 않음 → 대운 단락 없음 + 입력 링크", unk.hourUnknown && unk.note && unk.sum === 6 && unk.ask && unk.s4 && !unk.undef, JSON.stringify(unk));
  await fresh();
  await sajuRun("f", null, 2024, 2, 4); // 2024 입춘일, 시각 모름
  const jn = await ev("(() => { const n = document.querySelector('#screen-saju-result [data-js=saju-jeolip-note]'); return { shown: !n.classList.contains('is-hidden'), t: n.textContent }; })()");
  check("4: 입춘일 + 시각 모름 → 년주·월주 안내", jn.shown && /[甲-龥]/.test(jn.t) && !/\{/.test(jn.t), jn.t);
  await fresh();
  await sajuRun("m", { h: 0, mi: 15 }, 2000, 5, 10);
  const day0015 = await ev("[...document.querySelectorAll('#screen-saju-result [data-pillar=day] b')].map(b => b.textContent).join('')");
  await fresh();
  await sajuRun("m", { h: 12, mi: 0 }, 2000, 5, 9);
  const day0509 = await ev("[...document.querySelectorAll('#screen-saju-result [data-pillar=day] b')].map(b => b.textContent).join('')");
  check("4: 한국 시계 00:15 출생 → 일주가 전날과 같음", day0015 === day0509 && day0015.length === 2, `${day0015} / ${day0509}`);

  // ═══ 4. 성별 차이 시험 (14-7의 14) ═══
  const runs = {};
  for (const g of ["m", "f", "x"]) {
    await fresh();
    log.requests.length = 0;
    await ev("(() => { window.__cards = []; ShareCard.share = async (c) => { window.__cards.push(c.toDataURL('image/png')); return 'shared'; }; })()");
    await sajuRun(g);
    await click("#screen-saju-result [data-js=result-share]");
    await waitFor("window.__cards.length === 1", 8000);
    const card = await ev("window.__cards[0] || ''");
    await click("#screen-saju-result [data-js=result-next-door]");
    await waitScreen("screen-ogham-intro");
    const code = await makeCode();
    const ss = await ev("(() => { const o = {}; for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); o[k] = sessionStorage.getItem(k); } const s = JSON.parse(o['strange-oracle']); delete s.profile; o['strange-oracle'] = JSON.stringify(s); return JSON.stringify(o); })()");
    const ls = await ev("JSON.stringify(Object.assign({}, localStorage)) + '|' + document.cookie");
    const reqs = log.requests.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).filter((u) => !/r=\d+/.test(u)).sort().join("\n");
    const gtag = (await ev("JSON.stringify(window.dataLayer || [])")).replace(/"\d{4}-\d\d-\d\dT[^"]*"/g, '"<시각>"'); // (19-5) gtag("js", new Date())의 시각만 빼고 비교
    runs[g] = { card, code, ss, ls, reqs, gtag };
  }
  const same = (k) => runs.m[k] === runs.f[k] && runs.f[k] === runs.x[k];
  check("14: 성별만 바꾼 세 번 — 요청 URL·본문 같음", same("reqs"));
  check("14: gtag 인자 같음", same("gtag"));
  check("14: SOG2 코드 같음", same("code") && /^SOG2/.test(runs.m.code), runs.m.code);
  check("14: 공유 카드 이미지 같음(픽셀)", same("card") && runs.m.card.length > 1000);
  check("14: sessionStorage(profile 제외)·localStorage·쿠키 같음", same("ss") && same("ls"));
  const dec = PayCode.Resume.decode(runs.m.code).codes;
  check("6: 코드를 해독해도 성별·대운 칸이 없음", dec && !Object.keys(dec).some((k) => /gender|daewoon|daeun|direction/.test(k)) && dec.saju >= 1, Object.keys(dec || {}).join(","));

  // ═══ 5. 옛 상태(legacy=1)와 SOG1 ═══
  await b.goto(SKIP + "?legacy=1&to=hub");
  await waitScreen("screen-hub");
  const lv = await visits();
  check("6: legacy=1 → 오검~룬 마침, 다음 방 = Ⅰ 만신", Object.keys(lv).sort().join() === "decan,ogham,rune,star,tzolkin" && (await ctaRoom()) === "saju");
  const legacyArch = await ev("StrangeOracle.currentArchetype()");
  const lcode = await makeCode();
  check("6: 옛 상태에서도 이어가기 코드 만들기 보임·SOG2", /^SOG2/.test(lcode), lcode);
  await enterCode(lcode);
  const lv2 = await visits();
  check("6: 옛 상태 SOG2 → 새 탭 복원: 마친 방·다음 방(만신)·원형 같음", Object.keys(lv2).sort().join() === "decan,ogham,rune,star,tzolkin" && (await ctaRoom()) === "saju" && (await ev("StrangeOracle.currentArchetype()")) === legacyArch);
  const s1 = sog1({ ogham: 2, star: 4 });
  await enterCode(s1);
  const sv = await visits();
  check("6: SOG1(오검·별) 복원 → 그 방 마침, 다음 방 Ⅰ 만신", Object.keys(sv).sort().join() === "ogham,star" && (await ctaRoom()) === "saju", s1);
  const sArch = await ev("StrangeOracle.currentArchetype()");
  const s1code = await makeCode();
  await enterCode(s1code);
  check("6: SOG1 복원 상태에서 SOG2 만들기 → 복원 → 같음", (await ev("StrangeOracle.currentArchetype()")) === sArch && Object.keys(await visits()).sort().join() === "ogham,star");
  // legacy에서 만신을 마치면 다음 방은 Ⅶ 시빌라
  await b.goto(SKIP + "?legacy=1&to=hub");
  await waitScreen("screen-hub");
  await sajuRun("m");
  await ev("StrangeOracle.go('hub')");
  await waitScreen("screen-hub");
  check("6: legacy에서 만신을 마치면 다음 방 = Ⅶ 시빌라", (await ctaRoom()) === "sibyl");
  // 순서가 어긋난 코드 거부
  const bad = await ev(`(() => { const R = PayCode.Resume; const mk = (o) => { try { return R.encode(o); } catch (e) { return 'ERR'; } }; return [mk({ saju: 5, star: 1 }), mk({ star: 1 })]; })()`);
  check("6: 순서 어긋난 코드는 만들 수 없음(만신+오검 빠짐+별, 만신 없음+오검 빠짐+별)", bad.every((x) => x === "ERR"));

  // ═══ 6. rooms=N ═══
  await b.goto(SKIP + "?rooms=7");
  check("rooms=7 → 일곱 방 마친 나의 이야기", await waitScreen("screen-story"));
  const spine = await ev("[...document.querySelectorAll('[data-js=story-chapter]')].map(li => li.dataset.room + (li.classList.contains('is-done') ? '+' : '-')).join(' ')");
  check("나의 이야기 7장 Ⅰ 만신 → Ⅶ 시빌라, 모두 마침", spine === ORDER.map((r) => r + "+").join(" "), spine);
  check("나의 이야기: 빈칸·undefined 0", !(await ev("/undefined|NaN/.test(document.querySelector('#screen-story').innerText)")));
  await b.goto(SKIP + "?rooms=2&to=hub");
  await waitScreen("screen-hub");
  check("rooms=2 → 만신·오검 마침, 다음 방 별", Object.keys(await visits()).sort().join() === "ogham,saju" && (await ctaRoom()) === "star");

  // ═══ 7. 광고 요청 0건 (이 시험 전체) ═══
  const all = log.requests.map((r) => (typeof r === "string" ? r : r.url || "")).join("\n");
  check("7: 광고 주소 요청 0건(googlesyndication·doubleclick·ads.js·adfit)", !/googlesyndication|doubleclick|googletagservices|common\/ads\.js|adfit|kakao.*ad/i.test(all));
  check("콘솔 오류 0", log.errors.length === 0, log.errors.slice(0, 3).join(" | "));

  await b.close();
  const fails = out.filter((l) => l.startsWith("FAIL")).length;
  out.push(`\n${out.length - 0} checks, ${fails} fail`);
  fs.writeFileSync(path.join(OUT, "saju-result.txt"), out.join("\n"));
  console.log(`\n${fails ? "FAIL" : "ALL PASS"} (${out.length - 1} checks, ${fails} fail)`);
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
