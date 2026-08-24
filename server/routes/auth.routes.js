const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { loginLimiter, mfaLimiter } = require('../middleware/rateLimit');
const { generateSecret, buildEnrollment, verifyToken } = require('../lib/totp');
const { requireAuth } = require('../middleware/auth');
const { validatePasswordPolicy } = require('../lib/password');

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

router.post('/mfa/reset-self', requireAuth, mfaLimiter, (req, res, next) => {
  try {
    db.prepare('UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?').run(req.user.id);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.json({ status: 'ok' });
    });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res, next) => {
  if (!req.session) return res.json({ status: 'ok' });
  req.session.destroy((err) => {
    if (err) return next(err);
    res.json({ status: 'ok' });
  });
});

module.exports = router;
