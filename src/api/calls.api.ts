import api from './axios'

export type CallFilters = {
  campaignId?: number
  agentId?: number
  status?: string
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}

export type UpdateDispositionPayload = {
  disposition: 'ANSWERED' | 'NO_ANSWER' | 'VOICEMAIL' | 'CALLBACK' | 'WRONG_NUMBER' | 'DO_NOT_CALL'
  notes?: string
}

export const callsAPI = {
  getAll: async (params?: CallFilters) => {
    const res = await api.get('/calls', { params })
    return res.data.data
  },

  getById: async (id: number) => {
    const res = await api.get(`/calls/${id}`)
    return res.data.data
  },

  updateDisposition: async (id: number, data: UpdateDispositionPayload) => {
    const res = await api.patch(`/calls/${id}/disposition`, data)
    return res.data.data
  },
}
