import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, Database, Mic2, Phone, Play, Radio, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react'
import { recordingsAPI } from '../api/recordings.api'

type RecordingRow = {
  id: number
  recordingUrl?: string | null
  playbackUrl?: string | null
  recordingSid?: string | null
  recordingProvider?: string | null
  recordingAvailable?: boolean
  hasRecording?: boolean
  startedAt?: string
  duration?: number
  contact?: { name?: string | null; phone?: string | null }
  agent?: { name?: string | null }
  campaign?: { name?: string | null }
}

type RecordingHealth = {
  generatedAt: string
  totalRecordings: number
  recentSampleSize: number
  missingRecordingSid: number
  recentMissingDuration: number
  providers: Record<string, number>
  accessTtlSeconds: number
  retentionDays?: number | null
  storageStatus: 'HEALTHY' | 'DEGRADED' | 'EMPTY' | string
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

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function fmtDuration(seconds?: number) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>
      {children}
    </div>
  )
}

export default function Recordings() {
  const [recordings, setRecordings] = useState<RecordingRow[]>([])
  const [health, setHealth] = useState<RecordingHealth | null>(null)
  const [search, setSearch] = useState('')
  const [activeUrl, setActiveUrl] = useState('')
  const [activeTitle, setActiveTitle] = useState('')
  const [activeExpiresAt, setActiveExpiresAt] = useState('')
  const [activeCallId, setActiveCallId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessingId, setAccessingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const loadHealth = async () => {
    try {
      const data = await recordingsAPI.getHealth()
      setHealth(data)
    } catch {
      setHealth(null)
    }
  }

  const load = async (query = search) => {
    setLoading(true)
    setError('')
    try {
      const data = await recordingsAPI.getAll({ search: query || undefined, limit: 50 })
      setRecordings(data?.recordings || [])
      await loadHealth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recordings')
      setRecordings([])
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
        const recordingData = await recordingsAPI.getAll({ limit: 50 })
        const healthData = await recordingsAPI.getHealth().catch(() => null)
        if (!cancelled) {
          setRecordings(recordingData?.recordings || [])
          setHealth(healthData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load recordings')
          setRecordings([])
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

  const play = async (row: RecordingRow) => {
    setError('')
    setAccessingId(row.id)
    try {
      const data = await recordingsAPI.getAccess(row.id)
      const playbackUrl = data?.playbackUrl || data?.recordingUrl
      if (!playbackUrl) throw new Error('Recording playback URL is not available yet.')

      setActiveUrl(playbackUrl)
      setActiveCallId(row.id)
      setActiveExpiresAt(data?.expiresAt || '')
      setActiveTitle(`${row.contact?.name || 'Unknown'} · ${row.contact?.phone || 'No phone'}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access recording')
    } finally {
      setAccessingId(null)
    }
  }

  const storageColor = health?.storageStatus === 'HEALTHY'
    ? 'var(--green-2)'
    : health?.storageStatus === 'DEGRADED'
      ? '#f0b90b'
      : 'var(--text-3)'

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1500, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <Radio size={11} /> PTDT-Dialer Recordings
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
              Recording <span className="gradient-brand-text">Playback</span>
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot" /> Signed playback access, storage health, and audit-safe recording review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            style={{ height: 42, width: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            title="Refresh recordings"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <HealthCard icon={<Database size={16} />} label="Storage Status" value={health?.storageStatus || 'UNKNOWN'} color={storageColor} />
        <HealthCard icon={<Mic2 size={16} />} label="Total Recordings" value={health?.totalRecordings ?? recordings.length} />
        <HealthCard icon={<ShieldCheck size={16} />} label="Access TTL" value={`${health?.accessTtlSeconds ?? 300}s`} />
        <HealthCard icon={<AlertTriangle size={16} />} label="Missing SID" value={health?.missingRecordingSid ?? 0} color={(health?.missingRecordingSid || 0) > 0 ? '#f0b90b' : 'var(--green-2)'} />
      </div>

      <div className="glass" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, alignItems: 'center' }}>
          <label style={{ position: 'relative' }}>
            <Search size={16} color="var(--pink)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void load()
              }}
              placeholder="Search phone, contact, campaign, agent, or recording SID..."
              style={{ ...inputStyle, paddingLeft: 42, borderRadius: 999 }}
            />
          </label>

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

      {activeUrl && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, color: 'var(--text)' }}>
              <Mic2 size={17} color="var(--pink)" />
              {activeTitle || `Playing recording ${activeCallId ? `#${activeCallId}` : ''}`}
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {activeExpiresAt ? `Access expires ${fmtDate(activeExpiresAt)}` : 'Signed playback access'}
            </span>
          </div>
          <audio src={activeUrl} controls style={{ width: '100%', display: 'block' }} />
          <div style={{ marginTop: 10, color: 'var(--text-3)', fontSize: 12 }}>
            If playback expires, click Play again to generate a fresh signed URL.
          </div>
        </motion.div>
      )}

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
                {['Time', 'Contact', 'Phone', 'Agent', 'Campaign', 'Duration', 'Provider', 'Recording SID', 'Action'].map(h => (
                  <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><EmptyState>Loading recordings...</EmptyState></td></tr>
              ) : recordings.length === 0 ? (
                <tr><td colSpan={9}><EmptyState>No recordings found.</EmptyState></td></tr>
              ) : recordings.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.018 }}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700 }}>
                      <Clock size={14} color="var(--purple)" />
                      {fmtDate(row.startedAt)}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 900, color: 'var(--text)' }}>
                    {row.contact?.name || 'Unknown'}
                  </td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: 12.5 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <Phone size={13} color="var(--green)" /> {row.contact?.phone || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12.5 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <UserRound size={13} /> {row.agent?.name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12.5 }}>{row.campaign?.name || '—'}</td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text)', fontWeight: 800 }}>{fmtDuration(row.duration)}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12.5 }}>{row.recordingProvider || '—'}</td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.recordingSid || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      disabled={accessingId === row.id || row.recordingAvailable === false}
                      onClick={() => void play(row)}
                      style={{
                        height: 34,
                        borderRadius: 999,
                        padding: '0 15px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        border: '1px solid rgba(251,11,140,0.28)',
                        background: activeCallId === row.id ? 'rgba(251,11,140,0.16)' : 'rgba(251,11,140,0.08)',
                        color: 'var(--pink)',
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: accessingId === row.id ? 'default' : 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        opacity: accessingId === row.id ? 0.68 : 1,
                      }}
                    >
                      <Play size={13} /> {accessingId === row.id ? 'Opening...' : 'Play'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function HealthCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="glass" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: color || 'var(--pink)', marginBottom: 8 }}>
        {icon}
        <span className="mono" style={{ fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ color: color || 'var(--text)', fontWeight: 950, fontSize: 22 }}>{value}</div>
    </div>
  )
}
