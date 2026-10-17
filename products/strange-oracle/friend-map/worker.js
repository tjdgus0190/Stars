// 낯선 점술관 · 친구 궁합 지도 Cloudflare Worker 진입점 (specs/strange-oracle.md 16-5)
// - fetch: 요청을 core.js handle()에 넘긴다. scheduled: Cron 하루 한 번 만료 정리.
// - D1 어댑터: 모든 값은 prepared statement의 bind로만 넘긴다. SQL 문자열에 값을 이어 붙이지 않는다(아래 SQL은 모두 상수).
// - 로그 없음: 요청 본문·키·코드·IP를 찍는 console 출력이 없다. wrangler.toml에서 Observability도 끈다.
// - 외부 패키지 없음(Workers 기본 API만). 결제 서버(pay·book)와 무관하다.
// - 배포는 운영자가 한다(HANDOFF 3장). 이 폴더는 배포 폴더(dist/public)에 들어가지 않는다.
import Core from "./core.js";
import WORDS from "./words.js";

const MAP_COLS = "id, invite, key_hash, nick, icon, main, sub, open, created, active, hour_slot, hour_joins";
const FRIEND_COLS = "rid, map_id, nick, icon, main, sub, del_hash, joined";
const EXPIRED = "SELECT id FROM maps WHERE active < ?1 OR created < ?2 ORDER BY id LIMIT ?3";

export const SQL = Object.freeze({
  mapById: `SELECT ${MAP_COLS} FROM maps WHERE id = ?1`,
  mapByInvite: `SELECT ${MAP_COLS} FROM maps WHERE invite = ?1`,
  mapByKeyHash: `SELECT ${MAP_COLS} FROM maps WHERE key_hash = ?1`,
  insertMap: `INSERT INTO maps (${MAP_COLS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
  touch: "UPDATE maps SET active = ?2 WHERE id = ?1",
  close: "UPDATE maps SET open = ?2, active = ?3 WHERE id = ?1",
  rekey: "UPDATE maps SET key_hash = ?2, active = ?3 WHERE id = ?1",
  reinvite: "UPDATE maps SET invite = ?2, open = ?3, active = ?4 WHERE id = ?1",
  bumpHour: "UPDATE maps SET hour_joins = CASE WHEN hour_slot = ?2 THEN hour_joins + 1 ELSE 1 END, hour_slot = ?2 WHERE id = ?1",
  deleteFriendsOfMap: "DELETE FROM friends WHERE map_id = ?1",
  deleteMap: "DELETE FROM maps WHERE id = ?1",
  countFriends: "SELECT COUNT(*) AS n FROM friends WHERE map_id = ?1",
  listFriends: `SELECT ${FRIEND_COLS} FROM friends WHERE map_id = ?1 ORDER BY joined, rowid`,
  insertFriend: `INSERT INTO friends (${FRIEND_COLS}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8 WHERE (SELECT COUNT(*) FROM friends WHERE map_id = ?2) < ?9`,
  friendByRid: `SELECT ${FRIEND_COLS} FROM friends WHERE rid = ?1`,
  friendByDelHash: `SELECT ${FRIEND_COLS} FROM friends WHERE del_hash = ?1`,
  deleteFriend: "DELETE FROM friends WHERE rid = ?1",
  quotaGet: "SELECT creates, joins, erases FROM quota WHERE day = ?1",
  bumpCreates: "INSERT INTO quota (day, creates, joins, erases) VALUES (?1, 1, 0, 0) ON CONFLICT(day) DO UPDATE SET creates = creates + 1",
  bumpJoins: "INSERT INTO quota (day, creates, joins, erases) VALUES (?1, 0, 1, 0) ON CONFLICT(day) DO UPDATE SET joins = joins + 1",
  bumpErases: "INSERT INTO quota (day, creates, joins, erases) VALUES (?1, 0, 0, 1) ON CONFLICT(day) DO UPDATE SET erases = erases + 1",
  countExpired: `SELECT COUNT(*) AS n FROM (${EXPIRED})`,
  purgeFriends: `DELETE FROM friends WHERE map_id IN (${EXPIRED})`,
  purgeMaps: `DELETE FROM maps WHERE id IN (${EXPIRED})`,
  purgeQuota: "DELETE FROM quota WHERE day < ?1",
});

const MAP_BY = { id: SQL.mapById, invite: SQL.mapByInvite, key_hash: SQL.mapByKeyHash };
const FRIEND_BY = { rid: SQL.friendByRid, del_hash: SQL.friendByDelHash };
const BUMP = { creates: SQL.bumpCreates, joins: SQL.bumpJoins, erases: SQL.bumpErases };
const ALL = 1000000; // Cron 정리 때 LIMIT

// D1 어댑터 (core.js 머리의 어댑터 모양). db = env.DB (D1Database)
export function d1Store(db) {
  const q = (sql, ...vals) => db.prepare(sql).bind(...vals);
  const one = (sql, table) => {
    if (!sql) throw new Error(table); // 정해 둔 칸 밖 조회는 없다
    return sql;
  };
  return {
    getMap: (by, v) => q(one(MAP_BY[by], "maps"), v).first(),
    insertMap: (r) => q(SQL.insertMap, r.id, r.invite, r.key_hash, r.nick, r.icon, r.main, r.sub, r.open, r.created, r.active, r.hour_slot, r.hour_joins).run(),
    updateMap(id, p) {
      const shape = Object.keys(p).sort().join(",");
      if (shape === "active") return q(SQL.touch, id, p.active).run();
      if (shape === "active,open") return q(SQL.close, id, p.open, p.active).run();
      if (shape === "active,key_hash") return q(SQL.rekey, id, p.key_hash, p.active).run();
      if (shape === "active,invite,open") return q(SQL.reinvite, id, p.invite, p.open, p.active).run();
      throw new Error("update shape");
    },
    bumpHour: (id, slot) => q(SQL.bumpHour, id, slot).run(),
    deleteMap: (id) => db.batch([q(SQL.deleteFriendsOfMap, id), q(SQL.deleteMap, id)]),
    countFriends: async (mapId) => Number((await q(SQL.countFriends, mapId).first()).n),
    listFriends: async (mapId) => (await q(SQL.listFriends, mapId).all()).results || [],
    insertFriend: async (r, max) => {
      const res = await q(SQL.insertFriend, r.rid, r.map_id, r.nick, r.icon, r.main, r.sub, r.del_hash, r.joined, max).run();
      return Number(res.meta && res.meta.changes) === 1;
    },
    getFriend: (by, v) => q(one(FRIEND_BY[by], "friends"), v).first(),
    deleteFriend: (rid) => q(SQL.deleteFriend, rid).run(),
    quotaGet: (d) => q(SQL.quotaGet, d).first(),
    quotaBump: (d, field) => q(one(BUMP[field], "quota"), d).run(),
    async purgeExpired(activeBefore, createdBefore, limit) {
      const lim = limit == null ? ALL : limit;
      const n = Number((await q(SQL.countExpired, activeBefore, createdBefore, lim).first()).n);
      if (!n) return 0;
      // friends → maps 순으로 한 batch. 두 질의의 하위 질의는 같은 정렬(ORDER BY id)이라 같은 지도들을 고른다
      await db.batch([q(SQL.purgeFriends, activeBefore, createdBefore, lim), q(SQL.purgeMaps, activeBefore, createdBefore, lim)]);
      return n;
    },
    purgeQuota: (before) => q(SQL.purgeQuota, before).run(),
  };
}

// 본문은 1KB까지만 읽는다(넘으면 tooBig)
async function readBody(request) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > Core.LIMITS.body) return { body: "", tooBig: true };
  if (!request.body) return { body: "", tooBig: false };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > Core.LIMITS.body) {
      try {
        await reader.cancel();
      } catch (e) {}
      return { body: "", tooBig: true };
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    all.set(c, o);
    o += c.byteLength;
  }
  return { body: new TextDecoder().decode(all), tooBig: false };
}

function coreFor(request, env) {
  // 선택: Workers Rate Limiting 바인딩 RATE_LIMITER(무료 요금제 가능 여부 미확인, wrangler.toml 주석). IP는 Cloudflare 쪽 짧은 창에서만 쓰고 우리 DB에 넣지 않는다.
  const rl = env.RATE_LIMITER;
  const limiter = rl && request
    ? async (op) => {
        const r = await rl.limit({ key: op + ":" + (request.headers.get("CF-Connecting-IP") || "") });
        return Boolean(r && r.success);
      }
    : null;
  return Core.createCore({ store: d1Store(env.DB), env: { MAP_MODE: env.MAP_MODE, ALLOWED_ORIGIN: env.ALLOWED_ORIGIN }, words: WORDS, limiter });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // (17-9 QA16 권장5) 본문 읽기가 실패하면(스트림 끊김 등) core가 Origin 확인 뒤 503 {error:"db"}로 답한다. 오류 내용은 찍지 않는다
    let read;
    try {
      read = request.method === "POST" ? await readBody(request) : { body: "", tooBig: false };
    } catch (e) {
      read = { body: "", tooBig: false, readError: true };
    }
    const { body, tooBig, readError } = read;
    const r = await coreFor(request, env).handle({ method: request.method, path: url.pathname, origin: request.headers.get("Origin") || "", body, tooBig, readError: Boolean(readError) });
    return new Response(r.status === 204 ? null : r.body, { status: r.status, headers: r.headers });
  },
  // Cron Trigger (wrangler.toml crons). MAP_MODE와 상관없이 만료 기록은 지운다
  async scheduled(event, env, ctx) {
    ctx.waitUntil(coreFor(null, env).cleanup());
  },
};
