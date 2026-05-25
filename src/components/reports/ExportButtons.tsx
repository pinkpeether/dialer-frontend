import { useState } from 'react'
import { Download, FileText, Table2 } from 'lucide-react'
import { exportsAPI } from '../../api/exports.api'

type Props = {
  campaignId?: number | string
}

export default function ExportButtons({ campaignId }: Props) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="glass" style={{ padding: 22, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="display" style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>Exports</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
            Download operational data for calls, contacts, and campaign review.
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', color: 'var(--pink)', background: 'rgba(251,11,140,0.10)', border: '1px solid rgba(251,11,140,0.34)' }}>
          <Download size={18} />
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.24)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 12.5, fontWeight: 800 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ExportButton
          busy={busy === 'calls'}
          disabled={Boolean(busy)}
          icon={<FileText size={14} />}
          label="Calls CSV"
          onClick={() => void run('calls', () => exportsAPI.callsCsv())}
        />
        <ExportButton
          busy={busy === 'contacts'}
          disabled={Boolean(busy)}
          icon={<Table2 size={14} />}
          label="Contacts CSV"
          onClick={() => void run('contacts', () => exportsAPI.contactsCsv())}
        />
        {campaignId && (
          <ExportButton
            busy={busy === 'campaign'}
            disabled={Boolean(busy)}
            icon={<Download size={14} />}
            label="Campaign CSV"
            onClick={() => void run('campaign', () => exportsAPI.campaignCsv(campaignId))}
          />
        )}
      </div>
    </div>
  )
}

function ExportButton({
  busy,
  disabled,
  icon,
  label,
  onClick,
}: {
  busy: boolean
  disabled: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 38,
        borderRadius: 999,
        border: '1px solid rgba(251,11,140,0.34)',
        background: busy ? 'rgba(251,11,140,0.08)' : 'rgba(251,11,140,0.12)',
        color: 'var(--pink)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 14px',
        fontSize: 12.5,
        fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !busy ? 0.55 : 1,
      }}
    >
      {icon} {busy ? 'Exporting...' : label}
    </button>
  )
}
