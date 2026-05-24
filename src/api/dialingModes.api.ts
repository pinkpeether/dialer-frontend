import api from './axios'

export const dialingModesAPI = {
  getNextPreviewContact: async (campaignId: number | string) => {
    const res = await api.post(`/dialer/preview/${campaignId}/next`)
    return res.data.data
  },

  releasePreviewContact: async (campaignId: number | string, contactId: number | string) => {
    const res = await api.post(`/dialer/preview/${campaignId}/${contactId}/release`)
    return res.data.data
  },

  callPreviewContact: async (campaignId: number | string, contactId: number | string) => {
    const res = await api.post(`/dialer/preview/${campaignId}/${contactId}/call`)
    return res.data.data
  },
}
