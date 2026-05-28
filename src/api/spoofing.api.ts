import api from './axios'

export type CallerIdRecord = {
  id: number
  userId?: number | null
  campaignId?: number | null
  displayNumber: string
  displayName?: string | null
  provider?: string
  providerRef?: string | null
  isActive: boolean
  isVerified: boolean
  scope: 'all' | 'user' | 'campaign'
  createdAt: string
  updatedAt: string
  user?: { id: number; email: string; name: string } | null
  campaign?: { id: number; name: string } | null
}

export type CallerIdPayload = {
  userId?: number | null
  campaignId?: number | null
  displayNumber: string
  displayName?: string | null
  provider?: string
  providerRef?: string | null
  scope: 'all' | 'user' | 'campaign'
  isActive?: boolean
  isVerified?: boolean
}

export const spoofingApi = {
  getAll: async () => {
    const res = await api.get('/spoofing')
    return res.data.data as CallerIdRecord[]
  },
  create: async (payload: CallerIdPayload) => {
    const res = await api.post('/spoofing', payload)
    return res.data.data as CallerIdRecord
  },
  update: async (id: number, payload: Partial<CallerIdPayload>) => {
    const res = await api.put(`/spoofing/${id}`, payload)
    return res.data.data as CallerIdRecord
  },
  delete: async (id: number) => {
    const res = await api.delete(`/spoofing/${id}`)
    return res.data.data
  },
  verify: async (id: number) => {
    const res = await api.post(`/spoofing/${id}/verify`)
    return res.data.data as CallerIdRecord
  },
}