// 메뉴·아래 탭 바 문구와 링크 (2026-11-13, v1-F 운영자: 사이드바 대신 아이콘 칸 메뉴 + 아래 탭 바). 로직 없음. 아이콘 그림은 nav-icons.js
// 입구(index.html)는 nav.js가 이 값으로 사이드바를 그린다. 안내·도구 페이지(guide/)는 tools/strange-oracle/gen-guide.js가 같은 값으로 정적 HTML을 만든다.
// 짧은 주소(/saju/ 등)는 netlify.toml의 200 rewrite로 guide/<이름>/에 이어진다(모의 서버도 같은 규칙).
window.NAV = {
  brand: "낯선 점술관",
  brandSub: "STRANGE ORACLE",
  open: "메뉴",
  close: "메뉴 닫기",
  home: "/", // 처음 화면(로비)
  doors: "/products/strange-oracle/", // 일곱 개의 문(입구 앱)
  menuHead: "전체 메뉴",
  // (2026-11-13 v1-F) 아래 탭 바 — 안내·도구·하루 페이지와 처음 화면에 늘 보인다(입구 앱은 ☰ 메뉴만)
  tabs: [
    { label: "홈", href: "/", icon: "home" },
    { label: "오늘", href: "/today/", icon: "scroll" },
    { label: "면담", href: "/talk/", icon: "chat" },
    { label: "도감", href: "/dex/", icon: "book" },
    { label: "별가루", href: "/stardust/", icon: "spark" },
  ],
  // 별가루 — 위 띠 잔액·얻을 때 알림 (계산은 stardust.js)
  dust: {
    href: "/stardust/",
    unit: "별가루",
    badgeLabel: "내 별가루 {n} · 모으는 법 보기",
    gain: "별가루 +{n}",
    why: { first: "카카오 로그인을 환영해요", oracle: "출석 · 오늘의 신탁을 받았어요", seal: "금빛 봉인이 열렸어요" },
    capped: "오늘 모을 수 있는 별가루를 다 모았어요. 내일 또 와요.",
    cost: { story: 10, extra: 3, talk: 5 }, // 도감 숨은 이야기 · 다른 안내자의 오늘의 신탁 · 면담 질문 하나 (2026-11-14: 1개 = 100원)
  },
  // 전체 메뉴(☰): 묶음마다 아이콘 칸. short = 칸에 보이는 짧은 이름, label·note = 목록·관련 링크에 쓰는 이름
  groups: [
    {
      head: "점술관",
      items: [
        { short: "처음 화면", label: "처음 화면", note: "낯선 점술관의 모든 문", href: "/", icon: "home" },
        { short: "일곱 개의 문", label: "일곱 개의 문", note: "사주부터 시빌라 신탁까지 한 번에", href: "/products/strange-oracle/", icon: "door" },
        { short: "오늘의 신탁", label: "오늘의 신탁", note: "날마다 바뀌는 안내자의 한 줄", href: "/today/", icon: "scroll" },
        // 면담 고지 한 줄(운영 규칙 ⑯ 예외: 이 줄·약관·개인정보처리방침에만, 표시 안에서만). 대화 화면에는 넣지 않는다
        { short: "안내자 면담", label: "안내자와 면담", note: "방에 들어가 직접 묻기", href: "/talk/", icon: "chat", /* ai-notice */ disclose: "안내자의 말은 생성형 인공지능이 점술관의 기록으로 엮어 냅니다." /* /ai-notice */ },
        { short: "안내자 도감", label: "안내자 도감", note: "일곱 안내자의 숨은 이야기", href: "/dex/", icon: "book" },
        { short: "별가루", label: "별가루", note: "모으는 법과 충전", href: "/stardust/", icon: "spark" },
      ],
    },
    {
      head: "직접 계산해 보기",
      items: [
        { short: "만세력", label: "무료 만세력", note: "내 사주 여덟 글자 · 오행", href: "/manse/", icon: "calendar" },
        { short: "나크샤트라", label: "나크샤트라 계산기", note: "태어난 밤 달이 머문 집", href: "/nakshatra/", icon: "moon" },
        { short: "마야 탄생일", label: "마야 탄생일", note: "촐킨 260일 달력의 내 날", href: "/tzolkin/", icon: "sun" },
        { short: "데칸 찾기", label: "이집트 데칸", note: "별자리 속 숨은 자리", href: "/decan/", icon: "pyramid" },
        { short: "이름 오검", label: "이름 오검", note: "이름을 켈트 나무 문자로", href: "/name-ogham/", icon: "tree" },
        { short: "룬 뽑기", label: "룬 한 개 뽑기", note: "오늘의 룬 메시지", href: "/rune-draw/", icon: "rune" },
        { short: "한 줄 신탁", label: "시빌라 한 줄 신탁", note: "고민 하나에 한 줄", href: "/sibyl/", icon: "temple" },
      ],
    },
    {
      head: "점술 알아보기",
      items: [
        { short: "사주 명리", label: "사주 명리", note: "무료 사주풀이 · 열 개의 일간", href: "/saju/", icon: "saju" },
        { short: "베다 점성술", label: "인도 베다 점성술", note: "달의 집 나크샤트라 27", href: "/vedic/", icon: "moon" },
        { short: "북유럽 룬", label: "북유럽 룬", note: "룬 문자 24자의 뜻", href: "/rune/", icon: "rune" },
        { short: "켈트 오검", label: "켈트 오검", note: "나무 문자 20자의 뜻", href: "/ogham/", icon: "tree" },
        { short: "이집트 데칸", label: "이집트 데칸", note: "서른여섯 별시계", href: "/egypt/", icon: "pyramid" },
        { short: "마야 촐킨", label: "마야 달력 촐킨", note: "260일과 스무 날 이름", href: "/maya/", icon: "sun" },
        { short: "시빌라 신탁", label: "시빌라 신탁", note: "로마의 예언서와 제비뽑기", href: "/oracle/", icon: "temple" },
      ],
    },
    {
      head: "이야기",
      items: [
        { short: "전설 기록", label: "전설 기록", note: "점술이 움직인 일곱 사건", href: "/legends/", icon: "feather" },
        { short: "인스타그램", label: "문 너머의 기록", note: "점술에 얽힌 전설 · 인스타그램", href: "https://www.instagram.com/strange_oracle_off/", ext: true, icon: "camera" },
      ],
    },
    {
      head: "안내",
      items: [
        { short: "이용약관", label: "이용약관", href: "/products/strange-oracle/legal/terms.html", icon: "doc" },
        { short: "개인정보", label: "개인정보처리방침", href: "/products/strange-oracle/legal/privacy.html", icon: "lock" },
      ],
    },
  ],
};
