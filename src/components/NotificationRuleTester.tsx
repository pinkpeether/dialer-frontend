import { useState } from 'react'
import { AlertTriangle, BellRing, Clock3 } from 'lucide-react'

type Props = {
  onRunSweep: () => Promise<void>
  onAngryCustomer: (payload: { callId?: number; agentId?: number; sentimentScore?: number; reason?: string }) => Promise<void>
  onShiftReminder: (payload: { agentId: number; agentName?: string; reminderType?: 'SHIFT_START' | 'SHIFT_END' | 'BREAK_DUE' | 'BREAK_OVER' }) => Promise<void>
}

export default function NotificationRuleTester({ onRunSweep, onAngryCustomer, onShiftReminder }: Props) {
  const [agentId, setAgentId] = useState('')
  const [callId, setCallId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function run(name: string, action: () => Promise<void>) {
    setBusy(name)
    try {
      await action()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="ptdt-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Automation <span className="gradient-brand-text">Tester</span></h3>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Trigger pilot-safe alert rules for campaigns, sentiment, and shift reminders.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <Field label="Agent ID">
          <input value={agentId} onChange={event => setAgentId(event.target.value)} placeholder="Example: 12" style={inputStyle} />
        </Field>
        <Field label="Call ID">
          <input value={callId} onChange={event => setCallId(event.target.value)} placeholder="Example: 79" style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <button className="ptdt-action-btn" type="button" onClick={() => void run('sweep', onRunSweep)}>
          <BellRing size={14} /> {busy === 'sweep' ? 'Running...' : 'Run Alert Sweep'}
        </button>
        <button
          className="ptdt-action-btn danger"
          type="button"
          onClick={() => void run('angry', () => onAngryCustomer({
            callId: Number(callId || 0) || undefined,
            agentId: Number(agentId || 0) || undefined,
            sentimentScore: -90,
            reason: 'Manual test: angry customer sentiment alert.',
          }))}
        >
          <AlertTriangle size={14} /> {busy === 'angry' ? 'Creating...' : 'Test Angry Alert'}
        </button>
        <button
          className="btn-brand"
          type="button"
          onClick={() => void run('shift', () => onShiftReminder({
            agentId: Number(agentId || 0) || 1,
            reminderType: 'BREAK_DUE',
          }))}
          style={{ minHeight: 40 }}
        >
          <Clock3 size={14} /> {busy === 'shift' ? 'Creating...' : 'Test Break Reminder'}
        </button>
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
