// 광고 9안 「일곱 점술이 말하는 2027」 조립 (2026-11-12). 15초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다(렌더 도구가 currentTime으로 프레임을 고름).
// 무작위 값 없음(불티 길이·각도는 번호로 계산). 문구: 나라·점술 이름과 2027년 한 줄은 제품 신년운세 방마다 비추는 면(data.js ny.rooms.*.lens)을 풀어 쓴 말.
// 재물·건강 약속·정확도 과장·불안 재촉 없음. 세계 점술: 동양색(한지·붓·낙관)은 쓰지 않는다(운영자 2026-11-12).
(function () {
  const T = { roll: 1.0, cap: 1.55, away: 1.95, fw0: 2.3, gap: 1.1, cst: 10.15, end: 12.6, dur: 15 };
  const ORACLES = [
    { h: 18, og: "KOREA · SAJU", nm: "한국의 사주", ln: "올해 내 일이 서는 자리", s: "사주" },
    { h: 150, og: "IRELAND · OGHAM", nm: "켈트의 오검", ln: "올해 나를 받쳐 줄 뿌리", s: "오검" },
    { h: 295, og: "INDIA · JYOTISH", nm: "인도의 베다", ln: "올해 마음이 향하는 사람", s: "베다" },
    { h: 65, og: "EGYPT · DECANS", nm: "이집트의 데칸", ln: "올해 꺼내 쓸 나의 재능", s: "데칸" },
    { h: 190, og: "MAYA · TZOLK'IN", nm: "마야의 촐킨", ln: "올해 나에게 맞는 리듬", s: "촐킨" },
    { h: 230, og: "NORSE · RUNES", nm: "북유럽의 룬", ln: "올해를 여는 열쇠 하나", s: "룬" },
    { h: 35, og: "GREECE · SIBYL", nm: "그리스의 시빌라", ln: "올해 내 질문에 내리는 신탁", s: "시빌라" },
  ];
  const CX = 540, CY = 820, RAD = 310;
  const PTS = ORACLES.map((_, i) => { const a = (-90 + (i * 360) / 7) * (Math.PI / 180); return [Math.round(CX + RAD * Math.cos(a)), Math.round(CY + RAD * Math.sin(a))]; });
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const add = (el) => (stage.insertBefore(el, stage.querySelector(".safe-guide")), el);

  // ── 0~2.3 자정: 2026 → 2027 (끝자리가 한 칸 굴러감) → 작아지며 사라지고, 위에 "일곱 개의 점술이 말하는 나의 2027년"
  const year = $("div", "year", `<span>202</span><span class="d"><span class="wheel"><span>6</span><span>7</span></span></span>`);
  anim(year.querySelector(".wheel"), [`roll 0.6s cubic-bezier(0.6, 0, 0.2, 1.15) ${T.roll}s both`]);
  anim(year, [`glowup 0.9s ease-out ${T.roll + 0.35}s both`, `yearaway 0.5s ease-in ${T.away}s forwards`]);
  year.style.opacity = 1; // 첫 프레임부터 2026이 보이게(피드 첫 장면)
  add(year);
  const cap = $("p", "cap9", "일곱 개의 점술이 말하는<br><em>나의 2027년</em>");
  cap.style.top = "290px";
  add(anim(cap, [`rise9 0.6s var(--soft) ${T.cap}s both`, `sink9 0.4s ease-in ${T.end - 0.4}s forwards`]));

  // ── 2.3~10.15 새해 불꽃 일곱 발: 꼭짓점마다 터지고, 그 점술이 가운데에서 말한다. 터진 자리에 별이 남는다
  const fwLayer = add($("div", "layer"));
  const sayLayer = add($("div", "layer"));
  ORACLES.forEach((o, i) => {
    const [x, y] = PTS[i];
    const L = T.fw0 + i * T.gap, B = L + 0.45;
    const fw = $("div", "fw");
    fw.style.left = x + "px";
    fw.style.top = y + "px";
    fw.style.setProperty("--h", o.h);
    const trail = $("span", "trail");
    trail.style.setProperty("--rise", 1300 - y + "px");
    anim(trail, [`trail 0.5s cubic-bezier(0.2, 0.7, 0.4, 1) ${L}s both`]);
    const burst = anim($("div", "burst"), [`droop 1.6s ease-in ${B}s both`]);
    for (let k = 0; k < 36; k++) {
      const ray = $("span", "ray");
      ray.style.setProperty("--a", (k * 360) / 36 + (i % 2) * 5 + "deg");
      const r = 200 + ((k * 37 + i * 11) % 100);
      const sp = $("span", "spark");
      sp.style.setProperty("--r", r + "px");
      anim(sp, [`spark 1.25s cubic-bezier(0.1, 0.8, 0.3, 1) ${B}s both`]);
      const sp2 = $("span", "spark t");
      sp2.style.setProperty("--r", Math.round(r * 0.55) + "px");
      anim(sp2, [`spark 1.0s cubic-bezier(0.1, 0.8, 0.3, 1) ${B + 0.05}s both`]);
      ray.append(sp, sp2);
      burst.append(ray);
    }
    burst.append(anim($("span", "core"), [`core 0.7s ease-out ${B}s both`]));
    const star = anim($("span", "star"), [`starin 0.5s var(--soft) ${B + 0.35}s both`]);
    const lbl = $("span", "lbl", o.s);
    lbl.style.top = (i === 0 ? -80 : 30) + "px";
    anim(lbl, [`fade9 0.4s ease-out ${T.cst + 0.5 + i * 0.06}s both`]);
    fw.append(trail, burst, star, lbl);
    fwLayer.append(fw);
    // 가운데: 나라·점술 · 이름 · 2027년 한 줄
    const say = $("div", "say9", `<p class="og">${o.og}</p><p class="nm">${o.nm}</p><p class="ln">${o.ln}</p>`);
    say.style.setProperty("--h", o.h);
    anim(say, [`say9 ${T.gap + 0.05}s ease-out ${B + 0.05}s both`]);
    sayLayer.append(say);
  });
  // 몇 번째 점술인지(1 / 7 … 7 / 7)
  const count = $("p", "count9");
  ORACLES.forEach((o, i) => {
    const n = $("span", "n", `<b>${i + 1}</b> / 7`);
    const B = T.fw0 + i * T.gap + 0.45;
    anim(n, [`fade9 0.2s ease-out ${B}s both`].concat(i < 6 ? [`fadeout9 0.2s ease-in ${B + T.gap - 0.1}s forwards`] : [`fadeout9 0.3s ease-in ${T.cst}s forwards`]));
    count.append(n);
  });
  count.style.opacity = 1;
  sayLayer.append(count);

  // ── 10.15~12.6 일곱 별이 이어져 별자리 + 가운데 2027
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "const9");
  svg.setAttribute("viewBox", "0 0 1080 1920");
  const ring = document.createElementNS(svgNS, "path");
  ring.setAttribute("d", "M" + PTS.concat([PTS[0]]).map((p) => p.join(" ")).join(" L"));
  ring.style.animation = `draw9 0.9s cubic-bezier(0.5, 0, 0.3, 1) ${T.cst}s both`;
  const star7 = document.createElementNS(svgNS, "path"); // 일곱 꼭짓점 별(세 칸씩 건너 잇기)
  star7.setAttribute("d", "M" + [0, 3, 6, 2, 5, 1, 4, 0].map((k) => PTS[k].join(" ")).join(" L"));
  star7.setAttribute("class", "in");
  star7.style.animation = `draw9 1.1s cubic-bezier(0.5, 0, 0.3, 1) ${T.cst + 0.45}s both`;
  svg.append(star7, ring);
  fwLayer.prepend(svg);
  fwLayer.append(anim($("p", "mid9", "2027"), [`rise9 0.7s var(--soft) ${T.cst + 0.7}s both`]));
  anim(fwLayer, [`fadeout9 0.45s ease-in ${T.end - 0.3}s forwards`]);

  // ── 12.6~15 끝
  const end = $("div", "end9");
  end.append($("p", "eb", "SEVEN ORACLES · 2027"), $("p", "logo logo9", "낯선 점술관"), $("p", "main", "일곱 점술이 말하는<br><em>2027 신년운세</em>"));
  const free = anim($("p", "free", "처음 고르는 두 방은 무료"), [`rise9 0.45s var(--soft) ${T.end + 0.8}s both`]);
  const cta = anim($("p", "cta", "일곱 점술의 2027 듣기"), [`rise9 0.45s var(--soft) ${T.end + 1.15}s both`]);
  const dots = $("div", "dots");
  ORACLES.forEach((o, i) => { const d = $("i"); d.style.setProperty("--h", o.h); anim(d, [`starin 0.35s var(--soft) ${T.end + 0.4 + i * 0.08}s both`]); dots.append(d); });
  end.append(free, cta, dots);
  anim(end.querySelector(".logo9"), [`logo-shimmer 1.6s ease-in-out ${T.end + 0.5}s both`]);
  add(anim(end, [`fade9 0.5s ease-out ${T.end}s both`]));
})();
