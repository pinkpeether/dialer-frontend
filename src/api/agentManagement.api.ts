import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

export type AgentManagementQuery = {
  from?: string
  to?: string
  days?: number
  limit?: number
  agentId?: number
  date?: string
}

export type ShiftUpdatePayload = {
  startTime: string
  endTime: string
  timezone: string
  breakEveryMinutes: number
}

type AgentManagementOptions = { silent?: boolean }
const agentManagementGetConfig = (silent: boolean, config = {}) => (
  silent ? silentOverlayConfig(config) : config
)

export const agentManagementAPI = {
  getOverview: async (params?: AgentManagementQuery, options?: AgentManagementOptions) => swr(
    swrKey('agent-management', { type: 'overview', params }),
    async ({ silent }) => {
      const res = await api.get('/agent-management/overview', agentManagementGetConfig(silent, { params }))
      return res.data.data
    },
    options,
  ),

  getLeaderboard: async (params?: AgentManagementQuery, options?: AgentManagementOptions) => swr(
    swrKey('agent-management', { type: 'leaderboard', params }),
    async ({ silent }) => {
      const res = await api.get('/agent-management/leaderboard', agentManagementGetConfig(silent, { params }))
      return res.data.data
    },
    options,
  ),

  getPerformance: async (params?: AgentManagementQuery, options?: AgentManagementOptions) => swr(
    swrKey('agent-management', { type: 'performance', params }),
    async ({ silent }) => {
      const res = await api.get('/agent-management/performance', agentManagementGetConfig(silent, { params }))
      return res.data.data
    },
    options,
  ),

  getShifts: async (params?: AgentManagementQuery, options?: AgentManagementOptions) => swr(
    swrKey('agent-management', { type: 'shifts', params }),
    async ({ silent }) => {
      const res = await api.get('/agent-management/shifts', agentManagementGetConfig(silent, { params }))
      return res.data.data
    },
    options,
  ),

  updateShift: async (agentId: number, payload: ShiftUpdatePayload) => {
    const res = await api.put(`/agent-management/shifts/${agentId}`, payload)
    clearSwrByPrefix('agent-management')
    return res.data.data
  },

  getBreakReminders: async (options?: AgentManagementOptions) => swr(
    swrKey('agent-management', { type: 'break-reminders' }),
    async ({ silent }) => {
      const res = await api.get('/agent-management/break-reminders', agentManagementGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  startSession: async (clientFingerprint: string) => {
    const res = await api.post('/agent-management/sessions/start', { clientFingerprint })
    clearSwrByPrefix('agent-management')
    return res.data.data
  },

  endSession: async () => {
    const res = await api.post('/agent-management/sessions/end')
    clearSwrByPrefix('agent-management')
    return res.data.data
  },

  getSessions: async (options?: AgentManagementOptions) => swr(
    swrKey('agent-management', { type: 'sessions' }),
    async ({ silent }) => {
      const res = await api.get('/agent-management/sessions', agentManagementGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  forceEndSession: async (agentId: number) => {
    const res = await api.delete(`/agent-management/sessions/${agentId}`)
    clearSwrByPrefix('agent-management')
    return res.data.data
  },
}
