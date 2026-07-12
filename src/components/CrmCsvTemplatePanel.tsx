import { Download, TableProperties } from 'lucide-react'

const CRM_TEMPLATE_HEADERS = [
  'first_name',
  'last_name',
  'phone_number',
  'email',
  'city',
  'state',
  'timezone',
  'lead_source',
  'campaign',
  'notes',
]

const sampleRow = [
  'Sarah',
  'Khan',
  '+15512943079',
  'sarah@example.com',
  'New York',
  'NY',
  'America/New_York',
  'Website',
  'Spring Outreach',
  'VIP lead - call after 2 PM',
]

function downloadCrmCsvTemplate() {
  const csv = [CRM_TEMPLATE_HEADERS, sampleRow]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ptdt-crm-data-template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function CrmCsvTemplatePanel() {
  return (
    <section className="ptdt-crm-template-card" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div className="ptdt-crm-template-copy" style={{ minWidth: 0 }}>
        <div className="eyebrow green"><TableProperties size={12} /> CRM Data Template</div>
        <h3>CSV field map for clean imports</h3>
        <p>Use this template when preparing CRM leads for PTDT campaigns, outbound calling, callbacks, and reporting.</p>
      </div>
      <div className="ptdt-crm-template-fields" style={{ minWidth: 0, maxWidth: '100%' }}>
        {CRM_TEMPLATE_HEADERS.map(header => <span key={header}>{header.replace(/_/g, ' ')}</span>)}
      </div>
      <button
        type="button"
        className="ptdt-action-btn active"
        onClick={downloadCrmCsvTemplate}
        style={{ width: '100%', maxWidth: '100%', justifyContent: 'center', whiteSpace: 'normal', textAlign: 'center', boxSizing: 'border-box' }}
      >
        <Download size={14} /> Download Template
      </button>
    </section>
  )
}
