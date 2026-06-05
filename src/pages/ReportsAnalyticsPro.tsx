import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { BarChart3, CalendarDays, Download, Mail, RefreshCw, Sparkles, UserCircle2 } from 'lucide-react'
import ReportsKpiGrid from '../components/ReportsKpiGrid'
import HourlyAnalyticsChart from '../components/HourlyAnalyticsChart'
import AgentPerformanceReportPanel from '../components/AgentPerformanceReportPanel'
import CampaignPdfReportPanel from '../components/CampaignPdfReportPanel'
import ConversionAndDurationPanel from '../components/ConversionAndDurationPanel'
import { reportsAnalyticsProAPI, type ReportsAnalyticsFilters } from '../api/reportsAnalyticsPro.api'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const today = new Date()
const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
const toInputDate = (date: Date) => date.toISOString().slice(0, 10)

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

function FilterField({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
        {icon} {label}
      </label>
      {children}
    </div>
  )
}

export default function ReportsAnalyticsPro() {
  const [from, setFrom] = useState(toInputDate(sevenDaysAgo))
  const [to, setTo] = useState(toInputDate(today))
  const [campaignId, setCampaignId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [period, setPeriod] = useState('daily')
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState('')
  const [overview, setOverview] = useState<any>(null)
  const [agents, setAgents] = useState<any>(null)
  const [hourly, setHourly] = useState<any>(null)
  const [conversions, setConversions] = useState<any>(null)
  const [duration, setDuration] = useState<any>(null)
  const [missed, setMissed] = useState<any>(null)
  const [emailPreview, setEmailPreview] = useState<any>(null)
  const [emailStatus, setEmailStatus] = useState('')

  const filters = useMemo<ReportsAnalyticsFilters>(() => ({
    from,
    to,
    campaignId: campaignId || undefined,
    agentId: agentId || undefined,
    period,
  }), [from, to, campaignId, agentId, period])

  const loadReports = async () => {
    setState('loading')
    setError('')
    try {
      const [overviewData, agentData, hourlyData, conversionData, durationData, missedData] = await Promise.all([
        reportsAnalyticsProAPI.overview(filters),
        reportsAnalyticsProAPI.agentPerformance(filters),
        reportsAnalyticsProAPI.hourly(filters),
        reportsAnalyticsProAPI.conversions(filters),
        reportsAnalyticsProAPI.duration(filters),
        reportsAnalyticsProAPI.missedCalls(filters),
      ])
      setOverview(overviewData)
      setAgents(agentData)
      setHourly(hourlyData)
      setConversions(conversionData)
      setDuration(durationData)
      setMissed(missedData)
      setState('ready')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Unable to load reports')
    }
  }

  const previewEmail = async () => {
    try {
      const result = await reportsAnalyticsProAPI.dailySummaryPreview(filters)
      setEmailPreview(result)
      setEmailStatus(`Preview ready: ${result.subject}`)
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : 'Unable to preview email')
    }
  }

  const sendEmail = async () => {
    try {
      const result = await reportsAnalyticsProAPI.sendDailySummary(filters)
      setEmailPreview(result)
      setEmailStatus(`${result.status}: ${result.message || result.subject}`)
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : 'Unable to evaluate/send email')
    }
  }

  useEffect(() => {
    void loadReports()
  }, [])

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Sparkles size={12} /> Reports & Analytics Pro
          </div>
          <h1 className="ptdt-page-title">
            Reports <span className="gradient-brand-text">Analytics Pro</span>
          </h1>
          <p className="ptdt-page-desc">
            End-of-campaign PDF export, per-agent performance, hourly answer patterns, conversion analysis, missed repeat reports, and guarded daily email reporting.
          </p>
        </div>
        <div className="ptdt-toolbar">
          <span className="ptdt-chip"><Mail size={12} /> Summary-ready</span>
          <button className="ptdt-action-btn" type="button" onClick={() => void loadReports()} disabled={state === 'loading'}>
            <RefreshCw size={14} /> {state === 'loading' ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-brand" type="button" onClick={() => void reportsAnalyticsProAPI.downloadCsvSummary(filters)} style={{ minHeight: 40 }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="ptdt-card" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <FilterField label="From" icon={<CalendarDays size={13} />}>
            <input type="date" value={from} onChange={event => setFrom(event.target.value)} style={inputStyle} />
          </FilterField>
          <FilterField label="To" icon={<CalendarDays size={13} />}>
            <input type="date" value={to} onChange={event => setTo(event.target.value)} style={inputStyle} />
          </FilterField>
          <FilterField label="Campaign ID" icon={<BarChart3 size={13} />}>
            <input type="number" min="1" value={campaignId} onChange={event => setCampaignId(event.target.value)} placeholder="Optional" style={inputStyle} />
          </FilterField>
          <FilterField label="Agent ID" icon={<UserCircle2 size={13} />}>
            <input type="number" min="1" value={agentId} onChange={event => setAgentId(event.target.value)} placeholder="Optional" style={inputStyle} />
          </FilterField>
          <FilterField label="Period" icon={<RefreshCw size={13} />}>
            <select value={period} onChange={event => setPeriod(event.target.value)} style={inputStyle}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </FilterField>
        </div>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
          {error}
        </div>
      )}

      {state === 'loading' && !overview ? (
        <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>
          Loading reports analytics...
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <ReportsKpiGrid kpis={overview?.kpis} />
          <CampaignPdfReportPanel filters={filters} onPreviewEmail={previewEmail} onSendEmail={sendEmail} emailStatus={emailStatus} />

          {emailPreview && (
            <section className="ptdt-card" style={{ padding: 20 }}>
              <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Daily Email <span className="gradient-brand-text">Preview</span></h3>
              <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 16, background: 'var(--bg-glass-hi)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 800 }}>
                {emailPreview.subject}
              </div>
              <pre
                style={{
                  margin: '12px 0 0',
                  padding: 16,
                  borderRadius: 18,
                  background: 'rgba(8,5,18,0.96)',
                  color: 'rgba(245,247,255,0.92)',
                  fontSize: 12,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {emailPreview.body}
              </pre>
            </section>
          )}

          <HourlyAnalyticsChart buckets={hourly?.buckets || []} />
          <AgentPerformanceReportPanel agents={agents?.agents || []} />
          <ConversionAndDurationPanel campaigns={conversions?.campaigns || []} duration={duration} missed={missed} />

          <div className="ptdt-card" style={{ padding: 15, color: 'var(--text-3)', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--text)' }}>Pilot note:</strong> PDF generation is dependency-free. Daily summary email send remains guarded until SMTP/SendGrid/Brevo sender adapter is explicitly enabled.
          </div>
        </div>
      )}
    </div>
  )
}
