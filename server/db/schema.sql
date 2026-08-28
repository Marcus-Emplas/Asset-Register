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
  ip_address       TEXT DEFAULT '',
  imei             TEXT DEFAULT '',
  wsus_group       TEXT DEFAULT '',
  telephone_number TEXT DEFAULT '',
  po_number        TEXT DEFAULT '',
  device_blocked   INTEGER NOT NULL DEFAULT 0,
  location         TEXT NOT NULL,
  company          TEXT DEFAULT '',
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

CREATE TABLE IF NOT EXISTS sim_cards (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number       TEXT NOT NULL UNIQUE,
  carrier            TEXT DEFAULT '',
  plan               TEXT DEFAULT '',
  iccid              TEXT DEFAULT '',
  status             TEXT NOT NULL CHECK (status IN ('Available','Assigned','Retired')) DEFAULT 'Available',
  assigned_asset_tag TEXT REFERENCES assets(asset_tag) ON DELETE SET NULL,
  notes              TEXT DEFAULT '',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sim_cards_status ON sim_cards(status);
CREATE INDEX IF NOT EXISTS idx_sim_cards_asset ON sim_cards(assigned_asset_tag);

CREATE TABLE IF NOT EXISTS password_resets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  sid        TEXT PRIMARY KEY,
  sess       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
