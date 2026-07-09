import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey, writeSwr } from './swrCache'

export type AttendanceSessionStatus =
  | 'CLOCKED_IN'
  | 'CLOCKED_OUT'
  | 'IDLE'
  | 'ON_BREAK'
  | 'UNEXPECTED_DISCONNECT'
  | 'MISSED_CLOCK_OUT'
  | 'FLAGGED'
  | 'PENDING_SUPERVISOR_REVIEW'
  | 'NO_SESSION'

export type AttendanceSession = {
  id: number
  userId: number
  role: string
  sessionKey: string
  clockInAt: string
  clockOutAt?: string | null
  totalWorkedSeconds: number
  totalBreakSeconds: number
  productiveSeconds: number
  idleSeconds: number
  status: AttendanceSessionStatus
  browser?: string | null
  operatingSystem?: string | null
  publicIp?: string | null
  localIp?: string | null
  timezone?: string | null
  deviceFingerprint?: string | null
  userAgent?: string | null
  lastHeartbeatAt?: string | null
  disconnectCount: number
  redFlag: boolean
  redFlagReason?: string | null
  supervisorNotes?: string | null
}

export type AttendanceOverviewRow = {
  user: {
    id: number
    name: string
    email: string
    role: string
    status: string
    isActive: boolean
    sipPresence?: {
      enabled: boolean
      registered: boolean
      status: string
      username?: string | null
      transport?: string | null
      domain?: string | null
      lastRegisteredAt?: string | null
      lastUnregisteredAt?: string | null
      lastSeenAt?: string | null
    } | null
  }
  session: AttendanceSession | null
  status: AttendanceSessionStatus
  activeSeconds: number
  heartbeatAgeSeconds: number | null
  needsReview: boolean
}

export type AttendanceOverview = {
  summary: {
    totalUsers: number
    clockedIn: number
    unexpectedDisconnects: number
    needsReview: number
    redFlags: number
  }
  rows: AttendanceOverviewRow[]
  serverTime: string
  heartbeatTimeoutSeconds: number
}

export type AttendanceMetadata = {
  browser?: string
  operatingSystem?: string
  localIp?: string
  timezone?: string
  deviceFingerprint?: string
  userAgent?: string
  currentUrl?: string
  tabVisible?: boolean
  lastInteractionAt?: string
  mouseActivity?: boolean
  keyboardActivity?: boolean
  sessionId?: number
}

const prefix = 'attendance-integrity'
type AttendanceSwrOptions = { silent?: boolean; fresh?: boolean }

export const attendanceIntegrityApi = {
  getMe: async (options?: AttendanceSwrOptions) => {
    const key = swrKey(prefix, { type: 'me' })
    const request = async (silent: boolean) => {
      const res = await api.get('/attendance-integrity/me', (silent || options?.silent) ? silentOverlayConfig() : undefined)
      const data = res.data.data as { session: AttendanceSession | null }
      writeSwr(key, data)
      return data
    }
    if (options?.fresh) return request(Boolean(options.silent))
    return swr(key, async ({ silent }) => request(silent), options)
  },

  overview: async (params?: { status?: string; from?: string; to?: string; limit?: number }, options?: AttendanceSwrOptions) => {
    const key = swrKey(prefix, { type: 'overview', ...params })
    const request = async (silent: boolean) => {
      const config = { params }
      const res = await api.get('/attendance-integrity/overview', (silent || options?.silent) ? silentOverlayConfig(config) : config)
      const data = res.data.data as AttendanceOverview
      writeSwr(key, data)
      return data
    }
    if (options?.fresh) return request(Boolean(options.silent))
    return swr(key, async ({ silent }) => request(silent), options)
  },

  clockIn: async (metadata: AttendanceMetadata) => {
    const res = await api.post('/attendance-integrity/clock-in', metadata)
    clearSwrByPrefix(prefix)
    return res.data.data as AttendanceSession
  },

  clockOut: async (metadata: AttendanceMetadata) => {
    const res = await api.post('/attendance-integrity/clock-out', metadata)
    clearSwrByPrefix(prefix)
    return res.data.data as AttendanceSession
  },

  heartbeat: async (metadata: AttendanceMetadata) => {
    const res = await api.post('/attendance-integrity/heartbeat', metadata, silentOverlayConfig())
    clearSwrByPrefix(prefix)
    return res.data.data as AttendanceSession
  },

  disconnect: async (metadata: AttendanceMetadata) => {
    const res = await api.post('/attendance-integrity/disconnect', metadata, silentOverlayConfig())
    clearSwrByPrefix(prefix)
    return res.data.data as AttendanceSession
  },

  sipPresence: async (payload: {
    enabled: boolean
    status: string
    username?: string
    transport?: string
    domain?: string
    webSocketServer?: string
  }) => {
    const res = await api.post('/attendance-integrity/sip-presence', payload, silentOverlayConfig())
    clearSwrByPrefix(prefix)
    return res.data.data
  },

  review: async (sessionId: number, payload: { status?: string; notes?: string; removeFlag?: boolean }) => {
    const res = await api.patch(`/attendance-integrity/sessions/${sessionId}/review`, payload)
    clearSwrByPrefix(prefix)
    return res.data.data as AttendanceSession
  },
}
