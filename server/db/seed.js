const bcrypt = require('bcryptjs');
const db = require('./db');
const { validatePasswordPolicy } = require('../lib/password');

/* ---- Ported from public/js/data.js (generateAssets + its helpers) ----
   Kept in lockstep with the client generator so the seeded fleet matches
   what the original static demo showed. */

const ITEM_TYPES = ['Laptop', 'Desktop', 'Mobile Phone', 'Tablet', 'Monitor', 'Server', 'Printer', 'Network Switch'];
const LOCATIONS = ['London HQ', 'Manchester Office', 'Dublin Office', 'New York Office', 'Singapore Office', 'Remote - UK', 'Remote - US', 'Warehouse - Reading'];
const SUPPLIERS = ['Dell', 'Insight', 'CDW', 'Apple', 'Misco', 'SoftwareONE', 'Cisco', 'Computacenter'];
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const TODAY = new Date(TODAY_ISO + 'T00:00:00');

const MODELS = {
  'Laptop': ['Dell Latitude 5440', 'Dell Latitude 7440', 'Lenovo ThinkPad T14', 'Lenovo ThinkPad X1 Carbon', 'Apple MacBook Pro 14"', 'Apple MacBook Air M2', 'HP EliteBook 840 G10'],
  'Desktop': ['Dell OptiPlex 7010', 'HP EliteDesk 800 G9', 'Lenovo ThinkCentre M90'],
  'Mobile Phone': ['Apple iPhone 13', 'Apple iPhone 14', 'Apple iPhone 15', 'Samsung Galaxy S22', 'Samsung Galaxy S23'],
  'Tablet': ['Apple iPad Air', 'Apple iPad Pro 11"', 'Samsung Galaxy Tab S8'],
  'Monitor': ['Dell UltraSharp U2422H', 'Dell UltraSharp U2723QE', 'HP E24 G5'],
  'Server': ['Dell PowerEdge R740', 'Dell PowerEdge R650', 'HP ProLiant DL380 Gen10'],
  'Printer': ['HP LaserJet Pro M404', 'Canon imageRUNNER 2630i'],
  'Network Switch': ['Cisco Catalyst 9300', 'Cisco Catalyst 2960-X', 'Juniper EX2300'],
};
const WSUS_GROUPS = ['WSUS-CORP-WKS01', 'WSUS-CORP-WKS02', 'WSUS-SERVERS-PROD', 'WSUS-FINANCE', 'WSUS-EXEC', 'WSUS-REMOTE', 'WSUS-LAB'];
const FIRST_NAMES = ['Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Oliver', 'Isla', 'George', 'Amelia', 'Jack', 'Sophia', 'Harry', 'Mia', 'Jacob', 'Grace', 'Charlie', 'Ella', 'Freddie', 'Poppy', 'Alfie', 'Ruby', 'Oscar', 'Lily', 'Leo', 'Chloe', 'Archie', 'Freya', 'Theo', 'Isabella', 'Arthur'];
const LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Williams', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts', 'Johnson', 'Lewis', 'Walker', 'Robinson', 'Wood', 'Thompson', 'White', 'Watson', 'Jackson', 'Wright', 'Green', 'Harris', 'Cooper', 'King', 'Baker', 'Adams', 'Bell', 'Hall', 'Carter', 'Mitchell'];
const NOTES_POOL = ['Screen replaced under warranty', 'Battery replaced Jan 2026', 'Awaiting return from leaver', 'Loan device — project Atlas', 'Redeployed from Marketing', 'Keyboard repaired', 'Charger replaced', 'Refurbished unit'];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function weightedPick(rng, pairs) {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = rng() * total;
  for (const [val, w] of pairs) { if (r < w) return val; r -= w; }
  return pairs[0][0];
}
function randInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toISO(d) { return d.toISOString().slice(0, 10); }
function randomDateBetween(rng, start, end) { return new Date(start.getTime() + rng() * (end.getTime() - start.getTime())); }
function hex2(rng) { return Math.floor(rng() * 256).toString(16).padStart(2, '0').toUpperCase(); }

function generateAssets(count, seed) {
  const rng = mulberry32(seed || 1337);
  const assets = [];
  const typeWeights = [['Laptop', 32], ['Desktop', 9], ['Mobile Phone', 22], ['Tablet', 6], ['Monitor', 15], ['Server', 3], ['Printer', 6], ['Network Switch', 3]];
  const start2019 = new Date('2019-01-01');
  for (let i = 0; i < count; i++) {
    const itemType = weightedPick(rng, typeWeights);
    const models = MODELS[itemType];
    const model = pick(rng, models);
    const isApple = model.startsWith('Apple');
    const isWindowsCapable = (itemType === 'Laptop' || itemType === 'Desktop' || itemType === 'Server') && !isApple;
    const supplier = isApple ? pick(rng, ['Apple', 'Insight', 'CDW']) : pick(rng, SUPPLIERS);
    const status = weightedPick(rng, [['In Use', 68], ['In Stock', 18], ['In Repair', 5], ['Retired', 9]]);
    const dateAcquired = randomDateBetween(rng, start2019, TODAY);
    const hasAssignee = status !== 'In Stock';
    const firstName = hasAssignee ? pick(rng, FIRST_NAMES) : '';
    const lastName = hasAssignee ? pick(rng, LAST_NAMES) : '';
    const dateDeployed = hasAssignee ? toISO(addDays(dateAcquired, randInt(rng, 0, 45))) : '';
    let dateRetired = '';
    if (status === 'Retired') {
      const base = dateDeployed ? new Date(dateDeployed) : dateAcquired;
      const ret = addDays(base, randInt(rng, 200, 1800));
      dateRetired = toISO(ret.getTime() > TODAY.getTime() ? TODAY : ret);
    }
    let returnDate = '';
    if (status !== 'Retired' && rng() < 0.11) returnDate = toISO(addDays(TODAY, randInt(rng, -12, 45)));
    const deviceBlocked = status === 'Retired' ? rng() < 0.5 : rng() < 0.02;
    const agreementSigned = hasAssignee ? rng() < 0.87 : false;
    const notes = rng() < 0.3 ? pick(rng, NOTES_POOL) : '';
    const macAddress = itemType === 'Monitor' ? '' : `${hex2(rng)}:${hex2(rng)}:${hex2(rng)}:${hex2(rng)}:${hex2(rng)}:${hex2(rng)}`;
    const imei = (itemType === 'Mobile Phone' || itemType === 'Tablet') ? String(randInt(rng, 100000000000000, 999999999999999)) : '';
    const telephoneNumber = itemType === 'Mobile Phone' ? `+44 7${randInt(rng, 100, 999)} ${randInt(rng, 100000, 999999)}` : '';
    const wsusGroup = isWindowsCapable ? pick(rng, WSUS_GROUPS) : '';
    const expressTag = supplier === 'Dell' ? String(randInt(rng, 10000000000, 99999999999)) : '';
    const serialNumber = Array.from({ length: 9 }, () => pick(rng, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''))).join('');
    const poNumber = `PO-${dateAcquired.getFullYear()}-${randInt(rng, 1000, 9999)}`;
    const assetTag = `AST-${String(i + 1).padStart(6, '0')}`;
    const location = pick(rng, LOCATIONS);
    const history = [];
    history.push({ date: toISO(dateAcquired), text: `Received from ${supplier} — PO ${poNumber}` });
    if (dateDeployed) history.push({ date: dateDeployed, text: `Deployed to ${firstName} ${lastName} at ${location}` });
    if (status === 'In Repair') history.push({ date: toISO(addDays(TODAY, -randInt(rng, 1, 20))), text: `Flagged for maintenance — ${notes || 'hardware fault reported'}` });
    if (status === 'Retired') history.push({ date: dateRetired, text: 'Asset retired and decommissioned' });
    history.sort((a, b) => (a.date < b.date ? -1 : 1));
    assets.push({ id: assetTag, assetTag, itemType, model, serialNumber, expressTag, macAddress, imei, wsusGroup, telephoneNumber, poNumber, deviceBlocked, location, firstName, lastName, dateAcquired: toISO(dateAcquired), dateDeployed, returnDate, dateRetired, notes, agreementSigned, supplier, status, history });
  }
  return assets;
}

/* ---- Seeding ---- */

function seedAssets() {
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM assets').get();
  if (countRow.n > 0) {
    console.log(`Assets already seeded (${countRow.n} rows) — skipping.`);
    return;
  }

  const assets = generateAssets(2150, 42);

  const insertAsset = db.prepare(`
    INSERT INTO assets (
      asset_tag, item_type, model, serial_number, express_tag, mac_address, imei,
      wsus_group, telephone_number, po_number, device_blocked, location,
      first_name, last_name, date_acquired, date_deployed, return_date, date_retired,
      notes, agreement_signed, supplier, status
    ) VALUES (
      @assetTag, @itemType, @model, @serialNumber, @expressTag, @macAddress, @imei,
      @wsusGroup, @telephoneNumber, @poNumber, @deviceBlocked, @location,
      @firstName, @lastName, @dateAcquired, @dateDeployed, @returnDate, @dateRetired,
      @notes, @agreementSigned, @supplier, @status
    )
  `);
  const insertHistory = db.prepare('INSERT INTO asset_history (asset_tag, date, text) VALUES (?, ?, ?)');

  db.exec('BEGIN');
  try {
    for (const a of assets) {
      insertAsset.run({
        assetTag: a.assetTag, itemType: a.itemType, model: a.model, serialNumber: a.serialNumber,
        expressTag: a.expressTag, macAddress: a.macAddress, imei: a.imei, wsusGroup: a.wsusGroup,
        telephoneNumber: a.telephoneNumber, poNumber: a.poNumber, deviceBlocked: a.deviceBlocked ? 1 : 0,
        location: a.location, firstName: a.firstName, lastName: a.lastName, dateAcquired: a.dateAcquired,
        dateDeployed: a.dateDeployed, returnDate: a.returnDate, dateRetired: a.dateRetired, notes: a.notes,
        agreementSigned: a.agreementSigned ? 1 : 0, supplier: a.supplier, status: a.status,
      });
      for (const h of a.history) insertHistory.run(a.assetTag, h.date, h.text);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  console.log(`Seeded ${assets.length} assets.`);
}

function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin bootstrap.');
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`Admin user ${email} already exists — skipping.`);
    return;
  }

  const errors = validatePasswordPolicy(password);
  if (errors.length) {
    console.error(`SEED_ADMIN_PASSWORD does not meet policy:\n - ${errors.join('\n - ')}`);
    process.exitCode = 1;
    return;
  }

  const hash = bcrypt.hashSync(password, 12);
  db.prepare(`
    INSERT INTO users (email, password_hash, role, mfa_enabled, active)
    VALUES (?, ?, 'admin', 0, 1)
  `).run(email, hash);

  console.log(`Bootstrap admin created: ${email} (MFA enrollment required on first login).`);
}

seedAssets();
seedAdmin();
