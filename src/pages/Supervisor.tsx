import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Activity, Headset, Phone, RefreshCw, Shield } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { agentsAPI } from '../api/agents.api'
import { AGENT_STATUS_EVENTS } from '../constants/socketEvents'

type AgentStatus = 'OFFLINE' | 'READY' | 'BUSY' | 'WRAP_UP'

type AgentRow = {
  id: number | string
  name: string
  agentCode: string
  status: AgentStatus
  callsToday?: number
  activeCallDuration?: number    // seconds, present when BUSY
  activeSince?: number           // timestamp
}

const STATUS_THEME: Record<AgentStatus, { color: string; bg: string; dot: string; label: string }> = {
  OFFLINE: { color: 'var(--text-3)', bg: 'var(--bg-glass)',            dot: 'rgba(255,255,255,0.20)', label: 'Offline' },
  READY:   { color: '#00a747',       bg: 'rgba(0,167,71,0.10)',        dot: '#00a747',                label: 'Ready' },
  BUSY:    { color: '#fb0b8c',       bg: 'rgba(251,11,140,0.10)',      dot: '#fb0b8c',                label: 'On Call' },
  WRAP_UP: { color: '#f0b90b',       bg: 'rgba(240,185,11,0.12)',      dot: '#f0b90b',                label: 'Wrap Up' },
}

const formatTimer = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

const str = (v: unknown, fb = '') => typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fb
const num = (v: unknown, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb }

const normalizeStatus = (v: unknown): AgentStatus => {
  const s = String(v || '').toUpperCase()
  return (['OFFLINE', 'READY', 'BUSY', 'WRAP_UP'] as AgentStatus[]).includes(s as AgentStatus)
    ? (s as AgentStatus)
    : 'OFFLINE'
}

export default function Supervisor() {
  const { on } = useSocket()
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState<Record<string | number, number>>({})
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agentsAPI.getAll()
      const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.agents) ? data.agents : []
      const rows = list.map((a: unknown) => {
        const agent = a as Record<string, unknown>
        const status = normalizeStatus(agent.status)
        const id = agent.id as number | string
        return {
          id,
          name: str(agent.name || agent.fullName, 'Agent'),
          agentCode: str(agent.agentCode || agent.code, '—'),
          status,
          callsToday: num(agent.callsToday ?? agent.todayCalls),
          activeSince: status === 'BUSY' ? Date.now() : undefined,
        }
      })

      setAgents(prev => rows.map(row => {
        const existing = prev.find(agent => String(agent.id) === String(row.id))
        if (row.status === 'BUSY' && existing?.status === 'BUSY' && existing.activeSince) {
          return { ...row, activeSince: existing.activeSince }
        }
        return row
      }))
      setLastRefresh(new Date())
    } catch {
      // Keep empty — backend may not have /agents yet
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount + 30s polling
  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(t)
  }, [load])

  // Socket: live agent status updates
  useEffect(() => {
    const handler = (data: unknown) => {
      const payload = data as Record<string, unknown>
      const agentId = payload.agentId ?? payload.id
      const newStatus = normalizeStatus(payload.status)
      if (!agentId) return

      setAgents(prev => prev.map(a => {
        if (String(a.id) !== String(agentId)) return a
        return {
          ...a,
          status: newStatus,
          activeSince: newStatus === 'BUSY' ? Date.now() : undefined,
        }
      }))
    }

    const cleanups = AGENT_STATUS_EVENTS.map(event => on(event, handler))
    return () => { cleanups.forEach(cleanup => cleanup()) }
  }, [on])

  // Call duration ticker — update every second for BUSY agents
  useEffect(() => {
    const t = window.setInterval(() => {
      setElapsed(prev => {
        const next = { ...prev }
        for (const agent of agents) {
          if (agent.status === 'BUSY' && agent.activeSince) {
            next[agent.id] = Math.floor((Date.now() - agent.activeSince) / 1000)
          } else {
            delete next[agent.id]
          }
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [agents])

  const counts = useMemo(() => ({
    total: agents.length,
    ready: agents.filter(a => a.status === 'READY').length,
    busy: agents.filter(a => a.status === 'BUSY').length,
    wrapUp: agents.filter(a => a.status === 'WRAP_UP').length,
    offline: agents.filter(a => a.status === 'OFFLINE').length,
  }), [agents])

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <Shield size={11} /> PTDT-Dialer Supervisor
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
              Supervisor <span className="gradient-brand-text">Monitor</span>
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot pink" />
              Live agent grid — refreshes every 30s. Last: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            style={{ height: 42, width: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Agents', value: counts.total, color: 'var(--pink)',    bg: 'rgba(251,11,140,0.10)' },
          { label: 'Ready',        value: counts.ready, color: '#00a747',        bg: 'rgba(0,167,71,0.10)' },
          { label: 'On Call',      value: counts.busy,  color: '#fb0b8c',        bg: 'rgba(251,11,140,0.10)' },
          { label: 'Wrap Up',      value: counts.wrapUp, color: '#f0b90b',       bg: 'rgba(240,185,11,0.12)' },
          { label: 'Offline',      value: counts.offline, color: 'var(--text-3)', bg: 'var(--bg-glass)' },
        ].map(card => (
          <div key={card.label} className="glass lift" style={{ padding: '14px 16px' }}>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: 1.2, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      {loading ? (
        <div className="glass" style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Loading agents…</div>
      ) : agents.length === 0 ? (
        <div className="glass" style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
          <Headset size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>No agents found — ensure backend returns data from <span className="mono">/agents</span></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {agents.map((agent, i) => {
            const theme = STATUS_THEME[agent.status]
            const callSecs = elapsed[agent.id] ?? 0

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass lift"
                style={{ padding: 18, borderTop: `2px solid ${theme.color}33` }}
              >
                {/* Agent identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 14, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ position: 'absolute', bottom: -2, right: -2, width: 11, height: 11, borderRadius: '50%', background: theme.dot, border: '2px solid var(--surface)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {agent.name}
                    </div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
                      {agent.agentCode}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="badge" style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.color}`, fontWeight: 900, fontSize: 11 }}>
                    {theme.label}
                  </span>
                  {agent.status === 'BUSY' && (
                    <span className="mono" style={{ fontSize: 13, fontWeight: 900, color: 'var(--pink)', letterSpacing: 0.5 }}>
                      {formatTimer(callSecs)}
                    </span>
                  )}
                </div>

                {/* Today stats */}
                <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: 'var(--text-3)', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Activity size={11} color="var(--pink)" />
                    <span>{agent.callsToday ?? 0} calls today</span>
                  </div>
                  {agent.status === 'BUSY' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--pink)' }}>
                      <Phone size={11} />
                      <span style={{ fontWeight: 800 }}>Live</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
