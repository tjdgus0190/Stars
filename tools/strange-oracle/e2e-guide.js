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
  await ev("Dust.clear(); localStorage.removeItem('strange-oracle-dust'); localStorage.removeItem('strange-oracle-login'); sessionStorage.clear(); true");
  await b.goto(`${TEST}/`);
  await waitFor("!!window.Dust && !!window.DEX && !!document.querySelector('[data-js=home-today]')");
  const home = await ev("({ path: location.pathname, sub: document.querySelector('[data-js=home-today-sub]').textContent, art: document.querySelector('[data-js=home-today]').style.getPropertyValue('--art'), want: DEX.guides.find((g) => g.room === Dust.guideOf()), feats: [...document.querySelectorAll('.gfeat')].map((a) => a.getAttribute('href')), tabs: document.querySelectorAll('.tabbar a').length, cur: document.querySelector('.tabbar a[aria-current=page]')?.getAttribute('href'), canon: document.querySelector('link[rel=canonical]')?.href })");
  check("처음 화면(/): 일곱 개의 문·오늘의 신탁·면담·도감·별가루 다섯 칸 · 아래 탭 5 · 오늘 담당 안내자 표시", home.path === "/" && ["/products/strange-oracle/", "/today/", "/talk/", "/dex/", "/stardust/"].every((h) => home.feats.includes(h)) && home.tabs === 5 && home.cur === "/" && home.sub.includes(home.want.name) && home.art.includes(`img/guide/${home.want.room}.webp`) && home.canon === "https://strange-oracle.com/", JSON.stringify({ sub: home.sub, feats: home.feats, cur: home.cur }));
  const nyb = await ev("(() => { const a = document.querySelector('[data-js=home-ny]'); return a ? { href: a.getAttribute('href'), txt: a.textContent } : null; })()");
  check("처음 화면: 2027 신년운세 배너 → 입구 신년운세 탭(#ny-hub) · 버튼", !!nyb && nyb.href === "/products/strange-oracle/#ny-hub" && /2027 신년운세/.test(nyb.txt) && /새해 운세 보기/.test(nyb.txt), JSON.stringify(nyb));
  // (2026-11-14 운영자) 체험 콘텐츠는 로그인 뒤: 처음 화면 카드는 로그인 안내(건너뛰기 없음) · 점술 안내·무료 도구 칸은 그대로
  await ev("document.querySelector('.gfeat[href=\"/dex/\"]').click(); true");
  await waitFor("!!document.querySelector('.glogin [data-js=login-go]')", 5000);
  const lgOpen = await ev("({ path: location.pathname, skip: [...document.querySelectorAll('.glogin button')].some((b) => /없이/.test(b.textContent)) })");
  await ev("document.querySelector('.glogin [data-js=login-skip]').click(); true");
  await sleep(200);
  const lgClosed = await ev("!document.querySelector('.glogin') && location.pathname === '/'");
  check("처음 화면: 체험 콘텐츠 카드를 누르면 카카오 로그인 안내(「로그인 없이 계속」 없음) · 닫으면 그대로", lgOpen.path === "/" && !lgOpen.skip && lgClosed, JSON.stringify(lgOpen));
  const acctBal = async () => { const sid = await ev("JSON.parse(localStorage.getItem('strange-oracle-login') || 'null')?.sid || ''"); if (!sid) return null; const r = await fetch(`${TEST}/api/auth/dust`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid }) }); return (await r.json()).bal; };
  const postDust = async (body) => { const sid = await ev("JSON.parse(localStorage.getItem('strange-oracle-login') || 'null')?.sid || ''"); return (await fetch(`${TEST}/api/auth/dust`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ sid }, body)) })).json(); };
  const gates = {};
  for (const pg of ["today", "dex", "talk", "stardust"]) {
    await b.goto(`${TEST}/${pg}/`);
    await waitFor("!!document.querySelector('.ggate [data-js=gate-login]') || !!document.querySelector('[data-js=app] > :not(.ggate)')", 8000);
    gates[pg] = await ev("({ gate: !!document.querySelector('.ggate [data-js=gate-login]'), more: !!document.querySelector('.gfold-more') })");
  }
  check("로그인 전: 오늘의 신탁·도감·면담·별가루는 로그인 안내만(설명·자주 묻는 질문은 그대로)", Object.values(gates).every((g) => g.gate && g.more), JSON.stringify(gates));
  await b.goto(`${TEST}/manse/`);
  await waitFor("!!document.querySelector('[data-js=tool-form]')");
  check("무료 도구·점술 안내는 로그인 없이 그대로", !(await ev("!!document.querySelector('.ggate')")));
  // 오늘의 신탁에서 로그인(모의 카카오) → 오늘의 신탁으로 돌아옴 · 첫 로그인 +10
  const KID0 = String(300000000 + Math.floor(Math.random() * 99999999));
  await b.goto(`${TEST}/today/`);
  await waitFor("!!document.querySelector('[data-js=gate-login]')", 8000);
  await ev("document.querySelector('[data-js=gate-login]').click(); true");
  await waitFor("location.pathname === '/__dev/kakao/authorize'", 8000);
  await ev(`document.querySelector('[data-field=kid]').value = '${KID0}'; document.querySelector('[data-act=agree]').click(); true`);
  await waitFor("location.pathname === '/today/' && !!document.querySelector('[data-js=today-open]')", 15000);
  await waitFor("document.querySelector('.dust-badge b')?.textContent === '10'", 8000);
  check("로그인하면 그 페이지로 돌아와 열림 · 첫 로그인 별가루 10(계정) · 위 띠 잔액", (await acctBal()) === 10 && (await ev("document.querySelector('.dust-badge b')?.textContent")) === "10");
  const g0 = await ev("({ name: document.querySelector('.gtoday-hero h2').textContent, want: DEX.guides.find((g) => g.room === Dust.guideOf()).name })");
  check("오늘의 신탁: 오늘 담당 안내자가 맞음(날짜 순환)", g0.name === g0.want, JSON.stringify(g0));
  await b.goto(`${TEST}/stardust/`);
  await waitFor("!!document.querySelector('[data-js=dust-total]')");
  await sleep(600);
  check("다시 와도 첫 로그인 별가루는 한 번만", (await acctBal()) === 10);
  // 출석: 이 기기의 오늘 기록을 지우고 다시 받기 → 계정 +5
  await b.goto(`${TEST}/today/`);
  await waitFor("!!window.Dust");
  await ev("(() => { const s = JSON.parse(localStorage.getItem('strange-oracle-dust')); s.oracle = null; localStorage.setItem('strange-oracle-dust', JSON.stringify(s)); return true; })()");
  await b.goto(`${TEST}/today/`);
  await waitFor("!!document.querySelector('[data-js=today-open]')");
  await ev("document.querySelector('[data-js=today-open]').click(); true");
  await waitFor("!!document.querySelector('.gread') && /\\+5/.test(document.querySelector('.dust-toast')?.textContent || '')", 8000);
  check("로그인한 채 오늘의 신탁 → 출석 별가루 +5(계정) · 알림", (await acctBal()) === 15);
  const other = await ev("Dust.TODAY_ORDER.find((r) => r !== Dust.guideOf())");
  const ex0 = await ev("document.querySelectorAll('[data-js=today-extra]').length");
  await ev(`document.querySelector('[data-js=today-extra][data-room=${other}]').click(); true`);
  await waitFor("document.querySelectorAll('.gread').length === 2", 8000);
  const t3 = await ev(`({ n: document.querySelectorAll('.gread').length, done: document.querySelector('[data-js=today-extra][data-room=${other}]').disabled })`);
  check("오늘의 신탁: 다른 안내자에게 계정 별가루 3으로 더 받기 · 같은 안내자는 다시 못 받음", ex0 === 6 && t3.n === 2 && t3.done && (await acctBal()) === 12, JSON.stringify(t3));
  await b.goto(`${TEST}/rune-draw/`);
  await waitFor("!!window.Calc && !!window.Dust && !!document.querySelector('[data-js=tool-form]')");
  await ev("document.querySelector('[data-js=tool-form] button[type=submit]').click(); true");
  await waitFor("!document.querySelector('[data-js=tool-result]').hidden");
  check("무료 도구 결과 → 별가루 없음(운영자 v1-F)", (await acctBal()) === 12);
  await b.goto(`${TEST}/dex/`);
  await waitFor("!!window.DEX && !!document.querySelector('.gdexgrid')");
  const x0 = await ev("({ locked: document.querySelectorAll('.gdexcard.is-locked').length, fig: [...document.querySelectorAll('.gdexcard .garch')].filter((g) => (g.getAttribute('style') || '').includes('img/guide/')).length, img: document.querySelector('.gdexcard .garch').getAttribute('style'), note: document.querySelector('.gseal small')?.textContent || '' })");
  const imgOk = (await Promise.all(["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"].map((r) => fetch(`${TEST}/products/strange-oracle/img/guide/${r}.webp`)))).every((r) => r.status === 200);
  check("도감: 처음엔 일곱 장 모두 잠김 · 아치 문 초상 7 · 「다 모으면 별가루 30」 안내", x0.locked === 7 && x0.fig === 7 && /img\/guide\/saju\.webp/.test(x0.img) && imgOk && /30/.test(x0.note), JSON.stringify(x0).slice(0, 200));
  await postDust({ room: "rune" }); // 방 완주는 입구가 계정에 기록한다(여기서는 같은 길을 바로 부름)
  await b.goto(`${TEST}/dex/`);
  await waitFor("document.querySelectorAll('.gdexcard.is-locked').length === 6", 8000);
  await ev("document.querySelector('[data-js=dex-card][data-room=rune]').click(); true");
  await sleep(200);
  const x1 = await ev("({ locked: document.querySelectorAll('.gdexcard.is-locked').length, sheet: !!document.querySelector('.gsheet[role=dialog]'), btn: !!document.querySelector('[data-js=dex-open][data-room=rune]') })");
  await ev("document.querySelector('[data-js=dex-open][data-room=rune]').click(); true");
  await waitFor("!!document.querySelector('.gcard__secret:not(.is-shut)')", 8000);
  const x2 = await ev("!!document.querySelector('.gcard__secret:not(.is-shut)')");
  await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true");
  await sleep(150);
  const x3 = await ev("!document.querySelector('.gsheet') && !document.documentElement.classList.contains('sheet-open')");
  check("도감: 룬의 방 완주(계정 기록) → 카드 열림 · 카드 누르면 펼침 시트 · 숨은 이야기 계정 별가루 10 · Esc로 닫힘", x1.locked === 6 && x1.sheet && x1.btn && x2 && x3 && (await acctBal()) === 2, JSON.stringify({ x1, x2, x3 }));
  // 일곱 장 → 금빛 봉인 + 별가루 30(계정에 한 번)
  for (const r of ["saju", "ogham", "star", "decan", "tzolkin", "sibyl"]) await postDust({ room: r });
  await b.goto(`${TEST}/dex/`);
  await waitFor("!!document.querySelector('.gseal.is-open') && /받았어요/.test(document.querySelector('.gseal small')?.textContent || '')", 10000);
  const seal = await ev("({ text: document.querySelector('.gseal p').textContent, toast: document.querySelector('.dust-toast')?.textContent || '' })");
  check("도감 일곱 장(계정에 기록된 방 완주) → 금빛 봉인 열림 · 마지막 한마디 · 별가루 +30(계정)", /당신이요/.test(seal.text) && /\+30/.test(seal.toast) && (await acctBal()) === 32, JSON.stringify(seal));
  await b.goto(`${TEST}/dex/`);
  await waitFor("!!document.querySelector('.gseal.is-open')");
  await sleep(700);
  check("금빛 봉인 별가루는 한 번만", (await acctBal()) === 32);
  check("이 기기 localStorage는 별가루 장부·로그인 표뿐(정해진 칸만)", await ev("Object.keys(localStorage).every((k) => k === 'strange-oracle-dust' || k === 'strange-oracle-login') && Object.keys(JSON.parse(localStorage.getItem('strange-oracle-dust'))).sort().join() === 'bal,cards,day,first,got,n,open,oracle,rooms,v'"));

  // ── 7. (v1-D·v1-F) 안내자와 면담 — 계정 별가루 5 · 모의 서버(test)의 가짜 모델. 보내는 칸 · 실패 시 차감 없음
  await ev("sessionStorage.setItem('strange-oracle', JSON.stringify({ profile: { name: '테스트이름' }, visits: { saju: { code: 1501, archetype: 'sage' } } })); true");
  await fetch(`${TEST}/__dev/talk-reset`);
  await b.goto(`${TEST}/talk/`);
  await waitFor("!!window.DEX && [...document.querySelectorAll('[data-js=talk-pick] .garch')].filter((g) => (g.getAttribute('style') || '').includes('img/guide/')).length === 7");
  await sleep(500);
  await ev("sessionStorage.removeItem('strange-oracle-talk'); true");
  const inRoom = await ev("(() => { document.querySelector('[data-js=talk-pick][data-room=saju]').click(); const r = document.querySelector('.groom'); return !!r && /dex-saju/.test(r.getAttribute('style')) && document.documentElement.classList.contains('room-open'); })()");
  check("면담: 문을 누르면 방(만신 그림 배경) 안으로", inRoom);
  await ev("document.querySelector('[data-js=talk-leave]').click(); true");
  // 50개 충전 → 52
  await b.goto(`${TEST}/stardust/`);
  await waitFor("!!document.querySelector('[data-js=dust-pack]')", 8000);
  const sd = await ev("({ ways: document.querySelectorAll('.gmini')[0].querySelectorAll('li').length, uses: [...document.querySelectorAll('.gmini')[1].querySelectorAll('li')].map((l) => l.textContent) })");
  check("별가루 페이지: 모으는 법 3줄(첫 로그인·출석·금빛 봉인) · 쓰는 곳 5줄(면담 5·다른 안내자·숨은 이야기·책 49·신년운세 49)", sd.ways === 3 && sd.uses.length === 5 && sd.uses.some((t) => /책.*49/.test(t)), JSON.stringify(sd));
  const sum = await ev("({ summary: document.querySelector('.gsummary')?.textContent || '', fold: document.querySelectorAll('.gfold .gsources li').length, packs: document.querySelectorAll('[data-js=dust-pack]').length })");
  check("충전: 묶음 4종 · 결제 전 한 줄 요약(받는 것·유효기간·7일 청약철회) · 자세한 조건은 펼침에", sum.packs === 4 && /카카오 계정/.test(sum.summary) && /7일/.test(sum.summary) && /유효기간/.test(sum.summary) && sum.fold === 4, JSON.stringify(sum));
  await ev("document.querySelector('[data-js=dust-pack][data-prod=d50]').click(); document.querySelector('[data-js=dust-buy]').click(); true");
  await sleep(200);
  const nudge = await ev("({ msg: document.querySelector('[data-js=dust-msg]').textContent, path: location.pathname })");
  check("충전: 동의 체크 전에는 결제창을 열지 않음", /체크/.test(nudge.msg) && nudge.path === "/stardust/", JSON.stringify(nudge));
  await ev("document.querySelector('[data-js=dust-agree]').checked = true; document.querySelector('[data-js=dust-buy]').click(); true");
  await waitFor("location.pathname === '/__dev/payapp/checkout'", 15000);
  const co = await ev("({ good: document.querySelector('[data-field=goodname]').textContent, price: document.querySelector('[data-field=price]').textContent })");
  await ev("document.querySelector('[data-act=complete]').click(); true");
  const credited = await waitFor("location.pathname === '/stardust/' && /들어왔어요/.test(document.querySelector('[data-js=dust-msg]')?.textContent || '')", 20000);
  const after = await ev("({ pend: sessionStorage.getItem('strange-oracle-dustpay'), hash: location.hash })");
  check("충전: 결제창 상품·금액(별가루 50개 · 5,000원) → 계정에 50(합계 82)", /별가루 50개/.test(co.good) && /5,?000/.test(co.price) && credited && after.pend === null && after.hash === "" && (await acctBal()) === 82, JSON.stringify({ co, after }));
  await b.goto(`${TEST}/talk/`);
  await waitFor("!!window.DEX && !!document.querySelector('[data-js=talk-pick]')");
  await ev("document.querySelector('[data-js=talk-pick][data-room=saju]').click(); true");
  await waitFor("!document.querySelector('.groom__send').disabled", 8000);
  const k0 = await ev("({ known: document.querySelector('.groom__note').textContent, greet: document.querySelectorAll('[data-js=talk-log] .gsay--guide').length, meta: document.querySelector('.groom__meta').textContent })");
  await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '올해 일은 어떻게 풀어 가면 좋을까요?'; document.querySelector('.groom__send').click(); return true; })()");
  await waitFor("document.querySelectorAll('[data-js=talk-log] .gsay--guide:not(.is-wait)').length === 5 && !document.querySelector('.groom__send').disabled", 15000);
  const k1 = await ev("(() => { const ps = [...document.querySelectorAll('[data-js=talk-log] .gsay--guide p')].map((p) => p.textContent); return { a: ps[1], q: ps[4], n: ps.length, me: document.querySelectorAll('[data-js=talk-log] .gsay--me').length, meta: document.querySelector('.groom__meta').textContent }; })()");
  // Enter는 줄바꿈(보내지 않음)
  const nl = await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '첫 줄'; t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); return { prevented: false, me: document.querySelectorAll('[data-js=talk-log] .gsay--me').length }; })()");
  await ev("document.querySelector('.groom textarea').value = ''; true");
  check("면담: 답은 문단마다 말풍선(4개) · 마지막은 역질문 · Enter는 보내지 않음(줄바꿈)", k1.n === 5 && /\?$/.test(k1.q) && nl.me === 1, JSON.stringify({ n: k1.n, q: k1.q, nl }));
  const sent = b.log.bodies.filter((x) => x.url.endsWith("/api/talk")).map((x) => JSON.parse(x.body));
  const last = await (await fetch(`${TEST}/__dev/talk-last`)).json();
  const lg = await ev("JSON.parse(localStorage.getItem('strange-oracle-login') || 'null')");
  check("면담: 첫인사 → 결과 안내 · 질문 말풍선 · 답이 옴 · 계정 별가루 5 씀(82→77)", k0.greet === 1 && /만신의 방 결과 「.+」로 이야기해요/.test(k0.known) && /가진 별가루 82/.test(k0.meta) && k1.me === 1 && /만신이 답해요/.test(k1.a) && /가진 별가루 77/.test(k1.meta) && (await acctBal()) === 77, JSON.stringify({ k0, k1: k1.meta }));
  check("면담: 보낸 칸은 room·r·q·hist·sid(로그인 표)뿐 · 결과는 번호만(일간 3) · 이름·생일 없음", sent.length === 1 && Object.keys(sent[0]).sort().join() === "hist,q,r,room,sid" && sent[0].sid === lg.sid && JSON.stringify(sent[0].r) === '{"s":3}' && !JSON.stringify(sent[0]).includes("테스트이름") && !JSON.stringify(last).includes("테스트이름"), JSON.stringify(sent[0]));
  await ev("(() => { const t = document.querySelector('.groom textarea'); t.value = '__fail 두 번째 질문'; document.querySelector('.groom__send').click(); return true; })()");
  await waitFor("!document.querySelector('[data-js=talk-error]')?.hidden", 8000);
  const k2 = await ev("({ err: document.querySelector('[data-js=talk-error]').textContent, kept: document.querySelector('.groom textarea').value })");
  const sent2 = b.log.bodies.filter((x) => x.url.endsWith("/api/talk")).map((x) => JSON.parse(x.body));
  check("면담: 실패하면 별가루를 쓰지 않음 · 오류 안내 · 쓴 질문은 칸에 남김 · 앞선 문답 1개 함께 보냄", (await acctBal()) === 77 && /돌려드렸어요/.test(k2.err) && k2.kept === "__fail 두 번째 질문" && sent2.length === 2 && sent2[1].hist.length === 1, JSON.stringify(k2));
  // (v1-G) 다른 화면에 다녀와도 대화가 이어짐(이 탭 sessionStorage) · localStorage에는 질문 글이 없음
  await b.goto(`${TEST}/today/`);
  await b.goto(`${TEST}/talk/`);
  await waitFor("!!document.querySelector('[data-js=talk-pick][data-room=saju]')");
  const kept = await ev("({ dot: !!document.querySelector('[data-js=talk-pick][data-room=saju] .gdoorpick__dot'), ls: JSON.stringify(localStorage).includes('올해 일은') })");
  await ev("document.querySelector('[data-js=talk-pick][data-room=saju]').click(); true");
  await waitFor("!!document.querySelector('.groom')");
  const kept2 = await ev("({ me: document.querySelectorAll('[data-js=talk-log] .gsay--me').length, clear: !!document.querySelector('[data-js=talk-clear]') })");
  check("면담: 다른 화면에 다녀와도 지난 대화가 이어짐(이어서 표시) · 질문 글은 localStorage에 없음 · 대화 지우기 버튼", kept.dot && !kept.ls && kept2.me === 1 && kept2.clear, JSON.stringify({ kept, kept2 }));
  await ev("document.querySelector('[data-js=talk-leave]').click(); true");
  check("면담: ← 로 방에서 나오면 문 고르기로", await ev("!document.querySelector('.groom') && !document.documentElement.classList.contains('room-open')"));
  // 룬: 면담 전 설정(돌 세 개 꺼내기) 뒤 물음
  await ev("document.querySelector('[data-js=talk-pick][data-room=rune]').click(); true");
  await waitFor("!!document.querySelector('[data-js=setup-draw]')", 8000);
  await ev("document.querySelector('[data-js=setup-draw]').click(); true");
  await waitFor("!document.querySelector('.groom textarea').disabled", 8000);
  check("면담 전 설정: 룬은 돌 세 개 꺼내기 → 결과 번호로 이야기 준비", /룬의 방 결과/.test(await ev("document.querySelector('.groom__note').textContent")));
  await ev("sessionStorage.removeItem('strange-oracle'); localStorage.removeItem('strange-oracle-login'); true");

  // ── 5. 입구(index.html): 사이드바 버튼·링크
  await b.goto(`${TEST}/products/strange-oracle/`);
  await waitFor("document.querySelector('.screen.is-active')?.id === 'screen-hub' && !!document.querySelector('.topbar__inner .nav-toggle')", 10000);
  const hub = await ev("({ btn: !!document.querySelector('.topbar__inner .nav-toggle'), links: [...document.querySelectorAll('#sidenav a')].map((a) => a.getAttribute('href')), title: document.title })");
  check("입구: 위 띠에 ☰ 메뉴 · 사이드바에 안내·도구 링크", hub.btn && ["/saju/", "/vedic/", "/rune/", "/ogham/", "/egypt/", "/maya/", "/oracle/", "/manse/", "/nakshatra/", "/tzolkin/", "/decan/", "/name-ogham/", "/rune-draw/", "/sibyl/", "/legends/", "/today/", "/dex/", "/stardust/", "/talk/"].every((h) => hub.links.includes(h)), hub.links.join(" "));
  check("입구: 새 제목(검색어 포함)", /무료 사주풀이/.test(hub.title), hub.title);
  await ev("document.querySelector('.topbar__inner .nav-toggle').click()");
  await sleep(350);
  check("입구: 메뉴 열림", await ev("document.documentElement.classList.contains('nav-open')"));

  const errs = b.log.errors.filter((e) => !/favicon/.test(e) && !/401 \(Unauthorized\) http:\/\/127\.0\.0\.1:8788\/api\/auth\/dust/.test(e) && !/502 \(Bad Gateway\) http:\/\/127\.0\.0\.1:8788\/api\/talk/.test(e)); // 면담 실패 시험(__fail)의 502는 일부러 낸 것
  check("콘솔 오류 0", errs.length === 0, errs.slice(0, 3).join(" | "));
  const pass = out.filter((l) => l.startsWith("PASS")).length, fail = out.length - pass;
  console.log(`${pass} PASS / ${fail} FAIL`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "e2e-guide.txt"), out.join("\n") + `\n${pass} PASS / ${fail} FAIL\n`);
  await b.close();
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
