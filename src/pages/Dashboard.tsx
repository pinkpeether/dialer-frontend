import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, Users, Megaphone, TrendingUp, Activity, Radio,
  ArrowUpRight, BookUser, Sparkles, ShieldOff, Settings2,
} from 'lucide-react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { agentsAPI }        from '../api/agents.api'
import { campaignsAPI }     from '../api/campaigns.api'
import { contactsAPI }      from '../api/contacts.api'
import { callsAPI }         from '../api/calls.api'
import { reportsAPI, type ReportTrendRow } from '../api/reports.api'
import { useAuthStore }     from '../store/auth.store'
import { useSipStore }      from '../store/sip.store'
import { useLiveDashboard } from '../hooks/useLiveDashboard'
import StatsCard            from '../components/StatsCard'

const PTDT_MOBILE_PAGE_CSS = `
@media (max-width: 900px) {
  .ptdt-mobile-page {
    width: 100% !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 72px 12px 28px !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .ptdt-mobile-page *,
  .ptdt-mobile-page *::before,
  .ptdt-mobile-page *::after {
    box-sizing: border-box;
    min-width: 0;
  }

  .ptdt-mobile-page .eyebrow {
    max-width: 100% !important;
    white-space: normal !important;
    line-height: 1.35 !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.8rem, 8vw, 2.4rem) !important;
    line-height: 1.04 !important;
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page h2,
  .ptdt-mobile-page h3 {
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page p,
  .ptdt-mobile-page span,
  .ptdt-mobile-page div {
    max-width: 100%;
  }

  .ptdt-mobile-page .mono {
    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .ptdt-mobile-page [style*="display: grid"],
  .ptdt-mobile-page [style*="display:grid"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-template-columns"],
  .ptdt-mobile-page [style*="gridTemplateColumns"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-column"],
  .ptdt-mobile-page [style*="gridColumn"] {
    grid-column: auto !important;
  }

  .ptdt-mobile-page [style*="display: flex"],
  .ptdt-mobile-page [style*="display:flex"] {
    flex-wrap: wrap !important;
    min-width: 0 !important;
  }

  .ptdt-mobile-page [style*="justify-content: space-between"],
  .ptdt-mobile-page [style*="justifyContent: space-between"] {
    justify-content: flex-start !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi,
  .ptdt-mobile-page .ptdt-card,
  .ptdt-mobile-page .lift {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 18px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 14px !important;
  }

  .ptdt-mobile-page .glass:has(table),
  .ptdt-mobile-page .glass-hi:has(table),
  .ptdt-mobile-page .ptdt-card:has(table),
  .ptdt-mobile-page [style*="overflow-x"],
  .ptdt-mobile-page [style*="overflowX"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  .ptdt-mobile-page table {
    min-width: 640px !important;
    width: max-content !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    white-space: nowrap !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
    padding: 10px 12px !important;
    vertical-align: middle !important;
  }

  .ptdt-mobile-page input,
  .ptdt-mobile-page textarea,
  .ptdt-mobile-page select,
  .ptdt-mobile-page .ptdt-input,
  .ptdt-mobile-page .ptdt-select,
  .ptdt-mobile-page .ptdt-textarea {
    width: 100% !important;
    max-width: 100% !important;
  }

  .ptdt-mobile-page input[type="number"] {
    min-width: 82px !important;
    width: 100% !important;
  }

  .ptdt-mobile-page button,
  .ptdt-mobile-page .btn-brand,
  .ptdt-mobile-page .ptdt-action-btn,
  .ptdt-mobile-page .ptdt-action-icon-btn {
    max-width: 100% !important;
    white-space: normal !important;
  }

  .ptdt-mobile-page .btn-brand {
    min-height: 42px !important;
  }

  .ptdt-mobile-page .ptdt-action-icon-btn {
    width: 40px !important;
    min-width: 40px !important;
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page .ptdt-toolbar {
    width: 100% !important;
    justify-content: flex-start !important;
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
    padding-bottom: 6px !important;
  }

  .ptdt-mobile-page .ptdt-toolbar > * {
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page svg,
  .ptdt-mobile-page canvas {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-wrapper,
  .ptdt-mobile-page .recharts-surface,
  .ptdt-mobile-page .recharts-responsive-container {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-legend-wrapper {
    max-width: 100% !important;
  }

  .ptdt-mobile-page audio,
  .ptdt-mobile-page video {
    max-width: 100% !important;
  }
}

@media (max-width: 560px) {
  .ptdt-mobile-page {
    padding: 66px 10px 24px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 12px !important;
    border-radius: 16px !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.65rem, 9vw, 2.1rem) !important;
  }

  .ptdt-mobile-page table {
    min-width: 600px !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    padding: 9px 10px !important;
    font-size: 12px !important;
  }
}
`


interface Stats {
  agents:    { total: number; online: number; ready: number; busy: number }
  campaigns: { total: number; active: number; paused: number }
  contacts:  { total: number; pending: number; answered: number; answerRate: number }
}

type CallLog = {
  id: number
  status: string
  disposition: string | null
  duration: number | null
  createdAt: string
}

type DashboardRecentCall = {
  callId: number
  agentId?: number
  agentName?: string
  phone: string
  name?: string
  duration?: number
  status?: string
}

type DashboardCache = {
  savedAt: string
  stats: Stats | null
  recentCallData: CallLog[]
  recentHistory: DashboardRecentCall[]
}

const EMPTY_STATS: Stats = {
  agents: { total: 0, online: 0, ready: 0, busy: 0 },
  campaigns: { total: 0, active: 0, paused: 0 },
  contacts: { total: 0, pending: 0, answered: 0, answerRate: 0 },
}

const normalizeStats = (value: unknown): Stats | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Stats>
  return {
    agents: { ...EMPTY_STATS.agents, ...(raw.agents || {}) },
    campaigns: { ...EMPTY_STATS.campaigns, ...(raw.campaigns || {}) },
    contacts: { ...EMPTY_STATS.contacts, ...(raw.contacts || {}) },
  }
}

const DASHBOARD_LEGACY_CACHE_KEY = 'ptdt-dashboard:last-good'
const dashboardCacheKey = (userId?: number, role?: string) =>
  userId ? `ptdt-dashboard:last-good:${role || 'USER'}:${userId}` : null

const readDashboardCache = (userId?: number, role?: string): DashboardCache | null => {
  if (typeof window === 'undefined') return null
  const key = dashboardCacheKey(userId, role)
  if (!key) return null
  try {
    window.localStorage.removeItem(DASHBOARD_LEGACY_CACHE_KEY)
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DashboardCache
    return { ...parsed, stats: normalizeStats(parsed.stats) }
  } catch {
    return null
  }
}

const writeDashboardCache = (userId: number | undefined, role: string | undefined, patch: Partial<Omit<DashboardCache, 'savedAt'>>) => {
  if (typeof window === 'undefined') return
  const key = dashboardCacheKey(userId, role)
  if (!key) return
  try {
    window.localStorage.removeItem(DASHBOARD_LEGACY_CACHE_KEY)
    const previous = readDashboardCache(userId, role)
    window.localStorage.setItem(key, JSON.stringify({ ...previous, ...patch, savedAt: new Date().toISOString() }))
  } catch {
    // Local cache is best-effort; backend remains source of truth.
  }
}

type TrendLog = Pick<CallLog, 'createdAt' | 'status' | 'disposition'>

const COL_PINK   = '#fb0b8c'
const COL_GREEN  = '#00a747'
const COL_PURPLE = '#8057d7'
const COL_GOLD   = '#f0b90b'

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const extractList = <T,>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (!isRecord(payload)) return []
  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

const stringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const numberValue = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const nestedName = (value: unknown) => {
  if (!isRecord(value)) return ''
  return stringValue(value.name || value.fullName || value.title)
}

function normalizeRecentCall(item: unknown, index: number): DashboardRecentCall {
  const row = isRecord(item) ? item : {}
  const contact = row.contact
  const agent = row.agent

  return {
    callId: numberValue(row.id, index + 1),
    agentId: numberValue(row.agentId, 0) || undefined,
    agentName: stringValue(row.agentName) || nestedName(agent) || undefined,
    phone:
      stringValue(row.remoteNumber) ||
      stringValue(row.phone) ||
      stringValue(row.phoneNumber) ||
      (isRecord(contact) ? stringValue(contact.phone) : '') ||
      stringValue(row.destination) ||
      'Unknown number',
    name:
      stringValue(row.remoteName) ||
      stringValue(row.contactName) ||
      nestedName(contact) ||
      undefined,
    duration: numberValue(row.durationSeconds ?? row.duration, 0) || undefined,
    status: stringValue(row.status || row.disposition || 'UNKNOWN').toUpperCase(),
  }
}

function buildTrend(calls: CallLog[]) {
  const map = new Map<string, { calls: number; answered: number }>()
  for (const c of calls) {
    const day = c.createdAt.slice(0, 10)
    const prev = map.get(day) ?? { calls: 0, answered: 0 }
    const isAns = c.status === 'ANSWERED' || c.disposition === 'ANSWERED' || c.status === 'COMPLETED'
    map.set(day, { calls: prev.calls + 1, answered: prev.answered + (isAns ? 1 : 0) })
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([day, v]) => ({ day: day.slice(5), calls: v.calls, answered: v.answered }))
}

function trendRowsToCallLogs(rows: ReportTrendRow[]): TrendLog[] {
  return rows.flatMap((row) => {
    const answered = Array.from({ length: row.answered }, () => ({
      createdAt: row.date,
      status: 'COMPLETED',
      disposition: 'ANSWERED',
    }))
    const other = Array.from({ length: Math.max(0, row.total - row.answered) }, () => ({
      createdAt: row.date,
      status: 'NO_ANSWER',
      disposition: 'NO_ANSWER',
    }))
    return [...answered, ...other]
  })
}

function buildDispositionPie(calls: CallLog[]) {
  const map = new Map<string, number>()
  for (const c of calls) {
    const key = c.disposition || c.status || 'UNKNOWN'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

const PIE_COLORS = [COL_PINK, COL_GREEN, COL_PURPLE, COL_GOLD, '#3b82f6']

const tooltipStyle = {
  background: 'rgba(8,5,18,0.96)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  fontSize: 11,
  color: '#fff',
}

export default function Dashboard() {
  const user = useAuthStore(s => s.user)
  const [cached] = useState(() => readDashboardCache(user?.id, user?.role))
  const [stats, setStats] = useState<Stats | null>(normalizeStats(cached?.stats) ?? null)
  const [recentCallData, setRecentCallData] = useState<CallLog[]>(cached?.recentCallData ?? [])
  const [recentHistory, setRecentHistory] = useState<DashboardRecentCall[]>(cached?.recentHistory ?? [])
  const { activeCalls, recentCalls } = useLiveDashboard()
  const sipActiveCall = useSipStore(s => s.activeCall)
  const sipStatus = useSipStore(s => s.status)

  const dashboardActiveCalls = sipActiveCall
    ? [
        {
          callId: Number(sipActiveCall.id) || -1,
          agentId: user?.id ?? 0,
          agentName: user?.name || 'Current agent',
          phone: sipActiveCall.remoteIdentity,
          name: 'SIP Call',
          status: sipStatus,
        },
        ...activeCalls.filter(call => call.phone !== sipActiveCall.remoteIdentity),
      ]
    : activeCalls

  useEffect(() => {
    const load = async () => {
      const requestOptions = { silent: Boolean(cached) }
      const [a, c, ct] = await Promise.all([
        agentsAPI.getStats(requestOptions),
        campaignsAPI.getStats(requestOptions),
        contactsAPI.getStats(undefined, requestOptions),
      ])
      const nextStats = normalizeStats({ agents: a, campaigns: c, contacts: ct }) || EMPTY_STATS
      setStats(nextStats)
      writeDashboardCache(user?.id, user?.role, { stats: nextStats })
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const loadCalls = async () => {
      const requestOptions = { silent: Boolean(cached) }
      let apiCalls: CallLog[] = []
      let nextRecentHistory = recentHistory
      let nextRecentCallData = recentCallData

      try {
        const res = await callsAPI.getAll({ limit: 20 }, requestOptions)
        const calls = extractList<CallLog>(res, ['calls', 'results', 'items', 'data'])
        apiCalls = calls
        nextRecentHistory = calls.map(normalizeRecentCall)
        setRecentHistory(nextRecentHistory)
      } catch {
        if (!cached?.recentHistory?.length) {
          nextRecentHistory = []
          setRecentHistory([])
        }
      }

      try {
        const trendRows = await reportsAPI.getCallTrend({ granularity: 'day' }, requestOptions)
        nextRecentCallData = trendRowsToCallLogs(trendRows) as CallLog[]
        setRecentCallData(nextRecentCallData)
      } catch {
        try {
          if (apiCalls.length > 0) {
            nextRecentCallData = apiCalls
            setRecentCallData(nextRecentCallData)
            return
          }

          const res = await callsAPI.getAll({ limit: 100 }, requestOptions)
          const calls = extractList<CallLog>(res, ['calls', 'results', 'items', 'data'])
          nextRecentCallData = calls
          nextRecentHistory = calls.map(normalizeRecentCall)
          setRecentCallData(nextRecentCallData)
          setRecentHistory(nextRecentHistory)
        } catch {
          // non-fatal — charts just stay empty
        }
      } finally {
        writeDashboardCache(user?.id, user?.role, { recentCallData: nextRecentCallData, recentHistory: nextRecentHistory })
      }
    }
    void loadCalls()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trendData    = buildTrend(recentCallData)
  const dispositionData = buildDispositionPie(recentCallData)
  const dashboardRecentCalls = recentCalls.length > 0 ? recentCalls : recentHistory

  const safeStats = normalizeStats(stats)

  const cards = safeStats ? [
    { label: 'Total Agents',     value: safeStats.agents.total,
      sub: `${safeStats.agents.online} online · ${safeStats.agents.ready} ready`,
      icon: <Users size={18}/>,      color: COL_PINK,   bg: 'rgba(251,11,140,0.10)' },
    { label: 'Active Campaigns', value: safeStats.campaigns.active,
      sub: `${safeStats.campaigns.total} total campaigns`,
      icon: <Megaphone size={18}/>,  color: COL_GREEN,  bg: 'rgba(0,167,71,0.10)' },
    { label: 'Total Contacts',   value: safeStats.contacts.total,
      sub: `${safeStats.contacts.pending} pending`,
      icon: <Phone size={18}/>,      color: COL_PURPLE, bg: 'rgba(128,87,215,0.10)' },
    { label: 'Answer Rate',      value: `${safeStats.contacts.answerRate ?? 0}%`,
      sub: `${safeStats.contacts.answered} answered`,
      icon: <TrendingUp size={18}/>, color: COL_GOLD,   bg: 'rgba(240,185,11,0.10)' },
  ] : []

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="ptdt-mobile-page ptdt-mobile-page-dashboard" style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <style>{PTDT_MOBILE_PAGE_CSS}</style>

      {/* Hero header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <Sparkles size={11}/> Live operations
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 3.4vw, 42px)',
          fontWeight: 900, lineHeight: 1.05,
          letterSpacing: '-0.04em', marginBottom: 10, color: 'var(--text)',
        }}>
          {greeting},{' '}
          <span className="gradient-brand-text">{user?.name?.split(' ')[0] || 'Operator'}</span>
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pulse-dot"/>
          Pipeline online · monitoring {dashboardActiveCalls.length} live call{dashboardActiveCalls.length === 1 ? '' : 's'}
        </p>
      </motion.div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        {cards.map((card, i) => <StatsCard key={i} index={i} {...card}/>)}
      </div>

      {/* Charts row */}
      {recentCallData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 28 }}>

          {/* 7-day calls trend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass" style={{ padding: 22 }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              7-Day Call Trend
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 14 }}>Calls vs answered, last 7 days</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COL_PINK} stopOpacity={0.35}/>
                    <stop offset="95%" stopColor={COL_PINK} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gAnswered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COL_GREEN} stopOpacity={0.35}/>
                    <stop offset="95%" stopColor={COL_GREEN} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}/>
                <Area type="monotone" dataKey="calls"    stroke={COL_PINK}  fill="url(#gCalls)"    strokeWidth={2} dot={false} name="Calls"/>
                <Area type="monotone" dataKey="answered" stroke={COL_GREEN} fill="url(#gAnswered)" strokeWidth={2} dot={false} name="Answered"/>
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Disposition donut */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass" style={{ padding: 22 }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              Disposition Breakdown
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 14 }}>Last {recentCallData.length} calls</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={dispositionData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} dataKey="value" paddingAngle={2}>
                    {dispositionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {dispositionData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}/>
                    <span style={{ color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <span style={{ fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Live row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

        {/* Active calls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass" style={{ padding: 24, borderRadius: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,167,71,0.10)', border: '1px solid rgba(0,167,71,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,167,71,0.18)' }}>
              <Radio size={16} color={COL_GREEN}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Live Calls</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2, fontWeight: 600 }}>Real-time pipeline</div>
            </div>
            {dashboardActiveCalls.length > 0 && (
              <span className="badge badge-answered"><span className="pulse-dot"/> {dashboardActiveCalls.length} active</span>
            )}
          </div>
          {dashboardActiveCalls.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No active calls right now</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dashboardActiveCalls.map(call => (
                <motion.div key={call.callId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  style={{ padding: '12px 14px', background: 'var(--bg-glass)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span className="pulse-dot"/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{call.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{call.phone} → {call.agentName}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent calls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="glass" style={{ padding: 24, borderRadius: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(251,11,140,0.10)', border: '1px solid rgba(251,11,140,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(251,11,140,0.18)' }}>
              <Activity size={16} color={COL_PINK}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Recent Calls</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2, fontWeight: 600 }}>Last activity feed</div>
            </div>
          </div>
          {dashboardRecentCalls.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No recent calls yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <AnimatePresence>
                {dashboardRecentCalls.slice(0, 8).map((call, i) => (
                  <motion.div key={`${call.callId}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < Math.min(dashboardRecentCalls.length, 8) - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {call.name || call.phone}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{call.duration ? `${call.duration}s` : '—'}</span>
                    <span className={`badge ${call.status === 'ANSWERED' || call.status === 'COMPLETED' ? 'badge-answered' : 'badge-noanswer'}`}>{call.status || 'UNKNOWN'}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Quick actions — expanded */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          className="glass" style={{ padding: 24, borderRadius: 20 }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 18 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Open Dialer',     href: '#/dialer',       icon: Phone,     color: COL_PINK   },
              { label: 'New Campaign',    href: '#/campaigns',    icon: Megaphone, color: COL_GREEN  },
              { label: 'Upload Contacts', href: '#/contacts',     icon: BookUser,  color: COL_PURPLE },
              { label: 'Manage Agents',   href: '#/agents',       icon: Users,     color: COL_GOLD   },
              { label: 'DNC Registry',    href: '#/dnc',          icon: ShieldOff, color: '#ef4444'  },
              { label: 'Settings',        href: '#/settings',     icon: Settings2, color: COL_PURPLE },
            ].map(a => {
              const Icon = a.icon
              return (
                <motion.a key={a.href} href={a.href} whileHover={{ x: 3 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-glass)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13.5, fontWeight: 700, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = `${a.color}10` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-glass)' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${a.color}22`, color: a.color }}>
                    <Icon size={14}/>
                  </div>
                  <span style={{ flex: 1 }}>{a.label}</span>
                  <ArrowUpRight size={14} color="var(--text-3)"/>
                </motion.a>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
