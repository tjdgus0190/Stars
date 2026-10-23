// 낯선 점술관 — 함수 auth-sweep (Netlify 예약 함수, 23단계 결정 135). 하루 한 번 지난 로그인 표·세션과 마지막 활동 뒤 1년 지난 카카오 기록을 지운다.
// 로직은 netlify/lib/auth.js sweep(). 주소 없음(예약 실행만).
import { getStore } from "@netlify/blobs";
import Auth from "../lib/auth.js";
import Pay from "../lib/pay.js";

export default async () => {
  const st = getStore({ name: Pay.STORE_NAME, consistency: "strong" });
  const store = Pay.storeFrom(() => st);
  const list = async (prefix) => (await st.list({ prefix })).blobs.map((b) => b.key);
  const n = await Auth.sweep(store, list);
  console.log(`auth-sweep: ${n}건 지움`);
};

export const config = { schedule: "@daily" };
