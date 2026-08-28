const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'asset-register.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

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

module.exports = db;
