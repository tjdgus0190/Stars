// ═══════════════════════════════════════════════════════════════════════
// 한 권의 책 — 제2부 「인연의 장」 (유료 원본, spec 17-2). 유료 문장의 유일한 원본이다. 공개 폴더에 복사하지 않는다(CLAUDE.md 7장).
// 함수 book(netlify/functions/book.js, file "yeon")만 읽어 열람 코드가 확인된 사람에게 통째로 준다. 고르기는 브라우저(book.js yeonChapter)가 한다.
// 문구만, 로직 없음. 평문만. 문구는 tools/strange-oracle/apply-17.js로 넣는다(손으로 고쳐도 되지만 키 구조는 바꾸지 않는다).
//  pull 끌림의 결 · mirror 연애 습관 거울 · meet 만나야 할 사람 · scene 만남의 장면 = 주 원형 8
//  twist 의외의 끌림 = 보조 원형 8 · time 인연의 시기 = "<주 원형>-b<나이 구간 1~7>" 56 · season 인연의 계절 = 일간 오행 5(wood fire earth metal water)
//  alt.same 한결같은 결(보조 = 주) 8 · alt.notime 나이 모를 때 8 · alt.teen.know/friend/place 만 19세 미만판 24 · alt.teen.season 5
// ═══════════════════════════════════════════════════════════════════════
window.BOOK_YEON = {
  "pull": {
    "warrior": "",
    "sage": "",
    "lover": "",
    "rebel": "",
    "caregiver": "",
    "explorer": "",
    "creator": "",
    "ruler": ""
  },
  "mirror": {
    "warrior": "",
    "sage": "",
    "lover": "",
    "rebel": "",
    "caregiver": "",
    "explorer": "",
    "creator": "",
    "ruler": ""
  },
  "meet": {
    "warrior": "",
    "sage": "",
    "lover": "",
    "rebel": "",
    "caregiver": "",
    "explorer": "",
    "creator": "",
    "ruler": ""
  },
  "twist": {
    "warrior": "",
    "sage": "",
    "lover": "",
    "rebel": "",
    "caregiver": "",
    "explorer": "",
    "creator": "",
    "ruler": ""
  },
  "scene": {
    "warrior": "",
    "sage": "",
    "lover": "",
    "rebel": "",
    "caregiver": "",
    "explorer": "",
    "creator": "",
    "ruler": ""
  },
  "time": {
    "warrior-b1": "",
    "sage-b1": "",
    "lover-b1": "",
    "rebel-b1": "",
    "caregiver-b1": "",
    "explorer-b1": "",
    "creator-b1": "",
    "ruler-b1": "",
    "warrior-b2": "",
    "sage-b2": "",
    "lover-b2": "",
    "rebel-b2": "",
    "caregiver-b2": "",
    "explorer-b2": "",
    "creator-b2": "",
    "ruler-b2": "",
    "warrior-b3": "",
    "sage-b3": "",
    "lover-b3": "",
    "rebel-b3": "",
    "caregiver-b3": "",
    "explorer-b3": "",
    "creator-b3": "",
    "ruler-b3": "",
    "warrior-b4": "",
    "sage-b4": "",
    "lover-b4": "",
    "rebel-b4": "",
    "caregiver-b4": "",
    "explorer-b4": "",
    "creator-b4": "",
    "ruler-b4": "",
    "warrior-b5": "",
    "sage-b5": "",
    "lover-b5": "",
    "rebel-b5": "",
    "caregiver-b5": "",
    "explorer-b5": "",
    "creator-b5": "",
    "ruler-b5": "",
    "warrior-b6": "",
    "sage-b6": "",
    "lover-b6": "",
    "rebel-b6": "",
    "caregiver-b6": "",
    "explorer-b6": "",
    "creator-b6": "",
    "ruler-b6": "",
    "warrior-b7": "",
    "sage-b7": "",
    "lover-b7": "",
    "rebel-b7": "",
    "caregiver-b7": "",
    "explorer-b7": "",
    "creator-b7": "",
    "ruler-b7": ""
  },
  "season": {
    "wood": "",
    "fire": "",
    "earth": "",
    "metal": "",
    "water": ""
  },
  "alt": {
    "same": {
      "warrior": "",
      "sage": "",
      "lover": "",
      "rebel": "",
      "caregiver": "",
      "explorer": "",
      "creator": "",
      "ruler": ""
    },
    "notime": {
      "warrior": "",
      "sage": "",
      "lover": "",
      "rebel": "",
      "caregiver": "",
      "explorer": "",
      "creator": "",
      "ruler": ""
    },
    "teen": {
      "know": {
        "warrior": "",
        "sage": "",
        "lover": "",
        "rebel": "",
        "caregiver": "",
        "explorer": "",
        "creator": "",
        "ruler": ""
      },
      "friend": {
        "warrior": "",
        "sage": "",
        "lover": "",
        "rebel": "",
        "caregiver": "",
        "explorer": "",
        "creator": "",
        "ruler": ""
      },
      "place": {
        "warrior": "",
        "sage": "",
        "lover": "",
        "rebel": "",
        "caregiver": "",
        "explorer": "",
        "creator": "",
        "ruler": ""
      },
      "season": {
        "wood": "",
        "fire": "",
        "earth": "",
        "metal": "",
        "water": ""
      }
    }
  }
};
