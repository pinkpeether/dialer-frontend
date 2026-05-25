import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, type Socket } from 'socket.io-client'
import {
  Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Clock,
  Headphones, Mic, MicOff, Phone, PhoneCall, PhoneOff,
  Radio, RefreshCw, ShieldCheck, UserRound, Wifi,
} from 'lucide-react'
import DispositionPanel, { type DispositionSubmitPayload } from '../components/DispositionPanel'
import { callsAPI } from '../api/calls.api'
import { campaignsAPI } from '../api/campaigns.api'
import { agentsAPI } from '../api/agents.api'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'OFFLINE' | 'READY' | 'BUSY' | 'WRAP_UP'

type SocketIncomingPayload = {
  callId?: number
  contactId?: number
  name?: string
  phone?: string
  campaignName?: string
  contact?: {
    id?: number
    name?: string | null
    phone?: string | null
    campaign?: { name?: string | null } | null
  } | null
}

type ActiveCall = {
  callId: number
  contactId?: number
  name: string
  phone: string
  campaignName: string
  startedAt: number
}

type RecentCallRow = {
  id: number | string
  direction: 'inbound' | 'outbound'
  remoteNumber: string
  remoteName?: string
  status: string
  disposition?: string
  durationSeconds?: number
  createdAt: string
}

type LiveStats = {
  callsToday: number
  answeredToday: number
  avgDurationSeconds: number
  missedToday: number
  loading: boolean
}

type CampaignProgress = {
  id: number
  name: string
  status: string
  total: number
  answered: number
  pending: number
  failed: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusTheme: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  OFFLINE: { label: 'Offline', color: 'var(--text-3)',  bg: 'var(--bg-glass)' },
  READY:   { label: 'Ready',   color: 'var(--green-2)', bg: 'rgba(0,167,71,0.10)' },
  BUSY:    { label: 'Busy',    color: 'var(--pink)',    bg: 'rgba(251,11,140,0.10)' },
  WRAP_UP: { label: 'Wrap Up', color: 'var(--warning)', bg: 'rgba(240,185,11,0.12)' },
}

const formatTimer = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds < 1) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

const timeAgo = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString()
}

const getSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (explicit) return explicit
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000/api'
  return apiUrl.replace(/\/api\/?$/, '')
}

const normalizeIncomingCall = (payload: SocketIncomingPayload): ActiveCall | null => {
  const callId = Number(payload.callId)
  if (!Number.isFinite(callId)) return null
  return {
    callId,
    contactId: payload.contactId ?? payload.contact?.id,
    name: payload.name || payload.contact?.name || 'Unknown Contact',
    phone: payload.phone || payload.contact?.phone || '—',
    campaignName: payload.campaignName || payload.contact?.campaign?.name || 'Live Campaign',
    startedAt: Date.now(),
  }
}

const todayISO = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const extractList = <T,>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (!isRecord(payload)) return []

  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value as T[]
  }

  return []
}

const stringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const numberValue = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const nestedName = (value: unknown) => {
  if (!isRecord(value)) return ''
  return stringValue(value.name || value.title || value.fullName)
}

const normalizeToken = (value: unknown) => (
  stringValue(value).trim().toLowerCase().replace(/[\s-]+/g, '_')
)

const isAnsweredValue = (value: unknown) => {
  const token = normalizeToken(value)
  return token === 'answered' || token === 'completed' || token === 'complete'
}

const isMissedValue = (value: unknown) => {
  const token = normalizeToken(value)
  return token === 'missed' || token === 'no_answer' || token === 'noanswer'
}

const displayOutcome = (status: unknown, disposition?: unknown) => {
  if (isAnsweredValue(disposition) || isAnsweredValue(status)) return 'ANSWERED'
  if (isMissedValue(disposition) || isMissedValue(status)) return 'MISSED'

  const token = normalizeToken(disposition || status)
  if (token === 'failed' || token === 'busy') return 'FAILED'
  if (token === 'queued' || token === 'pending') return 'QUEUED'
  if (token === 'in_progress' || token === 'calling' || token === 'active') return 'IN PROGRESS'
  return stringValue(disposition || status || 'UNKNOWN').toUpperCase()
}

const normalizeDirection = (value: unknown): RecentCallRow['direction'] => {
  const direction = normalizeToken(value)
  return direction === 'inbound' || direction === 'incoming' ? 'inbound' : 'outbound'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentDashboard() {
  const user = useAuthStore(state => state.user)
  const updateUser = useAuthStore(state => state.updateUser)
  const sipStatus = useSipStore(s => s.status)
  const sipConfig = useSipStore(s => s.config)

  const [agentStatus, setAgentStatus] = useState<AgentStatus>(() => {
    const savedStatus = user?.status as AgentStatus | undefined
    return savedStatus && statusTheme[savedStatus] ? savedStatus : 'OFFLINE'
  })
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [message, setMessage] = useState('')
  const socketRef = useRef<Socket | null>(null)

  // Live stats from API
  const [liveStats, setLiveStats] = useState<LiveStats>({
    callsToday: 0, answeredToday: 0, avgDurationSeconds: 0, missedToday: 0, loading: true,
  })

  // Recent calls
  const [recentCalls, setRecentCalls] = useState<RecentCallRow[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  // Campaign progress
  const [campaigns, setCampaigns] = useState<CampaignProgress[]>([])
  const [campaignLoading, setCampaignLoading] = useState(true)

  // ── Fetch live stats ─────────────────────────────────────────────────────

  const fetchLiveStats = useCallback(async () => {
    try {
      const today = todayISO()
      const data = await callsAPI.getAll(
        { startDate: today, endDate: today, limit: 200 },
        { timeout: 8000 }
      )
      const calls = extractList<Record<string, unknown>>(data, ['items', 'calls', 'results', 'data'])

      const answered = calls.filter(
        c => isAnsweredValue(c.status) || isAnsweredValue(c.disposition)
      )
      const missed = calls.filter(
        c => isMissedValue(c.status) || isMissedValue(c.disposition)
      )
      const durations = calls
        .map(c => numberValue(c.durationSeconds ?? c.duration ?? c.duration_seconds))
        .filter(d => d > 0)
      const avgDuration = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0

      setLiveStats({
        callsToday: calls.length,
        answeredToday: answered.length,
        missedToday: missed.length,
        avgDurationSeconds: avgDuration,
        loading: false,
      })
    } catch {
      setLiveStats(prev => ({ ...prev, loading: false }))
    }
  }, [])

  // ── Fetch recent calls ───────────────────────────────────────────────────

  const fetchRecentCalls = useCallback(async () => {
    setRecentLoading(true)
    try {
      const data = await callsAPI.getAll({ limit: 10, page: 1 }, { timeout: 8000 })
      const calls = extractList<Record<string, unknown>>(data, ['items', 'calls', 'results', 'data'])

      setRecentCalls(
        calls.map((c, index) => ({
          id: stringValue(c.id, `recent-${index}`),
          direction: normalizeDirection(c.direction || c.type),
          remoteNumber:
            stringValue(c.remoteNumber) ||
            stringValue(c.phone) ||
            stringValue(c.phoneNumber) ||
            stringValue(c.destination) ||
            stringValue(c.toNumber) ||
            stringValue(c.fromNumber) ||
            stringValue(c.to) ||
            stringValue(c.from) ||
            'Unknown number',
          remoteName:
            stringValue(c.remoteName) ||
            stringValue(c.name) ||
            stringValue(c.contactName) ||
            nestedName(c.contact) ||
            undefined,
          status: displayOutcome(c.status, c.disposition),
          disposition: stringValue(c.disposition) || undefined,
          durationSeconds: numberValue(c.durationSeconds ?? c.duration ?? c.duration_seconds) || undefined,
          createdAt: stringValue(c.createdAt || c.startedAt || c.updatedAt, new Date().toISOString()),
        }))
      )
    } catch {
      // keep empty
    } finally {
      setRecentLoading(false)
    }
  }, [])

  // ── Fetch campaign progress ──────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    setCampaignLoading(true)
    try {
      const data = await campaignsAPI.getAll({ status: 'ACTIVE', limit: 6 })
      const list = extractList<Record<string, unknown>>(data, ['campaigns', 'items', 'results', 'data'])

      setCampaigns(
        list.map(c => ({
          id: numberValue(c.id),
          name: stringValue(c.name, 'Campaign'),
          status: stringValue(c.status, 'ACTIVE'),
          total: numberValue(c.totalContacts ?? c.contactCount ?? c.total),
          answered: numberValue(c.answeredCount ?? c.answered ?? c.contacted),
          pending: numberValue(c.pendingCount ?? c.pending),
          failed: numberValue(c.failedCount ?? c.failed),
        }))
      )
    } catch {
      // keep empty
    } finally {
      setCampaignLoading(false)
    }
  }, [])

  // ── Auto-refresh every 60s ───────────────────────────────────────────────

  useEffect(() => {
    void fetchLiveStats()
    void fetchRecentCalls()
    void fetchCampaigns()

    const interval = window.setInterval(() => {
      void fetchLiveStats()
      void fetchRecentCalls()
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [fetchLiveStats, fetchRecentCalls, fetchCampaigns])

  // ── Socket ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('jd_token')
    if (!token) return

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      setMessage('✓ Realtime agent channel connected')
    })
    socket.on('disconnect', () => {
      setSocketConnected(false)
      setMessage('Realtime channel disconnected')
    })
    socket.on('call:incoming', (payload: SocketIncomingPayload) => {
      const incoming = normalizeIncomingCall(payload)
      if (!incoming) return
      setActiveCall(incoming)
      setElapsed(0)
      setMuted(false)
      setAgentStatus('BUSY')
      setMessage(`📞 Incoming call from ${incoming.phone}`)
    })
    socket.on('call:ended', () => {
      setActiveCall(null)
      setMuted(false)
      setAgentStatus('READY')
      setMessage('Call ended')
      // Refresh stats after call ends
      void fetchLiveStats()
      void fetchRecentCalls()
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [fetchLiveStats, fetchRecentCalls])

  // ── Call timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeCall) { setElapsed(0); return }
    const t = window.setInterval(() => setElapsed(s => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [activeCall])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const updateStatus = (next: AgentStatus) => {
    const previous = agentStatus
    setAgentStatus(next)
    setMessage(`Status changed to ${statusTheme[next].label}`)
    void agentsAPI.updateMyStatus(next)
      .then(() => {
        updateUser({ status: next })
        socketRef.current?.emit('agent:status', next)
      })
      .catch((err) => {
        setAgentStatus(previous)
        const msg = err instanceof Error ? err.message : 'Could not update agent status'
        setMessage(msg)
      })
  }

  const handleHangup = () => {
    if (!activeCall) return
    socketRef.current?.emit('call:hangup', { callId: activeCall.callId })
    setMessage('Hangup sent')
  }

  const handleDisposition = async (payload: DispositionSubmitPayload) => {
    if (!activeCall) return
    try {
      await callsAPI.updateDisposition(activeCall.callId, payload)
    } catch {
      socketRef.current?.emit('call:ended', {
        callId: activeCall.callId,
        disposition: payload.disposition,
        notes: payload.notes,
      })
    }
    setActiveCall(null)
    setMuted(false)
    setAgentStatus('READY')
    updateUser({ status: 'READY' })
    void agentsAPI.updateMyStatus('READY').catch(() => undefined)
    setMessage('✓ Disposition saved')
    void fetchLiveStats()
    void fetchRecentCalls()
  }

  const handleManualRefresh = () => {
    void fetchLiveStats()
    void fetchRecentCalls()
    void fetchCampaigns()
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const displayStats = useMemo(() => {
    const callsToday = liveStats.callsToday
    const answeredToday = liveStats.answeredToday
    const answerRate = callsToday > 0 ? Math.round((answeredToday / callsToday) * 100) : 0
    const avgDur = formatDuration(liveStats.avgDurationSeconds)
    return { callsToday, answeredToday, answerRate, avgDur }
  }, [liveStats])

  const sipLabel = sipConfig.enabled
    ? sipStatus === 'registered' ? 'SIP Registered' : sipStatus === 'in_call' ? 'SIP In Call' : 'SIP Offline'
    : 'SIP Disabled'
  const sipColor = sipStatus === 'registered' || sipStatus === 'in_call' ? 'var(--green-2)' : 'var(--text-3)'

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 32 }}
      >
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Headphones size={11} /> PTDT-Dialer Agent Desk
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.2vw,42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
            Agent <span className="gradient-brand-text">Dashboard</span>
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="pulse-dot pink" /> Live call handling, status control, and real-time performance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* SIP status pill */}
          <div className="glass" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot" style={{ background: sipColor }} />
            <div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800, letterSpacing: 1.1 }}>SIP</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: sipColor }}>{sipLabel}</div>
            </div>
          </div>

          {/* Socket status pill */}
          <div className="glass" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={socketConnected ? 'pulse-dot' : 'pulse-dot pink'} />
            <div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800, letterSpacing: 1.1 }}>REALTIME</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: socketConnected ? 'var(--green-2)' : 'var(--pink)' }}>
                {socketConnected ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          {/* Manual refresh */}
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh stats"
            style={{
              height: 42, width: 42, borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--bg-glass)',
              color: 'var(--text-3)',
              display: 'grid', placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      {/* ── Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT sidebar ── */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass"
          style={{ padding: 22, position: 'sticky', top: 24 }}
        >
          {/* Agent identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-pink)', color: '#fff' }}>
              <UserRound size={19} />
            </div>
            <div>
              <div className="display" style={{ fontSize: 16, color: 'var(--text)', fontWeight: 800 }}>
                {user?.name || 'Agent'}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 }}>
                {user?.agentCode || 'AGENT'} · {user?.role || 'AGENT'}
              </div>
            </div>
          </div>

          {/* Status buttons */}
          <div style={{ marginBottom: 18 }}>
            <div className="mono" style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10 }}>
              Agent Status
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['READY', 'WRAP_UP', 'OFFLINE'] as AgentStatus[]).map(item => {
                const active = agentStatus === item
                const theme = statusTheme[item]
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateStatus(item)}
                    disabled={agentStatus === 'BUSY' && item !== 'OFFLINE'}
                    style={{
                      cursor: agentStatus === 'BUSY' && item !== 'OFFLINE' ? 'not-allowed' : 'pointer',
                      padding: '12px 10px', borderRadius: 'var(--radius-md)',
                      border: active ? `1px solid ${theme.color}` : '1px solid var(--border)',
                      background: active ? theme.bg : 'var(--bg-glass)',
                      color: active ? theme.color : 'var(--text-3)',
                      fontWeight: 800, fontSize: 13,
                    }}
                  >
                    {theme.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Current state card */}
          <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', border: `1px solid ${statusTheme[agentStatus].color}`, background: statusTheme[agentStatus].bg, marginBottom: 18 }}>
            <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: 1.2, marginBottom: 6 }}>CURRENT STATE</div>
            <div style={{ color: statusTheme[agentStatus].color, fontSize: 22, fontWeight: 900 }}>{statusTheme[agentStatus].label}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
              {agentStatus === 'READY' ? 'Waiting for next routed call.'
                : agentStatus === 'BUSY' ? 'Active call in progress.'
                : 'Agent is not accepting calls.'}
            </div>
          </div>

          {message && (
            <div className="glass" style={{ padding: 13, color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.45 }}>
              {message}
            </div>
          )}
        </motion.aside>

        {/* ── RIGHT main ── */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <StatCard
              icon={<PhoneCall size={17} />}
              label="Calls Today"
              value={liveStats.loading ? '…' : displayStats.callsToday}
              color="var(--pink)" bg="rgba(251,11,140,0.10)"
            />
            <StatCard
              icon={<ShieldCheck size={17} />}
              label="Answer Rate"
              value={liveStats.loading ? '…' : `${displayStats.answerRate}%`}
              color="var(--green-2)" bg="rgba(0,167,71,0.10)"
            />
            <StatCard
              icon={<Clock size={17} />}
              label="Avg Duration"
              value={liveStats.loading ? '…' : displayStats.avgDur}
              color="var(--purple)" bg="rgba(128,87,215,0.12)"
            />
            <StatCard
              icon={<Wifi size={17} />}
              label="Missed Today"
              value={liveStats.loading ? '…' : liveStats.missedToday}
              color="var(--warning)" bg="rgba(240,185,11,0.10)"
            />
          </div>

          {/* ── Active call / idle panel ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ padding: 24, minHeight: 360 }}
          >
            <AnimatePresence mode="wait">
              {activeCall ? (
                <motion.div key="active-call" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div>
                      <div className="eyebrow pink" style={{ marginBottom: 10 }}>
                        <Radio size={11} /> Active Routed Call
                      </div>
                      <h2 className="display" style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 8 }}>
                        {activeCall.name}
                      </h2>
                      <div style={{ color: 'var(--text-3)', fontSize: 14 }}>
                        {activeCall.phone} · {activeCall.campaignName}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.2, marginBottom: 6 }}>LIVE TIMER</div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--pink)', fontFamily: 'var(--font-mono)' }}>
                        {formatTimer(elapsed)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                    <button type="button" onClick={() => setMuted(m => !m)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: muted ? 'rgba(240,185,11,0.12)' : 'var(--bg-glass)', color: muted ? 'var(--warning)' : 'var(--text)', fontWeight: 800 }}>
                      {muted ? <MicOff size={15} /> : <Mic size={15} />}
                      {muted ? 'Muted' : 'Mute'}
                    </button>
                    <button type="button" onClick={handleHangup} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(239,68,68,0.32)', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', fontWeight: 800 }}>
                      <PhoneOff size={15} /> Hang Up
                    </button>
                  </div>

                  <DispositionPanel onSubmit={handleDisposition} />
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ minHeight: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-3)' }}>
                  <div style={{ width: 82, height: 82, borderRadius: 26, background: 'linear-gradient(135deg,rgba(251,11,140,0.16),rgba(128,87,215,0.10))', border: '1px solid rgba(251,11,140,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: 'var(--pink)', boxShadow: 'var(--shadow-pink)' }}>
                    <Phone size={34} />
                  </div>
                  <h2 className="display" style={{ color: 'var(--text)', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
                    Waiting for next call
                  </h2>
                  <p style={{ maxWidth: 440, lineHeight: 1.7, fontSize: 14 }}>
                    Set your status to <strong style={{ color: 'var(--green-2)' }}>Ready</strong> to receive live routed calls from the PTDT-Dialer backend.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* ── Recent Calls timeline ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ padding: 24, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={16} color="var(--pink)" />
                <span className="display" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Recent Calls</span>
              </div>
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: 0.8 }}>AUTO-REFRESH 60s</span>
            </div>

            {recentLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
            ) : recentCalls.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No calls yet today.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentCalls.map((call, i) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr auto auto',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent',
                    }}
                  >
                    {/* Direction icon */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 10,
                      display: 'grid', placeItems: 'center',
                      background: call.direction === 'inbound' ? 'rgba(0,245,160,0.12)' : 'rgba(251,11,140,0.12)',
                      color: call.direction === 'inbound' ? 'var(--green-2)' : 'var(--pink)',
                    }}>
                      {call.direction === 'inbound'
                        ? <ArrowDownLeft size={14} />
                        : <ArrowUpRight size={14} />}
                    </div>

                    {/* Name + number */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {call.remoteName || call.remoteNumber}
                      </div>
                      {call.remoteName && (
                        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{call.remoteNumber}</div>
                      )}
                    </div>

                    {/* Disposition / status pill */}
                    <span style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                      background: call.disposition === 'ANSWERED' || call.status === 'ANSWERED'
                        ? 'rgba(0,167,71,0.14)' : 'rgba(255,59,95,0.12)',
                      color: call.disposition === 'ANSWERED' || call.status === 'ANSWERED'
                        ? 'var(--green-2)' : 'rgba(255,59,95,0.90)',
                      border: `1px solid ${call.disposition === 'ANSWERED' || call.status === 'ANSWERED' ? 'rgba(0,167,71,0.24)' : 'rgba(255,59,95,0.22)'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {call.disposition || call.status}
                    </span>

                    {/* Duration + time ago */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>
                        {formatDuration(call.durationSeconds)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{timeAgo(call.createdAt)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* ── Campaign progress ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ padding: 24, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <BarChart3 size={16} color="var(--pink)" />
              <span className="display" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Active Campaigns</span>
            </div>

            {campaignLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
            ) : campaigns.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No active campaigns.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {campaigns.map(camp => {
                  const pct = camp.total > 0 ? Math.min(100, Math.round(((camp.answered + camp.failed) / camp.total) * 100)) : 0
                  return (
                    <div key={camp.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{camp.name}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {camp.answered + camp.failed} / {camp.total || '?'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{
                          height: '100%', borderRadius: 999, width: `${pct}%`,
                          background: 'linear-gradient(90deg, var(--pink), var(--green-2))',
                          transition: 'width 0.6s ease',
                          boxShadow: '0 0 12px rgba(251,11,140,0.30)',
                        }} />
                      </div>

                      {/* Mini counters */}
                      <div style={{ display: 'flex', gap: 14 }}>
                        <span style={{ fontSize: 10.5, color: 'var(--green-2)', fontWeight: 700 }}>
                          ✓ {camp.answered} answered
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--warning)', fontWeight: 700 }}>
                          ◷ {camp.pending} pending
                        </span>
                        <span style={{ fontSize: 10.5, color: 'rgba(255,59,95,0.80)', fontWeight: 700 }}>
                          ✕ {camp.failed} failed
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.section>

        </main>
      </div>
    </div>
  )
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, bg }: {
  icon: ReactNode; label: string; value: string | number; color: string; bg: string
}) {
  return (
    <div className="glass lift" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, background: bg, border: `1px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.1, fontWeight: 800 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>{value}</div>
        </div>
      </div>
    </div>
  )
}
