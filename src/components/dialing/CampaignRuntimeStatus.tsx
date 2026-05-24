type Props = {
  status?: string
  waitingReason?: string | null
  timezone?: string | null
}

export default function CampaignRuntimeStatus({ status, waitingReason, timezone }: Props) {
  const active = status === 'ACTIVE' && !waitingReason
  return (
    <div className="glass" style={{ padding: 14, display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>
        Runtime Status
      </div>
      <div style={{ fontWeight: 800, color: active ? '#00a747' : '#f0b90b' }}>
        {active ? 'Dialing allowed' : 'Waiting'}
      </div>
      {waitingReason && (
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Reason: <span className="mono">{waitingReason}</span>
        </div>
      )}
      {timezone && (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Timezone: {timezone}
        </div>
      )}
    </div>
  )
}
