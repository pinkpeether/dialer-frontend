import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { campaignsAPI } from '../api/campaigns.api'

export const useCampaigns = (params?: Record<string, unknown>) => {
  const queryClient = useQueryClient()
  const paramsKey = JSON.stringify(params ?? {})
  const stableParams = useMemo(() => JSON.parse(paramsKey) as typeof params, [paramsKey])

  const campaignsQuery = useQuery({
    queryKey: ['campaigns', stableParams ?? {}],
    queryFn: async () => {
      const listData = await campaignsAPI.getAll(stableParams)
      const statsData = await campaignsAPI.getStats()
        .then(value => value as Record<string, unknown>)
        .catch(() => null)
      return {
        campaigns: (listData?.campaigns || []) as Record<string, unknown>[],
        pagination: (listData?.pagination || null) as Record<string, unknown> | null,
        stats: statsData,
      }
    },
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
      queryClient.invalidateQueries({ queryKey: ['monitoring'] }),
      queryClient.invalidateQueries({ queryKey: ['ops'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => campaignsAPI.create(data),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => campaignsAPI.update(id, data),
    onSuccess: invalidate,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => campaignsAPI.updateStatus(id, status),
    onSuccess: invalidate,
  })

  const cloneMutation = useMutation({
    mutationFn: (id: number) => campaignsAPI.clone(id),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignsAPI.delete(id),
    onSuccess: invalidate,
  })

  const error = campaignsQuery.error
    ? (campaignsQuery.error as Error).message || 'Failed to load campaigns'
    : null

  return {
    campaigns: campaignsQuery.data?.campaigns ?? [],
    stats: campaignsQuery.data?.stats ?? null,
    pagination: campaignsQuery.data?.pagination ?? null,
    loading: campaignsQuery.isLoading,
    isFetching: campaignsQuery.isFetching,
    error,
    refetch: campaignsQuery.refetch,
    createCampaign: (data: Record<string, unknown>) => createMutation.mutateAsync(data),
    updateCampaign: (id: number, data: Record<string, unknown>) => updateMutation.mutateAsync({ id, data }),
    updateStatus: (id: number, status: string) => statusMutation.mutateAsync({ id, status }),
    cloneCampaign: (id: number) => cloneMutation.mutateAsync(id),
    deleteCampaign: (id: number) => deleteMutation.mutateAsync(id),
  }
}
