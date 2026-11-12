// 광고 9안 「새해 첫 장」 조립 (2026-11-12, 운영자 "다른 광고와 같은 연출·소리라 진부 → 새해 분위기에 맞게 포맷을 바꿔"). 15초.
// 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다(렌더 도구가 currentTime으로 프레임을 고름). 무작위 값 없음.
// 문구: 달 이름표는 제품 신년운세 만신의 방 달 이름(data.js ny.tenGods), 방 이름·비추는 면은 data.js ny.rooms.*.lens와 같은 말. 재물·건강 약속·정확도 과장·불안 재촉 없음.
// 열두 장의 빛남·쉼 배치는 견본(특정인의 결과 아님).
(function () {
  const T = { title: 0.25, flip: 1.45, sea: 3.0, months: 6.2, stamp: 8.75, seals: 10.4, end: 12.6, dur: 15 };
  const SIG = [
    "M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6",
    "M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20",
    "M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z",
    "M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30",
    "M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5",
    "M14 3V37M14 14L28 5M14 23L28 14",
    "M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20",
  ];
  const ROOMS = [["만신", "일과 자리"], ["오검", "뿌리와 바탕"], ["베다", "마음과 관계"], ["데칸", "재능과 표현"], ["촐킨", "리듬과 순환"], ["룬", "한 해의 열쇠"], ["시빌라", "내가 고른 질문"]];
  const SEAL_POS = [[240, 560], [440, 560], [640, 560], [840, 560], [320, 870], [540, 870], [760, 870]];
  const MONTHS = ["받쳐 주는 달", "나란히 서는 달", "만들어 내는 달", "단련하는 달", "말이 트이는 달", "넓게 벌이는 달", "손에 잡히는 달", "말이 트이는 달", "받쳐 주는 달", "자리가 서는 달", "나눠 쓰는 달", "나란히 서는 달"];
  const BRIGHT = [2, 6, 9], REST = [3, 10];
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (el, list) => { el.style.animation = list.join(", "); return el; };
  const stage = document.querySelector(".stage");
  const sea = stage.querySelector(".sea");
  const grain = stage.querySelector(".grain");
  const add = (el) => (stage.insertBefore(el, grain), el);
  const layer = (from, to, out = "fade-out") => anim($("div", "layer"), [`fade-in 0.35s ease-out ${from}s both`, `${out} 0.35s ease-in ${to - 0.35}s forwards`]);
  // 한 줄씩 붓으로 쓰기
  const brushLines = (cls, top, lines, at, gap = 0.42, dur = 0.75) => {
    const p = $("p", "cap " + cls);
    p.style.top = top + "px";
    lines.forEach((html, i) => {
      const sp = $("span", "wipe", html);
      anim(sp, [`brush ${dur}s cubic-bezier(0.4, 0, 0.3, 1) ${at + i * gap}s both`]);
      p.append(sp);
    });
    return p;
  };

  // ── A. 0~3.0 탁상 달력: 2026년 12월 31일 → 넘기면 2027년 1월 1일
  const A = add(anim($("div", "layer"), [`fade-out 0.35s ease-in ${T.sea - 0.25}s forwards`])); // 첫 프레임부터 달력이 보이게(피드 첫 장면)
  A.append(brushLines("cap--brush", 320, ["새해 첫 장,", "<em>넘겨 볼까요</em>"], T.title, 0.5, 0.8));
  const cal = $("div", "cal");
  const pNew = $("div", "cal__page is-new", `<span class="y">2027</span><span class="d">1</span><span class="m">1월 · 정미년 첫날</span><span class="s">새해 첫 장</span><span class="seal-mini">丁未</span>`);
  anim(pNew.querySelector(".seal-mini"), [`stamp 0.4s var(--soft) ${T.flip + 0.75}s both`]);
  const pOld = $("div", "cal__page", `<span class="y">2026</span><span class="d">31</span><span class="m">12월 · 섣달 그믐</span><span class="s">병오년의 마지막 날</span>`);
  anim(pOld, [`flip-up 0.75s cubic-bezier(0.45, 0, 0.25, 1) ${T.flip}s both`, `page-shade 0.75s linear ${T.flip}s both`]);
  cal.append(pNew, pOld, $("div", "cal__stand"));
    A.append(cal);

  // ── B. 3.0~6.2 첫 해돋이: 바다 수평선에서 해가 오르고 하늘이 데워진다
  anim(sea, [`fade-in 0.5s ease-out ${T.sea - 0.15}s both`, `fade-out 0.4s ease-in ${T.months - 0.25}s forwards`]);
  const sky2 = $("div", "sea__sky2");
  sea.querySelector(".sea__sky").after(sky2);
  anim(sky2, [`sky-warm 2.8s ease-in-out ${T.sea}s both`]);
  anim(sea.querySelector(".sea__sun"), [`sunrise 3.4s cubic-bezier(0.3, 0.1, 0.3, 1) ${T.sea - 0.2}s both`]);
  anim(sea.querySelector(".sea__glint"), [`glint 2.4s linear ${T.sea + 0.8}s both`]);
  sea.append(brushLines("cap--line", 360, ["2027년,", "나에게 가장", "<b>빛나는 달</b>은 언제일까요"], T.sea + 0.35, 0.5, 0.7));

  // ── C. 6.2~10.4 열두 장: 달력 낱장이 한 장씩 놓이고 달마다 이름표 → 빛나는 달에 붉은 낙관, 쉬어 가는 달에 회색 표
  const C = add(layer(T.months, T.seals + 0.05, "drift-out"));
  C.append(brushLines("cap--line", 310, ["달마다 나에게 붙는", "<b>이름</b>이 달라요"], T.months + 0.1, 0.45, 0.7));
  const grid = $("div", "months");
  MONTHS.forEach((tag, i) => {
    const c = $("div", "mcard", `<span class="n">${i + 1}<small>월</small></span><span class="tag">${tag}</span>`);
    const list = [`deal 0.42s var(--soft) ${T.months + 0.45 + i * 0.13}s both`];
    const b = BRIGHT.indexOf(i), r = REST.indexOf(i);
    if (b > -1) {
      const at = T.stamp + b * 0.36;
      c.append(anim($("span", "mark", "빛"), [`stamp 0.38s var(--soft) ${at}s both`]));
      list.push(`glow-card 0.3s ease-out ${at + 0.15}s forwards`);
    }
    if (r > -1) {
      const at = T.stamp + 1.15 + r * 0.22;
      c.append(anim($("span", "mark rest", "쉼"), [`stamp 0.34s var(--soft) ${at}s both`]));
      list.push(`dim-card 0.4s ease-out ${at + 0.1}s forwards`);
    }
    anim(c, list);
    grid.append(c);
  });
  C.append(grid);

  // ── D. 10.4~12.6 일곱 낙관: 방마다 붉은 도장이 찍히고, 그 방이 비추는 면
  const D = add(layer(T.seals, T.end + 0.05, "drift-out"));
  D.append(brushLines("cap--line", 310, ["일곱 점술이 비추는", "<b>일곱 개의 2027년</b>"], T.seals + 0.1, 0.45, 0.7));
  const seals = $("div", "seals");
  ROOMS.forEach(([nm, ln], i) => {
    const s = $("div", "sealr");
    s.style.left = SEAL_POS[i][0] - 95 + "px";
    s.style.top = SEAL_POS[i][1] + "px";
    const at = T.seals + 0.55 + i * 0.17;
    const ring = anim($("span", "ring", `<svg viewBox="0 0 40 40"><path d="${SIG[i]}"/></svg>`), [`stamp 0.36s var(--soft) ${at}s both`]);
    s.append(ring, anim($("span", "nm", nm), [`fade-in 0.3s ease-out ${at + 0.15}s both`]), anim($("span", "ln", ln), [`fade-in 0.3s ease-out ${at + 0.25}s both`]));
    seals.append(s);
  });
  D.append(seals);

  // ── E. 12.6~15 연하장: 2027 신년운세 · 낯선 점술관 · 새해의 회랑 · 처음 고르는 두 방은 무료 · [새해 첫 장 넘기기]
  const E = add(anim($("div", "endc"), [`fade-in 0.4s ease-out ${T.end}s both`]));
  E.append($("p", "yr", "2027 · 정미년"));
  const title = $("p", "title", `<span class="wipe" style="display:inline-block">신년<em>운세</em></span>`);
  anim(title.querySelector(".wipe"), [`brush 0.95s cubic-bezier(0.4, 0, 0.3, 1) ${T.end + 0.15}s both`]);
  E.append(title);
  E.append(anim($("p", "brand", "낯선 점술관<i>·</i>새해의 회랑"), [`rise 0.45s var(--soft) ${T.end + 0.95}s both`]));
  E.append(anim($("p", "free", "처음 고르는 두 방은 무료"), [`stamp 0.4s var(--soft) ${T.end + 1.3}s both`]));
  E.append(anim($("p", "cta", "새해 첫 장 넘기기"), [`rise 0.45s var(--soft) ${T.end + 1.65}s both`]));
})();
