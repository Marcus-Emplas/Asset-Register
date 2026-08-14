const db = require('../db/db');

function attachCurrentUser(req, res, next) {
  req.user = null;
  const userId = req.session && req.session.userId;
  if (userId) {
    const row = db.prepare('SELECT id, email, role, active FROM users WHERE id = ?').get(userId);
    if (row && row.active) {
      req.user = { id: row.id, email: row.email, role: row.role };
    } else {
      req.session.destroy(() => {});
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'auth_required' });
    if (req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = { attachCurrentUser, requireAuth, requireRole };
