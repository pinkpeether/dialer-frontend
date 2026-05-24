import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Clock, Eye, Fingerprint, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react'
import { auditLogsAPI } from '../api/auditLogs.api'

type AuditLog = {
  id: number
  actorId?: number | null
  action: string
  entity: string
  entityId?: string | null
  ipAddress?: string | null
  metadata?: unknown
  createdAt: string
}

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

const pillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 28,
  padding: '0 11px',
  borderRadius: 999,
  border: '1px solid rgba(251,11,140,0.22)',
  background: 'rgba(251,11,140,0.08)',
  color: 'var(--pink)',
  fontSize: 10.5,
  fontWeight: 900,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>
      {children}
    </div>
  )
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const load = async (query = search) => {
    setLoading(true)
    setError('')
    try {
      const data = await auditLogsAPI.getAll({
        search: query || undefined,
        action: action || undefined,
        entity: entity || undefined,
        limit: 50,
      })
      setLogs(data?.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadInitial = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await auditLogsAPI.getAll({ limit: 50 })
        if (!cancelled) setLogs(data?.logs || [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load audit logs')
          setLogs([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInitial()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1500, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <ShieldCheck size={11} /> PTDT-Dialer Security
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
              Audit <span className="gradient-brand-text">Logs</span>
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot" /> Review user actions, API activity, and system changes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            style={{ height: 42, width: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            title="Refresh audit logs"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      <div className="glass" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(140px, 190px) minmax(140px, 190px) auto', gap: 12, alignItems: 'center' }}>
          <label style={{ position: 'relative' }}>
            <Search size={16} color="var(--pink)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void load()
              }}
              placeholder="Search action, entity, IP, or record ID..."
              style={{ ...inputStyle, paddingLeft: 42, borderRadius: 999 }}
            />
          </label>

          <input
            value={action}
            onChange={e => setAction(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void load()
            }}
            placeholder="Action filter"
            style={{ ...inputStyle, borderRadius: 999 }}
          />

          <input
            value={entity}
            onChange={e => setEntity(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void load()
            }}
            placeholder="Entity filter"
            style={{ ...inputStyle, borderRadius: 999 }}
          />

          <button
            type="button"
            className="btn-brand"
            onClick={() => void load()}
            style={{ height: 43, borderRadius: 999, padding: '0 24px', fontSize: 12, fontWeight: 900 }}
          >
            Search
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: 13 }}>
          {error} <button type="button" onClick={() => void load()} style={{ color: 'var(--pink)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900 }}>Retry</button>
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['Time', 'Actor', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Details'].map(h => (
                  <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><EmptyState>Loading audit logs...</EmptyState></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7}><EmptyState>No audit logs found.</EmptyState></td></tr>
              ) : logs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.018 }}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700 }}>
                      <Clock size={14} color="var(--purple)" />
                      {formatDate(log.createdAt)}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ ...pillStyle, color: 'var(--green)', borderColor: 'rgba(0,167,71,0.28)', background: 'rgba(0,167,71,0.08)' }}>
                      <UserRound size={13} /> {log.actorId || 'System'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={pillStyle}>{log.action}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text)' }}>{log.entity}</td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12 }}>{log.entityId || '—'}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <Fingerprint size={13} color="var(--text-3)" /> {log.ipAddress || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      onClick={() => setSelected(log)}
                      style={{
                        height: 32,
                        borderRadius: 999,
                        padding: '0 13px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        border: '1px solid rgba(34,211,238,0.25)',
                        background: 'rgba(34,211,238,0.08)',
                        color: 'var(--cyan)',
                        fontSize: 10.5,
                        fontWeight: 900,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      <Eye size={13} /> Details
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ marginTop: 18, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>Audit Detail</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {selected.action} · {selected.entity}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{ height: 34, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', padding: '0 14px', fontWeight: 900, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
          <pre style={{ margin: 0, maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'rgba(7,5,16,0.58)', color: 'var(--text-2)', padding: 14, fontSize: 12 }}>
            {JSON.stringify(selected, null, 2)}
          </pre>
        </motion.div>
      )}
    </div>
  )
}
