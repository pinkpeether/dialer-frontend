import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, CalendarDays, Download, PhoneCall,
  RefreshCw, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import {
  LineChart, Line, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { campaignsAPI } from '../api/campaigns.api'
import { agentsAPI } from '../api/agents.api'
import {
  reportsAPI,
  type AgentReportRow,
  type CampaignReportRow,
  type ReportSummary,
  type ReportTrendRow,
} from '../api/reports.api'

type Campaign = { id: number; name: string }
type Agent = { id: number; name?: string | null }
type TabKey = 'overview' | 'campaigns' | 'agents'

const emptySummary: ReportSummary = {
  totalCalls: 0,
  answered: 0,
  noAnswer: 0,
  voicemail: 0,
  callback: 0,
  dnc: 0,
  wrongNumber: 0,
  failed: 0,
  totalTalkTimeSecs: 0,
  answerRate: 0,
}

const CHART_COLORS = {
  answered: '#00a747',
  missed: '#ef4444',
  callback: '#f0b90b',
  dnc: '#8057d7',
  calls: '#fb0b8c',
  rate: '#00f5a0',
}

const PIE_CELLS = [
  CHART_COLORS.answered,
  CHART_COLORS.missed,
  '#22d3ee',
  CHART_COLORS.callback,
  CHART_COLORS.dnc,
  '#f97316',
  CHART_COLORS.missed,
]

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'var(--font-body)',
}

const tooltipStyle: CSSProperties = {
  background: 'rgba(8,5,18,0.96)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
}

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
  const normalized = value === null || value === undefined ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

const fmtDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function normalizeTrend(rows: ReportTrendRow[]) {
  return rows.map((row) => {
    const date = new Date(row.date)
    const label = Number.isNaN(date.getTime())
      ? String(row.date).slice(5, 10)
      : date.toISOString().slice(5, 10)
    return {
      day: label,
      calls: row.total,
      answered: row.answered,
      answerRate: row.total > 0 ? Math.round((row.answered / row.total) * 100) : 0,
    }
  })
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

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
      {text}
    </div>
  )
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="glass" style={{ padding: 22 }}>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )
}

export default function Reports() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<number | 'all'>('all')
  const [selectedAgent, setSelectedAgent] = useState<number | 'all'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [summary, setSummary] = useState<ReportSummary>(emptySummary)
  const [trend, setTrend] = useState<ReportTrendRow[]>([])
  const [campaignRows, setCampaignRows] = useState<CampaignReportRow[]>([])
  const [agentRows, setAgentRows] = useState<AgentReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [campRes, agentRes] = await Promise.all([
          campaignsAPI.getAll({ limit: 200 }),
          agentsAPI.getAll(),
        ])
        setCampaigns(extractList<Campaign>(campRes, ['campaigns', 'results']))
        setAgents(Array.isArray(agentRes) ? agentRes : extractList<Agent>(agentRes, ['agents', 'items', 'results']))
      } catch {
        // Non-fatal: report endpoints still work without filter labels.
      }
    }
    void loadMeta()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    setError('')
    try {
      const filters = {
        from: startDate || undefined,
        to: endDate || undefined,
        campaignId: selectedCampaign === 'all' ? undefined : selectedCampaign,
        agentId: selectedAgent === 'all' ? undefined : selectedAgent,
      }
      const [nextSummary, nextTrend, nextCampaigns, nextAgents] = await Promise.all([
        reportsAPI.getSummary(filters),
        reportsAPI.getCallTrend({ ...filters, granularity: 'day' }),
        reportsAPI.getCampaignBreakdown(filters),
        reportsAPI.getAgentBreakdown(filters),
      ])
      setSummary(nextSummary)
      setTrend(nextTrend)
      setCampaignRows(nextCampaigns)
      setAgentRows(nextAgents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backend reports.')
      setSummary(emptySummary)
      setTrend([])
      setCampaignRows([])
      setAgentRows([])
    } finally {
      setLoading(false)
    }
  }

  const trendData = useMemo(() => normalizeTrend(trend), [trend])
  const filteredCampaignRows = useMemo(
    () => selectedCampaign === 'all' ? campaignRows : campaignRows.filter(row => row.id === selectedCampaign),
    [campaignRows, selectedCampaign]
  )
  const filteredAgentRows = useMemo(
    () => selectedAgent === 'all' ? agentRows : agentRows.filter(row => row.id === selectedAgent),
    [agentRows, selectedAgent]
  )

  const dispositionPie = useMemo(() => [
    { name: 'Answered', value: summary.answered },
    { name: 'No Answer', value: summary.noAnswer },
    { name: 'Voicemail', value: summary.voicemail },
    { name: 'Callback', value: summary.callback },
    { name: 'DNC', value: summary.dnc },
    { name: 'Wrong Number', value: summary.wrongNumber },
    { name: 'Failed', value: summary.failed },
  ].filter(item => item.value > 0), [summary])

  const exportCsv = () => {
    const campaignLines = filteredCampaignRows.map(row => [
      'Campaign', row.id, row.name, row.status, row.totalContacts, row.totalCalls, row.answered, `${row.answerRate}%`, row.totalTalkTimeSecs,
    ])
    const agentLines = filteredAgentRows.map(row => [
      'Agent', row.id, row.name, row.status, '', row.totalCalls, row.answered, `${row.answerRate}%`, row.totalTalkTimeSecs,
    ])
    const header = ['Type', 'ID', 'Name', 'Status', 'Contacts', 'Calls', 'Answered', 'Answer Rate', 'Talk Time Seconds']
    const csv = [header, ...campaignLines, ...agentLines].map(row => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backend-report-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'agents', label: 'Agents' },
  ]

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}><Sparkles size={11} /> PTDT-Dialer Reports</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
            Backend <span className="gradient-brand-text">Reports</span>
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pulse-dot pink" /> Live KPIs, trend, campaign, and agent reports from /api/reports.
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={exportCsv} disabled={filteredCampaignRows.length + filteredAgentRows.length === 0} className="btn-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-full)', padding: '0 22px', fontSize: 13.5, minHeight: 46, opacity: filteredCampaignRows.length + filteredAgentRows.length === 0 ? 0.55 : 1 }}>
          <Download size={15} /> Export CSV
        </motion.button>
      </motion.div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', fontWeight: 700 }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ padding: 22, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.3fr) minmax(160px, 1fr) repeat(2, minmax(140px, 0.8fr)) auto', gap: 14, alignItems: 'end' }}>
          <FilterField label="Campaign" icon={<BarChart3 size={13} />}>
            <select value={selectedCampaign} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCampaign(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={inputStyle}>
              <option value="all">All Campaigns</option>
              {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
            </select>
          </FilterField>
          <FilterField label="Agent" icon={<Users size={13} />}>
            <select value={selectedAgent} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAgent(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={inputStyle}>
              <option value="all">All Agents</option>
              {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name || `Agent #${agent.id}`}</option>)}
            </select>
          </FilterField>
          <FilterField label="Start Date" icon={<CalendarDays size={13} />}>
            <input type="date" value={startDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} style={inputStyle} />
          </FilterField>
          <FilterField label="End Date" icon={<CalendarDays size={13} />}>
            <input type="date" value={endDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} style={inputStyle} />
          </FilterField>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => void loadReports()} disabled={loading} className="btn-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-md)', padding: '0 20px', minHeight: 42 }}>
            <RefreshCw size={14} /> {loading ? 'Loading...' : 'Load'}
          </motion.button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <ReportCard label="Total Calls" value={summary.totalCalls} icon={<PhoneCall size={16} />} color="var(--pink)" bg="rgba(251,11,140,0.10)" />
        <ReportCard label="Answered" value={summary.answered} icon={<ShieldCheck size={16} />} color="var(--green-2)" bg="rgba(0,167,71,0.10)" />
        <ReportCard label="Answer Rate" value={`${summary.answerRate}%`} icon={<BarChart3 size={16} />} color="var(--warning)" bg="rgba(240,185,11,0.12)" />
        <ReportCard label="No Answer" value={summary.noAnswer} icon={<PhoneCall size={16} />} color="var(--danger)" bg="rgba(239,68,68,0.10)" />
        <ReportCard label="Talk Time" value={fmtDuration(summary.totalTalkTimeSecs)} icon={<CalendarDays size={16} />} color="var(--purple)" bg="rgba(128,87,215,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ padding: '8px 20px', borderRadius: 999, border: activeTab === tab.key ? '1px solid var(--pink)' : '1px solid var(--border)', background: activeTab === tab.key ? 'rgba(251,11,140,0.12)' : 'var(--bg-glass)', color: activeTab === tab.key ? 'var(--pink)' : 'var(--text-3)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 18 }}>
          <div className="glass" style={{ padding: 22 }}>
            <div className="display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>Backend Call Trend</div>
            {trendData.length === 0 ? (
              <EmptyState text="Load data to see /reports/calls trend." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line yAxisId="left" type="monotone" dataKey="calls" stroke={CHART_COLORS.calls} strokeWidth={2.5} dot={false} name="Calls" />
                  <Line yAxisId="left" type="monotone" dataKey="answered" stroke={CHART_COLORS.answered} strokeWidth={2.5} dot={false} name="Answered" />
                  <Line yAxisId="right" type="monotone" dataKey="answerRate" stroke={CHART_COLORS.rate} strokeWidth={2.5} dot={false} name="Answer Rate %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass" style={{ padding: 22 }}>
            <div className="display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>Disposition Summary</div>
            {dispositionPie.length === 0 ? (
              <EmptyState text="Load data to see /reports/summary breakdown." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={dispositionPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                    {dispositionPie.map((_, i) => <Cell key={i} fill={PIE_CELLS[i % PIE_CELLS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <TableShell>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {['Campaign', 'Status', 'Contacts', 'Calls', 'Answered', 'Answer Rate', 'Talk Time'].map(header => (
                  <th key={header} className="mono" style={{ padding: '12px 10px', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><EmptyState text="Loading campaigns..." /></td></tr>
              ) : filteredCampaignRows.length === 0 ? (
                <tr><td colSpan={7}><EmptyState text="No campaign report rows for the current filters." /></td></tr>
              ) : filteredCampaignRows.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '13px 10px', color: 'var(--text)', fontWeight: 800 }}>{row.name}</td>
                  <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{row.status}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--text)' }}>{row.totalContacts}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--text)' }}>{row.totalCalls}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--green-2)' }}>{row.answered}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--warning)' }}>{row.answerRate}%</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{fmtDuration(row.totalTalkTimeSecs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {activeTab === 'agents' && (
        <TableShell>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {['Agent', 'Code', 'Status', 'Calls', 'Answered', 'Answer Rate', 'Talk Time'].map(header => (
                  <th key={header} className="mono" style={{ padding: '12px 10px', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><EmptyState text="Loading agents..." /></td></tr>
              ) : filteredAgentRows.length === 0 ? (
                <tr><td colSpan={7}><EmptyState text="No agent report rows for the current filters." /></td></tr>
              ) : filteredAgentRows.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '13px 10px', color: 'var(--text)', fontWeight: 800 }}>{row.name}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{row.agentCode}</td>
                  <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{row.status}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--text)' }}>{row.totalCalls}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--green-2)' }}>{row.answered}</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--warning)' }}>{row.answerRate}%</td>
                  <td className="mono" style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{fmtDuration(row.totalTalkTimeSecs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </div>
  )
}
