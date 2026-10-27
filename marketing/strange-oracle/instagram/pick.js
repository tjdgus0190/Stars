// "셋 중 하나" 캐러셀 (2026-10-27, 화면 표기는 "오늘의 신탁" — 운영자: '골라 봐' 표현은 쓰지 않는다). pick.html?set=<묶음>&p=<쪽>. 쪽 구성: 표지(셋 중 하나 고르기) → ①②③ 답 → 끝(댓글·팔로우).
// 답 쪽: 이름·제목·첫 두 문장(key)은 제품 공개 데이터 그대로, word = "이번 주 한마디"(실천할 수 있는 긍정 문장, 운영 규칙 8장).
(() => {
  const W = window;
  const SETS = {
    rune: {
      room: "rune", n: 5, name: "룬의 방", kind: "stone",
      ask: "주머니에서<br />돌 하나를 골라 보세요", sub: "마음이 먼저 가는 번호가, 이번 주 당신의 돌이에요",
      picks: [
        { code: "sowilo", word: "이번 주엔 칭찬 하나를 화제 돌리지 말고 ‘고마워’ 한마디로 그대로 받아 보세요." },
        { code: "raidho", word: "멀리 못 떠나도 괜찮아요. 늘 가던 길 하나만 바꿔 걸어 보세요." },
        { code: "berkano", word: "이번 주엔 남보다 먼저, 나에게 쉬는 시간 하나를 챙겨 주세요." },
      ],
      item: (c) => { const r = W.RUNES.find((x) => x.code === c); return { sym: `rune-${c}`, name: r.name, lat: r.latin, title: r.keyword, key: r.key }; },
      more: "나에게 놓일 진짜 세 개의 돌은",
    },
    sibyl: {
      room: "sibyl", n: 6, name: "시빌라 신탁의 방", kind: "scroll",
      ask: "두루마리 하나를<br />뽑아 보세요", sub: "숨을 한 번 고르고, 손이 먼저 가는 쪽으로",
      picks: [
        { i: 6, word: "이미 알고 있는 답 하나를, 오늘은 소리 내어 말해 보세요." },
        { i: 7, word: "고쳐 쓰던 메시지 하나, 이번엔 그대로 보내 봐도 괜찮아요." },
        { i: 8, word: "마음이 흔들리면 기다리지 말고, 먼저 안부 한 줄을 건네 보세요." },
      ],
      item: (c, p) => { const o = W.ORACLES[p.i]; return { icon: "sibyl", title: o.title, line: o.line, key: o.key }; },
      more: "지금 내 고민에 닿을 신탁은",
    },
    ogham: {
      room: "ogham", n: 1, name: "오검의 방", kind: "tree",
      ask: "마음 가는 나무<br />하나를 골라 보세요", sub: "1,500년 전 아일랜드 돌에 새긴 나무 글자",
      picks: [
        { code: "beith", tree: "자작나무", word: "새로 벌이기 전에, 시작해 둔 것 하나에 한 걸음만 더 머물러 보세요." },
        { code: "dair", tree: "참나무", word: "힘든 날엔 ‘조금 버거워’ 한마디를 가까운 사람에게 먼저 건네 보세요." },
        { code: "coll", tree: "개암나무", word: "궁금했던 것 하나를 이번 주엔 끝까지 파 보세요. 그 집요함이 당신의 무기예요." },
      ],
      item: (c, p) => { const o = W.OGHAM.find((x) => x.code === c); return { sym: `ogham-${c}`, tall: true, name: o.name, lat: o.latin, tree: p.tree, title: o.title, key: o.key }; },
      more: "내 이름에 숨은 진짜 나무는",
    },
    star: {
      room: "star", n: 2, name: "베다의 방", kind: "moon",
      ask: "오늘 밤 끌리는<br />달 하나를 골라 보세요", sub: "베다 점성술의 달의 집 스물일곱 가운데 셋",
      picks: [
        { code: "rohini", word: "바꾸지 않는 그 마음, 이번 주엔 나 자신에게도 한결같이 써 보세요." },
        { code: "punarvasu", word: "다시 믿어 주는 마음은 그대로 두고, 나를 지킬 선 하나만 그어 보세요." },
        { code: "revati", word: "상상 속 쉼터도 괜찮아요. 다만 오늘 할 일 하나만은 현실에서 끝내 보세요." },
      ],
      item: (c) => { const s = W.NAKSHATRAS.find((x) => x.code === c); return { icon: "star", name: s.name, lat: s.sanskrit, title: s.title, key: s.key }; },
      more: "내가 태어난 밤의 진짜 달의 집은",
    },
  };
  const NUM = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];
  const CIR = ["①", "②", "③"];
  const JOSA = ["을", "를", "을"]; // 일을 · 이를 · 삼을
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const q = new URLSearchParams(location.search);
  const key = q.get("set") || "rune";
  const S = SETS[key];
  const total = 5;
  const p = Math.min(Math.max(0, +q.get("p") || 0), total - 1);
  W.__total = total;

  const page = document.getElementById("page");
  page.dataset.room = S.room;
  page.classList.add("pk", `pk-${S.kind}`);
  page.style.backgroundImage = `url(out/v2/bg/${p % 2 ? "void-b" : "void-a"}.png)`;
  const head = `<p class="brand">낯선 점술관</p><p class="page">${p + 1} / ${total}</p><p class="tag"><i>${NUM[S.n]}</i>${S.name} · 오늘의 신탁</p>`;
  const items = S.picks.map((pk) => Object.assign(S.item(pk.code, pk), { word: pk.word }));
  const mark = (it) => it.sym ? `<svg class="pk-sym${it.tall ? " tall" : ""}" viewBox="${it.tall ? "0 0 40 80" : "0 0 40 60"}"><use href="#${it.sym}" /></svg>` : `<svg class="sig"><use href="#i-${it.icon}" /></svg>`;

  if (p === 0) {
    page.classList.add("pk-cover");
    page.innerHTML = `${head}<p class="h ask">${S.ask}</p><div class="three">${items.map((it, i) => `<div class="obj"><div class="shape s${i}">${S.kind === "tree" ? `<span class="tr">${esc(it.tree)}</span>` : `<span class="qm">?</span>`}</div><p class="no">${CIR[i]}</p></div>`).join("")}</div><p class="sub">${S.sub}</p><p class="foot next-hint">번호를 정했다면 넘겨 보세요 →</p>`;
  } else if (p <= 3) {
    const it = items[p - 1];
    page.classList.add("pk-ans");
    page.innerHTML = `${head}<p class="pick">${CIR[p - 1]}${JOSA[p - 1]} 골랐다면</p><div class="em">${mark(it)}</div>
      ${it.name ? `<p class="nm">${esc(it.name)}${it.lat ? `<span class="lat">${esc(it.lat)}</span>` : ""}${it.tree ? `<span class="lat">· ${esc(it.tree)}</span>` : ""}</p>` : ""}
      <p class="ti">${esc(it.title)}</p>${it.line ? `<p class="ln">“${esc(it.line)}”</p>` : ""}<p class="ky">${esc(it.key)}</p>
      <div class="word"><span>이번 주 한마디</span><p>${esc(it.word)}</p></div>`;
  } else {
    page.classList.add("pk-cta");
    page.innerHTML = `${head}<div class="mid"><p class="h ask2">몇 번을 골랐나요?</p><p class="sub2">댓글에 번호만 남겨 주세요 ${CIR.join(" ")}</p>
      <div class="more"><p>${S.more}</p><b>프로필 링크 · 낯선 점술관</b></div>
      <p class="fl">팔로우하면 다음 신탁이 계속 열려요</p><p class="hd">@strange_oracle_off</p></div>`;
  }

  W.__ready = (async () => {
    if (page.querySelector('use[href^="#rune-"], use[href^="#ogham-"]')) {
      const html = await (await fetch("../../../products/strange-oracle/index.html")).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      doc.querySelectorAll('symbol[id^="ogham-"], symbol[id^="rune-"]').forEach((s) => svg.appendChild(document.importNode(s, true)));
      document.getElementById("defs").appendChild(svg);
    }
    await document.fonts.ready;
    const last = page.querySelector(".word, .mid, .sub");
    W.__overflow = last ? Math.round(last.getBoundingClientRect().bottom) - 1350 + 60 : 0;
  })();
})();
