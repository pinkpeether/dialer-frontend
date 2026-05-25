import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Megaphone,
  PhoneCall,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { opsAPI } from '../api/ops.api'
import ExportButtons from '../components/reports/ExportButtons'

type OpsSummary = {
  generatedAt: string
  campaigns: { total: number; draft: number; active: number; paused: number; completed: number }
  todayCalls: { total: number; byStatus: Record<string, number>; byDisposition: Record<string, number> }
  callbacks: { dueOrOverdue: number; upcoming: number }
  lowContactCampaigns: Array<{ id: number; name: string; pendingContacts: number }>
}

const STATUS_COLORS: Record<string, string> = {
  INITIATED: '#22d3ee',
  RINGING: '#f0b90b',
  ANSWERED: '#00a747',
  COMPLETED: '#00a747',
  NO_ANSWER: '#f0b90b',
  FAILED: '#ef4444',
  CALLBACK: '#8057d7',
  VOICEMAIL: '#22d3ee',
  WRONG_NUMBER: '#ef4444',
  DO_NOT_CALL: '#8057d7',
}

const fmtGeneratedAt = (value?: string) => {
  if (!value) return 'Not generated yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const entries = (record: Record<string, number>) => {
  return Object.entries(record || {}).filter(([, value]) => Number(value) > 0)
}

export default function OpsCenter() {
  const [summary, setSummary] = useState<OpsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningJobs, setRunningJobs] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await opsAPI.summary()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ops summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const runJobs = async () => {
    setRunningJobs(true)
    setMessage('')
    setError('')
    try {
      const result = await opsAPI.runNotificationJobs()
      setMessage(`Notification jobs completed. Created: ${result?.totalCreated ?? 0}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run notification jobs')
    } finally {
      setRunningJobs(false)
    }
  }

  const dispositionRows = useMemo(() => entries(summary?.todayCalls.byDisposition || {}), [summary])
  const callStatusRows = useMemo(() => entries(summary?.todayCalls.byStatus || {}), [summary])

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1500, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 30,
        }}
      >
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Sparkles size={11} /> PTDT-Dialer Operations
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
            Ops <span className="gradient-brand-text">Center</span>
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="pulse-dot pink" />
            Campaign health, callback pressure, notifications, exports, and operating signals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="glass" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="var(--pink)" />
            <div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800, letterSpacing: 1.1 }}>GENERATED</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text)' }}>{fmtGeneratedAt(summary?.generatedAt)}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void runJobs()}
            disabled={runningJobs}
            style={{
              minHeight: 42,
              borderRadius: 999,
              border: '1px solid rgba(251,11,140,0.34)',
              background: runningJobs ? 'rgba(251,11,140,0.08)' : 'rgba(251,11,140,0.12)',
              color: 'var(--pink)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 15px',
              fontWeight: 900,
              cursor: runningJobs ? 'not-allowed' : 'pointer',
              opacity: runningJobs ? 0.65 : 1,
            }}
          >
            <BellRing size={15} /> {runningJobs ? 'Running...' : 'Run Jobs'}
          </button>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            title="Refresh ops summary"
            style={{
              height: 42,
              width: 42,
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--bg-glass)',
              color: 'var(--text-3)',
              display: 'grid',
              placeItems: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      {loading ? (
        <div className="glass" style={{ minHeight: 320, display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
          Loading ops summary...
        </div>
      ) : summary ? (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <Metric label="Total Campaigns" value={summary.campaigns.total} icon={<Megaphone size={16} />} color="var(--pink)" bg="rgba(251,11,140,0.10)" />
            <Metric label="Active Campaigns" value={summary.campaigns.active} icon={<CheckCircle2 size={16} />} color="var(--green-2)" bg="rgba(0,167,71,0.10)" />
            <Metric label="Today Calls" value={summary.todayCalls.total} icon={<PhoneCall size={16} />} color="#22d3ee" bg="rgba(34,211,238,0.10)" />
            <Metric label="Due Callbacks" value={summary.callbacks.dueOrOverdue} icon={<AlertTriangle size={16} />} color="var(--warning)" bg="rgba(240,185,11,0.12)" />
            <Metric label="Upcoming" value={summary.callbacks.upcoming} icon={<CalendarClock size={16} />} color="var(--purple)" bg="rgba(128,87,215,0.12)" />
          </div>

          <ExportButtons />

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 18 }}>
            <Section title="Low Contact Campaigns" subtitle="Active campaigns that may need fresh contacts soon.">
              {summary.lowContactCampaigns.length === 0 ? (
                <EmptyState text="No low-contact campaigns." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Campaign', 'Pending Contacts'].map(header => (
                          <th key={header} className="mono" style={{ padding: '12px 10px', textAlign: 'left', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase' }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.lowContactCampaigns.map(campaign => (
                        <tr key={campaign.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '13px 10px', color: 'var(--text)', fontWeight: 800 }}>{campaign.name}</td>
                          <td style={{ padding: '13px 10px' }}>
                            <span className="badge" style={{ color: 'var(--warning)', border: '1px solid var(--warning)', background: 'rgba(240,185,11,0.10)' }}>
                              {campaign.pendingContacts}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Today Call Status" subtitle="Current operational call distribution.">
              {callStatusRows.length === 0 ? (
                <EmptyState text="No calls logged today." />
              ) : (
                <PillList rows={callStatusRows} />
              )}
            </Section>
          </div>

          <Section title="Today Dispositions" subtitle="Disposition mix from calls completed today.">
            {dispositionRows.length === 0 ? (
              <EmptyState text="No dispositions logged today." />
            ) : (
              <PillList rows={dispositionRows} />
            )}
          </Section>
        </div>
      ) : (
        <div className="glass" style={{ padding: 40, color: 'var(--text-3)', textAlign: 'center' }}>
          No summary available.
        </div>
      )}
    </div>
  )
}

function Notice({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  const ok = tone === 'success'
  return (
    <div style={{
      marginBottom: 18,
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      border: ok ? '1px solid rgba(0,167,71,0.28)' : '1px solid rgba(239,68,68,0.28)',
      background: ok ? 'rgba(0,167,71,0.10)' : 'rgba(239,68,68,0.10)',
      color: ok ? 'var(--green-2)' : 'var(--danger)',
      fontWeight: 800,
      fontSize: 13,
    }}>
      {children}
    </div>
  )
}

function Metric({ label, value, icon, color, bg }: { label: string; value: number; icon: ReactNode; color: string; bg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass lift" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, background: bg, border: `1px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.1, fontWeight: 800 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 3 }}>{value}</div>
        </div>
      </div>
    </motion.div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: 22 }}>
      <div style={{ marginBottom: 16 }}>
        <div className="display" style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>{title}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>{subtitle}</div>
      </div>
      {children}
    </motion.section>
  )
}

function PillList({ rows }: { rows: Array<[string, number]> }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {rows.map(([label, value]) => {
        const color = STATUS_COLORS[label] || 'var(--text-3)'
        return (
          <div key={label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 12px',
            borderRadius: 999,
            border: `1px solid ${color}`,
            background: `${color}18`,
            color,
            fontSize: 12,
            fontWeight: 900,
          }}>
            <span>{label.replace(/_/g, ' ')}</span>
            <span className="mono" style={{ color: 'var(--text)' }}>{value}</span>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', textAlign: 'center' }}>
      {text}
    </div>
  )
}
