import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Headset, Phone, Shield } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { agentsAPI } from '../api/agents.api'
import { AGENT_STATUS_EVENTS } from '../constants/socketEvents'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from '../components/CustomerAccordionHeader'

type AgentStatus = 'OFFLINE' | 'ONLINE' | 'READY' | 'BUSY' | 'WRAP_UP'
type CustomerAccount = { id: number | null; name: string; code: string; status: string }
type AgentRow = { id: number | string; name: string; agentCode: string; status: AgentStatus; callsToday?: number; activeSince?: number; commercialAccount: CustomerAccount | null }
type CustomerGroup = CustomerAccount & { key: string; agents: AgentRow[] }

const STATUS_THEME: Record<AgentStatus, { color: string; bg: string; dot: string; label: string }> = {
  OFFLINE: { color: 'var(--text-3)', bg: 'var(--bg-glass)', dot: 'rgba(255,255,255,0.20)', label: 'Offline' },
  ONLINE: { color: '#00a747', bg: 'rgba(0,167,71,0.10)', dot: '#00a747', label: 'Online' },
  READY: { color: '#00a747', bg: 'rgba(0,167,71,0.10)', dot: '#00a747', label: 'Ready' },
  BUSY: { color: '#fb0b8c', bg: 'rgba(251,11,140,0.10)', dot: '#fb0b8c', label: 'On Call' },
  WRAP_UP: { color: '#f0b90b', bg: 'rgba(240,185,11,0.12)', dot: '#f0b90b', label: 'Wrap Up' },
}

const formatTimer = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const str = (v: unknown, fb = '') => typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fb
const num = (v: unknown, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb }

const normalizeStatus = (v: unknown): AgentStatus => {
  const s = String(v || '').toUpperCase()
  return (['OFFLINE', 'ONLINE', 'READY', 'BUSY', 'WRAP_UP'] as AgentStatus[]).includes(s as AgentStatus) ? (s as AgentStatus) : 'OFFLINE'
}

const accountForAgent = (agent: Record<string, unknown>): CustomerAccount | null => {
  const direct = agent.commercialAccount as Record<string, unknown> | null | undefined
  const list = agent.commercialAccounts as Record<string, unknown>[] | undefined
  const account = direct?.id || direct?.name ? direct : Array.isArray(list) && list.length ? list[0] : null
  if (!account) return null
  return { id: account.id ? Number(account.id) : null, name: str(account.name, 'PTDT Super Admin'), code: str(account.code, '—'), status: str(account.status, '—') }
}

const groupAgentsByCustomer = (agents: AgentRow[]) => {
  const map = new Map<string, CustomerGroup>()
  agents.forEach(agent => {
    const account = agent.commercialAccount || { id: null, name: 'PTDT Super Admin', code: '—', status: '—' }
    const key = account.id ? `account-${account.id}` : 'account-unassigned'
    if (!map.has(key)) map.set(key, { ...account, key, agents: [] })
    map.get(key)?.agents.push(agent)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export default function Supervisor() {
  const { on } = useSocket()
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [elapsed, setElapsed] = useState<Record<string | number, number>>({})
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const agentsQuery = useQuery<AgentRow[]>({
    queryKey: ['supervisor', 'agents'],
    queryFn: async () => {
      const data = await agentsAPI.getAll({ limit: 200 })
      const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.agents) ? data.agents : []
      return list.map((a: unknown) => {
        const agent = a as Record<string, unknown>
        const status = normalizeStatus(agent.status)
        return { id: agent.id as number | string, name: str(agent.name || agent.fullName, 'Agent'), agentCode: str(agent.agentCode || agent.code, '—'), status, callsToday: num(agent.callsToday ?? agent.todayCalls), activeSince: status === 'BUSY' ? Date.now() : undefined, commercialAccount: accountForAgent(agent) }
      })
    },
    staleTime: 30 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  useEffect(() => {
    if (!agentsQuery.data) return
    setAgents(prev => agentsQuery.data.map(row => {
      const existing = prev.find(agent => String(agent.id) === String(row.id))
      if (row.status === 'BUSY' && existing?.status === 'BUSY' && existing.activeSince) return { ...row, activeSince: existing.activeSince }
      return row
    }))
    setLastRefresh(new Date())
  }, [agentsQuery.data])

  const loading = agentsQuery.isLoading

  useEffect(() => {
    const handler = (data: unknown) => {
      const payload = data as Record<string, unknown>
      const agentId = payload.agentId ?? payload.id
      const newStatus = normalizeStatus(payload.status)
      if (!agentId) return
      setAgents(prev => prev.map(a => String(a.id) !== String(agentId) ? a : { ...a, status: newStatus, activeSince: newStatus === 'BUSY' ? Date.now() : undefined }))
    }
    const cleanups = AGENT_STATUS_EVENTS.map(event => on(event, handler))
    return () => { cleanups.forEach(cleanup => cleanup()) }
  }, [on])

  useEffect(() => {
    const t = window.setInterval(() => {
      setElapsed(prev => {
        const next = { ...prev }
        for (const agent of agents) {
          if (agent.status === 'BUSY' && agent.activeSince) next[agent.id] = Math.floor((Date.now() - agent.activeSince) / 1000)
          else delete next[agent.id]
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [agents])

  const counts = useMemo(() => ({ total: agents.length, online: agents.filter(a => a.status === 'ONLINE').length, ready: agents.filter(a => a.status === 'READY').length, busy: agents.filter(a => a.status === 'BUSY').length, wrapUp: agents.filter(a => a.status === 'WRAP_UP').length, offline: agents.filter(a => a.status === 'OFFLINE').length }), [agents])
  const groupedAccounts = useMemo(() => groupAgentsByCustomer(agents), [agents])
  const toggleGroup = (key: string, currentlyOpen = false) => setExpandedGroups(prev => ({ ...prev, [key]: !currentlyOpen }))

  const renderAgentCard = (agent: AgentRow, index: number) => {
    const theme = STATUS_THEME[agent.status]
    const callSecs = elapsed[agent.id] ?? 0
    return <motion.div key={agent.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.18) }} className="glass lift" style={{ padding: 18, borderTop: `2px solid ${theme.color}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}><div style={{ position: 'relative' }}><div style={{ width: 38, height: 38, borderRadius: 14, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{agent.name.charAt(0).toUpperCase()}</div><span style={{ position: 'absolute', bottom: -2, right: -2, width: 11, height: 11, borderRadius: '50%', background: theme.dot, border: '2px solid var(--surface)' }} /></div><div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{agent.agentCode}</div></div></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><span className="badge" style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.color}`, fontWeight: 900, fontSize: 11 }}>{theme.label}</span>{agent.status === 'BUSY' && <span className="mono" style={{ fontSize: 13, fontWeight: 900, color: 'var(--pink)', letterSpacing: 0.5 }}>{formatTimer(callSecs)}</span>}</div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: 'var(--text-3)', paddingTop: 10, borderTop: '1px solid var(--border)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Activity size={11} color="var(--pink)" /><span>{agent.callsToday ?? 0} calls today</span></div>{agent.status === 'BUSY' && <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--pink)' }}><Phone size={11} /><span style={{ fontWeight: 800 }}>Live</span></div>}</div>
    </motion.div>
  }

  return <div className="ptdt-page">
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}><div className="eyebrow pink" style={{ marginBottom: 14 }}><Shield size={11} /> PTDT-Dialer Supervisor</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}><div><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>Supervisor <span className="gradient-brand-text">Monitor</span></h1><p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span className="pulse-dot pink" />Live agent grid grouped by customer — refreshes every 30s. Last: {lastRefresh.toLocaleTimeString()}</p></div></div></motion.div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>{[{ label: 'Total Agents', value: counts.total, color: 'var(--pink)' }, { label: 'Online', value: counts.online, color: '#00a747' }, { label: 'Ready', value: counts.ready, color: '#00a747' }, { label: 'On Call', value: counts.busy, color: '#fb0b8c' }, { label: 'Wrap Up', value: counts.wrapUp, color: '#f0b90b' }, { label: 'Offline', value: counts.offline, color: 'var(--text-3)' }].map(card => <div key={card.label} className="glass lift" style={{ padding: '14px 16px' }}><div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: 1.2, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div><div style={{ fontSize: 26, fontWeight: 900, color: card.color }}>{card.value}</div></div>)}</div>
    {loading ? <div className="glass" style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Loading agents…</div> : agents.length === 0 ? <div className="glass" style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}><Headset size={36} style={{ marginBottom: 12, opacity: 0.3 }} /><div>No agents found — ensure backend returns data from <span className="mono">/agents</span></div></div> : <div style={{ display: 'grid', gap: 12 }}>{groupedAccounts.map((group, groupIndex) => {
      const isOpen = expandedGroups[group.key] ?? groupIndex === 0
      const online = group.agents.filter(agent => agent.status === 'ONLINE').length
      const ready = group.agents.filter(agent => agent.status === 'READY').length
      const busy = group.agents.filter(agent => agent.status === 'BUSY').length
      const offline = group.agents.filter(agent => agent.status === 'OFFLINE').length
      return <div key={group.key} className="glass" style={{ overflow: 'hidden' }}><CustomerAccordionHeader isOpen={isOpen} onClick={() => toggleGroup(group.key, isOpen)} name={group.name} meta={`Customer Code: ${group.code} · Status: ${group.status}`} badges={[{ label: `${group.agents.length} Agents` }, { label: `${online} Online`, color: '#00a747', bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }, { label: `${ready} Ready`, color: '#00a747', bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }, { label: `${busy} On Call`, color: '#fb0b8c', bg: 'rgba(251,11,140,.10)', border: '1px solid rgba(251,11,140,.28)' }, { label: `${offline} Offline`, color: 'var(--text-3)', bg: 'var(--bg-2)', border: '1px solid var(--border)' }]} />{isOpen && <div style={{ ...customerAccordionBodyStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, padding: 16 }}>{group.agents.map(renderAgentCard)}</div>}</div>
    })}</div>}
  </div>
}
