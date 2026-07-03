import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Database, Mic2, Phone, Play, Radio, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react'
import { recordingsAPI } from '../api/recordings.api'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from '../components/CustomerAccordionHeader'

type CustomerAccount = { id: number | null; name: string; code: string; status: string }
type RecordingRow = {
  id: number
  recordingSid?: string | null
  recordingProvider?: string | null
  recordingAvailable?: boolean
  startedAt?: string
  duration?: number
  remoteNumber?: string | null
  contact?: { name?: string | null; phone?: string | null }
  agent?: { name?: string | null }
  campaign?: { name?: string | null; commercialAccount?: CustomerAccount | null }
  commercialAccount?: CustomerAccount | null
}
type RecordingHealth = { generatedAt: string; totalRecordings: number; recentSampleSize: number; missingRecordingSid: number; recentMissingDuration: number; providers: Record<string, number>; accessTtlSeconds: number; retentionDays?: number | null; storageStatus: 'HEALTHY' | 'DEGRADED' | 'EMPTY' | string }
type RecordingGroup = CustomerAccount & { key: string; recordings: RecordingRow[] }

const fmtDate = (iso?: string) => { if (!iso) return '—'; const date = new Date(iso); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString() }
const fmtDuration = (seconds?: number) => { if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return '00:00'; const mins = Math.floor(seconds / 60); const secs = Math.round(seconds % 60); return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` }
const stringValue = (value: unknown, fallback = '') => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback
const accountForRecording = (row: RecordingRow): CustomerAccount => {
  const account = row.commercialAccount || row.campaign?.commercialAccount || null
  return { id: account?.id ? Number(account.id) : null, name: stringValue(account?.name, 'PTDT Super Admin'), code: stringValue(account?.code, '—'), status: stringValue(account?.status, '—') }
}
const groupRecordingsByCustomer = (recordings: RecordingRow[]) => {
  const map = new Map<string, RecordingGroup>()
  recordings.forEach(row => {
    const account = accountForRecording(row)
    const key = account.id ? `account-${account.id}` : 'account-unassigned'
    if (!map.has(key)) map.set(key, { ...account, key, recordings: [] })
    map.get(key)?.recordings.push(row)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}
function EmptyState({ children }: { children: ReactNode }) { return <div style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>{children}</div> }

export default function RecordingsCustomerGrouped() {
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [activeUrl, setActiveUrl] = useState('')
  const [activeTitle, setActiveTitle] = useState('')
  const [activeExpiresAt, setActiveExpiresAt] = useState('')
  const [activeCallId, setActiveCallId] = useState<number | null>(null)
  const [accessingId, setAccessingId] = useState<number | null>(null)
  const [manualError, setManualError] = useState('')
  const [playbackError, setPlaybackError] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const recordingsParams = useMemo(() => ({ search: appliedSearch || undefined, limit: 100 }), [appliedSearch])
  const recordingsQuery = useQuery({ queryKey: ['recordings', recordingsParams], queryFn: async () => { const [recordingData, healthData] = await Promise.all([recordingsAPI.getAll(recordingsParams), recordingsAPI.getHealth().catch(() => null)]); return { recordings: (recordingData?.recordings || []) as RecordingRow[], health: healthData as RecordingHealth | null } }, staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: previousData => previousData })
  const recordings = recordingsQuery.data?.recordings ?? []
  const health = recordingsQuery.data?.health ?? null
  const grouped = useMemo(() => groupRecordingsByCustomer(recordings), [recordings])
  const loading = recordingsQuery.isLoading
  const error = manualError || (recordingsQuery.error ? recordingsQuery.error instanceof Error ? recordingsQuery.error.message : 'Failed to load recordings' : '')
  const load = async (query = search) => { setManualError(''); setAppliedSearch(query); await recordingsQuery.refetch() }
  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))
  const play = async (row: RecordingRow) => {
    setManualError(''); setPlaybackError(''); setAccessingId(row.id)
    try {
      const data = await recordingsAPI.getAccess(row.id)
      const playbackUrl = data?.playbackUrl || data?.recordingUrl
      if (!playbackUrl) throw new Error('Recording playback URL is not available yet.')
      setActiveUrl(playbackUrl); setActiveCallId(row.id); setActiveExpiresAt(data?.expiresAt || ''); setActiveTitle(`#${row.id} · ${row.contact?.name || 'SIP'} · ${row.contact?.phone || row.remoteNumber || 'No phone'}`)
    } catch (err) { setManualError(err instanceof Error ? err.message : 'Failed to access recording') }
    finally { setAccessingId(null) }
  }
  const storageColor = health?.storageStatus === 'HEALTHY' ? 'var(--green-2)' : health?.storageStatus === 'DEGRADED' ? '#f0b90b' : 'var(--text-3)'
  const renderRecordingRow = (row: RecordingRow) => <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700 }}><Clock size={14} color="var(--purple)" />{fmtDate(row.startedAt)}</span></td><td className="mono" style={{ padding: '14px 16px', color: 'var(--pink)', fontSize: 12, fontWeight: 900 }}>#{row.id}</td><td style={{ padding: '14px 16px', fontWeight: 850 }}>{row.contact?.name || 'Unknown'}</td><td className="mono" style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: 12.5 }}><Phone size={13} color="var(--green)" /> {row.contact?.phone || row.remoteNumber || '—'}</td><td style={{ padding: '14px 16px', color: 'var(--text-3)' }}><UserRound size={13} /> {row.agent?.name || '—'}</td><td style={{ padding: '14px 16px', color: 'var(--text-3)' }}>{row.campaign?.name || '—'}</td><td className="mono" style={{ padding: '14px 16px', fontWeight: 800 }}>{fmtDuration(row.duration)}</td><td style={{ padding: '14px 16px', color: 'var(--text-3)' }}>{row.recordingProvider || '—'}</td><td className="mono" style={{ padding: '14px 16px', color: 'var(--text-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.recordingSid || '—'}</td><td style={{ padding: '14px 16px' }}><button type="button" disabled={accessingId === row.id || row.recordingAvailable === false} onClick={() => void play(row)} className="ptdt-action-btn" style={{ color: 'var(--pink)' }}><Play size={13} /> {accessingId === row.id ? 'Opening...' : 'Play'}</button></td></tr>

  return <div className="ptdt-mobile-page ptdt-mobile-page-recordings" style={{ padding: '32px 36px', maxWidth: 1500, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 28 }}><div><div className="eyebrow pink" style={{ marginBottom: 14 }}><Radio size={11} /> PTDT-Dialer Recordings</div><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>Recording <span className="gradient-brand-text">Playback</span></h1><p style={{ fontSize: 14.5, color: 'var(--text-3)' }}>Customer-grouped signed playback access and audit-safe recording review.</p></div><button type="button" onClick={() => void load()} style={{ height: 42, width: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><RefreshCw size={16} /></button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}><HealthCard icon={<Database size={16} />} label="Storage Status" value={health?.storageStatus || 'UNKNOWN'} color={storageColor} /><HealthCard icon={<Mic2 size={16} />} label="Total Recordings" value={health?.totalRecordings ?? recordings.length} /><HealthCard icon={<ShieldCheck size={16} />} label="Access TTL" value={`${health?.accessTtlSeconds ?? 300}s`} /><HealthCard icon={<AlertTriangle size={16} />} label="Missing Recording Ref" value={health?.missingRecordingSid ?? 0} color={(health?.missingRecordingSid || 0) > 0 ? '#f0b90b' : 'var(--green-2)'} /></div><div className="glass" style={{ padding: 18, marginBottom: 18 }}><div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, alignItems: 'center' }}><label style={{ position: 'relative' }}><Search size={16} color="var(--pink)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void load() }} placeholder="Search customer, phone, contact, campaign, agent, or recording ref..." className="ptdt-input" style={{ paddingLeft: 42, borderRadius: 999 }} /></label><button type="button" className="btn-brand" onClick={() => void load()} style={{ height: 43, borderRadius: 999, padding: '0 24px', fontSize: 12, fontWeight: 900 }}>Search</button></div></div>{activeUrl && <div className="glass" style={{ padding: 16, marginBottom: 18 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900 }}><Mic2 size={17} color="var(--pink)" />{activeTitle || `Playing recording ${activeCallId ? `#${activeCallId}` : ''}`}</div><span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{activeExpiresAt ? `Access expires ${fmtDate(activeExpiresAt)}` : 'Signed playback access'}</span></div><audio src={activeUrl} controls preload="metadata" style={{ width: '100%', display: 'block' }} onError={() => setPlaybackError('Playback failed. Click Play again for a fresh URL, or verify the recording file exists in storage.')} />{playbackError && <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.26)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: 12, fontWeight: 800 }}>{playbackError}</div>}</div>}{error && <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: 13 }}>{error} <button type="button" onClick={() => void load()} style={{ color: 'var(--pink)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900 }}>Retry</button></div>}{loading ? <div className="glass"><EmptyState>Loading recordings...</EmptyState></div> : recordings.length === 0 ? <div className="glass"><EmptyState>No recordings found.</EmptyState></div> : <div style={{ display: 'grid', gap: 12 }}>{grouped.map((group, index) => { const isOpen = expandedGroups[group.key] ?? index === 0; const playable = group.recordings.filter(row => row.recordingAvailable !== false).length; const totalSeconds = group.recordings.reduce((sum, row) => sum + (row.duration || 0), 0); return <div key={group.key} className="glass" style={{ overflow: 'hidden' }}><CustomerAccordionHeader isOpen={isOpen} onClick={() => toggleGroup(group.key)} name={group.name} meta={`Customer Code: ${group.code} · Status: ${group.status}`} badges={[{ label: `${group.recordings.length} Recordings` }, { label: `${playable} Playable`, color: 'var(--green-2)', bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }, { label: fmtDuration(totalSeconds), color: 'var(--text-2)', bg: 'var(--bg-2)', border: '1px solid var(--border)' }]} />{isOpen && <div style={{ ...customerAccordionBodyStyle, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1120 }}><thead><tr>{['Time', 'Call ID', 'Contact', 'Phone', 'Agent', 'Campaign', 'Duration', 'Storage', 'Recording Ref', 'Action'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead><tbody>{group.recordings.map(renderRecordingRow)}</tbody></table></div>}</div> })}</div>}</div>
}

function HealthCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color?: string }) { return <div className="glass" style={{ padding: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: color || 'var(--pink)', marginBottom: 8 }}>{icon}<span className="mono" style={{ fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span></div><div style={{ color: color || 'var(--text)', fontWeight: 950, fontSize: 22 }}>{value}</div></div> }
