import { useState, useEffect } from 'react'
import { useSocket } from './useSocket'
import { AGENT_STATUS_EVENTS, SOCKET_EVENTS } from '../constants/socketEvents'

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
    const handleStatus = (data: unknown) => {
      const e = data as AgentStatusEvent
      if (!e.agentId) return
      setAgentStatuses(prev => ({ ...prev, [e.agentId]: e.status }))
    }

    const offStatusListeners = AGENT_STATUS_EVENTS.map(event => on(event, handleStatus))

    const offCallStart = on(SOCKET_EVENTS.CALL_STARTED, (data: unknown) => {
      const e = data as CallEvent
      if (!e.agentId) return
      setActiveCalls(prev => [...prev.filter(c => c.agentId !== e.agentId), e])
    })

    const offCallEnd = on(SOCKET_EVENTS.CALL_ENDED, (data: unknown) => {
      const e = data as CallEvent
      if (!e.callId) return
      setActiveCalls(prev => prev.filter(c => c.callId !== e.callId))
      setRecentCalls(prev => [e, ...prev].slice(0, 20))
    })

    return () => {
      offStatusListeners.forEach(cleanup => cleanup())
      offCallStart()
      offCallEnd()
    }
  }, [on])

  return { agentStatuses, activeCalls, recentCalls }
}
