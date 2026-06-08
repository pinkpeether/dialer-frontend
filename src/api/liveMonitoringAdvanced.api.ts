import api from './axios'

export const liveMonitoringAdvancedAPI = {
  getOverview: async (campaignId?: number) => {
    const res = await api.get('/live-monitoring-advanced/overview', {
      params: campaignId ? { campaignId } : {},
    })
    return res.data.data
  },
}
