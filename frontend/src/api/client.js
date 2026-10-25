import { API_URL, getHospitalCode } from '../config.js'

const TOKEN_KEY = 'qm-token'

// Staff / doctor session token. Kept for the browser session only; patients never log in.
export const session = {
  get() {
    try {
      return sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable */
    }
  },
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = session.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || 'error')
  return data
}

const get = (path) => request('GET', path)
const post = (path, body = {}) => request('POST', path, body)
const patch = (path, body = {}) => request('PATCH', path, body)
const del = (path) => request('DELETE', path)
const enc = encodeURIComponent
// Read on every call: the hospital code is only known after GET /api/setup/status.
const H = () => getHospitalCode()

export const api = {
  // hospital
  hospital: (code = H()) => get(`/hospitals/${code}`),
  departments: () => get(`/hospitals/${H()}/departments`),
  departmentQueue: (code, hospitalCode = H()) => get(`/hospitals/${hospitalCode}/departments/${enc(code)}/queue`),
  // triage
  suggest: (payload) => post('/triage/suggest', payload),
  warningSigns: (language) => get(`/triage/warning-signs?language=${language}`),
  // tickets
  createTicket: (payload) => post('/tickets', { hospitalCode: H(), ...payload }),
  counterRegister: (payload) => post('/tickets/counter', { hospitalCode: H(), ...payload }),
  ticket: (publicId) => get(`/tickets/${enc(publicId)}`),
  slip: (publicId) => get(`/tickets/${enc(publicId)}/slip`),
  lookup: (token) => get(`/tickets/lookup/${enc(token)}?hospitalCode=${H()}`),
  preferences: (publicId, payload) => patch(`/tickets/${enc(publicId)}/preferences`, payload),
  urgent: (publicId) => post(`/tickets/${enc(publicId)}/urgent`),
  // "I need urgent help" before registration (no ticket yet): { location?, note?, language? }
  urgentHelp: (payload = {}) => post('/urgent', { hospitalCode: H(), ...payload }),
  // Registrations made while offline, sent when the connection is back: [{ clientTempId, ...ticket }]
  syncTickets: (tickets) => post('/tickets/sync', { tickets: tickets.map((t) => ({ hospitalCode: H(), ...t })) }),
  notifications: (publicId) => get(`/notifications/${enc(publicId)}`),
  // navigation
  map: () => get('/navigation/map'),
  checkpoints: () => get('/navigation/checkpoints'),
  route: (payload) => post('/navigation/route', payload),
  fromCheckpoint: (payload) => post('/navigation/from-checkpoint', payload),
  lost: (payload) => post('/navigation/lost', payload),
  // board and analytics
  board: () => get(`/board/${H()}`),
  analytics: () => get(`/analytics/${H()}`),
  // auth
  staffPin: (pin) => post('/auth/staff-pin', { hospitalCode: H(), pin }),
  login: (email, password) => post('/auth/login', { email, password }),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  // doctor / staff
  dashboard: () => get('/doctor/dashboard'),
  callNext: () => post('/doctor/call-next'),
  complete: (id, payload = {}) => post(`/doctor/tickets/${id}/complete`, payload),
  noShow: (id) => post(`/doctor/tickets/${id}/no-show`),
  requeue: (id) => post(`/doctor/tickets/${id}/requeue`),
  transfer: (id, departmentCode) => post(`/doctor/tickets/${id}/transfer`, { departmentCode }),
  setStatus: (body) => patch('/doctor/status', body),
  urgentList: () => get('/doctor/urgent'),
  urgentSeen: (id) => post(`/doctor/urgent/${id}/seen`),
  // demo controls (operate on live data only: no sample patients are ever generated)
  startSimulation: (intervalMs = 3000) => post('/demo/auto-simulate/start', { hospitalCode: H(), intervalMs }),
  stopSimulation: () => post('/demo/auto-simulate/stop'),
  simulationStatus: () => get('/demo/auto-simulate/status'),
  resetQueue: () => post('/admin/reset-queue'),

  // first-run setup
  setupStatus: () => get('/setup/status'),
  setupCatalog: () => get('/setup/catalog'),
  setup: (payload) => post('/setup', payload),

  // staff console
  staffOverview: () => get('/staff/overview'),
  callNextFor: (departmentCode, room) => post('/doctor/call-next', { departmentCode, room }),
  setDoctorStatus: (doctorId, body) => patch('/doctor/status', { ...body, doctorId }),

  // admin: hospital, departments, people
  adminOverview: () => get('/admin/overview'),
  updateHospital: (payload) => patch('/admin/hospital', payload),
  adminDepartments: () => get('/admin/departments'),
  createDepartment: (payload) => post('/admin/departments', payload),
  updateDepartment: (id, payload) => patch(`/admin/departments/${enc(id)}`, payload),
  deleteDepartment: (id) => del(`/admin/departments/${enc(id)}`),
  adminDoctors: () => get('/admin/doctors'),
  createDoctor: (payload) => post('/admin/doctors', payload),
  updateDoctor: (id, payload) => patch(`/admin/doctors/${enc(id)}`, payload),
  deleteDoctor: (id) => del(`/admin/doctors/${enc(id)}`),
  adminStaff: () => get('/admin/staff'),
  createStaff: (payload) => post('/admin/staff', payload),
  updateStaff: (id, payload) => patch(`/admin/staff/${enc(id)}`, payload),
  deleteStaff: (id) => del(`/admin/staff/${enc(id)}`),
  factoryReset: (confirmCode) => post('/admin/factory-reset', { confirm: confirmCode }),

  // registered patients (today's registrations, searchable)
  patients: (search = '') => get(`/patients${search ? `?search=${enc(search)}` : ''}`),

}

