import { useState, useEffect, useCallback } from 'react'
import { campaignsAPI } from '../api/campaigns.api'

export const useCampaigns = (params?: Record<string,unknown>) => {
  const [campaigns,  setCampaigns]  = useState<Record<string,unknown>[]>([])
  const [stats,      setStats]      = useState<Record<string,unknown> | null>(null)
  const [pagination, setPagination] = useState<Record<string,unknown> | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listData, statsData] = await Promise.all([
        campaignsAPI.getAll(params),
        campaignsAPI.getStats(),
      ])
      setCampaigns(listData.campaigns || [])
      setPagination(listData.pagination || null)
      setStats(statsData)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  const createCampaign = async (data: Record<string,unknown>) => {
    const c = await campaignsAPI.create(data)
    await fetch()
    return c
  }

  const updateCampaign = async (id: number, data: Record<string,unknown>) => {
    const c = await campaignsAPI.update(id, data)
    await fetch()
    return c
  }

  const updateStatus = async (id: number, status: string) => {
    await campaignsAPI.updateStatus(id, status)
    await fetch()
  }

  const cloneCampaign = async (id: number) => {
    const c = await campaignsAPI.clone(id)
    await fetch()
    return c
  }

  const deleteCampaign = async (id: number) => {
    await campaignsAPI.delete(id)
    await fetch()
  }

  return {
    campaigns, stats, pagination,
    loading, error,
    refetch: fetch,
    createCampaign, updateCampaign,
    updateStatus, cloneCampaign, deleteCampaign
  }
}