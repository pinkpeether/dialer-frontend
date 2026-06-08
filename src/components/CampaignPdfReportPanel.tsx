import { Download, FileText, Mail, SendHorizonal } from 'lucide-react'
import { reportsAnalyticsProAPI, type ReportsAnalyticsFilters } from '../api/reportsAnalyticsPro.api'

type Props = {
  filters: ReportsAnalyticsFilters
  onPreviewEmail: () => void
  onSendEmail: () => void
  emailStatus?: string
}

export default function CampaignPdfReportPanel({ filters, onPreviewEmail, onSendEmail, emailStatus }: Props) {
  const campaignId = filters.campaignId ? String(filters.campaignId) : ''

  const handleCsvDownload = async () => {
    await reportsAnalyticsProAPI.downloadCsvSummary(filters)
  }

  const handlePdfDownload = async () => {
    if (!campaignId) return
    await reportsAnalyticsProAPI.downloadCampaignPdf(campaignId, filters)
  }

  return (
    <section className="ptdt-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Exports & Daily <span className="gradient-brand-text">Summary</span></h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>
            CSV summary, campaign PDF report, and guarded daily summary email evaluation.
          </p>
        </div>
        <span className="ptdt-chip"><Mail size={12} /> Provider-safe</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <button className="ptdt-action-btn" type="button" onClick={() => void handleCsvDownload()}>
          <Download size={14} /> Download CSV Summary
        </button>
        <button className={`ptdt-action-btn ${campaignId ? 'active' : ''}`} type="button" onClick={() => void handlePdfDownload()} disabled={!campaignId}>
          <FileText size={14} /> {campaignId ? 'Download Campaign PDF' : 'Select Campaign for PDF'}
        </button>
        <button className="ptdt-action-btn" type="button" onClick={onPreviewEmail}>
          <Mail size={14} /> Preview Daily Email
        </button>
        <button className="btn-brand" type="button" onClick={onSendEmail} style={{ minHeight: 40 }}>
          <SendHorizonal size={14} /> Send / Evaluate Email
        </button>
      </div>

      {emailStatus && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--bg-glass-hi)',
            color: 'var(--text-2)',
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          {emailStatus}
        </div>
      )}
    </section>
  )
}
