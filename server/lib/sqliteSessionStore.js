const session = require('express-session');
const db = require('../db/db');

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12h, matches the cookie maxAge in app.js

class SqliteSessionStore extends session.Store {
  constructor(options) {
    super(options || {});
    this.ttl = (options && options.ttl) || DEFAULT_TTL_MS;
    this._getStmt = db.prepare('SELECT sess, expires_at FROM sessions WHERE sid = ?');
    this._upsertStmt = db.prepare(`
      INSERT INTO sessions (sid, sess, expires_at) VALUES (@sid, @sess, @expiresAt)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires_at = excluded.expires_at
    `);
    this._destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this._pruneStmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
  }

  _expiresAt(session) {
    const maxAge = session && session.cookie && session.cookie.maxAge;
    return Date.now() + (typeof maxAge === 'number' ? maxAge : this.ttl);
  }

  get(sid, cb) {
    try {
      const row = this._getStmt.get(sid);
      if (!row || row.expires_at < Date.now()) return cb(null, null);
      cb(null, JSON.parse(row.sess));
    } catch (e) {
      cb(e);
    }
  }

  set(sid, sessionData, cb) {
    try {
      this._upsertStmt.run({ sid, sess: JSON.stringify(sessionData), expiresAt: this._expiresAt(sessionData) });
      if (Math.random() < 0.02) this._pruneStmt.run(Date.now());
      cb && cb(null);
    } catch (e) {
      cb && cb(e);
    }
  }

  destroy(sid, cb) {
    try {
      this._destroyStmt.run(sid);
      cb && cb(null);
    } catch (e) {
      cb && cb(e);
    }
  }

  touch(sid, sessionData, cb) {
    this.set(sid, sessionData, cb);
  }
}

module.exports = SqliteSessionStore;
