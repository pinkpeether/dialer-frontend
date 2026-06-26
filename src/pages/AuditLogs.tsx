import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
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

type AuditLogFilters = {
  search?: string
  action?: string
  entity?: string
  limit: number
}

type AuditLogsResponse = {
  logs?: AuditLog[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
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
  whiteSpace: 'nowrap',
}

const cellStyle: CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'top',
}

const headStyle: CSSProperties = {
  padding: '13px 16px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 800,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function flattenMetadata(value: unknown, prefix = 'metadata'): Array<[string, string]> {
  if (value === null || value === undefined) return []
  if (typeof value !== 'object') return [[prefix, formatDetailValue(value)]]
  if (Array.isArray(value)) {
    return value.length
      ? value.flatMap((item, index) => flattenMetadata(item, `${prefix}[${index}]`))
      : [[prefix, '[]']]
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return [[prefix, '{}']]

  return entries.flatMap(([key, item]) => {
    const path = prefix === 'metadata' ? key : `${prefix}.${key}`
    if (item && typeof item === 'object') return flattenMetadata(item, path)
    return [[path, formatDetailValue(item)]]
  })
}

function DetailTable({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--bg-glass-hi)',
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
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td
                style={{
                  width: '34%',
                  padding: '10px 14px',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  fontWeight: 850,
                  verticalAlign: 'top',
                }}
              >
                {label}
              </td>
              <td
                style={{
                  padding: '10px 14px',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 12.5,
                  fontWeight: 800,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  verticalAlign: 'top',
                }}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>
      {children}
    </div>
  )
}

function Notice({ tone, children }: { tone: 'error' | 'success' | 'muted'; children: ReactNode }) {
  const styles: Record<'error' | 'success' | 'muted', CSSProperties> = {
    error: {
      color: 'var(--danger)',
      borderColor: 'rgba(239,68,68,0.28)',
      background: 'rgba(239,68,68,0.08)',
    },
    success: {
      color: 'var(--green-2)',
      borderColor: 'rgba(0,167,71,0.28)',
      background: 'rgba(0,167,71,0.08)',
    },
    muted: {
      color: 'var(--text-3)',
      borderColor: 'var(--border)',
      background: 'var(--bg-glass)',
    },
  }

  return (
    <div
      className="glass"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '12px 16px',
        marginBottom: 16,
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        ...styles[tone],
      }}
    >
      {children}
    </div>
  )
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [appliedFilters, setAppliedFilters] = useState({ search: '', action: '', entity: '' })

  const queryParams = useMemo<AuditLogFilters>(() => ({
    search: appliedFilters.search.trim() || undefined,
    action: appliedFilters.action.trim() || undefined,
    entity: appliedFilters.entity.trim() || undefined,
    limit: 50,
  }), [appliedFilters])

  const auditQuery = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', queryParams],
    queryFn: async () => auditLogsAPI.getAll(queryParams) as Promise<AuditLogsResponse>,
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData: AuditLogsResponse | undefined) => previousData,
  })

  const logs = auditQuery.data?.logs ?? []
  const loading = auditQuery.isLoading
  const error = auditQuery.error
    ? auditQuery.error instanceof Error
      ? auditQuery.error.message
      : 'Failed to load audit logs'
    : ''

  const applyFilters = () => {
    setAppliedFilters({ search, action, entity })
  }

  const clearFilters = () => {
    setSearch('')
    setAction('')
    setEntity('')
    setAppliedFilters({ search: '', action: '', entity: '' })
  }

  const refresh = async () => {
    await auditQuery.refetch()
  }

  return (
    <div className="ptdt-page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <ShieldCheck size={11} /> PTDT-Dialer Security
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <h1 className="ptdt-page-title">
              Audit <span className="gradient-brand-text">Logs</span>
            </h1>
            <p className="ptdt-page-desc" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot" /> Review user actions, API activity, and system changes.
            </p>
          </div>

          <div className="ptdt-toolbar">
            {auditQuery.isFetching && logs.length > 0 && (
              <span className="pill">
                <RefreshCw size={13} /> Refreshing
              </span>
            )}
            <button type="button" onClick={() => void refresh()} disabled={auditQuery.isFetching} className="ptdt-action-btn" title="Refresh audit logs">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </motion.div>

      <div className="glass" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(140px, 190px) minmax(140px, 190px) auto auto', gap: 12, alignItems: 'center' }}>
          <label style={{ position: 'relative' }}>
            <Search size={16} color="var(--pink)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') applyFilters() }} placeholder="Search action, entity, IP, or record ID..." style={{ ...inputStyle, paddingLeft: 42, borderRadius: 999 }} />
          </label>

          <input value={action} onChange={event => setAction(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') applyFilters() }} placeholder="Action filter" style={{ ...inputStyle, borderRadius: 999 }} />
          <input value={entity} onChange={event => setEntity(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') applyFilters() }} placeholder="Entity filter" style={{ ...inputStyle, borderRadius: 999 }} />

          <button type="button" className="btn-brand" onClick={applyFilters} style={{ height: 43, borderRadius: 999, padding: '0 24px', fontSize: 12, fontWeight: 900 }}>Search</button>
          <button type="button" className="ptdt-action-btn" onClick={clearFilters} style={{ height: 43, borderRadius: 999, padding: '0 18px', fontSize: 12, fontWeight: 900 }}>Clear</button>
        </div>
      </div>

      {error && <Notice tone="error">{error}<button type="button" onClick={() => void refresh()} style={{ color: 'var(--pink)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900 }}>Retry</button></Notice>}
      {!error && auditQuery.isFetching && logs.length > 0 && <Notice tone="muted"><RefreshCw size={14} /> Showing cached audit logs while refreshing in the background.</Notice>}

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040 }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['Time', 'Actor', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Details'].map(header => <th key={header} style={headStyle}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><EmptyState>Loading audit logs...</EmptyState></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7}><EmptyState>No audit logs found.</EmptyState></td></tr>
              ) : logs.map((log, index) => (
                <motion.tr key={log.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.018 }} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700 }}><Clock size={14} color="var(--purple)" />{formatDate(log.createdAt)}</div></td>
                  <td style={cellStyle}><span style={{ ...pillStyle, color: 'var(--green)', borderColor: 'rgba(0,167,71,0.28)', background: 'rgba(0,167,71,0.08)' }}><UserRound size={13} /> {log.actorId ?? 'System'}</span></td>
                  <td style={cellStyle}><span style={pillStyle}>{log.action}</span></td>
                  <td style={{ ...cellStyle, fontWeight: 800, color: 'var(--text)' }}>{log.entity}</td>
                  <td className="mono" style={{ ...cellStyle, color: 'var(--text-3)', fontSize: 12 }}>{log.entityId || '—'}</td>
                  <td style={{ ...cellStyle, color: 'var(--text-3)', fontSize: 12 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Fingerprint size={13} color="var(--text-3)" /> {log.ipAddress || '—'}</span></td>
                  <td style={cellStyle}>
                    <button type="button" onClick={() => setSelected(log)} style={{ height: 32, borderRadius: 999, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid rgba(128,87,215,0.25)', background: 'rgba(128,87,215,0.08)', color: 'var(--purple)', fontSize: 10.5, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.6 }}>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 10060, background: 'rgba(3,2,8,0.58)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <motion.div initial={{ y: 18, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} className="glass-hi" style={{ width: 'min(760px, 96vw)', maxHeight: '86vh', overflow: 'hidden', padding: 0, borderRadius: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 950, color: 'var(--text)' }}>Audit Detail</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{selected.action} · {selected.entity}</div>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ height: 34, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-2)', padding: '0 14px', fontWeight: 900, cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ maxHeight: 'calc(86vh - 78px)', overflow: 'auto', padding: 18, display: 'grid', gap: 14, background: 'var(--bg-glass-hi)' }}>
              <DetailTable title="Audit Summary" rows={[
                ['Log ID', selected.id],
                ['Time', formatDate(selected.createdAt)],
                ['Actor', selected.actorId ?? 'System'],
                ['Action', selected.action],
                ['Entity', selected.entity],
                ['Entity ID', selected.entityId || '—'],
                ['IP Address', selected.ipAddress || '—'],
              ]} />
              <DetailTable title="Metadata" rows={flattenMetadata(selected.metadata).length ? flattenMetadata(selected.metadata) : [['Metadata', 'No metadata captured for this audit entry.']]} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
