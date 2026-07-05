import { useState, type CSSProperties } from 'react'
import { CopyPlus, Download, RefreshCw, Settings2, Upload, FileText, Layers3 } from 'lucide-react'
import CampaignScriptEditor from '../components/CampaignScriptEditor'
import AgentScriptPopup from '../components/AgentScriptPopup'
import { campaignManagementProAPI, type CampaignDialSettingsPayload } from '../api/campaignManagementPro.api'

type Message = {
  type: 'success' | 'error' | 'info'
  text: string
}

type SummaryShape = {
  campaign?: Record<string, unknown>
  stats?: Record<string, unknown>
  scriptLength?: number
}

const inputStyle: CSSProperties = {
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

const numberInputStyle: CSSProperties = {
  ...inputStyle,
  appearance: 'textfield',
}

export default function CampaignManagementPro() {
  const [campaignId, setCampaignId] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [summary, setSummary] = useState<SummaryShape | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [includeContacts, setIncludeContacts] = useState(true)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [dialSettings, setDialSettings] = useState<CampaignDialSettingsPayload>({
    mode: 'PROGRESSIVE',
    dialingRatio: 1,
    maxRetries: 3,
    retryDelay: 300,
    timezone: 'Asia/Karachi',
  })
  const [busy, setBusy] = useState(false)

  const id = Number(campaignId)
  const validCampaignId = Number.isFinite(id) && id > 0

  const showMessage = (text: string, type: Message['type'] = 'info') => setMessage({ text, type })

  const loadSummary = async () => {
    if (!validCampaignId) {
      showMessage('Enter a valid campaign ID', 'error')
      return
    }
    setBusy(true)
    try {
      const data = await campaignManagementProAPI.getSummary(id)
      setSummary(data as SummaryShape)
      showMessage('Campaign summary loaded', 'success')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to load campaign summary', 'error')
    } finally {
      setBusy(false)
    }
  }

  const loadDialSettings = async () => {
    if (!validCampaignId) {
      showMessage('Enter a valid campaign ID', 'error')
      return
    }
    setBusy(true)
    try {
      const data = await campaignManagementProAPI.getDialSettings(id)
      setDialSettings(data)
      showMessage('Dial settings loaded', 'success')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to load dial settings', 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveDialSettings = async () => {
    if (!validCampaignId) {
      showMessage('Enter a valid campaign ID', 'error')
      return
    }
    setBusy(true)
    try {
      const data = await campaignManagementProAPI.updateDialSettings(id, dialSettings)
      setDialSettings(data)
      showMessage('Dial settings updated', 'success')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to update dial settings', 'error')
    } finally {
      setBusy(false)
    }
  }

  const cloneCampaign = async () => {
    if (!validCampaignId) {
      showMessage('Enter a valid campaign ID', 'error')
      return
    }
    setBusy(true)
    try {
      const data = await campaignManagementProAPI.cloneCampaign(id, {
        name: cloneName || undefined,
        includeContacts,
        resetContactStatuses: true,
      })
      const clonedId = (data as Record<string, unknown>)?.clonedCampaign as Record<string, unknown> | undefined
      showMessage(`Campaign cloned. New ID: ${clonedId?.id ?? 'created'}`, 'success')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to clone campaign', 'error')
    } finally {
      setBusy(false)
    }
  }

  const uploadContacts = async () => {
    if (!validCampaignId) {
      showMessage('Enter a valid campaign ID', 'error')
      return
    }
    if (!uploadFile) {
      showMessage('Choose CSV, TSV, or XLSX file first', 'error')
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      form.append('skipDnc', 'true')
      form.append('skipDuplicates', 'true')
      const data = await campaignManagementProAPI.uploadContacts(id, form)
      const result = data as Record<string, unknown>
      showMessage(`Imported ${result.imported ?? 0} contacts. Skipped ${result.skipped ?? 0}.`, 'success')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to upload contacts', 'error')
    } finally {
      setBusy(false)
    }
  }

  const downloadReport = async () => {
    if (!validCampaignId) {
      showMessage('Enter a valid campaign ID', 'error')
      return
    }
    setBusy(true)
    try {
      const blob = await campaignManagementProAPI.downloadReport(id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ptdt-campaign-${id}-report.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showMessage('PDF report downloaded', 'success')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to download report', 'error')
    } finally {
      setBusy(false)
    }
  }

  const stats = summary?.stats || {}
  const cards = [
    { label: 'Total Contacts', value: stats.total ?? 0 },
    { label: 'Pending', value: stats.pending ?? 0 },
    { label: 'Answered', value: stats.answered ?? 0 },
    { label: 'Script Size', value: summary?.scriptLength ?? 0 },
  ]

  return (
    <div className="ptdt-page ptdt-pro-page ptdt-campaign-management-pro">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Layers3 size={12} /> Campaign Operations
          </div>
          <h1 className="ptdt-page-title">
            Campaign <span className="gradient-brand-text">Management Pro</span>
          </h1>
          <p className="ptdt-page-desc">
            Manage campaign scripts, agent popup previews, cloning, bulk contact import, dial settings, and end-of-campaign reporting.
          </p>
        </div>
        <div className="ptdt-toolbar">
          <input
            type="number"
            placeholder="Campaign ID"
            value={campaignId}
            onChange={event => setCampaignId(event.target.value)}
            style={{ ...numberInputStyle, width: 150 }}
          />
          <button className="ptdt-action-btn" type="button" onClick={() => void loadSummary()} disabled={busy}>
            <RefreshCw size={14} /> Load
          </button>
        </div>
      </div>

      {message && (
        <div
          className="ptdt-card"
          style={{
            padding: 14,
            marginBottom: 16,
            color: message.type === 'error' ? 'var(--danger)' : message.type === 'success' ? 'var(--green-2)' : 'var(--text-3)',
            borderColor: message.type === 'error' ? 'rgba(239,68,68,0.28)' : message.type === 'success' ? 'rgba(34,197,94,0.24)' : 'var(--border)',
          }}
        >
          {message.text}
        </div>
      )}

      <div className="ptdt-pro-kpis" style={{ marginBottom: 18 }}>
        {cards.map(card => (
          <div key={card.label} className="ptdt-pro-kpi">
            <div className="ptdt-pro-kpi-label">
              {card.label}
            </div>
            <div className="ptdt-pro-kpi-value" style={{ fontSize: 30 }}>
              {String(card.value)}
            </div>
          </div>
        ))}
      </div>

      {validCampaignId && (
        <div style={{ display: 'grid', gap: 16, marginBottom: 18 }}>
          <CampaignScriptEditor campaignId={id} onMessage={text => showMessage(text, text.toLowerCase().includes('failed') ? 'error' : 'success')} />
          <AgentScriptPopup campaignId={id} onMessage={showMessage} />
        </div>
      )}

      <div className="ptdt-pro-grid two-col" style={{ marginBottom: 18 }}>
        <section className="ptdt-card" style={{ padding: 18 }}>
          <div className="eyebrow purple" style={{ marginBottom: 10 }}>
            <CopyPlus size={12} /> Clone Campaign
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Clone Setup</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8, marginBottom: 14 }}>
            Clone settings, script, and optionally contacts into a new campaign.
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              placeholder="Optional new campaign name"
              value={cloneName}
              onChange={event => setCloneName(event.target.value)}
              style={inputStyle}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={includeContacts}
                onChange={event => setIncludeContacts(event.target.checked)}
              />
              Include contacts and reset them to PENDING
            </label>
            <button type="button" className="btn-brand" onClick={() => void cloneCampaign()} disabled={busy || !validCampaignId}>
              Clone Campaign
            </button>
          </div>
        </section>

        <section className="ptdt-card" style={{ padding: 18 }}>
          <div className="eyebrow green" style={{ marginBottom: 10 }}>
            <Upload size={12} /> Bulk Import
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Contacts Upload</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8, marginBottom: 14 }}>
            CSV and TSV work immediately. XLSX requires optional backend `xlsx` support.
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              type="file"
              accept=".csv,.tsv,.xlsx,.xls"
              onChange={event => setUploadFile(event.target.files?.[0] || null)}
              style={{ ...inputStyle, paddingTop: 10, paddingBottom: 10 }}
            />
            <button type="button" className="btn-brand" onClick={() => void uploadContacts()} disabled={busy || !uploadFile || !validCampaignId}>
              Upload Contacts
            </button>
          </div>
        </section>
      </div>

      <section className="ptdt-card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div className="eyebrow purple" style={{ marginBottom: 10 }}>
              <Settings2 size={12} /> Runtime Controls
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Dial Settings</h2>
            <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
              Per-campaign dialing mode, retry behavior, ratio, and time window controls.
            </p>
          </div>
          <button type="button" className="ptdt-action-btn" onClick={() => void loadDialSettings()} disabled={busy || !validCampaignId}>
            <RefreshCw size={14} /> Load Settings
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <select
            value={dialSettings.mode || 'PROGRESSIVE'}
            onChange={event => setDialSettings(current => ({ ...current, mode: event.target.value }))}
            style={inputStyle}
          >
            <option value="MANUAL">MANUAL</option>
            <option value="PREVIEW">PREVIEW</option>
            <option value="PROGRESSIVE">PROGRESSIVE</option>
            <option value="PREDICTIVE">PREDICTIVE</option>
          </select>
          <input
            type="number"
            min={1}
            max={10}
            value={dialSettings.dialingRatio || 1}
            onChange={event => setDialSettings(current => ({ ...current, dialingRatio: Number(event.target.value) }))}
            placeholder="Dial ratio"
            style={numberInputStyle}
          />
          <input
            type="number"
            min={0}
            max={20}
            value={dialSettings.maxRetries || 0}
            onChange={event => setDialSettings(current => ({ ...current, maxRetries: Number(event.target.value) }))}
            placeholder="Max retries"
            style={numberInputStyle}
          />
          <input
            type="number"
            min={30}
            value={dialSettings.retryDelay || 300}
            onChange={event => setDialSettings(current => ({ ...current, retryDelay: Number(event.target.value) }))}
            placeholder="Retry delay"
            style={numberInputStyle}
          />
          <input
            type="time"
            value={dialSettings.startTime || ''}
            onChange={event => setDialSettings(current => ({ ...current, startTime: event.target.value }))}
            style={inputStyle}
          />
          <input
            type="time"
            value={dialSettings.endTime || ''}
            onChange={event => setDialSettings(current => ({ ...current, endTime: event.target.value }))}
            style={inputStyle}
          />
          <input
            value={dialSettings.timezone || ''}
            onChange={event => setDialSettings(current => ({ ...current, timezone: event.target.value }))}
            placeholder="Timezone e.g. Asia/Karachi"
            style={inputStyle}
          />
          <button type="button" className="btn-brand" onClick={() => void saveDialSettings()} disabled={busy || !validCampaignId}>
            Save Settings
          </button>
        </div>
      </section>

      <section className="ptdt-card" style={{ padding: 18 }}>
        <div className="eyebrow green" style={{ marginBottom: 10 }}>
          <FileText size={12} /> End-of-Campaign
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>PDF Report</h2>
        <p style={{ color: 'var(--text-3)', marginTop: 8, marginBottom: 14 }}>
          Download a lightweight PDF summary covering contacts, outcomes, answer rate, and duration metrics.
        </p>
        <button type="button" className="btn-brand" onClick={() => void downloadReport()} disabled={busy || !validCampaignId}>
          <Download size={14} /> Download PDF Report
        </button>
      </section>
    </div>
  )
}
