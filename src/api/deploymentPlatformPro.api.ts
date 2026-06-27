import api from './axios'
import { silentOverlayConfig, swr, swrKey } from './swrCache'

const deploymentGetConfig = (silent: boolean) => silent ? silentOverlayConfig() : undefined
type DeploymentPlatformSwrOptions = { silent?: boolean }

export const deploymentPlatformProAPI = {
  getOverview: async (options?: DeploymentPlatformSwrOptions) => swr(
    swrKey('deployment-platform-pro', { type: 'overview' }),
    async ({ silent }) => {
      const res = await api.get('/deployment-platform-pro/overview', deploymentGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  getChecklist: async (options?: DeploymentPlatformSwrOptions) => swr(
    swrKey('deployment-platform-pro', { type: 'checklist' }),
    async ({ silent }) => {
      const res = await api.get('/deployment-platform-pro/checklist', deploymentGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  getSmokeCommands: async (options?: DeploymentPlatformSwrOptions) => swr(
    swrKey('deployment-platform-pro', { type: 'smoke-commands' }),
    async ({ silent }) => {
      const res = await api.get('/deployment-platform-pro/smoke-commands', deploymentGetConfig(silent))
      return res.data.data
    },
    options,
  ),
}

export default deploymentPlatformProAPI
