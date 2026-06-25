import { useEffect, useState } from 'react'
import { Database, RefreshCw } from 'lucide-react'
import { recordingStorageProAPI } from '../api/recordingStoragePro.api'

type Overview = {
  provider?: string
  bucket?: string
  generatedAt?: string
  totals?: {
    totalRecordings?: number
    transcribedRecordings?: number
    insightRecordings?: number
    totalDurationSeconds?: number
    averageDurationSeconds?: number
  }
  bySource?: Array<{ source: string; count: number }>
  byStatus?: Array<{ status: string; count: number }>
  storageCapabilities?: Record<string, boolean>
}

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="ptdt-card" style={{ padding: 16 }}>
    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.05 }}>{value}</div>
  </div>
)

export default function StorageOverviewPanel() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await recordingStorageProAPI.getOverview()
      setOverview(data as Overview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load storage overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const totals = overview?.totals || {}

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}>
            <Database size={12} /> Storage Overview
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Storage & Capacity</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
            Storage: {overview?.provider || '—'} · Bucket: {overview?.bucket || '—'}
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 12, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Recordings" value={totals.totalRecordings || 0} />
        <StatCard label="Transcripts" value={totals.transcribedRecordings || 0} />
        <StatCard label="Insights" value={totals.insightRecordings || 0} />
        <StatCard label="Total Duration" value={`${totals.totalDurationSeconds || 0}s`} />
        <StatCard label="Avg Duration" value={`${totals.averageDurationSeconds || 0}s`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        <div className="glass" style={{ padding: 14, borderRadius: 18 }}>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>By Source</div>
          {(overview?.bySource || []).map(row => (
            <div key={row.source} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>{row.source}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: 14, borderRadius: 18 }}>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>By Status</div>
          {(overview?.byStatus || []).map(row => (
            <div key={row.status} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>{row.status}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: 14, borderRadius: 18 }}>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>Capabilities</div>
          {Object.entries(overview?.storageCapabilities || {}).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>{key}</span>
              <strong style={{ color: value ? 'var(--green-2)' : 'var(--text-3)' }}>{value ? 'YES' : 'NO'}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
