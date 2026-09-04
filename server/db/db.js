const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'asset-register.db');
const db = new DatabaseSync(DB_PATH);

// This file holds password hashes, session data, and MFA secrets — restrict
// it to the owner only. No-op-ish on Windows (no POSIX permission bits), but
// matters on the Linux deployment. Best-effort: never block startup on it.
try {
  fs.chmodSync(DATA_DIR, 0o700);
  fs.chmodSync(DB_PATH, 0o600);
} catch (e) { /* ignore — e.g. unsupported on this platform/filesystem */ }

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('column_prefs')) {
  db.exec('ALTER TABLE users ADD COLUMN column_prefs TEXT DEFAULT NULL');
}

const assetColumns = db.prepare('PRAGMA table_info(assets)').all().map((c) => c.name);
if (!assetColumns.includes('ip_address')) {
  db.exec("ALTER TABLE assets ADD COLUMN ip_address TEXT DEFAULT ''");
}
if (!assetColumns.includes('company')) {
  db.exec("ALTER TABLE assets ADD COLUMN company TEXT DEFAULT ''");
}
if (!assetColumns.includes('cost_tracked')) {
  db.exec('ALTER TABLE assets ADD COLUMN cost_tracked INTEGER NOT NULL DEFAULT 0');
}
if (!assetColumns.includes('cost')) {
  db.exec('ALTER TABLE assets ADD COLUMN cost REAL DEFAULT NULL');
}
if (!assetColumns.includes('wfh')) {
  db.exec('ALTER TABLE assets ADD COLUMN wfh INTEGER NOT NULL DEFAULT 0');
}
if (!assetColumns.includes('entra_intune_enrolled')) {
  db.exec('ALTER TABLE assets ADD COLUMN entra_intune_enrolled INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;
