import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

type AdvancedDialingOptions = { silent?: boolean }
const advancedDialingGetConfig = (silent: boolean, config = {}) => (
  silent ? silentOverlayConfig(config) : config
)

export const advancedDialingAPI = {
  getMetrics: async (campaignId?: number, options?: AdvancedDialingOptions) => swr(
    swrKey('advanced-dialing', { type: 'metrics', campaignId }),
    async ({ silent }) => {
      const res = await api.get('/advanced-dialing/metrics', advancedDialingGetConfig(silent, { params: { campaignId } }))
      return res.data.data
    },
    options,
  ),
  previewPacing: async (payload: Record<string, unknown>) => {
    const res = await api.post('/advanced-dialing/pacing/preview', payload)
    return res.data.data
  },
  previewGuardrails: async (payload: Record<string, unknown>) => {
    const res = await api.post('/advanced-dialing/guardrails/preview', payload)
    return res.data.data
  },
  getEngineStatus: async (campaignId: number, options?: AdvancedDialingOptions) => swr(
    swrKey('advanced-dialing', { type: 'engine-status', campaignId }),
    async ({ silent }) => {
      const res = await api.get(`/dialer/engine/${campaignId}/status`, advancedDialingGetConfig(silent))
      return res.data.data
    },
    options,
  ),
  runEngineTick: async (campaignId: number) => {
    const res = await api.post(`/dialer/engine/${campaignId}/tick`)
    clearSwrByPrefix('advanced-dialing')
    return res.data.data
  },
  startCampaignEngine: async (campaignId: number) => {
    const res = await api.post(`/dialer/start/${campaignId}`)
    clearSwrByPrefix('advanced-dialing')
    return res.data.data
  },
  stopCampaignEngine: async (campaignId: number) => {
    const res = await api.post(`/dialer/stop/${campaignId}`)
    clearSwrByPrefix('advanced-dialing')
    return res.data.data
  },
  getActiveCampaigns: async (options?: AdvancedDialingOptions) => swr(
    swrKey('advanced-dialing', { type: 'active-campaigns' }),
    async ({ silent }) => {
      const res = await api.get('/dialer/active', advancedDialingGetConfig(silent))
      return res.data.data
    },
    options,
  ),
}
