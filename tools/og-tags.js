// 배포본(dist)의 공유 미리보기 태그 도우미 (tools/build-dist.js가 쓴다. 제품 원본 파일은 건드리지 않는다).
// 서비스 주소는 제품 data.js 맨 위 설정 한 줄(TEXT.site.url)에서만 읽는다 (spec 10-2).
//   - 비어 있으면: og:url·canonical을 넣지 않고 og:image는 상대 경로 그대로.
//   - 값이 있으면: "https://"로 시작하고 "/"로 끝나며 쿼리·해시가 없어야 한다. 아니면 오류.
const vm = require("vm");

// data.js 글자 → site.url (없으면 ""). data.js는 window.TEXT만 채우는 파일이다
function readSiteUrl(dataJsText) {
  const w = {};
  vm.runInNewContext(dataJsText, { window: w });
  const url = w.TEXT && w.TEXT.site ? w.TEXT.site.url : "";
  return typeof url === "string" ? url.trim() : "";
}
// 모양 검사: 맞으면 null, 틀리면 이유 글자
function siteUrlProblem(url) {
  if (url === "") return null;
  if (!/^https:\/\//.test(url)) return 'site.url은 "https://"로 시작해야 합니다';
  if (!url.endsWith("/")) return 'site.url은 "/"로 끝나야 합니다 (제품 페이지의 전체 주소)';
  if (/[?#\s"<>]/.test(url)) return "site.url에 쿼리(?)·해시(#)·공백·따옴표를 넣을 수 없습니다";
  try {
    if (new URL(url).href !== url) return "site.url 모양이 주소로 읽히지 않습니다";
  } catch (e) {
    return "site.url 모양이 주소로 읽히지 않습니다";
  }
  return null;
}
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const unattr = (s) => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&amp;/g, "&");
// 제품 index.html 머리에서 제목·설명·og 값을 읽는다
function readHead(html) {
  const pick = (re) => {
    const m = html.match(re);
    return m ? unattr(m[1]) : "";
  };
  return {
    title: pick(/<title>([^<]*)<\/title>/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    ogTitle: pick(/<meta property="og:title" content="([^"]*)"/),
    ogDescription: pick(/<meta property="og:description" content="([^"]*)"/),
    ogImage: pick(/<meta property="og:image" content="([^"]*)"/),
  };
}
// 제품 index.html(글자) → og:image 절대 경로 + og:url·canonical을 넣은 글자. siteUrl이 비면 그대로 돌려준다
function injectOg(html, siteUrl) {
  if (!siteUrl) return html;
  const re = /^([ \t]*)<meta property="og:image" content="([^"]*)" \/>/m;
  const m = html.match(re);
  if (!m) throw new Error("og:image 태그를 찾지 못했습니다");
  if (/property="og:url"|rel="canonical"/.test(html)) throw new Error("원본에 og:url·canonical이 이미 있습니다 (원본에는 두지 않는다)");
  const image = /^https?:\/\//.test(m[2]) ? m[2] : siteUrl + m[2].replace(/^\.?\//, "");
  const nl = html.includes("\r\n") ? "\r\n" : "\n";
  const lines = [
    `${m[1]}<meta property="og:image" content="${attr(image)}" />`,
    `${m[1]}<meta property="og:url" content="${attr(siteUrl)}" />`,
    `${m[1]}<link rel="canonical" href="${attr(siteUrl)}" />`,
  ];
  return html.replace(re, () => lines.join(nl));
}
// dist/public/index.html (루트 → 제품으로 이동하는 쪽). 루트 주소로 공유돼도 미리보기가 비지 않게 제품과 같은 태그를 넣는다
function rootPage(home, head, siteUrl) {
  const tags = [`<title>${attr(head.title)}</title>`, `<meta name="description" content="${attr(head.description)}" />`];
  if (siteUrl) {
    const image = /^https?:\/\//.test(head.ogImage) ? head.ogImage : siteUrl + head.ogImage.replace(/^\.?\//, "");
    tags.push(
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${attr(head.ogTitle || head.title)}" />`,
      `<meta property="og:description" content="${attr(head.ogDescription || head.description)}" />`,
      `<meta property="og:image" content="${attr(image)}" />`,
      `<meta property="og:url" content="${attr(siteUrl)}" />`,
      `<link rel="canonical" href="${attr(siteUrl)}" />`
    );
  }
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=products/${home}/" />
  <meta name="color-scheme" content="dark" />
  ${tags.join("\n  ")}
  <script>location.replace("products/${home}/" + location.search + location.hash);</script>
  <style>html,body{margin:0;min-height:100%;background:#120f1c}</style>
</head>
<body><noscript><a href="products/${home}/" style="color:#e8dcc0">낯선 점술관으로 가기</a></noscript></body>
</html>
`;
}
module.exports = { readSiteUrl, siteUrlProblem, readHead, injectOg, rootPage };
