import { useEffect, useState } from 'react'
import { ShieldAlert, Trash2 } from 'lucide-react'
import { recordingStorageProAPI, type RecordingRetentionPolicy } from '../api/recordingStoragePro.api'

const defaultPolicy: RecordingRetentionPolicy = {
  enabled: false,
  retentionDays: 90,
  deleteRecordings: true,
  deleteTranscripts: false,
  deleteInsights: false,
  dryRunDefault: true,
}

export default function RetentionPolicyPanel() {
  const [policy, setPolicy] = useState<RecordingRetentionPolicy>(defaultPolicy)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await recordingStorageProAPI.getRetentionPolicy()
      setPolicy(data)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to load retention policy')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const update = (key: keyof RecordingRetentionPolicy, value: boolean | number) => {
    setPolicy(prev => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await recordingStorageProAPI.updateRetentionPolicy(policy)
      setPolicy(data)
      setMessage('Retention policy saved')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save retention policy')
    } finally {
      setLoading(false)
    }
  }

  const previewPurge = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await recordingStorageProAPI.previewPurge(policy)
      setPreview(data)
      setMessage('Preview generated')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to preview purge')
    } finally {
      setLoading(false)
    }
  }

  const runDry = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await recordingStorageProAPI.runPurge({ dryRun: true, policyOverride: policy })
      setPreview(data)
      setMessage(String((data as Record<string, unknown>).message || 'Dry run completed'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to run dry purge')
    } finally {
      setLoading(false)
    }
  }

  const runLive = async () => {
    const confirmed = window.confirm('This will purge eligible recording metadata for the oldest controlled batch. Continue?')
    if (!confirmed) return
    setLoading(true)
    setMessage('')
    try {
      const data = await recordingStorageProAPI.runPurge({ dryRun: false, policyOverride: policy })
      setPreview(data)
      setMessage(String((data as Record<string, unknown>).message || 'Retention purge completed'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to run retention purge')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="eyebrow pink" style={{ marginBottom: 10 }}>
          <ShieldAlert size={12} /> Retention Policy
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Auto-Purge Controls</h2>
        <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
          Configure 90-day style retention, preview candidates, and run controlled purge batches.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <ToggleRow label="Enable retention policy" checked={policy.enabled} onChange={value => update('enabled', value)} help="Required before live purge runs." />
        <NumberRow label="Retention days" value={policy.retentionDays} min={1} max={3650} onChange={value => update('retentionDays', value)} />
        <ToggleRow label="Delete recording URLs/SIDs" checked={policy.deleteRecordings} onChange={value => update('deleteRecordings', value)} />
        <ToggleRow label="Mark transcripts deleted" checked={policy.deleteTranscripts} onChange={value => update('deleteTranscripts', value)} />
        <ToggleRow label="Mark insights deleted" checked={policy.deleteInsights} onChange={value => update('deleteInsights', value)} />
        <ToggleRow label="Default to dry run" checked={policy.dryRunDefault} onChange={value => update('dryRunDefault', value)} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        <button type="button" className="ptdt-action-btn" disabled={loading} onClick={() => void save()}>Save Policy</button>
        <button type="button" className="ptdt-action-btn" disabled={loading} onClick={() => void previewPurge()}>Preview Candidates</button>
        <button type="button" className="btn-brand" disabled={loading} onClick={() => void runDry()}>Run Dry Purge</button>
        <button type="button" className="ptdt-action-btn danger" disabled={loading || !policy.enabled} onClick={() => void runLive()}>
          <Trash2 size={14} /> Run Live Purge
        </button>
      </div>

      {message && (
        <div className="ptdt-card" style={{ padding: 12, marginTop: 14, color: 'var(--text-2)' }}>
          {message}
        </div>
      )}

      {preview && (
        <div className="glass" style={{ padding: 16, borderRadius: 18, marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <PreviewMetric label="Cutoff" value={String((preview as Record<string, unknown>).cutoff || '—')} />
            <PreviewMetric label="Candidates" value={String((preview as Record<string, unknown>).candidateCount || 0)} />
            <PreviewMetric label="Est. Duration" value={`${String((preview as Record<string, unknown>).estimatedDurationSeconds || 0)} sec`} />
          </div>
          <pre style={{ marginTop: 14, maxHeight: 280, overflow: 'auto', borderRadius: 16, background: '#0f1020', color: '#f8fafc', padding: 14, fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </section>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
  help,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  help?: string
}) {
  return (
    <label className="glass" style={{ padding: 14, borderRadius: 18, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
      <span>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{label}</span>
        {help ? <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{help}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    </label>
  )
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="glass" style={{ padding: 14, borderRadius: 18 }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        style={{ width: '100%', minHeight: 42, marginTop: 8, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', color: 'var(--text)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
      />
    </label>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ptdt-card" style={{ padding: 14 }}>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 8, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
