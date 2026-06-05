import { useEffect, useMemo, useState } from 'react'
import { Activity, Globe2, RefreshCw, ShieldAlert } from 'lucide-react'
import { liveMonitoringAdvancedAPI } from '../api/liveMonitoringAdvanced.api'
import LiveCallMapPanel, { type LiveCallMapBucket } from '../components/LiveCallMapPanel'
import HourlyHeatmapPanel, { type HourlyHeatmapSlot } from '../components/HourlyHeatmapPanel'
import LiveAgentActivityPanel, { type LiveAgentActivity } from '../components/LiveAgentActivityPanel'

type LiveCallWallItem = {
  id: number
  status: string
  disposition?: string | null
  duration?: number | null
  startedAt: string
  connectedAt?: string | null
  remoteNumber?: string | null
  source?: string | null
  campaign?: { id: number; name: string; mode?: string | null; dialingRatio?: number | null } | null
  contact?: { id: number; name?: string | null; phone: string; company?: string | null; status: string } | null
  agent?: { id: number; name: string; email: string; agentCode?: string | null; extension?: string | null; status: string } | null
  region?: { label: string; key: string }
}

type SimultaneousCalls = {
  totalActive: number
  initiated: number
  ringing: number
  answered: number
}

type AnswerRateTracker = {
  window: string
  totalCalls: number
  answeredCalls: number
  answerRate: number
  readyAgents: number
  busyAgents: number
  onlineAgents: number
  recommendedRatio: number
  reason: string
  shouldAutoAdjust: boolean
}

type LiveMonitoringOverview = {
  generatedAt: string
  campaignId?: number | null
  liveCallWall: LiveCallWallItem[]
  liveCallMap: LiveCallMapBucket[]
  hourlyHeatmap: HourlyHeatmapSlot[]
  liveAgentActivity: LiveAgentActivity[]
  simultaneousCalls: SimultaneousCalls
  answerRateTracker: AnswerRateTracker
  notes?: string[]
}

function StatCard({ label, value, sub, dark = false }: { label: string; value: string | number; sub?: string; dark?: boolean }) {
  return (
    <div className="glass" style={{ padding: 18, borderRadius: 20, background: dark ? '#0f172a' : undefined, color: dark ? '#f8fafc' : undefined }}>
      <div className="mono" style={{ color: dark ? '#94a3b8' : 'var(--text-3)', fontSize: 11, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900 }}>{value}</div>
      {sub ? <div style={{ color: dark ? '#cbd5e1' : 'var(--text-3)', marginTop: 6, fontSize: 12.5 }}>{sub}</div> : null}
    </div>
  )
}

const getStatusColor = (status: string) => {
  if (status === 'ANSWERED') return '#16a34a'
  if (status === 'RINGING') return '#f59e0b'
  if (status === 'INITIATED') return '#2563eb'
  return '#64748b'
}

export default function LiveMonitoringAdvanced() {
  const [data, setData] = useState<LiveMonitoringOverview | null>(null)
  const [campaignId, setCampaignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchOverview = async () => {
    setLoading(true)
    setError('')
    try {
      const parsedCampaignId = campaignId.trim() ? Number(campaignId.trim()) : undefined
      const result = await liveMonitoringAdvancedAPI.getOverview(parsedCampaignId)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live monitoring advanced views')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOverview()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = window.setInterval(() => {
      void fetchOverview()
    }, 10000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, campaignId])

  const tracker = data?.answerRateTracker
  const calls = data?.simultaneousCalls

  const sortedLiveCalls = useMemo(
    () => [...(data?.liveCallWall || [])].sort((a, b) => Number(new Date(b.startedAt)) - Number(new Date(a.startedAt))),
    [data?.liveCallWall]
  )

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Activity size={12} /> PTDT Live Monitoring
          </div>
          <h1 className="ptdt-page-title">
            Live <span className="gradient-brand-text">Monitoring+</span>
          </h1>
          <p className="ptdt-page-desc">
            Live call wall, call-map buckets, hourly heatmap, simultaneous-call counter, answer-rate tracker and advisory dial-ratio recommendation.
          </p>
        </div>

        <div className="ptdt-toolbar">
          <input
            value={campaignId}
            onChange={event => setCampaignId(event.target.value)}
            placeholder="Campaign ID (optional)"
            style={{ minHeight: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', color: 'var(--text)', padding: '0 14px', fontWeight: 800, minWidth: 180 }}
          />
          <button className="ptdt-action-btn" type="button" onClick={() => void fetchOverview()} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="ptdt-action-btn" type="button" onClick={() => setAutoRefresh(value => !value)}>
            <ShieldAlert size={14} /> Auto {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 18, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Active Calls" value={calls?.totalActive || 0} sub={`Initiated ${calls?.initiated || 0} / Ringing ${calls?.ringing || 0} / Answered ${calls?.answered || 0}`} />
        <StatCard label="Answer Rate" value={`${tracker?.answerRate || 0}%`} sub={`${tracker?.answeredCalls || 0} answered from ${tracker?.totalCalls || 0} calls`} />
        <StatCard label="Ready Agents" value={tracker?.readyAgents || 0} sub={`Online ${tracker?.onlineAgents || 0} / Busy ${tracker?.busyAgents || 0}`} />
        <StatCard label="Recommended Ratio" value={`${tracker?.recommendedRatio || 1}x`} sub={tracker?.shouldAutoAdjust ? 'Auto-adjust recommended' : 'Advisory only'} dark />
      </section>

      {tracker?.reason && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 18, color: 'var(--text-2)' }}>
          <strong>Dial-ratio recommendation:</strong> {tracker.reason}
        </div>
      )}

      <div style={{ display: 'grid', gap: 18 }}>
        <LiveCallMapPanel buckets={data?.liveCallMap || []} />
        <HourlyHeatmapPanel slots={data?.hourlyHeatmap || []} />
        <LiveAgentActivityPanel agents={data?.liveAgentActivity || []} />

        <section className="ptdt-card" style={{ padding: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow purple" style={{ marginBottom: 10 }}>
                <Globe2 size={12} /> Supervisor Live Call Wall
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Current Active Calls</h2>
              <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
                Every active call currently visible to monitoring.
              </p>
            </div>
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
              Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : '—'}
            </span>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
              <thead>
                <tr>
                  {['Call', 'Status', 'Customer', 'Campaign', 'Agent', 'Region', 'Started'].map(header => (
                    <th key={header} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedLiveCalls.map(call => (
                  <tr key={call.id}>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>#{call.id}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ background: getStatusColor(call.status), color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>
                        {call.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text)', fontWeight: 800 }}>{call.contact?.name || 'Unknown'}</div>
                      <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{call.remoteNumber || call.contact?.phone || 'No number'}</div>
                    </td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>{call.campaign?.name || '—'}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>{call.agent?.name || 'Unassigned'}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>{call.region?.label || 'Unknown'}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>
                      {new Date(call.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {sortedLiveCalls.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 18, color: 'var(--text-3)', textAlign: 'center' }}>No active calls right now.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
