import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Clipboard, Database, Download, Eye, EyeOff, HardDrive, MemoryStick, RefreshCw, ShieldCheck, Stethoscope } from 'lucide-react'
import { supportDiagnosticsAPI } from '../api/supportDiagnostics.api'
import { useQuery } from '@tanstack/react-query'

type SupportDiagnosticsData = {
  db?: { ok?: boolean; latencyMs?: number }
  monitoring?: { status?: string } | null
  recordings?: { storageStatus?: string } | null
  backend?: { uptimeSeconds?: number; nodeEnv?: string; memory?: { heapUsedMb?: number; rssMb?: number } }
  envPresence?: Record<string, boolean>
  [key: string]: unknown
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const goodish = (value?: string) => value === 'HEALTHY' || value === 'EMPTY' || value === 'OK'

function formatDiagnosticsValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function titleize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function collectArrayColumns(rows: unknown[]) {
  const columns = new Set<string>()
  rows.forEach(row => {
    if (isRecord(row)) {
      Object.keys(row).forEach(key => columns.add(key))
    }
  })
  return Array.from(columns)
}

function StructuredValueTable({ title, value, depth = 0 }: { title: string; value: unknown; depth?: number }) {
  const nestedBackground = depth > 0 ? 'rgba(255,255,255,0.72)' : 'var(--surface)'

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <DiagnosticsTable title={title} rows={[{ label: 'Rows', value: 'No entries' }]} />
    }

    const columns = collectArrayColumns(value)
    if (columns.length === 0) {
      return (
        <DiagnosticsTable
          title={title}
          rows={value.map((item, index) => ({ label: `Item ${index + 1}`, value: item }))}
        />
      )
    }

    return (
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 18,
          overflow: 'hidden',
          background: nestedBackground,
          minWidth: 0,
        }}
      >
        <div
          className="mono"
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-2)',
            fontSize: 10.5,
            fontWeight: 950,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {title} · {value.length} rows
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(520, columns.length * 150) }}>
            <thead>
              <tr>
                {columns.map(column => (
                  <th
                    key={column}
                    className="mono"
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-3)',
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: 0.7,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {titleize(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {columns.map(column => (
                    <td
                      key={column}
                      style={{
                        padding: '10px 12px',
                        borderTop: '1px solid rgba(16,16,24,0.06)',
                        color: column.toLowerCase().includes('status') ? 'var(--green-2)' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: 800,
                        wordBreak: 'break-word',
                        verticalAlign: 'top',
                      }}
                    >
                      {formatDiagnosticsValue(isRecord(row) ? row[column] : row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
    const scalarRows = entries
      .filter(([, item]) => !isRecord(item) && !Array.isArray(item))
      .map(([key, item]) => ({ label: titleize(key), value: item }))
    const nestedRows = entries.filter(([, item]) => isRecord(item) || Array.isArray(item))

    return (
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        {scalarRows.length > 0 && <DiagnosticsTable title={title} rows={scalarRows} />}
        {nestedRows.map(([key, item]) => (
          <StructuredValueTable key={key} title={`${title} · ${titleize(key)}`} value={item} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return <DiagnosticsTable title={title} rows={[{ label: 'Value', value }]} />
}

function DiagnosticsPayloadTables({ data }: { data: SupportDiagnosticsData }) {
  const entries = Object.entries(data)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {entries.map(([key, value]) => (
        <StructuredValueTable key={key} title={titleize(key)} value={value} />
      ))}
    </div>
  )
}

function DiagnosticsTable({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; value: unknown; tone?: 'good' | 'warning' | 'danger' }>
}) {
  const toneColor = {
    good: 'var(--green-2)',
    warning: 'var(--gold)',
    danger: 'var(--danger)',
  }

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--surface)',
        minWidth: 0,
      }}
    >
      <div
        className="mono"
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-2)',
          fontSize: 10.5,
          fontWeight: 950,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td
                style={{
                  width: '42%',
                  padding: '10px 14px',
                  borderTop: '1px solid rgba(16,16,24,0.06)',
                  color: 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {row.label}
              </td>
              <td
                style={{
                  padding: '10px 14px',
                  borderTop: '1px solid rgba(16,16,24,0.06)',
                  color: row.tone ? toneColor[row.tone] : 'var(--text)',
                  fontSize: 12.5,
                  fontWeight: 850,
                  wordBreak: 'break-word',
                }}
              >
                {formatDiagnosticsValue(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Metric({ title, value, note, icon, good }: { title: string; value: string; note?: string; icon: ReactNode; good?: boolean }) {
  const color = good === false ? 'var(--danger)' : good === true ? 'var(--green-2)' : 'var(--pink)'
  return (
    <div className="glass lift" style={{ padding: 18, minHeight: 124, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 'auto -40px -60px auto', width: 130, height: 130, borderRadius: '50%', background: `${color}22`, filter: 'blur(20px)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, position: 'relative' }}>
        <div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1.1, textTransform: 'uppercase' }}>{title}</div>
          <div style={{ marginTop: 9, color, fontWeight: 950, fontSize: 23, letterSpacing: '-0.04em' }}>{value}</div>
          {note && <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>{note}</div>}
        </div>
        <span className="sidebar-icon-shell" style={{ color }}>{icon}</span>
      </div>
    </div>
  )
}

export default function SupportDiagnostics() {
  const [message, setMessage] = useState('')
  const [manualError, setManualError] = useState('')
  const [showPayload, setShowPayload] = useState(false)

  const diagnosticsQuery = useQuery<SupportDiagnosticsData>({
    queryKey: ['support', 'diagnostics'],
    queryFn: supportDiagnosticsAPI.get,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const data = diagnosticsQuery.data ?? null
  const loading = diagnosticsQuery.isLoading
  const error = manualError || (
    !data && diagnosticsQuery.error
      ? diagnosticsQuery.error instanceof Error
        ? diagnosticsQuery.error.message
        : 'Failed to load diagnostics'
      : ''
  )

  const jsonText = useMemo(() => data ? JSON.stringify(data, null, 2) : '', [data])

  const load = async () => {
    setManualError('')
    setMessage('')
    const result = await diagnosticsQuery.refetch()
    if (result.error) {
      const errorMessage = result.error instanceof Error ? result.error.message : 'Failed to load diagnostics'
      if (data) {
        setMessage(`Showing last diagnostics snapshot. Refresh failed: ${errorMessage}`)
      } else {
        setManualError(errorMessage)
      }
    }
  }

  const copyJson = async () => {
    try { await navigator.clipboard.writeText(jsonText); setMessage('Diagnostics JSON copied.') }
    catch { setManualError('Could not copy diagnostics JSON.') }
  }

  const downloadJson = async () => {
    try {
      const blob = await supportDiagnosticsAPI.download()
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      downloadBlob(blob, `ptdt-support-diagnostics-${ts}.json`)
      setMessage('Diagnostics JSON downloaded.')
    } catch (err) { setManualError(err instanceof Error ? err.message : 'Failed to download diagnostics') }
  }

  const dbOk = Boolean(data?.db?.ok)
  const monitoringStatus = data?.monitoring?.status || 'UNKNOWN'
  const recordingStatus = data?.recordings?.storageStatus || 'UNKNOWN'

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><Stethoscope size={12} /> Production Support</div>
          <h1 className="ptdt-page-title">Support <span className="gradient-brand-text">Diagnostics</span></h1>
          <p className="ptdt-page-desc">Safe support snapshots for troubleshooting. Secrets are never exposed; only environment presence, runtime health, and storage status are shown.</p>
        </div>
        <div className="ptdt-toolbar">
          <button className="ptdt-action-btn" onClick={() => void load()} disabled={diagnosticsQuery.isFetching}><RefreshCw size={14} /> Refresh</button>
          <button className="ptdt-action-btn" onClick={() => void copyJson()} disabled={!data}><Clipboard size={14} /> Copy JSON</button>
          <button className="ptdt-action-btn active" onClick={() => void downloadJson()} disabled={!data}><Download size={14} /> Download</button>
        </div>
      </div>

      {error && <div className="glass" style={{ color: 'var(--danger)', padding: 14, marginBottom: 14, borderColor: 'rgba(239,68,68,.28)' }}><AlertTriangle size={14} /> {error}</div>}
      {message && <div className="glass" style={{ color: 'var(--green-2)', padding: 14, marginBottom: 14, borderColor: 'rgba(0,167,71,.28)' }}><ShieldCheck size={14} /> {message}</div>}
      {diagnosticsQuery.isFetching && data && (
        <div className="glass" style={{ color: 'var(--text-3)', padding: 12, marginBottom: 14, borderColor: 'var(--border)' }}>
          <RefreshCw size={14} /> Refreshing diagnostics in the background...
        </div>
      )}

      {loading && !data ? (
        <div className="glass" style={{ padding: 30, color: 'var(--text-3)' }}>Loading diagnostics...</div>
      ) : data ? (
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="ptdt-kpi-grid">
            <Metric title="DB Health" value={dbOk ? 'OK' : 'FAIL'} good={dbOk} note={`${data?.db?.latencyMs ?? '-'}ms`} icon={<Database size={17} />} />
            <Metric title="Monitoring" value={monitoringStatus} good={monitoringStatus === 'HEALTHY'} icon={<ShieldCheck size={17} />} />
            <Metric title="Recordings" value={recordingStatus} good={goodish(recordingStatus)} icon={<HardDrive size={17} />} />
            <Metric title="Backend Uptime" value={`${data?.backend?.uptimeSeconds ?? 0}s`} icon={<Stethoscope size={17} />} />
            <Metric title="Node Env" value={data?.backend?.nodeEnv || 'unknown'} icon={<ShieldCheck size={17} />} />
            <Metric title="Memory" value={`${data?.backend?.memory?.heapUsedMb ?? '-'}MB`} note={`RSS ${data?.backend?.memory?.rssMb ?? '-'}MB`} icon={<MemoryStick size={17} />} />
          </div>

          <section className="glass" style={{ padding: 20 }}>
            <h2 className="display" style={{ fontSize: 20, marginBottom: 14 }}>Environment Presence</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 12,
                alignItems: 'stretch',
              }}
            >
              {Object.entries(data.envPresence || {}).map(([key, present]) => (
                <div
                  key={key}
                  style={{
                    minWidth: 0,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'var(--surface)',
                    border: '1px solid rgba(16,16,24,0.10)',
                    borderRadius: '18px',
                    boxShadow: 'none',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    className="mono"
                    title={key}
                    style={{
                      minWidth: 0,
                      flex: '1 1 auto',
                      fontSize: 10.5,
                      color: 'var(--text-3)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {key}
                  </span>
                  <span className={`badge ${present ? 'badge-answered' : 'badge-busy'}`} style={{ flexShrink: 0 }}>
                    {present ? 'Present' : 'Missing'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <h2 className="display" style={{ fontSize: 20, marginBottom: 4 }}>Diagnostics Details</h2>
                <p style={{ color: 'var(--text-3)', fontSize: 12 }}>Readable support snapshot. The full backend payload opens as tables below.</p>
              </div>
              <button className="ptdt-action-btn" type="button" onClick={() => setShowPayload(value => !value)}>
                {showPayload ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPayload ? 'Hide Full Payload' : 'Show Full Payload'}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 12,
              }}
            >
              <DiagnosticsTable
                title="Backend Runtime"
                rows={[
                  { label: 'Environment', value: data.backend?.nodeEnv || 'unknown' },
                  { label: 'Uptime', value: `${data.backend?.uptimeSeconds ?? 0}s` },
                  { label: 'Heap Used', value: `${data.backend?.memory?.heapUsedMb ?? '-'}MB` },
                  { label: 'RSS Memory', value: `${data.backend?.memory?.rssMb ?? '-'}MB` },
                ]}
              />
              <DiagnosticsTable
                title="Database"
                rows={[
                  { label: 'Status', value: dbOk ? 'OK' : 'FAIL', tone: dbOk ? 'good' : 'danger' },
                  { label: 'Latency', value: `${data.db?.latencyMs ?? '-'}ms`, tone: dbOk ? 'good' : 'warning' },
                ]}
              />
              <DiagnosticsTable
                title="Monitoring"
                rows={[
                  { label: 'Status', value: monitoringStatus, tone: monitoringStatus === 'HEALTHY' ? 'good' : 'warning' },
                ]}
              />
              <DiagnosticsTable
                title="Recordings"
                rows={[
                  { label: 'Storage Status', value: recordingStatus, tone: goodish(recordingStatus) ? 'good' : 'warning' },
                ]}
              />
            </div>

            {showPayload && (
              <div style={{ marginTop: 14 }}>
                <DiagnosticsPayloadTables data={data} />
              </div>
            )}
          </section>
        </div>
      ) : <div className="glass" style={{ padding: 24 }}>No diagnostics available.</div>}
    </div>
  )
}
