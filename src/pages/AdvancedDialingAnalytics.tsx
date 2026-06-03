import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Gauge, RefreshCw, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import { advancedDialingAPI } from '../api/advancedDialing.api'

type DialingMetrics = {
  generatedAt?: string
  campaignId?: number | null
  totals?: Record<string, number>
  rates?: Record<string, number>
  recentCalls?: RecentDialingCall[]
  note?: string
}

type RecentDialingCall = {
  id?: number
  campaignId?: number | null
  agentId?: number | null
  status?: string | null
  disposition?: string | null
  duration?: number | null
  startedAt?: string | null
  endedAt?: string | null
}

type PacingPreview = {
  recommendedDialCount?: number
  cap?: number
  raw?: number
  readyAgents?: number
  answerRate?: number
  maxCallsPerReadyAgent?: number
  safetyMultiplier?: number
  featureFlagRequired?: boolean
}

type GuardrailPreview = {
  campaignId?: number
  safe?: boolean
  shouldPause?: boolean
  violations?: string[]
  maxAbandonmentRate?: number
  abandonmentRate?: number
}

const fmtPercent = (value?: number) => {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round((value || 0) * 100)}%`
}

const fmtDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

const METRICS_CACHE_KEY = 'ptdt-advanced-dialing-metrics'

function readCachedMetrics(): DialingMetrics | undefined {
  try {
    const cached = window.localStorage.getItem(METRICS_CACHE_KEY)
    return cached ? JSON.parse(cached) as DialingMetrics : undefined
  } catch {
    return undefined
  }
}

function writeCachedMetrics(metrics: DialingMetrics) {
  try {
    window.localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(metrics))
  } catch {
    // Cache is a performance helper only.
  }
}

export default function AdvancedDialingAnalytics() {
  const [pacing, setPacing] = useState<PacingPreview | null>(null)
  const [guardrails, setGuardrails] = useState<GuardrailPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')

  const metricsQuery = useQuery<DialingMetrics>({
    queryKey: ['advanced-dialing', 'metrics'],
    queryFn: async () => {
      const nextMetrics = await advancedDialingAPI.getMetrics()
      writeCachedMetrics(nextMetrics)
      return nextMetrics
    },
    initialData: readCachedMetrics,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const metrics = metricsQuery.data ?? null
  const loading = metricsQuery.isLoading && !metrics
  const error = previewError || (
    !metrics && metricsQuery.error
      ? metricsQuery.error instanceof Error
        ? metricsQuery.error.message
        : 'Failed to load advanced dialing metrics'
      : ''
  )

  const totals = metrics?.totals || {}
  const rates = metrics?.rates || {}
  const recentCallCount = metrics?.recentCalls?.length || 0

  const cards = useMemo(
    () => [
      { label: 'Total Calls', value: totals.totalCalls || 0, sub: `${totals.completedCalls || 0} completed`, icon: PhoneIcon(), color: '#fb0b8c' },
      { label: 'Answer Rate', value: fmtPercent(rates.answerRate), sub: `${totals.answeredCalls || 0} answered`, icon: <BarChart3 size={18} />, color: '#00a747' },
      { label: 'Callback Rate', value: fmtPercent(rates.callbackRate), sub: `${totals.callbackCalls || 0} callbacks`, icon: <Activity size={18} />, color: '#8057d7' },
      { label: 'Recent Sample', value: recentCallCount, sub: 'latest calls inspected', icon: <Gauge size={18} />, color: '#f0b90b' },
    ],
    [recentCallCount, rates.answerRate, rates.callbackRate, totals.answeredCalls, totals.callbackCalls, totals.completedCalls, totals.totalCalls]
  )

  const preview = async () => {
    setPreviewing(true)
    setPreviewError('')

    try {
      const [nextPacing, nextGuardrails] = await Promise.all([
        advancedDialingAPI.previewPacing({
          readyAgents: 3,
          answerRate: rates.answerRate || 0.2,
          maxCallsPerReadyAgent: 2,
        }),
        advancedDialingAPI.previewGuardrails({
          campaignId: metrics?.campaignId || 1,
          abandonmentRate: 0.01,
        }),
      ])
      setPacing(nextPacing)
      setGuardrails(nextGuardrails)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to run predictive preview')
    } finally {
      setPreviewing(false)
    }
  }

  const refreshMetrics = async () => {
    setPreviewError('')
    await metricsQuery.refetch()
  }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Sparkles size={12} /> Phase 6 Analytics
          </div>
          <h1 className="ptdt-page-title">
            Advanced <span className="gradient-brand-text">Dialing Analytics</span>
          </h1>
          <p className="ptdt-page-desc">
            Baseline dialing metrics, predictive pacing preview, and abandonment guardrail simulation for Admin/Supervisor review.
          </p>
        </div>
        <div className="ptdt-toolbar">
          <span className="ptdt-chip">
            <ShieldAlert size={13} /> Preview only
          </span>
          <button className="ptdt-action-btn" type="button" onClick={() => void refreshMetrics()} disabled={metricsQuery.isFetching}>
            <RefreshCw size={14} /> {metricsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-brand" type="button" onClick={() => void preview()} disabled={previewing}>
            <Zap size={14} /> {previewing ? 'Running...' : 'Run Preview'}
          </button>
        </div>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
          {error}
        </div>
      )}

      {!error && metricsQuery.isFetching && metrics && (
        <div className="ptdt-card" style={{ padding: 12, marginBottom: 16, color: 'var(--text-3)', borderColor: 'var(--border)' }}>
          <RefreshCw size={14} /> Showing cached analytics while refreshing in the background.
        </div>
      )}

      {loading ? (
        <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>
          Loading advanced dialing metrics...
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            {cards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.72fr)', gap: 16, alignItems: 'start' }}>
            <section className="ptdt-card" style={{ padding: 18 }}>
              <SectionTitle icon={<BarChart3 size={16} />} title="Baseline Metrics" subtitle={`Generated ${fmtDate(metrics?.generatedAt)}`} />
              <BaselineMetricsPanel metrics={metrics} />
            </section>

            <div style={{ display: 'grid', gap: 16 }}>
              <section className="ptdt-card" style={{ padding: 18 }}>
                <SectionTitle icon={<Zap size={16} />} title="Predictive V2 Preview" subtitle="Not connected to live scheduler." />
                {pacing ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                      <MiniStat label="Recommended" value={pacing.recommendedDialCount ?? 0} />
                      <MiniStat label="Safety Cap" value={pacing.cap ?? 0} />
                    </div>
                    <JsonBlock data={pacing} compact />
                  </>
                ) : (
                  <EmptyState text="Run preview to calculate conservative predictive pacing." />
                )}
              </section>

              <section className="ptdt-card" style={{ padding: 18 }}>
                <SectionTitle icon={<ShieldAlert size={16} />} title="Abandonment Guardrails" subtitle="Simulation only." />
                {guardrails ? (
                  <>
                    <div className={guardrails.safe ? 'badge badge-answered' : 'badge badge-noanswer'} style={{ width: 'fit-content', marginBottom: 12 }}>
                      {guardrails.safe ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {guardrails.safe ? 'Safe to preview' : 'Should pause'}
                    </div>
                    <JsonBlock data={guardrails} compact />
                  </>
                ) : (
                  <EmptyState text="Run preview to inspect guardrail output." />
                )}
              </section>
            </div>
          </div>

          {metrics?.note && (
            <div className="ptdt-card" style={{ padding: 14, marginTop: 16, color: 'var(--text-3)', lineHeight: 1.6 }}>
              {metrics.note}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PhoneIcon() {
  return <Activity size={18} />
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: string | number
  sub: string
  icon: ReactNode
  color: string
}) {
  return (
    <div className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 850 }}>
            {label}
          </div>
          <div className="display" style={{ marginTop: 8, fontSize: 28, fontWeight: 950, color }}>
            {value}
          </div>
          <div style={{ marginTop: 5, fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 14, display: 'grid', placeItems: 'center', color, background: `${color}18`, border: `1px solid ${color}44` }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center', color: 'var(--pink)', background: 'rgba(251,11,140,0.10)', border: '1px solid rgba(251,11,140,0.22)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 900, color: 'var(--text)', fontSize: 15 }}>{title}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '10px 11px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
      <div className="mono" style={{ color: 'var(--text-3)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ color: 'var(--text)', fontWeight: 950, fontSize: 20, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function BaselineMetricsPanel({ metrics }: { metrics: DialingMetrics | null }) {
  const totals = metrics?.totals || {}
  const rates = metrics?.rates || {}
  const recentCalls = metrics?.recentCalls || []
  const totalRows: Array<[string, string | number]> = [
    ['Total calls', totals.totalCalls || 0],
    ['Completed calls', totals.completedCalls || 0],
    ['Answered calls', totals.answeredCalls || 0],
    ['Callback calls', totals.callbackCalls || 0],
    ['DNC calls', totals.dncCalls || 0],
  ]

  const rateRows: Array<[string, string | number]> = [
    ['Answer rate', fmtPercent(rates.answerRate)],
    ['Callback rate', fmtPercent(rates.callbackRate)],
  ]

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <MetricTable title="Call Totals" rows={totalRows} />
        <MetricTable title="Conversion Rates" rows={rateRows} />
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 13px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>Recent Call Sample</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>Latest calls used for this baseline snapshot.</div>
          </div>
          <span className="ptdt-chip">{recentCalls.length} rows</span>
        </div>

        {recentCalls.length === 0 ? (
          <EmptyState text="No recent call sample available." />
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 360 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead>
                <tr>
                  {['Call', 'Campaign', 'Agent', 'Status', 'Disposition', 'Duration', 'Started'].map((heading) => (
                    <th key={heading} style={tableHeadStyle}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call, index) => (
                  <tr key={call.id || index}>
                    <td style={tableCellStyle}>#{call.id || '-'}</td>
                    <td style={tableCellStyle}>{call.campaignId || '-'}</td>
                    <td style={tableCellStyle}>{call.agentId || '-'}</td>
                    <td style={tableCellStyle}><StatusPill value={call.status || 'UNKNOWN'} /></td>
                    <td style={tableCellStyle}>{call.disposition || '-'}</td>
                    <td style={tableCellStyle}>{typeof call.duration === 'number' ? `${call.duration}s` : '-'}</td>
                    <td style={tableCellStyle}>{fmtDate(call.startedAt || undefined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricTable({ title, rows }: { title: string; rows: Array<[string, string | number]> }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-glass)' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
        {title}
      </div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{label}</span>
          <span className="mono" style={{ color: 'var(--text)', fontWeight: 900, fontSize: 12 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toUpperCase()
  const positive = normalized === 'COMPLETED' || normalized === 'ANSWERED'
  return (
    <span className={positive ? 'badge badge-answered' : 'badge badge-noanswer'}>
      {normalized}
    </span>
  )
}

const tableHeadStyle = {
  padding: '10px 11px',
  color: 'var(--text-3)',
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
  textAlign: 'left' as const,
  borderBottom: '1px solid var(--border)',
}

const tableCellStyle = {
  padding: '10px 11px',
  color: 'var(--text-2)',
  fontSize: 12,
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap' as const,
}

function JsonBlock({ data, compact = false }: { data: unknown; compact?: boolean }) {
  return (
    <pre
      className="ptdt-raw-json"
      style={{
        maxHeight: compact ? 260 : 520,
        margin: 0,
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 12.5 }}>
      {text}
    </div>
  )
}
