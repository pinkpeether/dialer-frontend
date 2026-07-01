import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Globe2, RefreshCw, ShieldAlert } from 'lucide-react'
import { liveMonitoringAdvancedAPI } from '../api/liveMonitoringAdvanced.api'
import LiveCallMapPanel, { type LiveCallMapBucket } from '../components/LiveCallMapPanel'
import HourlyHeatmapPanel, { type HourlyHeatmapSlot } from '../components/HourlyHeatmapPanel'
import LiveAgentActivityPanel, { type LiveAgentActivity } from '../components/LiveAgentActivityPanel'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from '../components/CustomerAccordionHeader'

type CustomerAccount = { id: number | null; name: string; code: string; status: string }

type LiveCallWallItem = {
  id: number
  status: string
  disposition?: string | null
  duration?: number | null
  startedAt: string
  connectedAt?: string | null
  remoteNumber?: string | null
  source?: string | null
  campaign?: { id: number; name: string; mode?: string | null; dialingRatio?: number | null; commercialAccount?: CustomerAccount | null } | null
  contact?: { id: number; name?: string | null; phone: string; company?: string | null; status: string } | null
  agent?: { id: number; name: string; email: string; agentCode?: string | null; extension?: string | null; status: string } | null
  region?: { label: string; key: string }
}

type LiveCallGroup = CustomerAccount & { key: string; calls: LiveCallWallItem[] }

type SimultaneousCalls = { totalActive: number; initiated: number; ringing: number; answered: number }
type AnswerRateTracker = { window: string; totalCalls: number; answeredCalls: number; answerRate: number; readyAgents: number; busyAgents: number; onlineAgents: number; recommendedRatio: number; reason: string; shouldAutoAdjust: boolean }
type LiveMonitoringOverview = { generatedAt: string; campaignId?: number | null; liveCallWall: LiveCallWallItem[]; liveCallMap: LiveCallMapBucket[]; hourlyHeatmap: HourlyHeatmapSlot[]; liveAgentActivity: LiveAgentActivity[]; simultaneousCalls: SimultaneousCalls; answerRateTracker: AnswerRateTracker; notes?: string[] }

function StatCard({ label, value, sub, dark = false }: { label: string; value: string | number; sub?: string; dark?: boolean }) {
  return <div className="ptdt-pro-kpi" style={dark ? { background: 'linear-gradient(135deg, rgba(128,87,215,0.14), rgba(15,23,42,0.92))' } : undefined}><div className="ptdt-pro-kpi-label" style={dark ? { color: '#cbd5e1' } : undefined}>{label}</div><div className="ptdt-pro-kpi-value" style={dark ? { color: '#fff' } : undefined}>{value}</div>{sub ? <div className="ptdt-pro-kpi-note" style={dark ? { color: '#cbd5e1' } : undefined}>{sub}</div> : null}</div>
}

const getStatusColor = (status: string) => {
  if (status === 'ANSWERED') return '#16a34a'
  if (status === 'RINGING') return '#f59e0b'
  if (status === 'INITIATED') return '#2563eb'
  return '#64748b'
}

const accountForCall = (call: LiveCallWallItem): CustomerAccount => call.campaign?.commercialAccount || { id: null, name: 'Unassigned Customer', code: '—', status: '—' }
const groupLiveCallsByCustomer = (calls: LiveCallWallItem[]) => {
  const map = new Map<string, LiveCallGroup>()
  calls.forEach(call => {
    const account = accountForCall(call)
    const key = account.id ? `account-${account.id}` : 'account-unassigned'
    if (!map.has(key)) map.set(key, { ...account, key, calls: [] })
    map.get(key)?.calls.push(call)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function ActiveCallsTable({ calls }: { calls: LiveCallWallItem[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
        <thead>
          <tr>
            {['Call', 'Status', 'Customer', 'Campaign', 'Agent', 'Region', 'Started'].map(header => <th key={header} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {calls.map(call => <tr key={call.id}><td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>#{call.id}</td><td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}><span style={{ background: getStatusColor(call.status), color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>{call.status}</span></td><td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}><div style={{ color: 'var(--text)', fontWeight: 800 }}>{call.contact?.name || 'Unknown'}</div><div style={{ color: 'var(--text-3)', fontSize: 12 }}>{call.remoteNumber || call.contact?.phone || 'No number'}</div></td><td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>{call.campaign?.name || '—'}</td><td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>{call.agent?.name || 'Unassigned'}</td><td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>{call.region?.label || 'Unknown'}</td><td style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>{new Date(call.startedAt).toLocaleString()}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

export default function LiveMonitoringAdvanced() {
  const [data, setData] = useState<LiveMonitoringOverview | null>(null)
  const [campaignId, setCampaignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedCallGroups, setExpandedCallGroups] = useState<Record<string, boolean>>({})
  const hasVisibleDataRef = useRef(false)

  const fetchOverview = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = Boolean(options.silent || hasVisibleDataRef.current)
    if (!silent) setLoading(true)
    setError('')
    try {
      const parsedCampaignId = campaignId.trim() ? Number(campaignId.trim()) : undefined
      const result = await liveMonitoringAdvancedAPI.getOverview(parsedCampaignId, { silent })
      setData(result)
      hasVisibleDataRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live monitoring advanced views')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { void fetchOverview() }, [fetchOverview])
  useEffect(() => { if (!autoRefresh) return undefined; const timer = window.setInterval(() => { void fetchOverview({ silent: true }) }, 10000); return () => window.clearInterval(timer) }, [autoRefresh, fetchOverview])

  const tracker = data?.answerRateTracker
  const calls = data?.simultaneousCalls
  const sortedLiveCalls = useMemo(() => [...(data?.liveCallWall || [])].sort((a, b) => Number(new Date(b.startedAt)) - Number(new Date(a.startedAt))), [data?.liveCallWall])
  const groupedLiveCalls = useMemo(() => groupLiveCallsByCustomer(sortedLiveCalls), [sortedLiveCalls])
  const toggleCallGroup = (key: string) => setExpandedCallGroups(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div><div className="eyebrow pink" style={{ marginBottom: 12 }}><Activity size={12} /> PTDT Live Monitoring</div><h1 className="ptdt-page-title">Live <span className="gradient-brand-text">Monitoring+</span></h1><p className="ptdt-page-desc">Live call wall, call-map buckets, hourly heatmap, simultaneous-call counter, answer-rate tracker and advisory dial-ratio recommendation.</p></div>
        <div className="ptdt-toolbar"><input value={campaignId} onChange={event => setCampaignId(event.target.value)} placeholder="Campaign ID (optional)" style={{ minHeight: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', color: 'var(--text)', padding: '0 14px', fontWeight: 800, minWidth: 180 }} /><button className="ptdt-action-btn" type="button" onClick={() => void fetchOverview()} disabled={loading}><RefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}</button><button className="ptdt-action-btn" type="button" onClick={() => setAutoRefresh(value => !value)}><ShieldAlert size={14} /> Auto {autoRefresh ? 'ON' : 'OFF'}</button></div>
      </div>

      {error && <div className="ptdt-card" style={{ padding: 14, marginBottom: 18, color: 'var(--danger)' }}>{error}</div>}

      <section className="ptdt-pro-kpis" style={{ marginBottom: 18 }}><StatCard label="Active Calls" value={calls?.totalActive || 0} sub={`Initiated ${calls?.initiated || 0} / Ringing ${calls?.ringing || 0} / Answered ${calls?.answered || 0}`} /><StatCard label="Answer Rate" value={`${tracker?.answerRate || 0}%`} sub={`${tracker?.answeredCalls || 0} answered from ${tracker?.totalCalls || 0} calls`} /><StatCard label="Ready Agents" value={tracker?.readyAgents || 0} sub={`Online ${tracker?.onlineAgents || 0} / Busy ${tracker?.busyAgents || 0}`} /><StatCard label="Recommended Ratio" value={`${tracker?.recommendedRatio || 1}x`} sub={tracker?.shouldAutoAdjust ? 'Auto-adjust recommended' : 'Advisory only'} dark /></section>

      {tracker?.reason && <div className="ptdt-card" style={{ padding: 14, marginBottom: 18, color: 'var(--text-2)' }}><strong>Dial-ratio recommendation:</strong> {tracker.reason}</div>}

      <div style={{ display: 'grid', gap: 18 }}>
        <LiveCallMapPanel buckets={data?.liveCallMap || []} />
        <HourlyHeatmapPanel slots={data?.hourlyHeatmap || []} />
        <LiveAgentActivityPanel agents={data?.liveAgentActivity || []} />

        <section className="ptdt-card" style={{ padding: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}><div><div className="eyebrow purple" style={{ marginBottom: 10 }}><Globe2 size={12} /> Supervisor Live Call Wall</div><h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Current Active Calls</h2><p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: 13 }}>Every active call currently visible to monitoring, grouped by customer profile.</p></div><span style={{ color: 'var(--text-3)', fontSize: 13 }}>Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : '—'}</span></div>

          {sortedLiveCalls.length === 0 ? <div style={{ padding: 18, color: 'var(--text-3)', textAlign: 'center', marginTop: 16 }}>No active calls right now.</div> : <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>{groupedLiveCalls.map((group, index) => { const isOpen = expandedCallGroups[group.key] ?? index === 0; const answered = group.calls.filter(call => call.status === 'ANSWERED').length; const ringing = group.calls.filter(call => call.status === 'RINGING').length; const initiated = group.calls.filter(call => call.status === 'INITIATED').length; return <div key={group.key} className="glass" style={{ overflow: 'hidden', padding: 0 }}><CustomerAccordionHeader isOpen={isOpen} onClick={() => toggleCallGroup(group.key)} name={group.name} meta={`Customer Code: ${group.code} · Status: ${group.status}`} badges={[{ label: `${group.calls.length} Active Calls` }, { label: `${answered} Answered`, color: '#16a34a', bg: 'rgba(22,163,74,.10)', border: '1px solid rgba(22,163,74,.28)' }, { label: `${ringing} Ringing`, color: '#f59e0b', bg: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.28)' }, { label: `${initiated} Initiated`, color: '#2563eb', bg: 'rgba(37,99,235,.10)', border: '1px solid rgba(37,99,235,.28)' }]} />{isOpen && <div style={{ ...customerAccordionBodyStyle, padding: 0 }}><ActiveCallsTable calls={group.calls} /></div>}</div> })}</div>}
        </section>
      </div>
    </div>
  )
}
