// 16단계 친구 궁합 지도 서버 단위 시험 (specs 16-7 시험 목록 · 16-9의 11·12·15·16 · 6장 검사의 서버 몫)
// 같은 시험을 두 저장소로 돌린다: 메모리 어댑터(mock-map.js) · D1 어댑터(worker.js d1Store) + node:sqlite 위 D1 흉내(schema.sql 그대로)
// node:sqlite가 없는 Node면 D1 쪽은 건너뛰고 그렇게 표시한다.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..", "..");
const FM = path.join(ROOT, "products", "strange-oracle", "friend-map");
const Core = require(path.join(FM, "core.js"));
const WORDS = require(path.join(FM, "words.js"));
const { createMemMapStore, createMapMock, MAP_COLS, FRIEND_COLS, QUOTA_COLS } = require("./mock-map.js");
let sqlite = null;
try {
  sqlite = require("node:sqlite");
} catch (e) {}
const SCHEMA = fs.readFileSync(path.join(FM, "schema.sql"), "utf8");
const ORIGIN = "https://oracle.example";
const T0 = Date.UTC(2026, 9, 17, 3, 0, 0);
const DAY = 86400000;

// node:sqlite 위 D1 흉내: prepare().bind().first()/all()/run(), batch()는 한 트랜잭션
function d1Shim(db) {
  const mk = (sql, args) => ({
    bind: (...a) => mk(sql, a),
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
  });
  return {
    prepare: (sql) => mk(sql, []),
    batch: async (stmts) => {
      db.exec("BEGIN");
      try {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

async function makeStores() {
  const list = [{ name: "메모리", make: () => ({ store: createMemMapStore(), dump: (s) => s.dump() }) }];
  if (sqlite) {
    const W = await import(pathToFileURL(path.join(FM, "worker.js")).href);
    list.push({
      name: "D1(node:sqlite)",
      W,
      make: () => {
        const db = new sqlite.DatabaseSync(":memory:");
        db.exec(SCHEMA);
        const store = W.d1Store(d1Shim(db));
        store._db = db;
        return { store, dump: () => ({ maps: db.prepare("SELECT * FROM maps").all().map((r) => ({ ...r })), friends: db.prepare("SELECT * FROM friends").all().map((r) => ({ ...r })), quota: db.prepare("SELECT * FROM quota").all().map((r) => ({ ...r })) }) };
      },
    });
  }
  return list;
}

function harness(kind, envOver, capsOver) {
  const { store, dump } = kind.make();
  const clock = { t: T0 };
  const env = Object.assign({ MAP_MODE: "live", ALLOWED_ORIGIN: ORIGIN }, envOver || {});
  const caps = Object.assign({}, Core.DEFAULT_CAPS, capsOver || {});
  const core = Core.createCore({ store, env, caps, words: WORDS, now: () => clock.t });
  const call = async (op, body, o = {}) => {
    const r = await core.handle({ method: o.method || "POST", path: "/" + op, origin: "origin" in o ? o.origin : ORIGIN, body: typeof body === "string" ? body : JSON.stringify(body), tooBig: false });
    let json = null;
    try {
      json = r.body ? JSON.parse(r.body) : null;
    } catch (e) {}
    return { status: r.status, json, headers: r.headers, raw: r.body };
  };
  const days = (n) => (clock.t += n * DAY);
  const H = { core, store, env, caps, clock, call, days, dump: () => dump(store) };
  H.create = async (over) => (await call("create", Object.assign({ nick: "주인", icon: "i01", main: "sage", sub: "lover" }, over || {}))).json;
  H.join = (invite, over) => call("join", Object.assign({ invite, nick: "친구", icon: "i02", main: "warrior", sub: "warrior" }, over || {}));
  return H;
}

const NF = JSON.stringify({ error: "not_found" });

test("서버 핵심 (두 저장소)", async (t) => {
  const kinds = await makeStores();
  if (!sqlite) t.diagnostic("node:sqlite 없음 — D1 SQL 확인 건너뜀");
  for (const kind of kinds) {
    await t.test(`[${kind.name}] 네 가지 일: 만들기·더하기·보기(초대·주인)·지우기`, async () => {
      const H = harness(kind);
      const c = await H.create();
      assert.match(c.invite, /^[A-Za-z0-9_-]{22}$/);
      assert.match(c.key, /^SOM(-[0-9A-HJKMNP-TV-Z]{4}){6}-[0-9A-HJKMNP-TV-Z]{2}$/);
      assert.equal(c.created, "2026-10-17");
      const p = await H.call("peek", { invite: c.invite });
      assert.deepEqual(p.json, { nick: "주인", icon: "i01", main: "sage", sub: "lover" });
      const j = await H.join(c.invite);
      assert.equal(j.status, 200);
      assert.deepEqual(Object.keys(j.json).sort(), ["del", "joined", "rid"]);
      assert.match(j.json.del, /^SOD-/);
      const v = await H.call("view", { key: c.key });
      assert.equal(v.status, 200);
      assert.deepEqual(Object.keys(v.json).sort(), ["active", "created", "friends", "icon", "invite", "main", "nick", "open", "sub"]);
      assert.equal(v.json.open, true);
      assert.deepEqual(v.json.friends, [{ rid: j.json.rid, nick: "친구", icon: "i02", main: "warrior", sub: "warrior", joined: "2026-10-17" }]);
      const e = await H.call("erase", { key: c.key, act: "map" });
      assert.deepEqual(e.json, { ok: true });
      assert.deepEqual(H.dump().maps, []);
      assert.deepEqual(H.dump().friends, []);
    });

    await t.test(`[${kind.name}] 칸 검사: 남는 칸·빠진 칸·형식 틀림은 400이고 저장 0, 입력값 칸도 400`, async () => {
      const H = harness(kind);
      const base = { nick: "별", icon: "i01", main: "sage", sub: "sage" };
      for (const bad of [
        Object.assign({ name: "홍길동" }, base),
        Object.assign({ birth: "1995-03-25" }, base),
        Object.assign({ gender: "f" }, base),
        Object.assign({ extra: 1 }, base),
        { nick: "별", icon: "i01", main: "sage" },
        Object.assign({}, base, { icon: "i25" }),
        Object.assign({}, base, { icon: "i00" }),
        Object.assign({}, base, { main: "hero" }),
        Object.assign({}, base, { nick: 3 }),
        [base],
        "null",
      ]) {
        const r = await H.call("create", bad);
        assert.equal(r.status, 400, JSON.stringify(bad));
        assert.equal(r.raw, JSON.stringify({ error: "bad_request" }));
      }
      assert.equal((await H.call("create", "{nick:")).status, 400);
      assert.deepEqual(H.dump(), { maps: [], friends: [], quota: [] });
      const c = await H.create();
      assert.equal((await H.call("view", { key: c.key, extra: "1" })).status, 400);
      assert.equal((await H.call("peek", { invite: c.invite, key: c.key })).status, 400);
      assert.equal((await H.join(c.invite, { birth: "19950325" })).status, 400);
      assert.equal(H.dump().friends.length, 0);
    });

    await t.test(`[${kind.name}] 별명 거름 (길이·전화번호·주소·꺾쇠·제어 문자·금칙어)`, async () => {
      const H = harness(kind);
      for (const nick of ["", "   ", "아홉글자짜리별명이다", "010-1234-5678", "1234567", "www.x", "http", "a@b", "x.com", "y.kr", "<b>", "a\u0007b", "a‮b", "씨 발", "광고문의", "FUCK"]) {
        const r = await H.call("create", { nick, icon: "i01", main: "sage", sub: "sage" });
        assert.equal(r.status, 400, nick);
        assert.ok(["nick", "bad_request"].includes(r.json.error));
      }
      assert.equal((await H.call("create", { nick: "  여덟글자별명입니  ", icon: "i24", main: "ruler", sub: "creator" })).status, 200);
      assert.equal(H.dump().maps[0].nick, "여덟글자별명입니"); // 앞뒤 공백 제거
      assert.equal((await H.call("create", { nick: "123456", icon: "i01", main: "sage", sub: "sage" })).status, 200); // 숫자 6개는 통과
    });

    await t.test(`[${kind.name}] 404 동일성: 없음·틀린 키·지운 기록·만료·틀린 모양이 같은 응답`, async () => {
      const H = harness(kind);
      const c = await H.create();
      const j = (await H.join(c.invite)).json;
      await H.call("erase", { del: j.del, act: "leave" });
      const bodies = [];
      bodies.push(await H.call("view", { key: "SOM-0000-0000-0000-0000-0000-00" }));
      bodies.push(await H.call("view", { key: "엉터리" }));
      bodies.push(await H.call("peek", { invite: "A".repeat(22) }));
      bodies.push(await H.call("peek", { invite: "short" }));
      bodies.push(await H.join("B".repeat(22)));
      bodies.push(await H.call("erase", { del: j.del, act: "leave" })); // 이미 지운 기록
      bodies.push(await H.call("erase", { del: "SOD-1111", act: "leave" }));
      bodies.push(await H.call("erase", { key: "SOM-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZ", act: "map" }));
      H.days(91);
      bodies.push(await H.call("view", { key: c.key })); // 만료
      for (const b of bodies) {
        assert.equal(b.status, 404);
        assert.equal(b.raw, NF);
        assert.deepEqual(b.headers, bodies[0].headers);
      }
    });

    await t.test(`[${kind.name}] 409 닫힘·30명, 한 명 지우면 자리, peek는 닫힘·찼음도 404`, async () => {
      const H = harness(kind);
      const c = await H.create();
      const dels = [];
      for (let i = 0; i < 30; i++) {
        if (i % 10 === 0) H.clock.t += 3600000; // 시간당 10회를 피해 창을 옮김
        const r = await H.join(c.invite, { nick: "친구" + i });
        assert.equal(r.status, 200, "join " + i);
        dels.push(r.json.del);
      }
      H.clock.t += 3600000;
      const full = await H.join(c.invite);
      assert.equal(full.status, 409);
      assert.deepEqual(full.json, { error: "full" });
      assert.equal((await H.call("peek", { invite: c.invite })).raw, NF);
      assert.equal((await H.call("erase", { del: dels[3], act: "leave" })).status, 200);
      assert.equal((await H.join(c.invite)).status, 200);
      assert.equal(H.dump().friends.length, 30);
      assert.equal((await H.call("erase", { key: c.key, act: "close" })).status, 200);
      await H.call("erase", { del: dels[4], act: "leave" });
      const closed = await H.join(c.invite);
      assert.equal(closed.status, 409);
      assert.deepEqual(closed.json, { error: "closed" });
      assert.equal((await H.call("peek", { invite: c.invite })).raw, NF);
    });

    await t.test(`[${kind.name}] 지도당 한 시간 10회 → 11번째 429 + Retry-After, 다음 시간 창에서 다시`, async () => {
      const H = harness(kind);
      H.clock.t = T0 + 30 * 60000; // 03:30
      const c = await H.create();
      for (let i = 0; i < 10; i++) assert.equal((await H.join(c.invite)).status, 200);
      const r = await H.join(c.invite);
      assert.equal(r.status, 429);
      assert.deepEqual(r.json, { error: "rate" });
      assert.equal(r.headers["Retry-After"], "1800");
      assert.equal(H.dump().friends.length, 10);
      H.clock.t += 1800 * 1000;
      assert.equal((await H.join(c.invite)).status, 200);
    });

    await t.test(`[${kind.name}] 하루 상한 503, 삭제는 상한에 걸려도 받고 erases를 올림(권장 4)`, async () => {
      const H = harness(kind, null, { creates: 2, joins: 2, erases: 2 });
      const a = await H.create();
      const b = await H.create();
      assert.deepEqual((await H.call("create", { nick: "셋", icon: "i01", main: "sage", sub: "sage" })).json, { error: "quota" });
      const j1 = (await H.join(a.invite)).json;
      const j2 = (await H.join(a.invite)).json;
      assert.equal((await H.join(b.invite)).status, 503);
      assert.equal((await H.call("erase", { key: a.key, act: "close" })).status, 200);
      assert.equal((await H.call("erase", { key: a.key, act: "reinvite" })).status, 200);
      for (const act of ["close", "rekey", "reinvite"]) assert.equal((await H.call("erase", { key: a.key, act })).status, 503, act);
      assert.equal((await H.call("erase", { del: j1.del, act: "leave" })).status, 200);
      assert.equal((await H.call("erase", { key: a.key, act: "friend", rid: (await H.call("view", { key: a.key })).json.friends[0].rid })).status, 200);
      assert.equal((await H.call("erase", { key: b.key, act: "map" })).status, 200);
      assert.deepEqual(H.dump().quota, [{ day: "2026-10-17", creates: 2, joins: 2, erases: 5 }]);
      assert.ok(j2.del);
      H.days(1);
      assert.equal((await H.call("erase", { key: a.key, act: "close" })).status, 200); // 날이 바뀌면 다시
    });

    await t.test(`[${kind.name}] CORS: 다른 출처·Origin 없음 403, OPTIONS 사전 요청, 허용 출처만 ACAO`, async () => {
      const H = harness(kind);
      for (const origin of ["https://evil.example", "", ORIGIN + "/", "http://oracle.example"]) {
        const r = await H.call("create", { nick: "별", icon: "i01", main: "sage", sub: "sage" }, { origin });
        assert.equal(r.status, 403);
        assert.equal(r.headers["Access-Control-Allow-Origin"], undefined);
      }
      assert.equal(H.dump().maps.length, 0);
      const o = await H.core.handle({ method: "OPTIONS", path: "/create", origin: ORIGIN, body: "" });
      assert.equal(o.status, 204);
      assert.equal(o.headers["Access-Control-Allow-Origin"], ORIGIN);
      assert.equal(o.headers["Access-Control-Allow-Methods"], "POST");
      assert.equal(o.headers["Access-Control-Allow-Headers"], "Content-Type");
      assert.equal(o.headers["Access-Control-Allow-Credentials"], undefined);
      const ok = await H.call("create", { nick: "별", icon: "i01", main: "sage", sub: "sage" });
      assert.equal(ok.headers["Access-Control-Allow-Origin"], ORIGIN);
      assert.equal((await H.call("create", {}, { method: "GET" })).status, 400);
      assert.equal((await H.call("list", {})).status, 404);
    });

    await t.test(`[${kind.name}] MAP_MODE·ALLOWED_ORIGIN 빈 값 503, 본문 1KB 넘으면 413`, async () => {
      for (const env of [{ MAP_MODE: "off" }, { MAP_MODE: "" }, { ALLOWED_ORIGIN: "" }, { MAP_MODE: "test" }]) {
        const H = harness(kind, env);
        const r = await H.call("create", { nick: "별", icon: "i01", main: "sage", sub: "sage" });
        assert.equal(r.status, 503, JSON.stringify(env));
        assert.deepEqual(r.json, { error: "off" });
      }
      const H = harness(kind);
      const big = await H.call("create", JSON.stringify({ nick: "별", icon: "i01", main: "sage", sub: "x".repeat(1100) }));
      assert.equal(big.status, 413);
      const flagged = await H.core.handle({ method: "POST", path: "/create", origin: ORIGIN, body: "", tooBig: true });
      assert.equal(flagged.status, 413);
      assert.equal(H.dump().maps.length, 0);
    });

    await t.test(`[${kind.name}] 만료: 주인 활동 +91일 / 친구 join·peek·leave가 기간을 늘리지 않음`, async () => {
      // 1) 주인이 열지 않고 친구만 참여 → 91일째 지도·친구 기록 함께 사라짐
      let H = harness(kind);
      const c = await H.create();
      H.days(60);
      const j = (await H.join(c.invite)).json;
      H.days(20);
      await H.call("peek", { invite: c.invite });
      assert.equal(H.dump().maps[0].active, "2026-10-17"); // 친구 동작은 active를 바꾸지 않음
      H.days(10); // +90일: 아직
      assert.equal((await H.call("peek", { invite: c.invite })).status, 200);
      H.days(1); // +91일
      assert.equal((await H.call("erase", { del: j.del, act: "leave" })).raw, NF);
      assert.deepEqual(H.dump().maps, []);
      assert.deepEqual(H.dump().friends, []);
      // 2) 주인 view는 기간을 늘린다(+90일에 열면 다시 90일)
      H = harness(kind);
      const d = await H.create();
      H.days(90);
      assert.equal((await H.call("view", { key: d.key })).status, 200);
      H.days(90);
      assert.equal((await H.call("view", { key: d.key })).status, 200);
    });

    await t.test(`[${kind.name}] 만료: 주인이 자주 열어도 만든 날 +365일은 살아 있고 +366일에 지워짐`, async () => {
      const H = harness(kind);
      const d = await H.create();
      await H.join(d.invite);
      for (let i = 0; i < 5; i++) {
        H.days(73);
        assert.equal((await H.call("view", { key: d.key })).status, 200); // +365일
      }
      H.days(1); // +366일
      assert.equal((await H.call("view", { key: d.key })).raw, NF);
      assert.deepEqual(H.dump().maps, []);
      assert.deepEqual(H.dump().friends, []);
    });

    await t.test(`[${kind.name}] 정리: create 때 만료 지도 최대 20개, Cron은 전부 + 7일 지난 quota 줄`, async () => {
      const H = harness(kind);
      for (let i = 0; i < 25; i++) await H.create({ nick: "주인" + i });
      const keep = await H.create({ nick: "남음" });
      H.days(50);
      await H.call("view", { key: keep.key });
      H.days(41); // 25개는 +91일, keep은 활동 +41일
      await H.create({ nick: "새" });
      assert.equal(H.dump().maps.length, 25 - 20 + 2);
      await H.core.cleanup();
      assert.deepEqual(H.dump().maps.map((m) => m.nick).sort(), ["남음", "새"]);
      assert.deepEqual(H.dump().quota.map((q) => q.day), ["2027-01-16"]); // 7일 지난 2026-10-17 줄은 지워짐
    });

    await t.test(`[${kind.name}] 키 바꾸기·초대 바꾸기 뒤 옛 값 404, act=open 400, 남의 지도 rid 404`, async () => {
      const H = harness(kind);
      const a = await H.create();
      const b = await H.create({ nick: "다른" });
      const fb = (await H.join(b.invite)).json;
      const rk = await H.call("erase", { key: a.key, act: "rekey" });
      assert.match(rk.json.key, /^SOM-/);
      assert.equal((await H.call("view", { key: a.key })).raw, NF);
      assert.equal((await H.call("view", { key: rk.json.key })).status, 200);
      await H.call("erase", { key: rk.json.key, act: "close" });
      const ri = await H.call("erase", { key: rk.json.key, act: "reinvite" });
      assert.match(ri.json.invite, /^[A-Za-z0-9_-]{22}$/);
      assert.equal((await H.call("peek", { invite: a.invite })).raw, NF);
      assert.equal((await H.join(a.invite)).raw, NF);
      assert.equal((await H.join(ri.json.invite)).status, 200); // 새 ID는 열린 상태
      for (const bad of [{ key: rk.json.key, act: "open" }, { key: rk.json.key, act: "leave" }, { key: rk.json.key, act: "friend" }, { key: rk.json.key, act: "map", rid: fb.rid }, { del: fb.del, act: "map" }, { key: rk.json.key, del: fb.del, act: "leave" }]) {
        assert.equal((await H.call("erase", bad)).status, 400, JSON.stringify(bad));
      }
      const other = await H.call("erase", { key: rk.json.key, act: "friend", rid: fb.rid });
      assert.equal(other.raw, NF);
      assert.equal(H.dump().friends.filter((f) => f.rid === fb.rid).length, 1);
    });

    await t.test(`[${kind.name}] 삭제 즉시 반영(합격 11): 친구 leave·주인 friend·지도 map`, async () => {
      const H = harness(kind);
      const c = await H.create();
      const f1 = (await H.join(c.invite)).json;
      const f2 = (await H.join(c.invite)).json;
      await H.call("erase", { del: f1.del, act: "leave" });
      assert.deepEqual(H.dump().friends.map((f) => f.rid), [f2.rid]);
      await H.call("erase", { key: c.key, act: "friend", rid: f2.rid });
      assert.deepEqual(H.dump().friends, []);
      await H.call("erase", { key: c.key, act: "map" });
      assert.deepEqual(H.dump().maps, []);
    });

    await t.test(`[${kind.name}] 키 표준형: 하이픈·공백·소문자·O/I/L이 같은 해시`, async () => {
      const H = harness(kind);
      const c = await H.create();
      const raw = c.key.slice(4).replace(/-/g, "");
      const variants = [c.key, c.key.toLowerCase(), "  " + raw + " ", "som " + raw.replace(/0/g, "o").replace(/1/g, "l"), "SOM" + raw.replace(/1/g, "I"), raw.match(/.{1,2}/g).join(" ")];
      for (const k of variants) assert.equal((await H.call("view", { key: k })).status, 200, k);
      assert.equal(Core.canon("SOM-ABCD-EFGH-JKMN-PQRS-TVWX-YZ", "SOM"), null); // 22자 → 아님
      const good = "0123456789ABCDEFGHJKMNPQRS";
      assert.equal(Core.canon("som-" + good.toLowerCase().replace(/0/g, "o"), "SOM"), good);
      assert.equal(Core.canon("SOD-" + good, "SOM"), null); // 다른 접두사는 떼지 않음 → 29자 → 아님
      assert.equal(Core.canon(good.replace("S", "U"), "SOM"), null); // U는 Crockford에 없음
      // 시험 표본(map.js도 같은 값을 기대해야 한다): SHA-256("SOM" + good)
      assert.equal(await Core.hashOf("SOM", good), require("crypto").createHash("sha256").update("SOM" + good).digest("hex"));
    });

    await t.test(`[${kind.name}] 저장 칸(합격 12): 표 세 개의 칸이 기획서 표와 같고 키·코드 원문이 없음`, async () => {
      const H = harness(kind);
      const c = await H.create();
      const j = (await H.join(c.invite)).json;
      const rk = (await H.call("erase", { key: c.key, act: "rekey" })).json;
      const d = H.dump();
      assert.deepEqual(Object.keys(d.maps[0]), MAP_COLS);
      assert.deepEqual(Object.keys(d.friends[0]), FRIEND_COLS);
      assert.deepEqual(Object.keys(d.quota[0]), QUOTA_COLS);
      const text = JSON.stringify(d);
      for (const secret of [c.key, rk.key, j.del]) {
        const canon = secret.slice(4).replace(/-/g, "");
        assert.ok(!text.includes(canon), "원문 저장됨");
        assert.ok(!text.includes(secret));
      }
      assert.match(d.maps[0].key_hash, /^[0-9a-f]{64}$/);
      assert.match(d.friends[0].del_hash, /^[0-9a-f]{64}$/);
      assert.equal(d.maps[0].key_hash, await Core.hashOf("SOM", rk.key.slice(4).replace(/-/g, "")));
      assert.ok(!/1995|테스트|홍길동/.test(text));
    });

    await t.test(`[${kind.name}] 저장소 오류는 503 {"error":"db"}, 오류 내용을 내보내지 않음`, async () => {
      const H = harness(kind);
      const c = await H.create();
      if (H.store._db) H.store._db.exec("DROP TABLE friends");
      else H.store.fail = true;
      const r = await H.call("view", { key: c.key });
      assert.equal(r.status, 503);
      assert.equal(r.raw, JSON.stringify({ error: "db" }));
    });
  }
});

test("schema.sql: 표·칸이 기획서 16-5의 2와 같다 (node:sqlite)", { skip: !sqlite && "node:sqlite 없음" }, () => {
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec(SCHEMA);
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name);
  assert.deepEqual(cols("maps"), MAP_COLS);
  assert.deepEqual(cols("friends"), FRIEND_COLS);
  assert.deepEqual(cols("quota"), QUOTA_COLS);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r) => r.name);
  assert.deepEqual(tables, ["friends", "maps", "quota"]);
  const idx = db.prepare("SELECT tbl_name, sql FROM sqlite_master WHERE type='index'").all();
  for (const [t, c] of [["maps", "invite"], ["maps", "key_hash"], ["friends", "del_hash"], ["friends", "map_id"]]) {
    assert.ok(idx.some((i) => i.tbl_name === t && (i.sql === null || i.sql.includes(c))), `${t}.${c} 색인`);
  }
});

test("worker.js D1 질의: 모두 상수 SQL + bind (값 이어 붙이기 0)", async () => {
  const src = fs.readFileSync(path.join(FM, "worker.js"), "utf8");
  // prepare에는 SQL 상수만 넘긴다
  const calls = [...src.matchAll(/\.prepare\(([^)]*)\)/g)].map((m) => m[1].trim());
  assert.deepEqual([...new Set(calls)], ["sql"]);
  assert.ok(!/prepare\([^)]*[`+]/.test(src));
  if (sqlite) {
    const W = await import(pathToFileURL(path.join(FM, "worker.js")).href);
    const db = new sqlite.DatabaseSync(":memory:");
    db.exec(SCHEMA);
    for (const [name, sql] of Object.entries(W.SQL)) {
      assert.ok(!/\$\{|'[^']*\d{4}-|"[^"]*\d/.test(sql), name);
      assert.doesNotThrow(() => db.prepare(sql), name); // 모든 질의가 schema.sql 위에서 준비된다
    }
  }
});

test("worker.js fetch: Request → core → Response (D1 흉내, Origin·본문 크기)", { skip: !sqlite && "node:sqlite 없음" }, async () => {
  const W = await import(pathToFileURL(path.join(FM, "worker.js")).href);
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec(SCHEMA);
  const env = { DB: d1Shim(db), MAP_MODE: "live", ALLOWED_ORIGIN: ORIGIN };
  const req = (p, body, h = {}) => new Request("https://map.example" + p, { method: "POST", headers: Object.assign({ "Content-Type": "application/json", Origin: ORIGIN }, h), body });
  const r = await W.default.fetch(req("/create", JSON.stringify({ nick: "별", icon: "i03", main: "rebel", sub: "sage" })), env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("access-control-allow-origin"), ORIGIN);
  const c = await r.json();
  assert.equal((await W.default.fetch(req("/view", JSON.stringify({ key: c.key })), env)).status, 200);
  assert.equal((await W.default.fetch(req("/view", JSON.stringify({ key: c.key }), { Origin: "https://evil.example" }), env)).status, 403);
  assert.equal((await W.default.fetch(new Request("https://map.example/view", { method: "POST", body: "{}" }), env)).status, 403);
  assert.equal((await W.default.fetch(req("/create", "x".repeat(2000)), env)).status, 413);
  const pre = await W.default.fetch(new Request("https://map.example/join", { method: "OPTIONS", headers: { Origin: ORIGIN } }), env);
  assert.equal(pre.status, 204);
  // scheduled: 만료 정리
  db.prepare("UPDATE maps SET active = '2020-01-01'").run();
  let p;
  await W.default.scheduled({}, env, { waitUntil: (x) => (p = x) });
  await p;
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM maps").get().n, 0);
});

test("모의 지도 서버: 스위치·저장소 보기·data.js 응답 바꾸기", async () => {
  const http = require("http");
  const M = createMapMock({ port: 0, mode: "test" });
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (!M.route(req, res, url.pathname, url, () => {})) res.writeHead(404).end();
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  M.env.ALLOWED_ORIGIN = `http://127.0.0.1:${port}`;
  const base = `http://127.0.0.1:${port}`;
  const post = (op, body, origin = base) => fetch(base + "/__dev/map/" + op, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
  try {
    const c = await (await post("create", { nick: "별", icon: "i01", main: "sage", sub: "sage" })).json();
    assert.ok(c.key);
    assert.equal((await post("view", { key: c.key }, "")).status, 403);
    let s = await (await fetch(base + "/__dev/map-store")).json();
    assert.deepEqual(Object.keys(s), ["maps", "friends", "quota"]);
    assert.equal(s.maps.length, 1);
    let sw = await (await fetch(base + "/__dev/map-switch?down=1")).json();
    assert.equal(sw.down, true);
    assert.equal((await post("view", { key: c.key })).status, 503);
    await fetch(base + "/__dev/map-switch?down=0&clock=+91d");
    assert.equal((await post("view", { key: c.key })).status, 404);
    s = await (await fetch(base + "/__dev/map-store")).json();
    assert.equal(s.maps.length, 0);
    sw = await (await fetch(base + "/__dev/map-switch?clock=0&cap=1&limits=reset")).json();
    assert.equal(sw.cap, "1");
    assert.equal((await post("create", { nick: "별", icon: "i01", main: "sage", sub: "sage" })).status, 200);
    assert.equal((await post("create", { nick: "별", icon: "i01", main: "sage", sub: "sage" })).status, 503);
    await fetch(base + "/__dev/map-switch?cap=default&limits=reset&slow=300");
    const t0 = Date.now();
    assert.equal((await post("create", { nick: "별", icon: "i01", main: "sage", sub: "sage" })).status, 200);
    assert.ok(Date.now() - t0 >= 280);
    await fetch(base + "/__dev/map-switch?slow=0");
    s = await (await fetch(base + "/__dev/map-store?clear=1")).json();
    assert.deepEqual(s, { maps: [], friends: [], quota: [] });
  } finally {
    srv.close();
  }
  const js = 'const DATA = { map: { mode: "off", api: "", maxFriends: 30, down: "x" }, other: { mode: "off" } };';
  assert.equal(M.transformDataJs(js), 'const DATA = { map: { mode: "test", api: "/__dev/map", maxFriends: 30, down: "x" }, other: { mode: "off" } };');
  assert.equal(createMapMock({ port: 1, mode: "off" }).transformDataJs(js), js);
  assert.equal(createMapMock({ port: 1, mode: "off" }).env.MAP_MODE, "off");
});

test("16-9의 15·16: 외부 패키지·실제 주소·계정 값 0, 결제와 서로 참조 0, console 0", () => {
  const files = fs.readdirSync(FM);
  assert.deepEqual(files.sort(), ["core.js", "schema.sql", "words.js", "worker.js", "wrangler.toml"]);
  for (const f of files) {
    const src = fs.readFileSync(path.join(FM, f), "utf8");
    if (/\.js$/.test(f)) {
      for (const m of src.matchAll(/(?:require\(|import\s[^"']*from\s|import\s)["']([^"']+)["']/g)) assert.ok(m[1].startsWith("./"), `${f}: ${m[1]}`);
      assert.ok(!/console\./.test(src), `${f}: console`);
      assert.ok(!/\b(pay|book|Blobs|blobs|SOP|SOG|paycode|netlify)\b/.test(src.replace(/\/\/.*$/gm, "")), `${f}: 결제 참조`);
    }
    assert.ok(!/workers\.dev/.test(src), `${f}: workers.dev`);
  }
  const toml = fs.readFileSync(path.join(FM, "wrangler.toml"), "utf8");
  assert.match(toml, /^database_id = ""/m);
  assert.match(toml, /^ALLOWED_ORIGIN = ""/m);
  assert.match(toml, /^MAP_MODE = "off"/m);
  assert.ok(!/account_id\s*=/.test(toml));
  assert.match(toml, /\[observability\]\s*\nenabled = false/);
  assert.ok(!fs.existsSync(path.join(FM, ".wrangler")) && !fs.existsSync(path.join(ROOT, ".wrangler")));
  assert.ok(!fs.existsSync(path.join(ROOT, "node_modules", "wrangler")));
  assert.ok(!/wrangler/.test(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")));
  for (const f of fs.readdirSync(path.join(ROOT, "netlify", "functions"))) {
    const src = fs.readFileSync(path.join(ROOT, "netlify", "functions", f), "utf8");
    assert.ok(!/friend-map|key_hash|del_hash|MAP_MODE|__dev\/map/.test(src), `netlify/functions/${f}: 지도 참조`);
  }
});
