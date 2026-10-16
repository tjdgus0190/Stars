-- 낯선 점술관 · 친구 궁합 지도 (specs/strange-oracle.md 16-5의 2). 칸은 기획서 표 그대로다.
-- 칸을 늘리려면 운영자 승인이 필요하다(CLAUDE.md 3장). 사람 이름·생년월일·IP·키 원문은 어디에도 없다.
-- 운영자: npx wrangler d1 execute strange-oracle-map --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS maps (
  id         TEXT PRIMARY KEY,          -- 무작위 128비트(base64url 22자), 서버 안에서만
  invite     TEXT NOT NULL UNIQUE,      -- 초대 ID, 무작위 128비트(base64url 22자)
  key_hash   TEXT NOT NULL UNIQUE,      -- 열람 키 SHA-256(16진 64자), 원문 없음
  nick       TEXT NOT NULL,             -- 주인 별명 1~8자
  icon       TEXT NOT NULL,             -- i01~i24
  main       TEXT NOT NULL,             -- 주 원형 코드
  sub        TEXT NOT NULL,             -- 보조 원형 코드
  open       INTEGER NOT NULL DEFAULT 1, -- 초대 열림 1/0
  created    TEXT NOT NULL,             -- 만든 날 YYYY-MM-DD (UTC)
  active     TEXT NOT NULL,             -- 주인 마지막 활동 날 (UTC). 주인 동작 때만 갱신
  hour_slot  TEXT NOT NULL DEFAULT '',  -- 참여 횟수 창 YYYY-MM-DDTHH (UTC)
  hour_joins INTEGER NOT NULL DEFAULT 0 -- 그 창의 참여 수
);

CREATE TABLE IF NOT EXISTS friends (
  rid      TEXT PRIMARY KEY,            -- 무작위 128비트(base64url 22자)
  map_id   TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  nick     TEXT NOT NULL,
  icon     TEXT NOT NULL,
  main     TEXT NOT NULL,
  sub      TEXT NOT NULL,
  del_hash TEXT NOT NULL UNIQUE,        -- 삭제 코드 SHA-256, 원문 없음
  joined   TEXT NOT NULL                -- 참여 날 (UTC)
);

CREATE TABLE IF NOT EXISTS quota (
  day     TEXT PRIMARY KEY,             -- YYYY-MM-DD (UTC). 사람 정보 없음, 7일 뒤 Cron이 지움
  creates INTEGER NOT NULL DEFAULT 0,
  joins   INTEGER NOT NULL DEFAULT 0,
  erases  INTEGER NOT NULL DEFAULT 0
);

-- invite·key_hash·del_hash는 UNIQUE 제약이 색인을 만든다. 아래는 친구 목록·만료 정리용.
CREATE INDEX IF NOT EXISTS friends_map_id ON friends(map_id);
CREATE INDEX IF NOT EXISTS maps_active ON maps(active);
CREATE INDEX IF NOT EXISTS maps_created ON maps(created);
