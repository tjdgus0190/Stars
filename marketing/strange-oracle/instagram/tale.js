// (2026-11-22) 자동 게시 전설 캐러셀 그리기. tales/<편>.js의 window.TALE을 읽어 p쪽을 그린다(1 = 표지, 2.. = 장면, 마지막 = 끝).
// TALE = { room, eyebrow, hook(html), sub, cover: { img, pos, grade }, slides: [{ img, pos, grade, text(html), note }], end: { ask(html), line, img } }
// 그림 경로는 저장소 루트 기준(예: /marketing/strange-oracle/scenes/legend/art/rune-goblet-cole.jpg). 글자 html에는 <em>(금빛)·<span class="red">·<br>만 쓴다.
(function () {
  const T = window.TALE;
  const box = document.querySelector("[data-js=tale]");
  const ROOMS = { saju: ["Ⅰ", "만신의 방", 30, "첫 번째 문"], ogham: ["Ⅱ", "오검의 방", 150, "두 번째 문"], star: ["Ⅲ", "베다의 방", 260, "세 번째 문"], decan: ["Ⅳ", "데칸의 방", 70, "네 번째 문"], tzolkin: ["Ⅴ", "촐킨의 방", 190, "다섯 번째 문"], rune: ["Ⅵ", "룬의 방", 230, "여섯 번째 문"], sibyl: ["Ⅶ", "시빌라의 방", 320, "일곱 번째 문"] };
  const R = ROOMS[T.room] || ROOMS.sibyl;
  const pages = 1 + T.slides.length + 1;
  window.TALE_PAGES = pages;
  const p = Math.max(1, Math.min(pages, Number(new URLSearchParams(location.search).get("p")) || 1));
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = (s) => String(s == null ? "" : s); // 편 파일은 저장소 안 문구(em·br·span.red만)
  box.style.setProperty("--h", R[2]);
  const bg = (o) => `<div class="bg" style="background-image:url('${o.img}');${o.pos ? `--pos:${o.pos};` : ""}${o.grade ? `--grade:${o.grade};` : ""}"></div><div class="tint"></div><div class="shade"></div>`;
  const head = `<p class="room"><i>${R[0]}</i>${esc(R[1])}</p><p class="count">${p} / ${pages}</p>`;
  if (p === 1) {
    box.classList.add("is-cover");
    box.innerHTML = bg(T.cover) + head + `<p class="eyebrow">${esc(T.eyebrow)}</p><h1 class="hook">${html(T.hook)}</h1><p class="sub">${esc(T.sub)}</p><p class="swipe">넘겨서 보기 →</p>`;
  } else if (p === pages) {
    box.classList.add("is-end");
    box.innerHTML = bg(T.end.img ? { img: T.end.img } : T.cover) + head + `<h2 class="ask">${html(T.end.ask)}</h2><p class="askline">${esc(T.end.line || "댓글로 알려 주세요")}</p>
      <p class="brand"><small>STRANGE ORACLE</small><b>낯선 점술관</b><span>${esc(R[0] + " " + R[1])} · 프로필 링크에서 ${esc(R[3])}</span></p><p class="follow">팔로우하면 매일 저녁 7시, 점술에 숨은 이야기가 찾아가요</p>`;
  } else {
    const s = T.slides[p - 2];
    box.innerHTML = bg(s) + head + `<p class="text">${html(s.text)}</p>${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}`;
  }
})();
