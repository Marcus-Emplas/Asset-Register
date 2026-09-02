const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { loginLimiter, mfaLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const { generateSecret, buildEnrollment, verifyToken } = require('../lib/totp');
const { requireAuth } = require('../middleware/auth');
const { validatePasswordPolicy } = require('../lib/password');
const { generateResetCode } = require('../lib/resetCode');
const { sendPasswordResetEmail } = require('../lib/email');

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

const router = express.Router();

// Compared against when no matching/active user is found, so login takes the same
// time either way and response timing can't be used to enumerate valid emails.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', 12);

function publicUser(row) {
  return { id: row.id, email: row.email, role: row.role };
}

function regenerate(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
    const activeUser = user && user.active ? user : null;
    const ok = await bcrypt.compare(password, activeUser ? activeUser.password_hash : DUMMY_HASH);
    if (!activeUser || !ok) return res.status(401).json({ error: 'invalid_credentials' });

    await regenerate(req);
    req.session.pendingUserId = activeUser.id;

    if (activeUser.mfa_enabled) {
      return res.json({ status: 'mfa_verify' });
    }

    // First-time login: (re)generate an enrollment secret and stash it, unconfirmed.
    const secret = await generateSecret();
    db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secret, activeUser.id);
    const enrollment = await buildEnrollment(activeUser.email, secret);
    return res.json({ status: 'mfa_enroll', qr: enrollment.qr, manualKey: enrollment.manualKey });
  } catch (e) {
    next(e);
  }
});

router.post('/forgot-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'missing_fields' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
    if (user && user.active) {
      const code = generateResetCode();
      const codeHash = await bcrypt.hash(code, 12);
      const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();
      db.prepare('INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES (?, ?, ?)').run(user.id, codeHash, expiresAt);
      await sendPasswordResetEmail(user.email, code);
    }

    // Always respond the same way so this endpoint can't be used to enumerate accounts.
    return res.json({ status: 'ok' });
  } catch (e) {
    next(e);
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'missing_fields' });

    const pwErrors = validatePasswordPolicy(newPassword);
    if (pwErrors.length) return res.status(400).json({ error: 'validation_failed', fields: { newPassword: pwErrors.join('; ') } });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
    if (!user || !user.active) {
      // Do the same bcrypt work a real user would incur below, so responding
      // for a nonexistent account takes the same time as a wrong code for a
      // real one — otherwise the timing difference leaks which emails exist.
      await bcrypt.compare(String(code), DUMMY_HASH);
      return res.status(401).json({ error: 'invalid_or_expired_code' });
    }

    const pending = db.prepare(
      'SELECT * FROM password_resets WHERE user_id = ? AND used = 0 AND expires_at > ? ORDER BY id DESC'
    ).all(user.id, new Date().toISOString());

    let match = null;
    for (const row of pending) {
      if (await bcrypt.compare(String(code), row.code_hash)) { match = row; break; }
    }
    if (!match) return res.status(401).json({ error: 'invalid_or_expired_code' });

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    return res.json({ status: 'ok' });
  } catch (e) {
    next(e);
  }
});

router.post('/mfa/verify', mfaLimiter, async (req, res, next) => {
  try {
    const pendingId = req.session.pendingUserId;
    if (!pendingId) return res.status(401).json({ error: 'no_pending_login' });

    const { token } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(pendingId);
    if (!user || !user.active || !user.mfa_enabled) return res.status(401).json({ error: 'invalid_state' });

    const valid = await verifyToken(user.mfa_secret, token);
    if (!valid) return res.status(401).json({ error: 'invalid_token' });

    delete req.session.pendingUserId;
    req.session.userId = user.id;
    return res.json({ status: 'ok', user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/mfa/enroll/verify', mfaLimiter, async (req, res, next) => {
  try {
    const pendingId = req.session.pendingUserId;
    if (!pendingId) return res.status(401).json({ error: 'no_pending_login' });

    const { token } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(pendingId);
    if (!user || !user.active || user.mfa_enabled || !user.mfa_secret) {
      return res.status(401).json({ error: 'invalid_state' });
    }

    const valid = await verifyToken(user.mfa_secret, token);
    if (!valid) return res.status(401).json({ error: 'invalid_token' });

    db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(user.id);
    delete req.session.pendingUserId;
    req.session.userId = user.id;
    return res.json({ status: 'ok', user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/change-password', requireAuth, mfaLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'missing_fields' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_current_password' });

    const pwErrors = validatePasswordPolicy(newPassword);
    if (pwErrors.length) return res.status(400).json({ error: 'validation_failed', fields: { newPassword: pwErrors.join('; ') } });

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    return res.json({ status: 'ok' });
  } catch (e) {
    next(e);
  }
});

router.post('/mfa/reset-self', requireAuth, mfaLimiter, async (req, res, next) => {
  try {
    const { currentPassword } = req.body || {};
    if (!currentPassword) return res.status(400).json({ error: 'missing_fields' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_current_password' });

    db.prepare('UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?').run(req.user.id);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.json({ status: 'ok' });
    });
  } catch (e) {
    next(e);
  }
});

// Which tables' column layout can be customized, and a sane cap on how many
// columns / how long a column key can be — just enough to keep the stored
// JSON small and well-formed. The client ignores any key it doesn't
// recognize, so there's no need to whitelist exact field names here.
const COLUMN_PREF_TABLES = ['assets', 'deprecated', 'users', 'simCards'];

router.patch('/column-prefs', requireAuth, (req, res) => {
  const input = (req.body && req.body.columnPrefs) || {};
  if (typeof input !== 'object' || Array.isArray(input)) return res.status(400).json({ error: 'validation_failed' });

  const clean = {};
  for (const table of COLUMN_PREF_TABLES) {
    if (Array.isArray(input[table])) {
      clean[table] = input[table]
        .filter((k) => typeof k === 'string' && k.length <= 40)
        .slice(0, 40);
    }
  }

  db.prepare('UPDATE users SET column_prefs = ? WHERE id = ?').run(JSON.stringify(clean), req.user.id);
  res.json({ columnPrefs: clean });
});

router.post('/logout', (req, res, next) => {
  if (!req.session) return res.json({ status: 'ok' });
  req.session.destroy((err) => {
    if (err) return next(err);
    res.json({ status: 'ok' });
  });
});

module.exports = router;
