// 낯선 점술관 — 충전한(유료) 별가루 장부 (2026-11-13, CLAUDE.md 3·7장 재화 예외: 유료 별가루는 카카오 계정에만).
// 저장(결제 기록과 같은 Netlify Blobs 저장소 "strange-oracle-pay"):
//   dust/<uh>       { bal, free, oday, log: [{ k: "buy"|"use"|"refund"|"earn", n, at }](최근 30개), at }   uh = 카카오 회원번호의 HMAC(auth.js와 같은 값)
//                   bal = 충전한 별가루(환불 대상), free = 로그인한 채 받은 무료 별가루(오늘의 신탁, 하루 한 번 oday), 쓸 때는 free부터
//                   (2026-11-14 운영자 결정) 별가루 1개 = 100원, 모든 결제는 별가루로: 면담 5 · 책 49 · 신년운세 49
//   dustpass/<ph>   { uh, n, state: "credited"|"refunded", at }   결제 코드 하나를 한 번만 충전하게 하는 표지(ph = 코드 해시)
//   잔액·거래 종류·양·시각만 둔다. 회원번호 원문·이름·생년월일·질문 글은 두지 않는다.
// 쓰는 곳: auth.js(POST /api/auth/dust — 잔액 보기·결제 코드로 충전), talk.js(면담 한 번 = 10 차감), pay.js(결제 취소 통보 → 충전분 회수)
// 마지막 활동 뒤 1년이면 함수 auth-sweep이 dust/를 지운다(auth.js KEEP_MS). "저장한 기록 지우기"(erase)도 함께 지운다.
"use strict";

const PACKS = Object.freeze({ dust50: 50, dust120: 120, dust300: 300, d30: 30, d50: 50, d100: 110, d300: 350 }); // 상품 → 별가루 양(덤 포함) (pay.js PRODUCTS와 같은 이름). dust50·120·300은 옛 묶음
const COSTS = Object.freeze({ book: 49, ny: 49 }); // 별가루로 여는 유료 콘텐츠
// (2026-11-14 운영자 결정) 별가루는 카카오 로그인한 계정에만 준다: 첫 로그인 10(한 번) · 출석 = 오늘의 신탁 5(하루 한 번) · 도감 일곱 장 금빛 봉인 30(한 번)
const EARN = Object.freeze({ first: 10, oracle: 5, seal: 30 });
const ONCE = new Set(["first", "seal"]);
const USE = Object.freeze({ extra: 3, story: 10 }); // 계정 별가루로 쓰는 하루 페이지 항목(다른 안내자의 오늘의 신탁 · 도감 숨은 이야기)
const ROOMS = Object.freeze(["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"]); // (2026-11-14) 방 완주·숨은 이야기는 계정에 기록(도감은 서버 기록으로)
const kstDay = (now) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
const LOG_MAX = 30;
const iso = (now) => new Date(now).toISOString();
const K = (uh) => "dust/" + uh;

async function read(store, uh) {
  const r = await store.get(K(uh));
  if (!r || !Number.isInteger(r.bal) || r.bal < 0) return { bal: 0, free: 0, oday: "", once: [], rooms: [], stories: [], log: [], at: null };
  return { bal: r.bal, free: Number.isInteger(r.free) && r.free >= 0 ? r.free : 0, oday: typeof r.oday === "string" ? r.oday : "", once: Array.isArray(r.once) ? r.once.filter((x) => ONCE.has(x)) : [], rooms: Array.isArray(r.rooms) ? r.rooms.filter((x) => ROOMS.includes(x)) : [], stories: Array.isArray(r.stories) ? r.stories.filter((x) => ROOMS.includes(x)) : [], log: Array.isArray(r.log) ? r.log : [], at: r.at };
}
async function write(store, uh, rec, entry, now) {
  const log = [entry].concat(rec.log).slice(0, LOG_MAX);
  await store.set(K(uh), { bal: rec.bal, free: rec.free, oday: rec.oday, once: rec.once, rooms: rec.rooms, stories: rec.stories, log, at: iso(now) });
}
// 쓸 수 있는 전체(무료 + 충전)
const balanceOf = async (store, uh) => { const r = await read(store, uh); return r.bal + r.free; };
const view = (r) => ({ bal: r.bal + r.free, paid: r.bal, free: r.free, today: r.oday, once: r.once.slice(), rooms: r.rooms.slice(), stories: r.stories.slice() });

// 결제 코드 p(이미 paid 확인된 것)로 충전. prod = pay.js 상품 이름. 같은 코드는 한 번만(다른 계정도 못 씀) → { ok, bal, already? }
async function credit(store, uh, ph, prod, now) {
  const n = PACKS[prod];
  if (!n) return { ok: false };
  const mark = "dustpass/" + ph;
  const w = await store.set(mark, { uh, n, state: "credited", at: iso(now) }, { onlyIfNew: true });
  if (w && w.modified === false) {
    const m = await store.get(mark);
    return Object.assign({ ok: Boolean(m && m.uh === uh), already: true }, view(await read(store, uh)));
  }
  const rec = await read(store, uh);
  rec.bal += n;
  await write(store, uh, rec, { k: "buy", n, at: iso(now) }, now);
  return Object.assign({ ok: true }, view(rec));
}

// 면담·책 등 차감(무료 몫 먼저). 모자라면 false (잔액은 그대로) · 성공하면 남은 전체
async function spend(store, uh, n, now) {
  const rec = await read(store, uh);
  if (!(n > 0) || rec.bal + rec.free < n) return false;
  const f = Math.min(rec.free, n);
  rec.free -= f;
  rec.bal -= n - f;
  await write(store, uh, rec, { k: "use", n, at: iso(now) }, now);
  return rec.bal + rec.free;
}

// 방 하나를 처음 끝까지 지남 → 계정에 기록(도감 카드). 별가루는 없음
async function room(store, uh, name, now) {
  if (!ROOMS.includes(name)) return null;
  const rec = await read(store, uh);
  if (!rec.rooms.includes(name)) {
    rec.rooms.push(name);
    await write(store, uh, rec, { k: "room", n: 0, at: iso(now) }, now);
  }
  return view(rec);
}
// (2026-11-14) 예전에 방을 연 기록(카카오에 저장한 방 결과)을 도감 카드로 옮겨 적기 — 없는 방만 더한다. 별가루는 없음
async function addRooms(store, uh, names, now) {
  const rec = await read(store, uh);
  const add = [...new Set(names)].filter((x) => ROOMS.includes(x) && !rec.rooms.includes(x));
  if (add.length) {
    rec.rooms.push(...add);
    await write(store, uh, rec, { k: "room", n: 0, at: iso(now) }, now);
  }
  return rec;
}
// 숨은 이야기 펼치기: 카드가 있는 방만, 한 번 10(이미 펼쳤으면 무료) → view | false(모자람) | null(카드 없음)
async function story(store, uh, name, now) {
  if (!ROOMS.includes(name)) return null;
  const rec = await read(store, uh);
  if (!rec.rooms.includes(name)) return null;
  if (rec.stories.includes(name)) return view(rec);
  const n = USE.story;
  if (rec.bal + rec.free < n) return false;
  const f = Math.min(rec.free, n);
  rec.free -= f;
  rec.bal -= n - f;
  rec.stories.push(name);
  await write(store, uh, rec, { k: "use", n, at: iso(now) }, now);
  return view(rec);
}

// 로그인한 채 받는 무료 별가루(first·seal은 계정에 한 번, oracle은 한국 날짜로 하루 한 번) → { added, ...view }
async function earn(store, uh, kind, now) {
  const n = EARN[kind];
  if (!n) return null;
  const rec = await read(store, uh), day = kstDay(now);
  if (kind === "oracle") {
    if (rec.oday === day) return Object.assign({ added: 0 }, view(rec));
    rec.oday = day;
  } else {
    if (rec.once.includes(kind)) return Object.assign({ added: 0 }, view(rec));
    if (kind === "seal" && rec.rooms.length < ROOMS.length) return null; // 금빛 봉인: 계정에 일곱 방 완주가 기록돼 있어야
    rec.once.push(kind);
  }
  rec.free += n;
  await write(store, uh, rec, { k: "earn", n, at: iso(now) }, now);
  return Object.assign({ added: n }, view(rec));
}

// 결제 취소(환불) 통보 → 그 코드로 충전한 양을 되돌린다(남은 잔액까지만). 충전 전이면 아무것도 없음
async function refund(store, ph, now) {
  const mark = "dustpass/" + ph;
  const m = await store.get(mark);
  if (!m || m.state !== "credited") return false;
  await store.set(mark, Object.assign({}, m, { state: "refunded", at: iso(now) }));
  const rec = await read(store, m.uh);
  const back = Math.min(m.n, rec.bal);
  rec.bal -= back;
  await write(store, m.uh, rec, { k: "refund", n: back, at: iso(now) }, now);
  return true;
}

const erase = (store, uh) => store.del(K(uh));

module.exports = { ROOMS, room, addRooms, story, USE, PACKS, COSTS, EARN, read, view, balanceOf, credit, spend, earn, refund, erase, LOG_MAX, kstDay };
