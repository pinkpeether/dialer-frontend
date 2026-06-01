import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { callbacksAPI, type CallbackRecord, type CallbackStatus } from '../api/callbacks.api'

interface UseCallbacksOptions {
  status?: CallbackStatus
  autoRefreshMs?: number
}

export function useCallbacks(options: UseCallbacksOptions = {}) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['callbacks', { status: options.status ?? 'ALL' }], [options.status])

  const callbacksQuery = useQuery<CallbackRecord[]>({
    queryKey,
    queryFn: () => callbacksAPI.getAll({ status: options.status }),
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: options.autoRefreshMs || false,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['callbacks'] })
  }

  const completeMutation = useMutation({
    mutationFn: (id: number | string) => callbacksAPI.updateStatus(id, 'COMPLETED'),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number | string) => callbacksAPI.updateStatus(id, 'CANCELLED'),
    onSuccess: invalidate,
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledAt, notes }: { id: number | string; scheduledAt: string; notes?: string }) =>
      callbacksAPI.reschedule(id, scheduledAt, notes),
    onSuccess: invalidate,
  })

  const refresh = async () => {
    await callbacksQuery.refetch()
  }

  const error = callbacksQuery.error
    ? callbacksQuery.error instanceof Error
      ? callbacksQuery.error.message
      : 'Failed to load callbacks'
    : null

  return {
    callbacks: callbacksQuery.data ?? [],
    loading: callbacksQuery.isLoading,
    isFetching: callbacksQuery.isFetching,
    error,
    refresh,
    markCompleted: (id: number | string) => completeMutation.mutateAsync(id),
    markCancelled: (id: number | string) => cancelMutation.mutateAsync(id),
    reschedule: (id: number | string, scheduledAt: string, notes?: string) =>
      rescheduleMutation.mutateAsync({ id, scheduledAt, notes }),
  }
}
