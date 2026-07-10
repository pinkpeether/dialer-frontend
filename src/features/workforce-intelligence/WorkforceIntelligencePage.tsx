import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  Flame,
  Gauge,
  Medal,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useWorkforceIntelligenceStore } from './stores/workforceIntelligence.store'
import { useWorkforceIntelligence } from './hooks/useWorkforceIntelligence'
import type { WorkforceUserRow } from './types/workforceIntelligence.types'
import { exportWorkforceCsv, exportWorkforceExcel, formatScore, formatSeconds } from './utils/workforceIntelligence.utils'

const pageStyle: CSSProperties = {
  padding: '30px 34px 42px',
  maxWidth: 1720,
  width: '100%',
  boxSizing: 'border-box',
  overflowX: 'hidden',
  margin: '0 auto',
}

const panelStyle: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  borderRadius: 24,
  boxShadow: 'var(--shadow-card)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  border: '1px solid var(--border)',
  borderRadius: 14,
  background: 'var(--bg-glass-hi)',
  color: 'color-mix(in srgb, var(--text) 30%, var(--text-3) 70%)',
  padding: '0 12px',
  fontWeight: 850,
  fontSize: 16,
  outline: 'none',
}

const tooltipStyle: CSSProperties = {
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  color: 'var(--text)',
  boxShadow: 'var(--shadow-card)',
}

const scoreColor = (score: number | null) => {
  if (score === null) return 'var(--text-3)'
  if (score >= 80) return 'var(--green-2)'
  if (score >= 60) return 'var(--warning)'
  return 'var(--danger)'
}

const avgScore = (values: Array<number | null | undefined>) => {
  const clean = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!clean.length) return null
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length)
}

const percentLabel = (value: number | null) => value === null ? 'Pending' : `${value}%`

const riskLabelFor = (score: number | null, criticalFlags = 0) => {
  if (criticalFlags > 0 || (score ?? 0) >= 70) return 'High'
  if ((score ?? 0) >= 35) return 'Medium'
  return 'Low'
}

const complianceSignalCount = (rows: WorkforceUserRow[]) => rows.reduce((sum, row) => (
  sum
  + (row.attendance.missedClockOut ? 1 : 0)
  + (row.attendance.forcedLogout ? 1 : 0)
  + row.attendance.unexpectedDisconnects
  + row.quality.complianceViolations
  + (row.attendance.sipRegistered ? 0 : 1)
), 0)

const commandCellStyle: CSSProperties = {
  color: 'var(--text-2)',
  fontWeight: 950,
  fontSize: 13.6,
  letterSpacing: 0.2,
  overflowWrap: 'anywhere',
}

const commandTimerStyle: CSSProperties = {
  ...commandCellStyle,
  color: 'var(--text)',
  fontVariantNumeric: 'tabular-nums',
}

const commandHeaderStyle: CSSProperties = {
  padding: '15px 12px',
  textAlign: 'left',
  color: 'var(--text-3)',
  fontSize: 12.4,
  fontWeight: 950,
  letterSpacing: 1.35,
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--border)',
  lineHeight: 1.12,
  verticalAlign: 'bottom',
}

const premiumToolbarButtonStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 16,
  padding: '0 15px',
  border: '1px solid color-mix(in srgb, var(--pink) 18%, var(--border))',
  background: 'linear-gradient(135deg, var(--bg-glass-hi), color-mix(in srgb, var(--pink) 7%, var(--bg-glass-hi)))',
  color: 'var(--text-2)',
  boxShadow: '0 12px 26px rgba(15, 23, 42, .06)',
  fontWeight: 950,
  letterSpacing: .2,
}

const premiumPrimaryButtonStyle: CSSProperties = {
  ...premiumToolbarButtonStyle,
  border: '1px solid color-mix(in srgb, var(--pink) 42%, transparent)',
  background: 'linear-gradient(135deg, var(--pink), color-mix(in srgb, var(--purple) 44%, var(--pink)))',
  color: '#fff',
  boxShadow: '0 16px 34px color-mix(in srgb, var(--pink) 22%, transparent)',
}

const premiumGreenButtonStyle: CSSProperties = {
  ...premiumToolbarButtonStyle,
  border: '1px solid color-mix(in srgb, var(--green-2) 34%, transparent)',
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--green-2) 11%, var(--bg-glass-hi)), var(--bg-glass-hi))',
  color: 'var(--green-2)',
}

const commandHeaders = [
  { key: 'user', lines: ['User'] },
  { key: 'role', lines: ['Role'] },
  { key: 'current-campaign', lines: ['Current', 'Campaign'] },
  { key: 'current-queue', lines: ['Current', 'Queue'] },
  { key: 'break-status', lines: ['Break', 'Status'] },
  { key: 'todays-login', lines: ["Today's", 'Login'] },
  { key: 'login-dialer', lines: ['Login', '/ Dialer'] },
  { key: 'clock', lines: ['Clock'] },
  { key: 'work', lines: ['Work'] },
  { key: 'calls', lines: ['Calls'] },
  { key: 'action', lines: ['Action'] },
]

const flagCategory = (flag: { key: string; label: string }) => {
  const text = `${flag.key} ${flag.label}`.toLowerCase()
  if (text.includes('sip') || text.includes('dialer')) return 'SIP'
  if (text.includes('disconnect') || text.includes('session') || text.includes('clock') || text.includes('attendance')) return 'Attendance'
  if (text.includes('compliance')) return 'Compliance'
  if (text.includes('device') || text.includes('browser') || text.includes('ip')) return 'Security'
  if (text.includes('productivity') || text.includes('answer')) return 'Performance'
  return 'Behaviour'
}

function SectionHeader({ icon, title, subtitle, action, subtitleSize = 13.5 }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode; subtitleSize?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <div className="eyebrow pink" style={{ marginBottom: 10 }}>{icon}{title}</div>
        {subtitle && <p style={{ margin: 0, color: 'var(--text-3)', fontSize: subtitleSize, lineHeight: 1.55 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color = 'var(--pink)' }: { icon: ReactNode; label: string; value: ReactNode; sub?: string; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      style={{
        ...panelStyle,
        padding: 18,
        minHeight: 126,
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 8%, var(--bg-glass-hi)), var(--bg-glass-hi) 72%)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 14, display: 'grid', placeItems: 'center', color, background: `color-mix(in srgb, ${color} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)` }}>{icon}</span>
        <span className="mono" style={{ color: 'var(--text-3)', fontSize: 15, fontWeight: 950, letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ marginTop: 13, fontSize: 24, fontWeight: 950, color: 'color-mix(in srgb, var(--text) 30%, var(--text-3) 70%)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 12.6, fontWeight: 800 }}>{sub}</div>}
    </motion.div>
  )
}

function MiniStat({ label, value, color = 'var(--text)' }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div style={{ display: 'grid', gap: 4, padding: '10px 12px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
      <span className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 950, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ color, fontSize: 18, lineHeight: 1.1 }}>{value}</strong>
    </div>
  )
}

function DecisionPill({ label, color, fontSize = 11 }: { label: string; color: string; fontSize?: number }) {
  return (
    <span className="mono" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      color,
      fontSize,
      fontWeight: 950,
      letterSpacing: 1,
      textTransform: 'uppercase',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 14%, transparent)` }} />
      {label}
    </span>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span className="mono" style={{ color: 'var(--text-3)', fontSize: 11.6, fontWeight: 950, letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: 34, color: 'var(--text-3)', textAlign: 'center', fontWeight: 850, fontSize: 13.5 }}>
      {children}
    </div>
  )
}

function ScoreMatrixTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown> }>; label?: string | number }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload || {}
  const items = [
    ['Attendance', row.attendance],
    ['Quality', row.quality],
    ['Calls', row.calls],
    ['AHT', row.aht],
    ['QA', row.qa],
  ]
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 950, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gap: 5 }}>
        {items.map(([name, value]) => (
          <div key={String(name)} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12.5, color: 'var(--text-2)' }}>
            <span>{String(name)}</span>
            <strong>{String(value ?? 'Pending')}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScorePill({ score }: { score: number | null }) {
  return (
    <span className="mono" style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 54,
      height: 30,
      borderRadius: 999,
      border: `1px solid ${scoreColor(score)}`,
      color: scoreColor(score),
      background: 'var(--bg-glass)',
      fontWeight: 950,
      fontSize: 12,
    }}>
      {formatScore(score)}
    </span>
  )
}

function AgentDeepDive({ row }: { row: WorkforceUserRow | null }) {
  if (!row) return (
    <div style={{ ...panelStyle, padding: 22, minHeight: 300 }}>
      <SectionHeader icon={<Brain size={13} />} title="AI Insight Console" subtitle="Select a user from the workforce table to inspect coaching, risk, productivity, and score breakdown." />
      <EmptyState>No user selected.</EmptyState>
    </div>
  )

  const ringData = [
    { name: 'Overall Score', value: row.scores.overall ?? 0, fill: '#fb0b8c' },
    { name: 'Attendance', value: row.scores.attendance ?? 0, fill: '#00a747' },
    { name: 'Quality', value: row.scores.aiQuality ?? row.quality.qaScore ?? 0, fill: '#8057d7' },
    { name: 'Compliance', value: row.scores.compliance ?? 0, fill: '#f0b90b' },
  ]
  const rewardReady = (row.scores.overall ?? 0) >= 80 && row.redFlags.length === 0
  const confidence = Math.max(62, Math.min(96, 72 + row.quality.aiReviewedCalls * 4 + (row.attendance.workedSeconds > 0 ? 8 : 0) - row.redFlags.length * 7))
  const detected = [
    row.attendance.workedSeconds > 0 ? 'Attendance session captured' : 'Attendance session missing',
    row.attendance.sipRegistered ? 'SIP compliance active' : 'SIP registration not active',
    row.quality.sentiment ? `${row.quality.sentiment} customer sentiment` : 'Sentiment not captured yet',
    row.quality.complianceViolations ? `${row.quality.complianceViolations} compliance issue(s)` : 'No compliance issues detected',
    row.calls.callsConnected ? `${row.calls.callsConnected} connected call(s)` : 'No connected calls in selected range',
    `Reward recommendation: ${rewardReady ? 'YES' : 'NO'}`,
  ]

  return (
    <div style={{ ...panelStyle, padding: 22 }}>
      <SectionHeader
        icon={<Brain size={13} />}
        title="AI Insight Console"
        subtitle={`${row.name} · ${row.role.replace(/_/g, ' ')}`}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, .9fr) minmax(260px, 1.1fr)', gap: 18, alignItems: 'center' }}>
        <div style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="24%" outerRadius="98%" data={ringData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={12} background={{ fill: 'var(--bg-2)' }}>
                {ringData.map(item => <Cell key={item.name} fill={item.fill} />)}
              </RadialBar>
              <Tooltip contentStyle={tooltipStyle} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
            <div className="mono" style={{ color: 'var(--pink)', fontSize: 11, fontWeight: 950, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>AI detected</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {detected.map(signal => (
                <div key={signal} style={{ display: 'flex', gap: 8, color: 'var(--text-2)', fontSize: 13.5, fontWeight: 820, lineHeight: 1.35 }}>
                  <CheckCircle2 size={15} color="var(--green-2)" />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <DecisionPill label={`Confidence ${confidence}%`} color="var(--purple)" />
              <ScorePill score={row.scores.overall} />
            </div>
          </div>
          {row.insights.slice(0, 2).map((insight, index) => {
            const color = insight.tone === 'positive' ? 'var(--green-2)' : insight.tone === 'risk' ? 'var(--danger)' : insight.tone === 'coaching' ? 'var(--warning)' : 'var(--text-3)'
            return (
              <div key={`${insight.text}-${index}`} style={{ padding: 13, borderRadius: 16, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, background: 'var(--bg-glass)', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.45, fontWeight: 780 }}>
                <span style={{ color, fontWeight: 950, marginRight: 7 }}>{insight.tone.toUpperCase()}</span>{insight.text}
              </div>
            )
          })}
          <div style={{ color: 'var(--text-3)', fontSize: 12.4, lineHeight: 1.5, fontWeight: 800 }}>
            Productivity formula: 30% attendance, 20% QA, 15% talk time, 15% sales, 10% compliance, 10% AI behaviour.
          </div>
        </div>
      </div>
    </div>
  )
}

type WorkforcePageMode = 'operations' | 'intelligence'

export default function WorkforceIntelligencePage({ mode = 'intelligence' }: { mode?: WorkforcePageMode }) {
  const filters = useWorkforceIntelligenceStore(state => state.filters)
  const setRange = useWorkforceIntelligenceStore(state => state.setRange)
  const setDateRange = useWorkforceIntelligenceStore(state => state.setDateRange)
  const setAgentId = useWorkforceIntelligenceStore(state => state.setAgentId)
  const setRole = useWorkforceIntelligenceStore(state => state.setRole)
  const setRisk = useWorkforceIntelligenceStore(state => state.setRisk)
  const { data, loading, refreshing, error, reload } = useWorkforceIntelligence(filters)
  const [selectedId, setSelectedId] = useState<string | number | null>(null)
  const insightRef = useRef<HTMLDivElement | null>(null)

  const rows = useMemo(() => data?.rows || [], [data?.rows])
  const selectedRow = rows.find(row => String(row.id) === String(selectedId)) || rows[0] || null
  const agentOptions = useMemo(() => rows.map(row => ({ id: row.id, name: row.name })), [rows])
  const topPerformers = rows.filter(row => (row.scores.overall ?? 0) >= 80).slice(0, 4)
  const rewardReady = rows.filter(row => row.productivity.achievements.length > 0).slice(0, 6)
  const riskRows = rows.filter(row => row.redFlags.length > 0).slice(0, 8)
  const coachingRows = rows.filter(row => row.quality.coachingRecommendations.length > 0 || row.redFlags.length > 0 || (row.scores.aiQuality !== null && row.scores.aiQuality < 70))
  const complianceAverage = avgScore(rows.map(row => row.scores.compliance))
  const productivityAverage = avgScore(rows.map(row => row.scores.aiProductivity))
  const attendanceIntegrityAverage = avgScore(rows.map(row => avgScore([row.scores.attendance, row.scores.reliability, row.attendance.sipRegistered ? 100 : 55])))
  const supervisorAverage = avgScore(rows.filter(row => row.role === 'SUPERVISOR').map(row => row.scores.overall))
  const agentAverage = avgScore(rows.filter(row => row.role === 'AGENT').map(row => row.scores.overall))
  const topScore = avgScore(topPerformers.map(row => row.scores.overall))
  const activeCalls = rows.filter(row => ['BUSY', 'IN CALL', 'CALLING'].includes(row.status)).length
  const activeSupervisors = rows.filter(row => row.role === 'SUPERVISOR' && ['ONLINE', 'READY', 'BUSY', 'WRAP UP'].includes(row.status)).length
  const activeAgents = rows.filter(row => row.role === 'AGENT' && ['ONLINE', 'READY', 'BUSY', 'WRAP UP'].includes(row.status)).length
  const aiCallCount = rows.reduce((sum, row) => sum + row.quality.aiReviewedCalls, 0)
  const complianceSignals = complianceSignalCount(rows)
  const scoreBars = rows.slice(0, 8).map(row => ({
    name: row.name.split(' ')[0] || row.name,
    score: row.scores.overall || 0,
    risk: row.scores.risk || 0,
    attendance: row.scores.attendance || 0,
    quality: row.scores.aiQuality || row.quality.qaScore || 0,
    calls: row.calls.callsMade,
    aht: row.calls.averageHandleTimeSeconds ? Math.min(100, Math.max(0, Math.round(100 - row.calls.averageHandleTimeSeconds / 12))) : 0,
    qa: row.quality.qaScore || 0,
  }))
  const operationalTimeline = selectedRow ? [
    { label: 'Login', detail: selectedRow.status, color: selectedRow.status === 'ONLINE' ? 'var(--green-2)' : 'var(--text-3)' },
    { label: 'Dialer', detail: selectedRow.attendance.sipRegistered ? 'SIP registered' : 'SIP disabled', color: selectedRow.attendance.sipRegistered ? 'var(--green-2)' : 'var(--warning)' },
    { label: 'Campaign', detail: selectedRow.productivity.currentCampaign || 'No current campaign', color: 'var(--purple)' },
    { label: 'Calls', detail: `${selectedRow.calls.callsMade} made · ${selectedRow.calls.callsConnected} connected`, color: 'var(--pink)' },
    { label: 'Quality', detail: selectedRow.quality.qaScore === null ? 'QA Pending' : `${selectedRow.quality.qaScore}% QA score`, color: 'var(--green-2)' },
    { label: 'Risk', detail: selectedRow.redFlags[0]?.label || 'No active red flag', color: selectedRow.redFlags.length ? 'var(--danger)' : 'var(--green-2)' },
  ] : []
  const heatmap = data?.timeline.slice(-7).map(point => ({
    label: point.label.slice(5),
    tone: point.answerRate >= 50 ? 'var(--green-2)' : point.calls > 0 ? 'var(--warning)' : 'var(--danger)',
    value: point.answerRate,
  })) || []
  const aiRecommendations = [
    ...topPerformers.slice(0, 1).map(row => `Reward ${row.name}`),
    ...coachingRows.slice(0, 2).map(row => `Coach ${row.name}`),
    ...(complianceSignals ? ['Review attendance and SIP compliance signals'] : []),
    ...(riskRows.length ? ['Schedule supervisor review for flagged users'] : []),
    ...(rows.some(row => !row.productivity.currentCampaign) ? ['Assign campaign coverage for idle operators'] : []),
  ].slice(0, 5)
  const redFlagCategories = ['Attendance', 'Compliance', 'SIP', 'Security', 'Performance', 'Behaviour'].map(category => ({
    category,
    flags: riskRows.flatMap(row => row.redFlags.map(flag => ({ row, flag }))).filter(item => flagCategory(item.flag) === category),
  }))
  const isOperations = mode === 'operations'
  const pageEyebrow = isOperations ? 'Live Operations Center' : 'AI Analytics & Insights'
  const pageDescription = isOperations
    ? 'Live operating view for agents, calls, campaigns, queues, attendance alerts, and supervisor actions.'
    : 'AI analytics for productivity, attendance integrity, quality, coaching, predictions, and reward decisions.'
  const operationsCards = [
    { icon: <Users size={17} />, label: 'Users Online', value: data ? data.summary.onlineUsers : 0, sub: `${data ? data.summary.totalUsers : 0} total users`, color: 'var(--purple)' },
    { icon: <Clock3 size={17} />, label: 'Clocked In', value: data ? data.summary.clockedInUsers : 0, sub: 'Attendance live', color: 'var(--green-2)' },
    { icon: <PhoneMetricIcon />, label: 'Active Calls', value: activeCalls, sub: `${data ? data.summary.callsConnected : 0} connected`, color: 'var(--pink)' },
    { icon: <MegaphoneMetricIcon />, label: 'Live Campaigns', value: rows.filter(row => row.productivity.currentCampaign).length, sub: selectedRow?.productivity.currentCampaign || 'No current campaign', color: 'var(--purple)' },
    { icon: <Filter size={17} />, label: 'Queues Active', value: rows.filter(row => row.productivity.bestPerformingCampaign).length, sub: selectedRow?.productivity.bestPerformingCampaign || 'No queue assigned', color: 'var(--green-2)' },
    { icon: <Clock3 size={17} />, label: 'Live Talk Time', value: data ? formatSeconds(data.summary.talkTimeSeconds) : '00:00:00', sub: 'Selected range', color: 'var(--warning)' },
    { icon: <ShieldAlert size={17} />, label: 'Attendance Alerts', value: data ? data.summary.flaggedUsers : 0, sub: `${complianceSignals} signal(s)`, color: complianceSignals ? 'var(--danger)' : 'var(--green-2)' },
    { icon: <AlertTriangle size={17} />, label: 'Red Flags', value: riskRows.length, sub: 'Supervisor review', color: riskRows.length ? 'var(--danger)' : 'var(--green-2)' },
  ]
  const intelligenceCards = [
    { icon: <Gauge size={17} />, label: 'AI Workforce Score', value: formatScore(data?.summary.averageOverallScore ?? null), sub: 'Composite score', color: scoreColor(data?.summary.averageOverallScore ?? null) },
    { icon: <TrendingUp size={17} />, label: 'Productivity Index', value: percentLabel(productivityAverage), sub: formatSeconds(data?.summary.talkTimeSeconds ?? 0), color: 'var(--warning)' },
    { icon: <CheckCircle2 size={17} />, label: 'Compliance Score', value: percentLabel(complianceAverage), sub: `${complianceSignals} signal(s)`, color: complianceSignals ? 'var(--warning)' : 'var(--green-2)' },
    { icon: <ShieldAlert size={17} />, label: 'Integrity Score', value: percentLabel(attendanceIntegrityAverage), sub: `${data ? data.summary.flaggedUsers : 0} flagged user(s)`, color: data?.summary.flaggedUsers ? 'var(--danger)' : 'var(--green-2)' },
    { icon: <Award size={17} />, label: 'Quality Trend', value: percentLabel(avgScore(rows.map(row => row.scores.aiQuality ?? row.quality.qaScore))), sub: 'QA and AI review', color: 'var(--purple)' },
    { icon: <Calendar size={17} />, label: 'Weekly Trend', value: heatmap.length, sub: 'Heatmap day(s)', color: 'var(--green-2)' },
    { icon: <Brain size={17} />, label: 'Coaching Queue', value: coachingRows.length, sub: 'Users need coaching', color: 'var(--purple)' },
    { icon: <Medal size={17} />, label: 'Reward Ready', value: topPerformers.length, sub: 'Promotion candidates', color: 'var(--green-2)' },
  ]
  const kpiCards = isOperations ? operationsCards : intelligenceCards
  const inspectRow = (id: string | number) => {
    setSelectedId(id)
    window.requestAnimationFrame(() => {
      insightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <div className="ptdt-page ptdt-workforce-intelligence-page" style={pageStyle}>
      <style>
        {`
          .workforce-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:18px}
          @media(max-width:1300px){.workforce-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
          @media(max-width:760px){.workforce-kpi-grid{grid-template-columns:1fr}}
        `}
      </style>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 13 }}><Sparkles size={12} /> {pageEyebrow}</div>
          <h1 className="ptdt-page-title">Workforce <span className="gradient-brand-text">{isOperations ? 'Operations' : 'Intelligence'}</span></h1>
          <p className="ptdt-page-desc" style={{ maxWidth: 1180, fontSize: 16.7, lineHeight: 1.45 }}>
            {pageDescription}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ ...panelStyle, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 42 }}>
            <DecisionPill label="Live" color="var(--green-2)" />
            <span className="mono" style={{ color: 'var(--text-2)', fontSize: 11.5, fontWeight: 950 }}>{activeCalls} Active Calls</span>
            <span className="mono" style={{ color: 'var(--text-2)', fontSize: 11.5, fontWeight: 950 }}>{activeAgents} Agents</span>
            <span className="mono" style={{ color: 'var(--text-2)', fontSize: 11.5, fontWeight: 950 }}>{activeSupervisors} Supervisors</span>
            <span className="mono" style={{ color: 'var(--text-2)', fontSize: 11.5, fontWeight: 950 }}>{aiCallCount} AI Reviews</span>
          </div>
          <button type="button" className="ptdt-action-btn" style={premiumGreenButtonStyle} onClick={() => void reload()} disabled={loading || refreshing}>
            <RefreshCw size={15} /> {loading || refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <button type="button" className="ptdt-action-btn" style={premiumToolbarButtonStyle} onClick={() => exportWorkforceCsv(rows)} disabled={!rows.length}>
            <Download size={15} /> CSV
          </button>
          <button type="button" className="ptdt-action-btn" style={premiumToolbarButtonStyle} onClick={() => exportWorkforceExcel(rows)} disabled={!rows.length}>
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button type="button" className="ptdt-action-btn active" style={premiumPrimaryButtonStyle} onClick={() => window.print()} disabled={!rows.length}>
            PDF
          </button>
        </div>
      </div>

      <div style={{ ...panelStyle, padding: 16, marginBottom: 18, background: 'color-mix(in srgb, var(--text-3) 7%, var(--bg-glass-hi))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'end' }}>
          <FilterField label="Range">
            <select style={inputStyle} value={filters.range} onChange={event => setRange(event.target.value as typeof filters.range)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </FilterField>
          <FilterField label="From">
            <input type="date" style={inputStyle} value={filters.from} onChange={event => setDateRange(event.target.value, filters.to)} />
          </FilterField>
          <FilterField label="To">
            <input type="date" style={inputStyle} value={filters.to} onChange={event => setDateRange(filters.from, event.target.value)} />
          </FilterField>
          <FilterField label="Role">
            <select style={inputStyle} value={filters.role} onChange={event => setRole(event.target.value as typeof filters.role)}>
              <option value="all">All Roles</option>
              <option value="AGENT">Agents</option>
              <option value="SUPERVISOR">Supervisors</option>
            </select>
          </FilterField>
          <FilterField label="User">
            <select style={inputStyle} value={filters.agentId} onChange={event => setAgentId(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
              <option value="all">All Users</option>
              {agentOptions.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </FilterField>
          <FilterField label="Risk">
            <select style={inputStyle} value={filters.risk} onChange={event => setRisk(event.target.value as typeof filters.risk)}>
              <option value="all">All Risk</option>
              <option value="clean">Clean</option>
              <option value="watch">Watch</option>
              <option value="critical">Critical</option>
            </select>
          </FilterField>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 16, border: '1px solid rgba(239,68,68,.26)', color: 'var(--danger)', background: 'rgba(239,68,68,.08)', fontWeight: 850, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div style={panelStyle}><EmptyState>Loading Workforce Intelligence from backend records...</EmptyState></div>
      ) : !data || rows.length === 0 ? (
        <div style={panelStyle}><EmptyState>No workforce intelligence records found for the selected filters.</EmptyState></div>
      ) : (
        <>
          {refreshing && (
            <div style={{ marginBottom: 14, color: 'var(--green-2)', fontSize: 12.5, fontWeight: 900 }}>
              Showing cached intelligence while refreshing backend records.
            </div>
          )}

          <div className="workforce-kpi-grid">
            {kpiCards.map(card => (
              <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} sub={card.sub} color={card.color} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18, marginBottom: 18 }}>
            {isOperations && (
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<BarChart3 size={13} />} title="Operational Activity Timeline" subtitle="Selected-user sequence built from login, SIP, campaign, call, QA, and risk records." />
              <div style={{ display: 'grid', gap: 10 }}>
                {operationalTimeline.map((event, index) => (
                  <div key={`${event.label}-${event.detail}`} style={{ display: 'grid', gridTemplateColumns: '54px minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
                    <span className="mono" style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 950 }}>{String(index + 1).padStart(2, '0')}</span>
                    <div style={{ padding: 12, borderRadius: 17, border: '1px solid var(--border)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <DecisionPill label={event.label} color={event.color} fontSize={15.2} />
                      <strong style={{ color: 'var(--text-2)', fontSize: 13.5, textAlign: 'right' }}>{event.detail}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, height: 82 }}>
                {data.timeline.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeline} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wiCalls" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#fb0b8c" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="#fb0b8c" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Tooltip content={<ScoreMatrixTooltip />} />
                      <Area type="monotone" dataKey="calls" stroke="#fb0b8c" fill="url(#wiCalls)" strokeWidth={2} name="Calls" />
                      <Line type="monotone" dataKey="answered" stroke="#00a747" strokeWidth={2} dot={false} name="Connected" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
            )}

            {!isOperations && (
            <div ref={insightRef}>
              <AgentDeepDive row={selectedRow} />
            </div>
            )}
          </div>

          {!isOperations && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18, marginBottom: 18 }}>
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader
                icon={<Award size={13} />}
                title="Score Matrix"
                subtitle="Composite score combines available backend signals: productivity, AI quality, attendance, reliability, sales, compliance, learning, customer experience, and inverse risk. Missing metrics are not guessed."
              />
              <div style={{ height: 260 }}>
                {scoreBars.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreBars} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 13.75, fontWeight: 900 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="score" fill="#00a747" radius={[10, 10, 0, 0]} name="Overall" />
                      <Bar dataKey="risk" fill="#fb0b8c" radius={[10, 10, 0, 0]} name="Risk" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState>No score records available.</EmptyState>}
              </div>
            </div>

            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<Medal size={13} />} title="Gamification & Rewards" subtitle="Badges and achievements generated only from available backend performance records." />
              <div style={{ display: 'grid', gap: 10 }}>
                {rewardReady.length ? rewardReady.map(row => {
                  const badge = row.scores.overall !== null && row.scores.overall >= 85
                    ? 'Elite Performer'
                    : row.attendance.workedSeconds > 0 && row.redFlags.length === 0
                      ? 'Attendance Hero'
                      : row.calls.callsConnected > 0
                        ? 'Customer Champion'
                        : 'Reward Candidate'
                  return (
                  <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 13, borderRadius: 17, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(240,185,11,.12)', color: 'var(--warning)' }}><Flame size={16} /></span>
                      <span>
                        <strong style={{ display: 'block', fontSize: 13.5 }}>{row.name}</strong>
                        <span style={{ color: 'var(--text-3)', fontSize: 11.9 }}>{badge} · {row.productivity.achievements.join(' · ')}</span>
                      </span>
                    </span>
                    <ScorePill score={row.scores.overall} />
                  </button>
                )}) : <EmptyState>No achievements generated from the selected range.</EmptyState>}
              </div>
            </div>
          </div>
          )}

          {!isOperations && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 18, marginBottom: 18 }}>
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<Calendar size={13} />} title="Weekly Attendance Heatmap" subtitle="Recent backend activity pattern for the selected range." />
              {heatmap.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${heatmap.length}, minmax(34px, 1fr))`, gap: 9 }}>
                  {heatmap.map(day => (
                    <div key={day.label} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
                      <span className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 950 }}>{day.label}</span>
                      <span style={{ width: '100%', height: 38, borderRadius: 13, background: `color-mix(in srgb, ${day.tone} 72%, white 8%)`, border: `1px solid color-mix(in srgb, ${day.tone} 55%, transparent)`, boxShadow: `0 10px 24px color-mix(in srgb, ${day.tone} 16%, transparent)` }} />
                      <strong className="mono" style={{ color: day.tone, fontSize: 11 }}>{day.value}%</strong>
                    </div>
                  ))}
                </div>
              ) : <EmptyState>No backend trend available for the heatmap.</EmptyState>}
            </div>

            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<ShieldAlert size={13} />} title="Attendance Integrity Meter" subtitle="Cheating and attendance-control signals derived from live attendance records." />
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
                <div style={{ height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="66%" outerRadius="100%" data={[{ name: 'Integrity', value: attendanceIntegrityAverage ?? 0, fill: scoreColor(attendanceIntegrityAverage) }]} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={12} background={{ fill: 'var(--bg-2)' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <MiniStat label="Integrity" value={percentLabel(attendanceIntegrityAverage)} color={scoreColor(attendanceIntegrityAverage)} />
                  <MiniStat label="Late Login" value={rows.filter(row => row.attendance.lateLogin).length} />
                  <MiniStat label="Missed Clock Out" value={rows.filter(row => row.attendance.missedClockOut).length} color="var(--danger)" />
                  <MiniStat label="Suspicious Activity" value={complianceSignals} color={complianceSignals ? 'var(--warning)' : 'var(--green-2)'} />
                </div>
              </div>
            </div>

            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<TrendingUp size={13} />} title="Next Week Prediction" subtitle="Forward-looking risk and promotion signals from the selected user." />
              {selectedRow ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <MiniStat label={selectedRow.name} value={percentLabel(selectedRow.scores.aiProductivity)} color={scoreColor(selectedRow.scores.aiProductivity)} />
                  <MiniStat label="Burnout Risk" value={riskLabelFor(selectedRow.attendance.idleSeconds ? Math.round(selectedRow.attendance.idleSeconds / 60) : selectedRow.scores.risk, selectedRow.redFlags.filter(flag => flag.severity === 'critical').length)} color={selectedRow.redFlags.length ? 'var(--warning)' : 'var(--green-2)'} />
                  <MiniStat label="Attrition Risk" value={riskLabelFor(selectedRow.scores.risk, selectedRow.redFlags.filter(flag => flag.severity === 'critical').length)} color={selectedRow.redFlags.length ? 'var(--warning)' : 'var(--green-2)'} />
                  <MiniStat label="Likely Promotion" value={(selectedRow.scores.overall ?? 0) >= 85 && selectedRow.redFlags.length === 0 ? 'High' : 'Review'} color={(selectedRow.scores.overall ?? 0) >= 85 ? 'var(--green-2)' : 'var(--text-3)'} />
                </div>
              ) : <EmptyState>Select a user to generate predictions.</EmptyState>}
            </div>
          </div>
          )}

          {!isOperations && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18, marginBottom: 18 }}>
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<Users size={13} />} title="Team Comparison" subtitle="Supervisor, agent team, company average, and top-performer score comparison." />
              <div style={{ display: 'grid', gap: 10 }}>
                <MiniStat label="Supervisor" value={formatScore(supervisorAverage)} color={scoreColor(supervisorAverage)} />
                <MiniStat label="Agent Team" value={formatScore(agentAverage)} color={scoreColor(agentAverage)} />
                <MiniStat label="Company Average" value={formatScore(data.summary.averageOverallScore)} color={scoreColor(data.summary.averageOverallScore)} />
                <MiniStat label="Top Performer" value={formatScore(topScore)} color={scoreColor(topScore)} />
              </div>
            </div>

            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<Brain size={13} />} title="AI Coaching Timeline" subtitle="Coaching path created from currently available QA, compliance, and call signals." />
              {selectedRow ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    selectedRow.quality.qaScore === null ? 'QA Pending' : `${selectedRow.quality.qaScore}% QA reviewed`,
                    selectedRow.quality.scriptAdherence === null ? 'Script adherence pending' : `${selectedRow.quality.scriptAdherence}% script adherence`,
                    selectedRow.quality.sentiment ? `${selectedRow.quality.sentiment} sentiment` : 'Sentiment pending',
                    selectedRow.quality.coachingRecommendations[0] || (selectedRow.redFlags[0]?.detail ?? 'No coaching assignment required'),
                    selectedRow.quality.coachingRecommendations.length ? 'Assign training' : 'Monitor next session',
                  ].map((step, index) => (
                    <div key={`${step}-${index}`} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                      <span className="mono" style={{ width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', color: '#fff', background: index < 3 ? 'var(--pink)' : 'var(--purple)', fontSize: 11, fontWeight: 950 }}>{index + 1}</span>
                      <strong style={{ color: 'var(--text-2)', fontSize: 13.5 }}>{step}</strong>
                    </div>
                  ))}
                </div>
              ) : <EmptyState>Select a user to inspect coaching timeline.</EmptyState>}
            </div>
          </div>
          )}

          {isOperations && (
          <div style={{ ...panelStyle, padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ padding: 22, borderBottom: '1px solid var(--border)' }}>
              <SectionHeader icon={<Filter size={13} />} title="Workforce Command Table" subtitle="Drill down into productivity, attendance, dialer readiness, QA, and disciplinary risk." />
            </div>
            <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', overscrollBehaviorX: 'contain' }}>
              <table style={{ width: '100%', minWidth: 1120, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {commandHeaders.map(header => (
                      <th key={header.key} className="mono" style={commandHeaderStyle}>
                        <span style={{ display: 'inline-grid', gap: 2 }}>
                          {header.lines.map(line => <span key={line}>{line}</span>)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12 }}>
                          <div className="mono" style={{ ...commandCellStyle, color: 'var(--text)' }}>{row.name}</div>
                        </td>
                        <td className="mono" style={{ padding: 12, color: row.role === 'SUPERVISOR' ? 'var(--pink)' : 'var(--green-2)', fontWeight: 950, fontSize: 13.6 }}>{row.role.replace(/_/g, ' ')}</td>
                        <td className="mono" style={{ padding: 12, ...commandCellStyle }}>{row.productivity.currentCampaign || 'Not assigned'}</td>
                        <td className="mono" style={{ padding: 12, ...commandCellStyle }}>{row.productivity.bestPerformingCampaign || 'No queue'}</td>
                        <td className="mono" style={{ padding: 12, color: row.attendance.breakSeconds ? 'var(--warning)' : 'var(--text-3)', fontWeight: 950, fontSize: 13.6 }}>{row.attendance.breakSeconds ? formatSeconds(row.attendance.breakSeconds) : 'No break'}</td>
                        <td className="mono" style={{ padding: 12, ...(row.attendance.workedSeconds ? { ...commandTimerStyle, color: 'var(--green-2)' } : { ...commandCellStyle, color: 'var(--text-3)' }) }}>{row.attendance.workedSeconds ? formatSeconds(row.attendance.workedSeconds) : 'No session'}</td>
                        <td style={{ padding: 12 }}>
                          <div className="mono" style={{ color: row.status === 'ONLINE' ? 'var(--green-2)' : 'var(--text-3)', fontWeight: 950 }}>{row.status}</div>
                          <div style={{ marginTop: 5, color: row.attendance.sipRegistered ? 'var(--green-2)' : 'var(--text-3)', fontWeight: 900, fontSize: 12 }}>{row.attendance.sipRegistered ? 'SIP Registered' : 'SIP Disabled'}</div>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span className="mono" style={{ color: row.attendance.clockStatus.includes('DISCONNECT') || row.attendance.clockStatus.includes('MISSED') || row.attendance.clockStatus === 'NO SESSION' ? 'var(--danger)' : 'var(--green-2)', fontWeight: 950, fontSize: 11 }}>{row.attendance.clockStatus}</span>
                        </td>
                        <td className="mono" style={{ padding: 12, ...commandTimerStyle }}>{formatSeconds(row.attendance.workedSeconds)}</td>
                        <td style={{ padding: 12 }}>
                          <strong style={{ display: 'block', color: 'var(--text)' }}>{row.calls.callsMade}</strong>
                          <span style={{ color: 'var(--text-3)', fontSize: 11.9 }}>{row.calls.callsConnected} connected</span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <button
                            type="button"
                            className={String(selectedRow?.id) === String(row.id) ? 'ptdt-action-btn active' : 'ptdt-action-btn'}
                            onClick={() => inspectRow(row.id)}
                            style={{ minHeight: 34, padding: '0 12px' }}
                          >
                            {String(selectedRow?.id) === String(row.id) ? 'Inspecting' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18 }}>
            {isOperations && (
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<AlertTriangle size={13} />} title="Red Flag Operations" subtitle="Disciplinary, coaching, and attendance risk surfaced from backend records." subtitleSize={15.8} />
              <div style={{ display: 'grid', gap: 10 }}>
                {riskRows.length ? redFlagCategories.map(group => (
                  <div key={group.category} style={{ padding: 13, borderRadius: 17, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <DecisionPill label={group.category} color={group.flags.length ? 'var(--danger)' : 'var(--green-2)'} />
                      <strong className="mono" style={{ color: group.flags.length ? 'var(--danger)' : 'var(--green-2)', fontSize: 12 }}>{group.flags.length}</strong>
                    </div>
                    {group.flags.slice(0, 2).map(({ row, flag }) => (
                      <div key={`${row.id}-${flag.key}`} style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'minmax(110px, .4fr) minmax(0, 1fr)', gap: 10, color: 'var(--text-2)' }}>
                        <strong style={{ color: 'var(--text)' }}>{row.name}</strong>
                        <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>{flag.detail}</span>
                      </div>
                    ))}
                  </div>
                )) : <EmptyState>No red flags in the selected range.</EmptyState>}
              </div>
            </div>
            )}

            {isOperations && (
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<Target size={13} />} title="Executive Decisions" subtitle="Immediate action groups for coaching, reward, and operational control." subtitleSize={15.8} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <DecisionBox icon={<ShieldAlert size={17} />} label="Immediate Escalation" value={rows.filter(row => row.redFlags.some(flag => flag.severity === 'critical')).length} color="var(--danger)" names={rows.filter(row => row.redFlags.some(flag => flag.severity === 'critical')).slice(0, 3).map(row => row.name)} />
                <DecisionBox icon={<TrendingDown size={17} />} label="Needs Retraining" value={coachingRows.length} color="var(--warning)" names={coachingRows.slice(0, 3).map(row => row.name)} />
                <DecisionBox icon={<TrendingUp size={17} />} label="Possible Promotion" value={topPerformers.length} color="var(--green-2)" names={topPerformers.map(row => row.name)} />
                <DecisionBox icon={<CheckCircle2 size={17} />} label="Needs Supervisor Review" value={riskRows.length} color={riskRows.length ? 'var(--pink)' : 'var(--green-2)'} names={riskRows.slice(0, 3).map(row => row.name)} />
              </div>
            </div>
            )}

            {!isOperations && (
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<Sparkles size={13} />} title="Today's AI Recommendations" subtitle="Decision-ready actions derived from workforce, attendance, QA, and campaign records." subtitleSize={15.8} />
              <div style={{ display: 'grid', gap: 11 }}>
                {aiRecommendations.length ? aiRecommendations.map((recommendation, index) => (
                  <div key={`${recommendation}-${index}`} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10, alignItems: 'center', padding: 12, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                    <CheckCircle2 size={18} color="var(--green-2)" />
                    <strong style={{ color: 'var(--text-2)', fontSize: 14 }}>{recommendation}</strong>
                  </div>
                )) : <EmptyState>No AI recommendation generated from the current backend records.</EmptyState>}
              </div>
            </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PhoneMetricIcon() {
  return <BarChart3 size={17} />
}

function MegaphoneMetricIcon() {
  return <BarChart3 size={17} />
}

export function WorkforceOperationsPage() {
  return <WorkforceIntelligencePage mode="operations" />
}

function DecisionBox({ icon, label, value, color, names }: { icon: ReactNode; label: string; value: number; color: string; names: string[] }) {
  return (
    <div style={{ padding: 15, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, color }}>
        {icon}
        <span className="mono" style={{ fontSize: 12.6, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ marginTop: 9, fontSize: 28, fontWeight: 950, color: 'var(--text)' }}>{value}</div>
      <div style={{ minHeight: 36, color: 'var(--text-3)', fontSize: 14.3, lineHeight: 1.45 }}>
        {names.length ? names.join(' · ') : 'No users in this group.'}
      </div>
    </div>
  )
}
