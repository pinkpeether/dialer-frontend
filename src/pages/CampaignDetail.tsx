import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Megaphone, Pause, Play, RefreshCw, Sparkles, Upload, Users } from 'lucide-react'
import { campaignsAPI } from '../api/campaigns.api'
import { contactsAPI } from '../api/contacts.api'
import { callsAPI } from '../api/calls.api'
import CsvImportModal from '../components/CsvImportModal'

type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'

type Stats = {
  total: number
  pending: number
  answered: number
  missed?: number
  active?: number
  answerRate: number
}

type Campaign = {
  id: number
  name: string
  description?: string | null
  status: CampaignStatus | string
  dialingRatio?: number
  maxRetries?: number
  timezone?: string
  createdAt?: string
  updatedAt?: string
}

type Contact = {
  id: number
  name?: string | null
  phone: string
  status: string
  createdAt: string
}

type CallLog = {
  id: number
  status: string
  disposition: string | null
  duration: number | null
  createdAt: string
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

const statusStyle = (status: string) => {
  if (status === 'ACTIVE') return { color: 'var(--green-2)', bg: 'rgba(0,167,71,0.10)' }
  if (status === 'PAUSED') return { color: 'var(--warning)', bg: 'rgba(240,185,11,0.12)' }
  if (status === 'COMPLETED') return { color: 'var(--purple)', bg: 'rgba(128,87,215,0.12)' }
  return { color: 'var(--text-3)', bg: 'var(--bg-glass)' }
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  const campaignId = Number(id)

  const loadCampaign = async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setMessage('')

    try {
      const [campaignRes, statsRes, contactsRes, callsRes] = await Promise.all([
        campaignsAPI.getById(campaignId),
        contactsAPI.getStats(campaignId),
        contactsAPI.getAll({ campaignId, limit: 100 }),
        callsAPI.getAll({ campaignId, limit: 100 }),
      ])

      setCampaign(campaignRes as Campaign)
      setStats(statsRes as Stats)
      setContacts(extractList<Contact>(contactsRes, ['contacts', 'results']))
      setCalls(extractList<CallLog>(callsRes, ['calls', 'results']))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign detail.'
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCampaign()
  }, [campaignId])

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    if (!campaign) return
    await campaignsAPI.updateStatus(campaign.id, newStatus)
    setCampaign({ ...campaign, status: newStatus })
    setMessage(`✓ Campaign status changed to ${newStatus}`)
  }

  const handleImport = async (file: File) => {
    if (!campaign) return
    await contactsAPI.uploadCSV(campaign.id, file)
    setImportOpen(false)
    await loadCampaign()
    setMessage('✓ Contacts imported')
  }

  const progress = useMemo(() => {
    if (!stats || stats.total <= 0) return 0
    return Math.min(100, Math.round(((stats.answered || 0) / stats.total) * 100))
  }, [stats])

  const theme = statusStyle(campaign?.status || 'DRAFT')

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 18,
            padding: '9px 14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)',
            background: 'var(--bg-glass)',
            color: 'var(--text-3)',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> Back to Campaigns
        </button>

        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <Sparkles size={11} /> PTDT-Dialer Campaign Detail
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.2vw, 42px)',
              fontWeight: 900,
              lineHeight: 1.05,
              color: 'var(--text)',
              letterSpacing: '-0.04em',
              marginBottom: 10,
            }}>
              {campaign?.name || 'Campaign'} <span className="gradient-brand-text">Overview</span>
            </h1>
            <p style={{
              fontSize: 14.5,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              <span className="pulse-dot pink" /> {campaign?.description || 'Inspect contacts, call logs, progress, and campaign controls.'}
            </p>
          </div>

          {campaign && (
            <span className="badge" style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.color}` }}>
              {campaign.status}
            </span>
          )}
        </div>
      </motion.div>

      {message && (
        <div style={{
          marginBottom: 18,
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: message.startsWith('✓') ? '1px solid rgba(0,167,71,0.28)' : '1px solid rgba(239,68,68,0.28)',
          background: message.startsWith('✓') ? 'rgba(0,167,71,0.10)' : 'rgba(239,68,68,0.10)',
          color: message.startsWith('✓') ? 'var(--green-2)' : 'var(--danger)',
          fontWeight: 700,
        }}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="glass" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
          Loading campaign…
        </div>
      ) : campaign ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 14,
            marginBottom: 24,
          }}>
            <MetricCard label="Contacts" value={stats?.total ?? contacts.length} icon={<Users size={16} />} color="var(--pink)" bg="rgba(251,11,140,0.10)" />
            <MetricCard label="Pending" value={stats?.pending ?? 0} icon={<Megaphone size={16} />} color="var(--warning)" bg="rgba(240,185,11,0.12)" />
            <MetricCard label="Answered" value={stats?.answered ?? 0} icon={<CheckCircle2 size={16} />} color="var(--green-2)" bg="rgba(0,167,71,0.10)" />
            <MetricCard label="Answer Rate" value={`${stats?.answerRate ?? progress}%`} icon={<CheckCircle2 size={16} />} color="var(--purple)" bg="rgba(128,87,215,0.12)" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ padding: 22, marginBottom: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div className="display" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                  Campaign Controls
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
                  Dialing ratio {campaign.dialingRatio ?? 1}x · Retries {campaign.maxRetries ?? 3} · {campaign.timezone || 'UTC'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && (
                  <ControlButton onClick={() => handleStatusChange('ACTIVE')} icon={<Play size={14} />} label="Start" color="var(--green-2)" bg="rgba(0,167,71,0.10)" />
                )}
                {campaign.status === 'ACTIVE' && (
                  <ControlButton onClick={() => handleStatusChange('PAUSED')} icon={<Pause size={14} />} label="Pause" color="var(--warning)" bg="rgba(240,185,11,0.12)" />
                )}
                {campaign.status !== 'COMPLETED' && (
                  <ControlButton onClick={() => handleStatusChange('COMPLETED')} icon={<CheckCircle2 size={14} />} label="Complete" color="var(--purple)" bg="rgba(128,87,215,0.12)" />
                )}
                <ControlButton onClick={() => setImportOpen(true)} icon={<Upload size={14} />} label="Import CSV" color="var(--pink)" bg="rgba(251,11,140,0.10)" />
                <ControlButton onClick={() => void loadCampaign()} icon={<RefreshCw size={14} />} label="Refresh" color="var(--text-3)" bg="var(--bg-glass)" />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8 }}>
                <span>Answered progress</span>
                <span className="mono">{progress}%</span>
              </div>
              <div style={{ height: 11, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--grad-brand)',
                  boxShadow: 'var(--shadow-pink)',
                  transition: 'width 0.25s ease',
                }} />
              </div>
            </div>
          </motion.div>

          <DataSection title="Contacts" subtitle="Campaign contact queue and latest imported leads.">
            {contacts.length === 0 ? (
              <EmptyState text="No contacts yet. Import a CSV to populate this campaign." />
            ) : (
              <DataTable
                headers={['Name', 'Phone', 'Status', 'Added']}
                rows={contacts.map(contact => [
                  contact.name || 'Unknown',
                  contact.phone,
                  <StatusBadge key="status" value={contact.status} />,
                  formatDate(contact.createdAt),
                ])}
              />
            )}
          </DataSection>

          <DataSection title="Call Log" subtitle="Calls generated for this campaign.">
            {calls.length === 0 ? (
              <EmptyState text="No calls have been logged for this campaign yet." />
            ) : (
              <DataTable
                headers={['ID', 'Agent', 'Status', 'Disposition', 'Duration', 'Time']}
                rows={calls.map(call => [
                  `#${call.id}`,
                  call.agent?.name || (call.agent?.id ? `Agent #${call.agent.id}` : '—'),
                  <StatusBadge key="status" value={call.status} />,
                  call.disposition || '—',
                  call.duration ?? '—',
                  formatDate(call.createdAt),
                ])}
              />
            )}
          </DataSection>
        </>
      ) : (
        <div className="glass" style={{ padding: 40, color: 'var(--text-3)', textAlign: 'center' }}>
          Campaign not found.
        </div>
      )}

      {importOpen && (
        <CsvImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onSubmit={handleImport}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, icon, color, bg }: { label: string; value: string | number; icon: ReactNode; color: string; bg: string }) {
  return (
    <div className="glass lift" style={{ padding: 18 }}>
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
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.1, fontWeight: 800 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 3 }}>{value}</div>
        </div>
      </div>
    </div>
  )
}

function ControlButton({ onClick, icon, label, color, bg }: { onClick: () => void; icon: ReactNode; label: string; color: string; bg: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '10px 14px',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${color}`,
        background: bg,
        color,
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {icon} {label}
    </motion.button>
  )
}

function DataSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: 22, marginBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div className="display" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>{subtitle}</div>
      </div>
      {children}
    </motion.section>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
            {headers.map(header => (
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
          {rows.map((row, index) => (
            <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: '13px 10px', color: cellIndex === 0 ? 'var(--text)' : 'var(--text-3)', fontWeight: cellIndex === 0 ? 700 : 500 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const theme = statusStyle(value)
  return (
    <span className="badge" style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.color}` }}>
      {value}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', textAlign: 'center' }}>
      {text}
    </div>
  )
}
