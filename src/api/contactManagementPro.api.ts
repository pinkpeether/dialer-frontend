import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

export type ContactImportRow = {
  name?: string
  phone?: string
  email?: string
  company?: string
  notes?: string
}

type ContactManagementOptions = { silent?: boolean }
const contactManagementGetConfig = (silent: boolean, config = {}) => (
  silent ? silentOverlayConfig(config) : config
)

export const contactManagementProAPI = {
  getDuplicates: async (options?: ContactManagementOptions) => swr(
    swrKey('contact-management-pro', { type: 'duplicates' }),
    async ({ silent }) => {
      const res = await api.get('/contact-management-pro/duplicates', contactManagementGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  getTimeline: async (contactId: number, options?: ContactManagementOptions) => swr(
    swrKey('contact-management-pro', { type: 'timeline', contactId }),
    async ({ silent }) => {
      const res = await api.get(`/contact-management-pro/${contactId}/timeline`, contactManagementGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  updateNotes: async (contactId: number, notes: string) => {
    const res = await api.patch(`/contact-management-pro/${contactId}/notes`, { notes })
    clearSwrByPrefix('contact-management-pro')
    return res.data.data
  },

  updateTags: async (contactId: number, tags: string[]) => {
    const res = await api.patch(`/contact-management-pro/${contactId}/tags`, { tags })
    clearSwrByPrefix('contact-management-pro')
    return res.data.data
  },

  previewImport: async (contacts: ContactImportRow[], campaignId?: number) => {
    const res = await api.post('/contact-management-pro/import/preview', { contacts, campaignId })
    clearSwrByPrefix('contact-management-pro')
    return res.data.data
  },

  exportCsv: async (params: Record<string, string | number | undefined>) => {
    const res = await api.get('/contact-management-pro/export', { params, responseType: 'blob' })
    return res.data
  },
}
