// (2026-11-22 운영자) 인스타그램 자동 게시 — Instagram API(페이스북 토큰 EAA… = graph.facebook.com 기본 · Instagram 로그인 토큰 IG… = IG_HOST=graph.instagram.com).
// 토큰은 코드·파일·출력 어디에도 없다: 클라우드 환경의 Network secret(그 호스트, Authorization: Bearer)이 요청에 붙는다.
//   그래서 요청은 프록시를 따르는 curl로 보낸다(Node 내장 fetch는 HTTPS_PROXY를 따르지 않음).
// 사진·영상은 공개 주소여야 한다: 저장소(공개)에 올린 커밋을 jsDelivr로 연다 → https://cdn.jsdelivr.net/gh/tjdgus0190/Stars@<커밋>/<경로>
//
// 쓰는 법(저장소 루트):
//   node tools/strange-oracle/ig-publish.js whoami
//   node tools/strange-oracle/ig-publish.js recent [개수]                          → 최근 게시물(첫 줄·시각·주소) — 같은 이야기를 다시 올리지 않으려고 본다
//   node tools/strange-oracle/ig-publish.js carousel <커밋> <캡션파일> <사진.jpg> <사진.jpg> ...   → 컨테이너 id(아직 게시 안 함)
//   node tools/strange-oracle/ig-publish.js reel <커밋> <캡션파일> <영상.mp4> [표지.jpg]          → 처리 끝날 때까지 기다린 컨테이너 id
//   node tools/strange-oracle/ig-publish.js publish <컨테이너 id>                                  → 게시물 id·주소
//   node tools/strange-oracle/ig-publish.js insights [개수]                        → 최근 게시물별 조회·도달·저장·공유·좋아요·댓글(성과로 배우기)
//   node tools/strange-oracle/ig-publish.js check-url <커밋> <경로>                                  → jsDelivr가 그 파일을 내주는지(형식·크기)
// 결과는 마지막 줄에 JSON 한 줄. 실패하면 종료 코드 1과 {"error": ...}
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPO = "tjdgus0190/Stars";
// (2026-11-22) 토큰 종류에 따라 주소가 다르다: 「Instagram 로그인」 토큰(IG…) = graph.instagram.com, 페이스북·시스템 사용자 토큰(EAA…) = graph.facebook.com(기본).
//   IG_HOST=graph.instagram.com 으로 바꿀 수 있다. Network secret도 같은 호스트에 넣어야 한다.
const HOST = process.env.IG_HOST || "graph.facebook.com";
const FB = HOST === "graph.facebook.com";
const API = `https://${HOST}/${process.env.IG_API_VERSION || "v23.0"}`;
const ROOT = path.resolve(__dirname, "..", "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (o) => { console.log(JSON.stringify(o)); };
const fail = (msg, extra) => { out(Object.assign({ error: msg }, extra || {})); process.exit(1); };

function curl(method, url, fields) {
  const args = ["-sS", "--max-time", "120", "-X", method, url];
  for (const [k, v] of Object.entries(fields || {})) if (v != null) args.push("--form-string", `${k}=${v}`);
  const r = spawnSync("curl", args, { encoding: "utf8" });
  if (r.status !== 0) fail("curl 실패", { stderr: String(r.stderr).slice(0, 300) });
  let j = null;
  try { j = JSON.parse(r.stdout); } catch (e) { fail("JSON이 아닌 응답", { body: String(r.stdout).slice(0, 300) }); }
  if (j && j.error) fail("인스타그램 API 오류", { api: { message: j.error.message, type: j.error.type, code: j.error.code, sub: j.error.error_subcode } });
  return j;
}
const cdn = (sha, rel) => {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) fail("커밋 값이 이상함");
  const p = path.relative(ROOT, path.resolve(ROOT, rel)).split(path.sep).join("/");
  if (p.startsWith("..")) fail("저장소 밖 파일");
  return `https://cdn.jsdelivr.net/gh/${REPO}@${sha}/${p}`;
};
function head(url) {
  const r = spawnSync("curl", ["-sSI", "--max-time", "60", url], { encoding: "utf8" });
  const t = String(r.stdout);
  return { status: Number((/^HTTP\/[\d.]+ (\d+)/m.exec(t.split(/\r?\n\r?\n/).filter(Boolean).pop() || "") || [])[1] || 0), type: (/content-type:\s*([^\r\n;]+)/i.exec(t) || [])[1] || "", size: Number((/content-length:\s*(\d+)/i.exec(t) || [])[1] || 0) };
}
// jsDelivr가 새 커밋 파일을 내줄 때까지(처음엔 몇 초 걸릴 수 있다)
async function ready(url, type) {
  for (let i = 0; i < 20; i++) {
    const h = head(url);
    if (h.status === 200 && h.type.startsWith(type)) return h;
    await sleep(5000);
  }
  fail("공개 주소에서 파일을 못 받음(커밋을 push했는지, jsDelivr 크기 제한 20MB 이하인지)", { url });
}
const caption = (f) => {
  const c = fs.readFileSync(f, "utf8").trim();
  if (!c) fail("캡션이 비었음");
  if (c.length > 2200) fail("캡션이 2,200자를 넘음");
  if ((c.match(/#[^\s#]+/g) || []).length > 30) fail("해시태그가 30개를 넘음");
  return c;
};
// 인스타 계정 id: IG 토큰이면 /me, 페이스북 토큰이면 연결된 페이지의 인스타 비즈니스 계정(IG_USER_ID로 정할 수도 있다)
let ME = null;
const me = () => {
  if (ME) return ME;
  if (process.env.IG_USER_ID) return (ME = { user_id: process.env.IG_USER_ID, username: null });
  if (!FB) return (ME = curl("GET", `${API}/me?fields=user_id,username`));
  const pages = curl("GET", `${API}/me/accounts?fields=name,instagram_business_account{id,username}&limit=50`);
  const hit = (pages.data || []).find((x) => x.instagram_business_account);
  if (!hit) fail("이 토큰으로 볼 수 있는 페이스북 페이지에 연결된 인스타 계정이 없음(인스타를 페이지에 연결하고, 토큰에 pages_show_list·instagram_basic 권한)", { pages: (pages.data || []).map((x) => x.name) });
  return (ME = { user_id: hit.instagram_business_account.id, username: hit.instagram_business_account.username, page: hit.name });
};
const MEDIA_OF = () => `${API}/${me().user_id}/media`;

(async () => {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === "whoami") return out(me());
  if (cmd === "recent") {
    const n = Math.min(50, Number(a[0]) || 30);
    const r = curl("GET", `${MEDIA_OF()}?fields=id,caption,timestamp,permalink,media_type&limit=${n}`);
    return out({ items: (r.data || []).map((x) => ({ at: x.timestamp, type: x.media_type, first: String(x.caption || "").split("\n")[0].slice(0, 80), tag: (/\[([a-z]+-[0-9a-z-]+)\]/.exec(x.caption || "") || [])[1] || null, url: x.permalink })) });
  }
  // (2026-11-22) 성과: 최근 게시물마다 조회·도달·저장·공유(권한 instagram_business_manage_insights가 있어야 함, 없으면 그 칸만 null)
  if (cmd === "insights") {
    const n = Math.min(30, Number(a[0]) || 15);
    const r = curl("GET", `${MEDIA_OF()}?fields=id,caption,timestamp,permalink,media_type,like_count,comments_count&limit=${n}`);
    const rows = [];
    for (const x of r.data || []) {
      let m = {};
      const q = spawnSync("curl", ["-sS", "--max-time", "60", `${API}/${x.id}/insights?metric=views,reach,saved,shares,total_interactions`], { encoding: "utf8" });
      try { const j = JSON.parse(q.stdout); (j.data || []).forEach((d) => { m[d.name] = d.values && d.values[0] ? d.values[0].value : d.total_value ? d.total_value.value : null; }); if (j.error) m = { error: j.error.message.slice(0, 80) }; } catch (e) { m = {}; }
      rows.push({ at: x.timestamp, type: x.media_type, first: String(x.caption || "").split("\n")[0].slice(0, 80), likes: x.like_count, comments: x.comments_count, ...m, url: x.permalink });
    }
    return out({ items: rows });
  }
  if (cmd === "check-url") { const u = cdn(a[0], a[1]); return out(Object.assign({ url: u }, head(u))); }
  if (cmd === "carousel") {
    const [sha, capFile, ...imgs] = a;
    if (imgs.length < 2 || imgs.length > 10) fail("캐러셀 사진은 2~10장");
    if (!imgs.every((f) => /\.jpe?g$/i.test(f) && fs.existsSync(f))) fail("사진은 저장소 안의 JPEG 파일");
    const cap = caption(capFile);
    const id = me().user_id || me().id;
    const kids = [];
    for (const f of imgs) {
      const u = cdn(sha, f);
      await ready(u, "image/jpeg");
      kids.push(curl("POST", `${API}/${id}/media`, { image_url: u, is_carousel_item: "true" }).id);
    }
    const c = curl("POST", `${API}/${id}/media`, { media_type: "CAROUSEL", children: kids.join(","), caption: cap });
    return out({ container: c.id, children: kids.length });
  }
  if (cmd === "reel") {
    const [sha, capFile, video, cover] = a;
    if (!/\.mp4$/i.test(video || "") || !fs.existsSync(video)) fail("영상은 저장소 안의 mp4 파일");
    const cap = caption(capFile);
    const id = me().user_id || me().id;
    const vu = cdn(sha, video);
    await ready(vu, "video/mp4");
    const fields = { media_type: "REELS", video_url: vu, caption: cap, share_to_feed: "true" };
    if (cover) { const cu = cdn(sha, cover); await ready(cu, "image/jpeg"); fields.cover_url = cu; }
    const c = curl("POST", `${API}/${id}/media`, fields);
    for (let i = 0; i < 60; i++) { // 영상 처리: 최대 약 10분
      const s = curl("GET", `${API}/${c.id}?fields=status_code,status`);
      if (s.status_code === "FINISHED") return out({ container: c.id });
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") fail("영상 처리 실패", { status: s.status });
      await sleep(10000);
    }
    fail("영상 처리가 10분 안에 끝나지 않음", { container: c.id });
  }
  if (cmd === "publish") {
    const cid = a[0];
    if (!/^\d+$/.test(cid || "")) fail("컨테이너 id가 이상함");
    const id = me().user_id || me().id;
    const p = curl("POST", `${API}/${id}/media_publish`, { creation_id: cid });
    const m = curl("GET", `${API}/${p.id}?fields=permalink,timestamp`);
    return out({ media: p.id, url: m.permalink, at: m.timestamp });
  }
  fail("명령: whoami | recent | insights | carousel | reel | publish | check-url");
})();
