import { useState } from 'react'
import { Brain, FileAudio, Search, Sparkles, Wand2 } from 'lucide-react'
import { callIntelligenceAPI } from '../api/callIntelligence.api'

type CallIntelligenceCall = {
  id?: number | string
  recordingUrl?: string | null
  recordingSid?: string | null
  disposition?: string | null
  duration?: number | null
}

type CallIntelligenceData = {
  transcript?: string | null
  transcriptText?: string | null
  transcription?: string | null
  status?: string | null
  call?: CallIntelligenceCall | null
  data?: {
    transcript?: string | null
    transcriptText?: string | null
    transcription?: string | null
    status?: string | null
    call?: CallIntelligenceCall | null
  } | null
}


export default function CallIntelligence() {
  const [callId, setCallId] = useState('')
  const [data, setData] = useState<CallIntelligenceData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

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

  const call = data?.call
  const transcript = data?.transcript || data?.data?.transcript || data?.transcriptText || data?.transcription
  const status = data?.status || data?.data?.status || 'PHASE 4'

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow purple" style={{ marginBottom: 12 }}><Brain size={12} /> AI Call Intelligence</div>
          <h1 className="ptdt-page-title">Call <span className="gradient-brand-text">Intelligence</span></h1>
          <p className="ptdt-page-desc">Search a call, generate transcript, and review AI-ready call context. Persistence requires the Phase 4 storage migration.</p>
        </div>
        <div className="ptdt-toolbar">
          <span className="ptdt-chip"><Sparkles size={12} /> {status}</span>
        </div>
      </div>

      <div className="glass" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto auto', gap: 10, alignItems: 'center' }}>
          <input className="ptdt-input mono" value={callId} onChange={e => setCallId(e.target.value)} placeholder="Enter Call ID, e.g. 65" onKeyDown={e => { if (e.key === 'Enter') void load() }} />
          <button className="ptdt-action-btn" onClick={() => void load()} disabled={!callId.trim() || loading}><Search size={14} /> {loading ? 'Loading...' : 'Load Call'}</button>
          <button className="btn-brand" onClick={() => void queueTranscript()} disabled={!callId.trim() || transcribing} style={{ minHeight: 38, fontSize: 12 }}><Wand2 size={14} /> {transcribing ? 'Processing...' : 'Queue Transcript'}</button>
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
          <div style={{ display: 'grid', gap: 10 }}>
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
        </section>

        <section className="glass" style={{ padding: 20, minHeight: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div className="display" style={{ fontSize: 20 }}>AI Output</div>
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Transcript preview and raw call intelligence payload.</p>
            </div>
            <span className="ptdt-chip">OpenRouter Ready</span>
          </div>
          {transcript ? (
            <div className="ptdt-card" style={{ padding: 16, marginBottom: 16, color: 'var(--text)', lineHeight: 1.75 }}>{String(transcript)}</div>
          ) : (
            <div className="ptdt-card" style={{ padding: 18, marginBottom: 16, color: 'var(--text-3)' }}>No transcript generated yet.</div>
          )}
          <pre className="ptdt-raw-json">{data ? JSON.stringify(data, null, 2) : 'No call loaded.'}</pre>
        </section>
      </div>
    </div>
  )
}