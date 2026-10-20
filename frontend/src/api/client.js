// One place for every backend call. The backend replies { success, data, message },
// so this wrapper returns only `data` and throws Error(message) on failure.
const TOKEN_KEY = 'lm_token'
const USER_KEY = 'lm_user'

export const storage = {
  get token() { return localStorage.getItem(TOKEN_KEY) },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  },
  set(user, token) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
  },
}

async function request(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(storage.token ? { Authorization: `Bearer ${storage.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))

  if (res.status === 401 && path !== '/auth/login') {
    storage.clear()
    window.location.href = '/login'
  }
  if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`)
  return json.data
}

const qs = (o) =>
  '?' + new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''))).toString()

export const api = {
  login: (email, password) => request('/auth/login', 'POST', { email, password }),
  me: () => request('/auth/me'),
  list: (entity) => request(`/${entity}`),
  create: (entity, body) => request(`/${entity}`, 'POST', body),
  update: (entity, id, body) => request(`/${entity}/${id}`, 'PUT', body),
  remove: (entity, id) => request(`/${entity}/${id}`, 'DELETE'),
  view: (name) => request(`/views/${name}`),
  approveBooking: (id) => request(`/bookings/${id}/approve`, 'POST'),
  rejectBooking: (id) => request(`/bookings/${id}`, 'PUT', { status: 'Rejected' }),
  getAttendance: (sessionId) => request(`/sessions/${sessionId}/attendance`),
  saveAttendance: (sessionId, rows) => request(`/sessions/${sessionId}/attendance`, 'PUT', { rows }),
  // Query Lab (lab assignment parts D and E)
  ql: {
    tables: () => request('/querylab/tables'),
    stats: () => request('/querylab/stats'),
    display: (table, page = 1, limit = 50) => request(`/querylab/table/${table}${qs({ page, limit })}`),
    insert: (table, values) => request(`/querylab/insert/${table}`, 'POST', { values }),
    aggregate: (p) => request('/querylab/aggregate' + qs(p)),
    filter: (p) => request('/querylab/filter' + qs(p)),
    presets: () => request('/querylab/presets'),
    runPreset: (id, param) => request(`/querylab/presets/${id}/run` + qs({ param })),
    update: (body) => request('/querylab/update', 'PUT', body),
    joinPairs: () => request('/querylab/join-pairs'),
    join: (p) => request('/querylab/join' + qs(p)),
  },
}
