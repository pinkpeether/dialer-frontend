import { useEffect, useState } from 'react'
import { campaignManagementProAPI } from '../api/campaignManagementPro.api'

type Props = {
  campaignId: number
  onMessage?: (message: string) => void
}

const defaultScript = `Hello {{name}}, this is {{agentName}} calling from PTDT regarding {{campaignName}}.

I wanted to quickly confirm if this is a good time to speak.

If yes: Great, I will keep it brief.
If busy: No problem, I can schedule a callback for a better time.`

export default function CampaignScriptEditor({ campaignId, onMessage }: Props) {
  const [script, setScript] = useState(defaultScript)
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!campaignId) return
      setLoading(true)
      try {
        const data = await campaignManagementProAPI.getScript(campaignId)
        if (!active) return
        setScript(data.script || defaultScript)
        setPlaceholders(data.placeholders || [])
      } catch (error) {
        onMessage?.(error instanceof Error ? error.message : 'Failed to load campaign script')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [campaignId, onMessage])

  const save = async () => {
    setSaving(true)
    try {
      await campaignManagementProAPI.updateScript(campaignId, script)
      onMessage?.('Campaign script saved')
    } catch (error) {
      onMessage?.(error instanceof Error ? error.message : 'Failed to save campaign script')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}>Campaign Script</div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Script Editor</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>Create the live agent script used during calls.</p>
        </div>
        <button type="button" className="btn-brand" onClick={() => void save()} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save Script'}
        </button>
      </div>

      <textarea
        value={script}
        onChange={event => setScript(event.target.value)}
        rows={12}
        style={{
          minHeight: 260,
          width: '100%',
          borderRadius: 16,
          border: '1px solid var(--border)',
          background: 'var(--bg-glass-hi)',
          color: 'var(--text)',
          padding: 14,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {placeholders.map(token => (
          <button
            key={token}
            type="button"
            className="ptdt-chip"
            onClick={() => setScript(current => `${current} ${token}`)}
          >
            {token}
          </button>
        ))}
      </div>
    </section>
  )
}
