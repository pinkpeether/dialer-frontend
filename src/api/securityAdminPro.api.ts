import api from './axios'

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
    const res = await api.get('/security-admin-pro/overview')
    return res.data.data
  },

  checklist: async (): Promise<SecurityChecklistItem[]> => {
    const res = await api.get('/security-admin-pro/checklist')
    return res.data.data
  },

  getPolicy: async (): Promise<SecurityPolicy> => {
    const res = await api.get('/security-admin-pro/policy')
    return res.data.data
  },

  updatePolicy: async (payload: Partial<SecurityPolicy>): Promise<SecurityPolicy> => {
    const res = await api.put('/security-admin-pro/policy', payload)
    return res.data.data
  },

  singleSessionAudit: async () => {
    const res = await api.get('/security-admin-pro/single-session-audit')
    return res.data.data
  },

  disconnectStaleSessions: async () => {
    const res = await api.post('/security-admin-pro/single-session-audit/disconnect-stale')
    return res.data.data
  },

  billing: async () => {
    const res = await api.get('/security-admin-pro/billing')
    return res.data.data
  },

  exportBackup: async () => {
    const res = await api.get('/security-admin-pro/backup/export', { responseType: 'blob' })
    return res.data as Blob
  },

  restorePreview: async (payload: unknown) => {
    const res = await api.post('/security-admin-pro/restore/preview', payload)
    return res.data.data
  },

  ipCheck: async (ip: string) => {
    const res = await api.get('/security-admin-pro/ip-check', { params: { ip } })
    return res.data.data
  },
}
