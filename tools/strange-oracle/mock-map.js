// 16단계 모의 지도 서버 — friend-map/core.js를 메모리 어댑터로 그대로 돌린다(실제 Worker와 같은 검사·같은 응답). 배포하지 않음.
// 결제 모의(mock-pay.js)와 저장소·스위치를 섞지 않는다.
//
// 경로 (mock-server.js가 붙인다)
//   POST /__dev/map/{create|join|peek|view|erase}   data.js 응답의 map.api = "/__dev/map" (test 모드에서만 바꿈)
//   /__dev/map-switch?down=1|0&slow=<ms>&clock=+<n>d|+<n>h|0&cap=<n>|default&limits=reset
//     down=1     모든 지도 요청 503 {"error":"off"}
//     slow=<ms>  지도 응답 지연 (0이면 끔, 8초 시간 초과 시험은 slow=9000)
//     clock      서버 시계를 지금부터 n일(또는 n시간) 뒤로. 누적이 아니라 지정값. clock=0 이면 되돌림
//     cap=<n>    하루 상한(creates·joins·erases)을 모두 n으로. cap=default 이면 기본값(1000·3000·3000)
//     limits=reset  quota 줄과 지도별 시간당 참여 계수를 비움
//   /__dev/map-store(?clear=1)  표 세 개(maps·friends·quota)의 행을 그대로 보인다(칸 검사용)
//   응답은 현재 스위치 상태 JSON
// 요청 본문은 찍지 않는다(주소·상태 코드만 mock-server가 한 줄 출력).
"use strict";
const path = require("path");
const Core = require(path.join(__dirname, "..", "..", "products", "strange-oracle", "friend-map", "core.js"));
const WORDS = require(path.join(__dirname, "..", "..", "products", "strange-oracle", "friend-map", "words.js"));

const MAP_COLS = ["id", "invite", "key_hash", "nick", "icon", "main", "sub", "open", "created", "active", "hour_slot", "hour_joins"];
const FRIEND_COLS = ["rid", "map_id", "nick", "icon", "main", "sub", "del_hash", "joined"];
const QUOTA_COLS = ["day", "creates", "joins", "erases"];
const pick = (row, cols) => (row ? Object.fromEntries(cols.map((c) => [c, row[c]])) : null);

// 메모리 어댑터 (core.js 머리의 어댑터 모양, D1 어댑터와 같은 뜻)
function createMemMapStore() {
  let maps = [];
  let friends = [];
  let quota = [];
  const failIf = () => {
    if (s.fail) throw new Error("store");
  };
  const s = {
    fail: false,
    async getMap(by, v) {
      failIf();
      if (!["id", "invite", "key_hash"].includes(by)) throw new Error("by");
      return pick(maps.find((m) => m[by] === v), MAP_COLS);
    },
    async insertMap(r) {
      failIf();
      if (maps.some((m) => m.id === r.id || m.invite === r.invite || m.key_hash === r.key_hash)) throw new Error("unique");
      maps.push(pick(r, MAP_COLS));
    },
    async updateMap(id, p) {
      failIf();
      const shape = Object.keys(p).sort().join(",");
      if (!["active", "active,open", "active,key_hash", "active,invite,open"].includes(shape)) throw new Error("update shape");
      const m = maps.find((x) => x.id === id);
      if (m) Object.assign(m, p);
    },
    async bumpHour(id, slot) {
      failIf();
      const m = maps.find((x) => x.id === id);
      if (!m) return;
      m.hour_joins = m.hour_slot === slot ? m.hour_joins + 1 : 1;
      m.hour_slot = slot;
    },
    async deleteMap(id) {
      failIf();
      friends = friends.filter((f) => f.map_id !== id);
      maps = maps.filter((m) => m.id !== id);
    },
    async countFriends(mapId) {
      failIf();
      return friends.filter((f) => f.map_id === mapId).length;
    },
    async listFriends(mapId) {
      failIf();
      return friends.filter((f) => f.map_id === mapId).map((f) => pick(f, FRIEND_COLS));
    },
    async insertFriend(r, max) {
      failIf();
      if (friends.filter((f) => f.map_id === r.map_id).length >= max) return false;
      if (!maps.some((m) => m.id === r.map_id) || friends.some((f) => f.rid === r.rid || f.del_hash === r.del_hash)) throw new Error("constraint");
      friends.push(pick(r, FRIEND_COLS));
      return true;
    },
    async getFriend(by, v) {
      failIf();
      if (!["rid", "del_hash"].includes(by)) throw new Error("by");
      return pick(friends.find((f) => f[by] === v), FRIEND_COLS);
    },
    async deleteFriend(rid) {
      failIf();
      friends = friends.filter((f) => f.rid !== rid);
    },
    async quotaGet(d) {
      failIf();
      const q = quota.find((x) => x.day === d);
      return q ? { creates: q.creates, joins: q.joins, erases: q.erases } : null;
    },
    async quotaBump(d, field) {
      failIf();
      if (!["creates", "joins", "erases"].includes(field)) throw new Error("field");
      let q = quota.find((x) => x.day === d);
      if (!q) quota.push((q = { day: d, creates: 0, joins: 0, erases: 0 }));
      q[field]++;
    },
    async purgeExpired(activeBefore, createdBefore, limit) {
      failIf();
      const ids = maps
        .filter((m) => m.active < activeBefore || m.created < createdBefore)
        .map((m) => m.id)
        .sort()
        .slice(0, limit == null ? Infinity : limit);
      friends = friends.filter((f) => !ids.includes(f.map_id));
      maps = maps.filter((m) => !ids.includes(m.id));
      return ids.length;
    },
    async purgeQuota(before) {
      failIf();
      quota = quota.filter((q) => !(q.day < before));
    },
    // 시험·모의 전용
    dump: () => ({ maps: maps.map((m) => ({ ...m })), friends: friends.map((f) => ({ ...f })), quota: quota.map((q) => ({ ...q })) }),
    clear() {
      maps = [];
      friends = [];
      quota = [];
    },
    resetLimits() {
      quota = [];
      for (const m of maps) {
        m.hour_slot = "";
        m.hour_joins = 0;
      }
    },
  };
  return s;
}

function createMapMock({ port, mode }) {
  const store = createMemMapStore();
  const sw = { down: false, slow: 0, clock: "0", cap: "default" };
  let offsetMs = 0;
  const caps = { ...Core.DEFAULT_CAPS };
  const env = { MAP_MODE: mode === "test" ? "live" : "off", ALLOWED_ORIGIN: `http://127.0.0.1:${port}` };
  const core = Core.createCore({ store, env, caps, words: WORDS, now: () => Date.now() + offsetMs });

  const sendJson = (res, status, obj, headers) => res.writeHead(status, Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, headers || {})).end(JSON.stringify(obj));

  // data.js 응답에서만 map.mode → "test", map.api → "/__dev/map" (파일은 고치지 않음). map 객체의 mode·api는 안쪽 중괄호보다 앞에 둔다
  function transformDataJs(src) {
    if (mode !== "test") return src;
    return src.replace(/(\bmap:\s*\{[^{}]*?\bmode:\s*)"[^"]*"/, '$1"test"').replace(/(\bmap:\s*\{[^{}]*?\bapi:\s*)"[^"]*"/, '$1"/__dev/map"');
  }

  function route(req, res, rel, url, log) {
    if (rel.startsWith("/__dev/map/")) {
      let body = "";
      let size = 0;
      let tooBig = false;
      req.on("data", (c) => {
        size += c.length;
        if (size > Core.LIMITS.body) tooBig = true;
        else body += c;
      });
      req.on("end", async () => {
        if (sw.slow) await new Promise((r) => setTimeout(r, sw.slow));
        if (sw.down) {
          sendJson(res, 503, { error: "off" }, { "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN, Vary: "Origin" });
          return log(503);
        }
        const r = await core.handle({ method: req.method, path: rel.slice("/__dev/map".length), origin: req.headers.origin || "", body: tooBig ? "" : body, tooBig });
        res.writeHead(r.status, r.headers).end(r.status === 204 ? undefined : r.body);
        log(r.status);
      });
      return true;
    }
    if (rel === "/__dev/map-switch") {
      const q = url.searchParams;
      if (q.get("down") === "1" || q.get("down") === "0") sw.down = q.get("down") === "1";
      if (/^\d{1,6}$/.test(q.get("slow") || "")) sw.slow = Number(q.get("slow"));
      const c = (q.get("clock") || "").trim().match(/^\+?(\d{1,4})([dh])?$/);
      if (c) {
        offsetMs = Number(c[1]) * (c[2] === "h" ? 3600000 : 86400000);
        sw.clock = offsetMs ? `+${c[1]}${c[2] || "d"}` : "0";
      }
      const cap = q.get("cap");
      if (cap === "default") Object.assign(caps, Core.DEFAULT_CAPS), (sw.cap = "default");
      else if (/^\d{1,6}$/.test(cap || "")) {
        caps.creates = caps.joins = caps.erases = Number(cap);
        sw.cap = cap;
      }
      if (q.get("limits") === "reset") store.resetLimits();
      sendJson(res, 200, Object.assign({}, sw, { today: Core.day(Date.now() + offsetMs), mode: env.MAP_MODE }));
      log(200);
      return true;
    }
    if (rel === "/__dev/map-store") {
      if (url.searchParams.get("clear") === "1") store.clear();
      sendJson(res, 200, store.dump());
      log(200);
      return true;
    }
    return false;
  }

  return { route, store, sw, env, caps, core, transformDataJs };
}

module.exports = { createMapMock, createMemMapStore, MAP_COLS, FRIEND_COLS, QUOTA_COLS };
