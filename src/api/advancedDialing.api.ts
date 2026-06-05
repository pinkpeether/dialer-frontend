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
  getEngineStatus: async (campaignId: number) => {
    const res = await api.get(`/dialer/engine/${campaignId}/status`)
    return res.data.data
  },
  runEngineTick: async (campaignId: number) => {
    const res = await api.post(`/dialer/engine/${campaignId}/tick`)
    return res.data.data
  },
  startCampaignEngine: async (campaignId: number) => {
    const res = await api.post(`/dialer/start/${campaignId}`)
    return res.data.data
  },
  stopCampaignEngine: async (campaignId: number) => {
    const res = await api.post(`/dialer/stop/${campaignId}`)
    return res.data.data
  },
  getActiveCampaigns: async () => {
    const res = await api.get('/dialer/active')
    return res.data.data
  },
}
