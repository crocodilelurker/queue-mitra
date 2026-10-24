import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, session } from '../api/client.js'
import { reconnectSocket } from '../api/socket.js'

const AUTH_USER_KEY = 'mediflow-auth-user'

const DEFAULT_ADMIN = {
  _id: 'admin-asha',
  name: 'Asha Kulkarni',
  role: 'admin',
  email: 'admin@queuemitra.test',
  specialty: 'Admin',
  title: 'Clinic Administrator',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      /* ignore */
    }
    return DEFAULT_ADMIN // Default to Asha Kulkarni as shown in the reference image
  })

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Sync to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser))
      } else {
        localStorage.removeItem(AUTH_USER_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [currentUser])

  // Login with email & password
  const loginWithCredentials = useCallback(async (email, password) => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      const res = await api.login(email, password)
      session.set(res.token)
      reconnectSocket()
      setCurrentUser(res.user)
      setIsLoginModalOpen(false)
      return res.user
    } catch (err) {
      setAuthError(err.message || 'Login failed')
      throw err
    } finally {
      setAuthLoading(false)
    }
  }, [])

  // Quick One-Click Switch to Admin (Asha Kulkarni)
  const loginAsAdmin = useCallback(async () => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      try {
        const res = await api.login('admin@queuemitra.test', 'doctor123')
        session.set(res.token)
        reconnectSocket()
        setCurrentUser(res.user)
      } catch {
        // Fallback to local admin session if offline
        setCurrentUser(DEFAULT_ADMIN)
      }
      setIsLoginModalOpen(false)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  // Quick One-Click Switch to a Doctor
  const loginAsDoctor = useCallback(async (doctor) => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      try {
        const res = await api.login(doctor.email, 'doctor123')
        session.set(res.token)
        reconnectSocket()
        setCurrentUser(res.user)
      } catch {
        // Fallback to local doctor state
        setCurrentUser({
          _id: doctor._id || 'doc-local',
          name: doctor.name,
          role: 'doctor',
          email: doctor.email,
          specialty: doctor.specialty || 'General Medicine',
          room: doctor.room || 'Room 1',
        })
      }
      setIsLoginModalOpen(false)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  // Quick Staff PIN login
  const loginWithPin = useCallback(async (pin) => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      const res = await api.staffPin(pin)
      session.set(res.token)
      reconnectSocket()
      setCurrentUser(res.user)
      setIsLoginModalOpen(false)
      return res.user
    } catch (err) {
      setAuthError(err.message || 'Invalid Staff PIN')
      throw err
    } finally {
      setAuthLoading(false)
    }
  }, [])

  // Sign out
  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* ignore */
    }
    session.clear()
    reconnectSocket()
    setCurrentUser(null)
    setIsLoginModalOpen(true) // Prompt login dialog on logout
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        loginWithCredentials,
        loginAsAdmin,
        loginAsDoctor,
        loginWithPin,
        logout,
        authLoading,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
