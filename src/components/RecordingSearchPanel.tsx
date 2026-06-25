import { useCallback, useEffect, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { recordingStorageProAPI, type RecordingSearchParams } from '../api/recordingStoragePro.api'

type RecordingItem = {
  id: number
  callId: number
  status?: string
  disposition?: string
  duration?: number
  source?: string
  remoteNumber?: string
  recordingSid?: string
  startedAt?: string
  downloadable?: boolean
  contact?: { name?: string; phone?: string }
  campaign?: { name?: string; mode?: string }
  agent?: { name?: string; agentCode?: string; extension?: string }
  transcript?: { deletedAt?: string | null }
  insight?: { sentiment?: string; deletedAt?: string | null }
}

const initialFilters: RecordingSearchParams = {
  page: 1,
  limit: 20,
  search: '',
}

const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : '—'
const formatDuration = (seconds?: number) => {
  const safe = Math.max(0, Number(seconds || 0))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}m ${secs}s`
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 42,
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  color: 'var(--text)',
  padding: '0 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

export default function RecordingSearchPanel() {
  const [filters, setFilters] = useState<RecordingSearchParams>(initialFilters)
  const [items, setItems] = useState<RecordingItem[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async (nextFilters: RecordingSearchParams = filters) => {
    setLoading(true)
    setError('')
    try {
      const data = await recordingStorageProAPI.search(nextFilters)
      setItems((data.items || []) as RecordingItem[])
      setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load recordings')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load(initialFilters)
  }, [load])

  const updateFilter = (key: keyof RecordingSearchParams, value: string | boolean | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const applySearch = () => {
    void load({ ...filters, page: 1 })
  }

  const downloadRecording = async (callId: number) => {
    setMessage('')
    try {
      const info = await recordingStorageProAPI.getDownloadInfo(callId)
      if (info.downloadUrl) {
        window.open(String(info.downloadUrl), '_blank', 'noopener,noreferrer')
        setMessage(`Opened download for Call #${callId}`)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to open recording')
    }
  }

  const exportCsv = async () => {
    setMessage('')
    try {
      const blob = await recordingStorageProAPI.downloadCsv(filters)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ptdt-recordings-export.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to export CSV')
    }
  }

  const goToPage = (page: number) => {
    const next = { ...filters, page }
    setFilters(next)
    void load(next)
  }

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}>
            <Search size={12} /> Search & Download
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Recording Search</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
            Filter by phone, campaign, agent, source, date range, duration, and transcript presence.
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void exportCsv()}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <input value={filters.search || ''} onChange={event => updateFilter('search', event.target.value)} placeholder="Search phone / agent / campaign" style={fieldStyle} />
        <input type="date" value={filters.from || ''} onChange={event => updateFilter('from', event.target.value || undefined)} style={fieldStyle} />
        <input type="date" value={filters.to || ''} onChange={event => updateFilter('to', event.target.value || undefined)} style={fieldStyle} />
        <select value={filters.hasTranscript === undefined ? '' : String(filters.hasTranscript)} onChange={event => updateFilter('hasTranscript', event.target.value === '' ? undefined : event.target.value === 'true')} style={fieldStyle}>
          <option value="">Transcript: Any</option>
          <option value="true">Has transcript</option>
          <option value="false">No transcript</option>
        </select>
        <input type="number" value={filters.minDuration || ''} onChange={event => updateFilter('minDuration', event.target.value ? Number(event.target.value) : undefined)} placeholder="Min duration sec" style={fieldStyle} />
        <input type="number" value={filters.maxDuration || ''} onChange={event => updateFilter('maxDuration', event.target.value ? Number(event.target.value) : undefined)} placeholder="Max duration sec" style={fieldStyle} />
        <input value={filters.source || ''} onChange={event => updateFilter('source', event.target.value || undefined)} placeholder="Source" style={fieldStyle} />
        <button type="button" className="btn-brand" onClick={() => void applySearch()} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <div className="ptdt-card" style={{ padding: 12, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>{error}</div>}
      {message && <div className="ptdt-card" style={{ padding: 12, marginBottom: 14, color: 'var(--green-2)', borderColor: 'rgba(34,197,94,0.24)' }}>{message}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 980, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Call', 'Contact', 'Campaign', 'Agent', 'Duration', 'Started', 'AI', 'Download'].map(label => (
                <th key={label} className="mono" style={{ textAlign: 'left', padding: '12px 10px', fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700 }}>#{item.id}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.status || '—'} / {item.disposition || '—'}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11.5 }}>{item.recordingSid || 'No recording ref'}</div>
                </td>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>
                  <div>{item.contact?.name || 'Unknown'}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.contact?.phone || item.remoteNumber || '—'}</div>
                </td>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>
                  <div>{item.campaign?.name || '—'}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.campaign?.mode || ''}</div>
                </td>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>
                  <div>{item.agent?.name || 'Unassigned'}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.agent?.agentCode || item.agent?.extension || ''}</div>
                </td>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>{formatDuration(item.duration)}</td>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>{formatDate(item.startedAt)}</td>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 12 }}>Transcript: {item.transcript && !item.transcript.deletedAt ? 'YES' : 'NO'}</div>
                  <div style={{ fontSize: 12 }}>Insight: {item.insight && !item.insight.deletedAt ? item.insight.sentiment || 'YES' : 'NO'}</div>
                </td>
                <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>
                  <button type="button" disabled={!item.downloadable} onClick={() => void downloadRecording(item.id)} className="ptdt-action-btn" style={{ opacity: item.downloadable ? 1 : 0.45 }}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={8} style={{ padding: 22, textAlign: 'center', color: 'var(--text-3)' }}>No recordings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, color: 'var(--text-3)', fontSize: 13 }}>
        <div>Total: {pagination.total} recordings</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="ptdt-action-btn" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>Prev</button>
          <span className="ptdt-chip">Page {pagination.page} / {pagination.totalPages || 1}</span>
          <button type="button" className="ptdt-action-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>Next</button>
        </div>
      </div>
    </section>
  )
}
