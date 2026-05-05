import { useState, useEffect, useCallback } from 'react'
import { contactsAPI } from '../api/contacts.api'

export const useContacts = (params?: {
  campaignId?: number
  status?: string
  search?: string
  page?: number
  limit?: number
}) => {
  const [contacts,   setContacts]   = useState<Record<string,unknown>[]>([])
  const [stats,      setStats]      = useState<Record<string,unknown> | null>(null)
  const [pagination, setPagination] = useState<Record<string,unknown> | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listData, statsData] = await Promise.all([
        contactsAPI.getAll(params),
        contactsAPI.getStats(params?.campaignId),
      ])
      setContacts(listData.contacts || [])
      setPagination(listData.pagination || null)
      setStats(statsData)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  const uploadCSV = async (campaignId: number, file: File) => {
    const result = await contactsAPI.uploadCSV(campaignId, file)
    await fetch()
    return result
  }

  const createContact = async (data: Record<string,unknown>) => {
    const c = await contactsAPI.create(data)
    await fetch()
    return c
  }

  const deleteContact = async (id: number) => {
    await contactsAPI.delete(id)
    await fetch()
  }

  return {
    contacts, stats, pagination,
    loading, error,
    refetch: fetch,
    uploadCSV, createContact, deleteContact
  }
}