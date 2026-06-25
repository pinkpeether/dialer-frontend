import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, ListFilter, PhoneCall, ShieldCheck } from 'lucide-react'
import { aiCallsAPI, type StartAiCallResponse } from '../api/aiCalls.api'

const E164_REGEX = /^\+[1-9]\d{7,14}$/

const pageCss = `
.ptdt-ai-dialer-page {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 26px clamp(16px, 3vw, 34px) 40px;
}

.ptdt-ai-dialer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(320px, 0.72fr);
  gap: 18px;
  align-items: start;
}

.ptdt-ai-dialer-form {
  display: grid;
  gap: 14px;
}

.ptdt-ai-dialer-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.ptdt-ai-dialer-result {
  display: grid;
  gap: 10px;
}

@media (max-width: 900px) {
  .ptdt-ai-dialer-page {
    padding: 72px 12px 28px !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .ptdt-ai-dialer-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-ai-dialer-page * {
    box-sizing: border-box;
    min-width: 0;
  }
}
`

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass)',
  color: 'var(--text)',
  padding: '0 14px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 800,
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
  color: 'var(--text-2)',
  fontSize: 12,
  fontWeight: 900,
}

const hintStyle: CSSProperties = {
  color: 'var(--text-3)',
  fontSize: 11.5,
  lineHeight: 1.45,
  marginTop: -3,
}

const statStyle: CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass)',
}

function cleanText(value: string) {
  return value.trim()
}

function validateE164(value: string, label: string, required = true) {
  const trimmed = cleanText(value)

  if (!trimmed && !required) return ''
  if (!trimmed) return `${label} is required.`
  if (!E164_REGEX.test(trimmed)) return `${label} must be in E.164 format, for example +15512943079.`

  return ''
}

function getErrorMessage(error: unknown) {
  const record = error as { response?: { data?: { message?: unknown } }; message?: unknown }
  const serverMessage = typeof record.response?.data?.message === 'string' ? record.response.data.message : ''
  const fallback = typeof record.message === 'string' ? record.message : ''

  const message = serverMessage || fallback || 'Unable to start AI call.'
  const lower = message.toLowerCase()

  if (lower.includes('disabled')) return 'AI call launch is currently disabled.'
  if (
    lower.includes('provider') ||
    lower.includes('rawpayload') ||
    lower.includes('gateway') ||
    lower.includes('trunk') ||
    lower.includes('sip') ||
    lower.includes('pstn') ||
    lower.includes('webhook') ||
    lower.includes('setup') ||
    lower.includes('internal')
  ) return 'Unable to start AI call.'

  return message
}

function getDisplayStatus(status?: string | null) {
  const value = String(status || 'queued').trim()
  const key = value.toLowerCase().replace(/[\s-]+/g, '_')

  if (!key) return 'Queued'
  if (key === 'queued' || key === 'pending') return 'Queued'
  if (key === 'started' || key === 'initiated' || key === 'ringing') return 'Starting'
  if (key === 'in_progress' || key === 'active') return 'In progress'
  if (key === 'completed' || key === 'ended' || key === 'done') return 'Completed'
  if (key === 'failed' || key === 'error') return 'Unable to start'

  if (
    key.includes('provider') ||
    key.includes('gateway') ||
    key.includes('trunk') ||
    key.includes('sip') ||
    key.includes('pstn') ||
    key.includes('setup') ||
    key.includes('internal')
  ) return 'Request received'

  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export default function AiDialer() {
  const [customerNumber, setCustomerNumber] = useState('')
  const [callerId, setCallerId] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [assistantId, setAssistantId] = useState('default')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<StartAiCallResponse | null>(null)

  const validation = useMemo(() => {
    return [
      validateE164(customerNumber, 'Customer number'),
      validateE164(callerId, 'Caller ID', false),
      validateE164(transferTo, 'Transfer number'),
    ].filter(Boolean)
  }, [customerNumber, callerId, transferTo])

  const canSubmit = validation.length === 0 && customerNumber.trim() && transferTo.trim() && !submitting

  const startCall = useCallback(async () => {
    setError('')
    setResult(null)

    if (validation.length > 0) {
      setError(validation[0])
      return
    }

    const confirmed = window.confirm('This will start a real AI call. Continue?')
    if (!confirmed) return

    setSubmitting(true)

    try {
      const response = await aiCallsAPI.startOutboundCall({
        toNumber: cleanText(customerNumber),
        fromNumber: cleanText(callerId) || undefined,
        transferDestination: cleanText(transferTo),
        assistantId: cleanText(assistantId) || 'default',
        notes: cleanText(notes) || undefined,
      })

      setResult(response)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }, [assistantId, callerId, customerNumber, notes, transferTo, validation])

  return (
    <div className="ptdt-ai-dialer-page">
      <style>{pageCss}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div className="eyebrow purple" style={{ marginBottom: 10 }}><PhoneCall size={13} /> AI Dialer</div>
          <h1 className="ptdt-page-title">Start <span className="gradient-brand-text">AI Call</span></h1>
          <p className="ptdt-page-subtitle" style={{ maxWidth: 760 }}>
            Launch a controlled AI call with a transfer destination. Manual Dialer and AI Dialer are now kept separate for a cleaner workflow.
          </p>
        </div>

        <Link to="/ai-dialer/logs" className="ptdt-action-btn" style={{ textDecoration: 'none' }}>
          <ListFilter size={15} /> AI Call Logs
        </Link>
      </div>

      <div className="ptdt-ai-dialer-grid">
        <section className="glass ptdt-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="sidebar-icon-shell" style={{ color: 'var(--pink)' }}><PhoneCall size={18} /></span>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Call Setup</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: 12.5 }}>All numbers must use international E.164 format.</p>
            </div>
          </div>

          <div className="ptdt-ai-dialer-form">
            <label style={labelStyle}>
              Customer Number
              <input style={inputStyle} value={customerNumber} onChange={event => setCustomerNumber(event.target.value)} placeholder="+15512943079" inputMode="tel" autoComplete="off" />
            </label>

            <label style={labelStyle}>
              Caller ID
              <input style={inputStyle} value={callerId} onChange={event => setCallerId(event.target.value)} placeholder="Leave blank to use configured Caller ID" inputMode="tel" autoComplete="off" />
            </label>
            <div style={hintStyle}>Only approved Caller IDs will be accepted by the Voice Service.</div>

            <label style={labelStyle}>
              Transfer To
              <input style={inputStyle} value={transferTo} onChange={event => setTransferTo(event.target.value)} placeholder="+16467763005" inputMode="tel" autoComplete="off" />
            </label>
            <div style={hintStyle}>Only approved transfer destinations will be accepted.</div>

            <label style={labelStyle}>
              Assistant
              <input style={inputStyle} value={assistantId} onChange={event => setAssistantId(event.target.value)} placeholder="default" autoComplete="off" />
            </label>

            <label style={labelStyle}>
              Notes
              <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional private note for this AI call" style={{ ...inputStyle, height: 88, borderRadius: 16, paddingTop: 12, resize: 'vertical' }} />
            </label>

            {validation.length > 0 && (
              <div style={{ display: 'flex', gap: 8, color: 'var(--orange)', fontSize: 12.5, fontWeight: 800 }}>
                <AlertTriangle size={16} /> {validation[0]}
              </div>
            )}

            {error && (
              <div className="glass" style={{ display: 'flex', gap: 8, color: 'var(--red)', fontSize: 12.5, fontWeight: 900, padding: 12, borderRadius: 14 }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <div className="ptdt-ai-dialer-actions">
              <button type="button" className="ptdt-primary-btn" onClick={startCall} disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.55 }}>
                {submitting ? <><Clock size={15} /> Starting...</> : <><PhoneCall size={15} /> Start AI Call</>}
              </button>
              <Link to="/ai-dialer/logs" className="ptdt-action-btn" style={{ textDecoration: 'none' }}>View Logs</Link>
            </div>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 14 }}>
          <div className="glass ptdt-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <ShieldCheck size={18} color="var(--green-2)" />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>Safety Checks</h2>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={statStyle}><b>Role protected</b><br /><span style={{ color: 'var(--text-3)', fontSize: 12 }}>Admin and Supervisor access only.</span></div>
              <div style={statStyle}><b>Confirmation required</b><br /><span style={{ color: 'var(--text-3)', fontSize: 12 }}>Real calls require a final confirmation.</span></div>
              <div style={statStyle}><b>Clean response</b><br /><span style={{ color: 'var(--text-3)', fontSize: 12 }}>Only Call ID, status, and masked numbers are shown.</span></div>
            </div>
          </div>

          {result && (
            <div className="glass ptdt-card ptdt-ai-dialer-result" style={{ padding: 18, borderColor: 'rgba(0,167,71,0.38)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="var(--green-2)" />
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 950 }}>AI Call Started</h2>
              </div>
              <div style={statStyle}><b>Call ID</b><br /><span className="mono">{result.displayCallId || (result.callId ? `#${result.callId}` : 'Pending')}</span></div>
              <div style={statStyle}><b>Status</b><br /><span>{getDisplayStatus(result.status)}</span></div>
              <div style={statStyle}><b>Customer</b><br /><span>{result.toNumber || '—'}</span></div>
              <Link to="/ai-dialer/logs" className="ptdt-primary-btn" style={{ textDecoration: 'none', justifyContent: 'center' }}>Open AI Call Logs</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
