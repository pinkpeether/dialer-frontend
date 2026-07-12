import { useState, type CSSProperties } from 'react'
import { Download, UploadCloud, Users2 } from 'lucide-react'
import DuplicateContactsPanel from '../components/DuplicateContactsPanel'
import ContactTimelinePanel from '../components/ContactTimelinePanel'
import ContactTagsPanel from '../components/ContactTagsPanel'
import { contactManagementProAPI, type ContactImportRow } from '../api/contactManagementPro.api'

const sampleRows: ContactImportRow[] = [
  { name: 'Sample Customer', phone: '+923001234567', email: 'customer@example.com', company: 'PTDT Demo' },
  { name: 'Duplicate Customer', phone: '+92 300 1234567', email: 'duplicate@example.com', company: 'PTDT Demo' },
]

type PreviewResult = Record<string, unknown> | null

const textareaStyle: CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  color: 'var(--text)',
  padding: 14,
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  lineHeight: 1.6,
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function ContactManagementPro() {
  const [previewText, setPreviewText] = useState(JSON.stringify(sampleRows, null, 2))
  const [previewResult, setPreviewResult] = useState<PreviewResult>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const runPreview = async () => {
    setError('')
    setLoading(true)
    try {
      const contacts = JSON.parse(previewText) as ContactImportRow[]
      const result = await contactManagementProAPI.previewImport(contacts)
      setPreviewResult(result as Record<string, unknown>)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON or preview failed')
    } finally {
      setLoading(false)
    }
  }

  const downloadCsv = async () => {
    setError('')
    try {
      const blob = await contactManagementProAPI.exportCsv({})
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ptdt-contacts-export.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Users2 size={12} /> Contact Operations
          </div>
          <h1 className="ptdt-page-title">
            Contact Tools <span className="gradient-brand-text">Advanced</span>
          </h1>
          <p className="ptdt-page-desc">
            Review duplicate contacts, timelines, tags and notes, import previews, DNC checks, and filtered CSV exports in one continuous workspace.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <DuplicateContactsPanel />
        <ContactTimelinePanel />
        <ContactTagsPanel />

        <section aria-labelledby="contact-import-export-heading" style={{ display: 'grid', gap: 14 }}>
          <div>
            <div className="eyebrow pink" style={{ marginBottom: 8 }}>
              <UploadCloud size={12} /> Import / Export
            </div>
            <h2 id="contact-import-export-heading" style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>
              Contact Data Tools
            </h2>
          </div>

          <div className="ptdt-pro-grid two-col">
            <section className="ptdt-card" style={{ padding: 18 }}>
              <div className="eyebrow pink" style={{ marginBottom: 10 }}>
                <UploadCloud size={12} /> Import Preview
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 22 }}>Preview Contacts Import</h3>
              <p style={{ color: 'var(--text-3)', marginTop: 8, marginBottom: 14 }}>
                Paste a JSON array of contacts to preview duplicates, DNC blocks, and invalid numbers before import.
              </p>

              <textarea
                value={previewText}
                onChange={event => setPreviewText(event.target.value)}
                rows={14}
                style={textareaStyle}
              />

              {error && (
                <div className="ptdt-card" style={{ padding: 12, marginTop: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
                  {error}
                </div>
              )}

              <button type="button" className="btn-brand" onClick={() => void runPreview()} disabled={loading} style={{ marginTop: 14 }}>
                <UploadCloud size={14} /> {loading ? 'Previewing...' : 'Preview Import'}
              </button>
            </section>

            <section className="ptdt-card" style={{ padding: 18 }}>
              <div className="eyebrow pink" style={{ marginBottom: 10 }}>
                <Download size={12} /> Export and Output
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 22 }}>CSV Export</h3>
              <p style={{ color: 'var(--text-3)', marginTop: 8, marginBottom: 14 }}>
                Download a contact export, or inspect the latest preview result payload.
              </p>

              <button type="button" className="ptdt-action-btn" onClick={() => void downloadCsv()}>
                <Download size={14} /> Download CSV
              </button>

              <pre className="ptdt-pro-json" style={{ marginTop: 14, maxHeight: 420 }}>
                {previewResult ? JSON.stringify(previewResult, null, 2) : 'Preview output will appear here.'}
              </pre>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}
