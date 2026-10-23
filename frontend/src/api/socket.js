import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { API_URL } from '../config.js'
import { session } from './client.js'

let socket = null

export function getSocket() {
  if (!socket) {
    // The auth callback runs on every (re)connect, so a staff login is picked up by reconnecting.
    socket = io(API_URL || undefined, { auth: (cb) => cb({ token: session.get() || undefined }), withCredentials: true })
  }
  return socket
}

/** Reconnect so the server re-reads the session (needed after staff login or logout). */
export function reconnectSocket() {
  if (!socket) return
  socket.disconnect()
  socket.connect()
}

/**
 * Subscribe to socket events while mounted.
 * join: [['ticket:join', publicId], ...] re-sent on every (re)connect.
 * on:   { 'ticket:position': (data) => ... }
 * Returns whether the socket is currently connected.
 */
export function useSocket({ join = [], on = {} }) {
  const handlers = useRef(on)
  handlers.current = on
  const joinKey = JSON.stringify(join)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = getSocket()
    const joins = JSON.parse(joinKey)
    const sendJoins = () => joins.forEach(([event, arg]) => s.emit(event, arg))
    const onConnect = () => {
      setConnected(true)
      sendJoins()
    }
    const onDisconnect = () => setConnected(false)
    const bound = Object.keys(handlers.current).map((event) => {
      const fn = (...args) => handlers.current[event]?.(...args)
      s.on(event, fn)
      return [event, fn]
    })
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    if (s.connected) onConnect()
    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      bound.forEach(([event, fn]) => s.off(event, fn))
    }
  }, [joinKey])

  return connected
}
