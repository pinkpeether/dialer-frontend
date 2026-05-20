import { useState, useCallback, useEffect } from 'react'
import { callbacksAPI, type CallbackRecord, type CallbackStatus } from '../api/callbacks.api'

interface UseCallbacksOptions {
  status?: CallbackStatus
  autoRefreshMs?: number
}

export function useCallbacks(options: UseCallbacksOptions = {}) {
  const [callbacks, setCallbacks] = useState<CallbackRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await callbacksAPI.getAll({ status: options.status })
      setCallbacks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load callbacks')
    } finally {
      setLoading(false)
    }
  }, [options.status])

  useEffect(() => {
    void fetch()
    if (!options.autoRefreshMs) return
    const id = window.setInterval(() => void fetch(), options.autoRefreshMs)
    return () => window.clearInterval(id)
  }, [fetch, options.autoRefreshMs])

  const markCompleted = async (id: number | string) => {
    await callbacksAPI.updateStatus(id, 'COMPLETED')
    await fetch()
  }

  const markCancelled = async (id: number | string) => {
    await callbacksAPI.updateStatus(id, 'CANCELLED')
    await fetch()
  }

  const reschedule = async (id: number | string, scheduledAt: string, notes?: string) => {
    await callbacksAPI.reschedule(id, scheduledAt, notes)
    await fetch()
  }

  return { callbacks, loading, error, refresh: fetch, markCompleted, markCancelled, reschedule }
}