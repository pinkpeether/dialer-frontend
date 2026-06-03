import api from './axios'

export const advancedDialingAPI = {
  getMetrics: async (campaignId?: number) => {
    const res = await api.get('/advanced-dialing/metrics', { params: { campaignId } })
    return res.data.data
  },
  previewPacing: async (payload: Record<string, unknown>) => {
    const res = await api.post('/advanced-dialing/pacing/preview', payload)
    return res.data.data
  },
  previewGuardrails: async (payload: Record<string, unknown>) => {
    const res = await api.post('/advanced-dialing/guardrails/preview', payload)
    return res.data.data
  },
}
