// 낯선 점술관 · 16단계 친구 궁합 지도 — 화면 쪽 (specs 16-2·16-3·16-4·16-6, design 「16단계」)
// 지도 기능을 쓸 때만 app.js가 불러온다(지연 불러오기). map.mode off 배포판에는 이 파일이 없다(build-dist ⑪).
//
// 계산은 모두 이 브라우저 안에서 한다(CLAUDE.md 3장 예외): 궁합 점수(16-4 공식), 지도 위치(16-3의 2), 순위, 문장 고르기.
// 서버(지도 Worker)는 기록을 맡아 두고 돌려줄 뿐이다. 서버로 가는 칸은 아래 SEND 표가 전부다(16-5의 1).
//
// 개인정보 (CLAUDE.md 6장 예외 2, spec 16-6)
//  - 보내는 것: 사용자가 동의 화면에서 [보내기]를 누를 때만 별명(새로 적은 것)·아이콘 코드·주/보조 원형 코드. 그 밖에는 초대 ID·열람 키·삭제 코드(무작위 값)뿐.
//  - 이름·생년월일·태어난 시각·성별·방별 결과·질문·이어가기 코드·열람 코드(SOP)는 보내지 않는다.
//  - 실명·생일 별명 검사와 만 14세 확인은 이 파일 안에서만 비교한다. 비교 결과·나이도 어디에도 보내지 않는다(분석 이벤트 없음).
//  - 저장: localStorage "strange-oracle-mapkey" = 열람 키 문자열 하나 / sessionStorage "strange-oracle-map" = join·joined·del / 그 밖은 메모리.
//  - 열람 키·삭제 코드·별명은 console·분석·주소에 쓰지 않는다. 주소에는 초대 ID만(#join=, 공유 링크).
//  - 분석 이벤트는 행동 이름만(map_create·map_join·map_view·map_leave·map_erase·map_forget·map_down), 매개변수 없음.
(function (root) {
  "use strict";

  // ═════════ 1. 순수 계산 (Node 시험 map-score.test.js도 이 부분을 그대로 쓴다) ═════════
  const ARCH = ["warrior", "sage", "lover", "rebel", "caregiver", "explorer", "creator", "ruler"];
  const AXES = ["act", "talk", "heart", "order", "free"];
  // 16-4의 1 원형 프로필 표 (축마다 0~4). 문구가 아니라 계산 상수다. 고칠 때는 tests.md 「16단계 · 점수 분포」에 적는다
  const PROFILE = {
    warrior: [4, 1, 1, 2, 2],
    sage: [1, 4, 1, 3, 1],
    lover: [1, 2, 4, 1, 2],
    rebel: [3, 2, 1, 0, 4],
    caregiver: [1, 1, 4, 3, 0],
    explorer: [2, 3, 1, 0, 4],
    creator: [2, 3, 2, 2, 2],
    ruler: [3, 1, 1, 4, 0],
  };
  const isArch = (a) => ARCH.includes(a);
  // 64개 코드: 주·보조(다름) 56 + 보조 = 주 8
  const CODES = [];
  ARCH.forEach((m) => ARCH.forEach((s) => CODES.push({ main: m, sub: s })));

  // 사람 벡터 v = 0.7 × 프로필[주] + 0.3 × 프로필[보조]
  const vec = (c) => PROFILE[c.main].map((x, k) => 0.7 * x + 0.3 * PROFILE[c.sub][k]);
  // 축 점수 s_k = round(100 × (0.6 × (4 − |a−b|) + 0.4 × min(a, b)) / 4)
  function axisScores(ca, cb) {
    const a = vec(ca);
    const b = vec(cb);
    return a.map((x, k) => Math.round((100 * (0.6 * (4 - Math.abs(x - b[k])) + 0.4 * Math.min(x, b[k]))) / 4));
  }
  const rawOf = (ca, cb) => axisScores(ca, cb).reduce((s, x) => s + x, 0);
  // 표시 점수용 표: 순서 없는 모든 쌍 2,080개(같은 코드끼리 포함)의 raw, 오름차순. 처음 쓸 때 한 번 만든다
  let SORTED = null;
  function sortedRaws() {
    if (SORTED) return SORTED;
    const list = [];
    for (let i = 0; i < CODES.length; i++) for (let j = i; j < CODES.length; j++) list.push(rawOf(CODES[i], CODES[j]));
    SORTED = list.sort((x, y) => x - y);
    return SORTED;
  }
  // 백분위 q = (처음으로 raw 이상인 자리 + 마지막으로 raw 이하인 자리) / 2 / (N − 1), 점수 = round(40 + 59q)
  function displayOf(raw) {
    const s = sortedRaws();
    const N = s.length;
    let lo = 0, hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid] >= raw) hi = mid;
      else lo = mid + 1;
    }
    const first = lo;
    lo = 0;
    hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid] > raw) hi = mid;
      else lo = mid + 1;
    }
    const last = lo - 1;
    const q = (Math.min(first, N - 1) + Math.max(last, 0)) / 2 / (N - 1);
    return Math.round(40 + 59 * q);
  }
  const bandOf = (score) => (score >= 90 ? 0 : score >= 75 ? 1 : score >= 60 ? 2 : 3);
  const argBest = (arr, better) => arr.reduce((bi, x, i) => (better(x, arr[bi]) ? i : bi), 0); // 동점이면 번호가 작은 축
  // 궁합 한 쌍: 결정적·대칭(점수(A,B) = 점수(B,A))
  function match(ca, cb) {
    const axes = axisScores(ca, cb);
    const raw = axes.reduce((s, x) => s + x, 0);
    const score = displayOf(raw);
    return { axes, raw, score, band: bandOf(score), top: argBest(axes, (x, y) => x > y), low: argBest(axes, (x, y) => x < y) };
  }
  // 관계 한 줄 키: 두 주 원형의 순서 없는 쌍(ARCH 순서로 앞 → 뒤)
  const pairKey = (a, b) => (ARCH.indexOf(a) <= ARCH.indexOf(b) ? `${a}_${b}` : `${b}_${a}`);

  // 주·보조 원형(16-2의 2): 장 순서대로 놓인 원형 목록에서 횟수 많은 순, 동점이면 앞선 장. 2위가 없으면 보조 = 주
  function archPair(list) {
    const tally = {};
    list.forEach((a, idx) => {
      if (!isArch(a)) return;
      const t = (tally[a] = tally[a] || { count: 0, first: idx });
      t.count += 1;
    });
    const ranked = Object.entries(tally).sort((x, y) => y[1].count - x[1].count || x[1].first - y[1].first).map((e) => e[0]);
    if (!ranked.length) return null;
    return { main: ranked[0], sub: ranked[1] || ranked[0] };
  }

  // FNV-1a 32비트 (기록 ID 글자마다 UTF-16 코드 단위)
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  // 지도 배치 (16-3의 2). 좌표계: 외접원 반지름 100, 꼭짓점 k 방향 −90° + 72°×k
  const GEO = { R: 100, d: 16, step: 4, wScore: 0.5, wRank: 0.5 };
  GEO.a = GEO.R * Math.cos(Math.PI / 5); // 가운데에서 변까지 ≈ 80.9
  GEO.rMin = GEO.d;
  GEO.rMax = Math.floor(GEO.a - GEO.d / 2 - 1); // 71
  // 줄 세우기: 점수 높은 순 → 참여 날 이른 순 → 기록 ID 순
  const rankSort = (list) =>
    list.slice().sort((x, y) => y.score - x.score || (x.joined < y.joined ? -1 : x.joined > y.joined ? 1 : 0) || (x.rid < y.rid ? -1 : x.rid > y.rid ? 1 : 0));
  // items: [{ rid, joined, score, top }] → 같은 순서(순위)로 { …, i, r, deg, x, y, stacked }
  function place(items, opts) {
    const g = Object.assign({}, GEO, opts || {});
    const list = rankSort(items);
    const n = list.length;
    const placed = [];
    list.forEach((f, i) => {
      const u = (99 - f.score) / 59;
      const w = n > 1 ? Math.sqrt(i / (n - 1)) : 0;
      const r = g.rMin + (g.rMax - g.rMin) * (g.wScore * u + g.wRank * w);
      const base = -90 + 72 * f.top + ((fnv1a(String(f.rid)) % 41) - 20);
      const at = (deg) => ({ x: r * Math.cos((deg * Math.PI) / 180), y: r * Math.sin((deg * Math.PI) / 180) });
      const free = (p) => placed.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= g.d);
      let deg = base;
      let p = at(base);
      let stacked = false;
      if (!free(p)) {
        stacked = true;
        for (let k = 1; k * g.step <= 180; k++) {
          const tries = [base + k * g.step, base - k * g.step];
          const hit = tries.find((t) => free(at(t)));
          if (hit !== undefined) {
            deg = hit;
            p = at(hit);
            stacked = false;
            break;
          }
        }
        if (stacked) {
          deg = base;
          p = at(base);
        }
      }
      placed.push(Object.assign({}, f, { i, r, deg, x: p.x, y: p.y, stacked }));
    });
    return placed;
  }
  // 점 p를 중심으로 지름 d인 원이 오각형 안에 있는가 (변까지 거리 ≥ d/2)
  function insidePentagon(p, d) {
    for (let k = 0; k < 5; k++) {
      const mid = ((-90 + 72 * k + 36) * Math.PI) / 180; // 변의 바깥 법선 방향
      if (p.x * Math.cos(mid) + p.y * Math.sin(mid) > GEO.a - d / 2) return false;
    }
    return true;
  }

  // 키·코드 표준형 (friend-map/core.js canon과 같은 규칙): 공백·하이픈 제거, 대문자, 접두사 떼기, O→0, I·L→1, Crockford 26자
  const B32_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  function canon(str, prefix) {
    if (typeof str !== "string" || str.length > 64) return null;
    let s = str.trim().replace(/[\s-]+/g, "").toUpperCase();
    if (s.startsWith(prefix)) s = s.slice(prefix.length);
    s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
    return B32_RE.test(s) ? s : null;
  }
  const pretty = (prefix, c) => prefix + "-" + c.match(/.{1,4}/g).join("-");
  const INVITE_RE = /^[A-Za-z0-9_-]{22}$/;
  // 넣은 글자가 다른 종류의 코드인가(오입력 안내). 결과: "SOP" | "SOG" | "SOM" | "SOD" | ""
  const prefixOf = (str) => {
    const m = /^\s*(SO[PGMD])/i.exec(String(str || ""));
    return m ? m[1].toUpperCase() : "";
  };

  // 별명 검사 (16-2의 3). ctx = { name, birth: {y,m,d} } — 이 탭 안의 값, 비교에만 쓰고 결과도 보내지 않는다.
  // 결과: null(통과) | "length" | "char" | "name" | "birth" | "phone" | "link"
  const normCmp = (s) => String(s || "").normalize("NFC").replace(/[\s.\-‐-―]/g, "").toLowerCase();
  function birthBits(b) {
    if (!b || !b.y || !b.m || !b.d) return [];
    const y = String(b.y), mm = String(b.m).padStart(2, "0"), dd = String(b.d).padStart(2, "0");
    const m1 = String(b.m), d1 = String(b.d);
    return Array.from(new Set([y, y.slice(2) + mm + dd, mm + dd, m1 + dd, mm + d1])).filter((s) => s.length >= 3);
  }
  function nickProblem(raw, ctx) {
    const nick = String(raw || "").normalize("NFC").trim();
    const len = Array.from(nick).length;
    if (len < 1 || len > 8) return "length";
    if (/[<>\u0000-\u001f\u007f-\u009f]/.test(nick)) return "char";
    const c = ctx || {};
    const n = normCmp(nick);
    const name = normCmp(c.name);
    if (name) {
      if (n === name || n.includes(name)) return "name";
      if (/^[가-힣]{2,4}$/.test(name)) {
        const given = name.slice(1);
        if (given.length >= 2 && n.includes(given)) return "name";
      }
    }
    if (birthBits(c.birth).some((bit) => n.includes(bit))) return "birth";
    if ((nick.match(/\d/g) || []).length >= 7) return "phone";
    if (/http|www|@|\.com|\.kr/i.test(nick)) return "link";
    return null;
  }
  // 만 나이 (16-2의 4): 올해 − 태어난 해 − (오늘 월일이 생일 월일보다 앞이면 1)
  function ageOf(b, today) {
    const t = today || new Date();
    const y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
    return y - b.y - (m < b.m || (m === b.m && d < b.d) ? 1 : 0);
  }
  // "1995.03.21" · "1995-3-21" · "19950321" → {y,m,d} | null (달력 확인)
  function parseBirth(str) {
    const s = String(str || "").trim();
    let m = /^(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/.exec(s) || /^(\d{4})(\d{2})(\d{2})$/.exec(s);
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (y < 1900 || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d || dt > new Date()) return null;
    return { y, m: mo, d };
  }

  const Core = { ARCH, AXES, PROFILE, CODES, GEO, vec, axisScores, rawOf, sortedRaws, displayOf, bandOf, match, pairKey, archPair, fnv1a, rankSort, place, insidePentagon, canon, pretty, prefixOf, INVITE_RE, nickProblem, birthBits, ageOf, parseBirth };
  if (typeof module === "object" && module.exports) {
    module.exports = Core;
    return;
  }

  // ═════════ 2. 화면 (app.js가 mount(ctx)를 한 번 부른다) ═════════
  const KEY_LS = "strange-oracle-mapkey"; // 열람 키 문자열 하나(6장 예외 2)
  const SES = "strange-oracle-map"; // { join, joined: [초대 ID…], del }
  const TIMEOUT = 8000;

  function mount(ctx) {
    const { T, js, jsAll, show, applyText } = ctx;
    const M = T.map;
    const doc = document;
    const API = String(M.api || "").replace(/\/+$/, "");

    // ── 저장소 (실패해도 이 화면 안에서만 기억)
    const ses = () => {
      try {
        const o = JSON.parse(window.sessionStorage.getItem(SES) || "null");
        return o && typeof o === "object" ? o : {};
      } catch (e) {
        return {};
      }
    };
    const sesPut = (patch) => {
      const o = Object.assign(ses(), patch);
      const c = {};
      if (o.join && INVITE_RE.test(o.join)) c.join = o.join;
      if (Array.isArray(o.joined)) {
        const j = o.joined.filter((x) => INVITE_RE.test(x)).slice(-10);
        if (j.length) c.joined = j;
      }
      if (o.del && canon(o.del, "SOD")) c.del = o.del;
      try {
        if (Object.keys(c).length) window.sessionStorage.setItem(SES, JSON.stringify(c));
        else window.sessionStorage.removeItem(SES);
      } catch (e) {
        /* 저장 막힘 */
      }
    };
    const keyGet = () => {
      try {
        const c = canon(window.localStorage.getItem(KEY_LS) || "", "SOM");
        return c ? pretty("SOM", c) : "";
      } catch (e) {
        return "";
      }
    };
    const keySet = (k) => {
      try {
        if (k) window.localStorage.setItem(KEY_LS, k);
        else window.localStorage.removeItem(KEY_LS);
      } catch (e) {
        /* 저장 막힘 */
      }
    };

    // ── 메모리 (화면을 떠나거나 내 정보 지우기 → 비움)
    const mem = { birth: null, owner: null, ownerOf: "", map: null, me: null, drawn: false, peek: "", downSent: false };

    // ── 서버 요청 (시간 초과 8초, 자동 재전송 없음). 본문은 SEND 표의 칸만
    const SEND = { create: ["nick", "icon", "main", "sub"], join: ["invite", "nick", "icon", "main", "sub"], peek: ["invite"], view: ["key"], erase: null };
    async function req(path, body) {
      if (!API) return { kind: "down" };
      const keys = SEND[path];
      const b = keys ? Object.fromEntries(keys.map((k) => [k, body[k]])) : body;
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = setTimeout(() => ctl && ctl.abort(), TIMEOUT);
      try {
        const r = await fetch(`${API}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b), signal: ctl ? ctl.signal : undefined, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
        let data = {};
        try {
          data = await r.json();
        } catch (e) {
          data = {};
        }
        if (r.ok) return { ok: true, data };
        const code = (data && data.error) || "";
        if (r.status === 404) return { kind: "notfound" };
        if (r.status === 409) return { kind: code === "full" ? "full" : "closed" };
        if (r.status === 400 && code === "nick") return { kind: "nick" };
        if (r.status === 429) return { kind: "rate", wait: Math.max(1, Number(r.headers.get("Retry-After")) || 60) };
        if (r.status === 400 || r.status === 413) return { kind: "bad" };
        return { kind: "down" };
      } catch (e) {
        return { kind: e && e.name === "AbortError" ? "timeout" : "down" };
      } finally {
        clearTimeout(timer);
      }
    }
    const isDown = (r) => r.kind === "down" || r.kind === "rate" || r.kind === "timeout" || r.kind === "bad";
    function noteDown() {
      if (mem.downSent) return;
      mem.downSent = true;
      ctx.track("map_down");
    }

    // ── 글자 도우미: {자리}에 값을 글자로 끼운다(별명은 <b>, innerHTML 쓰지 않음)
    function fillInto(el, tpl, vars, bold) {
      if (!el) return;
      el.textContent = "";
      String(tpl || "").split(/(\{\w+\})/).forEach((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (m && m[1] in vars) {
          if (bold && bold.includes(m[1])) {
            const b = doc.createElement("b");
            b.textContent = String(vars[m[1]]);
            el.append(b);
          } else el.append(String(vars[m[1]]));
        } else if (part) el.append(part);
      });
    }
    const archName = (a) => (T.archetypes[a] ? T.archetypes[a].name : "");
    const iconHref = (ic) => `#map-${/^i(0[1-9]|1\d|2[0-4])$/.test(ic) ? ic : "i03"}`;
    const setIcon = (use, ic) => use && use.setAttribute("href", iconHref(ic));
    const openDlg = (d) => (d.showModal ? d.showModal() : d.setAttribute("open", ""));
    const closeDlg = (d) => (d.close ? d.close() : d.removeAttribute("open"));
    const myCode = () => archPair(ctx.archList());

    // ═════════ 템플릿 꺼내기 (design 1절: ① sprite 먼저) ═════════
    const tpl = js("map-tpl");
    const frag = tpl.content.cloneNode(true);
    const take = (name) => {
      const el = frag.querySelector(`[data-js="${name}"]`);
      if (el) el.remove();
      return el;
    };
    const sprite = take("map-sprite");
    doc.body.prepend(sprite);
    const cardTpl = take("map-card");
    const invite = take("map-invite");
    take("map-hub-link"); // 입구 작은 링크는 app.js가 지도 파일 없이 붙인다
    const consent = take("screen-map-consent");
    const mapScr = take("screen-map");
    const friendScr = take("screen-map-friend");
    const keyDlg = take("map-key-dialog");
    const popDlg = take("map-pop-dialog");
    const pickDlg = take("map-pick-dialog");
    const confirmDlg = take("map-confirm-dialog");
    tpl.after(consent, mapScr, friendScr, keyDlg, popDlg, pickDlg, confirmDlg);
    tpl.remove();
    // 카드 복제: 카드 안 id와 그것을 가리키는 for·aria-*에 꼬리(-finale/-story)를 붙여 중복 id를 막는다
    function cloneCard(sfx) {
      const c = cardTpl.cloneNode(true);
      const ids = new Set(Array.from(c.querySelectorAll("[id]"), (el) => el.id));
      c.querySelectorAll("[id]").forEach((el) => (el.id += sfx));
      ["for", "aria-controls", "aria-labelledby", "aria-describedby"].forEach((at) => {
        [c, ...c.querySelectorAll(`[${at}]`)].forEach((el) => {
          const v = el.getAttribute(at);
          if (v) el.setAttribute(at, v.split(/\s+/).map((t) => (ids.has(t) ? t + sfx : t)).join(" "));
        });
      });
      return c;
    }
    const cards = [];
    [["map-slot-finale", "-finale"], ["map-slot-story", "-story"]].forEach(([slot, sfx]) => {
      const el = js(slot);
      if (!el) return;
      const c = cloneCard(sfx);
      el.textContent = "";
      el.append(c);
      el.hidden = false;
      cards.push(c);
    });
    const hubSlot = js("map-slot-hub");
    // 견본 줄(복제용)을 떼어 둔다
    const nodeTpl = js("map-node", mapScr);
    jsAll("map-node", mapScr).forEach((el) => el.remove());
    const rankTpl = js("map-rank-row", mapScr).closest("li");
    js("map-rank", mapScr).textContent = "";
    const pickTpl = js("map-pick-row", pickDlg).closest("li");
    js("map-pick-list", pickDlg).textContent = "";
    [...cards, invite, consent, mapScr, friendScr, keyDlg, popDlg, pickDlg, confirmDlg].forEach((el) => applyText(el));
    ctx.addScreen("map-consent", consent);
    ctx.addScreen("map", mapScr);
    ctx.addScreen("map-friend", friendScr);
    ctx.Disclaimer.mount(js("map-disclaimer", mapScr));
    ctx.Disclaimer.mount(js("map-friend-disclaimer", friendScr));

    // ═════════ 지도 카드 (결말·나의 이야기) ═════════
    let cardBusy = ""; // birth | young | down | loading — 행동 중에만. 비면 기본 상태
    let cardRetry = null;
    let flowRole = "owner";
    let backTo = "story";
    function joinCtx() {
      const s = ses();
      if (!s.join || !mem.owner || mem.ownerOf !== s.join || mem.peek !== "ok") return null;
      return { invite: s.join, joined: (s.joined || []).includes(s.join) };
    }
    function baseCardState() {
      const n = ctx.filled();
      const j = joinCtx();
      const all = n >= ctx.total;
      if (!all) return j && !j.joined ? "locked-join" : "locked";
      if (j) return j.joined ? "joined" : "join";
      return keyGet() ? "view" : "create";
    }
    function renderCards() {
      const st = cardBusy || baseCardState();
      const n = ctx.filled();
      cards.forEach((c) => {
        c.dataset.state = st;
        fillInto(js("map-card-locked", c), M.card.locked, { n }, ["n"]);
        fillInto(js("map-card-locked-join", c), M.card.lockedJoin, { n, owner: mem.owner ? mem.owner.nick : "" }, ["n", "owner"]);
        fillInto(js("map-card-join-text", c), M.card.joinText, { owner: mem.owner ? mem.owner.nick : "" }, ["owner"]);
        if (mem.owner) setIcon(c.querySelector('[data-when="join joined"] use'), mem.owner.icon);
        const err = js("map-birth-error", c);
        if (st !== "birth") show(err, false);
      });
    }
    function setCards(st, retry) {
      cardBusy = st || "";
      cardRetry = retry || null;
      if (st === "down") noteDown();
      renderCards();
    }
    cards.forEach((c) => {
      js("map-card-next", c).addEventListener("click", () => ctx.goNext());
      js("map-create", c).addEventListener("click", () => startFlow("owner"));
      js("map-view", c).addEventListener("click", () => openView());
      js("map-join", c).addEventListener("click", () => startFlow("friend"));
      js("map-my-result", c).addEventListener("click", () => openFriend());
      js("map-retry", c).addEventListener("click", () => (cardRetry ? cardRetry() : setCards("")));
      js("map-age-back", c).addEventListener("click", () => setCards(""));
      const birthGo = () => {
        const b = parseBirth(js("map-birth-input", c).value);
        const err = js("map-birth-error", c);
        if (!b) {
          err.textContent = M.age.error;
          show(err, true);
          return;
        }
        show(err, false);
        js("map-birth-input", c).value = "";
        mem.birth = b; // 메모리에만(profile에도 넣지 않음). 동의 화면을 떠나면 버린다
        startFlow(flowRole);
      };
      js("map-birth-go", c).addEventListener("click", birthGo);
      js("map-birth-input", c).addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), birthGo()));
      // 접힌 칸 두 개
      [["map-key-toggle", "map-key-panel"], ["map-del-toggle", "map-del-panel"]].forEach(([t, p]) => {
        const tg = js(t, c);
        tg.addEventListener("click", () => {
          const open = tg.getAttribute("aria-expanded") !== "true";
          tg.setAttribute("aria-expanded", String(open));
          show(js(p, c), open);
        });
      });
      const keyIn = js("map-key-input", c), keyErr = js("map-key-error", c);
      const keyMsg = (t) => {
        keyErr.textContent = t || "";
        show(keyErr, Boolean(t));
      };
      const keyGo = async () => {
        const v = keyIn.value;
        const E = M.keyEnter.errors;
        if (!v.trim()) return keyMsg(E.empty);
        const pf = prefixOf(v);
        if (pf === "SOP") return keyMsg(E.pass);
        if (pf === "SOG") return keyMsg(E.resume);
        if (pf === "SOD") return keyMsg(E.del);
        const k = canon(v, "SOM");
        if (!k) return keyMsg(E.shape);
        const key = pretty("SOM", k);
        const had = keyGet();
        if (had && had !== key) return keyMsg(E.hasKey);
        keyMsg("");
        const r = await openView(key, (kind) => keyMsg(kind === "notfound" ? E.notFound : M.down));
        if (r) keyIn.value = "";
      };
      js("map-key-go", c).addEventListener("click", keyGo);
      keyIn.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), keyGo()));
      const delIn = js("map-del-input", c), delErr = js("map-del-error", c), delSt = js("map-del-status", c);
      const delMsg = (t) => {
        delErr.textContent = t || "";
        show(delErr, Boolean(t));
      };
      const delGo = async () => {
        const v = delIn.value;
        const E = M.delEnter.errors;
        show(delSt, false);
        if (!v.trim()) return delMsg(E.empty);
        const pf = prefixOf(v);
        if (pf === "SOP") return delMsg(E.pass);
        if (pf === "SOG") return delMsg(E.resume);
        if (pf === "SOM") return delMsg(E.key);
        const k = canon(v, "SOD");
        if (!k) return delMsg(E.shape);
        delMsg("");
        const del = pretty("SOD", k);
        const r = await req("erase", { del, act: "leave" });
        if (r.ok) {
          delIn.value = "";
          afterLeave(del);
          delSt.textContent = M.delEnter.done;
          show(delSt, true);
        } else if (r.kind === "notfound") delMsg(E.notFound);
        else {
          noteDown();
          delMsg(M.down);
        }
      };
      js("map-del-go", c).addEventListener("click", delGo);
      delIn.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), delGo()));
    });

    // ═════════ 초대 띠 (입구) ═════════
    function renderInvite(st) {
      if (!hubSlot) return;
      if (!st) {
        invite.remove();
        hubSlot.hidden = !hubSlot.children.length;
        return;
      }
      invite.dataset.state = st;
      fillInto(invite.querySelector('[data-when="invited"]'), M.invite.invited, { owner: mem.owner ? mem.owner.nick : "" }, ["owner"]);
      if (mem.owner) setIcon(js("map-invite-icon", invite), mem.owner.icon);
      if (!invite.isConnected) hubSlot.prepend(invite);
      hubSlot.hidden = false;
    }
    js("map-invite-view", invite).addEventListener("click", () => openView());
    js("map-invite-result", invite).addEventListener("click", () => openFriend());

    // 초대 ID로 주인 별명·아이콘 받기 (#join으로 들어왔거나, 참여 단계에서 다시 물을 때)
    async function peekJoin() {
      const s = ses();
      if (!s.join) return "none";
      if (mem.peek === "ok" && mem.ownerOf === s.join) return "ok";
      const r = await req("peek", { invite: s.join });
      if (r.ok) {
        const d = r.data || {};
        mem.owner = { nick: String(d.nick || ""), icon: d.icon, main: d.main, sub: d.sub };
        mem.ownerOf = s.join;
        mem.peek = "ok";
        return "ok";
      }
      if (r.kind === "notfound") {
        mem.peek = "closed";
        sesPut({ join: "" }); // 참여할 수 없는 초대는 조용히 버린다(이유를 밝히지 않음)
        return "closed";
      }
      mem.peek = "down";
      noteDown();
      return "down";
    }
    // 내 지도의 초대 링크인가: 이 기기 열람 키로 받은 지도(메모리)의 초대 ID와 같으면
    async function isMine(inv) {
      const k = keyGet();
      if (!k) return false;
      if (!mem.map) {
        const r = await req("view", { key: k });
        if (r.ok) mem.map = r.data;
      }
      return Boolean(mem.map && mem.map.invite === inv);
    }
    async function boot() {
      const s = ses();
      if (!s.join) return renderCards();
      if (await isMine(s.join)) {
        sesPut({ join: "" });
        renderInvite("mine");
        return renderCards();
      }
      const p = await peekJoin();
      if (p === "ok") renderInvite((ses().joined || []).includes(s.join) ? "joined" : "invited");
      else renderInvite(p === "closed" ? "closed" : "down");
      renderCards();
    }

    // ═════════ 흐름: 나이 → 동의 → 보내기 ═════════
    async function startFlow(role) {
      flowRole = role;
      const cur = ctx.current();
      if (!/^map/.test(cur)) backTo = cur;
      if (ctx.filled() < ctx.total) return setCards("");
      if (role === "friend") {
        setCards("loading");
        const p = await peekJoin();
        if (p === "down") return setCards("down", () => startFlow("friend"));
        if (p !== "ok") return setCards("");
      } else if (keyGet()) return openView();
      const b = ctx.birth() || mem.birth;
      if (!b) {
        setCards("birth");
        const inp = cards.map((c) => js("map-birth-input", c)).find((el) => el.offsetParent);
        if (inp) inp.focus();
        return;
      }
      if (ageOf(b) < 14) return setCards("young"); // 요청·분석 없음
      setCards("");
      openConsent(role);
    }
    const nickIn = js("map-nick", consent), nickCount = js("map-nick-count", consent), nickErr = js("map-nick-error", consent);
    const agree = js("map-agree", consent), sendBtn = js("map-send", consent);
    const iconPick = () => {
      const r = consent.querySelector('input[name="map-icon"]:checked');
      return r ? r.value : "";
    };
    function nickState() {
      const v = nickIn.value;
      const n = Array.from(v.normalize("NFC").trim()).length;
      nickCount.textContent = `${n}/8`;
      if (!v.trim()) {
        nickIn.removeAttribute("aria-invalid");
        show(nickErr, false);
        return false;
      }
      const why = nickProblem(v, { name: ctx.name(), birth: ctx.birth() || mem.birth });
      if (why) {
        nickIn.setAttribute("aria-invalid", "true");
        nickErr.textContent = M.nickErr[why] || "";
        show(nickErr, true);
        return false;
      }
      nickIn.removeAttribute("aria-invalid");
      show(nickErr, false);
      return true;
    }
    function syncSend() {
      const ok = nickState() && Boolean(iconPick()) && agree.checked && consent.dataset.state !== "sending";
      sendBtn.disabled = !ok;
    }
    nickIn.addEventListener("input", syncSend);
    agree.addEventListener("change", syncSend);
    js("map-icons", consent).addEventListener("change", syncSend);
    function openConsent(role) {
      const code = myCode();
      consent.dataset.role = role;
      consent.dataset.state = "form";
      nickIn.value = ""; // 이름 입력값으로 미리 채우지 않는다
      agree.checked = false;
      consent.querySelectorAll('input[name="map-icon"]').forEach((r) => (r.checked = false));
      sendBtn.textContent = M.consent.sendBtn;
      sendBtn.removeAttribute("aria-busy");
      fillInto(js("map-send-arch", consent), M.consent.sendArch, { main: archName(code.main), sub: archName(code.sub) });
      fillInto(js("map-consent-who-friend", consent), M.consent.whoFriend, { owner: mem.owner ? mem.owner.nick : "" }, ["owner"]);
      syncSend();
      ctx.go("map-consent");
    }
    js("map-consent-cancel", consent).addEventListener("click", () => {
      mem.birth = null;
      ctx.go(backTo || "story");
    });
    async function send() {
      if (sendBtn.disabled) return;
      const code = myCode();
      const nick = nickIn.value.normalize("NFC").trim();
      const icon = iconPick();
      if (!code || nickProblem(nick, { name: ctx.name(), birth: ctx.birth() || mem.birth }) || !icon || !agree.checked) return syncSend();
      const role = consent.dataset.role;
      consent.dataset.state = "sending";
      sendBtn.disabled = true;
      sendBtn.setAttribute("aria-busy", "true");
      const s = ses();
      const r = role === "owner" ? await req("create", { nick, icon, main: code.main, sub: code.sub }) : await req("join", { invite: s.join, nick, icon, main: code.main, sub: code.sub });
      sendBtn.removeAttribute("aria-busy");
      if (r.ok) {
        mem.birth = null;
        consent.dataset.state = "form";
        if (role === "owner") {
          keySet(r.data.key);
          mem.map = null;
          mem.drawn = false;
          ctx.track("map_create");
          renderCards();
          showKey(r.data.key, r.data.invite, () => openView());
        } else {
          sesPut({ joined: (s.joined || []).concat(s.join), del: r.data.del });
          mem.me = { nick, icon, main: code.main, sub: code.sub };
          ctx.track("map_join");
          renderCards();
          renderInvite("joined");
          openFriend();
        }
        return;
      }
      if (r.kind === "timeout") {
        consent.dataset.state = "unsure";
        sendBtn.textContent = M.consent.resend;
        return syncSend();
      }
      consent.dataset.state = "form";
      if (r.kind === "nick") {
        nickIn.setAttribute("aria-invalid", "true");
        nickErr.textContent = M.nickErr.server;
        show(nickErr, true);
        sendBtn.disabled = true;
        return;
      }
      if (r.kind === "closed" || r.kind === "full" || r.kind === "notfound") {
        ctx.toast(r.kind === "full" ? M.consent.full : M.consent.closed);
        if (r.kind !== "full") {
          sesPut({ join: "" });
          mem.peek = "closed";
          renderInvite("closed");
        }
        renderCards();
        return ctx.go(backTo || "story");
      }
      consent.dataset.state = "down";
      noteDown();
      retryLater(js("map-retry", consent), r);
      syncSend();
    }
    sendBtn.addEventListener("click", send);
    js("map-retry", consent).addEventListener("click", () => {
      consent.dataset.state = "form";
      syncSend();
      send();
    });
    // 429면 Retry-After 동안 [다시 시도]를 끈다
    function retryLater(btn, r) {
      if (!btn) return;
      if (r.kind !== "rate") {
        btn.disabled = false;
        return;
      }
      btn.disabled = true;
      setTimeout(() => (btn.disabled = false), r.wait * 1000);
    }

    // ═════════ 열람 키 카드 ═════════
    let keyAfter = null;
    const keyAck = js("map-key-ack", keyDlg), keyClose = js("map-key-close", keyDlg), keyStatus = js("map-key-status", keyDlg);
    const inviteUrl = (inv) => `${ctx.siteUrl}#join=${inv}`;
    function showKey(key, inv, after) {
      keyAfter = after || null;
      js("map-key-value", keyDlg).textContent = key;
      const box = js("map-key-invite", keyDlg);
      show(box, Boolean(inv));
      js("map-invite-url", keyDlg).textContent = inv ? inviteUrl(inv) : "";
      keyDlg.dataset.invite = inv || "";
      keyAck.checked = false;
      keyClose.disabled = true;
      show(keyStatus, false);
      const cp = js("map-key-copy", keyDlg);
      cp.classList.remove("is-copied");
      cp.textContent = M.copy;
      openDlg(keyDlg);
    }
    keyAck.addEventListener("change", () => (keyClose.disabled = !keyAck.checked));
    keyDlg.addEventListener("cancel", (e) => {
      if (!keyAck.checked) e.preventDefault(); // 체크 전에는 Esc로도 닫히지 않는다
    });
    keyDlg.addEventListener("close", () => {
      // 브라우저가 cancel을 막지 못하고 닫은 경우(사용자 활성화 없음 등)에도 체크 전이면 다시 연다
      if (!keyAck.checked) return openDlg(keyDlg);
      const f = keyAfter;
      keyAfter = null;
      if (f) f();
    });
    keyClose.addEventListener("click", () => keyAck.checked && closeDlg(keyDlg));
    async function copyInto(btn, status, text, okText) {
      const ok = await ctx.ShareButtons.copyText(text);
      if (btn) {
        btn.classList.toggle("is-copied", ok);
        if (ok) btn.textContent = M.copied;
      }
      if (status) {
        status.textContent = ok ? okText : M.copyFail;
        show(status, true);
      }
    }
    async function shareLink(inv, status) {
      const url = inviteUrl(inv);
      if (navigator.share) {
        try {
          await navigator.share({ title: M.invite.shareTitle, text: M.invite.shareText, url });
          return;
        } catch (e) {
          if (e && e.name === "AbortError") return;
        }
      }
      copyInto(null, status, url, M.invite.copied);
    }
    js("map-key-copy", keyDlg).addEventListener("click", (e) => copyInto(e.currentTarget, keyStatus, js("map-key-value", keyDlg).textContent, M.key.copied));
    js("map-key-link-copy", keyDlg).addEventListener("click", () => copyInto(null, keyStatus, inviteUrl(keyDlg.dataset.invite), M.invite.copied));
    js("map-key-link-share", keyDlg).addEventListener("click", () => shareLink(keyDlg.dataset.invite, keyStatus));

    // ═════════ 지도 화면 (주인) ═════════
    const stage = js("map-stage", mapScr);
    const nodesEl = js("map-nodes", mapScr);
    let view = null; // { owner, friends: [{…, m, x, y}] } 이번 그림
    // key를 주면 그 키로(다른 기기 열람 키 넣기), 아니면 이 기기 키로. onFail이 있으면 실패를 그쪽에 알리고 화면을 옮기지 않는다
    async function openView(key, onFail) {
      const k = key || keyGet();
      if (!k) return startFlow("owner");
      const cur = ctx.current();
      if (!/^map/.test(cur)) backTo = cur;
      if (!onFail) {
        mapScr.dataset.state = "loading";
        ctx.go("map");
      }
      const r = await req("view", { key: k });
      if (r.ok) {
        if (key) keySet(key);
        mem.map = r.data;
        ctx.track("map_view");
        if (onFail) ctx.go("map");
        renderMap();
        renderCards();
        return true;
      }
      if (onFail) {
        if (isDown(r)) noteDown();
        onFail(r.kind);
        return false;
      }
      if (r.kind === "notfound") mapScr.dataset.state = "notfound";
      else {
        mapScr.dataset.state = "down";
        noteDown();
        retryLater(js("map-retry", mapScr), r);
      }
      return false;
    }
    js("map-retry", mapScr).addEventListener("click", () => openView());
    js("map-new", mapScr).addEventListener("click", () => {
      keySet("");
      mem.map = null;
      renderCards();
      startFlow("owner");
    });
    const fmtDate = (iso, full) => {
      const [y, m, d] = iso.split("-").map(Number);
      return ctx.fill(full ? M.view.dateFull : M.view.date, { y, m, d });
    };
    const addDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
    function renderMap() {
      const d = mem.map;
      if (!d) return;
      const owner = { nick: String(d.nick || ""), icon: d.icon, main: d.main, sub: d.sub };
      const friends = (d.friends || []).filter((f) => isArch(f.main) && isArch(f.sub)).map((f) => {
        const m = match(owner, f);
        return Object.assign({}, f, { nick: String(f.nick || ""), m, score: m.score, top: m.top });
      });
      const placed = place(friends);
      view = { owner, friends: placed };
      fillInto(js("map-title", mapScr), M.view.title, { owner: owner.nick });
      js("map-count", mapScr).textContent = String(placed.length);
      js("map-count-max", mapScr).textContent = `/${M.maxFriends || 30}`;
      setIcon(js("map-owner-icon", mapScr), owner.icon);
      mapScr.dataset.state = placed.length ? "ready" : "empty";
      // 친구 아이콘 (순위 순서)
      nodesEl.textContent = "";
      placed.forEach((f) => {
        const b = nodeTpl.cloneNode(true);
        b.dataset.id = f.rid;
        b.dataset.band = String(f.m.band);
        b.dataset.label = "b";
        b.classList.remove("is-label-hidden", "is-selected");
        b.style.cssText = `--x:${f.x.toFixed(2)};--y:${f.y.toFixed(2)};--i:${f.i}`;
        setIcon(b.querySelector("use"), f.icon);
        b.querySelector(".map-node__name").textContent = f.nick;
        b.setAttribute("aria-label", ctx.fill(M.view.nodeLabel, { nick: f.nick, score: f.score }));
        nodesEl.append(b);
      });
      // 순위
      const list = js("map-rank", mapScr);
      list.textContent = "";
      placed.forEach((f, i) => {
        const li = rankTpl.cloneNode(true);
        const row = li.querySelector('[data-js="map-rank-row"]');
        row.dataset.id = f.rid;
        row.dataset.band = String(f.m.band);
        row.querySelector(".map-rank__num").textContent = String(i + 1);
        setIcon(row.querySelector("use"), f.icon);
        row.querySelector(".map-rank__name").textContent = f.nick;
        row.querySelector(".map-rank__band").textContent = M.band[f.m.band];
        row.querySelector(".map-rank__score").textContent = String(f.score);
        list.append(li);
      });
      // 보관 기간: min(마지막 활동 + 90일, 만든 날 + 365일)
      const max = addDays(d.created, 365);
      const until = [addDays(d.active, 90), max].sort()[0];
      fillInto(js("map-keep", mapScr), M.view.keep, { until: fmtDate(until), max: fmtDate(max, true) });
      const box = js("map-invite-box", mapScr);
      box.classList.toggle("is-closed", !d.open);
      show(js("map-invite-close", mapScr), Boolean(d.open));
      show(js("map-key-show", mapScr), Boolean(keyGet()));
      show(js("map-link-status", mapScr), false);
      requestAnimationFrame(() => {
        layoutLabels();
        if (!mem.drawn) {
          mem.drawn = true;
          stage.classList.add("is-drawn"); // 처음 열 때 한 번만 (지우기·다시 시도 뒤에는 붙이지 않음)
        }
      });
    }
    // 이름표 (design 5절): 순위 차례로 아래 → 위 → 오른쪽 → 왼쪽, 아이콘·이름표·꼭짓점 이름·무대 밖과 겹치면 다음 자리, 다 안 되면 숨김
    function layoutLabels() {
      if (!mapScr.classList.contains("is-active") || !view) return;
      const sb = stage.getBoundingClientRect();
      if (!sb.width) return;
      const R = (el) => el.getBoundingClientRect();
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const nodes = Array.from(nodesEl.children);
      const icons = nodes.map((n) => R(n.querySelector(".map-ico")));
      const fixed = [R(stage.querySelector(".map-node--owner .map-ico")), ...Array.from(stage.querySelectorAll(".map-axis"), R)];
      const shown = [];
      nodes.forEach((n, i) => {
        n.classList.remove("is-label-hidden");
        const name = n.querySelector(".map-node__name");
        const ok = ["b", "t", "r", "l"].find((pos) => {
          n.dataset.label = pos;
          const r = R(name);
          if (r.left < sb.left || r.right > sb.right || r.top < sb.top || r.bottom > sb.bottom) return false;
          if (fixed.some((x) => hit(r, x)) || shown.some((x) => hit(r, x))) return false;
          return !icons.some((x, j) => j !== i && hit(r, x));
        });
        if (ok) shown.push(R(name));
        else {
          n.dataset.label = "b";
          n.classList.add("is-label-hidden");
        }
      });
    }
    let resizeT = 0;
    addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(layoutLabels, 150);
    });
    ctx.onEnter("map", () => requestAnimationFrame(layoutLabels));
    const friendById = (id) => (view ? view.friends.find((f) => f.rid === id) : null);
    // 누르기: 누른 점에서 반지름 d/2 + 6px 안에 중심이 있는 친구를 모두 모은다 → 1명 팝업, 여럿 선택 목록
    nodesEl.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-js="map-node"]');
      if (!btn) return;
      if (e.detail === 0) return openPop(btn.dataset.id); // 키보드
      const ir = btn.querySelector(".map-ico").getBoundingClientRect();
      const rad = ir.width / 2 + 6;
      const hits = Array.from(nodesEl.children).filter((n) => {
        const r = n.querySelector(".map-ico").getBoundingClientRect();
        return Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY) <= rad;
      });
      if (hits.length <= 1) return openPop(btn.dataset.id);
      openPick(hits.map((n) => n.dataset.id));
    });
    js("map-rank", mapScr).addEventListener("click", (e) => {
      const row = e.target.closest('[data-js="map-rank-row"]');
      if (row) openPop(row.dataset.id);
    });
    function openPick(ids) {
      const list = js("map-pick-list", pickDlg);
      list.textContent = "";
      ids.map(friendById).filter(Boolean).forEach((f) => {
        const li = pickTpl.cloneNode(true);
        const row = li.querySelector('[data-js="map-pick-row"]');
        row.dataset.id = f.rid;
        row.dataset.band = String(f.m.band);
        setIcon(row.querySelector("use"), f.icon);
        row.querySelector(".map-rank__name").textContent = f.nick;
        row.querySelector(".map-rank__score").textContent = String(f.score);
        list.append(li);
      });
      openDlg(pickDlg);
    }
    js("map-pick-list", pickDlg).addEventListener("click", (e) => {
      const row = e.target.closest('[data-js="map-pick-row"]');
      if (!row) return;
      closeDlg(pickDlg);
      openPop(row.dataset.id);
    });
    js("map-pick-close", pickDlg).addEventListener("click", () => closeDlg(pickDlg));

    // 궁합 묶음 채우기 (팝업·친구 카드 같은 구조)
    function fillMatch(box, other, m, archOf, mainA) {
      box.dataset.band = String(m.band);
      setIcon(js("map-match-icon-b", box), other.icon);
      js("map-match-name", box).textContent = other.nick;
      fillInto(js("map-match-arch", box), M.match.arch, { main: archName(archOf.main), sub: archName(archOf.sub) });
      js("map-match-score", box).textContent = String(m.score);
      js("map-match-band", box).textContent = M.band[m.band];
      box.querySelectorAll(".map-bars__row").forEach((li) => {
        const k = Number(li.dataset.axis);
        li.style.setProperty("--v", String(m.axes[k]));
        js("map-bar-val", li).textContent = String(m.axes[k]);
        li.classList.toggle("is-top", k === m.top);
        li.classList.toggle("is-low", k === m.low);
      });
      js("map-match-pairline", box).textContent = (M.pairLine || {})[pairKey(mainA, other.main)] || "";
      js("map-match-strong", box).textContent = M.axisStrong[AXES[m.top]] || "";
      js("map-match-tip", box).textContent = M.axisTip[AXES[m.low]] || "";
      // 상세 궁합 줄(16-3의 3): pay off면 없음, 결제함 → 책 궁합 장, 결제 전 → 가격 없는 한 줄
      const on = ctx.bookOn();
      const paid = on && ctx.paid();
      show(js("map-deep-paid", box), on && paid);
      show(js("map-deep-free", box), on && !paid);
    }
    const deep = (box, close) => {
      js("map-deep-paid", box).addEventListener("click", () => (close && close(), ctx.goBook("match")));
      js("map-deep-free", box).addEventListener("click", () => (close && close(), ctx.goBook(null)));
    };
    const popBox = js("map-match", popDlg);
    deep(popBox, () => closeDlg(popDlg));
    let popId = "";
    function openPop(id) {
      const f = friendById(id);
      if (!f) return;
      popId = id;
      Array.from(nodesEl.children).forEach((n) => n.classList.toggle("is-selected", n.dataset.id === id));
      fillMatch(popBox, f, f.m, f, view.owner.main);
      show(js("map-pop-erase", popDlg), true);
      openDlg(popDlg);
    }
    popDlg.addEventListener("close", () => Array.from(nodesEl.children).forEach((n) => n.classList.remove("is-selected")));
    js("map-pop-close", popDlg).addEventListener("click", () => closeDlg(popDlg));
    js("map-pop-erase", popDlg).addEventListener("click", async () => {
      const f = friendById(popId);
      if (!f) return;
      closeDlg(popDlg);
      if (await confirmAct("eraseFriend", { nick: f.nick })) ownerAct({ act: "friend", rid: f.rid }, "eraseFriend");
    });

    // 확인 대화 하나를 동작마다 문구만 바꿔 쓴다
    let confirmDone = null;
    function confirmAct(act, vars) {
      const C = M.confirm[act];
      fillInto(js("map-confirm-title", confirmDlg), C.title, vars || {});
      fillInto(js("map-confirm-text", confirmDlg), C.text, vars || {}, ["nick"]);
      const ok = js("map-confirm-ok", confirmDlg);
      ok.textContent = C.ok;
      const soft = ["closeInvite", "rotateInvite", "rotateKey"].includes(act);
      ok.classList.toggle("btn--danger", !soft);
      ok.classList.toggle("btn--primary", soft);
      return new Promise((res) => {
        confirmDone = res;
        openDlg(confirmDlg);
      });
    }
    const confirmEnd = (v) => {
      const f = confirmDone;
      confirmDone = null;
      closeDlg(confirmDlg);
      if (f) f(v);
    };
    js("map-confirm-ok", confirmDlg).addEventListener("click", () => confirmEnd(true));
    js("map-confirm-cancel", confirmDlg).addEventListener("click", () => confirmEnd(false));
    confirmDlg.addEventListener("close", () => confirmDone && confirmEnd(false));

    // 주인 지우기·관리 (열람 키를 본문으로)
    async function ownerAct(body, act) {
      const key = keyGet();
      if (!key) return;
      const r = await req("erase", Object.assign({ key }, body));
      if (!r.ok) {
        if (r.kind === "notfound") mapScr.dataset.state = "notfound";
        else {
          noteDown();
          ctx.toast(M.down);
        }
        return null;
      }
      if (M.done[act]) ctx.toast(M.done[act]);
      if (act === "eraseFriend" || act === "eraseMap") ctx.track("map_erase");
      if (act === "eraseMap") {
        keySet("");
        mem.map = null;
        view = null;
        renderCards();
        ctx.go(backTo || "story");
        return r;
      }
      if (act === "rotateKey") {
        keySet(r.data.key);
        showKey(r.data.key, mem.map ? mem.map.invite : "", null);
      }
      // 나머지는 새로 받아 다시 그린다(그리기 연출은 다시 하지 않음)
      const v = await req("view", { key: keyGet() });
      if (v.ok) {
        mem.map = v.data;
        renderMap();
      } else if (v.kind === "notfound") mapScr.dataset.state = "notfound";
      return r;
    }
    const manage = (name, act, body) =>
      js(name, mapScr).addEventListener("click", async (e) => {
        const det = e.target.closest("details");
        if (det) det.open = false;
        if (await confirmAct(act)) ownerAct(body, act);
      });
    manage("map-invite-close", "closeInvite", { act: "close" });
    manage("map-invite-rotate", "rotateInvite", { act: "reinvite" });
    manage("map-key-rotate", "rotateKey", { act: "rekey" });
    manage("map-erase-all", "eraseMap", { act: "map" });
    js("map-key-show", mapScr).addEventListener("click", () => {
      const k = keyGet();
      if (k) showKey(k, mem.map ? mem.map.invite : "", null);
    });
    jsAll("map-forget", mapScr).forEach((b) =>
      b.addEventListener("click", async () => {
        if (!(await confirmAct("forget"))) return;
        forget();
        ctx.toast(M.done.forget);
        ctx.go(backTo || "story");
      })
    );
    function forget() {
      keySet("");
      mem.map = null;
      view = null;
      ctx.track("map_forget");
      renderCards();
      ctx.refreshHubLink();
    }
    const linkStatus = js("map-link-status", mapScr);
    js("map-link-copy", mapScr).addEventListener("click", () => mem.map && copyInto(null, linkStatus, inviteUrl(mem.map.invite), M.invite.copied));
    js("map-link-share", mapScr).addEventListener("click", () => mem.map && shareLink(mem.map.invite, linkStatus));

    // ═════════ 친구 결과 (친구 쪽) ═════════
    const friendBox = js("map-match", friendScr);
    deep(friendBox, null);
    async function openFriend() {
      const s = ses();
      const cur = ctx.current();
      if (!/^map/.test(cur)) backTo = cur;
      if (!mem.owner) await peekJoin();
      const me = mem.me || Object.assign({ nick: "", icon: "" }, myCode());
      const owner = mem.owner;
      if (!owner) {
        friendScr.dataset.state = "down";
        noteDown();
        return ctx.go("map-friend");
      }
      friendScr.dataset.state = "ready";
      fillInto(js("map-friend-title", friendScr), M.friend.title, { owner: owner.nick }, ["owner"]);
      setIcon(js("map-match-icon-a", friendBox), owner.icon);
      const m = match(owner, me);
      fillMatch(friendBox, me, m, owner, owner.main);
      show(js("map-match-name", friendBox), false); // 친구 카드에서는 제목이 대신
      js("map-del-value", friendScr).textContent = s.del || "";
      const cp = js("map-del-copy", friendScr);
      cp.classList.remove("is-copied");
      cp.textContent = M.copy;
      show(js("map-del-copy-status", friendScr), false);
      show(js("map-leave", friendScr), Boolean(s.del));
      ctx.go("map-friend");
    }
    js("map-retry", friendScr).addEventListener("click", () => {
      mem.peek = "";
      openFriend();
    });
    js("map-del-copy", friendScr).addEventListener("click", (e) => copyInto(e.currentTarget, js("map-del-copy-status", friendScr), js("map-del-value", friendScr).textContent, M.del.copied));
    js("map-leave", friendScr).addEventListener("click", async () => {
      const del = ses().del;
      if (!del || !(await confirmAct("leave"))) return;
      const r = await req("erase", { del, act: "leave" });
      if (r.ok) {
        afterLeave(del);
        ctx.toast(M.done.leave);
        ctx.go(backTo || "story");
      } else if (r.kind === "notfound") {
        afterLeave(del);
        ctx.toast(M.delEnter.errors.notFound);
      } else {
        noteDown();
        ctx.toast(M.down);
      }
    });
    js("map-friend-make", friendScr).addEventListener("click", () => startFlow("owner"));
    // 친구 기록을 지운 뒤: 이 탭의 삭제 코드·참여 표시를 비운다
    function afterLeave(del) {
      const s = ses();
      if (s.del && canon(s.del, "SOD") === canon(del, "SOD")) {
        const joined = (s.joined || []).filter((x) => x !== s.join);
        sesPut({ del: "", joined });
        mem.me = null;
        ctx.track("map_leave");
        if (s.join && mem.peek === "ok") renderInvite("invited");
      } else ctx.track("map_leave");
      renderCards();
    }

    // ═════════ app.js가 부르는 것 ═════════
    return {
      boot,
      refresh: renderCards,
      openView,
      // 내 정보 지우기의 "친구 지도에 보낸 내 기록도 지우기": 조용히 한 번 보낸다(결과는 토스트 한 줄)
      async leaveQuiet(del) {
        const r = await req("erase", { del, act: "leave" });
        if (r.ok) {
          ctx.track("map_leave");
          ctx.toast(M.done.leave);
        } else if (r.kind === "notfound") ctx.toast(M.delEnter.errors.notFound);
        else {
          noteDown();
          ctx.toast(M.down);
        }
      },
      forgetQuiet() {
        if (keyGet()) forget();
      },
      // clearAll 뒤: 메모리·띠·카드 상태를 비운다
      reset() {
        Object.assign(mem, { birth: null, owner: null, ownerOf: "", me: null, peek: "" });
        if (!keyGet()) mem.map = null;
        cardBusy = "";
        renderInvite("");
        renderCards();
      },
    };
  }

  root.FriendMap = { core: Core, mount };
})(typeof window !== "undefined" ? window : this);
