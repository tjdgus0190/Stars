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

  // 끝 장 팔로우 안내(모든 편 공통)
  const FOLLOW = { head: "팔로우하고 다음 기록 받기", body: "일곱 점술에 숨은 전설을 하루 한 편씩 올려요" };

  // ── 2~7화 그림 부품
  const f1 = (v) => (+v).toFixed(1);
  const flame = (cx, by, s) => `<g transform="translate(${cx} ${by}) scale(${s})"><path class="fire" d="M0 -154c40 50 70 80 60 120c-8 30-30 34-60 34s-52-4-60-34c-10-40 20-70 60-120Z" /><path class="fire2" d="M0 -94c18 26 30 42 26 62c-4 16-14 20-26 20s-22-4-26-20c-4-20 8-36 26-62Z" /></g>`;
  const scroll = (x, y, w, h) => {
    const i = w * 0.2; let ln = "";
    for (let ly = y + 30; ly < y + h - 24; ly += 18) ln += `M${f1(x + i)} ${ly}H${f1(x + w - i)}`;
    return `<g><rect x="${x}" y="${y + 8}" width="${w}" height="${h - 16}" rx="3" fill="oklch(0.86 0.06 85)" stroke="oklch(0.62 0.08 75)" stroke-width="2" /><rect x="${x - 7}" y="${y}" width="${w + 14}" height="14" rx="7" fill="oklch(0.5 0.08 55)" /><rect x="${x - 7}" y="${y + h - 14}" width="${w + 14}" height="14" rx="7" fill="oklch(0.5 0.08 55)" /><path d="${ln}" stroke="oklch(0.55 0.05 60)" stroke-width="2.5" /></g>`;
  };
  const tree = () => `<path class="gd" d="M120 520H820" opacity="0.5" /><path class="ln" d="M450 520C455 430 445 330 460 230M490 520C485 430 495 330 480 230" />
    <path class="ln" d="M460 240C400 200 330 190 250 150M470 230C450 170 420 120 380 90M480 235C530 180 590 150 680 140M478 250C560 240 640 230 720 200M462 260C390 260 320 250 230 230M470 232C480 170 510 120 560 96" />
    <path class="ln" d="M450 520C420 550 360 570 300 600M470 520V610M490 520C520 550 590 570 650 600" opacity="0.7" />`;
  const wanderer = (x, y) => { const c = `fill="oklch(0.16 0.04 285)" stroke="var(--acc)" stroke-width="3"`; return `<g><path d="M${x} ${y - 6}L${x - 34} ${y + 96}H${x + 34}Z" ${c} /><circle cx="${x}" cy="${y - 12}" r="14" ${c} /><ellipse cx="${x}" cy="${y - 22}" rx="30" ry="7" ${c} /><path d="M${x - 14} ${y - 24}L${x} ${y - 52}L${x + 14} ${y - 24}" ${c} /></g>`; };
  // 룬(엘더 푸타르크) 획: 가로 20 x 세로 40 칸
  const RUNE = {
    f: "M6 0V40M6 14L18 4M6 24L18 14", u: "M5 40V0L17 12V40", th: "M6 0V40M6 12L16 20L6 28", a: "M6 0V40M6 4L16 14M6 14L16 24",
    r: "M6 40V0L16 10L6 20L16 40", k: "M15 6L5 18L15 30", g: "M3 4L17 36M17 4L3 36", w: "M6 40V0L16 10L6 20",
    h: "M4 0V40M16 0V40M4 14L16 26", n: "M10 0V40M4 14L16 26", i: "M10 0V40", j: "M9 6L3 14L9 22M11 18L17 26L11 34",
    ei: "M10 0V40M10 2L16 8M10 38L4 32", p: "M5 0V40M5 0L14 8L18 4M5 40L14 32L18 36", z: "M10 0V40M10 14L2 4M10 14L18 4", s: "M15 2L5 14L16 26L6 38",
    t: "M10 0V40M2 10L10 0L18 10", b: "M5 0V40M5 0L15 10L5 20L15 30L5 40", e: "M3 40V0L10 10L17 0V40", m: "M3 40V0L17 14M17 40V0L3 14",
    l: "M6 40V0L16 10", ng: "M10 4L18 20L10 36L2 20Z", d: "M3 0V40M17 0V40M3 0L17 40M17 0L3 40", o: "M10 2L17 12L3 30M10 2L3 12L17 30",
  };
  const FUTHARK = ["f", "u", "th", "a", "r", "k", "g", "w", "h", "n", "i", "j", "ei", "p", "z", "s", "t", "b", "e", "m", "l", "ng", "d", "o"];
  const rune = (k, x, y, s, cls) => `<path class="${cls}" transform="translate(${f1(x)} ${f1(y)}) scale(${s})" d="${RUNE[k]}" vector-effect="non-scaling-stroke" style="stroke-width:5" />`;
  // 하늘의 여신 누트: 별을 두른 활 모양
  const nut = (cx, base, R, t) => {
    let st = "";
    for (let i = 0; i < 40; i++) { const th = Math.PI * (0.04 + 0.92 * rnd()), r = R - t * (0.15 + 0.7 * rnd()); st += `<circle class="star" cx="${f1(cx + r * Math.cos(th))}" cy="${f1(base - r * Math.sin(th))}" r="${f1(1.5 + rnd() * 2.5)}" />`; }
    return `<path d="M${cx - R} ${base}A${R} ${R} 0 0 1 ${cx + R} ${base}L${cx + R - t} ${base}A${R - t} ${R - t} 0 0 0 ${cx - R + t} ${base}Z" fill="oklch(0.28 0.09 255 / 0.85)" stroke="var(--acc)" stroke-width="3" />${st}`;
  };
  const person = (x, y, s, fill, stroke) => `<g fill="${fill}" stroke="${stroke}" stroke-width="3"><circle cx="${x}" cy="${f1(y - 78 * s)}" r="${f1(22 * s)}" /><path d="M${f1(x - 40 * s)} ${y}Q${f1(x - 38 * s)} ${f1(y - 50 * s)} ${x} ${f1(y - 52 * s)}Q${f1(x + 38 * s)} ${f1(y - 50 * s)} ${f1(x + 40 * s)} ${y}Z" /></g>`;
  const maize = (x, y, s, c) => {
    let k = "";
    for (let i = -5; i <= 5; i++) for (let j = -1; j <= 1; j++) if ((j * 13) ** 2 / 26 ** 2 + (i * 12) ** 2 / 72 ** 2 < 0.9) k += `<circle cx="${f1(x + j * 13 * s)}" cy="${f1(y + i * 12 * s)}" r="${f1(6 * s)}" fill="${c}" />`;
    return `<g><path d="M${x} ${f1(y + 90 * s)}Q${f1(x - 60 * s)} ${f1(y + 30 * s)} ${f1(x - 36 * s)} ${f1(y - 50 * s)}Q${f1(x - 20 * s)} ${f1(y + 20 * s)} ${x} ${f1(y + 60 * s)}Z" fill="oklch(0.5 0.1 140)" /><path d="M${x} ${f1(y + 90 * s)}Q${f1(x + 60 * s)} ${f1(y + 30 * s)} ${f1(x + 36 * s)} ${f1(y - 50 * s)}Q${f1(x + 20 * s)} ${f1(y + 20 * s)} ${x} ${f1(y + 60 * s)}Z" fill="oklch(0.45 0.1 140)" /><ellipse cx="${x}" cy="${y}" rx="${f1(26 * s)}" ry="${f1(72 * s)}" fill="oklch(0.3 0.04 80)" />${k}</g>`;
  };
  // 오검 획: 줄기(x)에서 side 쪽으로, y에서 위로 올라가며 글자마다 n획
  const ogham = (x, y, counts, gap, side = 1, len = 40) => {
    let yy = y, out = "";
    counts.forEach((n) => { for (let k = 0; k < n; k++) { out += `<path class="gd glow" d="M${x} ${yy}h${side * len}" style="stroke-width:5" />`; yy -= 14; } yy -= gap; });
    return out;
  };
  const birch = (x, top, bot, w) => {
    let m = "";
    for (let yy = top + 20; yy < bot - 10; yy += 34 + rnd() * 20) m += `M${f1(x + rnd() * w * 0.6)} ${f1(yy)}h${f1(w * (0.15 + rnd() * 0.25))}`;
    return `<rect x="${x}" y="${top}" width="${w}" height="${bot - top}" rx="${f1(w / 6)}" fill="oklch(0.9 0.02 90)" /><path d="${m}" stroke="oklch(0.55 0.02 60)" stroke-width="4" stroke-linecap="round" />`;
  };
  // 무당 방울: 일곱 방울 + 오방색 끈
  const bells = (cx, cy, s) => {
    const P = [[0, 0], [-24, -12], [24, -12], [-12, -34], [12, -34], [-34, 12], [34, 12]];
    const rib = ["oklch(0.6 0.15 250)", "oklch(0.6 0.2 25)", "oklch(0.85 0.15 90)", "oklch(0.95 0.01 90)", "oklch(0.55 0.15 150)"];
    return `<g>${rib.map((c, i) => `<path d="M${cx} ${f1(cy + 74 * s)}q${f1((i - 2) * 14 * s)} ${f1(40 * s)} ${f1((i - 2) * 10 * s)} ${f1(110 * s)}" stroke="${c}" stroke-width="${f1(4 * s)}" fill="none" />`).join("")}<path d="M${cx} ${f1(cy + 10 * s)}V${f1(cy + 76 * s)}" stroke="oklch(0.5 0.08 55)" stroke-width="${f1(8 * s)}" stroke-linecap="round" />${P.map(([dx, dy]) => `<g class="glow"><circle cx="${f1(cx + dx * s)}" cy="${f1(cy + dy * s)}" r="${f1(12 * s)}" fill="oklch(0.82 0.13 85)" stroke="oklch(0.55 0.1 70)" stroke-width="2" /><path d="M${f1(cx + dx * s - 5 * s)} ${f1(cy + dy * s + 4 * s)}h${f1(10 * s)}" stroke="oklch(0.35 0.06 60)" stroke-width="${f1(2 * s)}" /></g>`).join("")}</g>`;
  };
  const flower = (x, y, c) => `<path d="M${x} ${y + 30}V${y + 150}" stroke="oklch(0.55 0.1 140)" stroke-width="5" />${[0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i / 5) * Math.PI * 2; return `<circle cx="${f1(x + 28 * Math.cos(a))}" cy="${f1(y + 28 * Math.sin(a))}" r="22" fill="${c}" />`; }).join("")}<circle class="glow" cx="${x}" cy="${y}" r="14" fill="oklch(0.9 0.12 90)" />`;

  const ART = {
    // ── 2~7화 그림 (2026-11-01). 모두 직접 그린 도형
    // 2화 시빌라: 두루마리 예언서, 불, 신전
    sibylCover: () => `${stars(40, 560, 560)}${flame(110, 430, 0.75)}${flame(450, 430, 0.75)}${scroll(170, 200, 60, 170)}${scroll(250, 180, 60, 190)}${scroll(330, 200, 60, 170)}`,
    nine: () => `${stars(40, 940, 640)}${[0, 1, 2].map((r) => [0, 1, 2].map((c) => scroll(330 + c * 110, 100 + r * 150, 60, 120)).join("")).join("")}
      <text class="lbl" x="470" y="610">예언서 아홉 권</text>`,
    burn1: () => `${stars(40, 940, 640)}${[0, 1, 2].map((c) => `<g opacity="0.35">${scroll(110 + c * 90, 250, 60, 130)}</g>${flame(140 + c * 90, 400, 0.7)}`).join("")}
      ${[0, 1].map((r) => [0, 1, 2].map((c) => scroll(530 + c * 100, 130 + r * 170, 60, 130)).join("")).join("")}
      <text class="lbl" x="230" y="470">불 속으로 세 권</text><text class="lbl" x="660" y="470">남은 여섯 권</text>
      <text class="lbl on-gold" x="470" y="580">값은 그대로</text>`,
    burn2: () => `${stars(40, 940, 640)}${[0, 1, 2, 3, 4, 5].map((c) => `<ellipse cx="${100 + c * 60}" cy="400" rx="26" ry="8" fill="oklch(0.3 0.02 60)" />`).join("")}${flame(170, 395, 0.8)}${flame(310, 395, 0.8)}
      <g class="glow">${scroll(560, 150, 70, 220)}${scroll(660, 130, 70, 240)}${scroll(760, 150, 70, 220)}</g>
      <text class="lbl" x="240" y="470">재가 된 여섯 권</text><text class="lbl" x="700" y="470">남은 세 권</text>
      <text class="lbl on-gold" x="470" y="580">값은 여전히 그대로</text>`,
    temple: () => `${stars(40, 940, 640)}<path class="gd" d="M240 200L470 100L700 200Z" /><rect x="240" y="200" width="460" height="24" fill="none" stroke="var(--gold)" stroke-width="3" />
      ${[280, 370, 550, 640].map((x) => `<rect x="${x}" y="224" width="30" height="270" fill="oklch(0.2 0.03 285)" stroke="var(--gold)" stroke-width="3" />`).join("")}
      <rect x="220" y="494" width="500" height="20" fill="none" stroke="var(--gold)" stroke-width="3" /><rect x="200" y="514" width="540" height="20" fill="none" stroke="var(--gold)" stroke-width="3" />
      <g class="glow">${scroll(418, 320, 30, 110)}${scroll(455, 300, 30, 130)}${scroll(492, 320, 30, 110)}</g>
      <text class="lbl" x="470" y="600">나라가 흔들릴 때만 펼친 책</text>`,
    // 3화 룬: 세계수, 아홉 밤, 떠오르는 룬, 스물네 글자
    runeCover: () => `${stars(40, 560, 560)}<g transform="translate(0 30) scale(0.6)">${tree()}</g>${["f", "u", "th", "a", "r", "k", "g", "w"].map((k, i) => { const a = Math.PI + (i / 7) * Math.PI; return rune(k, 280 + 250 * Math.cos(a) - 13, 300 + 230 * Math.sin(a) - 26, 1.3, "gd glow"); }).join("")}`,
    tree: () => `${stars(40, 940, 640)}${tree()}${wanderer(470, 330)}<path class="ln" d="M720 300q40-22 80 0t80 0M690 360q40-22 80 0t80 0M740 420q30-18 60 0" opacity="0.6" />
      <text class="lbl" x="760" y="250">세계수</text>`,
    nights: () => `${stars(40, 940, 640)}${Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.12 + (i / 8) * 0.76), x = 470 + 340 * Math.cos(a), y = 540 + 340 * Math.sin(a); return `${crescent(x + 6, y, 24)}<text class="num" x="${x.toFixed(1)}" y="${(y + 62).toFixed(1)}">${i + 1}</text>`; }).join("")}
      ${wanderer(470, 500)}<text class="lbl" x="470" y="350">먹지도 마시지도 않고</text><text class="lbl" x="470" y="392">아흐레 밤</text>`,
    rise: () => `${stars(30, 940, 220)}<path class="gd" d="M100 240H840" opacity="0.6" /><path class="ln" d="M440 70C445 140 445 200 450 240M500 70C495 140 495 200 490 240" />
      <path class="ln" d="M450 240C420 300 340 340 260 400M470 240C470 320 460 400 470 500M490 240C530 300 620 340 700 410M460 260C420 360 400 430 360 520M480 260C520 360 560 450 600 530" opacity="0.5" />
      ${[["f", 210, 430], ["u", 320, 450], ["th", 400, 330], ["a", 520, 420], ["r", 620, 330], ["k", 700, 500]].map(([k, x, y]) => rune(k, x, y, 1.6, "gd glow")).join("")}
      ${[260, 450, 560, 690].map((x) => `<path class="gd" d="M${x} 330v-50M${x - 10} 292l10-12l10 12" opacity="0.7" />`).join("")}
      <text class="lbl" x="470" y="615">깊은 곳에서 빛난 글자</text>`,
    futhark: () => `${stars(30, 940, 640)}${FUTHARK.map((k, i) => rune(k, 147 + (i % 8) * 90, 110 + Math.floor(i / 8) * 150, 1.4, i < 6 ? "gd glow" : "gd")).join("")}
      <text class="lbl" x="470" y="600">첫 여섯 글자 소리 ‘푸타르크’, 모두 스물넷</text>`,
    // 4화 데칸: 하늘의 여신 누트, 금지, 달과의 내기, 닷새
    decanCover: () => `${stars(40, 560, 560)}${nut(280, 420, 230, 64)}<path class="gd" d="M30 420H530" opacity="0.6" /><circle class="fire" cx="480" cy="404" r="22" /><circle cx="80" cy="410" r="14" fill="oklch(0.78 0.17 55 / 0.5)" />`,
    nut: () => `${stars(30, 940, 640)}${nut(470, 540, 390, 96)}<path class="gd" d="M40 540Q470 500 900 540" /><circle cx="110" cy="526" r="18" fill="oklch(0.78 0.17 55 / 0.55)" /><circle class="fire" cx="830" cy="520" r="26" />
      <text class="lbl" x="470" y="208">누트</text><text class="lbl" x="470" y="400">저녁엔 해를 삼키고</text><text class="lbl" x="470" y="442">아침엔 다시 낳는 하늘</text>`,
    ban: () => `${stars(30, 940, 640)}${Array.from({ length: 36 }, (_, i) => { const a = -Math.PI / 2 + (i / 36) * Math.PI * 2; return `<circle class="dot" cx="${(470 + 220 * Math.cos(a)).toFixed(1)}" cy="${(310 + 220 * Math.sin(a)).toFixed(1)}" r="9" />`; }).join("")}
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path class="gd" d="M${(470 + 80 * Math.cos(a)).toFixed(1)} ${(310 + 80 * Math.sin(a)).toFixed(1)}L${(470 + 120 * Math.cos(a)).toFixed(1)} ${(310 + 120 * Math.sin(a)).toFixed(1)}" />`; }).join("")}
      <circle class="fire" cx="470" cy="310" r="58" /><text class="lbl" x="470" y="600">1년 360일, 어느 날에도 안 된다</text>`,
    wager: () => `${stars(30, 940, 640)}${crescent(310, 190, 70)}
      <rect x="230" y="340" width="480" height="144" fill="oklch(0.25 0.05 65)" stroke="var(--gold)" stroke-width="3" rx="6" />${Array.from({ length: 9 }, (_, i) => `<path d="M${278 + i * 48} 340V484" stroke="var(--gold)" stroke-width="2" opacity="0.6" />`).join("")}<path d="M230 388H710M230 436H710" stroke="var(--gold)" stroke-width="2" opacity="0.6" />
      ${[[254, 364], [350, 412], [446, 364], [590, 460], [638, 412]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="15" fill="${i % 2 ? "oklch(0.95 0.04 90)" : "oklch(0.35 0.06 60)"}" stroke="var(--gold)" stroke-width="2" />`).join("")}
      <path class="gd" d="M390 180C470 140 540 150 590 180" stroke-dasharray="6 10" /><path class="gd" d="M578 166l14 14l-18 6" />
      ${[0, 1, 2, 3, 4].map((i) => `<circle class="dot on" cx="${620 + i * 54}" cy="200" r="13" />`).join("")}
      <text class="lbl" x="470" y="580">내기로 따낸 달빛 → 새로운 닷새</text>`,
    five: () => `${stars(30, 940, 640)}${Array.from({ length: 36 }, (_, i) => { const a = -Math.PI / 2 + (i / 36) * Math.PI * 2; return `<circle class="dot" cx="${(380 + 210 * Math.cos(a)).toFixed(1)}" cy="${(300 + 210 * Math.sin(a)).toFixed(1)}" r="8" />`; }).join("")}
      ${[0, 1, 2, 3, 4].map((i) => { const a = (-0.36 + i * 0.18); return `<circle class="dot on" cx="${(380 + 290 * Math.cos(a)).toFixed(1)}" cy="${(300 + 290 * Math.sin(a)).toFixed(1)}" r="16" />`; }).join("")}
      <text class="lbl" x="380" y="292">360일</text><text class="lbl" x="380" y="334">별무리 36 × 열흘</text><text class="num" x="790" y="310">+ 5</text>
      <text class="lbl" x="470" y="605">다섯 아이가 태어난 닷새</text>`,
    // 5화 촐킨: 진흙 사람, 나무 사람, 옥수수, 흐려진 눈
    tzolkinCover: () => `${stars(40, 560, 560)}${Array.from({ length: 20 }, (_, i) => { const a = -Math.PI / 2 + (i / 20) * Math.PI * 2; return `<circle class="dot${i === 0 ? " on" : ""}" cx="${(280 + 230 * Math.cos(a)).toFixed(1)}" cy="${(280 + 230 * Math.sin(a)).toFixed(1)}" r="${i === 0 ? 14 : 10}" />`; }).join("")}${maize(280, 290, 2.2, "oklch(0.86 0.14 90)")}`,
    mud: () => `${stars(30, 940, 640)}${Array.from({ length: 14 }, (_, i) => `<path class="ln" d="M${180 + i * 45} ${60 + (i % 3) * 30}l-12 36" opacity="0.5" />`).join("")}
      ${person(470, 470, 2, "oklch(0.42 0.06 55)", "oklch(0.6 0.07 60)")}<path d="M380 470c0 30 20 26 20 50M430 470c0 40 14 30 14 62M520 470c0 30-12 28-12 56M560 470c0 24 14 20 14 40" stroke="oklch(0.42 0.06 55)" stroke-width="12" stroke-linecap="round" fill="none" />
      <path class="ln" d="M120 560q40-18 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0" opacity="0.7" /><text class="lbl" x="470" y="615">물에 풀어져 버린 첫 사람</text>`,
    wood: () => `${stars(30, 940, 640)}<g fill="oklch(0.45 0.08 55)" stroke="oklch(0.65 0.08 60)" stroke-width="3"><rect x="430" y="110" width="80" height="80" rx="6" /><rect x="410" y="200" width="120" height="180" rx="6" /><rect x="360" y="210" width="40" height="150" rx="6" /><rect x="540" y="210" width="40" height="150" rx="6" /><rect x="420" y="385" width="40" height="110" rx="6" /><rect x="480" y="385" width="40" height="110" rx="6" /></g>
      <path d="M470 250c-14-18-40-4-24 18l24 22l24-22c16-22-10-36-24-18Z" fill="none" stroke="oklch(0.95 0.04 90)" stroke-width="3" stroke-dasharray="6 6" />
      <path class="ln" d="M100 530q40-22 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0M140 570q40-22 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0" opacity="0.8" />
      <text class="lbl" x="470" y="625">마음도 기억도 없던 둘째 사람</text>`,
    maize: () => `${stars(30, 940, 640)}${maize(250, 250, 1.5, "oklch(0.86 0.14 90)")}${maize(380, 230, 1.6, "oklch(0.86 0.14 90)")}${maize(560, 230, 1.6, "oklch(0.95 0.02 95)")}${maize(690, 250, 1.5, "oklch(0.95 0.02 95)")}
      <path class="stone" d="M300 470L640 440L660 500L320 520Z" /><rect x="420" y="410" width="150" height="34" rx="17" fill="oklch(0.4 0.04 60)" stroke="oklch(0.6 0.06 70)" stroke-width="3" transform="rotate(-5 495 427)" />
      <ellipse cx="470" cy="455" rx="40" ry="14" fill="oklch(0.9 0.1 90)" /><text class="lbl" x="470" y="600">아홉 번 갈아 빚은 반죽</text>`,
    eyes: () => `<defs><filter id="mist" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14" /></filter></defs>${stars(60, 940, 200)}
      ${[290, 410, 530, 650].map((x) => [-60, -20, 20, 60].map((d) => `<path class="gd" d="M${x} 410L${x + d * 2.4} 40" opacity="0.25" /><path class="gd" d="M${x} 410L${x + d * 0.85} 260" />`).join("")).join("")}
      <ellipse cx="470" cy="215" rx="430" ry="44" fill="oklch(0.9 0.02 280 / 0.35)" filter="url(#mist)" />
      ${[290, 410, 530, 650].map((x) => person(x, 520, 1.1, "oklch(0.2 0.04 285)", "var(--gold)")).join("")}
      <text class="lbl" x="470" y="610">입김 서린 거울처럼, 가까운 것부터</text>`,
    // 6화 오검: 말의 신, 일곱 B, 요정의 언덕, 나무 이름 글자
    oghamCover: () => `${stars(40, 560, 560)}<path class="stone" d="M200 480V140Q200 80 270 70Q350 70 360 140V480Z" />${ogham(200, 430, [1, 2, 3, 4, 5], 30, 1)}<path class="gd" d="M140 480H420" />`,
    ogma: () => `${stars(30, 940, 640)}${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<path class="gd glow" d="M${(470 + 70 * Math.cos(a)).toFixed(1)} ${(283 + 70 * Math.sin(a)).toFixed(1)}L${(470 + 110 * Math.cos(a)).toFixed(1)} ${(283 + 110 * Math.sin(a)).toFixed(1)}" />`; }).join("")}
      ${person(470, 470, 2.4, "oklch(0.2 0.04 285)", "var(--gold)")}<path class="ln" d="M600 300q40-24 80 0t80 0t60 0M600 350q40-24 80 0t80 0M280 300q-40-24-80 0t-80 0M280 350q-40-24-80 0" opacity="0.8" />
      <text class="lbl" x="470" y="600">말과 시에 능한 신, 오그마</text>`,
    sevenb: () => `${stars(30, 940, 640)}${birch(410, 60, 600, 120)}<path class="carve" d="M470 560V100" style="stroke-width:5" />${Array.from({ length: 7 }, (_, i) => `<path class="carve" d="M470 ${520 - i * 60}h44" />`).join("")}
      <text class="lbl" x="730" y="300">B를 일곱 번</text><text class="lbl" x="730" y="342">자작나무에</text>`,
    sidh: () => `${stars(50, 940, 300)}<path d="M80 600Q470 260 860 600Z" fill="oklch(0.28 0.06 150)" stroke="var(--acc)" stroke-width="3" />
      <path d="M430 600V520a40 40 0 0 1 80 0V600Z" fill="oklch(0.85 0.12 90)" class="glow" />${birch(180, 300, 600, 40)}${ogham(220, 560, [1, 1, 1, 1, 1, 1, 1], 22, 1)}
      <text class="lbl" x="470" y="200">요정의 언덕, 시드</text>`,
    letters: () => `${stars(30, 940, 640)}${[["B", "자작나무"], ["L", "마가목"], ["F", "오리나무"], ["S", "버드나무"], ["N", "물푸레나무"]].map(([l, t], i) => { const x = 150 + i * 160; return `<path class="ln" d="M${x} 120V420" />${ogham(x, 280 + (i + 1) * 7, [i + 1], 0, 1, 46)}<text class="num" x="${x}" y="480">${l}</text><text class="lbl" x="${x}" y="530">${t}</text>`; }).join("")}`,
    // 7화 만신: 일곱째 공주, 저승길, 약수와 꽃, 방울
    sajuCover: () => `${stars(40, 560, 560)}${bells(280, 180, 2)}`,
    seventh: () => `${stars(30, 940, 640)}${[0, 1, 2, 3, 4, 5].map((i) => `<circle class="dot on" cx="${150 + i * 60}" cy="230" r="18" />`).join("")}<text class="lbl" x="300" y="300">여섯 언니</text>
      <path class="ln" d="M80 470q40-22 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0M120 520q40-22 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0" opacity="0.8" />
      <rect x="640" y="410" width="90" height="56" rx="6" fill="oklch(0.4 0.08 40)" stroke="var(--gold)" stroke-width="3" /><circle class="dot on" cx="685" cy="380" r="18" />
      <text class="lbl" x="685" y="320">일곱째</text><text class="lbl" x="470" y="610">물에 띄워 보낸 아이, 바리</text>`,
    road: () => `${stars(60, 940, 260)}<path d="M80 330L200 230L290 300L400 190L520 290L620 200L740 290L860 220V340H80Z" fill="oklch(0.14 0.04 285)" stroke="var(--acc)" stroke-width="3" opacity="0.9" />
      <path d="M380 640C360 540 560 500 500 420S430 360 470 330" fill="none" stroke="var(--gold)" stroke-width="5" stroke-dasharray="2 16" stroke-linecap="round" />
      ${person(452, 520, 0.7, "oklch(0.2 0.04 285)", "var(--gold)")}<circle class="dot on" cx="490" cy="470" r="9" />
      <text class="lbl" x="700" y="120">서천서역국</text>`,
    flowers: () => `${stars(30, 940, 640)}<path d="M420 300Q400 260 430 250H510Q540 260 520 300Q600 360 560 470Q540 520 470 520Q400 520 380 470Q340 360 420 300Z" fill="oklch(0.3 0.05 230)" stroke="var(--gold)" stroke-width="3" />
      <path class="ln" d="M470 330q-20 30 0 60t0 60" opacity="0.7" />${flower(220, 300, "oklch(0.75 0.15 15)")}${flower(720, 300, "oklch(0.85 0.12 90)")}${flower(160, 430, "oklch(0.78 0.12 300)")}${flower(780, 430, "oklch(0.8 0.1 200)")}
      <text class="lbl" x="470" y="600">생명의 꽃과 약수</text>`,
    guide: () => `${stars(30, 940, 640)}${bells(470, 170, 2)}${Array.from({ length: 9 }, (_, i) => `<circle class="dot on" cx="${(600 + i * 36 + Math.sin(i) * 10).toFixed(1)}" cy="${(420 + i * 14).toFixed(1)}" r="${(9 - i * 0.6).toFixed(1)}" opacity="${(1 - i * 0.08).toFixed(2)}" />`).join("")}
      <text class="lbl" x="470" y="610">떠나는 넋의 길을 밝히는 신</text>`,
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
    // 2화 시빌라: 아홉 권의 예언서 (아울루스 겔리우스·디오니시오스 등이 전하는 로마 전설. 왕 이름·값은 판본마다 다름 → 이름 없이 "로마의 왕")
    sibyl: {
      n: 6, ep: 2, name: "시빌라 신탁의 방", guide: "시빌라", origin: "로마의 전설",
      cover: { hook: "예언서를<br />불태운 노파", sub: "값을 깎으려던 왕에게 생긴 일, 로마의 전설", art: "sibylCover" },
      scenes: [
        { cap: "낯선 손님", art: "nine", say: "옛 로마의 왕에게 낯선 노파가 찾아왔어요… 품에는 예언서 <b>아홉 권</b>. 노파는 아주 비싼 값을 불렀죠. 왕은 웃으며 돌려보냈어요." },
        { cap: "첫 번째 불", art: "burn1", say: "노파는 왕 앞에서 세 권을 불 속에 던졌어요… 그리고 남은 <b>여섯 권</b>을 내밀었죠. 값은 아홉 권일 때와 <b>똑같이</b>." },
        { cap: "두 번째 불", art: "burn2", say: "왕이 또 거절하자, 노파는 다시 세 권을 태웠어요… 이제 남은 건 <b>세 권</b>. 값은 여전히 그대로였죠. 왕은 그제야 마음이 흔들렸어요." },
        { cap: "남은 세 권", art: "temple", say: "왕은 처음 값 그대로 세 권을 샀어요. 노파는 그 길로 사라졌죠… 로마는 그 책을 신전 깊이 두고, <b>나라가 흔들릴 때만</b> 펼쳐 봤다고 해요." },
      ],
      facts: {
        title: "전설과 기록",
        storyLabel: "이렇게 전해요",
        story: [
          "고대 로마의 작가들이 남긴 이야기예요. 왕이 누구였는지, 값이 얼마였는지는 책마다 달라요.",
          "노파가 쿠마이 동굴의 무녀, 시빌라였다고 전해요.",
        ],
        recLabel: "기록으로 전하는 것",
        rec: [
          "로마에는 실제로 ‘시빌라의 책’이 있었고, 정해진 관리들만 열어 볼 수 있었어요.",
          "그 책은 기원전 83년 신전에 난 불로 사라졌다고 전해요.",
          "시빌라 신탁의 방은 오늘 당신의 질문에 신탁 한 줄을 골라 줘요.",
        ],
      },
      cta: { ask: "오늘, 시빌라에게<br />묻고 싶은 한 가지", sub: "질문을 고르면 신탁 한 줄이 돌아와요", pill: "프로필 링크에서 일곱 번째 문 「시빌라 신탁의 방」", next: "다음 기록 · 아홉 밤 나무에 매달린 신" },
    },
    // 3화 룬: 오딘과 룬 (『고 에다』 「하바말」 138~141연)
    rune: {
      n: 5, ep: 3, name: "룬의 방", guide: "룬", origin: "북유럽 신화",
      cover: { hook: "아홉 밤,<br />나무에 매달린 신", sub: "룬 문자는 어디서 왔을까, 북유럽 신화", art: "runeCover" },
      scenes: [
        { cap: "바람 부는 나무", art: "tree", say: "북유럽의 으뜸 신 <b>오딘</b>은 늘 더 많은 지혜를 원했어요. 그래서 세상을 떠받친 나무 <b>이그드라실</b>에 스스로를 매달았죠. 바람이 거세게 부는 밤이었어요." },
        { cap: "아홉 밤", art: "nights", say: "하룻밤, 이틀 밤… 아무도 빵 한 조각, 물 한 모금 건네지 않았어요. 오딘은 <b>아홉 밤</b> 내내 나무 아래 깊은 곳만 내려다봤어요." },
        { cap: "떠오른 글자", art: "rise", say: "아홉째 밤, 저 아래에서 무언가 빛났어요. <b>룬</b>이었죠. 오딘은 크게 외치며 그 글자들을 움켜쥐었고, 그 순간 지혜가 흘러들었다고 해요." },
        { cap: "스물네 글자", art: "futhark", say: "그렇게 얻은 룬은 글자이자 주문이 되었어요. 돌에 새기면 이름이 오래 남았죠. 오늘날엔 <b>세 개를 뽑아</b> 과거·현재·미래를 읽는 표식으로도 쓰여요." },
      ],
      facts: {
        title: "전설과 기록",
        storyLabel: "이렇게 전해요",
        story: [
          "13세기 아이슬란드 필사본 『고 에다』의 시 「하바말(높은 이의 말)」에 전해요.",
          "오딘이 지혜의 샘물을 마시려고 한쪽 눈을 내주었다는 이야기도 함께 전해요.",
        ],
        recLabel: "기록으로 전하는 것",
        rec: [
          "룬은 2세기 무렵부터 북유럽·게르만 사람들이 쓴 실제 문자예요.",
          "가장 오래된 룬은 스물네 자. 첫 여섯 글자 소리를 따서 ‘푸타르크’라고 불러요.",
          "룬으로 점을 친 옛 기록은 분명하지 않아요. 룬의 방은 오늘날의 방식으로 돌 세 개를 읽어요.",
        ],
      },
      cta: { ask: "당신의 돌 세 개는<br />무엇을 말할까?", sub: "과거·현재·미래, 돌 세 개로 읽어요", pill: "프로필 링크에서 여섯 번째 문 「룬의 방」", next: "다음 기록 · 해를 삼키는 하늘의 여신" },
    },
    // 4화 데칸: 누트와 닷새 (플루타르코스 「이시스와 오시리스」 12장. 그리스 이름 → 이집트 이름으로)
    decan: {
      n: 3, ep: 4, name: "데칸의 방", guide: "데칸", origin: "이집트 신화",
      cover: { hook: "1년은 왜<br />365일일까?", sub: "달과의 내기로 얻은 닷새, 이집트 신화", art: "decanCover" },
      scenes: [
        { cap: "하늘의 여신", art: "nut", say: "이집트 사람들은 하늘을 여신 <b>누트</b>의 몸이라 여겼어요. 별을 두른 누트는 땅 위로 몸을 활처럼 굽히고, 저녁마다 해를 삼켰다가 아침에 다시 낳았죠." },
        { cap: "태양신의 금지", art: "ban", say: "그런데 태양신 <b>라</b>가 화를 냈어요. 누트가 몰래 아이를 가졌거든요. 라는 선언했죠. <b>“1년 360일, 어느 날에도 낳을 수 없다.”</b>" },
        { cap: "달과의 내기", art: "wager", say: "지혜의 신 <b>토트</b>가 나섰어요. 달과 내기를 벌여 달빛을 조금씩 따냈죠. 그 빛을 모아, 1년 어디에도 없던 <b>새로운 닷새</b>를 만들었어요." },
        { cap: "해 밖의 닷새", art: "five", say: "360일 밖의 닷새는 금지가 닿지 않는 날이었어요. 누트는 그 닷새 동안 하루에 하나씩 <b>다섯 아이</b>를 낳았죠. 그때부터 1년은 365일이 되었다고 해요." },
      ],
      facts: {
        title: "전설과 하늘",
        storyLabel: "이렇게 전해요",
        story: [
          "그리스 작가가 이집트 신화를 옮겨 적은 글 「이시스와 오시리스」에 전해요.",
          "다섯 아이는 오시리스·이시스·세트·네프티스, 그리고 큰 호루스라고 전해요.",
        ],
        recLabel: "실제 하늘에서는",
        rec: [
          "옛 이집트 달력은 30일짜리 열두 달에 닷새를 덧붙인 365일이었어요.",
          "밤하늘은 열흘마다 새로 떠오르는 별무리 36개로 나눴어요. 이게 데칸이에요. 36 × 10 = 360.",
          "데칸의 방은 당신의 생일이 속한 별무리를 찾아요.",
        ],
      },
      cta: { ask: "당신의 생일은<br />어느 별무리에?", sub: "생일 하나로 당신의 별무리를 찾아요", pill: "프로필 링크에서 네 번째 문 「데칸의 방」", next: "다음 기록 · 옥수수로 빚은 사람" },
    },
    // 5화 촐킨: 옥수수 사람 (키체 마야 『포폴 부』)
    tzolkin: {
      n: 4, ep: 5, name: "촐킨의 방", guide: "촐킨", origin: "마야의 전설",
      cover: { hook: "사람은 옥수수로<br />빚어졌다?", sub: "신들의 세 번째 시도, 마야의 전설", art: "tzolkinCover" },
      scenes: [
        { cap: "진흙 사람", art: "mud", say: "아주 먼 옛날, 신들은 자기 이름을 부르고 날을 세어 줄 누군가가 필요했어요. 처음엔 <b>진흙</b>으로 빚었죠. 하지만 물에 풀어져 버렸고, 말도 하지 못했어요." },
        { cap: "나무 사람", art: "wood", say: "다음엔 <b>나무</b>를 깎았어요. 걷고 말도 했지만, 마음도 기억도 없었죠. 큰비가 그들을 쓸어 갔고, 숲으로 달아난 이들은 원숭이가 되었다고 해요." },
        { cap: "옥수수 반죽", art: "maize", say: "마지막으로 신들은 <b>노란 옥수수와 흰 옥수수</b>를 찾아냈어요. 할머니 신이 아홉 번 갈아 반죽을 빚자, 비로소 첫 사람들이 태어났죠." },
        { cap: "너무 밝은 눈", art: "eyes", say: "첫 사람들의 눈은 너무 밝아 하늘 끝까지 다 보였어요. 신들은 거울에 입김을 불듯 그 눈을 살짝 흐렸죠. 그 뒤로 사람은 <b>가까운 것부터</b> 보게 되었대요." },
      ],
      facts: {
        title: "전설과 기록",
        storyLabel: "이렇게 전해요",
        story: [
          "과테말라 키체 마야의 책 『포폴 부』에 전해요. 16세기에 적은 글을 18세기에 옮겨 적은 판이 남아 있어요.",
          "신들이 사람을 만든 까닭은 ‘이름을 부르고 날을 세어 줄 이’가 필요해서였다고 해요.",
        ],
        recLabel: "기록으로 전하는 것",
        rec: [
          "촐킨은 숫자 13개와 날 이름 20개가 맞물려 도는 260일 달력이에요.",
          "과테말라 고원의 일부 마야 공동체는 지금도 이 날을 세어요.",
          "촐킨의 방은 당신의 생일이 260일 가운데 어느 날인지 찾아요.",
        ],
      },
      cta: { ask: "당신이 태어난 날,<br />촐킨에선 무슨 날?", sub: "생일로 260일 가운데 당신의 날을 찾아요", pill: "프로필 링크에서 다섯 번째 문 「촐킨의 방」", next: "다음 기록 · 자작나무에 새긴 첫 글자" },
    },
    // 6화 오검: 일곱 개의 B (중세 『오검 논고』·『학자들의 입문서』. 새긴 이는 판본에 따라 오그마로 전함)
    ogham: {
      n: 1, ep: 6, name: "오검의 방", guide: "오검", origin: "아일랜드 전설",
      cover: { hook: "첫 글자는<br />경고였다?", sub: "자작나무에 새긴 일곱 개의 B, 아일랜드 전설", art: "oghamCover" },
      scenes: [
        { cap: "말과 시의 신", art: "ogma", say: "아일랜드의 옛 신들 가운데 <b>오그마</b>는 말과 시에 가장 능한 신이었어요. 오그마는 배운 이들만 읽을 수 있는 글자를 만들었죠. 줄 하나에 곧은 획을 긋는 글자로요." },
        { cap: "일곱 개의 B", art: "sevenb", say: "그 글자로 처음 새긴 건 <b>자작나무</b> 위의 B, 그것도 일곱 번이었어요. 이 글을 받은 이는 빛의 신 <b>루</b>였다고 해요." },
        { cap: "자작나무의 경고", art: "sidh", say: "뜻은 이랬대요. <b>“자작나무가 지켜 주지 않으면, 그대의 아내는 일곱 번 요정의 언덕으로 끌려가리라.”</b> 첫 글자는 소중한 이를 지키라는 경고였어요." },
        { cap: "나무 이름 글자", art: "letters", say: "그 뒤로 오검의 글자는 하나하나 나무 이름을 얻었어요. B는 자작나무, L은 마가목, F는 오리나무… 그래서 오검을 <b>나무 글자</b>라고도 불러요." },
      ],
      facts: {
        title: "전설과 기록",
        storyLabel: "이렇게 전해요",
        story: [
          "중세 아일랜드의 문법책 『학자들의 입문서』와 그 안의 『오검 논고』에 전해요.",
          "글자마다 붙은 나무 이름 가운데 몇몇은 뜻이 분명하지 않아, 학자들의 풀이가 갈려요.",
        ],
        recLabel: "기록으로 전하는 것",
        rec: [
          "오검은 4~6세기 아일랜드와 영국 서부에서 돌기둥 모서리에 새긴 실제 글자예요.",
          "남은 비문 약 400개는 대부분 ‘누구의 아들 누구’ 같은 이름이에요.",
          "오검의 방은 당신의 이름을 한 소리씩 나무 글자로 새겨요.",
        ],
      },
      cta: { ask: "당신의 이름은<br />어떤 나무 글자로?", sub: "이름을 넣으면 한 획씩 새겨 드려요", pill: "프로필 링크에서 두 번째 문 「오검의 방」", next: "다음 기록 · 버려진 공주, 신이 되다" },
    },
    // 7화 만신: 바리데기 (서울·경기 진오귀굿 등의 무가 「바리공주」. 지역마다 줄거리가 다름). 안내자 말투 = 만신
    saju: {
      n: 0, ep: 7, name: "만신의 방", guide: "만신", origin: "한국의 무가",
      cover: { hook: "버려진 공주,<br />신이 되다", sub: "저승 끝까지 다녀온 바리데기, 한국의 무가", art: "sajuCover" },
      scenes: [
        { cap: "일곱째 공주", art: "seventh", say: "옛날 오구대왕은 딸만 여섯을 두었는디, 일곱째도 딸이었네. 서운한 왕은 그 아이를 상자에 담아 물에 띄워 보냈지. 버린 아이라, 이름이 <b>바리</b>여." },
        { cap: "아무도 가지 않는 길", art: "road", say: "세월이 흘러 왕이 큰 병에 들었네. 약은 저승 너머 <b>서천서역국</b>의 약수뿐. 여섯 언니는 다 고개를 저었는디, 바리가 나섰지. 저를 버린 부모를 위해서 말이여." },
        { cap: "약수와 꽃", art: "flowers", say: "바리는 험한 길을 건너, 약수를 지키는 이 곁에서 오랜 세월 물 긷고 나무하며 지냈네. 그 끝에 <b>약수</b>와 <b>생명의 꽃</b>을 얻어 돌아왔지." },
        { cap: "넋의 길잡이", art: "guide", say: "바리는 그 꽃과 물로 부모를 다시 일으켰다네. 그 뒤로 <b>떠나는 넋의 길을 밝히는 신</b>이 되었지. 무당들이 첫 조상으로 모시는 신이 바로 바리여." },
      ],
      facts: {
        title: "전설과 기록",
        storyLabel: "이렇게 전해요",
        story: [
          "굿에서 무당이 부르는 노래, 무가 「바리공주」로 전해요. 지역마다 줄거리가 조금씩 달라요.",
          "서울·경기에서는 떠난 이를 좋은 곳으로 보내는 굿에서 이 노래를 불러요.",
        ],
        recLabel: "기록으로 전하는 것",
        rec: [
          "오랫동안 입에서 입으로 전해졌고, 20세기에 들어 글로 채록되었어요.",
          "‘만신’은 무당을 높여 부르는 말이에요.",
          "만신의 방은 생년월일과 태어난 시각으로 사주 여덟 글자를 읽어요.",
        ],
      },
      cta: {
        ask: "당신이 타고난<br />그릇은 어떤 모양?", sub: "생년월일과 태어난 시각으로 읽어요", pill: "프로필 링크에서 첫 번째 문 「만신의 방」", next: "일곱 문의 기록, 여기까지",
        follow: { head: "팔로우하고 새 기록 받기", body: "일곱 점술의 또 다른 전설로 다시 찾아올게요" },
      },
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
    page.innerHTML = `${head}<p class="eyebrow2">문 너머의 기록 · ${E.ep}화</p><svg class="art art-cover" viewBox="0 0 560 560">${ART[E.cover.art]()}</svg>
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
    page.innerHTML = `${head}<svg class="art art-cta" viewBox="0 0 560 560">${ART[E.cover.art]()}</svg>
      <div class="mid"><p class="ask">${E.cta.ask}</p><p class="sub">${E.cta.sub}</p><p class="pill">${E.cta.pill}</p><div class="follow"><b>${(E.cta.follow || FOLLOW).head}</b><span>${(E.cta.follow || FOLLOW).body}</span><span class="nx">${E.cta.next}</span></div></div>${SEAL}`;
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
