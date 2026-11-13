// 안내 페이지·무료 도구 동작 (2026-11-13). 문구는 data-guide.js(window.GUIDE), 계산은 이미 검증된 saju.js(만세력)·astro.js(나크샤트라)를 그대로 쓴다.
// 개인정보(6장): 입력값은 이 페이지의 메모리에서만 계산하고 주소·쿠키·localStorage·sessionStorage·분석 이벤트·서버에 넣지 않는다.
//   분석 이벤트는 페이지 이름과 도구 이름만(허용 목록으로 강제, common/analytics.js).
(function () {
  const G = window.GUIDE;
  const CONF = window.GUIDE_PAGE || {}; // gen-guide.js가 페이지마다 넣는 { page, kind: "page"|"tool", ga4 }
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] == null ? "" : o[k]));
  const PAGES = Object.keys(G.pages).concat(Object.keys(G.tools));
  const TOOLS = Object.keys(G.tools);

  // ── 분석(허용 목록 밖은 버림). query는 시작할 때 지운다(입력값은 애초에 주소에 없다)
  const A = window.Analytics;
  let on = false;
  if (A && CONF.ga4) {
    const search = location.search;
    if (search) history.replaceState(null, "", location.pathname + location.hash);
    on = A.init({ ga4: CONF.ga4, title: document.title, events: { so_guide_view: { page: PAGES }, so_guide_cta: { page: PAGES }, so_tool_result: { tool: TOOLS } }, utm: { search, allow: {}, ignore: [] } });
    if (on) A.track("so_guide_view", { page: CONF.page });
    const cookie = $("[data-js=cookie-line]");
    if (cookie && A.configured(CONF.ga4)) cookie.hidden = false;
  }
  const track = (n, p) => { if (on) A.track(n, p); };
  document.addEventListener("click", (e) => { if (e.target.closest("[data-js=to-room]")) track("so_guide_cta", { page: CONF.page }); });

  if (CONF.kind !== "tool") return;
  const T = G.tools[CONF.page];
  const form = $("[data-js=tool-form]");
  const out = $("[data-js=tool-result]");
  const err = $("[data-js=tool-error]");
  const showErr = (msg) => { err.textContent = msg; err.hidden = !msg; };
  const num = (name) => { const v = form.elements[name].value.trim(); return v === "" ? NaN : Number(v); };
  const noTime = form.elements.notime; // 날짜만 받는 도구에는 없다
  const syncTime = () => { if (noTime) ["h", "mi"].forEach((n) => { form.elements[n].disabled = noTime.checked; }); };
  if (noTime) noTime.addEventListener("change", syncTime);
  syncTime();
  const validYmd = (y, m, d) => {
    if (![y, m, d].every(Number.isInteger)) return false;
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  };
  const readTime = () => {
    if (noTime.checked) return { time: null };
    const h = num("h"), mi = num("mi");
    if (!(Number.isInteger(h) && h >= 0 && h < 24 && Number.isInteger(mi) && mi >= 0 && mi < 60)) return { bad: true };
    return { time: { h, mi } };
  };
  const ctaHtml = (c) => `<div class="gcta"><h2>${esc(c.head)}</h2><p>${esc(c.body)}</p><a class="gbtn" href="/products/strange-oracle/" data-js="to-room">${esc(c.btn)}</a></div>`;
  const again = () => `<div class="gactions"><button class="gbtn ghost" type="button" data-js="again">${esc(T.form.again)}</button></div>`;
  out.addEventListener("click", (e) => {
    if (!e.target.closest("[data-js=again]")) return;
    if (form.dataset.kind === "draw") { form.requestSubmit(); return; } // 뽑기는 바로 다시 뽑는다
    form.reset();
    syncTime();
    out.hidden = true;
    out.innerHTML = "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  // 천문 계산(나크샤트라·데칸): 누를 때 한 번만 불러온다 (Astronomy Engine 판 고정 + integrity)
  const ASTRONOMY = { src: "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js", integrity: "sha384-LTVHvxfbG3XHla4Lu0C0s9U18B2sBOuzJIeOoVHm2t05SOOORvMbBMEVjXrGau9g" };
  let ready = null;
  const loadAstro = () => ready || (ready = new Promise((ok, no) => {
    if (window.Astronomy && window.Astro) return ok();
    const s = document.createElement("script");
    Object.assign(s, { src: ASTRONOMY.src, integrity: ASTRONOMY.integrity, crossOrigin: "anonymous", async: false });
    s.onload = () => {
      const a = document.createElement("script");
      a.src = "/products/strange-oracle/astro.js";
      a.onload = ok;
      a.onerror = no;
      document.head.append(a);
    };
    s.onerror = () => { ready = null; no(new Error("astronomy")); };
    document.head.append(s);
  }));
  const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const readDate = () => {
    const y = num("y"), m = num("m"), d = num("d");
    if (Number.isInteger(y) && (y < 1900 || y > 2099)) return { err: T.errors.range };
    if (!validYmd(y, m, d)) return { err: T.errors.date };
    return { y, m, d };
  };
  const shown = () => { out.hidden = false; out.scrollIntoView({ behavior: "smooth", block: "start" }); track("so_tool_result", { tool: CONF.page }); };

  // ───────── 무료 만세력 ─────────
  if (CONF.page === "manse") {
    const S = window.Saju;
    const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
    const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
    const EL = ["wood", "fire", "earth", "metal", "water"];
    const calSync = () => { form.elements.leap.closest("label").hidden = form.elements.cal.value !== "lunar"; };
    form.querySelectorAll("input[name=cal]").forEach((r) => r.addEventListener("change", calSync));
    calSync();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showErr("");
      let y = num("y"), m = num("m"), d = num("d");
      const lunar = form.elements.cal.value === "lunar", leap = lunar && form.elements.leap.checked;
      if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2099) return showErr(Number.isInteger(y) && (y < 1900 || y > 2099) ? T.errors.range : T.errors.date);
      if (!lunar && !validYmd(y, m, d)) return showErr(T.errors.date);
      const tm = readTime();
      if (tm.bad) return showErr(T.errors.time);
      try { await S.loadLunar(); } catch (x) { return showErr(T.errors.lib); }
      let note = "";
      if (lunar) {
        try {
          const L = window.Lunar.fromYmd(y, leap ? -m : m, d);
          if (L.getYear() !== y || Math.abs(L.getMonth()) !== m || L.getDay() !== d || (leap && L.getMonth() > 0)) throw new Error("no such day");
          const sol = L.getSolar();
          note = fill(T.result.lunarNote, { y, m, d, leap: leap ? T.result.leapMark : "", sy: sol.getYear(), sm: sol.getMonth(), sd: sol.getDay() });
          y = sol.getYear(); m = sol.getMonth(); d = sol.getDay();
        } catch (x) { return showErr(T.errors.lunar); }
        if (y < 1900 || y > 2099) return showErr(T.errors.range);
      }
      let r;
      try { r = S.compute({ y, m, d, time: tm.time, gender: "none" }); } catch (x) { return showErr(T.errors.date); }
      const R = T.result;
      const cell = (p, kind) => {
        if (!p) return `<div class="gch empty"><b>${esc(R.empty)}</b><i>&nbsp;</i></div>`;
        const idx = kind === "stem" ? p.stem : p.branch;
        const el = EL[kind === "stem" ? STEM_EL[idx] : BRANCH_EL[idx]];
        return `<div class="gch${kind === "stem" && p === r.pillars.day ? " is-day" : ""}" data-el="${el}"><b>${esc(p.hanja[kind === "stem" ? 0 : 1])}</b><i>${esc(p.ko[kind === "stem" ? 0 : 1])}</i></div>`;
      };
      const cols = ["hour", "day", "month", "year"].map((k) => `<div class="gpillar"><small>${esc(R.cols[k])}</small>${cell(r.pillars[k], "stem")}${cell(r.pillars[k], "branch")}</div>`).join("");
      const stem = (window.SAJU && window.SAJU.stems[r.dayStem]) || {};
      const max = Math.max(1, ...Object.values(r.elements));
      const bars = EL.map((k) => `<li data-el="${k}"><span>${esc(R.elementNames[k])}</span><i><u style="width:${((r.elements[k] / max) * 100).toFixed(0)}%"></u></i><b>${r.elements[k]}</b></li>`).join("");
      const notes = [note, r.flags.timeUnknown ? R.timeUnknown : "", r.flags.jieDay ? fill(R.jieDay, { jie: r.flags.jieDay.jie }) : ""].filter(Boolean);
      out.innerHTML = `<h2>${esc(R.head)}</h2>${notes.map((n) => `<p class="gnote">${esc(n)}</p>`).join("")}<div class="gpillars" style="margin-top:12px">${cols}</div>
        <div class="gdm"><h3>${esc(R.dayMaster)} · ${esc(r.dayStemHanja)}</h3><b>${esc(stem.name || r.dayStemKo)}</b><em>${esc(stem.title || "")}</em>${stem.key ? `<p>${esc(stem.key)}</p>` : ""}</div>
        <div class="gels"><h3>${esc(R.elements)}</h3><ul class="gbars">${bars}</ul></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 나크샤트라 계산기 ─────────
  if (CONF.page === "nakshatra") {
    const NAK = window.NAKSHATRAS, RASHI = window.RASHIS;
    const R = T.result;
    const rashi = (i) => `${RASHI[i].ko} · ${RASHI[i].name}`;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showErr("");
      const y = num("y"), m = num("m"), d = num("d");
      if (Number.isInteger(y) && (y < 1900 || y > 2099)) return showErr(T.errors.range);
      if (!validYmd(y, m, d)) return showErr(T.errors.date);
      const tm = readTime();
      if (tm.bad) return showErr(T.errors.time);
      try { await loadAstro(); } catch (x) { return showErr(T.errors.lib); }
      const res = window.Astro.birthChart(y, m, d, tm.time ? { h: tm.time.h, m: tm.time.mi } : null); // astro.js는 분을 m으로 받는다
      let html = `<h2>${esc(R.head)}</h2>`;
      if (res.exact) {
        const c = res.charts[0], n = NAK[c.nakshatra];
        html += `<div class="gnak"><p class="num">${esc(fill(R.nth, { n: c.nakshatra + 1 }))} · ${esc(fill(R.pada, { n: c.pada }))}</p><b>${esc(n.name)}</b><em>${esc(n.title)}</em><p>${esc(n.key)}</p></div>
          <dl class="gkv"><dt>${esc(R.symbol)}</dt><dd>${esc(n.symbol)}</dd><dt>${esc(R.deity)}</dt><dd>${esc(n.deity.split(" — ")[0])}</dd>
          <dt>${esc(R.moonRashi)}</dt><dd>${esc(rashi(c.moonRashi))}</dd><dt>${esc(R.sunVedic)}</dt><dd>${esc(rashi(c.sunRashi))}</dd><dt>${esc(R.sunWestern)}</dt><dd>${esc(R.westernSigns[c.westernSign])}</dd></dl>
          ${c.sunRashi !== c.westernSign ? `<p class="gnote" style="margin-top:10px">${esc(R.diff)}</p>` : ""}`;
      } else {
        const list = res.candidates.length ? res.candidates : [{ chart: res.noon, startMin: 0, endMin: 1440 }];
        html += `<p class="gnote">${esc(R.candidatesHead)}</p><ul class="gcands">${list.map((cd) => { const n = NAK[cd.chart.nakshatra];
          return `<li><small>${esc(fill(R.range, { a: hm(cd.startMin), b: hm(cd.endMin) }))} · ${esc(fill(R.nth, { n: cd.chart.nakshatra + 1 }))}</small><b>${esc(n.name)}</b><span>${esc(n.title)}</span></li>`; }).join("")}</ul>
          <dl class="gkv"><dt>${esc(R.sunVedic)}</dt><dd>${esc(rashi(res.noon.sunRashi))}</dd><dt>${esc(R.sunWestern)}</dt><dd>${esc(R.westernSigns[res.noon.westernSign])}</dd></dl>`;
      }
      out.innerHTML = html + ctaHtml(R.cta) + again();
      shown();
    });
  }

  // ───────── 마야 탄생일 (촐킨) ─────────
  if (CONF.page === "tzolkin") {
    const R = T.result;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showErr("");
      const dt = readDate();
      if (dt.err) return showErr(dt.err);
      const r = window.Calc.tzolkin(dt.y, dt.m, dt.d);
      const sg = window.TZOLKIN_SIGNS[r.sign], nb = window.TZOLKIN_NUMBERS[r.number - 1];
      out.innerHTML = `<h2>${esc(R.head)}</h2><div class="gnak gday"><svg class="gmaya" viewBox="0 0 24 24" aria-hidden="true"><use href="#maya-${r.number}" /></svg><b>${esc(fill(R.dayName, { n: r.number, name: sg.name }))}</b><p class="num">${esc(r.number)} ${esc(sg.latin)}</p></div>
        <div class="gdm"><h3>${esc(R.sign)} · ${esc(sg.latin)}</h3><b>${esc(sg.name)}</b><em>${esc(sg.title)}</em><p>${esc(sg.key)}</p></div>
        <div class="gdm"><h3>${esc(R.number)} · ${esc(r.number)}</h3><b>${esc(nb.title)}</b><p style="margin-top:8px !important">${esc(nb.text)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 이집트 데칸 ─────────
  if (CONF.page === "decan") {
    const R = T.result, D = window.DECANS;
    const where = (i) => fill(R.where, { sign: D[i].sign, part: R.parts[D[i].part - 1] || "" });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showErr("");
      const dt = readDate();
      if (dt.err) return showErr(dt.err);
      try { await loadAstro(); } catch (x) { return showErr(T.errors.lib); }
      const r = window.Calc.decan(dt.y, dt.m, dt.d);
      if (!r) return showErr(T.errors.date);
      let html = `<h2>${esc(R.head)}</h2>`;
      if (!r.candidates.length) {
        const i = r.noon.index, x = D[i];
        html += `<div class="gnak"><p class="num">${esc(fill(R.nth, { n: i + 1 }))}</p><b>${esc(where(i))}</b><em>${esc(x.title)}</em><p>${esc(x.key)}</p></div>`;
      } else {
        html += `<p class="gnote">${esc(R.candidatesHead)}</p><ul class="gcands">${r.candidates.map((c) => { const i = c.decan.index;
          return `<li><small>${esc(fill(R.range, { a: hm(c.startMin), b: hm(c.endMin) }))} · ${esc(fill(R.nth, { n: i + 1 }))}</small><b>${esc(where(i))}</b><span>${esc(D[i].title)}</span></li>`; }).join("")}</ul>`;
      }
      out.innerHTML = html + ctaHtml(R.cta) + again();
      shown();
    });
  }

  // ───────── 이름 오검 ─────────
  if (CONF.page === "nameOgham") {
    const R = T.result, O = window.OGHAM;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showErr("");
      const name = form.elements.name.value.trim();
      if (name.length > 20) return showErr(T.errors.long);
      const r = name ? window.Calc.ogham(name) : null;
      if (!r) return showErr(T.errors.name);
      const x = O[r.index];
      const stave = r.letters.map((i) => `<li><svg viewBox="0 0 40 80" aria-hidden="true"><use href="#ogham-${O[i].code}" /></svg><span>${esc(O[i].sound)}</span></li>`).join("");
      out.innerHTML = `<h2>${esc(R.head)}</h2><ol class="gstave" aria-label="${esc(r.glyphs)}">${stave}</ol><p class="gnote gcenter">${esc(fill(R.latin, { latin: r.latin }))}</p>
        <div class="gnak" style="margin-top:18px"><p class="num">${esc(R.letter)}</p><svg class="gogham" viewBox="0 0 40 80" aria-hidden="true"><use href="#ogham-${x.code}" /></svg><b>${esc(x.name)} · ${esc(x.latin)}</b><em>${esc(x.title)}</em><p>${esc(x.key)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 룬 한 개 뽑기 ─────────
  if (CONF.page === "runeDraw") {
    const R = T.result, RU = window.RUNES;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const x = RU[window.Calc.pickOracle(RU.length)];
      out.innerHTML = `<h2>${esc(R.head)}</h2><div class="gnak"><span class="grune">${esc(x.glyph)}</span><b>${esc(x.name)} · ${esc(x.latin)}</b><em>${esc(x.keyword)}</em><p class="gnote gcenter">${esc(fill(R.image, { image: x.image }))}</p><p>${esc(x.key)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }

  // ───────── 시빌라 한 줄 신탁 ─────────
  // 적은 고민은 길이만 본다. 뽑기에 쓰지 않고, 어디에도 넣지 않는다(화면 밖으로 나가지 않음)
  if (CONF.page === "sibyl") {
    const R = T.result, OR = window.ORACLES;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showErr("");
      if (form.elements.question.value.length > 100) return showErr(T.errors.long);
      const x = OR[window.Calc.pickOracle(OR.length)];
      out.innerHTML = `<h2>${esc(R.head)}</h2><blockquote class="gscroll">${esc(x.line)}</blockquote><div class="gdm"><b>${esc(x.title)}</b><p style="margin-top:8px !important">${esc(x.key)}</p></div>${ctaHtml(R.cta)}${again()}`;
      shown();
    });
  }
})();
