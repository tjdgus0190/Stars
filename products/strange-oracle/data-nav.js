// 사이드바(메뉴) 문구와 링크 (2026-11-13, 제안서 proposal-strange-oracle-seo-tools.md). 로직 없음.
// 입구(index.html)는 nav.js가 이 값으로 사이드바를 그린다. 안내·도구 페이지(guide/)는 tools/strange-oracle/gen-guide.js가 같은 값으로 정적 HTML을 만든다.
// 짧은 주소(/saju/ 등)는 netlify.toml의 200 rewrite로 guide/<이름>/에 이어진다(모의 서버도 같은 규칙).
window.NAV = {
  brand: "낯선 점술관",
  brandSub: "STRANGE ORACLE",
  open: "메뉴",
  close: "메뉴 닫기",
  groups: [
    {
      head: "일곱 점술",
      items: [{ label: "입구 · 일곱 개의 문", note: "사주부터 시빌라 신탁까지 한 번에", href: "/products/strange-oracle/" }],
    },
    {
      head: "점술 안내",
      items: [
        { label: "사주 명리", note: "무료 사주풀이 · 열 개의 일간", href: "/saju/" },
        { label: "인도 베다 점성술", note: "달의 집 나크샤트라 27", href: "/vedic/" },
        { label: "북유럽 룬", note: "룬 문자 24자의 뜻", href: "/rune/" },
        { label: "켈트 오검", note: "나무 문자 20자의 뜻", href: "/ogham/" },
        { label: "이집트 데칸", note: "서른여섯 별시계", href: "/egypt/" },
        { label: "마야 달력 촐킨", note: "260일과 스무 날 이름", href: "/maya/" },
        { label: "시빌라 신탁", note: "로마의 예언서와 제비뽑기", href: "/oracle/" },
      ],
    },
    {
      head: "무료 도구",
      items: [
        { label: "무료 만세력", note: "내 사주 여덟 글자 · 오행", href: "/manse/" },
        { label: "나크샤트라 계산기", note: "태어난 밤 달이 머문 집", href: "/nakshatra/" },
        { label: "마야 탄생일", note: "촐킨 260일 달력의 내 날", href: "/tzolkin/" },
        { label: "이집트 데칸", note: "별자리 속 숨은 자리", href: "/decan/" },
        { label: "이름 오검", note: "이름을 켈트 나무 문자로", href: "/name-ogham/" },
        { label: "룬 한 개 뽑기", note: "오늘의 룬 메시지", href: "/rune-draw/" },
        { label: "시빌라 한 줄 신탁", note: "고민 하나에 한 줄", href: "/sibyl/" },
      ],
    },
    {
      head: "이야기",
      items: [
        { label: "전설 기록", note: "점술이 움직인 일곱 사건", href: "/legends/" },
        { label: "문 너머의 기록", note: "점술에 얽힌 전설 · 인스타그램", href: "https://www.instagram.com/strange_oracle_off/", ext: true },
      ],
    },
    {
      head: "안내",
      items: [
        { label: "이용약관", href: "/products/strange-oracle/legal/terms.html" },
        { label: "개인정보처리방침", href: "/products/strange-oracle/legal/privacy.html" },
      ],
    },
  ],
};
