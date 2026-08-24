const Api = {
  onUnauthorized: null,

  async _req(method, path, body) {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (res.status === 401 && Api.onUnauthorized) Api.onUnauthorized();
    if (!res.ok) {
      const err = new Error((data && data.error) || 'request_failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  get(path) { return Api._req('GET', path); },
  post(path, body) { return Api._req('POST', path, body === undefined ? {} : body); },
  patch(path, body) { return Api._req('PATCH', path, body === undefined ? {} : body); },
};