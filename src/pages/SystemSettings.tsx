import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock3, Radio, RefreshCw, RotateCcw, Save, Settings2, SlidersHorizontal, TimerReset } from 'lucide-react'
import { settingsAPI } from '../api/settings.api'

const DEFAULT_TIMEZONE_OPTIONS = [
  'Asia/Karachi',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
]

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


function RecordingToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: '100%',
        minHeight: 52,
        padding: 4,
        borderRadius: 999,
        border: checked ? '1px solid rgba(0,167,71,0.34)' : '1px solid var(--border-strong)',
        background: checked
          ? 'linear-gradient(135deg, rgba(0,167,71,0.16), rgba(42,233,123,0.10))'
          : 'linear-gradient(135deg, var(--bg-glass-hi), var(--bg-2))',
        boxShadow: checked
          ? 'inset 0 1px 0 rgba(255,255,255,0.52), inset 0 -10px 22px rgba(0,167,71,0.06), 0 10px 24px rgba(0,167,71,0.14)'
          : 'inset 0 1px 0 rgba(255,255,255,0.52), inset 0 -10px 22px rgba(16,16,24,0.04), 0 8px 18px rgba(16,16,24,0.06)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: checked ? 'calc(50% + 2px)' : 4,
          width: 'calc(50% - 6px)',
          borderRadius: 999,
          background: checked
            ? 'linear-gradient(135deg, var(--green-2), var(--green-light))'
            : 'linear-gradient(135deg, rgba(112,106,125,0.82), rgba(112,106,125,0.58))',
          boxShadow: checked
            ? 'inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -2px 8px rgba(0,0,0,0.16), 0 8px 20px rgba(0,167,71,0.28)'
            : 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -2px 8px rgba(0,0,0,0.14), 0 8px 18px rgba(16,16,24,0.16)',
          transition: 'left 0.26s var(--ease), background 0.26s var(--ease), box-shadow 0.26s var(--ease)',
        }}
      />
      {(['Off', 'On'] as const).map(label => {
        const active = checked ? label === 'On' : label === 'Off'
        return (
          <span
            key={label}
            className="mono"
            style={{
              zIndex: 1,
              display: 'grid',
              placeItems: 'center',
              minHeight: 44,
              fontSize: 11.5,
              fontWeight: 900,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              color: active ? '#fff' : 'var(--text-3)',
              textShadow: active ? '0 1px 0 rgba(0,0,0,0.18)' : 'none',
              transition: 'color 0.22s var(--ease), text-shadow 0.22s var(--ease)',
            }}
          >
            {label}
          </span>
        )
      })}
    </button>
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
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM)
  const [message, setMessage] = useState('')
  const [manualError, setManualError] = useState('')

  const settingsQuery = useQuery({
    queryKey: ['system-settings'],
    queryFn: settingsAPI.getAll,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  useEffect(() => {
    if (settingsQuery.data) setForm({ ...DEFAULT_FORM, ...(settingsQuery.data || {}) })
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: (payload: SettingsForm) => settingsAPI.update(payload),
    onSuccess: async (data) => {
      setForm({ ...DEFAULT_FORM, ...(data || {}) })
      setMessage('System settings saved.')
      await queryClient.invalidateQueries({ queryKey: ['system-settings'] })
    },
  })

  const loading = settingsQuery.isLoading
  const saving = saveMutation.isPending
  const error = manualError || (settingsQuery.error
    ? settingsQuery.error instanceof Error
      ? settingsQuery.error.message
      : 'Failed to load settings'
    : '')

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
    setManualError('')
    setMessage('')
    await settingsQuery.refetch()
  }

  const save = async () => {
    if (validationError) {
      setManualError(validationError)
      return
    }

    setManualError('')
    setMessage('')
    try {
      await saveMutation.mutateAsync({ ...form })
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  const setField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setMessage('')
    setManualError('')
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const recordingEnabled = form.recordingEnabled

  return (
    <div className="ptdt-mobile-page ptdt-mobile-page-system-settings" style={{ padding: '32px 36px', maxWidth: 1180, margin: '0 auto' }}>
      <style>{PTDT_MOBILE_PAGE_CSS}</style>
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
            <div className="ptdt-system-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 18px', alignItems: 'start' }}>
              <div>
                <SettingField
                  label="Default Timezone"
                  description="Used for campaign windows, callback timing, and scheduler defaults."
                  icon={<Clock3 size={17} />}
                >
                  <select
                    value={String(form.defaultTimezone || '')}
                    onChange={e => setField('defaultTimezone', e.target.value)}
                    style={inputStyle}
                  >
                    {DEFAULT_TIMEZONE_OPTIONS.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </SettingField>

                <SettingField
                  label="Default Dialing Ratio"
                  description="Controls calls per ready agent for progressive/predictive campaigns."
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
                  description="Wait time before retrying retryable outcomes."
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
                  description="Default retry cap for calling workflows."
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
              </div>

              <div>
                <SettingField
                  label="Call Timeout"
                  description="Ringing window before a call attempt expires."
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
                  description="Lead time before scheduled callback alerts."
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
                  description="Alert threshold for low callable contacts."
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
                  description="Default recording controls and access."
                  icon={<Radio size={17} />}
                >
                  <RecordingToggle
                    checked={recordingEnabled}
                    onChange={next => setField('recordingEnabled', next)}
                  />
                </SettingField>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 10,
                paddingTop: 22,
                marginTop: 4,
                borderTop: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => setForm(DEFAULT_FORM)}
                style={{ height: 42, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', color: 'var(--text-3)', padding: '0 18px', fontSize: 12, fontWeight: 900, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
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
