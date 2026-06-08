import type { AlertPreferences } from '../api/notificationsAlertsPro.api'

type Props = {
  preferences: AlertPreferences
  onChange: (patch: Partial<AlertPreferences>) => void
  onSave: () => void
  saving?: boolean
}

const toggleFields: Array<{ key: keyof AlertPreferences; label: string; description: string }> = [
  { key: 'desktopToasts', label: 'Desktop toasts', description: 'Show in-app / desktop notifications.' },
  { key: 'soundAlerts', label: 'Sound alerts', description: 'Play generated tones for important alerts.' },
  { key: 'angryCustomerAlerts', label: 'Angry customer alerts', description: 'Escalate Live AI angry sentiment to supervisors.' },
  { key: 'shiftReminders', label: 'Shift reminders', description: 'Create pre-shift and end-shift reminders.' },
  { key: 'breakReminders', label: 'Break reminders', description: 'Notify when breaks are due or over.' },
  { key: 'campaignCompleteAlerts', label: 'Campaign complete alerts', description: 'Alert when campaigns finish.' },
  { key: 'lowContactWarnings', label: 'Low-contact warnings', description: 'Warn when callable contacts are running low.' },
]

export default function AlertPreferencesPanel({ preferences, onChange, onSave, saving }: Props) {
  return (
    <section className="ptdt-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Alert <span className="gradient-brand-text">Preferences</span></h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Control reminder, escalation, and notification behavior per signed-in user.</p>
        </div>
        <button className="btn-brand" type="button" onClick={onSave} disabled={saving} style={{ minHeight: 40 }}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {toggleFields.map(field => (
          <label key={field.key as string} className="glass" style={{ padding: 14, borderRadius: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={Boolean(preferences[field.key])}
              onChange={event => onChange({ [field.key]: event.target.checked } as Partial<AlertPreferences>)}
              style={{ marginTop: 4, width: 16, height: 16, accentColor: '#fb0b8c', flexShrink: 0 }}
            />
            <span>
              <span style={{ display: 'block', color: 'var(--text)', fontSize: 13.5, fontWeight: 850 }}>{field.label}</span>
              <span style={{ display: 'block', color: 'var(--text-3)', fontSize: 11.5, marginTop: 4, lineHeight: 1.5 }}>{field.description}</span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 14 }}>
        <Field label="Low-contact threshold">
          <input type="number" value={preferences.lowContactThreshold} onChange={event => onChange({ lowContactThreshold: Number(event.target.value) })} style={inputStyle} />
        </Field>
        <Field label="Quiet hours start">
          <input type="time" value={preferences.quietHoursStart} onChange={event => onChange({ quietHoursStart: event.target.value })} style={inputStyle} />
        </Field>
        <Field label="Quiet hours end">
          <input type="time" value={preferences.quietHoursEnd} onChange={event => onChange({ quietHoursEnd: event.target.value })} style={inputStyle} />
        </Field>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono" style={{ marginBottom: 8, color: 'var(--text-3)', fontSize: 10.5, fontWeight: 900 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
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
