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

  const REPORT_GROUP_FIELDS = [
    { value: 'itemType', label: 'Item Type' },
    { value: 'location', label: 'Location' },
    { value: 'company', label: 'Company' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'status', label: 'Status' },
  ];
  const REPORT_EMPTY_FIELDS = [
    { value: 'company', label: 'Company' },
    { value: 'serialNumber', label: 'Serial Number' },
    { value: 'poNumber', label: 'PO Number' },
    { value: 'macAddress', label: 'MAC Address' },
    { value: 'ipAddress', label: 'IP Address' },
    { value: 'telephoneNumber', label: 'Telephone' },
    { value: 'expressTag', label: 'Express Tag' },
    { value: 'wsusGroup', label: 'WSUS Group' },
    { value: 'notes', label: 'Notes' },
  ];
  function isEmptyValue(v) { return !v || v === '—'; }

  class App {
    constructor() {
      this.state = {
        assets: [], ready: false, toast: null,
        screen: 'overview', search: '', statusFilter: [], typeFilter: '', locationFilter: '',
        sortCol: 'assetTag', sortDir: 'asc', page: 1, selectedId: null, drawerOpen: false,
        addOpen: false, form: freshForm(), formErrors: {},
        assignForm: { assignedName: '', location: '', company: '', deviceBlocked: false, agreementSigned: false },
        reportBuilder: { type: 'groupBy', field: 'itemType' },
        currentUser: null,
        authScreen: 'login', authForm: { email: '', password: '' }, authError: '', authInfo: '', authSubmitting: false,
        mfaForm: { token: '' }, mfaError: '',
        forgotForm: { email: '' }, forgotError: '', forgotSubmitting: false,
        resetForm: { email: '', code: '', newPassword: '', confirmPassword: '' }, resetError: '', resetSubmitting: false,
        mfaEnroll: { qr: '', manualKey: '' },
        selectedIds: [],
        deprecatedPage: 1,
        csvImport: { open: false, step: 'pick', fileName: '', rows: [] },
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
        this.setState({ currentUser: me });
        await this.loadAssets();
        await this.loadSimCards();
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
        assignForm: asset ? this.assignFormFromAsset(asset) : { assignedName: '', location: '', company: '', deviceBlocked: false, agreementSigned: false },
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

    updateAssignField(field, value) { this.setState((s) => ({ assignForm: { ...s.assignForm, [field]: value } })); }

    async submitAssignment(assetTag) {
      const f = this.state.assignForm;
      const name = f.assignedName.trim();
      const spaceIdx = name.indexOf(' ');
      const firstName = spaceIdx === -1 ? name : name.slice(0, spaceIdx);
      const lastName = spaceIdx === -1 ? '' : name.slice(spaceIdx + 1);
      try {
        const updated = await Api.patch(`/api/assets/${encodeURIComponent(assetTag)}`, {
          firstName, lastName, location: f.location, company: f.company,
          deviceBlocked: !!f.deviceBlocked, agreementSigned: !!f.agreementSigned,
        });
        this.applyAssetUpdate(updated);
        this.setState({ assignForm: this.assignFormFromAsset(updated) });
        this.showToast(`${assetTag} updated`);
      } catch (e) {
        this.showToast(e.data && e.data.error === 'asset_retired' ? 'Retired assets cannot be edited' : 'Failed to update asset');
      }
    }

    async unassignAsset(assetTag) {
      try {
        const updated = await Api.patch(`/api/assets/${encodeURIComponent(assetTag)}`, { firstName: '', lastName: '' });
        this.applyAssetUpdate(updated);
        this.setState({ assignForm: this.assignFormFromAsset(updated) });
        this.showToast(`${assetTag} unassigned`);
      } catch (e) {
        this.showToast('Failed to unassign');
      }
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

    setReportType(type) {
      const fieldOptions = type === 'groupBy' ? REPORT_GROUP_FIELDS : REPORT_EMPTY_FIELDS;
      this.setState({ reportBuilder: { type, field: fieldOptions[0].value } });
    }
    setReportField(field) { this.setState((s) => ({ reportBuilder: { ...s.reportBuilder, field } })); }

    exportCustomReport() {
      const vm = this.computeViewModel();
      const fieldLabel = vm.reportFieldOptions.find((f) => f.value === vm.reportBuilder.field).label;
      let csv;
      if (vm.reportBuilder.type === 'groupBy') {
        csv = ['field,count', ...vm.reportGroups.map((g) => `"${g.label.replace(/"/g, '""')}",${g.count}`)].join('\n');
      } else {
        csv = buildCsv(vm.reportRows);
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `report-${vm.reportBuilder.type}-${fieldLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.showToast('Report CSV export started');
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

    async changeUserRole(id, role) {
      try {
        const updated = await Api.patch(`/api/users/${id}`, { role });
        this.setState((s) => ({ users: s.users.map((u) => (u.id === updated.id ? updated : u)) }));
        this.showToast(`Role updated for ${updated.email}`);
      } catch (e) {
        this.showToast('Failed to update role');
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
        this.showToast('Failed to update user');
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
        this.showToast(e.data && e.data.error === 'cannot_delete_self' ? 'You cannot delete your own account' : 'Failed to delete user');
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
      try {
        await Api.post('/api/auth/mfa/reset-self');
        this.setState({
          currentUser: null, assets: [], ready: false, screen: 'overview',
          authScreen: 'login', authForm: { email: '', password: '' },
          authError: 'MFA reset — sign in again to set up a new authenticator.',
          mfaForm: { token: '' }, mfaError: '',
        });
      } catch (e) {
        this.showToast('Failed to reset MFA');
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

    openImport() { this.setState({ csvImport: { open: true, step: 'pick', fileName: '', rows: [] } }); }
    closeImport() { this.setState({ csvImport: { open: false, step: 'pick', fileName: '', rows: [] } }); }

    validateImportRow(row, existingTags, seenTags) {
      const errors = [];
      const tag = (row.assetTag || '').trim();
      if (!tag) errors.push('Asset tag is required');
      else if (existingTags.has(tag)) errors.push('Asset tag already exists');
      else if (seenTags.has(tag)) errors.push('Duplicate asset tag in file');
      if (!(row.itemType || '').trim()) errors.push('Item type is required');
      if (!(row.model || '').trim()) errors.push('Model is required');
      return errors;
    }

    handleCsvFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseCsv(String(reader.result || ''));
        const existingTags = new Set(this.state.assets.map((a) => a.id));
        const seenTags = new Set();
        const rows = parsed.map((row) => {
          const errors = this.validateImportRow(row, existingTags, seenTags);
          const tag = (row.assetTag || '').trim();
          if (!errors.length) seenTags.add(tag);
          return { ...row, _errors: errors };
        });
        this.setState({ csvImport: { open: true, step: 'preview', fileName: file.name, rows } });
      };
      reader.readAsText(file);
    }

    async confirmImport() {
      const valid = this.state.csvImport.rows.filter((r) => !r._errors.length);
      if (!valid.length) { this.showToast('No valid rows to import'); return; }
      try {
        const res = await Api.post('/api/assets/import', { rows: valid });
        await this.loadAssets();
        this.closeImport();
        const skippedCount = res.skipped ? res.skipped.length : 0;
        this.showToast(`Imported ${res.inserted} assets${skippedCount ? `, ${skippedCount} skipped` : ''}`);
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
        id: asset.id, assetTag: asset.assetTag, itemType: asset.itemType, model: asset.model,
        assigneeName: asset.firstName ? `${asset.firstName} ${asset.lastName}` : '—',
        location: asset.location, company: asset.company, ipAddress: asset.ipAddress, status: asset.status,
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
          id: asset.id, assetTag: asset.assetTag, itemType: asset.itemType, model: asset.model,
          location: asset.location, dateRetiredStr: asset.dateRetired ? formatDate(asset.dateRetired) : '—',
        }));

      return {
        ready: true, toast: st.toast,
        currentUserEmail: st.currentUser ? st.currentUser.email : '',
        currentUserLabel: st.currentUser ? st.currentUser.email.slice(0, 2).toUpperCase() : '',
        isAdmin: !!(st.currentUser && st.currentUser.role === 'admin'),
        screen: st.screen,
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
        ...this.computeReportBuilderVm(all),
      };
    }

    computeReportBuilderVm(all) {
      const rb = this.state.reportBuilder;
      const fieldOptions = rb.type === 'groupBy' ? REPORT_GROUP_FIELDS : REPORT_EMPTY_FIELDS;
      const field = fieldOptions.some((f) => f.value === rb.field) ? rb.field : fieldOptions[0].value;
      let reportGroups = null, reportRows = null;
      if (rb.type === 'groupBy') {
        reportGroups = groupCounts(all, field).map((g) => ({ ...g, pct: Math.round((g.count / (all.length || 1)) * 100) }));
      } else {
        reportRows = all.filter((a) => isEmptyValue(a[field]));
      }
      return { reportBuilder: rb, reportFieldOptions: fieldOptions, reportGroups, reportRows };
    }

    buildDetail(id) {
      const asset = this.state.assets.find((a) => a.id === id);
      if (!asset) return null;
      const isAdmin = !!(this.state.currentUser && this.state.currentUser.role === 'admin');
      const sections = [
        { title: 'Identification', fields: [
          { label: 'Asset Tag', value: asset.assetTag }, { label: 'Item Type', value: asset.itemType }, { label: 'Model', value: asset.model },
          { label: 'Serial Number', value: asset.serialNumber }, { label: 'Express Tag', value: asset.expressTag || '—' },
        ] },
        { title: 'Network', fields: [
          { label: 'MAC Address', value: asset.macAddress || '—' },
          { label: 'IP Address', value: asset.ipAddress || '—', link: asset.ipAddress ? `http://${encodeURIComponent(asset.ipAddress)}` : null },
          { label: 'IMEI', value: asset.imei || '—' },
          { label: 'Telephone', value: asset.telephoneNumber || '—' }, { label: 'WSUS Group', value: asset.wsusGroup || '—' },
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
        sections, history: [...asset.history].reverse().map((h) => ({ date: formatDate(h.date), text: h.text })),
        actions, isRetired: asset.status === 'Retired',
        isMobile, currentSim, availableSims,
        assignForm: this.state.assignForm, assigneeNames,
      };
    }

    assignFormFromAsset(asset) {
      return {
        assignedName: asset.firstName ? `${asset.firstName} ${asset.lastName}` : '',
        location: asset.location, company: asset.company || '',
        deviceBlocked: asset.deviceBlocked, agreementSigned: asset.agreementSigned,
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

    _bindEvents() {
      const fileInput = document.getElementById('csvFileInput');
      if (fileInput) fileInput.onchange = (e) => this.handleCsvFile(e.target.files[0]);

      root.onclick = (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        const act = el.getAttribute('data-act');
        const id = el.getAttribute('data-id');
        switch (act) {
          case 'goOverview': this.setScreen('overview'); break;
          case 'goAssets': this.setScreen('assets'); break;
          case 'goReports': this.setScreen('reports'); break;
          case 'goDeprecated': this.setScreen('deprecated'); break;
          case 'exportDeprecatedCsv': this.exportDeprecatedCsv(); break;
          case 'exportCustomReport': this.exportCustomReport(); break;
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
          case 'submitAssignment': this.submitAssignment(id); break;
          case 'unassignAsset': this.unassignAsset(id); break;
          case 'goSimCards': this.goSimCards(); break;
          case 'submitCreateSim': this.submitCreateSim(); break;
          case 'unassignSim': this.unassignSim(id); break;
          case 'retireSim': this.retireSim(id); break;
          case 'reactivateSim': this.reactivateSim(id); break;
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
        else if (bind.startsWith('assignForm.')) s.assignForm[bind.slice(11)] = el.value;
      };

      root.onchange = (e) => {
        const el = e.target;
        const bind = el.getAttribute && el.getAttribute('data-bind');
        if (!bind) return;
        if (bind === 'typeFilter') this.setTypeFilter(el.value);
        else if (bind === 'locationFilter') this.setLocationFilter(el.value);
        else if (bind === 'reportType') this.setReportType(el.value);
        else if (bind === 'reportField') this.setReportField(el.value);
        else if (bind.startsWith('form.')) this.updateFormField(bind.slice(5), el.value);
        else if (bind.startsWith('userForm.')) this.updateUserField(bind.slice(9), el.value);
        else if (bind.startsWith('userRole.')) this.changeUserRole(bind.slice(9), el.value);
        else if (bind.startsWith('simForm.')) this.updateSimField(bind.slice(8), el.value);
        else if (bind.startsWith('assignSimRow.')) { if (el.value) this.assignSim(bind.slice(13), el.value); }
        else if (bind.startsWith('assignSim.')) { if (el.value) this.assignSim(el.value, bind.slice(10)); }
        else if (bind === 'assignForm.deviceBlocked' || bind === 'assignForm.agreementSigned') {
          this.updateAssignField(bind.slice(11), el.value === 'yes');
        }
        else if (bind.startsWith('assignForm.')) this.updateAssignField(bind.slice(11), el.value);
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
      <div class="nav-item ${vm.screen === screen ? 'active' : ''}" data-act="${act}">
        <div class="nav-dot"></div>${label}
      </div>`;
    return `
      <div class="sidebar">
        ${item('overview', 'Overview', 'goOverview')}
        ${item('assets', 'Assets', 'goAssets')}
        ${item('reports', 'Reports', 'goReports')}
        ${item('deprecated', 'Deprecated', 'goDeprecated')}
        ${item('simcards', 'SIM Cards', 'goSimCards')}
        ${vm.isAdmin ? item('users', 'Users', 'goUsers') : ''}
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
          ${vm.selectedCount > 0 ? renderBulkToolbar(vm) : `
            <div class="table-toolbar">
              <div class="table-count">Showing <span class="num">${vm.rangeStart}–${vm.rangeEnd}</span> of <span class="num">${vm.resultCount}</span></div>
              <div class="spacer"></div>
              ${vm.isAdmin ? `<button class="btn-ghost" data-act="openImport">Import CSV</button>` : ''}
              <button class="btn-ghost" data-act="exportCsv">Export CSV</button>
            </div>
          `}
          <div class="table-header">
            <div class="cell-check"><input type="checkbox" data-act="toggleSelectAll" ${vm.allPageSelected ? 'checked' : ''}></div>
            <div class="sortable" data-act="sortTag">TAG ${arrow('assetTag')}</div>
            <div>TYPE</div>
            <div>MODEL</div>
            <div>ASSIGNED TO</div>
            <div>LOCATION</div>
            <div>COMPANY</div>
            <div>IP ADDRESS</div>
            <div class="sortable" data-act="sortStatus">STATUS ${arrow('status')}</div>
            <div class="sortable" data-act="sortDeployed">DEPLOYED ${arrow('dateDeployed')}</div>
          </div>
          <div class="table-body">
            ${vm.rows.map((row) => `
              <div class="table-row" data-act="openDetail" data-id="${escapeHtml(row.id)}">
                <div class="cell-check"><input type="checkbox" data-act="toggleSelectRow" data-id="${escapeHtml(row.id)}" ${row.selected ? 'checked' : ''}></div>
                <div class="cell-mono">${escapeHtml(row.assetTag)}</div>
                <div class="cell-dim">${escapeHtml(row.itemType)}</div>
                <div class="cell-ellipsis" style="color:#E8EDF3;">${escapeHtml(row.model)}</div>
                <div class="cell-dim cell-ellipsis">${escapeHtml(row.assigneeName)}</div>
                <div class="cell-dim cell-ellipsis">${escapeHtml(row.location)}</div>
                <div class="cell-dim cell-ellipsis">${escapeHtml(row.company || '—')}</div>
                <div class="cell-mono cell-ellipsis">${row.ipAddress ? `<a class="ip-link" href="http://${encodeURIComponent(row.ipAddress)}" target="_blank" rel="noopener noreferrer" data-act="noop">${escapeHtml(row.ipAddress)}</a>` : '<span class="cell-dim">—</span>'}</div>
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
        ${vm.isAdmin ? renderCustomReportBuilder(vm) : ''}
      </div>
    `;
  }

  function renderCustomReportBuilder(vm) {
    const rb = vm.reportBuilder;
    const fieldLabel = vm.reportFieldOptions.find((f) => f.value === rb.field).label;
    const cols = '118px 96px 1fr 140px';
    return `
      <div class="panel" style="margin-top:16px;">
        <div class="panel-title">Custom Reports</div>
        <div class="form-row" style="margin-bottom:16px;">
          <div class="form-group">
            <div class="form-label">Report Type</div>
            <select class="form-select" data-bind="reportType">
              <option value="groupBy" ${rb.type === 'groupBy' ? 'selected' : ''}>Group &amp; count assets by field</option>
              <option value="emptyField" ${rb.type === 'emptyField' ? 'selected' : ''}>Find assets with an empty field</option>
            </select>
          </div>
          <div class="form-group">
            <div class="form-label">Field</div>
            <select class="form-select" data-bind="reportField">
              ${vm.reportFieldOptions.map((f) => `<option value="${f.value}" ${f.value === rb.field ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="justify-content:flex-end;display:flex;">
            <button class="btn-ghost" style="width:100%;" data-act="exportCustomReport">Export CSV</button>
          </div>
        </div>
        ${rb.type === 'groupBy' ? `
          ${vm.reportGroups.length ? vm.reportGroups.map((g) => `
            <div class="bar-row">
              <div class="bar-label wide">${escapeHtml(g.label)}</div>
              <div class="bar-track"><div class="bar-fill" style="background:#4FA3F7;width:${g.pct}%;"></div></div>
              <div class="bar-count">${g.count}</div>
            </div>
          `).join('') : `<div class="cell-dim">No data.</div>`}
        ` : `
          <div class="cell-dim" style="margin-bottom:10px;">
            ${vm.reportRows.length} asset${vm.reportRows.length === 1 ? '' : 's'} with an empty ${escapeHtml(fieldLabel)} field${vm.reportRows.length > 50 ? ' — showing first 50, export CSV for the full list' : ''}.
          </div>
          ${vm.reportRows.length ? `
            <div class="table-header" style="grid-template-columns:${cols};">
              <div>TAG</div><div>TYPE</div><div>MODEL</div><div>LOCATION</div>
            </div>
            <div class="table-body" style="max-height:320px;">
              ${vm.reportRows.slice(0, 50).map((a) => `
                <div class="table-row" style="grid-template-columns:${cols};" data-act="openDetail" data-id="${escapeHtml(a.id)}">
                  <div class="cell-mono">${escapeHtml(a.assetTag)}</div>
                  <div class="cell-dim">${escapeHtml(a.itemType)}</div>
                  <div class="cell-ellipsis" style="color:#E8EDF3;">${escapeHtml(a.model)}</div>
                  <div class="cell-dim cell-ellipsis">${escapeHtml(a.location)}</div>
                </div>
              `).join('')}
            </div>
          ` : `<div class="cell-dim">No assets have this field empty.</div>`}
        `}
      </div>
    `;
  }

  function renderDeprecated(vm) {
    const cols = '118px 96px 1fr 140px 128px';
    return `
      <div class="screen-scroll">
        <div class="page-header-row">
          <div class="page-title" style="margin-bottom:0;">Deprecated Assets</div>
          <div class="spacer"></div>
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
          <div class="table-header" style="grid-template-columns:${cols};margin-top:8px;">
            <div>TAG</div><div>TYPE</div><div>MODEL</div><div>LOCATION</div><div>RETIRED</div>
          </div>
          <div class="table-body">
            ${vm.deprecatedRows.map((row) => `
              <div class="table-row" style="grid-template-columns:${cols};" data-act="openDetail" data-id="${escapeHtml(row.id)}">
                <div class="cell-mono">${escapeHtml(row.assetTag)}</div>
                <div class="cell-dim">${escapeHtml(row.itemType)}</div>
                <div class="cell-ellipsis" style="color:#E8EDF3;">${escapeHtml(row.model)}</div>
                <div class="cell-dim cell-ellipsis">${escapeHtml(row.location)}</div>
                <div class="cell-deployed">${escapeHtml(row.dateRetiredStr)}</div>
              </div>
            `).join('')}
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

  function renderAssignmentEditBlock(sel) {
    const f = sel.assignForm;
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
          <input class="form-input" type="text" list="assignee-names-list" data-bind="assignForm.assignedName" value="${escapeHtml(f.assignedName)}" placeholder="Type a name…">
          <datalist id="assignee-names-list">
            ${sel.assigneeNames.map((n) => `<option value="${escapeHtml(n)}"></option>`).join('')}
          </datalist>
        </div>
        <div class="form-row">
          <div class="form-group">
            <div class="form-label">Location</div>
            <select class="form-select" data-bind="assignForm.location">
              ${LOCATIONS.map((l) => `<option value="${escapeHtml(l)}" ${l === f.location ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <div class="form-label">Company</div>
            <select class="form-select" data-bind="assignForm.company">
              <option value="" ${!f.company ? 'selected' : ''}>—</option>
              ${COMPANIES.map((c) => `<option value="${escapeHtml(c)}" ${c === f.company ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <div class="form-label">Device Blocked</div>
            <select class="form-select" data-bind="assignForm.deviceBlocked">
              <option value="no" ${!f.deviceBlocked ? 'selected' : ''}>No</option>
              <option value="yes" ${f.deviceBlocked ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div class="form-group">
            <div class="form-label">Agreement Signed</div>
            <select class="form-select" data-bind="assignForm.agreementSigned">
              <option value="no" ${!f.agreementSigned ? 'selected' : ''}>No</option>
              <option value="yes" ${f.agreementSigned ? 'selected' : ''}>Yes</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-submit" data-act="submitAssignment" data-id="${escapeHtml(sel.assetTag)}">Save Changes</button>
          ${f.assignedName ? `<button class="btn-ghost" data-act="unassignAsset" data-id="${escapeHtml(sel.assetTag)}">Unassign</button>` : ''}
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
                <div class="drawer-field-value">${f.link ? `<a class="ip-link" href="${escapeHtml(f.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(f.value)}</a>` : escapeHtml(f.value)}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        ${renderAssignmentEditBlock(sel)}
        ${sel.isMobile ? renderSimAssignBlock(sel) : ''}
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
    const simCols = '140px 110px 140px 1fr 110px 1.6fr';
    return `
      <div class="screen-scroll">
        <div class="page-title">SIM Cards</div>
        <div class="panel">
          <div class="panel-title">SIM Inventory</div>
          <div class="users-row users-header" style="grid-template-columns:${simCols};">
            <div>NUMBER</div><div>CARRIER</div><div>PLAN</div><div>ASSIGNED TO</div><div>STATUS</div><div></div>
          </div>
          ${vm.simCards.map((sc) => {
            const assignedAsset = sc.assignedAssetTag ? vm.assignableMobiles.find((a) => a.assetTag === sc.assignedAssetTag) : null;
            const assignedLabel = sc.assignedAssetTag ? `${sc.assignedAssetTag}${assignedAsset && assignedAsset.firstName ? ' — ' + assignedAsset.firstName + ' ' + assignedAsset.lastName : ''}` : '—';
            return `
            <div class="users-row" style="grid-template-columns:${simCols};">
              <div class="cell-mono" style="color:#E8EDF3;">${escapeHtml(sc.phoneNumber)}</div>
              <div class="cell-dim">${escapeHtml(sc.carrier || '—')}</div>
              <div class="cell-dim cell-ellipsis">${escapeHtml(sc.plan || '—')}</div>
              <div class="cell-dim cell-ellipsis">${escapeHtml(assignedLabel)}</div>
              <div><span class="status-pill" style="background:${tint(SIM_STATUS_COLORS[sc.status])};color:${SIM_STATUS_COLORS[sc.status]};">${escapeHtml(sc.status)}</span></div>
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
              </div>
            </div>
          `; }).join('')}
          ${vm.simCards.length === 0 ? `<div class="users-row"><div class="cell-dim">No SIM cards yet.</div></div>` : ''}
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
    return `
      <div class="screen-scroll">
        <div class="page-title">User Management</div>
        <div class="panel">
          <div class="panel-title">Users</div>
          <div class="users-row users-header">
            <div>EMAIL</div><div>ROLE</div><div>MFA</div><div>STATUS</div><div></div>
          </div>
          ${vm.users.map((u) => `
            <div class="users-row">
              <div class="cell-ellipsis" style="color:#E8EDF3;">${escapeHtml(u.email)}</div>
              <div>
                <select class="form-select" data-bind="userRole.${u.id}" style="padding:5px 8px;font-size:12px;">
                  <option value="standard" ${u.role === 'standard' ? 'selected' : ''}>Standard</option>
                  <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
              </div>
              <div class="cell-dim">${u.mfaEnabled ? 'Enrolled' : 'Not enrolled'}</div>
              <div>
                <span class="status-pill" style="background:${u.active ? 'rgba(52,226,160,0.14)' : 'rgba(242,99,91,0.14)'};color:${u.active ? '#34E2A0' : '#F2635B'};">${u.active ? 'Active' : 'Disabled'}</span>
              </div>
              <div class="users-row-actions">
                <button class="btn-ghost users-row-btn" data-act="toggleUserActive" data-id="${u.id}">${u.active ? 'Disable' : 'Enable'}</button>
                <button class="btn-ghost users-row-btn" data-act="resetUserMfa" data-id="${u.id}">Reset MFA</button>
                ${u.id !== vm.currentUserId ? `<button class="btn-ghost users-row-btn" style="border-color:#F2635B;color:#F2635B;" data-act="deleteUser" data-id="${u.id}">Delete</button>` : ''}
              </div>
            </div>
          `).join('')}
          ${vm.users.length === 0 ? `<div class="users-row"><div class="cell-dim">No users yet.</div></div>` : ''}
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
    const validCount = csvImport.rows.filter((r) => !r._errors.length).length;
    const errorCount = csvImport.rows.length - validCount;
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
            <div class="auth-hint">Expects the same columns as the Export CSV format (assetTag, itemType, model, serialNumber, ipAddress, status, location, firstName, lastName, supplier, poNumber, dateAcquired, dateDeployed, returnDate, dateRetired, deviceBlocked, agreementSigned).</div>
            <div class="modal-actions">
              <button class="btn-secondary" data-act="closeImport">Cancel</button>
            </div>
          ` : `
            <div class="auth-hint">${escapeHtml(csvImport.fileName)} — <strong>${validCount}</strong> valid, <strong>${errorCount}</strong> ${errorCount === 1 ? 'error' : 'errors'} (errors will be skipped).</div>
            <div class="import-preview-table">
              ${csvImport.rows.map((row) => `
                <div class="import-preview-row ${row._errors.length ? 'import-row-error' : ''}">
                  <div class="cell-mono">${escapeHtml(row.assetTag || '—')}</div>
                  <div class="cell-dim">${escapeHtml(row.itemType || '—')}</div>
                  <div class="cell-ellipsis">${escapeHtml(row.model || '—')}</div>
                  <div class="import-row-msg">${row._errors.length ? escapeHtml(row._errors.join('; ')) : 'OK'}</div>
                </div>
              `).join('')}
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" data-act="closeImport">Cancel</button>
              <button class="btn-submit" data-act="confirmImport" ${validCount ? '' : 'disabled'}>Import ${validCount} Assets</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // Boot.
  const app = new App();
  document.addEventListener('DOMContentLoaded', () => app.init());
})();
