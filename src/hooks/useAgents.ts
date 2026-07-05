import { useState, useEffect, useCallback, useMemo } from 'react'
import { agentsAPI } from '../api/agents.api'
import { clearSwrByPrefix } from '../api/swrCache'
import { AGENT_STATUS_EVENTS } from '../constants/socketEvents'
import { useSocket } from './useSocket'

export const useAgents = (params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
  isActive?: boolean
}) => {
  const paramsKey = JSON.stringify(params ?? {})
  const stableParams = useMemo(() => JSON.parse(paramsKey) as typeof params, [paramsKey])
  const [agents,     setAgents]     = useState<Record<string,unknown>[]>([])
  const [stats,      setStats]      = useState<Record<string,unknown> | null>(null)
  const [pagination, setPagination] = useState<Record<string,unknown> | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const { on } = useSocket()

  const fetch = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true)
    setError(null)
    try {
      const [listData, statsData] = await Promise.all([
        agentsAPI.getAll(stableParams),
        agentsAPI.getStats({ silent: options.silent }),
      ])
      setAgents(listData.agents || [])
      setPagination(listData.pagination || null)
      setStats(statsData)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load agents')
    } finally {
      if (!options.silent) setLoading(false)
    }
  }, [stableParams])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const handler = () => {
      clearSwrByPrefix('agents')
      void fetch({ silent: true })
    }
    const cleanups = AGENT_STATUS_EVENTS.map(event => on(event, handler))
    return () => cleanups.forEach(cleanup => cleanup())
  }, [fetch, on])

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
