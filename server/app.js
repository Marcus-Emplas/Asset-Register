require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const SqliteSessionStore = require('./lib/sqliteSessionStore');

const { attachCurrentUser, requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const assetsRoutes = require('./routes/assets.routes');
const usersRoutes = require('./routes/users.routes');
const simcardsRoutes = require('./routes/simcards.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

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
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  },
}));

app.use(attachCurrentUser);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);

app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.user);
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
