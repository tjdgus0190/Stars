// 낯선 점술관 · 친구 궁합 지도 서버 핵심 (specs/strange-oracle.md 16-5)
// 순수 로직이다. 저장소(D1 어댑터·메모리 어댑터)와 시계를 주입받는다. 이 파일은 네트워크·로그·파일을 쓰지 않는다.
//
// 경로 다섯, 일은 넷(CLAUDE.md 3장): 만들기 /create · 더하기 /join · 보기 /view(주인)·/peek(초대) · 지우기 /erase
// - 모두 POST, 본문 JSON 1KB 이하. 정해 둔 칸 외의 칸이 하나라도 있으면 400이고 아무것도 저장하지 않는다.
// - 오류 본문은 { "error": "<코드>" } 한 칸. 404는 없음·만료·틀린 키·틀린 삭제 코드 모두 같은 응답이다.
// - 열람 키(SOM)·삭제 코드(SOD)는 SHA-256(접두사 + 표준형 26자)만 저장한다. 원문은 응답으로 한 번 내주고 버린다.
// - active(주인 마지막 활동 날)는 create·주인 view·주인 erase 때만 갱신한다. 친구 join·leave·peek는 갱신하지 않는다.
// - 결제(pay·book) 서버와 서로 부르지 않고 값을 주고받지 않는다.
//
// 저장소 어댑터 모양 (모두 async)
//   getMap(by, value)            by: "id" | "invite" | "key_hash" → 행 | null
//   insertMap(row)
//   updateMap(id, patch)         patch 칸: { active } | { open, active } | { key_hash, active } | { invite, open, active }
//   bumpHour(id, slot)           hour_slot이 slot이면 hour_joins + 1, 아니면 slot·1로
//   deleteMap(id)                friends → maps 순으로 한 batch
//   countFriends(mapId) → 수 · listFriends(mapId) → 행[] (참여 순)
//   insertFriend(row, max) → true | false(이미 max명)
//   getFriend(by, value)         by: "rid" | "del_hash" → 행 | null
//   deleteFriend(rid)
//   quotaGet(day) → { creates, joins, erases } · quotaBump(day, field)
//   purgeExpired(activeBefore, createdBefore, limit) → 지운 지도 수 · purgeQuota(dayBefore)
"use strict";
(function (root, factory) {
  const C = factory();
  if (typeof module === "object" && module.exports) module.exports = C;
  else root.FriendMapCore = C;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ARCHETYPES = ["warrior", "sage", "lover", "rebel", "caregiver", "explorer", "creator", "ruler"];
  const ICON_RE = /^i(0[1-9]|1\d|2[0-4])$/;
  const ID_RE = /^[A-Za-z0-9_-]{22}$/; // base64url 22자 = 128비트
  const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford Base32
  const B32_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const LIMITS = Object.freeze({
    body: 1024, // 바이트
    friends: 30, // 지도당
    hourJoins: 10, // 지도당 한 시간
    activeDays: 90, // 주인 마지막 활동 뒤
    maxDays: 365, // 만든 날 뒤
    quotaKeepDays: 7,
    createPurge: 20, // create 때 지우는 만료 지도 최대 수
  });
  const DEFAULT_CAPS = Object.freeze({ creates: 1000, joins: 3000, erases: 3000 }); // 하루 상한 [기본값, 80번]
  const DAY_MS = 86400000;

  // 경로마다 받는 칸 (이 칸만, 정확히)
  const SHAPES = {
    create: [["nick", "icon", "main", "sub"]],
    join: [["invite", "nick", "icon", "main", "sub"]],
    peek: [["invite"]],
    view: [["key"]],
    erase: [["key", "act"], ["key", "act", "rid"], ["del", "act"]],
  };
  const OWNER_ACTS = ["map", "close", "rekey", "reinvite"]; // key + act
  const CAPPED_ACTS = ["close", "rekey", "reinvite"]; // 하루 상한(erases)에 막히는 동작. 삭제(friend·map·leave)는 상한에 걸려도 받는다
  // 기획 검수 2차 권장 4 결정: 삭제 동작도 erases 계수를 1 올린다(막지는 않음). D1 쓰기 한도를 함께 재려고.

  const day = (ms) => new Date(ms).toISOString().slice(0, 10);
  const hourSlot = (ms) => new Date(ms).toISOString().slice(0, 13);
  const dayMinus = (ms, n) => day(ms - n * DAY_MS);

  // 키·코드 표준형 (16-5의 2). 브라우저 map.js도 같은 규칙을 쓴다. 틀리면 null
  function canon(str, prefix) {
    if (typeof str !== "string" || str.length > 64) return null;
    let s = str.trim().replace(/[\s-]+/g, "").toUpperCase();
    if (s.startsWith(prefix)) s = s.slice(prefix.length);
    s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
    return B32_RE.test(s) ? s : null;
  }
  const pretty = (prefix, c) => prefix + "-" + c.match(/.{1,4}/g).join("-");

  function rand16() {
    return globalThis.crypto.getRandomValues(new Uint8Array(16));
  }
  function b32(bytes) {
    let n = 0n;
    for (const b of bytes) n = (n << 8n) | BigInt(b);
    let out = "";
    for (let i = 0; i < 26; i++) {
      out = B32[Number(n & 31n)] + out;
      n >>= 5n;
    }
    return out;
  }
  function b64url(bytes) {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function sha256hex(text) {
    const d = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  const hashOf = (prefix, c) => sha256hex(prefix + c);

  // 별명 거름 (16-2의 3 + 금칙어). 통과하면 정리한 별명, 아니면 null
  function cleanNick(v, words) {
    if (typeof v !== "string") return null;
    const s = v.normalize("NFC").trim();
    const n = Array.from(s).length;
    if (n < 1 || n > 8) return null;
    if ((s.match(/\d/g) || []).length >= 7) return null; // 전화번호 모양
    if (/http|www|@|\.com|\.kr/i.test(s)) return null; // 주소 모양
    if (/[<>\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/.test(s)) return null;
    const flat = s.toLowerCase().replace(/\s+/g, "");
    if ((words || []).some((w) => w && flat.includes(w))) return null;
    return s;
  }

  // 칸 검사. { error } 또는 { val }
  function validate(op, b, words) {
    const keys = Object.keys(b).sort().join(",");
    const shape = SHAPES[op].find((s) => s.slice().sort().join(",") === keys);
    if (!shape) return { error: "bad_request" };
    for (const k of shape) if (typeof b[k] !== "string" || b[k].length > 64) return { error: "bad_request" };
    const val = {};
    if ("icon" in b) {
      if (!ICON_RE.test(b.icon) || !ARCHETYPES.includes(b.main) || !ARCHETYPES.includes(b.sub)) return { error: "bad_request" };
      val.icon = b.icon;
      val.main = b.main;
      val.sub = b.sub;
      val.nick = cleanNick(b.nick, words);
      if (val.nick === null) return { error: "nick" };
    }
    if (op === "erase") {
      if ("del" in b) {
        if (b.act !== "leave") return { error: "bad_request" };
      } else if ("rid" in b) {
        if (b.act !== "friend") return { error: "bad_request" };
        val.rid = b.rid;
      } else if (!OWNER_ACTS.includes(b.act)) return { error: "bad_request" }; // open 등 목록 밖 → 400
      val.act = b.act;
    }
    if ("invite" in b) val.invite = b.invite;
    if ("key" in b) val.key = b.key;
    if ("del" in b) val.del = b.del;
    return { val };
  }

  function createCore(opts) {
    const store = opts.store;
    const now = opts.now || (() => Date.now());
    const words = opts.words || [];
    const limiter = opts.limiter || null; // 선택: Workers Rate Limiting 바인딩 (op) → true면 통과
    const capOf = (f) => {
      const c = opts.caps && Number.isFinite(opts.caps[f]) ? opts.caps[f] : DEFAULT_CAPS[f];
      return c;
    };

    const JSON_HEAD = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
    const out = (status, obj, cors, extra) => ({ status, headers: Object.assign({}, JSON_HEAD, cors || {}, extra || {}), body: JSON.stringify(obj) });
    const NOT_FOUND = { error: "not_found" };

    const expired = (m, ms) => m.active < dayMinus(ms, LIMITS.activeDays) || m.created < dayMinus(ms, LIMITS.maxDays);
    // 읽을 때 정리: 만료면 지우고 null
    async function live(m, ms) {
      if (!m) return null;
      if (expired(m, ms)) {
        await store.deleteMap(m.id);
        return null;
      }
      return m;
    }
    async function overCap(today, field) {
      const q = await store.quotaGet(today);
      return (q ? Number(q[field]) || 0 : 0) >= capOf(field);
    }
    async function mapByKey(key, ms) {
      const c = canon(key, "SOM");
      if (!c) return null;
      return live(await store.getMap("key_hash", await hashOf("SOM", c)), ms);
    }

    const OPS = {
      async create(v, ms, today) {
        if (await overCap(today, "creates")) return [503, { error: "quota" }];
        await store.purgeExpired(dayMinus(ms, LIMITS.activeDays), dayMinus(ms, LIMITS.maxDays), LIMITS.createPurge);
        const keyC = b32(rand16());
        const row = {
          id: b64url(rand16()),
          invite: b64url(rand16()),
          key_hash: await hashOf("SOM", keyC),
          nick: v.nick,
          icon: v.icon,
          main: v.main,
          sub: v.sub,
          open: 1,
          created: today,
          active: today,
          hour_slot: "",
          hour_joins: 0,
        };
        await store.insertMap(row);
        await store.quotaBump(today, "creates");
        return [200, { invite: row.invite, key: pretty("SOM", keyC), created: today }];
      },

      async join(v, ms, today) {
        if (await overCap(today, "joins")) return [503, { error: "quota" }];
        const m = ID_RE.test(v.invite) ? await live(await store.getMap("invite", v.invite), ms) : null;
        if (!m) return [404, NOT_FOUND];
        if (!Number(m.open)) return [409, { error: "closed" }];
        const slot = hourSlot(ms);
        if (m.hour_slot === slot && Number(m.hour_joins) >= LIMITS.hourJoins) {
          const wait = Math.max(1, Math.ceil((Math.floor(ms / 3600000) + 1) * 3600 - ms / 1000));
          return [429, { error: "rate" }, { "Retry-After": String(wait) }];
        }
        const delC = b32(rand16());
        const row = { rid: b64url(rand16()), map_id: m.id, nick: v.nick, icon: v.icon, main: v.main, sub: v.sub, del_hash: await hashOf("SOD", delC), joined: today };
        if (!(await store.insertFriend(row, LIMITS.friends))) return [409, { error: "full" }];
        await store.bumpHour(m.id, slot); // active는 건드리지 않는다
        await store.quotaBump(today, "joins");
        return [200, { rid: row.rid, del: pretty("SOD", delC), joined: today }];
      },

      async peek(v, ms) {
        const m = ID_RE.test(v.invite) ? await live(await store.getMap("invite", v.invite), ms) : null;
        // 닫힘·찼음·없음·만료 모두 같은 404 (초대 ID로 지도 상태를 캐지 못하게)
        if (!m || !Number(m.open) || (await store.countFriends(m.id)) >= LIMITS.friends) return [404, NOT_FOUND];
        return [200, { nick: m.nick, icon: m.icon, main: m.main, sub: m.sub }];
      },

      async view(v, ms, today) {
        const m = await mapByKey(v.key, ms);
        if (!m) return [404, NOT_FOUND];
        await store.updateMap(m.id, { active: today });
        const friends = (await store.listFriends(m.id)).map((f) => ({ rid: f.rid, nick: f.nick, icon: f.icon, main: f.main, sub: f.sub, joined: f.joined }));
        return [200, { invite: m.invite, nick: m.nick, icon: m.icon, main: m.main, sub: m.sub, open: Boolean(Number(m.open)), created: m.created, active: today, friends }];
      },

      async erase(v, ms, today) {
        if (v.act === "leave") {
          const c = canon(v.del, "SOD");
          const f = c ? await store.getFriend("del_hash", await hashOf("SOD", c)) : null;
          if (!f) return [404, NOT_FOUND];
          const m = await live(await store.getMap("id", f.map_id), ms); // 만료 지도면 친구 기록도 함께 지워진다
          if (!m) return [404, NOT_FOUND];
          await store.deleteFriend(f.rid); // active는 건드리지 않는다
          await store.quotaBump(today, "erases");
          return [200, { ok: true }];
        }
        const m = await mapByKey(v.key, ms);
        if (!m) return [404, NOT_FOUND];
        if (CAPPED_ACTS.includes(v.act) && (await overCap(today, "erases"))) return [503, { error: "quota" }];
        let res = { ok: true };
        if (v.act === "friend") {
          const f = await store.getFriend("rid", v.rid);
          if (!f || f.map_id !== m.id) return [404, NOT_FOUND]; // 남의 지도 rid도 같은 404
          await store.deleteFriend(f.rid);
          await store.updateMap(m.id, { active: today });
        } else if (v.act === "map") {
          await store.deleteMap(m.id);
        } else if (v.act === "close") {
          await store.updateMap(m.id, { open: 0, active: today });
        } else if (v.act === "rekey") {
          const keyC = b32(rand16());
          await store.updateMap(m.id, { key_hash: await hashOf("SOM", keyC), active: today }); // 옛 키 즉시 무효
          res = { key: pretty("SOM", keyC) };
        } else if (v.act === "reinvite") {
          const invite = b64url(rand16());
          await store.updateMap(m.id, { invite, open: 1, active: today }); // 옛 초대 ID 즉시 무효
          res = { invite };
        }
        await store.quotaBump(today, "erases");
        return [200, res];
      },
    };

    // req: { method, path, origin, body(문자열), tooBig } → { status, headers, body }
    async function handle(req) {
      const env = opts.env || {};
      const allowed = String(env.ALLOWED_ORIGIN || "");
      if (env.MAP_MODE !== "live" || !allowed) return out(503, { error: "off" }); // 설정이 덜 된 채 열리지 않게
      if (!req.origin || req.origin !== allowed) return out(403, { error: "origin" }); // Origin 없음도 403
      const cors = { "Access-Control-Allow-Origin": allowed, Vary: "Origin" };
      if (req.method === "OPTIONS") {
        return { status: 204, headers: Object.assign({ "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600", "Cache-Control": "no-store" }, cors), body: "" };
      }
      const op = /^\/(create|join|peek|view|erase)$/.test(req.path || "") ? req.path.slice(1) : null;
      if (!op) return out(404, NOT_FOUND, cors);
      if (req.method !== "POST") return out(400, { error: "method" }, cors);
      const body = typeof req.body === "string" ? req.body : "";
      if (req.tooBig || new TextEncoder().encode(body).length > LIMITS.body) return out(413, { error: "too_big" }, cors);
      if (limiter && op !== "peek" && op !== "view" && !(await limiter(op))) return out(429, { error: "rate" }, cors, { "Retry-After": "60" });
      let b;
      try {
        b = JSON.parse(body);
      } catch (e) {
        return out(400, { error: "bad_request" }, cors);
      }
      if (!b || typeof b !== "object" || Array.isArray(b)) return out(400, { error: "bad_request" }, cors);
      const chk = validate(op, b, words);
      if (chk.error) return out(400, { error: chk.error }, cors);
      const ms = now();
      try {
        const [status, obj, extra] = await OPS[op](chk.val, ms, day(ms));
        return out(status, obj, cors, extra);
      } catch (e) {
        return out(503, { error: "db" }, cors); // 오류 내용은 찍지 않는다
      }
    }

    // Cron(하루 한 번): 만료 지도 + 친구 기록, 7일 지난 quota 줄
    async function cleanup() {
      const ms = now();
      const n = await store.purgeExpired(dayMinus(ms, LIMITS.activeDays), dayMinus(ms, LIMITS.maxDays), null);
      await store.purgeQuota(dayMinus(ms, LIMITS.quotaKeepDays));
      return n;
    }

    return { handle, cleanup };
  }

  return { createCore, canon, pretty, hashOf, cleanNick, ARCHETYPES, LIMITS, DEFAULT_CAPS, day, dayMinus };
});
