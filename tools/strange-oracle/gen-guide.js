// 안내 페이지·무료 도구의 정적 HTML 만들기 (2026-11-13, 제안서 proposal-strange-oracle-seo-tools.md).
// 문구는 products/strange-oracle/data-guide.js·data-nav.js, 표는 data-saju.js·data-stars.js·data-runes.js의 무료 칸, 주소·GA4·쿠키 안내는 data.js에서 읽는다.
// 검색 엔진이 자바스크립트 없이도 글·표·링크를 읽도록 HTML에 미리 써 둔다(문구의 원본은 여전히 data 파일 — 고친 뒤 이 스크립트를 다시 돌린다).
// 사용: node tools/strange-oracle/gen-guide.js          → products/strange-oracle/guide/<이름>/index.html 다섯 개를 쓴다
//       node tools/strange-oracle/gen-guide.js --check  → 쓰지 않고, 지금 파일이 다르면 exit 1 (build-dist.js가 부른다)
// 다른 스크립트에서: require(...).build() → { files: [{path, html}], urls: [절대 주소…] }
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const P = path.join(ROOT, "products", "strange-oracle");
const load = (f) => { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(P, f), "utf8"), { window: w }); return w; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONTS = [
  ["gowun-batang@5.3.0/400.css", "sha384-UmN2JKCN3ZzGKhUCbF72zmj7SCKSsgzpBPRTuYCs90jUI3LUOfltMKpFi9ZWIfoL"],
  ["gowun-batang@5.3.0/700.css", "sha384-EIZic2kT4Iyqg6Rn2tm4B7Ql9xDJWopYmx3ry1RafjC/gfDHItTLBMXp6jrmkxla"],
  ["cinzel@5.3.0/500.css", "sha384-7v1bWR/nP3kDOX0ewP+ZV/TdyDB1LMi6swZIHUv+/ihIN+yo/tIKCXkVJk1WaZ2b"],
];
const RUNIC = ["noto-sans-runic@5.3.0/400.css", "sha384-ZbX5Z8lhvA2ywj1am0sHWvLmsgWTyx2Md7LMgCK/yKna4p4xCAkgauQfJTLcgCEj"];
const PB = "/products/strange-oracle/";
// 도구마다 불러올 data·계산 파일 (guide.js보다 먼저). 데칸의 천문 계산(Astronomy Engine·astro.js)은 guide.js가 누를 때 불러온다
const TOOL_SCRIPTS = {
  manse: ["data-saju.js", "saju.js"],
  nakshatra: ["data-stars.js"],
  tzolkin: ["data-tzolkin.js", "calc.js"],
  decan: ["data-decans.js", "calc.js"],
  nameOgham: ["data-ogham.js", "calc.js"],
  runeDraw: ["data-runes.js", "calc.js"],
  sibyl: ["data-oracles.js", "calc.js"],
};
// 페이지 폴더 = 짧은 주소 이름 (/name-ogham/ → guide/name-ogham/)
const slugOf = (d) => d.path.replace(/^\/|\/$/g, "");
// 입구 index.html의 오검·마야 숫자 획(<symbol>)을 그대로 옮겨 쓴다 (모양의 원본은 하나)
const sprite = (prefix) => {
  const html = fs.readFileSync(path.join(P, "index.html"), "utf8");
  const syms = html.match(new RegExp(`<symbol id="${prefix}-[^"]+"[\\s\\S]*?</symbol>`, "g")) || [];
  if (!syms.length) throw new Error("index.html에 " + prefix + " 획이 없음");
  return `<svg class="gsprite" aria-hidden="true" focusable="false">${syms.join("")}</svg>`;
};

function build() {
  const { GUIDE: G } = load("data-guide.js");
  const { NAV: N } = load("data-nav.js");
  const { TEXT } = load("data.js");
  const { SAJU } = load("data-saju.js");
  const { NAKSHATRAS } = load("data-stars.js");
  const { RUNES } = load("data-runes.js");
  const ORIGIN = new URL(TEXT.site.url).origin;
  const GA4 = (TEXT.analytics && TEXT.analytics.ga4) || "";
  const navItem = (href) => { for (const g of N.groups) for (const it of g.items) if (it.href === href) return it; return null; };
  const hrefOf = (name) => (G.pages[name] || G.tools[name]).path;

  const sidenav = (current) => `<aside class="sidenav" id="sidenav" aria-label="${esc(N.open)}">
  <div class="sidenav__head"><a class="sidenav__brand" href="${PB}"><b>${esc(N.brand)}</b><small>${esc(N.brandSub)}</small></a><button class="sidenav__close" type="button" data-nav="close" aria-label="${esc(N.close)}">×</button></div>
${N.groups.map((g) => `  <nav class="sidenav__group" aria-label="${esc(g.head)}"><h2>${esc(g.head)}</h2><ul>${g.items.map((it) => `<li><a href="${esc(it.href)}"${it.ext ? ' target="_blank" rel="noopener"' : ""}${it.href === current ? ' aria-current="page"' : ""}>${esc(it.label)}${it.ext ? '<span class="ext">↗</span>' : ""}${it.note ? `<small>${esc(it.note)}</small>` : ""}</a></li>`).join("")}</ul></nav>`).join("\n")}
</aside>
<div class="sidenav-scrim" data-nav="close"></div>`;

  const table = (kind) => {
    if (kind === "stems") return `<ul class="gtable">${SAJU.stems.map((s) => `<li><span class="g-mark">${esc(s.hanja)}</span><div><b>${esc(s.name)}<small>${esc(s.title)}</small></b><span>${esc(s.keywords.join(" · "))}</span></div></li>`).join("")}</ul>`;
    if (kind === "nakshatras") return `<ul class="gtable">${NAKSHATRAS.map((n, i) => `<li><span class="g-mark num">${i + 1}</span><div><b>${esc(n.name)}<small>${esc(n.sanskrit)}</small></b><span>${esc(n.title)} · ${esc(n.symbol)}</span></div></li>`).join("")}</ul>`;
    if (kind === "runes") return `<ul class="gtable">${RUNES.map((r) => `<li><span class="g-mark rune">${esc(r.glyph)}</span><div><b>${esc(r.name)}<small>${esc(r.latin)}</small></b><span>${esc(r.image)} — ${esc(r.keyword)}</span></div></li>`).join("")}</ul>`;
    throw new Error("모르는 표: " + kind);
  };
  const sections = (list) => (list || []).map((s) => `<section><h2>${esc(s.head)}</h2>${s.lead ? `<p class="glead">${esc(s.lead)}</p>` : ""}${s.table ? table(s.table) : ""}${(s.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}</section>`).join("\n");
  const faq = (list) => `<section><h2>${esc(G.ui.faqHead)}</h2><div class="gfaq">${list.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div></section>`;
  const related = (names) => `<section><h2>${esc(G.ui.relatedHead)}</h2><ul class="grelated">${names.map((n) => { const href = hrefOf(n), it = navItem(href) || {}; return `<li><a href="${href}">${esc(it.label || n)}${it.note ? `<small>${esc(it.note)}</small>` : ""}</a></li>`; }).join("")}</ul></section>`;
  const foot = () => `<footer class="gfoot"><p class="gnote" data-js="cookie-line" hidden>${esc(TEXT.privacy.cookieLine)}</p><p><a href="${PB}legal/terms.html">${esc(TEXT.legal.links.terms)}</a><a href="${PB}legal/privacy.html">${esc(TEXT.legal.links.privacy)}</a></p><p>${esc(G.ui.footer)}</p></footer>`;
  const ldFaq = (list) => ({ "@type": "FAQPage", mainEntity: list.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });

  const timeRow = (F) => `<fieldset><legend>${esc(F.time)}</legend><div class="grow"><label class="gfield"><input name="h" type="number" inputmode="numeric" min="0" max="23" placeholder="0~23" aria-label="${esc(F.time)} ${esc(F.h)}" />${esc(F.h)}</label><label class="gfield"><input name="mi" type="number" inputmode="numeric" min="0" max="59" placeholder="0~59" aria-label="${esc(F.time)} ${esc(F.mi)}" />${esc(F.mi)}</label></div><label class="gcheck"><input name="notime" type="checkbox" />${esc(F.noTime)}</label></fieldset>`;
  const dateRow = (F) => `<fieldset><legend>${esc(F.date)}</legend><div class="grow"><label class="gfield"><input class="y" name="y" type="number" inputmode="numeric" min="1900" max="2099" placeholder="1995" aria-label="${esc(F.date)} ${esc(F.y)}" required />${esc(F.y)}</label><label class="gfield"><input name="m" type="number" inputmode="numeric" min="1" max="12" placeholder="1~12" aria-label="${esc(F.date)} ${esc(F.m)}" required />${esc(F.m)}</label><label class="gfield"><input name="d" type="number" inputmode="numeric" min="1" max="31" placeholder="1~31" aria-label="${esc(F.date)} ${esc(F.d)}" required />${esc(F.d)}</label></div></fieldset>`;
  const nameRow = (F) => `<label class="gfield gfield--wide"><span>${esc(F.name)}</span><input name="name" type="text" maxlength="20" placeholder="${esc(F.placeholder)}" autocomplete="off" required /></label>`;
  const askRow = (F) => `<label class="gfield gfield--wide"><span>${esc(F.question)}</span><textarea name="question" rows="2" maxlength="100" placeholder="${esc(F.placeholder)}"></textarea></label>`;
  const toolForm = (name, t) => {
    const F = t.form;
    const k = t.kind || "datetime";
    if (k !== "datetime") {
      const rows = k === "date" ? dateRow(F) : k === "name" ? nameRow(F) : k === "ask" ? askRow(F) : "";
      const note = k === "draw" ? "" : `<p class="gnote">${esc(G.ui.privacyNote)}</p>`;
      return `<form class="gform" data-js="tool-form" data-kind="${k}" novalidate autocomplete="off">${rows}${F.zone ? `<p class="gnote">${esc(F.zone)}</p>` : ""}${note}<p class="gerror" data-js="tool-error" role="alert" hidden></p><button class="gbtn" type="submit">${esc(F.submit)}</button></form>
<section class="gresult" data-js="tool-result" aria-live="polite" hidden></section>`;
    }
    const cal = name === "manse" ? `<fieldset><legend>${esc(F.calendar)}</legend><div class="grow"><span class="gseg"><label><input type="radio" name="cal" value="solar" checked /><span>${esc(F.solar)}</span></label><label><input type="radio" name="cal" value="lunar" /><span>${esc(F.lunar)}</span></label></span><label class="gcheck"><input name="leap" type="checkbox" />${esc(F.leap)}</label></div></fieldset>` : "";
    return `<form class="gform" data-js="tool-form" novalidate autocomplete="off">${cal}${dateRow(F)}${timeRow(F)}${F.zone ? `<p class="gnote">${esc(F.zone)}</p>` : ""}<p class="gnote">${esc(G.ui.privacyNote)}</p><p class="gerror" data-js="tool-error" role="alert" hidden></p><button class="gbtn" type="submit">${esc(F.submit)}</button></form>
<section class="gresult" data-js="tool-result" aria-live="polite" hidden></section>`;
  };

  const page = (name, d, kind) => {
    const url = ORIGIN + d.path;
    const ld = kind === "tool"
      ? [{ "@context": "https://schema.org", "@type": "WebApplication", name: d.h1, url, description: d.description, applicationCategory: "LifestyleApplication", operatingSystem: "Web", inLanguage: "ko", offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" }, publisher: { "@type": "Organization", name: N.brand } }, Object.assign({ "@context": "https://schema.org" }, ldFaq(d.faq))]
      : [{ "@context": "https://schema.org", "@type": "Article", headline: d.h1, description: d.description, inLanguage: "ko", mainEntityOfPage: url, publisher: { "@type": "Organization", name: N.brand } }, Object.assign({ "@context": "https://schema.org" }, ldFaq(d.faq))];
    const fonts = FONTS.concat(name === "rune" || name === "runeDraw" ? [RUNIC] : []);
    const scripts = ["/common/analytics.js", `${PB}data-nav.js`, `${PB}nav.js`, `${PB}data-guide.js`]
      .concat(kind === "tool" ? (TOOL_SCRIPTS[name] || []).map((f) => PB + f) : [])
      .concat([`${PB}guide.js`]);
    const sprites = name === "nameOgham" ? sprite("ogham") : name === "tzolkin" ? sprite("maya") : "";
    const body = kind === "tool"
      ? `<p class="geyebrow">${esc(d.eyebrow)}</p><h1>${esc(d.h1)}</h1><p class="glead">${esc(d.lead)}</p>
${toolForm(name, d)}
${sections(d.sections)}
${faq(d.faq)}
${related(d.related)}`
      : `<p class="geyebrow">${esc(d.eyebrow)}</p><h1>${esc(d.h1)}</h1>
${d.intro.map((p) => `<p>${esc(p)}</p>`).join("\n")}
${d.tool ? `<a class="gtool-link" href="${d.tool.href}">${esc(d.tool.label)}</a>` : ""}
${sections(d.sections)}
${faq(d.faq)}
<div class="gcta"><h2>${esc(d.cta.head)}</h2><p>${esc(d.cta.body)}</p><a class="gbtn" href="${PB}" data-js="to-room">${esc(d.cta.btn)}</a></div>
${related(d.related)}`;
    return `<!DOCTYPE html>
<html lang="ko" data-theme="night">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <!-- 이 파일은 tools/strange-oracle/gen-guide.js가 만든다. 문구는 data-guide.js·data-nav.js에서 고치고 스크립트를 다시 돌린다 -->
  <title>${esc(d.title)}</title>
  <meta name="description" content="${esc(d.description)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="${kind === "tool" ? "website" : "article"}" />
  <meta property="og:site_name" content="${esc(N.brand)}" />
  <meta property="og:locale" content="ko_KR" />
  <meta property="og:title" content="${esc(d.title)}" />
  <meta property="og:description" content="${esc(d.description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ORIGIN}${PB}og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#080717" />
  <link rel="icon" href="data:," />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
${fonts.map(([f, sri]) => `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/${f}" integrity="${sri}" crossorigin="anonymous" />`).join("\n")}
  <link rel="stylesheet" href="/common/base.css" />
  <link rel="stylesheet" href="${PB}guide.css" />
  <link rel="stylesheet" href="${PB}nav.css" />
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
  <script>window.GUIDE_PAGE = ${JSON.stringify({ page: name, kind, ga4: GA4 })};</script>
${scripts.map((s) => `  <script defer src="${s}"></script>`).join("\n")}
</head>
<body>
${sprites}<header class="gtop"><div class="gtop__inner"><button class="nav-toggle" type="button" data-nav="open" aria-label="${esc(N.open)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button><a class="gtop__brand" href="${PB}">${esc(N.brand)}</a><a class="gtop__go" href="${PB}" data-js="to-room">${esc(G.ui.toEntrance)}</a></div></header>
${sidenav(d.path)}
<main class="gpage">
${body}
${foot()}
</main>
</body>
</html>
`;
  };

  const files = [];
  const urls = [];
  const rewrites = [];
  for (const [kind, group] of [["page", G.pages], ["tool", G.tools]]) {
    for (const [name, d] of Object.entries(group)) {
      if (kind === "tool" && !TOOL_SCRIPTS[name]) throw new Error("TOOL_SCRIPTS에 없는 도구: " + name);
      files.push({ path: path.join(P, "guide", slugOf(d), "index.html"), html: page(name, d, kind) });
      urls.push(ORIGIN + d.path);
      rewrites.push([d.path, `${PB}guide/${slugOf(d)}/index.html`]);
    }
  }
  return { files, urls, origin: ORIGIN, rewrites, netlify: netlifyBlock(rewrites) };
}

// netlify.toml의 짧은 주소 칸 (표시 사이를 통째로 바꾼다)
const NB = "# >>> gen-guide 짧은 주소 (tools/strange-oracle/gen-guide.js가 쓴다. 손으로 고치지 말 것)";
const NE = "# <<< gen-guide 짧은 주소";
function netlifyBlock(rewrites) {
  const r = (from, to, status) => `[[redirects]]\n  from = "${from}"\n  to = "${to}"\n  status = ${status}\n  force = true`;
  return [NB].concat(rewrites.flatMap(([p, f]) => [r(p.replace(/\/$/, ""), p, 301), r(p, f, 200)]), [NE]).join("\n");
}
const TOML = path.join(ROOT, "netlify.toml");
function tomlWith(block) {
  const cur = fs.readFileSync(TOML, "utf8");
  const a = cur.indexOf(NB), b = cur.indexOf(NE);
  if (a < 0 || b < a) throw new Error("netlify.toml에 gen-guide 표시가 없음");
  return cur.slice(0, a) + block + cur.slice(b + NE.length);
}

// 짧은 주소 → 파일 (data-guide.js만 읽는 가벼운 판, 모의 서버가 요청마다 부른다)
function routes() {
  const { GUIDE: G } = load("data-guide.js");
  return Object.values(G.pages).concat(Object.values(G.tools)).map((d) => [d.path, `${PB}guide/${slugOf(d)}/index.html`]);
}

module.exports = { build, routes };
if (require.main === module) {
  const { files, netlify } = build();
  files.push({ path: TOML, html: tomlWith(netlify) });
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const f of files) {
    const cur = fs.existsSync(f.path) ? fs.readFileSync(f.path, "utf8") : null;
    if (cur === f.html) continue;
    stale++;
    if (check) console.error(`오래됨: ${path.relative(ROOT, f.path)} — node tools/strange-oracle/gen-guide.js를 돌리세요`);
    else { fs.mkdirSync(path.dirname(f.path), { recursive: true }); fs.writeFileSync(f.path, f.html); console.log(`  썼음: ${path.relative(ROOT, f.path)}`); }
  }
  if (check && stale) process.exit(1);
  if (!stale) console.log("안내·도구 페이지: 바뀐 것 없음");
}
