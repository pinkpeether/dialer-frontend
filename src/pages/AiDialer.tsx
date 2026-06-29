import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  ListFilter,
  Mic,
  MicOff,
  Pause,
  PhoneCall,
  PhoneOff,
  Play,
  RefreshCw,
  ShieldCheck,
  Shuffle,
} from 'lucide-react'
import { aiCallsAPI, type AiCallLog, type StartAiCallResponse } from '../api/aiCalls.api'
import { callControlAPI, type CallControlAction } from '../api/callControl.api'
import PtdtDialog, { type PtdtDialogState } from '../components/PtdtDialog'
import { setGlobalRequestOverlaySuppressed } from '../api/axios'

const E164_REGEX = /^\+[1-9]\d{7,14}$/

const pageCss = `
.ptdt-ai-dialer-page {
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
  padding: 26px clamp(16px, 3vw, 34px) 40px;
}

.ptdt-ai-dialer-grid {
  display: grid;
  grid-template-columns: minmax(340px, 0.76fr) minmax(0, 1.24fr);
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

.ptdt-ai-dialer-input::placeholder,
.ptdt-ai-dialer-textarea::placeholder {
  color: var(--text-3);
  opacity: .5;
  font-weight: 650;
}

.ptdt-ai-start-call-btn {
  min-height: 62px;
  border: 0;
  border-radius: 999px;
  padding: 8px 28px 8px 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #fff;
  background: linear-gradient(180deg, #21e783 0%, #00b96b 54%, #008a4f 100%);
  box-shadow: 0 18px 34px rgba(0, 167, 71, .24), inset 0 1px 0 rgba(255,255,255,.35);
  font-size: clamp(18px, 2vw, 26px);
  font-weight: 950;
  letter-spacing: -0.03em;
  cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease, filter .16s ease;
}

.ptdt-ai-start-call-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 22px 42px rgba(0, 167, 71, .30), inset 0 1px 0 rgba(255,255,255,.38);
}

.ptdt-ai-start-call-btn:disabled {
  cursor: not-allowed;
  filter: saturate(.72);
}

.ptdt-ai-start-call-icon {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 112, 62, .32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.32);
  flex: 0 0 auto;
}

.ptdt-ai-live-console {
  position: relative;
  overflow: hidden;
  min-height: 100%;
}

.ptdt-ai-live-console::before {
  content: '';
  position: absolute;
  inset: -35% -12% auto auto;
  width: 340px;
  height: 340px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(251,10,139,.18), transparent 64%);
  pointer-events: none;
}

.ptdt-ai-console-top {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  margin-bottom: 18px;
}

.ptdt-ai-dialer-screen {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 26px;
  padding: clamp(18px, 3vw, 28px);
  background:
    linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.03)),
    var(--bg-glass-hi);
  box-shadow: 0 24px 70px rgba(0,0,0,.16);
}

.ptdt-ai-timer {
  font-family: var(--font-display);
  font-size: clamp(46px, 7vw, 86px);
  line-height: .92;
  letter-spacing: -0.055em;
  font-weight: 950;
  color: var(--green-2);
  text-shadow: 0 14px 32px rgba(0, 167, 71, .18);
}

.ptdt-ai-timer-label {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.ptdt-ai-ready-ref {
  color: var(--green-2) !important;
  text-shadow: 0 8px 18px rgba(0, 167, 71, .15);
}

.ptdt-ai-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(0,167,71,.24);
  background: rgba(0,167,71,.10);
  color: var(--green-2);
  border-radius: 999px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 950;
  white-space: nowrap;
}

.ptdt-ai-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 6px rgba(0,167,71,.10);
}

.ptdt-ai-call-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.ptdt-ai-meta-title {
  font-weight: 950;
}

.ptdt-ai-meta-title.customer {
  color: var(--pink);
}

.ptdt-ai-meta-title.transfer {
  color: var(--green-2);
}

.ptdt-ai-meta-title.result {
  color: #8b5cf6;
}

.ptdt-ai-dialpad-controls {
  display: grid;
  grid-template-columns: repeat(6, minmax(76px, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.ptdt-ai-control-btn {
  min-height: 74px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 950;
  text-align: center;
}

.ptdt-ai-control-btn.danger {
  border-color: rgba(239,68,68,.35);
  color: #ef4444;
}

.ptdt-ai-control-btn.success {
  border-color: rgba(34,197,94,.35);
  color: #16a34a;
}

.ptdt-ai-timeline {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.ptdt-ai-timeline-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 800;
}

.ptdt-ai-timeline-dot {
  width: 11px;
  height: 11px;
  margin-top: 3px;
  border-radius: 999px;
  background: var(--border);
  box-shadow: 0 0 0 5px rgba(255,255,255,.04);
}

.ptdt-ai-timeline-row.active .ptdt-ai-timeline-dot {
  background: var(--green-2);
}

.ptdt-ai-timeline-row.waiting {
  color: var(--text-3);
}

.ptdt-ai-logs-btn {
  min-height: 50px;
  border-radius: 999px;
  padding: 8px 18px 8px 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--green-2);
  background: linear-gradient(180deg, rgba(0,167,71,.14), rgba(0,167,71,.06));
  border: 1px solid rgba(0,167,71,.26);
  box-shadow: 0 14px 28px rgba(0, 167, 71, .12), inset 0 1px 0 rgba(255,255,255,.45);
  font-size: 14px;
  font-weight: 950;
  transition: transform .16s ease, box-shadow .16s ease;
}

.ptdt-ai-logs-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 34px rgba(0, 167, 71, .16), inset 0 1px 0 rgba(255,255,255,.50);
}

.ptdt-ai-logs-icon {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(180deg, #21e783, #008a4f);
  box-shadow: 0 10px 20px rgba(0, 167, 71, .18);
  flex: 0 0 auto;
}

.ptdt-ai-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(5, 8, 18, .58);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
}

.ptdt-ai-confirm-modal {
  position: relative;
  width: min(560px, 100%);
  overflow: hidden;
  border: 1px solid rgba(251, 10, 139, .22);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(251, 10, 139, .18), transparent 42%),
    radial-gradient(circle at top right, rgba(0, 167, 71, .14), transparent 40%),
    var(--bg-glass-hi);
  box-shadow: 0 28px 90px rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255,255,255,.38);
  padding: clamp(18px, 4vw, 26px);
}

.ptdt-ai-confirm-modal::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255,255,255,.12), transparent 42%);
}

.ptdt-ai-confirm-content {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 18px;
}

.ptdt-ai-confirm-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 13px;
  align-items: start;
}

.ptdt-ai-confirm-icon {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, var(--pink), #8b5cf6);
  box-shadow: 0 16px 32px rgba(251, 10, 139, .22);
}

.ptdt-ai-confirm-close {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-glass);
  color: var(--text-2);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.ptdt-ai-confirm-title {
  margin: 0;
  color: var(--text);
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 950;
  letter-spacing: -0.045em;
}

.ptdt-ai-confirm-message {
  margin: 6px 0 0;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.55;
  font-weight: 750;
}

.ptdt-ai-confirm-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ptdt-ai-confirm-detail {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-glass);
  padding: 12px;
}

.ptdt-ai-confirm-detail b {
  display: block;
  color: var(--text-3);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .12em;
  margin-bottom: 5px;
}

.ptdt-ai-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.ptdt-ai-confirm-start {
  border: 0;
  border-radius: 999px;
  min-height: 46px;
  padding: 0 18px 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  background: linear-gradient(180deg, #21e783, #008a4f);
  box-shadow: 0 16px 32px rgba(0, 167, 71, .22), inset 0 1px 0 rgba(255,255,255,.34);
  font-size: 14px;
  font-weight: 950;
  cursor: pointer;
}

.ptdt-ai-confirm-start span {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 112, 62, .30);
}

@media (max-width: 1080px) {
  .ptdt-ai-dialer-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }
}

@media (max-width: 900px) {
  .ptdt-ai-dialer-page {
    padding: 72px 12px 28px !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .ptdt-ai-dialer-page * {
    box-sizing: border-box;
    min-width: 0;
  }

  .ptdt-ai-console-top,
  .ptdt-ai-call-meta,
  .ptdt-ai-confirm-details {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-ai-dialpad-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
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

type ConsoleAction = {
  action: CallControlAction
  label: string
  icon: typeof PhoneCall
  tone?: 'danger' | 'success'
  requiresConfirm?: boolean
}

const consoleActions: ConsoleAction[] = [
  { action: 'hold', label: 'Hold', icon: Pause },
  { action: 'resume', label: 'Resume', icon: Play, tone: 'success' },
  { action: 'transfer', label: 'Transfer', icon: Shuffle },
  { action: 'mute', label: 'Mute', icon: MicOff },
  { action: 'unmute', label: 'Unmute', icon: Mic, tone: 'success' },
  { action: 'hangup', label: 'Hangup', icon: PhoneOff, tone: 'danger', requiresConfirm: true },
]

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

function isTerminalStatus(status?: string | null) {
  const key = String(status || '').toLowerCase().replace(/[\s-]+/g, '_')
  return ['completed', 'ended', 'done', 'failed', 'error'].includes(key)
}

function formatDuration(ms: number) {
  const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0
  const totalSeconds = Math.floor(safeMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function maskPhone(value?: string | null) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return '—'
  if (trimmed.length <= 7) return trimmed

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-3)}`
}

function getControlMessage(message?: unknown) {
  const value = typeof message === 'string' ? message.trim() : ''
  const lower = value.toLowerCase()

  if (!value) return 'Call-control request received.'
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
  ) return 'Call-control request received.'

  return value
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
  const [liveLog, setLiveLog] = useState<AiCallLog | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [controlLoading, setControlLoading] = useState<CallControlAction | null>(null)
  const [controlMessage, setControlMessage] = useState('')
  const [controlError, setControlError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)

  const validation = useMemo(() => {
    return [
      validateE164(customerNumber, 'Customer number'),
      validateE164(callerId, 'Caller ID', false),
      validateE164(transferTo, 'Transfer number', false),
    ].filter(Boolean)
  }, [customerNumber, callerId, transferTo])

  const canSubmit = validation.length === 0 && Boolean(customerNumber.trim()) && !submitting
  const hasStarted = Boolean(result || submitting || startedAt)
  const activeCallId = result?.callId || liveLog?.id || ''
  const displayStatus = hasStarted ? getDisplayStatus(liveLog?.callStatus || result?.status) : 'Ready'
  const displayDurationMs = liveLog?.durationMs && liveLog.durationMs > 0 ? liveLog.durationMs : elapsedMs
  const isLive = hasStarted && !isTerminalStatus(liveLog?.callStatus || result?.status)

  useEffect(() => {
    if (!startedAt || !isLive) return undefined

    const tick = () => setElapsedMs(Date.now() - startedAt)
    tick()

    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [isLive, startedAt])

  useEffect(() => {
    if (!result?.callId) return undefined

    let cancelled = false

    const loadLog = async () => {
      try {
        const data = await aiCallsAPI.getLog(result.callId as string | number)
        if (!cancelled) setLiveLog(data)
      } catch {
        // The call log can arrive a few moments after the launch response.
      }
    }

    loadLog()

    if (isTerminalStatus(liveLog?.callStatus)) return () => {
      cancelled = true
    }

    const interval = window.setInterval(loadLog, 6000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [liveLog?.callStatus, result?.callId])

  useEffect(() => {
    if (!confirmOpen) return undefined

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmOpen])

  const executeStartCall = useCallback(async () => {
    setConfirmOpen(false)
    setError('')
    setResult(null)
    setLiveLog(null)
    setControlMessage('')
    setControlError('')
    setElapsedMs(0)

    if (validation.length > 0) {
      setError(validation[0])
      return
    }

    setSubmitting(true)
    setGlobalRequestOverlaySuppressed(true)
    setStartedAt(Date.now())

    try {
      const transferDestination = cleanText(transferTo)
      const response = await aiCallsAPI.startOutboundCall({
        toNumber: cleanText(customerNumber),
        fromNumber: cleanText(callerId) || undefined,
        ...(transferDestination ? { transferDestination } : {}),
        assistantId: cleanText(assistantId) || 'default',
        notes: cleanText(notes) || undefined,
      })

      setResult(response)
    } catch (err) {
      setStartedAt(null)
      setError(getErrorMessage(err))
    } finally {
      setGlobalRequestOverlaySuppressed(false)
      setSubmitting(false)
    }
  }, [assistantId, callerId, customerNumber, notes, transferTo, validation])

  const startCall = useCallback(() => {
    setError('')

    if (validation.length > 0) {
      setError(validation[0])
      return
    }

    setConfirmOpen(true)
  }, [validation])

  const runControl = useCallback(async (action: CallControlAction, requiresConfirm?: boolean) => {
    setControlError('')
    setControlMessage('')

    if (!activeCallId) {
      setControlError('Call ID is required before call controls can be used.')
      return
    }

    if (requiresConfirm) {
      setDialog({
        tone: 'confirm',
        title: 'End active AI call?',
        message: 'This will end the active AI call. Continue?',
        confirmLabel: 'End Call',
        onConfirm: () => {
          setDialog(null)
          void runControl(action, false)
        },
      })
      return
    }

    setControlLoading(action)

    try {
      const response = await callControlAPI.runAction(action, {
        callId: activeCallId,
        targetNumber: cleanText(transferTo) || undefined,
        transferTo: cleanText(transferTo) || undefined,
      }) as { message?: unknown }

      setControlMessage(getControlMessage(response?.message))
    } catch (err) {
      const message = (err as { response?: { data?: { message?: unknown } }; message?: unknown })?.response?.data?.message
        || (err as { message?: unknown })?.message
      setControlError(getControlMessage(message) || 'Unable to complete call-control request.')
    } finally {
      setControlLoading(null)
    }
  }, [activeCallId, transferTo])

  const timelineRows = [
    { label: 'Call setup prepared', active: hasStarted || canSubmit },
    { label: submitting ? 'Starting AI call' : result ? 'AI call request accepted' : 'Waiting for launch', active: Boolean(submitting || result) },
    { label: isLive ? 'Live session timer running' : result ? 'Session completed or awaiting final update' : 'Live console will activate after launch', active: Boolean(result), waiting: !result },
    { label: liveLog?.callSummary ? 'Latest call summary available' : 'Final details will appear in AI Call Logs', active: Boolean(liveLog?.callSummary), waiting: !liveLog?.callSummary },
  ]

  return (
    <div className="ptdt-ai-dialer-page">
      <style>{pageCss}</style>
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div className="eyebrow purple" style={{ marginBottom: 10 }}><PhoneCall size={13} /> AI Dialer</div>
          <h1 className="ptdt-page-title">Live <span className="gradient-brand-text">AI Call Console</span></h1>
          <p className="ptdt-page-subtitle" style={{ maxWidth: 820 }}>
            Launch, monitor, and control real AI calls from one premium console. Client-facing details stay clean while technical data remains behind the scenes.
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
              <input className="ptdt-ai-dialer-input" style={inputStyle} value={customerNumber} onChange={event => setCustomerNumber(event.target.value)} placeholder="+15512943079" inputMode="tel" autoComplete="off" />
            </label>

            <label style={labelStyle}>
              Caller ID
              <input className="ptdt-ai-dialer-input" style={inputStyle} value={callerId} onChange={event => setCallerId(event.target.value)} placeholder="Leave blank to use configured Caller ID" inputMode="tel" autoComplete="off" />
            </label>
            <div style={hintStyle}>Only approved Caller IDs will be accepted by the Voice Service.</div>

            <label style={labelStyle}>
              Transfer To
              <input className="ptdt-ai-dialer-input" style={inputStyle} value={transferTo} onChange={event => setTransferTo(event.target.value)} placeholder="Optional transfer number" inputMode="tel" autoComplete="off" />
            </label>
            <div style={hintStyle}>Optional. If provided, only approved transfer destinations will be accepted.</div>

            <label style={labelStyle}>
              Assistant
              <input className="ptdt-ai-dialer-input" style={inputStyle} value={assistantId} onChange={event => setAssistantId(event.target.value)} placeholder="default" autoComplete="off" />
            </label>

            <label style={labelStyle}>
              Notes
              <textarea className="ptdt-ai-dialer-textarea" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional private note for this AI call" style={{ ...inputStyle, height: 88, borderRadius: 16, paddingTop: 12, resize: 'vertical' }} />
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
              <button type="button" className="ptdt-ai-start-call-btn" onClick={startCall} disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.68 }}>
                <span className="ptdt-ai-start-call-icon">{submitting ? <Clock size={24} /> : <PhoneCall size={24} />}</span>
                <span>Start AI Call</span>
              </button>
              <Link to="/ai-dialer/logs" className="ptdt-action-btn" style={{ textDecoration: 'none' }}>View Logs</Link>
            </div>
          </div>
        </section>

        <section className="glass ptdt-card ptdt-ai-live-console" style={{ padding: 20 }}>
          <div className="ptdt-ai-console-top">
            <div>
              <div className="eyebrow pink" style={{ marginBottom: 10 }}><ShieldCheck size={13} /> Live Monitor</div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>AI Call Command Center</h2>
              <p style={{ margin: '7px 0 0', color: 'var(--text-3)', fontSize: 13, maxWidth: 640 }}>
                Real-time launch state, session timer, quick controls, and latest call result preview.
              </p>
            </div>

            <div className="ptdt-ai-status-pill">
              <span className="ptdt-ai-status-dot" />
              {submitting ? 'Starting' : displayStatus}
            </div>
          </div>

          <div className="ptdt-ai-dialer-screen">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div className="ptdt-ai-timer-label">Live Session Timer</div>
                <div className="ptdt-ai-timer">{formatDuration(displayDurationMs)}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="ptdt-ai-timer-label">Call ID</div>
                <div className={`mono ${activeCallId ? '' : 'ptdt-ai-ready-ref'}`} style={{ fontSize: 22, fontWeight: 950, color: 'var(--text)' }}>
                  {result?.displayCallId || (activeCallId ? `#${activeCallId}` : 'Ready')}
                </div>
              </div>
            </div>

            <div className="ptdt-ai-call-meta">
              <div style={statStyle}><b className="ptdt-ai-meta-title customer">Customer</b><br /><span>{maskPhone(result?.toNumber || customerNumber)}</span></div>
              <div style={statStyle}><b className="ptdt-ai-meta-title transfer">Transfer</b><br /><span>{maskPhone(result?.transferDestination || transferTo)}</span></div>
              <div style={statStyle}><b className="ptdt-ai-meta-title result">Result</b><br /><span>{liveLog?.callSuccessful === true ? 'Successful' : liveLog?.callSuccessful === false ? 'Review needed' : 'Pending'}</span></div>
            </div>

            <div className="ptdt-ai-dialpad-controls">
              {consoleActions.map(item => {
                const Icon = item.icon
                const active = controlLoading === item.action
                const disabled = !activeCallId || Boolean(controlLoading)

                return (
                  <button
                    key={item.action}
                    type="button"
                    className={`ptdt-action-btn ptdt-ai-control-btn ${item.tone || ''}`}
                    onClick={() => runControl(item.action, item.requiresConfirm)}
                    disabled={disabled}
                    title={activeCallId ? `${item.label} active AI call` : 'Start an AI call first'}
                    style={{ opacity: disabled && !active ? 0.5 : 1 }}
                  >
                    <Icon size={18} />
                    {active ? 'Running…' : item.label}
                  </button>
                )
              })}
            </div>

            {controlError && (
              <div style={{ marginTop: 14, border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.08)', color: 'var(--danger)', borderRadius: 16, padding: 12, fontWeight: 850 }}>
                {controlError}
              </div>
            )}

            {controlMessage && (
              <div style={{ marginTop: 14, border: '1px solid rgba(0,167,71,.25)', background: 'rgba(0,167,71,.08)', color: 'var(--green-2)', borderRadius: 16, padding: 12, fontWeight: 850 }}>
                {controlMessage}
              </div>
            )}

            <div className="ptdt-ai-timeline">
              {timelineRows.map(row => (
                <div key={row.label} className={`ptdt-ai-timeline-row ${row.active ? 'active' : ''} ${row.waiting ? 'waiting' : ''}`}>
                  <span className="ptdt-ai-timeline-dot" />
                  <span>{row.label}</span>
                </div>
              ))}
            </div>

            {liveLog?.callSummary && (
              <div style={{ ...statStyle, marginTop: 16 }}>
                <b>Latest Summary</b>
                <p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.55 }}>{liveLog.callSummary}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <Link to="/ai-dialer/logs" className="ptdt-ai-logs-btn" style={{ textDecoration: 'none' }}>
                <span className="ptdt-ai-logs-icon"><ListFilter size={15} /></span>
                Open AI Call Logs
              </Link>
              <Link to="/call-controls" className="ptdt-action-btn" style={{ textDecoration: 'none' }}>
                <RefreshCw size={15} /> Full Call Controls
              </Link>
            </div>
          </div>
        </section>
      </div>

      {confirmOpen && (
        <div
          data-ptdt-modal-open="true"
          className="ptdt-ai-confirm-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setConfirmOpen(false)
          }}
        >
          <div className="ptdt-ai-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ptdt-ai-confirm-title">
            <div className="ptdt-ai-confirm-content">
              <div className="ptdt-ai-confirm-top">
                <span className="ptdt-ai-confirm-icon"><PhoneCall size={23} /></span>
                <div>
                  <h2 id="ptdt-ai-confirm-title" className="ptdt-ai-confirm-title">Start AI Call?</h2>
                  <p className="ptdt-ai-confirm-message">
                    This will start a real AI call to the selected customer. Please confirm before the Voice Service begins dialing.
                  </p>
                </div>
                <button type="button" className="ptdt-ai-confirm-close" onClick={() => setConfirmOpen(false)} aria-label="Close confirmation dialog">×</button>
              </div>

              <div className="ptdt-ai-confirm-details">
                <div className="ptdt-ai-confirm-detail">
                  <b>Customer</b>
                  <span className="mono">{maskPhone(customerNumber)}</span>
                </div>
                <div className="ptdt-ai-confirm-detail">
                  <b>Transfer</b>
                  <span className="mono">{transferTo.trim() ? maskPhone(transferTo) : 'No transfer'}</span>
                </div>
              </div>

              <div className="ptdt-ai-confirm-actions">
                <button type="button" className="ptdt-action-btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
                <button type="button" className="ptdt-ai-confirm-start" onClick={executeStartCall} disabled={submitting}>
                  <span>{submitting ? <Clock size={16} /> : <PhoneCall size={16} />}</span>
                  {submitting ? 'Starting…' : 'Start Call'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
