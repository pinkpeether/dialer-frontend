import { useEffect, useState, type CSSProperties } from 'react'
import { Calendar, CheckCircle2, MessageSquareText } from 'lucide-react'

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
  callbackAt?: string   // ISO 8601 — only when disposition === 'CALLBACK'
}

interface DispositionPanelProps {
  disabled?: boolean
  defaultDisposition?: DispositionValue | null
  defaultNotes?: string | null
  defaultCallbackAt?: string | null
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
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: 'var(--font-body)',
}

// Minimum datetime = now (rounded up to next minute)
const minDatetime = () => {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  return d.toISOString().slice(0, 16)
}

// Default callback = +1 hour
const defaultCallbackAt = () => {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setHours(d.getHours() + 1)
  return d.toISOString().slice(0, 16)
}

const toDatetimeLocal = (value?: string | null) => {
  if (!value) return defaultCallbackAt()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return defaultCallbackAt()
  return date.toISOString().slice(0, 16)
}

export default function DispositionPanel({
  disabled = false,
  defaultDisposition,
  defaultNotes,
  defaultCallbackAt: initialCallbackAt,
  onSubmit,
}: DispositionPanelProps) {
  const [disposition, setDisposition] = useState<DispositionValue | ''>(defaultDisposition ?? '')
  const [notes, setNotes] = useState(defaultNotes ?? '')
  const [callbackAt, setCallbackAt] = useState(() => toDatetimeLocal(initialCallbackAt))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setDisposition(defaultDisposition ?? '')
    setNotes(defaultNotes ?? '')
    setCallbackAt(toDatetimeLocal(initialCallbackAt))
  }, [defaultDisposition, defaultNotes, initialCallbackAt])

  const handleSubmit = async () => {
    if (!disposition || submitting || disabled) return
    if (disposition === 'CALLBACK' && !callbackAt) return

    const callbackDate = disposition === 'CALLBACK' ? new Date(callbackAt) : null
    if (callbackDate && Number.isNaN(callbackDate.getTime())) return

    setSubmitting(true)
    try {
      await onSubmit({
        disposition,
        notes: notes.trim() || undefined,
        callbackAt: callbackDate ? callbackDate.toISOString() : undefined,
      })
      setDisposition('')
      setNotes('')
      setCallbackAt(defaultCallbackAt())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="glass" style={{ padding: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 12,
          background: 'rgba(251,11,140,0.10)',
          border: '1px solid rgba(251,11,140,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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

      {/* Disposition buttons */}
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

      {/* Callback datetime — only when CALLBACK selected */}
      {disposition === 'CALLBACK' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Calendar size={14} color="var(--warning)" />
            <span className="mono" style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 800, letterSpacing: 1.1 }}>
              SCHEDULE CALLBACK
            </span>
          </div>
          <input
            type="datetime-local"
            value={callbackAt}
            min={minDatetime()}
            onChange={e => setCallbackAt(e.target.value)}
            disabled={disabled || submitting}
            required
            style={{
              ...inputStyle,
              border: '1px solid rgba(240,185,11,0.40)',
              background: 'rgba(240,185,11,0.07)',
              colorScheme: 'dark',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
            Callback will be scheduled and the contact status updated to CALLBACK.
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <MessageSquareText size={15} color="var(--text-3)" style={{ position: 'absolute', top: 13, left: 13 }} />
        <textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder="Disposition notes…"
          style={{ ...inputStyle, minHeight: 96, resize: 'vertical', paddingLeft: 40 }}
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
