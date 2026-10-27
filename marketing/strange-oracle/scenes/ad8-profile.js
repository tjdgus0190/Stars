// 광고 8안 「일곱 문의 점술관」 조립 (2026-10-27). 15초, 가격 없음. 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다. 무작위 값 없음.
(function () {
  const T = { hook: 0, rooms: 2.8, same: 6.2, feed: 9.4, end: 12.8, dur: 15 };
  const SIG = [
    "M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6",
    "M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20",
    "M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z",
    "M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30",
    "M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5",
    "M14 3V37M14 14L28 5M14 23L28 14",
    "M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20",
  ];
  const ROOMS = [["Ⅰ", "만신의 방", "한국 · 사주"], ["Ⅱ", "오검의 방", "켈트 · 나무 문자"], ["Ⅲ", "베다의 방", "인도 · 달의 집"], ["Ⅳ", "데칸의 방", "이집트 · 별시계"], ["Ⅴ", "촐킨의 방", "마야 · 260일 달력"], ["Ⅵ", "룬의 방", "북유럽 · 룬 문자"], ["Ⅶ", "시빌라의 방", "로마 · 신탁"]];
  // 프로필에 실제로 올린 캐러셀 표지(인스타그램 자료 instagram/out/)
  const TILES = ["types/saju-01.jpg", "types/ogham-01.jpg", "pick/rune-01.jpg", "types/star-01.jpg", "pick/sibyl-01.jpg", "types/decan-01.jpg"];
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const win = (el, inName, at, out, inDur = 0.55) => anim(el, [`${inName} ${inDur}s var(--ease-out) ${at}s both`].concat(out != null ? [`out-up 0.35s ease-in ${out - 0.35}s forwards`] : []));
  const stage = document.querySelector(".stage");
  const world = stage.querySelector(".world");
  const STEP = (T.same - T.rooms) / ROOMS.length;
  const HITS = [T.hook + 0.3, T.same + 0.15, T.feed + 0.1, T.end];
  anim(world, HITS.map((t) => `shake 0.55s linear ${t + 0.2}s`).concat(ROOMS.map((_, i) => `shake-soft 0.35s linear ${T.rooms + i * STEP + 0.05}s`)));
  anim(stage.querySelector(".flash"), HITS.map((t) => `flash 0.45s ease-out ${t + 0.2}s`).concat(ROOMS.map((_, i) => `flash-soft 0.35s ease-out ${T.rooms + i * STEP + 0.05}s`)));

  // 0~2.8 일곱 문 + 질문
  const seven = $("div", "seven a8-seven");
  SIG.forEach((d, i) => { const sp = $("span", "", `<svg viewBox="0 0 40 40"><path d="${d}"/></svg>`); anim(sp, [`seven-on 0.5s var(--ease-out) ${0.15 + i * 0.16}s both`]); seven.append(sp); });
  win(seven, "in-fade", 0, T.rooms, 0.3);
  world.append(seven);
  world.append(win($("p", "t hook a8-hook", "당신을 읽는 점술이<br><em>일곱 개</em>라면?"), "in-slam", T.hook + 0.3, T.rooms, 0.6));
  // 2.8~6.2 일곱 방이 하나씩
  ROOMS.forEach(([n, name, og], i) => {
    const r = $("div", "a8-room");
    r.append($("div", "em", `<svg viewBox="0 0 40 40"><path d="${SIG[i]}"/></svg>`), $("p", "nm", `<i>${n}</i>${name}`), $("p", "og", og));
    anim(r, [`a8-flick ${STEP + 0.02}s linear ${T.rooms + i * STEP}s both`]);
    world.append(r);
  });
  // 6.2~9.4 같은 나를 일곱 문화가
  world.append(win($("p", "t hook a8-same", "같은 나를,<br><em>일곱 문화</em>가<br>각자의 방식으로"), "in-slam", T.same + 0.15, T.feed, 0.6));
  // 9.4~12.8 프로필 격자
  const feed = $("div", "a8-feed");
  feed.append($("p", "cap", "프로필에 하나씩<br><em>쌓이고 있어요</em>"));
  const grid = $("div", "a8-grid");
  TILES.forEach((src, i) => { const b = $("b"); b.style.backgroundImage = `url(../instagram/out/${src})`; anim(b, [`a8-tile 0.45s var(--ease-out) ${T.feed + 0.35 + i * 0.14}s both`]); grid.append(b); });
  feed.append(grid);
  const tags = $("div", "tags");
  ["방마다 유형 정리", "오늘의 신탁", "일곱 방 소개 릴스"].forEach((t, i) => tags.append(anim($("span", "", t), [`in-rise 0.4s var(--ease-out) ${T.feed + 1.4 + i * 0.25}s both`])));
  feed.append(tags);
  win(feed, "in-fade", T.feed, T.end, 0.3);
  world.append(feed);
  // 12.8~15 끝
  const end = $("div", "end a8-end");
  end.append($("p", "end__eyebrow", "SEVEN ORACLES · ONE STORY"), $("p", "logo end__logo", "낯선 점술관"), $("p", "handle", "@strange_oracle_off"), $("p", "end__lead", "일곱 문화의 점술이 같은 나를 읽어요"), $("p", "end__cta", "프로필에서 일곱 문 둘러보기"), $("p", "end__sub", "팔로우하면 새 신탁이 계속 열려요"));
  anim(end.querySelector(".end__logo"), [`logo-shimmer 1.6s ease-in-out ${T.end + 0.5}s both`]);
  win(end, "in-fade", T.end, undefined, 0.5);
  stage.append(end);
})();
