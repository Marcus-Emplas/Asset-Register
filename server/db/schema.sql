CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','standard')) DEFAULT 'standard',
  mfa_secret    TEXT,
  mfa_enabled   INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assets (
  asset_tag        TEXT PRIMARY KEY,
  item_type        TEXT NOT NULL,
  model             TEXT NOT NULL,
  serial_number    TEXT DEFAULT '',
  express_tag      TEXT DEFAULT '',
  mac_address      TEXT DEFAULT '',
  imei             TEXT DEFAULT '',
  wsus_group       TEXT DEFAULT '',
  telephone_number TEXT DEFAULT '',
  po_number        TEXT DEFAULT '',
  device_blocked   INTEGER NOT NULL DEFAULT 0,
  location         TEXT NOT NULL,
  first_name       TEXT DEFAULT '',
  last_name        TEXT DEFAULT '',
  date_acquired    TEXT DEFAULT '',
  date_deployed    TEXT DEFAULT '',
  return_date      TEXT DEFAULT '',
  date_retired     TEXT DEFAULT '',
  notes            TEXT DEFAULT '',
  agreement_signed INTEGER NOT NULL DEFAULT 0,
  supplier         TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('In Use','In Stock','In Repair','Retired')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS asset_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_tag  TEXT NOT NULL REFERENCES assets(asset_tag) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asset_history_tag ON asset_history(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

CREATE TABLE IF NOT EXISTS sessions (
  sid        TEXT PRIMARY KEY,
  sess       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
