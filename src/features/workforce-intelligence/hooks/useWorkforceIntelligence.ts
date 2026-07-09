import { useCallback, useEffect, useMemo, useState } from 'react'
import { attendanceIntegrityApi } from '../../../api/attendanceIntegrity.api'
import { reportsAPI } from '../../../api/reports.api'
import { aiCallsAPI } from '../../../api/aiCalls.api'
import { agentManagementAPI } from '../../../api/agentManagement.api'
import { campaignsAPI } from '../../../api/campaigns.api'
import { beginGlobalRequestOverlay, endGlobalRequestOverlay } from '../../../services/globalRequestOverlay'
import type { WorkforceFilters, WorkforceIntelligenceData } from '../types/workforceIntelligence.types'
import { buildWorkforceIntelligence } from '../utils/workforceIntelligence.utils'

type WorkforceQueryState = {
  data: WorkforceIntelligenceData | null
  loading: boolean
  refreshing: boolean
  error: string
}

const cachePrefix = 'ptdt-workforce-intelligence:'
const cacheMaxAgeMs = 20 * 60 * 1000

const cacheKeyFor = (filters: WorkforceFilters) => `${cachePrefix}${JSON.stringify(filters)}`

const readWorkforceCache = (filters: WorkforceFilters): WorkforceIntelligenceData | null => {
  try {
    const raw = window.localStorage.getItem(cacheKeyFor(filters))
    if (!raw) return null
    const cached = JSON.parse(raw) as { savedAt: number; data: WorkforceIntelligenceData }
    if (!cached?.savedAt || Date.now() - cached.savedAt > cacheMaxAgeMs) return null
    return cached.data
  } catch {
    return null
  }
}

const writeWorkforceCache = (filters: WorkforceFilters, data: WorkforceIntelligenceData) => {
  try {
    window.localStorage.setItem(cacheKeyFor(filters), JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // Best-effort SWR cache only.
  }
}

export const useWorkforceIntelligence = (filters: WorkforceFilters) => {
  const [state, setState] = useState<WorkforceQueryState>(() => {
    const cached = readWorkforceCache(filters)
    return {
      data: cached,
      loading: !cached,
      refreshing: Boolean(cached),
      error: '',
    }
  })

  const filterCacheKey = useMemo(() => cacheKeyFor(filters), [filters])

  const reportFilters = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    ...(filters.agentId === 'all' ? {} : { agentId: filters.agentId }),
  }), [filters.agentId, filters.from, filters.to])

  const load = useCallback(async (silent = false, cachedData?: WorkforceIntelligenceData | null) => {
    const hasCachedData = Boolean(cachedData)
    let overlayId: number | null = null

    if (!silent && !hasCachedData) {
      overlayId = beginGlobalRequestOverlay({
        message: 'Loading Workforce Intelligence...',
        followupMessage: 'Building productivity and risk intelligence...',
        successMessage: 'Workforce Intelligence ready',
        detail: 'PTDT is combining attendance, calls, AI review, and campaign records.',
        delayMs: 220,
      })
    }

    setState(current => ({
      ...current,
      data: cachedData ?? current.data,
      loading: !silent && !hasCachedData && !current.data,
      refreshing: silent || hasCachedData || Boolean(current.data),
      error: '',
    }))

    try {
      const [
        attendance,
        agentReports,
        trend,
        aiLogs,
        leaderboard,
        campaigns,
      ] = await Promise.all([
        attendanceIntegrityApi.overview({ limit: 500 }, { silent: silent || hasCachedData, fresh: !silent && !hasCachedData }),
        reportsAPI.getAgentBreakdown(reportFilters),
        reportsAPI.getCallTrend({ ...reportFilters, granularity: filters.range === 'yearly' ? 'week' : 'day' }, { silent: silent || hasCachedData }),
        aiCallsAPI.getLogs({ limit: 250 }),
        agentManagementAPI.getLeaderboard({ from: filters.from, to: filters.to, limit: 250 }, { silent: silent || hasCachedData }),
        campaignsAPI.getAll({ limit: 500 }, { silent: true }).catch(() => null),
      ])

      const data = buildWorkforceIntelligence({
        filters,
        attendanceRows: attendance.rows || [],
        agentReports: Array.isArray(agentReports) ? agentReports : [],
        trend: Array.isArray(trend) ? trend : [],
        aiLogs: aiLogs.items || [],
        leaderboard,
        campaigns,
      })

      writeWorkforceCache(filters, data)
      setState({ data, loading: false, refreshing: false, error: '' })
      endGlobalRequestOverlay(overlayId, true)
    } catch (error) {
      setState(current => ({
        ...current,
        data: cachedData ?? current.data,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Workforce Intelligence data could not be loaded.',
      }))
      endGlobalRequestOverlay(overlayId, false)
    }
  }, [filters, reportFilters])

  useEffect(() => {
    const cached = readWorkforceCache(filters)
    void load(Boolean(cached), cached)
  }, [filterCacheKey, filters, load])

  useEffect(() => {
    const timer = window.setInterval(() => void load(true, readWorkforceCache(filters)), 60_000)
    return () => window.clearInterval(timer)
  }, [filters, load])

  return {
    ...state,
    reload: () => load(false, null),
    refresh: () => load(true, readWorkforceCache(filters)),
  }
}
