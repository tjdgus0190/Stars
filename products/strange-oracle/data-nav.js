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
  ny: "/products/strange-oracle/#ny-hub", // 2027 신년운세(입구 앱의 신년운세 탭)
  menuHead: "전체 메뉴",
  // (2026-11-13 v1-F) 아래 탭 바 — 안내·도구·하루 페이지와 처음 화면에 늘 보인다(입구 앱은 ☰ 메뉴만)
  tabsLabel: "바로 가기",
  tabs: [ // (2026-11-14 운영자) 처음 화면·일곱 개의 문·하루 페이지 모두 같은 아래 탭
    { label: "홈", href: "/", icon: "home" },
    { label: "일곱 개의 문", href: "/products/strange-oracle/", icon: "door" },
    { label: "오늘의 신탁", href: "/today/", icon: "scroll" },
    { label: "심층상담", href: "/talk/", icon: "chat" },
    { label: "별가루", href: "/stardust/", icon: "spark" },
  ],
  // 별가루 — 위 띠 잔액·얻을 때 알림 (계산은 stardust.js)
  // (2026-11-14 운영자) 체험 콘텐츠(오늘의 신탁·도감·면담·별가루)는 카카오 로그인 뒤. on: false면 누구나(시험 도구 mock-server --gate off)
  gate: {
    on: true,
    title: "카카오로 로그인하고 들어가요",
    body: "안내자 도감, 심층상담, 별가루는 카카오 로그인 뒤에 열려요.",
    free: ["today"], // (2026-11-14 운영자: 로그인 벽 완화) 오늘의 신탁은 로그인 없이 한 줄까지(출석 별가루·다른 안내자는 로그인 뒤)
    // 페이지마다 다른 안내(없으면 위 title·body)
    pages: {
      stardust: { title: "로그인하고 별가루를 채워요", body: "별가루는 카카오 계정에 담겨요. 로그인하면 바로 충전하고, 심층상담·책·신년운세에 쓸 수 있어요." },
    },
    go: "카카오 로그인",
    note: "로그인에는 카카오 회원번호만 써요. 이름·연락처는 받지 않아요.",
  },
  // (2026-11-14 운영자) 카카오톡 채널. url = 채널 홈 주소(https://pf.kakao.com/_xxxx — 공개 주소, 운영자가 채운다). 비어 있으면 별가루 페이지의 「채널 친구 추가」 칸을 숨긴다
  // reward: 채널 친구 별가루 10(카카오 채널 관계 확인 — 동의 항목에 비즈 앱 전환이 필요해 2026-11-15 운영자 보류). false면 별가루 칸 없이 「채널 추가하기」만
  // show: 사이트에 채널을 보일지. (2026-11-15 운영자) 채널 추가 화면에 "사업자가 확인되지 않은 채널" 경고가 떠, 사업자등록 전까지 모두 숨김(별가루 페이지 칸·메뉴 링크)
  channel: { url: "https://pf.kakao.com/_xinaNX", show: false, reward: false },
  // (2026-11-16 운영자) 앱처럼 홈 화면에 두기(PWA). mode: "test" = 시험 주소에서만(운영 주소 prodHosts에서는 아무것도 하지 않음) · "live" = 어디서나 · "off"
  pwa: {
    mode: "live", // (2026-11-17 운영자) 운영에서도: 앱 설치·실행 연출·위 띠 「앱 설치」·설치 수 집계·웹 푸시 카드
    prodHosts: ["strange-oracle.com", "www.strange-oracle.com"],
    install: "/install/",
    icon: "/products/strange-oracle/img/app/icon-480.webp",
    // (2026-11-16 운영자) 홈 화면 앱을 켤 때의 실행 연출(intro.js)
    intro: { eyebrow: "STRANGE ORACLE", name: "낯선 점술관", line: "오늘 밤, 일곱 개의 문이 열려요" },
    // (2026-11-17 운영자) 웹으로 들어왔을 때 위 띠에 늘 남는 설치 단추(홈 화면 앱 안에서는 안 보임)
    get: { text: "앱 설치", label: "낯선 점술관 앱 설치하기" },
    // 처음 들어왔을 때 한 번 묻는 창
    ask: {
      eyebrow: "STRANGE ORACLE",
      title: "낯선 점술관을 앱으로",
      body: "홈 화면에 두고, 매일 바뀌는 오늘의 신탁을 받아 보세요.", // (2026-11-16 운영자) 알림 문구는 웹 푸시를 붙인 뒤에
      points: [],
      app: "앱에서 둘러보기",
      web: "웹으로 계속하기",
    },
    // (2026-11-16 운영자) 웹 푸시 알림 「오늘의 안내자가 찾아왔어요」. mode는 위 pwa.mode를 따르고, 서버(PUSH_MODE)가 꺼져 있으면 카드를 그리지 않는다
    push: {
      head: "매일 아침, 오늘의 신탁 알림",
      body: "아침 9시에 오늘의 안내자가 찾아오면 알려 드려요.",
      more: "저장하는 것·보관 기간 자세히",
      detail: [
        "저장하는 것: 이 기기의 알림 주소(브라우저가 만든 무작위 주소)와 등록 시각뿐이에요. 이름·생년월일·카카오 계정과 잇지 않아요.",
        "목적: 매일 아침 오늘의 신탁 알림을 보내기 위해서예요.",
        "저장 위치: 호스팅 회사 Netlify의 저장소(미국). 알림은 휴대폰·브라우저 회사의 알림 서버(구글·애플 등)를 거쳐 가요. 알림 문구는 휴대폰 안에서 만들어서 알림 서버에는 내용이 가지 않아요.",
        "보관: 알림을 끄면 바로 지우고, 1년 동안 알림이 닿지 않으면 자동으로 지워요.",
        "끄는 방법: 이 카드의 「알림 끄기」(오늘의 신탁·나의 이야기 페이지), 또는 휴대폰 설정에서 낯선 점술관 알림을 끄면 돼요.",
        "선택 사항이에요. 알림을 받지 않아도 모든 기능을 그대로 쓸 수 있어요.",
      ],
      on: "알림 받기",
      working: "알림을 켜는 중…",
      done: "알림을 켰어요 · 내일 아침 9시에 찾아올게요",
      status: "오늘의 신탁 알림이 켜져 있어요",
      off: "알림 끄기",
      offDone: "알림을 껐어요",
      test: "시험 알림 보내기",
      testSent: "시험 알림을 보냈어요. 잠시 뒤 휴대폰 알림을 확인해 주세요.",
      denied: "알림이 막혀 있어요. 휴대폰 설정에서 낯선 점술관(또는 이 브라우저)의 알림을 허용해 주세요.",
      iosHint: "아이폰은 홈 화면에 추가한 낯선 점술관에서 알림을 받을 수 있어요.",
      iosGo: "홈 화면에 추가하기",
      fail: "알림을 켜지 못했어요. 잠시 뒤 다시 눌러 주세요.",
      // 휴대폰에 뜨는 알림(서비스 워커가 data-dex.js의 그날 안내자로 만든다)
      note: { title: "{name}{iga} 오늘의 신탁을 들고 왔어요", fallbackTitle: "오늘의 안내자가 찾아왔어요", fallbackBody: "오늘의 신탁을 받으러 와 주세요.", url: "/today/" },
    },
    // 설치 페이지(/install/)
    page: {
      title: "낯선 점술관 · 앱으로 열기",
      eyebrow: "STRANGE ORACLE",
      name: "낯선 점술관",
      lead: "일곱 개의 문을 당신의 홈 화면에",
      features: [
        { icon: "scroll", head: "매일 찾아오는 오늘의 신탁", body: "아이콘 한 번이면 오늘의 안내자가 기다려요" },
        { icon: "chat", head: "일곱 안내자와 심층상담", body: "지나온 문을 기억하는 안내자에게 직접 물어요" },
        { icon: "door", head: "이어지는 나의 이야기", body: "모은 카드와 별가루가 그대로 이어져요" },
      ],
      add: "홈 화면에 추가",
      adding: "여는 중…",
      note: "",
      web: "웹으로 계속하기",
      done: { title: "홈 화면에 낯선 점술관이 생겼어요", body: "이제 홈 화면의 아이콘을 눌러 들어오세요. 일곱 안내자가 기다리고 있어요.", go: "지금 둘러보기" },
      already: { title: "이미 앱으로 열었어요", go: "점술관으로 들어가기" },
      inapp: { btn: "브라우저에서 열고 설치하기", note: "인스타그램·카카오톡 안에서는 홈 화면에 추가할 수 없어서, 브라우저로 옮겨 열어요." },
      guideIos: { title: "홈 화면에 추가하는 법", steps: ["화면 아래(또는 주소창 옆)의 공유 버튼을 눌러요", "목록을 올려 「홈 화면에 추가」를 골라요", "오른쪽 위 「추가」를 누르면 끝이에요"], close: "알겠어요" },
      guideAndroid: { title: "홈 화면에 추가하는 법", steps: ["오른쪽 위 ⋮ 메뉴를 눌러요", "「홈 화면에 추가」 또는 「앱 설치」를 골라요", "「설치」를 누르면 끝이에요"], close: "알겠어요" },
      guideInapp: { title: "브라우저에서 열어 주세요", steps: ["오른쪽 위 ··· 메뉴를 눌러요", "「외부 브라우저에서 열기」를 골라요", "열린 화면에서 「홈 화면에 추가」를 누르면 끝이에요"], close: "알겠어요" },
    },
  },
  me: { href: "/me/", label: "나의 이야기" }, // (2026-11-16) 위 띠 별가루 옆 사람 아이콘
  dust: {
    href: "/stardust/",
    unit: "별가루",
    badgeLabel: "내 별가루 {n} · 모으는 법 보기",
    gain: "별가루 +{n}",
    why: { first: "카카오 로그인을 환영해요", oracle: "출석 · 오늘의 신탁을 받았어요", seal: "금빛 봉인이 열렸어요", channel: "카카오톡 채널 친구가 되어 주셔서 고마워요" },
    capped: "오늘 모을 수 있는 별가루를 다 모았어요. 내일 또 와요.",
    cost: { story: 10, extra: 3, talk: 5 }, // 도감 숨은 이야기 · 다른 안내자의 오늘의 신탁 · 심층상담 질문 하나 (2026-11-14: 1개 = 100원)
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
        { short: "심층상담", label: "심층상담", note: "방에 들어가 직접 묻기", href: "/talk/", icon: "chat", /* ai-notice */ disclose: "안내자의 말은 생성형 인공지능이 점술관의 기록으로 엮어 냅니다." /* /ai-notice */ },
        { short: "안내자 도감", label: "안내자 도감", note: "일곱 안내자의 숨은 이야기", href: "/dex/", icon: "book" },
        { short: "별가루", label: "별가루", note: "모으는 법과 충전", href: "/stardust/", icon: "spark" },
        { short: "나의 이야기", label: "나의 이야기", note: "지나온 문 · 별가루 · 로그아웃", href: "/me/", icon: "user" },
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
        // (2026-11-15 운영자) 카카오톡 채널 링크는 사업자등록 뒤에 다시: { short: "카카오 채널", label: "낯선 점술관 카카오톡 채널", note: "새 소식 · 문의", href: "https://pf.kakao.com/_xinaNX", ext: true, icon: "chat" },
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
