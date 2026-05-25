import api from './axios'

export const opsAPI = {
  summary: async () => {
    const res = await api.get('/ops/summary')
    return res.data.data
  },

  runNotificationJobs: async () => {
    const res = await api.post('/ops/run-notification-jobs')
    return res.data.data
  },
}
