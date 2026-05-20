import api from './axios'

export type CallbackStatus = 'PENDING' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED'

export type CallbackRecord = {
  id: number | string
  contactId?: number | null
  callId?: number | string | null
  scheduledAt: string
  notes?: string | null
  status: CallbackStatus
  contactName?: string | null
  contactPhone?: string | null
  agentName?: string | null
  createdAt?: string
}

export const callbacksAPI = {
  getAll: async (params?: {
    status?: CallbackStatus
    from?: string
    to?: string
    page?: number
    limit?: number
  }): Promise<CallbackRecord[]> => {
    try {
      const res = await api.get('/callbacks', { params })
      const data = res.data?.data ?? res.data
      if (Array.isArray(data)) return data as CallbackRecord[]
      if (Array.isArray(data?.callbacks)) return data.callbacks as CallbackRecord[]
      if (Array.isArray(data?.items)) return data.items as CallbackRecord[]
      return []
    } catch {
      return []
    }
  },

  updateStatus: async (
    id: number | string,
    status: CallbackStatus,
    notes?: string
  ): Promise<void> => {
    await api.patch(`/callbacks/${id}`, { status, notes })
  },

  reschedule: async (
    id: number | string,
    scheduledAt: string,
    notes?: string
  ): Promise<void> => {
    await api.patch(`/callbacks/${id}`, {
      status: 'RESCHEDULED',
      scheduledAt,
      notes,
    })
  },
}