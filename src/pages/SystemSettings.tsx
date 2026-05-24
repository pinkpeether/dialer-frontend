import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Clock3, Radio, RefreshCw, RotateCcw, Save, Settings2, SlidersHorizontal, TimerReset } from 'lucide-react'
import { settingsAPI } from '../api/settings.api'

const DEFAULT_FORM = {
  defaultTimezone: 'Asia/Karachi',
  defaultDialingRatio: 1,
  defaultRetryDelayMinutes: 60,
  defaultMaxRetries: 3,
  callTimeoutSeconds: 45,
  recordingEnabled: false,
  callbackReminderMinutes: 15,
  lowContactThreshold: 25,
}

type SettingsForm = typeof DEFAULT_FORM

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

function SettingField({
  label,
  description,
  icon,
  children,
}: {
  label: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 0.85fr) minmax(220px, 1fr)',
        gap: 18,
        alignItems: 'center',
        padding: '16px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 13,
            background: 'rgba(251,11,140,0.08)',
            border: '1px solid rgba(251,11,140,0.20)',
            color: 'var(--pink)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text)', lineHeight: 1.2 }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.45 }}>
            {description}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

function StateBanner({ type, children }: { type: 'error' | 'success' | 'warning'; children: ReactNode }) {
  const isError = type === 'error'
  const isWarning = type === 'warning'
  return (
    <div
      style={{
        padding: '12px 16px',
        marginBottom: 16,
        borderRadius: 'var(--radius-md)',
        border: isError
          ? '1px solid rgba(239,68,68,0.28)'
          : isWarning
            ? '1px solid rgba(240,185,11,0.28)'
            : '1px solid rgba(0,167,71,0.28)',
        background: isError
          ? 'rgba(239,68,68,0.08)'
          : isWarning
            ? 'rgba(240,185,11,0.08)'
            : 'rgba(0,167,71,0.08)',
        color: isError ? 'var(--danger)' : isWarning ? 'var(--gold)' : 'var(--green-2)',
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {children}
    </div>
  )
}

export default function SystemSettings() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const validationError = useMemo(() => {
    if (!form.defaultTimezone.trim()) return 'Default timezone is required.'
    if (form.defaultDialingRatio < 1 || form.defaultDialingRatio > 10) return 'Dialing ratio must be between 1 and 10.'
    if (form.defaultRetryDelayMinutes < 1 || form.defaultRetryDelayMinutes > 1440) return 'Retry delay must be between 1 and 1440 minutes.'
    if (form.defaultMaxRetries < 0 || form.defaultMaxRetries > 20) return 'Max retries must be between 0 and 20.'
    if (form.callTimeoutSeconds < 5 || form.callTimeoutSeconds > 300) return 'Call timeout must be between 5 and 300 seconds.'
    if (form.callbackReminderMinutes < 0 || form.callbackReminderMinutes > 1440) return 'Callback reminder must be between 0 and 1440 minutes.'
    if (form.lowContactThreshold < 0) return 'Low contact threshold cannot be negative.'
    return ''
  }, [form])

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await settingsAPI.getAll()
      setForm({ ...DEFAULT_FORM, ...(data || {}) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
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
        const data = await settingsAPI.getAll()
        if (!cancelled) setForm({ ...DEFAULT_FORM, ...(data || {}) })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInitial()

    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await settingsAPI.update({ ...form })
      setForm({ ...DEFAULT_FORM, ...(data || {}) })
      setMessage('System settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const setField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setMessage('')
    setError('')
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const recordingEnabled = form.recordingEnabled

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1240, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <SlidersHorizontal size={11} /> PTDT-Dialer Operations
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
              System <span className="gradient-brand-text">Settings</span>
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot" /> Configure Phase 2 dialing, retry, callback, and recording defaults.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            style={{ height: 42, width: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            title="Refresh system settings"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      {error && <StateBanner type="error">{error}</StateBanner>}
      {message && <StateBanner type="success">{message}</StateBanner>}
      {validationError && <StateBanner type="warning">{validationError}</StateBanner>}

      <div className="glass" style={{ padding: '4px 24px 22px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ minHeight: 260, display: 'grid', placeItems: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            Loading system settings...
          </div>
        ) : (
          <>
            <SettingField
              label="Default Timezone"
              description="Used for campaign windows, callback timing, and scheduler defaults."
              icon={<Clock3 size={17} />}
            >
              <input
                value={String(form.defaultTimezone || '')}
                onChange={e => setField('defaultTimezone', e.target.value)}
                placeholder="Asia/Karachi"
                style={inputStyle}
              />
            </SettingField>

            <SettingField
              label="Default Dialing Ratio"
              description="Controls how many calls progressive/predictive campaigns may place per ready agent."
              icon={<SlidersHorizontal size={17} />}
            >
              <input
                type="number"
                min={1}
                value={form.defaultDialingRatio}
                onChange={e => setField('defaultDialingRatio', Number(e.target.value))}
                style={inputStyle}
              />
            </SettingField>

            <SettingField
              label="Retry Delay"
              description="Default wait time before retrying retryable outcomes like no-answer or voicemail."
              icon={<TimerReset size={17} />}
            >
              <input
                type="number"
                min={1}
                value={form.defaultRetryDelayMinutes}
                onChange={e => setField('defaultRetryDelayMinutes', Number(e.target.value))}
                style={inputStyle}
              />
            </SettingField>

            <SettingField
              label="Max Retries"
              description="Default retry cap for new or system-managed calling workflows."
              icon={<RotateCcw size={17} />}
            >
              <input
                type="number"
                min={0}
                value={form.defaultMaxRetries}
                onChange={e => setField('defaultMaxRetries', Number(e.target.value))}
                style={inputStyle}
              />
            </SettingField>

            <SettingField
              label="Call Timeout"
              description="Maximum ringing window before the app treats a call attempt as expired."
              icon={<Settings2 size={17} />}
            >
              <input
                type="number"
                min={5}
                value={form.callTimeoutSeconds}
                onChange={e => setField('callTimeoutSeconds', Number(e.target.value))}
                style={inputStyle}
              />
            </SettingField>

            <SettingField
              label="Callback Reminder"
              description="Lead time before a scheduled callback should surface to the agent."
              icon={<Clock3 size={17} />}
            >
              <input
                type="number"
                min={1}
                value={form.callbackReminderMinutes}
                onChange={e => setField('callbackReminderMinutes', Number(e.target.value))}
                style={inputStyle}
              />
            </SettingField>

            <SettingField
              label="Low Contact Threshold"
              description="Campaign alert threshold for low remaining callable contacts."
              icon={<SlidersHorizontal size={17} />}
            >
              <input
                type="number"
                min={0}
                value={form.lowContactThreshold}
                onChange={e => setField('lowContactThreshold', Number(e.target.value))}
                style={inputStyle}
              />
            </SettingField>

            <SettingField
              label="Recording Enabled"
              description="Global default for surfacing recording controls and saved recording access."
              icon={<Radio size={17} />}
            >
              <button
                type="button"
                onClick={() => setField('recordingEnabled', !recordingEnabled)}
                style={{
                  height: 43,
                  borderRadius: 999,
                  border: recordingEnabled ? '1px solid rgba(0,167,71,0.34)' : '1px solid var(--border)',
                  background: recordingEnabled ? 'rgba(0,167,71,0.10)' : 'var(--bg-glass-hi)',
                  color: recordingEnabled ? 'var(--green-2)' : 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                }}
              >
                {recordingEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </SettingField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 20 }}>
              <button
                type="button"
                onClick={() => setForm(DEFAULT_FORM)}
                style={{ height: 43, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', padding: '0 18px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
              >
                Reset Form
              </button>
              <button
                type="button"
                className="btn-brand"
                disabled={saving || Boolean(validationError)}
                onClick={() => void save()}
                style={{ height: 43, borderRadius: 999, padding: '0 24px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 900, opacity: saving || validationError ? 0.7 : 1 }}
              >
                <Save size={15} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
