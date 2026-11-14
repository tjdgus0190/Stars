// 광고 10안 「일곱 안내자」 조립 (2026-11-14). 21초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다(렌더 도구가 currentTime으로 프레임을 고름). 무작위 값 없음.
// 돋보일 기능(운영자 2026-11-14): ① 전 세계의 점술로 알아보는 나 ② AI 챗봇으로 심층 면담 ③ 매일 찾아오는 오늘의 신탁
// 그림: 운영자가 준 일곱 안내자 초상 · 별가루 결정. 문구는 제품(data-dex.js·data-guide.js) 결. 8장: 정확도 과장·불안 재촉·건강·돈·이별 예언·가격 없음.
(function () {
  const IMG = (r) => `/products/strange-oracle/img/guide/${r}.webp`;
  const DEX = (r) => `/products/strange-oracle/img/dex/dex-${r}.webp`;
  const DUST = "/products/strange-oracle/img/stardust.webp";
  const G = [
    { r: "saju", h: 18, og: "KOREA · SAJU", nm: "한국의 사주 · 만신", ln: "태어난 여덟 글자로 읽는 나의 그릇" },
    { r: "ogham", h: 150, og: "IRELAND · OGHAM", nm: "켈트의 오검 · 오검", ln: "이름에 깃든 나무의 문자" },
    { r: "star", h: 295, og: "INDIA · JYOTISH", nm: "인도의 베다 점성술 · 베다", ln: "태어난 밤, 달이 머문 집" },
    { r: "decan", h: 65, og: "EGYPT · DECANS", nm: "이집트의 데칸 · 데칸", ln: "생일을 지키는 별의 시간" },
    { r: "tzolkin", h: 190, og: "MAYA · TZOLK'IN", nm: "마야의 촐킨 · 촐킨", ln: "260일 달력 속 나의 날" },
    { r: "rune", h: 230, og: "NORSE · RUNES", nm: "북유럽의 룬 · 룬", ln: "세 개의 돌이 들려주는 흐름" },
    { r: "sibyl", h: 35, og: "ROME · SIBYL", nm: "로마의 시빌라 신탁 · 시빌라", ln: "고른 질문에 내리는 한 줄" },
  ];
  const T = { f1: 2.75, s0: 2.95, gap: 0.66, f1out: 7.7, f2: 7.7, f2out: 13.35, f3: 13.65, f3out: 18.3, end: 18.55, dur: 21 };
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const add = (el, to = stage) => (to === stage ? stage.insertBefore(el, stage.querySelector(".safe-guide")) : to.append(el), el);
  const box = (el, x, y, w, h) => { Object.assign(el.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" }); return el; };
  const arch = (r, x, y, w, h) => { const a = box($("div", "arch10"), x, y, w, h); const p = $("div", "pt"); p.style.setProperty("--img", `url("${IMG(r)}")`); a.append(p); return a; };
  const bg = (r, t0, t1, o = 0.32) => { const b = $("div", "bg10"); b.style.setProperty("--img", `url("${DEX(r)}")`); b.style.setProperty("--o", o); anim(b, [`bgin10 0.5s ease-out ${t0}s both`, `fo10 0.4s ease-in ${t1}s forwards`]); stage.querySelector(".sky10").after(b); return b; }; // 배경은 하늘 바로 위(초상·글자 아래)

  // ── 0~2.75 첫 장면: 일곱 안내자가 부채꼴로 모인다 + "오늘 밤, 당신을 읽어 줄 일곱 명의 안내자"
  const hook = add($("div", "day10"));
  const FAN = [[0, 0], [1, -1], [1, 1], [2, -2], [2, 2], [3, -3], [3, 3]]; // [순서, 위치 k]
  const SZ = [[270, 360, 600], [205, 275, 650], [175, 234, 700], [150, 200, 745]]; // |k|별 [폭, 높이, 위]
  const XC = [540, 175, 325, 455];
  const ORDER = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
  FAN.slice().reverse().forEach(([n, k], j) => {
    const i = FAN.length - 1 - j, a = Math.abs(k), [w, h, top] = SZ[a];
    const cx = 540 + Math.sign(k) * (a ? XC[a] : 0);
    const el = arch(ORDER[i], cx - w / 2, top, w, h);
    el.style.zIndex = 10 - a;
    el.style.rotate = k * 5 + "deg";
    if (i === 0) el.style.opacity = 1; // 첫 프레임부터 만신이 보이게(피드 첫 장면)
    else anim(el, [`pop10 0.45s var(--soft) ${0.15 + n * 0.2}s both`]);
    hook.append(el);
  });
  const cap = $("p", "cap10", "오늘 밤, 당신을 읽어 줄<br><em>일곱 명의 안내자</em>");
  cap.dataset.cap = "H1";
  cap.style.top = "300px";
  hook.append(anim(cap, [`in10 0.55s var(--soft) 0.2s both`]));
  const sub = $("p", "cap10", "");
  sub.style.cssText = "top:1060px;font:700 42px/1.4 var(--font-serif);color:oklch(0.86 0.06 85)";
  sub.innerHTML = "사주부터 시빌라 신탁까지,<br>일곱 나라의 점술";
  sub.dataset.cap = "H2";
  hook.append(anim(sub, [`in10 0.5s var(--soft) 0.95s both`]));
  anim(hook, [`fo10 0.3s ease-in ${T.f1 - 0.3}s forwards`]);

  // ── 2.75~7.7 ① 전 세계의 점술로 알아보는 나: 큰 아치에 안내자가 차례로 · 아래 나라·점술·읽는 것
  const chip = (no, html, t0, t1) => { const c = $("div", "chip10", `<span class="no">${no}</span><p class="t" style="margin:0">${html}</p>`); c.dataset.cap = "F" + no; return add(anim(c, [`in10 0.5s var(--soft) ${t0}s both`, `out10 0.3s ease-in ${t1}s forwards`])); };
  chip("01", "전 세계의 점술로<br>알아보는 <em>나</em>", T.f1 + 0.05, T.f1out);
  const big = add(arch("saju", 330, 520, 420, 470));
  big.querySelector(".pt").remove();
  anim(big, [`pop10 0.5s var(--soft) ${T.f1 + 0.15}s both`, `fo10 0.3s ease-in ${T.f1out}s forwards`]);
  const dots = add($("div", "dots10"));
  anim(dots, [`fi10 0.3s ease-out ${T.f1 + 0.3}s both`, `fo10 0.3s ease-in ${T.f1out}s forwards`]);
  G.forEach((g, i) => {
    const t = T.s0 + i * T.gap, t1 = i < 6 ? t + T.gap : T.f1out;
    bg(g.r, t - 0.1, t1);
    const p = $("div", "pt");
    p.style.setProperty("--img", `url("${IMG(g.r)}")`);
    anim(p, [`fi10 0.22s ease-out ${t}s both`, `kb10 ${T.gap + 0.4}s linear ${t}s both`].concat(i < 6 ? [`fo10 0.22s ease-in ${t1}s forwards`] : []));
    big.insertBefore(p, null);
    const who = $("div", "who10", `<p class="og">${g.og}</p><p class="nm">${g.nm}</p><p class="ln">${g.ln}</p>`);
    who.style.setProperty("--h", g.h);
    who.dataset.cap = "W" + i;
    add(anim(who, [`in10 0.28s var(--soft) ${t}s both`, `fo10 0.18s ease-in ${t1 - 0.12}s forwards`]));
    const d = $("i"), b = $("b");
    d.style.setProperty("--h", g.h);
    anim(b, [`fi10 0.2s ease-out ${t}s both`]);
    d.append(b);
    dots.append(d);
  });

  // ── 7.95~13.35 ② AI 챗봇으로 심층 면담: 만신과의 대화(질문 → 답을 고르는 점 → 짧은 말풍선 셋 → 역질문)
  chip("02", "AI 안내자와<br>1:1 <em>심층 면담</em>", T.f2 + 0.05, T.f2out);
  bg("saju", T.f2, T.f2out, 0.28);
  const chat = add($("div", "chat10", `<div class="chat10__head"><span class="chat10__face"></span><span><b>만신</b><small>면담 중 · 만신의 방</small></span></div><div class="chat10__body"></div>`));
  anim(chat, [`pop10 0.5s var(--soft) ${T.f2 + 0.2}s both`, `fo10 0.3s ease-in ${T.f2out}s forwards`]);
  const body = chat.querySelector(".chat10__body");
  const me = $("p", "msg10 me", "짝사랑 중인데,<br>먼저 연락해도 될까요?");
  body.append(anim(me, [`pop10 0.35s var(--soft) ${T.f2 + 0.7}s both`]));
  const SAY = [
    "자네는 곧게 뻗는 큰 나무여.",
    "올겨울은 기다리기보다 먼저 건넬 때 흐름이 열리기 쉬운 결이지.",
    "이번 주엔 가벼운 안부 한 줄부터 보내 보게.",
    "그 사람과 가장 편했던 순간은 언제였나?",
  ];
  const TS = [9.85, 10.55, 11.25, 12.05];
  SAY.forEach((s, i) => {
    const row = $("div", "", "");
    row.style.cssText = "position:relative;display:flex;align-items:flex-end;gap:16px";
    const face = $("span", "face10");
    face.style.cssText = "position:relative;left:auto;flex-shrink:0" + (i ? ";visibility:hidden" : "");
    if (!i) anim(face, [`fi10 0.3s ease-out ${T.f2 + 1.2}s both`]);
    const m = $("p", "msg10 g" + (i === 3 ? " q" : ""), s);
    m.style.margin = "0";
    anim(m, [`pop10 0.35s var(--soft) ${TS[i]}s both`]);
    row.append(face, m);
    if (!i) { // 답을 고르는 점(첫 말풍선 자리)
      const ty = $("span", "typing10", "<i></i><i></i><i></i>");
      ty.style.cssText = "left:74px;bottom:0";
      anim(ty, [`fi10 0.25s ease-out ${T.f2 + 1.2}s both`, `fo10 0.15s ease-in ${TS[0] - 0.1}s forwards`]);
      row.append(ty);
    }
    body.append(row);
  });
  anim(body, [`up10 0.4s var(--soft) ${TS[2] - 0.05}s both`, `up10b 0.4s var(--soft) ${TS[3] - 0.05}s forwards`]); // 말풍선이 쌓이면 대화가 위로 밀린다
  const ai = $("p", "ai10", "내 결과를 아는 안내자가, 답하고 되물어요");
  ai.dataset.cap = "A1";
  add(anim(ai, [`fi10 0.4s ease-out ${T.f2 + 0.9}s both`, `fo10 0.3s ease-in ${T.f2out}s forwards`]));

  // ── 13.65~18.3 ③ 매일 찾아오는 오늘의 신탁: 오늘의 안내자 · 두루마리 한 줄 · 출석 별가루 · 내일은 또 다른 안내자
  chip("03", "매일 찾아오는<br><em>오늘의 신탁</em>", T.f3 + 0.05, T.f3out);
  bg("sibyl", T.f3, 16.6, 0.3);
  const DAYS = [{ r: "sibyl", d: "11월 14일", n: "시빌라", t: T.f3 + 0.2 }, { r: "ogham", d: "11월 15일", n: "오검", t: 16.75 }, { r: "star", d: "11월 16일", n: "베다", t: 17.45 }];
  const ta = add(arch("sibyl", 397, 500, 286, 380));
  ta.querySelector(".pt").remove();
  anim(ta, [`pop10 0.5s var(--soft) ${T.f3 + 0.2}s both`, `fo10 0.3s ease-in ${T.f3out}s forwards`]);
  DAYS.forEach((d, i) => {
    const t1 = i < 2 ? DAYS[i + 1].t : T.f3out;
    const p = $("div", "pt");
    p.style.setProperty("--img", `url("${IMG(d.r)}")`);
    anim(p, [`fi10 0.25s ease-out ${d.t}s both`].concat(i < 2 ? [`fo10 0.25s ease-in ${t1}s forwards`] : []));
    ta.append(p);
    const c = $("div", "today10__chip", `<span>오늘의 안내자 · ${d.d}</span>`);
    add(anim(c, [`fi10 0.25s ease-out ${d.t + (i ? 0 : 0.35)}s both`, `fo10 0.2s ease-in ${t1}s forwards`]));
    const n = $("p", "today10__nm", d.n);
    add(anim(n, [`in10 0.3s var(--soft) ${d.t + (i ? 0.05 : 0.45)}s both`, `fo10 0.2s ease-in ${t1}s forwards`]));
    if (i) bg(d.r, d.t, t1, 0.26);
  });
  const scroll = $("p", "scroll10", "다들 피하던 그 말을,<br>당신이 가장 먼저 꺼내요.");
  scroll.dataset.cap = "O1";
  add(anim(scroll, [`unroll10 0.6s var(--soft) 14.55s both`, `fo10 0.3s ease-in 16.55s forwards`]));
  const toast = $("div", "toast10", `<span><img src="${DUST}" alt="">별가루 +5 · 오늘의 출석</span>`);
  toast.style.top = "820px";
  add(anim(toast, [`pop10 0.4s var(--soft) 15.45s both`, `fo10 0.3s ease-in 16.55s forwards`]));
  const next = $("p", "next10", "날마다 다른 안내자가<br>오늘의 한 줄을 건네요");
  next.dataset.cap = "O2";
  add(anim(next, [`in10 0.4s var(--soft) 16.85s both`, `fo10 0.3s ease-in ${T.f3out}s forwards`]));

  // ── 별가루 결정이 장면마다 조금씩 떠오른다(고정 위치·시각)
  [[90, 1180, 70, 0.4, 0.7], [930, 420, 54, 1.0, 0.6], [180, 560, 46, 3.6, 0.55], [905, 1150, 64, 5.2, 0.6], [110, 1290, 58, 8.6, 0.5], [960, 380, 48, 10.4, 0.55],
   [150, 700, 60, 14.8, 0.7], [890, 640, 76, 15.5, 0.8], [940, 980, 50, 16.2, 0.6], [120, 420, 56, 18.9, 0.7], [930, 520, 66, 19.3, 0.75], [520, 1330, 44, 19.8, 0.5]]
    .forEach(([x, y, s, t, o]) => { const d = box($("span", "dust10"), x - s / 2, y, s, s); d.style.setProperty("--s", s + "px"); d.style.setProperty("--o", o); add(anim(d, [`float10 2.6s ease-in-out ${t}s both`])); });

  // ── 18.55~21 끝 화면: 로고 · 일곱 안내자 · 세 가지 · 행동 문구
  const end = $("div", "end10");
  end.append($("p", "eb", "STRANGE ORACLE"));
  const logo = $("p", "logo", "낯선 점술관");
  end.append(anim(logo, [`shimmer10 1.6s ease-in-out ${T.end + 0.8}s both`]));
  const row = $("div", "row");
  ORDER.forEach((r, i) => { const a = arch(r, 0, 0, 98, 130); a.style.position = "relative"; a.style.left = a.style.top = ""; row.append(anim(a, [`pop10 0.35s var(--soft) ${T.end + 0.35 + i * 0.07}s both`])); });
  end.append(row);
  const ul = $("ul");
  ["전 세계 일곱 점술로 알아보는 나", "AI 안내자와 1:1 심층 면담", "매일 찾아오는 오늘의 신탁"].forEach((s, i) => {
    const li = $("li", "", `<img src="${DUST}" alt=""><span>${s}</span>`);
    li.dataset.cap = "E" + i;
    ul.append(anim(li, [`in10 0.4s var(--soft) ${T.end + 0.95 + i * 0.22}s both`]));
  });
  end.append(ul);
  const cta = $("p", "cta", "<span>오늘 밤, 첫 문을 열어 보세요</span>");
  cta.dataset.cap = "C1";
  end.append(anim(cta, [`pop10 0.45s var(--soft) ${T.end + 1.75}s both`]));
  end.append(anim($("p", "url", "strange-oracle.com"), [`fi10 0.4s ease-out ${T.end + 2.0}s both`]));
  add(anim(end, [`fi10 0.4s ease-out ${T.end}s both`]));
})();
