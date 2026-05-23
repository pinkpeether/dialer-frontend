import { useState, useEffect, useCallback, useMemo } from 'react'
import { agentsAPI } from '../api/agents.api'

export const useAgents = (params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
}) => {
  const paramsKey = JSON.stringify(params ?? {})
  const stableParams = useMemo(() => JSON.parse(paramsKey) as typeof params, [paramsKey])
  const [agents,     setAgents]     = useState<Record<string,unknown>[]>([])
  const [stats,      setStats]      = useState<Record<string,unknown> | null>(null)
  const [pagination, setPagination] = useState<Record<string,unknown> | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listData, statsData] = await Promise.all([
        agentsAPI.getAll(stableParams),
        agentsAPI.getStats(),
      ])
      setAgents(listData.agents || [])
      setPagination(listData.pagination || null)
      setStats(statsData)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [stableParams])

  useEffect(() => { fetch() }, [fetch])

  const createAgent = async (data: Record<string,unknown>) => {
    const agent = await agentsAPI.create(data as never)
    await fetch()
    return agent
  }

  const updateAgent = async (id: number, data: Record<string,unknown>) => {
    const agent = await agentsAPI.update(id, data)
    await fetch()
    return agent
  }

  const deleteAgent = async (id: number) => {
    await agentsAPI.delete(id)
    await fetch()
  }

  const updateStatus = async (id: number, status: string) => {
    await agentsAPI.updateStatus(id, status)
    await fetch()
  }

  return {
    agents, stats, pagination,
    loading, error,
    refetch: fetch,
    createAgent, updateAgent, deleteAgent, updateStatus
  }
}
