const express = require('express');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const VALID_FIELDS = new Set([
  'assetTag', 'itemType', 'model', 'serialNumber', 'expressTag', 'macAddress', 'ipAddress',
  'imei', 'wsusGroup', 'telephoneNumber', 'poNumber', 'deviceBlocked', 'location', 'company',
  'firstName', 'lastName', 'dateAcquired', 'dateDeployed', 'returnDate', 'dateRetired',
  'notes', 'agreementSigned', 'supplier', 'status', 'costTracked', 'cost',
]);

function rowToReport(row) {
  return { id: row.id, name: row.name, fields: JSON.parse(row.fields), createdAt: row.created_at };
}

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM custom_reports ORDER BY name').all().map(rowToReport));
});

router.post('/', requireRole('admin'), (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  const fields = Array.isArray(body.fields) ? body.fields.filter((f) => VALID_FIELDS.has(f)) : [];

  const errors = {};
  if (!name) errors.name = 'Report name is required';
  else if (db.prepare('SELECT 1 FROM custom_reports WHERE name = ?').get(name)) errors.name = 'A report with this name already exists';
  if (!fields.length) errors.fields = 'Select at least one field to include';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'validation_failed', fields: errors });

  const result = db.prepare('INSERT INTO custom_reports (name, fields, created_by) VALUES (?, ?, ?)')
    .run(name, JSON.stringify(fields), req.user.id);

  res.status(201).json(rowToReport(db.prepare('SELECT * FROM custom_reports WHERE id = ?').get(result.lastInsertRowid)));
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM custom_reports WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  db.prepare('DELETE FROM custom_reports WHERE id = ?').run(id);
  res.json({ status: 'ok' });
});

module.exports = router;
