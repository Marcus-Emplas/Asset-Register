const express = require('express');
const db = require('../db/db');
const { rowToAsset } = require('../lib/assetMapper');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fetchAllAssets() {
  const rows = db.prepare('SELECT * FROM assets ORDER BY asset_tag').all();
  const historyRows = db.prepare('SELECT * FROM asset_history ORDER BY asset_tag, date').all();
  const historyByTag = new Map();
  for (const h of historyRows) {
    if (!historyByTag.has(h.asset_tag)) historyByTag.set(h.asset_tag, []);
    historyByTag.get(h.asset_tag).push(h);
  }
  return rows.map((row) => rowToAsset(row, historyByTag.get(row.asset_tag)));
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
  res.json(fetchAllAssets());
});

router.post('/', requireRole('admin'), (req, res) => {
  const body = req.body || {};
  const assetTag = (body.assetTag || '').trim();
  const itemType = (body.itemType || '').trim();
  const model = (body.model || '').trim();

  const errors = {};
  if (!assetTag) errors.assetTag = 'Asset tag is required';
  else if (db.prepare('SELECT 1 FROM assets WHERE asset_tag = ?').get(assetTag)) errors.assetTag = 'Asset tag already exists';
  if (!itemType) errors.itemType = 'Required';
  if (!model) errors.model = 'Model is required';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'validation_failed', fields: errors });

  const firstName = (body.firstName || '').trim();
  const lastName = (body.lastName || '').trim();
  const today = todayIso();
  const status = firstName ? 'In Use' : 'In Stock';
  const supplier = body.supplier || 'Dell';

  db.prepare(`
    INSERT INTO assets (
      asset_tag, item_type, model, serial_number, express_tag, mac_address, ip_address, imei,
      wsus_group, telephone_number, po_number, device_blocked, location, company,
      first_name, last_name, date_acquired, date_deployed, return_date, date_retired,
      notes, agreement_signed, supplier, status
    ) VALUES (
      @assetTag, @itemType, @model, @serialNumber, '', '', @ipAddress, '',
      '', '', @poNumber, 0, @location, @company,
      @firstName, @lastName, @dateAcquired, @dateDeployed, '', '',
      '', 0, @supplier, @status
    )
  `).run({
    assetTag, itemType, model,
    serialNumber: (body.serialNumber || '').trim() || '—',
    ipAddress: (body.ipAddress || '').trim(),
    poNumber: (body.poNumber || '').trim() || '—',
    location: body.location || 'London HQ',
    company: (body.company || '').trim(),
    firstName, lastName,
    dateAcquired: today,
    dateDeployed: firstName ? today : '',
    supplier, status,
  });
  addHistory(assetTag, today, `Received from ${supplier} — added to register`);

  res.status(201).json(fetchOneAsset(assetTag));
});

router.post('/bulk', (req, res) => {
  const { ids, action } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'no_ids' });
  if (!['check-in-out', 'flag-repair', 'retire'].includes(action)) return res.status(400).json({ error: 'invalid_action' });
  if (action === 'retire' && (!req.user || req.user.role !== 'admin')) return res.status(403).json({ error: 'forbidden' });

  const today = todayIso();
  const updatedTags = [];

  db.exec('BEGIN');
  try {
    for (const tag of ids) {
      const row = db.prepare('SELECT status FROM assets WHERE asset_tag = ?').get(tag);
      if (!row) continue;

      if (action === 'check-in-out') {
        let newStatus, historyText;
        if (row.status === 'In Use') { newStatus = 'In Stock'; historyText = 'Checked in to stock'; }
        else if (row.status === 'In Stock') { newStatus = 'In Use'; historyText = 'Checked out from stock'; }
        else if (row.status === 'In Repair') { newStatus = 'In Use'; historyText = 'Repair complete — returned to service'; }
        else continue;
        db.prepare("UPDATE assets SET status = ?, updated_at = datetime('now') WHERE asset_tag = ?").run(newStatus, tag);
        addHistory(tag, today, historyText);
      } else if (action === 'flag-repair') {
        db.prepare("UPDATE assets SET status = 'In Repair', updated_at = datetime('now') WHERE asset_tag = ?").run(tag);
        addHistory(tag, today, 'Flagged for maintenance');
      } else if (action === 'retire') {
        db.prepare("UPDATE assets SET status = 'Retired', date_retired = ?, device_blocked = 1, updated_at = datetime('now') WHERE asset_tag = ?").run(today, tag);
        addHistory(tag, today, 'Asset retired and decommissioned');
      }
      updatedTags.push(tag);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  res.json({ updated: updatedTags.map((tag) => fetchOneAsset(tag)) });
});

router.post('/import', requireRole('admin'), (req, res) => {
  const rows = (req.body && req.body.rows) || [];
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'no_rows' });

  const today = todayIso();
  const inserted = [];
  const skipped = [];
  const seenInBatch = new Set();

  db.exec('BEGIN');
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const assetTag = (row.assetTag || '').trim();
      const itemType = (row.itemType || '').trim();
      const model = (row.model || '').trim();

      if (!assetTag) { skipped.push({ row: i, reason: 'Asset tag is required' }); continue; }
      if (!itemType) { skipped.push({ row: i, reason: 'Item type is required' }); continue; }
      if (!model) { skipped.push({ row: i, reason: 'Model is required' }); continue; }
      if (seenInBatch.has(assetTag)) { skipped.push({ row: i, reason: 'Duplicate asset tag in file' }); continue; }
      if (db.prepare('SELECT 1 FROM assets WHERE asset_tag = ?').get(assetTag)) {
        skipped.push({ row: i, reason: 'Asset tag already exists' });
        continue;
      }

      const firstName = (row.firstName || '').trim();
      const lastName = (row.lastName || '').trim();
      const status = ['In Use', 'In Stock', 'In Repair', 'Retired'].includes(row.status)
        ? row.status
        : (firstName ? 'In Use' : 'In Stock');
      const supplier = row.supplier || 'Dell';

      db.prepare(`
        INSERT INTO assets (
          asset_tag, item_type, model, serial_number, express_tag, mac_address, ip_address, imei,
          wsus_group, telephone_number, po_number, device_blocked, location, company,
          first_name, last_name, date_acquired, date_deployed, return_date, date_retired,
          notes, agreement_signed, supplier, status
        ) VALUES (
          @assetTag, @itemType, @model, @serialNumber, '', '', @ipAddress, '',
          '', '', @poNumber, @deviceBlocked, @location, @company,
          @firstName, @lastName, @dateAcquired, @dateDeployed, @returnDate, @dateRetired,
          '', @agreementSigned, @supplier, @status
        )
      `).run({
        assetTag, itemType, model,
        serialNumber: (row.serialNumber || '').trim() || '—',
        ipAddress: (row.ipAddress || '').trim(),
        poNumber: (row.poNumber || '').trim() || '—',
        location: row.location || 'London HQ',
        company: (row.company || '').trim(),
        firstName, lastName,
        dateAcquired: row.dateAcquired || today,
        dateDeployed: row.dateDeployed || '',
        returnDate: row.returnDate || '',
        dateRetired: row.dateRetired || '',
        deviceBlocked: row.deviceBlocked ? 1 : 0,
        agreementSigned: row.agreementSigned ? 1 : 0,
        supplier, status,
      });
      addHistory(assetTag, today, 'Imported via CSV — added to register');
      seenInBatch.add(assetTag);
      inserted.push(assetTag);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  res.json({ inserted: inserted.length, skipped });
});

router.patch('/:id', (req, res) => {
  const tag = req.params.id;
  const existing = fetchOneAsset(tag);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  if (existing.status === 'Retired') return res.status(400).json({ error: 'asset_retired' });

  const body = req.body || {};
  const today = todayIso();
  const updates = {};
  const historyLines = [];

  if (body.firstName !== undefined || body.lastName !== undefined) {
    const firstName = (body.firstName !== undefined ? body.firstName : existing.firstName).trim();
    const lastName = (body.lastName !== undefined ? body.lastName : existing.lastName).trim();
    const hadAssignee = !!existing.firstName;
    const hasAssignee = !!firstName;
    updates.first_name = firstName;
    updates.last_name = lastName;

    if (!hadAssignee && hasAssignee) {
      if (existing.status === 'In Stock') {
        updates.status = 'In Use';
        if (!existing.dateDeployed) updates.date_deployed = today;
      }
      historyLines.push(`Deployed to ${firstName} ${lastName}`);
    } else if (hadAssignee && !hasAssignee) {
      if (existing.status === 'In Use') updates.status = 'In Stock';
      historyLines.push('Unassigned — returned to stock');
    } else if (hadAssignee && hasAssignee && (firstName !== existing.firstName || lastName !== existing.lastName)) {
      historyLines.push(`Reassigned to ${firstName} ${lastName}`);
    }
  }

  if (body.location !== undefined) {
    const location = (body.location || '').trim();
    if (location && location !== existing.location) {
      updates.location = location;
      historyLines.push(`Moved to ${location}`);
    }
  }

  if (body.company !== undefined) {
    const company = (body.company || '').trim();
    if (company !== existing.company) {
      updates.company = company;
      historyLines.push(company ? `Company set to ${company}` : 'Company cleared');
    }
  }

  if (body.deviceBlocked !== undefined) {
    const blocked = !!body.deviceBlocked;
    if (blocked !== existing.deviceBlocked) {
      updates.device_blocked = blocked ? 1 : 0;
      historyLines.push(blocked ? 'Device blocked' : 'Device unblocked');
    }
  }

  if (body.agreementSigned !== undefined) {
    updates.agreement_signed = body.agreementSigned ? 1 : 0;
  }

  if (body.notes !== undefined) {
    updates.notes = (body.notes || '').trim();
  }

  if (body.costTracked !== undefined || body.cost !== undefined) {
    const costTracked = body.costTracked !== undefined ? !!body.costTracked : existing.costTracked;
    let cost = null;
    if (costTracked) {
      const parsed = parseFloat(body.cost);
      cost = Number.isFinite(parsed) ? parsed : null;
    }
    if (costTracked !== existing.costTracked || cost !== existing.cost) {
      historyLines.push(costTracked && cost !== null ? `Cost recorded: £${cost.toFixed(2)}` : (costTracked ? 'Cost tracking enabled' : 'Cost tracking cleared'));
    }
    updates.cost_tracked = costTracked ? 1 : 0;
    updates.cost = cost;
  }

  if (Object.keys(updates).length > 0) {
    const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE assets SET ${setClauses}, updated_at = datetime('now') WHERE asset_tag = @assetTag`)
      .run({ ...updates, assetTag: tag });
    for (const line of historyLines) addHistory(tag, today, line);
  }

  res.json(fetchOneAsset(tag));
});

router.post('/:id/check-in-out', (req, res) => {
  const tag = req.params.id;
  const row = db.prepare('SELECT status FROM assets WHERE asset_tag = ?').get(tag);
  if (!row) return res.status(404).json({ error: 'not_found' });

  const today = todayIso();
  let newStatus, historyText;
  if (row.status === 'In Use') { newStatus = 'In Stock'; historyText = 'Checked in to stock'; }
  else if (row.status === 'In Stock') { newStatus = 'In Use'; historyText = 'Checked out from stock'; }
  else if (row.status === 'In Repair') { newStatus = 'In Use'; historyText = 'Repair complete — returned to service'; }
  else return res.status(400).json({ error: 'invalid_status_transition' });

  db.prepare("UPDATE assets SET status = ?, updated_at = datetime('now') WHERE asset_tag = ?").run(newStatus, tag);
  addHistory(tag, today, historyText);

  res.json(fetchOneAsset(tag));
});

router.post('/:id/flag-repair', (req, res) => {
  const tag = req.params.id;
  const row = db.prepare('SELECT status FROM assets WHERE asset_tag = ?').get(tag);
  if (!row) return res.status(404).json({ error: 'not_found' });

  const today = todayIso();
  db.prepare("UPDATE assets SET status = 'In Repair', updated_at = datetime('now') WHERE asset_tag = ?").run(tag);
  addHistory(tag, today, 'Flagged for maintenance');

  res.json(fetchOneAsset(tag));
});

router.post('/:id/retire', requireRole('admin'), (req, res) => {
  const tag = req.params.id;
  const row = db.prepare('SELECT status FROM assets WHERE asset_tag = ?').get(tag);
  if (!row) return res.status(404).json({ error: 'not_found' });

  const today = todayIso();
  db.prepare(`
    UPDATE assets SET status = 'Retired', date_retired = ?, device_blocked = 1, updated_at = datetime('now')
    WHERE asset_tag = ?
  `).run(today, tag);
  addHistory(tag, today, 'Asset retired and decommissioned');

  res.json(fetchOneAsset(tag));
});

module.exports = router;
