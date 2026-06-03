import api from './axios'

export const callIntelligenceAPI = {
  getByCall: async (callId: number | string) => {
    const res = await api.get(`/call-intelligence/calls/${callId}`)
    return res.data.data
  },
  createTranscript: async (callId: number | string) => {
    const res = await api.post(`/call-intelligence/calls/${callId}/transcript`)
    return res.data.data
  },
  createInsight: async (callId: number | string) => {
    const res = await api.post(`/call-intelligence/calls/${callId}/insight`)
    return res.data.data
  },
}
