/* ==========================================================================
   Asset Register Dashboard — Console Grid
   Vanilla JS app: state, view-model computation, and DOM rendering.
   No frameworks, no build step, works fully offline.
   ========================================================================== */

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

  /* ------------------------------------------------------------------ *
   * App: owns state, derives the view model, and re-renders on change. *
   * ------------------------------------------------------------------ */
  class App {
    constructor() {
      this.state = {
        assets: [], ready: false, toast: null,
        screen: 'overview', search: '', statusFilter: [], typeFilter: '', locationFilter: '',
        sortCol: 'assetTag', sortDir: 'asc', page: 1, selectedId: null, drawerOpen: false,
        addOpen: false, form: freshForm(), formErrors: {},
      };
      this._toastTimer = null;
    }

    init() {
      this.render();
      // Simulate the brief "loading register" moment from the original design.
      setTimeout(() => {
        const assets = generateAssets(2150, 42);
        this.setState({ assets, ready: true });
      }, 350);
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

    // -- actions -------------------------------------------------------

    setScreen(screen) { this.setState({ screen, drawerOpen: false }); }
    setSearch(value) { this.setState({ search: value, page: 1 }); }
    toggleStatusFilter(status) {
      this.setState((s) => {
        const next = s.statusFilter.includes(status) ? s.statusFilter.filter((x) => x !== status) : [...s.statusFilter, status];
        return { statusFilter: next, page: 1 };
      });
    }
    setTypeFilter(value) { this.setState({ typeFilter: value, page: 1 }); }
    setLocationFilter(value) { this.setState({ locationFilter: value, page: 1 }); }
    setSort(col) {
      this.setState((s) => ({ sortCol: col, sortDir: s.sortCol === col && s.sortDir === 'asc' ? 'desc' : 'asc' }));
    }
    setPage(page) { this.setState({ page }); }
    openDetail(id) { this.setState({ selectedId: id, drawerOpen: true }); }
    closeDetail() { this.setState({ drawerOpen: false }); }
    openAdd() { this.setState({ addOpen: true, formErrors: {} }); }
    closeAdd() { this.setState({ addOpen: false }); }
    updateFormField(field, value) { this.setState((s) => ({ form: { ...s.form, [field]: value } })); }

    mutateAsset(id, fn) {
      this.setState((s) => ({ assets: s.assets.map((asset) => (asset.id === id ? fn({ ...asset, history: [...asset.history] }) : asset)) }));
    }
    checkInOut(id) {
      const asset = this.state.assets.find((x) => x.id === id);
      if (!asset) return;
      if (asset.status === 'In Use') { this.mutateAsset(id, (a) => ({ ...a, status: 'In Stock', history: [...a.history, { date: TODAY_ISO, text: 'Checked in to stock' }] })); this.showToast(`${id} checked in`); }
      else if (asset.status === 'In Stock') { this.mutateAsset(id, (a) => ({ ...a, status: 'In Use', history: [...a.history, { date: TODAY_ISO, text: 'Checked out from stock' }] })); this.showToast(`${id} checked out`); }
      else if (asset.status === 'In Repair') { this.mutateAsset(id, (a) => ({ ...a, status: 'In Use', history: [...a.history, { date: TODAY_ISO, text: 'Repair complete — returned to service' }] })); this.showToast(`${id} marked repaired`); }
    }
    flagRepair(id) {
      this.mutateAsset(id, (a) => ({ ...a, status: 'In Repair', history: [...a.history, { date: TODAY_ISO, text: 'Flagged for maintenance' }] }));
      this.showToast(`${id} flagged for repair`);
    }
    retireAsset(id) {
      this.mutateAsset(id, (a) => ({ ...a, status: 'Retired', dateRetired: TODAY_ISO, deviceBlocked: true, history: [...a.history, { date: TODAY_ISO, text: 'Asset retired and decommissioned' }] }));
      this.showToast(`${id} retired`);
    }

    submitAdd() {
      const form = this.state.form;
      const errors = {};
      if (!form.assetTag.trim()) errors.assetTag = 'Asset tag is required';
      else if (this.state.assets.some((a) => a.id === form.assetTag.trim())) errors.assetTag = 'Asset tag already exists';
      if (!form.itemType) errors.itemType = 'Required';
      if (!form.model.trim()) errors.model = 'Model is required';
      if (Object.keys(errors).length) { this.setState({ formErrors: errors }); return; }
      const newAsset = {
        id: form.assetTag.trim(), assetTag: form.assetTag.trim(), itemType: form.itemType, model: form.model.trim(),
        serialNumber: form.serialNumber.trim() || '—', expressTag: '', macAddress: '', imei: '', wsusGroup: '',
        telephoneNumber: '', poNumber: form.poNumber.trim() || '—', deviceBlocked: false, location: form.location,
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), dateAcquired: TODAY_ISO, dateDeployed: form.firstName.trim() ? TODAY_ISO : '',
        returnDate: '', dateRetired: '', notes: '', agreementSigned: false, supplier: form.supplier,
        status: form.firstName.trim() ? 'In Use' : 'In Stock',
        history: [{ date: TODAY_ISO, text: `Received from ${form.supplier} — added to register` }],
      };
      this.setState((s) => ({ assets: [newAsset, ...s.assets], addOpen: false, page: 1, form: freshForm(), formErrors: {} }));
      this.showToast(`Asset ${newAsset.assetTag} added`);
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

    // -- view model ------------------------------------------------------

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
        id: asset.id, assetTag: asset.assetTag, itemType: asset.itemType, model: asset.model,
        assigneeName: asset.firstName ? `${asset.firstName} ${asset.lastName}` : '—',
        location: asset.location, status: asset.status,
        statusColor: STATUS_COLORS[asset.status] || '#8792A2', statusBg: tint(STATUS_COLORS[asset.status]),
        deployedStr: asset.dateDeployed ? formatDate(asset.dateDeployed) : '—',
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

      return {
        ready: true, toast: st.toast,
        screen: st.screen,
        kpis, typeBars, locationBars, supplierBars, donutSegs,
        donutTotal: summary.total.toLocaleString(),
        attention,
        search: st.search,
        statusChips,
        typeFilter: st.typeFilter, typeOptions,
        locationFilter: st.locationFilter, locationOptions,
        rows,
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
      };
    }

    buildDetail(id) {
      const asset = this.state.assets.find((a) => a.id === id);
      if (!asset) return null;
      const sections = [
        { title: 'Identification', fields: [
          { label: 'Asset Tag', value: asset.assetTag }, { label: 'Item Type', value: asset.itemType }, { label: 'Model', value: asset.model },
          { label: 'Serial Number', value: asset.serialNumber }, { label: 'Express Tag', value: asset.expressTag || '—' },
        ] },
        { title: 'Network', fields: [
          { label: 'MAC Address', value: asset.macAddress || '—' }, { label: 'IMEI', value: asset.imei || '—' },
          { label: 'Telephone', value: asset.telephoneNumber || '—' }, { label: 'WSUS Group', value: asset.wsusGroup || '—' },
        ] },
        { title: 'Assignment', fields: [
          { label: 'Assigned To', value: asset.firstName ? `${asset.firstName} ${asset.lastName}` : '—' }, { label: 'Location', value: asset.location },
          { label: 'Device Blocked', value: asset.deviceBlocked ? 'Yes' : 'No' }, { label: 'Agreement Signed', value: asset.agreementSigned ? 'Yes' : 'No' },
        ] },
        { title: 'Lifecycle', fields: [
          { label: 'Supplier', value: asset.supplier }, { label: 'PO Number', value: asset.poNumber },
          { label: 'Date Acquired', value: formatDate(asset.dateAcquired) }, { label: 'Date Deployed', value: asset.dateDeployed ? formatDate(asset.dateDeployed) : '—' },
          { label: 'Return Date', value: asset.returnDate ? formatDate(asset.returnDate) : '—' }, { label: 'Date Retired', value: asset.dateRetired ? formatDate(asset.dateRetired) : '—' },
        ] },
      ];
      const actions = [];
      if (asset.status === 'In Use') {
        actions.push({ act: 'checkInOut', label: 'Check In', color: '#E8EDF3', border: '#2E3846' });
        actions.push({ act: 'flagRepair', label: 'Flag for Repair', color: '#F2B84B', border: '#F2B84B' });
        actions.push({ act: 'retireAsset', label: 'Retire Asset', color: '#F2635B', border: '#F2635B' });
      } else if (asset.status === 'In Stock') {
        actions.push({ act: 'checkInOut', label: 'Check Out', color: '#E8EDF3', border: '#2E3846' });
        actions.push({ act: 'retireAsset', label: 'Retire Asset', color: '#F2635B', border: '#F2635B' });
      } else if (asset.status === 'In Repair') {
        actions.push({ act: 'checkInOut', label: 'Mark Repaired', color: '#34E2A0', border: '#34E2A0' });
        actions.push({ act: 'retireAsset', label: 'Retire Asset', color: '#F2635B', border: '#F2635B' });
      }
      return {
        id: asset.id, assetTag: asset.assetTag, status: asset.status,
        statusColor: STATUS_COLORS[asset.status] || '#8792A2', statusBg: tint(STATUS_COLORS[asset.status]),
        sections, history: [...asset.history].reverse().map((h) => ({ date: formatDate(h.date), text: h.text })),
        actions, isRetired: asset.status === 'Retired',
      };
    }

    // -- rendering ---------------------------------------------------------

    render() {
      const focusInfo = this._captureFocus();
      const vm = this.computeViewModel();
      root.innerHTML = vm.ready ? renderShell(vm) : `<div class="app-loading">Loading register…</div>`;
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

    _bindEvents() {
      root.onclick = (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        const act = el.getAttribute('data-act');
        const id = el.getAttribute('data-id');
        switch (act) {
          case 'goOverview': this.setScreen('overview'); break;
          case 'goAssets': this.setScreen('assets'); break;
          case 'goReports': this.setScreen('reports'); break;
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
          case 'noop': /* clicks on the drawer/modal panel itself: absorb here so they
                          don't fall through to the backdrop's close handler */ break;
          default: break;
        }
      };

      root.oninput = (e) => {
        const el = e.target;
        const bind = el.getAttribute && el.getAttribute('data-bind');
        if (!bind) return;
        if (bind === 'search') this.setSearch(el.value);
        else if (bind.startsWith('form.')) this.updateFormField(bind.slice(5), el.value);
      };

      root.onchange = (e) => {
        const el = e.target;
        const bind = el.getAttribute && el.getAttribute('data-bind');
        if (!bind) return;
        if (bind === 'typeFilter') this.setTypeFilter(el.value);
        else if (bind === 'locationFilter') this.setLocationFilter(el.value);
        else if (bind.startsWith('form.')) this.updateFormField(bind.slice(5), el.value);
      };
    }
  }

  /* ------------------------------------------------------------------ *
   * Pure render helpers — build HTML strings from the view model.       *
   * ------------------------------------------------------------------ */

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
          </div>
          ${vm.drawerOpen && vm.selected ? renderDrawer(vm.selected) : ''}
          ${vm.addOpen ? renderAddModal(vm.form, vm.formErrors) : ''}
        </div>
      </div>
      ${vm.toast ? `<div class="toast">${escapeHtml(vm.toast.msg)}</div>` : ''}
    `;
  }

  function renderTopbar(vm) {
    return `
      <div class="topbar">
        <div class="brand-badge">R</div>
        <div class="brand-title">Asset Register</div>
        <input class="search-input" type="text" data-bind="search" value="${escapeHtml(vm.search)}" placeholder="Search tag, model, serial, owner…">
        <div class="spacer"></div>
        <button class="btn-primary" data-act="openAdd">+ Add Asset</button>
        <div class="avatar-badge">IT</div>
      </div>
    `;
  }

  function renderSidebar(vm) {
    const item = (screen, label, act) => `
      <div class="nav-item ${vm.screen === screen ? 'active' : ''}" data-act="${act}">
        <div class="nav-dot"></div>${label}
      </div>`;
    return `
      <div class="sidebar">
        ${item('overview', 'Overview', 'goOverview')}
        ${item('assets', 'Assets', 'goAssets')}
        ${item('reports', 'Reports', 'goReports')}
        <div class="spacer"></div>
        <div class="nav-footer">v2.4 · ${vm.donutTotal} assets</div>
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

  function renderAssets(vm) {
    const arrow = (col) => vm.sortCol === col ? (vm.sortDir === 'asc' ? '▲' : '▼') : '';
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

        <div class="table-col">
          <div class="table-toolbar">
            <div class="table-count">Showing <span class="num">${vm.rangeStart}–${vm.rangeEnd}</span> of <span class="num">${vm.resultCount}</span></div>
            <div class="spacer"></div>
            <button class="btn-ghost" data-act="exportCsv">Export CSV</button>
          </div>
          <div class="table-header">
            <div class="sortable" data-act="sortTag">TAG ${arrow('assetTag')}</div>
            <div>TYPE</div>
            <div>MODEL</div>
            <div>ASSIGNED TO</div>
            <div>LOCATION</div>
            <div class="sortable" data-act="sortStatus">STATUS ${arrow('status')}</div>
            <div class="sortable" data-act="sortDeployed">DEPLOYED ${arrow('dateDeployed')}</div>
          </div>
          <div class="table-body">
            ${vm.rows.map((row) => `
              <div class="table-row" data-act="openDetail" data-id="${escapeHtml(row.id)}">
                <div class="cell-mono">${escapeHtml(row.assetTag)}</div>
                <div class="cell-dim">${escapeHtml(row.itemType)}</div>
                <div class="cell-ellipsis" style="color:#E8EDF3;">${escapeHtml(row.model)}</div>
                <div class="cell-dim cell-ellipsis">${escapeHtml(row.assigneeName)}</div>
                <div class="cell-dim cell-ellipsis">${escapeHtml(row.location)}</div>
                <div><span class="status-pill" style="background:${row.statusBg};color:${row.statusColor};">${escapeHtml(row.status)}</span></div>
                <div class="cell-deployed">${escapeHtml(row.deployedStr)}</div>
              </div>
            `).join('')}
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

  function renderReports(vm) {
    const barPanel = (title, bars, color, labelClass) => `
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
    return `
      <div class="screen-scroll">
        <div class="page-header-row">
          <div class="page-title" style="margin-bottom:0;">Reports &amp; Analytics</div>
          <div class="spacer"></div>
          <button class="btn-primary" data-act="exportCsv">Export CSV</button>
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
      </div>
    `;
  }

  function renderDrawer(sel) {
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
        ${sel.sections.map((sec) => `
          <div class="drawer-section">
            <div class="drawer-section-title">${escapeHtml(sec.title)}</div>
            ${sec.fields.map((f) => `
              <div class="drawer-field-row">
                <div class="drawer-field-label">${escapeHtml(f.label)}</div>
                <div class="drawer-field-value">${escapeHtml(f.value)}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
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

  function renderAddModal(form, errors) {
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

  // Boot.
  const app = new App();
  document.addEventListener('DOMContentLoaded', () => app.init());
})();
