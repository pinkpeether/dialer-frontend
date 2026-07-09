import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
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

const riskTone = (row: WorkforceUserRow) => {
  if (row.redFlags.some(flag => flag.severity === 'critical')) return { label: 'Critical', color: 'var(--danger)' }
  if (row.redFlags.length) return { label: 'Watch', color: 'var(--warning)' }
  return { label: 'Clean', color: 'var(--green-2)' }
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
      style={{ ...panelStyle, padding: 18, minHeight: 126 }}
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

  const radarData = [
    { name: 'Productivity', value: row.scores.aiProductivity ?? 0, fill: '#fb0b8c' },
    { name: 'Quality', value: row.scores.aiQuality ?? 0, fill: '#8057d7' },
    { name: 'Attendance', value: row.scores.attendance ?? 0, fill: '#00a747' },
    { name: 'Sales', value: row.scores.sales ?? 0, fill: '#f0b90b' },
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
            <RadialBarChart innerRadius="30%" outerRadius="95%" data={radarData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={12} background={{ fill: 'var(--bg-2)' }}>
                {radarData.map(item => <Cell key={item.name} fill={item.fill} />)}
              </RadialBar>
              <Tooltip contentStyle={tooltipStyle} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {row.insights.map((insight, index) => {
            const color = insight.tone === 'positive' ? 'var(--green-2)' : insight.tone === 'risk' ? 'var(--danger)' : insight.tone === 'coaching' ? 'var(--warning)' : 'var(--text-3)'
            return (
              <div key={`${insight.text}-${index}`} style={{ padding: 13, borderRadius: 16, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, background: 'var(--bg-glass)', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.45, fontWeight: 780 }}>
                <span style={{ color, fontWeight: 950, marginRight: 7 }}>{insight.tone.toUpperCase()}</span>{insight.text}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function WorkforceIntelligencePage() {
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
  const scoreBars = rows.slice(0, 8).map(row => ({ name: row.name.split(' ')[0] || row.name, score: row.scores.overall || 0, risk: row.scores.risk || 0 }))
  const inspectRow = (id: string | number) => {
    setSelectedId(id)
    window.requestAnimationFrame(() => {
      insightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <div className="ptdt-page ptdt-workforce-intelligence-page" style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 13 }}><Sparkles size={12} /> Workforce Intelligence</div>
          <h1 className="ptdt-page-title">Workforce <span className="gradient-brand-text">Intelligence</span></h1>
          <p className="ptdt-page-desc" style={{ maxWidth: 'none', fontSize: 16.7, lineHeight: 1.45, whiteSpace: 'nowrap' }}>
            One operating view for productivity, attendance integrity, coaching risk, call output, AI review, and reward readiness.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="ptdt-action-btn" onClick={() => void reload()} disabled={loading || refreshing}>
            <RefreshCw size={14} /> {loading || refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <button type="button" className="ptdt-action-btn" onClick={() => exportWorkforceCsv(rows)} disabled={!rows.length}>
            <Download size={14} /> CSV
          </button>
          <button type="button" className="ptdt-action-btn" onClick={() => exportWorkforceExcel(rows)} disabled={!rows.length}>
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button type="button" className="ptdt-action-btn active" onClick={() => window.print()} disabled={!rows.length}>
            PDF
          </button>
        </div>
      </div>

      <div style={{ ...panelStyle, padding: 16, marginBottom: 18 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 13, marginBottom: 18 }}>
            <MetricCard icon={<Users size={17} />} label="Users" value={data.summary.totalUsers} sub={`${data.summary.onlineUsers} online`} color="var(--purple)" />
            <MetricCard icon={<Clock3 size={17} />} label="Clocked In" value={data.summary.clockedInUsers} sub="Attendance live" color="var(--green-2)" />
            <MetricCard icon={<ShieldAlert size={17} />} label="Flagged" value={data.summary.flaggedUsers} sub={`${data.redFlags.length} active flag(s)`} color={data.summary.flaggedUsers ? 'var(--danger)' : 'var(--green-2)'} />
            <MetricCard icon={<Gauge size={17} />} label="Avg Workforce" value={formatScore(data.summary.averageOverallScore)} sub="Composite score" color={scoreColor(data.summary.averageOverallScore)} />
            <MetricCard icon={<PhoneMetricIcon />} label="Calls" value={data.summary.callsMade} sub={`${data.summary.callsConnected} connected`} color="var(--pink)" />
            <MetricCard icon={<Clock3 size={17} />} label="Talk Time" value={formatSeconds(data.summary.talkTimeSeconds)} sub="Selected range" color="var(--warning)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18, marginBottom: 18 }}>
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<BarChart3 size={13} />} title="Workforce Activity Timeline" subtitle="Calls, connected calls, and answer rate from backend reporting records." />
              <div style={{ height: 280 }}>
                {data.timeline.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeline} margin={{ top: 8, right: 14, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wiCalls" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#fb0b8c" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#fb0b8c" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="calls" stroke="#fb0b8c" fill="url(#wiCalls)" strokeWidth={2.4} name="Calls" />
                      <Line type="monotone" dataKey="answered" stroke="#00a747" strokeWidth={2.4} dot={false} name="Connected" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState>No call trend records for this range.</EmptyState>}
              </div>
            </div>

            <div ref={insightRef}>
              <AgentDeepDive row={selectedRow} />
            </div>
          </div>

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
                {rewardReady.length ? rewardReady.map(row => (
                  <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 13, borderRadius: 17, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(240,185,11,.12)', color: 'var(--warning)' }}><Flame size={16} /></span>
                      <span>
                        <strong style={{ display: 'block', fontSize: 13.5 }}>{row.name}</strong>
                        <span style={{ color: 'var(--text-3)', fontSize: 11.9 }}>{row.productivity.achievements.join(' · ')}</span>
                      </span>
                    </span>
                    <ScorePill score={row.scores.overall} />
                  </button>
                )) : <EmptyState>No achievements generated from the selected range.</EmptyState>}
              </div>
            </div>
          </div>

          <div style={{ ...panelStyle, padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ padding: 22, borderBottom: '1px solid var(--border)' }}>
              <SectionHeader icon={<Filter size={13} />} title="Workforce Command Table" subtitle="Drill down into productivity, attendance, dialer readiness, QA, and disciplinary risk." />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 1280, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Rank', 'User', 'Role', 'Login / Dialer', 'Clock', 'Work', 'Calls', 'Quality', 'Scores', 'Risk', 'Action'].map(header => (
                      <th key={header} className="mono" style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-3)', fontSize: 10.5, fontWeight: 950, letterSpacing: 1.2, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const tone = riskTone(row)
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="mono" style={{ padding: 16, fontWeight: 950, color: 'var(--text)' }}>#{row.rank}</td>
                        <td style={{ padding: 16 }}>
                          <div style={{ fontWeight: 950, color: 'var(--text)' }}>{row.name}</div>
                          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.9, marginTop: 4 }}>{row.email}</div>
                        </td>
                        <td style={{ padding: 16, color: row.role === 'SUPERVISOR' ? 'var(--pink)' : 'var(--green-2)', fontWeight: 950, fontSize: 13.6 }}>{row.role.replace(/_/g, ' ')}</td>
                        <td style={{ padding: 16 }}>
                          <div className="mono" style={{ color: row.status === 'ONLINE' ? 'var(--green-2)' : 'var(--text-3)', fontWeight: 950 }}>{row.status}</div>
                          <div style={{ marginTop: 5, color: row.attendance.sipRegistered ? 'var(--green-2)' : 'var(--text-3)', fontWeight: 900, fontSize: 12 }}>{row.attendance.sipRegistered ? 'SIP Registered' : 'SIP Disabled'}</div>
                        </td>
                        <td style={{ padding: 16 }}>
                          <span className="mono" style={{ color: row.attendance.clockStatus.includes('DISCONNECT') || row.attendance.clockStatus.includes('MISSED') || row.attendance.clockStatus === 'NO SESSION' ? 'var(--danger)' : 'var(--green-2)', fontWeight: 950, fontSize: 11 }}>{row.attendance.clockStatus}</span>
                        </td>
                        <td className="mono" style={{ padding: 16, color: 'var(--text)', fontWeight: 950 }}>{formatSeconds(row.attendance.workedSeconds)}</td>
                        <td style={{ padding: 16 }}>
                          <strong style={{ display: 'block', color: 'var(--text)' }}>{row.calls.callsMade}</strong>
                          <span style={{ color: 'var(--text-3)', fontSize: 11.9 }}>{row.calls.callsConnected} connected</span>
                        </td>
                        <td style={{ padding: 16 }}>
                          <ScorePill score={row.quality.qaScore} />
                          <div style={{ color: 'var(--text-3)', fontSize: 11.4, marginTop: 5 }}>{row.quality.aiReviewedCalls} AI reviewed</div>
                        </td>
                        <td style={{ padding: 16, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                          <ScorePill score={row.scores.overall} />
                          <ScorePill score={row.scores.attendance} />
                          <ScorePill score={row.scores.sales} />
                        </td>
                        <td style={{ padding: 16 }}>
                          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 82, height: 30, borderRadius: 999, border: `1px solid ${tone.color}`, color: tone.color, background: 'var(--bg-glass)', fontWeight: 950, fontSize: 11 }}>{tone.label}</span>
                        </td>
                        <td style={{ padding: 16 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18 }}>
            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<AlertTriangle size={13} />} title="Red Flag Operations" subtitle="Disciplinary, coaching, and attendance risk surfaced from backend records." subtitleSize={15.8} />
              <div style={{ display: 'grid', gap: 10 }}>
                {riskRows.length ? riskRows.map(row => row.redFlags.map(flag => (
                  <div key={`${row.id}-${flag.key}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, .5fr) minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: 13, borderRadius: 17, border: `1px solid ${flag.severity === 'critical' ? 'rgba(239,68,68,.28)' : 'rgba(240,185,11,.28)'}`, background: 'var(--bg-glass)' }}>
                    <strong style={{ color: 'var(--text)' }}>{row.name}</strong>
                    <span style={{ color: 'var(--text-2)', fontSize: 17, lineHeight: 1.45 }}>{flag.detail}</span>
                    <span className="mono" style={{ color: flag.severity === 'critical' ? 'var(--danger)' : 'var(--warning)', fontWeight: 950, fontSize: 11 }}>{flag.label}</span>
                  </div>
                ))) : <EmptyState>No red flags in the selected range.</EmptyState>}
              </div>
            </div>

            <div style={{ ...panelStyle, padding: 22 }}>
              <SectionHeader icon={<Target size={13} />} title="Executive Decisions" subtitle="Immediate action groups for coaching, reward, and operational control." subtitleSize={15.8} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <DecisionBox icon={<TrendingUp size={17} />} label="Reward Ready" value={topPerformers.length} color="var(--green-2)" names={topPerformers.map(row => row.name)} />
                <DecisionBox icon={<TrendingDown size={17} />} label="Coaching Queue" value={rows.filter(row => row.quality.coachingRecommendations.length > 0).length} color="var(--warning)" names={rows.filter(row => row.quality.coachingRecommendations.length > 0).slice(0, 3).map(row => row.name)} />
                <DecisionBox icon={<ShieldAlert size={17} />} label="Disciplinary Review" value={rows.filter(row => row.redFlags.some(flag => flag.severity === 'critical')).length} color="var(--danger)" names={rows.filter(row => row.redFlags.some(flag => flag.severity === 'critical')).slice(0, 3).map(row => row.name)} />
                <DecisionBox icon={<CheckCircle2 size={17} />} label="Clean Operators" value={rows.filter(row => !row.redFlags.length).length} color="var(--green-2)" names={rows.filter(row => !row.redFlags.length).slice(0, 3).map(row => row.name)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PhoneMetricIcon() {
  return <BarChart3 size={17} />
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
