import api from './axios'

export type DncEntry = {
  id: number | string
  phone: string
  reason?: string | null
  addedBy?: string | null
  createdAt?: string
}

const normalizeDncEntry = (raw: unknown): DncEntry => {
  const entry = raw as Record<string, unknown>
  const addedBy = entry.addedBy as string | { id?: number; name?: string | null; agentCode?: string | null } | null | undefined
  if (!addedBy || typeof addedBy === 'string') return entry as unknown as DncEntry
  return {
    ...entry,
    addedBy: addedBy.name || addedBy.agentCode || `User #${addedBy.id ?? '—'}`,
  } as DncEntry
}

export const dncAPI = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<DncEntry[]> => {
    const res = await api.get('/dnc', { params })
    const data = res.data?.data ?? res.data
    if (Array.isArray(data)) return data.map(normalizeDncEntry)
    if (Array.isArray(data?.entries)) return data.entries.map(normalizeDncEntry)
    if (Array.isArray(data?.items)) return data.items.map(normalizeDncEntry)
    return []
  },

  add: async (phone: string, reason?: string): Promise<void> => {
    await api.post('/dnc', { phone, reason })
  },

  remove: async (id: number | string): Promise<void> => {
    await api.delete(`/dnc/${id}`)
  },

  check: async (phone: string): Promise<boolean> => {
    const res = await api.get('/dnc/check', { params: { phone } })
    return Boolean(res.data?.isDnc ?? res.data?.blocked ?? false)
  },
}
