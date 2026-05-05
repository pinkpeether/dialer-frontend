import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/auth.store'

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'

let socketInstance: Socket | null = null

export const useSocket = () => {
  const { token } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    if (!socketInstance) {
      socketInstance = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    }

    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected:', socketInstance?.id)
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
    })

    socketInstance.on('connect_error', (err) => {
      console.error('🔌 Socket error:', err.message)
    })

    return () => {
      // Component unmount par disconnect nahi karte — singleton rakhte hain
    }
  }, [token])

  const emit = useCallback((event: string, data?: unknown) => {
    socketInstance?.emit(event, data)
  }, [])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketInstance?.on(event, handler)
    return () => {
      socketInstance?.off(event, handler)
    }
  }, [])

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    socketInstance?.off(event, handler)
  }, [])

  const updateStatus = useCallback((status: string) => {
    socketInstance?.emit('agent:status', status)
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
}