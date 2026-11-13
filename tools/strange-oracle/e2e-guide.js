// (2026-11-13) 안내 페이지 3개·무료 도구 7개·사이드바 e2e. 짧은 주소·검색 태그·표·도구 계산·개인정보(입력값이 주소·저장소·요청에 0)·입구 사이드바.
// 준비: node tools/strange-oracle/mock-server.js --src --port 8788 --mode test
// 실행: node --experimental-websocket tools/strange-oracle/e2e-guide.js → 결과 tools/strange-oracle/out/e2e-guide.txt
"use strict";
const { launch } = require("./cdp.js");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(__dirname, "out");
const TEST = "http://127.0.0.1:8788";
const out = [];
let LOG = null, seenErr = 0;
const check = (name, ok, extra = "") => { const l = `${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  — " + extra : ""}`; out.push(l); console.log(l); if (LOG && LOG.errors.length > seenErr) { console.log("    (이 사이 콘솔 오류) " + LOG.errors.slice(seenErr).join(" | ")); seenErr = LOG.errors.length; } };
// 기대값: 같은 saju.js + 같은 lunar 라이브러리(node 판)
const Saju = require(path.join(ROOT, "products", "strange-oracle", "saju.js"));
Saju.useLibrary(require(path.join(__dirname, "vendor", "lunar.js")));

(async () => {
  const b = await launch({ port: 9691, reduced: true, width: 360, height: 760 });
  const { sleep } = b;
  LOG = b.log;
  const ev = async (e) => { for (let i = 0; i < 25; i++) { try { return await b.evaluate(e); } catch (x) { await sleep(150); } } return b.evaluate(e); };
  const waitFor = async (e, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await b.evaluate(e)) return true; } catch (x) {} await sleep(120); } return false; };
  const setv = (name, v) => ev(`(() => { const f = document.querySelector('[data-js=tool-form]'); const el = f.elements[${JSON.stringify(name)}]; el.value = ${JSON.stringify(String(v))}; return true; })()`);

  // ── 1. 안내 페이지 3개: 짧은 주소·제목·canonical·표·FAQ·JSON-LD·사이드바
  const pages = { saju: 10, vedic: 27, rune: 24 };
  for (const [p, rows] of Object.entries(pages)) {
    await b.goto(`${TEST}/${p}/`);
    await waitFor("document.readyState === 'complete' && !!window.GUIDE");
    const info = await ev(`(() => ({ path: location.pathname, title: document.title, canon: document.querySelector('link[rel=canonical]')?.href, h1: document.querySelector('h1')?.textContent,
      rows: document.querySelectorAll('.gtable li').length, faq: document.querySelectorAll('.gfaq details').length, ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).flat().map((x) => x['@type']),
      intro: [...document.querySelectorAll('.gpage > p')].map((x) => x.textContent).join('').length, nav: document.querySelectorAll('#sidenav a').length, cur: document.querySelector('#sidenav a[aria-current=page]')?.getAttribute('href'),
      cta: document.querySelector('[data-js=to-room]')?.getAttribute('href') }))()`);
    check(`${p}: 짧은 주소 그대로·제목·h1`, info.path === `/${p}/` && /낯선 점술관/.test(info.title) && !!info.h1, `${info.path} · ${info.h1}`);
    check(`${p}: canonical = 짧은 주소`, info.canon === `https://strange-oracle.com/${p}/`, info.canon);
    check(`${p}: 표 ${rows}줄 · FAQ · FAQPage`, info.rows === rows && info.faq >= 3 && info.ld.includes("FAQPage"), `${info.rows}줄 · FAQ ${info.faq} · ${info.ld.join(",")}`);
    check(`${p}: 소개 300자 이상`, info.intro >= 300, `${info.intro}자`);
    check(`${p}: 사이드바 링크·지금 페이지 표시·입구 버튼`, info.nav >= 8 && info.cur === `/${p}/` && info.cta === "/products/strange-oracle/", `${info.nav}개 · ${info.cur}`);
  }
  // 사이드바 여닫기(좁은 화면)
  await ev("document.querySelector('[data-nav=open]').click()");
  await sleep(350);
  const opened = await ev("document.documentElement.classList.contains('nav-open') && document.querySelector('#sidenav').getAttribute('aria-hidden') === 'false'");
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))");
  await sleep(300);
  const closed = await ev("!document.documentElement.classList.contains('nav-open')");
  check("사이드바: ☰로 열고 Esc로 닫힘", opened && closed);
  const noSlash = await fetch(`${TEST}/manse`, { redirect: "manual" });
  check("끝 / 없는 짧은 주소 → / 붙은 주소로", noSlash.status === 301 && /\/manse\/$/.test(noSlash.headers.get("location") || ""), `${noSlash.status} ${noSlash.headers.get("location")}`);

  // ── 2. 무료 만세력: 양력 + 시각 → saju.js와 같은 여덟 글자
  const cases = [
    { y: 1995, m: 3, d: 25, h: 14, mi: 37 },
    { y: 1990, m: 2, d: 4, h: 3, mi: 0 },
  ];
  await b.goto(`${TEST}/manse/`);
  await waitFor("!!window.Saju && !!window.SAJU && !!document.querySelector('[data-js=tool-form]')");
  for (const c of cases) {
    await setv("y", c.y); await setv("m", c.m); await setv("d", c.d); await setv("h", c.h); await setv("mi", c.mi);
    await ev("document.querySelector('[data-js=tool-form] button[type=submit]').click()");
    await waitFor("!document.querySelector('[data-js=tool-result]').hidden", 15000);
    const got = await ev("[...document.querySelectorAll('.gpillar')].map((p) => [...p.querySelectorAll('.gch b')].map((x) => x.textContent).join(''))");
    const want = Saju.compute({ y: c.y, m: c.m, d: c.d, time: { h: c.h, mi: c.mi }, gender: "none" });
    const w = ["hour", "day", "month", "year"].map((k) => want.pillars[k].hanja);
    check(`만세력 ${c.y}-${c.m}-${c.d} ${c.h}:${c.mi} = saju.js`, JSON.stringify(got) === JSON.stringify(w), `${got.join(" ")} / 기대 ${w.join(" ")}`);
    const dm = await ev("document.querySelector('.gdm b')?.textContent");
    check(`  일간 이름 = data-saju`, dm === want.dayStemKo + ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"][want.dayStem], dm);
    await ev("document.querySelector('[data-js=again]').click()");
    await sleep(200);
  }
  // 시각 모름 → 시주 비움
  await setv("y", 2001); await setv("m", 11); await setv("d", 13);
  await ev("(() => { const f = document.querySelector('[data-js=tool-form]'); f.elements.notime.checked = true; f.elements.notime.dispatchEvent(new Event('change')); f.querySelector('button[type=submit]').click(); })()");
  await waitFor("!document.querySelector('[data-js=tool-result]').hidden", 10000);
  const unk = await ev("({ empty: document.querySelectorAll('.gch.empty').length, note: document.querySelector('.gresult .gnote')?.textContent })");
  check("만세력: 시각 모름 → 시주 두 칸 비움 + 안내", unk.empty === 2 && /시주/.test(unk.note || ""), JSON.stringify(unk));
  await ev("document.querySelector('[data-js=again]').click()");
  // 음력: 1995년 음력 2월 25일 → 양력 1995-03-25
  await ev("(() => { const f = document.querySelector('[data-js=tool-form]'); f.querySelector('input[name=cal][value=lunar]').click(); return true; })()");
  await setv("y", 1995); await setv("m", 2); await setv("d", 25); await setv("h", 14); await setv("mi", 37);
  await ev("document.querySelector('[data-js=tool-form] button[type=submit]').click()");
  await waitFor("!document.querySelector('[data-js=tool-result]').hidden", 10000);
  const lun = await ev("({ note: document.querySelector('.gresult .gnote')?.textContent, day: document.querySelectorAll('.gpillar')[1].textContent })");
  const want0 = Saju.compute({ y: 1995, m: 3, d: 25, time: { h: 14, mi: 37 }, gender: "none" });
  check("만세력: 음력 1995-2-25 → 양력 1995-3-25로 계산", /양력 1995년 3월 25일/.test(lun.note || "") && lun.day.includes(want0.pillars.day.hanja[0]), lun.note);
  await ev("document.querySelector('[data-js=again]').click()");
  // 잘못된 날짜
  await ev("(() => { const f = document.querySelector('[data-js=tool-form]'); f.querySelector('input[name=cal][value=solar]').click(); return true; })()");
  await setv("y", 1995); await setv("m", 2); await setv("d", 30); await setv("h", 1); await setv("mi", 0);
  await ev("document.querySelector('[data-js=tool-form] button[type=submit]').click()");
  await sleep(300);
  const bad = await ev("({ err: !document.querySelector('[data-js=tool-error]').hidden, res: document.querySelector('[data-js=tool-result]').hidden })");
  check("만세력: 없는 날짜(2월 30일) → 오류 문구, 결과 없음", bad.err && bad.res);

  // ── 3. 나크샤트라 계산기
  await b.goto(`${TEST}/nakshatra/`);
  await waitFor("!!window.NAKSHATRAS && !!document.querySelector('[data-js=tool-form]')");
  await setv("y", 1995); await setv("m", 3); await setv("d", 25); await setv("h", 14); await setv("mi", 37);
  await ev("document.querySelector('[data-js=tool-form] button[type=submit]').click()");
  const okN = await waitFor("!document.querySelector('[data-js=tool-result]').hidden", 20000);
  const nak = await ev("({ name: document.querySelector('.gnak b')?.textContent, num: document.querySelector('.gnak .num')?.textContent, rows: document.querySelectorAll('.gkv dt').length, names: NAKSHATRAS.map((n) => n.name) })");
  const exp = await ev("(() => { const c = Astro.birthChart(1995, 3, 25, { h: 14, m: 37 }).charts[0]; return { name: NAKSHATRAS[c.nakshatra].name, pada: c.pada }; })()");
  check("나크샤트라: 시각 있음 → 달의 집 하나 + 파다 + 별자리 셋 (astro.js와 같음)", okN && nak.name === exp.name && new RegExp(`${exp.pada}번째 파다`).test(nak.num) && nak.rows === 5, `${nak.name} · ${nak.num}`);
  await ev("document.querySelector('[data-js=again]').click()");
  await setv("y", 2000); await setv("m", 1); await setv("d", 1);
  await ev("(() => { const f = document.querySelector('[data-js=tool-form]'); f.elements.notime.checked = true; f.elements.notime.dispatchEvent(new Event('change')); f.querySelector('button[type=submit]').click(); })()");
  await waitFor("!document.querySelector('[data-js=tool-result]').hidden", 15000);
  const cands = await ev("document.querySelectorAll('.gcands li').length");
  check("나크샤트라: 시각 모름 → 후보 1~3개와 시간대", cands >= 1 && cands <= 3, `${cands}개`);

  // ── 3b. 무료 도구 5개 (마야 탄생일·이집트 데칸·이름 오검·룬 뽑기·시빌라 신탁)
  const submit = () => ev("document.querySelector('[data-js=tool-form] button[type=submit]').click()");
  const resultShown = (ms = 10000) => waitFor("!document.querySelector('[data-js=tool-result]').hidden", ms);
  await b.goto(`${TEST}/tzolkin/`);
  await waitFor("!!window.Calc && !!window.TZOLKIN_SIGNS && !!document.querySelector('[data-js=tool-form]')");
  await setv("y", 2012); await setv("m", 12); await setv("d", 21);
  await submit();
  await resultShown();
  const tz = await ev("({ name: document.querySelector('.gday b')?.textContent, maya: document.querySelector('.gday use')?.getAttribute('href'), sprite: !!document.querySelector('#maya-4'), ajaw: TZOLKIN_SIGNS[19].name, form: !!document.querySelector('[data-js=tool-form] [name=notime]') })");
  check("마야 탄생일: 2012-12-21 = 4 아하우(장주기 13.0.0.0.0) · 마야 숫자 4", tz.name === `4 ${tz.ajaw}` && tz.maya === "#maya-4" && tz.sprite, `${tz.name} · ${tz.maya}`);
  check("마야 탄생일: 시각 칸 없음(날짜만)", !tz.form);

  await b.goto(`${TEST}/decan/`);
  await waitFor("!!window.Calc && !!window.DECANS && !!document.querySelector('[data-js=tool-form]')");
  await setv("y", 1990); await setv("m", 7); await setv("d", 21);
  await submit();
  await resultShown(20000);
  const dc = await ev("({ where: document.querySelector('.gnak b')?.textContent, num: document.querySelector('.gnak .num')?.textContent, want: (() => { const r = Calc.decan(1990, 7, 21); return r.candidates.length ? null : DECANS[r.noon.index].title; })(), title: document.querySelector('.gnak em')?.textContent })");
  check("이집트 데칸: 1990-07-21 = 게자리 세 번째 데칸(12번째) · calc.js와 같은 문구", /게자리의 세 번째 데칸/.test(dc.where || "") && /12번째/.test(dc.num || "") && dc.title === dc.want, `${dc.where} · ${dc.num} · ${dc.title}`);
  // 경계 날: 태양이 그날 안에 데칸을 넘는 날을 calc.js로 찾아 후보 둘이 나오는지
  const edge = await ev("(() => { for (let d = 1; d <= 31; d++) { const r = Calc.decan(2001, 3, d); if (r.candidates.length) return d; } return 0; })()");
  await ev("document.querySelector('[data-js=again]').click()");
  await setv("y", 2001); await setv("m", 3); await setv("d", edge);
  await submit();
  await resultShown(10000);
  const dc2 = await ev("document.querySelectorAll('.gcands li').length");
  check("이집트 데칸: 경계 날 → 후보 둘과 시간대", edge > 0 && dc2 === 2, `2001-3-${edge} · ${dc2}개`);

  const NAME = "김하늘";
  await b.goto(`${TEST}/name-ogham/`);
  await waitFor("!!window.Calc && !!window.OGHAM && !!document.querySelector('[data-js=tool-form]')");
  await submit();
  await sleep(200);
  const og0 = await ev("({ err: !document.querySelector('[data-js=tool-error]').hidden, res: document.querySelector('[data-js=tool-result]').hidden })");
  check("이름 오검: 빈 이름 → 오류 문구, 결과 없음", og0.err && og0.res);
  await setv("name", NAME);
  await submit();
  await resultShown();
  const og = await ev(`(() => { const r = Calc.ogham(${JSON.stringify(NAME)}); return { n: document.querySelectorAll('.gstave li').length, want: r.letters.length, b: document.querySelector('.gnak b')?.textContent, wantB: OGHAM[r.index].name, use: document.querySelector('.gogham use')?.getAttribute('href'), code: OGHAM[r.index].code, latin: document.querySelector('.gresult .gnote')?.textContent }; })()`);
  check("이름 오검: 이름 글자마다 오검 획 · 나무 글자 = calc.js", og.n === og.want && og.n > 0 && (og.b || "").startsWith(og.wantB) && og.use === `#ogham-${og.code}`, `${og.n}자 · ${og.b} · ${og.latin}`);
  const shownName = await ev(`document.querySelector('[data-js=tool-result]').textContent.includes(${JSON.stringify(NAME)})`);
  check("이름 오검: 결과 화면에 이름 원문을 다시 적지 않음", !shownName);

  await b.goto(`${TEST}/rune-draw/`);
  await waitFor("!!window.Calc && !!window.RUNES && !!document.querySelector('[data-js=tool-form]')");
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    if (i === 0) await submit(); else await ev("document.querySelector('[data-js=again]').click()");
    await resultShown();
    seen.add(await ev("document.querySelector('.grune')?.textContent"));
    await sleep(60);
  }
  const allRunes = await ev("RUNES.map((r) => r.glyph)");
  check("룬 한 개 뽑기: 뽑을 때마다 24자 가운데 하나 · [다시 뽑기]로 바로 다시", [...seen].every((g) => allRunes.includes(g)) && seen.size >= 3, `12번에 ${seen.size}종`);

  const Q = "이직을 해도 될까요 비밀고민123";
  await b.goto(`${TEST}/sibyl/`);
  await waitFor("!!window.Calc && !!window.ORACLES && !!document.querySelector('[data-js=tool-form]')");
  await submit();
  await resultShown();
  const sb0 = await ev("({ line: document.querySelector('.gscroll')?.textContent, all: ORACLES.map((o) => o.line) })");
  check("시빌라 신탁: 고민 없이도 두루마리 한 줄(32개 가운데)", sb0.all.includes(sb0.line), sb0.line);
  await ev("document.querySelector('[data-js=again]').click()");
  await setv("question", Q);
  await submit();
  await resultShown();
  const sb = await ev(`({ line: document.querySelector('.gscroll')?.textContent, echo: document.querySelector('[data-js=tool-result]').textContent.includes(${JSON.stringify(Q)}) })`);
  check("시빌라 신탁: 고민을 적어도 한 줄 · 결과에 고민 글을 되풀이하지 않음", !!sb.line && !sb.echo, sb.line);
  await setv("question", "가".repeat(101));
  await submit();
  await sleep(200);
  check("시빌라 신탁: 100자 넘으면 오류 문구", await ev("!document.querySelector('[data-js=tool-error]').hidden"));
  const store2 = await ev("({ url: location.href, ls: JSON.stringify(Object.assign({}, localStorage)), ss: JSON.stringify(Object.assign({}, sessionStorage)), ck: document.cookie })");
  const secret = [NAME, encodeURIComponent(NAME), "비밀고민123", encodeURIComponent("비밀고민123")];
  const leak2 = secret.some((s) => (store2.url + store2.ls + store2.ss + store2.ck).includes(s)) || b.log.requests.some((r) => secret.some((s) => r.includes(s))) || b.log.bodies.some((x) => secret.some((s) => x.body.includes(s)));
  check("개인정보: 이름·고민 글이 주소·저장소·쿠키·요청 본문에 0", !leak2);

  // ── 4. 개인정보: 주소·저장소·쿠키·요청에 입력값 0
  const store = await ev("({ url: location.href, ls: JSON.stringify(Object.assign({}, localStorage)), ss: JSON.stringify(Object.assign({}, sessionStorage)), ck: document.cookie })");
  const leakStore = ["1995", "2000-1-1", "14:37"].some((s) => (store.url + store.ls + store.ss + store.ck).includes(s));
  check("개인정보: 주소·localStorage·sessionStorage·쿠키에 생년월일 0", !leakStore && !/[?]/.test(store.url), store.url);
  const reqLeak = b.log.requests.filter((r) => /1995|19950325|y=1995/.test(r)).concat(b.log.bodies.filter((x) => /1995/.test(x.body)).map((x) => x.url));
  check("개인정보: 요청 주소·본문에 생년월일 0", reqLeak.length === 0, reqLeak.slice(0, 3).join(" | "));

  // ── 5. 입구(index.html): 사이드바 버튼·링크
  await b.goto(`${TEST}/products/strange-oracle/`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub' && !!document.querySelector('.topbar__inner .nav-toggle')", 10000);
  const hub = await ev("({ btn: !!document.querySelector('.topbar__inner .nav-toggle'), links: [...document.querySelectorAll('#sidenav a')].map((a) => a.getAttribute('href')), title: document.title })");
  check("입구: 위 띠에 ☰ 메뉴 · 사이드바에 안내·도구 링크", hub.btn && ["/saju/", "/vedic/", "/rune/", "/manse/", "/nakshatra/", "/tzolkin/", "/decan/", "/name-ogham/", "/rune-draw/", "/sibyl/"].every((h) => hub.links.includes(h)), hub.links.join(" "));
  check("입구: 새 제목(검색어 포함)", /무료 사주풀이/.test(hub.title), hub.title);
  await ev("document.querySelector('.topbar__inner .nav-toggle').click()");
  await sleep(350);
  check("입구: 메뉴 열림", await ev("document.documentElement.classList.contains('nav-open')"));

  const errs = b.log.errors.filter((e) => !/favicon/.test(e));
  check("콘솔 오류 0", errs.length === 0, errs.slice(0, 3).join(" | "));
  const pass = out.filter((l) => l.startsWith("PASS")).length, fail = out.length - pass;
  console.log(`${pass} PASS / ${fail} FAIL`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-guide.txt"), out.join("\n") + `\n${pass} PASS / ${fail} FAIL\n`);
  await b.close();
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
