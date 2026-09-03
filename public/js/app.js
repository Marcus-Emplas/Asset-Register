(function () {
  'use strict';

  const root = document.getElementById('app');

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function tint(hex) {
    if (!hex) return 'rgba(135,146,162,0.14)';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.14)`;
  }

  function fieldLabel(value) {
    const opt = ASSET_FIELD_OPTIONS.find((f) => f.value === value);
    return opt ? opt.label : value;
  }

  function fmtDateTime(v) { return v ? formatDate(String(v).slice(0, 10)) : '—'; }
  function fmtBool(v) { return v ? 'Yes' : 'No'; }

  // Every column a table CAN show. `defaultColumns` on the table entry below
  // controls which of these are visible until the user customizes it via the
  // column picker (state persisted server-side, see saveColumnPrefs).
  const ASSET_COLUMN_DEFS = [
    { key: 'assetTag', label: 'TAG', width: 120, sortAct: 'sortTag', render: (r) => `<div class="cell-mono">${escapeHtml(r.assetTag)}</div>` },
    { key: 'itemType', label: 'TYPE', width: 100, render: (r) => `<div class="cell-dim">${escapeHtml(r.itemType)}</div>` },
    { key: 'model', label: 'MODEL', width: 240, render: (r) => `<div class="cell-ellipsis" style="color:#E8EDF3;">${escapeHtml(r.model)}</div>` },
    { key: 'assignedTo', label: 'ASSIGNED TO', width: 150, render: (r) => `<div class="cell-dim cell-ellipsis">${escapeHtml(r.assigneeName)}</div>` },
    { key: 'location', label: 'LOCATION', width: 130, render: (r) => `<div class="cell-dim cell-ellipsis">${escapeHtml(r.location)}</div>` },
    { key: 'company', label: 'COMPANY', width: 120, render: (r) => `<div class="cell-dim cell-ellipsis">${escapeHtml(r.company || '—')}</div>` },
    { key: 'ipAddress', label: 'IP ADDRESS', width: 130, render: (r) => `<div class="cell-mono cell-ellipsis">${r.ipAddress ? `<a class="ip-link" href="http://${encodeURIComponent(r.ipAddress)}" target="_blank" rel="noopener noreferrer" data-act="noop">${escapeHtml(r.ipAddress)}</a>` : '<span class="cell-dim">—</span>'}</div>` },
    { key: 'status', label: 'STATUS', width: 110, sortAct: 'sortStatus', render: (r) => `<div><span class="status-pill" style="background:${r.statusBg};color:${r.statusColor};">${escapeHtml(r.status)}</span></div>` },
    { key: 'dateDeployed', label: 'DEPLOYED', width: 100, sortAct: 'sortDeployed', render: (r) => `<div class="cell-deployed">${escapeHtml(r.deployedStr)}</div>` },
    { key: 'serialNumber', label: 'SERIAL', width: 130, render: (r) => `<div class="cell-mono cell-ellipsis">${escapeHtml(r.serialNumber || '—')}</div>` },
    { key: 'expressTag', label: 'EXPRESS TAG', width: 120, render: (r) => `<div class="cell-dim cell-ellipsis">${escapeHtml(r.expressTag || '—')}</div>` },
    { key: 'macAddress', label: 'MAC ADDRESS', width: 150, render: (r) => `<div class="cell-mono cell-ellipsis">${escapeHtml(r.macAddress || '—')}</div>` },
    { key: 'imei', label: 'IMEI', width: 140, render: (r) => `<div class="cell-mono cell-ellipsis">${escapeHtml(r.imei || '—')}</div>` },
    { key: 'wsusGroup', label: 'WSUS GROUP', width: 140, render: (r) => `<div class="cell-dim cell-ellipsis">${escapeHtml(r.wsusGroup || '—')}</div>` },
    { key: 'telephoneNumber', label: 'TELEPHONE', width: 130, render: (r) => `<div class="cell-mono cell-ellipsis">${escapeHtml(r.telephoneNumber || '—')}</div>` },
    { key: 'poNumber', label: 'PO NUMBER', width: 120, render: (r) => `<div class="cell-mono cell-ellipsis">${escapeHtml(r.poNumber || '—')}</div>` },
    { key: 'deviceBlocked', label: 'BLOCKED', width: 90, render: (r) => `<div class="cell-dim">${fmtBool(r.deviceBlocked)}</div>` },
    { key: 'dateAcquired', label: 'ACQUIRED', width: 100, render: (r) => `<div class="cell-deployed">${fmtDateTime(r.dateAcquired)}</div>` },
    { key: 'returnDate', label: 'RETURN DATE', width: 110, render: (r) => `<div class="cell-deployed">${fmtDateTime(r.returnDate)}</div>` },
    { key: 'dateRetired', label: 'RETIRED', width: 100, render: (r) => `<div class="cell-deployed">${fmtDateTime(r.dateRetired)}</div>` },
    { key: 'notes', label: 'NOTES', width: 200, render: (r) => `<div class="cell-dim cell-ellipsis">${escapeHtml(r.notes || '—')}</div>` },
    { key: 'agreementSigned', label: 'AGREEMENT', width: 100, render: (r) => `<div class="cell-dim">${fmtBool(r.agreementSigned)}</div>` },
    { key: 'supplier', label: 'SUPPLIER', width: 110, render: (r) => `<div class="cell-dim cell-ellipsis">${escapeHtml(r.supplier || '—')}</div>` },
    { key: 'cost', label: 'COST', width: 90, render: (r) => `<div class="cell-mono">${r.costTracked && r.cost !== null && r.cost !== undefined && r.cost !== '' ? '£' + escapeHtml(r.cost) : '—'}</div>` },
  ];
  const USER_COLUMN_DEFS = [
    { key: 'email', label: 'EMAIL', width: 260, render: (u) => `<div class="cell-ellipsis" style="color:#E8EDF3;">${escapeHtml(u.email)}</div>` },
    { key: 'role', label: 'ROLE', width: 130, render: (u) => `<div><select class="form-select" data-bind="userRole.${u.id}" style="padding:5px 8px;font-size:12px;"><option value="standard" ${u.role === 'standard' ? 'selected' : ''}>Standard</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option></select></div>` },
    { key: 'mfaEnabled', label: 'MFA', width: 120, render: (u) => `<div class="cell-dim">${u.mfaEnabled ? 'Enrolled' : 'Not enrolled'}</div>` },
    { key: 'active', label: 'STATUS', width: 100, render: (u) => `<div><span class="status-pill" style="background:${u.active ? 'rgba(52,226,160,0.14)' : 'rgba(242,99,91,0.14)'};color:${u.active ? '#34E2A0' : '#F2635B'};">${u.active ? 'Active' : 'Disabled'}</span></div>` },
    { key: 'createdAt', label: 'CREATED', width: 110, render: (u) => `<div class="cell-deployed">${fmtDateTime(u.createdAt)}</div>` },
  ];
  const SIMCARD_COLUMN_DEFS = [
    { key: 'phoneNumber', label: 'NUMBER', width: 140, render: (sc) => `<div class="cell-mono" style="color:#E8EDF3;">${escapeHtml(sc.phoneNumber)}</div>` },
    { key: 'carrier', label: 'CARRIER', width: 110, render: (sc) => `<div class="cell-dim">${escapeHtml(sc.carrier || '—')}</div>` },
    { key: 'plan', label: 'PLAN', width: 140, render: (sc) => `<div class="cell-dim cell-ellipsis">${escapeHtml(sc.plan || '—')}</div>` },
    { key: 'assignedAssetTag', label: 'ASSIGNED TO', width: 200, render: (sc) => `<div class="cell-dim cell-ellipsis">${escapeHtml(sc.assignedLabel)}</div>` },
    { key: 'status', label: 'STATUS', width: 110, render: (sc) => `<div><span class="status-pill" style="background:${tint(SIM_STATUS_COLORS[sc.status])};color:${SIM_STATUS_COLORS[sc.status]};">${escapeHtml(sc.status)}</span></div>` },
    { key: 'iccid', label: 'ICCID', width: 150, render: (sc) => `<div class="cell-mono cell-ellipsis">${escapeHtml(sc.iccid || '—')}</div>` },
    { key: 'notes', label: 'NOTES', width: 180, render: (sc) => `<div class="cell-dim cell-ellipsis">${escapeHtml(sc.notes || '—')}</div>` },
    { key: 'createdAt', label: 'CREATED', width: 110, render: (sc) => `<div class="cell-deployed">${fmtDateTime(sc.createdAt)}</div>` },
  ];

  const COLUMN_TABLES = {
    assets: { defs: ASSET_COLUMN_DEFS, defaultColumns: ['assetTag', 'itemType', 'model', 'assignedTo', 'location', 'company', 'ipAddress', 'status', 'dateDeployed'] },
    deprecated: { defs: ASSET_COLUMN_DEFS, defaultColumns: ['assetTag', 'itemType', 'model', 'location', 'dateRetired'] },
    users: { defs: USER_COLUMN_DEFS, defaultColumns: ['email', 'role', 'mfaEnabled', 'active'] },
    simCards: { defs: SIMCARD_COLUMN_DEFS, defaultColumns: ['phoneNumber', 'carrier', 'plan', 'assignedAssetTag', 'status'] },
  };
  const COLUMN_MIN_WIDTH = 60;
  const COLUMN_WIDTHS_KEY = 'assetHub.columnWidths';
  // Fixed, non-toggleable columns (checkbox / row actions) that flank the
  // toggleable ones — their width isn't part of columnWidths, just baked in
  // here so both the render pass and the drag handler build the same --cols.
  const COLUMN_PINNED = {
    assets: { left: 32 },
    users: { right: 260 },
    simCards: { right: 260 },
  };

  // Which columns are visible, and in what order, for a table — always the
  // defs' own pool order (no drag-reordering), filtered down to whatever the
  // user has chosen (falling back to the table's defaults). Filtering against
  // `defs` also silently drops any stale/unknown keys from old prefs.
  function resolveVisibleColumns(tableKey, columnPrefs) {
    const { defs, defaultColumns } = COLUMN_TABLES[tableKey];
    const saved = columnPrefs && Array.isArray(columnPrefs[tableKey]) ? columnPrefs[tableKey] : null;
    const set = new Set(saved && saved.length ? saved : defaultColumns);
    return defs.filter((d) => set.has(d.key)).map((d) => d.key);
  }

  function loadColumnWidths() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(COLUMN_WIDTHS_KEY) || '{}'); } catch (e) { saved = {}; }
    const widths = {};
    for (const tableKey in COLUMN_TABLES) {
      const s = saved[tableKey] && typeof saved[tableKey] === 'object' ? saved[tableKey] : {};
      const table = {};
      COLUMN_TABLES[tableKey].defs.forEach((d) => { table[d.key] = typeof s[d.key] === 'number' ? s[d.key] : d.width; });
      widths[tableKey] = table;
    }
    return widths;
  }
  function saveColumnWidths(widths) {
    try { localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths)); } catch (e) { /* ignore */ }
  }
  // Builds the --cols value for a table: any pinned (non-toggleable) leading
  // column width, then one width per visible column in order, then any
  // pinned trailing column width.
  function colsVar(widths, visibleKeys, pinnedLeft, pinnedRight) {
    const parts = [];
    if (pinnedLeft) parts.push(`${pinnedLeft}px`);
    visibleKeys.forEach((k) => parts.push(`${widths[k] || 100}px`));
    if (pinnedRight) parts.push(`${pinnedRight}px`);
    return parts.join(' ');
  }
  function resizeHandle(tableKey, key) {
    return `<div class="col-resize-handle" data-resize-table="${tableKey}" data-resize-key="${key}"></div>`;
  }

  const SIDEBAR_COLLAPSED_KEY = 'assetHub.sidebarCollapsed';
  function loadSidebarCollapsed() {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch (e) { return false; }
  }
  function saveSidebarCollapsed(collapsed) {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  // Renders the toggleable header cells for a table. `arrowFn(def)` supplies
  // the sort arrow text for sortable columns; `noHandleOnLast` suppresses the
  // handle on the last visible column when nothing (no pinned column) follows it.
  function renderColumnHeaders(tableKey, visibleKeys, defsByKey, arrowFn, noHandleOnLast) {
    return visibleKeys.map((key, i) => {
      const def = defsByKey[key];
      const isLast = noHandleOnLast && i === visibleKeys.length - 1;
      const sortAttr = def.sortAct ? ` class="sortable" data-act="${def.sortAct}"` : '';
      const arrowText = arrowFn ? arrowFn(def) : '';
      return `<div${sortAttr}>${escapeHtml(def.label)}${arrowText}${isLast ? '' : resizeHandle(tableKey, key)}</div>`;
    }).join('');
  }
  function defsByKeyOf(tableKey) {
    const map = {};
    COLUMN_TABLES[tableKey].defs.forEach((d) => { map[d.key] = d; });
    return map;
  }

  class App {
    constructor() {
      this.state = {
        assets: [], ready: false, toast: null,
        screen: 'overview', search: '', statusFilter: [], typeFilter: '', locationFilter: '',
        sortCol: 'assetTag', sortDir: 'asc', page: 1, selectedId: null, drawerOpen: false,
        addOpen: false, form: freshForm(), formErrors: {},
        detailForm: freshDetailForm(),
        reportBuilder: { customReportId: null },
        customReports: [],
        newReportOpen: false, newReportForm: { name: '', fields: [] }, newReportErrors: {},
        exportPickerOpen: false,
        currentUser: null,
        authScreen: 'login', authForm: { email: '', password: '' }, authError: '', authInfo: '', authSubmitting: false,
        mfaForm: { token: '' }, mfaError: '',
        forgotForm: { email: '' }, forgotError: '', forgotSubmitting: false,
        resetForm: { email: '', code: '', newPassword: '', confirmPassword: '' }, resetError: '', resetSubmitting: false,
        mfaEnroll: { qr: '', manualKey: '' },
        selectedIds: [],
        deprecatedPage: 1,
        columnWidths: loadColumnWidths(),
        columnPrefs: {}, columnPickerTable: null,
        sidebarCollapsed: loadSidebarCollapsed(),
        csvImport: { open: false, step: 'pick', fileName: '', rows: [], results: null },
        users: [], userForm: { email: '', password: '', role: 'standard' }, userFormErrors: {},
        accountForm: { currentPassword: '', newPassword: '', confirmPassword: '' }, accountFormErrors: {},
        simCards: [], simForm: freshSimForm(), simFormErrors: {},
      };
      this._toastTimer = null;
      this._searchDebounceTimer = null;
    }

    async init() {
      this.render();
      Api.onUnauthorized = () => {
        if (this.state.currentUser) this.setState({ currentUser: null, assets: [], ready: false, authScreen: 'login' });
      };
      try {
        const me = await Api.get('/api/me');
        this.setState({ currentUser: me, columnPrefs: me.columnPrefs || {} });
        await this.loadAssets();
        await this.loadSimCards();
        await this.loadCustomReports();
      } catch (e) {
        this.setState({ currentUser: null, ready: false });
      }
    }

    async loadAssets() {
      const assets = await Api.get('/api/assets');
      this.setState({ assets, ready: true });
    }

    async loadSimCards() {
      try {
        const simCards = await Api.get('/api/simcards');
        this.setState({ simCards });
      } catch (e) { /* non-fatal — sim assignment UI just shows empty */ }
    }

    async loadCustomReports() {
      try {
        const customReports = await Api.get('/api/reports');
        this.setState({ customReports });
      } catch (e) { /* non-fatal — custom report picker just shows empty */ }
    }

    setState(patch) {
      const next = typeof patch === 'function' ? patch(this.state) : patch;
      if (next) Object.assign(this.state, next);
      this.render();
    }

    showToast(msg) {
      const id = Math.random();
      this.setState({ toast: { msg, id } });
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        if (this.state.toast && this.state.toast.id === id) this.setState({ toast: null });
      }, 2600);
    }

    setScreen(screen) { this.setState({ screen, drawerOpen: false }); }
    toggleSidebar() {
      const collapsed = !this.state.sidebarCollapsed;
      saveSidebarCollapsed(collapsed);
      this.setState({ sidebarCollapsed: collapsed });
    }
    setSearch(value) {
      // Update state immediately but debounce the re-render: rebuilding the
      // page on every keystroke replaces the search <input> DOM node, which
      // is what causes the cursor to jump while typing/backspacing. Leaving
      // the node alone while the user is actively typing lets the browser
      // handle the cursor natively; the table just catches up once they pause.
      this.state.search = value;
      this.state.page = 1;
      this.state.selectedIds = [];
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = setTimeout(() => this.render(), 200);
    }
    toggleStatusFilter(status) {
      this.setState((s) => {
        const next = s.statusFilter.includes(status) ? s.statusFilter.filter((x) => x !== status) : [...s.statusFilter, status];
        return { statusFilter: next, page: 1, selectedIds: [] };
      });
    }
    setTypeFilter(value) { this.setState({ typeFilter: value, page: 1, selectedIds: [] }); }
    setLocationFilter(value) { this.setState({ locationFilter: value, page: 1, selectedIds: [] }); }
    setSort(col) {
      this.setState((s) => ({ sortCol: col, sortDir: s.sortCol === col && s.sortDir === 'asc' ? 'desc' : 'asc' }));
    }
    setPage(page) { this.setState({ page, selectedIds: [] }); }
    toggleSelectRow(id) {
      this.setState((s) => ({
        selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id],
      }));
    }
    toggleSelectAll() {
      const vm = this.computeViewModel();
      const pageIds = vm.rows.map((r) => r.id);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => this.state.selectedIds.includes(id));
      this.setState((s) => ({
        selectedIds: allSelected ? s.selectedIds.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...s.selectedIds, ...pageIds])),
      }));
    }
    openDetail(id) {
      const asset = this.state.assets.find((a) => a.id === id);
      this.setState({
        selectedId: id, drawerOpen: true,
        detailForm: asset ? this.detailFormFromAsset(asset) : freshDetailForm(),
      });
    }
    closeDetail() { this.setState({ drawerOpen: false }); }
    openAdd() { this.setState({ addOpen: true, formErrors: {} }); }
    closeAdd() { this.setState({ addOpen: false }); }
    updateFormField(field, value) { this.setState((s) => ({ form: { ...s.form, [field]: value } })); }
    updateAuthField(field, value) { this.setState((s) => ({ authForm: { ...s.authForm, [field]: value } })); }
    updateMfaField(field, value) { this.setState((s) => ({ mfaForm: { ...s.mfaForm, [field]: value } })); }
    updateForgotField(field, value) { this.setState((s) => ({ forgotForm: { ...s.forgotForm, [field]: value } })); }
    updateResetField(field, value) { this.setState((s) => ({ resetForm: { ...s.resetForm, [field]: value } })); }

    goForgotPassword() {
      this.setState({
        authScreen: 'forgot-password',
        forgotForm: { email: this.state.authForm.email || '' },
        forgotError: '',
      });
    }

    async submitForgotPassword() {
      const { email } = this.state.forgotForm;
      if (!email) { this.setState({ forgotError: 'Email is required' }); return; }
      this.setState({ forgotSubmitting: true, forgotError: '' });
      try {
        await Api.post('/api/auth/forgot-password', { email });
        this.setState({
          authScreen: 'reset-password', forgotSubmitting: false,
          resetForm: { email, code: '', newPassword: '', confirmPassword: '' }, resetError: '',
        });
      } catch (e) {
        this.setState({ forgotError: e.status === 429 ? 'Too many attempts — try again later' : 'Something went wrong — try again', forgotSubmitting: false });
      }
    }

    async submitResetPassword() {
      const { email, code, newPassword, confirmPassword } = this.state.resetForm;
      if (!code || !newPassword || !confirmPassword) { this.setState({ resetError: 'All fields are required' }); return; }
      if (newPassword !== confirmPassword) { this.setState({ resetError: 'Passwords do not match' }); return; }
      this.setState({ resetSubmitting: true, resetError: '' });
      try {
        await Api.post('/api/auth/reset-password', { email, code, newPassword });
        this.setState({
          authScreen: 'login', resetSubmitting: false,
          authForm: { email, password: '' }, authError: '', authInfo: 'Password reset — sign in with your new password',
        });
      } catch (e) {
        let msg = 'Something went wrong — try again';
        if (e.status === 429) msg = 'Too many attempts — try again later';
        else if (e.status === 400 && e.data && e.data.fields && e.data.fields.newPassword) msg = e.data.fields.newPassword;
        else if (e.status === 401) msg = 'Invalid or expired code';
        this.setState({ resetError: msg, resetSubmitting: false });
      }
    }

    async submitLogin() {
      const { email, password } = this.state.authForm;
      if (!email || !password) { this.setState({ authError: 'Email and password are required' }); return; }
      this.setState({ authSubmitting: true, authError: '', authInfo: '' });
      try {
        const res = await Api.post('/api/auth/login', { email, password });
        if (res.status === 'mfa_verify') {
          this.setState({ authScreen: 'mfa-verify', authSubmitting: false, mfaForm: { token: '' }, mfaError: '' });
        } else if (res.status === 'mfa_enroll') {
          this.setState({ authScreen: 'mfa-enroll', authSubmitting: false, mfaEnroll: { qr: res.qr, manualKey: res.manualKey }, mfaForm: { token: '' }, mfaError: '' });
        }
      } catch (e) {
        this.setState({ authError: e.status === 429 ? 'Too many attempts — try again later' : 'Incorrect email or password', authSubmitting: false });
      }
    }

    async submitMfaVerify() {
      const { token } = this.state.mfaForm;
      if (!token) { this.setState({ mfaError: 'Enter the 6-digit code' }); return; }
      this.setState({ authSubmitting: true, mfaError: '' });
      try {
        const res = await Api.post('/api/auth/mfa/verify', { token });
        await this._onAuthSuccess(res.user);
      } catch (e) {
        this.setState({ mfaError: e.status === 429 ? 'Too many attempts — try again later' : 'Invalid code', authSubmitting: false });
      }
    }

    async submitMfaEnrollVerify() {
      const { token } = this.state.mfaForm;
      if (!token) { this.setState({ mfaError: 'Enter the 6-digit code' }); return; }
      this.setState({ authSubmitting: true, mfaError: '' });
      try {
        const res = await Api.post('/api/auth/mfa/enroll/verify', { token });
        await this._onAuthSuccess(res.user);
      } catch (e) {
        this.setState({ mfaError: e.status === 429 ? 'Too many attempts — try again later' : 'Invalid code', authSubmitting: false });
      }
    }

    async _onAuthSuccess(user) {
      this.setState({
        currentUser: user, authSubmitting: false, authScreen: 'login',
        authForm: { email: '', password: '' }, mfaForm: { token: '' }, authError: '', mfaError: '',
      });
      await this.loadAssets();
      await this.loadColumnPrefs();
    }

    async loadColumnPrefs() {
      try {
        const me = await Api.get('/api/me');
        this.setState({ columnPrefs: me.columnPrefs || {} });
      } catch (e) { /* non-fatal — falls back to each table's default columns */ }
    }

    // Checking/unchecking a column mutates state and patches just the picker's
    // own checkboxes directly, without a setState/render — the table underneath
    // is covered by the modal anyway, so it only needs to catch up once the
    // picker closes. A full render per checkbox would rebuild the whole picker
    // list mid-click, which is exactly what made an automated click double-fire
    // during testing (the DOM node it just clicked got replaced out from under it).
    toggleColumn(tableKey, key, checked) {
      const current = resolveVisibleColumns(tableKey, this.state.columnPrefs);
      let next;
      if (checked) next = current.includes(key) ? current : [...current, key];
      else {
        next = current.filter((k) => k !== key);
        if (next.length === 0) return; // never allow hiding every column
      }
      this.state.columnPrefs = { ...this.state.columnPrefs, [tableKey]: next };
      this.saveColumnPrefs(this.state.columnPrefs);
      this._syncColumnCheckboxes(tableKey, next);
    }

    resetColumns(tableKey) {
      const defaults = [...COLUMN_TABLES[tableKey].defaultColumns];
      this.state.columnPrefs = { ...this.state.columnPrefs, [tableKey]: defaults };
      this.saveColumnPrefs(this.state.columnPrefs);
      const defaultSet = new Set(defaults);
      root.querySelectorAll(`[data-act="toggleColumn"][data-table="${tableKey}"]`).forEach((cb) => {
        cb.checked = defaultSet.has(cb.dataset.key);
      });
      this._syncColumnCheckboxes(tableKey, defaults);
    }

    _syncColumnCheckboxes(tableKey, visibleKeys) {
      const soleKey = visibleKeys.length === 1 ? visibleKeys[0] : null;
      root.querySelectorAll(`[data-act="toggleColumn"][data-table="${tableKey}"]`).forEach((cb) => {
        cb.disabled = cb.dataset.key === soleKey;
      });
    }

    async saveColumnPrefs(columnPrefs) {
      try { await Api.patch('/api/auth/column-prefs', { columnPrefs }); }
      catch (e) { this.showToast('Failed to save column preferences'); }
    }

    backToAuth() {
      this.setState({
        authScreen: 'login', mfaForm: { token: '' }, mfaError: '',
        forgotError: '', resetError: '', authInfo: '',
      });
    }

    async logout() {
      try { await Api.post('/api/auth/logout'); } catch (e) { /* ignore */ }
      this.setState({
        currentUser: null, assets: [], ready: false, screen: 'overview',
        authScreen: 'login', authForm: { email: '', password: '' }, authError: '', authInfo: '',
        mfaForm: { token: '' }, mfaError: '',
      });
    }

    applyAssetUpdate(updated) {
      this.setState((s) => ({ assets: s.assets.map((a) => (a.id === updated.id ? updated : a)) }));
    }

    updateDetailField(field, value) {
      // Mutate state directly instead of a full setState/render — the
      // <select> already shows the chosen option natively, and nothing else
      // on screen depends on this value until Save is pressed, so rebuilding
      // the whole drawer here would only cost scroll position for no benefit.
      this.state.detailForm[field] = value;
    }

    async submitDetail(originalTag) {
      const f = this.state.detailForm;
      const isAdmin = !!(this.state.currentUser && this.state.currentUser.role === 'admin');
      const name = f.assignedName.trim();
      const spaceIdx = name.indexOf(' ');
      const firstName = spaceIdx === -1 ? name : name.slice(0, spaceIdx);
      const lastName = spaceIdx === -1 ? '' : name.slice(spaceIdx + 1);

      const payload = {
        assetTag: f.assetTag.trim(), itemType: f.itemType, model: f.model,
        serialNumber: f.serialNumber, expressTag: f.expressTag, macAddress: f.macAddress,
        ipAddress: f.ipAddress, imei: f.imei, telephoneNumber: f.telephoneNumber, wsusGroup: f.wsusGroup,
        supplier: f.supplier, poNumber: f.poNumber,
        dateAcquired: f.dateAcquired, dateDeployed: f.dateDeployed, returnDate: f.returnDate, dateRetired: f.dateRetired,
        firstName, lastName, location: f.location, agreementSigned: !!f.agreementSigned,
        notes: f.notes,
      };
      if (isAdmin) {
        payload.company = f.company; payload.deviceBlocked = !!f.deviceBlocked;
        payload.costTracked = !!f.costTracked; payload.cost = f.cost;
      }
      try {
        const updated = await Api.patch(`/api/assets/${encodeURIComponent(originalTag)}`, payload);
        if (updated.assetTag !== originalTag) {
          // The tag was renamed — the asset's id changed, so it has to be
          // matched by its old id (applyAssetUpdate matches by the NEW id,
          // which no longer exists anywhere in the array) and the drawer's
          // selection re-pointed at the new one.
          this.setState((s) => ({
            assets: s.assets.map((a) => (a.id === originalTag ? updated : a)),
            selectedId: updated.id,
          }));
        } else {
          this.applyAssetUpdate(updated);
        }
        this.setState({ detailForm: this.detailFormFromAsset(updated) });
        this.showToast(`${updated.assetTag} saved`);
      } catch (e) {
        let msg = 'Failed to save changes';
        if (e.status === 400 && e.data && e.data.error === 'asset_retired') msg = 'Retired assets cannot be edited';
        else if (e.status === 400 && e.data && e.data.fields) {
          const firstKey = Object.keys(e.data.fields)[0];
          if (firstKey) msg = e.data.fields[firstKey];
        }
        this.showToast(msg);
      }
    }

    async unassignAsset(assetTag) {
      try {
        const updated = await Api.patch(`/api/assets/${encodeURIComponent(assetTag)}`, { firstName: '', lastName: '' });
        this.applyAssetUpdate(updated);
        this.setState({ detailForm: this.detailFormFromAsset(updated) });
        this.showToast(`${assetTag} unassigned`);
      } catch (e) {
        this.showToast('Failed to unassign');
      }
    }

    toggleCostTracked(checked) {
      // Mutate state directly and patch the cost input's disabled state in
      // place instead of a full setState/render — avoids rebuilding the
      // whole drawer (and losing scroll position / any in-progress typing
      // elsewhere on the page) just to flip one checkbox.
      this.state.detailForm.costTracked = checked;
      const costInput = root.querySelector('[data-bind="detailForm.cost"]');
      if (costInput) costInput.disabled = !checked;
    }

    async checkInOut(id) {
      const asset = this.state.assets.find((x) => x.id === id);
      if (!asset) return;
      const msg = asset.status === 'In Use' ? `${id} checked in`
        : asset.status === 'In Stock' ? `${id} checked out`
        : asset.status === 'In Repair' ? `${id} marked repaired`
        : null;
      try {
        const updated = await Api.post(`/api/assets/${encodeURIComponent(id)}/check-in-out`);
        this.applyAssetUpdate(updated);
        if (msg) this.showToast(msg);
      } catch (e) {
        this.showToast('Action failed');
      }
    }
    async flagRepair(id) {
      try {
        const updated = await Api.post(`/api/assets/${encodeURIComponent(id)}/flag-repair`);
        this.applyAssetUpdate(updated);
        this.showToast(`${id} flagged for repair`);
      } catch (e) {
        this.showToast('Action failed');
      }
    }
    async retireAsset(id) {
      try {
        const updated = await Api.post(`/api/assets/${encodeURIComponent(id)}/retire`);
        this.applyAssetUpdate(updated);
        this.showToast(`${id} retired`);
      } catch (e) {
        this.showToast('Action failed');
      }
    }

    async submitAdd() {
      const form = this.state.form;
      const errors = {};
      if (!form.assetTag.trim()) errors.assetTag = 'Asset tag is required';
      if (!form.itemType) errors.itemType = 'Required';
      if (!form.model.trim()) errors.model = 'Model is required';
      if (Object.keys(errors).length) { this.setState({ formErrors: errors }); return; }
      try {
        const created = await Api.post('/api/assets', form);
        this.setState((s) => ({ assets: [created, ...s.assets], addOpen: false, page: 1, form: freshForm(), formErrors: {} }));
        this.showToast(`Asset ${created.assetTag} added`);
        if (form.itemType === 'Mobile Phone' && form.simCardId) {
          await this.assignSim(form.simCardId, created.assetTag);
        }
      } catch (e) {
        if (e.status === 400 && e.data && e.data.fields) this.setState({ formErrors: e.data.fields });
        else this.showToast('Failed to add asset');
      }
    }

    exportCsv() {
      const rows = this.getFiltered();
      const csv = buildCsv(rows);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'asset-register.csv';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.showToast('CSV export started');
    }

    setDeprecatedPage(page) { this.setState({ deprecatedPage: page }); }

    setSelectedReport(id) { this.setState({ reportBuilder: { customReportId: id ? Number(id) : null } }); }

    openNewReport() { this.setState({ newReportOpen: true, newReportForm: { name: '', fields: [] }, newReportErrors: {} }); }
    closeNewReport() { this.setState({ newReportOpen: false }); }

    toggleReportField(field) {
      this.setState((s) => {
        const has = s.newReportForm.fields.includes(field);
        return { newReportForm: { ...s.newReportForm, fields: has ? s.newReportForm.fields.filter((f) => f !== field) : [...s.newReportForm.fields, field] } };
      });
    }

    toggleCostingField() {
      this.setState((s) => {
        const has = s.newReportForm.fields.includes('cost');
        const fields = has
          ? s.newReportForm.fields.filter((f) => f !== 'cost' && f !== 'costTracked')
          : [...s.newReportForm.fields, 'costTracked', 'cost'];
        return { newReportForm: { ...s.newReportForm, fields } };
      });
    }

    async submitNewReport() {
      const form = this.state.newReportForm;
      const errors = {};
      if (!form.name.trim()) errors.name = 'Report name is required';
      if (!form.fields.length) errors.fields = 'Select at least one field';
      if (Object.keys(errors).length) { this.setState({ newReportErrors: errors }); return; }
      try {
        const created = await Api.post('/api/reports', { name: form.name.trim(), fields: form.fields });
        this.setState((s) => ({
          customReports: [...s.customReports, created].sort((a, b) => (a.name < b.name ? -1 : 1)),
          newReportOpen: false, newReportForm: { name: '', fields: [] }, newReportErrors: {},
          reportBuilder: { customReportId: created.id },
        }));
        this.showToast(`Report "${created.name}" saved`);
      } catch (e) {
        if (e.status === 400 && e.data && e.data.fields) this.setState({ newReportErrors: e.data.fields });
        else this.showToast('Failed to save report');
      }
    }

    async deleteCustomReport(id) {
      const report = this.state.customReports.find((r) => r.id === Number(id));
      if (!report) return;
      if (!window.confirm(`Delete report "${report.name}"? This cannot be undone.`)) return;
      try {
        await Api.delete(`/api/reports/${id}`);
        this.setState((s) => ({
          customReports: s.customReports.filter((r) => r.id !== Number(id)),
          reportBuilder: s.reportBuilder.customReportId === Number(id) ? { customReportId: null } : s.reportBuilder,
        }));
        this.showToast(`Report "${report.name}" deleted`);
      } catch (e) {
        this.showToast('Failed to delete report');
      }
    }

    openExportPicker() { this.setState({ exportPickerOpen: true }); }
    closeExportPicker() { this.setState({ exportPickerOpen: false }); }

    exportNamedCustomReport(report) {
      const rows = this.getFiltered();
      const csv = buildCsvForFields(rows, report.fields);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${report.name.trim().replace(/\s+/g, '-').toLowerCase()}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.setState({ exportPickerOpen: false });
      this.showToast(`"${report.name}" export started`);
    }

    async goUsers() {
      this.setState({ screen: 'users', drawerOpen: false });
      try {
        const users = await Api.get('/api/users');
        this.setState({ users });
      } catch (e) {
        this.showToast('Failed to load users');
      }
    }

    updateUserField(field, value) { this.setState((s) => ({ userForm: { ...s.userForm, [field]: value } })); }

    async submitCreateUser() {
      const form = this.state.userForm;
      const errors = {};
      if (!form.email.trim()) errors.email = 'Email is required';
      const pwErrors = validatePasswordPolicy(form.password);
      if (pwErrors.length) errors.password = pwErrors.join('; ');
      if (Object.keys(errors).length) { this.setState({ userFormErrors: errors }); return; }
      try {
        const created = await Api.post('/api/users', form);
        this.setState((s) => ({
          users: [...s.users, created].sort((a, b) => (a.email < b.email ? -1 : 1)),
          userForm: { email: '', password: '', role: 'standard' }, userFormErrors: {},
        }));
        this.showToast(`User ${created.email} created`);
      } catch (e) {
        if (e.status === 400 && e.data && e.data.fields) this.setState({ userFormErrors: e.data.fields });
        else this.showToast('Failed to create user');
      }
    }

    userErrorMessage(e, fallback) {
      const code = e.data && e.data.error;
      if (code === 'cannot_modify_self') return "You can't change your own role or active status";
      if (code === 'last_admin') return 'This is the last active admin — promote/enable another admin first';
      return fallback;
    }

    async changeUserRole(id, role) {
      try {
        const updated = await Api.patch(`/api/users/${id}`, { role });
        this.setState((s) => ({ users: s.users.map((u) => (u.id === updated.id ? updated : u)) }));
        this.showToast(`Role updated for ${updated.email}`);
      } catch (e) {
        this.setState((s) => ({ users: s.users.map((u) => u) }));
        this.showToast(this.userErrorMessage(e, 'Failed to update role'));
      }
    }

    async toggleUserActive(id) {
      const user = this.state.users.find((u) => u.id === Number(id));
      if (!user) return;
      try {
        const updated = await Api.patch(`/api/users/${id}`, { active: !user.active });
        this.setState((s) => ({ users: s.users.map((u) => (u.id === updated.id ? updated : u)) }));
        this.showToast(`${updated.email} ${updated.active ? 'enabled' : 'disabled'}`);
      } catch (e) {
        this.showToast(this.userErrorMessage(e, 'Failed to update user'));
      }
    }

    async resetUserMfa(id) {
      try {
        const updated = await Api.patch(`/api/users/${id}`, { resetMfa: true });
        this.setState((s) => ({ users: s.users.map((u) => (u.id === updated.id ? updated : u)) }));
        this.showToast(`MFA reset for ${updated.email}`);
      } catch (e) {
        this.showToast('Failed to reset MFA');
      }
    }

    async deleteUser(id) {
      const user = this.state.users.find((u) => u.id === Number(id));
      if (!user) return;
      if (this.state.currentUser && this.state.currentUser.id === Number(id)) {
        this.showToast('You cannot delete your own account');
        return;
      }
      if (!window.confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
      try {
        await Api.delete(`/api/users/${id}`);
        this.setState((s) => ({ users: s.users.filter((u) => u.id !== Number(id)) }));
        this.showToast(`${user.email} deleted`);
      } catch (e) {
        const code = e.data && e.data.error;
        this.showToast(code === 'cannot_delete_self' ? 'You cannot delete your own account' : this.userErrorMessage(e, 'Failed to delete user'));
      }
    }

    async goSimCards() {
      this.setState({ screen: 'simcards', drawerOpen: false });
      await this.loadSimCards();
    }

    updateSimField(field, value) { this.setState((s) => ({ simForm: { ...s.simForm, [field]: value } })); }

    async submitCreateSim() {
      const form = this.state.simForm;
      const errors = {};
      if (!form.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
      if (Object.keys(errors).length) { this.setState({ simFormErrors: errors }); return; }
      try {
        const created = await Api.post('/api/simcards', form);
        this.setState((s) => ({
          simCards: [...s.simCards, created].sort((a, b) => (a.phoneNumber < b.phoneNumber ? -1 : 1)),
          simForm: freshSimForm(), simFormErrors: {},
        }));
        this.showToast(`SIM ${created.phoneNumber} added`);
      } catch (e) {
        if (e.status === 400 && e.data && e.data.fields) this.setState({ simFormErrors: e.data.fields });
        else this.showToast('Failed to add SIM');
      }
    }

    applySimAndAssetUpdate({ simCard, asset }) {
      this.setState((s) => ({
        simCards: s.simCards.map((sc) => (sc.id === simCard.id ? simCard : sc)),
        assets: asset ? s.assets.map((a) => (a.id === asset.id ? asset : a)) : s.assets,
      }));
    }

    async assignSim(simId, assetTag) {
      try {
        const result = await Api.post(`/api/simcards/${simId}/assign`, { assetTag });
        this.applySimAndAssetUpdate(result);
        this.showToast(`SIM ${result.simCard.phoneNumber} assigned to ${assetTag}`);
      } catch (e) {
        this.showToast('Failed to assign SIM');
      }
    }

    async unassignSim(simId) {
      try {
        const result = await Api.post(`/api/simcards/${simId}/unassign`);
        this.applySimAndAssetUpdate(result);
        this.showToast(`SIM ${result.simCard.phoneNumber} unassigned`);
      } catch (e) {
        this.showToast('Failed to unassign SIM');
      }
    }

    async retireSim(simId) {
      try {
        const updated = await Api.post(`/api/simcards/${simId}/retire`);
        this.setState((s) => ({ simCards: s.simCards.map((sc) => (sc.id === updated.id ? updated : sc)) }));
        this.showToast(`SIM ${updated.phoneNumber} retired`);
      } catch (e) {
        this.showToast(e.data && e.data.error === 'sim_assigned' ? 'Unassign the SIM before retiring it' : 'Failed to retire SIM');
      }
    }

    async reactivateSim(simId) {
      try {
        const updated = await Api.post(`/api/simcards/${simId}/reactivate`);
        this.setState((s) => ({ simCards: s.simCards.map((sc) => (sc.id === updated.id ? updated : sc)) }));
        this.showToast(`SIM ${updated.phoneNumber} reactivated`);
      } catch (e) {
        this.showToast('Failed to reactivate SIM');
      }
    }

    async deleteSim(simId) {
      const sim = this.state.simCards.find((sc) => sc.id === Number(simId));
      if (!sim) return;
      if (!window.confirm(`Delete SIM ${sim.phoneNumber}? This cannot be undone.`)) return;
      try {
        await Api.delete(`/api/simcards/${simId}`);
        this.setState((s) => ({ simCards: s.simCards.filter((sc) => sc.id !== Number(simId)) }));
        this.showToast(`SIM ${sim.phoneNumber} deleted`);
      } catch (e) {
        this.showToast(e.data && e.data.error === 'sim_assigned' ? 'Unassign the SIM before deleting it' : 'Failed to delete SIM');
      }
    }

    goAccount() {
      this.setState({
        screen: 'account', drawerOpen: false,
        accountForm: { currentPassword: '', newPassword: '', confirmPassword: '' }, accountFormErrors: {},
      });
    }

    updateAccountField(field, value) { this.setState((s) => ({ accountForm: { ...s.accountForm, [field]: value } })); }

    async submitChangePassword() {
      const { currentPassword, newPassword, confirmPassword } = this.state.accountForm;
      const errors = {};
      if (!currentPassword) errors.currentPassword = 'Current password is required';
      const pwErrors = validatePasswordPolicy(newPassword);
      if (pwErrors.length) errors.newPassword = pwErrors.join('; ');
      else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
      if (Object.keys(errors).length) { this.setState({ accountFormErrors: errors }); return; }

      try {
        await Api.post('/api/auth/change-password', { currentPassword, newPassword });
        this.setState({
          accountForm: { currentPassword: '', newPassword: '', confirmPassword: '' }, accountFormErrors: {},
        });
        this.showToast('Password updated');
      } catch (e) {
        if (e.status === 401) this.setState({ accountFormErrors: { currentPassword: 'Current password is incorrect' } });
        else if (e.status === 400 && e.data && e.data.fields) this.setState({ accountFormErrors: e.data.fields });
        else this.showToast('Failed to update password');
      }
    }

    async resetOwnMfa() {
      if (!window.confirm('Reset your MFA enrollment? You will be signed out and must set up a new authenticator on next login.')) return;
      const currentPassword = window.prompt('Confirm your current password to disable MFA:');
      if (!currentPassword) return;
      try {
        await Api.post('/api/auth/mfa/reset-self', { currentPassword });
        this.setState({
          currentUser: null, assets: [], ready: false, screen: 'overview',
          authScreen: 'login', authForm: { email: '', password: '' },
          authError: 'MFA reset — sign in again to set up a new authenticator.',
          mfaForm: { token: '' }, mfaError: '',
        });
      } catch (e) {
        this.showToast(e.data && e.data.error === 'invalid_current_password' ? 'Incorrect password' : 'Failed to reset MFA');
      }
    }

    exportDeprecatedCsv() {
      const rows = this.state.assets.filter((a) => a.status === 'Retired');
      const csv = buildCsv(rows);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'deprecated-assets.csv';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.showToast('Deprecated CSV export started');
    }

    openImport() { this.setState({ csvImport: { open: true, step: 'pick', fileName: '', rows: [], results: null } }); }
    closeImport() { this.setState({ csvImport: { open: false, step: 'pick', fileName: '', rows: [], results: null } }); }

    // Classifies one parsed CSV row into exactly one of:
    //  - 'skip'   — its asset tag conflicts with an existing asset or another
    //               row in this file. Never auto-fixed: silently renaming or
    //               overwriting a tag is exactly the "creating new entries /
    //               changing tags" behavior this replaced. Reported, not imported.
    //  - 'review' — still gets imported (a blank required field gets a
    //               generated placeholder / "Unknown" so the DB constraints
    //               are satisfied), but is flagged so nothing gets silently
    //               absorbed into the register without the user seeing it —
    //               including a value that doesn't match the app's existing
    //               Item Type / Location / Supplier lists.
    //  - 'ok'     — clean, no flags.
    classifyImportRow(row, existingTags, seenTags, nextPlaceholderTag) {
      let assetTag = (row.assetTag || '').trim();
      if (assetTag && existingTags.has(assetTag)) {
        return { ...row, assetTag, _status: 'skip', _reasons: ['Asset tag already exists in the register'] };
      }
      if (assetTag && seenTags.has(assetTag)) {
        return { ...row, assetTag, _status: 'skip', _reasons: ['Duplicate asset tag elsewhere in this file'] };
      }

      const reasons = [];
      if (!assetTag) { assetTag = nextPlaceholderTag(); reasons.push('Asset tag was missing — placeholder assigned'); }

      let itemType = (row.itemType || '').trim();
      if (!itemType) { itemType = 'Unknown'; reasons.push('Item type was missing — set to Unknown'); }
      else if (!ITEM_TYPES.includes(itemType)) { reasons.push(`Item type "${itemType}" isn't in the standard list`); }

      let model = (row.model || '').trim();
      if (!model) { model = 'Unknown'; reasons.push('Model was missing — set to Unknown'); }

      const location = (row.location || '').trim();
      if (location && !LOCATIONS.includes(location)) reasons.push(`Location "${location}" isn't in the standard list`);
      const supplier = (row.supplier || '').trim();
      if (supplier && !SUPPLIERS.includes(supplier)) reasons.push(`Supplier "${supplier}" isn't in the standard list`);

      seenTags.add(assetTag);
      return { ...row, assetTag, itemType, model, _status: reasons.length ? 'review' : 'ok', _reasons: reasons };
    }

    handleCsvFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseCsv(String(reader.result || ''));
        const existingTags = new Set(this.state.assets.map((a) => a.id));
        const seenTags = new Set();
        let placeholderSeq = 0;
        const nextPlaceholderTag = () => {
          let tag;
          do {
            placeholderSeq += 1;
            tag = `NEEDS-REVIEW-${String(placeholderSeq).padStart(4, '0')}`;
          } while (existingTags.has(tag) || seenTags.has(tag));
          return tag;
        };
        const rows = parsed.map((row) => this.classifyImportRow(row, existingTags, seenTags, nextPlaceholderTag));
        this.setState({ csvImport: { open: true, step: 'preview', fileName: file.name, rows, results: null } });
      };
      reader.readAsText(file);
    }

    async confirmImport() {
      const rows = this.state.csvImport.rows;
      const toImport = rows.filter((r) => r._status !== 'skip');
      const skippedRows = rows.filter((r) => r._status === 'skip');
      if (!toImport.length) { this.showToast('No rows to import'); return; }
      try {
        const res = await Api.post('/api/assets/import', { rows: toImport });
        await this.loadAssets();
        const serverSkipped = res.skipped || [];
        const serverSkippedByIdx = new Map(serverSkipped.map((s) => [s.row, s.reason]));
        const imported = [];
        const review = [];
        const skipped = skippedRows.map((r) => ({ assetTag: r.assetTag, reasons: r._reasons }));
        toImport.forEach((r, i) => {
          if (serverSkippedByIdx.has(i)) {
            skipped.push({ assetTag: r.assetTag, reasons: [serverSkippedByIdx.get(i)] });
          } else if (r._status === 'review') {
            review.push({ assetTag: r.assetTag, reasons: r._reasons });
          } else {
            imported.push(r.assetTag);
          }
        });
        this.setState({ csvImport: { open: true, step: 'results', fileName: this.state.csvImport.fileName, rows: [], results: { imported, review, skipped } } });
      } catch (e) {
        this.showToast('Import failed');
      }
    }

    async bulkAction(action) {
      const ids = this.state.selectedIds;
      if (!ids.length) return;

      if (action === 'export') {
        const rows = this.state.assets.filter((a) => ids.includes(a.id));
        const csv = buildCsv(rows);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'asset-register-selected.csv';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        this.showToast(`Exported ${ids.length} assets`);
        return;
      }

      try {
        const { updated } = await Api.post('/api/assets/bulk', { ids, action });
        this.setState((s) => ({
          assets: s.assets.map((a) => updated.find((u) => u.id === a.id) || a),
          selectedIds: [],
        }));
        this.showToast(`${updated.length} assets updated`);
      } catch (e) {
        this.showToast('Bulk action failed');
      }
    }

    getFiltered() {
      const st = this.state;
      let rows = st.assets;
      if (st.search.trim()) {
        const q = st.search.trim().toLowerCase();
        rows = rows.filter((a) => a.assetTag.toLowerCase().includes(q) || a.model.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) || a.location.toLowerCase().includes(q));
      }
      if (st.statusFilter.length) rows = rows.filter((a) => st.statusFilter.includes(a.status));
      if (st.typeFilter) rows = rows.filter((a) => a.itemType === st.typeFilter);
      if (st.locationFilter) rows = rows.filter((a) => a.location === st.locationFilter);
      const dir = st.sortDir === 'asc' ? 1 : -1;
      rows = [...rows].sort((x, y) => {
        let vx, vy;
        if (st.sortCol === 'dateDeployed') { vx = x.dateDeployed || ''; vy = y.dateDeployed || ''; }
        else if (st.sortCol === 'status') { vx = x.status; vy = y.status; }
        else { vx = x.assetTag; vy = y.assetTag; }
        if (vx < vy) return -1 * dir;
        if (vx > vy) return 1 * dir;
        return 0;
      });
      return rows;
    }

    computeViewModel() {
      if (!this.state.ready) return { ready: false };
      const st = this.state;
      const all = st.assets;
      const summary = summarize(all);
      const filtered = this.getFiltered();
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const page = Math.min(st.page, totalPages);
      const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

      const rows = pageRows.map((asset) => ({
        ...asset,
        assigneeName: asset.firstName ? `${asset.firstName} ${asset.lastName}` : '—',
        statusColor: STATUS_COLORS[asset.status] || '#8792A2', statusBg: tint(STATUS_COLORS[asset.status]),
        deployedStr: asset.dateDeployed ? formatDate(asset.dateDeployed) : '—',
        selected: st.selectedIds.includes(asset.id),
      }));

      const kpis = [
        { label: 'TOTAL ASSETS', value: summary.total.toLocaleString(), color: '#E8EDF3' },
        { label: 'IN USE', value: summary.byStatus['In Use'] || 0, color: STATUS_COLORS['In Use'] },
        { label: 'IN STOCK', value: summary.byStatus['In Stock'] || 0, color: STATUS_COLORS['In Stock'] },
        { label: 'IN REPAIR', value: summary.byStatus['In Repair'] || 0, color: STATUS_COLORS['In Repair'] },
        { label: 'BLOCKED', value: summary.blockedCount, color: '#F2635B' },
        { label: 'PENDING RETURN', value: summary.pendingReturnCount, color: '#F2B84B' },
      ];

      const typeBars = groupCounts(all, 'itemType').map((g) => ({ ...g, pct: Math.round((g.count / summary.total) * 100) }));
      const locationBars = groupCounts(all, 'location').map((g) => ({ ...g, pct: Math.round((g.count / summary.total) * 100) }));
      const supplierBars = groupCounts(all, 'supplier').map((g) => ({ ...g, pct: Math.round((g.count / summary.total) * 100) }));

      const circumference = 2 * Math.PI * 40;
      let offset = 0;
      const donutSegs = STATUS_ORDER.map((s) => {
        const count = summary.byStatus[s] || 0;
        const frac = summary.total ? count / summary.total : 0;
        const seg = { color: STATUS_COLORS[s], dasharray: `${(frac * circumference).toFixed(2)} ${circumference.toFixed(2)}`, dashoffset: (-offset * circumference).toFixed(2), label: s, count };
        offset += frac;
        return seg;
      });

      const attention = attentionList(all, 8).map((asset) => ({ id: asset.id, title: asset.assetTag, sub: asset.reason, color: asset.reasonColor }));

      const statusChips = STATUS_ORDER.map((s) => {
        const active = st.statusFilter.includes(s);
        const color = STATUS_COLORS[s];
        return { label: s, color, active, bg: active ? tint(color) : 'transparent', count: summary.byStatus[s] || 0 };
      });

      const typeOptions = ['', ...ITEM_TYPES].map((t) => ({ value: t, label: t || 'All types' }));
      const locationOptions = ['', ...LOCATIONS].map((l) => ({ value: l, label: l || 'All locations' }));

      const deprecatedAssets = all.filter((a) => a.status === 'Retired');
      const depPct = (count) => (deprecatedAssets.length ? Math.round((count / deprecatedAssets.length) * 100) : 0);
      const deprecatedTypeBars = groupCounts(deprecatedAssets, 'itemType').map((g) => ({ ...g, pct: depPct(g.count) }));
      const deprecatedLocationBars = groupCounts(deprecatedAssets, 'location').map((g) => ({ ...g, pct: depPct(g.count) }));
      const deprecatedSupplierBars = groupCounts(deprecatedAssets, 'supplier').map((g) => ({ ...g, pct: depPct(g.count) }));
      const deprecatedByMonth = groupCounts(
        deprecatedAssets.map((a) => ({ retiredMonth: a.dateRetired ? a.dateRetired.slice(0, 7) : 'Unknown' })),
        'retiredMonth'
      ).sort((x, y) => (x.label < y.label ? -1 : 1)).map((g) => ({ ...g, pct: depPct(g.count) }));

      const deprecatedTotalPages = Math.max(1, Math.ceil(deprecatedAssets.length / PAGE_SIZE));
      const deprecatedPage = Math.min(st.deprecatedPage, deprecatedTotalPages);
      const deprecatedRows = deprecatedAssets
        .slice((deprecatedPage - 1) * PAGE_SIZE, deprecatedPage * PAGE_SIZE)
        .map((asset) => ({
          ...asset,
          assigneeName: asset.firstName ? `${asset.firstName} ${asset.lastName}` : '—',
          statusColor: STATUS_COLORS[asset.status] || '#8792A2', statusBg: tint(STATUS_COLORS[asset.status]),
          deployedStr: asset.dateDeployed ? formatDate(asset.dateDeployed) : '—',
        }));

      return {
        ready: true, toast: st.toast,
        currentUserEmail: st.currentUser ? st.currentUser.email : '',
        currentUserLabel: st.currentUser ? st.currentUser.email.slice(0, 2).toUpperCase() : '',
        isAdmin: !!(st.currentUser && st.currentUser.role === 'admin'),
        screen: st.screen,
        columnWidths: st.columnWidths,
        columnPrefs: st.columnPrefs,
        columnPickerTable: st.columnPickerTable,
        sidebarCollapsed: st.sidebarCollapsed,
        kpis, typeBars, locationBars, supplierBars, donutSegs,
        donutTotal: summary.total.toLocaleString(),
        attention,
        search: st.search,
        statusChips,
        typeFilter: st.typeFilter, typeOptions,
        locationFilter: st.locationFilter, locationOptions,
        rows,
        selectedCount: st.selectedIds.length,
        allPageSelected: rows.length > 0 && rows.every((r) => r.selected),
        resultCount: filtered.length,
        rangeStart: filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
        rangeEnd: Math.min(page * PAGE_SIZE, filtered.length),
        page, totalPages,
        sortCol: st.sortCol, sortDir: st.sortDir,
        drawerOpen: st.drawerOpen,
        selected: st.selectedId ? this.buildDetail(st.selectedId) : null,
        addOpen: st.addOpen,
        form: st.form, formErrors: st.formErrors,
        complianceStats: [
          { label: 'Agreements signed', value: `${summary.signedPct}%` },
          { label: 'Devices blocked', value: summary.blockedCount },
          { label: 'Pending returns', value: summary.pendingReturnCount },
          { label: 'Unsigned agreements', value: summary.unsignedCount },
        ],
        deprecatedCount: deprecatedAssets.length,
        deprecatedTypeBars, deprecatedLocationBars, deprecatedSupplierBars, deprecatedByMonth,
        deprecatedRows, deprecatedPage, deprecatedTotalPages,
        csvImport: st.csvImport,
        users: st.users, userForm: st.userForm, userFormErrors: st.userFormErrors,
        currentUserId: st.currentUser ? st.currentUser.id : null,
        accountForm: st.accountForm, accountFormErrors: st.accountFormErrors,
        simCards: st.simCards, simForm: st.simForm, simFormErrors: st.simFormErrors,
        assignableMobiles: all.filter((a) => a.itemType === 'Mobile Phone' && a.status !== 'Retired'),
        availableSims: st.simCards.filter((sc) => sc.status === 'Available'),
        customReports: st.customReports,
        newReportOpen: st.newReportOpen, newReportForm: st.newReportForm, newReportErrors: st.newReportErrors,
        exportPickerOpen: st.exportPickerOpen,
        reportBuilder: st.reportBuilder,
        selectedCustomReport: st.customReports.find((r) => r.id === st.reportBuilder.customReportId) || st.customReports[0] || null,
      };
    }

    buildDetail(id) {
      const asset = this.state.assets.find((a) => a.id === id);
      if (!asset) return null;
      const isAdmin = !!(this.state.currentUser && this.state.currentUser.role === 'admin');
      const actions = [];
      if (asset.status === 'In Use') {
        actions.push({ act: 'checkInOut', label: 'Check In', color: '#E8EDF3', border: '#2E3846' });
        actions.push({ act: 'flagRepair', label: 'Flag for Repair', color: '#F2B84B', border: '#F2B84B' });
        if (isAdmin) actions.push({ act: 'retireAsset', label: 'Retire Asset', color: '#F2635B', border: '#F2635B' });
      } else if (asset.status === 'In Stock') {
        actions.push({ act: 'checkInOut', label: 'Check Out', color: '#E8EDF3', border: '#2E3846' });
        if (isAdmin) actions.push({ act: 'retireAsset', label: 'Retire Asset', color: '#F2635B', border: '#F2635B' });
      } else if (asset.status === 'In Repair') {
        actions.push({ act: 'checkInOut', label: 'Mark Repaired', color: '#34E2A0', border: '#34E2A0' });
        if (isAdmin) actions.push({ act: 'retireAsset', label: 'Retire Asset', color: '#F2635B', border: '#F2635B' });
      }
      const isMobile = asset.itemType === 'Mobile Phone';
      const currentSim = isMobile ? this.state.simCards.find((sc) => sc.assignedAssetTag === asset.assetTag) || null : null;
      const availableSims = isMobile ? this.state.simCards.filter((sc) => sc.status === 'Available') : [];
      const assigneeNames = [...new Set(this.state.assets.filter((a) => a.firstName).map((a) => `${a.firstName} ${a.lastName}`))].sort();
      return {
        id: asset.id, assetTag: asset.assetTag, status: asset.status,
        statusColor: STATUS_COLORS[asset.status] || '#8792A2', statusBg: tint(STATUS_COLORS[asset.status]),
        history: [...asset.history].reverse().map((h) => ({ date: formatDate(h.date), text: h.text })),
        actions, isRetired: asset.status === 'Retired',
        isMobile, currentSim, availableSims,
        detailForm: this.state.detailForm, assigneeNames,
        isAdmin,
      };
    }

    detailFormFromAsset(asset) {
      return {
        assetTag: asset.assetTag, itemType: asset.itemType, model: asset.model,
        serialNumber: asset.serialNumber || '', expressTag: asset.expressTag || '',
        macAddress: asset.macAddress || '', ipAddress: asset.ipAddress || '', imei: asset.imei || '',
        telephoneNumber: asset.telephoneNumber || '', wsusGroup: asset.wsusGroup || '',
        supplier: asset.supplier || '', poNumber: asset.poNumber || '',
        dateAcquired: asset.dateAcquired || '', dateDeployed: asset.dateDeployed || '',
        returnDate: asset.returnDate || '', dateRetired: asset.dateRetired || '',
        assignedName: asset.firstName ? `${asset.firstName} ${asset.lastName}` : '',
        location: asset.location, company: asset.company || '',
        deviceBlocked: asset.deviceBlocked, agreementSigned: asset.agreementSigned,
        notes: asset.notes || '', costTracked: asset.costTracked,
        cost: asset.cost !== null && asset.cost !== undefined ? String(asset.cost) : '',
      };
    }

    render() {
      const focusInfo = this._captureFocus();
      if (!this.state.currentUser) {
        root.innerHTML = renderAuthShell(this.state);
      } else {
        const vm = this.computeViewModel();
        root.innerHTML = vm.ready ? renderShell(vm) : `<div class="app-loading">Loading register…</div>`;
      }
      this._bindEvents();
      this._restoreFocus(focusInfo);
    }

    _captureFocus() {
      const el = document.activeElement;
      if (!el || !root.contains(el)) return null;
      const bind = el.getAttribute && el.getAttribute('data-bind');
      if (!bind) return null;
      return { bind, selectionStart: el.selectionStart, selectionEnd: el.selectionEnd };
    }
    _restoreFocus(info) {
      if (!info) return;
      const el = root.querySelector(`[data-bind="${info.bind}"]`);
      if (!el) return;
      el.focus();
      if (typeof info.selectionStart === 'number' && el.setSelectionRange) {
        try { el.setSelectionRange(info.selectionStart, info.selectionEnd); } catch (e) { /* ignore */ }
      }
    }

    // Dragging a column-resize handle patches the DOM directly (via the
    // --cols custom property on the table's wrapper) instead of going
    // through setState/render on every mousemove — a full-page rebuild per
    // pixel of drag would be janky and would blow away scroll position.
    // The width is only committed to state (and localStorage) on mouseup;
    // the next render anywhere else in the app will already read the
    // updated width from state.
    _startColumnResize(handle, startEvent) {
      startEvent.preventDefault();
      const tableKey = handle.getAttribute('data-resize-table');
      const key = handle.getAttribute('data-resize-key');
      const widths = this.state.columnWidths[tableKey];
      const container = root.querySelector(`[data-cols-root="${tableKey}"]`);
      if (!widths || !container) return;
      const visibleKeys = resolveVisibleColumns(tableKey, this.state.columnPrefs);
      const pinned = COLUMN_PINNED[tableKey] || {};
      const startX = startEvent.clientX;
      const startWidth = widths[key];
      handle.classList.add('resizing');
      const onMove = (e) => {
        const newWidth = Math.max(COLUMN_MIN_WIDTH, Math.round(startWidth + (e.clientX - startX)));
        widths[key] = newWidth;
        container.style.setProperty('--cols', colsVar(widths, visibleKeys, pinned.left, pinned.right));
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        handle.classList.remove('resizing');
        saveColumnWidths(this.state.columnWidths);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    _bindEvents() {
      const fileInput = document.getElementById('csvFileInput');
      if (fileInput) fileInput.onchange = (e) => this.handleCsvFile(e.target.files[0]);

      root.onmousedown = (e) => {
        const handle = e.target.closest('.col-resize-handle');
        if (handle) this._startColumnResize(handle, e);
      };

      root.onclick = (e) => {
        // A resize drag ends with a mouseup on the handle, which the browser
        // follows with a click — ignore it so resizing a sortable column
        // (e.g. TAG, STATUS) doesn't also trigger a sort.
        if (e.target.closest('.col-resize-handle')) return;
        const el = e.target.closest('[data-act]');
        if (!el) return;
        const act = el.getAttribute('data-act');
        const id = el.getAttribute('data-id');
        switch (act) {
          case 'toggleSidebar': this.toggleSidebar(); break;
          case 'goOverview': this.setScreen('overview'); break;
          case 'goAssets': this.setScreen('assets'); break;
          case 'goReports': this.setScreen('reports'); break;
          case 'goDeprecated': this.setScreen('deprecated'); break;
          case 'exportDeprecatedCsv': this.exportDeprecatedCsv(); break;
          case 'openNewReport': this.openNewReport(); break;
          case 'closeNewReport': this.closeNewReport(); break;
          case 'submitNewReport': this.submitNewReport(); break;
          case 'toggleReportField': this.toggleReportField(el.getAttribute('data-field')); break;
          case 'toggleCostingField': this.toggleCostingField(); break;
          case 'deleteCustomReport': this.deleteCustomReport(id); break;
          case 'openExportPicker': this.openExportPicker(); break;
          case 'closeExportPicker': this.closeExportPicker(); break;
          case 'openColumnPicker': this.setState({ columnPickerTable: el.getAttribute('data-table') }); break;
          case 'closeColumnPicker': this.setState({ columnPickerTable: null }); break;
          case 'toggleColumn': this.toggleColumn(el.getAttribute('data-table'), el.getAttribute('data-key'), el.checked); break;
          case 'resetColumns': this.resetColumns(el.getAttribute('data-table')); break;
          case 'exportStandard': this.exportCsv(); this.setState({ exportPickerOpen: false }); break;
          case 'exportNamedReport': {
            const report = this.state.customReports.find((r) => r.id === Number(id));
            if (report) this.exportNamedCustomReport(report);
            break;
          }
          case 'prevDeprecatedPage': this.setDeprecatedPage(Math.max(1, this.state.deprecatedPage - 1)); break;
          case 'nextDeprecatedPage': {
            const vm = this.computeViewModel();
            this.setDeprecatedPage(Math.min(vm.deprecatedTotalPages, this.state.deprecatedPage + 1));
            break;
          }
          case 'openAdd': this.openAdd(); break;
          case 'closeAdd': this.closeAdd(); break;
          case 'closeDetail': this.closeDetail(); break;
          case 'openDetail': this.openDetail(id); break;
          case 'toggleStatus': this.toggleStatusFilter(el.getAttribute('data-status')); break;
          case 'sortTag': this.setSort('assetTag'); break;
          case 'sortStatus': this.setSort('status'); break;
          case 'sortDeployed': this.setSort('dateDeployed'); break;
          case 'prevPage': this.setPage(Math.max(1, this.state.page - 1)); break;
          case 'nextPage': {
            const vm = this.computeViewModel();
            this.setPage(Math.min(vm.totalPages, this.state.page + 1));
            break;
          }
          case 'exportCsv': this.exportCsv(); break;
          case 'checkInOut': this.checkInOut(id); break;
          case 'flagRepair': this.flagRepair(id); break;
          case 'retireAsset': this.retireAsset(id); break;
          case 'submitAdd': this.submitAdd(); break;
          case 'submitLogin': this.submitLogin(); break;
          case 'goForgotPassword': this.goForgotPassword(); break;
          case 'submitForgotPassword': this.submitForgotPassword(); break;
          case 'submitResetPassword': this.submitResetPassword(); break;
          case 'submitMfaVerify': this.submitMfaVerify(); break;
          case 'submitMfaEnrollVerify': this.submitMfaEnrollVerify(); break;
          case 'backToAuth': this.backToAuth(); break;
          case 'logout': this.logout(); break;
          case 'toggleSelectRow': this.toggleSelectRow(id); break;
          case 'toggleSelectAll': this.toggleSelectAll(); break;
          case 'bulkCheckInOut': this.bulkAction('check-in-out'); break;
          case 'bulkFlagRepair': this.bulkAction('flag-repair'); break;
          case 'bulkRetire': this.bulkAction('retire'); break;
          case 'bulkExport': this.bulkAction('export'); break;
          case 'clearSelection': this.setState({ selectedIds: [] }); break;
          case 'openImport': this.openImport(); break;
          case 'closeImport': this.closeImport(); break;
          case 'confirmImport': this.confirmImport(); break;
          case 'goUsers': this.goUsers(); break;
          case 'submitCreateUser': this.submitCreateUser(); break;
          case 'toggleUserActive': this.toggleUserActive(id); break;
          case 'resetUserMfa': this.resetUserMfa(id); break;
          case 'deleteUser': this.deleteUser(id); break;
          case 'submitDetail': this.submitDetail(id); break;
          case 'unassignAsset': this.unassignAsset(id); break;
          case 'toggleCostTracked': this.toggleCostTracked(el.checked); break;
          case 'goSimCards': this.goSimCards(); break;
          case 'submitCreateSim': this.submitCreateSim(); break;
          case 'unassignSim': this.unassignSim(id); break;
          case 'retireSim': this.retireSim(id); break;
          case 'reactivateSim': this.reactivateSim(id); break;
          case 'deleteSim': this.deleteSim(id); break;
          case 'goAccount': this.goAccount(); break;
          case 'submitChangePassword': this.submitChangePassword(); break;
          case 'resetOwnMfa': this.resetOwnMfa(); break;
          case 'noop': /* clicks on the drawer/modal panel itself: absorb here so they
                          don't fall through to the backdrop's close handler */ break;
          default: break;
        }
      };

      root.oninput = (e) => {
        const el = e.target;
        const bind = el.getAttribute && el.getAttribute('data-bind');
        if (!bind) return;
        if (bind === 'search') { this.setSearch(el.value); return; }
        // Plain form-field text bindings: write straight into state without
        // triggering a full-page re-render on every keystroke. The input
        // already shows what was typed (native browser behavior) — nothing
        // else on screen reacts to these mid-typing, so a render here would
        // just rebuild the whole page (sidebar, tables, charts) for no
        // visible benefit. The next render triggered by any other action
        // picks up the latest value from state.
        const s = this.state;
        if (bind.startsWith('form.')) s.form[bind.slice(5)] = el.value;
        else if (bind.startsWith('authForm.')) s.authForm[bind.slice(9)] = el.value;
        else if (bind.startsWith('mfaForm.')) s.mfaForm[bind.slice(8)] = el.value;
        else if (bind.startsWith('forgotForm.')) s.forgotForm[bind.slice(11)] = el.value;
        else if (bind.startsWith('resetForm.')) s.resetForm[bind.slice(10)] = el.value;
        else if (bind.startsWith('userForm.')) s.userForm[bind.slice(9)] = el.value;
        else if (bind.startsWith('accountForm.')) s.accountForm[bind.slice(12)] = el.value;
        else if (bind.startsWith('simForm.')) s.simForm[bind.slice(8)] = el.value;
        else if (bind.startsWith('detailForm.')) s.detailForm[bind.slice(11)] = el.value;
        else if (bind.startsWith('newReportForm.')) s.newReportForm[bind.slice(14)] = el.value;
      };

      root.onchange = (e) => {
        const el = e.target;
        const bind = el.getAttribute && el.getAttribute('data-bind');
        if (!bind) return;
        if (bind === 'typeFilter') this.setTypeFilter(el.value);
        else if (bind === 'locationFilter') this.setLocationFilter(el.value);
        else if (bind === 'selectedReportId') this.setSelectedReport(el.value);
        else if (bind.startsWith('form.')) this.updateFormField(bind.slice(5), el.value);
        else if (bind.startsWith('userForm.')) this.updateUserField(bind.slice(9), el.value);
        else if (bind.startsWith('userRole.')) this.changeUserRole(bind.slice(9), el.value);
        else if (bind.startsWith('simForm.')) this.updateSimField(bind.slice(8), el.value);
        else if (bind.startsWith('assignSimRow.')) { if (el.value) this.assignSim(bind.slice(13), el.value); }
        else if (bind.startsWith('assignSim.')) { if (el.value) this.assignSim(el.value, bind.slice(10)); }
        else if (bind === 'detailForm.deviceBlocked' || bind === 'detailForm.agreementSigned') {
          this.updateDetailField(bind.slice(11), el.value === 'yes');
        }
        else if (bind.startsWith('detailForm.')) this.updateDetailField(bind.slice(11), el.value);
      };
    }
  }

  function renderAuthShell(state) {
    let body;
    if (state.authScreen === 'mfa-verify') body = renderMfaVerify(state);
    else if (state.authScreen === 'mfa-enroll') body = renderMfaEnroll(state);
    else if (state.authScreen === 'forgot-password') body = renderForgotPassword(state);
    else if (state.authScreen === 'reset-password') body = renderResetPassword(state);
    else body = renderLogin(state);
    return `
      <div class="auth-shell">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="brand-badge">R</div>
            <div class="brand-title">TheAssetHub</div>
          </div>
          ${body}
        </div>
      </div>
    `;
  }

  function renderLogin(state) {
    const f = state.authForm;
    return `
      <div class="auth-title">Sign in</div>
      ${state.authInfo ? `<div class="auth-success">${escapeHtml(state.authInfo)}</div>` : ''}
      ${state.authError ? `<div class="auth-error">${escapeHtml(state.authError)}</div>` : ''}
      <div class="form-group">
        <div class="form-label">Email</div>
        <input class="form-input" type="email" data-bind="authForm.email" value="${escapeHtml(f.email)}" autocomplete="username">
      </div>
      <div class="form-group">
        <div class="form-label">Password</div>
        <input class="form-input" type="password" data-bind="authForm.password" value="${escapeHtml(f.password)}" autocomplete="current-password">
      </div>
      <button class="btn-submit" style="width:100%;" data-act="submitLogin" ${state.authSubmitting ? 'disabled' : ''}>${state.authSubmitting ? 'Signing in…' : 'Sign in'}</button>
      <div class="auth-link" data-act="goForgotPassword">Forgot password?</div>
    `;
  }

  function renderForgotPassword(state) {
    const f = state.forgotForm;
    return `
      <div class="auth-title">Reset your password</div>
      <div class="auth-hint">Enter your account email and we'll send an 8-character reset code to it.</div>
      ${state.forgotError ? `<div class="auth-error">${escapeHtml(state.forgotError)}</div>` : ''}
      <div class="form-group">
        <div class="form-label">Email</div>
        <input class="form-input" type="email" data-bind="forgotForm.email" value="${escapeHtml(f.email)}" autocomplete="username">
      </div>
      <button class="btn-submit" style="width:100%;" data-act="submitForgotPassword" ${state.forgotSubmitting ? 'disabled' : ''}>${state.forgotSubmitting ? 'Sending…' : 'Send reset code'}</button>
      <div class="auth-back" data-act="backToAuth">&larr; Back to sign in</div>
    `;
  }

  function renderResetPassword(state) {
    const f = state.resetForm;
    return `
      <div class="auth-title">Enter reset code</div>
      <div class="auth-hint">If an account exists for ${escapeHtml(f.email)}, an 8-character code was sent to it. Enter it below with your new password.</div>
      ${state.resetError ? `<div class="auth-error">${escapeHtml(state.resetError)}</div>` : ''}
      <div class="form-group">
        <div class="form-label">Reset code</div>
        <input class="form-input mono" style="text-transform:uppercase;" type="text" maxlength="8" data-bind="resetForm.code" value="${escapeHtml(f.code)}" autocomplete="one-time-code">
      </div>
      <div class="form-group">
        <div class="form-label">New password</div>
        <input class="form-input" type="password" data-bind="resetForm.newPassword" value="${escapeHtml(f.newPassword)}" autocomplete="new-password">
      </div>
      <div class="form-group">
        <div class="form-label">Confirm new password</div>
        <input class="form-input" type="password" data-bind="resetForm.confirmPassword" value="${escapeHtml(f.confirmPassword)}" autocomplete="new-password">
      </div>
      <button class="btn-submit" style="width:100%;" data-act="submitResetPassword" ${state.resetSubmitting ? 'disabled' : ''}>${state.resetSubmitting ? 'Resetting…' : 'Reset password'}</button>
      <div class="auth-back" data-act="backToAuth">&larr; Back to sign in</div>
    `;
  }

  function renderMfaVerify(state) {
    const f = state.mfaForm;
    return `
      <div class="auth-title">Enter your authenticator code</div>
      ${state.mfaError ? `<div class="auth-error">${escapeHtml(state.mfaError)}</div>` : ''}
      <div class="form-group">
        <div class="form-label">6-digit code</div>
        <input class="form-input mono" type="text" inputmode="numeric" maxlength="6" data-bind="mfaForm.token" value="${escapeHtml(f.token)}" autocomplete="one-time-code">
      </div>
      <button class="btn-submit" style="width:100%;" data-act="submitMfaVerify" ${state.authSubmitting ? 'disabled' : ''}>${state.authSubmitting ? 'Verifying…' : 'Verify'}</button>
      <div class="auth-back" data-act="backToAuth">&larr; Back</div>
    `;
  }

  function renderMfaEnroll(state) {
    const f = state.mfaForm;
    const enroll = state.mfaEnroll;
    return `
      <div class="auth-title">Set up two-factor authentication</div>
      <div class="auth-hint">Scan this QR code with an authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code it shows.</div>
      <div class="auth-qr-wrap"><img src="${enroll.qr}" width="180" height="180" alt="MFA QR code"></div>
      <div class="auth-manual-key">Manual key: ${escapeHtml(enroll.manualKey)}</div>
      ${state.mfaError ? `<div class="auth-error">${escapeHtml(state.mfaError)}</div>` : ''}
      <div class="form-group">
        <div class="form-label">6-digit code</div>
        <input class="form-input mono" type="text" inputmode="numeric" maxlength="6" data-bind="mfaForm.token" value="${escapeHtml(f.token)}" autocomplete="one-time-code">
      </div>
      <button class="btn-submit" style="width:100%;" data-act="submitMfaEnrollVerify" ${state.authSubmitting ? 'disabled' : ''}>${state.authSubmitting ? 'Verifying…' : 'Confirm & Enable'}</button>
      <div class="auth-back" data-act="backToAuth">&larr; Back</div>
    `;
  }

  function renderShell(vm) {
    return `
      <div class="app-shell">
        ${renderTopbar(vm)}
        <div class="body-row">
          ${renderSidebar(vm)}
          <div class="content">
            ${vm.screen === 'overview' ? renderOverview(vm) : ''}
            ${vm.screen === 'assets' ? renderAssets(vm) : ''}
            ${vm.screen === 'reports' ? renderReports(vm) : ''}
            ${vm.screen === 'deprecated' ? renderDeprecated(vm) : ''}
            ${vm.screen === 'simcards' ? renderSimCards(vm) : ''}
            ${vm.screen === 'users' ? renderUsers(vm) : ''}
            ${vm.screen === 'account' ? renderAccount(vm) : ''}
          </div>
          ${vm.drawerOpen && vm.selected ? renderDrawer(vm.selected) : ''}
          ${vm.addOpen ? renderAddModal(vm.form, vm.formErrors, vm.availableSims) : ''}
          ${vm.csvImport.open ? renderImportModal(vm.csvImport) : ''}
          ${vm.newReportOpen ? renderNewReportModal(vm) : ''}
          ${vm.exportPickerOpen ? renderExportPickerModal(vm) : ''}
          ${vm.columnPickerTable ? renderColumnPickerModal(vm) : ''}
        </div>
      </div>
      ${vm.toast ? `<div class="toast">${escapeHtml(vm.toast.msg)}</div>` : ''}
    `;
  }

  function renderTopbar(vm) {
    return `
      <div class="topbar">
        <div class="topbar-brand">
          <div class="brand-badge">R</div>
          <div class="brand-title">TheAssetHub</div>
        </div>
        <input class="search-input" type="text" data-bind="search" value="${escapeHtml(vm.search)}" placeholder="Search tag, model, serial, owner…">
        <div class="spacer"></div>
        ${vm.isAdmin ? `<button class="btn-ghost" data-act="openImport">Import CSV</button>` : ''}
        ${vm.isAdmin ? `<button class="btn-primary" data-act="openAdd">+ Add Asset</button>` : ''}
        <div class="avatar-badge" data-act="goAccount" title="Account settings (${escapeHtml(vm.currentUserEmail)})">${escapeHtml(vm.currentUserLabel)}</div>
      </div>
    `;
  }

  function renderSidebar(vm) {
    const item = (screen, label, act) => `
      <div class="nav-item ${vm.screen === screen ? 'active' : ''}" data-act="${act}" title="${escapeHtml(label)}">
        <div class="nav-dot"></div>
        <div class="nav-letter">${escapeHtml(label[0])}</div>
        <span class="nav-label">${escapeHtml(label)}</span>
      </div>`;
    return `
      <div class="sidebar ${vm.sidebarCollapsed ? 'collapsed' : ''}">
        <div class="nav-items">
          ${item('overview', 'Overview', 'goOverview')}
          ${item('assets', 'Assets', 'goAssets')}
          ${item('reports', 'Reports & Analytics', 'goReports')}
          ${item('deprecated', 'Deprecated', 'goDeprecated')}
          ${item('simcards', 'SIM Cards', 'goSimCards')}
          ${vm.isAdmin ? item('users', 'Users', 'goUsers') : ''}
        </div>
        <div class="spacer"></div>
        <div class="nav-footer">v2.4 · ${vm.donutTotal} assets</div>
        <div class="sidebar-toggle" data-act="toggleSidebar" title="${vm.sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar">${vm.sidebarCollapsed ? '»' : '«'}</div>
      </div>
    `;
  }

  function renderOverview(vm) {
    return `
      <div class="screen-scroll">
        <div class="page-title">Overview</div>
        <div class="kpi-row">
          ${vm.kpis.map((k) => `
            <div class="kpi-card">
              <div class="kpi-label">${escapeHtml(k.label)}</div>
              <div class="kpi-value" style="color:${k.color};">${escapeHtml(k.value)}</div>
            </div>
          `).join('')}
        </div>

        <div class="grid-2">
          <div class="panel">
            <div class="panel-title">Assets by Type</div>
            ${vm.typeBars.map((bar) => `
              <div class="bar-row">
                <div class="bar-label">${escapeHtml(bar.label)}</div>
                <div class="bar-track"><div class="bar-fill" style="background:#34E2A0;width:${bar.pct}%;"></div></div>
                <div class="bar-count">${bar.count}</div>
              </div>
            `).join('')}
          </div>

          <div class="panel" style="display:flex;flex-direction:column;">
            <div class="panel-title" style="margin-bottom:10px;">Assets by Status</div>
            <div class="donut-flex">
              <div class="donut-wrap">
                <svg width="120" height="120" viewBox="0 0 100 100" style="transform:rotate(-90deg);">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#171D26" stroke-width="13"></circle>
                  ${vm.donutSegs.map((seg) => `
                    <circle cx="50" cy="50" r="40" fill="none" stroke="${seg.color}" stroke-width="13"
                      stroke-dasharray="${seg.dasharray}" stroke-dashoffset="${seg.dashoffset}"></circle>
                  `).join('')}
                </svg>
                <div class="donut-center">
                  <div class="donut-total">${vm.donutTotal}</div>
                  <div class="donut-sub">TOTAL</div>
                </div>
              </div>
              <div class="legend-list">
                ${vm.donutSegs.map((seg) => `
                  <div class="legend-row">
                    <div class="legend-dot" style="background:${seg.color};"></div>
                    <div class="legend-label">${escapeHtml(seg.label)}</div>
                    <div class="legend-count">${seg.count}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Needs Attention</div>
          ${vm.attention.length ? vm.attention.map((att) => `
            <div class="attention-row" data-act="openDetail" data-id="${escapeHtml(att.id)}">
              <div class="attention-dot" style="background:${att.color};"></div>
              <div class="attention-title">${escapeHtml(att.title)}</div>
              <div class="attention-sub">${escapeHtml(att.sub)}</div>
            </div>
          `).join('') : ''}
        </div>
      </div>
    `;
  }

  function renderAccount(vm) {
    const f = vm.accountForm;
    const errs = vm.accountFormErrors;
    return `
      <div class="screen-scroll">
        <div class="page-title">Account Settings</div>

        <div class="panel" style="max-width:420px;margin-bottom:16px;">
          <div class="panel-title">Profile</div>
          <div class="account-info-row"><span class="account-info-label">Email</span><span class="account-info-value">${escapeHtml(vm.currentUserEmail)}</span></div>
          <div class="account-info-row"><span class="account-info-label">Role</span><span class="account-info-value">${vm.isAdmin ? 'Admin' : 'Standard'}</span></div>
        </div>

        <div class="panel" style="max-width:420px;margin-bottom:16px;">
          <div class="panel-title">Change Password</div>
          <div class="form-group">
            <div class="form-label">Current password</div>
            <input class="form-input" type="password" data-bind="accountForm.currentPassword" value="${escapeHtml(f.currentPassword)}" autocomplete="current-password">
            ${errs.currentPassword ? `<div class="form-error">${escapeHtml(errs.currentPassword)}</div>` : ''}
          </div>
          <div class="form-group">
            <div class="form-label">New password</div>
            <input class="form-input" type="password" data-bind="accountForm.newPassword" value="${escapeHtml(f.newPassword)}" autocomplete="new-password">
            ${errs.newPassword ? `<div class="form-error">${escapeHtml(errs.newPassword)}</div>` : ''}
          </div>
          <div class="form-group">
            <div class="form-label">Confirm new password</div>
            <input class="form-input" type="password" data-bind="accountForm.confirmPassword" value="${escapeHtml(f.confirmPassword)}" autocomplete="new-password">
            ${errs.confirmPassword ? `<div class="form-error">${escapeHtml(errs.confirmPassword)}</div>` : ''}
          </div>
          <button class="btn-submit" data-act="submitChangePassword">Update Password</button>
        </div>

        <div class="panel" style="max-width:420px;margin-bottom:16px;">
          <div class="panel-title">Two-Factor Authentication</div>
          <div class="account-hint">Resetting will sign you out immediately; you'll set up a new authenticator on next login.</div>
          <button class="btn-ghost" data-act="resetOwnMfa">Reset MFA</button>
        </div>

        <button class="btn-ghost" style="border-color:#F2635B;color:#F2635B;" data-act="logout">Sign Out</button>
      </div>
    `;
  }

  function renderBulkToolbar(vm) {
    return `
      <div class="bulk-toolbar">
        <div class="bulk-count">${vm.selectedCount} selected</div>
        <button class="btn-ghost" data-act="bulkCheckInOut">Check In/Out</button>
        <button class="btn-ghost" data-act="bulkFlagRepair">Flag for Repair</button>
        ${vm.isAdmin ? `<button class="btn-ghost" style="border-color:#F2635B;color:#F2635B;" data-act="bulkRetire">Retire</button>` : ''}
        <button class="btn-ghost" data-act="bulkExport">Export Selected</button>
        <div class="spacer"></div>
        <button class="btn-ghost" data-act="clearSelection">Clear</button>
      </div>
    `;
  }

  function renderAssets(vm) {
    const arrow = (col) => vm.sortCol === col ? (vm.sortDir === 'asc' ? '▲' : '▼') : '';
    const cols = resolveVisibleColumns('assets', vm.columnPrefs);
    const defsByKey = defsByKeyOf('assets');
    const arrowFn = (def) => def.sortAct === 'sortTag' ? ` ${arrow('assetTag')}` : def.sortAct === 'sortStatus' ? ` ${arrow('status')}` : def.sortAct === 'sortDeployed' ? ` ${arrow('dateDeployed')}` : '';
    return `
      <div class="assets-layout">
        <div class="filters-panel">
          <div class="filter-heading">STATUS</div>
          ${vm.statusChips.map((chip) => `
            <div class="status-chip ${chip.active ? 'active' : ''}" style="background:${chip.bg};" data-act="toggleStatus" data-status="${escapeHtml(chip.label)}">
              <div class="chip-left"><div class="chip-dot" style="background:${chip.color};"></div>${escapeHtml(chip.label)}</div>
              <div class="chip-count">${chip.count}</div>
            </div>
          `).join('')}
          <div class="filter-heading spaced">TYPE</div>
          <select class="select-field" data-bind="typeFilter">
            ${vm.typeOptions.map((opt) => `<option value="${escapeHtml(opt.value)}" ${opt.value === vm.typeFilter ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
          </select>
          <div class="filter-heading spaced">LOCATION</div>
          <select class="select-field" data-bind="locationFilter">
            ${vm.locationOptions.map((opt) => `<option value="${escapeHtml(opt.value)}" ${opt.value === vm.locationFilter ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
          </select>
        </div>

        <div class="table-col" data-cols-root="assets" style="--cols:${colsVar(vm.columnWidths.assets, cols, 32, null)};">
          ${vm.selectedCount > 0 ? renderBulkToolbar(vm) : `
            <div class="table-toolbar">
              <div class="table-count">Showing <span class="num">${vm.rangeStart}–${vm.rangeEnd}</span> of <span class="num">${vm.resultCount}</span></div>
              <div class="spacer"></div>
              <button class="btn-ghost" data-act="openColumnPicker" data-table="assets">Columns</button>
              ${vm.isAdmin ? `<button class="btn-ghost" data-act="openImport">Import CSV</button>` : ''}
              <button class="btn-ghost" data-act="exportCsv">Export CSV</button>
            </div>
          `}
          <div class="table-scroll">
          <div class="table-header">
            <div class="cell-check"><input type="checkbox" data-act="toggleSelectAll" ${vm.allPageSelected ? 'checked' : ''}></div>
            ${renderColumnHeaders('assets', cols, defsByKey, arrowFn, true)}
          </div>
          <div class="table-body">
            ${vm.rows.map((row) => `
              <div class="table-row" data-act="openDetail" data-id="${escapeHtml(row.id)}">
                <div class="cell-check"><input type="checkbox" data-act="toggleSelectRow" data-id="${escapeHtml(row.id)}" ${row.selected ? 'checked' : ''}></div>
                ${cols.map((key) => defsByKey[key].render(row)).join('')}
              </div>
            `).join('')}
          </div>
          </div>
          <div class="pagination-bar">
            <div class="page-info">Page ${vm.page} of ${vm.totalPages}</div>
            <button class="btn-page" data-act="prevPage" ${vm.page <= 1 ? 'disabled' : ''}>Prev</button>
            <button class="btn-page" data-act="nextPage" ${vm.page >= vm.totalPages ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      </div>
    `;
  }

  function barPanel(title, bars, color, labelClass) {
    return `
      <div class="panel">
        <div class="panel-title">${title}</div>
        ${bars.map((bar) => `
          <div class="bar-row">
            <div class="bar-label ${labelClass}">${escapeHtml(bar.label)}</div>
            <div class="bar-track thin"><div class="bar-fill" style="background:${color};width:${bar.pct}%;"></div></div>
            <div class="bar-count narrow">${bar.count}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderReports(vm) {
    return `
      <div class="screen-scroll">
        <div class="page-header-row">
          <div class="page-title" style="margin-bottom:0;">Reports &amp; Analytics</div>
          <div class="spacer"></div>
          <button class="btn-primary" data-act="openExportPicker">Export CSV</button>
        </div>
        <div class="grid-3">
          ${barPanel('By Type', vm.typeBars, '#4FA3F7', 'narrow')}
          ${barPanel('By Location', vm.locationBars, '#F2B84B', 'wide')}
          ${barPanel('By Supplier', vm.supplierBars, '#8B7CF6', 'narrow')}
        </div>
        <div class="compliance-row">
          ${vm.complianceStats.map((stat) => `
            <div>
              <div class="compliance-stat-label">${escapeHtml(stat.label)}</div>
              <div class="compliance-stat-value">${escapeHtml(String(stat.value))}</div>
            </div>
          `).join('')}
        </div>
        ${vm.isAdmin ? renderCustomReportBuilder(vm) : ''}
      </div>
    `;
  }

  function reportFieldChipLabels(fields) {
    const hasCosting = fields.includes('cost') || fields.includes('costTracked');
    const labels = fields.filter((f) => f !== 'cost' && f !== 'costTracked').map(fieldLabel);
    if (hasCosting) labels.push('Costing');
    return labels;
  }

  function renderCustomReportPreview(vm) {
    const report = vm.selectedCustomReport;
    if (!report) return `<div class="cell-dim">No saved reports yet — click "New Report" to create one.</div>`;
    const chipLabels = reportFieldChipLabels(report.fields);
    return `
      <div class="cell-dim" style="margin-bottom:10px;">
        Includes ${chipLabels.length} field${chipLabels.length === 1 ? '' : 's'} across all ${vm.donutTotal} assets. Use the Export CSV button at the top of the page to download it.
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
        ${chipLabels.map((label) => `<span class="status-pill" style="background:rgba(79,163,247,0.14);color:#4FA3F7;">${escapeHtml(label)}</span>`).join('')}
      </div>
      <button class="btn-ghost" style="border-color:#F2635B;color:#F2635B;" data-act="deleteCustomReport" data-id="${report.id}">Delete Report</button>
    `;
  }

  function renderCustomReportBuilder(vm) {
    return `
      <div class="panel" style="margin-top:16px;">
        <div class="page-header-row" style="margin-bottom:16px;">
          <div class="panel-title" style="margin-bottom:0;">Custom Reports</div>
          <div class="spacer"></div>
          <button class="btn-ghost" data-act="openNewReport">New Report</button>
        </div>
        ${vm.customReports.length ? `
          <div class="form-group" style="margin-bottom:16px;max-width:340px;">
            <div class="form-label">Saved Report</div>
            <select class="form-select" data-bind="selectedReportId">
              ${vm.customReports.map((r) => `<option value="${r.id}" ${vm.reportBuilder.customReportId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
            </select>
          </div>
        ` : ''}
        ${renderCustomReportPreview(vm)}
      </div>
    `;
  }

  function renderNewReportModal(vm) {
    return `
      <div class="modal-overlay" data-act="closeNewReport">
        <div class="modal-box" data-act="noop">
          <div class="modal-header">
            <div class="modal-title">New Custom Report</div>
            <div class="modal-close" data-act="closeNewReport">×</div>
          </div>
          <div class="form-group">
            <div class="form-label">Report Name</div>
            <input class="form-input" type="text" data-bind="newReportForm.name" value="${escapeHtml(vm.newReportForm.name)}" placeholder="e.g. Printer Audit">
            ${vm.newReportErrors.name ? `<div class="form-error">${escapeHtml(vm.newReportErrors.name)}</div>` : ''}
          </div>
          <div class="form-label" style="margin-bottom:8px;">Fields to include</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;max-height:280px;overflow-y:auto;margin-bottom:8px;">
            ${ASSET_FIELD_OPTIONS.map((f) => `
              <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-dim);cursor:pointer;">
                <input type="checkbox" style="accent-color:var(--accent);width:14px;height:14px;" data-act="toggleReportField" data-field="${f.value}" ${vm.newReportForm.fields.includes(f.value) ? 'checked' : ''}>
                ${escapeHtml(f.label)}
              </label>
            `).join('')}
          </div>
          <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-dim);cursor:pointer;margin-bottom:8px;">
            <input type="checkbox" style="accent-color:var(--accent);width:14px;height:14px;" data-act="toggleCostingField" ${vm.newReportForm.fields.includes('cost') ? 'checked' : ''}>
            Costing
          </label>
          ${vm.newReportErrors.fields ? `<div class="form-error">${escapeHtml(vm.newReportErrors.fields)}</div>` : ''}
          <div class="modal-actions">
            <button class="btn-secondary" data-act="closeNewReport">Cancel</button>
            <button class="btn-submit" data-act="submitNewReport">Save Report</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderExportPickerModal(vm) {
    return `
      <div class="modal-overlay" data-act="closeExportPicker">
        <div class="modal-box" style="max-width:420px;" data-act="noop">
          <div class="modal-header">
            <div class="modal-title">Export CSV</div>
            <div class="modal-close" data-act="closeExportPicker">×</div>
          </div>
          <div class="account-hint">Choose what to export.</div>
          <button class="btn-ghost" style="display:block;width:100%;text-align:left;margin-bottom:8px;" data-act="exportStandard">Standard Export (all fields)</button>
          ${vm.customReports.map((r) => `
            <button class="btn-ghost" style="display:block;width:100%;text-align:left;margin-bottom:8px;" data-act="exportNamedReport" data-id="${r.id}">${escapeHtml(r.name)}</button>
          `).join('')}
          ${vm.customReports.length === 0 ? `<div class="cell-dim">No saved custom reports yet.</div>` : ''}
        </div>
      </div>
    `;
  }

  function renderColumnPickerModal(vm) {
    const tableKey = vm.columnPickerTable;
    const { defs } = COLUMN_TABLES[tableKey];
    const visible = new Set(resolveVisibleColumns(tableKey, vm.columnPrefs));
    return `
      <div class="modal-overlay" data-act="closeColumnPicker">
        <div class="modal-box" style="max-width:380px;" data-act="noop">
          <div class="modal-header">
            <div class="modal-title">Columns</div>
            <div class="modal-close" data-act="closeColumnPicker">×</div>
          </div>
          <div class="account-hint">Choose which columns to show. Saved to your account.</div>
          <div style="max-height:360px;overflow-y:auto;margin-bottom:14px;">
            ${defs.map((d) => `
              <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12.5px;color:var(--text-dim);cursor:pointer;">
                <input type="checkbox" style="accent-color:var(--accent);width:14px;height:14px;" data-act="toggleColumn" data-table="${tableKey}" data-key="${d.key}" ${visible.has(d.key) ? 'checked' : ''} ${visible.has(d.key) && visible.size === 1 ? 'disabled' : ''}>
                ${escapeHtml(d.label)}
              </label>
            `).join('')}
          </div>
          <button class="btn-ghost" data-act="resetColumns" data-table="${tableKey}">Reset to Default</button>
        </div>
      </div>
    `;
  }

  function renderDeprecated(vm) {
    const depCols = resolveVisibleColumns('deprecated', vm.columnPrefs);
    const depDefsByKey = defsByKeyOf('deprecated');
    return `
      <div class="screen-scroll">
        <div class="page-header-row">
          <div class="page-title" style="margin-bottom:0;">Deprecated Assets</div>
          <div class="spacer"></div>
          <button class="btn-ghost" data-act="openColumnPicker" data-table="deprecated">Columns</button>
          <button class="btn-primary" data-act="exportDeprecatedCsv">Export CSV</button>
        </div>
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL DEPRECATED</div>
            <div class="kpi-value" style="color:${STATUS_COLORS['Retired']};">${vm.deprecatedCount}</div>
          </div>
        </div>
        <div class="grid-3">
          ${barPanel('By Type', vm.deprecatedTypeBars, '#4FA3F7', 'narrow')}
          ${barPanel('By Location', vm.deprecatedLocationBars, '#F2B84B', 'wide')}
          ${barPanel('By Supplier', vm.deprecatedSupplierBars, '#8B7CF6', 'narrow')}
        </div>
        <div class="panel" style="margin-bottom:16px;">
          <div class="panel-title">Retirements by Month</div>
          <div class="scroll-panel-body">
            ${vm.deprecatedByMonth.map((bar) => `
              <div class="bar-row">
                <div class="bar-label">${escapeHtml(bar.label)}</div>
                <div class="bar-track"><div class="bar-fill" style="background:#8792A2;width:${bar.pct}%;"></div></div>
                <div class="bar-count">${bar.count}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="panel" style="padding:0;">
          <div class="panel-title" style="padding:16px 20px 0;">Deprecated Register</div>
          <div class="table-scroll" data-cols-root="deprecated" style="--cols:${colsVar(vm.columnWidths.deprecated, depCols, null, null)};">
          <div class="table-header" style="margin-top:8px;">
            ${renderColumnHeaders('deprecated', depCols, depDefsByKey, null, true)}
          </div>
          <div class="table-body">
            ${vm.deprecatedRows.map((row) => `
              <div class="table-row" data-act="openDetail" data-id="${escapeHtml(row.id)}">
                ${depCols.map((key) => depDefsByKey[key].render(row)).join('')}
              </div>
            `).join('')}
          </div>
          </div>
          <div class="pagination-bar">
            <div class="page-info">Page ${vm.deprecatedPage} of ${vm.deprecatedTotalPages}</div>
            <button class="btn-page" data-act="prevDeprecatedPage" ${vm.deprecatedPage <= 1 ? 'disabled' : ''}>Prev</button>
            <button class="btn-page" data-act="nextDeprecatedPage" ${vm.deprecatedPage >= vm.deprecatedTotalPages ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSimAssignBlock(sel) {
    return `
      <div class="drawer-section">
        <div class="drawer-section-title">SIM Card</div>
        ${sel.currentSim ? `
          <div class="drawer-field-row">
            <div class="drawer-field-label">Assigned</div>
            <div class="drawer-field-value">${escapeHtml(sel.currentSim.phoneNumber)}${sel.currentSim.carrier ? ' — ' + escapeHtml(sel.currentSim.carrier) : ''}</div>
          </div>
          ${!sel.isRetired ? `<button class="btn-ghost" data-act="unassignSim" data-id="${sel.currentSim.id}">Unassign SIM</button>` : ''}
        ` : sel.isRetired ? `
          <div class="drawer-field-row">
            <div class="drawer-field-label">Assigned</div>
            <div class="drawer-field-value">—</div>
          </div>
        ` : `
          <select class="form-select" data-bind="assignSim.${escapeHtml(sel.assetTag)}">
            <option value="">Assign a SIM card…</option>
            ${sel.availableSims.map((sc) => `<option value="${sc.id}">${escapeHtml(sc.phoneNumber)}${sc.carrier ? ' — ' + escapeHtml(sc.carrier) : ''}</option>`).join('')}
          </select>
          ${sel.availableSims.length === 0 ? `<div class="account-hint">No unassigned SIM cards available.</div>` : ''}
        `}
      </div>
    `;
  }

  // Every plain identification/network/lifecycle field the drawer edits.
  // `type` picks the widget: unset = text input, 'select' = dropdown from
  // `options`, 'date' = native date input. Kept data-driven since these
  // fields are otherwise identical boilerplate (label + data-bind + value).
  const DETAIL_FIELD_GROUPS = [
    { title: 'Identification', fields: [
      { key: 'assetTag', label: 'Asset Tag', mono: true },
      { key: 'itemType', label: 'Item Type', type: 'select', options: ITEM_TYPES },
      { key: 'model', label: 'Model' },
      { key: 'serialNumber', label: 'Serial Number', mono: true },
      { key: 'expressTag', label: 'Express Tag', mono: true },
    ] },
    { title: 'Network', fields: [
      { key: 'macAddress', label: 'MAC Address', mono: true },
      { key: 'ipAddress', label: 'IP Address', mono: true },
      { key: 'imei', label: 'IMEI', mono: true },
      { key: 'telephoneNumber', label: 'Telephone', mono: true },
      { key: 'wsusGroup', label: 'WSUS Group' },
    ] },
    { title: 'Lifecycle', fields: [
      { key: 'supplier', label: 'Supplier', type: 'select', options: SUPPLIERS },
      { key: 'poNumber', label: 'PO Number', mono: true },
      { key: 'dateAcquired', label: 'Date Acquired', type: 'date' },
      { key: 'dateDeployed', label: 'Date Deployed', type: 'date' },
      { key: 'returnDate', label: 'Return Date', type: 'date' },
      { key: 'dateRetired', label: 'Date Retired', type: 'date' },
    ] },
  ];

  function chunkPairs(arr) {
    const out = [];
    for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
    return out;
  }

  function renderDetailFieldInput(field, value) {
    if (field.type === 'select') {
      return `
        <div class="form-group">
          <div class="form-label">${escapeHtml(field.label)}</div>
          <select class="form-select" data-bind="detailForm.${field.key}">
            ${field.options.map((o) => `<option value="${escapeHtml(o)}" ${o === value ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
          </select>
        </div>`;
    }
    if (field.type === 'date') {
      return `
        <div class="form-group">
          <div class="form-label">${escapeHtml(field.label)}</div>
          <input class="form-input mono" type="date" data-bind="detailForm.${field.key}" value="${escapeHtml(value)}">
        </div>`;
    }
    return `
      <div class="form-group">
        <div class="form-label">${escapeHtml(field.label)}</div>
        <input class="form-input${field.mono ? ' mono' : ''}" type="text" data-bind="detailForm.${field.key}" value="${escapeHtml(value)}" placeholder="—">
      </div>`;
  }

  function renderDetailFieldGroup(group, f, isRetired) {
    if (isRetired) {
      return `
        <div class="drawer-section">
          <div class="drawer-section-title">${escapeHtml(group.title)}</div>
          ${group.fields.map((field) => {
            const raw = f[field.key];
            const display = field.type === 'date' ? (raw ? formatDate(raw) : '—') : (raw || '—');
            const valueHtml = (field.key === 'ipAddress' && raw)
              ? `<a class="ip-link" href="http://${encodeURIComponent(raw)}" target="_blank" rel="noopener noreferrer">${escapeHtml(raw)}</a>`
              : escapeHtml(display);
            return `
              <div class="drawer-field-row">
                <div class="drawer-field-label">${escapeHtml(field.label)}</div>
                <div class="drawer-field-value">${valueHtml}</div>
              </div>`;
          }).join('')}
        </div>`;
    }
    return `
      <div class="drawer-section">
        <div class="drawer-section-title">${escapeHtml(group.title)}</div>
        ${chunkPairs(group.fields).map((pair) => `<div class="form-row">${pair.map((field) => renderDetailFieldInput(field, f[field.key])).join('')}</div>`).join('')}
      </div>`;
  }

  function renderAssignmentBlock(sel) {
    const f = sel.detailForm;
    if (sel.isRetired) {
      return `
        <div class="drawer-section">
          <div class="drawer-section-title">Assignment</div>
          <div class="drawer-field-row"><div class="drawer-field-label">Assigned To</div><div class="drawer-field-value">${escapeHtml(f.assignedName || '—')}</div></div>
          <div class="drawer-field-row"><div class="drawer-field-label">Location</div><div class="drawer-field-value">${escapeHtml(f.location)}</div></div>
          <div class="drawer-field-row"><div class="drawer-field-label">Company</div><div class="drawer-field-value">${escapeHtml(f.company || '—')}</div></div>
          <div class="drawer-field-row"><div class="drawer-field-label">Device Blocked</div><div class="drawer-field-value">${f.deviceBlocked ? 'Yes' : 'No'}</div></div>
          <div class="drawer-field-row"><div class="drawer-field-label">Agreement Signed</div><div class="drawer-field-value">${f.agreementSigned ? 'Yes' : 'No'}</div></div>
        </div>
      `;
    }
    return `
      <div class="drawer-section">
        <div class="drawer-section-title">Assignment</div>
        <div class="form-group">
          <div class="form-label">Assigned To</div>
          <input class="form-input" type="text" list="assignee-names-list" data-bind="detailForm.assignedName" value="${escapeHtml(f.assignedName)}" placeholder="Type a name…">
          <datalist id="assignee-names-list">
            ${sel.assigneeNames.map((n) => `<option value="${escapeHtml(n)}"></option>`).join('')}
          </datalist>
        </div>
        <div class="form-row">
          <div class="form-group">
            <div class="form-label">Location</div>
            <select class="form-select" data-bind="detailForm.location">
              ${LOCATIONS.map((l) => `<option value="${escapeHtml(l)}" ${l === f.location ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <div class="form-label">Company</div>
            ${sel.isAdmin ? `
              <select class="form-select" data-bind="detailForm.company">
                <option value="" ${!f.company ? 'selected' : ''}>—</option>
                ${COMPANIES.map((c) => `<option value="${escapeHtml(c)}" ${c === f.company ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
            ` : `<div class="drawer-field-value" style="padding-top:9px;">${escapeHtml(f.company || '—')} <span class="cell-dim" style="font-size:11px;">(admin only)</span></div>`}
          </div>
        </div>
        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <div class="form-label">Device Blocked</div>
            ${sel.isAdmin ? `
              <select class="form-select" data-bind="detailForm.deviceBlocked">
                <option value="no" ${!f.deviceBlocked ? 'selected' : ''}>No</option>
                <option value="yes" ${f.deviceBlocked ? 'selected' : ''}>Yes</option>
              </select>
            ` : `<div class="drawer-field-value" style="padding-top:9px;">${f.deviceBlocked ? 'Yes' : 'No'} <span class="cell-dim" style="font-size:11px;">(admin only)</span></div>`}
          </div>
          <div class="form-group">
            <div class="form-label">Agreement Signed</div>
            <select class="form-select" data-bind="detailForm.agreementSigned">
              <option value="no" ${!f.agreementSigned ? 'selected' : ''}>No</option>
              <option value="yes" ${f.agreementSigned ? 'selected' : ''}>Yes</option>
            </select>
          </div>
        </div>
        ${f.assignedName ? `<button class="btn-ghost" data-act="unassignAsset" data-id="${escapeHtml(sel.assetTag)}">Unassign</button>` : ''}
      </div>
    `;
  }

  function renderNotesBlock(sel) {
    const f = sel.detailForm;
    if (sel.isRetired) {
      return `
        <div class="drawer-section">
          <div class="drawer-section-title">Notes</div>
          <div class="drawer-field-row"><div class="drawer-field-label">Notes</div><div class="drawer-field-value">${escapeHtml(f.notes || '—')}</div></div>
          <div class="drawer-field-row"><div class="drawer-field-label">Cost</div><div class="drawer-field-value">${f.costTracked && f.cost !== '' ? '£' + escapeHtml(f.cost) : '—'}</div></div>
        </div>
      `;
    }
    return `
      <div class="drawer-section">
        <div class="drawer-section-title">Notes</div>
        <div class="form-group">
          <textarea class="form-input" rows="3" data-bind="detailForm.notes" placeholder="Anything worth noting about this asset…">${escapeHtml(f.notes)}</textarea>
        </div>
        ${sel.isAdmin ? `
          <div class="form-row" style="align-items:flex-end;">
            <div class="form-group" style="flex:0 0 auto;">
              <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-dim);cursor:pointer;padding-bottom:9px;">
                <input type="checkbox" style="accent-color:var(--accent);width:14px;height:14px;" data-act="toggleCostTracked" ${f.costTracked ? 'checked' : ''}>
                Cost
              </label>
            </div>
            <div class="form-group">
              <input class="form-input mono" type="number" step="0.01" min="0" data-bind="detailForm.cost" value="${escapeHtml(f.cost)}" placeholder="0.00" ${f.costTracked ? '' : 'disabled'}>
            </div>
          </div>
        ` : `
          <div class="drawer-field-row">
            <div class="drawer-field-label">Cost</div>
            <div class="drawer-field-value">${f.costTracked && f.cost !== '' ? '£' + escapeHtml(f.cost) : '—'} <span class="cell-dim" style="font-size:11px;">(admin only)</span></div>
          </div>
        `}
      </div>
    `;
  }

  function renderDrawer(sel) {
    const f = sel.detailForm;
    return `
      <div class="overlay" data-act="closeDetail"></div>
      <div class="drawer" data-act="noop">
        <div class="drawer-header">
          <div class="drawer-tag">${escapeHtml(sel.assetTag)}</div>
          <span class="status-pill" style="background:${sel.statusBg};color:${sel.statusColor};">${escapeHtml(sel.status)}</span>
          <div class="spacer"></div>
          <div class="drawer-close" data-act="closeDetail">×</div>
        </div>
        <div class="drawer-divider"></div>
        ${DETAIL_FIELD_GROUPS.map((group) => renderDetailFieldGroup(group, f, sel.isRetired)).join('')}
        ${renderAssignmentBlock(sel)}
        ${renderNotesBlock(sel)}
        ${sel.isMobile ? renderSimAssignBlock(sel) : ''}
        ${!sel.isRetired ? `<button class="btn-submit" style="width:100%;margin-bottom:18px;" data-act="submitDetail" data-id="${escapeHtml(sel.assetTag)}">Save Changes</button>` : ''}
        <div class="drawer-section-title">History</div>
        ${sel.history.map((h) => `
          <div class="history-row">
            <div class="history-date">${escapeHtml(h.date)}</div>
            <div class="history-text">${escapeHtml(h.text)}</div>
          </div>
        `).join('')}
        <div style="height:16px;"></div>
        ${sel.isRetired ? `<div class="drawer-note">This asset is retired and read-only.</div>` : ''}
        ${sel.actions.map((act) => `
          <button class="drawer-action-btn" style="border-color:${act.border};color:${act.color};" data-act="${act.act}" data-id="${escapeHtml(sel.id)}">${escapeHtml(act.label)}</button>
        `).join('')}
      </div>
    `;
  }

  function renderAddModal(form, errors, availableSims) {
    const opts = (arr, current) => arr.map((v) => `<option value="${escapeHtml(v)}" ${v === current ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
    return `
      <div class="modal-overlay" data-act="closeAdd">
        <div class="modal-box" data-act="noop">
          <div class="modal-header">
            <div class="modal-title">Add Asset</div>
            <div class="modal-close" data-act="closeAdd">×</div>
          </div>

          <div class="form-group">
            <div class="form-label">Asset Tag *</div>
            <input class="form-input mono" type="text" data-bind="form.assetTag" value="${escapeHtml(form.assetTag)}" placeholder="AST-000123">
            ${errors.assetTag ? `<div class="form-error">${escapeHtml(errors.assetTag)}</div>` : ''}
          </div>

          <div class="form-row">
            <div class="form-group">
              <div class="form-label">Item Type *</div>
              <select class="form-select" data-bind="form.itemType">${opts(ITEM_TYPES, form.itemType)}</select>
            </div>
            <div class="form-group">
              <div class="form-label">Model *</div>
              <input class="form-input" type="text" data-bind="form.model" value="${escapeHtml(form.model)}" placeholder="Dell Latitude 5440">
              ${errors.model ? `<div class="form-error">${escapeHtml(errors.model)}</div>` : ''}
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <div class="form-label">Serial Number</div>
              <input class="form-input mono" type="text" data-bind="form.serialNumber" value="${escapeHtml(form.serialNumber)}">
            </div>
            <div class="form-group">
              <div class="form-label">Location</div>
              <select class="form-select" data-bind="form.location">${opts(LOCATIONS, form.location)}</select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <div class="form-label">Company</div>
              <select class="form-select" data-bind="form.company">
                <option value="">—</option>
                ${opts(COMPANIES, form.company)}
              </select>
            </div>
            <div class="form-group"></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <div class="form-label">IP Address</div>
              <input class="form-input mono" type="text" data-bind="form.ipAddress" value="${escapeHtml(form.ipAddress)}" placeholder="192.168.1.50">
            </div>
            <div class="form-group">
              ${form.itemType === 'Mobile Phone' ? `
                <div class="form-label">SIM Card</div>
                <select class="form-select" data-bind="form.simCardId">
                  <option value="">No SIM — assign later</option>
                  ${availableSims.map((sc) => `<option value="${sc.id}" ${String(sc.id) === String(form.simCardId) ? 'selected' : ''}>${escapeHtml(sc.phoneNumber)}${sc.carrier ? ' — ' + escapeHtml(sc.carrier) : ''}</option>`).join('')}
                </select>
              ` : ''}
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <div class="form-label">Assignee First Name</div>
              <input class="form-input" type="text" data-bind="form.firstName" value="${escapeHtml(form.firstName)}">
            </div>
            <div class="form-group">
              <div class="form-label">Assignee Last Name</div>
              <input class="form-input" type="text" data-bind="form.lastName" value="${escapeHtml(form.lastName)}">
            </div>
          </div>

          <div class="form-row" style="margin-bottom:18px;">
            <div class="form-group">
              <div class="form-label">Supplier</div>
              <select class="form-select" data-bind="form.supplier">${opts(SUPPLIERS, form.supplier)}</select>
            </div>
            <div class="form-group">
              <div class="form-label">PO Number</div>
              <input class="form-input mono" type="text" data-bind="form.poNumber" value="${escapeHtml(form.poNumber)}" placeholder="PO-2026-1234">
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" data-act="closeAdd">Cancel</button>
            <button class="btn-submit" data-act="submitAdd">Add Asset</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSimCards(vm) {
    const simCols = resolveVisibleColumns('simCards', vm.columnPrefs);
    const simDefsByKey = defsByKeyOf('simCards');
    const simRows = vm.simCards.map((sc) => {
      const assignedAsset = sc.assignedAssetTag ? vm.assignableMobiles.find((a) => a.assetTag === sc.assignedAssetTag) : null;
      return { ...sc, assignedLabel: sc.assignedAssetTag ? `${sc.assignedAssetTag}${assignedAsset && assignedAsset.firstName ? ' — ' + assignedAsset.firstName + ' ' + assignedAsset.lastName : ''}` : '—' };
    });
    return `
      <div class="screen-scroll">
        <div class="page-title">SIM Cards</div>
        <div class="panel">
          <div class="page-header-row" style="margin-bottom:14px;">
            <div class="panel-title" style="margin-bottom:0;">SIM Inventory</div>
            <div class="spacer"></div>
            <button class="btn-ghost" data-act="openColumnPicker" data-table="simCards">Columns</button>
          </div>
          <div class="table-scroll" data-cols-root="simCards" style="--cols:${colsVar(vm.columnWidths.simCards, simCols, null, 260)};">
          <div class="users-row users-header">
            ${renderColumnHeaders('simCards', simCols, simDefsByKey, null, false)}
            <div></div>
          </div>
          ${simRows.map((sc) => `
            <div class="users-row">
              ${simCols.map((key) => simDefsByKey[key].render(sc)).join('')}
              <div class="users-row-actions">
                ${sc.status === 'Available' ? `
                  <select class="form-select" style="padding:5px 8px;font-size:12px;max-width:180px;" data-bind="assignSimRow.${sc.id}">
                    <option value="">Assign to…</option>
                    ${vm.assignableMobiles.map((a) => `<option value="${escapeHtml(a.assetTag)}">${escapeHtml(a.assetTag)} — ${escapeHtml(a.model)}</option>`).join('')}
                  </select>
                  ${vm.isAdmin ? `<button class="btn-ghost users-row-btn" data-act="retireSim" data-id="${sc.id}">Retire</button>` : ''}
                ` : ''}
                ${sc.status === 'Assigned' ? `<button class="btn-ghost users-row-btn" data-act="unassignSim" data-id="${sc.id}">Unassign</button>` : ''}
                ${sc.status === 'Retired' && vm.isAdmin ? `<button class="btn-ghost users-row-btn" data-act="reactivateSim" data-id="${sc.id}">Reactivate</button>` : ''}
                ${sc.status !== 'Assigned' && vm.isAdmin ? `<button class="btn-ghost users-row-btn" style="border-color:#F2635B;color:#F2635B;" data-act="deleteSim" data-id="${sc.id}">Delete</button>` : ''}
              </div>
            </div>
          `).join('')}
          ${vm.simCards.length === 0 ? `<div class="users-row"><div class="cell-dim">No SIM cards yet.</div></div>` : ''}
          </div>
        </div>

        ${vm.isAdmin ? `
        <div class="panel" style="max-width:480px;">
          <div class="panel-title">Add SIM Card</div>
          <div class="form-group">
            <div class="form-label">Phone Number</div>
            <input class="form-input mono" type="text" data-bind="simForm.phoneNumber" value="${escapeHtml(vm.simForm.phoneNumber)}" placeholder="+44 7700 900123">
            ${vm.simFormErrors.phoneNumber ? `<div class="form-error">${escapeHtml(vm.simFormErrors.phoneNumber)}</div>` : ''}
          </div>
          <div class="form-row">
            <div class="form-group">
              <div class="form-label">Carrier</div>
              <input class="form-input" type="text" data-bind="simForm.carrier" value="${escapeHtml(vm.simForm.carrier)}" placeholder="EE">
            </div>
            <div class="form-group">
              <div class="form-label">Plan</div>
              <input class="form-input" type="text" data-bind="simForm.plan" value="${escapeHtml(vm.simForm.plan)}" placeholder="20GB Data">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:18px;">
            <div class="form-label">ICCID</div>
            <input class="form-input mono" type="text" data-bind="simForm.iccid" value="${escapeHtml(vm.simForm.iccid)}">
          </div>
          <button class="btn-submit" data-act="submitCreateSim">Add SIM Card</button>
        </div>
        ` : ''}
      </div>
    `;
  }

  function renderUsers(vm) {
    const userCols = resolveVisibleColumns('users', vm.columnPrefs);
    const userDefsByKey = defsByKeyOf('users');
    return `
      <div class="screen-scroll">
        <div class="page-title">User Management</div>
        <div class="panel">
          <div class="page-header-row" style="margin-bottom:14px;">
            <div class="panel-title" style="margin-bottom:0;">Users</div>
            <div class="spacer"></div>
            <button class="btn-ghost" data-act="openColumnPicker" data-table="users">Columns</button>
          </div>
          <div class="table-scroll" data-cols-root="users" style="--cols:${colsVar(vm.columnWidths.users, userCols, null, 260)};">
          <div class="users-row users-header">
            ${renderColumnHeaders('users', userCols, userDefsByKey, null, false)}
            <div></div>
          </div>
          ${vm.users.map((u) => `
            <div class="users-row">
              ${userCols.map((key) => userDefsByKey[key].render(u)).join('')}
              <div class="users-row-actions">
                <button class="btn-ghost users-row-btn" data-act="toggleUserActive" data-id="${u.id}">${u.active ? 'Disable' : 'Enable'}</button>
                <button class="btn-ghost users-row-btn" data-act="resetUserMfa" data-id="${u.id}">Reset MFA</button>
                ${u.id !== vm.currentUserId ? `<button class="btn-ghost users-row-btn" style="border-color:#F2635B;color:#F2635B;" data-act="deleteUser" data-id="${u.id}">Delete</button>` : ''}
              </div>
            </div>
          `).join('')}
          ${vm.users.length === 0 ? `<div class="users-row"><div class="cell-dim">No users yet.</div></div>` : ''}
          </div>
        </div>

        <div class="panel" style="max-width:480px;">
          <div class="panel-title">Create User</div>
          <div class="form-group">
            <div class="form-label">Email</div>
            <input class="form-input" type="email" data-bind="userForm.email" value="${escapeHtml(vm.userForm.email)}">
            ${vm.userFormErrors.email ? `<div class="form-error">${escapeHtml(vm.userFormErrors.email)}</div>` : ''}
          </div>
          <div class="form-group">
            <div class="form-label">Temporary Password</div>
            <input class="form-input" type="password" data-bind="userForm.password" value="${escapeHtml(vm.userForm.password)}">
            ${vm.userFormErrors.password ? `<div class="form-error">${escapeHtml(vm.userFormErrors.password)}</div>` : ''}
          </div>
          <div class="form-group" style="margin-bottom:18px;">
            <div class="form-label">Role</div>
            <select class="form-select" data-bind="userForm.role">
              <option value="standard" ${vm.userForm.role === 'standard' ? 'selected' : ''}>Standard</option>
              <option value="admin" ${vm.userForm.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <button class="btn-submit" data-act="submitCreateUser">Create User</button>
        </div>
      </div>
    `;
  }

  function renderImportModal(csvImport) {
    if (csvImport.step === 'results') return renderImportResultsModal(csvImport.results);

    const okCount = csvImport.rows.filter((r) => r._status === 'ok').length;
    const reviewCount = csvImport.rows.filter((r) => r._status === 'review').length;
    const skipCount = csvImport.rows.filter((r) => r._status === 'skip').length;
    const importCount = okCount + reviewCount;
    return `
      <div class="modal-overlay" data-act="closeImport">
        <div class="modal-box" style="max-width:640px;" data-act="noop">
          <div class="modal-header">
            <div class="modal-title">Import Assets from CSV</div>
            <div class="modal-close" data-act="closeImport">×</div>
          </div>

          ${csvImport.step === 'pick' ? `
            <div class="form-group">
              <div class="form-label">CSV file</div>
              <input class="form-input" type="file" id="csvFileInput" accept=".csv">
            </div>
            <div class="auth-hint">Column headers can be human-readable (e.g. "Asset Tag", "Item Type") or the exact Export CSV names. Rows missing a required field or using an unrecognized Item Type / Location / Supplier still import, but are flagged for review afterward — nothing is silently dropped or renamed.</div>
            <div class="modal-actions">
              <button class="btn-secondary" data-act="closeImport">Cancel</button>
            </div>
          ` : `
            <div class="auth-hint">${escapeHtml(csvImport.fileName)} — <strong>${okCount}</strong> ready, <strong>${reviewCount}</strong> ${reviewCount === 1 ? 'needs' : 'need'} review, <strong>${skipCount}</strong> ${skipCount === 1 ? 'will be' : 'will be'} skipped.</div>
            <div class="import-preview-table">
              ${csvImport.rows.map((row) => `
                <div class="import-preview-row ${row._status === 'skip' ? 'import-row-error' : row._status === 'review' ? 'import-row-review' : ''}">
                  <div class="cell-mono">${escapeHtml(row.assetTag || '—')}</div>
                  <div class="cell-dim">${escapeHtml(row.itemType || '—')}</div>
                  <div class="cell-ellipsis">${escapeHtml(row.model || '—')}</div>
                  <div class="import-row-msg">${row._reasons && row._reasons.length ? escapeHtml(row._reasons.join('; ')) : 'OK'}</div>
                </div>
              `).join('')}
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" data-act="closeImport">Cancel</button>
              <button class="btn-submit" data-act="confirmImport" ${importCount ? '' : 'disabled'}>Import ${importCount} Assets</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderImportResultsModal(results) {
    const { imported, review, skipped } = results;
    return `
      <div class="modal-overlay" data-act="closeImport">
        <div class="modal-box" style="max-width:640px;" data-act="noop">
          <div class="modal-header">
            <div class="modal-title">Import Complete</div>
            <div class="modal-close" data-act="closeImport">×</div>
          </div>
          <div class="auth-hint"><strong>${imported.length}</strong> imported cleanly, <strong>${review.length}</strong> imported but need review, <strong>${skipped.length}</strong> skipped.</div>

          ${review.length ? `
            <div class="drawer-section-title" style="margin-top:14px;">Needs Review (${review.length}) — imported, but check these</div>
            <div class="import-preview-table">
              ${review.map((r) => `
                <div class="import-preview-row import-row-review" style="grid-template-columns:140px 1fr;">
                  <div class="cell-mono">${escapeHtml(r.assetTag)}</div>
                  <div class="import-row-msg">${escapeHtml(r.reasons.join('; '))}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${skipped.length ? `
            <div class="drawer-section-title" style="margin-top:14px;">Skipped (${skipped.length}) — not imported</div>
            <div class="import-preview-table">
              ${skipped.map((r) => `
                <div class="import-preview-row import-row-error" style="grid-template-columns:140px 1fr;">
                  <div class="cell-mono">${escapeHtml(r.assetTag || '—')}</div>
                  <div class="import-row-msg">${escapeHtml(r.reasons.join('; '))}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="modal-actions" style="margin-top:14px;">
            <button class="btn-submit" data-act="closeImport">Done</button>
          </div>
        </div>
      </div>
    `;
  }

  // Boot.
  const app = new App();
  document.addEventListener('DOMContentLoaded', () => app.init());
})();
