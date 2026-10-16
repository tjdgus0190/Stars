// 15단계 시험용 메모리 저장소 — Netlify Blobs 대신 함수 pay·book의 핵심 handle()에 넘긴다(모의 서버·단위 시험 공용, 배포하지 않음).
// 모양: get(key) → 값|null (실패면 throw), set(key, value, { onlyIfNew }) → { modified }. Blobs의 setJSON·get(type json)과 같은 뜻.
//   failRead / failWrite : true 또는 (key) => bool. 읽기·쓰기 실패 주입(/__dev/pay-switch?store=…, 단위 시험)
//   conditional          : false면 onlyIfNew를 무시한다(조건부 쓰기가 없는 저장소 흉내 — 2차 검수 4단계 경쟁을 기획서 그대로 재현할 때)
//   before(op, key)      : 각 동작 직전에 부르는 async 고리(동시 도착 시험에서 단계별로 멈춤)
//   log                  : [op, key] 기록(값은 남기지 않음)
"use strict";
class MemStore {
  constructor(opts = {}) {
    this.map = new Map();
    this.failRead = false;
    this.failWrite = false;
    this.conditional = opts.conditional !== false;
    this.before = null;
    this.log = [];
  }
  _fail(flag, key) {
    return typeof flag === "function" ? Boolean(flag(key)) : Boolean(flag);
  }
  async get(key) {
    if (this.before) await this.before("get", key);
    this.log.push(["get", key]);
    if (this._fail(this.failRead, key)) throw new Error("store read");
    const v = this.map.get(key);
    return v === undefined ? null : JSON.parse(v);
  }
  async set(key, value, o = {}) {
    if (this.before) await this.before("set", key);
    this.log.push(["set", key]);
    if (this._fail(this.failWrite, key)) throw new Error("store write");
    if (this.conditional && o && o.onlyIfNew && this.map.has(key)) return { modified: false };
    this.map.set(key, JSON.stringify(value));
    return { modified: true };
  }
  dump() {
    return Object.fromEntries([...this.map].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, JSON.parse(v)]));
  }
  clear() {
    this.map.clear();
    this.log = [];
  }
}
module.exports = { MemStore };
