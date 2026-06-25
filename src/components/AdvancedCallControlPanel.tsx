import { useState } from 'react'
import {
  PhoneOff,
  Pause,
  Play,
  Shuffle,
  Users,
  Ear,
  Radio,
  VolumeX,
  Mic,
  MicOff,
  Voicemail,
  Hash,
  Wand2,
  RefreshCw,
} from 'lucide-react'
import { callControlAPI } from '../api/callControl.api'
import type { CallControlAction, CallControlPayload } from '../api/callControl.api'

type Props = {
  defaultCallId?: number | string
  defaultProviderCallId?: string
  compact?: boolean
}

type ActionResult = {
  action: string
  status: string
  message: string
  details?: Record<string, unknown>
  processedAt?: string
}

function displayAction(action?: string) {
  const key = String(action || '').toLowerCase()
  const labels: Record<string, string> = {
    hold: 'Hold',
    resume: 'Resume',
    transfer: 'Transfer',
    conference: 'Conference',
    whisper: 'Whisper',
    barge: 'Barge-In',
    mute: 'Mute',
    unmute: 'Unmute',
    voicemaildrop: 'Voicemail Drop',
    dtmf: 'Send DTMF',
    noisecancellation: 'Noise Guard',
    hangup: 'Hangup',
  }
  return labels[key] || 'Call control'
}

function displayStatus(status?: string) {
  const key = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (!key) return 'Request received'
  if (key === 'completed' || key === 'success' || key === 'ok') return 'Completed'
  if (key === 'queued' || key === 'pending' || key === 'accepted') return 'Request received'
  if (key === 'running' || key === 'in_progress' || key === 'processing') return 'In progress'
  if (key === 'failed' || key === 'error') return 'Unable to complete'
  if (
    key.includes('provider') ||
    key.includes('adapter') ||
    key.includes('gateway') ||
    key.includes('trunk') ||
    key.includes('sip') ||
    key.includes('pbx') ||
    key.includes('setup') ||
    key.includes('internal')
  ) return 'Request received'
  return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function displayMessage(message?: string) {
  const value = String(message || '').trim()
  const lower = value.toLowerCase()
  if (!value) return 'Your call-control request was received.'
  if (
    lower.includes('provider') ||
    lower.includes('adapter') ||
    lower.includes('gateway') ||
    lower.includes('trunk') ||
    lower.includes('sip') ||
    lower.includes('pbx') ||
    lower.includes('sid') ||
    lower.includes('raw') ||
    lower.includes('payload') ||
    lower.includes('setup') ||
    lower.includes('internal')
  ) return 'Your call-control request was received.'
  return value
}

const actionButtons: Array<{
  action: CallControlAction
  label: string
  icon: typeof PhoneOff
  tone: 'danger' | 'neutral' | 'success' | 'warning'
}> = [
  { action: 'hold', label: 'Hold', icon: Pause, tone: 'warning' },
  { action: 'resume', label: 'Resume', icon: Play, tone: 'success' },
  { action: 'transfer', label: 'Transfer', icon: Shuffle, tone: 'neutral' },
  { action: 'conference', label: 'Conference', icon: Users, tone: 'neutral' },
  { action: 'whisper', label: 'Whisper', icon: Ear, tone: 'neutral' },
  { action: 'mute', label: 'Mute', icon: MicOff, tone: 'neutral' },
  { action: 'voicemailDrop', label: 'Voicemail Drop', icon: Voicemail, tone: 'neutral' },
  { action: 'dtmf', label: 'Send DTMF', icon: Hash, tone: 'neutral' },
  { action: 'noiseCancellation', label: 'Noise Guard', icon: Wand2, tone: 'neutral' },
  { action: 'hangup', label: 'Hangup', icon: PhoneOff, tone: 'danger' },
  { action: 'barge', label: 'Barge-In', icon: Radio, tone: 'warning' },
  { action: 'unmute', label: 'Unmute', icon: Mic, tone: 'success' },
]

const toneStyle = (tone: string): React.CSSProperties => {
  if (tone === 'danger') return { borderColor: 'rgba(239,68,68,.35)', color: '#ef4444' }
  if (tone === 'success') return { borderColor: 'rgba(34,197,94,.35)', color: '#16a34a' }
  if (tone === 'warning') return { borderColor: 'rgba(245,158,11,.35)', color: '#d97706' }
  return {}
}

export default function AdvancedCallControlPanel({
  defaultCallId,
  defaultProviderCallId,
  compact = false,
}: Props) {
  const [callId, setCallId] = useState(defaultCallId ? String(defaultCallId) : '')
  const [providerCallId, setProviderCallId] = useState(defaultProviderCallId || '')
  const [targetNumber, setTargetNumber] = useState('')
  const [supervisorPhone, setSupervisorPhone] = useState('')
  const [room, setRoom] = useState('')
  const [digits, setDigits] = useState('')
  const [message, setMessage] = useState('Thank you. We tried to reach you today. Please call us back when convenient.')
  const [conferenceSid, setConferenceSid] = useState('')
  const [participantCallSid, setParticipantCallSid] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [error, setError] = useState('')

  const payload = (): CallControlPayload => ({
    callId: callId || undefined,
    providerCallId: providerCallId || undefined,
    targetNumber: targetNumber || undefined,
    supervisorPhone: supervisorPhone || undefined,
    room: room || undefined,
    digits: digits || undefined,
    message: message || undefined,
    conferenceSid: conferenceSid || undefined,
    participantCallSid: participantCallSid || undefined,
  })

  const run = async (action: CallControlAction) => {
    setLoadingAction(action)
    setError('')
    setResult(null)

    try {
      const data = await callControlAPI.runAction(action, payload())
      setResult(data)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed'
      setError(message)
    } finally {
      setLoadingAction(null)
    }
  }

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid var(--border)',
    background: 'var(--bg-glass-hi)',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div
      className="glass-hi ptdt-pro-surface"
      style={{
        borderRadius: 24,
        padding: compact ? 18 : 24,
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}>
            <VolumeX size={14} /> Advanced Call Controls
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 24 : 32, lineHeight: 1.05, margin: 0, color: 'var(--text)' }}>
            Supervisor controls, transfer, hold and voicemail drop
          </h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8, maxWidth: 760 }}>
            Supervisor tools for active calls. Use Call ID or Call Gateway reference where available while call-control coverage continues to expand.
          </p>
        </div>

        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setResult(null)
            setError('')
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={16} /> Clear
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>CALL ID</span>
          <input style={inputStyle} value={callId} onChange={e => setCallId(e.target.value)} placeholder="e.g. 79" />
        </label>

        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>CALL GATEWAY REF</span>
          <input style={inputStyle} value={providerCallId} onChange={e => setProviderCallId(e.target.value)} placeholder="Call Gateway reference" />
        </label>

        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>TRANSFER TARGET</span>
          <input style={inputStyle} value={targetNumber} onChange={e => setTargetNumber(e.target.value)} placeholder="+923001234567" />
        </label>

        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>SUPERVISOR PHONE</span>
          <input style={inputStyle} value={supervisorPhone} onChange={e => setSupervisorPhone(e.target.value)} placeholder="+923001234567" />
        </label>

        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>ROOM / CONFERENCE</span>
          <input style={inputStyle} value={room} onChange={e => setRoom(e.target.value)} placeholder="ptdt-call-79" />
        </label>

        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>DTMF DIGITS</span>
          <input style={inputStyle} value={digits} onChange={e => setDigits(e.target.value)} placeholder="1234#" />
        </label>

        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>CONFERENCE REF</span>
          <input style={inputStyle} value={conferenceSid} onChange={e => setConferenceSid(e.target.value)} placeholder="Conference reference" />
        </label>

        <label>
          <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>PARTICIPANT REF</span>
          <input style={inputStyle} value={participantCallSid} onChange={e => setParticipantCallSid(e.target.value)} placeholder="Participant reference" />
        </label>
      </div>

      <label style={{ display: 'block', marginBottom: 18 }}>
        <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>VOICEMAIL MESSAGE</span>
        <textarea
          style={{ ...inputStyle, minHeight: 82, resize: 'vertical' }}
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {actionButtons.map(item => {
          const Icon = item.icon
          const active = loadingAction === item.action

          return (
            <button
              key={item.action}
              type="button"
              className="ptdt-action-btn"
              onClick={() => run(item.action)}
              disabled={Boolean(loadingAction)}
              style={{
                justifyContent: 'center',
                gap: 8,
                minHeight: 58,
                minWidth: 0,
                fontSize: 15,
                fontWeight: 850,
                ...toneStyle(item.tone),
                opacity: loadingAction && !active ? 0.55 : 1,
              }}
            >
              <Icon size={16} />
              {active ? 'Running…' : item.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ marginTop: 18, border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.08)', color: 'var(--danger)', borderRadius: 16, padding: 14 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 18, border: '1px solid var(--border)', borderRadius: 18, padding: 14, background: 'var(--bg-glass-hi)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <strong>{displayAction(result.action)}</strong>
            <span className="mono" style={{ color: displayStatus(result.status) === 'Completed' ? 'var(--green-2)' : 'var(--text-3)' }}>
              {displayStatus(result.status)}
            </span>
          </div>
          <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>{displayMessage(result.message)}</p>
        </div>
      )}
    </div>
  )
}
