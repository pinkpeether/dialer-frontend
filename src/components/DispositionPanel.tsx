import { useMemo, useState } from 'react'
import { CheckCircle2, CalendarClock, MessageSquareText, PhoneMissed, ShieldX, XCircle } from 'lucide-react'

export type DispositionValue =
  | 'ANSWERED'
  | 'NO_ANSWER'
  | 'VOICEMAIL'
  | 'CALLBACK'
  | 'WRONG_NUMBER'
  | 'DO_NOT_CALL'

export interface DispositionPayload {
  callId: number
  disposition: DispositionValue
  notes: string
}

interface DispositionPanelProps {
  callId: number
  disabled?: boolean
  onSubmit: (payload: DispositionPayload) => void | Promise<void>
}

const DISPOSITIONS: Array<{
  value: DispositionValue
  label: string
  icon: typeof CheckCircle2
}> = [
  { value: 'ANSWERED',     label: 'Answered',     icon: CheckCircle2 },
  { value: 'NO_ANSWER',    label: 'No Answer',    icon: PhoneMissed },
  { value: 'VOICEMAIL',    label: 'Voicemail',    icon: MessageSquareText },
  { value: 'CALLBACK',     label: 'Callback',     icon: CalendarClock },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', icon: XCircle },
  { value: 'DO_NOT_CALL',  label: 'Do Not Call',  icon: ShieldX },
]

export default function DispositionPanel({
  callId,
  disabled = false,
  onSubmit,
}: DispositionPanelProps) {
  const [disposition, setDisposition] = useState<DispositionValue | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => Boolean(disposition) && !disabled && !submitting,
    [disabled, disposition, submitting]
  )

  const handleSubmit = async () => {
    if (!disposition || submitting) return

    setSubmitting(true)
    try {
      await onSubmit({
        callId,
        disposition,
        notes: notes.trim(),
      })
      setDisposition(null)
      setNotes('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 18,
      padding: 18,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{
          margin: 0,
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 900,
        }}>
          Call Disposition
        </h3>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 12 }}>
          Select the final outcome before closing this call.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
        gap: 10,
      }}>
        {DISPOSITIONS.map(item => {
          const Icon = item.icon
          const selected = disposition === item.value

          return (
            <button
              key={item.value}
              type="button"
              disabled={disabled || submitting}
              onClick={() => setDisposition(item.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
                minHeight: 42,
                borderRadius: 12,
                cursor: disabled || submitting ? 'not-allowed' : 'pointer',
                border: selected ? '1px solid var(--pink)' : '1px solid var(--border)',
                background: selected
                  ? 'linear-gradient(135deg, rgba(251,11,140,0.16), rgba(42,233,123,0.10))'
                  : 'var(--surface-2)',
                color: selected ? 'var(--pink)' : 'var(--text-2)',
                fontWeight: 800,
                opacity: disabled || submitting ? 0.55 : 1,
                transition: 'all 0.18s ease',
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </div>

      <textarea
        value={notes}
        disabled={disabled || submitting}
        onChange={event => setNotes(event.target.value)}
        placeholder="Disposition notes..."
        rows={4}
        style={{
          width: '100%',
          marginTop: 14,
          resize: 'vertical',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text)',
          padding: 12,
          outline: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
        }}
      />

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => { void handleSubmit() }}
        className="btn-brand"
        style={{
          width: '100%',
          marginTop: 12,
          padding: '12px 14px',
          borderRadius: 12,
          opacity: canSubmit ? 1 : 0.55,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Disposition'}
      </button>
    </section>
  )
}
