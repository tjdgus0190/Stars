// 광고 9안 「새해의 문」 조립 (2026-11-12). 15초. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다(렌더 도구가 currentTime으로 프레임을 고름). 무작위 값 없음.
// 문구: 방 이름·비추는 면은 제품(products/strange-oracle/data.js ny.rooms.*.lens)과 같은 말. 재물·건강 주장·정확도 과장·불안 재촉 없음
(function () {
  const T = { hook: 0, doors: 2.6, big: 6.4, open: 6.95, plunge: 7.55, warm: 8.15, months: 8.75, bright: 10.3, end: 12.2, dur: 15 };
  // 일곱 방 문장(7안과 같은 그림): 만신·오검·베다·데칸·촐킨·룬·시빌라
  const SIG = [
    "M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6",
    "M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20",
    "M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z",
    "M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30",
    "M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5",
    "M14 3V37M14 14L28 5M14 23L28 14",
    "M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20",
  ];
  const ROOMS = [
    { nm: "만신", ln: "일과 자리", h: 18 }, { nm: "오검", ln: "뿌리와 바탕", h: 150 }, { nm: "베다", ln: "마음과 관계", h: 295 }, { nm: "데칸", ln: "재능과 표현", h: 65 },
    { nm: "촐킨", ln: "리듬과 순환", h: 190 }, { nm: "룬", ln: "한 해의 열쇠", h: 230 }, { nm: "시빌라", ln: "내가 고른 질문", h: 35 },
  ];
  const POS = [[240, 520], [440, 520], [640, 520], [840, 520], [320, 890], [540, 890], [760, 890]]; // 문 가운데 x, 위 y (글자 칸 x 140~940, y 270~1248 안)
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const win = (el, inName, at, out, inDur = 0.55) => anim(el, [`${inName} ${inDur}s var(--ease-out) ${at}s both`].concat(out != null ? [`out-up 0.35s ease-in ${out - 0.35}s forwards`] : []));
  const stage = document.querySelector(".stage");
  const world = stage.querySelector(".world");
  const HITS = [T.hook + 0.35, T.doors + 0.1, T.months + 0.15];
  anim(world, HITS.map((t) => `shake-soft 0.5s linear ${t + 0.2}s`));
  anim(stage.querySelector(".flash"), HITS.map((t) => `flash-soft 0.45s ease-out ${t + 0.2}s`).concat([`flash-soft 0.6s ease-out ${T.end}s`]));

  // 0~2.6 새벽 + 질문
  world.append(win($("p", "t hook a9-hook", "2027년,<br>나의 새해는<br><em>어느 문 뒤에</em>?"), "in-slam", T.hook + 0.35, T.doors, 0.6));

  // 2.6~6.4 일곱 문: 하나씩 불이 켜지고, 그 방이 비추는 면이 붙는다
  world.append(win($("p", "t hook a9-cap", "일곱 개의 문,<br><em>일곱 개의 2027년</em>"), "in-slam", T.doors + 0.1, T.big, 0.6));
  const doors = $("div", "a9-doors");
  ROOMS.forEach((r, i) => {
    const d = $("div", "a9-door");
    d.style.left = POS[i][0] - 95 + "px";
    d.style.top = POS[i][1] + "px";
    d.style.setProperty("--dh", r.h);
    const fr = $("div", "fr");
    fr.append($("span", "lf l"), $("span", "lf r"), $("span", "ic", `<svg viewBox="0 0 40 40"><path d="${SIG[i]}"/></svg>`));
    const at = T.doors + 0.5 + i * 0.42;
    anim(fr, [`a9-glow 0.5s ease-out ${at}s both`]);
    anim(fr.querySelector(".l"), [`a9-ajar-l 0.6s var(--ease-out) ${at}s both`]);
    anim(fr.querySelector(".r"), [`a9-ajar-r 0.6s var(--ease-out) ${at}s both`]);
    anim(d, [`a9-lit 0.6s var(--ease-out) ${at}s both`]);
    const ln = anim($("span", "ln", r.ln), [`a9-pill 0.4s var(--ease-out) ${at + 0.12}s both`]);
    d.append(fr, $("span", "nm", r.nm), ln);
    doors.append(d);
  });
  win(doors, "in-fade", T.doors, T.big, 0.35);
  world.append(doors);

  // 6.4~8.9 문 하나가 크게 → 활짝 열림 → 빨려 들어감 → 따뜻한 새벽빛이 번졌다 걷힘
  world.append(win($("p", "t hook a9-cap", "마음 가는 문을<br><em>골라 들어가요</em>"), "in-slam", T.big + 0.05, T.plunge + 0.1, 0.55));
  const big = $("div", "a9-big");
  const bf = $("div", "fr");
  bf.append(anim($("span", "lf l"), [`a9-open-l 0.6s cubic-bezier(0.5, 0, 0.3, 1) ${T.open}s both`]), anim($("span", "lf r"), [`a9-open-r 0.6s cubic-bezier(0.5, 0, 0.3, 1) ${T.open}s both`]));
  big.append(bf);
  anim(big, [`in-rise 0.45s var(--ease-out) ${T.big}s both`, `a9-plunge 0.75s cubic-bezier(0.55, 0, 0.75, 0.4) ${T.plunge}s both`, `out-fade 0.2s linear ${T.warm + 0.1}s forwards`]);
  world.append(big);
  world.append(anim($("div", "a9-streaks"), [`a9-streak 0.9s ease-out ${T.plunge + 0.15}s both`]));
  stage.append(anim($("div", "a9-warm"), [`a9-warm 1.0s ease-in-out ${T.warm - 0.15}s both`]));

  // 8.9~12.2 열두 달: 칸이 깔리고, 빛나는 달이 차례로 켜진다
  world.append(win($("p", "t hook a9-cap", "열두 달 가운데<br><em>빛나는 때</em>와 쉬어 갈 때"), "in-slam", T.months + 0.05, T.end, 0.6));
  const cal = $("div", "a9-cal");
  const BRIGHT = [2, 4, 6, 9], REST = [3, 7];
  for (let m = 0; m < 12; m++) {
    const c = $("b", REST.includes(m) ? "rest" : "", `${m + 1}월<i></i>`);
    const list = [`a9-cell 0.4s var(--ease-out) ${T.months + 0.35 + m * 0.07}s both`];
    const k = BRIGHT.indexOf(m);
    if (k > -1) {
      list.push(`a9-bright 0.55s var(--ease-out) ${T.bright + k * 0.28}s forwards`);
      anim(c.querySelector("i"), [`a9-bright-dot 0.4s ease-out ${T.bright + k * 0.28}s forwards`]);
    }
    if (REST.includes(m)) list.push(`a9-rest 0.5s ease-out ${T.bright + 1.2}s forwards`);
    anim(c, list);
    cal.append(c);
  }
  win(cal, "in-fade", T.months, T.end, 0.3);
  world.append(cal);
  world.append(win($("p", "a9-legend", "<span><i></i>빛나는 때</span><span><i></i>쉬어 가는 때</span>"), "in-rise", T.bright + 1.0, T.end, 0.45));

  // 12.2~15 끝
  const end = $("div", "end a9-end");
  end.append($("p", "end__eyebrow", "2027 · 정미년"), $("p", "logo end__logo", "낯선 점술관"), $("p", "end__lead", "새해의 회랑"), $("p", "a9-free", "처음 고르는 두 방은 무료"), $("p", "end__cta", "새해의 문 열어 보기"));
  anim(end.querySelector(".end__logo"), [`logo-shimmer 1.6s ease-in-out ${T.end + 0.5}s both`]);
  anim(end.querySelector(".a9-free"), [`a9-pill 0.45s var(--ease-out) ${T.end + 0.7}s both`]);
  win(end, "in-fade", T.end, undefined, 0.5);
  stage.append(end);
})();
