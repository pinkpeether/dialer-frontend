import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

export type AlertSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL'
export type AlertType =
  | 'DESKTOP_TOAST'
  | 'SOUND_ALERT'
  | 'ANGRY_CUSTOMER'
  | 'SHIFT_REMINDER'
  | 'BREAK_REMINDER'
  | 'CAMPAIGN_COMPLETE'
  | 'LOW_CONTACTS'
  | 'SYSTEM_NOTICE'

export type NotificationAlert = {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  audience: string[]
  agentId?: number | null
  campaignId?: number | null
  callId?: number | null
  soundKey?: string | null
  actionUrl?: string | null
  createdAt: string
  expiresAt?: string | null
  acknowledgedBy: number[]
  metadata?: Record<string, unknown>
}

export type AlertPreferences = {
  desktopToasts: boolean
  soundAlerts: boolean
  angryCustomerAlerts: boolean
  shiftReminders: boolean
  breakReminders: boolean
  campaignCompleteAlerts: boolean
  lowContactWarnings: boolean
  lowContactThreshold: number
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  sounds: {
    info: string
    success: string
    warning: string
    critical: string
  }
}

export type AlertSummary = {
  total: number
  unread: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  latest: NotificationAlert[]
  preferences: AlertPreferences
}

const cleanParams = (params: Record<string, unknown>) => {
  const next: Record<string, string | number | boolean> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') next[key] = value as string | number | boolean
  })
  return next
}

type NotificationsOptions = { silent?: boolean }
const notificationsGetConfig = (silent: boolean, config = {}) => (
  silent ? silentOverlayConfig(config) : config
)

export const notificationsAlertsProApi = {
  getSummary: async (options?: NotificationsOptions) => swr(
    swrKey('notifications-alerts-pro', { type: 'summary' }),
    async ({ silent }) => {
      const res = await api.get('/notifications-alerts-pro/summary', notificationsGetConfig(silent))
      return res.data.data as AlertSummary
    },
    options,
  ),
  getPreferences: async (options?: NotificationsOptions) => swr(
    swrKey('notifications-alerts-pro', { type: 'preferences' }),
    async ({ silent }) => {
      const res = await api.get('/notifications-alerts-pro/preferences', notificationsGetConfig(silent))
      return res.data.data as AlertPreferences
    },
    options,
  ),
  updatePreferences: async (payload: Partial<AlertPreferences>) => {
    const res = await api.patch('/notifications-alerts-pro/preferences', payload)
    clearSwrByPrefix('notifications-alerts-pro')
    return res.data.data as AlertPreferences
  },
  listAlerts: async (params: { onlyUnread?: boolean; severity?: string; type?: string; limit?: number } = {}, options?: NotificationsOptions) => swr(
    swrKey('notifications-alerts-pro', { type: 'alerts', params }),
    async ({ silent }) => {
      const res = await api.get('/notifications-alerts-pro/alerts', notificationsGetConfig(silent, { params: cleanParams(params) }))
      return res.data.data as NotificationAlert[]
    },
    options,
  ),
  createAlert: async (payload: Partial<NotificationAlert> & { title: string; message: string }) => {
    const res = await api.post('/notifications-alerts-pro/alerts', payload)
    clearSwrByPrefix('notifications-alerts-pro')
    return res.data.data as NotificationAlert
  },
  acknowledgeAlert: async (alertId: string) => {
    const res = await api.post(`/notifications-alerts-pro/alerts/${alertId}/acknowledge`)
    clearSwrByPrefix('notifications-alerts-pro')
    return res.data.data as NotificationAlert
  },
  acknowledgeAll: async () => {
    const res = await api.post('/notifications-alerts-pro/alerts/acknowledge-all')
    clearSwrByPrefix('notifications-alerts-pro')
    return res.data.data as { acknowledged: number }
  },
  runSweep: async () => {
    const res = await api.post('/notifications-alerts-pro/sweep')
    clearSwrByPrefix('notifications-alerts-pro')
    return res.data.data
  },
  createAngryCustomerAlert: async (payload: { callId?: number; agentId?: number; sentimentScore?: number; reason?: string }) => {
    const res = await api.post('/notifications-alerts-pro/angry-customer', payload)
    clearSwrByPrefix('notifications-alerts-pro')
    return res.data.data as NotificationAlert
  },
  createShiftReminder: async (payload: { agentId: number; agentName?: string; startsAt?: string; endsAt?: string; reminderType?: 'SHIFT_START' | 'SHIFT_END' | 'BREAK_DUE' | 'BREAK_OVER' }) => {
    const res = await api.post('/notifications-alerts-pro/shift-reminder', payload)
    clearSwrByPrefix('notifications-alerts-pro')
    return res.data.data as NotificationAlert
  },
}
