import { useCallback, useEffect, useState } from 'react'
import { api, session } from '../api/client.js'
import { reconnectSocket } from '../api/socket.js'

/** Staff / doctor login state. The token lives in sessionStorage and is sent as a Bearer header. */
export function useStaffSession() {
  const [state, setState] = useState({ user: null, loading: Boolean(session.get()) })

  useEffect(() => {
    if (!session.get()) return
    api
      .me()
      .then(({ user }) => setState({ user, loading: false }))
      .catch(() => {
        session.clear()
        setState({ user: null, loading: false })
      })
  }, [])

  const signIn = useCallback(async (request) => {
    const { user, token } = await request()
    session.set(token)
    reconnectSocket() // so the server puts this socket in the staff room
    setState({ user, loading: false })
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* already logged out */
    }
    session.clear()
    reconnectSocket()
    setState({ user: null, loading: false })
  }, [])

  return { ...state, signIn, signOut }
}
