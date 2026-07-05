import { useEffect, useRef } from 'react'
import { agentsAPI } from '../api/agents.api'
import { SOCKET_EVENTS } from '../constants/socketEvents'
import { useAuthStore, type UserRole } from '../store/auth.store'
import { useSocket } from './useSocket'

export type PresenceStatus = 'ONLINE' | 'READY' | 'BUSY' | 'WRAP_UP' | 'OFFLINE'

const TRACKED_ROLES: UserRole[] = ['AGENT', 'SUPERVISOR']
const ACTIVE_PRESENCE_STATUSES: PresenceStatus[] = ['ONLINE', 'READY', 'BUSY', 'WRAP_UP']

export const isPresenceTrackedRole = (role?: string | null) =>
  TRACKED_ROLES.includes(role as UserRole)

export const normalizePresenceStatus = (status?: unknown): PresenceStatus => {
  const next = String(status || '').toUpperCase()
  return (['ONLINE', 'READY', 'BUSY', 'WRAP_UP', 'OFFLINE'] as PresenceStatus[]).includes(next as PresenceStatus)
    ? (next as PresenceStatus)
    : 'OFFLINE'
}

const nextLoginPresenceStatus = (status?: unknown): PresenceStatus => {
  const current = normalizePresenceStatus(status)
  return ACTIVE_PRESENCE_STATUSES.includes(current) ? current : 'ONLINE'
}

export const markPresenceOfflineBeforeLogout = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem('jd_user')
    const user = raw ? JSON.parse(raw) as { role?: string } : null
    if (!isPresenceTrackedRole(user?.role)) return
    void agentsAPI.updateMyStatus('OFFLINE').catch(() => undefined)
  } catch {
    // Presence is best-effort; logout should never be blocked by local parsing.
  }
}

export function useAgentPresence() {
  const user = useAuthStore(state => state.user)
  const updateUser = useAuthStore(state => state.updateUser)
  const { emit } = useSocket()
  const presenceKeyRef = useRef('')

  useEffect(() => {
    if (!user?.id || !isPresenceTrackedRole(user.role)) return
    const presenceKey = `${user.id}:${user.role}`
    if (presenceKeyRef.current === presenceKey) return
    presenceKeyRef.current = presenceKey

    const nextStatus = nextLoginPresenceStatus(user.status)
    updateUser({ status: nextStatus })
    emit(SOCKET_EVENTS.AGENT_STATUS, nextStatus)
    void agentsAPI.updateMyStatus(nextStatus)
      .then(() => emit(SOCKET_EVENTS.AGENT_STATUS, nextStatus))
      .catch(() => undefined)
  }, [emit, updateUser, user?.id, user?.role, user?.status])
}
