// (2026-11-13) 안내 페이지 7개·무료 도구 7개·전설 기록 7편·사이드바 e2e. 짧은 주소·검색 태그·표·도구 계산·개인정보(입력값이 주소·저장소·요청에 0)·입구 사이드바.
// 준비: node tools/strange-oracle/mock-server.js --src --port 8788 --mode test
// 실행: node --experimental-websocket tools/strange-oracle/e2e-guide.js → 결과 tools/strange-oracle/out/e2e-guide.txt
"use strict";
const { launch, LS_ONLY_DUST } = require("./cdp.js");
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
  const pages = { saju: 10, vedic: 27, rune: 24, ogham: 20, egypt: 36, maya: 20, oracle: 0 };
  for (const [p, rows] of Object.entries(pages)) {
    await b.goto(`${TEST}/${p}/`);
    await waitFor("document.readyState === 'complete' && !!window.GUIDE");
    const info = await ev(`(() => ({ path: location.pathname, title: document.title, canon: document.querySelector('link[rel=canonical]')?.href, h1: document.querySelector('h1')?.textContent,
      rows: document.querySelectorAll('.gtable li').length, faq: document.querySelectorAll('.gfaq details').length, ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).flat().map((x) => x['@type']),
      intro: [...document.querySelectorAll('.gpage > p')].map((x) => x.textContent).join('').length, nav: document.querySelectorAll('#sidenav a').length, cur: document.querySelector('#sidenav a[aria-current=page]')?.getAttribute('href'),
      cta: document.querySelector('[data-js=to-room]')?.getAttribute('href') }))()`);
    check(`${p}: 짧은 주소 그대로·제목·h1`, info.path === `/${p}/` && /낯선 점술관/.test(info.title) && !!info.h1, `${info.path} · ${info.h1}`);
    check(`${p}: canonical = 짧은 주소`, info.canon === `https://strange-oracle.com/${p}/`, info.canon);
    if (p === "ogham") check("ogham: 표 20줄 모두 오검 획(svg)이 그려짐", await ev("[...document.querySelectorAll('.gtable .g-mark.ogham use')].filter((u) => document.querySelector(u.getAttribute('href'))).length") === 20);
    check(`${p}: 표 ${rows}줄 · FAQ · FAQPage`, info.rows === rows && info.faq >= 3 && info.ld.includes("FAQPage"), `${info.rows}줄 · FAQ ${info.faq} · ${info.ld.join(",")}`);
    check(`${p}: 소개 300자 이상`, info.intro >= 300, `${info.intro}자`);
    check(`${p}: 사이드바 링크·지금 페이지 표시·입구 버튼`, info.nav >= 8 && info.cur === `/${p}/` && info.cta === "/products/strange-oracle/", `${info.nav}개 · ${info.cur}`);
  }

  // ── 1b. 전설 기록: 목록 1 + 일곱 편
  await b.goto(`${TEST}/legends/`);
  await waitFor("document.readyState === 'complete' && !!window.LEGENDS");
  const hubInfo = await ev("({ cards: [...document.querySelectorAll('.glegends a')].map((a) => a.getAttribute('href')), canon: document.querySelector('link[rel=canonical]')?.href, cur: document.querySelector('#sidenav a[aria-current=page]')?.getAttribute('href') })");
  check("전설 기록 목록: 일곱 편 링크 · canonical · 사이드바 표시", hubInfo.cards.length === 7 && hubInfo.canon === "https://strange-oracle.com/legends/" && hubInfo.cur === "/legends/", hubInfo.cards.join(" "));
  let legendOk = 0;
  const legendBad = [];
  for (const href of hubInfo.cards) {
    await b.goto(TEST + href);
    await waitFor("document.readyState === 'complete' && !!document.querySelector('.gstory')");
    const li = await ev(`({ path: location.pathname, canon: document.querySelector('link[rel=canonical]')?.href, story: document.querySelector('.gstory')?.textContent.length, src: document.querySelectorAll('.gsources li').length, faq: document.querySelectorAll('.gfaq details').length,
      guide: document.querySelector('.gtool-link')?.getAttribute('href'), cta: document.querySelector('[data-js=to-room]')?.getAttribute('href'), ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).flat().map((x) => x['@type']), back: [...document.querySelectorAll('.grelated a')].some((a) => a.getAttribute('href') === '/legends/') })`);
    const guideOk = li.guide ? (await fetch(TEST + li.guide)).status === 200 : false;
    if (li.path === href && li.canon === "https://strange-oracle.com" + href && li.story >= 400 && li.src >= 1 && li.faq >= 2 && guideOk && li.cta === "/products/strange-oracle/" && li.ld.includes("Article") && li.back) legendOk++;
    else legendBad.push(href + " " + JSON.stringify(li));
  }
  check("전설 기록 일곱 편: 짧은 주소·canonical·이야기 400자 이상·출처·FAQ·점술 안내 링크·방 버튼·Article·목록으로", legendOk === 7, legendBad.join(" | ") || "7편");
  // ── 1c. (v1-E) 콘텐츠별 광고 착지: 허용 utm만 page_location에 · 모르는 값·다른 키는 버림 · 주소창에서 지움
  for (const [path, camp] of [["/rune-draw/", "c_rune_draw"], ["/legends/rune-poisoned-horn/", "c_legends_rune_poisoned_horn"], ["/today/", "c_today"]]) {
    await b.goto(`${TEST}${path}?utm_source=instagram&utm_medium=paid_social&utm_campaign=${camp}&utm_content=reel_rune&name=%ED%99%8D%EA%B8%B8%EB%8F%99&fbclid=abc`);
    await waitFor("(window.dataLayer || []).some((a) => a[0] === 'config')", 8000);
    const u = await ev("({ loc: ((window.dataLayer || []).find((a) => a[0] === 'config') || [])[2]?.page_location, href: location.href })");
    check(`광고 착지 ${path}: page_location = 주소 + 허용 utm(c_…·reel_…)만 · 이름·클릭 ID 버림 · 주소창 query 지움`, u.loc === `${TEST}${path}?utm_source=instagram&utm_medium=paid_social&utm_campaign=${camp}&utm_content=reel_rune` && u.href === `${TEST}${path}`, `${u.loc} · ${u.href}`);
  }
  await b.goto(`${TEST}/manse/?utm_source=instagram&utm_campaign=not_listed`);
  await waitFor("(window.dataLayer || []).some((a) => a[0] === 'config')", 8000);
  const u2 = await ev("((window.dataLayer || []).find((a) => a[0] === 'config') || [])[2]?.page_location");
  check("광고 착지: 목록에 없는 캠페인 값은 버림(출처만)", u2 === `${TEST}/manse/?utm_source=instagram`, u2);

  // 사이드바 여닫기(좁은 화면)
  await ev("document.querySelector('[data-nav=open]').click()");
  await sleep(350);
  const opened = await ev("document.documentElement.classList.contains('nav-open') && document.querySelector('#sidenav').getAttribute('aria-hidden') === 'false'");
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))");
  await sleep(300);
  const closed = await ev("!document.documentElement.classList.contains('nav-open')");
  check("전체 메뉴: ☰로 열고 Esc로 닫힘", opened && closed);
  // Netlify는 /x 와 /x/를 같은 규칙으로 맞춘다 → 둘 다 같은 페이지(200, 이동 없음), canonical은 / 붙은 주소
  const noSlash = await fetch(`${TEST}/manse`, { redirect: "manual" });
  const slash = await fetch(`${TEST}/manse/`, { redirect: "manual" });
  check("짧은 주소: /manse 와 /manse/ 모두 200(자기 자신으로 도는 이동 없음)", noSlash.status === 200 && slash.status === 200, `${noSlash.status} ${slash.status}`);

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

  // ── 6. (v1-C·v1-F) 별가루 · 오늘의 신탁(날마다 바뀌는 안내자) · 안내자 도감 · 처음 화면
  await b.goto(`${TEST}/stardust/`);
  await waitFor("!!window.Dust && !!document.querySelector('.gwallet')");
  await ev("Dust.clear(); localStorage.removeItem('strange-oracle-dust'); true");
  await b.goto(`${TEST}/`);
  await waitFor("!!window.Dust && !!window.DEX && !!document.querySelector('[data-js=home-today]')");
  const home = await ev("({ path: location.pathname, sub: document.querySelector('[data-js=home-today-sub]').textContent, use: document.querySelector('[data-js=home-today] use').getAttribute('href'), want: DEX.guides.find((g) => g.room === Dust.guideOf()), feats: [...document.querySelectorAll('.gfeat')].map((a) => a.getAttribute('href')), tabs: document.querySelectorAll('.tabbar a').length, cur: document.querySelector('.tabbar a[aria-current=page]')?.getAttribute('href'), canon: document.querySelector('link[rel=canonical]')?.href })");
  check("처음 화면(/): 일곱 개의 문·오늘의 신탁·면담·도감·별가루 다섯 칸 · 아래 탭 5 · 오늘 담당 안내자 표시", home.path === "/" && ["/products/strange-oracle/", "/today/", "/talk/", "/dex/", "/stardust/"].every((h) => home.feats.includes(h)) && home.tabs === 5 && home.cur === "/" && home.sub.includes(home.want.name) && home.use === "#guide-" + home.want.room && home.canon === "https://strange-oracle.com/", JSON.stringify({ sub: home.sub, feats: home.feats, cur: home.cur }));
  await b.goto(`${TEST}/today/`);
  await waitFor("!!window.Dust && !!document.querySelector('[data-js=today-open]')");
  const d0 = await ev("Dust.state().bal");
  const badge0 = await ev("document.querySelector('.dust-badge b')?.textContent");
  check("별가루: 처음 오면 10 · 위 띠 잔액 표시", d0 === 10 && badge0 === "10", `${d0} · ${badge0}`);
  const g0 = await ev("({ name: document.querySelector('.gtoday-hero h2').textContent, want: DEX.guides.find((g) => g.room === Dust.guideOf()).name, tomorrowRoom: Dust.guideOf(new Date(Date.now() + 9 * 3600e3 + 86400e3).toISOString().slice(0, 10)) })");
  check("오늘의 신탁: 오늘 담당 안내자가 맞음(날짜 순환)", g0.name === g0.want, JSON.stringify(g0));
  await ev("document.querySelector('[data-js=today-open]').click(); true");
  await waitFor("!!document.querySelector('.gread')");
  const t1 = await ev("({ name: document.querySelector('.gread > b').textContent, room: Dust.state().oracle.room, bal: Dust.state().bal, toast: document.querySelector('.dust-toast')?.textContent || '', tomorrow: [...document.querySelectorAll('.gnote')].map((x) => x.textContent).find((t) => /내일은/.test(t)) || '' })");
  await b.goto(`${TEST}/today/`);
  await waitFor("!!document.querySelector('.gread')");
  const t2 = await ev("({ name: document.querySelector('.gread > b').textContent, bal: Dust.state().bal })");
  check("오늘의 신탁: 받으면 +5 · 알림 · 다시 와도 같은 신탁·더 주지 않음 · 내일 안내자 예고", t1.bal === 15 && t1.room === (await ev("Dust.guideOf()")) && /\+5/.test(t1.toast) && t2.name === t1.name && t2.bal === 15 && /내일은/.test(t1.tomorrow), `${t1.name} · ${t1.bal}→${t2.bal} · ${t1.tomorrow}`);
  const other = await ev("Dust.TODAY_ORDER.find((r) => r !== Dust.guideOf())");
  const ex0 = await ev("document.querySelectorAll('[data-js=today-extra]').length");
  await ev(`document.querySelector('[data-js=today-extra][data-room=${other}]').click(); true`);
  await waitFor("document.querySelectorAll('.gread').length === 2");
  const t3 = await ev(`({ n: document.querySelectorAll('.gread').length, bal: Dust.state().bal, done: document.querySelector('[data-js=today-extra][data-room=${other}]').disabled })`);
  check("오늘의 신탁: 다른 안내자 6명 중 한 명에게 별가루 3으로 더 받기 · 같은 안내자는 다시 못 받음", ex0 === 6 && t3.n === 2 && t3.bal === 12 && t3.done, JSON.stringify(t3));
  await b.goto(`${TEST}/rune-draw/`);
  await waitFor("!!window.Calc && !!window.Dust && !!document.querySelector('[data-js=tool-form]')");
  await ev("document.querySelector('[data-js=tool-form] button[type=submit]').click(); true");
  await waitFor("!document.querySelector('[data-js=tool-result]').hidden");
  check("무료 도구 결과 → 별가루 없음(운영자 v1-F)", (await ev("Dust.state().bal")) === 12);
  await b.goto(`${TEST}/dex/`);
  await waitFor("!!window.DEX && !!document.querySelector('.gdexgrid')");
  const x0 = await ev("({ locked: document.querySelectorAll('.gdexcard.is-locked').length, fig: [...document.querySelectorAll('.gdexcard .garch use')].filter((u) => document.querySelector(u.getAttribute('href'))).length, img: document.querySelector('.gdexcard .garch').getAttribute('style') })");
  const imgOk = (await fetch(TEST + "/products/strange-oracle/img/dex/dex-saju.webp")).status === 200;
  check("도감: 처음엔 일곱 장 모두 잠김 · 아치 문 실루엣 7 · 명화 배경", x0.locked === 7 && x0.fig === 7 && /dex-saju\.webp/.test(x0.img) && imgOk, JSON.stringify(x0).slice(0, 160));
  await ev("Dust.earn('room', 'rune'); true");
  await sleep(200);
  await ev("document.querySelector('[data-js=dex-card][data-room=rune]').click(); true");
  await sleep(200);
  const x1 = await ev("({ locked: document.querySelectorAll('.gdexcard.is-locked').length, sheet: !!document.querySelector('.gsheet[role=dialog]'), btn: !!document.querySelector('[data-js=dex-open][data-room=rune]'), bal: Dust.state().bal })");
  await ev("document.querySelector('[data-js=dex-open][data-room=rune]').click(); true");
  await sleep(200);
  const x2 = await ev("({ open: !!document.querySelector('.gcard__secret:not(.is-shut)'), bal: Dust.state().bal })");
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true");
  await sleep(150);
  const x3 = await ev("!document.querySelector('.gsheet') && !document.documentElement.classList.contains('sheet-open')");
  check("도감: 룬의 방 완주 → 카드만 열림(별가루 0) · 카드 누르면 펼침 시트 · 숨은 이야기 10 · Esc로 닫힘", x1.locked === 6 && x1.sheet && x1.btn && x1.bal === 12 && x2.open && x2.bal === 2 && x3, `${JSON.stringify(x1)} ${JSON.stringify(x2)} ${x3}`);
  check("도감: 이 기기 localStorage는 별가루 장부뿐(정해진 칸만)", await ev(LS_ONLY_DUST));

  // ── 7. (v1-D·v1-F) 안내자와 면담 — 아치 문을 골라 방(채팅) 안으로. 모의 서버(test)의 가짜 모델. 보내는 칸 · 별가루 10 · 실패 시 돌려주기
  await ev("sessionStorage.setItem('strange-oracle', JSON.stringify({ profile: { name: '테스트이름' }, visits: { saju: { code: 1501, archetype: 'sage' } } })); true");
  await fetch(`${TEST}/__dev/talk-reset`);
  await b.goto(`${TEST}/talk/`);
  await waitFor("!!window.DEX && document.querySelectorAll('[data-js=talk-pick] .garch use').length === 7");
  const shortBtn = await ev("(() => { document.querySelector('[data-js=talk-pick][data-room=saju]').click(); const r = document.querySelector('.groom'); return !!r && /dex-saju/.test(r.getAttribute('style')) && document.documentElement.classList.contains('room-open') && document.querySelector('.groom__send').disabled && Dust.state().bal < 10; })()");
  check("면담: 문을 누르면 방(만신 그림 배경) 안으로 · 별가루가 10보다 적으면 보내기 꺼짐", shortBtn);
  await ev("Dust.refund(30); true");
  await waitFor("!document.querySelector('.groom__send').disabled");
  const k0 = await ev("({ bal: Dust.state().bal, known: document.querySelector('.groom__note').textContent, greet: document.querySelectorAll('[data-js=talk-log] .gsay--guide').length })");
  await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '올해 일은 어떻게 풀어 가면 좋을까요?'; document.querySelector('.groom__send').click(); return true; })()");
  await waitFor("document.querySelectorAll('[data-js=talk-log] .gsay--guide:not(.is-wait)').length === 2 && !document.querySelector('.groom__send').disabled", 10000);
  const k1 = await ev("({ a: [...document.querySelectorAll('[data-js=talk-log] .gsay--guide p')].pop().textContent, me: document.querySelectorAll('[data-js=talk-log] .gsay--me').length, bal: Dust.state().bal })");
  const sent = b.log.bodies.filter((x) => x.url.endsWith("/api/talk")).map((x) => JSON.parse(x.body));
  const last = await (await fetch(`${TEST}/__dev/talk-last`)).json();
  check("면담: 첫인사 → 결과 안내 · 질문 말풍선 · 답이 옴 · 별가루 10 씀", k0.greet === 1 && /결과를 바탕으로/.test(k0.known) && k1.me === 1 && /만신이 답해요/.test(k1.a) && k1.bal === k0.bal - 10, `${k0.bal}→${k1.bal} · ${k1.a.slice(0, 30)}`);
  check("면담: 보낸 칸은 room·r·q·hist뿐 · 결과는 번호만(일간 3) · 이름·생일 없음", sent.length === 1 && Object.keys(sent[0]).sort().join() === "hist,q,r,room" && JSON.stringify(sent[0].r) === '{"s":3}' && !JSON.stringify(sent[0]).includes("테스트이름") && !JSON.stringify(last).includes("테스트이름"), JSON.stringify(sent[0]));
  await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '__fail 두 번째 질문'; document.querySelector('.groom__send').click(); return true; })()");
  await waitFor("!document.querySelector('[data-js=talk-error]')?.hidden", 8000);
  const k2 = await ev("({ bal: Dust.state().bal, err: document.querySelector('[data-js=talk-error]').textContent, kept: document.querySelector('.groom textarea').value })");
  const sent2 = b.log.bodies.filter((x) => x.url.endsWith("/api/talk")).map((x) => JSON.parse(x.body));
  check("면담: 실패하면 별가루 돌려줌 · 오류 안내 · 쓴 질문은 칸에 남김 · 앞선 문답 1개 함께 보냄", k2.bal === k1.bal && /돌려드렸어요/.test(k2.err) && k2.kept === "__fail 두 번째 질문" && sent2.length === 2 && sent2[1].hist.length === 1, JSON.stringify(k2));
  await ev("document.querySelector('[data-js=talk-leave]').click(); true");
  check("면담: ← 로 방에서 나오면 문 고르기로", await ev("!document.querySelector('.groom') && !document.documentElement.classList.contains('room-open')"));
  await ev("sessionStorage.removeItem('strange-oracle'); true");

  // ── 8. (v1-D) 별가루 충전(카카오 계정) — 모의 카카오·모의 결제창. 로그인 → 50 결제 → 계정에 50 → 면담은 무료 몫이 없으면 충전분에서 10
  await ev("localStorage.removeItem('strange-oracle-login'); sessionStorage.removeItem('strange-oracle-dustpay'); true");
  await b.goto(`${TEST}/stardust/`);
  await waitFor("!!document.querySelector('[data-js=dust-login]')", 8000);
  const sd = await ev("({ ways: document.querySelectorAll('.gmini')[0].querySelectorAll('li').length, uses: [...document.querySelectorAll('.gmini')[1].querySelectorAll('li')].map((l) => l.textContent) })");
  check("별가루 페이지: 모으는 법 2줄(첫 방문·오늘의 신탁) · 쓰는 곳 3줄(면담·다른 안내자 신탁·숨은 이야기)", sd.ways === 2 && sd.uses.length === 3 && sd.uses.some((t) => /다른 안내자/.test(t)), JSON.stringify(sd));
  await ev("document.querySelector('[data-js=dust-login]').click(); true");
  await waitFor("location.pathname === '/__dev/kakao/authorize'", 8000);
  const KID = String(400000000 + Math.floor(Math.random() * 99999999)); // 실행마다 새 계정(같은 모의 서버를 다시 써도 잔액이 겹치지 않게)
  await ev(`document.querySelector('[data-field=kid]').value = '${KID}'; document.querySelector('[data-act=agree]').click(); true`);
  const backIn = await waitFor("location.pathname === '/stardust/' && !!document.querySelector('[data-js=dust-pack]')", 15000);
  const lg = await ev("JSON.parse(localStorage.getItem('strange-oracle-login') || 'null')");
  check("충전: 별가루 페이지에서 카카오 로그인 → 별가루 페이지로 돌아와 충전 칸(세 가지) · 로그인 표만 이 기기에", backIn && lg && /^[0-9a-f]{32}$/.test(lg.sid) && (await ev("document.querySelectorAll('[data-js=dust-pack]').length")) === 3, JSON.stringify(lg && Object.keys(lg)));
  const sum = await ev("({ summary: document.querySelector('.gsummary')?.textContent || '', fold: document.querySelectorAll('.gfold .gsources li').length })");
  check("충전: 결제 전 한 줄 요약(받는 것·유효기간·7일 청약철회)이 보이고 자세한 조건은 펼침에", /카카오 계정/.test(sum.summary) && /7일/.test(sum.summary) && /유효기간/.test(sum.summary) && sum.fold === 4, JSON.stringify(sum));
  await ev("document.querySelector('[data-js=dust-pack][data-prod=dust50]').click(); document.querySelector('[data-js=dust-buy]').click(); true");
  await sleep(200);
  const nudge = await ev("({ msg: document.querySelector('[data-js=dust-msg]').textContent, path: location.pathname })");
  check("충전: 동의 체크 전에는 결제창을 열지 않음", /체크/.test(nudge.msg) && nudge.path === "/stardust/", JSON.stringify(nudge));
  await ev("document.querySelector('[data-js=dust-agree]').checked = true; document.querySelector('[data-js=dust-buy]').click(); true");
  await waitFor("location.pathname === '/__dev/payapp/checkout'", 15000);
  const co = await ev("({ good: document.querySelector('[data-field=goodname]').textContent, price: document.querySelector('[data-field=price]').textContent })");
  await ev("document.querySelector('[data-act=complete]').click(); true");
  const credited = await waitFor("location.pathname === '/stardust/' && /50/.test(document.querySelector('[data-js=dust-msg]')?.textContent || '') && /들어왔어요/.test(document.querySelector('[data-js=dust-msg]').textContent)", 20000);
  const after = await ev("({ msg: document.querySelector('[data-js=dust-msg]').textContent, paid: document.querySelector('.gwallet p')?.textContent, pend: sessionStorage.getItem('strange-oracle-dustpay'), hash: location.hash })");
  check("충전: 결제창 상품·금액(별가루 50 · 2,900원) → 결제 → 별가루 페이지에서 확인·계정에 50", /별가루 50/.test(co.good) && /2,?900/.test(co.price) && credited && /충전 50/.test(after.paid || "") && after.pend === null && after.hash === "", JSON.stringify({ co, after }));
  // 면담: 무료 몫을 0으로 만든 뒤 → 충전분에서 10
  await ev("(() => { const s = Dust.state(); Dust.spend(s.bal); return true; })()");
  await b.goto(`${TEST}/talk/`);
  await waitFor("!!document.querySelector('[data-js=talk-pick]')");
  await ev("document.querySelector('[data-js=talk-pick][data-room=rune]').click(); true");
  await waitFor("/충전한 별가루 50/.test(document.querySelector('.groom__bar')?.textContent || '') && !document.querySelector('.groom__send').disabled", 8000);
  await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '충전분으로 묻기'; document.querySelector('.groom__send').click(); return true; })()");
  await waitFor("document.querySelectorAll('[data-js=talk-log] .gsay--guide:not(.is-wait)').length === 2 && /충전한 별가루 40/.test(document.querySelector('.groom__bar').textContent)", 10000);
  const tk2 = await ev("({ txt: document.querySelector('.groom__bar').textContent, free: Dust.state().bal })");
  const sentPaid = b.log.bodies.filter((x) => x.url.endsWith("/api/talk")).map((x) => JSON.parse(x.body)).pop();
  check("면담: 무료 별가루가 없으면 카카오 계정의 충전분 10을 씀(표만 보냄) · 남은 충전분 40 표시", /충전한 별가루 40/.test(tk2.txt) && tk2.free === 0 && sentPaid && sentPaid.sid === lg.sid && Object.keys(sentPaid).sort().join() === "hist,q,r,room,sid", JSON.stringify({ t: tk2.txt.slice(-40), keys: sentPaid && Object.keys(sentPaid) }));
  await ev("localStorage.removeItem('strange-oracle-login'); true");

  // ── 5. 입구(index.html): 사이드바 버튼·링크
  await b.goto(`${TEST}/products/strange-oracle/`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub' && !!document.querySelector('.topbar__inner .nav-toggle')", 10000);
  const hub = await ev("({ btn: !!document.querySelector('.topbar__inner .nav-toggle'), links: [...document.querySelectorAll('#sidenav a')].map((a) => a.getAttribute('href')), title: document.title })");
  check("입구: 위 띠에 ☰ 메뉴 · 사이드바에 안내·도구 링크", hub.btn && ["/saju/", "/vedic/", "/rune/", "/ogham/", "/egypt/", "/maya/", "/oracle/", "/manse/", "/nakshatra/", "/tzolkin/", "/decan/", "/name-ogham/", "/rune-draw/", "/sibyl/", "/legends/", "/today/", "/dex/", "/stardust/", "/talk/"].every((h) => hub.links.includes(h)), hub.links.join(" "));
  check("입구: 새 제목(검색어 포함)", /무료 사주풀이/.test(hub.title), hub.title);
  await ev("document.querySelector('.topbar__inner .nav-toggle').click()");
  await sleep(350);
  check("입구: 메뉴 열림", await ev("document.documentElement.classList.contains('nav-open')"));

  const errs = b.log.errors.filter((e) => !/favicon/.test(e) && !/502 \(Bad Gateway\) http:\/\/127\.0\.0\.1:8788\/api\/talk/.test(e)); // 면담 실패 시험(__fail)의 502는 일부러 낸 것
  check("콘솔 오류 0", errs.length === 0, errs.slice(0, 3).join(" | "));
  const pass = out.filter((l) => l.startsWith("PASS")).length, fail = out.length - pass;
  console.log(`${pass} PASS / ${fail} FAIL`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-guide.txt"), out.join("\n") + `\n${pass} PASS / ${fail} FAIL\n`);
  await b.close();
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
