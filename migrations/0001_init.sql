-- MY Project USA CMS — initial schema (Cloudflare D1 / SQLite)
-- Timestamps are ISO-8601 UTC strings. IDs are stable text identifiers.

PRAGMA foreign_keys = ON;

-- ── Users & sessions ─────────────────────────────────────────────────────────
CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name             TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
  can_publish      INTEGER NOT NULL DEFAULT 0 CHECK (can_publish IN (0, 1)),
  password_hash    TEXT,                       -- "pbkdf2-sha256$<iterations>$<salt b64>$<hash b64>"
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  failed_logins    INTEGER NOT NULL DEFAULT 0,
  locked_until     TEXT,
  last_login_at    TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,               -- SHA-256 of the cookie token (raw token never stored)
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  user_agent    TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- One-time password set/reset links (invites and account recovery)
CREATE TABLE password_tokens (
  id          TEXT PRIMARY KEY,                 -- SHA-256 of the token
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('invite', 'reset')),
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);
CREATE INDEX idx_password_tokens_user ON password_tokens(user_id);

-- ── Content ──────────────────────────────────────────────────────────────────
-- A page holds a list of blocks. Draft and published content are stored separately:
-- editing never changes what visitors see until "Publish" copies draft → published.
CREATE TABLE pages (
  id               TEXT PRIMARY KEY,
  path             TEXT NOT NULL UNIQUE,         -- URL path without leading slash; '' = homepage
  title            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft_json       TEXT NOT NULL,                -- { seo, blocks, ... } being edited
  published_json   TEXT,                         -- last published snapshot (NULL if never published)
  has_changes      INTEGER NOT NULL DEFAULT 1,   -- draft differs from published
  source_url       TEXT,                         -- original Wix URL (migration provenance)
  published_at     TEXT,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);
CREATE INDEX idx_pages_status ON pages(status, deleted_at);

-- Repeatable content (events, news coverage, team members, reports, ...).
-- The set of collections and their fields is defined in shared/collections.ts.
CREATE TABLE entries (
  id               TEXT PRIMARY KEY,
  collection       TEXT NOT NULL,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  sort_date        TEXT,                         -- event date / article date, for ordering
  draft_json       TEXT NOT NULL,
  published_json   TEXT,
  has_changes      INTEGER NOT NULL DEFAULT 1,
  source_url       TEXT,
  published_at     TEXT,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  UNIQUE (collection, slug)
);
CREATE INDEX idx_entries_list ON entries(collection, status, deleted_at, sort_order, sort_date);

-- Point-in-time copies used for "Restore earlier version"
CREATE TABLE revisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('page', 'entry', 'setting')),
  entity_id    TEXT NOT NULL,
  action       TEXT NOT NULL,                    -- 'save' | 'publish' | 'restore' | 'import'
  data_json    TEXT NOT NULL,
  title        TEXT,
  created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_revisions_entity ON revisions(entity_type, entity_id, id DESC);

-- ── Media (files live in R2; this table is the catalogue) ────────────────────
CREATE TABLE media (
  id            TEXT PRIMARY KEY,
  r2_key        TEXT NOT NULL UNIQUE,
  filename      TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  width         INTEGER,
  height        INTEGER,
  alt           TEXT NOT NULL DEFAULT '',
  variants_json TEXT,                            -- [{ "w": 960, "key": "..." }]
  source_url    TEXT UNIQUE,                     -- original URL for imported media (idempotent import)
  uploaded_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX idx_media_created ON media(deleted_at, created_at DESC);

-- ── Site-wide settings (contact info, navigation, footer, social links, ...) ─
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value_json  TEXT NOT NULL,
  updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TEXT NOT NULL
);

-- ── Redirects from old/changed URLs ──────────────────────────────────────────
CREATE TABLE redirects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  from_path   TEXT NOT NULL UNIQUE,              -- lowercase, decoded, leading slash, no trailing slash
  to_path     TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 308)),
  source      TEXT NOT NULL DEFAULT 'manual',    -- 'manual' | 'import'
  created_at  TEXT NOT NULL
);

-- ── Form submissions (contact / sign-up forms built in the CMS) ──────────────
CREATE TABLE form_submissions (
  id          TEXT PRIMARY KEY,
  form_id     TEXT NOT NULL,                     -- block id of the form
  form_title  TEXT NOT NULL,
  page_path   TEXT NOT NULL,
  data_json   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_form_submissions ON form_submissions(status, created_at DESC);

-- ── Security & accountability ────────────────────────────────────────────────
CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,                 -- e.g. "login:ip:<hash>"
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL                  -- epoch seconds
);

CREATE TABLE audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_email   TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  detail       TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
