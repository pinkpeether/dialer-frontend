import api from './axios'
import { silentOverlayConfig, swr, swrKey } from './swrCache'

type LiveMonitoringOptions = { silent?: boolean }

const liveMonitoringGetConfig = (silent: boolean, config = {}) => (
  silent ? silentOverlayConfig(config) : config
)

export const liveMonitoringAdvancedAPI = {
  getOverview: async (campaignId?: number, options?: LiveMonitoringOptions) => swr(
    swrKey('live-monitoring-advanced', { type: 'overview', campaignId }),
    async ({ silent }) => {
      const res = await api.get('/live-monitoring-advanced/overview', liveMonitoringGetConfig(silent, {
        params: campaignId ? { campaignId } : {},
      }))
      return res.data.data
    },
    options,
  ),
}
