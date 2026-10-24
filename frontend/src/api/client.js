import { API_URL, HOSPITAL_CODE } from '../config.js'

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
const enc = encodeURIComponent
const H = HOSPITAL_CODE

export const api = {
  // hospital
  hospital: (code = H) => get(`/hospitals/${code}`),
  departments: () => get(`/hospitals/${H}/departments`),
  departmentQueue: (code, hospitalCode = H) => get(`/hospitals/${hospitalCode}/departments/${enc(code)}/queue`),
  // triage
  suggest: (payload) => post('/triage/suggest', payload),
  warningSigns: (language) => get(`/triage/warning-signs?language=${language}`),
  // tickets
  createTicket: (payload) => post('/tickets', { hospitalCode: H, ...payload }),
  counterRegister: (payload) => post('/tickets/counter', { hospitalCode: H, ...payload }),
  ticket: (publicId) => get(`/tickets/${enc(publicId)}`),
  slip: (publicId) => get(`/tickets/${enc(publicId)}/slip`),
  lookup: (token) => get(`/tickets/lookup/${enc(token)}?hospitalCode=${H}`),
  preferences: (publicId, payload) => patch(`/tickets/${enc(publicId)}/preferences`, payload),
  urgent: (publicId) => post(`/tickets/${enc(publicId)}/urgent`),
  notifications: (publicId) => get(`/notifications/${enc(publicId)}`),
  // navigation
  map: () => get('/navigation/map'),
  checkpoints: () => get('/navigation/checkpoints'),
  route: (payload) => post('/navigation/route', payload),
  fromCheckpoint: (payload) => post('/navigation/from-checkpoint', payload),
  lost: (payload) => post('/navigation/lost', payload),
  // board and analytics
  board: () => get(`/board/${H}`),
  analytics: () => get(`/analytics/${H}`),
  // auth
  staffPin: (pin) => post('/auth/staff-pin', { hospitalCode: H, pin }),
  login: (email, password) => post('/auth/login', { email, password }),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  // doctor / staff
  dashboard: () => get('/doctor/dashboard'),
  callNext: () => post('/doctor/call-next'),
  complete: (id) => post(`/doctor/tickets/${id}/complete`),
  noShow: (id) => post(`/doctor/tickets/${id}/no-show`),
  requeue: (id) => post(`/doctor/tickets/${id}/requeue`),
  transfer: (id, departmentCode) => post(`/doctor/tickets/${id}/transfer`, { departmentCode }),
  setStatus: (body) => patch('/doctor/status', body),
  urgentList: () => get('/doctor/urgent'),
  urgentSeen: (id) => post(`/doctor/urgent/${id}/seen`),
  // demo controls
  seedPatients: () => post('/demo/seed-patients', { hospitalCode: H }),
  startSimulation: () => post('/demo/auto-simulate/start', { hospitalCode: H, intervalMs: 3000 }),
  stopSimulation: () => post('/demo/auto-simulate/stop'),
  simulationStatus: () => get('/demo/auto-simulate/status'),
  resetDemo: () => post('/demo/reset', { hospitalCode: H }),
  // mediflow opd management
  adminOverview: () => get('/admin/overview'),
  adminDoctors: () => get('/admin/doctors'),
  updateDoctorStatus: (id, status) => patch(`/admin/doctors/${enc(id)}/status`, { status }),
  patients: (search = '') => get(`/patients${search ? `?search=${enc(search)}` : ''}`),
  patientProfile: (patientId) => get(`/patients/${enc(patientId)}`),
  registerPatient: (payload) => post('/patients', payload),
  updatePatient: (patientId, payload) => patch(`/patients/${enc(patientId)}`, payload),
  appointments: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
    return get(`/appointments${q ? `?${q}` : ''}`)
  },
  bookAppointment: (payload) => post('/appointments', payload),
  updateAppointment: (id, payload) => patch(`/appointments/${enc(id)}`, payload),
  completeConsultation: (id, payload) => post(`/appointments/${enc(id)}/complete`, payload),
  billing: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
    return get(`/billing${q ? `?${q}` : ''}`)
  },
  billingSummary: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
    return get(`/billing/summary${q ? `?${q}` : ''}`)
  },
  collectPayment: (billId, payload) => post(`/billing/${enc(billId)}/pay`, payload),
}

