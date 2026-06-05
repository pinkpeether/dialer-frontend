import api from './axios'

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

export const agentManagementAPI = {
  getOverview: async (params?: AgentManagementQuery) => {
    const res = await api.get('/agent-management/overview', { params })
    return res.data.data
  },

  getLeaderboard: async (params?: AgentManagementQuery) => {
    const res = await api.get('/agent-management/leaderboard', { params })
    return res.data.data
  },

  getPerformance: async (params?: AgentManagementQuery) => {
    const res = await api.get('/agent-management/performance', { params })
    return res.data.data
  },

  getShifts: async (params?: AgentManagementQuery) => {
    const res = await api.get('/agent-management/shifts', { params })
    return res.data.data
  },

  updateShift: async (agentId: number, payload: ShiftUpdatePayload) => {
    const res = await api.put(`/agent-management/shifts/${agentId}`, payload)
    return res.data.data
  },

  getBreakReminders: async () => {
    const res = await api.get('/agent-management/break-reminders')
    return res.data.data
  },

  startSession: async (clientFingerprint: string) => {
    const res = await api.post('/agent-management/sessions/start', { clientFingerprint })
    return res.data.data
  },

  endSession: async () => {
    const res = await api.post('/agent-management/sessions/end')
    return res.data.data
  },

  getSessions: async () => {
    const res = await api.get('/agent-management/sessions')
    return res.data.data
  },

  forceEndSession: async (agentId: number) => {
    const res = await api.delete(`/agent-management/sessions/${agentId}`)
    return res.data.data
  },
}
