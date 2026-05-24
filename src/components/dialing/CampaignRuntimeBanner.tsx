type Props = {
  mode?: string | null
  waitingReason?: string | null
  timezone?: string | null
}

export default function CampaignRuntimeBanner({ mode, waitingReason, timezone }: Props) {
  const active = !waitingReason
  const label = (mode || 'PROGRESSIVE').toUpperCase()

  return (
    <div
      className="glass lift"
      style={{
        padding: 18,
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div className="display" style={{ fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>
          Runtime Control
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
          Mode <b className="mono" style={{ color: 'var(--pink)' }}>{label}</b> · Timezone {timezone || 'UTC'}
        </div>
      </div>
      <div
        className="badge"
        style={{
          color: active ? 'var(--green-2)' : 'var(--warning)',
          background: active ? 'rgba(0,167,71,0.10)' : 'rgba(240,185,11,0.12)',
          border: `1px solid ${active ? 'var(--green-2)' : 'var(--warning)'}`,
        }}
      >
        {active ? 'Dialable' : waitingReason}
      </div>
    </div>
  )
}
