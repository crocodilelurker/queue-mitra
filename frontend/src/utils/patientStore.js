import { api } from '../api/client.js'

// Small bits of patient state kept on this phone only (never sent anywhere else).
const LAST_KEY = 'qm-last-ticket'
const QUEUE_KEY = 'qm-offline-queue'
const DONE_KEY = 'qm-offline-done'
export const SYNC_EVENT = 'qm-offline-synced'

const today = () => new Date().toISOString().slice(0, 10)

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

/** The ticket this phone registered or looked up today, so "I need urgent help" can name it. */
export function rememberTicket(ticket) {
  if (ticket?.publicId) writeJson(LAST_KEY, { publicId: ticket.publicId, tokenNumber: ticket.tokenNumber, day: today() })
}
export function lastTicket() {
  const saved = readJson(LAST_KEY, null)
  return saved?.day === today() ? saved : null
}

// ---- Registrations made while offline ----

export function queueOfflineRegistration(payload) {
  const clientTempId = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const queue = readJson(QUEUE_KEY, [])
  queue.push({ clientTempId, payload, createdAt: new Date().toISOString() })
  writeJson(QUEUE_KEY, queue)
  return clientTempId
}

export const offlineRegistration = (clientTempId) => readJson(QUEUE_KEY, []).find((x) => x.clientTempId === clientTempId) || null
export const syncedTicketFor = (clientTempId) => readJson(DONE_KEY, {})[clientTempId] || null

let syncing = null

/** Sends every waiting offline registration to POST /api/tickets/sync. Safe to call often. */
export function syncOfflineRegistrations() {
  const queue = readJson(QUEUE_KEY, [])
  if (!queue.length || syncing || !navigator.onLine) return syncing || Promise.resolve()
  syncing = api
    .syncTickets(queue.map(({ clientTempId, payload }) => ({ clientTempId, ...payload })))
    .then(({ synced = [] }) => {
      const done = readJson(DONE_KEY, {})
      const left = []
      for (const item of queue) {
        const result = synced.find((r) => r.clientTempId === item.clientTempId)
        if (result?.status === 'synced' && result.ticket?.publicId) done[item.clientTempId] = result.ticket.publicId
        else left.push(item) // try again later
      }
      writeJson(DONE_KEY, done)
      writeJson(QUEUE_KEY, left)
      window.dispatchEvent(new Event(SYNC_EVENT))
    })
    .catch(() => {})
    .finally(() => {
      syncing = null
    })
  return syncing
}
