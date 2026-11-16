// 낯선 점술관 — 함수 push-daily (Netlify 예약 함수): 매일 아침 9시(한국) 「오늘의 안내자가 찾아왔어요」 빈 알림을 보낸다. 로직은 netlify/lib/push.js daily().
// 예약 함수는 운영 배포에서만 돈다(시험 배포에서는 /api/push/test로 시험). PUSH_MODE = "live"일 때만 보낸다.
import { getStore } from "@netlify/blobs";
import Push from "../lib/push.js";

export default async () => {
  const store = Push.storeFrom(() => getStore({ name: Push.STORE_NAME, consistency: "strong" }));
  const r = await Push.daily(process.env, store, globalThis.fetch);
  console.log("push-daily:", JSON.stringify(r));
};

export const config = { schedule: "0 0 * * *" }; // 00:00 UTC = 09:00 한국
