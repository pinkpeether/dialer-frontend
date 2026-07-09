import { create } from 'zustand'
import type { WorkforceFilters, WorkforceRange } from '../types/workforceIntelligence.types'

const isoDate = (date: Date) => date.toISOString().slice(0, 10)

const rangeDates = (range: WorkforceRange) => {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)

  if (range === 'weekly') start.setDate(now.getDate() - 6)
  else if (range === 'monthly') start.setMonth(now.getMonth() - 1)
  else if (range === 'quarterly') start.setMonth(now.getMonth() - 3)
  else if (range === 'yearly') start.setFullYear(now.getFullYear() - 1)

  return { from: isoDate(start), to: isoDate(end) }
}

const initialRange = rangeDates('weekly')

type WorkforceIntelligenceStore = {
  filters: WorkforceFilters
  setRange: (range: WorkforceRange) => void
  setDateRange: (from: string, to: string) => void
  setAgentId: (agentId: WorkforceFilters['agentId']) => void
  setRole: (role: WorkforceFilters['role']) => void
  setRisk: (risk: WorkforceFilters['risk']) => void
}

export const useWorkforceIntelligenceStore = create<WorkforceIntelligenceStore>((set) => ({
  filters: {
    range: 'weekly',
    from: initialRange.from,
    to: initialRange.to,
    agentId: 'all',
    role: 'all',
    risk: 'all',
  },
  setRange: (range) => set(state => ({
    filters: {
      ...state.filters,
      range,
      ...(range === 'custom' ? {} : rangeDates(range)),
    },
  })),
  setDateRange: (from, to) => set(state => ({ filters: { ...state.filters, range: 'custom', from, to } })),
  setAgentId: (agentId) => set(state => ({ filters: { ...state.filters, agentId } })),
  setRole: (role) => set(state => ({ filters: { ...state.filters, role } })),
  setRisk: (risk) => set(state => ({ filters: { ...state.filters, risk } })),
}))
