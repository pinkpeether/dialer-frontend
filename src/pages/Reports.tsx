import {
  useEffect, useMemo, useState,
  type CSSProperties, type ChangeEvent, type ReactNode,
} from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, CalendarDays, Download,
  PhoneCall, RefreshCw, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { campaignsAPI } from '../api/campaigns.api'
import { callsAPI } from '../api/calls.api'
import { agentsAPI } from '../api/agents.api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Campaign = { id: number; name: string }
type Agent    = { id: number; name?: string | null }

type CallLog = {
  id: number
  campaignId?: number
  agentId?: number
  status: string
  disposition: string | null
  duration: number | null
  createdAt: string
  campaign?: { id: number; name?: string | null } | null
  agent?: { id: number; name?: string | null } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const extractList = <T,>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (!isRecord(payload)) return []
  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

const csvEscape = (value: string | number | null | undefined) => {
  const n = value === null || value === undefined ? '' : String(value)
  return `"${n.replace(/"/g, '""')}"`
}

const formatDate = (value: string) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

const isAnswered = (c: CallLog) =>
  c.status === 'ANSWERED' || c.disposition === 'ANSWERED' || c.status === 'COMPLETED'

const isNo = (c: CallLog) =>
  c.status === 'NO_ANSWER' || c.disposition === 'NO_ANSWER' || c.status === 'MISSED'

const CHART_COLORS = {
  answered: '#00a747',
  missed:   '#ef4444',
  busy:     '#f0b90b',
  other:    '#8057d7',
  calls:    '#fb0b8c',
  rate:     '#00f5a0',
}

const PIE_CELLS = [
  CHART_COLORS.answered,
  CHART_COLORS.missed,
  CHART_COLORS.busy,
  CHART_COLORS.other,
  '#3b82f6',
  '#f97316',
]

// ─── Chart data builders ──────────────────────────────────────────────────────

function buildDailyTrend(calls: CallLog[]) {
  const map = new Map<string, { calls: number; answered: number }>()
  for (const c of calls) {
    const day = c.createdAt.slice(0, 10)
    const prev = map.get(day) ?? { calls: 0, answered: 0 }
    map.set(day, {
      calls: prev.calls + 1,
      answered: prev.answered + (isAnswered(c) ? 1 : 0),
    })
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      day: day.slice(5),           // "MM-DD"
      calls: v.calls,
      answerRate: v.calls > 0 ? Math.round((v.answered / v.calls) * 100) : 0,
    }))
}

function buildDispositionPie(calls: CallLog[]) {
  const map = new Map<string, number>()
  for (const c of calls) {
    const key = c.disposition || c.status || 'UNKNOWN'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

function buildHourlyBar(calls: CallLog[]) {
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    calls: 0,
    answered: 0,
  }))
  for (const c of calls) {
    const h = new Date(c.createdAt).getHours()
    hours[h].calls++
    if (isAnswered(c)) hours[h].answered++
  }
  return hours
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'var(--bg-glass-hi)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', color: 'var(--text)',
  fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
}

function FilterField({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
        {icon} {label}
      </label>
      {children}
    </div>
  )
}

function ReportCard({ label, value, icon, color, bg }: { label: string; value: string | number; icon: ReactNode; color: string; bg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass lift" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, background: bg, border: `1px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.1, fontWeight: 800 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 3 }}>{value}</div>
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const color = value === 'ANSWERED' || value === 'COMPLETED'
    ? 'var(--green-2)' : value === 'FAILED' || value === 'NO_ANSWER' ? 'var(--danger)' : 'var(--pink)'
  return <span className="badge" style={{ color, background: 'var(--bg-glass)', border: `1px solid ${color}` }}>{value}</span>
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>{text}</div>
}

const tooltipStyle: CSSProperties = {
  background: 'rgba(8,5,18,0.96)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<number | 'all'>('all')
  const [selectedAgent, setSelectedAgent] = useState<number | 'all'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'hourly' | 'table'>('overview')

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [campRes, agentRes] = await Promise.all([
          campaignsAPI.getAll({ limit: 200 }),
          agentsAPI.getAll(),
        ])
        setCampaigns(extractList<Campaign>(campRes, ['campaigns', 'results']))
        const agentList = Array.isArray(agentRes) ? agentRes : extractList<Agent>(agentRes, ['agents', 'items', 'results'])
        setAgents(agentList)
      } catch {
        // non-fatal
      }
    }
    void loadMeta()
  }, [])

  const loadCalls = async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, unknown> = { limit: 500 }
      if (selectedCampaign !== 'all') params.campaignId = selectedCampaign
      if (selectedAgent !== 'all') params.agentId = selectedAgent
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await callsAPI.getAll(params)
      setCalls(extractList<CallLog>(response, ['calls', 'results', 'items', 'data']))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.')
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = calls.length
    const answered = calls.filter(isAnswered).length
    const noAnswer = calls.filter(isNo).length
    const durations = calls.map(c => c.duration).filter((d): d is number => typeof d === 'number' && d > 0)
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
    const answerRate = total > 0 ? Math.round((answered / total) * 100) : 0
    return { total, answered, noAnswer, avgDuration, answerRate }
  }, [calls])

  const dailyTrend   = useMemo(() => buildDailyTrend(calls), [calls])
  const dispositionPie = useMemo(() => buildDispositionPie(calls), [calls])
  const hourlyBar    = useMemo(() => buildHourlyBar(calls), [calls])

  const campaignName = (call: CallLog) => {
    if (call.campaign?.name) return call.campaign.name
    if (call.campaignId === undefined) return '—'
    return campaigns.find(c => c.id === call.campaignId)?.name || `Campaign #${call.campaignId}`
  }

  const exportCsv = () => {
    const header = ['ID', 'Campaign', 'Agent', 'Status', 'Disposition', 'Duration', 'Time']
    const rows = calls.map(call => [
      call.id, campaignName(call),
      call.agent?.name || (call.agent?.id ? `Agent #${call.agent.id}` : '—'),
      call.status, call.disposition || '', call.duration ?? '', formatDate(call.createdAt),
    ])
    const csv = [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `call-report-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const TABS: { key: typeof activeTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'hourly', label: 'Hourly Heatmap' },
    { key: 'table', label: 'Call Log Table' },
  ]

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}><Sparkles size={11} /> PTDT-Dialer Reports</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
            Call <span className="gradient-brand-text">Reports</span>
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pulse-dot pink" /> Filter, visualize, and export campaign call data.
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={exportCsv} disabled={calls.length === 0} className="btn-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-full)', padding: '0 22px', fontSize: 13.5, minHeight: 46, opacity: calls.length === 0 ? 0.55 : 1 }}>
          <Download size={15} /> Export CSV
        </motion.button>
      </motion.div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="glass" style={{ padding: 22, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.3fr) minmax(160px, 1fr) repeat(2, minmax(140px, 0.8fr)) auto', gap: 14, alignItems: 'end' }}>
          <FilterField label="Campaign" icon={<BarChart3 size={13} />}>
            <select value={selectedCampaign} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCampaign(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={inputStyle}>
              <option value="all">All Campaigns</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FilterField>
          <FilterField label="Agent" icon={<Users size={13} />}>
            <select value={selectedAgent} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAgent(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={inputStyle}>
              <option value="all">All Agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name || `Agent #${a.id}`}</option>)}
            </select>
          </FilterField>
          <FilterField label="Start Date" icon={<CalendarDays size={13} />}>
            <input type="date" value={startDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} style={inputStyle} />
          </FilterField>
          <FilterField label="End Date" icon={<CalendarDays size={13} />}>
            <input type="date" value={endDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} style={inputStyle} />
          </FilterField>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => void loadCalls()} disabled={loading} className="btn-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-md)', padding: '0 20px', minHeight: 42 }}>
            <RefreshCw size={14} /> {loading ? 'Loading…' : 'Load'}
          </motion.button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <ReportCard label="Total Calls"   value={stats.total}         icon={<PhoneCall size={16} />}   color="var(--pink)"    bg="rgba(251,11,140,0.10)" />
        <ReportCard label="Answered"      value={stats.answered}      icon={<ShieldCheck size={16} />} color="var(--green-2)" bg="rgba(0,167,71,0.10)"   />
        <ReportCard label="Answer Rate"   value={`${stats.answerRate}%`} icon={<BarChart3 size={16} />} color="var(--warning)" bg="rgba(240,185,11,0.12)"  />
        <ReportCard label="No Answer"     value={stats.noAnswer}      icon={<PhoneCall size={16} />}   color="var(--danger)"  bg="rgba(239,68,68,0.10)"  />
        <ReportCard label="Avg Duration"  value={`${stats.avgDuration}s`} icon={<CalendarDays size={16} />} color="var(--purple)" bg="rgba(128,87,215,0.12)" />
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)} style={{ padding: '8px 20px', borderRadius: 999, border: activeTab === t.key ? '1px solid var(--pink)' : '1px solid var(--border)', background: activeTab === t.key ? 'rgba(251,11,140,0.12)' : 'var(--bg-glass)', color: activeTab === t.key ? 'var(--pink)' : 'var(--text-3)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 18 }}>

          {/* Daily calls + answer rate line chart */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>Daily Calls & Answer Rate</div>
            {dailyTrend.length === 0 ? (
              <EmptyState text="Load data to see trend." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line yAxisId="left"  type="monotone" dataKey="calls"      stroke={CHART_COLORS.calls}  strokeWidth={2.5} dot={false} name="Calls" />
                  <Line yAxisId="right" type="monotone" dataKey="answerRate" stroke={CHART_COLORS.rate}   strokeWidth={2.5} dot={false} name="Answer Rate %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Disposition pie */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>Disposition Breakdown</div>
            {dispositionPie.length === 0 ? (
              <EmptyState text="Load data to see breakdown." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={dispositionPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                    {dispositionPie.map((_, i) => (
                      <Cell key={i} fill={PIE_CELLS[i % PIE_CELLS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Hourly heatmap tab ── */}
      {activeTab === 'hourly' && (
        <div className="glass" style={{ padding: 22 }}>
          <div className="display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>Calls by Hour of Day</div>
          {calls.length === 0 ? (
            <EmptyState text="Load data to see hourly distribution." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyBar} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.40)', fontSize: 10 }} interval={1} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.40)', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calls"    name="Total Calls" fill={CHART_COLORS.calls}    radius={[4, 4, 0, 0]} />
                <Bar dataKey="answered" name="Answered"    fill={CHART_COLORS.answered} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Table tab ── */}
      {activeTab === 'table' && (
        <div className="glass" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="display" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Call Log</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>Filtered call records from the backend.</div>
            </div>
            <span className="badge" style={{ color: 'var(--pink)', background: 'rgba(251,11,140,0.10)', border: '1px solid rgba(251,11,140,0.28)' }}>
              {calls.length} Records
            </span>
          </div>

          {loading ? (
            <EmptyState text="Loading…" />
          ) : calls.length === 0 ? (
            <EmptyState text="No calls found. Adjust filters and press Load." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    {['ID', 'Campaign', 'Agent', 'Status', 'Disposition', 'Duration', 'Time'].map(h => (
                      <th key={h} className="mono" style={{ padding: '12px 10px', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calls.map(call => (
                    <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="mono" style={{ padding: '13px 10px', color: 'var(--text-3)' }}>#{call.id}</td>
                      <td style={{ padding: '13px 10px', color: 'var(--text)', fontWeight: 700 }}>{campaignName(call)}</td>
                      <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{call.agent?.name || (call.agent?.id ? `Agent #${call.agent.id}` : '—')}</td>
                      <td style={{ padding: '13px 10px' }}><StatusBadge value={call.status} /></td>
                      <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{call.disposition || '—'}</td>
                      <td className="mono" style={{ padding: '13px 10px', color: 'var(--text)' }}>{call.duration ?? '—'}</td>
                      <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{formatDate(call.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
