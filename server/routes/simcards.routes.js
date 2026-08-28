const express = require('express');
const db = require('../db/db');
const { rowToSimCard } = require('../lib/simCardMapper');
const { rowToAsset } = require('../lib/assetMapper');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fetchOneSim(id) {
  const row = db.prepare('SELECT * FROM sim_cards WHERE id = ?').get(id);
  return row ? rowToSimCard(row) : null;
}

function fetchOneAsset(tag) {
  const row = db.prepare('SELECT * FROM assets WHERE asset_tag = ?').get(tag);
  if (!row) return null;
  const historyRows = db.prepare('SELECT * FROM asset_history WHERE asset_tag = ? ORDER BY date').all(tag);
  return rowToAsset(row, historyRows);
}

function addHistory(tag, date, text) {
  db.prepare('INSERT INTO asset_history (asset_tag, date, text) VALUES (?, ?, ?)').run(tag, date, text);
}

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM sim_cards ORDER BY phone_number').all().map(rowToSimCard));
});

router.post('/', requireRole('admin'), (req, res) => {
  const body = req.body || {};
  const phoneNumber = (body.phoneNumber || '').trim();

  const errors = {};
  if (!phoneNumber) errors.phoneNumber = 'Phone number is required';
  else if (db.prepare('SELECT 1 FROM sim_cards WHERE phone_number = ?').get(phoneNumber)) {
    errors.phoneNumber = 'A SIM with this number already exists';
  }
  if (Object.keys(errors).length) return res.status(400).json({ error: 'validation_failed', fields: errors });

  const result = db.prepare(`
    INSERT INTO sim_cards (phone_number, carrier, plan, iccid, notes)
    VALUES (@phoneNumber, @carrier, @plan, @iccid, @notes)
  `).run({
    phoneNumber,
    carrier: (body.carrier || '').trim(),
    plan: (body.plan || '').trim(),
    iccid: (body.iccid || '').trim(),
    notes: (body.notes || '').trim(),
  });

  res.status(201).json(fetchOneSim(result.lastInsertRowid));
});

router.post('/:id/assign', (req, res) => {
  const simId = Number(req.params.id);
  const assetTag = (req.body && req.body.assetTag || '').trim();
  const sim = fetchOneSim(simId);
  if (!sim) return res.status(404).json({ error: 'not_found' });
  if (sim.status === 'Retired') return res.status(400).json({ error: 'sim_retired' });

  const asset = fetchOneAsset(assetTag);
  if (!asset) return res.status(400).json({ error: 'asset_not_found' });
  if (asset.itemType !== 'Mobile Phone') return res.status(400).json({ error: 'not_a_mobile' });

  const today = todayIso();

  db.exec('BEGIN');
  try {
    // Free up any SIM already assigned to this asset.
    const existingForAsset = db.prepare('SELECT * FROM sim_cards WHERE assigned_asset_tag = ? AND id != ?').get(assetTag, simId);
    if (existingForAsset) {
      db.prepare("UPDATE sim_cards SET status = 'Available', assigned_asset_tag = NULL, updated_at = datetime('now') WHERE id = ?").run(existingForAsset.id);
    }
    // Free up this SIM from whatever asset it was previously assigned to.
    if (sim.assignedAssetTag && sim.assignedAssetTag !== assetTag) {
      addHistory(sim.assignedAssetTag, today, `SIM ${sim.phoneNumber} unassigned`);
    }

    db.prepare("UPDATE sim_cards SET status = 'Assigned', assigned_asset_tag = ?, updated_at = datetime('now') WHERE id = ?").run(assetTag, simId);
    db.prepare("UPDATE assets SET telephone_number = ?, updated_at = datetime('now') WHERE asset_tag = ?").run(sim.phoneNumber, assetTag);
    addHistory(assetTag, today, `SIM ${sim.phoneNumber} assigned`);

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  res.json({ simCard: fetchOneSim(simId), asset: fetchOneAsset(assetTag) });
});

router.post('/:id/unassign', (req, res) => {
  const simId = Number(req.params.id);
  const sim = fetchOneSim(simId);
  if (!sim) return res.status(404).json({ error: 'not_found' });
  if (!sim.assignedAssetTag) return res.status(400).json({ error: 'not_assigned' });

  const assetTag = sim.assignedAssetTag;
  const today = todayIso();

  db.exec('BEGIN');
  try {
    db.prepare("UPDATE sim_cards SET status = 'Available', assigned_asset_tag = NULL, updated_at = datetime('now') WHERE id = ?").run(simId);
    const asset = db.prepare('SELECT telephone_number FROM assets WHERE asset_tag = ?').get(assetTag);
    if (asset && asset.telephone_number === sim.phoneNumber) {
      db.prepare("UPDATE assets SET telephone_number = '', updated_at = datetime('now') WHERE asset_tag = ?").run(assetTag);
    }
    addHistory(assetTag, today, `SIM ${sim.phoneNumber} unassigned`);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  res.json({ simCard: fetchOneSim(simId), asset: fetchOneAsset(assetTag) });
});

router.post('/:id/retire', requireRole('admin'), (req, res) => {
  const simId = Number(req.params.id);
  const sim = fetchOneSim(simId);
  if (!sim) return res.status(404).json({ error: 'not_found' });
  if (sim.assignedAssetTag) return res.status(400).json({ error: 'sim_assigned' });

  db.prepare("UPDATE sim_cards SET status = 'Retired', updated_at = datetime('now') WHERE id = ?").run(simId);
  res.json(fetchOneSim(simId));
});

router.post('/:id/reactivate', requireRole('admin'), (req, res) => {
  const simId = Number(req.params.id);
  const sim = fetchOneSim(simId);
  if (!sim) return res.status(404).json({ error: 'not_found' });
  if (sim.status !== 'Retired') return res.status(400).json({ error: 'not_retired' });

  db.prepare("UPDATE sim_cards SET status = 'Available', updated_at = datetime('now') WHERE id = ?").run(simId);
  res.json(fetchOneSim(simId));
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const simId = Number(req.params.id);
  const sim = fetchOneSim(simId);
  if (!sim) return res.status(404).json({ error: 'not_found' });
  if (sim.assignedAssetTag) return res.status(400).json({ error: 'sim_assigned' });

  db.prepare('DELETE FROM sim_cards WHERE id = ?').run(simId);
  res.json({ status: 'ok' });
});

module.exports = router;
