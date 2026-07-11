import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Gauge, PauseCircle, Phone, Play, RefreshCw, ShieldAlert, Sparkles, Square, Zap } from 'lucide-react'
import { advancedDialingAPI } from '../api/advancedDialing.api'
import { cleanDisplayText } from '../utils/displayText'

type DialingMetrics = {
  generatedAt?: string
  campaignId?: number | null
  totals?: Record<string, number>
  rates?: Record<string, number>
  recentCalls?: RecentDialingCall[]
  note?: string
}

type RecentDialingCall = {
  id?: number
  campaignId?: number | null
  agentId?: number | null
  status?: string | null
  disposition?: string | null
  duration?: number | null
  startedAt?: string | null
  endedAt?: string | null
}

type PacingPreview = {
  recommendedDialCount?: number
  availableDialSlots?: number
  cap?: number
  raw?: number
  readyAgents?: number
  answerRate?: number
  abandonRate?: number
  autoDialLevel?: number
  effectiveDialLevel?: number
  adjustmentReasons?: string[]
  maxCallsPerReadyAgent?: number
  safetyMultiplier?: number
  featureFlagRequired?: boolean
}

type GuardrailPreview = {
  campaignId?: number
  safe?: boolean
  shouldPause?: boolean
  violations?: string[]
  maxAbandonmentRate?: number
  abandonmentRate?: number
}

type EngineStatus = {
  campaignId?: number
  generatedAt?: string
  running?: boolean
  campaignStatus?: string | null
  mode?: string
  runtimeAllowed?: boolean
  waitingReason?: string | null
  readyAgents?: number
  activeCalls?: number
  pendingContacts?: number
  retryDueContacts?: number
  hopper?: {
    minimumHopper?: number
    maximumHopper?: number
    eligibleInHopper?: number
    inspected?: number
    dncBlocked?: number
    needsRefill?: boolean
    empty?: boolean
  }
  abandonRate?: number
  averages?: {
    ringSeconds?: number
    talkSeconds?: number
    wrapUpSeconds?: number
  }
  settings?: Partial<PredictiveSettings>
  answeredCalls?: number
  totalCalls?: number
  answerRate?: number
  recommendedDialCount?: number
  availableDialSlots?: number
  guardrails?: {
    safe?: boolean
    reasons?: string[]
  }
  pacing?: PacingPreview
}

type PredictiveSettings = {
  mode: string
  predictiveEnabled: boolean
  adaptiveDialEnabled: boolean
  autoDialLevel: number
  minimumHopper: number
  maximumHopper: number
  hopperRefillInterval: number
  retryDelay: number
  maxRetries: number
  wrapUpTime: number
  maximumAbandonRate: number
  maximumSimultaneousCalls: number
  maximumCallsPerAgent: number
  callTimeout: number
  ringTimeout: number
  agentReservationTime: number
  maximumQueueWait: number
  startTime: string
  endTime: string
  timezone: string
  localCallTime: boolean
  emergencyStopped: boolean
}

const METRICS_CACHE_KEY = 'ptdt-advanced-dialing-metrics'
const ENGINE_CAMPAIGN_KEY = 'ptdt-advanced-dialing-engine-campaign-id'
const PREDICTIVE_PAUSE_KEY = 'ptdt-advanced-dialing-predictive-paused'
const DIAL_LEVELS = [0, 0.5, 1, 1.2, 1.5, 2, 2.5, 3]

const defaultPredictiveSettings = (): PredictiveSettings => ({
  mode: 'PREDICTIVE',
  predictiveEnabled: true,
  adaptiveDialEnabled: true,
  autoDialLevel: 1,
  minimumHopper: 25,
  maximumHopper: 200,
  hopperRefillInterval: 30,
  retryDelay: 300,
  maxRetries: 3,
  wrapUpTime: 30,
  maximumAbandonRate: 0.03,
  maximumSimultaneousCalls: 50,
  maximumCallsPerAgent: 1,
  callTimeout: 60,
  ringTimeout: 30,
  agentReservationTime: 15,
  maximumQueueWait: 45,
  startTime: '',
  endTime: '',
  timezone: 'Asia/Karachi',
  localCallTime: true,
  emergencyStopped: false,
})

const fmtPercent = (value?: number) => {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round((value || 0) * 100)}%`
}

const fmtDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

const readCachedMetrics = (): DialingMetrics | undefined => {
  try {
    const cached = window.localStorage.getItem(METRICS_CACHE_KEY)
    return cached ? JSON.parse(cached) as DialingMetrics : undefined
  } catch {
    return undefined
  }
}

const writeCachedMetrics = (metrics: DialingMetrics) => {
  try {
    window.localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(metrics))
  } catch {
    // cache helper only
  }
}

const readEngineCampaignId = () => {
  try {
    const value = Number(window.localStorage.getItem(ENGINE_CAMPAIGN_KEY) || 1)
    return Number.isFinite(value) && value > 0 ? value : 1
  } catch {
    return 1
  }
}

export default function AdvancedDialingAnalytics() {
  const [pacing, setPacing] = useState<PacingPreview | null>(null)
  const [guardrails, setGuardrails] = useState<GuardrailPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [engineCampaignId, setEngineCampaignId] = useState(readEngineCampaignId)
  const [engineBusy, setEngineBusy] = useState(false)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settings, setSettings] = useState<PredictiveSettings>(defaultPredictiveSettings)
  const [predictivePaused, setPredictivePaused] = useState(() => {
    try { return window.localStorage.getItem(PREDICTIVE_PAUSE_KEY) === '1' } catch { return false }
  })

  const metricsQuery = useQuery<DialingMetrics>({
    queryKey: ['advanced-dialing', 'metrics'],
    queryFn: async () => {
      const nextMetrics = await advancedDialingAPI.getMetrics()
      writeCachedMetrics(nextMetrics)
      return nextMetrics
    },
    initialData: readCachedMetrics,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const engineQuery = useQuery<EngineStatus>({
    queryKey: ['advanced-dialing', 'engine-status', engineCampaignId],
    queryFn: () => advancedDialingAPI.getEngineStatus(engineCampaignId),
    enabled: Number.isFinite(engineCampaignId) && engineCampaignId > 0,
    staleTime: 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const settingsQuery = useQuery<PredictiveSettings>({
    queryKey: ['advanced-dialing', 'dial-settings', engineCampaignId],
    queryFn: () => advancedDialingAPI.getCampaignDialSettings(engineCampaignId),
    enabled: Number.isFinite(engineCampaignId) && engineCampaignId > 0,
    staleTime: 90 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  useEffect(() => {
    if (!settingsQuery.data) return
    setSettings({ ...defaultPredictiveSettings(), ...settingsQuery.data })
  }, [settingsQuery.data])

  const metrics = metricsQuery.data ?? null
  const loading = metricsQuery.isLoading && !metrics
  const error = previewError || (
    !metrics && metricsQuery.error
      ? metricsQuery.error instanceof Error
        ? metricsQuery.error.message
        : 'Failed to load advanced dialing metrics'
      : ''
  )

  const totals = metrics?.totals || {}
  const rates = metrics?.rates || {}
  const recentCallCount = metrics?.recentCalls?.length || 0
  const engineStatus = engineQuery.data || null

  const cards = useMemo(
    () => [
      { label: 'Total Calls', value: totals.totalCalls || 0, sub: `${totals.completedCalls || 0} completed`, icon: <Phone size={18} />, color: '#fb0b8c' },
      { label: 'Answer Rate', value: fmtPercent(rates.answerRate), sub: `${totals.answeredCalls || 0} answered`, icon: <BarChart3 size={18} />, color: '#00a747' },
      { label: 'Callback Rate', value: fmtPercent(rates.callbackRate), sub: `${totals.callbackCalls || 0} callbacks`, icon: <Activity size={18} />, color: '#8057d7' },
      { label: 'Recent Sample', value: recentCallCount, sub: 'latest calls inspected', icon: <Gauge size={18} />, color: '#f0b90b' },
    ],
    [recentCallCount, rates.answerRate, rates.callbackRate, totals.answeredCalls, totals.callbackCalls, totals.completedCalls, totals.totalCalls]
  )

  const preview = async () => {
    setPreviewing(true)
    setPreviewError('')
    try {
      const [nextPacing, nextGuardrails] = await Promise.all([
        advancedDialingAPI.previewPacing({
          readyAgents: engineStatus?.readyAgents || 3,
          answerRate: engineStatus?.answerRate || rates.answerRate || 0.2,
          activeCalls: engineStatus?.activeCalls || 0,
          abandonRate: engineStatus?.abandonRate || 0,
          autoDialLevel: settings.autoDialLevel,
          adaptiveDialEnabled: settings.adaptiveDialEnabled,
          maxAbandonRate: settings.maximumAbandonRate,
          maxSimultaneousCalls: settings.maximumSimultaneousCalls,
          maxCallsPerReadyAgent: settings.maximumCallsPerAgent,
        }),
        advancedDialingAPI.previewGuardrails({
          campaignId: engineCampaignId,
          abandonmentRate: 0.01,
        }),
      ])
      setPacing(nextPacing)
      setGuardrails(nextGuardrails)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to run predictive preview')
    } finally {
      setPreviewing(false)
    }
  }

  const setCampaignId = (value: string) => {
    const numeric = Number(value)
    const next = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 1
    setEngineCampaignId(next)
    try { window.localStorage.setItem(ENGINE_CAMPAIGN_KEY, String(next)) } catch { /* ignore */ }
  }

  const updateSetting = (key: keyof PredictiveSettings, value: string | number | boolean) => {
    setSettings(current => ({ ...current, [key]: value }))
  }

  const saveSettings = async () => {
    setSettingsBusy(true)
    setPreviewError('')
    try {
      await advancedDialingAPI.updateCampaignDialSettings(engineCampaignId, settings)
      await Promise.all([settingsQuery.refetch(), engineQuery.refetch(), metricsQuery.refetch()])
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to save predictive settings')
    } finally {
      setSettingsBusy(false)
    }
  }

  const togglePredictivePause = () => {
    setPredictivePaused(current => {
      const next = !current
      try { window.localStorage.setItem(PREDICTIVE_PAUSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  const engineAction = async (action: 'start' | 'stop' | 'tick') => {
    setEngineBusy(true)
    setPreviewError('')
    try {
      if (action === 'start') await advancedDialingAPI.startCampaignEngine(engineCampaignId)
      if (action === 'stop') await advancedDialingAPI.stopCampaignEngine(engineCampaignId)
      if (action === 'tick') await advancedDialingAPI.runEngineTick(engineCampaignId)
      await Promise.all([engineQuery.refetch(), metricsQuery.refetch()])
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : `Failed to ${action} engine`)
    } finally {
      setEngineBusy(false)
    }
  }

  const refreshMetrics = async () => {
    setPreviewError('')
    await Promise.all([metricsQuery.refetch(), engineQuery.refetch(), settingsQuery.refetch()])
  }

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Sparkles size={12} /> Predictive / Progressive Engine
          </div>
          <h1 className="ptdt-page-title">
            Advanced <span className="gradient-brand-text">Dialing Analytics</span>
          </h1>
          <p className="ptdt-page-desc">
            Predictive pacing, progressive dialing, retry visibility, DNC guardrails, and live campaign engine control for Admin/Supervisor review.
          </p>
        </div>
        <div className="ptdt-toolbar">
          <span className="ptdt-chip"><ShieldAlert size={13} /> Engine guarded</span>
          <button className="ptdt-action-btn" type="button" onClick={() => void refreshMetrics()} disabled={metricsQuery.isFetching || engineQuery.isFetching}>
            <RefreshCw size={14} /> {metricsQuery.isFetching || engineQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-brand" type="button" onClick={() => void preview()} disabled={previewing}>
            <Zap size={14} /> {previewing ? 'Running...' : 'Run Preview'}
          </button>
        </div>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>Loading advanced dialing metrics...</div>
      ) : (
        <>
          <div className="ptdt-pro-kpis" style={{ marginBottom: 18 }}>
            {cards.map(card => <MetricCard key={card.label} {...card} />)}
          </div>

          <section className="ptdt-card" style={{ padding: 18, marginBottom: 18 }}>
            <SectionTitle icon={<Zap size={16} />} title="Live Campaign Engine" subtitle="Start/stop guarded predictive or progressive dialing for one campaign." />
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) minmax(0, 1fr)', gap: 14, alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Campaign ID</span>
                <input className="ptdt-input" type="number" min={1} value={engineCampaignId} onChange={event => setCampaignId(event.target.value)} />
              </label>
              <div className="ptdt-toolbar" style={{ justifyContent: 'flex-start' }}>
                <button className="btn-brand" type="button" onClick={() => void engineAction('start')} disabled={engineBusy || predictivePaused}>
                  <Play size={14} /> Start Engine
                </button>
                <button className="ptdt-action-btn danger" type="button" onClick={() => void engineAction('stop')} disabled={engineBusy}>
                  <Square size={14} /> Stop
                </button>
                <button className="ptdt-action-btn" type="button" onClick={() => void engineAction('tick')} disabled={engineBusy || predictivePaused}>
                  <RefreshCw size={14} /> Run Tick
                </button>
                <button className={predictivePaused ? 'ptdt-action-btn danger' : 'ptdt-action-btn'} type="button" onClick={togglePredictivePause}>
                  <PauseCircle size={14} /> {predictivePaused ? 'Predictive Paused' : 'Pause Predictive'}
                </button>
              </div>
            </div>

            {predictivePaused && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 16, border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.10)', color: 'var(--danger)', fontSize: 12.5, fontWeight: 850 }}>
                Predictive dialing is paused for this operator session. Start and tick actions stay locked until predictive dialing is resumed.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 16 }}>
              <MiniStat label="Running" value={engineStatus?.running ? 'YES' : 'NO'} />
              <MiniStat label="Mode" value={engineStatus?.mode || '-'} />
              <MiniStat label="Ready Agents" value={engineStatus?.readyAgents ?? 0} />
              <MiniStat label="Active Calls" value={engineStatus?.activeCalls ?? 0} />
              <MiniStat label="Dial Slots" value={engineStatus?.availableDialSlots ?? 0} />
              <MiniStat label="Answer Rate" value={fmtPercent(engineStatus?.answerRate)} />
            </div>

            <div style={{ marginTop: 14 }}>
              {engineStatus?.guardrails?.safe ? (
                <div className="badge badge-answered"><CheckCircle2 size={13} /> Engine safe</div>
              ) : (
                <div className="badge badge-pending"><AlertTriangle size={13} /> {(engineStatus?.guardrails?.reasons || ['Awaiting status']).join(' · ')}</div>
              )}
            </div>
          </section>

          <section className="ptdt-card" style={{ padding: 18, marginBottom: 18 }}>
            <SectionTitle icon={<Gauge size={16} />} title="Predictive Campaign Controls" subtitle="VICIdial-style pacing controls backed by PTDT scheduler guardrails." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Field label="Campaign Status">
                <select className="ptdt-input" value={settings.mode} onChange={event => updateSetting('mode', event.target.value)}>
                  <option value="PROGRESSIVE">Progressive</option>
                  <option value="PREDICTIVE">Predictive</option>
                  <option value="PREVIEW">Preview</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </Field>
              <Field label="Auto Dial Level">
                <select className="ptdt-input" value={settings.autoDialLevel} onChange={event => updateSetting('autoDialLevel', Number(event.target.value))}>
                  {DIAL_LEVELS.map(level => <option key={level} value={level}>{level.toFixed(level % 1 === 0 ? 1 : 1)}</option>)}
                </select>
              </Field>
              <Field label="Minimum Hopper"><input className="ptdt-input" type="number" min={1} value={settings.minimumHopper} onChange={event => updateSetting('minimumHopper', Number(event.target.value))} /></Field>
              <Field label="Maximum Hopper"><input className="ptdt-input" type="number" min={1} value={settings.maximumHopper} onChange={event => updateSetting('maximumHopper', Number(event.target.value))} /></Field>
              <Field label="Retry Delay"><input className="ptdt-input" type="number" min={30} value={settings.retryDelay} onChange={event => updateSetting('retryDelay', Number(event.target.value))} /></Field>
              <Field label="Retry Attempts"><input className="ptdt-input" type="number" min={0} value={settings.maxRetries} onChange={event => updateSetting('maxRetries', Number(event.target.value))} /></Field>
              <Field label="Wrap-up Time"><input className="ptdt-input" type="number" min={0} value={settings.wrapUpTime} onChange={event => updateSetting('wrapUpTime', Number(event.target.value))} /></Field>
              <Field label="Max Abandon Rate"><input className="ptdt-input" type="number" min={0} max={0.2} step={0.01} value={settings.maximumAbandonRate} onChange={event => updateSetting('maximumAbandonRate', Number(event.target.value))} /></Field>
              <Field label="Max Simultaneous Calls"><input className="ptdt-input" type="number" min={1} value={settings.maximumSimultaneousCalls} onChange={event => updateSetting('maximumSimultaneousCalls', Number(event.target.value))} /></Field>
              <Field label="Max Calls Per Agent"><input className="ptdt-input" type="number" min={0.5} max={5} step={0.1} value={settings.maximumCallsPerAgent} onChange={event => updateSetting('maximumCallsPerAgent', Number(event.target.value))} /></Field>
              <Field label="Ring Timeout"><input className="ptdt-input" type="number" min={5} value={settings.ringTimeout} onChange={event => updateSetting('ringTimeout', Number(event.target.value))} /></Field>
              <Field label="Call Timeout"><input className="ptdt-input" type="number" min={5} value={settings.callTimeout} onChange={event => updateSetting('callTimeout', Number(event.target.value))} /></Field>
              <Field label="Start Time"><input className="ptdt-input" type="time" value={settings.startTime || ''} onChange={event => updateSetting('startTime', event.target.value)} /></Field>
              <Field label="Stop Time"><input className="ptdt-input" type="time" value={settings.endTime || ''} onChange={event => updateSetting('endTime', event.target.value)} /></Field>
              <Field label="Timezone"><input className="ptdt-input" value={settings.timezone} onChange={event => updateSetting('timezone', event.target.value)} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
              <TogglePill active={settings.predictiveEnabled} label="Predictive Enabled" onClick={() => updateSetting('predictiveEnabled', !settings.predictiveEnabled)} />
              <TogglePill active={settings.adaptiveDialEnabled} label="Adaptive Dial Level" onClick={() => updateSetting('adaptiveDialEnabled', !settings.adaptiveDialEnabled)} />
              <TogglePill active={settings.localCallTime} label="Local Call Time" onClick={() => updateSetting('localCallTime', !settings.localCallTime)} />
              <TogglePill active={settings.emergencyStopped} danger label="Emergency Stop" onClick={() => updateSetting('emergencyStopped', !settings.emergencyStopped)} />
              <button className="btn-brand" type="button" onClick={() => void saveSettings()} disabled={settingsBusy || settingsQuery.isFetching} style={{ marginLeft: 'auto' }}>
                <CheckCircle2 size={14} /> {settingsBusy ? 'Saving...' : 'Save Predictive Settings'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
              <MiniStat label="Hopper Ready" value={engineStatus?.hopper?.eligibleInHopper ?? 0} />
              <MiniStat label="Effective Level" value={engineStatus?.pacing?.effectiveDialLevel ?? settings.autoDialLevel} />
              <MiniStat label="Abandon Rate" value={fmtPercent(engineStatus?.abandonRate)} />
              <MiniStat label="Wrap-up" value={`${engineStatus?.averages?.wrapUpSeconds ?? settings.wrapUpTime}s`} />
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.72fr)', gap: 16, alignItems: 'start' }}>
            <section className="ptdt-card" style={{ padding: 18 }}>
              <SectionTitle icon={<BarChart3 size={16} />} title="Baseline Metrics" subtitle={`Generated ${fmtDate(metrics?.generatedAt)}`} />
              <BaselineMetricsPanel metrics={metrics} />
            </section>

            <div style={{ display: 'grid', gap: 16 }}>
              <section className="ptdt-card" style={{ padding: 18 }}>
                <SectionTitle icon={<Zap size={16} />} title="Predictive Pacing Preview" subtitle="Simulation + live engine inputs." />
                {pacing ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                      <MiniStat label="Recommended" value={pacing.recommendedDialCount ?? 0} />
                      <MiniStat label="Safety Cap" value={pacing.cap ?? 0} />
                    </div>
                    <JsonBlock data={pacing} compact />
                  </>
                ) : <EmptyState text="Run preview to calculate conservative predictive pacing." />}
              </section>

              <section className="ptdt-card" style={{ padding: 18 }}>
                <SectionTitle icon={<ShieldAlert size={16} />} title="Guardrails" subtitle="Abandonment, DNC, retries, and runtime checks." />
                {guardrails ? (
                  <>
                    <div className={guardrails.safe ? 'badge badge-answered' : 'badge badge-busy'} style={{ marginBottom: 12 }}>
                      {guardrails.safe ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {guardrails.safe ? 'Safe' : 'Action needed'}
                    </div>
                    <JsonBlock data={guardrails} compact />
                  </>
                ) : <EmptyState text="Run preview to evaluate guardrails." />}
              </section>
            </div>
          </div>

          <section className="ptdt-card" style={{ padding: 18, marginTop: 16 }}>
            <SectionTitle icon={<Activity size={16} />} title="Recent Dialing Sample" subtitle="Latest records used for pacing visibility." />
            <RecentCallsTable calls={metrics?.recentCalls || []} />
          </section>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub, icon, color }: { label: string; value: ReactNode; sub: string; icon: ReactNode; color: string }) {
  return (
    <div className="ptdt-card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: 16, display: 'grid', placeItems: 'center', color, border: `1px solid ${color}33`, background: `${color}12` }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
        <div className="display" style={{ fontSize: 28, marginTop: 2 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
      <div style={{ width: 30, height: 30, borderRadius: 12, display: 'grid', placeItems: 'center', color: 'var(--pink)', background: 'rgba(251,11,140,0.10)', border: '1px solid rgba(251,11,140,0.22)' }}>{icon}</div>
      <div>
        <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>{subtitle}</p>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 12, background: 'var(--surface)' }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div className="display" style={{ fontSize: 22, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      {children}
    </label>
  )
}

function TogglePill({ active, label, danger = false, onClick }: { active: boolean; label: string; danger?: boolean; onClick: () => void }) {
  const color = danger ? '#ef4444' : '#00a747'
  return (
    <button
      type="button"
      className="ptdt-action-btn"
      onClick={onClick}
      style={{
        borderColor: active ? `${color}55` : 'var(--border)',
        background: active ? `${color}14` : 'var(--surface)',
        color: active ? color : 'var(--text-3)',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: active ? color : 'var(--text-3)', display: 'inline-block' }} />
      {label}
    </button>
  )
}

function BaselineMetricsPanel({ metrics }: { metrics: DialingMetrics | null }) {
  const totals = metrics?.totals || {}
  const rates = metrics?.rates || {}
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <MiniStat label="Completed" value={totals.completedCalls || 0} />
        <MiniStat label="Answered" value={totals.answeredCalls || 0} />
        <MiniStat label="Callbacks" value={totals.callbackCalls || 0} />
        <MiniStat label="DNC" value={totals.dncCalls || 0} />
      </div>
      <JsonBlock data={{ rates, note: metrics?.note }} compact />
    </div>
  )
}

function RecentCallsTable({ calls }: { calls: RecentDialingCall[] }) {
  if (calls.length === 0) return <EmptyState text="No recent calls available." />
  return (
    <div className="ptdt-advanced-dialing-sample" style={{ overflowX: 'auto' }}>
      <table className="ptdt-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Call</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Campaign</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Agent</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Disposition</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Started</th>
          </tr>
        </thead>
        <tbody>
          {calls.slice(0, 20).map(call => (
            <tr key={call.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 8px', fontWeight: 800 }}>#{call.id}</td>
              <td style={{ padding: '8px 8px' }}>{call.campaignId || '-'}</td>
              <td style={{ padding: '8px 8px' }}>{call.agentId || '-'}</td>
              <td style={{ padding: '8px 8px' }}>{cleanDisplayText(call.status, '-')}</td>
              <td style={{ padding: '8px 8px' }}>{cleanDisplayText(call.disposition, '-')}</td>
              <td style={{ padding: '8px 8px' }}>{fmtDate(call.startedAt || undefined)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JsonBlock({ data, compact = false }: { data: unknown; compact?: boolean }) {
  return (
    <pre className="ptdt-raw-json" style={{ maxHeight: compact ? 220 : 560, borderRadius: 14, padding: 12, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ border: '1px dashed var(--border)', borderRadius: 14, padding: 16, color: 'var(--text-3)', fontSize: 13 }}>
      {text}
    </div>
  )
}
