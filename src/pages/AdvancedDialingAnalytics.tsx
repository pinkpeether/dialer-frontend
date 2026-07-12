import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Gauge, PauseCircle, Phone, Play, RefreshCw, ShieldAlert, Sparkles, Square, Zap } from 'lucide-react'
import { advancedDialingAPI } from '../api/advancedDialing.api'
import { campaignsAPI } from '../api/campaigns.api'
import { cleanDisplayText } from '../utils/displayText'

type RecentDialingCall = { id?: number; campaignId?: number | null; agentId?: number | null; status?: string | null; disposition?: string | null; startedAt?: string | null }
type DialingMetrics = { generatedAt?: string; totals?: Record<string, number>; rates?: Record<string, number>; recentCalls?: RecentDialingCall[]; note?: string }
type CampaignOption = { id: number; name?: string | null; status?: string | null; mode?: string | null }
type PacingPreview = { recommendedDialCount?: number; availableDialSlots?: number; readyAgents?: number; answerRate?: number; abandonRate?: number; autoDialLevel?: number; effectiveDialLevel?: number; adjustmentReasons?: string[]; maxCallsPerReadyAgent?: number; safetyMultiplier?: number }
type GuardrailPreview = { safe?: boolean; shouldPause?: boolean; violations?: string[]; maxAbandonmentRate?: number; abandonmentRate?: number }
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
type EngineStatus = {
  running?: boolean
  mode?: string
  readyAgents?: number
  activeCalls?: number
  pendingContacts?: number
  abandonRate?: number
  answerRate?: number
  availableDialSlots?: number
  averages?: { wrapUpSeconds?: number }
  hopper?: { eligibleInHopper?: number; needsRefill?: boolean; empty?: boolean }
  pacing?: { effectiveDialLevel?: number }
  guardrails?: { safe?: boolean; reasons?: string[] }
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
  timezone: 'America/New_York',
  localCallTime: true,
  emergencyStopped: false,
})

const fmtPercent = (value?: number) => `${Math.round((Number.isFinite(value) ? value || 0 : 0) * 100)}%`
const fmtDate = (value?: string) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString() : '—'
const readCachedMetrics = (): DialingMetrics | undefined => { try { const cached = window.localStorage.getItem(METRICS_CACHE_KEY); return cached ? JSON.parse(cached) as DialingMetrics : undefined } catch { return undefined } }
const writeCachedMetrics = (metrics: DialingMetrics) => { try { window.localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(metrics)) } catch { /* best effort */ } }
const readEngineCampaignId = () => { try { const value = Number(window.localStorage.getItem(ENGINE_CAMPAIGN_KEY) || 0); return Number.isFinite(value) && value > 0 ? value : 0 } catch { return 0 } }

export default function AdvancedDialingAnalytics() {
  const [pacing, setPacing] = useState<PacingPreview | null>(null)
  const [guardrails, setGuardrails] = useState<GuardrailPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [engineCampaignId, setEngineCampaignId] = useState(readEngineCampaignId)
  const [engineBusy, setEngineBusy] = useState(false)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settings, setSettings] = useState<PredictiveSettings>(defaultPredictiveSettings)
  const [predictivePaused, setPredictivePaused] = useState(() => { try { return window.localStorage.getItem(PREDICTIVE_PAUSE_KEY) === '1' } catch { return false } })

  const metricsQuery = useQuery<DialingMetrics>({
    queryKey: ['advanced-dialing', 'metrics'],
    queryFn: async () => { const next = await advancedDialingAPI.getMetrics(); writeCachedMetrics(next); return next },
    initialData: readCachedMetrics,
    staleTime: 120000,
    gcTime: 1200000,
    refetchOnWindowFocus: false,
    placeholderData: previous => previous,
  })
  const campaignsQuery = useQuery<{ campaigns?: CampaignOption[] }>({
    queryKey: ['advanced-dialing', 'campaign-options'],
    queryFn: () => campaignsAPI.getAll({ limit: 500 }, { silent: true }),
    staleTime: 120000,
    gcTime: 1200000,
    refetchOnWindowFocus: false,
    placeholderData: previous => previous,
  })
  const engineQuery = useQuery<EngineStatus>({
    queryKey: ['advanced-dialing', 'engine-status', engineCampaignId],
    queryFn: () => advancedDialingAPI.getEngineStatus(engineCampaignId),
    enabled: engineCampaignId > 0,
    staleTime: 60000,
    gcTime: 1200000,
    refetchOnWindowFocus: false,
    placeholderData: previous => previous,
  })
  const settingsQuery = useQuery<PredictiveSettings>({
    queryKey: ['advanced-dialing', 'dial-settings', engineCampaignId],
    queryFn: () => advancedDialingAPI.getCampaignDialSettings(engineCampaignId),
    enabled: engineCampaignId > 0,
    staleTime: 90000,
    gcTime: 1200000,
    refetchOnWindowFocus: false,
    placeholderData: previous => previous,
  })

  useEffect(() => {
    if (settingsQuery.data) setSettings({ ...defaultPredictiveSettings(), ...settingsQuery.data, timezone: settingsQuery.data.timezone || 'America/New_York' })
  }, [settingsQuery.data])

  const metrics = metricsQuery.data || null
  const totals = metrics?.totals || {}
  const rates = metrics?.rates || {}
  const engineStatus = engineQuery.data || null
  const campaignOptions = useMemo(() => (campaignsQuery.data?.campaigns || []).filter(campaign => Number.isFinite(Number(campaign.id))), [campaignsQuery.data?.campaigns])
  const selectedCampaign = useMemo(() => campaignOptions.find(campaign => Number(campaign.id) === engineCampaignId) || null, [campaignOptions, engineCampaignId])

  useEffect(() => {
    if (engineCampaignId > 0 || !campaignOptions.length) return
    const first = Number(campaignOptions[0].id)
    setEngineCampaignId(first)
    try { window.localStorage.setItem(ENGINE_CAMPAIGN_KEY, String(first)) } catch { /* ignore */ }
  }, [campaignOptions, engineCampaignId])

  const setCampaignId = (value: string) => {
    const numeric = Number(value)
    const next = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0
    setEngineCampaignId(next)
    try { window.localStorage.setItem(ENGINE_CAMPAIGN_KEY, next ? String(next) : '') } catch { /* ignore */ }
  }
  const updateSetting = (key: keyof PredictiveSettings, value: string | number | boolean) => setSettings(current => ({ ...current, [key]: value }))

  const preview = async () => {
    if (!engineCampaignId) return setPreviewError('Select a campaign before running predictive preview.')
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
        advancedDialingAPI.previewGuardrails({ campaignId: engineCampaignId, abandonmentRate: engineStatus?.abandonRate || 0.01 }),
      ])
      setPacing(nextPacing)
      setGuardrails(nextGuardrails)
    } catch (err) { setPreviewError(err instanceof Error ? err.message : 'Failed to run predictive preview') }
    finally { setPreviewing(false) }
  }

  const saveSettings = async () => {
    if (!engineCampaignId) return setPreviewError('Select a campaign before saving predictive settings.')
    setSettingsBusy(true)
    setPreviewError('')
    try {
      await advancedDialingAPI.updateCampaignDialSettings(engineCampaignId, { ...settings, timezone: settings.timezone || 'America/New_York' })
      await Promise.all([settingsQuery.refetch(), engineQuery.refetch(), metricsQuery.refetch()])
    } catch (err) { setPreviewError(err instanceof Error ? err.message : 'Failed to save predictive settings') }
    finally { setSettingsBusy(false) }
  }

  const engineAction = async (action: 'start' | 'stop' | 'tick') => {
    if (!engineCampaignId) return setPreviewError('Select a campaign before using the dialing engine.')
    setEngineBusy(true)
    setPreviewError('')
    try {
      if (action === 'start') await advancedDialingAPI.startCampaignEngine(engineCampaignId)
      if (action === 'stop') await advancedDialingAPI.stopCampaignEngine(engineCampaignId)
      if (action === 'tick') await advancedDialingAPI.runEngineTick(engineCampaignId)
      await Promise.all([engineQuery.refetch(), metricsQuery.refetch()])
    } catch (err) { setPreviewError(err instanceof Error ? err.message : `Failed to ${action} engine`) }
    finally { setEngineBusy(false) }
  }

  const togglePredictivePause = () => setPredictivePaused(current => {
    const next = !current
    try { window.localStorage.setItem(PREDICTIVE_PAUSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
    return next
  })
  const refreshMetrics = async () => { setPreviewError(''); await Promise.all([metricsQuery.refetch(), engineQuery.refetch(), settingsQuery.refetch()]) }

  const cards = [
    { label: 'Total Calls', value: totals.totalCalls || 0, sub: `${totals.completedCalls || 0} completed`, icon: <Phone size={18} />, color: '#fb0b8c' },
    { label: 'Answer Rate', value: fmtPercent(rates.answerRate), sub: `${totals.answeredCalls || 0} answered`, icon: <BarChart3 size={18} />, color: '#00a747' },
    { label: 'Callback Rate', value: fmtPercent(rates.callbackRate), sub: `${totals.callbackCalls || 0} callbacks`, icon: <Activity size={18} />, color: '#8057d7' },
    { label: 'Recent Sample', value: metrics?.recentCalls?.length || 0, sub: 'latest calls inspected', icon: <Gauge size={18} />, color: '#f0b90b' },
  ]
  const error = previewError || (!metrics && metricsQuery.error ? metricsQuery.error instanceof Error ? metricsQuery.error.message : 'Failed to load dialing metrics' : '')

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div><div className="eyebrow pink" style={{ marginBottom: 12 }}><Sparkles size={12} /> Predictive &amp; Progressive Controls</div><h1 className="ptdt-page-title">Dialing <span className="gradient-brand-text">Settings</span></h1><p className="ptdt-page-desc">Configure predictive pacing, progressive dialing, retry behavior, calling windows, safety guardrails, and live campaign engine controls.</p></div>
        <div className="ptdt-toolbar"><span className="ptdt-chip"><ShieldAlert size={13} /> Safety controls active</span><button className="ptdt-action-btn" type="button" onClick={() => void refreshMetrics()} disabled={metricsQuery.isFetching || engineQuery.isFetching}><RefreshCw size={14} /> {metricsQuery.isFetching || engineQuery.isFetching ? 'Refreshing...' : 'Refresh'}</button><button className="btn-brand" type="button" onClick={() => void preview()} disabled={!engineCampaignId || previewing}><Zap size={14} /> {previewing ? 'Running...' : 'Run Preview'}</button></div>
      </div>

      {error && <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>{error}</div>}

      {metricsQuery.isLoading && !metrics ? <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>Loading dialing settings...</div> : <>
        <div className="ptdt-pro-kpis" style={{ marginBottom: 18 }}>{cards.map(card => <MetricCard key={card.label} {...card} />)}</div>

        <section className="ptdt-card" style={{ padding: 18, marginBottom: 18 }}>
          <SectionTitle icon={<Zap size={16} />} title="Live Campaign Engine" subtitle="Start, stop, pause, resume, or run one guarded dialing cycle for the selected campaign." />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 420px) minmax(0, 1fr)', gap: 14, alignItems: 'end' }}>
            <Field label="Campaign"><select className="ptdt-input" value={engineCampaignId || ''} onChange={event => setCampaignId(event.target.value)}><option value="">Select campaign</option>{campaignOptions.map(campaign => <option key={campaign.id} value={campaign.id}>#{campaign.id} - {campaign.name || 'Untitled Campaign'} ({cleanDisplayText(campaign.status || 'DRAFT')} / {cleanDisplayText(campaign.mode || 'PROGRESSIVE')})</option>)}</select><span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{selectedCampaign ? `Selected ID: ${selectedCampaign.id}` : 'Select a campaign to load engine details.'}</span></Field>
            <div className="ptdt-toolbar" style={{ justifyContent: 'flex-start' }}>
              <button className="btn-brand" type="button" onClick={() => void engineAction('start')} disabled={!engineCampaignId || engineBusy || predictivePaused}><Play size={14} /> Start Engine</button>
              <button className="ptdt-action-btn danger" type="button" onClick={() => void engineAction('stop')} disabled={!engineCampaignId || engineBusy}><Square size={14} /> Stop Engine</button>
              <button className="ptdt-action-btn" type="button" onClick={() => void engineAction('tick')} disabled={!engineCampaignId || engineBusy || predictivePaused}><RefreshCw size={14} /> Run Cycle</button>
              <button className={predictivePaused ? 'ptdt-action-btn danger' : 'ptdt-action-btn'} type="button" onClick={togglePredictivePause}><PauseCircle size={14} /> {predictivePaused ? 'Resume Dialing' : 'Pause Dialing'}</button>
            </div>
          </div>
          {predictivePaused && <div style={{ marginTop: 14, padding: 12, borderRadius: 16, border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.10)', color: 'var(--danger)', fontSize: 12.5, fontWeight: 850 }}>Predictive dialing is paused for this operator session. Start and cycle actions remain locked until dialing is resumed.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}><MiniStat label="Running" value={engineStatus?.running ? 'YES' : 'NO'} /><MiniStat label="Mode" value={engineStatus?.mode || '—'} /><MiniStat label="Ready Agents" value={engineStatus?.readyAgents ?? 0} /><MiniStat label="Active Calls" value={engineStatus?.activeCalls ?? 0} /><MiniStat label="Dial Slots" value={engineStatus?.availableDialSlots ?? 0} /><MiniStat label="Answer Rate" value={fmtPercent(engineStatus?.answerRate)} /></div>
          <div style={{ marginTop: 14 }}>{engineStatus?.guardrails?.safe ? <div className="badge badge-answered"><CheckCircle2 size={13} /> Engine safe</div> : <div className="badge badge-pending"><AlertTriangle size={13} /> {(engineStatus?.guardrails?.reasons || ['Awaiting status']).join(' · ')}</div>}</div>
        </section>

        <section className="ptdt-card" style={{ padding: 18, marginBottom: 18 }}>
          <SectionTitle icon={<Gauge size={16} />} title="Predictive Campaign Controls" subtitle="Clear switches and operating limits for campaign pacing and safety." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Field label="Dialing Mode"><select className="ptdt-input" value={settings.mode} onChange={event => updateSetting('mode', event.target.value)}><option value="PROGRESSIVE">Progressive</option><option value="PREDICTIVE">Predictive</option><option value="PREVIEW">Preview</option><option value="MANUAL">Manual</option></select></Field>
            <Field label="Auto Dial Level"><select className="ptdt-input" value={settings.autoDialLevel} onChange={event => updateSetting('autoDialLevel', Number(event.target.value))}>{DIAL_LEVELS.map(level => <option key={level} value={level}>{level.toFixed(1)}</option>)}</select></Field>
            <NumberField label="Minimum Hopper" value={settings.minimumHopper} onChange={value => updateSetting('minimumHopper', value)} min={1} />
            <NumberField label="Maximum Hopper" value={settings.maximumHopper} onChange={value => updateSetting('maximumHopper', value)} min={1} />
            <NumberField label="Retry Delay" value={settings.retryDelay} onChange={value => updateSetting('retryDelay', value)} min={30} />
            <NumberField label="Retry Attempts" value={settings.maxRetries} onChange={value => updateSetting('maxRetries', value)} min={0} />
            <NumberField label="Wrap-up Time" value={settings.wrapUpTime} onChange={value => updateSetting('wrapUpTime', value)} min={0} />
            <NumberField label="Max Abandon Rate" value={settings.maximumAbandonRate} onChange={value => updateSetting('maximumAbandonRate', value)} min={0} max={0.2} step={0.01} />
            <NumberField label="Max Simultaneous Calls" value={settings.maximumSimultaneousCalls} onChange={value => updateSetting('maximumSimultaneousCalls', value)} min={1} />
            <NumberField label="Max Calls Per Agent" value={settings.maximumCallsPerAgent} onChange={value => updateSetting('maximumCallsPerAgent', value)} min={0.5} max={5} step={0.1} />
            <NumberField label="Ring Timeout" value={settings.ringTimeout} onChange={value => updateSetting('ringTimeout', value)} min={5} />
            <NumberField label="Call Timeout" value={settings.callTimeout} onChange={value => updateSetting('callTimeout', value)} min={5} />
            <Field label="Start Time"><input className="ptdt-input" type="time" value={settings.startTime || ''} onChange={event => updateSetting('startTime', event.target.value)} /></Field>
            <Field label="Stop Time"><input className="ptdt-input" type="time" value={settings.endTime || ''} onChange={event => updateSetting('endTime', event.target.value)} /></Field>
            <Field label="Timezone"><input className="ptdt-input" value={settings.timezone} onChange={event => updateSetting('timezone', event.target.value)} /></Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
            <SwitchControl label="Predictive Dialing" description="Enable or disable predictive pacing." active={settings.predictiveEnabled} activeLabel="Enabled" inactiveLabel="Disabled" onToggle={() => updateSetting('predictiveEnabled', !settings.predictiveEnabled)} />
            <SwitchControl label="Adaptive Dial Level" description="Automatically adjust pacing from live results." active={settings.adaptiveDialEnabled} activeLabel="On" inactiveLabel="Off" onToggle={() => updateSetting('adaptiveDialEnabled', !settings.adaptiveDialEnabled)} />
            <SwitchControl label="Local Call Time" description="Respect the contact's local calling window." active={settings.localCallTime} activeLabel="On" inactiveLabel="Off" onToggle={() => updateSetting('localCallTime', !settings.localCallTime)} />
            <SwitchControl label="Emergency Stop" description="Immediately stop predictive campaign activity." active={settings.emergencyStopped} activeLabel="Stopped" inactiveLabel="Running" danger onToggle={() => updateSetting('emergencyStopped', !settings.emergencyStopped)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button className="btn-brand" type="button" onClick={() => void saveSettings()} disabled={!engineCampaignId || settingsBusy || settingsQuery.isFetching}><CheckCircle2 size={14} /> {settingsBusy ? 'Saving...' : 'Save Dialing Settings'}</button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}><MiniStat label="Hopper Ready" value={engineStatus?.hopper?.eligibleInHopper ?? 0} /><MiniStat label="Effective Level" value={engineStatus?.pacing?.effectiveDialLevel ?? settings.autoDialLevel} /><MiniStat label="Abandon Rate" value={fmtPercent(engineStatus?.abandonRate)} /><MiniStat label="Wrap-up" value={`${engineStatus?.averages?.wrapUpSeconds ?? settings.wrapUpTime}s`} /></div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, .72fr)', gap: 16, alignItems: 'start' }}>
          <section className="ptdt-card" style={{ padding: 18 }}><SectionTitle icon={<BarChart3 size={16} />} title="Pacing Preview" subtitle={`Metrics generated ${fmtDate(metrics?.generatedAt)}`} />{pacing ? <div style={{ display: 'grid', gap: 10 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}><MiniStat label="Recommended Dials" value={pacing.recommendedDialCount ?? 0} /><MiniStat label="Available Slots" value={pacing.availableDialSlots ?? 0} /><MiniStat label="Effective Level" value={pacing.effectiveDialLevel ?? settings.autoDialLevel} /><MiniStat label="Safety Multiplier" value={pacing.safetyMultiplier ?? '—'} /></div>{pacing.adjustmentReasons?.length ? <ul style={{ color: 'var(--text-2)', lineHeight: 1.65 }}>{pacing.adjustmentReasons.map(reason => <li key={reason}>{reason}</li>)}</ul> : null}</div> : <EmptyState text="Run preview to calculate recommended pacing." />}</section>
          <section className="ptdt-card" style={{ padding: 18 }}><SectionTitle icon={<ShieldAlert size={16} />} title="Safety Guardrails" subtitle="Abandon-rate and campaign safety evaluation." />{guardrails ? <div style={{ display: 'grid', gap: 10 }}><MiniStat label="Safe" value={guardrails.safe ? 'YES' : 'NO'} /><MiniStat label="Should Pause" value={guardrails.shouldPause ? 'YES' : 'NO'} /><MiniStat label="Current Rate" value={fmtPercent(guardrails.abandonmentRate)} />{guardrails.violations?.length ? <ul style={{ color: 'var(--danger)', lineHeight: 1.6 }}>{guardrails.violations.map(item => <li key={item}>{item}</li>)}</ul> : <div className="badge badge-answered"><CheckCircle2 size={13} /> No violations</div>}</div> : <EmptyState text="Run preview to evaluate guardrails." />}</section>
        </div>

        <section className="ptdt-card" style={{ padding: 18, marginTop: 16 }}><SectionTitle icon={<Activity size={16} />} title="Recent Dialing Sample" subtitle="Latest records used for pacing visibility." /><RecentCallsTable calls={metrics?.recentCalls || []} /></section>
      </>}
    </div>
  )
}

function MetricCard({ label, value, sub, icon, color }: { label: string; value: ReactNode; sub: string; icon: ReactNode; color: string }) {
  return <div className="ptdt-card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}><div style={{ width: 44, height: 44, borderRadius: 16, display: 'grid', placeItems: 'center', color, border: `1px solid ${color}33`, background: `${color}12` }}>{icon}</div><div><div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div><div className="display" style={{ fontSize: 28, marginTop: 2 }}>{value}</div><div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div></div></div>
}
function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) { return <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}><div style={{ width: 30, height: 30, borderRadius: 12, display: 'grid', placeItems: 'center', color: 'var(--pink)', background: 'rgba(251,11,140,0.10)', border: '1px solid rgba(251,11,140,0.22)' }}>{icon}</div><div><h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2><p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>{subtitle}</p></div></div> }
function MiniStat({ label, value }: { label: string; value: ReactNode }) { return <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 12, background: 'var(--surface)' }}><div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div><div className="display" style={{ fontSize: 22, marginTop: 4 }}>{value}</div></div> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label style={{ display: 'grid', gap: 6 }}><span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>{children}</label> }
function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) { return <Field label={label}><input className="ptdt-input" type="number" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} /></Field> }
function SwitchControl({ label, description, active, activeLabel, inactiveLabel, danger = false, onToggle }: { label: string; description: string; active: boolean; activeLabel: string; inactiveLabel: string; danger?: boolean; onToggle: () => void }) {
  const color = danger && active ? 'var(--danger)' : active ? 'var(--green-2)' : 'var(--text-3)'
  return <button type="button" role="switch" aria-checked={active} aria-label={`${label}: ${active ? activeLabel : inactiveLabel}`} onClick={onToggle} style={{ width: '100%', minHeight: 82, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 16px', borderRadius: 18, border: `1px solid ${active ? `color-mix(in srgb, ${color} 44%, transparent)` : 'var(--border)'}`, background: active ? `color-mix(in srgb, ${color} 9%, var(--bg-glass-hi))` : 'var(--bg-glass-hi)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}><span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 14 }}>{label}</strong><span style={{ display: 'block', marginTop: 4, color: 'var(--text-3)', fontSize: 11.5, lineHeight: 1.35 }}>{description}</span></span><span style={{ display: 'grid', gap: 5, justifyItems: 'end', flexShrink: 0 }}><span style={{ width: 48, height: 27, borderRadius: 999, padding: 3, background: active ? color : 'var(--border)', display: 'flex', justifyContent: active ? 'flex-end' : 'flex-start', transition: 'all .2s ease', boxSizing: 'border-box' }}><span style={{ width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 7px rgba(15,23,42,.28)' }} /></span><span className="mono" style={{ fontSize: 9.5, color, fontWeight: 950, letterSpacing: .7, textTransform: 'uppercase' }}>{active ? activeLabel : inactiveLabel}</span></span></button>
}
function RecentCallsTable({ calls }: { calls: RecentDialingCall[] }) { if (!calls.length) return <EmptyState text="No recent calls available." />; return <div style={{ overflowX: 'auto' }}><table className="ptdt-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr>{['Call', 'Campaign', 'Agent', 'Status', 'Disposition', 'Started'].map(header => <th key={header} style={{ textAlign: 'left', padding: '10px 8px' }}>{header}</th>)}</tr></thead><tbody>{calls.slice(0, 20).map(call => <tr key={call.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px' }}>#{call.id}</td><td style={{ padding: '8px' }}>{call.campaignId || '—'}</td><td style={{ padding: '8px' }}>{call.agentId || '—'}</td><td style={{ padding: '8px' }}>{cleanDisplayText(call.status, '—')}</td><td style={{ padding: '8px' }}>{cleanDisplayText(call.disposition, '—')}</td><td style={{ padding: '8px' }}>{fmtDate(call.startedAt || undefined)}</td></tr>)}</tbody></table></div> }
function EmptyState({ text }: { text: string }) { return <div style={{ border: '1px dashed var(--border)', borderRadius: 14, padding: 16, color: 'var(--text-3)', fontSize: 13 }}>{text}</div> }
