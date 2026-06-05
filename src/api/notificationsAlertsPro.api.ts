import api from './axios'

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

export const notificationsAlertsProApi = {
  getSummary: async () => {
    const res = await api.get('/notifications-alerts-pro/summary')
    return res.data.data as AlertSummary
  },
  getPreferences: async () => {
    const res = await api.get('/notifications-alerts-pro/preferences')
    return res.data.data as AlertPreferences
  },
  updatePreferences: async (payload: Partial<AlertPreferences>) => {
    const res = await api.patch('/notifications-alerts-pro/preferences', payload)
    return res.data.data as AlertPreferences
  },
  listAlerts: async (params: { onlyUnread?: boolean; severity?: string; type?: string; limit?: number } = {}) => {
    const res = await api.get('/notifications-alerts-pro/alerts', { params: cleanParams(params) })
    return res.data.data as NotificationAlert[]
  },
  createAlert: async (payload: Partial<NotificationAlert> & { title: string; message: string }) => {
    const res = await api.post('/notifications-alerts-pro/alerts', payload)
    return res.data.data as NotificationAlert
  },
  acknowledgeAlert: async (alertId: string) => {
    const res = await api.post(`/notifications-alerts-pro/alerts/${alertId}/acknowledge`)
    return res.data.data as NotificationAlert
  },
  acknowledgeAll: async () => {
    const res = await api.post('/notifications-alerts-pro/alerts/acknowledge-all')
    return res.data.data as { acknowledged: number }
  },
  runSweep: async () => {
    const res = await api.post('/notifications-alerts-pro/sweep')
    return res.data.data
  },
  createAngryCustomerAlert: async (payload: { callId?: number; agentId?: number; sentimentScore?: number; reason?: string }) => {
    const res = await api.post('/notifications-alerts-pro/angry-customer', payload)
    return res.data.data as NotificationAlert
  },
  createShiftReminder: async (payload: { agentId: number; agentName?: string; startsAt?: string; endsAt?: string; reminderType?: 'SHIFT_START' | 'SHIFT_END' | 'BREAK_DUE' | 'BREAK_OVER' }) => {
    const res = await api.post('/notifications-alerts-pro/shift-reminder', payload)
    return res.data.data as NotificationAlert
  },
}
