const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');
const { validatePasswordPolicy } = require('../lib/password');

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id, email: row.email, role: row.role,
    mfaEnabled: !!row.mfa_enabled, active: !!row.active, createdAt: row.created_at,
  };
}

router.use(requireRole('admin'));

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY email').all();
  res.json(rows.map(publicUser));
});

router.post('/', (req, res) => {
  const { email, password, role } = req.body || {};
  const cleanEmail = (email || '').toLowerCase().trim();

  if (!cleanEmail) return res.status(400).json({ error: 'validation_failed', fields: { email: 'Email is required' } });
  if (!['admin', 'standard'].includes(role)) return res.status(400).json({ error: 'validation_failed', fields: { role: 'Role must be admin or standard' } });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) {
    return res.status(400).json({ error: 'validation_failed', fields: { email: 'Email already in use' } });
  }
  const pwErrors = validatePasswordPolicy(password);
  if (pwErrors.length) return res.status(400).json({ error: 'validation_failed', fields: { password: pwErrors.join('; ') } });

  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, role, mfa_enabled, active) VALUES (?, ?, ?, 0, 1)
  `).run(cleanEmail, hash, role);

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(publicUser(created));
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const { role, active, resetMfa } = req.body || {};

  if (role !== undefined) {
    if (!['admin', 'standard'].includes(role)) return res.status(400).json({ error: 'validation_failed', fields: { role: 'Role must be admin or standard' } });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  if (active !== undefined) {
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  }
  if (resetMfa) {
    db.prepare('UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?').run(id);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json(publicUser(updated));
});

module.exports = router;
