import api from './axios'

export type ContactImportRow = {
  name?: string
  phone?: string
  email?: string
  company?: string
  notes?: string
}

export const contactManagementProAPI = {
  getDuplicates: async () => {
    const res = await api.get('/contact-management-pro/duplicates')
    return res.data.data
  },

  getTimeline: async (contactId: number) => {
    const res = await api.get(`/contact-management-pro/${contactId}/timeline`)
    return res.data.data
  },

  updateNotes: async (contactId: number, notes: string) => {
    const res = await api.patch(`/contact-management-pro/${contactId}/notes`, { notes })
    return res.data.data
  },

  updateTags: async (contactId: number, tags: string[]) => {
    const res = await api.patch(`/contact-management-pro/${contactId}/tags`, { tags })
    return res.data.data
  },

  previewImport: async (contacts: ContactImportRow[], campaignId?: number) => {
    const res = await api.post('/contact-management-pro/import/preview', { contacts, campaignId })
    return res.data.data
  },

  exportCsv: async (params: Record<string, string | number | undefined>) => {
    const res = await api.get('/contact-management-pro/export', { params, responseType: 'blob' })
    return res.data
  },
}
