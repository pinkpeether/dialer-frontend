import { useState, useEffect } from 'react'
import { useSocket } from './useSocket'

interface AgentStatusEvent {
  agentId: number
  status:  string
  name:    string
}

interface CallEvent {
  callId:    number
  agentId:   number
  agentName: string
  phone:     string
  name:      string
  duration?: number
  status?:   string
}

export const useLiveDashboard = () => {
  const { on } = useSocket()

  const [agentStatuses, setAgentStatuses] = useState<Record<number, string>>({})
  const [activeCalls,   setActiveCalls]   = useState<CallEvent[]>([])
  const [recentCalls,   setRecentCalls]   = useState<CallEvent[]>([])

  useEffect(() => {
    const offStatus = on('agent:statusChanged', (data: unknown) => {
      const e = data as AgentStatusEvent
      setAgentStatuses(prev => ({ ...prev, [e.agentId]: e.status }))
    })

    const offCallStart = on('call:started', (data: unknown) => {
      const e = data as CallEvent
      setActiveCalls(prev => [...prev.filter(c => c.agentId !== e.agentId), e])
    })

    const offCallEnd = on('call:ended', (data: unknown) => {
      const e = data as CallEvent
      setActiveCalls(prev => prev.filter(c => c.callId !== e.callId))
      setRecentCalls(prev => [e, ...prev].slice(0, 20))
    })

    return () => {
      offStatus?.()
      offCallStart?.()
      offCallEnd?.()
    }
  }, [on])

  return { agentStatuses, activeCalls, recentCalls }
}