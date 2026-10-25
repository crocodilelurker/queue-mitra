import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, session } from '../api/client.js'
import { reconnectSocket } from '../api/socket.js'

const AuthContext = createContext(null)

/**
 * Staff, doctor and admin sessions. Patients never log in.
 * The user always comes from the server (GET /api/auth/me): there is no offline or default account.
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  // ready=false until the stored session has been checked, so guarded pages don't flash the login form.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!session.get()) {
      setReady(true)
      return
    }
    api
      .me()
      .then((res) => setCurrentUser(res.user ?? res))
      .catch(() => session.clear())
      .finally(() => setReady(true))
  }, [])

  const startSession = useCallback((res) => {
    session.set(res.token)
    reconnectSocket()
    setCurrentUser(res.user)
    return res.user
  }, [])

  const login = useCallback(async (email, password) => startSession(await api.login(email, password)), [startSession])

  // Prototype counter login with the hospital's staff PIN (a real hospital would use named staff accounts).
  const loginWithPin = useCallback(async (pin) => startSession(await api.staffPin(pin)), [startSession])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* already signed out on the server */
    }
    session.clear()
    reconnectSocket()
    setCurrentUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, ready, login, loginWithPin, logout, startSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export const isAdminRole = (role) => role === 'admin' || role === 'superadmin'
