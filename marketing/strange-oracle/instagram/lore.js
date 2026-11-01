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
  // 달의 모습: 밝은 부분만 그린다(k 0 = 그믐, 1 = 보름). left = 왼쪽이 밝음(기우는 달). 그믐은 흐린 테두리만
  const phase = (cx, cy, r, k, left = false) => {
    const f = (v) => v.toFixed(1), base = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="oklch(0.17 0.03 285)" stroke="oklch(0.6 0.05 90 / 0.45)" stroke-width="2" />`;
    if (k <= 0.02) return base;
    if (k >= 0.98) return `${base}<circle class="moon" cx="${f(cx)}" cy="${f(cy)}" r="${r}" />`;
    const s1 = left ? 0 : 1, ex = (r * Math.abs(2 * k - 1)).toFixed(1), s2 = (k > 0.5) === !left ? 1 : 0;
    return `${base}<path class="moon" d="M${f(cx)} ${f(cy - r)}A${r} ${r} 0 0 ${s1} ${f(cx)} ${f(cy + r)}A${ex} ${r} 0 0 ${s2} ${f(cx)} ${f(cy - r)}Z" />`;
  };
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
    // 전설편: 달 둘레의 스물일곱 딸(빛 점)
    daughters: () => `${stars(40, 940, 640)}${Array.from({ length: 27 }, (_, i) => { const [x, y] = at(470, 340, 230, i); return `<circle class="dot on" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" />`; }).join("")}${crescent(470, 340, 84)}
      <text class="lbl" x="470" y="610">스물일곱 딸</text>`,
    // 전설편: 넷째 집(로히니)만 밝고 나머지는 캄캄
    favorite: () => {
      const [rx, ry] = at(470, 340, 230, 3);
      return `${stars(30, 940, 640)}${Array.from({ length: 27 }, (_, i) => { const [x, y] = at(470, 340, 230, i); return i === 3 ? "" : `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" opacity="0.35" />`; }).join("")}
        <circle class="dot on" cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="22" />${crescent(rx - 62, ry + 6, 34)}
        <text class="lbl" x="${(rx + 82).toFixed(1)}" y="${(ry + 10).toFixed(1)}">로히니</text>
        <text class="lbl" x="470" y="350">나머지 스물여섯 집은</text><text class="lbl" x="470" y="390">늘 캄캄</text>`;
    },
    // 전설편: 날마다 줄어드는 달(다섯 모습)
    curse: () => `${stars(40, 940, 640)}${[1, 0.78, 0.55, 0.32, 0.12].map((k, i) => phase(150 + i * 160, 320, 64, k, true)).join("")}
      <path class="gd" d="M120 450H820M800 436l20 14l-20 14" opacity="0.8" /><text class="lbl" x="470" y="510">날마다 조금씩</text>`,
    // 전설편: 보름은 줄고 보름은 차고 (둘레 여덟 모습)
    cycle: () => `${stars(40, 940, 640)}<circle class="gd" cx="470" cy="330" r="220" opacity="0.3" />${[0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25].map((k, i) => { const a = Math.PI / 2 + (i / 8) * Math.PI * 2; return phase(470 + 220 * Math.cos(a), 330 + 220 * Math.sin(a), 38, k, i > 4); }).join("")}
      <text class="lbl" x="470" y="320">보름은 줄고</text><text class="lbl" x="470" y="362">보름은 차오르고</text>`,
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
    // 1화 베다: 달과 스물일곱 아내 (시바 푸라나 등에 전하는 전설, 판본마다 조금씩 다름)
    star: {
      n: 2, ep: 1, name: "베다의 방", guide: "베다", origin: "인도의 전설",
      cover: { hook: "달에게 아내가<br />스물일곱?", sub: "달이 차고 기우는 이유, 인도의 전설", art: "cover" },
      scenes: [
        { cap: "신들의 시대", art: "daughters", say: "하나, 둘, 셋… 스물일곱. 신들의 조상 <b>닥샤</b>에게는 딸이 스물일곱 있었어요. 모두 달의 신 <b>찬드라</b>에게 시집을 갔죠." },
        { cap: "가장 아끼던 아내", art: "favorite", say: "그런데 달은 넷째 아내 <b>로히니</b>만 바라봤어요. 밤이면 밤마다 로히니의 집에만 머물렀죠. 나머지 스물여섯 집은 늘 캄캄했어요." },
        { cap: "아버지의 저주", art: "curse", say: "서운한 딸들은 아버지에게 돌아갔어요. 화가 난 닥샤는 달에게 저주를 내렸죠. <b>“네 빛이 날마다 줄어들 것이다.”</b>" },
        { cap: "반쪽짜리 용서", art: "cycle", say: "달은 시바 신에게 빌었어요. 저주를 다 풀 수는 없어, 신은 이렇게 정했죠. <b>보름은 줄고, 보름은 다시 차오르라.</b> 그 뒤로 달은 스물일곱 아내의 집을 하룻밤씩 고루 찾아가요." },
      ],
      facts: {
        title: "전설과 하늘",
        storyLabel: "이렇게 전해요",
        story: [
          "인도의 옛 이야기책 『시바 푸라나』 등에 전하는 전설이에요. 판본마다 조금씩 달라요.",
          "달이 시바 신에게 빌었다는 자리가 지금의 구자라트 솜나트 사원이라고 전해요.",
        ],
        recLabel: "실제 하늘에서는",
        rec: [
          "달은 약 27.3일에 별들 사이를 한 바퀴 돌아요. 그래서 그 길을 스물일곱 칸, 나크샤트라로 나눴어요.",
          "넷째 칸 로히니는 황소자리의 붉은 별 알데바란 근처예요.",
          "베다의 방은 당신이 태어난 밤, 달이 머문 ‘아내의 집’을 찾아요.",
        ],
      },
      cta: { ask: "당신이 태어난 밤,<br />달은 누구의 집에?", sub: "생일과 태어난 시각으로 찾을 수 있어요", pill: "프로필 링크에서 세 번째 문 「베다의 방」", next: "다음 기록 · 불타 버린 여섯 권의 예언서" },
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
    const F = E.facts;
    page.innerHTML = `${head}${tag}<p class="ttl">${F.title || "기록과 이야기"}</p>
      <div class="box story first"><span>${F.storyLabel || "알아 두면 좋은 것 · 해석"}</span><ul>${F.story.map((t) => `<li>${t}</li>`).join("")}</ul></div>
      <div class="box rec last"><span>${F.recLabel || "기록으로 전하는 것"}</span><ul>${F.rec.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
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
