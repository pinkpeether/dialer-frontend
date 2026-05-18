import api from './axios'

// API wrapper for call log endpoints
export const callsAPI = {
  /**
   * Retrieve call logs with optional filters. Accepts the same query params
   * supported by the backend — campaignId, agentId, status, page, limit, startDate, endDate.
   */
  getAll: async (params?: Record<string, unknown>) => {
    const res = await api.get('/calls', { params })
    return res.data.data
  },

  /** Get details for a single call by ID */
  getById: async (id: number) => {
    const res = await api.get(`/calls/${id}`)
    return res.data.data
  },

  /** Update the disposition and notes for a call */
  updateDisposition: async (
    id: number,
    data: { disposition: string; notes?: string }
  ) => {
    const res = await api.patch(`/calls/${id}/disposition`, data)
    return res.data.data
  },
}