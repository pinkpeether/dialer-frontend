import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Activity, AlertTriangle, Clock3, Fingerprint, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react'
import { agentsAPI } from '../api/agents.api'
import { attendanceIntegrityApi, type AttendanceOverviewRow } from '../api/attendanceIntegrity.api'
import { useAuthStore } from '../store/auth.store'

type TeamUser = {
  id: number | string
  name?: string | null
  email?: string | null
  role?: string | null
  status?: string | null
  isActive?: boolean
}

type TimeClockState = {
  clockedIn?: boolean
  startedAt?: number | null
  lastClockOutAt?: number | null
  sessionId?: string | null
}

type AttendanceSession = {
  id: string
  userId: number | string
  name: string
  email: string
  role: string
  clockInAt: number
  clockOutAt?: number | null
  workedSeconds?: number
  status: 'Clocked-In' | 'Clocked-Out'
  browser: string
  os: string
  timezone: string
}

const attendanceSessionsKey = 'ptdt-attendance:sessions'

const pageStyle: CSSProperties = {
  padding: '32px 36px',
  maxWidth: 1600,
  margin: '0 auto',
}

const cardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 22,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  boxShadow: 'var(--shadow-card)',
}

const headStyle: CSSProperties = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 950,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: 1.1,
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

const cellStyle: CSSProperties = {
  padding: '16px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
}

const pad = (value: number) => String(value).padStart(2, '0')

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
}

const formatDate = (value?: number | string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const cleanRole = (role?: string | null) => String(role || 'USER').replace(/_/g, ' ')

const cleanStatus = (status?: string | null) => String(status || 'OFFLINE').replace(/_/g, ' ')

const statusColor = (status: string) => {
  const next = status.toUpperCase()
  if (next.includes('CLOCKED-IN') || next.includes('READY') || next.includes('ONLINE')) return 'var(--green-2)'
  if (next.includes('FLAG') || next.includes('MISSED') || next.includes('DISCONNECT')) return 'var(--danger)'
  if (next.includes('REVIEW') || next.includes('PENDING') || next.includes('IDLE') || next.includes('BUSY')) return 'var(--warning)'
  return 'var(--text-3)'
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

const readSessions = () => readJson<AttendanceSession[]>(attendanceSessionsKey, []).filter(Boolean)

const latestSessionFor = (sessions: AttendanceSession[], user: TeamUser) => {
  const uid = String(user.id)
  return sessions.find(item => String(item.userId) === uid || (user.email && item.email === user.email)) || null
}

const localClockStateFor = (user: TeamUser) => readJson<TimeClockState>(`ptdt-timeclock:${user.id}`, { clockedIn: false, startedAt: null })

const readSessionText = (session: unknown, key: string) => {
  if (!session || typeof session !== 'object') return ''
  const value = (session as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'green' | 'pink' | 'gold' | 'red' | 'muted' }) {
  const color =
    tone === 'green' ? 'var(--green-2)' :
    tone === 'pink' ? 'var(--pink)' :
    tone === 'gold' ? 'var(--warning)' :
    tone === 'red' ? 'var(--danger)' :
    'var(--text-3)'
  return (
    <span className="mono" style={{
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: 28,
      padding: '0 11px',
      borderRadius: 999,
      border: `1px solid ${color}`,
      color,
      background: tone === 'muted' ? 'var(--bg-2)' : 'var(--bg-glass)',
      fontSize: 10.5,
      fontWeight: 950,
      letterSpacing: .8,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function MetricCard({ icon, label, value, tone = 'green' }: { icon: ReactNode; label: string; value: ReactNode; tone?: 'green' | 'pink' | 'gold' | 'red' }) {
  const color = tone === 'green' ? 'var(--green-2)' : tone === 'pink' ? 'var(--pink)' : tone === 'gold' ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color }}>
        {icon}
        <span className="mono" style={{ fontSize: 10, fontWeight: 950, letterSpacing: 1.3, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 30, fontWeight: 950, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default function AttendanceIntegrity() {
  const currentUser = useAuthStore(state => state.user)
  const [users, setUsers] = useState<TeamUser[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>(() => readSessions())
  const [backendRows, setBackendRows] = useState<AttendanceOverviewRow[]>([])
  const [backendSummary, setBackendSummary] = useState<{
    totalUsers: number
    clockedIn: number
    unexpectedDisconnects: number
    needsReview: number
    redFlags: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [, tick] = useState(0)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    setSessions(readSessions())
    try {
      const overview = await attendanceIntegrityApi.overview({ limit: 250 }, { silent })
      setBackendRows(overview.rows || [])
      setBackendSummary(overview.summary)
      setUsers((overview.rows || []).map(row => row.user))
    } catch (backendError) {
      try {
      const data = await agentsAPI.getAll({ limit: 250 }, { silent: true })
      const rows = Array.isArray(data?.agents) ? data.agents : Array.isArray(data) ? data : []
      const teamRows = rows
        .filter((row: TeamUser) => ['AGENT', 'SUPERVISOR'].includes(String(row.role || '').toUpperCase()))
        .map((row: TeamUser) => row)
      setUsers(teamRows)
      setBackendRows([])
      setBackendSummary(null)
      setError(`Backend attendance feed unavailable. Showing local fallback data. ${backendError instanceof Error ? backendError.message : ''}`.trim())
      } catch (err) {
        setBackendRows([])
        setBackendSummary(null)
        setError(err instanceof Error ? err.message : 'Could not load team users.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const refresh = window.setInterval(() => {
      setSessions(readSessions())
      tick(value => value + 1)
    }, 1000)
    return () => window.clearInterval(refresh)
  }, [])

  const rows = useMemo(() => {
    if (backendRows.length > 0) {
      return backendRows.map(row => ({
        user: row.user,
        role: String(row.user.role || '').toUpperCase(),
        session: row.session,
        clockStatus: cleanStatus(row.status),
        dialerStatus: cleanStatus(row.user.status),
        workedSeconds: row.activeSeconds || row.session?.totalWorkedSeconds || 0,
        needsReview: row.needsReview,
        clockInAt: row.session?.clockInAt || null,
        clockOutAt: row.session?.clockOutAt || null,
      }))
    }

    return users.map(user => {
    const localState = localClockStateFor(user)
    const session = latestSessionFor(sessions, user)
    const activeStartedAt = localState.clockedIn ? localState.startedAt || session?.clockInAt || null : null
    const workedSeconds = activeStartedAt
      ? Math.floor((Date.now() - activeStartedAt) / 1000)
      : session?.workedSeconds || 0
    const role = String(user.role || '').toUpperCase()
    const dialerStatus = cleanStatus(user.status)
    const clockStatus = localState.clockedIn ? 'Clocked-In' : session?.status || 'Awaiting Backend Feed'
    const needsReview = workedSeconds > 43_200 || clockStatus === 'Awaiting Backend Feed'
    return {
      user,
      role,
      session,
      clockStatus,
      dialerStatus,
      workedSeconds,
      needsReview,
      clockInAt: activeStartedAt || session?.clockInAt || null,
      clockOutAt: session?.clockOutAt || localState.lastClockOutAt || null,
    }
    })
  }, [backendRows, sessions, users])

  const clockedInCount = backendSummary?.clockedIn ?? rows.filter(row => row.clockStatus === 'Clocked-In' || row.clockStatus === 'CLOCKED IN').length
  const reviewCount = backendSummary?.needsReview ?? rows.filter(row => row.needsReview).length
  const supervisorCount = rows.filter(row => row.role === 'SUPERVISOR').length
  const agentCount = rows.filter(row => row.role === 'AGENT').length

  return (
    <div className="ptdt-page ptdt-attendance-integrity-page" style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}><ShieldCheck size={12} /> Attendance Integrity</div>
          <h1 className="ptdt-page-title">Attendance <span className="gradient-brand-text">Integrity</span></h1>
          <p className="ptdt-page-desc">
            Monitor supervisor and agent Clock In/Out activity, active work duration, dialer presence, device trace, and review flags.
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <MetricCard icon={<UserCheck size={17} />} label="Supervisors" value={supervisorCount} tone="pink" />
        <MetricCard icon={<Activity size={17} />} label="Agents" value={agentCount} tone="green" />
        <MetricCard icon={<Clock3 size={17} />} label="Clocked In" value={clockedInCount} tone="green" />
        <MetricCard icon={<AlertTriangle size={17} />} label="Needs Review" value={reviewCount} tone={reviewCount ? 'gold' : 'green'} />
      </div>

      <div style={{ ...cardStyle, marginBottom: 18, display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr) minmax(260px, 1fr)', gap: 14 }}>
        <div>
          <div className="mono" style={{ color: 'var(--pink)', fontWeight: 950, fontSize: 10.5, letterSpacing: 1.3 }}>LIVE SOURCE</div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.55, fontSize: 13 }}>
            Team presence and attendance sessions come from the backend Attendance Integrity API. Local TimeClock records are only used as emergency fallback.
          </p>
        </div>
        <div>
          <div className="mono" style={{ color: 'var(--green-2)', fontWeight: 950, fontSize: 10.5, letterSpacing: 1.3 }}>AUDIT SCOPE</div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.55, fontSize: 13 }}>
            Clock In/Out stores user, role, browser, OS, timezone, session ID, start time, end time, and worked duration.
          </p>
        </div>
        <div>
          <div className="mono" style={{ color: 'var(--warning)', fontWeight: 950, fontSize: 10.5, letterSpacing: 1.3 }}>NEXT BACKEND LAYER</div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.55, fontSize: 13 }}>
            Heartbeat, public IP, immutable audit log, stale heartbeat detection, disconnect flags, and supervisor review are persisted through the backend layer.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 16, border: '1px solid rgba(239,68,68,.26)', color: 'var(--danger)', background: 'rgba(239,68,68,.08)', fontWeight: 800 }}>
          {error}
        </div>
      )}

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['User', 'Role', 'Login / Dialer', 'Clock Status', 'Worked Time', 'Clock In', 'Clock Out', 'Device Trace', 'Integrity'].map(header => (
                  <th key={header} style={headStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={9} style={{ ...cellStyle, color: 'var(--text-3)' }}>Loading attendance integrity data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ ...cellStyle, color: 'var(--text-3)' }}>No supervisor or agent records found.</td></tr>
              ) : rows.map(row => {
                const tone = row.clockStatus === 'Clocked-In' ? 'green' : row.clockStatus === 'Clocked-Out' ? 'muted' : 'gold'
                return (
                  <tr key={row.user.id}>
                    <td style={cellStyle}>
                      <div style={{ fontWeight: 950, color: 'var(--text)', fontSize: 15 }}>{row.user.name || row.user.email || `User ${row.user.id}`}</div>
                      <div className="mono" style={{ marginTop: 5, color: 'var(--text-3)', fontSize: 11.5 }}>{row.user.email || 'No email'}</div>
                    </td>
                    <td style={cellStyle}><Pill tone={row.role === 'SUPERVISOR' ? 'pink' : 'green'}>{cleanRole(row.role)}</Pill></td>
                    <td style={cellStyle}>
                      <div style={{ display: 'grid', gap: 7 }}>
                        <Pill tone={statusColor(row.dialerStatus) === 'var(--green-2)' ? 'green' : 'muted'}>{row.dialerStatus}</Pill>
                        <span style={{ color: row.user.isActive === false ? 'var(--danger)' : 'var(--green-2)', fontSize: 12, fontWeight: 900 }}>
                          {row.user.isActive === false ? 'User inactive' : 'User active'}
                        </span>
                      </div>
                    </td>
                    <td style={cellStyle}><Pill tone={tone}>{row.clockStatus}</Pill></td>
                    <td className="mono" style={{ ...cellStyle, color: row.clockStatus === 'Clocked-In' ? 'var(--green-2)' : 'var(--text)', fontSize: 16, fontWeight: 950 }}>{formatDuration(row.workedSeconds)}</td>
                    <td style={cellStyle}>{formatDate(row.clockInAt)}</td>
                    <td style={cellStyle}>{formatDate(row.clockOutAt)}</td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-2)' }}>
                        <Fingerprint size={14} color="var(--pink)" />
                        <div>
                          <div style={{ fontWeight: 900 }}>{readSessionText(row.session, 'browser') || 'No session yet'}</div>
                          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{readSessionText(row.session, 'operatingSystem') || readSessionText(row.session, 'os') || 'Device pending'} · {readSessionText(row.session, 'timezone') || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle}>
                      <Pill tone={row.needsReview ? 'gold' : 'green'}>{row.needsReview ? 'Needs Review' : 'Clean'}</Pill>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 18 }}>
        <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 950, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Current viewer
        </div>
        <div style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6 }}>
          {currentUser?.name || currentUser?.email || 'PTDT User'} can use this page as the dedicated Attendance Integrity monitor. Clock records, heartbeat events, disconnect flags, and supervisor review state are now backend-backed.
        </div>
      </div>
    </div>
  )
}
