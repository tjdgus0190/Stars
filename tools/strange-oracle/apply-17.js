// 17단계 문구 넣기 (spec 17-6). 사용법: tools/strange-oracle/copy-17/README.md
//   node tools/strange-oracle/apply-17.js <묶음 id>   copy-17/out/<묶음 id>.json → 유료 원본에 넣고 items.json status = written, 묶음 파일 지움
//   node tools/strange-oracle/apply-17.js --init      items.json 만들기(있으면 status·note 유지) + 빈 book-yeon.js + 방 원본에 빈 firstLine·heartLine 키
// 넣는 곳: 인연의 장 = api/_paid/book/book-yeon.js, firstLine·heartLine = api/_paid/book/book-<방>.js의 full[결과]. 원본의 다른 문장은 건드리지 않는다
//   (넣은 뒤 원본을 다시 읽어, 새 키 말고 바뀐 값이 하나라도 있으면 되돌리고 멈춘다).
"use strict";
const fs = require("fs");
const path = require("path");
const L = require("./copy-17/lib.js");

// 새 키를 뺀 원본 모양 (기존 문장 불변 확인용)
const stripNew = (r) => JSON.stringify(L.roomData(r), (k, v) => (k === "firstLine" || k === "heartLine" ? undefined : v));

function init() {
  if (!fs.existsSync(L.YEON_FILE)) L.writeYeon(L.emptyYeon());
  else {
    // 빠진 키만 빈칸으로 채운다(있는 문장은 그대로)
    const Y = L.yeonData(), E = L.emptyYeon();
    (function fillIn(a, b) {
      for (const k of Object.keys(b)) if (typeof b[k] === "object") fillIn((a[k] = a[k] || {}), b[k]); else if (!(k in a)) a[k] = "";
    })(Y, E);
    L.writeYeon(Y);
  }
  for (const r of L.ROOMS) {
    const before = stripNew(r);
    const d = L.roomData(r);
    const v = {};
    d.full.forEach((e) => (v[e.code] = { firstLine: e.firstLine || "", heartLine: e.heartLine || "" }));
    L.setRoomLines(r, v);
    if (stripNew(r) !== before) throw new Error(`${r}: 기존 문장이 바뀜 — 멈춤`);
  }
  const old = fs.existsSync(L.ITEMS) ? Object.fromEntries(L.loadItems().map((x) => [x.id, x])) : {};
  const items = L.buildItems().map((x) => (old[x.id] ? Object.assign(x, { status: old[x.id].status, note: old[x.id].note || x.note }) : x));
  L.saveItems(items);
  fs.mkdirSync(L.OUT, { recursive: true });
  console.log(`items.json ${items.length}항목 · 묶음 ${new Set(items.map((x) => x.batch)).size}개 · book-yeon.js·방 원본 키 준비 끝`);
}

function apply(batch) {
  const file = path.join(L.OUT, `${batch}.json`);
  if (!fs.existsSync(file)) throw new Error(`묶음 파일 없음: copy-17/out/${batch}.json`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const texts = raw.items || raw;
  const notes = raw.notes || {};
  const items = L.loadItems();
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  const bad = Object.keys(texts).filter((id) => !byId[id] || byId[id].batch !== batch);
  if (bad.length) throw new Error(`이 묶음(${batch})에 없는 id: ${bad.join(", ")}`);
  const okVal = (v) => typeof v === "string" || (Array.isArray(v) && v.every((s) => typeof s === "string"));
  const wrong = Object.keys(texts).filter((id) => !okVal(texts[id]));
  if (wrong.length) throw new Error(`문장은 문자열(또는 문자열 배열)이어야 함: ${wrong.join(", ")}`);
  const ids = Object.keys(texts);
  const rooms = {};
  let Y = null;
  for (const id of ids) {
    const it = byId[id];
    if (it.room) (rooms[it.room] = rooms[it.room] || {})[it.code] = Object.assign((rooms[it.room] || {})[it.code] || {}, { [it.kind]: texts[id] });
    else {
      Y = Y || L.yeonData();
      let o = Y;
      it.path.slice(0, -1).forEach((k) => (o = o[k]));
      if (!(it.path[it.path.length - 1] in o)) throw new Error(`book-yeon.js에 키 없음: ${it.path.join(".")} (--init 먼저)`);
      o[it.path[it.path.length - 1]] = texts[id];
    }
  }
  for (const [r, v] of Object.entries(rooms)) {
    const keep = fs.readFileSync(path.join(L.PAID, `book-${r}.js`), "utf8");
    const before = stripNew(r);
    L.setRoomLines(r, v);
    if (stripNew(r) !== before) {
      fs.writeFileSync(path.join(L.PAID, `book-${r}.js`), keep);
      throw new Error(`${r}: 기존 문장이 바뀌어 되돌림 — 멈춤`);
    }
  }
  if (Y) L.writeYeon(Y);
  // 다시 읽어 확인
  const cache = {};
  const miss = ids.filter((id) => JSON.stringify(L.valueOf(byId[id], cache)) !== JSON.stringify(texts[id]));
  if (miss.length) throw new Error(`넣은 값이 원본에서 다르게 읽힘: ${miss.join(", ")}`);
  for (const id of ids) {
    const it = byId[id];
    it.status = L.textOf(texts[id]).trim() ? "written" : "todo";
    if (notes[id] != null) it.note = String(notes[id]);
  }
  for (const [id, n] of Object.entries(notes)) if (byId[id] && !(id in texts)) byId[id].note = String(n); // note만 고치는 묶음도 받는다
  L.saveItems(items);
  fs.unlinkSync(file);
  console.log(`${batch}: ${ids.length}항목 넣음 → written. 묶음 파일 지움. 다음: node tools/strange-oracle/check-17.js`);
}

try {
  const a = process.argv[2];
  if (!a) throw new Error("사용법: node tools/strange-oracle/apply-17.js <묶음 id> | --init");
  if (a === "--init") init();
  else apply(a.replace(/\.json$/, ""));
} catch (e) {
  console.error("apply-17 멈춤:", e.message);
  process.exit(1);
}
