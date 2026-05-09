import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, CalendarDays, Download, PhoneCall, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { campaignsAPI } from '../api/campaigns.api'
import { callsAPI } from '../api/calls.api'

type Campaign = {
  id: number
  name: string
}

type CallLog = {
  id: number
  campaignId?: number
  status: string
  disposition: string | null
  duration: number | null
  createdAt: string
  campaign?: { id: number; name?: string | null } | null
  agent?: { id: number; name?: string | null } | null
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const extractList = <T,>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (!isRecord(payload)) return []

  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value as T[]
  }

  return []
}

const csvEscape = (value: string | number | null | undefined) => {
  const normalized = value === null || value === undefined ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
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

export default function Reports() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<number | 'all'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const response = await campaignsAPI.getAll({ limit: 200 })
        setCampaigns(extractList<Campaign>(response, ['campaigns', 'results']))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load campaigns.'
        setError(message)
      }
    }

    void loadCampaigns()
  }, [])

  const loadCalls = async () => {
    setLoading(true)
    setError('')

    try {
      const params: Record<string, unknown> = { limit: 200 }
      if (selectedCampaign !== 'all') params.campaignId = selectedCampaign
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response = await callsAPI.getAll(params)
      setCalls(extractList<CallLog>(response, ['calls', 'results']))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load call reports.'
      setError(message)
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = calls.length
    const answered = calls.filter(call => call.status === 'ANSWERED' || call.disposition === 'ANSWERED').length
    const completed = calls.filter(call => call.status === 'COMPLETED').length
    const durations = calls
      .map(call => call.duration)
      .filter((duration): duration is number => typeof duration === 'number' && Number.isFinite(duration))

    const avgDuration = durations.length > 0
      ? Math.round((durations.reduce((sum, duration) => sum + duration, 0) / durations.length) * 10) / 10
      : 0

    const answerRate = total > 0 ? Math.round((answered / total) * 100) : 0

    return { total, answered, completed, avgDuration, answerRate }
  }, [calls])

  const campaignName = (call: CallLog) => {
    if (call.campaign?.name) return call.campaign.name
    if (call.campaignId === undefined) return '—'
    return campaigns.find(campaign => campaign.id === call.campaignId)?.name || `Campaign #${call.campaignId}`
  }

  const exportCsv = () => {
    const header = ['ID', 'Campaign', 'Agent', 'Status', 'Disposition', 'Duration', 'Time']
    const rows = calls.map(call => [
      call.id,
      campaignName(call),
      call.agent?.name || (call.agent?.id ? `Agent #${call.agent.id}` : '—'),
      call.status,
      call.disposition || '',
      call.duration ?? '',
      formatDate(call.createdAt),
    ])

    const csv = [header, ...rows]
      .map(row => row.map(csvEscape).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `call-report-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Sparkles size={11} /> PTDT-Dialer Reports
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.2vw, 42px)',
            fontWeight: 900,
            lineHeight: 1.05,
            color: 'var(--text)',
            letterSpacing: '-0.04em',
            marginBottom: 10,
          }}>
            Call <span className="gradient-brand-text">Reports</span>
          </h1>
          <p style={{
            fontSize: 14.5,
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            <span className="pulse-dot pink" /> Filter call logs, review outcomes, and export campaign activity.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={exportCsv}
          disabled={calls.length === 0}
          className="btn-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 'var(--radius-full)',
            padding: '0 22px',
            fontSize: 13.5,
            minHeight: 46,
            opacity: calls.length === 0 ? 0.55 : 1,
          }}
        >
          <Download size={15} /> Export CSV
        </motion.button>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 18,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239,68,68,0.28)',
            background: 'rgba(239,68,68,0.10)',
            color: 'var(--danger)',
            fontWeight: 700,
          }}
        >
          {error}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: 22, marginBottom: 24 }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1.3fr) repeat(2, minmax(160px, 0.8fr)) auto',
          gap: 14,
          alignItems: 'end',
        }}>
          <FilterField label="Campaign" icon={<BarChart3 size={13} />}>
            <select
              value={selectedCampaign}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedCampaign(event.target.value === 'all' ? 'all' : Number(event.target.value))}
              style={inputStyle}
            >
              <option value="all">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Start Date" icon={<CalendarDays size={13} />}>
            <input
              type="date"
              value={startDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value)}
              style={inputStyle}
            />
          </FilterField>

          <FilterField label="End Date" icon={<CalendarDays size={13} />}>
            <input
              type="date"
              value={endDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEndDate(event.target.value)}
              style={inputStyle}
            />
          </FilterField>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loadCalls}
            disabled={loading}
            className="btn-brand"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 'var(--radius-md)',
              padding: '0 20px',
              minHeight: 42,
            }}
          >
            <RefreshCw size={14} /> {loading ? 'Loading…' : 'Load'}
          </motion.button>
        </div>
      </motion.div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 14,
        marginBottom: 24,
      }}>
        <ReportCard label="Total Calls" value={stats.total} icon={<PhoneCall size={16} />} color="var(--pink)" bg="rgba(251,11,140,0.10)" />
        <ReportCard label="Answered" value={stats.answered} icon={<ShieldCheck size={16} />} color="var(--green-2)" bg="rgba(0,167,71,0.10)" />
        <ReportCard label="Completed" value={stats.completed} icon={<BarChart3 size={16} />} color="var(--purple)" bg="rgba(128,87,215,0.12)" />
        <ReportCard label="Answer Rate" value={`${stats.answerRate}%`} icon={<ActivityIcon />} color="var(--warning)" bg="rgba(240,185,11,0.12)" />
        <ReportCard label="Avg Duration" value={`${stats.avgDuration}s`} icon={<CalendarDays size={16} />} color="var(--green-2)" bg="rgba(0,167,71,0.10)" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: 22 }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}>
          <div>
            <div className="display" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
              Call Log
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>
              Latest call records from backend call log API.
            </div>
          </div>
          <span className="badge" style={{ color: 'var(--pink)', background: 'rgba(251,11,140,0.10)', border: '1px solid rgba(251,11,140,0.28)' }}>
            {calls.length} Records
          </span>
        </div>

        {loading ? (
          <EmptyState text="Loading call reports…" />
        ) : calls.length === 0 ? (
          <EmptyState text="No calls found for the selected filters." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  {['ID', 'Campaign', 'Agent', 'Status', 'Disposition', 'Duration', 'Time'].map(header => (
                    <th key={header} className="mono" style={{
                      padding: '12px 10px',
                      fontSize: 10.5,
                      color: 'var(--text-3)',
                      letterSpacing: 1.1,
                      textTransform: 'uppercase',
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map(call => (
                  <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="mono" style={{ padding: '13px 10px', color: 'var(--text-3)' }}>#{call.id}</td>
                    <td style={{ padding: '13px 10px', color: 'var(--text)', fontWeight: 700 }}>{campaignName(call)}</td>
                    <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{call.agent?.name || (call.agent?.id ? `Agent #${call.agent.id}` : '—')}</td>
                    <td style={{ padding: '13px 10px' }}><StatusBadge value={call.status} /></td>
                    <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{call.disposition || '—'}</td>
                    <td className="mono" style={{ padding: '13px 10px', color: 'var(--text)' }}>{call.duration ?? '—'}</td>
                    <td style={{ padding: '13px 10px', color: 'var(--text-3)' }}>{formatDate(call.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function ActivityIcon() {
  return <BarChart3 size={16} />
}

function FilterField({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="mono" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        fontSize: 10.5,
        fontWeight: 800,
        color: 'var(--text-3)',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
      }}>
        {icon} {label}
      </label>
      {children}
    </div>
  )
}

function ReportCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string
  value: string | number
  icon: ReactNode
  color: string
  bg: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass lift" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          background: bg,
          border: `1px solid ${color}`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.1, fontWeight: 800 }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 3 }}>
            {value}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const color = value === 'ANSWERED' || value === 'COMPLETED'
    ? 'var(--green-2)'
    : value === 'FAILED' || value === 'NO_ANSWER'
      ? 'var(--danger)'
      : 'var(--pink)'

  return (
    <span className="badge" style={{ color, background: 'var(--bg-glass)', border: `1px solid ${color}` }}>
      {value}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      minHeight: 220,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: 'var(--text-3)',
      fontSize: 14,
    }}>
      {text}
    </div>
  )
}
