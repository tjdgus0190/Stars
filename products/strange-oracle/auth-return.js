// 카카오 로그인 복귀(auth.html) — 2026-11-15 성능. 입구 app.js의 kakaoBoot(mode "login")와 같은 일을 하루 페이지용으로만 가볍게 한다.
// 저장: 로그인 표(무작위 32자 sid, 입력값 아님)를 localStorage "strange-oracle-login"에 30일. 한 번 쓰는 state는 sessionStorage에서 바로 지운다.
(function () {
  "use strict";
  const KAKAO_KEY = "strange-oracle-kakao", LOGIN_KEY = "strange-oracle-login", DAY30 = 30 * 24 * 60 * 60 * 1000;
  const BACK = { stardust: "/stardust/", talk: "/talk/", home: "/", today: "/today/", dex: "/dex/", me: "/me/" };
  const entrance = location.pathname.replace(/auth\.html$/, "");
  const forward = () => location.replace(entrance + location.hash); // 입구가 처리(책 연결·잊기·입구에서 시작한 로그인·오류)
  const m = /^#kakao-([0-9a-f]{32})-([0-9a-f]{32})$/.exec(location.hash);
  let saved = null;
  try { saved = JSON.parse(window.sessionStorage.getItem(KAKAO_KEY) || "null"); } catch (e) { saved = null; }
  if (!m || !saved || saved.mode !== "login" || !BACK[saved.from] || saved.s !== m[2]) return forward();
  const back = BACK[saved.from];
  try { window.sessionStorage.removeItem(KAKAO_KEY); } catch (e) { /* 무시 */ }
  history.replaceState(null, "", location.pathname); // 표·state를 주소에서 바로 지운다
  fetch("/api/auth/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: m[1], s: m[2], login: true }), cache: "no-store", credentials: "omit" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !/^[0-9a-f]{32}$/.test(String(j.sid || ""))) return location.replace(back + "#login-fail");
      try { window.localStorage.setItem(LOGIN_KEY, JSON.stringify({ sid: j.sid, exp: Date.now() + DAY30, consent: j.data ? true : null })); } catch (e) { /* 저장이 막힌 브라우저 */ }
      location.replace(back + "#login" + (saved.ch ? (j.channel > 0 ? "-ch" : "-ch0") : ""));
    })
    .catch(() => location.replace(back + "#login-fail"));
})();
