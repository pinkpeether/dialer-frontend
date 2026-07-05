import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/auth.store'
import { SOCKET_EVENTS, type SocketEventName } from '../constants/socketEvents'
import { getSocketUrl } from '../utils/socketUrl'

const SOCKET_DEBUG = import.meta.env.VITE_SOCKET_DEBUG === 'true'

let socketInstance: Socket | null = null
let socketListenersAttached = false
const socketSubscribers = new Set<{ event: string; handler: (...args: unknown[]) => void }>()

export const useSocket = () => {
  const { token } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    if (!socketInstance) {
      socketInstance = io(getSocketUrl(), {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
      socketSubscribers.forEach(({ event, handler }) => socketInstance?.on(event, handler))
    }

    socketRef.current = socketInstance

    if (!socketListenersAttached) {
      socketListenersAttached = true

      socketInstance.on('connect', () => {
        if (SOCKET_DEBUG) console.info('Socket connected:', socketInstance?.id)
      })

      socketInstance.on('disconnect', (reason) => {
        if (SOCKET_DEBUG) console.info('Socket disconnected:', reason)
      })

      socketInstance.on('connect_error', (err) => {
        if (SOCKET_DEBUG) console.warn('Socket error:', err.message)
      })
    }

    return () => {
      // Component unmount par disconnect nahi karte — singleton rakhte hain
    }
  }, [token])

  const emit = useCallback((event: SocketEventName | string, data?: unknown) => {
    socketInstance?.emit(event, data)
  }, [])

  const on = useCallback((event: SocketEventName | string, handler: (...args: unknown[]) => void) => {
    const subscription = { event, handler }
    socketSubscribers.add(subscription)
    socketInstance?.on(event, handler)
    return () => {
      socketSubscribers.delete(subscription)
      socketInstance?.off(event, handler)
    }
  }, [])

  const off = useCallback((event: SocketEventName | string, handler?: (...args: unknown[]) => void) => {
    socketInstance?.off(event, handler)
  }, [])

  const updateStatus = useCallback((status: string) => {
    socketInstance?.emit(SOCKET_EVENTS.AGENT_STATUS, status)
  }, [])

  return {
    socket:       socketRef.current,
    emit,
    on,
    off,
    updateStatus,
    isConnected:  socketInstance?.connected || false,
  }
}

export const disconnectSocket = () => {
  socketInstance?.disconnect()
  socketInstance = null
  socketListenersAttached = false
  socketSubscribers.clear()
}
