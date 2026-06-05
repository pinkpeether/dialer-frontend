import api from './axios'

export const deploymentPlatformProAPI = {
  getOverview: async () => {
    const res = await api.get('/deployment-platform-pro/overview')
    return res.data.data
  },

  getChecklist: async () => {
    const res = await api.get('/deployment-platform-pro/checklist')
    return res.data.data
  },

  getSmokeCommands: async () => {
    const res = await api.get('/deployment-platform-pro/smoke-commands')
    return res.data.data
  },
}

export default deploymentPlatformProAPI
