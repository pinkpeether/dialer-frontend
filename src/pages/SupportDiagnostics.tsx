import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clipboard, Download, RefreshCw, ShieldCheck, Stethoscope } from 'lucide-react'
import { supportDiagnosticsAPI } from '../api/supportDiagnostics.api'

type SupportDiagnosticsData = {
  db?: {
    ok?: boolean
    latencyMs?: number
  }
  monitoring?: {
    status?: string
  } | null
  recordings?: {
    storageStatus?: string
  } | null
  backend?: {
    uptimeSeconds?: number
    nodeEnv?: string
    memory?: {
      heapUsedMb?: number
      rssMb?: number
    }
  }
  envPresence?: Record<string, boolean>
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function SupportDiagnostics() {
  const [data, setData] = useState<SupportDiagnosticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const jsonText = useMemo(() => data ? JSON.stringify(data, null, 2) : '', [data])

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      setData(await supportDiagnosticsAPI.get())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
      setMessage('Diagnostics JSON copied.')
    } catch {
      setError('Could not copy diagnostics JSON.')
    }
  }

  const downloadJson = async () => {
    try {
      const blob = await supportDiagnosticsAPI.download()
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      downloadBlob(blob, `ptdt-support-diagnostics-${ts}.json`)
      setMessage('Diagnostics JSON downloaded.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download diagnostics')
    }
  }

  const dbOk = data?.db?.ok
  const monitoringStatus = data?.monitoring?.status || 'UNKNOWN'
  const recordingStatus = data?.recordings?.storageStatus || 'UNKNOWN'

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Stethoscope size={12} /> Production Support
          </div>
          <h1 className="display" style={{ fontSize: 38, fontWeight: 900, margin: 0 }}>
            Support <span className="gradient-brand-text">Diagnostics</span>
          </h1>
          <p style={{ color: 'var(--text-3)', maxWidth: 720, lineHeight: 1.6 }}>
            Generate a safe support snapshot for troubleshooting. Secret values are not included.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => void copyJson()} disabled={!data}><Clipboard size={14} /> Copy JSON</button>
          <button className="btn-brand" onClick={() => void downloadJson()} disabled={!data}><Download size={14} /> Download</button>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 14 }}>{error}</div>}
      {message && <div style={{ color: 'var(--green-2)', marginBottom: 14 }}>{message}</div>}

      {loading && !data ? (
        <div className="glass" style={{ padding: 24 }}>Loading diagnostics...</div>
      ) : data ? (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <Metric title="DB Health" value={dbOk ? 'OK' : 'FAIL'} good={dbOk} note={`${data?.db?.latencyMs ?? '-'}ms`} />
            <Metric title="Monitoring" value={monitoringStatus} good={monitoringStatus === 'HEALTHY'} />
            <Metric title="Recordings" value={recordingStatus} good={recordingStatus === 'HEALTHY' || recordingStatus === 'EMPTY'} />
            <Metric title="Backend Uptime" value={`${data?.backend?.uptimeSeconds ?? 0}s`} />
            <Metric title="Node Env" value={data?.backend?.nodeEnv || 'unknown'} />
            <Metric title="Memory" value={`${data?.backend?.memory?.heapUsedMb ?? '-'}MB`} note={`RSS ${data?.backend?.memory?.rssMb ?? '-'}MB`} />
          </div>

          <section className="glass" style={{ padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>Environment Presence</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {Object.entries(data.envPresence || {}).map(([key, present]) => (
                <div key={key} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{key}</span>
                  <span style={{ color: present ? 'var(--green-2)' : '#f0b90b', fontWeight: 900 }}>
                    {present ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass" style={{ padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>Diagnostics JSON</h2>
            <pre style={{ maxHeight: 520, overflow: 'auto', padding: 16, borderRadius: 14, background: 'rgba(0,0,0,0.08)', border: '1px solid var(--border)', fontSize: 11, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'var(--text-2)' }}>
              {jsonText}
            </pre>
          </section>
        </div>
      ) : (
        <div className="glass" style={{ padding: 24 }}>No diagnostics available.</div>
      )}
    </div>
  )
}

function Metric({ title, value, note, good }: { title: string; value: string | number; note?: string; good?: boolean }) {
  const color = good === undefined ? 'var(--text)' : good ? 'var(--green-2)' : '#ef4444'
  return (
    <div className="glass" style={{ padding: 16, borderRadius: 18 }}>
      <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 6 }}>{title}</div>
      <div style={{ color, fontSize: 24, fontWeight: 950 }}>{value}</div>
      {note && <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 6 }}>{note}</div>}
    </div>
  )
}
