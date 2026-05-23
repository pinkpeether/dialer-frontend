import api from './axios'
import { callbacksAPI } from './callbacks.api'

type CallsRequestOptions = {
  timeout?: number
}

export const callsAPI = {
  getAll: async (params?: Record<string, unknown>, options?: CallsRequestOptions) => {
    const res = await api.get('/calls', { params, timeout: options?.timeout })
    return res.data.data
  },

  getById: async (id: number | string) => {
    const res = await api.get(`/calls/${id}`)
    return res.data.data
  },

  updateDisposition: async (
    id: number | string,
    data: { disposition: string; notes?: string; callbackAt?: string }
  ) => {
    const res = await api.patch(`/calls/${id}/disposition`, data)
    return res.data.data
  },

  end: async (
    id: number | string,
    data?: { endedAt?: string }
  ) => {
    const res = await api.patch(`/calls/${id}/end`, data)
    return res.data.data
  },

  /** Schedule a callback for a contact — used after CALLBACK disposition */
  createCallback: async (data: {
    contactId?: number
    callId?: number | string
    scheduledAt: string   // ISO 8601
    notes?: string
  }) => {
    return callbacksAPI.create(data)
  },
}
