// 낯선 점술관 — 충전한(유료) 별가루 장부 (2026-11-13, CLAUDE.md 3·7장 재화 예외: 유료 별가루는 카카오 계정에만).
// 저장(결제 기록과 같은 Netlify Blobs 저장소 "strange-oracle-pay"):
//   dust/<uh>       { bal, log: [{ k: "buy"|"use"|"refund", n, at }](최근 30개), at }   uh = 카카오 회원번호의 HMAC(auth.js와 같은 값)
//   dustpass/<ph>   { uh, n, state: "credited"|"refunded", at }   결제 코드 하나를 한 번만 충전하게 하는 표지(ph = 코드 해시)
//   잔액·거래 종류·양·시각만 둔다. 회원번호 원문·이름·생년월일·질문 글은 두지 않는다.
// 쓰는 곳: auth.js(POST /api/auth/dust — 잔액 보기·결제 코드로 충전), talk.js(면담 한 번 = 10 차감), pay.js(결제 취소 통보 → 충전분 회수)
// 마지막 활동 뒤 1년이면 함수 auth-sweep이 dust/를 지운다(auth.js KEEP_MS). "저장한 기록 지우기"(erase)도 함께 지운다.
"use strict";

const PACKS = Object.freeze({ dust50: 50, dust120: 120, dust300: 300 }); // 상품 → 별가루 양 (pay.js PRODUCTS와 같은 이름)
const LOG_MAX = 30;
const iso = (now) => new Date(now).toISOString();
const K = (uh) => "dust/" + uh;

async function read(store, uh) {
  const r = await store.get(K(uh));
  return r && Number.isInteger(r.bal) && r.bal >= 0 ? { bal: r.bal, log: Array.isArray(r.log) ? r.log : [], at: r.at } : { bal: 0, log: [], at: null };
}
async function write(store, uh, rec, entry, now) {
  const log = [entry].concat(rec.log).slice(0, LOG_MAX);
  await store.set(K(uh), { bal: rec.bal, log, at: iso(now) });
}
const balanceOf = async (store, uh) => (await read(store, uh)).bal;

// 결제 코드 p(이미 paid 확인된 것)로 충전. prod = pay.js 상품 이름. 같은 코드는 한 번만(다른 계정도 못 씀) → { ok, bal, already? }
async function credit(store, uh, ph, prod, now) {
  const n = PACKS[prod];
  if (!n) return { ok: false };
  const mark = "dustpass/" + ph;
  const w = await store.set(mark, { uh, n, state: "credited", at: iso(now) }, { onlyIfNew: true });
  if (w && w.modified === false) {
    const m = await store.get(mark);
    return { ok: Boolean(m && m.uh === uh), already: true, bal: await balanceOf(store, uh) };
  }
  const rec = await read(store, uh);
  rec.bal += n;
  await write(store, uh, rec, { k: "buy", n, at: iso(now) }, now);
  return { ok: true, bal: rec.bal };
}

// 면담 한 번 등 차감. 모자라면 false (잔액은 그대로)
async function spend(store, uh, n, now) {
  const rec = await read(store, uh);
  if (rec.bal < n) return false;
  rec.bal -= n;
  await write(store, uh, rec, { k: "use", n, at: iso(now) }, now);
  return rec.bal;
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

module.exports = { PACKS, read, balanceOf, credit, spend, refund, erase, LOG_MAX };
