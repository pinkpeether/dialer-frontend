import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, MessageSquareText, RefreshCw, Send, ShieldCheck, Zap } from 'lucide-react'
import { smsApi, type SmsConfig, type SmsSendResult, type SmsStatusResult } from '../api/sms.api'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 800,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: 1.1,
  marginBottom: 7,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

const emptyConfig: SmsConfig = {
  enabled: false,
  provider: 'PTDT Dialer',
  defaultFrom: '',
  maxMessageLength: 1600,
  defaultCountryCode: '',
  statusLookupEnabled: true,
}

export default function SmsConsole() {
  const [config, setConfig] = useState<SmsConfig>(emptyConfig)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [messageId, setMessageId] = useState('')
  const [sendResult, setSendResult] = useState<SmsSendResult | null>(null)
  const [statusResult, setStatusResult] = useState<SmsStatusResult | null>(null)

  const charCount = message.length
  const segmentEstimate = useMemo(() => {
    if (!message) return 0
    return Math.max(1, Math.ceil(message.length / 160))
  }, [message])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const next = await smsApi.getConfig()
      setConfig(next)
      setFrom(prev => prev || next.defaultFrom || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SMS configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const clearSend = () => {
    setFrom(config.defaultFrom || '')
    setTo('')
    setMessage('')
    setSendResult(null)
    setSuccess('')
    setError('')
  }

  const clearStatus = () => {
    setMessageId('')
    setStatusResult(null)
    setSuccess('')
    setError('')
  }

  const handleSend = async () => {
    setSending(true)
    setError('')
    setSuccess('')
    try {
      const result = await smsApi.send({ from, to, message })
      setSendResult(result)
      if (result.queuedMessageIds[0]) {
        setMessageId(result.queuedMessageIds[0])
      }
      setSuccess(`SMS queued successfully (${result.queuedMessageIds.length} message${result.queuedMessageIds.length === 1 ? '' : 's'})`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  const handleCheckStatus = async () => {
    setChecking(true)
    setError('')
    setSuccess('')
    try {
      const result = await smsApi.getStatus(messageId)
      setStatusResult(result)
      setSuccess('SMS status fetched')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SMS status')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <MessageSquareText size={12} /> PTDT SMS Console
          </div>
          <h1 className="ptdt-page-title">
            SMS <span className="gradient-brand-text">Messaging</span>
          </h1>
          <p className="ptdt-page-desc">
            Send outbound SMS, review queued message IDs, and check live delivery status from one PTDT-branded workspace.
          </p>
        </div>
        <div className="ptdt-toolbar">
          <span className="ptdt-chip">
            <ShieldCheck size={12} />
            {config.provider.toUpperCase()}
          </span>
          <button className="ptdt-action-btn" type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div
          className="ptdt-card"
          style={{
            padding: 14,
            marginBottom: 16,
            color: error ? 'var(--danger)' : 'var(--green-2)',
            borderColor: error ? 'rgba(239,68,68,0.28)' : 'rgba(0,167,71,0.28)',
          }}
        >
          {error || success}
        </div>
      )}

      <div className="ptdt-pro-kpis" style={{ marginBottom: 18 }}>
        <div className="ptdt-pro-kpi">
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>PROVIDER</div>
          <div style={{ marginTop: 6, fontSize: 28, color: 'var(--text)', fontWeight: 950 }}>{config.provider}</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>MAX LENGTH</div>
          <div style={{ marginTop: 6, fontSize: 28, color: 'var(--text)', fontWeight: 950 }}>{config.maxMessageLength}</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>CHARS</div>
          <div style={{ marginTop: 6, fontSize: 28, color: charCount > config.maxMessageLength ? 'var(--danger)' : 'var(--text)', fontWeight: 950 }}>{charCount}</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>SEGMENTS</div>
          <div style={{ marginTop: 6, fontSize: 28, color: 'var(--text)', fontWeight: 950 }}>{segmentEstimate}</div>
        </div>
      </div>

      <div className="ptdt-pro-grid sidebar" style={{ alignItems: 'start' }}>
        <section className="ptdt-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <h2 className="display" style={{ color: 'var(--text)', fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Send SMS</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                Enter one number or multiple comma-separated recipients.
              </p>
            </div>
            <span className="ptdt-chip">
              <Zap size={12} />
              {config.enabled ? 'Ready' : 'Disabled'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <Field label="From">
              <input value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} placeholder="Sender's name" />
            </Field>
            <Field label="To">
              <input
                value={to}
                onChange={e => setTo(e.target.value)}
                style={inputStyle}
                placeholder="+15551234567, +15557654321"
              />
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Message">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
                placeholder="Hello from PTDT Dialer..."
              />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, color: 'var(--text-3)', fontSize: 12.5 }}>
            <div>Max length: {config.maxMessageLength}</div>
            <div>{charCount}/{config.maxMessageLength}</div>
          </div>

          <div className="ptdt-toolbar" style={{ marginTop: 18 }}>
            <button className="ptdt-action-btn accent" type="button" onClick={() => void handleSend()} disabled={sending || !config.enabled}>
              <Send size={14} /> {sending ? 'Sending...' : 'Send SMS'}
            </button>
            <button className="ptdt-action-btn" type="button" onClick={clearSend}>
              Clear
            </button>
          </div>

          {sendResult && (
            <div className="ptdt-pro-table-card" style={{ marginTop: 18 }}>
              <div className="ptdt-pro-table-toolbar">
                <div>
                  <div className="ptdt-pro-table-title">Queued Result</div>
                  <div className="ptdt-pro-table-subtitle">Provider response after queue submission.</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="ptdt-chip"><CheckCircle2 size={12} /> Queue status: {sendResult.providerStatus}</div>
                <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Queued IDs: {sendResult.queuedMessageIds.join(', ') || 'none'}</div>
                <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Estimated cost: {sendResult.totalCost ?? 'n/a'}</div>
              </div>
            </div>
          )}
        </section>

        <section className="ptdt-card" style={{ padding: 18 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 className="display" style={{ color: 'var(--text)', fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Check Status</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
              Paste any queued message ID and fetch its current delivery state.
            </p>
          </div>

          <Field label="Message ID">
            <input
              value={messageId}
              onChange={e => setMessageId(e.target.value)}
              style={inputStyle}
              placeholder="msg_68469d706915e2.22344001"
            />
          </Field>

          <div className="ptdt-toolbar" style={{ marginTop: 18 }}>
            <button className="ptdt-action-btn accent" type="button" onClick={() => void handleCheckStatus()} disabled={checking || !messageId.trim()}>
              <RefreshCw size={14} /> {checking ? 'Checking...' : 'Check Status'}
            </button>
            <button className="ptdt-action-btn" type="button" onClick={clearStatus}>
              Clear
            </button>
          </div>

          {statusResult && (
            <div className="ptdt-pro-table-card" style={{ marginTop: 18 }}>
              <div className="ptdt-pro-table-toolbar">
                <div>
                  <div className="ptdt-pro-table-title">Delivery Snapshot</div>
                  <div className="ptdt-pro-table-subtitle">Latest provider-reported delivery response.</div>
                </div>
              </div>
              <div className="ptdt-pro-grid two" style={{ gap: 12 }}>
                <div className="ptdt-card" style={{ padding: 14 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>MESSAGE ID</div>
                  <div style={{ marginTop: 6, color: 'var(--text)', fontWeight: 800 }}>{statusResult.messageId}</div>
                </div>
                <div className="ptdt-card" style={{ padding: 14 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>SMS STATUS</div>
                  <div style={{ marginTop: 6, color: 'var(--text)', fontWeight: 800 }}>{statusResult.smsStatus}</div>
                </div>
                <div className="ptdt-card" style={{ padding: 14 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>FROM</div>
                  <div style={{ marginTop: 6, color: 'var(--text)', fontWeight: 800 }}>{statusResult.from || 'n/a'}</div>
                </div>
                <div className="ptdt-card" style={{ padding: 14 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1 }}>TO</div>
                  <div style={{ marginTop: 6, color: 'var(--text)', fontWeight: 800 }}>{statusResult.to || 'n/a'}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, color: 'var(--text-3)', fontSize: 12.5 }}>
                Created: {statusResult.createdDate || 'n/a'} • Delivery response: {statusResult.providerStatus}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
