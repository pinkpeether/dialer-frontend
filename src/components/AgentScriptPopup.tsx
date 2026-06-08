import { useState, type CSSProperties } from 'react'
import { MessageSquareQuote, Sparkles } from 'lucide-react'
import { campaignManagementProAPI } from '../api/campaignManagementPro.api'

type ScriptPopupResult = {
  renderedScript?: string
  objectionTips?: string[]
}

type Props = {
  campaignId: number
  onMessage?: (message: string, type?: 'success' | 'error' | 'info') => void
}

const fieldStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  color: 'var(--text)',
  padding: '0 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

export default function AgentScriptPopup({ campaignId, onMessage }: Props) {
  const [contactId, setContactId] = useState('')
  const [agentName, setAgentName] = useState('Agent')
  const [stage, setStage] = useState('opening')
  const [result, setResult] = useState<ScriptPopupResult | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const data = await campaignManagementProAPI.getScriptPopup(campaignId, {
        contactId: contactId ? Number(contactId) : undefined,
        agentName,
        stage,
      })
      setResult(data as ScriptPopupResult)
      onMessage?.('Agent script popup generated', 'success')
    } catch (error) {
      onMessage?.(error instanceof Error ? error.message : 'Failed to generate agent popup', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}>
            <Sparkles size={12} /> Agent Assist
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Script Popup Preview</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
            Preview exactly what an agent should see during a live call stage.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <input
          value={contactId}
          onChange={event => setContactId(event.target.value)}
          placeholder="Contact ID optional"
          style={fieldStyle}
        />
        <input
          value={agentName}
          onChange={event => setAgentName(event.target.value)}
          placeholder="Agent name"
          style={fieldStyle}
        />
        <select
          value={stage}
          onChange={event => setStage(event.target.value)}
          style={fieldStyle}
        >
          <option value="opening">Opening</option>
          <option value="qualification">Qualification</option>
          <option value="objection">Objection</option>
          <option value="closing">Closing</option>
        </select>
        <button type="button" className="btn-brand" onClick={() => void generate()} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Popup'}
        </button>
      </div>

      {result ? (
        <div className="glass" style={{ padding: 16, borderRadius: 18 }}>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
            Rendered Script
          </div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', lineHeight: 1.7, fontSize: 13.5 }}>
            {result.renderedScript || 'No script available.'}
          </div>

          {!!result.objectionTips?.length && (
            <div style={{ marginTop: 16 }}>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
                Objection Tips
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {result.objectionTips.map((tip, index) => (
                  <span key={`${tip}-${index}`} className="ptdt-chip" style={{ alignItems: 'flex-start' }}>
                    <MessageSquareQuote size={12} />
                    {tip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass" style={{ padding: 16, borderRadius: 18, color: 'var(--text-3)' }}>
          Generate a popup preview to inspect opening, qualification, objection, or closing scripts.
        </div>
      )}
    </section>
  )
}
