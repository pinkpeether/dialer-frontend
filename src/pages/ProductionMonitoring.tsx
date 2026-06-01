import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BellRing,
  Clock3,
  Database,
  Download,
  Gauge,
  MemoryStick,
  PhoneCall,
  RefreshCw,
  RotateCcw,
  ServerCog,
  Sparkles,
  Users,
} from 'lucide-react'
import { monitoringAPI } from '../api/monitoring.api'
import { useQuery } from '@tanstack/react-query'

type MonitoringSummary = {
  generatedAt: string
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | string
  warnings: string[]
  db: { ok: boolean; latencyMs: number; error?: string }
  process: {
    uptimeSeconds: number
    pid: number
    nodeEnv: string
    platform: string
    arch: string
    memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number }
    loadAverage: number[]
  }
  api: {
    startedAt: string
    uptimeSeconds: number
    totalRequests: number
    total5xx: number
    poolTimeouts: number
    recent: {
      requestCount: number
      error5xxCount: number
      errorRatePercent: number
      averageLatencyMs: number
      p95LatencyMs: number
    }
    recentRequests: Array<{ timestamp: string; method: string; path: string; statusCode: number; durationMs: number }>
    recentErrors: Array<{ timestamp: string; method?: string; path?: string; statusCode?: number; message: string; type: string }>
  }
  agents: { totalActive: number; ready: number; busy: number; offline: number; byStatus: Record<string, number> }
  campaigns: {
    total: number
    byStatus: Record<string, number>
    activeHealth: Array<{
      id: number
      name: string
      mode: string
      waitingReason?: string | null
      lastSchedulerCheckAt?: string | null
      contacts: Record<string, number>
    }>
  }
  calls24h: {
    total: number
    byStatus: Record<string, number>
    byDisposition: Record<string, number>
    recent: Array<{
      id: number
      status: string
      disposition?: string | null
      campaignId: number
      agentId?: number | null
      duration?: number | null
      startedAt: string
      endedAt?: string | null
    }>
  }
  callbacks: { overdue: number; dueNext24h: number }
}

const statusColor = (status?: string) => {
  if (status === 'HEALTHY') return 'var(--green-2)'
  if (status === 'DEGRADED') return 'var(--warning)'
  if (status === 'CRITICAL') return 'var(--danger)'
  return 'var(--text-3)'
}

const statusBg = (status?: string) => {
  if (status === 'HEALTHY') return 'rgba(0,167,71,0.10)'
  if (status === 'DEGRADED') return 'rgba(240,185,11,0.12)'
  if (status === 'CRITICAL') return 'rgba(239,68,68,0.12)'
  return 'rgba(255,255,255,0.08)'
}

const formatTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

const formatUptime = (seconds?: number) => {
  if (!Number.isFinite(seconds) || !seconds) return '0m'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const tableCell: CSSProperties = {
  padding: '12px 11px',
  borderBottom: '1px solid var(--border)',
  fontSize: 12,
  verticalAlign: 'top',
  color: 'var(--text-2)',
}

const tableHead: CSSProperties = {
  ...tableCell,
  color: 'var(--text-3)',
  fontSize: 10.5,
  fontWeight: 850,
  letterSpacing: 1,
  textTransform: 'uppercase',
  textAlign: 'left',
}

const entries = (record?: Record<string, number>) =>
  Object.entries(record || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])

const downloadJson = (data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ptdt-monitoring-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ProductionMonitoring() {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [manualError, setManualError] = useState('')
  const [message, setMessage] = useState('')

  const monitoringQuery = useQuery<MonitoringSummary>({
    queryKey: ['monitoring', 'summary'],
    queryFn: monitoringAPI.summary,
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: autoRefresh ? 30 * 1000 : false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData: unknown) => previousData as MonitoringSummary | undefined,
  })

  const summary = monitoringQuery.data ?? null
  const loading = monitoringQuery.isLoading
  const error = manualError || (
    monitoringQuery.error
      ? monitoringQuery.error instanceof Error
        ? monitoringQuery.error.message
        : 'Failed to load monitoring summary'
      : ''
  )

  const load = async () => {
    setManualError('')
    setMessage('')
    await monitoringQuery.refetch()
  }

  const resetRuntime = async () => {
    setManualError('')
    setMessage('')
    try {
      await monitoringAPI.resetRuntime()
      setMessage('Runtime metrics reset.')
      await monitoringQuery.refetch()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Failed to reset runtime metrics')
    }
  }

  const status = summary?.status || 'UNKNOWN'
  const warningText = useMemo(() => (summary?.warnings || []).join(', '), [summary])
  const callStatusRows = useMemo(() => entries(summary?.calls24h.byStatus), [summary])
  const dispositionRows = useMemo(() => entries(summary?.calls24h.byDisposition), [summary])
  const agentRows = useMemo(() => entries(summary?.agents.byStatus), [summary])

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1540, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 30,
        }}
      >
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Sparkles size={11} /> PTDT Dialer Monitoring
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.2vw, 42px)',
              fontWeight: 900,
              lineHeight: 1.05,
              color: 'var(--text)',
              letterSpacing: '-0.04em',
              marginBottom: 10,
            }}
          >
            Production <span className="gradient-brand-text">Monitoring</span>
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: statusColor(status), display: 'inline-block' }} />
            API, database, campaigns, calls, callbacks, and runtime health in one operator view.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusPill status={status} generatedAt={summary?.generatedAt} />
          <ActionButton onClick={() => void load()} disabled={monitoringQuery.isFetching} icon={<RefreshCw size={15} />}>
            Refresh
          </ActionButton>
          <ActionButton onClick={() => setAutoRefresh(value => !value)} active={autoRefresh} icon={<Clock3 size={15} />}>
            {autoRefresh ? 'Auto On' : 'Auto Off'}
          </ActionButton>
          <ActionButton onClick={() => summary && downloadJson(summary)} disabled={!summary} icon={<Download size={15} />}>
            Export JSON
          </ActionButton>
          <ActionButton onClick={() => void resetRuntime()} icon={<RotateCcw size={15} />} tone="warning">
            Reset Runtime
          </ActionButton>
        </div>
      </motion.div>

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      {monitoringQuery.isFetching && summary && (
        <Notice tone="success">Refreshing monitoring snapshot in the background...</Notice>
      )}

      {loading && !summary ? (
        <div className="glass" style={{ minHeight: 320, display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
          Loading production monitoring...
        </div>
      ) : summary ? (
        <div style={{ display: 'grid', gap: 18 }}>
          <div
            className="glass"
            style={{
              padding: 18,
              border: `1px solid ${statusColor(status)}`,
              background: statusBg(status),
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) repeat(3, minmax(140px, auto))', gap: 16, alignItems: 'center' }}>
              <div>
                <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 850, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                  Overall system status
                </div>
                <div style={{ color: statusColor(status), fontSize: 30, fontWeight: 950, marginTop: 4 }}>
                  {status}
                </div>
                {warningText && (
                  <div style={{ marginTop: 8, color: 'var(--warning)', fontSize: 12, fontWeight: 750, lineHeight: 1.45 }}>
                    {warningText}
                  </div>
                )}
              </div>
              <HeaderStat label="API Uptime" value={formatUptime(summary.api.uptimeSeconds)} />
              <HeaderStat label="Process" value={`PID ${summary.process.pid}`} note={summary.process.nodeEnv} />
              <HeaderStat label="Generated" value={formatTime(summary.generatedAt)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <Metric label="DB Health" value={summary.db.ok ? 'OK' : 'FAIL'} note={`${summary.db.latencyMs}ms`} icon={<Database size={16} />} color={summary.db.ok ? 'var(--green-2)' : 'var(--danger)'} bg={summary.db.ok ? 'rgba(0,167,71,0.10)' : 'rgba(239,68,68,0.12)'} />
            <Metric label="API Error Rate" value={`${summary.api.recent.errorRatePercent}%`} note={`${summary.api.recent.error5xxCount}/${summary.api.recent.requestCount} recent 5xx`} icon={<Gauge size={16} />} color={summary.api.recent.error5xxCount > 0 ? 'var(--warning)' : 'var(--green-2)'} bg="rgba(34,211,238,0.10)" />
            <Metric label="P95 Latency" value={`${summary.api.recent.p95LatencyMs}ms`} note={`Avg ${summary.api.recent.averageLatencyMs}ms`} icon={<Activity size={16} />} color="#22d3ee" bg="rgba(34,211,238,0.10)" />
            <Metric label="Pool Timeouts" value={summary.api.poolTimeouts} note="Runtime recorded" icon={<AlertTriangle size={16} />} color={summary.api.poolTimeouts > 0 ? 'var(--danger)' : 'var(--green-2)'} bg={summary.api.poolTimeouts > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(0,167,71,0.10)'} />
            <Metric label="Ready Agents" value={summary.agents.ready} note={`${summary.agents.totalActive} active users`} icon={<Users size={16} />} color="var(--pink)" bg="rgba(251,11,140,0.10)" />
            <Metric label="Calls 24h" value={summary.calls24h.total} note={`${summary.calls24h.recent.length} recent rows`} icon={<PhoneCall size={16} />} color="var(--purple)" bg="rgba(128,87,215,0.12)" />
            <Metric label="Overdue Callbacks" value={summary.callbacks.overdue} note={`${summary.callbacks.dueNext24h} due next 24h`} icon={<BellRing size={16} />} color={summary.callbacks.overdue > 0 ? 'var(--warning)' : 'var(--green-2)'} bg="rgba(240,185,11,0.12)" />
            <Metric label="Memory" value={`${summary.process.memory.heapUsedMb}MB`} note={`RSS ${summary.process.memory.rssMb}MB`} icon={<MemoryStick size={16} />} color="var(--text)" bg="rgba(255,255,255,0.08)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 18 }}>
            <Section title="Active Campaign Health" subtitle="Scheduler state, contact pressure, and campaign waiting reasons.">
              {summary.campaigns.activeHealth.length === 0 ? (
                <Empty text="No active campaigns." />
              ) : (
                <Table headers={['Campaign', 'Mode', 'Waiting Reason', 'Pending', 'In Queue', 'Calling', 'Answered', 'Last Check']}>
                  {summary.campaigns.activeHealth.map(campaign => (
                    <tr key={campaign.id}>
                      <td style={{ ...tableCell, color: 'var(--text)', fontWeight: 850 }}>{campaign.name}</td>
                      <td style={tableCell}>{campaign.mode}</td>
                      <td style={tableCell}>{campaign.waitingReason || '-'}</td>
                      <td style={tableCell}>{campaign.contacts.pending ?? 0}</td>
                      <td style={tableCell}>{campaign.contacts.inQueue ?? 0}</td>
                      <td style={tableCell}>{campaign.contacts.calling ?? 0}</td>
                      <td style={tableCell}>{campaign.contacts.answered ?? 0}</td>
                      <td style={tableCell}>{formatTime(campaign.lastSchedulerCheckAt)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Section>

            <Section title="Live Mix" subtitle="Calls, agents, and dispositions from current runtime data.">
              <StatusRows title="Call Status" rows={callStatusRows} />
              <StatusRows title="Agent Status" rows={agentRows} />
              <StatusRows title="Dispositions" rows={dispositionRows} />
            </Section>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
              width: '100%',
            }}
          >
            <div style={{ flex: '1 1 calc(100% - 458px)', minWidth: 0 }}>
              <Section title="Recent API Requests" subtitle="Last captured request timings and HTTP status codes." fitContent>
              {summary.api.recentRequests.length === 0 ? (
                <Empty text="No runtime requests recorded yet." />
              ) : (
                <Table headers={['Time', 'Method', 'Path', 'Status', 'Duration']}>
                  {summary.api.recentRequests.map((req, index) => (
                    <tr key={`${req.timestamp}-${index}`}>
                      <td style={tableCell}>{formatTime(req.timestamp)}</td>
                      <td style={tableCell}>{req.method}</td>
                      <td style={{ ...tableCell, overflowWrap: 'anywhere' }}>{req.path}</td>
                      <td style={{ ...tableCell, color: req.statusCode >= 500 ? 'var(--danger)' : req.statusCode >= 400 ? 'var(--warning)' : 'var(--green-2)', fontWeight: 850 }}>{req.statusCode}</td>
                      <td style={tableCell}>{req.durationMs}ms</td>
                    </tr>
                  ))}
                </Table>
              )}
              </Section>
            </div>

            <div style={{ flex: '0 0 440px', width: 440, minWidth: 360 }}>
              <Section title="Recent Runtime Errors" subtitle="Recent API and process-level errors captured by monitoring." compact>
              {summary.api.recentErrors.length === 0 ? (
                <Empty text="No runtime errors recorded." />
              ) : (
                <Table headers={['Time', 'Type', 'Path', 'Status', 'Message']}>
                  {summary.api.recentErrors.map((err, index) => (
                    <tr key={`${err.timestamp}-${index}`}>
                      <td style={tableCell}>{formatTime(err.timestamp)}</td>
                      <td style={tableCell}>{err.type}</td>
                      <td style={{ ...tableCell, overflowWrap: 'anywhere' }}>{err.path || '-'}</td>
                      <td style={tableCell}>{err.statusCode || '-'}</td>
                      <td style={{ ...tableCell, color: 'var(--danger)', overflowWrap: 'anywhere' }}>{err.message}</td>
                    </tr>
                  ))}
                </Table>
              )}
              </Section>
            </div>
          </div>

          <Section title="Recent Calls 24h" subtitle="Latest call records used by production monitoring.">
            {summary.calls24h.recent.length === 0 ? (
              <Empty text="No recent calls." />
            ) : (
              <Table headers={['ID', 'Status', 'Disposition', 'Campaign', 'Agent', 'Duration', 'Started', 'Ended']}>
                {summary.calls24h.recent.map(call => (
                  <tr key={call.id}>
                    <td style={{ ...tableCell, color: 'var(--text)', fontWeight: 850 }}>{call.id}</td>
                    <td style={tableCell}>{call.status}</td>
                    <td style={tableCell}>{call.disposition || '-'}</td>
                    <td style={tableCell}>{call.campaignId}</td>
                    <td style={tableCell}>{call.agentId || '-'}</td>
                    <td style={tableCell}>{call.duration ?? '-'}</td>
                    <td style={tableCell}>{formatTime(call.startedAt)}</td>
                    <td style={tableCell}>{formatTime(call.endedAt)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>
        </div>
      ) : (
        <div className="glass" style={{ padding: 40, color: 'var(--text-3)', textAlign: 'center' }}>
          No monitoring data available.
        </div>
      )}
    </div>
  )
}

function StatusPill({ status, generatedAt }: { status: string; generatedAt?: string }) {
  return (
    <div className="glass" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${statusColor(status)}`, background: statusBg(status) }}>
      <ServerCog size={15} color={statusColor(status)} />
      <div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 850, letterSpacing: 1.1 }}>SYSTEM</div>
        <div style={{ fontSize: 12, fontWeight: 900, color: statusColor(status) }}>{status}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{formatTime(generatedAt)}</div>
      </div>
    </div>
  )
}

function ActionButton({
  children,
  icon,
  onClick,
  disabled,
  active,
  tone = 'default',
}: {
  children: ReactNode
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  tone?: 'default' | 'warning'
}) {
  const color = tone === 'warning' ? 'var(--warning)' : active ? 'var(--green-2)' : 'var(--text-2)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 42,
        borderRadius: 999,
        border: `1px solid ${active ? 'rgba(0,167,71,0.35)' : tone === 'warning' ? 'rgba(240,185,11,0.34)' : 'var(--border)'}`,
        background: active ? 'rgba(0,167,71,0.10)' : tone === 'warning' ? 'rgba(240,185,11,0.10)' : 'var(--bg-glass)',
        color,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 14px',
        fontWeight: 850,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {icon}
      {children}
    </button>
  )
}

function HeaderStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ minWidth: 130 }}>
      <div className="mono" style={{ color: 'var(--text-3)', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.1, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 850, marginTop: 5 }}>{value}</div>
      {note && <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>{note}</div>}
    </div>
  )
}

function Metric({ label, value, note, icon, color, bg }: { label: string; value: string | number; note?: string; icon: ReactNode; color: string; bg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass lift" style={{ padding: 17 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 14, background: bg, border: `1px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.1, fontWeight: 850, textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 950, color, marginTop: 3 }}>{value}</div>
          {note && <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 5, overflowWrap: 'anywhere' }}>{note}</div>}
        </div>
      </div>
    </motion.div>
  )
}

function Section({ title, subtitle, children, compact = false, fitContent = false }: { title: string; subtitle?: string; children: ReactNode; compact?: boolean; fitContent?: boolean }) {
  return (
    <section className="glass" style={{ padding: compact ? 18 : 20, overflow: fitContent ? 'hidden' : 'auto', width: '100%' }}>
      <div style={{ marginBottom: 14 }}>
        <h2 className="display" style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{title}</h2>
        {subtitle && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.45 }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function StatusRows({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
      <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 850, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>No data.</div>
      ) : rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 10px', borderRadius: 13, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.025)' }}>
          <span style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 750 }}>{label}</span>
          <span className="badge" style={{ color: 'var(--pink)', border: '1px solid rgba(251,11,140,0.28)', background: 'rgba(251,11,140,0.08)' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function Notice({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  const ok = tone === 'success'
  return (
    <div
      style={{
        marginBottom: 18,
        padding: '12px 16px',
        borderRadius: 16,
        border: `1px solid ${ok ? 'rgba(0,167,71,0.34)' : 'rgba(239,68,68,0.36)'}`,
        background: ok ? 'rgba(0,167,71,0.08)' : 'rgba(239,68,68,0.10)',
        color: ok ? 'var(--green-2)' : 'var(--danger)',
        fontSize: 12.5,
        fontWeight: 800,
      }}
    >
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ color: 'var(--text-3)', padding: '16px 0', fontSize: 13 }}>{text}</div>
}

function Table({ headers, children, minWidth = 0 }: { headers: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div style={{ overflowX: 'hidden', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth, tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {headers.map(header => <th key={header} style={tableHead}>{header}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
