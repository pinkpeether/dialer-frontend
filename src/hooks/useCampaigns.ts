import { useState, useEffect, useCallback, useMemo } from 'react'
import { campaignsAPI } from '../api/campaigns.api'

export const useCampaigns = (params?: Record<string,unknown>) => {
  const paramsKey = JSON.stringify(params ?? {})
  const stableParams = useMemo(() => JSON.parse(paramsKey) as typeof params, [paramsKey])
  const [campaigns, setCampaigns] = useState<Record<string,unknown>[]>([])
  const [stats, setStats] = useState<Record<string,unknown> | null>(null)
  const [pagination, setPagination] = useState<Record<string,unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const listData = await campaignsAPI.getAll(stableParams)
      setCampaigns(listData?.campaigns || [])
      setPagination(listData?.pagination || null)

      try {
        const statsData = await campaignsAPI.getStats()
        setStats(statsData)
      } catch {
        setStats(null)
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load campaigns')
      setCampaigns([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [stableParams])

  useEffect(() => { void fetch() }, [fetch])

  const createCampaign = async (data: Record<string,unknown>) => {
    setError(null)
    const created = await campaignsAPI.create(data)
    setCampaigns(previous => [created as Record<string, unknown>, ...previous])
    void fetch()
    return created
  }

  const updateCampaign = async (id: number, data: Record<string,unknown>) => {
    setError(null)
    const updated = await campaignsAPI.update(id, data)
    setCampaigns(previous => previous.map(c => Number(c.id) === id ? { ...c, ...(updated as Record<string, unknown>) } : c))
    void fetch()
    return updated
  }

  const updateStatus = async (id: number, status: string) => {
    setError(null)
    const updated = await campaignsAPI.updateStatus(id, status)
    setCampaigns(previous => previous.map(c => Number(c.id) === id ? { ...c, ...(updated as Record<string, unknown>), status } : c))
    void fetch()
  }

  const cloneCampaign = async (id: number) => {
    setError(null)
    const cloned = await campaignsAPI.clone(id)
    setCampaigns(previous => [cloned as Record<string, unknown>, ...previous])
    void fetch()
    return cloned
  }

  const deleteCampaign = async (id: number) => {
    setError(null)
    await campaignsAPI.delete(id)
    setCampaigns(previous => previous.filter(c => Number(c.id) !== id))
    void fetch()
  }

  return {
    campaigns, stats, pagination,
    loading, error,
    refetch: fetch,
    createCampaign, updateCampaign,
    updateStatus, cloneCampaign, deleteCampaign
  }
}