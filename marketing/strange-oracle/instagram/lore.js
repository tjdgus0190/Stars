// 「문 너머의 기록」 그림 이야기 캐러셀 (2026-11-01). lore.html?ep=<방>&p=<쪽>.
// 쪽 구성(7쪽): 표지(질문 한 줄) → 장면 넷(그림 칸 + 안내자 말풍선) → 기록과 이야기(사실·전설 구분) → 끝(프로필로).
// 안내자는 브랜드 가이드의 말투 그대로(design/strange-oracle-brand.md), 주인은 끝 쪽의 봉인으로만. 정확도 과장·"무료"·건강/죽음 0.
// 사실 문장은 기록 쪽(facts.rec)에만, 해석·전설은 이야기 쪽(facts.story)에. 새 방을 더할 때는 EP에 한 편을 더한다.
(() => {
  const W = window;
  const NUM = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];

  // ── 그림 (직접 그린 SVG). 칸 그림은 viewBox 0 0 940 640
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = (n, w, h, top = 0) => Array.from({ length: n }, () => `<circle class="star" cx="${(rnd() * w).toFixed(1)}" cy="${(top + rnd() * h).toFixed(1)}" r="${(0.8 + rnd() * 2.2).toFixed(1)}" opacity="${(0.35 + rnd() * 0.6).toFixed(2)}" />`).join("");
  // 초승달: 바깥 반원(왼쪽으로 불룩) + 더 큰 반지름의 안쪽 호로 되돌아와 가는 달 모양
  const crescent = (cx, cy, r) => `<path class="moon" d="M${cx} ${cy - r}A${r} ${r} 0 1 0 ${cx} ${cy + r}A${(r * 1.25).toFixed(1)} ${(r * 1.25).toFixed(1)} 0 0 1 ${cx} ${cy - r}Z" />`;
  const ring = (cx, cy, r, on, size = 11) => Array.from({ length: 27 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 27) * Math.PI * 2;
    return `<circle class="dot${i === on ? " on" : ""}" cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="${i === on ? size * 1.6 : size}" />`;
  }).join("");
  const at = (cx, cy, r, i) => { const a = -Math.PI / 2 + (i / 27) * Math.PI * 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };

  const ART = {
    // 표지: 달의 집 스물일곱 고리 + 가운데 초승달 (viewBox 0 0 560 560)
    cover: () => `${stars(40, 560, 560)}<circle class="gd" cx="280" cy="280" r="222" opacity="0.35" />${ring(280, 280, 222, 4, 12)}${crescent(270, 280, 92)}`,
    // 1: 별 아래 불 제단, 연기가 하늘로
    altar: () => `${stars(70, 940, 420)}${crescent(800, 110, 46)}
      <path class="gd" d="M150 170l60 30l55-18l48 36M560 90l40 40l70-10" opacity="0.6" />
      <rect x="0" y="560" width="940" height="80" fill="oklch(0.09 0.03 285)" /><path class="gd" d="M0 560H940" opacity="0.7" />
      <rect class="stone" x="340" y="490" width="260" height="70" rx="6" /><rect class="stone" x="380" y="446" width="180" height="48" rx="6" />
      <path class="fire" d="M470 290c40 50 70 80 60 120c-8 30-30 34-60 34s-52-4-60-34c-10-40 20-70 60-120Z" />
      <path class="fire2" d="M470 350c18 26 30 42 26 62c-4 16-14 20-26 20s-22-4-26-20c-4-20 8-36 26-62Z" />
      <path class="ln" d="M470 280c-30-40 30-60 0-100s30-60 10-100" stroke-dasharray="4 14" opacity="0.8" />`,
    // 2: 경전을 돕는 여섯 학문, 여섯째가 빛난다
    six: (L) => `${stars(40, 940, 640)}${L.map((t, i) => {
      const x = [190, 470, 750][i % 3], y = i < 3 ? 230 : 450, on = i === L.length - 1;
      return `<circle class="${on ? "dot on" : "dot"}" cx="${x}" cy="${y}" r="92" />${t.split("|").map((w, k, a) => `<text class="lbl${on ? " on" : ""}" x="${x}" y="${y + 10 + (k - (a.length - 1) / 2) * 38}">${w}</text>`).join("")}`;
    }).join("")}`,
    // 3: 하룻밤에 한 집씩, 스물일곱 밤에 한 바퀴
    ring: () => {
      const [mx, my] = at(470, 330, 236, 5);
      const [n1x, n1y] = at(470, 330, 286, 0), [n27x, n27y] = at(470, 330, 286, 26);
      return `${stars(50, 940, 640)}<circle class="gd" cx="470" cy="330" r="236" opacity="0.3" />${ring(470, 330, 236, -1, 12)}
        <path class="gd glow" d="M${at(470, 330, 236, 3).map((v) => v.toFixed(1)).join(" ")}A236 236 0 0 1 ${mx.toFixed(1)} ${my.toFixed(1)}" stroke-width="5" />
        ${crescent(mx - 6, my, 30)}
        <text class="num" x="${n1x.toFixed(1)}" y="${(n1y + 8).toFixed(1)}">1</text><text class="num" x="${n27x.toFixed(1)}" y="${(n27y + 8).toFixed(1)}">27</text>
        <text class="lbl" x="470" y="345">스물일곱 밤에</text><text class="lbl" x="470" y="385">한 바퀴</text>`;
    },
    // 4: 태어난 밤 달이 머문 집 + 결혼 날·궁합
    birth: () => {
      const [hx, hy] = at(330, 330, 200, 12);
      return `${stars(50, 940, 640)}${ring(330, 330, 200, 12, 10)}${crescent(hx + 34, hy - 10, 22)}
        <text class="lbl" x="330" y="320">당신이</text><text class="lbl" x="330" y="360">태어난 밤</text>
        <circle class="gd glow" cx="715" cy="300" r="64" /><circle class="gd glow" cx="790" cy="300" r="64" />
        <text class="lbl" x="752" y="430">결혼 날 · 궁합</text>`;
    },
  };

  // 주인의 봉인(제품 결제 칸과 같은 밀랍 + 문 문장)
  const SEAL = (() => {
    const pts = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = i % 2 ? 27.2 : 29.4; pts.push(`${(32 + r * Math.cos(a)).toFixed(1)} ${(32 + r * Math.sin(a)).toFixed(1)}`); }
    return `<svg class="seal" viewBox="0 0 64 64" aria-hidden="true"><path d="M${pts.join("L")}Z" fill="oklch(0.42 0.12 32)" stroke="oklch(0.32 0.1 30)" /><circle cx="32" cy="32" r="21" fill="none" stroke="oklch(0.82 0.1 82 / 0.75)" stroke-width="1.4" /><path d="M25 43V31a7 7 0 0 1 14 0v12ZM21.5 43h21M32 24v19" fill="none" stroke="oklch(0.9 0.09 85)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
  })();

  // ── 이야기 (한 편 = 한 방)
  const EP = {
    star: {
      n: 2, ep: 1, name: "베다의 방", guide: "베다", origin: "인도 · 베다 점성술",
      cover: { hook: "달에게도<br />집이 있다면?", sub: "베다 점성술은 어디서 왔을까" },
      scenes: [
        { cap: "아주 먼 옛날 · 인도", art: "altar", say: "하나, 둘, 셋… 아주 먼 옛날, 인도의 사제들은 밤하늘을 셌어요. 제사를 올릴 <b>날과 때</b>를 하늘에 묻기 위해서요." },
        { cap: "경전을 돕는 여섯 학문", art: "six", artArgs: ["소리", "운율", "문법", "낱말", "의례", "하늘의 때|조티샤"], say: "베다 경전을 돕는 학문이 여섯 있었어요. 소리, 운율, 문법, 낱말, 의례… 그리고 여섯째, 하늘의 때를 재는 <b>조티샤</b>." },
        { cap: "하룻밤에 한 집씩", art: "ring", say: "달은 밤마다 한 집씩 옮겨 가요. 스물일곱 밤이면 하늘을 한 바퀴. 그 한 칸 한 칸이 <b>나크샤트라</b>, 달의 집이에요." },
        { cap: "태어난 밤의 달", art: "birth", say: "그래서 저는 당신이 태어난 밤, 달이 <b>어느 집</b>에 머물렀는지부터 세어요. 인도에선 지금도 결혼 날과 궁합을 이 집으로 맞춰 보곤 해요." },
      ],
      facts: {
        rec: [
          "조티샤는 베다를 돕는 여섯 학문(베당가) 가운데 하나예요.",
          "가장 오래된 천문 문헌은 『베당가 조티샤』. 언제 쓰였는지는 학자마다 의견이 달라요.",
          "달의 집 목록은 베다 문헌에 이미 나와요. 스물일곱, 때로는 스물여덟 칸이에요.",
          "열두 별자리로 보는 점은 훗날 그리스 점성술과 만나며 더해졌다고 봐요.",
        ],
        story: [
          "베다는 움직이지 않는 별을 기준으로 재요. 그래서 서양 별자리와 거의 한 칸쯤 어긋나요.",
          "집마다의 성격 풀이는 전통에 이 점술관의 이야기를 더한 것이에요.",
        ],
      },
      cta: { ask: "당신이 태어난 밤,<br />달은 어느 집에?", sub: "생일과 태어난 시각으로 찾을 수 있어요", pill: "프로필 링크에서 세 번째 문 「베다의 방」", next: "다음 기록 · 시빌라의 예언서" },
    },
  };

  const q = new URLSearchParams(location.search);
  const key = q.get("ep") || "star";
  const E = EP[key];
  const total = 2 + E.scenes.length + 1;
  const p = Math.min(Math.max(0, +q.get("p") || 0), total - 1);
  W.__total = total;

  const page = document.getElementById("page");
  page.dataset.room = key;
  page.style.backgroundImage = `url(out/v2/bg/${p % 2 ? "void-b" : "void-a"}.png)`;
  const head = `<p class="brand">낯선 점술관</p><p class="page">${p + 1} / ${total}</p>`;
  const tag = `<p class="tag"><i>${NUM[E.n]}</i>${E.name}<em>문 너머의 기록 · ${E.ep}화</em></p>`;

  if (p === 0) {
    page.classList.add("lr-cover");
    page.innerHTML = `${head}<p class="eyebrow2">문 너머의 기록 · ${E.ep}화</p><svg class="art art-cover" viewBox="0 0 560 560">${ART.cover()}</svg>
      <div class="mid"><p class="tagline"><i>${NUM[E.n]}</i>${E.name} · ${E.origin}</p><p class="hook">${E.cover.hook}</p><p class="sub">${E.cover.sub}</p></div><p class="foot">넘겨서 이야기 보기 →</p>`;
  } else if (p <= E.scenes.length) {
    const S = E.scenes[p - 1];
    page.classList.add("lr-scene");
    page.innerHTML = `${head}${tag}<div class="panel"><p class="cap">${S.cap}</p><svg class="art" viewBox="0 0 940 640">${ART[S.art](S.artArgs)}</svg></div>
      <div class="talk"><div class="who"><svg viewBox="0 0 48 64"><use href="#guide-${key}" /></svg><span>안내자 ${E.guide}</span></div><p class="bubble">${S.say}</p></div>`;
  } else if (p === total - 2) {
    page.classList.add("lr-facts");
    page.innerHTML = `${head}${tag}<p class="ttl">기록과 이야기</p>
      <div class="box rec"><span>기록으로 전하는 것</span><ul>${E.facts.rec.map((t) => `<li>${t}</li>`).join("")}</ul></div>
      <div class="box story"><span>알아 두면 좋은 것 · 해석</span><ul>${E.facts.story.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
  } else {
    page.classList.add("lr-cta");
    page.innerHTML = `${head}<svg class="art art-cta" viewBox="0 0 560 560">${ART.cover()}</svg>
      <div class="mid"><p class="ask">${E.cta.ask}</p><p class="sub">${E.cta.sub}</p><p class="pill">${E.cta.pill}</p><p class="nx">${E.cta.next}</p></div>${SEAL}`;
  }

  // 안내자 실루엣은 제품 화면의 SVG를 그대로 가져다 쓴다(같은 그림)
  W.__ready = (async () => {
    if (page.querySelector("use")) {
      const html = await (await fetch("../../../products/strange-oracle/index.html")).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      doc.querySelectorAll('symbol[id^="guide-"]').forEach((s) => svg.appendChild(document.importNode(s, true)));
      document.getElementById("defs").appendChild(svg);
    }
    await document.fonts.ready;
    const last = page.querySelector(".bubble, .box.story, .mid");
    W.__overflow = last ? Math.round(last.getBoundingClientRect().bottom) - 1350 + 50 : 0;
  })();
})();
