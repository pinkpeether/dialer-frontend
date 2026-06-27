import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

export type SecurityPolicy = {
  ipWhitelistEnabled: boolean
  allowedIps: string[]
  singleSessionMode: 'OFF' | 'ADVISORY' | 'STRICT'
  backupExportEnabled: boolean
  restoreEnabled: boolean
  requireAdminForExports: boolean
  auditRetentionDays: number
  updatedAt?: string
  updatedBy?: number | null
}

export type SecurityChecklistItem = {
  key: string
  title: string
  status: 'PASS' | 'WARN' | 'FAIL' | 'ADVISORY' | string
  detail: string
}

export const securityAdminProAPI = {
  overview: async () => {
    return swr('security-admin-pro:overview:{}', async ({ silent }) => {
      const res = await api.get('/security-admin-pro/overview', silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  checklist: async (): Promise<SecurityChecklistItem[]> => {
    return swr('security-admin-pro:checklist:{}', async ({ silent }) => {
      const res = await api.get('/security-admin-pro/checklist', silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  getPolicy: async (): Promise<SecurityPolicy> => {
    return swr('security-admin-pro:policy:{}', async ({ silent }) => {
      const res = await api.get('/security-admin-pro/policy', silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  updatePolicy: async (payload: Partial<SecurityPolicy>): Promise<SecurityPolicy> => {
    const res = await api.put('/security-admin-pro/policy', payload)
    clearSwrByPrefix('security-admin-pro')
    return res.data.data
  },

  singleSessionAudit: async () => {
    return swr('security-admin-pro:single-session-audit:{}', async ({ silent }) => {
      const res = await api.get('/security-admin-pro/single-session-audit', silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  disconnectStaleSessions: async () => {
    const res = await api.post('/security-admin-pro/single-session-audit/disconnect-stale')
    clearSwrByPrefix('security-admin-pro')
    return res.data.data
  },

  billing: async () => {
    return swr('security-admin-pro:billing:{}', async ({ silent }) => {
      const res = await api.get('/security-admin-pro/billing', silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  exportBackup: async () => {
    const res = await api.get('/security-admin-pro/backup/export', { responseType: 'blob' })
    return res.data as Blob
  },

  restorePreview: async (payload: unknown) => {
    const res = await api.post('/security-admin-pro/restore/preview', payload)
    clearSwrByPrefix('security-admin-pro')
    return res.data.data
  },

  ipCheck: async (ip: string) => {
    return swr(swrKey('security-admin-pro:ip-check', { ip }), async ({ silent }) => {
      const config = { params: { ip } }
      const res = await api.get('/security-admin-pro/ip-check', silent ? silentOverlayConfig(config) : config)
      return res.data.data
    })
  },
}
