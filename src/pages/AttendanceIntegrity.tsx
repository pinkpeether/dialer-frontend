import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock3, Fingerprint, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react'
import { attendanceIntegrityApi, type AttendanceOverviewRow } from '../api/attendanceIntegrity.api'
import { agentsAPI } from '../api/agents.api'
import { useAuthStore } from '../store/auth.store'

type TeamUser = { id: number; name?: string | null; email?: string | null; role?: string | null; status?: string | null; isActive?: boolean; sipPresence?: { enabled?: boolean; registered?: boolean } | null }
type DisplayRow = {
  user: TeamUser
  role: string
  sessionId: number | null
  clockStatus: string
  dialerStatus: string
  workedSeconds: number
  needsReview: boolean
  sipEnabled: boolean
  clockInAt?: string | null
  clockOutAt?: string | null
  browser?: string | null
  operatingSystem?: string | null
  timezone?: string | null
}

const pageStyle: CSSProperties = { padding: '30px 34px 42px', maxWidth: 1720, width: '100%', boxSizing: 'border-box', overflowX: 'hidden', margin: '0 auto' }
const cardStyle: CSSProperties = { border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', borderRadius: 24, boxShadow: 'var(--shadow-card)', padding: 18 }
const headStyle: CSSProperties = { padding: '14px 12px', textAlign: 'left', color: 'var(--text-3)', fontSize: 11, fontWeight: 950, letterSpacing: 1.1, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }
const cellStyle: CSSProperties = { padding: '14px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'top', color: 'var(--text-2)' }

const formatDuration = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'
const cleanStatus = (value?: string | null) => String(value || 'UNKNOWN').replace(/_/g, ' ')
const isRunning = (status: string) => ['CLOCKED IN', 'ON BREAK', 'IDLE'].includes(status.toUpperCase())

function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'pink' | 'green' | 'gold' | 'muted' | 'danger' }) {
  const color = tone === 'pink' ? 'var(--pink)' : tone === 'green' ? 'var(--green-2)' : tone === 'gold' ? 'var(--warning)' : tone === 'danger' ? 'var(--danger)' : 'var(--text-3)'
  return <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 27, padding: '0 10px', borderRadius: 999, border: `1px solid ${color}`, background: 'var(--bg-glass)', color, fontSize: 10.5, fontWeight: 950, letterSpacing: .5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'pink' | 'green' | 'gold' }) {
  const color = tone === 'pink' ? 'var(--pink)' : tone === 'green' ? 'var(--green-2)' : 'var(--warning)'
  return <div style={{ ...cardStyle, minHeight: 108 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><span style={{ width: 36, height: 36, borderRadius: 14, display: 'grid', placeItems: 'center', color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>{icon}</span><span className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 950, letterSpacing: 1 }}>{label}</span></div><div style={{ marginTop: 12, fontSize: 28, fontWeight: 950, color: 'var(--text)' }}>{value}</div></div>
}

const fromBackendRow = (row: AttendanceOverviewRow, nowMs: number): DisplayRow => {
  const status = cleanStatus(row.status)
  const startedAt = row.session?.clockInAt ? new Date(row.session.clockInAt).getTime() : 0
  const activeSeconds = isRunning(status) && startedAt ? Math.max(row.activeSeconds || 0, Math.floor((nowMs - startedAt) / 1000)) : row.activeSeconds || row.session?.totalWorkedSeconds || 0
  return {
    user: row.user,
    role: String(row.user.role || '').toUpperCase(),
    sessionId: row.session?.id || null,
    clockStatus: status,
    dialerStatus: cleanStatus(row.user.status),
    workedSeconds: activeSeconds,
    needsReview: row.needsReview,
    sipEnabled: Boolean(row.user.sipPresence?.enabled && row.user.sipPresence?.registered),
    clockInAt: row.session?.clockInAt,
    clockOutAt: row.session?.clockOutAt,
    browser: row.session?.browser,
    operatingSystem: row.session?.operatingSystem,
    timezone: row.session?.timezone,
  }
}

export default function AttendanceIntegrity() {
  const currentUser = useAuthStore(state => state.user)
  const [backendRows, setBackendRows] = useState<AttendanceOverviewRow[]>([])
  const [fallbackUsers, setFallbackUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [reviewingSessionId, setReviewingSessionId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({})

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const overview = await attendanceIntegrityApi.overview({ limit: 250 }, { silent, fresh: true })
      setBackendRows(overview.rows || [])
      setFallbackUsers([])
    } catch (backendError) {
      try {
        const data = await agentsAPI.getAll({ limit: 250 }, { silent: true })
        const users = (Array.isArray(data) ? data : Array.isArray(data?.agents) ? data.agents : []) as TeamUser[]
        setFallbackUsers(users.filter(user => ['AGENT', 'SUPERVISOR'].includes(String(user.role || '').toUpperCase())))
        setBackendRows([])
        setError(`Live attendance service is temporarily unavailable. Showing team account status. ${backendError instanceof Error ? backendError.message : ''}`.trim())
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not load attendance data') }
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [load])
  useEffect(() => { const timer = window.setInterval(() => { void load(true) }, 60000); return () => window.clearInterval(timer) }, [load])

  const rows = useMemo<DisplayRow[]>(() => backendRows.length ? backendRows.map(row => fromBackendRow(row, nowMs)) : fallbackUsers.map(user => ({ user, role: String(user.role || '').toUpperCase(), sessionId: null, clockStatus: 'Awaiting Live Session', dialerStatus: cleanStatus(user.status), workedSeconds: 0, needsReview: false, sipEnabled: Boolean(user.sipPresence?.enabled && user.sipPresence?.registered) })), [backendRows, fallbackUsers, nowMs])
  const viewerRole = String(currentUser?.role || '').toUpperCase()
  const visibleRows = useMemo(() => viewerRole === 'SUPERVISOR' ? rows.filter(row => Number(row.user.id) !== Number(currentUser?.id)) : rows, [currentUser?.id, rows, viewerRole])
  const clockedInCount = visibleRows.filter(row => isRunning(row.clockStatus)).length
  const reviewCount = visibleRows.filter(row => row.needsReview).length
  const supervisorCount = visibleRows.filter(row => row.role === 'SUPERVISOR').length
  const agentCount = visibleRows.filter(row => row.role === 'AGENT').length

  const saveReview = async (sessionId: number, removeFlag: boolean) => {
    const notes = (reviewNotes[sessionId] || '').trim()
    if (removeFlag && !notes) return setError('Supervisor review reason is required before clearing a flag.')
    setReviewingSessionId(sessionId)
    setError('')
    try {
      await attendanceIntegrityApi.review(sessionId, { notes: notes || 'Reviewed from Attendance Monitoring.', removeFlag, ...(removeFlag ? {} : { status: 'PENDING_SUPERVISOR_REVIEW' }) })
      setReviewNotes(current => ({ ...current, [sessionId]: '' }))
      await load(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Attendance review could not be saved.') }
    finally { setReviewingSessionId(null) }
  }

  return (
    <div className="ptdt-page ptdt-attendance-integrity-page" style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 26 }}>
        <div><div className="eyebrow pink" style={{ marginBottom: 14 }}><ShieldCheck size={12} /> Attendance Monitoring</div><h1 className="ptdt-page-title">Attendance <span className="gradient-brand-text">Monitoring</span></h1><p className="ptdt-page-desc">Monitor clock-in and clock-out activity, work duration, dialer presence, device details, and supervisor review flags.</p></div>
        <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> {loading || refreshing ? 'Refreshing' : 'Refresh'}</button>
      </div>

      {!error && refreshing && visibleRows.length > 0 && <div style={{ margin: '-8px 0 16px', padding: '10px 13px', borderRadius: 15, border: '1px solid rgba(16,185,129,.2)', color: 'var(--green-2)', background: 'rgba(16,185,129,.08)', fontWeight: 850, fontSize: 12.5 }}>Showing current attendance data while refreshing.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <MetricCard icon={<UserCheck size={17} />} label="Supervisors" value={supervisorCount} tone="pink" />
        <MetricCard icon={<Activity size={17} />} label="Agents" value={agentCount} tone="green" />
        <MetricCard icon={<Clock3 size={17} />} label="Clocked In" value={clockedInCount} tone="green" />
        <MetricCard icon={<AlertTriangle size={17} />} label="Needs Review" value={reviewCount} tone={reviewCount ? 'gold' : 'green'} />
      </div>

      <div style={{ ...cardStyle, marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        <div><div className="mono" style={{ color: 'var(--pink)', fontWeight: 950, fontSize: 10.5, letterSpacing: 1.3 }}>LIVE SOURCE</div><p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.55, fontSize: 13 }}>Team presence and attendance sessions come from the live attendance service. Local account status is used only as a temporary fallback.</p></div>
        <div><div className="mono" style={{ color: 'var(--green-2)', fontWeight: 950, fontSize: 10.5, letterSpacing: 1.3 }}>AUDIT SCOPE</div><p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.55, fontSize: 13 }}>Clock events store user, role, browser, operating system, timezone, session, start, end, and worked duration.</p></div>
        <div><div className="mono" style={{ color: 'var(--warning)', fontWeight: 950, fontSize: 10.5, letterSpacing: 1.3 }}>ATTENDANCE SAFEGUARDS</div><p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.55, fontSize: 13 }}>Heartbeat checks, disconnect flags, stale-session detection, and supervisor review actions are recorded and retained.</p></div>
      </div>

      {error && <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 16, border: '1px solid rgba(239,68,68,.26)', color: 'var(--danger)', background: 'rgba(239,68,68,.08)', fontWeight: 800 }}>{error}</div>}

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse' }}>
        <thead><tr>{['User', 'Role', 'Login / Dialer', 'Clock Status', 'Worked Time', 'Clock In', 'Clock Out', 'Device Details', 'Review'].map(header => <th key={header} style={headStyle}>{header}</th>)}</tr></thead>
        <tbody>
          {loading && visibleRows.length === 0 ? <tr><td colSpan={9} style={{ ...cellStyle, color: 'var(--text-3)' }}>Loading attendance data...</td></tr> : visibleRows.length === 0 ? <tr><td colSpan={9} style={{ ...cellStyle, color: 'var(--text-3)' }}>No supervisor or agent records found.</td></tr> : visibleRows.map(row => (
            <tr key={row.user.id}>
              <td style={cellStyle}><div style={{ fontWeight: 950, color: 'var(--text)', fontSize: 15 }}>{row.user.name || row.user.email || `User ${row.user.id}`}</div><div className="mono" style={{ marginTop: 5, color: 'var(--text-3)', fontSize: 11.5 }}>{row.user.email || 'No email'}</div></td>
              <td style={cellStyle}><Pill tone={row.role === 'SUPERVISOR' ? 'pink' : 'green'}>{row.role}</Pill></td>
              <td style={cellStyle}><div style={{ display: 'grid', gap: 7 }}><Pill tone={['ONLINE', 'READY'].includes(row.dialerStatus.toUpperCase()) ? 'green' : 'muted'}>{row.dialerStatus}</Pill><span style={{ color: row.user.isActive === false ? 'var(--danger)' : row.sipEnabled ? 'var(--green-2)' : 'var(--text-3)', fontSize: 12, fontWeight: 900 }}>{row.user.isActive === false ? 'Account inactive' : row.sipEnabled ? 'SIP Enabled' : 'SIP Disabled'}</span></div></td>
              <td style={cellStyle}><Pill tone={row.needsReview ? 'danger' : isRunning(row.clockStatus) ? 'green' : 'muted'}>{row.clockStatus}</Pill></td>
              <td className="mono" style={{ ...cellStyle, color: isRunning(row.clockStatus) ? 'var(--green-2)' : 'var(--text)', fontSize: 16, fontWeight: 950 }}>{formatDuration(row.workedSeconds)}</td>
              <td style={cellStyle}>{formatDate(row.clockInAt)}</td><td style={cellStyle}>{formatDate(row.clockOutAt)}</td>
              <td style={cellStyle}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Fingerprint size={14} color="var(--pink)" /><div><div style={{ fontWeight: 900, fontSize: 12.8 }}>{row.browser || 'No session yet'}</div><div style={{ color: 'var(--text-3)', fontSize: 12 }}>{row.operatingSystem || 'Device pending'} · {row.timezone || '—'}</div></div></div></td>
              <td style={cellStyle}>{row.needsReview && row.sessionId ? <div style={{ display: 'grid', gap: 8, minWidth: 220 }}><Pill tone="danger">Flagged</Pill><input value={reviewNotes[row.sessionId] || ''} onChange={event => setReviewNotes(current => ({ ...current, [row.sessionId!]: event.target.value }))} placeholder="Supervisor review reason..." style={{ width: '100%', minHeight: 34, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', color: 'var(--text)', padding: '0 10px', fontSize: 11.5, outline: 'none' }} /><div style={{ display: 'flex', gap: 7 }}><button type="button" className="ptdt-action-btn" disabled={reviewingSessionId === row.sessionId} onClick={() => void saveReview(row.sessionId!, false)} style={{ minHeight: 30, padding: '0 10px', fontSize: 10.5 }}>Review</button><button type="button" className="ptdt-action-btn active" disabled={reviewingSessionId === row.sessionId} onClick={() => void saveReview(row.sessionId!, true)} style={{ minHeight: 30, padding: '0 10px', fontSize: 10.5 }}><CheckCircle2 size={12} /> Clear Flag</button></div></div> : <Pill tone={row.clockStatus === 'Awaiting Live Session' ? 'gold' : 'green'}>{row.clockStatus === 'Awaiting Live Session' ? 'Pending' : 'Clear'}</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
    </div>
  )
}
