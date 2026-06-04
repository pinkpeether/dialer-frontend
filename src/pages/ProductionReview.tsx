import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, ClipboardCheck, AlertTriangle } from 'lucide-react'
import { finalReviewAPI } from '../api/finalReview.api'

type ReviewRow = {
  method: string
  path: string
  frontendRoles: string[]
  backendRoles: string[]
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'MATCHED' | 'REVIEW'
  note?: string
}

type ReviewData = {
  generatedAt: string
  status: 'MATCHED' | 'REVIEW_REQUIRED'
  summary: {
    totalRoutes: number
    reviewItems: number
    highItems: number
  }
  routeMatrix: ReviewRow[]
  checks?: Record<string, boolean>
  notes: string[]
}

export default function ProductionReview() {
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rows: ReviewRow[] = useMemo(() => data?.routeMatrix || [], [data])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await finalReviewAPI.get())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load production review')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="ptdt-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><ClipboardCheck size={12} /> Production v1</div>
          <h1 className="ptdt-page-title" style={{ margin: 0 }}>Production <span className="gradient-brand-text">Review</span></h1>
          <p style={{ color: 'var(--text-3)', maxWidth: 760, lineHeight: 1.6 }}>Admin-only final checklist view for production v1 route and role review.</p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 14 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Metric label="Status" value={data?.status || (loading ? 'LOADING' : 'UNKNOWN')} good={data?.status === 'MATCHED'} />
        <Metric label="Total Routes" value={data?.summary?.totalRoutes ?? rows.length} />
        <Metric label="Review Items" value={data?.summary?.reviewItems ?? 0} good={(data?.summary?.reviewItems ?? 0) === 0} />
        <Metric label="High Items" value={data?.summary?.highItems ?? 0} />
      </div>

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['Method', 'Path', 'Frontend Roles', 'Backend Roles', 'Level', 'Status', 'Note'].map(header => (
                  <th key={header} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 26, color: 'var(--text-3)' }}>Loading production review...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 26, color: 'var(--text-3)' }}>No review rows found.</td></tr>
              ) : rows.map(row => (
                <tr key={`${row.method}-${row.path}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="mono" style={{ padding: '13px 16px', fontWeight: 900 }}>{row.method}</td>
                  <td className="mono" style={{ padding: '13px 16px', color: 'var(--text-2)' }}>{row.path}</td>
                  <td style={{ padding: '13px 16px' }}>{row.frontendRoles?.join(', ') || '—'}</td>
                  <td style={{ padding: '13px 16px' }}>{row.backendRoles?.join(', ') || '—'}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 900 }}>{row.level}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: row.status === 'MATCHED' ? 'var(--green-2)' : '#f0b90b', fontWeight: 900 }}>
                      {row.status === 'MATCHED' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--text-3)', minWidth: 220 }}>{row.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass" style={{ padding: 18, marginTop: 18 }}>
        <h2 style={{ marginTop: 0 }}>Notes</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-3)', lineHeight: 1.8 }}>{(data?.notes || []).map((note: string) => <li key={note}>{note}</li>)}</ul>
      </div>
    </div>
  )
}

function Metric({ label, value, good }: { label: string; value: string | number; good?: boolean }) {
  const color = good === undefined ? 'var(--text)' : good ? 'var(--green-2)' : '#f0b90b'
  return <div className="glass" style={{ padding: 16 }}><div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 7 }}>{label}</div><div className="mono" style={{ color, fontWeight: 950, fontSize: 22 }}>{value}</div></div>
}
