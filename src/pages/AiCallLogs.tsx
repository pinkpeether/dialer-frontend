import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Brain, CheckCircle2, Clock, Copy, FileAudio, ListFilter, Phone, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import { aiCallsAPI, type AiCallLog, type AiCallLogsPagination } from '../api/aiCalls.api'

type AnyRecord = Record<string, unknown>

const PAGE_SIZE = 10

const PTDT_AI_LOGS_CSS = `
.ptdt-ai-call-modal-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: var(--sidebar-width);
  z-index: 80;
  background: rgba(2,6,23,0.62);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

@media (max-width: 900px) {
  .ptdt-ai-call-modal-backdrop {
    left: 0;
    padding: 14px;
  }

  .ptdt-ai-call-logs-page {
    width: 100% !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 72px 12px 28px !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .ptdt-ai-call-logs-page * {
    box-sizing: border-box;
    min-width: 0;
  }

  .ptdt-ai-call-logs-page [style*="display: grid"],
  .ptdt-ai-call-logs-page [style*="display:grid"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-ai-call-logs-page .glass,
  .ptdt-ai-call-logs-page .ptdt-card {
    width: 100% !important;
    max-width: 100% !important;
  }

  .ptdt-ai-call-logs-page table {
    min-width: 980px !important;
  }

  .ptdt-ai-call-logs-page input,
  .ptdt-ai-call-logs-page button,
  .ptdt-ai-call-logs-page audio {
    max-width: 100% !important;
  }
}
`

const inputStyle: CSSProperties = {
  width: '100%',
  height: 43,
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass)',
  color: 'var(--text)',
  padding: '0 16px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 800,
}

const asRecord = (value: unknown): AnyRecord => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
}

const pickList = (payload: unknown): AiCallLog[] => {
  const record = asRecord(payload)
  const nested = asRecord(record.data)

  if (Array.isArray(record.items)) return record.items as AiCallLog[]
  if (Array.isArray(record.logs)) return record.logs as AiCallLog[]
  if (Array.isArray(record.aiCallLogs)) return record.aiCallLogs as AiCallLog[]
  if (Array.isArray(nested.items)) return nested.items as AiCallLog[]
  if (Array.isArray(nested.logs)) return nested.logs as AiCallLog[]

  return []
}

const pickPagination = (payload: unknown): AiCallLogsPagination | null => {
  const record = asRecord(payload)
  const nested = asRecord(record.data)
  const pagination = asRecord(record.pagination)
  const nestedPagination = asRecord(nested.pagination)

  if (Object.keys(pagination).length) return pagination as AiCallLogsPagination
  if (Object.keys(nestedPagination).length) return nestedPagination as AiCallLogsPagination

  return null
}

const pickDetail = (payload: unknown): AiCallLog => {
  const record = asRecord(payload)
  const nested = asRecord(record.data)
  const candidates = [
    record.log,
    record.item,
    record.aiCallLog,
    record.callLog,
    nested.log,
    nested.item,
    nested.aiCallLog,
    nested.callLog,
    payload,
  ]

  for (const candidate of candidates) {
    const detail = asRecord(candidate)
    if (Object.keys(detail).length) return detail as AiCallLog
  }

  return payload as AiCallLog
}

const fmtDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

const fmtDuration = (durationMs?: number | null) => {
  if (!durationMs || durationMs <= 0) return '—'
  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

const compact = (value?: string | number | boolean | null) => {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

const publicCallId = (log?: AiCallLog | null) => {
  if (!log?.id) return '—'
  return `#${log.id}`
}

const getNested = (source: unknown, path: string[]) => {
  let current: unknown = source

  for (const key of path) {
    const record = asRecord(current)
    current = record[key]
  }

  return current
}

const pickStringValue = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return ''
}

const getTransferDestination = (log?: AiCallLog | null) => {
  if (!log) return ''

  return pickStringValue(
    log.transferDestination,
    getNested(log.callAnalysis, ['transferDestination']),
    getNested(log.callAnalysis, ['transfer_destination']),
    getNested(log.callAnalysis, ['transfer', 'destination']),
    getNested(log.callAnalysis, ['transfer', 'toNumber']),
    getNested(log.callAnalysis, ['transfer', 'to_number']),
    getNested(log.callAnalysis, ['transfer', 'phoneNumber']),
    getNested(log.callAnalysis, ['transfer', 'phone_number']),
    getNested(log.callAnalysis, ['call', 'transferDestination']),
    getNested(log.callAnalysis, ['call', 'transfer_destination']),
    getNested(log.callAnalysis, ['callAnalysis', 'transferDestination']),
    getNested(log.callAnalysis, ['call_analysis', 'transfer_destination'])
  )
}

const getRecordingUrl = (log?: AiCallLog | null) => {
  if (!log) return ''

  return pickStringValue(
    log.recordingUrl,
    getNested(log.callAnalysis, ['recordingUrl']),
    getNested(log.callAnalysis, ['recording_url']),
    getNested(log.callAnalysis, ['call', 'recordingUrl']),
    getNested(log.callAnalysis, ['call', 'recording_url'])
  )
}

const isPlayableRecordingUrl = (value: string) => {
  if (!value) return false

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const lowerValue = value.toLowerCase()

    if (!['http:', 'https:'].includes(url.protocol)) return false
    if (hostname === 'example.com' || hostname.endsWith('.example.com')) return false
    if (lowerValue.includes('fake') || lowerValue.includes('smoke')) return false

    return true
  } catch {
    return false
  }
}

const matchesAiCallSearch = (log: AiCallLog, query: string) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const searchable = [
    log.id,
    log.providerCallId,
    log.lastEvent,
    log.callStatus,
    log.callType,
    log.direction,
    log.fromNumber,
    log.toNumber,
    log.agentId,
    log.agentName,
    log.durationMs,
    log.disconnectionReason,
    log.transferDestination,
    log.transcriptText,
    log.transcriptLength,
    log.callSummary,
    log.userSentiment,
    log.callSuccessful,
    log.inVoicemail,
    log.createdAt,
    log.updatedAt,
    log.lastWebhookAt,
    getTransferDestination(log),
    getRecordingUrl(log),
  ]

  return searchable.some(value => String(value ?? '').toLowerCase().includes(normalized))
}

function MetricCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: ReactNode; color?: string }) {
  return (
    <div className="ptdt-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: color || 'var(--pink)', marginBottom: 10 }}>
        {icon}
        <span className="mono" style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 900, letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ color: 'var(--text)', fontSize: 22, fontWeight: 950 }}>{value}</div>
    </div>
  )
}

function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'green' | 'pink' | 'gold' | 'neutral' }) {
  const color =
    tone === 'green' ? 'var(--green)' :
      tone === 'pink' ? 'var(--pink)' :
        tone === 'gold' ? '#f0b90b' :
          'var(--text-3)'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${color}44`, background: `${color}14`, color, borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export default function AiCallLogs() {
  const [logs, setLogs] = useState<AiCallLog[]>([])
  const [pagination, setPagination] = useState<AiCallLogsPagination | null>(null)
  const [selected, setSelected] = useState<AiCallLog | null>(null)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const loadLogs = useCallback(async (targetPage = page, targetSearch = appliedSearch) => {
    setLoading(true)
    setError('')

    try {
      const payload = await aiCallsAPI.getLogs({
        page: targetPage,
        limit: PAGE_SIZE,
        search: targetSearch || undefined,
      })

      setLogs(pickList(payload))
      setPagination(pickPagination(payload))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI call logs')
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, page])

  useEffect(() => {
    void loadLogs(page, appliedSearch)
  }, [loadLogs, page, appliedSearch])

  const pager = useMemo(() => {
    const total = pagination?.total ?? logs.length
    const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE))

    return {
      page: pagination?.page ?? page,
      limit: pagination?.limit ?? PAGE_SIZE,
      total,
      totalPages,
      hasNextPage: pagination?.hasNextPage ?? page < totalPages,
      hasPreviousPage: pagination?.hasPreviousPage ?? page > 1,
    }
  }, [logs.length, page, pagination])

  const visibleLogs = useMemo(() => {
    return logs.filter(row => matchesAiCallSearch(row, appliedSearch))
  }, [appliedSearch, logs])

  const stats = useMemo(() => {
    return {
      total: appliedSearch ? visibleLogs.length : pager.total,
      recordings: visibleLogs.filter(row => isPlayableRecordingUrl(getRecordingUrl(row))).length,
      transcripts: visibleLogs.filter(row => row.transcriptText || (row.transcriptLength || 0) > 0).length,
      successful: visibleLogs.filter(row => row.callSuccessful === true).length,
    }
  }, [appliedSearch, pager.total, visibleLogs])

  const runSearch = () => {
    const normalized = search.trim()
    setAppliedSearch(normalized)
    setPage(1)

    if (page === 1 && normalized === appliedSearch) {
      void loadLogs(1, normalized)
    }
  }

  const openDetail = async (row: AiCallLog) => {
    setSelected(row)
    setDetailLoading(true)
    setError('')

    try {
      const detail = pickDetail(await aiCallsAPI.getLog(row.id))
      setSelected({ ...row, ...detail })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI call detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const copyText = async (value?: string | null, label = 'text') => {
    if (!value?.trim()) return

    try {
      await navigator.clipboard.writeText(value)
      setError('')
    } catch {
      setError(`Unable to copy ${label}. Please copy it manually.`)
    }
  }

  const selectedAnalysis = selected?.callAnalysis ? JSON.stringify(selected.callAnalysis, null, 2) : ''
  const selectedTransferDestination = getTransferDestination(selected)
  const selectedRecordingUrl = getRecordingUrl(selected)
  const selectedPlayableRecordingUrl = isPlayableRecordingUrl(selectedRecordingUrl) ? selectedRecordingUrl : ''

  useEffect(() => {
    if (!selected) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selected])

  return (
    <div className="ptdt-ai-call-logs-page" style={{ padding: '32px 36px', maxWidth: 1500, margin: '0 auto' }}>
      <style>{PTDT_AI_LOGS_CSS}</style>

      <div className="ptdt-page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow purple" style={{ marginBottom: 12 }}>
            <Brain size={12} /> AI Voice Layer
          </div>
          <h1 className="ptdt-page-title">AI Call <span className="gradient-brand-text">Logs</span></h1>
          <p className="ptdt-page-desc">Review AI call logs stored from secure call result updates. Detailed technical data is hidden by default.</p>
        </div>

        <div className="ptdt-toolbar">
          <button type="button" className="ptdt-action-btn" onClick={() => void loadLogs(page, appliedSearch)} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <MetricCard icon={<ListFilter size={16} />} label="Total Logs" value={stats.total} />
        <MetricCard icon={<FileAudio size={16} />} label="Recordings" value={stats.recordings} color="var(--green)" />
        <MetricCard icon={<Brain size={16} />} label="Transcripts" value={stats.transcripts} color="var(--purple)" />
        <MetricCard icon={<ShieldCheck size={16} />} label="Successful" value={stats.successful} color="var(--green)" />
      </div>

      <div className="glass" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, alignItems: 'center' }}>
          <label style={{ position: 'relative' }}>
            <Search size={16} color="var(--pink)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') runSearch()
              }}
              placeholder="Search call ID, phone number, agent, status..."
              style={{ ...inputStyle, paddingLeft: 42 }}
            />
          </label>

          <button type="button" className="btn-brand" onClick={runSearch} style={{ height: 43, borderRadius: 999, padding: '0 24px', fontSize: 12, fontWeight: 900 }}>
            Search
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: 13, fontWeight: 800 }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['Time', 'Call ID', 'To Number', 'Direction', 'Status', 'Duration', 'Sentiment', 'Success', 'Recording', 'Action'].map(header => (
                  <th key={header} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 26, textAlign: 'center', color: 'var(--text-3)', fontWeight: 800 }}>Loading AI call logs...</td></tr>
              ) : visibleLogs.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 26, textAlign: 'center', color: 'var(--text-3)', fontWeight: 800 }}>No AI call logs found.</td></tr>
              ) : visibleLogs.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 800 }}>
                      <Clock size={14} color="var(--purple)" /> {fmtDate(row.lastWebhookAt || row.updatedAt || row.createdAt)}
                    </span>
                  </td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--pink)', fontSize: 12, fontWeight: 900, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {publicCallId(row)}
                  </td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <Phone size={13} color="var(--green)" /> {compact(row.toNumber)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusPill>{compact(row.direction || row.callType)}</StatusPill>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusPill tone={row.callStatus === 'ended' ? 'green' : 'gold'}>{compact(row.callStatus || row.lastEvent)}</StatusPill>
                  </td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text)', fontWeight: 850 }}>{fmtDuration(row.durationMs)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusPill tone={row.userSentiment ? 'pink' : 'neutral'}>{compact(row.userSentiment)}</StatusPill>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusPill tone={row.callSuccessful ? 'green' : 'neutral'}>
                      {row.callSuccessful ? <CheckCircle2 size={12} /> : null}
                      {row.callSuccessful === true ? 'Yes' : row.callSuccessful === false ? 'No' : '—'}
                    </StatusPill>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusPill tone={isPlayableRecordingUrl(getRecordingUrl(row)) ? 'green' : 'neutral'}>
                      {isPlayableRecordingUrl(getRecordingUrl(row)) ? 'Available' : '—'}
                    </StatusPill>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      className="ptdt-action-btn"
                      onClick={() => void openDetail(row)}
                      style={{ height: 34, borderRadius: 999, fontSize: 11, fontWeight: 900 }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: 16, borderTop: '1px solid var(--border)' }}>
          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 12 }}>
            {appliedSearch ? `Filtered ${visibleLogs.length} of ${logs.length} visible records` : `Page ${pager.page} of ${pager.totalPages} · Total ${pager.total}`}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="ptdt-action-btn" disabled={!pager.hasPreviousPage || loading} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>
            <button type="button" className="ptdt-action-btn" disabled={!pager.hasNextPage || loading} onClick={() => setPage(current => current + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="ptdt-ai-call-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelected(null)
          }}
        >
          <div className="glass" onMouseDown={event => event.stopPropagation()} style={{ width: 'min(1040px, calc(100vw - 48px))', maxHeight: '88vh', overflow: 'auto', padding: 22, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div className="eyebrow pink" style={{ marginBottom: 10 }}>
                  <FileAudio size={11} /> Call Detail
                </div>
                <h2 style={{ margin: 0, color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: 26 }}>
                  AI Call {publicCallId(selected)}
                </h2>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>
                  {detailLoading ? 'Loading full detail...' : 'Transcript, summary, recording, transfer, and AI analysis fields.'}
                </p>
              </div>

              <button type="button" className="ptdt-action-icon-btn" onClick={() => setSelected(null)} aria-label="Close detail">
                <X size={17} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                ['Status', selected.callStatus || selected.lastEvent],
                ['From', selected.fromNumber],
                ['To', selected.toNumber],
                ['Agent', selected.agentName || selected.agentId],
                ['Duration', fmtDuration(selected.durationMs)],
                ['Disconnect', selected.disconnectionReason],
                ['Transfer', selectedTransferDestination],
              ].map(([label, value]) => (
                <div key={label} className="ptdt-card" style={{ padding: 12 }}>
                  <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 900, marginBottom: 6 }}>{label}</div>
                  <strong style={{ color: 'var(--text)', fontSize: 13, overflowWrap: 'anywhere' }}>{compact(value)}</strong>
                </div>
              ))}
            </div>

            {(selected.callSummary || selected.userSentiment || selected.callSuccessful !== undefined) && (
              <div className="ptdt-card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--text)' }}>AI Summary</strong>
                  <button type="button" className="ptdt-action-btn" disabled={!selected.callSummary} onClick={() => void copyText(selected.callSummary, 'summary')}>
                    <Copy size={14} /> Copy Summary
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <StatusPill tone="pink">{compact(selected.userSentiment)}</StatusPill>
                  <StatusPill tone={selected.callSuccessful ? 'green' : 'neutral'}>{selected.callSuccessful === true ? 'Successful' : selected.callSuccessful === false ? 'Not Successful' : 'Success Unknown'}</StatusPill>
                  <StatusPill>{selected.inVoicemail === true ? 'Voicemail' : selected.inVoicemail === false ? 'No Voicemail' : 'Voicemail Unknown'}</StatusPill>
                </div>
                <p style={{ color: 'var(--text)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{selected.callSummary || '—'}</p>
              </div>
            )}

            {selectedPlayableRecordingUrl && (
              <div className="ptdt-card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--text)' }}>Recording</strong>
                </div>

                <audio src={selectedPlayableRecordingUrl} controls preload="metadata" style={{ width: '100%', display: 'block' }} />
              </div>
            )}

            <div className="ptdt-card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--text)' }}>Transcript</strong>
                <button type="button" className="ptdt-action-btn" disabled={!selected.transcriptText} onClick={() => void copyText(selected.transcriptText, 'transcript')}>
                  <Copy size={14} /> Copy Transcript
                </button>
              </div>
              <div style={{ color: selected.transcriptText ? 'var(--text)' : 'var(--text-3)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', fontSize: 13.5 }}>
                {selected.transcriptText || 'No transcript stored for this AI call yet.'}
              </div>
            </div>

            {selectedAnalysis && (
              <details className="ptdt-card" style={{ padding: 16 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text)', fontWeight: 900 }}>AI Analysis JSON</summary>
                <pre style={{ marginTop: 14, color: 'var(--text-2)', whiteSpace: 'pre-wrap', overflow: 'auto', fontSize: 12, lineHeight: 1.55 }}>
                  {selectedAnalysis}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
