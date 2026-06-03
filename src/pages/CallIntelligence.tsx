import { useState } from 'react'
import {
  Brain,
  FileAudio,
  Search,
  Sparkles,
  Wand2,
  Lightbulb,
  TrendingUp,
  Copy,
  Download,
  ShieldCheck,
  LockKeyhole,
} from 'lucide-react'
import { callIntelligenceAPI } from '../api/callIntelligence.api'

type CallIntelligenceCall = {
  id?: number | string
  recordingUrl?: string | null
  recordingSid?: string | null
  disposition?: string | null
  duration?: number | null
}

type CallInsight = {
  id?: number | string
  summary?: string | null
  sentiment?: string | null
  score?: number | null
  intent?: string | null
  objections?: string[] | null
  actionItems?: string[] | null
  provider?: string | null
  model?: string | null
  status?: string | null
}

type AiControls = {
  transcriptionEnabled?: boolean
  insightsEnabled?: boolean
  maxTranscriptionMinutes?: number
  maxTranscriptsPerDay?: number
  maxInsightsPerDay?: number
}

type CallIntelligenceData = {
  transcript?: string | null
  transcriptText?: string | null
  transcription?: string | null
  summary?: string | null
  sentiment?: string | null
  insight?: CallInsight | null
  aiControls?: AiControls | null
  status?: string | null
  note?: string | null
  call?: CallIntelligenceCall | null
  data?: {
    transcript?: string | null
    transcriptText?: string | null
    transcription?: string | null
    summary?: string | null
    sentiment?: string | null
    insight?: CallInsight | null
    aiControls?: AiControls | null
    status?: string | null
    note?: string | null
    call?: CallIntelligenceCall | null
  } | null
}

const formatEnabled = (value?: boolean) => {
  if (typeof value !== 'boolean') return '—'
  return value ? 'Enabled' : 'Disabled'
}

const formatLimit = (value?: number, suffix = '') => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${value}${suffix}`
}

export default function CallIntelligence() {
  const [callId, setCallId] = useState('')
  const [data, setData] = useState<CallIntelligenceData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [insighting, setInsighting] = useState(false)
  const [showRawPayload, setShowRawPayload] = useState(false)

  const load = async () => {
    if (!callId.trim()) return
    setLoading(true); setError('')
    try { setData(await callIntelligenceAPI.getByCall(callId.trim())) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load call intelligence') }
    finally { setLoading(false) }
  }

  const queueTranscript = async () => {
    if (!callId.trim()) return
    setTranscribing(true); setError('')
    try { setData(await callIntelligenceAPI.createTranscript(callId.trim())) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to queue transcription') }
    finally { setTranscribing(false) }
  }

  const generateInsight = async () => {
    if (!callId.trim()) return
    setInsighting(true); setError('')
    try { setData(await callIntelligenceAPI.createInsight(callId.trim())) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate insight') }
    finally { setInsighting(false) }
  }

  const call = data?.call || data?.data?.call || null
  const transcript = data?.transcript || data?.data?.transcript || data?.transcriptText || data?.data?.transcriptText || data?.transcription || data?.data?.transcription
  const insight = data?.insight || data?.data?.insight || null
  const aiControls = data?.aiControls || data?.data?.aiControls || null
  const summary = data?.summary || data?.data?.summary || insight?.summary || ''
  const sentiment = data?.sentiment || data?.data?.sentiment || insight?.sentiment || ''
  const score = insight?.score
  const actionItems = Array.isArray(insight?.actionItems) ? insight.actionItems : []
  const status = data?.status || data?.data?.status || 'PHASE 4'
  const note = data?.note || data?.data?.note || ''

  const transcriptionDisabledByControl = aiControls?.transcriptionEnabled === false
  const insightsDisabledByControl = aiControls?.insightsEnabled === false

  const copyText = async (value: string, label: string) => {
    if (!value.trim()) return
    try {
      await navigator.clipboard.writeText(value)
      setError('')
    } catch {
      setError(`Unable to copy ${label}. Please copy it manually.`)
    }
  }

  const exportPayload = () => {
    if (!data) return
    const payload = JSON.stringify(data, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ptdt-call-intelligence-${(call?.id ?? callId) || 'call'}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow purple" style={{ marginBottom: 12 }}><Brain size={12} /> AI Call Intelligence</div>
          <h1 className="ptdt-page-title">Call <span className="gradient-brand-text">Intelligence</span></h1>
          <p className="ptdt-page-desc">Search a call, check recording readiness, and generate transcript output when recording storage and AI transcription are enabled.</p>
        </div>
        <div className="ptdt-toolbar">
          <span className="ptdt-chip"><Sparkles size={12} /> {status}</span>
        </div>
      </div>

      <div className="glass" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto auto auto', gap: 10, alignItems: 'center' }}>
          <input className="ptdt-input mono" value={callId} onChange={e => setCallId(e.target.value)} placeholder="Enter Call ID, e.g. 65" onKeyDown={e => { if (e.key === 'Enter') void load() }} />
          <button className="ptdt-action-btn" onClick={() => void load()} disabled={!callId.trim() || loading}><Search size={14} /> {loading ? 'Loading...' : 'Load Call'}</button>
          <button className="btn-brand" onClick={() => void queueTranscript()} disabled={!callId.trim() || transcribing || transcriptionDisabledByControl} style={{ minHeight: 38, fontSize: 12 }}><Wand2 size={14} /> {transcribing ? 'Processing...' : 'Queue Transcript'}</button>
          <button className="ptdt-action-btn" onClick={() => void generateInsight()} disabled={!callId.trim() || insighting || insightsDisabledByControl} style={{ minHeight: 38, fontSize: 12 }}><Lightbulb size={14} /> {insighting ? 'Generating...' : 'Generate Insight'}</button>
        </div>
      </div>

      {error && <div className="glass" style={{ padding: 14, marginBottom: 18, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 420px) 1fr', gap: 18, alignItems: 'start' }}>
        <section className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <span className="sidebar-icon-shell" style={{ color: 'var(--pink)' }}><FileAudio size={17} /></span>
            <div>
              <div className="display" style={{ fontSize: 18 }}>Call Snapshot</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Recording and transcript readiness</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            {[
              ['Call ID', call?.id ?? (callId || '—')],
              ['Recording', call?.recordingUrl ? 'Available' : 'Not available'],
              ['Recording SID', call?.recordingSid || '—'],
              ['Disposition', call?.disposition || '—'],
              ['Duration', call?.duration ? `${call.duration}s` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="ptdt-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{label}</span>
                <strong style={{ color: 'var(--text)', fontSize: 13, textAlign: 'right' }}>{String(value)}</strong>
              </div>
            ))}
          </div>

          <div className="ptdt-card" style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldCheck size={16} />
              <strong>AI Controls</strong>
            </div>
            {aiControls ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  ['Transcription', formatEnabled(aiControls.transcriptionEnabled)],
                  ['Insights', formatEnabled(aiControls.insightsEnabled)],
                  ['Max Recording', formatLimit(aiControls.maxTranscriptionMinutes, ' min')],
                  ['Daily Transcripts', formatLimit(aiControls.maxTranscriptsPerDay, '/day')],
                  ['Daily Insights', formatLimit(aiControls.maxInsightsPerDay, '/day')],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text-3)', fontSize: 12 }}>
                    <span className="mono">{label}</span>
                    <strong style={{ color: 'var(--text)', textAlign: 'right' }}>{value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6 }}>
                Load a call to view live backend AI limits and enable/disable status.
              </div>
            )}
          </div>

          <div className="ptdt-card" style={{ padding: 14, color: 'var(--text-3)', fontSize: 13, lineHeight: 1.65 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <LockKeyhole size={15} />
              <strong style={{ color: 'var(--text)' }}>Retention & Safety</strong>
            </div>
            <div>
              Recordings are stored in private storage with signed URLs. Signed recording links expire and are refreshed by the backend before transcription. Stored transcripts and insights are visible only to authorized Admin/Supervisor users. Daily AI limits are controlled from backend environment variables for pilot cost safety.
            </div>
          </div>
        </section>

        <section className="glass" style={{ padding: 20, minHeight: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div className="display" style={{ fontSize: 20 }}>AI Output</div>
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Transcript preview, supervisor insight, and export tools.</p>
            </div>
            <span className="ptdt-chip">{aiControls ? 'AI Controls Active' : 'OpenRouter Ready'}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <button
              className="ptdt-action-btn"
              onClick={() => void copyText(String(transcript || ''), 'transcript')}
              disabled={!transcript}
            >
              <Copy size={14} /> Copy Transcript
            </button>
            <button
              className="ptdt-action-btn"
              onClick={() => void copyText(String(summary || ''), 'summary')}
              disabled={!summary}
            >
              <Copy size={14} /> Copy Summary
            </button>
            <button
              className="ptdt-action-btn"
              onClick={exportPayload}
              disabled={!data}
            >
              <Download size={14} /> Export JSON
            </button>
          </div>
          {(summary || sentiment || typeof score === 'number') && (
            <div className="ptdt-card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <TrendingUp size={16} />
                <strong>AI Insight</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
                <div className="ptdt-card" style={{ padding: 12 }}>
                  <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10 }}>SENTIMENT</div>
                  <strong>{sentiment || '—'}</strong>
                </div>
                <div className="ptdt-card" style={{ padding: 12 }}>
                  <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10 }}>SCORE</div>
                  <strong>{typeof score === 'number' ? `${score}/100` : '—'}</strong>
                </div>
                <div className="ptdt-card" style={{ padding: 12 }}>
                  <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10 }}>INTENT</div>
                  <strong>{insight?.intent || '—'}</strong>
                </div>
              </div>
              {summary && <p style={{ color: 'var(--text)', lineHeight: 1.7, marginBottom: 12 }}>{summary}</p>}
              {actionItems.length > 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                  <strong style={{ color: 'var(--text)' }}>Action Items:</strong> {actionItems.join(', ')}
                </div>
              )}
            </div>
          )}

          {transcript ? (
            <div className="ptdt-card" style={{ padding: 16, marginBottom: 16, color: 'var(--text)', lineHeight: 1.75 }}>{String(transcript)}</div>
          ) : (
            <div className="ptdt-card" style={{ padding: 18, marginBottom: 16, color: 'var(--text-3)' }}>No transcript generated yet.</div>
          )}
          {note && (
            <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: 'var(--text-3)', lineHeight: 1.65 }}>
              {note}
            </div>
          )}
          <button
            className="ptdt-action-btn"
            onClick={() => setShowRawPayload(value => !value)}
            disabled={!data}
            style={{ marginBottom: 12 }}
          >
            {showRawPayload ? 'Hide Raw Payload' : 'Show Raw Payload'}
          </button>

          {showRawPayload && (
            <pre className="ptdt-raw-json">{data ? JSON.stringify(data, null, 2) : 'No call loaded.'}</pre>
          )}
        </section>
      </div>
    </div>
  )
}