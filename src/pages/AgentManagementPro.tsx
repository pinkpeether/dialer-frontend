import { useCallback, useEffect, useMemo, useState } from 'react'
import { Crown, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import AgentLeaderboardPanel from '../components/AgentLeaderboardPanel'
import { agentManagementAPI } from '../api/agentManagement.api'

type Overview = {
  generatedAt: string
  totals: {
    totalAgents: number
    readyAgents: number
    busyAgents: number
    offlineAgents: number
    activeSessionCount: number
    totalCalls: number
    answeredCalls: number
    answerRate: number
    talkSeconds: number
  }
  reminders: Array<{
    agentId: number
    name: string
    email: string
    status: string
    minutesSinceStatusChange: number
    severity: string
  }>
}

type LeaderboardResponse = {
  leaderboard: Array<{
    rank: number
    agentId: number
    name: string
    email: string
    agentCode?: string | null
    status?: string | null
    totalCalls: number
    answeredCalls: number
    callbacks: number
    answerRate: number
    talkSeconds: number
    points: number
    badge: string
  }>
}

type ShiftResponse = {
  shifts: Array<{
    agentId: number
    name: string
    email: string
    agentCode?: string | null
    role: string
    status: string
    startTime: string
    endTime: string
    timezone: string
    breakEveryMinutes: number
    activeSession: boolean
    reminder: {
      shouldNotify: boolean
      minutesSinceStatusChange: number
      severity: string
    }
  }>
}

type SessionsResponse = {
  sessions: Array<{
    agentId: number
    userEmail?: string
    clientFingerprint: string
    startedAt: string
    lastSeenAt: string
    ipAddress?: string | null
  }>
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="ptdt-pro-kpi">
      <div className="ptdt-pro-kpi-label">{label}</div>
      <div className="ptdt-pro-kpi-value">{value}</div>
      {sub ? <div className="ptdt-pro-kpi-note">{sub}</div> : null}
    </div>
  )
}

const createFingerprint = () => {
  const existing = localStorage.getItem('ptdt-agent-client-fingerprint')
  if (existing) return existing
  const generated = ['ptdt', Date.now().toString(36), Math.random().toString(36).slice(2), navigator.userAgent.slice(0, 20).replace(/\W/g, '')].join('-')
  localStorage.setItem('ptdt-agent-client-fingerprint', generated)
  return generated
}

export default function AgentManagementPro() {
  const [days, setDays] = useState(7)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [shifts, setShifts] = useState<ShiftResponse | null>(null)
  const [sessions, setSessions] = useState<SessionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [overviewData, leaderboardData, shiftData, sessionData] = await Promise.all([
        agentManagementAPI.getOverview({ days }),
        agentManagementAPI.getLeaderboard({ days, limit: 20 }),
        agentManagementAPI.getShifts(),
        agentManagementAPI.getSessions(),
      ])
      setOverview(overviewData)
      setLeaderboard(leaderboardData)
      setShifts(shiftData)
      setSessions(sessionData)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load agent management data')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  const handleStartSession = async () => {
    setMessage('')
    try {
      await agentManagementAPI.startSession(createFingerprint())
      setMessage('Single-session guard started for this device.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to start session')
    }
  }

  const handleEndSession = async () => {
    setMessage('')
    try {
      await agentManagementAPI.endSession()
      setMessage('Session ended for this device.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to end session')
    }
  }

  const activeReminders = useMemo(() => overview?.reminders || [], [overview])

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Users size={12} /> Agent Operations
          </div>
          <h1 className="ptdt-page-title">
            Agent <span className="gradient-brand-text">Management Pro</span>
          </h1>
          <p className="ptdt-page-desc">
            Shift board, break reminders, leaderboard, performance summary, and single-device session guardrails for Admin and Supervisor review.
          </p>
        </div>
        <div className="ptdt-toolbar">
          <select
            value={days}
            onChange={event => setDays(Number(event.target.value))}
            style={{ minHeight: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', color: 'var(--text)', padding: '0 14px', fontWeight: 800 }}
          >
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button className="ptdt-action-btn" type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {message ? (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: message.toLowerCase().includes('failed') ? 'var(--danger)' : 'var(--text-2)' }}>
          {message}
        </div>
      ) : null}

      <div className="ptdt-pro-kpis" style={{ marginBottom: 18 }}>
        <StatCard label="Agents" value={overview?.totals.totalAgents ?? '—'} sub="Active users in dialer roles" />
        <StatCard label="Ready" value={overview?.totals.readyAgents ?? '—'} sub="Available for routing" />
        <StatCard label="Answer Rate" value={`${overview?.totals.answerRate ?? 0}%`} sub={`${overview?.totals.answeredCalls ?? 0} answered calls`} />
        <StatCard label="Sessions" value={overview?.totals.activeSessionCount ?? '—'} sub="Single-session guard" />
      </div>

      <div className="ptdt-pro-grid sidebar agent-management-grid" style={{ marginBottom: 18 }}>
        <AgentLeaderboardPanel entries={leaderboard?.leaderboard || []} loading={loading} />

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="ptdt-card" style={{ padding: 18 }}>
            <div className="eyebrow purple" style={{ marginBottom: 10 }}>
              <ShieldCheck size={12} /> Single Session
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Device Guard</h2>
            <p style={{ color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
              Prevent the same agent account from being active on multiple devices during pilot operations.
            </p>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginTop: 16 }}>
              <button type="button" className="btn-brand" onClick={() => void handleStartSession()}>Start My Session</button>
              <button type="button" className="ptdt-action-btn" onClick={() => void handleEndSession()}>End My Session</button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {(sessions?.sessions || []).slice(0, 6).map(session => (
                <div key={`${session.agentId}-${session.clientFingerprint}`} className="glass" style={{ padding: 12, borderRadius: 16 }}>
                  <div style={{ fontWeight: 800 }}>{session.userEmail || `Agent #${session.agentId}`}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
                    Last seen: {new Date(session.lastSeenAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {sessions?.sessions?.length === 0 ? (
                <div className="glass" style={{ padding: 12, borderRadius: 16, color: 'var(--text-3)' }}>No active guarded sessions.</div>
              ) : null}
            </div>
          </section>

          <section className="ptdt-card" style={{ padding: 18 }}>
            <div className="eyebrow gold" style={{ marginBottom: 10 }}>
              <Crown size={12} /> Break Reminders
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Needs Attention</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {activeReminders.length === 0 ? (
                <div className="glass" style={{ padding: 14, borderRadius: 16, color: 'var(--green-2)' }}>No active break reminders.</div>
              ) : activeReminders.map(reminder => (
                <div key={reminder.agentId} className="glass" style={{ padding: 14, borderRadius: 16 }}>
                  <div style={{ fontWeight: 800 }}>{reminder.name}</div>
                  <div style={{ color: 'var(--text-3)', marginTop: 4, fontSize: 13 }}>
                    {reminder.minutesSinceStatusChange} minutes in {reminder.status}. Severity: {reminder.severity}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="ptdt-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div className="eyebrow cyan" style={{ marginBottom: 10 }}>Shift Management</div>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Today&apos;s Shift Board</h2>
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: 12.5 }}>Default 09:00–17:00 Asia/Karachi unless overridden.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {(shifts?.shifts || []).map(shift => (
            <div key={shift.agentId} className="glass" style={{ padding: 14, borderRadius: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{shift.name}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>{shift.email}</div>
                </div>
                <span className="ptdt-chip">{shift.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14, color: 'var(--text-3)', fontSize: 12.5, fontWeight: 700 }}>
                <span>Start: {shift.startTime}</span>
                <span>End: {shift.endTime}</span>
                <span>Break: {shift.breakEveryMinutes}m</span>
                <span>Session: {shift.activeSession ? 'Active' : 'None'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ptdt-card" style={{ padding: 14, marginTop: 16, color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.6 }}>
        Pilot note: session and shift override state is in-memory to avoid a DB migration in this delivery. For multi-instance Railway workers, durable single-session enforcement should later move to a DB table or Redis.
      </div>

      <style>{`
        @media (max-width: 980px) {
          .agent-management-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
