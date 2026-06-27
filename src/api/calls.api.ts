import api from './axios'
import { callbacksAPI } from './callbacks.api'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

type CallsRequestOptions = {
  timeout?: number
  silent?: boolean
}

export const callsAPI = {
  getAll: async (params?: Record<string, unknown>, options?: CallsRequestOptions) => {
    return swr(
      swrKey('calls:list', params),
      async ({ silent }) => {
        const config = { params, timeout: options?.timeout }
        const res = await api.get('/calls', (silent || options?.silent) ? silentOverlayConfig(config) : config)
        return res.data.data
      },
      { silent: options?.silent },
    )
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
    clearSwrByPrefix('calls')
    return res.data.data
  },

  end: async (
    id: number | string,
    data?: { endedAt?: string }
  ) => {
    const res = await api.patch(`/calls/${id}/end`, data)
    clearSwrByPrefix('calls')
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
