// 광고 11~13안 「기능 하나씩」 조립 (2026-11-15). 12초. ?f=saju | today | talk. 움직임은 CSS 애니메이션 시작 시각으로만(렌더 도구가 currentTime으로 프레임을 고름). 무작위 값 없음.
// 첫 장면 0~2.9 · 기능 2.9~9.3 · 끝 화면 9.4~12. 그림은 운영자가 준 안내자 초상·별가루 결정(10안과 같음).
(function () {
  const F = (new URLSearchParams(location.search).get("f") || "saju").replace(/[^a-z]/g, "");
  const IMG = (r) => `/products/strange-oracle/img/guide/${r}.webp`;
  const DEX = (r) => `/products/strange-oracle/img/dex/dex-${r}.webp`;
  const DUST = "/products/strange-oracle/img/stardust.webp";
  const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
  const CONF = {
    saju: { face: "saju", bg: "saju", hook: "생일만 넣으면,<br><em>만신이 그릇을 읽어요</em>", sub: "한국의 사주 · 첫 번째 문",
      feat: "로그인 없이 <em>결과까지 무료</em>", cta: "첫 번째 문 열기" },
    today: { face: "sibyl", bg: "sibyl", hook: "오늘 하루,<br><em>안내자가 한 줄을 건네요</em>", sub: "날마다 바뀌는 일곱 안내자",
      feat: "로그인 없이 <em>오늘의 한 줄</em>", cta: "오늘의 신탁 받기" },
    talk: { face: "saju", bg: "saju", hook: "나를 아는 안내자에게<br><em>직접 물어보세요</em>", sub: "AI 안내자와 1:1 심층상담",
      feat: "AI 안내자와 <em>1:1 심층상담</em>", cta: "안내자에게 물어보기" },
  }[F] || null;
  if (!CONF) return;
  const T = { body: 2.9, out: 9.25, end: 9.4 };
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const add = (el) => stage.insertBefore(el, stage.querySelector(".safe-guide"));
  const box = (el, x, y, w, h) => { Object.assign(el.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" }); return el; };
  const arch = (r, x, y, w, h) => { const a = box($("div", "arch10"), x, y, w, h); const p = $("div", "pt"); p.style.setProperty("--img", `url("${IMG(r)}")`); a.append(p); return a; };
  const bg = (r, t0, t1, o = 0.3) => { const b = $("div", "bg10"); b.style.setProperty("--img", `url("${DEX(r)}")`); b.style.setProperty("--o", o); anim(b, [`bgin10 0.5s ease-out ${t0}s both`, `fo10 0.4s ease-in ${t1}s forwards`]); stage.querySelector(".sky10").after(b); return b; };

  // ── 0~2.9 첫 장면: 안내자 초상 + 약속 한 줄(첫 프레임부터 보임)
  bg(CONF.bg, 0, T.body - 0.2, 0.26);
  const hook = add($("div", "day10"));
  const face = arch(CONF.face, 345, 610, 390, 520);
  face.style.opacity = 1;
  hook.append(anim(face, [`kb10 3s linear 0s both`]));
  const cap = $("p", "cap10", CONF.hook);
  cap.dataset.cap = "H1";
  cap.style.cssText = "top:300px;opacity:1";
  hook.append(cap);
  const sub = $("p", "cap10", CONF.sub);
  sub.style.cssText = "top:1170px;font:700 40px/1.3 var(--font-serif);color:oklch(0.86 0.06 85)";
  hook.append(anim(sub, [`in10 0.45s var(--soft) 0.5s both`]));
  anim(hook, [`fo10 0.3s ease-in ${T.body - 0.3}s forwards`]);

  // ── 2.9~9.3 기능
  if (F === "saju") {
    bg("saju", T.body, T.out, 0.28);
    const chip = $("div", "chip10", `<span class="no">KOREA · SAJU</span><p class="t" style="margin:0">만신의 방</p>`);
    chip.dataset.cap = "B1";
    add(anim(chip, [`in10 0.45s var(--soft) ${T.body}s both`, `out10 0.3s ease-in ${T.out}s forwards`]));
    // 입력 카드: 이름 · 생년월일 · 태어난 시각(몰라도 돼요) → 「여덟 글자 보기」
    const form = add($("div", "form11", `<div class="row"><span>이름</span><b>하늘</b></div><div class="row"><span>생년월일</span><b>○○○○년 ○월 ○일</b></div><div class="row"><span>태어난 시각</span><b>몰라도 괜찮아요</b></div><p class="go">여덟 글자 보기</p>`));
    anim(form, [`pop10 0.4s var(--soft) ${T.body + 0.15}s both`, `fo10 0.25s ease-in 4.85s forwards`]);
    [...form.querySelectorAll(".row")].forEach((r, i) => anim(r, [`fi10 0.25s ease-out ${T.body + 0.45 + i * 0.35}s both`]));
    anim(form.querySelector(".go"), [`pop10 0.3s var(--soft) 4.25s both`]);
    // 여덟 글자(시·일·월·년, 위 하늘 글자 · 아래 땅 글자). 일간(甲)이 빛난다 — 날짜를 보이지 않는 견본
    const W = ["辛", "甲", "己", "乙", "未", "申", "卯", "亥"];
    const won = add($("div", "won11"));
    W.forEach((c, i) => { const el = $("i", i === 1 ? "day" : "", c); won.append(anim(el, [`pop10 0.3s var(--soft) ${5.0 + i * 0.1}s both`])); });
    anim(won, [`fi10 0.2s ease-out 4.95s both`, `fo10 0.3s ease-in 6.55s forwards`]);
    // 결과 카드
    const res = add($("div", "res11", `<p class="eb">낯선 점술관 · 만신의 방</p><p class="hj">甲</p><p class="tt">곧게 선 큰 나무</p><p class="st">태어난 날의 하늘 글자</p>`));
    res.dataset.cap = "R1";
    anim(res, [`pop10 0.5s var(--soft) 6.7s both`, `fo10 0.3s ease-in ${T.out}s forwards`]);
    const pill = add($("div", "pill11", `<span>로그인 없이 · 결과까지 무료</span>`));
    anim(pill, [`in10 0.4s var(--soft) 7.4s both`, `fo10 0.3s ease-in ${T.out}s forwards`]);
  }
  if (F === "today") {
    bg("sibyl", T.body, 6.3, 0.28);
    const chip = $("div", "chip10", `<span class="no">TODAY</span><p class="t" style="margin:0">오늘의 신탁</p>`);
    chip.dataset.cap = "B1";
    add(anim(chip, [`in10 0.45s var(--soft) ${T.body}s both`, `out10 0.3s ease-in ${T.out}s forwards`]));
    const DAYS = [{ r: "sibyl", d: "11월 14일", n: "시빌라", t: T.body + 0.15 }, { r: "ogham", d: "11월 15일", n: "오검", t: 6.45 }, { r: "star", d: "11월 16일", n: "베다", t: 7.15 }];
    const ta = add(arch("sibyl", 397, 500, 286, 380));
    ta.querySelector(".pt").remove();
    anim(ta, [`pop10 0.5s var(--soft) ${T.body + 0.1}s both`, `fo10 0.3s ease-in ${T.out}s forwards`]);
    DAYS.forEach((d, i) => {
      const t1 = i < 2 ? DAYS[i + 1].t : T.out;
      const p = $("div", "pt");
      p.style.setProperty("--img", `url("${IMG(d.r)}")`);
      anim(p, [`fi10 0.25s ease-out ${d.t}s both`].concat(i < 2 ? [`fo10 0.25s ease-in ${t1}s forwards`] : []));
      ta.append(p);
      add(anim($("div", "today10__chip", `<span>오늘의 안내자 · ${d.d}</span>`), [`fi10 0.25s ease-out ${d.t + (i ? 0 : 0.3)}s both`, `fo10 0.2s ease-in ${t1}s forwards`]));
      add(anim($("p", "today10__nm", d.n), [`in10 0.3s var(--soft) ${d.t + (i ? 0.05 : 0.4)}s both`, `fo10 0.2s ease-in ${t1}s forwards`]));
      if (i) bg(d.r, d.t, t1, 0.24);
    });
    const scroll = $("p", "scroll10", "다들 피하던 그 말을,<br>당신이 가장 먼저 꺼내요.");
    scroll.dataset.cap = "O1";
    add(anim(scroll, [`unroll10 0.6s var(--soft) 4.0s both`, `fo10 0.3s ease-in 6.25s forwards`]));
    const toast = $("div", "toast10", `<span><img src="${DUST}" alt="">별가루 +5 · 오늘의 출석</span>`);
    toast.style.top = "820px";
    add(anim(toast, [`pop10 0.4s var(--soft) 5.1s both`, `fo10 0.3s ease-in 6.25s forwards`]));
    const next = $("p", "next10", "내일은 또 다른 안내자가<br>찾아와요");
    next.dataset.cap = "O2";
    next.style.top = "1060px";
    add(anim(next, [`in10 0.4s var(--soft) 6.6s both`, `fo10 0.3s ease-in ${T.out}s forwards`]));
    const pill = add($("div", "pill11", `<span>로그인 없이 · 한 줄 무료</span>`));
    pill.style.top = "1200px";
    anim(pill, [`in10 0.4s var(--soft) 7.6s both`, `fo10 0.3s ease-in ${T.out}s forwards`]);
  }
  if (F === "talk") {
    bg("saju", T.body, T.out, 0.26);
    const chip = $("div", "chip10", `<span class="no">AI CONSULT</span><p class="t" style="margin:0">심층상담</p>`);
    chip.dataset.cap = "B1";
    add(anim(chip, [`in10 0.45s var(--soft) ${T.body}s both`, `out10 0.3s ease-in ${T.out}s forwards`]));
    const chat = add($("div", "chat10", `<div class="chat10__head"><span class="chat10__face"></span><span><b>만신</b><small>상담 중 · 만신의 방</small></span></div><div class="chat10__body"></div>`));
    anim(chat, [`pop10 0.5s var(--soft) ${T.body + 0.1}s both`, `fo10 0.3s ease-in ${T.out}s forwards`]);
    const body = chat.querySelector(".chat10__body");
    body.append(anim($("p", "msg10 me", "짝사랑 중인데,<br>먼저 연락해도 될까요?"), [`pop10 0.35s var(--soft) 3.5s both`]));
    const SAY = ["자네는 곧게 뻗는 큰 나무여.", "올겨울은 기다리기보다 먼저 건넬 때 흐름이 열리기 쉬운 결이지.", "이번 주엔 가벼운 안부 한 줄부터 보내 보게.", "그 사람과 가장 편했던 순간은 언제였나?"];
    const TS = [4.75, 5.45, 6.15, 6.95];
    SAY.forEach((s, i) => {
      const row = $("div", "");
      row.style.cssText = "position:relative;display:flex;align-items:flex-end;gap:16px";
      const fc = $("span", "face10");
      fc.style.cssText = "position:relative;left:auto;flex-shrink:0" + (i ? ";visibility:hidden" : "");
      if (!i) anim(fc, [`fi10 0.3s ease-out 4.0s both`]);
      const m = $("p", "msg10 g" + (i === 3 ? " q" : ""), s);
      m.style.margin = "0";
      anim(m, [`pop10 0.35s var(--soft) ${TS[i]}s both`]);
      row.append(fc, m);
      if (!i) { const ty = $("span", "typing10", "<i></i><i></i><i></i>"); ty.style.cssText = "left:74px;bottom:0"; anim(ty, [`fi10 0.25s ease-out 4.0s both`, `fo10 0.15s ease-in ${TS[0] - 0.1}s forwards`]); row.append(ty); }
      body.append(row);
    });
    anim(body, [`up10 0.4s var(--soft) ${TS[2] - 0.05}s both`, `up10b 0.4s var(--soft) ${TS[3] - 0.05}s forwards`]);
    const ai = $("p", "ai10", "내 결과를 아는 안내자가, 답하고 되물어요");
    ai.dataset.cap = "A1";
    add(anim(ai, [`fi10 0.4s ease-out 3.8s both`, `fo10 0.3s ease-in ${T.out}s forwards`]));
  }

  // 별가루 결정 몇 알(고정 위치·시각)
  [[120, 1150, 60, 0.6, 0.6], [930, 460, 52, 2.0, 0.55], [150, 520, 50, 5.5, 0.55], [920, 1120, 62, 7.4, 0.6], [140, 420, 56, 9.7, 0.7], [930, 540, 64, 10.1, 0.75]]
    .forEach(([x, y, s, t, o]) => { const d = box($("span", "dust10"), x - s / 2, y, s, s); d.style.setProperty("--s", s + "px"); d.style.setProperty("--o", o); add(anim(d, [`float10 2.4s ease-in-out ${t}s both`])); });

  // ── 9.4~12 끝 화면: 로고 · 일곱 안내자 · 기능 한 줄 · 행동 문구 · 주소
  const end = $("div", "end10");
  end.append($("p", "eb", "STRANGE ORACLE"));
  end.append(anim($("p", "logo", "낯선 점술관"), [`shimmer10 1.4s ease-in-out ${T.end + 0.6}s both`]));
  const row = $("div", "row");
  ORDER.forEach((r, i) => { const a = arch(r, 0, 0, 98, 130); a.style.position = "relative"; a.style.left = a.style.top = ""; row.append(anim(a, [`pop10 0.3s var(--soft) ${T.end + 0.25 + i * 0.06}s both`])); });
  end.append(row);
  const feat = $("p", "feat", CONF.feat);
  feat.dataset.cap = "E1";
  end.append(anim(feat, [`in10 0.4s var(--soft) ${T.end + 0.8}s both`]));
  const cta = $("p", "cta", `<span>${CONF.cta}</span>`);
  cta.dataset.cap = "C1";
  cta.style.top = "990px";
  end.append(anim(cta, [`pop10 0.45s var(--soft) ${T.end + 1.15}s both`]));
  const url = $("p", "url", "strange-oracle.com");
  url.style.top = "1100px";
  end.append(anim(url, [`fi10 0.4s ease-out ${T.end + 1.35}s both`]));
  add(anim(end, [`fi10 0.35s ease-out ${T.end}s both`]));
})();
