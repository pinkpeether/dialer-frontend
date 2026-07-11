import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BellRing, CalendarClock, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import AlertCenterPanel from '../components/AlertCenterPanel'
import AlertPreferencesPanel from '../components/AlertPreferencesPanel'
import AlertSoundManager from '../components/AlertSoundManager'
import NotificationRuleTester from '../components/NotificationRuleTester'
import { type AlertPreferences, type AlertSummary, type NotificationAlert, notificationsAlertsProApi } from '../api/notificationsAlertsPro.api'

const emptyPreferences: AlertPreferences = {
  desktopToasts: true,
  soundAlerts: true,
  angryCustomerAlerts: true,
  shiftReminders: true,
  breakReminders: true,
  campaignCompleteAlerts: true,
  lowContactWarnings: true,
  lowContactThreshold: 25,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  sounds: {
    info: 'soft-ping',
    success: 'success-chime',
    warning: 'attention',
    critical: 'urgent',
  },
}

type NotificationsCache = {
  savedAt: string
  summary: AlertSummary | null
  alerts: NotificationAlert[]
  preferences: AlertPreferences
}

const CACHE_KEY = 'ptdt-notifications-alerts-pro:last-good'

const readCache = (): NotificationsCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) as NotificationsCache : null
  } catch {
    return null
  }
}

const writeCache = (cache: Omit<NotificationsCache, 'savedAt'>) => {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, savedAt: new Date().toISOString() })) } catch { /* best-effort cache */ }
}

export default function NotificationsAlertsPro() {
  const [cached] = useState(() => readCache())
  const [summary, setSummary] = useState<AlertSummary | null>(cached?.summary ?? null)
  const [alerts, setAlerts] = useState<NotificationAlert[]>(cached?.alerts ?? [])
  const [preferences, setPreferences] = useState<AlertPreferences>(cached?.preferences ?? emptyPreferences)
  const [loading, setLoading] = useState(!cached?.summary)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const lastToastIdRef = useRef<string | null>(null)

  const criticalCount = useMemo(() => alerts.filter(alert => alert.severity === 'CRITICAL').length, [alerts])
  const warningCount = useMemo(() => alerts.filter(alert => alert.severity === 'WARNING').length, [alerts])

  async function load(options: { silent?: boolean } = {}) {
    const requestOptions = { silent: Boolean(options.silent || summary) }
    if (!requestOptions.silent) setLoading(true)
    setError(null)
    try {
      const [nextSummary, nextAlerts] = await Promise.all([
        notificationsAlertsProApi.getSummary(requestOptions),
        notificationsAlertsProApi.listAlerts({ limit: 100 }, requestOptions),
      ])
      setSummary(nextSummary)
      setAlerts(nextAlerts)
      const nextPreferences = nextSummary.preferences || emptyPreferences
      setPreferences(nextPreferences)
      writeCache({ summary: nextSummary, alerts: nextAlerts, preferences: nextPreferences })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications & alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load({ silent: Boolean(cached?.summary) })
    const interval = window.setInterval(() => { void load({ silent: true }) }, 30000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!preferences.desktopToasts || typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined)
    }
  }, [preferences.desktopToasts])

  useEffect(() => {
    const latest = alerts[0]
    if (!latest) return
    if (lastToastIdRef.current === latest.id) return
    lastToastIdRef.current = latest.id

    const playSound = (window as Window & { ptdtPlayAlertSound?: (soundKey?: string, severity?: NotificationAlert['severity']) => void }).ptdtPlayAlertSound
    if (preferences.soundAlerts && typeof playSound === 'function') {
      playSound(latest.soundKey || undefined, latest.severity)
    }
    if (preferences.desktopToasts && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(latest.title, { body: latest.message })
    }
  }, [alerts, preferences.desktopToasts, preferences.soundAlerts])

  async function savePreferences() {
    setSaving(true)
    setError(null)
    try {
      const next = await notificationsAlertsProApi.updatePreferences(preferences)
      setPreferences(next)
      setSuccess('Preferences saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alert preferences')
    } finally {
      setSaving(false)
    }
  }

  async function refreshAfter(action: () => Promise<unknown>, message: string) {
    setError(null)
    setSuccess(null)
    try {
      await action()
      setSuccess(message)
      await load({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Alert operation failed')
    }
  }

  const kpis = [
    { label: 'Total Alerts', value: summary?.total ?? alerts.length, icon: <BellRing size={18} />, accent: '#fb0b8c' },
    { label: 'Unread', value: summary?.unread ?? 0, icon: <Sparkles size={18} />, accent: '#00a747' },
    { label: 'Critical', value: criticalCount, icon: <ShieldAlert size={18} />, accent: '#ef4444' },
    { label: 'Warnings', value: warningCount, icon: <AlertTriangle size={18} />, accent: '#f0b90b' },
  ]

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Sparkles size={12} /> Notifications & Alerts
          </div>
          <h1 className="ptdt-page-title">
            Notifications <span className="gradient-brand-text">Alerts Pro</span>
          </h1>
          <p className="ptdt-page-desc">
            Desktop toasts, generated sound alerts, angry-customer escalations, shift reminders, campaign completion signals, and low-contact warning automation.
          </p>
        </div>
        <div className="ptdt-toolbar">
          <span className="ptdt-chip"><CalendarClock size={12} /> Background refresh</span>
          <button className="ptdt-action-btn" type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: error ? 'var(--danger)' : 'var(--green-2)', borderColor: error ? 'rgba(239,68,68,0.28)' : 'rgba(0,167,71,0.28)' }}>
          {error || success}
        </div>
      )}

      <div className="ptdt-pro-kpis" style={{ marginBottom: 18 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="ptdt-pro-kpi">
            <div style={{ position: 'absolute', inset: 'auto -34px -48px auto', width: 120, height: 120, borderRadius: '50%', background: `${kpi.accent}18`, filter: 'blur(18px)' }} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative' }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', border: `1px solid ${kpi.accent}44`, background: `${kpi.accent}12`, color: kpi.accent }}>
                {kpi.icon}
              </div>
              <div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>{kpi.label}</div>
                <div style={{ marginTop: 4, fontSize: 28, color: 'var(--text)', fontWeight: 950 }}>{kpi.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ptdt-pro-grid sidebar" style={{ alignItems: 'start' }}>
        <AlertCenterPanel
          alerts={alerts}
          loading={loading}
          onAcknowledge={(alertId) => void refreshAfter(() => notificationsAlertsProApi.acknowledgeAlert(alertId), 'Alert acknowledged')}
          onAcknowledgeAll={() => void refreshAfter(() => notificationsAlertsProApi.acknowledgeAll(), 'All alerts acknowledged')}
        />
        <div style={{ display: 'grid', gap: 16 }}>
          <AlertSoundManager enabled={preferences.soundAlerts} />
          <NotificationRuleTester
            onRunSweep={() => refreshAfter(() => notificationsAlertsProApi.runSweep(), 'Alert sweep completed')}
            onAngryCustomer={(payload) => refreshAfter(() => notificationsAlertsProApi.createAngryCustomerAlert(payload), 'Angry customer alert created')}
            onShiftReminder={(payload) => refreshAfter(() => notificationsAlertsProApi.createShiftReminder(payload), 'Shift/break reminder created')}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <AlertPreferencesPanel
          preferences={preferences}
          saving={saving}
          onChange={(patch) => setPreferences(current => ({ ...current, ...patch, sounds: { ...current.sounds, ...(patch.sounds || {}) } }))}
          onSave={() => void savePreferences()}
        />
      </div>
    </div>
  )
}
