import { useState, type CSSProperties } from 'react'
import { CheckCircle2, MessageSquareText } from 'lucide-react'

export type DispositionValue =
  | 'ANSWERED'
  | 'NO_ANSWER'
  | 'VOICEMAIL'
  | 'CALLBACK'
  | 'WRONG_NUMBER'
  | 'DO_NOT_CALL'

export interface DispositionSubmitPayload {
  disposition: DispositionValue
  notes?: string
}

interface DispositionPanelProps {
  disabled?: boolean
  onSubmit: (payload: DispositionSubmitPayload) => void | Promise<void>
}

const DISPOSITIONS: { value: DispositionValue; label: string; hint: string }[] = [
  { value: 'ANSWERED',     label: 'Answered',     hint: 'Connected' },
  { value: 'NO_ANSWER',    label: 'No Answer',    hint: 'No pickup' },
  { value: 'VOICEMAIL',    label: 'Voicemail',    hint: 'Machine' },
  { value: 'CALLBACK',     label: 'Callback',     hint: 'Follow-up' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', hint: 'Bad lead' },
  { value: 'DO_NOT_CALL',  label: 'Do Not Call',  hint: 'DNC' },
]

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 96,
  resize: 'vertical',
  padding: '12px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: 'var(--font-body)',
}

export default function DispositionPanel({ disabled = false, onSubmit }: DispositionPanelProps) {
  const [disposition, setDisposition] = useState<DispositionValue | ''>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!disposition || submitting || disabled) return
    setSubmitting(true)
    try {
      await onSubmit({ disposition, notes: notes.trim() || undefined })
      setDisposition('')
      setNotes('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: 'rgba(251,11,140,0.10)',
          border: '1px solid rgba(251,11,140,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--pink)',
        }}>
          <CheckCircle2 size={16} />
        </div>
        <div>
          <div className="display" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 800 }}>
            Call Disposition
          </div>
          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, marginTop: 2 }}>
            SELECT OUTCOME + NOTES
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
        gap: 10,
        marginBottom: 14,
      }}>
        {DISPOSITIONS.map(item => {
          const active = disposition === item.value
          return (
            <button
              key={item.value}
              type="button"
              disabled={disabled || submitting}
              onClick={() => setDisposition(item.value)}
              style={{
                textAlign: 'left',
                cursor: disabled || submitting ? 'not-allowed' : 'pointer',
                padding: '11px 12px',
                borderRadius: 'var(--radius-md)',
                border: active ? '1px solid var(--pink)' : '1px solid var(--border)',
                background: active
                  ? 'linear-gradient(135deg, rgba(251,11,140,0.16), rgba(128,87,215,0.10))'
                  : 'var(--bg-glass)',
                color: active ? 'var(--pink)' : 'var(--text)',
                boxShadow: active ? 'var(--shadow-pink)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{item.label}</div>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 3 }}>
                {item.hint}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <MessageSquareText size={15} color="var(--text-3)" style={{ position: 'absolute', top: 13, left: 13 }} />
        <textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder="Disposition notes…"
          style={{ ...inputStyle, paddingLeft: 40 }}
          disabled={disabled || submitting}
        />
      </div>

      <button
        type="button"
        className="btn-brand"
        disabled={!disposition || disabled || submitting}
        onClick={handleSubmit}
        style={{
          width: '100%',
          minHeight: 42,
          borderRadius: 'var(--radius-md)',
          opacity: !disposition || disabled || submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Saving…' : 'Submit Disposition'}
      </button>
    </div>
  )
}
