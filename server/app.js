require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const SqliteSessionStore = require('./lib/sqliteSessionStore');

const db = require('./db/db');
const { attachCurrentUser, requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const assetsRoutes = require('./routes/assets.routes');
const usersRoutes = require('./routes/users.routes');
const simcardsRoutes = require('./routes/simcards.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  if (isProduction) {
    throw new Error(
      'SESSION_SECRET is not set. Refusing to start in production with the insecure default secret — ' +
      'set SESSION_SECRET in .env (e.g. `openssl rand -hex 32`) before deploying.'
    );
  }
  console.warn(
    'WARNING: SESSION_SECRET is not set — using an insecure development-only default. ' +
    'This MUST be set to a long random value before this app is exposed to anyone but you.'
  );
}

if (!isProduction) {
  console.warn(
    'WARNING: NODE_ENV is not "production" — session cookies are being sent without the Secure flag ' +
    'and the app will not trust a reverse proxy\'s client IP for rate limiting. If this is a real ' +
    'deployment (not your own machine), set NODE_ENV=production and serve the app over HTTPS.'
  );
}

if (isProduction) app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '2mb' }));

app.use(session({
  name: 'assetreg.sid',
  store: new SqliteSessionStore(),
  secret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 12 * 60 * 60 * 1000,
  },
}));

app.use(attachCurrentUser);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);

app.get('/api/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT column_prefs FROM users WHERE id = ?').get(req.user.id);
  let columnPrefs = {};
  try { columnPrefs = row && row.column_prefs ? JSON.parse(row.column_prefs) : {}; } catch (e) { columnPrefs = {}; }
  res.json({ ...req.user, columnPrefs });
});

app.use('/api/assets', requireAuth, assetsRoutes);
app.use('/api/users', requireAuth, usersRoutes);
app.use('/api/simcards', requireAuth, simcardsRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

module.exports = app;
