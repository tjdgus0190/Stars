// 방별 유형 캐러셀 (2026-10-27). types.html?room=<방>&p=<쪽>. 쪽 구성: 표지 → 이 방은? → 유형 쪽들 → 끝(프로필로).
// 유형 이름·설명은 제품 공개 데이터에서 읽는다. 아래 ROOMS의 문장은 방 소개 광고·릴스와 같은 사실만 쓴다(정확도 과장·"무료" 없음).
(() => {
  const W = window;
  const first = (s) => String(s || "").split(/(?<=[.?!])\s/)[0]; // 무료 결과 첫 문장 = 짧은 설명
  const NUM = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];
  const KO = ["첫째", "둘째", "셋째", "넷째"];
  const chunk = (a, sizes) => { const out = []; let i = 0; for (const n of sizes) { out.push(a.slice(i, i + n)); i += n; } return out; };

  const ROOMS = {
    saju: {
      n: 0, name: "만신의 방", origin: "한국 · 사주 명리", bg: "void-r",
      hook: "태어난 날의 하늘 글자,<br />자네는 어느 쪽이여?", sub: "사주의 일간 10가지 · 만신이 짚는 한 줄",
      what: "사주는 무엇일까?", lore: ["사주는 태어난 해·달·날·시를 여덟 글자로 적은 것이에요. 조선은 관상감에 명과학 관원을 두고 왕실의 길일을 이 학문으로 살폈어요.", "여덟 글자 가운데 태어난 날의 하늘 글자, <b>일간</b>이 바로 ‘나’예요. 갑·을·병·정·무·기·경·신·임·계, 열 가지예요."],
      how: "만신의 방에서는 생년월일(아는 경우 태어난 시각까지)로 여덟 글자를 세우고, 일간으로 타고난 그릇을 읽어요.",
      items: () => W.SAJU.stems.map((s) => ({ mark: s.hanja, name: s.name, title: s.title, desc: s.verdict && s.verdict.head ? s.verdict.head : first(s.key) })),
      pages: (a) => [[a.slice(0, 5), "하늘 글자 · 갑부터 무까지"], [a.slice(5), "하늘 글자 · 기부터 계까지"]],
      ask: "내 일간은?", need: "생년월일만 있으면 바로 찾을 수 있어요",
    },
    ogham: {
      n: 1, name: "오검의 방", origin: "켈트 · 나무 문자", bg: "void-b",
      hook: "이름에 숨은<br />나무 한 그루", sub: "켈트 오검 스무 글자 · 당신의 글자는?",
      what: "오검은 무엇일까?", lore: ["4~6세기 아일랜드와 브리튼 서쪽, 선돌 모서리에 획을 그어 새긴 옛 글자예요. 남은 비문은 대부분 ‘누구의 아들 누구’라는 이름이었다고 전해져요.", "스무 글자는 다섯 자씩 네 무리. 후대에는 글자마다 자작나무·참나무 같은 <b>나무</b>를 겹쳐 읽었어요."],
      how: "오검의 방에서는 이름의 소리를 따라 스무 글자 가운데 당신의 글자를 찾아요.",
      items: () => W.OGHAM.map((o) => ({ sym: `ogham-${o.code}`, tall: true, name: o.name, lat: o.latin, title: o.title, desc: first(o.key), g: o.aicme })),
      pages: (a) => [0, 1, 2, 3].map((g) => [a.filter((x) => x.g === g), `${KO[g]} 무리`]),
      ask: "내 이름의<br />오검 글자는?", need: "이름만 알면 바로 찾을 수 있어요",
    },
    star: {
      n: 2, name: "베다의 방", origin: "인도 · 베다 점성술", bg: "void-a",
      hook: "당신이 태어난 그 밤,<br />달은 어느 집에?", sub: "베다 점성술 · 달의 집 스물일곱",
      what: "달의 집이란?", lore: ["달은 약 27.3일에 하늘을 한 바퀴 돌아요. 인도의 베다 전통에서 자란 점성술(조티샤)은 그 길을 스물일곱 칸, <b>나크샤트라</b>로 나눴어요.", "인도에선 지금도 결혼 날과 궁합을 이 별로 맞춰 보곤 해요."],
      how: "베다의 방에서는 태어난 날과 시각으로, 그 순간 달이 머문 집을 찾아요.",
      items: () => W.NAKSHATRAS.map((s, i) => ({ mark: String(i + 1), name: s.name, title: s.title, desc: first(s.key) })),
      pages: (a) => chunk(a, [6, 6, 5, 5, 5]).map((x, i, all) => { const s = all.slice(0, i).reduce((t, y) => t + y.length, 0); return [x, `${s + 1}~${s + x.length}번째 집`]; }),
      ask: "내가 태어난 밤의<br />달의 집은?", need: "생일과 태어난 시각으로 찾을 수 있어요",
    },
    decan: {
      n: 3, name: "데칸의 방", origin: "이집트 · 별시계", bg: "void-b",
      hook: "같은 별자리인데<br />왜 나는 다를까?", sub: "이집트 별시계 · 서른여섯 데칸",
      what: "데칸은 무엇일까?", lore: ["고대 이집트는 밤하늘을 서른여섯 별 무리, <b>데칸</b>으로 나눠 시간을 쟀어요. 중왕국의 관 뚜껑에도 이 별시계를 그려 넣었죠.", "훗날 이 별 무리는 열두 별자리를 각각 앞·가운데·끝, 셋으로 나눈 자리가 됐어요."],
      how: "데칸의 방에서는 생일로 별자리 안의 세 칸 가운데 당신의 자리를 찾아요.",
      items: () => W.DECANS.map((d) => ({ mark: ["앞", "중", "끝"][d.part - 1], name: `${d.sign} ${["첫째", "둘째", "셋째"][d.part - 1]}`, title: d.title, desc: first(d.key), sign: d.sign })),
      pages: (a) => [0, 1, 2, 3, 4, 5].map((k) => { const x = a.slice(k * 6, k * 6 + 6); return [x, `${x[0].sign} · ${x[3].sign}`]; }),
      ask: "같은 별자리 안,<br />내 자리는?", need: "생일만 있으면 바로 찾을 수 있어요",
    },
    tzolkin: {
      n: 4, name: "촐킨의 방", origin: "마야 · 260일 달력", bg: "void-a",
      hook: "당신이 태어난 날에도<br />이름이 있다면?", sub: "마야 260일 달력 · 스무 날의 기호",
      what: "촐킨은 무엇일까?", lore: ["스무 개의 날 기호와 열세 개의 숫자가 맞물려 <b>260일</b>을 도는 마야의 신성한 달력이에요.", "과테말라 고원에선 지금도 ‘날을 지키는 이’가 이 순환을 이어 가요."],
      how: "촐킨의 방에서는 생일로 태어난 날의 기호와 숫자를 찾아요.",
      items: () => W.TZOLKIN_SIGNS.map((s, i) => ({ mark: String(i + 1), name: s.name, lat: s.latin, title: String(s.title).replace(new RegExp(`,\\s*${s.name}$`), ""), desc: first(s.key) })),
      pages: (a) => chunk(a, [5, 5, 5, 5]).map((x, i) => [x, `${i * 5 + 1}~${i * 5 + 5}번째 날`]),
      ask: "내가 태어난 날의<br />기호는?", need: "생일만 있으면 바로 찾을 수 있어요",
    },
    rune: {
      n: 5, name: "룬의 방", origin: "북유럽 · 룬 문자", bg: "void-b",
      hook: "돌 하나가<br />당신을 말한다면", sub: "북유럽 룬 스물네 개 · 당신은 어떤 돌?",
      what: "룬은 무엇일까?", lore: ["2세기 무렵부터 북유럽 사람들이 돌과 나무에 새긴 스물네 글자, <b>룬</b>이에요. 글자마다 불·얼음·태양·선물 같은 뜻을 품고 있어요.", "로마 역사가 타키투스는 표식을 새긴 나무 조각을 흩뿌려 점쳤다는 기록을 남겼어요."],
      how: "룬의 방에서는 주머니에서 돌 세 개를 꺼내 지나온 길·지금·다가올 것을 읽어요. 아래는 돌 하나하나가 말하는 사람이에요.",
      items: () => W.RUNES.map((r) => ({ sym: `rune-${r.code}`, name: r.name, lat: r.latin, title: r.keyword, desc: first(r.key) })),
      pages: (a) => chunk(a, [6, 6, 6, 6]).map((x, i) => [x, `${i * 6 + 1}~${i * 6 + 6}번째 돌`]),
      ask: "내 앞에 놓일<br />세 개의 돌은?", need: "주머니에 손을 넣기만 하면 돼요",
    },
    sibyl: {
      n: 6, name: "시빌라 신탁의 방", origin: "로마 · 신탁", bg: "void-a",
      hook: "로마의 신탁,<br />당신에게 닿을 한 줄은?", sub: "시빌라 신탁 서른두 가지",
      what: "시빌라는 누구일까?", lore: ["로마는 역병과 전쟁 같은 큰일이 닥치면, 무녀 시빌라에게서 사들였다는 <b>예언서</b>를 원로원의 결정으로 열어 보았다고 전해요.", "그 예언서는 카피톨리움 신전에 보관됐어요."],
      how: "시빌라의 방에서는 고민 하나를 적고 두루마리를 뽑아요. 서른두 개의 신탁 가운데 한 줄이 당신 질문에 맞춰 풀려요. 적은 고민은 어디에도 남지 않아요.",
      items: () => W.ORACLES.map((o, i) => ({ mark: String(i + 1), name: "", title: o.title, desc: first(o.key) })),
      pages: (a) => chunk(a, [6, 6, 5, 5, 5, 5]).map((x, i, all) => { const s = all.slice(0, i).reduce((t, y) => t + y.length, 0); return [x, `신탁 ${s + 1}~${s + x.length}`]; }),
      ask: "지금 내 고민에<br />닿을 신탁은?", need: "고민 하나만 품고 오세요",
    },
  };

  const q = new URLSearchParams(location.search);
  const key = q.get("room") || "ogham";
  const R = ROOMS[key];
  const groups = R.pages(R.items());
  const total = groups.length + 3;
  const p = Math.min(Math.max(0, +q.get("p") || 0), total - 1);
  W.__total = total;

  const page = document.getElementById("page");
  page.dataset.room = key;
  page.style.backgroundImage = `url(out/v2/bg/${p % 2 ? (R.bg === "void-a" ? "void-b" : "void-a") : R.bg}.png)`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const head = `<p class="brand">낯선 점술관</p><p class="page">${p + 1} / ${total}</p>`;
  const roomTag = `<p class="tag"><i>${NUM[R.n]}</i>${R.name}</p>`;
  const sigOf = (it) => it.sym ? `<svg class="mk-sym${it.tall ? " tall" : ""}" viewBox="${it.tall ? "0 0 40 80" : "0 0 40 60"}"><use href="#${it.sym}" /></svg>` : `<span class="mk-txt${it.mark.length > 1 && /\d/.test(it.mark) ? " num" : ""}">${esc(it.mark)}</span>`;

  if (p === 0) {
    page.classList.add("tp-cover");
    page.innerHTML = `${head}<div class="em"><svg class="sig"><use href="#i-${key}" /></svg></div><div class="mid"><p class="tag big"><i>${NUM[R.n]}</i>${R.name}</p><p class="origin">${R.origin}</p><p class="h hook">${R.hook}</p><p class="sub">${R.sub}</p></div><p class="foot next-hint">넘겨서 유형 보기 →</p>`;
  } else if (p === 1) {
    page.classList.add("tp-what");
    page.innerHTML = `${head}${roomTag}<p class="h what">${R.what}</p><div class="lore">${R.lore.map((t) => `<p>${t}</p>`).join("")}</div><div class="how"><span>이 방에서는</span><p>${R.how}</p></div>`;
  } else if (p < total - 1) {
    const [list, label] = groups[p - 2];
    page.classList.add("tp-list");
    page.innerHTML = `${head}${roomTag}<p class="group">${label}</p><ul class="types n${list.length}">${list.map((it) => `<li>${`<div class="mk">${sigOf(it)}</div>`}<div class="tx"><p class="t">${it.name ? `<b>${esc(it.name)}</b>${it.lat ? `<span class="lat">${esc(it.lat)}</span>` : ""}<span class="dot">·</span>` : ""}<em>${esc(it.title)}</em></p><p class="d">${esc(it.desc)}</p></div></li>`).join("")}</ul>`;
  } else {
    page.classList.add("tp-cta");
    page.innerHTML = `${head}<div class="em sm"><svg class="sig"><use href="#i-${key}" /></svg></div><div class="mid"><p class="h ask">${R.ask}</p><p class="sub">${R.need}</p><p class="pill">낯선 점술관 · 일곱 개의 방 중 ${["첫", "두", "세", "네", "다섯", "여섯", "일곱"][R.n]} 번째 문 「${R.name}」</p><p class="cta2">프로필 링크에서 첫 번째 문부터 열어 보세요</p></div>`;
  }

  // 오검·룬 문장 그림은 제품 화면의 SVG를 그대로 가져다 쓴다(같은 획)
  W.__ready = (async () => {
    if (page.querySelector("use")) {
      const html = await (await fetch("../../../products/strange-oracle/index.html")).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      doc.querySelectorAll('symbol[id^="ogham-"], symbol[id^="rune-"]').forEach((s) => svg.appendChild(document.importNode(s, true)));
      document.getElementById("defs").appendChild(svg);
    }
    await document.fonts.ready;
    // 넘치는 쪽 확인용: 마지막 항목 아래 끝
    const last = page.querySelector(".types li:last-child, .how, .mid");
    W.__overflow = last ? Math.round(last.getBoundingClientRect().bottom) - 1350 + 60 : 0;
  })();
})();
