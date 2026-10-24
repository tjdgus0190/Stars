// 광고 부품 (운영 규칙 3장 구글 예외·7장 광고 규칙). 사용법: docs/common.md "ads.js"
// - 배너: 마크업에 이미 있는 [data-ad="자리 이름"] 칸만 채운다. 새 자리를 만들지 않는다. 한 번 부를 때(= 한 화면) 최대 2개.
// - 보상형: 구글 애드 매니저 GPT의 웹 보상형 형식. 버튼을 누른 뒤에만 gpt.js를 불러온다.
// - ID가 비었거나 모양이 틀리면 아무것도 불러오지 않는다. 주소에 ?가 있는 동안(결제 복귀 등)도 아무것도 하지 않는다.
// - 애드핏(net:"adfit")은 운영자 결정 41번 전에는 채우지 않는다(카카오 주소는 3장 예외에 없음) — 콘솔 경고만.
// - 이 부품은 사용자 입력값을 받지 않는다. 구글로 가는 것은 광고 단위 ID와 (구글 스크립트가 스스로 읽는) 페이지 주소뿐이다.
(function () {
  const ADSENSE_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
  const GPT_URL = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
  const MAX_PER_SCREEN = 2;
  const FORMAT = {
    adsenseClient: /^ca-pub-\d{10,20}$/,
    slotId: /^\d{6,20}$/,
    rewardedUnit: /^\/\d+(,\d+)?(\/[A-Za-z0-9_.\-]+)+$/,
  };
  const NETS = ["adsense", "adfit"];
  const str = (v) => (typeof v === "string" ? v.trim() : "");

  // 설정 점검 (build-dist·시험도 쓴다). 반환: { empty: [이름…], bad: [이름…] }
  function check(cfg) {
    cfg = cfg || {};
    const out = { empty: [], bad: [] };
    const one = (name, v, re) => (!str(v) ? out.empty.push(name) : !re.test(str(v)) && out.bad.push(name));
    one("ads.adsenseClient", cfg.adsenseClient, FORMAT.adsenseClient);
    one("ads.rewardedUnit", cfg.rewardedUnit, FORMAT.rewardedUnit);
    for (const [name, s] of Object.entries(cfg.slots || {})) {
      if (!s || !NETS.includes(s.net)) out.bad.push(`ads.slots.${name}.net`);
      else if (s.net === "adsense") one(`ads.slots.${name}.id`, s.id, FORMAT.slotId);
      else if (!str(s.id)) out.empty.push(`ads.slots.${name}.id`);
    }
    return out;
  }
  const rewardedConfigured = (cfg) => Boolean(cfg && FORMAT.rewardedUnit.test(str(cfg.rewardedUnit)));
  const bannerConfigured = (cfg) => Boolean(cfg && FORMAT.adsenseClient.test(str(cfg.adsenseClient)) && Object.values(cfg.slots || {}).some((s) => s && s.net === "adsense" && FORMAT.slotId.test(str(s.id))));
  const anyConfigured = (cfg) => rewardedConfigured(cfg) || bannerConfigured(cfg);

  let cfg = null; // init에 성공했을 때만 채워진다
  const queryFree = () => !window.location.search;
  const scripts = {};
  function loadScript(src) {
    if (scripts[src]) return scripts[src];
    scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("load"));
      document.head.appendChild(s);
    });
    return scripts[src];
  }

  // 시작: app이 주소의 query를 지운 뒤에 부른다. 반환 true = 켜짐
  function init(config) {
    if (!queryFree() || !anyConfigured(config)) return false;
    const c = check(config);
    if (c.bad.length) console.warn("[ads] 모양이 틀린 설정은 쓰지 않아요:", c.bad.join(", "));
    cfg = {
      adsenseClient: FORMAT.adsenseClient.test(str(config.adsenseClient)) ? str(config.adsenseClient) : "",
      rewardedUnit: rewardedConfigured(config) ? str(config.rewardedUnit) : "",
      slots: config.slots || {},
      label: str(config.label) || "광고",
      timeoutMs: Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : 8000,
    };
    return true;
  }

  // ── 배너 ──
  let adfitWarned = false;
  function collapse(el) {
    el.classList.remove("is-filled");
    el.textContent = "";
  }
  function fill(root) {
    root = root || document;
    if (!cfg || !cfg.adsenseClient || !queryFree()) return 0;
    let count = root.querySelectorAll(".ad-slot.is-filled, [data-ad].is-filled").length;
    let added = 0;
    for (const el of root.querySelectorAll("[data-ad]")) {
      if (count >= MAX_PER_SCREEN) break;
      if (el.getAttribute("data-ad-done")) continue;
      const s = cfg.slots[el.getAttribute("data-ad")];
      if (!s || !str(s.id)) continue;
      if (s.net === "adfit") {
        if (!adfitWarned) console.warn("[ads] 애드핏은 운영자 결정 41번 전에는 채우지 않아요");
        adfitWarned = true;
        continue;
      }
      if (s.net !== "adsense" || !FORMAT.slotId.test(str(s.id))) continue;
      el.setAttribute("data-ad-done", "1");
      const label = document.createElement("span");
      label.className = "ad-slot__label";
      label.textContent = cfg.label;
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.setAttribute("data-ad-client", cfg.adsenseClient);
      ins.setAttribute("data-ad-slot", str(s.id));
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      el.appendChild(label);
      el.appendChild(ins);
      el.classList.add("is-filled");
      count++;
      added++;
      // 채울 광고가 없으면(data-ad-status="unfilled") 높이 0으로 접는다
      if (typeof MutationObserver === "function") {
        const mo = new MutationObserver(() => {
          const st = ins.getAttribute("data-ad-status");
          if (st === "unfilled") collapse(el);
          if (st) mo.disconnect();
        });
        mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
      }
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        collapse(el);
      }
    }
    if (added) loadScript(`${ADSENSE_URL}?client=${encodeURIComponent(cfg.adsenseClient)}`).catch(() => root.querySelectorAll("[data-ad].is-filled").forEach(collapse));
    return added;
  }

  // ── 보상형 ── Promise<"granted" | "unavailable" | "closed">, 거절하지 않는다
  let current = null; // 지금 진행 중인 요청 하나 (겹치지 않게)
  let listening = false;
  function listen() {
    if (listening) return;
    listening = true;
    const pa = window.googletag.pubads();
    pa.addEventListener("rewardedSlotReady", (e) => {
      if (!current || e.slot !== current.slot) return;
      current.ready();
      e.makeRewardedVisible();
    });
    pa.addEventListener("rewardedSlotGranted", (e) => {
      if (current && e.slot === current.slot) current.finish("granted");
    });
    pa.addEventListener("rewardedSlotClosed", (e) => {
      if (current && e.slot === current.slot) current.finish("closed");
      try {
        window.googletag.destroySlots([e.slot]);
      } catch (err) {
        /* 무시 */
      }
    });
    pa.addEventListener("slotRenderEnded", (e) => {
      if (current && e.slot === current.slot && e.isEmpty) current.finish("unavailable");
    });
  }
  function rewarded(opts) {
    if (!cfg || !cfg.rewardedUnit || !queryFree()) return Promise.resolve("unavailable");
    // 이미 다른 방의 광고를 기다리는 중이면 이 요청은 열지 않는다(광고 한 편으로 두 방이 열리지 않게). 잠긴 채 다시 누를 수 있다
    if (current) return Promise.resolve("closed");
    let resolveFn;
    const req = { slot: null };
    req.promise = new Promise((r) => (resolveFn = r));
    let timer = setTimeout(() => req.finish("unavailable"), cfg.timeoutMs);
    req.ready = () => {
      clearTimeout(timer); // 광고가 떴으면 보는 동안은 시간 제한 없음
      timer = null;
    };
    req.finish = (result) => {
      if (current !== req) return;
      clearTimeout(timer);
      current = null;
      if (result !== "granted" && req.slot) {
        try {
          window.googletag.destroySlots([req.slot]);
        } catch (e) {
          /* 무시 */
        }
      }
      resolveFn(result);
    };
    current = req;
    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd = window.googletag.cmd || [];
    loadScript(GPT_URL).catch(() => req.finish("unavailable"));
    window.googletag.cmd.push(() => {
      if (current !== req) return;
      try {
        const g = window.googletag;
        const slot = g.defineOutOfPageSlot(cfg.rewardedUnit, g.enums.OutOfPageFormat.REWARDED);
        if (!slot) return req.finish("unavailable"); // 보상형을 지원하지 않는 페이지
        req.slot = slot;
        slot.addService(g.pubads());
        listen();
        g.enableServices();
        g.display(slot);
      } catch (e) {
        req.finish("unavailable");
      }
    });
    return req.promise;
  }

  window.Ads = { init, fill, rewarded, check, rewardedConfigured, bannerConfigured, anyConfigured, FORMAT };
})();
