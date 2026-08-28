const ITEM_TYPES = ['Laptop', 'Desktop', 'Mobile Phone', 'Tablet', 'Monitor', 'Server', 'Printer', 'Network Switch'];
const LOCATIONS = ['London HQ', 'Manchester Office', 'Dublin Office', 'New York Office', 'Singapore Office', 'Remote - UK', 'Remote - US', 'Warehouse - Reading'];
const SUPPLIERS = ['Dell', 'Insight', 'CDW', 'Apple', 'Misco', 'SoftwareONE', 'Cisco', 'Computacenter'];
const STATUSES = ['In Use', 'In Stock', 'In Repair', 'Retired'];
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const TODAY = new Date(TODAY_ISO + 'T00:00:00');
const STATUS_COLORS = { 'In Use': '#34E2A0', 'In Stock': '#4FA3F7', 'In Repair': '#F2B84B', 'Retired': '#8792A2' };
const SIM_STATUS_COLORS = { 'Available': '#4FA3F7', 'Assigned': '#34E2A0', 'Retired': '#8792A2' };
const STATUS_ORDER = ['In Use', 'In Stock', 'In Repair', 'Retired'];
const PAGE_SIZE = 25;

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

function daysUntil(iso) { return Math.round((new Date(iso + 'T00:00:00').getTime() - TODAY.getTime()) / 86400000); }
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

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

function summarize(assets) {
  const byStatus = {};
  let blockedCount = 0, pendingReturnCount = 0, unsignedCount = 0, signedEligible = 0, signedYes = 0;
  assets.forEach((a) => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    if (a.deviceBlocked) blockedCount++;
    if (a.returnDate && daysUntil(a.returnDate) <= 45) pendingReturnCount++;
    if (a.firstName) { signedEligible++; if (a.agreementSigned) signedYes++; else unsignedCount++; }
  });
  return { total: assets.length, byStatus, blockedCount, pendingReturnCount, unsignedCount, signedPct: signedEligible ? Math.round((signedYes / signedEligible) * 100) : 0 };
}
function groupCounts(assets, field) {
  const map = {};
  assets.forEach((a) => { const k = a[field] || 'Unknown'; map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([label, count]) => ({ label, count })).sort((x, y) => y.count - x.count);
}
function attentionList(assets, limit) {
  const items = [];
  assets.forEach((a) => { if (a.deviceBlocked && a.status !== 'Retired') items.push({ ...a, reason: 'Device blocked', reasonColor: '#F2635B', pri: 0 }); });
  assets.forEach((a) => {
    if (a.returnDate) {
      const days = daysUntil(a.returnDate);
      if (days < 0) items.push({ ...a, reason: `Return overdue ${Math.abs(days)}d`, reasonColor: '#F2635B', pri: 1 });
      else if (days <= 14) items.push({ ...a, reason: `Due back in ${days}d`, reasonColor: '#F2B84B', pri: 2 });
    }
  });
  assets.forEach((a) => { if (a.status === 'In Repair') items.push({ ...a, reason: 'Awaiting repair', reasonColor: '#F2B84B', pri: 3 }); });
  assets.forEach((a) => { if (a.firstName && !a.agreementSigned && a.status !== 'Retired') items.push({ ...a, reason: 'Agreement unsigned', reasonColor: '#8792A2', pri: 4 }); });
  items.sort((x, y) => x.pri - y.pri);
  const seen = new Set(); const out = [];
  for (const it of items) { if (!seen.has(it.id)) { seen.add(it.id); out.push(it); } if (out.length >= limit) break; }
  return out;
}
function buildCsv(rows) {
  const cols = ['assetTag', 'itemType', 'model', 'serialNumber', 'ipAddress', 'status', 'location', 'firstName', 'lastName', 'supplier', 'poNumber', 'dateAcquired', 'dateDeployed', 'returnDate', 'dateRetired', 'deviceBlocked', 'agreementSigned'];
  const header = cols.join(',');
  const lines = rows.map((r) => cols.map((c) => {
    let v = r[c];
    if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
    if (v === null || v === undefined) v = '';
    v = String(v);
    if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`; 
    v = v.replace(/"/g, '""');
    return /[,"\n]/.test(v) ? `"${v}"` : v;
  }).join(','));
  return [header, ...lines].join('\n');
}
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const len = text.length;
  for (let i = 0; i < len; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];

  const header = rows[0];
  return rows.slice(1)
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map((r) => {
      const obj = {};
      header.forEach((h, idx) => {
        let v = r[idx] !== undefined ? r[idx] : '';
        if (h === 'deviceBlocked' || h === 'agreementSigned') v = v === 'Yes';
        obj[h] = v;
      });
      return obj;
    });
}
function freshForm() {
  return { assetTag: '', itemType: 'Laptop', model: '', serialNumber: '', ipAddress: '', location: 'London HQ', firstName: '', lastName: '', supplier: 'Dell', poNumber: '', dateAcquired: '', dateDeployed: '', simCardId: '' };
}
function freshSimForm() {
  return { phoneNumber: '', carrier: '', plan: '', iccid: '' };
}